# SPEC Funcional — Inventario

*Documento de especificación funcional, no un registro de iteraciones. Formato de referencia: `spec_eventos.md`. Esta es deliberadamente una de las specs más cortas del catálogo — la capacidad no tiene pantalla propia, y forzarle una estructura de 9 secciones como Eventos sería inventar componentes que no existen.*

Fuente: código real (`joi360-admin/src/store.js` `MODULE_CATALOG`; `joi360-app/src/pages/Module.jsx` → `MarketplaceTemplate`), 23-sep-2026.

---

## 1. Propósito y alcance

`inventario` (tier CORE) administra categorías, productos, stock y disponibilidad de artículos o servicios comercializados en el ecosistema. **No tiene template propio en la superapp** — `MODULE_CATALOG.inventario.surface === "system"` (declarado explícitamente, no un gap): la capacidad se materializa DENTRO de `MarketplaceTemplate` (comercios) y, para Menú, dentro de sus propias tablas (`menu_items`). No aparece como icono independiente en la grilla "Mis módulos" de Home (el filtro `CATALOG[m.id].surface !== "system"` la excluye a propósito, ver `kiro_steering/home-render-config.md`).

**Depende de:** `comercios` (`DEPENDENCY_MAP`). Es prerequisito declarado de `menu`.

---

## 2. Qué expone realmente

- **Autoría del catálogo:** `MiCatalogoPanel` (comercio) — nombre, precio, categoría (dinámica, se arma de las ya usadas por ese comercio + opción de crear una nueva), stock (opcional, nullable = sin límite), imagen (subida real a `joi360-media`), toggle activo/pausado.
- **Consumo del stock real:** `MarketplaceTemplate` (`Module.jsx`) — `comprarProductosLive` decrementa `products.stock` de forma atómica al pagar; si no alcanza, la compra se rechaza con `motivo:"stock"` y el stock disponible real, sin fingir la venta.
- **Aislamiento por evento:** `products.event_id` (nullable) — `NULL` es el catálogo regular de todos los días; un valor real aísla un catálogo exclusivo de un evento específico (ver `spec_eventos.md` §3.5), sin mezclarse nunca con el regular en las consultas (`event_id IS NULL` vs. `event_id = eq.<id>`).

---

## 3. Config fields (`MODULE_CATALOG.inventario`)

| Campo | Tipo | Default |
|---|---|---|
| `skuMax` | number, nullable | 500 |
| `stockNegativo` | switch — permite vender con stock negativo, sin bloqueo de caja | false |
| `categoriasMax` | number, nullable | 20 |

**Nota:** ninguno de estos 3 límites (`skuMax`, `stockNegativo`, `categoriasMax`) se verificó como aplicado activamente en `MiCatalogoPanel` durante esta investigación — existen como config declarada en el catálogo, pero no se confirmó el enforcement real en el flujo de alta de producto. No se afirma que estén rotos; se documenta la incertidumbre en vez de asumir que funcionan.

---

## 4. Modelo de datos

Ver `spec_comercios.md` §5 — tabla `products`, compartida con Comercios y con el catálogo de precompra de Eventos.

---

## 5. Estado y versionado

Capacidad `inventario` — **v1.0.0**, `tier: CORE`, depende de `comercios`. Construida y en producción, sin pantalla propia por diseño (`surface: "system"`).

## 6. Referencias

- `spec_comercios.md` — dueño real del catálogo (`MiCatalogoPanel`) y del checkout que consume el stock.
- `spec_eventos.md` §3.5 — catálogo exclusivo de evento, misma tabla `products`.
- `spec_menu.md` — caso relacionado pero con tabla propia (`menu_items`), no reusa `products`.
