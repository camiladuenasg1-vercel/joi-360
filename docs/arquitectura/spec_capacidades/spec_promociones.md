# SPEC Funcional — Promociones

*Formato/profundidad de referencia: `spec_eventos.md`. Promociones es una capacidad chica y de alcance deliberadamente recortado — documento corto, proporcional.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `PromocionesTemplate`; `joi360-admin/src/MundoDetail.jsx` función `TabPromos`, `joi360-admin/src/Fronts.jsx` función `CanjearCuponWidget`, `supabase.js`), leído línea por línea el 23-sep-2026. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

## 1. Propósito y alcance real (recortado a propósito)

Cupones de descuento o cashback con canje por código QR en el punto de venta del comercio afiliado. **Tier:** OPCIONAL. **Versión:** `v1.0.0` (25-ago-2026 — salió de `MODULOS_PROXIMAMENTE` al flujo estándar de capacidad, alcance recortado). **Sin dependencias declaradas en `DEPENDENCY_MAP`.** **Template:** `PromocionesTemplate` (`TEMPLATE_MAP.promociones`).

**Regla de alcance, importante para no sobre-construir:** el catálogo (`servicios`) solo declara 3 cosas porque son las únicas reales — *Cupón QR*, *Canje en el POS del comercio*, *Vigencia y cupo de usos por cupón*. Banner segmentado, push, A/B testing y reportes de desempeño **no existen y se sacaron a propósito del catálogo** para no prometerle al admin algo que la capacidad no hace. Si se construyen en el futuro, se agregan ahí recién en ese momento — no antes.

## 2. Modelo de datos

```
promociones
  id, world_id, titulo, merchant_nombre, tipo ("Descuento %" | "Cashback"),
  valor, vigencia_hasta, usos_max, usos_actuales,
  codigo_qr, estado ("VIGENTE" | ...), created_at

promociones_canjes
  id, promocion_id, world_id, user_id, created_at
```

## 3. Config

- `maxCuponesUsuario` (number, def. 5) — máximo de cupones activos simultáneos por usuario (solo informativo en el contador del hero de la app; no bloquea la creación de cupones nuevos del lado admin).

## 4. Flujo real — creación → visualización → canje

**Admin (`TabPromos`, `MundoDetail.jsx`):** el Mundo crea/lista/pausa cupones (`crearPromocionRemote`/`actualizarPromocionRemote`/`eliminarPromocionRemote`) — título, tipo (Descuento % | Cashback), valor, vigencia, cupo de usos. El `codigo_qr` se genera del lado admin al crear.

**App (`PromocionesTemplate`):** trae los cupones reales del Mundo (`fetchPromocionesLive` — combina los propios del Mundo **más** los globales publicados por RedPontis desde el mundo especial `mundo-promos-rp`, sin duplicar lógica de fetch). Un cupón se marca `activo` solo si `estado==="VIGENTE"` Y no está vencido (fecha LOCAL, mismo bug de `toISOString()` ya corregido acá que en Menú/Eventos) Y no está agotado (`usos_actuales >= usos_max`). "Ver QR" abre un modal con el código real (`QRCode`, mismo componente que Wallet/Mis Entradas) para mostrar en el POS.

**Canje (`canjearCuponRemote`, POS del comercio vía `CanjearCuponWidget` en `Fronts.jsx`):** el operador teclea/escanea el código — validación server-side en este orden: (1) el código existe para ese Mundo, (2) `estado==="VIGENTE"`, (3) no vencido (fecha real del servidor, no la del cliente), (4) `usos_actuales < usos_max`. Solo si las 4 pasan: incrementa `usos_actuales` en 1 e inserta la fila de `promociones_canjes`. El cupón nunca queda "reservado" entre mostrar el QR y canjearlo — es un chequeo atómico al momento del canje, no un candado previo.

## 5. Cupones globales de RedPontis

`fetchPromocionesLive` trae, además de los propios del Mundo, los cupones creados bajo `world_id="mundo-promos-rp"` (mundo especial de RedPontis) — un mecanismo para que la plataforma publique promociones cross-ecosistema sin que cada Mundo tenga que crearlas por separado. Un Mundo que ES `mundo-promos-rp` no se auto-duplica sus propios cupones globales.

## 6. Qué NO existe (gap documentado, no simulado)

- Segmentación de a quién le llega un cupón (todos los usuarios del Mundo ven todos los cupones activos; no hay targeting por perfil/comportamiento).
- Notificaciones push cuando se publica un cupón nuevo.
- A/B testing de valor/copy de cupón.
- Reporte de desempeño real (canjes por cupón sí quedan en `promociones_canjes`, pero no hay ninguna pantalla que lo agregue/reporte todavía — la tabla existe, el dashboard no).
- Filtro por comercio específico — hoy toda promoción es a nivel Mundo, sin `merchant_id` propio en `promociones` (el `merchant_nombre` es texto libre, no una FK).

## 7. Estado y versionado

`v1.0.0`, alcance recortado deliberadamente el 25-ago-2026 para salir de `MODULOS_PROXIMAMENTE` con solo lo que tenía backend real. Verificado end-to-end: cupón creado → visible con QR real en la app → canje validado contra vigencia/cupos en el POS.
