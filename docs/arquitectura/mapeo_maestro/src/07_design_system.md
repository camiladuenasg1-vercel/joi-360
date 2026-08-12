# Sistema de Diseño y Render Config Compartido

## Filosofía de tokens: Material Design 3, aplicada por separado en cada front

Los dos frentes web (`joi360-admin` y `joi360-app`) usan Tailwind CSS con el **mismo vocabulario semántico de Material Design 3**: `primary`, `secondary`, `tertiary`, cada uno con variantes `-container`/`-fixed`/`-fixed-dim`, más la escala de superficies `surface`, `surface-container`, `surface-container-low/high/highest/lowest`, y los textos `on-surface`/`on-surface-variant`, bordes `outline`/`outline-variant`. Esto es lo correcto — significa que un componente construido en un front "habla el mismo idioma" que uno construido en el otro, y cualquier desarrollador nuevo que conozca Material 3 entiende el sistema de inmediato.

**⚠️ Pero — hallazgo importante para el desarrollador que va a construir en paralelo**: aunque el VOCABULARIO de tokens es idéntico, los VALORES HEX detrás de cada token son **distintos y definidos por separado** en cada `tailwind.config.js` — no hay un paquete de tokens compartido entre los dos proyectos.

| Token | `joi360-admin` | `joi360-app` (superapp) |
|---|---|---|
| `primary` | `#0035b9` (azul RedPontis) | `#3525cd` (violeta-azul) |
| `primary-container` | `#254edb` | `#4f46e5` |
| `secondary` | `#006688` | `#565e74` |
| `tertiary` | `#5800c3` | `#7e3000` |
| `surface` | `#f8f9ff` | `#fcf8ff` |
| `on-surface` | `#0b1c30` | `#1b1b24` |
| `outline` | `#747686` | `#777587` |
| `ok` (semántico, éxito) | `#008855` | *(no definido — la app usa clases ad-hoc tipo `text-green-600` en su lugar)* |

Esto significa que copiar un componente de un front al otro tal cual (asumiendo que `bg-primary` se ve igual) produce un color distinto — el patrón es consistente puertas adentro de cada front, pero **no hay una fuente única de verdad de marca compartida entre Admin y Superapp hoy**. Para que "el render config funcione igual en todos los frentes" (como pide el objetivo de este documento), la recomendación concreta es: extraer un paquete de tokens compartido (`@joi360/design-tokens` o similar, aunque sea un JSON simple importado por ambos `tailwind.config.js`) antes de que crezca más la superficie construida en paralelo por dos equipos.

## Tipografía

- `joi360-admin`: fuente `Inter` (sans) + `JetBrains Mono` (mono) — sin escala tipográfica custom declarada en Tailwind; el patrón visto en el código es texto mono en mayúsculas con tracking amplio para micro-etiquetas (`font-mono text-[10px] uppercase tracking-wider`), un patrón repetido consistentemente en toda la app pero definido inline en cada componente, no como un token reutilizable.
- `joi360-app`: fuente `Inter` únicamente, **con una escala tipográfica real y nombrada** (`display`, `headline-xl/lg/md`, `body-lg/md`, `label-md/sm/label-caps`) — más maduro que el admin en este punto específico. Sería el punto de partida natural si se decide unificar una escala tipográfica compartida.

## Componentes compartidos reutilizables (`joi360-admin/src/ui.jsx`)

El "kit" del admin — usado consistentemente en las 20+ pantallas del panel:
- `Icon` — envoltorio de Material Symbols.
- `Pill` / `TierTag` — etiquetas de estado y de nivel (CORE/PREMIUM/OPCIONAL), cada tier con su propio color semántico.
- `Toggle` — el switch on/off estándar, usado en cada activación de capacidad/feature flag.
- `Drawer` — panel lateral deslizante (`slide-in`), el patrón dominante para "editar/configurar algo" en todo el admin (creación de mundo, configuración de capacidad, edición de comercio, etc.) — es, en la práctica, el componente más reutilizado del sistema.
- `BtnPrimary` / `BtnOutline` — botones con estado de `loading` incorporado (con spinner), estandarizado en todo el proyecto tras una limpieza explícita documentada en el código ("antes cada botón de creación tenía su propio manejo de loading inconsistente").
- `Field` / `inputCls` — envoltorio de campo de formulario + clase de input compartida (fondo `surface-container-lowest`, borde `outline-variant`, foco con anillo `primary/20`).
- `NumInput` — input numérico especializado (usado en montos, comisiones, cupos).
- `notify` — sistema de toasts global.
- `Shell` — el layout raíz de cada pantalla del admin: sidebar (`NAV`) + header + contenido, con la campanita de notificaciones (`NotificationBell`) integrada.

## Componentes compartidos (`joi360-app/src/components/`)

Estructura más granular, con carpetas explícitas `atoms/` y `molecules/` (nomenclatura de Atomic Design) más `BottomNav.jsx` (navegación inferior fija, patrón mobile-first), `MundoInfoModal.jsx`, `Toast.jsx`, `BottomSheet.jsx` (hoja deslizante desde abajo, equivalente mobile del `Drawer` del admin).

## Patrón de "render config" — cómo una capacidad decide qué se ve

El mecanismo es consistente en los 2 frentes web, aunque con nombres de función distintos:
- **Admin**: cada capacidad se lee desde el store local (`m.modulos.find(x => x.id === "wallet")`), y su visibilidad en cada pantalla se decide con condicionales directos sobre ese objeto (`m.modulos.some(...)`, `modosDeMundo(m).includes(...)`).
- **Superapp**: un hook central, `useWorldConfig(mundoId)`, expone `wc.activo("capacidad")` (¿está prendida?) y `wc.flag("capacidad","feature")` (¿está prendido ESE feature específico dentro de la capacidad?) — este es el patrón que gatea cada widget del Hub y cada sección de cada template de `Module.jsx`. Es un patrón limpio y consistente — el hallazgo relevante no es que esté mal hecho, sino que casi todos los bugs reales de "un botón que no debería aparecer, apareció" encontrados durante la construcción vinieron de un gate incompleto (faltaba UNA de las dos condiciones, no las dos) — ver Discrepancias.

## Android nativo (`joi360-operador`) — nota breve

El operador POS nativo (Kotlin/Jetpack Compose) usa un enfoque distinto y, en un aspecto, más avanzado: su menú de inicio se arma desde un `RenderConfig` que el backend calcula dinámicamente según las capacidades reales del mundo/comercio — en vez de un array de opciones fijo en el código del cliente (que es como funciona hoy el equivalente en `OperadorApp.jsx`, con el array `MODOS`). Si el patrón de "render config resuelto server-side" del nativo se generaliza, sería el camino más robusto para que los 3 frentes (Admin, web operator, Android nativo) queden alineados sin depender de que cada cliente reimplemente la misma lógica de gates.
