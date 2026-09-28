# Gestor de Cobranzas — Diseño

Implementación dentro de `joi360mono`. Este documento fija qué se reutiliza, qué hay que construir
y qué está pendiente de definición.

Todas las rutas de archivo son reales y verificadas en el repositorio.

---

## 1. Discovery — qué hay hoy en Admin RP

Lo que sigue es el resultado de inspeccionar `joi360mono/app-source/client/src/admin/`. Importa
porque varias cosas que un spec daría por sentadas **no existen**, y eso cambia el plan.

| Pregunta | Respuesta | Archivo |
|---|---|---|
| Layout base | `Shell({children, title, contextNav})`: sidebar de 260px + header de 64px + `<main>` | `admin/ui.jsx` |
| Menú lateral | Constante `NAV`, arreglo de grupos. Item activo por igualdad exacta de `pathname` | `admin/ui.jsx` |
| Rutas | `HashRouter`, todas bajo `<Route path="/admin" element={<ProtectedRoute/>}>`, envueltas con el helper `A` | `admin/App.jsx` |
| Primitivos de UI | `Icon`, `Pill`, `TierTag`, `Toggle`, `Field`, `inputCls`, `NumInput`, `Drawer`, `Loading`, `BtnPrimary`, `BtnOutline` | `admin/ui.jsx` |
| Cliente HTTP | `fetchApi` sobre `/joi360app/api/admin/v2`, Bearer en variable de módulo, desenvuelve `data.data` | `admin/api.js` |
| Estado global | Store propio con `useSyncExternalStore`, hook único `useStore()` | `admin/store.js`, `admin/hooks.js` |
| Toasts | `notify(msg, type)` por `CustomEvent` + `<Toaster/>` global | `admin/ui.jsx` |
| Errores de render | `ErrorBoundary` re-montado por ruta | `admin/ErrorBoundary.jsx` |
| Validación | Funciones a mano: `validarRuc`, `validarCorreo`, `validarDocumentoIdentidad`, `primerError` | `admin/validaciones.js` |
| Permisos server | `requireAdminAccess` bloquea escritura a nivel `LECTURA`, montado para todo `/admin/v2` | `server/auth/require-portal-access.js`, `server/modules/admin/routes.js` |
| Grupos Cognito | `admin-manager/operator/support`, `sponsor-*`, `merchant-*` | `server/auth/access.js` |
| Capacidades por mundo | Tab "Capacidades" → `PUT /worlds/:worldId/modules/:moduleCode` | `admin/MundoDetail.jsx` (`TabModulos`), `server/modules/admin/routes.js` |
| Catálogo de capacidades | `GET /catalogs/modules`, origen `capabilities/catalog.js` | `admin/Catalogo.jsx`, `server/modules/capabilities/catalog.js` |
| Planes de suscripción | Solo familiares, por mundo: `family_subscription_plan` | `server/modules/admin/routes.js`, `admin/MundoDetail.jsx` (`FamilyPlansManager`) |
| CSV export real | Existe, pero en el portal de comercio, no en admin | `client/src/comercio/ui.tsx` (`descargarCsv`) |

### Lo que NO existe y este frente necesita

Esto es lo importante del discovery. Ninguno de estos puntos se puede asumir.

| Falta | Impacto |
|---|---|
| **Contexto de comercio activo** | No hay ruta `:merchantId`, ni provider, ni selector. El "detalle de comercio" son drawers dentro de `MundoDetail.jsx` y el id viaja en estado local. Hay que crear la ruta y la hidratación. |
| **Capacidades por comercio** | `merchant_module` / `merchant_capabilities` dan **0 resultados** en todo el repo. El único override por comercio es BNPL (`bnpl_merchant_config`). Es el patrón a imitar. |
| **Componente de tabla** | No existe. Las 8 tablas del admin son `<table>` crudas repetidas. Sin paginación ni ordenamiento en ninguna. |
| **Componente de KPI o card** | No existe. Se copia y pega un `<button>` con clases fijas en cada pantalla. |
| **Librería de gráficos** | No existe en `package.json`. Cualquier visual es HTML/CSS a mano. |
| **Paginación server-side** | No existe en ningún listado del admin. |
| **Filtros en la URL** | No existe. `useSearchParams` no se usa en ningún archivo del cliente. |
| **Exportación en admin** | El botón de Soporte no tiene `onClick`; Resumen solo hace `notify`. Hay que traer `descargarCsv` desde comercio. |
| **Gating de permisos en el cliente** | `ProtectedRoute` solo mira si hay token. Un `admin-support` ve todos los botones de escritura y recibe el 403 al guardar. |
| **Correo transaccional** | No hay proveedor ni módulo de envío. |
| **Pasarela de pago** | La recarga de wallet es deliberadamente simulada. |
| **Tests** | Cero. Sin runner, sin script `test`, sin un solo archivo `*.test.*`. |

---

## 2. Principio de diseño

El frente tiene que parecer una sección nativa de Admin RP. En la práctica eso significa:

- Usar `Shell`, `NAV`, `Drawer`, `Field`, `inputCls`, `NumInput`, `Toggle`, `Pill`, `BtnPrimary`,
  `BtnOutline`, `notify`. Nada de traer otro design system.
- Usar `fetchApi` de `admin/api.js` y declarar los endpoints nuevos como métodos del objeto `api`.
- Usar el store existente para lo que es global (mundos, comercios) y `useState` + `useEffect` por
  pantalla para lo propio de cobranzas, que es el patrón del repo (ver `FamilyPlansManager`).
- SQL solo en `repository.js`, lógica en `service.js`, rutas que validan entrada y responden.
- Sin comentarios en el código: nombres claros y lo que necesite explicación va a `docs/`.

Lo que sí hay que construir nuevo, porque no existe y se necesita, está en §4.

---

## 3. Ubicación y rutas

El panel vive bajo el comercio, no bajo el mundo.

```
/admin/mundos/:worldId                        existe hoy
/admin/comercios/:merchantId                  NUEVO — detalle de comercio
/admin/comercios/:merchantId/cobranzas        NUEVO — panel de cobranzas
```

Al ser `HashRouter`, las URL reales son `#/admin/comercios/<id>/cobranzas`.

Dentro del panel, tabs internos (patrón de `MundoDetail.jsx`, no subrutas):

| Tab | Contenido | Requerimientos |
|---|---|---|
| Resumen | KPIs, evolución, distribución, próximos vencimientos | REQ-COB-070 |
| Planes | CRUD de planes y versiones de precio | REQ-COB-010 … 013 |
| Suscriptores | Cartera, búsqueda, filtros, ficha, carga masiva | REQ-COB-020 … 024 |
| Cobros | Cargos con su estado y acciones | REQ-COB-072, 073 |
| Morosidad | Quién debe, cuánto, desde cuándo, por tramo | REQ-COB-071 |
| Prorateo | Simulador y ejecución de cambio de plan | REQ-COB-060 … 062 |
| Reglas | Reglas de cobranza y calendario de avisos | REQ-COB-030 … 032, 040 … 044 |

Entrada al panel: en `MundoDetail.jsx` → `ActoresMerchants`, agregar una acción en la fila del
comercio cuando tiene la capacidad activa, al lado de "Inventario" y "Programa BNPL" que ya están.

Sidebar: agregar un item a `NAV` para una vista transversal de cobranzas de todos los comercios es
**opcional y fuera del alcance de fase 1**. El acceso es por comercio.

Ojo con el resaltado del sidebar: el item activo se calcula con `loc.pathname === item.to`, así que
una ruta con subrutas no queda resaltada. Si se agrega el item, hay que cambiar esa comparación en
`ui.jsx` a un `startsWith` controlado.

---

## 4. Componentes nuevos, estrictamente los necesarios

Se construyen en `admin/` y quedan disponibles para el resto del admin, que hoy los necesita y los
resuelve copiando y pegando.

| Componente | Por qué | Reemplaza a |
|---|---|---|
| `DataTable` | Tabla con paginación y orden server-side, estados vacío/cargando/error/sin-resultados y export | Las 8 `<table>` crudas |
| `KpiCard` | Tarjeta de métrica con valor, etiqueta, comparación y enlace | El `<button>` copiado en `PagesCore.jsx` |
| `FilterBar` | Búsqueda, selects, rango de fechas, contador de resultados | Los filtros locales de `Mundos.jsx` |
| `CsvDropzone` | Subida, parseo, validación por fila y vista previa | No existe |
| `Money` | Formato de monto con moneda del mundo, dos decimales | `Number(x).toFixed(2)` repetido |
| `EstadoBadge` | Badge de estado de cargo, con texto además de color | `Pill` genérico |
| `descargarCsv` | Export con BOM y escape de comillas | Se **copia** de `comercio/ui.tsx`, no se reimplementa |

`DataTable`, `KpiCard` y `FilterBar` son la parte del trabajo que le sirve a todo Admin RP más allá
de este frente. Conviene construirlos primero y con cuidado.

---

## 5. Pantallas y estados

Cada pantalla resuelve los diez estados de REQ-COB-080. La convención visual:

- **Cargando**: `<Loading/>` de `ui.jsx`.
- **Vacío**: caja con borde punteado, icono, título y una acción que resuelve el vacío. El texto
  dice qué falta hacer, no "no hay datos".
- **Sin resultados por filtros**: distinto del vacío. Mantiene la barra de filtros visible y ofrece
  limpiarlos. Nunca se muestra el vacío de "no hay cartera" cuando hay cartera y los filtros no
  matchearon.
- **Error**: mensaje del servidor + botón de reintento. Nunca `try?` silencioso.
- **Sin permisos**: la acción se deshabilita con `title` explicando por qué, no se esconde.
- **Capacidad no contratada**: pantalla completa explicando que el comercio no tiene el producto,
  con el enlace a activarla si el rol alcanza.
- **Degradado**: banner ámbar arriba diciendo qué parte no cargó, con el resto operativo.

---

## 6. Contexto de comercio

Hoy no existe. Se resuelve así, siguiendo el patrón del mundo:

1. Ruta `/admin/comercios/:merchantId` con `useParams()`.
2. `hydrateMerchantDetail(merchantId)` en `admin/store.js`, espejo de `hydrateMundoDetail` que ya
   existe (`store.js`): pide el detalle, lo mapea, lo mete en `st.comercios` por índice.
3. Un endpoint nuevo `GET /admin/v2/merchants/:merchantId` que devuelva el comercio con su mundo y
   sus capacidades. Hoy solo existe `GET /merchants?worldId=` que devuelve la lista.
4. El panel lee el comercio del store y **nunca** recibe el `merchantId` por prop desde otra
   pantalla. Así funciona igual entrando por URL directa.

Autorización: el `merchantId` de la URL no se confía. Cada endpoint valida contra los accesos de la
sesión con el mecanismo de `server/auth/access.js` (`resolverAccesos` ya cruza email contra
`merchant.contact_email`, `merchant.delivery_email` y `merchant_user.email`).

---

## 7. Activación por comercio — la decisión bloqueante

Este es el punto que hay que resolver antes de construir el resto.

Hoy las capacidades se activan por mundo en `world_module`. Este frente necesita activarlas por
comercio. Hay dos caminos y son excluyentes.

### Opción A — Tabla `merchant_module`, espejo de `world_module`

```sql
create table merchant_module (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references merchant(id) on delete cascade,
  module_code   text not null,
  enabled       boolean not null default false,
  config_json   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (merchant_id, module_code)
);
```

- **A favor**: generaliza. Cualquier capacidad futura se puede activar por comercio con el mismo
  mecanismo, y el catálogo puede declarar el alcance de cada una (`scope: 'world' | 'merchant' | 'both'`).
- **En contra**: obliga a decidir qué pasa cuando una capacidad está activa en el mundo y apagada en
  el comercio, y a tocar `capabilities/resolver.js`, que alimenta cinco frentes.

### Opción B — Tabla propia `collection_settings`, al estilo `bnpl_merchant_config`

- **A favor**: no toca el resolver de capacidades. Riesgo acotado. Es el patrón que ya se usó para
  el único override por comercio que existe hoy (`GET/POST /admin/v2/bnpl/merchant-config`).
- **En contra**: no generaliza. La próxima capacidad por comercio vuelve a inventar su tabla.

**Recomendación**: **Opción A**, con una salvedguarda. El catálogo declara el alcance y el resolver
solo considera `merchant_module` para las capacidades cuyo alcance lo incluye. Cobranzas nace con
alcance `merchant` puro, así que no hay conflicto con el mundo y el resolver actual no cambia de
comportamiento para ninguna capacidad existente. Eso deja el mecanismo general disponible sin
arriesgar los cinco frentes que dependen del resolver.

La decisión es de Salvador. `tasks.md` T-01 la pone como entregable previo a todo lo demás.

---

## 8. Modelo de datos

Convenciones del repo: `snake_case` en la base, `camelCase` en las respuestas, UUID con
`gen_random_uuid()`, `timestamptz` con `now()`, `NUMERIC` para dinero, estados en
`UPPER_SNAKE_CASE` inglés.

```
merchant (existe)
  └── collection_rule            1:1   reglas de cobranza del comercio
  └── notification_rule          1:N   calendario de avisos
  └── collection_plan            1:N   planes del comercio
        └── collection_plan_version  1:N   versiones de precio
  └── subscriber                 1:N   personas a las que cobra
        └── subscription         1:N   suscriptor + versión de plan
              └── charge         1:N   cargos por período
                    └── payment          1:N
                    └── payment_attempt  1:N
                    └── notification_event 1:N
        └── credit_balance       1:1   saldo a favor
        └── plan_change          1:N   cambios de plan con su prorateo
  └── import_job                 1:N   cargas masivas
  └── collection_audit_log       1:N   bitácora
```

### Tablas

**`collection_plan`** — el plan del comercio
`id`, `merchant_id`, `name`, `currency`, `active`, `min_commitment_months` (nullable),
`valid_until` (nullable), `created_at`, `updated_at`
`unique (merchant_id, name)`

**`collection_plan_version`** — cada precio que tuvo el plan
`id`, `plan_id`, `amount` NUMERIC, `periodicity` (`MONTHLY|QUARTERLY|SEMIANNUAL|ANNUAL`),
`billing_day_mode` (`FIXED_MONTH_DAY|RELATIVE_TO_SIGNUP`), `billing_day` (int nullable),
`effective_from` date, `created_by`, `created_at`

> Por qué versiones: REQ-COB-011 exige que cambiar el precio no altere a los vigentes. Sin versionado
> no se puede responder "cuánto se le cobró a esta persona en marzo y por qué".

**`subscriber`** — la persona
`id`, `merchant_id`, `document_type`, `document_number`, `full_name`, `email`, `phone` (nullable),
`contactable` boolean default true, `created_at`, `updated_at`
`unique (merchant_id, document_number)`

**`subscription`** — persona + versión de plan
`id`, `merchant_id`, `subscriber_id`, `plan_version_id`, `status`
(`ACTIVE|SUSPENDED|CANCELLED`), `amount` NUMERIC, `periodicity`, `started_at` date,
`first_charge_date` date, `current_cycle_start` date, `current_cycle_end` date,
`next_charge_date` date, `cancelled_at` (nullable), `created_at`, `updated_at`

> `amount` se guarda en la suscripción además de estar en la versión del plan: es el monto pactado
> con esa persona, que puede diferir del plan si se cargó por CSV con un monto propio.

**`charge`** — el cargo
`id`, `merchant_id`, `subscription_id`, `period_label`, `cycle_start` date, `cycle_end` date,
`issued_at`, `due_date` date, `base_amount`, `late_fee_amount`, `total_amount`, `paid_amount`,
`balance_amount`, `status`, `rules_snapshot_json` jsonb, `attempts_count` int default 0,
`created_at`, `updated_at`
`unique (subscription_id, period_label)` ← idempotencia de la emisión

> `rules_snapshot_json` congela las reglas con las que nació el cargo. Es lo que hace cumplible
> REQ-COB-030: un cambio de reglas no puede alterar cargos ya emitidos.

**`payment`** — el pago acreditado
`id`, `merchant_id`, `charge_id`, `amount`, `method`
(`CARD|QR|CASH|TRANSFER|CREDIT_BALANCE|MANUAL`), `paid_at`, `provider_reference` (nullable),
`registered_by` (nullable, para pago manual), `created_at`

**`payment_attempt`** — cada intento, exitoso o no
`id`, `merchant_id`, `charge_id`, `channel`, `status` (`SUCCESS|FAILED`), `failure_reason`
(nullable), `attempted_at`

**`collection_rule`** — reglas del comercio
`id`, `merchant_id` unique, `issue_days_before` int, `grace_days` int,
`late_fee_type` (`NONE|FIXED|PERCENT`), `late_fee_value` NUMERIC, `late_fee_as_separate_concept`
boolean, `late_fee_cap` NUMERIC nullable, `suspend_after_overdue_charges` int,
`reactivation_mode` (`AUTO_ON_PAYMENT|MANUAL`), `cancel_after_suspended_months` int nullable,
`max_manual_reminders_per_day` int default 3, `updated_by`, `updated_at`

**`notification_rule`** — calendario de avisos
`id`, `merchant_id`, `kind` (`PRE_DUE|ON_DUE|POST_DUE_REMINDER|GRACE_END|PAYMENT_CONFIRMED`),
`offset_days` int, `enabled` boolean, `template_subject`, `template_body`, `updated_at`
`unique (merchant_id, kind, offset_days)`

**`notification_event`** — cada aviso enviado
`id`, `merchant_id`, `charge_id` (nullable), `subscriber_id`, `rule_kind`, `channel`
(`EMAIL|WHATSAPP`), `trigger` (`SCHEDULED|MANUAL`), `status`
(`SENT|FAILED|SKIPPED_ALREADY_PAID|BOUNCED`), `sent_at`, `triggered_by` (nullable), `detail`

> `SKIPPED_ALREADY_PAID` existe como estado propio para poder demostrar que se cumple la regla
> obligatoria de REQ-COB-040.

**`plan_change`** — cambio de plan con su prorateo
`id`, `merchant_id`, `subscription_id`, `from_plan_version_id`, `to_plan_version_id`,
`effective_date` date, `cycle_days` int, `remaining_days` int, `credit_amount`, `charge_amount`,
`net_amount`, `resulting_charge_id` (nullable), `resulting_credit_id` (nullable),
`breakdown_json` jsonb, `applied_by`, `applied_at`

> `breakdown_json` guarda el desglose **tal como se le mostró al operador**. REQ-COB-061 lo exige:
> si el precio cambia mañana, el registro de hoy tiene que seguir diciendo lo mismo.

**`credit_balance`** — saldo a favor
`id`, `merchant_id`, `subscriber_id` unique, `amount` NUMERIC, `updated_at`

**`import_job`** — cada carga masiva
`id`, `merchant_id`, `filename`, `total_rows`, `valid_rows`, `invalid_rows`, `created_rows`,
`updated_rows`, `status` (`VALIDATING|VALIDATED|APPLYING|APPLIED|FAILED|CANCELLED`),
`errors_json` jsonb, `started_by`, `started_at`, `finished_at`

**`collection_audit_log`** — bitácora
`id`, `merchant_id`, `entity`, `entity_id`, `field` (nullable), `old_value` (nullable),
`new_value` (nullable), `action`, `reason` (nullable), `actor_email`, `created_at`

### Índices que hacen falta

```sql
create index on charge (merchant_id, status, due_date);
create index on charge (subscription_id, period_label);
create index on subscription (merchant_id, status, next_charge_date);
create index on subscriber (merchant_id, document_number);
create index on notification_event (merchant_id, sent_at);
create index on collection_audit_log (merchant_id, created_at desc);
```

Sin el primero, el listado de morosidad y los KPIs escanean la tabla completa por cada carga de
pantalla.

---

## 9. Contratos API

Base: `/joi360app/api/admin/v2`. Todos con `Authorization: Bearer <jwt>` y validación de acceso al
comercio. Todos responden el sobre `{ success, data, message }` que `fetchApi` desenvuelve.

### Activación

```
GET    /merchants/:merchantId                     detalle con mundo y capacidades
GET    /merchants/:merchantId/modules             capacidades del comercio
PUT    /merchants/:merchantId/modules/:moduleCode  { enabled, config }
```

### Resumen

```
GET /merchants/:merchantId/collections/summary?from&to
```

```json
{
  "currency": "PEN",
  "activePortfolio": { "subscribers": 312, "monthlyRecurring": "14820.00" },
  "period": { "from": "2026-09-01", "to": "2026-09-30",
              "issued": "14820.00", "collected": "11260.00",
              "pending": "2180.00", "overdue": "1380.00" },
  "delinquencyRate": 0.0931,
  "aging": { "d1_30": "620.00", "d31_60": "410.00", "d61_90": "200.00", "d90_plus": "150.00" },
  "upcoming": [{ "dueDate": "2026-10-05", "count": 128, "amount": "6080.00" }],
  "projection": { "nextPeriod": "2026-10", "amount": "14980.00" },
  "byStatus": [{ "status": "PAID", "count": 240, "amount": "11260.00" }]
}
```

Un solo endpoint agregado. REQ-COB-091 prohíbe calcular esto en el cliente.

### Planes

```
GET    /merchants/:merchantId/collections/plans
POST   /merchants/:merchantId/collections/plans
PATCH  /collections/plans/:planId
POST   /collections/plans/:planId/versions          nuevo precio
POST   /collections/plans/:planId/migrate-portfolio { toVersionId }  acción explícita
DELETE /collections/plans/:planId                   solo si no tiene suscriptores
```

### Suscriptores

```
GET  /merchants/:merchantId/collections/subscribers?page&pageSize&q&planId&status&collectionStatus&sort
GET  /collections/subscribers/:subscriberId
POST /merchants/:merchantId/collections/subscribers
PATCH /collections/subscribers/:subscriberId
POST /collections/subscriptions/:subscriptionId/cancel { effectiveDate, pendingChargesAction }
```

Respuesta paginada, forma común a todos los listados:

```json
{ "rows": [], "page": 1, "pageSize": 50, "total": 312, "totalPages": 7 }
```

### Carga masiva

```
POST /merchants/:merchantId/collections/imports          { filename, rows: [] }  → valida, no aplica
GET  /collections/imports/:importJobId                   estado y errores
POST /collections/imports/:importJobId/apply             aplica solo las filas válidas
POST /collections/imports/:importJobId/cancel
GET  /collections/imports/:importJobId/errors.csv        descarga de errores
```

Dos pasos a propósito: `POST` valida y devuelve el `importJobId` con el resumen; `apply` es el que
escribe. Así se cumple REQ-COB-020 (no se puede confirmar antes de validar).

`apply` es **idempotente** por `importJobId`: reintentar no duplica. Un job ya `APPLIED` responde
409 con su resultado.

### Reglas y avisos

```
GET /merchants/:merchantId/collections/rules
PUT /merchants/:merchantId/collections/rules
GET /merchants/:merchantId/collections/notification-rules
PUT /merchants/:merchantId/collections/notification-rules   reemplaza el set completo
```

### Cobros

```
GET  /merchants/:merchantId/collections/charges?page&pageSize&from&to&status&planId&subscriberId&method&hasLateFee
GET  /collections/charges/:chargeId
POST /collections/charges/:chargeId/payment-link         → { url, qrPayload, expiresAt }
POST /collections/charges/:chargeId/remind               { channels: ["EMAIL"], include: ["LINK","QR"] }
POST /collections/charges/:chargeId/manual-payment       { amount, method, paidAt, reference }
POST /collections/charges/:chargeId/cancel               { reason }
POST /collections/charges/:chargeId/late-fee             { action: "APPLY"|"REMOVE", reason }
```

### Morosidad

```
GET /merchants/:merchantId/collections/delinquency?bucket&sort&page&pageSize
POST /merchants/:merchantId/collections/delinquency/remind-bulk  { filters, channels, include }
```

`remind-bulk` responde `202` con un `jobId` y excluye en el momento del envío a quien ya pagó.

### Prorateo

```
POST /collections/subscriptions/:subscriptionId/plan-change/preview  { toPlanVersionId, effectiveDate }
POST /collections/subscriptions/:subscriptionId/plan-change          { toPlanVersionId, effectiveDate, breakdownHash }
```

`preview` no escribe nada. `breakdownHash` es el hash del desglose que se le mostró al operador: si
el servidor recalcula y no coincide, responde 409 y obliga a revisar. Evita aplicar un prorateo
distinto al que la persona aprobó.

### Exportación

```
GET /merchants/:merchantId/collections/export?report=portfolio|charges|payments|pending|delinquency|projection&<mismos filtros>
```

Devuelve CSV con `Content-Disposition`. Respeta comercio, filtros y permisos.

### Errores

Formato canónico del repo:

```json
{ "error": { "code": "snake_case_code", "message": "texto legible" } }
```

Códigos propios: `merchant_capability_not_enabled`, `plan_name_taken`, `plan_has_subscribers`,
`import_not_validated`, `import_already_applied`, `breakdown_mismatch`, `charge_already_paid`,
`reminder_rate_limited`, `invalid_rule_combination`.

---

## 10. Flujo de carga masiva

```
Operador elige archivo
   │
   ├─ el cliente parsea el CSV y valida forma (encabezados, filas no vacías)
   │     └─ error de archivo → no se manda nada al servidor
   │
   ├─ POST /collections/imports  con las filas parseadas
   │     └─ el servidor valida fila por fila contra los planes reales y la cartera existente
   │        crea import_job en VALIDATED con errors_json
   │
   ├─ el cliente muestra: N válidas, M con error, y la vista previa de cambios
   │     ├─ altas: cuántas personas nuevas
   │     └─ actualizaciones: por persona, qué campo cambia y de qué a qué
   │
   ├─ el operador confirma
   │     └─ POST /collections/imports/:id/apply
   │            dentro de una transacción: inserta altas, aplica updates,
   │            crea suscripciones, programa el primer cargo,
   │            escribe la bitácora, marca el job APPLIED
   │
   └─ el cliente muestra el resultado y ofrece descargar el CSV de errores
```

Por qué el servidor valida de nuevo lo que el cliente ya validó: el cliente no conoce los planes
reales ni la cartera existente, y un cliente nunca es fuente de verdad. El cliente valida para dar
feedback rápido; el servidor valida para decidir.

La validación del cliente reutiliza `admin/validaciones.js` (`validarCorreo`,
`validarDocumentoIdentidad`, `validarNumero`) para que el mensaje de error sea el mismo que en el
resto del admin.

---

## 11. Dependencias externas — pendientes de definición

Estas dos no se pueden resolver desde el frente y bloquean parte del alcance. Están marcadas como
pendientes, no inventadas.

### Correo transaccional — PENDIENTE

No hay proveedor ni módulo de envío en `joi360mono`. Lo único parecido es WhatsApp Cloud API para
notificación de turnos, que está tratada como opcional y asíncrona.

Hasta que se defina:
- `notification_event` se escribe igual, con `status: 'PENDING_PROVIDER'`.
- El panel muestra el aviso como "listo para enviar" y no como enviado.
- El link de pago se puede copiar a mano desde el panel, que es lo que hoy hace YOKI.

Esto **no bloquea la fase 1**: el valor de la gestión previa se entrega igual si el operador copia
el link. Bloquea la automatización del aviso.

### Pasarela de pago — PENDIENTE

La recarga de wallet es deliberadamente simulada (`provider_code: "SIMULADO-..."`). No hay
integración de cobro con tarjeta.

Hasta que se defina:
- El link de pago y el QR se generan y resuelven a una página que muestra el cargo.
- El pago se registra por la vía manual (REQ-COB-073), que es lo que YOKI hace hoy.
- `payment.provider_reference` queda nulo y `payment.method` es `MANUAL`.

Lo que **sí** se puede construir sin pasarela y es donde está el valor: saber a quién cobrar, cuánto,
el prorateo, y tener el canal de recordatorio listo.

---

## 12. Preparación para la fase 2

La fase 2 es cobro automático con tarjeta tokenizada. El diseño de fase 1 la habilita sin migración
destructiva:

- `payment_attempt` ya existe y ya modela intentos fallidos con motivo. Los reintentos automáticos
  escriben ahí.
- `charge.attempts_count` y `charge.rules_snapshot_json` ya soportan la política de reintentos.
- `collection_rule` puede ganar `retry_count` y `retry_interval_days` como columnas nuevas sin
  cambiar nada de lo existente.
- La tokenización entra como tabla nueva `subscriber_payment_method`
  (`subscriber_id`, `provider`, `token`, `brand`, `last4`, `exp_month`, `exp_year`, `is_default`).
  **El token lo guarda el proveedor; la plataforma guarda la referencia, nunca el número.**
- `payment.method` ya contempla `CARD`.
- El actualizador de tarjetas es un proceso que actualiza `subscriber_payment_method`; no toca
  cargos ni suscripciones.

Nada de esto se construye ahora.

---

## 13. Máquina de estados

La transición vive en `service.js`, en una única función, y no se replica en el cliente. El cliente
solo pinta y consulta `allowedActions`, que el servidor devuelve por cargo.

```
SCHEDULED ──(fecha de emisión)──> ISSUED ──(aviso enviado)──> PENDING
PENDING ──(pago total)──> PAID
PENDING ──(pago parcial)──> PARTIALLY_PAID ──(completa)──> PAID
PENDING | PARTIALLY_PAID ──(vence + gracia)──> OVERDUE
OVERDUE ──(supera plazo de suspensión)──> IN_ARREARS  (+ suspende la suscripción)
PENDING ──(intento falla)──> FAILED ──(reintento)──> PENDING
cualquiera menos PAID ──(anulación)──> CANCELLED
```

Devolver `allowedActions` por cargo desde el servidor evita el problema que ya tiene el admin hoy:
el cliente muestra botones que el servidor rechaza con 403.

---

## 14. Motor de prorateo

Vive en un módulo puro, sin dependencia de base de datos, para poder probarse solo. Es el único
lugar donde se calcula el prorateo.

```
Entrada:  cycleStart, cycleEnd, effectiveDate, currentAmount, newAmount
Salida:   { cycleDays, consumedDays, remainingDays, credit, charge, net, direction }
```

```
cycleDays      = días entre cycleStart y cycleEnd, inclusive
consumedDays   = días entre cycleStart y effectiveDate, sin incluir effectiveDate
remainingDays  = cycleDays − consumedDays
credit         = currentAmount × remainingDays / cycleDays
charge         = newAmount     × remainingDays / cycleDays
net            = round(charge − credit, 2)
direction      = net > 0 ? 'CHARGE' : net < 0 ? 'CREDIT' : 'NONE'
```

Reglas fijadas:

- El redondeo se aplica **una sola vez, sobre `net`**. Redondear `credit` y `charge` por separado
  desvía la suma.
- Aritmética con `decimal.js`, que ya es dependencia del proyecto. Nunca con `Number` sobre montos.
- `effectiveDate` fuera del ciclo es un error de entrada, no un cálculo raro.
- `effectiveDate == cycleStart` → `remainingDays == cycleDays`, el prorateo es el cambio completo.
- `effectiveDate == cycleEnd` → `remainingDays == 1`, no cero: el último día cuenta.

Casos de prueba obligatorios en `tasks.md` T-60.

---

## 15. Exportación

Se copia `descargarCsv` de `client/src/comercio/ui.tsx` a un util compartido del admin. Ya resuelve
BOM (`\ufeff`), escape de comillas y nombre con fecha, que es lo que hace que el archivo abra bien
en Excel en español.

Dos modos:

- **Cliente**: para listados ya cargados en pantalla, hasta 1.000 filas.
- **Servidor**: `GET .../collections/export` para todo lo demás. REQ-COB-091 no permite descargar
  10.000 filas al navegador para armar un CSV.

---

## 16. Bitácora

Se escribe desde `service.js`, nunca desde `routes.js`, y siempre dentro de la misma transacción que
el cambio que registra. Un cambio que se aplica y no se registra es peor que no aplicarlo.

Admin RP no tiene auditoría transversal hoy, así que `collection_audit_log` es propia del frente. Si
más adelante aparece una auditoría general, esta tabla se migra; el `service.js` cambia en un solo
lugar.

---

## 17. No funcionales — cómo se cumplen

| Requisito | Implementación |
|---|---|
| Aislamiento por comercio | `merchant_id` en toda tabla transaccional. Validación en cada endpoint contra los accesos de la sesión. Índices compuestos empezando por `merchant_id`. |
| Sin datos de tarjeta | La plataforma guarda referencia del proveedor, nunca PAN. Fase 2. |
| Link no adivinable | `charge.payment_token` UUID v4, con vencimiento. No secuencial. |
| Paginación server-side | `page` / `pageSize` en todos los listados. `DataTable` nace con eso. |
| KPIs agregados | Un solo endpoint `summary`, con SQL agregado. |
| Carga que no bloquea | Validación en `POST`, aplicación en `apply`, progreso por `GET` del job. |
| Trazabilidad | `merchantId` en cada log. `importJobId` como correlación de una carga. |
| Accesibilidad | `EstadoBadge` lleva texto además de color. Tablas navegables por teclado. Se hereda el contraste de Admin RP. |

---

## 18. Estrategia de tests

**El repo no tiene tests ni runner.** Montarlos es parte del trabajo, no un supuesto.

Propuesta: `vitest`, que es lo que ya se usa en el arnés de pruebas del preview de iOS en este mismo
ecosistema, y no arrastra configuración de Babel.

Prioridad, de mayor a menor valor por esfuerzo:

1. **Motor de prorateo** (`unit`). Es puro, es dinero, y es donde un error se paga caro. Los casos
   de T-60 son el mínimo.
2. **Validador de filas del CSV** (`unit`). Una tabla de entradas y salidas esperadas, incluyendo
   cada código de error de REQ-COB-020.
3. **Cálculo de mora y transición de estados** (`unit`). Función pura con `rules_snapshot`.
4. **Aislamiento por comercio** (`integration`). El test que importa: pedir datos del comercio B con
   sesión del A tiene que dar 403, no una lista vacía.
5. **Idempotencia de `apply`** (`integration`). Aplicar dos veces no duplica.
6. **Componentes** (`component`): `DataTable` con sus estados, `CsvDropzone` con archivo válido e
   inválido.

E2E queda fuera del alcance de fase 1: sin runner ni entorno de pruebas, montar Playwright es un
proyecto aparte.

---

## 19. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La activación por comercio toca `capabilities/resolver.js`, que alimenta 5 frentes | Alto | Opción A con alcance declarado en el catálogo: cobranzas nace `merchant` puro y el resolver no cambia de comportamiento para nada existente |
| No hay pasarela ni correo | Medio | Fase 1 entrega valor sin ellos: link copiable y pago manual. Documentado en §11 |
| No hay tabla ni paginación en el admin | Medio | `DataTable` se construye primero; le sirve a todo el admin |
| Cliente sin gating de permisos | Medio | El servidor ya bloquea. El frente devuelve `allowedActions` y deshabilita en vez de esconder |
| Cero tests en el repo | Alto para un motor de dinero | Montar vitest y cubrir prorateo, validación y mora antes de la primera demo |
| Cartera grande en la primera carga real | Medio | Lotes, progreso visible, índices desde el día uno |
| `documento` como clave natural | Medio | `unique (merchant_id, document_number)`. Un CE que cambia a DNI se resuelve a mano, con bitácora |

---

## 20. Orden recomendado

1. Decidir la activación por comercio (§7). Bloquea todo.
2. `DataTable`, `KpiCard`, `FilterBar`, `Money`, `EstadoBadge`. Son la base de todas las pantallas.
3. Ruta y contexto de comercio (§6).
4. Esquema de base de datos e índices (§8).
5. Planes con versionado. Sin planes no hay a qué asociar la cartera.
6. Carga masiva. Es la puerta de entrada de los datos reales de YOKI.
7. Emisión de cargos y máquina de estados.
8. Resumen, suscriptores, cobros, morosidad.
9. Motor de prorateo con sus tests.
10. Reglas y calendario de avisos.
11. Recordatorio manual y masivo. Cierra el loop de valor de la fase 1.
12. Exportación y bitácora.
13. Hardening: permisos, observabilidad, accesibilidad.
