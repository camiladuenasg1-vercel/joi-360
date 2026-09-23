# SPEC Funcional — Compras y Transacciones (Consumos)

*Documento de especificación funcional, no un registro de iteraciones. Formato de referencia: `spec_eventos.md`. Spec deliberadamente corta — la capacidad no tiene tabla propia y su template es un recorte de datos que ya existen en Wallet.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` → `ConsumosTemplate`, `joi360-admin/src/store.js` `MODULE_CATALOG`), 23-sep-2026.

---

## 1. Propósito y alcance

`consumos` (tier CORE) es el motor transaccional del backoffice — compras, pagos, devoluciones, anulaciones y movimientos de saldo en el POS y la app. **No tiene tabla propia**: todo vive en `transactions` (la misma tabla que ya usa `wallet`). El template de la superapp (`ConsumosTemplate`) es literalmente un recorte del historial de Wallet, filtrado a movimientos negativos (compras), no una fuente de datos independiente.

**Depende de:** `wallet, comercios` (`DEPENDENCY_MAP`).

---

## 2. Qué expone

`ConsumosTemplate` (`Module.jsx:4856`): banner de horario operativo del POS si `configFields.horarioOperativo` está seteado (`ConfigBanner`), 2 stats (total gastado, cantidad de compras — de las últimas 10 transacciones negativas del mundo activo) y la lista misma. **No agrega ningún dato nuevo que Wallet/Activity no tengan ya** — su valor es ser la superficie dedicada de "Mis Compras" cuando el mundo activa `consumos` como capacidad visible, distinta de la vista transversal de `/activity` (que mezcla TODOS los mundos y tipos, ver `kiro_steering/home-render-config.md` §4).

**Servicios declarados** (`MODULE_CATALOG.consumos.servicios`): `venta_pos` (el cajero registra ventas y puede anular dentro de un plazo configurado), `compra_app` (QR/NFC desde la superapp), `historial` (esta vista), `conciliacion` (cierre diario y preparación de pago al merchant — ver `spec_comercios.md` §2.4, Módulo de Liquidación).

**Gap documentado, no construido:** el config field `horarioOperativo` restringe la operación del POS por horario, pero **no existe ningún flujo real de "anular una venta"** en ningún lado del proyecto (ni admin ni `joi-pos-backend`) — un campo antiguo `anulacionHasta` (horas máximas para anular) se retiró explícitamente del catálogo por esta razón, según comentario del propio código fuente. Si se construye la anulación de venta en el futuro, ese es el config field a reintroducir.

---

## 3. Config fields (`MODULE_CATALOG.consumos`)

| Campo | Tipo | Default |
|---|---|---|
| `horarioOperativo` | timerange, nullable | sin restricción (24/7) |

---

## 4. Modelo de datos

Ninguna tabla propia. Lee `transactions` (compartida con `wallet`, `comercios`, y de hecho con casi toda capacidad que mueve dinero) filtrando `monto < 0`.

---

## 5. Estado y versionado

Capacidad `consumos` — **v1.0.0**, `tier: CORE`, depende de `wallet, comercios`. Construida y en producción — su "construcción" real ya ocurrió al construir Wallet/Comercios; esta capacidad es la superficie dedicada, no lógica nueva.

## 6. Referencias

- `spec_wallet.md` — dueño real de `transactions` y del historial.
- `spec_comercios.md` §2.4 — conciliación/liquidación real, el otro servicio declarado de esta capacidad.
