# SPEC Funcional — Accesos

*Documento de especificación funcional, no un registro de iteraciones. Describe la capacidad `accesos` tal como existe construida y verificada en el prototipo JOI 360 al 23-sep-2026. Formato de referencia: `spec_eventos.md` — esta capacidad es mucho más chica, el documento es proporcional a eso.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` → `AccesosTemplate`; `joi360-admin/src/MundoDetail.jsx` → `TabAccesos`; `supabase.js`, `supabaseClient.js`), leído línea por línea el mismo día de este documento. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

---

## 1. Propósito y alcance

Control de ingreso/salida de personas por un punto físico (portería de colegio, entrada de condominio, acceso a evento) identificando al usuario por código QR/NFC, sin validar ni restringir el paso — es un **registro**, no un torniquete. Tier PREMIUM, sin dependencias propias (es fundacional junto con `wallet`, `comercios`, `perfil_ext`) — es **prerequisito conceptual** de `asistencia` (capacidad planificada, ver `spec_asistencia.md`).

**Fuera de alcance:** el control de acceso propio de un Evento (`event_checkin_log`, con aforo y reingreso) es una pieza de `eventos`, no de esta capacidad — ver `spec_eventos.md` §3.4. Las banditas NFC físicas (vinculación, vigencia) son de `wallet`.

---

## 2. Flujo funcional

**Lado operador (Admin / Mundo — `TabAccesos`, `MundoDetail.jsx`):** el operador tipea o escanea el código del usuario (mismo mecanismo de resolución que el resto del ecosistema — `buscarWalletPorCodigo`, que primero busca en `app_profiles.codigo` y si no, usa el valor tal cual como `user_id`), elige tipo (entrada/salida) y zona, y registra (`registrarAccesoRemote`). Sin hardware NFC real — el "escaneo" es tecleo/paste del código, mismo patrón "hardware simulado" que rige todo el prototipo.

**Lado usuario (App — `AccesosTemplate`):**
- Su propio código QR (`getSyntheticUserId()`) para mostrar en el punto de acceso.
- Medios de pago habilitados en comercios del mundo (canales de Adquirencia, informativo).
- Banner de "doble validación" si `configFields.validacionDoble` está activo.
- Historial propio de registros de acceso (`access_log` filtrado por su `user_id`).
- **Accesos de mi familia:** por cada dependiente, último estado derivado del registro más reciente (`tipo==="entrada"` → "Dentro del colegio", si no "Fuera del colegio") + botón para ver el QR de ese dependiente + últimos 3 registros adicionales.

---

## 3. Modelo de datos

```
access_log
  id, world_id, user_id, tipo (entrada | salida), zona (nullable), created_at
```
Sin tabla propia de "zonas" — `zonas` es un `configField` de texto libre (CSV) en el catálogo de la capacidad, no una entidad con reglas propias.

---

## 4. Componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **Admin / BackOffice Mundo** | `TabAccesos` (`MundoDetail.jsx`) | Registro de entrada/salida por operador, identificando al usuario por código |
| **App Usuario** | `AccesosTemplate` (`Module.jsx`) | QR propio, historial propio, historial y QR de cada dependiente |

Sin panel dedicado en BackOffice Comercio ni App Operador — el registro vive únicamente en el panel del Mundo.

---

## 5. Reglas de negocio críticas

1. El registro NO bloquea ni restringe ningún paso físico real — es puramente informativo/histórico. No hay una regla de "solo puede salir si antes entró" ni similar.
2. La zona es un dato del registro, no una condición de acceso — **confirmado en código**: cada zona se muestra siempre con el chip "Activa" fijo (`AccesosTemplate`, sección "Zonas habilitadas"), sin ningún estado real detrás. Si se necesita que una zona realmente restrinja el paso, es trabajo nuevo, no una extensión de lo que ya existe.
3. `validacionDoble` (config) solo se refleja como un banner informativo en la app — no hay ningún flujo de "TAQ NFC + PIN" real implementado del lado del registro.
4. El estado "dentro/fuera" de un dependiente es una inferencia del lado del cliente (el tipo del registro más reciente), no un campo de estado persistido — si el historial estuviera vacío o corrupto, no hay una fuente de verdad alternativa.

---

## 6. Gaps documentados (no simulados, honestos)

- Zonas sin restricción real de paso (§5.2) — documentado también en `mapeo_maestro/src/01_backbone.md` como comportamiento conocido, no un bug nuevo.
- Sin lectura NFC real de hardware en ningún punto — el "escaneo" es siempre tecleo/paste de código, consistente con el resto del prototipo (ningún módulo tiene integración de hardware físico real).
- Sin reportería agregada por zona/horario a nivel Mundo (a diferencia de Eventos, que sí tiene reportería cross-mundo en `Gobierno.jsx`) — Accesos no tiene ninguna vista de "cuántos registros hoy" en el panel del Mundo, solo el log crudo.

---

## 7. Estado y versionado

Capacidad `accesos` — **v1.0.2**, `tier: PREMIUM`, sin dependencias declaradas en `DEPENDENCY_MAP`. Construida y en producción — no es una maqueta, el registro y el historial son reales contra `access_log`. Es la capacidad de la que depende `asistencia` (planificada, ver `spec_asistencia.md`) — cualquier trabajo futuro sobre Asistencia debería apoyarse en este mismo `access_log`, no crear un segundo sistema de registro paralelo.

---

## 8. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` — entrada resumida de `accesos` en el catálogo de 22 capacidades.
- `docs/arquitectura/spec_capacidades/spec_asistencia.md` — capacidad planificada que depende de esta.
- `docs/arquitectura/spec_capacidades/spec_eventos.md` — control de acceso equivalente pero específico de eventos (aforo, reingreso, QR rotativo) — un modelo más exigente, no reemplazable por este.
