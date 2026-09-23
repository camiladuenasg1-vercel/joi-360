# SPEC Funcional — Restricciones (Control Parental / Dependientes)

*Especificación funcional, no un registro de iteraciones. Verificada contra el código real de `RestriccionesTemplate` (`joi360-app/src/pages/Module.jsx:1026-1650~`) el 23-sep-2026. Formato de referencia: `spec_eventos.md`.*

---

## 1. Propósito y alcance

Gestión completa de **dependientes** (perfiles ligados a la cuenta del titular, con su propia wallet, identificados por bandita NFC/QR, netamente para consumo) y reglas de uso de saldo: límites diarios, horarios, alergias, productos bloqueados. Es la capacidad con **más `configFields`** de todo `MODULE_CATALOG` (10 campos).

`v1.0.0`, `tier: OPCIONAL`, depende SOLO de `wallet`.

---

## 2. Modelo de negocio

### 2.1 Un dependiente es un concepto propio, no una segunda cuenta
Se crea con nombre, DNI y alergias (catálogo fijo `ALERGIAS_CATALOG` + "Otra" libre); recibe un `dependent_user_id` con wallet propia (misma tabla `wallets`, mismo mecanismo que cualquier usuario). El titular (`guardian_user_id`) lo gestiona, no lo "es".

### 2.2 Cuota al vincular un dependiente — mecanismo DISTINTO de la capacidad Suscripciones
**Aclaración explícita de Camila en el código (07-sep-2026):** la capacidad `suscripciones` (ver `spec_suscripciones.md`) es la membresía independiente del mundo (modelo YOKI) — no tiene relación con familiares. El cobro al vincular un dependiente es un mecanismo propio de Control que solo **reutiliza** `subscription_plans` como catálogo de montos disponibles (mismos planes que el mundo ya creó para la membresía general, si los tiene) — no es la misma capacidad, no se gatea por `useModuleConfig("suscripciones")`. Si el mundo tiene planes creados, vincular un dependiente pasa por un paso 2 de "Confirmar suscripción" con selector de plan; si no tiene ninguno, la vinculación es gratuita e inmediata.

El cobro (cuando aplica) se hace vía `pagarSupabase`/RPC real ANTES de crear el registro — si el saldo del tutor no alcanza, se le avisa con el saldo real visible y un botón directo a recargar, sin crear el dependiente a medias.

### 2.3 Restricciones granulares — por dependiente, no globales
Reemplaza un modelo viejo (un único horario/límite fijado por RedPontis para TODO el mundo, sin diferenciar por perfil). Ahora, por cada dependiente, el tutor configura: `horario_inicio/horario_fin`, `limite_diario` (override del `limiteDiarioPerfil` global de la capacidad), y `productos_bloqueados` — un picker real contra el catálogo de productos del mundo (`fetchProductosMundoLive`), no una lista de categorías abstractas.

---

## 3. Componentes

### 3.1 CRUD de dependientes
Crear (con el flujo de cuota de §2.2), editar perfil (nombre/DNI/alias — Task #161, antes fijos desde la creación), editar alergias (Task #175 — separado de crear), eliminar. **Eliminar bloquea si `saldo > 0`** — el tutor debe vaciar el saldo del dependiente antes de poder borrarlo (evita perder plata "atrapada").

### 3.2 Restricciones granulares (`dependent_restrictions`)
Drawer por dependiente: horario permitido, límite diario propio (si no se define, hereda `limiteDiarioPerfil` de la config del mundo), productos bloqueados reales. `fetchRestriccionesDependientesBulk` trae todas de una vez para la lista principal (no N+1).

### 3.3 Gasto de hoy en vivo
Por cada dependiente, `gastadoHoy` se calcula sumando sus reservas/consumos reales de la fecha **local** (no UTC — mismo criterio del resto del proyecto) contra su `limiteEfectivo` (override o global).

### 3.4 Alertas de consumo
Flag `alertas` — banner `AlertasConsumoBanner` (fetch + marcar leída real, no decorativo), mencionado en `configFields.notificacionConsumoRealTime` (notificar al padre en cada transacción del dependiente).

### 3.5 Aprobaciones — banner informativo, sin enforcement real (gap documentado)
Flag `aprobaciones` + `configFields.montoAprobacionPadre`: existe como concepto ("montos sobre el umbral quedan pendientes de aprobación") pero **hoy es solo un banner informativo, no bloquea la transacción con un estado real "pendiente"**. El rechazo real por horario/límite diario del dependiente sí existe (vía el RPC de pago), pero no hay un estado intermedio "esperando que el padre apruebe".

**Nota de paridad con el proyecto nativo (ver `cotejo_prototipo_vs_proyecto_real.md` CT-01): en este punto específico, Salvador va ADELANTE del prototipo.** Si su backend ya implementa `PENDING_APPROVAL` real con notificación al apoderado y la venta se completa recién tras la aprobación, **ese es el modelo objetivo** — el prototipo debería alinearse a él, no al revés.

### 3.6 Propagación a otras capacidades
`registroAlergias` (config) se propaga a `menu` (bloqueo real de items con alérgenos) y a `perfil_ext` (donde las alergias de un dependiente se muestran de solo lectura — se editan acá, no ahí).

---

## 4. Modelo de datos

```
dependents
  id, world_id, guardian_user_id, dependent_user_id (unique), nombre,
  alergias, created_at

dependent_restrictions
  id, world_id, dependent_user_id, guardian_user_id,
  horario_inicio, horario_fin, limite_diario,
  productos_bloqueados (jsonb array), updated_at
  unique (world_id, dependent_user_id)

consumo_alertas
  -- alertas reales de consumo (fetch + marcar leída), estructura no
  -- re-verificada contra su ALTER TABLE en esta pasada.
```

Config (`configFields`, 10 campos — el más largo del catálogo): `perfilesControladosActivo, maxPerfilesControlados, registroAlergias, limiteDiarioPerfil, montoAprobacionPadre, horarioConsumo, soloMercantesAfiliados, notificacionConsumoRealTime, limiteGlobalMundo, alertasAdminEmail`.

---

## 5. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| BackOffice Mundo | `FamiliaresMundoWidget` (`Fronts.jsx`) | Ver familiares vinculados en el panel del Mundo |
| App Usuario | `RestriccionesTemplate` (`Module.jsx`) | CRUD completo, restricciones por dependiente, gasto de hoy |
| App Usuario (entrada cruzada) | Home → "Agregar familiar para pedirle su bandita" (`Wallet`) navega con `?agregar=1` | Atajo directo al flujo de creación |
| Profile | "Mi Familia" (`Profile.jsx`) | Vista consolidada CROSS-MUNDO de todos los dependientes del usuario (ver `home-render-config.md` §5) |

---

## 6. Reglas de negocio críticas

1. Cuota al vincular es un mecanismo propio de Control — NO es la capacidad Suscripciones, aunque reutilice su catálogo de planes.
2. El cobro (si aplica) ocurre ANTES de crear el registro del dependiente — nunca un dependiente a medias sin cobro resuelto.
3. Eliminar un dependiente exige `saldo == 0`.
4. Límite diario efectivo = override por dependiente (`dependent_restrictions.limite_diario`) si existe, si no el global del mundo (`limiteDiarioPerfil`).
5. "Aprobaciones" es hoy informativo, no bloqueante — no reportarlo como enforcement real hasta que se construya el estado `PENDING_APPROVAL`.
6. Alergias de un dependiente se editan SOLO en Control — en Perfil Extendido son de solo lectura.

---

## 7. Estado y versionado

`control` — **v1.0.0**, `tier: OPCIONAL`, depende de `wallet`. Todos los componentes de §3 construidos y en producción salvo el enforcement real de aprobaciones (§3.5, gap documentado, no simulado).

## 8. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` / `home-render-config.md` (Mi Familia en Profile).
- `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` CT-01 — directiva de alinear al modelo de Salvador en aprobaciones.
- `docs/arquitectura/spec_capacidades/spec_suscripciones.md` — la capacidad que NO es esta.
