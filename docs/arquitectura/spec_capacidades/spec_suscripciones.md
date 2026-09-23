# SPEC Funcional — Suscripciones (Membresía de Mundo, modelo YOKI)

*Especificación funcional, no un registro de iteraciones. Verificada contra el código real de `SuscripcionesTemplate` (`joi360-app/src/pages/Module.jsx:5196-5309`), `SponsorSuscripcionesTab` (`joi360-admin/src/Fronts.jsx:2980+`) y el ciclo de cobro (`supabaseClient.js`) el 23-sep-2026. Formato de referencia: `spec_eventos.md`.*

---

## 1. Propósito y alcance

Membresía recurrente del **Mundo** (no de RedPontis) — modelo de referencia YOKI: el Mundo crea uno o más planes con marca propia (banner, logo, color), categoría de beneficio y comercios afiliados; el usuario se suscribe, paga el primer período desde su wallet, y desde ahí el cobro se repite solo cada período.

`v1.1.0` (07-sep-2026, aclaración explícita de Camila), `tier: OPCIONAL`, depende SOLO de `wallet`. **Sin `configFields` propios.**

---

## 2. Modelo de negocio

### 2.1 Independiente de familiares/dependientes — regla dura, ya causó confusión una vez
**Aclaración textual de Camila en el código (07-sep-2026):** esta capacidad NO tiene ninguna relación con vincular familiares ni con los perfiles controlados. El cobro de una cuota al vincular un dependiente es un mecanismo **distinto** que vive en la capacidad `control` (`crearDependienteRemote` con `cuotaSuscripcion`), y solo reutiliza `subscription_plans` como catálogo de montos compartido — no es esta capacidad, no se gatea igual, no comparte lógica de negocio. Ver `spec_control.md` §2.2 para el detalle del otro lado.

### 2.2 Categoría de beneficio
Un plan declara una `categoria_beneficio`: `sorteo` (con lista de productos + fecha de sorteo), `descuento`, `acceso` (especial), `producto` (incluido), `otro` — cada una con su propio `beneficio_detalle` (jsonb, forma distinta según la categoría).

### 2.3 Cobro recurrente sin scheduler — mismo patrón que BNPL
El proyecto es SPAs + PostgREST, sin cron/Edge Functions. El cobro periódico se resuelve **on-load** (`sincronizarCicloSuscripcionesMembresia`, se corre al cargar el módulo): por cada suscripción activa con `proxima_fecha_cobro <= hoy`, intenta cobrar el período vía `mover_saldo_wallet` (mismo RPC atómico de siempre). Si el saldo no alcanza, la fecha simplemente NO avanza — se reintenta sola la próxima vez que alguien cargue el módulo, sin dejar a la suscripción en un estado roto ni suspenderla automáticamente (a diferencia de BNPL, que sí tiene un estado `suspendido` explícito — Suscripciones hoy no lo tiene, gap a confirmar si se necesita).

---

## 3. Componentes

### 3.1 Creación y edición de planes (admin, Mundo)
`SponsorSuscripcionesTab` (`Fronts.jsx`): nombre, descripción, precio, periodo (mensual|anual), % descuento opcional, banner/logo (upload real a `joi360-media` storage) + color, categoría de beneficio con su detalle específico, comercios afiliados (multi-select contra el directorio real del mundo). Activar/desactivar (deja de verse para nuevos suscriptores, no afecta a quienes ya lo tienen) y eliminar (con confirmación).

### 3.2 Suscripción (app, usuario)
`SuscripcionesTemplate`: lista de planes activos del mundo, cada uno como card con banner/logo/color reales. Si ya está suscrito, badge "Suscrito" + fecha del próximo cobro. Si no, botón "Suscribirme" → cobra el primer período de inmediato (mismo RPC real) y crea el registro en `subscription_suscriptores`.

### 3.3 Ciclo de cobro
`sincronizarCicloSuscripcionesMembresia` — descrito en §2.3. Corre en la app al montar el template (no hay indicación de que corra también del lado admin en esta pasada — a confirmar).

---

## 4. Modelo de datos

```
subscription_plans
  id, world_id, nombre, descripcion, precio, periodo (mensual|anual),
  descuento_pct, activo, banner_url, logo_url, color_hex,
  categoria_beneficio (sorteo|descuento|acceso|producto|otro),
  beneficio_detalle (jsonb), created_at

subscription_plan_merchants
  plan_id, merchant_id, created_at  -- PK compuesta

subscription_suscriptores
  id, world_id, plan_id, user_id,
  estado (activa|pausada|cancelada), metodo_pago (solo 'saldo_wallet' real hoy),
  fecha_inicio, proxima_fecha_cobro, ultimo_cobro_at, created_at
  unique (plan_id, user_id)
```

`metodo_pago` queda abierto a valores futuros (ej. `yape_recurrente`) a propósito en el schema, pero esa integración NO está construida — solo `saldo_wallet` tiene lógica real detrás.

---

## 5. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| BackOffice Mundo | `SponsorSuscripcionesTab` (`Fronts.jsx`) | Crear/editar/activar/eliminar planes con marca propia |
| App Usuario | `SuscripcionesTemplate` (`Module.jsx`) | Ver planes, suscribirse, ver próximo cobro |

---

## 6. Reglas de negocio críticas

1. Suscripciones (esta capacidad) e independiente de Control/dependientes — nunca mezclar la lógica aunque compartan la tabla `subscription_plans` como catálogo.
2. El primer período se cobra al momento de suscribirse, no al primer ciclo.
3. Un cobro fallido por saldo insuficiente no suspende ni cancela la suscripción — solo no avanza la fecha, reintenta sola.
4. `estado='pausada'|'cancelada'` existen en el schema pero no se vio en esta pasada ningún flujo de UI que los setee — a verificar en el próximo corte si son alcanzables.

---

## 7. Estado y versionado

`suscripciones` — **v1.1.0**, `tier: OPCIONAL`, depende de `wallet`. Componentes de creación/suscripción/cobro construidos y en producción. Gap a confirmar: pausar/cancelar desde la UI del usuario.

## 8. Referencias

- `docs/arquitectura/add-suscripciones-membresia.sql` / `fix-174-subscription-plans.sql` — migraciones origen.
- `docs/arquitectura/spec_capacidades/spec_control.md` §2.2 — el mecanismo distinto que reutiliza el mismo catálogo de planes.
- `docs/arquitectura/spec_capacidades/spec_bnpl.md` — mismo patrón de ciclo on-load sin scheduler, con manejo de mora más elaborado.
