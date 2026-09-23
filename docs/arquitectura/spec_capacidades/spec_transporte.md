# SPEC Funcional — Transporte

*Documento de especificación funcional, no un registro de iteraciones. Describe la capacidad `transporte` tal como existe construida y verificada en el prototipo JOI 360 al 23-sep-2026. Formato de referencia: `spec_eventos.md` — esta es la capacidad más chica del catálogo (sin tabla propia), el documento es proporcional a eso.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` → `TransporteTemplate`; `supabaseClient.js`; `joi360-admin/src/MundoDetail.jsx`), leído línea por línea el mismo día de este documento. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

---

## 1. Propósito y alcance

Cobro de un pasaje de **tarifa plana** (una sola tarifa por Mundo, no por ruta/zona) contra la wallet del usuario, reutilizando el mismo mecanismo de pago del resto del ecosistema. Construida el 26-ago-2026 junto con Estacionamiento/Turnos/Reservas. Tier OPCIONAL, depende solo de `wallet`.

**Explícitamente fuera de alcance hoy** (no confundir con "roto" — es el alcance real y deliberado de esta versión): catálogo de rutas, tarifa diferenciada por zona/distancia, validación de abordaje por NFC/QR en un vehículo físico.

---

## 2. Flujo funcional

1. La app muestra la tarifa plana del Mundo (`configFields.tarifaPlana`) y el saldo disponible.
2. Un solo botón "Pagar pasaje" — cobra la tarifa completa contra la wallet (`pagar(tarifa, "Transporte")`, el mismo mecanismo genérico de cobro que Estacionamiento/Menú/Marketplace).
3. Si el saldo alcanza, el pasaje queda pagado — sin ticket, sin QR de abordaje, sin ningún artefacto adicional más allá de la transacción.
4. "Mis viajes recientes" — se **deriva** de `transactions` (no existe una tabla `viajes`/`pasajes` propia): filtro por `type=compra` y `reference LIKE 'pago-Transporte-%'`. Mismo principio ya usado en Loyalty (derivar de datos reales existentes en vez de crear una tabla nueva) — cero riesgo sobre el RPC crítico de pagos, cero tabla nueva.

---

## 3. Modelo de datos

**Sin tabla propia.** Transporte no crea ninguna entidad nueva — reutiliza `wallets`/`transactions` íntegramente. El "historial de viajes" es una consulta filtrada sobre `transactions`, identificada únicamente por el patrón de texto de su `reference`.

---

## 4. Componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **App Usuario** | `TransporteTemplate` (`Module.jsx`) | Pagar pasaje, ver historial derivado |
| **Admin / BackOffice Mundo** | Solo `ModuleConfigDrawer` genérico (activación + `configFields.tarifaPlana`) | Sin panel operacional propio |

**Hallazgo real (inconsistencia menor, no un bug de código):** la metadata de "Vista App" en `MundoDetail.jsx` (usada para la vista previa del admin) describe Transporte como `views:["Pago de viaje por NFC o QR","Rutas del mundo","Historial de viajes"]` — **"Rutas del mundo" no existe** (confirmado: `TransporteTemplate` no tiene ningún concepto de ruta, solo una tarifa plana única) y "Pago... por NFC o QR" es impreciso — el pago es un botón directo contra el saldo, no hay un flujo NFC/QR distinto del resto del ecosistema. Esta preview de texto en el admin sobre-promete respecto a lo construido; vale la pena corregirla en el propio catálogo (`MundoDetail.jsx` línea ~986) en una próxima pasada, no se tocó acá por estar fuera del alcance de "documentar", no de "corregir código".

---

## 5. Reglas de negocio críticas

1. Tarifa única por Mundo — no hay concepto de ruta, distancia ni zona diferenciada.
2. El cobro es inmediato y de monto fijo — a diferencia de Estacionamiento, no hay cálculo de duración ni gracia.
3. El historial es 100% derivado (no una tabla propia) — cualquier cambio futuro al formato de `reference` en el cobro (`"Transporte"` como nombre de comercio) rompería silenciosamente el filtro `LIKE 'pago-Transporte-%'` del historial; si se toca ese string en el futuro, hay que actualizar `fetchMisViajesTransporte` en el mismo cambio.

---

## 6. Gaps documentados (no simulados, honestos)

- Sin catálogo de rutas — una sola tarifa por Mundo (§1, §5.1).
- Sin validación física de abordaje (NFC/QR real) — el "pago" es un botón en la app, no un tap contra un lector en el vehículo.
- Preview de "Vista App" en el admin desactualizada respecto al alcance real (§4) — documentado, no corregido en este documento.

---

## 7. Estado y versionado

Capacidad `transporte` — **v1.0.0** (26-ago-2026), `tier: OPCIONAL`, depende solo de `wallet` (`DEPENDENCY_MAP`). Construida y en producción, no es una maqueta — el cobro es real contra la wallet, aunque el alcance de negocio (tarifa plana única) es deliberadamente mínimo.

---

## 8. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` — entrada resumida de `transporte` en el catálogo de 22 capacidades.
- `docs/arquitectura/spec_capacidades/spec_estacionamiento.md` — capacidad hermana del mismo corte (26-ago), mismo patrón de cobro directo vía el RPC de wallet.
