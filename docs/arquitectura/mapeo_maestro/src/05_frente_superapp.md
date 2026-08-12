# JOI360 Superapp (`joi360-app`) — Documentación técnica end-to-end

*Repo: `JOI360/joi360-app/src` · React + Vite + HashRouter · consume Supabase (PostgREST) directo con `fetch()`, sin SDK.*

## 0. Mapa de archivos raíz

| Archivo | Rol |
|---|---|
| `src/App.jsx` | Router raíz (`HashRouter`), `Guard` de auth, resolución inicial `/` → auth/landing/hub, sincronización de mundos y perfil en vivo |
| `src/auth.js` | Registro/login reales contra Supabase Auth REST (no `@supabase/supabase-js`) |
| `src/userStore.js` | Store local (localStorage) de sesión de la app: `auth`, `activeMundoId`, `memberships` |
| `src/store.js` | Store local de "mundos" (semilla legado + mundos en vivo fusionados desde Supabase) |
| `src/hooks.js` | Hooks compartidos: `useWorldConfig`, `useModuleConfig`, `useWalletLive`, `useCatalogLive`, `useMerchantsLive`, `useWalletBalances` |
| `src/modules.js` | Catálogo local curado de capacidades (ícono/color/superficie) + Quick Actions del Hub |
| `src/supabaseClient.js` (1153 líneas) | Toda la capa de datos: fetch/POST/PATCH contra PostgREST, RPCs de wallet, catálogo de errores |
| `src/pages/Auth.jsx`, `Landing.jsx`, `Mundos.jsx`, `Hub.jsx`, `Pay.jsx`, `Activity.jsx`, `Profile.jsx`, `Module.jsx` (5053 líneas), `ClaimTicket.jsx`, `PagarQR.jsx` | Pantallas |
| `src/components/BottomNav.jsx`, `MundoInfoModal.jsx`, `ModuleAtoms.jsx`, `atoms/`, `molecules/`, `Toast.jsx`, `BottomSheet.jsx` | UI compartida |

---

## 1. Auth / Registro / Sesión / Selector de mundo y perfil

### 1.1 Registro
`AuthPage` (`Auth.jsx:58`), toggle Login/Registro. Envío → `registrarUsuario()` (`auth.js:108`): `POST /auth/v1/signup` con `redirect_to` a una página estática (`auth.js:28-31`, choca con `HashRouter` por eso no es una ruta del router). Si el correo ya existe, Supabase responde 200 con `identities:[]` — el código lo detecta y lanza "Ya existe una cuenta con este correo". Tras crear el usuario, `guardarPerfil()` (`auth.js:143`) llama al backend externo `joi-pos-backend` (no Supabase directo) que calcula server-side la huella hash del documento y escribe `app_profiles`.

### 1.2 Verificación de correo
Polling propio cada 5s (`correoConfirmado`, `auth.js:192`) + reintento en `visibilitychange`/`focus`. "Reenviar" con cooldown de 2 min.

### 1.3 Login
`iniciarSesion()` (`auth.js:152`), re-sincroniza `app_profiles` si detecta metadata pendiente.

### 1.4 Resolución de sesión → a qué Mundo(s) pertenece
`App.jsx` monta 3 `useEffect` globales: (1) `refreshWorldsLive()` — mundos en vivo; (2) reconciliación de membresías reales vía `fetchMembershipsReales` (`SELECT world_id FROM wallets WHERE user_id=…`) — reconstruye membresías si el `localStorage` se perdió; (3) auto-sanación de `app_profiles`. `Root()` decide ruta inicial: sin `auth` → `/auth`; `memberships` vacío → `/landing`; si no → `/hub`. "Unirse a un mundo": `confirmarUnion()` crea wallet real (si Wallet está activo) + `joinMundo` + `setActiveMundo`.

### 1.5 Persistencia y renovación de sesión
Token/refresh en `localStorage`; refresh automático con margen de 30s, deduplicado. Si el refresh también venció, `exigirAutorizacionWallet()` limpia sesión y lanza "Tu sesión expiró".

### 1.6 Selector de perfil (titular vs. dependiente)
No hay selector global — la sesión siempre entra como titular. El selector es **por-módulo**: Wallet (fila de beneficiarios), Menú ("Reservar para", obligatorio si hay dependientes), Comercios/Marketplace ("Comprando para"), Perfil Extendido (tabs de perfil).

---

## 2. `Hub.jsx` — Home por mundo

`HubPage` (`Hub.jsx:153`). Config viva vía `useWorldConfig` (`wc`).

| Widget | Gate exacto | A dónde lleva |
|---|---|---|
| Balance/identidad | `wc.flag("wallet","balance")` (`Hub.jsx:182`) | — |
| Loyalty pill | `wc.activo("loyalty")` (`Hub.jsx:173`) | `/module/loyalty` |
| Mi código (QR) | Sin gate | Modal QR |
| "Hoy te toca" (Menú) | `wc.activo("menu")`, solo si hay reservas hoy | `/module/menu` |
| Mis módulos (grid) | filtra `enabled && !surface:"system"` | `/module/{id}` |
| Recargar | `wc.flag("wallet","recarga")` | `/pay?tab=recargar` |
| Bandita NFC | `wc.flag("wallet","bandita") && cfg.usaPulseraNfc !== false` (doble gate) | `/pay?tab=nfc` |
| Familia | `wc.activo("control")` | `/module/control` |
| Promos | `wc.activo("promociones")` | `/module/promociones` |
| Comercios (carrusel) | Sin gate, se llena si hay filas | `/module/comercios` |
| Eventos (carrusel) | `wc.activo("eventos")` + resultados | `/module/eventos?evento={id}` (deep-link) |
| Últimos movimientos | Sin gate, se llena si hay historial | `/activity` |
| Bell notificaciones | Siempre visible, **decorativo** — sin centro real | — |
| Globe (world switcher) | Siempre visible | `/mundos` |

---

## 3. `Module.jsx` — Templates por capacidad

Router `ModulePage`: resuelve `moduleId` → `useModuleConfig`. Si no hay config, `EmptyState` "Módulo no disponible". Resolución en 2 pasos: `TEMPLATE_MAP[moduleId]` dedicado → si no, `resolvePorUxComponent` (matchea flags contra `UX_SURFACE_REGISTRY`) → si nada, `GenericTemplate`.

### WalletTemplate — Wallet — **Construido completo**
Ver saldo, recargar (delega a Pay), P2P, código JOI, gestión Bandita NFC (propia y de dependientes), movimientos. Secciones granulares por flag (`balance`, `recarga`, `p2pEnabled&&p2p`, `bandita&&usaPulseraNfc`). Datos 100% reales.

### LoyaltyTemplate — Loyalty — **Solo UI (maqueta)**
Puntos/nivel vienen de `localStorage`, nunca sincronizados con Supabase. Recompensas destacadas e historial son arrays hardcodeados.

### ReservasTemplate — Reserva — **Solo UI**
`SPACES` y próximas reservas hardcodeados; "Continuar" no persiste nada. El flujo real de "reservar" del ecosistema hoy vive en Menú (`menu_reservas`), no en esta capacidad genérica.

### AsistenciaTemplate — (no está en la lista canónica) — **Solo UI e inalcanzable**
No está registrada en `TEMPLATE_MAP` — código muerto salvo por `resolvePorUxComponent`, sin match configurado.

### RestriccionesTemplate — Restricciones — **Construido completo**
CRUD completo de dependientes: crear (con cobro de suscripción opcional si `perfilesSuscripcion` está activo), editar perfil/alergias, eliminar (bloquea si `saldo>0`, libera bandita NFC), recargar (reutiliza P2P), restricciones granulares por dependiente (horario, límite diario, productos bloqueados — picker real contra `products`). `AlertasConsumoBanner` con alertas reales. La vinculación NFC de un dependiente se dispara desde **WalletTemplate** (fila del dependiente), no desde acá.

### AccesosTemplate — Acceso — **Construido, parcial**
QR propio, zonas, historial propio y de dependientes — real. El estado "Activa" de cada chip de zona es decorativo/fijo.

### CashbackTemplate — Cashback — **Solo UI**
Saldo y pendiente hardcodeados; botón "Transferir a billetera" sin `onClick`.

### MenuTemplate — Menú — **Construido completo** (salvo canje QR)
Calendario diario, "Reservar para" (titular/dependiente), carrito bloqueado por alergia/restricción, checkout con saldo. Borrador persistido en `sessionStorage`. Si `metodoReserva==="qr"`, avisa honestamente que el canje en POS aún no está construido, en vez de simular un cobro.

### EventosTemplate — Motor de evento — **Construido completo**
Marketplace + compra de entradas + "Mis entradas" (QR, transferencia) + creación B2C (si `allowB2C`) sujeta a aprobación. `MisEntradasList` refresca en `visibilitychange` y cada 8s para reflejar check-in sin recargar. Deep-link `?evento=<id>` desde el carrusel del Hub.

### GenericTemplate — fallback (cubre **Facturación**)
Lista feature flags activos y hasta 6 campos de config crudos, con banner honesto "Vista resuelta por configuración... sin código dedicado".

### SubsidioTemplate — Subsidio — **Solo UI** (`// demo` explícito en el código)
### CreditoTemplate — Crédito — **Solo UI** (financiamiento real vive en BNPL, no acá)

### PerfilExtTemplate — Perfil extendido — **Construido completo**
Ficha médica/emergencia del titular o dependiente, identificación QR de dependiente, grupo familiar. Alergias de un dependiente de solo lectura acá (se editan en Restricciones).

### EstacionamientoTemplate — Estacionamiento — **Solo UI**
Cronómetro solo en memoria, sin persistencia; historial hardcodeado.

### PromocionesTemplate — Promociones — **Construido completo**
Lista + QR de canje (validado en el POS del comercio, fuera de esta app). Vencimiento calculado en fecha local (evita bug de `toISOString()` adelantando el día en horario de tarde/noche en Lima).

### TurnosTemplate — Turnos — **Solo UI**
`CITAS` hardcodeado; "Agendar" sin `onClick`.

### TransporteTemplate — Transporte — **Solo UI** con contexto real
Tarifa y saldo reales, pero sin flujo de pago funcional (botones sin `onClick`); rutas/viajes hardcodeados.

### BNPLTemplate — BNPL — **Construido, parcial**
Descubrir comercios BNPL → elegir producto/cuotas → evaluar (con o sin aprobación) → firmar con cobro de 1ra cuota → "Mis Planes" (pagar cuotas) → "Historial". Checkout simulado tipo Culqi, explícitamente marcado como "simulado para demo" — **sin integración PSP real**. Lógica de negocio (elegibilidad, cronograma, mora) real y completa.

### ConsumosTemplate — Compras y transacciones — **Construido completo**
Recorte del historial de Wallet, sin tabla propia.

### MarketplaceTemplate — Comercio — **Construido completo**
Directorio + catálogo (`products`) + carrito por comercio + checkout con selector de beneficiario, valida horario y productos bloqueados client-side Y server-side. Esta es también la capacidad que materializa **Inventario** para el usuario final (control real de `stock`) — Inventario no tiene template propio (`surface:"system"`).

### Capacidades canónicas sin template propio detectable
| Capacidad | Estado |
|---|---|
| **Facturación** | Sin `TEMPLATE_MAP` — cae en `GenericTemplate`. |
| **Precompra** | No existe como capacidad/moduleId en ningún catálogo. Solo aparece como texto informativo (`ventanaPickup`) dentro de Eventos. **Gap — construido solo del lado admin/organizador esta semana, aún no tiene consumo en superapp.** |
| **Suscripciones** | No existe como capacidad independiente — el único mecanismo real es `perfilesSuscripcion`/`subscription_plans`, un config field de Wallet consumido dentro de Restricciones. **Gap** si se quiere una capacidad "Suscripciones" genérica. |

---

## 4. `Pay.jsx` — Centro de Pagos

3 tabs condicionales (`walletCfg?.has("bandita") && usaPulseraNfc !== false` decide si aparece NFC). Tab QR: monto → QR **simulado** (no escaneable por un POS real) → "Simular pago" hace un débito real. Tab Recargar: canales reales, valida topes del canal y del mundo, checkout según tipo (form/qr/manual, todos simulados salvo el resultado final que sí es real). Tab NFC: solo el flujo legado "solicitar".

### Bug fix documentado: re-sincronización de tab en la misma ruta
```js
useEffect(() => { const t = params.get("tab"); if (t) setTab(t); }, [params]);
```
Causa raíz: `useState` inicial solo se evalúa al montar; con `HashRouter`, cambiar `?tab=` sin cambiar el path no remonta el componente. Encontrado en producción ("bandita me lleva a recarga").

---

## 5. Bandita NFC — flujo legado vs. Web NFC directo

### 5.1 Legado "solicitar" (admin-mediado)
`solicitarBanditaNfc` inserta `nfc_requests` (`pendiente`) → un operador del mundo la entrega físicamente y la marca `entregada`. Estados: `undefined → pendiente → entregada|rechazada`. "Universal" (solo titular): usarla en todos los mundos.

### 5.2 Web NFC directo (self-service) — recién construido
Botón dentro de `WalletTemplate`: "¿Ya tienes la pulsera en mano? Vincúlala ahora con tu celular" → `VincularBanditaWebNfcModal`.
```js
const nfcSoportado = typeof window !== "undefined" && "NDEFReader" in window;
```
Feature-detect puro (Chrome/Android + HTTPS); en iOS/desktop el botón no se renderiza, cae al flujo legado automáticamente. Flujo: "Empezar a leer" (gesto de usuario obligatorio) → `ndef.scan()` → `onreading` captura `serialNumber` → `vincularBanditaDirectoRemote` con las MISMAS guardas que el POS Operador admin: banda debe existir en el inventario del mundo, no debe estar ya vinculada, debe estar `"asignada"`, la cuenta destino no debe tener ya otra banda activa. Si pasa, marca `activa` + cierra sola cualquier solicitud pendiente.

---

## 6. Dependientes / Familiares

Gestión completa en RestriccionesTemplate. Eliminar: 3 pasos server-side (libera bandita, borra wallet, borra dependiente), bloqueado si tiene saldo. `ProfilePage` consolida "Mi Familia" de todos los mundos a la vez (solo lectura/navegación).

---

## 7. World-switcher / "Grupos" (Sucursales) — GAP confirmado

**No existe** en `joi360-app` ningún concepto de Grupos/Sucursales — verificado por búsqueda exhaustiva. `MundosPage` (`/mundos`) es un selector entre membresías DISTINTAS (mundos separados a los que el usuario ya pertenece), no un switcher de sucursales de un mismo mundo. Si la feature "Sucursales" (multi-sede bajo un mismo mundo, con switcher en el Hub) está en el roadmap, **hoy no tiene ningún soporte en el superapp** — sería trabajo net-new, no una extensión de `MundosPage`.
