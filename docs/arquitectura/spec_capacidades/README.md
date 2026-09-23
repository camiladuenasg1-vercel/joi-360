# SPEC por Capacidad — índice + indicación de recopilación para Kiro

Carpeta grupal con una **especificación funcional completa** por cada una de las 22 capacidades de `MODULE_CATALOG` (`joi360-admin/src/store.js`). No son registros de iteraciones — son documentos de especificación, verificados contra el código real del prototipo al 23-sep-2026 (algunas partes puntuales, señaladas explícitamente dentro de cada documento, quedaron marcadas como "sin confirmar" en vez de inventadas — ver la nota de honestidad en cada uno).

`spec_eventos.md` fue la primera y es el documento de referencia de formato/profundidad para el resto — cada spec es **proporcional** a la complejidad real de su capacidad, no inflada para parecerse a Eventos o BNPL.

---

## Índice de las 22 capacidades

| Capacidad (id) | Tier | Versión | Estado | Archivo |
|---|---|---|---|---|
| wallet | CORE | 1.1.0 | Construida | `spec_wallet.md` |
| comercios | CORE | 1.0.0 | Construida | `spec_comercios.md` |
| consumos | CORE | 1.0.0 | Construida (sin tabla propia) | `spec_consumos.md` |
| inventario | CORE | 1.0.0 | Construida (sin pantalla propia — `surface:"system"`) | `spec_inventario.md` |
| facturacion | PREMIUM | 0.0.0 | **Planificada — bloqueada por infra externa (PSE/SUNAT)** | `spec_facturacion.md` |
| perfil_ext | PREMIUM | 1.0.0 | Construida | `spec_perfil_ext.md` |
| accesos | PREMIUM | 1.0.2 | Construida | `spec_accesos.md` |
| reservas | PREMIUM | 1.0.0 | Construida (sin cobro obligatorio aún) | `spec_reservas.md` |
| suscripciones | OPCIONAL | 1.1.0 | Construida | `spec_suscripciones.md` |
| loyalty | OPCIONAL | 1.0.0 | Construida (canje pendiente, v1.1) | `spec_loyalty.md` |
| eventos | OPCIONAL | 1.0.0 | Construida — la más completa del catálogo | `spec_eventos.md` |
| credito | OPCIONAL | 0.0.0 | **Planificada — bloqueada por decisión de producto (se solapa con BNPL)** | `spec_credito.md` |
| subsidio | OPCIONAL | 1.0.0 | Construida (consumo del subsidio pendiente, v1.1) | `spec_subsidio.md` |
| estacionamiento | OPCIONAL | 1.0.0 | Construida | `spec_estacionamiento.md` |
| asistencia | OPCIONAL | 0.0.0 | **Planificada — bloqueada por falta de spec de flujo** | `spec_asistencia.md` |
| cashback | OPCIONAL | 1.0.1 | Construida | `spec_cashback.md` |
| control | OPCIONAL | 1.0.0 | Construida | `spec_control.md` |
| menu | OPCIONAL | 1.0.0 | Construida (canje QR en POS pendiente) | `spec_menu.md` |
| promociones | OPCIONAL | 1.0.0 | Construida (alcance recortado: solo cupón QR) | `spec_promociones.md` |
| turnos | OPCIONAL | 1.0.0 | Construida | `spec_turnos.md` |
| bnpl | OPCIONAL | 1.0.0 | Construida — 2da más completa del catálogo | `spec_bnpl.md` |
| transporte | OPCIONAL | 1.0.0 | Construida (tarifa única, sin rutas) | `spec_transporte.md` |

19 construidas y versionadas, 3 planificadas y explícitamente bloqueadas (nunca construir pantalla de negocio para esas 3 — ver `no-mock.md` en `kiro_steering/`).

---

## Indicación de recopilación para Kiro

Esto es lo que Salvador debe indicarle a Kiro, literalmente, para que absorba este paquete:

1. **Cada archivo `spec_<id>.md` de esta carpeta es el `requirements` de esa capacidad** en el sentido que ya usa el propio flujo de Kiro (`.kiro/specs/<capacidad>/requirements.md` — ver "Loop de construcción por capacidad" en `docs/arquitectura/mapeo_maestro/src/10_anexo_anclado.md`). No se reinterpreta el alcance ni se recorta — se toma tal cual como punto de partida de ese `requirements.md`, capacidad por capacidad.
2. **Orden sugerido de absorción — de menor a mayor riesgo/complejidad:**
   - Primero las 4 fundacionales sin dependencias: `wallet`, `comercios`, `accesos`, `perfil_ext`.
   - Luego las que dependen solo de esas: `consumos`, `inventario`, `control`, `suscripciones`, `loyalty`, `subsidio`, `reservas`, `transporte`, `estacionamiento`.
   - Luego las que dependen de 2+ capacidades: `menu` (inventario), `cashback`/`turnos` (wallet+comercios), `promociones`.
   - Al final, las 2 más grandes y con más superficie de riesgo real de dinero: `bnpl`, `eventos`.
   - Las 3 planificadas (`facturacion`, `credito`, `asistencia`) NO entran a este loop — sus documentos son la justificación de por qué no, no un plan de construcción.
3. **Cada absorción sigue el ciclo ya definido en `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` §6.1** (`AUDIT → DETECT → CROSS-CHECK → PLAN → BUILD → VERSION → REGRESSION → CLOSE`), cruzando el `requirements.md` derivado de la SPEC contra lo que su código YA tiene — varias veces esa auditoría (R2-Audit) encontró que algo ya estaba construido y solo la metadata (`devStatus`) estaba vieja; no asumir gap sin verificar.
4. **El `design.md` y `tasks.md` de cada spec de Kiro los arma Kiro** a partir del `requirements.md` — este paquete deliberadamente no prescribe la implementación nativa (SwiftUI/Compose/backend modular), solo el contrato funcional: qué existe, qué reglas de negocio son innegociables, qué tablas/columnas, qué gaps son reales y deben quedar igual de honestos del lado nativo (ver `no-mock.md`).
5. **Toda incertidumbre marcada explícitamente dentro de un `spec_<id>.md`** (ej. "no confirmado en esta pasada", "sin localizar el ALTER TABLE exacto") es una señal para que el CROSS-CHECK de Kiro la resuelva contra SU código o pida una re-verificación — nunca se completa por inferencia sin marcarlo.

---

## Cómo se mantiene

Cada `spec_<id>.md` es un snapshot fechado, no un documento que se edita línea por línea en cada corte — si el código de esa capacidad cambia sustancialmente, se regenera esa sección (o el archivo completo) contra el código real, igual que ya rige para `kiro_steering/capacidades.md`. No cargar hacia adelante una afirmación vieja sin volver a verificarla.

## Referencias

- `docs/arquitectura/kiro_steering/` — el contrato de RENDER (qué pantalla, qué gates, cómo se resuelve la vista). Esta carpeta (`spec_capacidades/`) es el contrato de NEGOCIO/DATOS por capacidad — son complementarios, no duplicados.
- `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` — directiva general de qué construir/versionar y el loop de auditoría.
- `docs/arquitectura/mapeo_maestro/` — mecánica extendida por frente (admin/mundo/comercio/superapp/POS) y esquema Supabase completo.
