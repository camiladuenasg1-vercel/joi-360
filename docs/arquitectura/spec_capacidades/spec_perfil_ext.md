# SPEC Funcional — Perfil Extendido

*Especificación funcional, no un registro de iteraciones. Verificada contra el código real de `PerfilExtTemplate` (`joi360-app/src/pages/Module.jsx:3725-~3860`) el 23-sep-2026. Formato de referencia: `spec_eventos.md`.*

---

## 1. Propósito y alcance

Datos médicos/emergencia/identificación adicionales del usuario, más allá de los datos básicos de cuenta — adaptable a las necesidades de cada sponsor (colegio, evento, condominio). `v1.0.0`, `tier: PREMIUM`, sin dependencias.

---

## 2. Modelo de negocio

### 2.1 Selector de perfil (titular vs. dependiente) — Task #155
Antes esta pantalla solo leía/escribía la ficha del titular logueado; un dependiente nunca podía tener tipo de sangre, clínica o contacto de emergencia propios. Ahora hay un selector de chips (titular + cada dependiente real, vía `fetchMisDependientes`) — `guardarPerfilExtendido` acepta cualquier `userId`, se llama con el del perfil activo seleccionado.

### 2.2 Alergias — fuente única, nunca duplicada
**Regla dura:** para un dependiente, el campo "Alergias" en esta pantalla es de **solo lectura** — la fuente real sigue siendo `dependents.alergias`, editable únicamente desde Restricciones (`spec_control.md`). No se duplica el dato ni se permite editarlo desde dos lugares distintos.

### 2.3 Cada campo es un feature flag independiente
`tipo_sangre`, `alergias`, `clinica`, `contacto_emergencia` — 4 flags separados en el catálogo. Un bug real corregido: antes se mostraban los 4 en bloque apenas `camposMedicos` estaba activo, sin respetar cuáles activó RedPontis individualmente. Hoy `CAMPOS = CAMPOS_TODOS.filter(f => cfg.has(f.key) && (activo.esTitular || f.key !== "alergias"))` — cada campo se muestra solo si su flag específico está activo, y alergias se excluye del formulario editable cuando el perfil activo es un dependiente.

---

## 3. Componentes

### 3.1 Ficha médica/emergencia
Formulario real: `tipo_sangre, alergias (solo titular), clinica, contacto_emergencia_nombre, contacto_emergencia_telefono` — persistido en `user_profiles`, upsert por `(world_id, user_id)`. Estado vacío honesto cuando no hay datos guardados (no inventa una persona/clínica como el mock original que existía antes de Gantt #93).

### 3.2 Identificación
Card superior con avatar/iniciales, nombre, correo, y 2 tags decorativos ("TAQ NFC", "QR activo") — el QR/identificación real es el mismo "Mi código" compartido con Wallet/Home, no uno propio de esta pantalla.

### 3.3 Grupo familiar vinculado
Flag `grupoFamiliar` — reutiliza `fetchMisDependientes` (mismo fetch que Restricciones/Wallet, sin tabla ni lógica nueva) para listar los dependientes del titular desde acá también.

---

## 4. Modelo de datos

```
user_profiles
  id, world_id, user_id, tipo_sangre, alergias, clinica,
  contacto_emergencia_nombre, contacto_emergencia_telefono,
  updated_at
  unique (world_id, user_id)
```

Config: `camposMedicos` (switch, def true — sección médica visible), `grupoFamiliar` (switch, def true).

---

## 5. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| App Usuario | `PerfilExtTemplate` (`Module.jsx`) | Ficha médica editable, selector titular/dependiente, grupo familiar |
| App Usuario (consumo cruzado) | `control` lee `dependents.alergias` para el bloqueo real en Menú | Ver `spec_control.md`/`spec_menu.md` |

---

## 6. Reglas de negocio críticas

1. Alergias de un dependiente son de solo lectura acá — se editan únicamente en Restricciones.
2. Cada uno de los 4 campos médicos es un flag independiente, no un bloque todo-o-nada.
3. Sin datos guardados, la pantalla muestra un estado vacío honesto, nunca una persona/clínica de ejemplo inventada.

---

## 7. Estado y versionado

`perfil_ext` — **v1.0.0**, `tier: PREMIUM`, sin dependencias. Construido y en producción, sin gaps conocidos documentados en esta pasada.

## 8. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md`.
- `docs/arquitectura/spec_capacidades/spec_control.md` — dueño real del dato de alergias de un dependiente.
