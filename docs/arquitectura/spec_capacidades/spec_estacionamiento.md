# SPEC Funcional — Estacionamiento

*Documento de especificación funcional, no un registro de iteraciones. Describe la capacidad `estacionamiento` tal como existe construida y verificada en el prototipo JOI 360 al 23-sep-2026. Formato de referencia: `spec_eventos.md` — esta es de las capacidades más chicas del catálogo, el documento es proporcional a eso.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` → `EstacionamientoTemplate`; `supabaseClient.js`), leído línea por línea el mismo día de este documento. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

---

## 1. Propósito y alcance

Sesión real de ingreso/salida de un vehículo, con cobro por tiempo de permanencia calculado **al salir** (nunca por adelantado), contra la wallet del usuario. Construida el 26-ago-2026 como una de las 4 capacidades "planificadas" que se levantaron a `v1.0.0` ese corte (junto con Turnos, Transporte, Reservas). Tier OPCIONAL.

**Fuera de alcance:** no hay reserva anticipada de espacio (eso lo cubriría `reservas`, capacidad distinta, si se decidiera modelar un recurso "espacio de parqueo") ni validación de placa/QR en el ingreso — hoy no se pide ni valida ninguna placa (el parámetro existe en la función de ingreso pero la UI no lo pide).

---

## 2. Flujo funcional

1. **Ingreso** (`ingresarEstacionamientoRemote`): crea una fila en `estacionamiento_sesiones` con `entrada_at = ahora`. Un usuario solo puede tener **una sesión activa** a la vez (`salida_at IS NULL`) — la UI consulta esa sesión activa al cargar.
2. **Mientras está activo**: la app muestra un cronómetro en vivo (recalculado cada 30s desde `entrada_at`) y el costo proyectado: `costo = max(0, (minutos - graciaMinutos) / 60 × tarifaHora)`. Mientras dura la gracia, el costo es S/0 y se muestra "N min de gracia restantes".
3. **Salida** (`salirEstacionamientoRemote`): cobra el monto real (`pagarSupabase`, mismo RPC del resto del ecosistema) ANTES de cerrar la sesión. **Regla dura:** si el pago falla (saldo insuficiente), la sesión NO se cierra — nunca queda una salida registrada sin su cobro correspondiente.
4. **Historial**: sesiones ya cerradas (`salida_at IS NOT NULL`), con duración y monto cobrado.

---

## 3. Modelo de datos

```
estacionamiento_sesiones
  id, world_id, user_id, placa (nullable, no usado por la UI actual),
  entrada_at, salida_at (null mientras está activa), monto, created_at
```
Sin tabla de "espacios"/cupos — no hay límite de aforo de estacionamiento modelado.

---

## 4. Componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **App Usuario** | `EstacionamientoTemplate` (`Module.jsx`) | Registrar entrada, ver cronómetro/costo en vivo, registrar salida y pagar, historial |
| **Admin / BackOffice Mundo** | Solo `ModuleConfigDrawer` genérico (activación + `configFields`) | Sin panel operacional propio — nadie del lado Mundo ve las sesiones activas en tiempo real ni puede registrar un ingreso/salida en nombre de un usuario |

**Confirmado por grep exhaustivo:** no existe ningún componente admin específico de Estacionamiento fuera de `store.js` (catálogo) y `MundoDetail.jsx` (metadata de la vista previa "Vista App": `views:["Timer activo + costo en tiempo real","Historial de sesiones"]` — coincide exactamente con lo construido, sin sobre-prometer).

---

## 5. Reglas de negocio críticas

1. El cobro se calcula y ejecuta al SALIR, nunca al entrar — nunca se cobra por adelantado un tiempo que todavía no se usó.
2. Si el pago falla, la sesión de estacionamiento permanece abierta — evita el estado inconsistente de "salió pero no pagó".
3. Una sola sesión activa por usuario por mundo a la vez (impuesto por cómo se consulta la sesión activa, no por una constraint explícita de base de datos — no hay UNIQUE declarado sobre "una sola fila con `salida_at IS NULL` por usuario", así que dos ingresos rápidos sin salir podrían, en teoría, crear dos sesiones abiertas; no se ha verificado un constraint de base de datos que lo prevenga).
4. `graciaMinutos` se resta del tiempo cobrable, no es un descuento sobre el total — los primeros N minutos son literalmente gratis, el cobro empieza recién después.

---

## 6. Gaps documentados (no simulados, honestos)

- Campo `placa` existe en la función de ingreso pero la UI actual no lo pide ni lo muestra — dato capturable pero no capturado hoy.
- Sin reportería agregada a nivel Mundo (ingresos totales del día, ocupación) — el Mundo no tiene ninguna vista de estacionamiento, solo la app del usuario.
- Sin verificación de duplicidad de sesión activa a nivel de base de datos (§5.3) — riesgo teórico no confirmado como bug real en producción, señalado para que una futura auditoría lo verifique con datos reales antes de asumir que está cerrado.

---

## 7. Estado y versionado

Capacidad `estacionamiento` — **v1.0.0** (26-ago-2026), `tier: OPCIONAL`, depende SOLO de `wallet` (`DEPENDENCY_MAP`) — la dependencia conceptual con `accesos` que aparece en `mapeo_maestro/src/01_backbone.md` (escrito 12-ago) fue retirada explícitamente del código antes de construir esta versión; no reintroducirla. Construida y en producción, no es una maqueta — el cobro es real contra la wallet.

---

## 8. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` — entrada resumida de `estacionamiento` en el catálogo de 22 capacidades.
- `docs/arquitectura/spec_capacidades/spec_transporte.md` — capacidad hermana del mismo corte (26-ago), mismo patrón de "cobro directo vía el RPC de wallet, sin tabla de negocio compleja".
