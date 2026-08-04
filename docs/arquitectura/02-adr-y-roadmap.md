# JOI360 — ADR, documento técnico y roadmap del Core Platform

**Fecha:** 2026-08-04
**Rol:** Principal Architect
**Insumo:** [`01-diagnostico.md`](./01-diagnostico.md) — el inventario medido del sistema actual — más la auditoría en vivo acumulada durante el desarrollo de esta semana (más de 30 bugs reales encontrados y corregidos en producción, listados en la sección 1). No se relanzó un QA formal de 5 agentes porque esa auditoría en vivo, contra datos reales y con cada hallazgo corregido y verificado el mismo día, es evidencia más fuerte que una exploración de una hora — pero sigue disponible como pase complementario si se quiere una cobertura más ancha antes de empezar a construir.
**Encargo:** no copiar Stripe (es un procesador de pagos; JOI360 no lo es). Construir el Core Platform de JOI360 — una plataforma modular de ecosistemas cerrados (Mundos) con motores activables — tomando de Stripe el ledger e idempotencia, de Adyen el modelo de adquirencia/settlement, de Salesforce el multi-tenant, de Shopify la modularidad extensible, y de Temporal el manejo de procesos largos (BNPL, onboarding, liquidaciones).
**Alcance:** rediseño del backend. El negocio (Entidad Legal → Mundo → Motores) y el frontend React no cambian.

---

## 0. Cómo leer este documento

Sigue el orden pedido — diagnóstico (ya entregado), ADR, documento técnico, roadmap — pero consolidado en un solo archivo en vez de cuatro, porque las cuatro piezas comparten el mismo argumento y separarlas hubiera forzado a repetirlo. Cada decisión de la sección 2 (ADR) tiene su desarrollo técnico en la sección 3 y su fecha de entrega en la sección 6 (roadmap).

---

## 1. Lo que ya sabemos, con evidencia real (no hipótesis)

Antes de proponer nada, esto es lo que el desarrollo de esta semana ya demostró — con bugs reales, no supuestos de arquitecto:

- **El dinero se mueve sin transacción atómica.** Confirmado hoy: `wallets.balance` se leía y se reescribía con un `PATCH` plano en 8 puntos distintos, en 3 frentes distintos, todos con la misma `anon key`. Una transferencia P2P eran dos `PATCH` separados, no atómicos — si el segundo fallaba, el dinero desaparecía. Corregido *parcialmente* hoy mismo con dos funciones de Postgres (`mover_saldo_wallet`, `transferir_p2p_wallet`, `SECURITY DEFINER`, con lock de fila) — es la primera prueba real de que "el cliente no debería escribir directo" no es una preferencia estética, es lo que ya rompió dinero real dos veces esta semana (el caso de la transferencia con monto negativo, y el que se corrigió hoy).
- **No hay frontera entre "el mundo pidió esto" y "RedPontis lo autorizó".** El caso de los 3 mundos duplicados "Colegio Raimondi" (uno de ellos resincronizado por un botón "Reset demo" que nadie pensó que tocaba producción) es exactamente el síntoma de no tener un backend que decida qué existe — cualquier acción de cliente puede escribir estado de negocio real.
- **Los descuadres se corrigen a mano porque no hay ledger.** El bug de Liquidación (netos negativos marcados como `PROCESADA`, dinero que RedPontis le hubiera debido pagar a un mundo que no generó ese volumen) solo se detectó por inspección manual — no hay ninguna cuenta contable que lo hubiera hecho imposible por construcción.
- **La seguridad de acceso a datos es "confía en el frontend".** La `anon key` en el bundle permitía `DELETE` sobre `wallets`/`transactions`/`liquidaciones`/`app_profiles` sin ningún uso legítimo detrás — cerrado hoy con un `REVOKE`, pero es el síntoma, no la causa. La causa es que RLS del proyecto es `using (true) with check (true)` en casi todo.
- **Lo que sí funciona, funciona *muy* bien:** el modelo de capacidades (`world_capacity_configs` + `world_feature_flags`) y el render-config del POS nativo (`joi-pos-backend/lib/renderConfig.js`) son, honestamente, mejor arquitectura que el resto del sistema junto. Cualquier rediseño debe extender ese patrón, no reemplazarlo.

---

## 2. ADR — Decisiones de arquitectura

Formato: Contexto → Decisión → Alternativas descartadas → Consecuencias.

### ADR-001 — El cliente deja de escribir estado de negocio directo a la base

**Contexto:** los 3 frentes (`joi360-admin`, `joi360-app`, `joi360-operador` vía `joi-pos-backend`) hablan PostgREST directo con la `anon key`. 34 de 37 escrituras sobre tablas de dinero ocurren en el navegador.

**Decisión:** toda escritura que mueva dinero, cambie el estado de un contrato (BNPL, acuerdo comercial), o dé de alta/baja una entidad de negocio (Mundo, Comercio, Evento aprobado) pasa a ser una llamada a una **API de negocio** del Core Platform — nunca un `PATCH`/`POST`/`DELETE` de PostgREST desde el navegador. Lecturas de solo-consulta (listar catálogo, ver saldo, historial) pueden seguir yendo directo a Postgres vía RLS real (no `using(true)`) mientras se migra, porque no es donde está el riesgo.

**Alternativas descartadas:**
- *Arreglarlo todo con RLS más estricto, sin backend nuevo* — descartado porque `joi-pos-backend` usa la misma `anon key` que el navegador (confirmado hoy al diseñar el fix de wallets): no hay forma de darle a un backend de confianza más privilegio que al cliente sin introducir un segundo tipo de credencial, que es, en los hechos, empezar a construir el backend.
- *Mover todo a Supabase Edge Functions en vez de un backend propio* — descartado como decisión de **producto de plataforma**: Edge Functions es razonable para funciones puntuales, pero el Core Platform necesita DDD, colas, workers y un ciclo de vida propio (CI/CD, testing, versionado de API) que un backend NestJS propio sostiene mejor a 3+ años.

**Consecuencias:** cada uno de los 3 frentes necesita un cliente HTTP hacia el Core Platform en vez de (o adicional a) su cliente Supabase actual — es el trabajo real de migración, no una bandera que se prende. `joi-pos-backend` ya es, en espíritu, el primer bounded context construido así (aunque con la `anon key` en vez de un service role/JWT propio) — se adopta como semilla del backend nuevo en vez de descartarse.

### ADR-002 — Wallet se rediseña como Ledger inmutable, no como saldo mutable

**Contexto:** `wallets.balance` es un número que se sobreescribe. Las filas de `transactions` son un log paralelo que nadie concilia contra ese número.

**Decisión:** el dominio Wallet pasa a ser un **ledger de partida doble simplificado**:
- `accounts` (una cuenta contable por wallet/mundo/comisión-RedPontis, no solo por usuario)
- `journal_entries` (inmutables, nunca se editan ni se borran — para corregir algo se asienta una reversa)
- `holds` (retenciones: reservar saldo mientras se confirma un cobro, sin descontarlo todavía)
- `refunds` / `adjustments` (asientos con motivo y autor, no un `UPDATE` silencioso)
- `reconciliation` (proceso periódico que recalcula el saldo desde el journal y compara contra el materializado — si difieren, alerta, no corrige solo)

El "saldo" que hoy es `wallets.balance` pasa a ser una **vista materializada** (suma de `journal_entries`), no la fuente de verdad.

**Alternativas descartadas:**
- *Ledger completo de partida doble (débito/crédito por cada cuenta contable, como un libro mayor real)* — descartado *por ahora*: es lo correcto a 3-5 años pero es sobre-ingeniería para el volumen actual (evaluado, no rechazado — ver roadmap Fase 3). Se empieza con partida simple (un asiento por movimiento, con tipo y dirección) porque resuelve el 90% del riesgo (inmutabilidad, reconciliación, reversas) con una fracción de la complejidad.

**Consecuencias:** el fix de hoy (`mover_saldo_wallet` como función de Postgres) es el **primer paso literal** de esta migración — ya asienta cada movimiento junto con la escritura del saldo, atómico. Falta: holds, reversals con motivo estructurado, y mover el cálculo del saldo materializado a un job de reconciliación en vez de confiar en que el `UPDATE` y el `INSERT` de la misma función nunca diverjan (hoy sí pueden divergir si alguien edita `transactions` a mano, como se hizo esta semana para corregir Liquidación).

### ADR-003 — Monolito modular primero, no microservicios

**Contexto:** el encargo pide evaluar monolito modular vs. microservicios.

**Decisión:** **monolito modular** (NestJS, un solo deploy, módulos con fronteras de dominio estrictas — cada módulo con su propio `domain/`, `application/`, `infrastructure/`, sin imports cruzados salvo por contratos explícitos) como forma de partida. Microservicios reales solo para lo que tiene un perfil de carga/escala genuinamente distinto del resto: el worker de Liquidación (batch, no interactivo) y, más adelante, el motor de Eventos en fecha de venta masiva (picos de tráfico que no comparten patrón con el resto de la plataforma).

**Alternativas descartadas:**
- *Microservicios desde el día uno* — descartado: con un equipo in-house chico, microservicios agregan el costo de red distribuida, versionado de contratos entre servicios y observabilidad distribuida sin que el volumen actual (10 mundos, cientos de transacciones/día) lo justifique. Es el error clásico de diseñar para el tamaño que uno querría tener, no el que se tiene.

**Consecuencias:** el monolito modular con fronteras estrictas es lo que permite, si hace falta después, **extraer** un módulo a su propio servicio sin reescribirlo — el bounded context ya está aislado en el código, solo cambia el transporte (llamada in-process → HTTP/cola).

### ADR-004 — DDD + arquitectura hexagonal, bounded contexts por motor

**Contexto:** hoy `supabase.js` (1552 líneas en admin) es a la vez repositorio, servicio y regla de negocio. `Module.jsx` (3972 líneas) contiene los templates de *todos* los módulos del superapp.

**Decisión:** cada Motor Funcional real (Wallet/Ledger, Comercios, Accesos, Eventos, BNPL, Menú, Perfil Extendido, NFC/Banditas) es un **bounded context** propio dentro del monolito, con:
- `domain/` — entidades, value objects, reglas de negocio puras, sin I/O
- `application/` — casos de uso (un archivo por acción: `CobrarConWallet`, `VincularBandita`, `AprobarSolicitudBNPL`)
- `infrastructure/` — repositorios (implementación Postgres), clientes externos (Culqi, Yape/Plin)
- `interface/` — controllers HTTP, DTOs, validación de entrada

Repository pattern para todo acceso a datos — nada de queries PostgREST sueltas en un caso de uso.

**Alternativas descartadas:**
- *CQRS generalizado en toda la plataforma* — descartado como default. Se adopta **solo** donde ya hay una asimetría real lectura/escritura: Liquidación (lecturas agregadas pesadas, pocas escrituras) y el dashboard de RedPontis (KPIs cross-mundo). El resto de los módulos son CRUD-con-reglas, y forzar CQRS ahí es complejidad sin beneficio.

**Consecuencias:** migrar `Module.jsx`/`Fronts.jsx`/`supabase.js` no es reescribir el frontend — es que cada uno de sus casos de uso (comprar, cobrar, transferir, vincular bandita) empiece a llamar a un endpoint del bounded context correspondiente en vez de construir el `PATCH` a mano.

### ADR-005 — Multi-tenant real: `tenant_id` forzado en el framework, RLS como defensa en profundidad

**Contexto:** hoy el aislamiento entre Mundos es "que ningún desarrollador olvide `&world_id=eq.` en el query". RLS existe pero es `using (true)`.

**Decisión:** el `tenant_id` (Mundo) se inyecta en un **middleware/interceptor** una sola vez por request autenticado (derivado del JWT, no de un parámetro que el cliente manda) y todo repositorio hereda de una base que lo aplica automáticamente — es estructuralmente imposible escribir un query que se olvide del tenant, porque el repositorio no expone una forma de hacerlo. RLS de Postgres se mantiene *además*, como segunda capa (defensa en profundidad, no la única).

**Consecuencias:** cierra el mismo problema de raíz que ADR-001, aplicado específicamente al aislamiento entre Mundos en vez de a la autorización general.

### ADR-006 — Auth enterprise real, no "si hay sesión en localStorage"

**Contexto:** hoy "estar logueado como RP admin" es un objeto en `localStorage`. No hay JWT, no hay expiración real, no hay diferencia de privilegio entre "alguien con la key" y "RedPontis autenticado" — literalmente el mismo problema que llevó al hallazgo crítico de esta semana.

**Decisión:** Supabase Auth (o un proveedor JWT equivalente) con:
- Roles reales: `redpontis_admin`, `mundo_admin`, `comercio_operador`, `organizador`, `usuario_final` — no un `if (session)` genérico.
- RBAC para lo grueso (¿puede este rol tocar Liquidación?) + ABAC para lo fino (¿puede este `mundo_admin` tocar *este* Mundo específico, o solo el suyo?).
- Service accounts con su propio JWT de vida corta para backend-a-backend (el POS T6 se autentica como *terminal*, no comparte el PIN del comercio ni ninguna key con el navegador).

**Consecuencias:** el hallazgo crítico de esta semana (`pos_pin` legible por cualquiera con la `anon key`) se cierra de raíz — el PIN deja de compararse client-side (ya se hizo así en `joi-pos-backend`, es el patrón correcto) y el frontend deja de necesitar ningún permiso de lectura sobre columnas sensibles.

### ADR-007 — Idempotencia obligatoria en toda operación que mueva dinero

**Contexto:** cero claves de idempotencia en todo el proyecto hoy.

**Decisión:** todo endpoint de negocio que muta estado financiero exige un `Idempotency-Key` (header, generado por el cliente por intento de acción, no por reintento) — el backend guarda el resultado de la primera ejecución y lo devuelve igual ante reintentos con la misma key, sin re-ejecutar el efecto.

**Consecuencias:** un doble-toque en "Cobrar" en el POS con red intermitente (el caso real, no hipotético, de un colegio con wifi débil) deja de poder cobrar dos veces.

### ADR-008 — Eventos de dominio + outbox, saga solo donde ya hay un proceso largo real

**Contexto:** BNPL, liquidaciones y onboarding de un Mundo son procesos con múltiples pasos y estados intermedios, hoy manejados con banderas de estado editadas a mano desde el cliente.

**Decisión:** cada bounded context publica **eventos de dominio** (`SaldoDebitado`, `SolicitudBNPLAprobada`, `LiquidacionGenerada`) a través del **patrón outbox** (el evento se escribe en la misma transacción que el cambio de estado, y un worker lo publica después — nunca se pierde un evento por una escritura exitosa cuya publicación falló). Un **saga/coordinador** explícito maneja los procesos multi-paso que ya existen de verdad: ciclo de vida de un contrato BNPL (aprobación → cobro de cuotas → mora → suspensión), y el corte + liquidación periódica.

**Alternativas descartadas:** un bus de eventos genérico tipo Kafka desde el día uno — descartado por sobre-ingeniería para el volumen actual; BullMQ + Redis (colas simples con reintentos y backoff) alcanza, y es lo que ya está en el stack acordado.

**Consecuencias:** Temporal (mencionado en el encargo como referencia) se evalúa en la Fase 3 del roadmap, cuando el número de procesos largos concurrentes (BNPL de múltiples mundos en paralelo) justifique un motor de orquestación dedicado en vez de BullMQ a mano.

### ADR-009 — Observabilidad y audit log desde el primer commit del backend nuevo, no al final

**Contexto:** `error_catalog` + `error_log` ya existen y son, según el diagnóstico, "más de lo que tienen muchos proyectos maduros" — se conservan y se extienden.

**Decisión:** cada request al Core Platform lleva un `trace_id` (OpenTelemetry) de punta a punta — atraviesa los 3 frentes cuando llamen al backend nuevo. Logging estructurado (JSON, no `console.log` de texto libre). Audit log específico (no solo error log) para toda acción de negocio sensible: quién aprobó qué, quién cambió un acuerdo comercial, quién marcó una liquidación como procesada — con actor, timestamp, valor anterior y nuevo.

**Consecuencias:** el bug de los 3 mundos duplicados hubiera tomado minutos en vez de una sesión completa de investigación con SQL manual si hubiera existido audit log sobre "quién/qué creó este Mundo".

---

## 3. Documento técnico — cómo se construye cada pieza

### 3.1 Stack confirmado

NestJS + TypeScript · PostgreSQL (Supabase, se conserva como motor de base de datos — cambia *cómo* se accede, no *dónde* viven los datos) · Redis + BullMQ (colas/workers) · Docker (empaquetado) · AWS (ECS Fargate o App Runner para el backend; RDS/Supabase gestionado se mantiene) · OpenTelemetry (tracing) · Zod o class-validator (validación de entrada).

### 3.2 Estructura de carpetas del backend nuevo (`joi360-core`)

```
joi360-core/
  src/
    shared/               # kernel compartido: value objects (Money, WorldId), decoradores, middleware de tenant
    modules/
      wallet/              # Ledger — el primero en construirse (ADR-002)
        domain/            # Account, JournalEntry, Hold — sin I/O
        application/       # CobrarUseCase, RecargarUseCase, TransferirP2PUseCase
        infrastructure/    # PostgresLedgerRepository, ReconciliationJob
        interface/         # WalletController, DTOs
      comercios/
      accesos/
      eventos/
      bnpl/
      menu/
      identidad/           # cuentas, roles, wallets↔personas — separado de auth
    auth/                   # JWT, guards de rol, service accounts
    observability/          # interceptor de trace_id, logger estructurado
  test/
    unit/                   # dominio puro, sin mocks de infraestructura
    integration/            # casos de uso contra Postgres real (test containers)
    e2e/                    # los 3 frentes reales contra el backend en un entorno de prueba
```

### 3.3 API — de negocio, no CRUD

En vez de `PATCH /wallets/{id}` (lo que existe hoy), la API expone intención de negocio:
`POST /wallets/{id}/cobros`, `POST /wallets/{id}/recargas`, `POST /transferencias-p2p`, `POST /bnpl/contratos/{id}/cuotas/{n}/pagos`. Cada endpoint es un caso de uso, no una operación de tabla — es lo que ya hace bien `joi-pos-backend` (`POST /shops/{id}/charge`, no `PATCH /wallets/{id}`), extendido a los otros 2 frentes.

### 3.4 Rate limiting y API Gateway

Mientras la API sirve solo a los 3 frentes propios, un rate limit simple por `tenant_id` + IP alcanza (protege contra el POS de un mundo con un bug de reintento infinito, el caso real más probable). API Gateway dedicado (Kong/AWS API Gateway) se evalúa en la Fase 3, cuando/si se abre la API a integraciones de terceros.

### 3.5 Secrets y storage

Secrets fuera del bundle del frontend siempre (ya es la lección directa del hallazgo crítico de esta semana) — AWS Secrets Manager o el equivalente de Supabase, nunca en variables `VITE_*` para nada que no sea explícitamente público. Storage (fotos de comercio, vouchers, mapas de evento) se mantiene en Supabase Storage, pero las subidas pasan por el backend (que valida tipo/tamaño y adjunta el `tenant_id`) en vez de subir directo desde el cliente con la `anon key`.

### 3.6 Testing y CI/CD

Pirámide real: dominio con tests unitarios puros (sin mocks de red), casos de uso con tests de integración contra Postgres real (Testcontainers), y un puñado de e2e que ejercitan los 3 frentes contra un backend de staging — no se testea todo con e2e, es lento y frágil. CI corre unit+integration en cada PR; e2e corre en el merge a `main` y antes de cada deploy a producción. Deploy a producción requiere CI verde — hoy el deploy es manual vía Vercel CLI sin ningún gate automático.

---

## 4. Comparación con Stripe / Adyen / MercadoPago / Square

| Dimensión | Stripe/Adyen/Square (referencia) | JOI360 hoy | JOI360 objetivo (post-roadmap) |
|---|---|---|---|
| Ledger | Partida doble, inmutable | No existe — campo mutable | Partida simple inmutable (ADR-002), evaluar partida doble en Fase 3 |
| Idempotencia | Obligatoria, por header | No existe | Obligatoria en toda escritura de dinero (ADR-007) |
| Multi-tenant | Cuentas conectadas, aislamiento fuerte | `world_id` a mano por query | `tenant_id` forzado por framework + RLS (ADR-005) |
| Auth | OAuth2/API keys con scopes | `localStorage`, sin JWT | JWT + RBAC/ABAC + service accounts (ADR-006) |
| Procesos largos | Orquestación de estados (payouts, disputas) | Banderas editadas a mano | Eventos + outbox + saga (ADR-008) |
| Observabilidad | Tracing end-to-end, dashboards | `error_log` únicamente | Tracing + audit log (ADR-009) |
| API | Recursos de negocio (`charges`, `transfers`) | Mezcla de CRUD directo y algunos endpoints de negocio | 100% API de negocio (sección 3.3) |

**Score honesto hoy: 3/10.** No por falta de visión de producto — el modelo de Mundo/Motores/capacidades es genuinamente bueno y está mejor pensado que en muchas plataformas de este tamaño — sino porque la implementación no tiene ninguna de las garantías estructurales (atomicidad, idempotencia, aislamiento forzado, auditoría) que un sistema de dinero necesita para escalar sin que los descuadres crezcan con el volumen.

**Score proyectado al cierre de la Fase 2 del roadmap (sección 6): 7/10** — cubre el 90% del riesgo real (dinero, multi-tenant, auth) sin construir las piezas que el volumen actual todavía no pide (Fase 3: CQRS ancho, partida doble completa, Temporal, microservicios).

---

## 5. Migración: strangler fig, no reescritura

Los 3 frentes existentes (`joi360-admin`, `joi360-app`, `joi360-operador`) **no se reescriben**. Se migran caso de uso por caso de uso hacia el backend nuevo, empezando por el de mayor riesgo (Wallet), mientras el resto sigue hablando PostgREST directo hasta que le toque su turno. En cualquier punto del roadmap el sistema es 100% funcional — nunca hay una ventana de "todo roto mientras se reescribe".

Orden de migración (mismo orden que el roadmap): **Wallet/Ledger → Auth → Comercios/Cobro POS → BNPL → Eventos → Liquidación → el resto.** Wallet primero porque es donde ya está el dinero real y el riesgo más alto; Auth segundo porque todo lo demás depende de tener roles reales antes de poder cerrar RLS de verdad.

---

## 6. Roadmap

### Fase 0 — Ya hecho hoy (semilla del ADR-001/002)
`mover_saldo_wallet` y `transferir_p2p_wallet` como funciones de Postgres (`SECURITY DEFINER`), `REVOKE UPDATE` directo sobre `wallets.balance`, `DELETE` bloqueado sobre las 4 tablas de dinero sin uso legítimo. Es la prueba de concepto mínima de "el cliente deja de escribir directo" — a escala de un par de funciones SQL, no de un backend completo.

### Fase 1 (4-6 semanas) — Backend mínimo + Wallet/Ledger + Auth
- Scaffolding de `joi360-core` (NestJS, estructura de la sección 3.2), CI básico (lint + unit tests en cada PR).
- Módulo Wallet completo: `accounts`, `journal_entries`, `holds`, endpoints de negocio (cobro, recarga, transferencia, reversa) con idempotencia.
- Auth real (Supabase Auth + JWT + roles) — sin esto, cerrar RLS del resto de tablas rompe el sistema.
- Migrar los 8 puntos de escritura de saldo (ya identificados hoy) de los 3 frentes para que llamen al backend nuevo en vez de al RPC de Postgres directo — el RPC de la Fase 0 fue el parche seguro inmediato, el backend real lo reemplaza.
- **Entregable verificable:** los 3 casos reales (Raimondi, Kermesse, BNPL/Mok) siguen funcionando de punta a punta, con el dinero pasando por el ledger nuevo.

### Fase 2 (6-8 semanas) — Multi-tenant forzado + módulos restantes + observabilidad
- Middleware de `tenant_id`, RLS real (ya no `using(true)`) en todas las tablas.
- Migrar Comercios, Accesos, BNPL, Eventos, Menú como bounded contexts propios.
- Outbox + eventos de dominio; saga para el ciclo de vida de BNPL y para Liquidación.
- Tracing (OpenTelemetry) + audit log de acciones de negocio sensibles.
- Rate limiting básico por tenant.
- **Entregable verificable:** score de la sección 4 sube de 3/10 a 7/10.

### Fase 3 (a demanda, no con fecha fija) — Escalar lo que el volumen real pida
- CQRS ancho para reportería/dashboards si el volumen de lectura lo justifica.
- Ledger de partida doble completo si RedPontis empieza a operar como intermediario de fondos regulado, no solo como facilitador entre mundo y usuario.
- Temporal si el número de procesos largos concurrentes (BNPL multi-mundo, onboarding masivo) supera lo que BullMQ maneja cómodo.
- Extraer microservicios puntuales (worker de Liquidación, motor de Eventos en picos) si el perfil de carga diverge del resto.
- API Gateway dedicado si se abre la API a integraciones externas.

No hay Fase 4 con alcance fijo a propósito: construir para el volumen que el negocio realmente alcance, no para el que un arquitecto imagina hoy — es el mismo principio que ya guió la Fase 3 completa del `01-diagnostico.md`.
