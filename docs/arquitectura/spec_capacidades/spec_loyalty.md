# SPEC Funcional — Puntos Loyalty

*Formato/profundidad de referencia: `spec_eventos.md`. Loyalty es una capacidad pequeña y de un solo servicio (sin `microservicios[]` en el catálogo) — este documento es deliberadamente corto, proporcional a lo que existe.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `LoyaltyTemplate`, `supabaseClient.js` función `fetchLoyaltyPuntos`/`fetchLoyaltyPuntosBatch`), leído línea por línea el 23-sep-2026. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

## 1. Propósito y alcance

Acumulación de puntos por compras reales dentro de un Mundo, con niveles (Bronce/Plata/Oro) calculados en vivo. **Tier:** OPCIONAL. **Versión:** `v1.0.0` (26-ago-2026). **Depende de:** `wallet` únicamente. **Template:** `LoyaltyTemplate` (`TEMPLATE_MAP.loyalty`).

## 2. Decisión de arquitectura clave — sin ledger propio

Loyalty **no tiene tabla propia ni columna de saldo**. Los puntos se recalculan en cada lectura, directamente desde `transactions`:

```js
// supabaseClient.js — fetchLoyaltyPuntos(userId, worldId, equivalencia, caducidadMeses)
1. Trae todas las filas de `transactions` del wallet con type="compra"
   (si caducidadMeses está configurado, filtra created_at >= hoy - caducidadMeses)
2. totalGastado = Σ amount
3. puntos = floor(totalGastado / equivalencia)
```

Esto es deliberado, no una limitación: cero riesgo de que el saldo de puntos se desincronice del gasto real, porque no hay saldo que desincronizar — es una proyección, no un dato guardado. La "caducidad" de puntos no expira filas guardadas: simplemente estrecha la ventana de tiempo que la consulta considera. Un mes que sale de la ventana deja de aportar puntos automáticamente, sin ningún job de limpieza.

**Nivel** (calculado en el cliente, no en la base): `puntos < 500` → Bronce, `< 2000` → Plata, si no → Oro. Próximo umbral (`nextPts`) para la barra de progreso: 500 / 2000 / 5000.

## 3. Config y flags

- **Config:** `equivalencia` (currency, def. 0.10 — S/ que representa 1 punto) · `caducidadMeses` (number, def. 12, nullable = "sin caducidad" — ventana de meses hacia atrás que cuenta para el saldo).
- **Servicios/flags del catálogo:** `acumulacion` (automática, por cada compra real) · `saldo_pts` (contador visible con detalle de qué compra generó cada punto) · `niveles` (Bronce/Plata/Oro).

## 4. UI real (`LoyaltyTemplate`)

1. **Hero:** puntos totales + valor equivalente en soles (`puntos × equivalencia`) + chip de nivel + barra de progreso al siguiente nivel + nota de la ventana de caducidad si aplica.
2. **Canje — NO construido:** sección fija con el texto honesto *"Próximamente podrás usar tus puntos como descuento o vouchers"* — no hay botón, no hay catálogo de recompensas, no se simula nada. Esta es la referencia canónica del patrón "no-mock" del proyecto (ver `kiro_steering/no-mock.md`).
3. **Historial:** lista de las compras reales que generaron puntos, con nombre del comercio (cruzado contra `useMerchantsLive`) y puntos ganados por cada una (`floor(amount/equivalencia)`), hasta 10 más recientes.

## 5. Superficies adicionales

- **Hub (Home):** pill de puntos junto al saldo, visible si `wc.activo("loyalty")`, navega a `/module/loyalty` (ver `kiro_steering/home-render-config.md` §2).
- **Profile → Mis comunidades:** puntos por cada Mundo del usuario, vía `fetchLoyaltyPuntosBatch` — trae la config real de cada mundo (`equivalencia`/`caducidadMeses` propios) antes de calcular, un Mundo sin Loyalty activo devuelve 0 sin hacer fetch extra.

## 6. Qué NO existe (gap documentado, no simulado)

- Canje de puntos (descuentos, vouchers) — cero backend, cero UI funcional.
- Ningún panel admin de "campañas de puntos" o multiplicadores — la equivalencia es un único valor fijo por Mundo, sin promociones temporales.
- Ninguna expiración "dura" de puntos ya ganados — la caducidad es una ventana de consulta, no una operación que borra o marca puntos vencidos.

## 7. Estado y versionado

`v1.0.0`, construida el 26-ago-2026, verificada contra `transactions` reales. Es la capacidad más simple en implementación de todo el catálogo que aun así es 100% real (sin mock) — precisamente por apoyarse en datos que ya existían (compras) en vez de crear infraestructura nueva.
