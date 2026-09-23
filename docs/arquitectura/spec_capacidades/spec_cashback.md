# SPEC Funcional — Cashback

*Formato/profundidad de referencia: `spec_eventos.md`. Cashback es una capacidad mediana — 1 pantalla de usuario + 1 RPC de dinero + 1 cola de gobernanza. Documento proporcional, no forzado a la extensión de Eventos.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `CashbackTemplate`, `supabaseClient.js`; `joi360-admin/src/Fronts.jsx`, `Gobierno.jsx`, `supabase.js`), leído línea por línea el 23-sep-2026. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

## 1. Propósito y alcance

Devuelve un porcentaje del consumo a un saldo de cashback separado del principal, acreditado en el comercio donde se generó y disponible para canjear como descuento en una compra futura. **Tier:** OPCIONAL. **Versión:** `v1.0.1`. **Depende de:** `wallet, comercios`. **Template:** `CashbackTemplate` (`TEMPLATE_MAP.cashback`).

**Corrección de estado importante:** un documento previo (12-ago) describía esta capacidad como "Solo UI (maqueta)" — saldo hardcodeado, botón "Transferir a billetera" sin `onClick`. Eso ya NO es cierto (corregido en el commit `18e0606`, confirmado leyendo el código actual): `CashbackTemplate` lee datos 100% reales, y el botón muerto ya no existe en el componente.

## 2. Modelo de dinero — saldo separado, misma disciplina que la wallet principal

`wallets.cashback_balance` es una columna aparte de `wallets.balance` — el cashback NUNCA se mezcla con el saldo principal. Se mueve exclusivamente por una RPC dedicada:

```
mover_cashback_wallet(walletId, delta, tipo, worldId, merchantId, reference, turnoId)
tipo: "cashback_ganado" (se acredita tras una compra en un comercio HABILITADO)
    | "cashback_canjeado" (el operador lo aplica como descuento al cobrar, en el POS)
```

**Comercio habilitado:** el cashback solo se genera en comercios con `merchants.cashback_habilitado = true` — no es automático para todo el Mundo con solo activar la capacidad; hay un segundo interruptor por comercio.

**Modalidad de cálculo** (`configFields.modalidad`, `flat` | `por_comercio`):
- `flat`: un único `wallets.cashback_balance` para todo el Mundo, sin desglose.
- `por_comercio`: el desglose se **deriva de `transactions`** (`fetchCashbackPorComercio`, filtra `type IN (cashback_ganado, cashback_canjeado, cashback_revertido)` agrupado por `merchant_id`) — cero tabla nueva, mismo patrón de "no duplicar dinero" que Loyalty.

## 3. Config y flags

- **Config:** `modalidad` (select flat|por_comercio, def. flat) · `porcentajeDefault` (percent, def. 3) · `topeMensual` (currency, def. 50, nullable = sin tope).
- **Servicios** (texto libre en el catálogo, sin `id` corto — a diferencia de la mayoría de capacidades): % de retorno sobre venta, tope mensual, categorías con cashback diferenciado, vigencia del cashback acumulado, historial de retornos.

## 4. Gobernanza — el Mundo NO edita su propia config de cashback directamente

Diferencia real frente a la mayoría de capacidades (donde el admin del Mundo edita `configFields` libremente): un cambio a la config de Cashback (`porcentajeDefault`, `topeMensual`, `modalidad`) pasa por una **solicitud de cambio** (`crearSolicitudCambioCashback`, tabla `cashback_change_requests`) que RedPontis aprueba o rechaza desde `Gobierno.jsx` (`resolverSolicitudCambioCashback`) — mismo lugar y mismo patrón de cola cross-mundo que la aprobación de Eventos y las Solicitudes de Alta de Comercio (ver `spec_eventos.md` §3.9). El Mundo ve su config actual en su propio panel pero no la edita en el mismo gesto.

## 5. UI real (`CashbackTemplate`)

1. **Hero:** `cashback_balance` real + tope mensual si está configurado.
2. **Tasa de retorno:** el `porcentajeDefault` actual +, si existe desglose por comercio, un tip señalando el comercio donde más cashback se acumuló (`topComercioNombre`, derivado del propio desglose, no un dato aparte).
3. **Historial:** movimientos reales filtrados del mismo historial de la wallet (`CASHBACK_GANADO` / `CASHBACK_CANJEADO` / `CASHBACK_REVERTIDO`) — sin un fetch nuevo, reusa `useWalletLive`.

**Canje:** ocurre en el POS del comercio al momento de cobrar (`CobrarPanel`, `Fronts.jsx`) — no hay un flujo de "canjear desde la app" independiente; el cashback se aplica como descuento cuando el operador cobra, no algo que el usuario dispare por su cuenta.

## 6. Qué NO existe (gap documentado, no simulado)

- "Categorías con cashback diferenciado" está en la lista de `servicios` del catálogo pero no tiene ningún `configField` ni lógica real detrás — es un único porcentaje flat por Mundo, sin diferenciación por categoría de producto.
- "Vigencia del cashback acumulado" tampoco tiene campo ni enforcement real — el saldo de cashback no vence.

## 7. Estado y versionado

`v1.0.1`, construida con datos reales, corregida de un bug de mock real (commit `18e0606`) y verificada contra el flujo de gobernanza de solicitudes de cambio.
