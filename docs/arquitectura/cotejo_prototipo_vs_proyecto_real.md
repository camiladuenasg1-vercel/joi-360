# JOI 360 — Cotejo: Prototipo ↔ Proyecto Real (Salvador / Kiro) + Directiva de Construcción en Loop

Fecha: 2026-09-02 · Base: corte semanal 28-ago del prototipo (Historial v1.3 / Maestro v1.2) + auditoría de incongruencias del prototipo (5 agentes, 28-ago) + auditoría R2 del proyecto real de Salvador (26-ago).

---

## 1. Propósito

Cruzar tres cosas y dejar una directiva firme:

1. **El corte semanal 28-ago del prototipo** — las 6 capacidades nuevas a `v1.0.0` (Loyalty, Turnos, Transporte, Reservas, Estacionamiento, Subsidio) + Promociones al flujo estándar, más el versionado por capacidad.
2. **La auditoría de incongruencias del prototipo** (5 agentes, ~60 hallazgos, 10 tracks) — `docs/arquitectura/incongruencias_y_plan_28ago.md`.
3. **La auditoría R2 del proyecto real de Salvador** (26-ago, 17 hallazgos, 6-7 falsos positivos, 2 fixes) — `MASTER_FINDINGS_REGISTRY.md` / `CONSTRUCTION_PLANS.md` / `REGRESSION_REPORT.md` / `AUDIT_CLOSURE_SUMMARY.md`.

**Resultado esperado:** el proyecto de Salvador debe tener construido y **versionado hasta el corte del 28-ago** todo lo que tiene el prototipo — en BD, repo y backend — pero adaptado a **su** lógica, **su** modelo de tenants y **sus** rutas. Este documento dice qué es "todo", cómo se cruza con lo que él ya tiene, qué NO debe replicar (la deuda del prototipo), y con qué ciclo lo audita y construye, en loop.

---

## 2. Los dos proyectos

| | **Prototipo (nuestro)** | **Proyecto real (Salvador / Kiro)** |
|---|---|---|
| Repos | `joi-360` — `joi360-admin`, `joi360-app`, `joi360-operador` (nativo), `joi-pos-backend` | `joi360mono` — `joi360-api` (backend modular), `Joi360App` (iOS SwiftUI), `Joi360AppAndroid` (Compose), POS Android |
| Stack | React 19 + Vite + Tailwind · Supabase (PostgREST + RPCs Postgres) · sin SDK | Backend modular (`modules/capabilities/catalog.js`, `modules/pos/service.js`, `modules/promotions/service.js`, `mobile-extras/service.js`) · apps nativas · design system propio (`JoiDesignSystem`) |
| Multi-tenancy | **Mundo** — `world_id` (text), capacidad activable y configurable por mundo | **Tenants de la empresa** + rutas por tenant (a mapear contra "mundo") |
| Fuente del estado de una capacidad | `MODULE_CATALOG` (local, `joi360-admin/src/store.js`) + `capacities` (Supabase) + `FLAG_DEV_MAP` por servicio | `catalog.js` con `devStatus` por servicio |
| Render dinámico | `TEMPLATE_MAP` (superapp) resuelve `capacity_id` → pantalla; config viva desde `world_capacity_configs` + `world_feature_flags` | Render codes (`PROMOTIONS`, `PERFIL_EXT`, …) resueltos por `normalizedCode()` en `WorldConfigHelper` |
| Endpoints de ejemplo | `rpc/mover_saldo_wallet`, `/rest/v1/<tabla>` | `/retail/summary`, `/retail/offers/:id/claim`, `/shops/:slug/menu/reservations` |
| Estado al 28-ago | 19 capacidades `v1.0.0` + 3 `v0.0.0`; prototipo funcional, verificado en vivo | En construcción; R2-Audit (26-ago) confirmó Promociones y aprobación parental ya funcionales |

---

## 3. El patrón común de las dos auditorías (leer esto primero)

**Las dos auditorías encontraron el MISMO defecto de raíz: el catálogo / metadata de render se desincroniza del código real.**

- **Salvador (R2-Audit):** `catalog.js` marcaba `devStatus: 'in_progress'` para capacidades **ya construidas** (`promociones.vitrina_app`, `promociones.canje_pos`). 6 de 10 hallazgos prioritarios resultaron **falsos positivos** — el código ya estaba, el `devStatus` estaba viejo. Fix: `devStatus: 'ready'`. Lección explícita del cierre: *"El `devStatus` en catalog.js no reflejaba el estado real del código."*
- **Nosotros (auditoría 28-ago):** `syncCatalogRemote` hace `version: "1.0"` **hardcodeado** en el upsert a `capacities` (hallazgo E2) → las 22 capacidades muestran `"1.0"` en Supabase, incluidas Facturación/Crédito/Asistencia que en código son `0.0.0`. `FLAG_DEV_MAP` tenía servicios ya construidos marcados "Planificado" (corregido 26/28-ago). Los docs de frente del 12-ago (`01/03/04/05/06`) listan 11 capacidades "Próximamente" cuando el código bloquea solo 3.

**Conclusión para los dos proyectos:** el `devStatus` / `version` / `status` de una capacidad **no puede vivir escrito a mano**. Tiene que:
- derivarse del código (existe el template + la tabla + el endpoint → `ready`), o
- derivarse de un test de aceptación que corre en CI, o
- como mínimo, tener un hook que valide `devStatus` declarado vs. realidad antes de cada corte (la propia auditoría de Salvador lo recomienda: *"Automatizar verificación: hook que valide devStatus vs código real"*).

---

## 4. Cotejo hallazgo por hallazgo — R2-Audit (Salvador) ↔ Prototipo

| ID Salvador | Hallazgo | Equivalente / estado en el prototipo | Qué debe quedar (directiva) |
|---|---|---|---|
| **PR-01 / PR-02 / PR-03** | Promociones: vitrina en app, canje en POS, endpoint móvil. Reportados CRITICAL → **falsos positivos**: ya construido; solo `catalog.js` viejo. | En el prototipo, Promociones **salió de `MODULOS_PROXIMAMENTE` al flujo estándar de capacidad el 25-ago** (`v1.0.0`). El catálogo de servicios se **recortó a lo real**: solo cupón QR; banner / push segmentado / A-B testing quedaron fuera como fase 2. Tablas `promociones` + `promociones_canjes`. | Salvador: (a) `devStatus:'ready'` — hecho. (b) **Su catálogo de `promociones` debe exponer SOLO los servicios que existen** (cupón QR / canje POS / vigencia+cupo), igual que el nuestro recortado — no listar banner/push/A-B si no están. (c) Confirmar `PR-03` con un test del endpoint, no con lectura de código. |
| **CT-01** | Aprobación parental: ¿retorna `forbidden()` o deja `PENDING_APPROVAL`? Reportado HIGH → **falso positivo**: `AprobacionRequerida → PENDING_APPROVAL` funciona en `pos/service.js:cobrar()`. | En el prototipo, `control:aprobaciones` / `parent_approval` es **un banner informativo, NO hace enforcement real** (audit 04-ago, sin cambios). `mover_saldo_wallet` sí rechaza por horario / límite diario del dependiente (`fix-234`), pero **no existe un estado "pendiente de aprobación del padre"** — el rechazo es inmediato. | **Acá el proyecto de Salvador está MÁS avanzado que el prototipo.** Directiva invertida: el modelo objetivo es el de Salvador (`PENDING_APPROVAL` real, notificación al apoderado, venta se completa tras aprobación). El prototipo debería alinearse a eso, no al revés. Documentar el flujo de Salvador como el canónico para `control:aprobaciones`. |
| **MN-01** | Reserva QR de Menú no funcional: UI existe, backend no procesa reservas QR ni genera QR. HIGH, `open → verified` (existen `reservasDeMenu()` / `canjearMenu()`). | **Mismo gap en el prototipo.** `MenuTemplate` tiene flujo completo de reserva **con pago por saldo** (`menu_reservas` real), pero si el mundo elige `metodoReserva = qr` o `ambos`, la app **avisa honestamente que el canje en punto de venta no está construido** — no lo simula. | Gap compartido y real. **Construir el canje QR de Menú en el POS es trabajo pendiente en ambos proyectos.** Salvador: si `reservasDeMenu()` / `canjearMenu()` ya existen en su backend, cerrar el tramo del POS que valida el QR al servir. |
| **RC-01 / RC-02** | Códigos de render inconsistentes: `PROFILE_EXTENDED` (catalog) vs `PERFIL_EXT` (HubView); `SUBSIDY` vs `SUBSIDIES`. Funciona por `normalizedCode()` pero es frágil. | Equivalente en el prototipo (agente 5): `capacity_feature_flags` **contaminado** — el id estable y el nombre legible se guardan como **dos filas distintas** (96 filas para lo que serían ~50); `eventos:ticketing` es un id muerto que no corresponde a ningún servicio del catálogo. | **Regla para los dos:** un **id estable por capacidad y por servicio** (snake_case, sin espacios). El nombre legible es un **campo aparte**, nunca una segunda fila ni un segundo case. Sin mapeos "manuales" que compensen la deriva — se arregla el origen. |
| **DTO-01 / DTO-02** | Campos que faltan en Android vs iOS: `ExtendedProfileDto.completed`, horarios de consumo (`consumptionSchedule`) no expuestos en `ChildDto`. DTO-01 → **falso positivo** (ya está en `Dtos.kt:770`). | El prototipo es una SPA única (no hay dos apps nativas), así que no hay "paridad iOS/Android" directa. El equivalente: **capacidad activa sin sus feature flags sincronizados** (`world_feature_flags` vacío para 11 capacidades de `mundo-3ox15t`), y el **seed local de `joi360-app/store.js` desincronizado** con `MODULE_CATALOG`. | Directiva para Salvador: **el contrato de DTOs entre backend ↔ iOS ↔ Android es una sola fuente.** Generar los DTOs de las apps desde el esquema del backend (codegen) o tener un test de paridad de campos en CI. `consumptionSchedule` es config del mundo/tenant — exponerlo por el DTO del hijo si la app lo va a mostrar. |
| **UX-01 / UX-02 / UX-03 / UX-04** | Design system Android incompleto (faltan `JoiEmptyState` / `JoiErrorState` / `JoiLoader` equivalentes a iOS); `FamilyFlows` sin loading state; spacing / iconos ad-hoc. UX-02 → **implementado**. | Equivalente en el prototipo: **Discrepancia #12** — `joi360-admin/tailwind.config.js` y `joi360-app/tailwind.config.js` comparten el vocabulario de tokens pero con **valores hex distintos y definidos por separado**, sin paquete de tokens compartido (divergencias reales: `secondary`, `surface`, `ok` vs `success`). | Mismo problema de **paridad de design system**. Salvador: paridad de componentes iOS ↔ Android (Track UX-01 de su backlog). Nosotros: paquete de tokens compartido admin ↔ app. Los dos apuntan a "un solo sistema de diseño, un solo set de componentes, dos plataformas". |
| **LOG-01 / VAL-01 / PERF-01 / DOC-01** | `console.log` en prod; regex de email permisiva; re-renders por keys; `AGENTS.md` desactualizado. LOW, backlog. | Equivalentes menores en el prototipo (botones sin `onClick`, `MODULE_CATALOG.base` rama muerta, "Mundos activos" contado distinto por pantalla — Track H). | Backlog en ambos. Limpiar en el mismo lote que cada capacidad, no como fase aparte. |

**Lectura del cotejo:** de los 10 prioritarios de Salvador, **8 son o falsos positivos (catálogo viejo) o gaps que el prototipo también tiene**. Los 2 donde Salvador va **adelante** del prototipo (aprobación parental real, promociones canje POS) marcan el modelo objetivo — el prototipo se alinea a Salvador ahí, no al revés.

---

## 5. Lo que Salvador debe tener construido y versionado HASTA EL CORTE 28-ago

Esta es la lista **tajante**. Todo esto existe en el prototipo al 28-ago y debe existir en el proyecto real, adaptado a su arquitectura de tenants + rutas, y **versionado** (una versión semver por capacidad, igual que el prototipo).

> ⚠️ La R2-Audit de Salvador es del **26-ago** — anterior al corte. Las **6 capacidades nuevas del corte + Promociones al flujo estándar** (§5.3) no están cubiertas por esa auditoría. Su próxima pasada de auditoría tiene que incluirlas.

### 5.1 Las 22 capacidades del catálogo, con su versión

| # | Capacidad (id) | Versión prototipo | Estado | Qué expone | Tabla(s) en el prototipo |
|---|---|---|---|---|---|
| 1 | wallet | 1.0.0 | Construido | saldo, perfiles, recarga, P2P, bandita NFC | `wallets`, `transactions`, `nfc_bands`, `nfc_requests` |
| 2 | comercios | 1.0.0 | Construido | alta merchant, tarifa, hardware, liquidación | `merchants`, `merchant_requests`, `pos_devices` |
| 3 | consumos | 1.0.0 | Construido | historial, conciliación diaria | `transactions` (sin tabla propia) |
| 4 | **promociones** | **1.0.0** (25-ago) | Construido | cupón QR + canje POS + vigencia/cupo | `promociones`, `promociones_canjes` |
| 5 | perfil_ext | 1.0.0 | Construido | ficha médica / emergencia | `user_profiles`, `dependents.alergias` |
| 6 | menu | 1.0.0 | Construido (salvo canje QR) | calendario, cupos, alergias, reserva | `menu_items`, `menu_programacion`, `menu_reservas`, `menu_membresias`, `consumo_alertas` |
| 7 | inventario | 1.0.0 | Construido (sin pantalla propia) | stock de productos | `products.stock` |
| 8 | accesos | 1.0.0 | Parcial | ingreso/salida QR/NFC, zonas | `access_log`, `access_shifts` |
| 9 | eventos | 1.0.0 | Construido | eventos B2B/B2C/Embebido, entradas, aforo, check-in | `events`, `event_ticket_types`, `event_tickets`, `event_merchants`, `event_agenda_items`, `event_checkin_log`, `event_guests` |
| 10 | precompra | (dentro de eventos) | Parcial | productos de evento pre-comprables | `products.event_id`, `event_product_orders` |
| 11 | credito | 0.0.0 | **Planificado — NO construir** | — | — |
| 12 | bnpl | 1.0.0 | Parcial (checkout simulado) | elegibilidad, límites del mundo, programa del comercio, contrato+cronograma | `bnpl_programa_comercio`, `bnpl_contratos`, `bnpl_notificaciones` |
| 13 | **turnos** | **1.0.0** (26-ago) | Construido | seguimiento de pedido food court + cola de cocina en Operador | `turno_pedidos` |
| 14 | **loyalty** | **1.0.0** (26-ago) | Construido | puntos derivados de compras reales, niveles; canje = v1.1 | (sin tabla — deriva de `transactions`) |
| 15 | **reservas** | **1.0.0** (26-ago) | Construido | recurso/fecha/hora, cancelación, ocupación informativa | `reservas` |
| 16 | facturacion | 0.0.0 | **Planificado — NO construir** (necesita PSE + SUNAT) | — | — |
| 17 | cashback | 1.0.0 | Construido | % del mundo, modalidad flat/por_comercio, cola de aprobación de cambios | `cashback_change_requests`, `wallets.cashback_balance` |
| 18 | control | 1.0.0 | Construido | dependientes, límites, horarios, alergias, alertas | `dependents`, `dependent_restrictions`, `consumo_alertas` |
| 19 | **subsidio** | **1.0.0** (26-ago) | Construido | saldo dirigido, acredita RedPontis desde ficha; consumo = v1.1 | `subsidios` |
| 20 | **transporte** | **1.0.0** (26-ago) | Construido | pasaje contra wallet, historial | (sin tabla — deriva de `transactions`) |
| 21 | **estacionamiento** | **1.0.0** (26-ago) | Construido | sesión ingreso/salida, cobro por permanencia al salir | `estacionamiento_sesiones` |
| 22 | suscripciones | 1.0.0 | Construido | planes con marca propia (modelo YOKI) + cobro recurrente real | `subscription_plans`, `subscription_plan_merchants`, `subscription_suscriptores` |
| — | asistencia | 0.0.0 | **Planificado — NO construir** (falta spec, bloqueada a Educación) | — | — |

**Directiva:** las 19 en `1.0.0` deben quedar construidas y versionadas `1.0.0` en el proyecto de Salvador. Las 3 en `0.0.0` (facturacion, credito, asistencia) se dejan como `planned` — **nada de template maqueta ni endpoint stub**.

### 5.2 El modelo de datos (mapeo prototipo → proyecto real)

| Bloque | Prototipo (Supabase) | Qué necesita el proyecto real |
|---|---|---|
| **Multi-tenancy** | `world_id` (text) en cada tabla; `worlds` con `acuerdo`, `pos_pin`, `grupo_id`, `comparte_saldo_grupo`, `sponsor_*`, `entidad_legal`, `ruc`, `pais` | El "mundo" mapea al **tenant** de Salvador. Cada tabla lleva el id del tenant. Las **rutas** se namespacean por tenant (ej. `/:tenant/...`). El grupo de mundos con saldo compartido (Etapa B) mapea a un grupo de tenants. |
| **Núcleo de dinero** | `wallets`, `transactions` + RPC `mover_saldo_wallet` (candado de dueño/apoderado **o** turno POS válido, + restricciones de dependiente), `mover_cashback_wallet`, `transferir_p2p_wallet` | Wallet + ledger de transacciones + **un único servicio/transacción de movimiento de saldo** con el mismo candado de identidad. Versionar ese servicio (§6). |
| **Config por tenant** | `world_capacity_configs` (activación + config), `world_feature_flags` (servicios ON/OFF), `world_channel_configs`, `world_acquiring_channel_configs`, `capacities`, `capacity_feature_flags` | Tabla de "capacidades activadas por tenant" + "flags de servicio por tenant" + catálogo global de capacidades con `version`/`status`/`servicios`. |
| **Por capacidad** | `turno_pedidos`, `reservas`, `estacionamiento_sesiones`, `subsidios`, `promociones` + `promociones_canjes`, `menu_*`, `event_*`, `bnpl_*`, `subscription_*`, `access_log`/`access_shifts`, `user_profiles`, `dependents` + `dependent_restrictions` | Una entidad propia por capacidad, con su id de tenant, aislada del resto. |
| **Operación POS** | `pos_turnos` (caja), `pos_devices`, `charge_requests`, `nfc_bands`, `admin_users`, `organizadores`, `support_tickets`, `liquidaciones`, `error_catalog` + `error_log` | Equivalentes con hashing de credenciales server-side desde el día 1 (§5.4). |

### 5.3 Lo específico del corte 28-ago (esto es lo "nuevo" que la R2-Audit no vio)

1. **Loyalty v1.0.0** — puntos 100 % reales derivados de transacciones de compra con la equivalencia del tenant, sin columna de saldo nueva ni tocar el RPC crítico de dinero. Niveles calculados en vivo. Canje → v1.1.
2. **Turnos v1.0.0** (food court) — `turno_pedidos` (recibido→preparando→listo→entregado); el registro se crea al pagar en un comercio del tenant; cola de cocina en el Operador. **No confundir con el turno de caja del POS ni con el turno de portería** (colisión de nombre — usar un nombre de entidad propio).
3. **Transporte v1.0.0** — pasaje contra la wallet con el mismo servicio de pago ya probado; historial derivado de transacciones por referencia. Sin entidad nueva.
4. **Reservas v1.0.0** — `reservas` (recurso/fecha/hora), cancelación real, ocupación informativa (sin bloqueo de cupo aún). Recursos reservables vienen del config del tenant. Sin cobro obligatorio (anticipo = v1.1).
5. **Estacionamiento v1.0.0** — `estacionamiento_sesiones`; el cobro se calcula sobre la duración real y se cobra **al salir**, nunca por adelantado; si el pago falla, la sesión no se cierra.
6. **Subsidio v1.0.0** — ledger propio; solo la plataforma acredita, desde la ficha de la persona; el consumo (gastarlo) = v1.1. No toca el balance de la wallet.
7. **Promociones al flujo estándar** — dejó de depender de un `type` de tenant especial; se activa como cualquier capacidad.
8. **Versionado por capacidad** — cada capacidad lleva su `version` semver; el salto de versión se registra en el corte semanal.

### 5.4 Lo que Salvador NO debe replicar (deuda del prototipo — que arranque limpio)

| Deuda del prototipo | Qué haga Salvador de una |
|---|---|
| `comercio.mdrOverride` nunca se escribe → la MDR / el neto del merchant se calculan siempre con `1.5%` o un canal global | Leer la **tarifa real del comercio** en todo cálculo de comisión/neto, desde el primer día. |
| **3 claves paralelas de "frecuencia de liquidación"** — solo una la usa el motor; el wizard setea otra → todo se liquida diario | **Una sola clave** de frecuencia de liquidación, escrita por el flujo de alta y leída por el motor. |
| `retentionPercentage` se muestra y se resta en la calculadora pero el motor no lo aplica → el documento al sponsor miente | O el motor aplica la retención, o la calculadora **no la promete** — nunca mostrar un neto que el corte real no produce. |
| `organizadores.password` / credenciales de merchant en **texto plano**, legibles con la llave pública; login solo funciona en el navegador que las creó | **Hash server-side + RPC/endpoint de verificación** para toda credencial, desde el día 1. Nunca comparar contraseñas en el cliente. |
| `pos_pin_hash` **legible con la llave pública** + bcrypt cost 6 sobre 4 dígitos → fuerza bruta offline | No exponer ningún hash al cliente. PIN de ≥6 dígitos o cost mayor. |
| Templates maqueta (`AsistenciaTemplate`, `CreditoTemplate`) **enrutados** en el mapa de render → si un tenant activa la capacidad por error, muestran datos inventados | Ninguna capacidad `planned` con pantalla maqueta enrutada. Cae a una vista genérica honesta ("sin construir todavía"). |
| Fechas de "hoy" y de vencimiento calculadas con UTC (`toISOString().slice(0,10)`) → se corren un día en zona horaria local | Fecha **local** siempre (construcción por `getFullYear/getMonth/getDate`), tanto para filtros de "hoy" como para etiquetas. |
| Lógica de cronograma/interés de BNPL **duplicada en 3 archivos del cliente** → el POS y la app producen fechas de cuota distintas | **Un solo servicio** (backend) para cronograma + interés de BNPL. El cliente no calcula plazos. |
| Config que se guarda solo en `localStorage` y dice "publicado" (estado de dev de feature flags, catálogo de productos) | Toda config que el usuario cree se persiste en la BD. Nada de "local-first nunca sincronizado". |
| `capacity_feature_flags` con el id estable y el nombre legible como **dos filas** (96 filas para ~50 servicios) | Id estable único por servicio; nombre legible = campo. `sync` bidireccional (insert + delete), no solo insert. |

---

## 6. Directiva de planning — auditar y construir EN LOOP

### 6.1 El ciclo obligatorio por capacidad

Ninguna capacidad se marca `ready` / `v1.0.0` hasta pasar el ciclo completo — **el mismo que Salvador ya corrió para la R2-Audit**:

```
AUDIT → DETECT → CROSS-CHECK → PLAN → BUILD → VERSION → REGRESSION → CLOSE (con evidencia)
```

- **CROSS-CHECK** = contra dos referencias: (a) la capacidad equivalente en el prototipo (template + tabla + endpoint), (b) el estado declarado en el corte semanal (`version`, `servicios`).
- **VERSION** = subir la `version` semver de la capacidad y registrar el salto (de → a) en el corte.
- **CLOSE con evidencia** = compilación verde + un test de aceptación que ejercita el flujo real (no lectura de código — la R2-Audit demostró que leer código produce falsos positivos en ambos sentidos).

### 6.2 Orden de construcción (tajante)

| Fase | Qué | Criterio de cierre |
|---|---|---|
| **F0 — Alinear el catálogo y el modelo de tenant** | `catalog.js` (o su equivalente) **deriva** `devStatus`/`version` del código o de un test, no a mano. Los 22 ids de capacidad y todos los ids de servicio son estables (snake_case). Mapear "mundo" → tenant y las rutas por tenant. | Un hook/test en CI que falla si un `devStatus` declarado no corresponde a la realidad (recomendación del propio cierre de la R2-Audit). |
| **F1 — Núcleo transaccional** | `wallets` + `transactions` + **un único servicio de movimiento de saldo** con el candado de identidad (dueño/apoderado **o** turno POS válido) + las restricciones de dependiente (horario / límite diario / productos bloqueados). Versionarlo en `rpc_versions.md` (o equivalente). | Test: sin turno ni sesión válida → rechazo `NO_AUTENTICADO`. Con turno del comercio → cobra. Dependiente fuera de horario → rechazo con motivo diferenciado. |
| **F2 — Las 13 capacidades baseline `v1.0.0`** | wallet, comercios, consumos, perfil_ext, menu, inventario, accesos, eventos, bnpl, cashback, control, suscripciones, promociones — una por una, ciclo completo, cross-check contra el prototipo. | Cada una: `version=1.0.0`, test de aceptación verde, entrada en el registro de hallazgos cerrada con evidencia. |
| **F3 — Las 6 capacidades del corte 28-ago** | loyalty, turnos, transporte, reservas, estacionamiento, subsidio (§5.3). Estas son las que la R2-Audit **no vio** — construir y versionar `1.0.0`. | Ídem F2. Además: cross-check explícito de que ninguna toca el servicio crítico de dinero salvo por el candado ya versionado. |
| **F4 — Cerrar los HIGH reales de la R2-Audit** | **MN-01** (canje QR de Menú en el POS) — construir el tramo del POS que valida el QR al servir. Confirmar **CT-01** y **PR-03** con un test que ejercita el flujo, no con lectura. | MN-01: apoderado reserva → sistema genera QR → POS valida al servir. Test verde. |
| **F5 — Backlog LOW** | UX-01 (paridad de design system iOS/Android), RC-01/RC-02 (unificar códigos de render), LOG-01 / VAL-01 / PERF-01. | En el mismo lote de cada capacidad, no como fase aparte. |

### 6.3 El loop permanente (cada corte semanal — viernes)

1. Re-correr los **5 agentes de auditoría** sobre el proyecto real (mismo esquema que la R2-Audit: Functional, Regression, UX/UI, Render Config, Cross-Agent QA).
2. **Cross-check** de cada hallazgo contra: el corte del prototipo de esa semana + `incongruencias_y_plan_28ago.md` + este documento.
3. Clasificar: falso positivo (catálogo viejo) / real / gap compartido con el prototipo / Salvador va adelante.
4. Cerrar cada hallazgo real con el ciclo de §6.1 y evidencia.
5. Actualizar el registro consolidado (`MASTER_FINDINGS_REGISTRY.md`) y subir la versión de las capacidades tocadas.
6. Entregar el corte: qué capacidad cambió de qué versión a qué versión + qué hallazgos se cerraron.

### 6.4 Anti-patrones — que NO se repitan en el proyecto real (salen de las dos auditorías)

1. Metadata de estado escrita a mano (`catalog.js devStatus`, `capacities.version`) — se deriva o se testea.
2. Config que no llega a la BD ("local-first nunca sincronizado").
3. Credenciales en texto plano / hashes expuestos al cliente.
4. Fechas en UTC para "hoy" o para vencimientos.
5. Lógica de dinero (cronograma BNPL, cálculo de comisión) duplicada en el cliente en vez de un servicio único.
6. Templates maqueta enrutados para capacidades no construidas.
7. Docs de frente que describen UI que ya no existe o estado que ya cambió — se regeneran del código en cada corte, o llevan un puntero a la fuente de verdad.
8. Ids de render/capacidad inconsistentes compensados con mapeos manuales — se arregla el origen.

---

## 7. Entregables

- **Este documento** (`.docx` en el Escritorio + `.md` en `docs/arquitectura/`).
- Se ancla en el **Anexo §10 del Maestro** como parte del paquete que Salvador toma "tal cual".
- Referencias cruzadas: `incongruencias_y_plan_28ago.md` (auditoría del prototipo), Historial de Tareas v1.3 (corte 28-ago), Mapeo Maestro v1.2 (§3 registro de capacidades con versión), `migraciones_aplicadas.md` + `rpc_versions.md` (estado verificado de BD/RPC).
