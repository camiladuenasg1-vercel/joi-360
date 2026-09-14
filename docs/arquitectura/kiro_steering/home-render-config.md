# Render Config — HOME hacia adelante (Superapp, `joi360-app`)

*Referencia (no always included) en `.kiro/steering/`. Complementa a `render-config.md` (mecánica general) y `capacidades.md` (las 22 capacidades) — esto es el detalle de LA PANTALLA DE ENTRADA (Home) y todo lo que cuelga de ella, capacidad por capacidad, con el checklist de qué debe existir del lado del panel de RedPontis (Admin RP) para que cada pieza renderice.*

Fecha: 14-sep-2026. Fuente: código real de `joi360-app/src/pages/Hub.jsx`, `components/BottomNav.jsx`, `pages/Pay.jsx`, `pages/Activity.jsx`, `pages/Profile.jsx` — leídos línea por línea el mismo día de este documento, no de memoria ni de docs viejos.

**Alcance:** desde que el usuario aterriza en `/hub` (ya autenticado, ya con un Mundo activo) hacia adelante. **No cubre** `Auth.jsx`/`Landing.jsx`/`Mundos.jsx` (login, selección/unión a un Mundo) — eso es "antes de Home", otro documento si hace falta. Las 22 capacidades y sus templates (`/module/:id`) ya están en `capacidades.md` — acá se documenta **cómo se llega a ellas desde Home** y las 4 pantallas propias de la barra de navegación inferior que no son un `moduleId`.

---

## 1. El grafo de navegación desde Home

```
/hub (Home) ──┬── BottomNav (persistente, 5 tabs, sin gate de capacidad) ──┬── /hub          (Inicio)
              │                                                            ├── /activity     (Actividad)
              │                                                            ├── /pay          (Pagar — CTA central)
              │                                                            ├── /mundos       (Explorar — fuera de alcance de este doc)
              │                                                            └── /profile      (Perfil)
              │
              ├── Avatar (header)         → /profile
              ├── Globe (header)          → /mundos
              ├── Bell (header)           → nada (decorativo, sin centro de notificaciones real)
              ├── Loyalty pill            → /module/loyalty                    [gate: wc.activo("loyalty")]
              ├── Mi código (QR modal)    → modal in-place, sin navegación     [sin gate]
              ├── "Hoy te toca" (Menú)    → /module/menu                      [gate: wc.activo("menu") + reserva hoy]
              ├── Mis módulos (grid)      → /module/{id} por cada capacidad activa no-system
              ├── Acción Recargar         → /pay?tab=recargar                 [gate: wc.flag("wallet","recarga")]
              ├── Acción Bandita NFC      → /pay?tab=nfc                      [gate: wc.flag("wallet","bandita") && usaPulseraNfc]
              ├── Acción Familia          → /module/control                   [gate: wc.activo("control")]
              ├── Acción Promos           → /module/promociones               [gate: wc.activo("promociones")]
              ├── Comercios (carrusel)    → /module/comercios?filtro={id}     [gate: hay merchants reales, sin capability gate propio]
              ├── Eventos (carrusel)      → /module/eventos?evento={id}       [gate: wc.activo("eventos") + hay eventos]
              └── Últimos movimientos     → /activity                        [gate: hay historial de wallet]
```

`/pay`, `/activity`, `/profile` son pantallas propias (no pasan por `TEMPLATE_MAP`/`ModulePage`) — tienen su propio archivo y su propia lógica de gate, documentada abajo. `/module/:id` es todo lo ya cubierto en `capacidades.md`.

---

## 2. `Hub.jsx` — bloque por bloque, con el amarre exacto a capacidades

| Bloque | Gate EXACTO en código | Qué debe existir en el panel RedPontis (Admin) | Nota de paridad nativa |
|---|---|---|---|
| Saludo + nombre | Sin gate — siempre | — | Hora del día vía reloj del dispositivo, no del servidor. |
| Avatar → Perfil | Sin gate | — | — |
| Globe → Mundos | Sin gate | — | Fuera de alcance de este doc. |
| Bell (notificaciones) | Sin gate, **sin destino** | — | No construir un centro de notificaciones nativo que no existe acá — replicar el estado decorativo tal cual, no inventar. |
| Saldo / "Mi identidad" | `wc.flag("wallet","balance")` — si es `false`, el mundo opera en modo **solo identificación** (sin montos, sin saldo, muestra el nombre del usuario en su lugar) | Capacidad `wallet` activa + flag `balance` en `world_feature_flags` (o su tabla equivalente) | **Esto es una bifurcación real de UI, no un texto que cambia** — la vista "solo identificación" no muestra NINGÚN monto en ningún lugar de Home. Debe existir como estado completo en el nativo, no como un caso raro sin probar. |
| Loyalty pill (puntos) | `wc.activo("loyalty")` | Capacidad `loyalty` activa (`world_capacity_configs`) | Puntos reales — ver `capacidades.md` → `loyalty`. |
| Mi código (QR) | Sin gate — siempre visible | — | El texto del modal cambia según `verSaldo`: "Para pagos y accesos" vs. "Para accesos" — mismo dato (`getSyntheticUserId()`), 2 copys. |
| "Hoy te toca" (Menú) | `wc.activo("menu")` **Y** existe al menos 1 reserva de HOY (`menu_reservas`) para el titular o algún dependiente — si no hay nada hoy, el bloque **no se renderiza** (no hay estado vacío) | Capacidad `menu` activa + reservas reales | No confundir "capacidad activa" con "debe mostrarse" — este bloque es condicional a datos, no solo a config. |
| Mis módulos (grid) | `wc.modulos.filter(m => m.enabled && CATALOG[m.id] && CATALOG[m.id].surface !== "system")` | El panel RedPontis debe producir, por mundo: (a) qué capacidades están `enabled`, (b) el catálogo global con el campo `surface` por capacidad (para excluir las que son `"system"` — hoy solo `inventario`) | **Este es EL amarre central.** El grid de Home no es una lista fija — se arma en vivo a partir de dos fuentes: activación por mundo + catálogo global con su `surface`. Si el proyecto nativo hardcodea qué iconos van en Home en vez de derivarlos de esta misma unión, se rompe la promesa de "activás una capacidad y aparece sola". |
| Acción Recargar | `wc.flag("wallet","recarga")` | Flag `recarga` de `wallet` | → Pay tab `recargar`. |
| Acción Bandita NFC | `wc.flag("wallet","bandita") && wc.cfg("wallet")?.usaPulseraNfc !== false` — **doble gate, los dos deben cumplirse** | Flag `bandita` de `wallet` **y** `configFields.usaPulseraNfc !== false` | Ver nota histórica en el propio código: antes bastaba el flag solo y un mundo sin pulseras físicas igual mostraba la tile — bug ya corregido acá, no reintroducirlo en nativo. |
| Acción Familia | `wc.activo("control")` | Capacidad `control` activa | → `/module/control`. |
| Acción Promos | `wc.activo("promociones")` | Capacidad `promociones` activa | → `/module/promociones`. |
| Comercios (carrusel) | `useMerchantsLive(mundoId).length > 0` — sin gate de capacidad propio, depende de que existan `merchants` reales del mundo | Al menos 1 comercio dado de alta | Tap en un comercio pasa `filtro:{id}` como state de navegación a `/module/comercios` — no es un query param en la URL. |
| Eventos (carrusel) | `wc.activo("eventos")` **Y** `fetchEventosLive(mundoId).length > 0` | Capacidad `eventos` activa + al menos 1 evento publicado | Deep-link `?evento={id}` abre directo el detalle dentro de `EventosTemplate`. |
| Últimos movimientos | `historial.slice(0,3).length > 0` (derivado de `wallet`, sin gate de capacidad propio más allá de que Wallet tenga movimientos) | — | "Ver todo" → `/activity`. |
| Badge de Actividad (BottomNav) | `min(historial.length, 9)` | — | Contador simple, no un centro de notificaciones — no confundir con la campana. |

**Orden fijo de renderizado** (de arriba hacia abajo, tal cual el JSX): Header → Saldo/identidad → Mi código → Hoy te toca (Menú) → Mis módulos → Acciones del mundo → Comercios → Eventos → Últimos movimientos → BottomNav. El orden importa para la paridad visual — no es una lista que se pueda reordenar libremente en nativo sin decisión explícita.

---

## 3. `/pay` — Centro de Pagos

3 tabs condicionales, **mismo doble-gate de Bandita NFC que en Home** (`walletCfg?.has("bandita") && walletCfg?.config?.usaPulseraNfc !== false`) — es la MISMA condición evaluada dos veces en dos archivos distintos del prototipo; en nativo debe ser una única función/regla reutilizada, no dos implementaciones que puedan divergir.

| Tab | Gate | Qué depende del panel RedPontis |
|---|---|---|
| **Pagar QR** | Siempre presente | Monto libre → QR simulado → "Simular pago" hace un débito real (`pagarLive`). Error real de saldo insuficiente pasa por el catálogo de errores (`errorControlado`). |
| **Recargar** | Siempre presente | Lista de **canales de Emisión reales** del mundo (`canalesMundo` — id/nombre/tiempoAcreditacion/montoMin/montoMax/psp/`checkout` tipo `form`\|`qr`\|`manual`) — el checkout renderiza distinto según `checkout` del canal. Límites `maxPorRecarga`/`maxRecargasDiarias` del `configFields` de Wallet se validan antes de dejar continuar. |
| **Bandita NFC** | `has("bandita") && usaPulseraNfc !== false` | 4 estados reales: sin-solicitud / pendiente / rechazada / entregada — todo contra `nfc_requests`, sin simulación. |

**Amarre con el panel RedPontis:** el catálogo de canales de Emisión (con su `checkout` type y PSP) es Nivel 1 (RedPontis, Catálogo Global) + Nivel 2 (qué canales activó cada mundo, `world_channel_configs`). Si el panel nativo de Salvador no separa estos 2 niveles, el checkout no puede resolver bien qué formulario mostrar por canal.

---

## 4. `/activity` — Actividad

Sin gates de capacidad — es una vista transversal de TODO lo transaccional del usuario en el mundo activo:
- Historial de `wallet` (recargas/pagos) **fusionado** con entradas de eventos compradas (`fetchMisEntradasLive`, tipo sintético `ASISTENCIA`, `monto:0` para no duplicar el gasto — el cobro ya aparece como transacción `compra` aparte).
- Filtro por mundo solo aparece si el usuario pertenece a **más de 1** mundo (`memberships.length > 1`).
- Tabs de tipo: Todos / Pagos / Recargas / Asistencia / Otros — filtro client-side, sin llamada nueva al backend.
- Agrupado por fecha (Hoy / Ayer / fecha completa) en **hora local**, no UTC — mismo criterio que el resto del proyecto.

**Amarre:** esta pantalla no depende de qué capacidades están activas — depende de que `wallet` (para el historial) y opcionalmente `eventos` (para las entradas) tengan datos reales. No hay nada que "amarrar" en el catálogo de capacidades para esta pantalla en particular, más allá de que las tablas fuente existan.

---

## 5. `/profile` — Mi perfil

| Sección | Qué hace | Amarre |
|---|---|---|
| Tarjeta de usuario | Nombre/correo/avatar + 3 stats: saldo TOTAL cruzando **todos** los mundos del usuario, # de mundos, # transacciones del mundo activo | `useWalletBalances` por cada membership — necesita poder leer saldo de cada mundo, no solo el activo. |
| Mi código JOI | Copiar / compartir (`navigator.share` con fallback a clipboard) | Mismo `getSyntheticUserId()` que el QR de Home — un solo identificador, no dos. |
| Mi Familia | Consolida dependientes de **TODOS** los mundos del usuario (`fetchMisDependientes` + `fetchDependienteBalance` por cada membership, `Promise.all`) — tap en un familiar activa ESE mundo y navega a `/module/control` | Depende de la capacidad `control` en cada mundo donde el usuario tenga dependientes — la vista es cross-mundo, no depende de cuál mundo está activo ahora mismo. |
| Mis comunidades | Lista de todos los mundos del usuario con saldo + puntos loyalty de cada uno; permite cambiar el mundo activo desde acá (no solo desde el globe de Home) | Loyalty por mundo — usa el mismo cálculo real que `capacidades.md` → `loyalty`. |
| Configuración → Privacidad / Términos | Modales con texto **estático y honesto** (no documento legal fabricado) describiendo qué guarda la app hoy | Ver `no-mock.md` — este es exactamente el patrón: decir la verdad de lo que existe, no simular un documento legal completo que no se redactó. |
| Configuración → Centro de ayuda | Formulario real (categoría + asunto + detalle, monto opcional si es "Devolución/reembolso") → crea un `support_ticket` real | Necesita que el panel RedPontis tenga cola de soporte real (`support_tickets`) — ya documentado como capacidad transversal, no ligada a `MODULE_CATALOG`. |
| Cerrar sesión | `logoutUser()` + nav a `/auth` | — |

---

## 6. Checklist de cotejo contra el panel de RedPontis (Admin RP) de Salvador

Esto es lo que Kiro debe verificar que YA EXISTE (o construir si falta) del lado del panel de administración de su propio proyecto para que Home-hacia-adelante pueda renderizar completo. No es un reporte de lo que su panel tiene hoy — **es el checklist que él corre contra su propio código**, porque este documento no tiene visibilidad del repo `joi360mono`.

1. ¿Su panel RedPontis puede activar/desactivar cada una de las 22 capacidades **por tenant**, con un flag `enabled` legible en tiempo real por la app? (→ arma el grid de "Mis módulos")
2. ¿Su catálogo global de capacidades tiene un campo tipo `surface` que distinga capacidades con pantalla propia de usuario vs. capacidades "de sistema" sin pantalla (como `inventario`)? Sin esto, el grid de Home no puede excluir correctamente las que no van ahí.
3. ¿Su panel expone, por capacidad, los **feature flags** individuales (no solo "activa/inactiva")? Wallet por sí sola necesita 7 flags independientes (`balance`, `recarga`, `p2p`, `subwallet`, `bandita`, `notifs`, `qr_fijo`) — si su modelo de datos solo tiene un booleano por capacidad, Home no puede diferenciar qué acciones mostrar.
4. ¿El toggle de `usaPulseraNfc` (config field, no feature flag) existe como campo separado del flag `bandita`? Los dos gatean juntos la tile de Home Y el tab de Pay — si solo existe uno de los dos, alguno de los dos lugares queda con un gate incompleto.
5. ¿Los canales de recarga (Emisión) están modelados en 2 niveles — catálogo global (con `checkout` type y PSP) + activación por tenant — o es un solo nivel? El checkout de `/pay` necesita los dos.
6. ¿Existe el concepto de "capacidad `loyalty` con puntos derivados de transacciones reales" (no un contador aparte)? Se usa en 3 lugares (Home, Pay balance no, pero Profile sí, y el propio módulo Loyalty) — un solo cálculo, reusado, no 3 implementaciones.
7. ¿Su modelo de dependientes/familiares permite consultarlos **cruzando todos los tenants del usuario a la vez** (no solo el tenant activo)? Lo necesita `/profile` → Mi Familia.
8. ¿Existe cola de soporte (`support_tickets` o equivalente) accesible desde el Centro de ayuda del usuario final, no solo desde el panel admin?

---

## 7. Referencias

- `render-config.md` — mecánica general de resolución de render (`TEMPLATE_MAP`/`resolvePorUxComponent`/`GenericTemplate`) y el ciclo RENDER-CHECK.
- `capacidades.md` — las 22 capacidades con versión, config y dependencias (lo que hay DETRÁS de cada `/module/:id` al que Home navega).
- `no-mock.md` — regla de fallback honesto, aplica igual de fuerte acá (ej. la campana de notificaciones decorativa, los textos legales honestos de Perfil).
