# JOI360 — Diagnóstico de la arquitectura actual

**Fecha:** 2026-08-02
**Alcance:** implementación técnica. El negocio y el frontend React no se cuestionan aquí.
**Método:** inventario del código y de la base productiva, no impresiones.

Este es el primer entregable del rediseño. No propone nada todavía: describe qué hay,
con números, y señala qué de eso no aguanta el crecimiento. Las propuestas van en el ADR.

---

## 1. Qué es JOI360 hoy, medido

| Frente | Líneas | Rol | Dónde corre |
|---|---:|---|---|
| `joi360-admin` | 17 559 | Panel RedPontis + panel del mundo + panel del comercio + panel del organizador | Navegador |
| `joi360-app` | 8 157 | Superapp del usuario final | Navegador |
| `joi360-operador` | 2 513 | POS/operador Android (Kotlin + Compose) | Terminal |
| `joi-pos-backend` | 1 302 | API del POS | Vercel (serverless) |

**47 tablas** en Supabase. **9 de ellas las tocan los tres frentes a la vez**, incluidas
`wallets` y `transactions`.

La proporción cuenta la historia: **25 716 líneas en el navegador contra 1 302 en el
servidor**. El backend no es el sistema; es un accesorio que se construyó tarde y solo
para el POS, porque un terminal Android no podía llevar la llave de Supabase.

---

## 2. El problema central: no hay backend, hay una base de datos con URL pública

Los tres frentes hablan PostgREST directo con la `anon key`, que viaja en el bundle. No es
un detalle de implementación: es *la* decisión de la que cuelga todo lo demás.

### 2.1 El dinero se mueve desde el navegador

Escrituras sobre tablas críticas (`wallets`, `transactions`, `event_tickets`, `nfc_bands`,
`liquidaciones`, `bnpl_contratos`), contadas en el código:

| Frente | Dónde corre | Escrituras |
|---|---|---:|
| `joi360-app` | **Navegador, anon key** | 20 |
| `joi360-admin` | **Navegador, anon key** | 14 |
| `joi-pos-backend` | Servidor | 3 |

**34 de 37 escrituras sobre dinero ocurren en el cliente.** Las reglas de negocio que las
protegen —"no transferir más de lo que tienes", "no cobrar dos veces"— viven en JavaScript
que el usuario controla. Cualquiera con las DevTools abiertas puede saltárselas.

Esto no es teórico. Ya ocurrió: una transferencia con monto `-120` invirtió la operación,
creó S/ 120 en una billetera y destruyó S/ 120 en otra. La validación de saldo existía,
pero corría después de la comparación y con un negativo pasa sola. Se detectó semanas
después, por casualidad, mirando otra pantalla.

### 2.2 No hay transacciones: hay tandas de HTTP con los dedos cruzados

Una transferencia P2P son **cuatro llamadas HTTP secuenciales** sin atomicidad:

```
PATCH wallets/origen    (resta)
PATCH wallets/destino   (suma)
POST  transactions      (pata de envío)
POST  transactions      (pata de recibo)
```

Si la segunda falla —red caída, RLS, timeout de Vercel— el dinero **desaparece**: se
descontó del origen y nunca llegó al destino, y no queda ni el asiento que lo explique. No
hay rollback porque no hay transacción. No hay compensación porque no hay saga. La única
razón por la que esto no ha estallado es el volumen bajo.

**No existe una sola función de Postgres ni un RPC en todo el proyecto.** Cero. Toda la
lógica de negocio —incluida la financiera— es JavaScript de cliente orquestando REST.

### 2.3 El saldo es un campo mutable, no un saldo

`wallets.balance` se sobreescribe con `PATCH`. Las transacciones se insertan *aparte*, como
un log informativo que nadie concilia. Consecuencias directas:

- El saldo y su historial **pueden divergir** y nada lo detecta.
- No se puede reconstruir un saldo a una fecha pasada.
- No hay reversas ni ajustes: para corregir hay que editar el número a mano (lo hicimos, y
  tuvimos que inventar un asiento de corrección para que el cambio no fuera invisible).
- No existen retenciones ni autorizaciones: no se puede "reservar" saldo mientras se
  confirma un cobro.

Para una plataforma de dinero cerrado, esto es el equivalente a llevar la contabilidad con
un post-it y guardar las facturas en otro cajón.

### 2.4 Sin idempotencia

No hay una sola clave de idempotencia en el proyecto (las tres menciones que aparecen son
`upsert` por constraint en liquidaciones, otra cosa). Un doble toque en "Cobrar", un
reintento del navegador o una respuesta perdida cobran dos veces. En un POS, con red móvil
en un colegio, el reintento no es un caso de borde: es martes.

---

## 3. Multi-tenant que depende de que nadie se equivoque

Cada consulta filtra por `world_id` **a mano**, en el call site. Son cientos de llamadas.
La aislación entre tenants es, literalmente, que ningún desarrollador olvide un `&world_id=eq.`.

RLS existe, pero las políticas son de demo: `for all to anon, authenticated using (true)
with check (true)`. Es decir, **la base no aísla nada**; solo el `where` del cliente.

Un mundo es además mucho más que un tenant: es una vertical (colegio, mall, resort,
gobierno) que enciende capacidades distintas. Esa riqueza hoy vive en `world_capacity_configs`
+ `world_feature_flags`, que es la parte **mejor resuelta** del sistema y debe conservarse —
pero se lee sin ninguna garantía de que quien pregunta tenga derecho a ese mundo.

---

## 4. Configuración que vivía fuera de la base

Hasta esta semana, `eventosConfig` —el modo B2B/B2C/Embebido de cada mundo, o sea quién
puede crear un evento y dónde se renderiza— existía **solo en el `localStorage` del admin**.
Ni el superapp ni el POS podían leerlo. Cada navegador tenía su propia versión de la verdad.

Se corrigió persistiéndolo en `world_capacity_configs.config`. Pero el hecho de que una
decisión de ese peso pudiera vivir un año en el almacenamiento local de un navegador dice
algo estructural: **no hay una frontera que obligue a que el estado del negocio sea del
servidor**. Mientras el cliente pueda decidir y guardar, esto volverá a pasar.

Síntoma del mismo problema: el bucket de Storage nunca se había creado, y las subidas que
dependían de él (voucher de liquidación, foto del comercio) fallaban en silencio desde que
se construyeron. Nadie se enteró porque no hay nada que observe.

---

## 5. Concentración de código

| Archivo | Líneas |
|---|---:|
| `joi360-app/src/pages/Module.jsx` | 3 972 |
| `joi360-admin/src/Fronts.jsx` | 3 521 |
| `joi360-admin/src/MundoDetail.jsx` | 2 457 |
| `joi360-admin/src/store.js` | 1 768 |
| `joi360-admin/src/supabase.js` | 1 552 |

`Module.jsx` contiene los templates de **todos** los módulos del superapp: wallet, eventos,
accesos, menú, inventario, BNPL, perfil extendido. `Fronts.jsx` contiene tres paneles
distintos (mundo, comercio, anunciante). Agregar un producto nuevo significa hacer más
grandes los mismos cinco archivos.

No hay capas: no existe separación entre presentación, casos de uso, dominio y acceso a
datos. `supabase.js` es a la vez repositorio, servicio y regla de negocio.

---

## 6. Lo que no existe

Sin rodeos, y sin que la ausencia sea automáticamente un defecto — algunas de estas cosas
un producto joven no las necesita todavía:

| Pieza | ¿Existe? | ¿Duele hoy? |
|---|---|---|
| Capa de dominio / casos de uso | No | **Sí** |
| Ledger contable | No | **Sí** |
| Transacciones atómicas | No | **Sí** |
| Idempotencia | No | **Sí** |
| Autorización real (RBAC/ABAC) | No | **Sí** |
| Aislamiento multi-tenant forzado | No | **Sí** |
| Audit log | No | **Sí** |
| Eventos de dominio / event bus | No | Todavía no |
| Outbox | No | Todavía no |
| Saga / coordinador | No | Al crecer BNPL, sí |
| Colas / workers | No | Al crecer liquidación, sí |
| Caching | No | No |
| API Gateway / rate limiting | No | Al abrir la API, sí |
| Observabilidad, métricas, tracing | No | **Sí** |
| Tests | No | **Sí** |
| CI/CD | Parcial (deploy manual a Vercel) | Sí |
| IaC | No | Todavía no |

La columna de la derecha importa tanto como la del medio: el objetivo no es tener las
veinte piezas, es tener las que el negocio ya está pagando por no tener.

---

## 7. Lo que está bien y hay que conservar

Un diagnóstico que solo destruye es inútil. Esto funciona y debe sobrevivir al rediseño:

1. **El modelo de capacidades y flags.** `world_capacity_configs` + `world_feature_flags`,
   con la regla de que un flag cuenta solo si está en `true` *y* su capacidad padre está
   encendida. Es un sistema de módulos real, no un `if` por cliente. Es exactamente la pieza
   que permite que "nuevos módulos entren sin reescribir el core", y es la base sobre la que
   se debe construir, no algo a reemplazar.
2. **El render-config del POS.** `joi-pos-backend/lib/renderConfig.js` ya hace lo correcto:
   el terminal no decide su menú, lo recibe. Es el patrón que debería extenderse a los otros
   frentes, no la excepción.
3. **La separación conceptual de actores.** RedPontis / mundo / comercio / organizador /
   usuario final están bien delimitados en el producto. El problema es que esa frontera no
   existe en el código ni en los permisos, no que esté mal pensada.
4. **El catálogo de errores** (`error_catalog` + `error_log`). Mensajes de negocio
   centralizados y registro de fallos: es más de lo que tienen muchos proyectos maduros.

---

## 8. Veredicto

**El negocio está bien modelado. La implementación no tiene arquitectura.**

Lo que hay es un prototipo que funciona: tres SPAs que hablan directo con una base de datos,
con la lógica financiera repartida entre ellas y sin nada que garantice que el dinero cuadre.
Llegó más lejos de lo que un prototipo suele llegar —hay flujos reales de punta a punta,
con datos reales— y eso habla bien de las decisiones de producto.

Pero no escala en tres ejes a la vez:

- **Volumen:** sin transacciones ni ledger, los descuadres crecen con el número de operaciones.
- **Clientes:** sin aislamiento forzado ni autorización, cada tenant nuevo es una superficie
  de riesgo más.
- **Productos:** sin capas, cada módulo nuevo engorda los mismos cinco archivos.

El rediseño no debe empezar por elegir NestJS ni por dibujar microservicios. Debe empezar
por mover una frontera: **el cliente deja de escribir en la base**. Todo lo demás —dominio,
ledger, idempotencia, permisos, eventos— se vuelve construible recién después de eso, y sin
esa frontera ninguna de esas piezas se sostiene.

Ese es el contenido del siguiente documento: el ADR.
