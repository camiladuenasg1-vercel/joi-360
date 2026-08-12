# JOI360 — Fronts operator-facing no-superapp (`joi360-admin/src`)

Fuente: `Fronts.jsx` (4005 líneas) y `OrganizadorFront.jsx` (1789 líneas), con soporte de `store.js`, `supabase.js`, `App.jsx`. Todas las citas son `archivo:línea`.

Ruteo (App.jsx:77-83):
```
/mundo/:id        → MundoFront          (Fronts.jsx:2598)
/comercio/:id     → ComercioFront       (Fronts.jsx:3491)
/organizador/:id  → OrganizadorFront    (OrganizadorFront.jsx:235)
```

---

# 1. Panel de Mundo / Sponsor Dashboard

## Intro

**Ruteo/login:** `/mundo/:id` → `MundoFront` (Fronts.jsx:2598-2610). Resuelve el mundo por `id` desde `useStore()`. Hay dos formas de entrar:
- **Sponsor real:** `SponsorGate` (Fronts.jsx:2612-2659) pide usuario/password y llama `sponsorLogin(mundoId, usuario, password)` (store.js:1204-1211), que golpea la RPC `verificarLoginSponsorRemote` — comparación server-side contra hash, el cliente nunca ve la contraseña (comentario store.js:1200-1203 documenta que esto reemplazó una comparación en texto plano). El login solo es posible si `m.entrega?.entregado` es `true` (Fronts.jsx:2616-2620) — RedPontis debe "ejecutar la entrega" del dashboard primero (`ejecutarEntrega`, store.js:1192-1198).
- **Preview de RedPontis:** si hay `session()` (sesión admin RP) pero no `sponsorSession`, se entra en modo `preview` (Fronts.jsx:2604-2609) — banner tertiary "Vista previa RedPontis" (Fronts.jsx:2795-2799) y sin botón de logout de sponsor.

**Qué lo diferencia del Admin RedPontis (`MundoDetail.jsx`):**
- No puede activar/desactivar capacidades ni editar `configFields` de módulos (MDR, comisión, tasas, revenue share) — todo eso vive en `MODULE_CATALOG` y solo lo edita RP.
- "Comercios": solo puede alternar `Toggle` de visibilidad en app (`actualizarVisibilidadMerchantRemote`, Fronts.jsx:3228-3242) y **solicitar** alta de comercio (queda en cola `merchant_requests` para aprobación de RP, Fronts.jsx:3035-3062) — no puede crear/editar un comercio directamente ni tocar su tarifa/MDR.
- "Usuarios": ve solo agregados/KPIs (titulares, dependientes, saldo en circulación) — **sin PII** (Fronts.jsx:2358-2363, comentario explícito: "el mundo administra un programa, no un padrón").
- BNPL: ve consolidado/desempeño por comercio, pero el programa (cuotas, comisión, mora) lo configura cada comercio, con techo que solo RP define (`bnplLimitesDelMundo`, Fronts.jsx:1176-1182).
- Eventos: solo ve/gestiona la pestaña "Eventos" si RP activó explícitamente el modo **Embebido** para ese mundo — de lo contrario los eventos B2B se gestionan en el panel del Organizador (otro actor/credenciales).
- Liquidación: solo lectura del corte generado automáticamente (`generarLiquidacionMundo`), no puede forzar ni editar montos.

## Panel de Mundo → Resumen

- **Propósito:** landing del dashboard: KPIs globales (comercios cargados, POS solicitados, módulos activos, eventos publicados), feed de ventas en vivo, ranking de ventas por comercio, y grid de "Módulos activos" como accesos directos a cada tab.
- **Capacidad(es):** agregador de todas — siempre visible, no gated.
- **Flujo de usuario:** 1) Entra al dashboard → ve KPIs. 2) Revisa `ConsumosLiveWidget` y `VentasPorComercioWidget`. 3) Clic en una card de "Módulos activos" → navega al tab de esa capacidad si tiene panel propio (`navegable = tabs.some(t => t.k === x.id)`, Fronts.jsx:2857-2862); si no (ej. Eventos en modo B2B), el botón queda deshabilitado con tooltip "Este módulo se gestiona fuera de este dashboard".
- **Experiencia/UX:** cards con estado "cargando…"/vacío en los widgets hijos; sin confirmaciones (solo lectura).
- **Modelo de datos:** `transactions` (via `fetchConsumosMundo`, `fetchVentasPorComercioMundo`, supabase.js:2288, 2297), cruzado en cliente con la lista local de `comercios` para el nombre.
- **Componentes clave:** `SponsorDashboard` Fronts.jsx:2707-2918; `ConsumosLiveWidget` Fronts.jsx:1131-1171; `VentasPorComercioWidget` Fronts.jsx:201-252.
- **Estado:** Construido completo.

## Panel de Mundo → Wallet

- **Propósito:** ver recargas presenciales/online, familiares (tutores/dependientes) vinculados, solicitudes de pulsera NFC pendientes y pedir más stock de banditas.
- **Capacidad:** **Wallet** — tab solo aparece si `moduloActivo("wallet")` (`(m.modulos||[]).some(x=>x.id==="wallet"&&x.enabled)`, Fronts.jsx:2721, filtrado en `MODULOS_KPI`, Fronts.jsx:2730-2741).
- **Flujo de usuario:** 1) Ve recargas recientes filtrables por canal, exporta CSV. 2) Ve lista de dependientes vinculados por tutor, exporta CSV. 3) Resuelve solicitudes de pulsera pendientes (Entregar/Rechazar). 4) Pide más lotes de banditas a RedPontis.
- **Experiencia/UX:** loading "Cargando…" por widget; empty states explicativos ("Sin recargas todavía…"); alerta roja si `disponibles < pendientes.length` en banditas (Fronts.jsx:160-164); errores via `errorControlado`/`logErrorControlado` con mensaje+acción del catálogo de errores.
- **Modelo de datos:** `transactions` (type=recarga, join `wallets(user_id)`) — `fetchTransaccionesMundo` supabase.js:2283-2285; `dependents` — `fetchDependientesMundo` supabase.js:2215-2217; `nfc_requests` + resolución de nombre via `dependents`/`usuarios_perfil` — `fetchSolicitudesNfcMundo` supabase.js:2250-2269; `nfc_band_requests` — `fetchSolicitudesLoteNfcMundo`/`crearSolicitudLoteNfcRemote` supabase.js:1965-1973. Cruza con capacidad **Acceso** (NFC) y con **Comercio** (recargas presenciales llevan `merchant_id`).
- **Componentes:** `WalletMundoTab` Fronts.jsx:2110-2124; `RecargasMundoWidget` Fronts.jsx:10-65; `FamiliaresMundoWidget` Fronts.jsx:68-111; `SolicitudesNfcWidget` Fronts.jsx:114-195; `SolicitarLoteNfcWidget` Fronts.jsx:1908-1965.
- **Estado:** Construido completo.

## Panel de Mundo → Compras y Transacciones

- **Propósito:** feed en vivo de ventas del mundo entero (todas las compras, cualquier comercio).
- **Capacidad:** **Compras y transacciones** — gated `moduloActivo("consumos")` (Fronts.jsx:2721/2741).
- **Flujo de usuario:** entra al tab → ve últimas 8 ventas con monto/hora, botón refrescar.
- **Experiencia/UX:** loading, empty ("Aún no hay consumos desde la app…").
- **Modelo de datos:** `transactions` (`type=compra`) — `fetchConsumosMundo` supabase.js:2288-2290.
- **Componentes:** `ConsumosMundoTab` Fronts.jsx:2125-2133 (reusa `ConsumosLiveWidget`).
- **Estado:** Construido completo (solo lectura, sin filtros de fecha — a diferencia de "Comercios" que sí tiene `HistorialVentasMundo` con filtros).

## Panel de Mundo → Inventario

- **Propósito:** ver catálogo de productos consolidado de todos los comercios del mundo + stock total.
- **Capacidad:** **Inventario** — gated `moduloActivo("inventario")`.
- **Flujo de usuario:** entra → ve 2 KPIs (productos en catálogo, stock total) + lista de hasta 30 productos con nombre/stock/precio.
- **Experiencia/UX:** loading, `ModuloVacio` si no hay productos.
- **Modelo de datos:** `products` filtrado por `merchant_id in (merchants del mundo)` — `fetchProductosMundo` supabase.js:2312-2317 (comentario: "products no tiene world_id propio, cuelga de merchant_id"). Depende de **Comercio** (tabla `merchants`) para resolver qué productos pertenecen al mundo.
- **Componentes:** `InventarioMundoTab` Fronts.jsx:2134-2159; `KpiCard`/`ModuloVacio` Fronts.jsx:1885-1902.
- **Estado:** Construido completo, solo lectura (no puede editar productos desde acá — eso lo hace el comercio en "Mi catálogo").

## Panel de Mundo → Restricciones

- **Propósito:** ver cuántos dependientes tienen alergias registradas y el log de alertas reales de bloqueo (por alergia o límite).
- **Capacidad:** **Restricciones** — módulo `control` — gated `moduloActivo("control")`.
- **Flujo de usuario:** entra → ve KPIs (dependientes con alergias, alertas registradas) + lista de últimas 20 alertas con mensaje y fecha.
- **Experiencia/UX:** loading, `ModuloVacio` si no hay alertas.
- **Modelo de datos:** `dependents` (columna `alergias`) — `fetchDependientesMundo`; `consumo_alertas` — `fetchAlertasConsumoMundo` supabase.js:2321-2323. Cruza con **Wallet/Compras** (las alertas nacen de intentos de cobro bloqueados por regla de restricción).
- **Componentes:** `ControlMundoTab` Fronts.jsx:2160-2189.
- **Estado:** Construido completo, solo lectura.

## Panel de Mundo → Menú

- **Propósito:** ver reservas reales confirmadas del módulo Menú (platos reservados) y cuántas están pendientes de entrega.
- **Capacidad:** **Menú** — gated `moduloActivo("menu")`.
- **Flujo de usuario:** entra → ve KPIs (reservas confirmadas, pendientes de entrega, monto total) + lista de hasta 20 reservas con beneficiario, comercio, estado (ENTREGADA/pendiente) y monto.
- **Experiencia/UX:** loading, `ModuloVacio`.
- **Modelo de datos:** `menu_reservas` — `fetchMenuReservasMundo` supabase.js:2318-2320. Depende de **Menú** del comercio (`menu_items`/`menu_programacion`) donde se originan las reservas, y de **Wallet** (el cobro ocurre en la app vía `mover_saldo_wallet`, comentario supabase.js:1070-1073). La entrega la marca el comercio desde su POS/App Operador, no desde este panel.
- **Componentes:** `MenuMundoTab` Fronts.jsx:2190-2220.
- **Estado:** Construido completo, solo lectura.

## Panel de Mundo → Perfil extendido

- **Propósito:** ver quién completó su perfil médico/emergencia (tipo de sangre, alergias, clínica, contacto de emergencia), con búsqueda y filtros.
- **Capacidad:** **Perfil extendido** — gated `moduloActivo("perfil_ext")`.
- **Flujo de usuario:** 1) Ve KPIs (perfiles completados, con alergias). 2) Filtra por nombre, tipo (titular/dependiente) o "con alergias". 3) Consulta tabla completa.
- **Experiencia/UX:** loading, `ModuloVacio` si nadie completó perfil; mensaje "Ningún perfil coincide con el filtro" si los filtros no matchean nada.
- **Modelo de datos:** `user_profiles` (tipo_sangre, alergias, clinica, contacto_emergencia_*) — `fetchPerfilesExtendidosMundo` supabase.js:2327-2342, resuelto contra `app_profiles` (titulares) y `dependents` (dependientes) para el nombre.
- **Componentes:** `PerfilExtMundoTab` Fronts.jsx:2221-2293.
- **Estado:** Construido completo, solo lectura.

## Panel de Mundo → Promociones

- **Propósito:** ver cuántas promociones/cupones están vigentes vs. total publicadas.
- **Capacidad:** **Promociones** — gated `moduloActivo("promociones")`.
- **Flujo de usuario:** entra → ve 2 KPIs; sin listado detallado ni edición.
- **Experiencia/UX:** `ModuloVacio` si no hay promociones.
- **Modelo de datos:** `promociones` — `fetchPromocionesMundo` supabase.js:1087-1089.
- **Componentes:** `PromocionesMundoTab` Fronts.jsx:2294-2310.
- **Estado:** parcial — solo KPIs, no hay CRUD de promociones desde este panel (comentario supabase.js:1081-1086 confirma que banners/push/A-B testing del spec completo siguen sin construir).

## Panel de Mundo → Comercios

- **Propósito:** ver el directorio de comercios del mundo, decidir cuáles se muestran en la app, solicitar altas nuevas, y ver historial de ventas filtrable.
- **Capacidad:** **Comercio** — gated `comerciosActivo = moduloActivo("comercios")` (Fronts.jsx:2722, 2742).
- **Flujo de usuario:** 1) Ve tabla de comercios (rubro, POS activos, estado). 2) Alterna `Toggle` "Visible en app" por comercio. 3) Clic "Solicitar Alta de Comercio" → drawer con datos legales/bancarios completos → envía a cola de aprobación de RP. 4) Ve historial de ventas filtrable por comercio/fecha/texto, exporta CSV.
- **Experiencia/UX:** empty state "RedPontis aún no carga comercios en este mundo"; solicitudes propias listadas con Pill de estado (PENDIENTE/APROBADO/RECHAZADO).
- **Modelo de datos:** `merchants` (toggle escribe `visible_en_app`, Fronts.jsx:3229-3242 / supabase.js:1445-1449 — nota: el comentario supabase.js:1438-1444 documenta que este toggle **antes** escribía a un campo local nunca sincronizado, bug ya corregido); `merchant_requests` (alta) — `crearSolicitudComercio`/`fetchSolicitudesComercioMundo` supabase.js:725-744; `transactions` (historial) — `fetchHistorialVentasMundo` supabase.js:2300-2306.
- **Componentes:** `SponsorComercios` Fronts.jsx:3228-3282; `SolicitarAltaComercio` Fronts.jsx:3035-3144; `HistorialVentasMundo` Fronts.jsx:3148-3226.
- **Estado:** Construido completo.

## Panel de Mundo → BNPL / SNPL

- **Propósito:** ver panorama consolidado de financiamiento BNPL de todos los comercios del mundo — cartera vigente/vencida, morosos, desempeño por comercio, y cronograma de contratos.
- **Capacidad:** **BNPL** — gated `bnplActivo = moduloActivo("bnpl")` (Fronts.jsx:2723, 2743, 2890).
- **Flujo de usuario:** 1) Ve KPIs consolidados (comercios con BNPL activo, financiamientos, cartera vigente/vencida, usuarios morosos), filtra por comercio, exporta CSV. 2) Ve gráfico de barras "Desempeño BNPL por comercio" con badge de mora. 3) Ve tabla de todos los contratos; clic en fila abre `BnplContratoDrawer` con 9 acciones de gestión (reprogramar, refinanciar, condonar intereses, eliminar mora, descuento, cancelar anticipado, declarar incobrable, registrar pago manual por cuota).
- **Experiencia/UX:** cada acción del drawer llama `errorControlado`/`logErrorControlado` en caso de fallo; toast de éxito "el cronograma se actualizó y RedPontis fue notificado"; botones deshabilitados condicionalmente (ej. "Condonar" solo si `interes_pct > 0`, "Cancelar" no si ya `cerrado`/`incobrable`).
- **Modelo de datos:** `bnpl_contratos` (+ columna jsonb `cronograma`) — `fetchContratosBNPL` supabase.js:998-1001; `bnpl_programa_comercio` — `fetchProgramaBNPL` supabase.js:992-997; acciones vía `updateContratoBNPL` y funciones específicas (`reprogramarCuotasBNPL` etc., supabase.js:1207+). Cruza con **Comercio** (`merchant_nombre`) y **Wallet** (usuario titular del contrato).
- **Componentes:** `ConsolidadoBNPLMundo` Fronts.jsx:2460-2533; `BNPLChartMundo` Fronts.jsx:2538-2595; `CronogramaBNPLWidget` Fronts.jsx:1670-1733; `BnplContratoDrawer` Fronts.jsx:1740-1876.
- **Estado:** Construido completo — no puede crear un programa BNPL nuevo desde acá (eso lo hace cada comercio), solo gestionar contratos ya firmados.

## Panel de Mundo → Eventos (solo mundos "Embebido")

- **Propósito:** el propio sponsor publica y gestiona sus eventos directo, sin un organizador B2B externo — reusa **exactamente** los mismos componentes del panel de Organizador.
- **Capacidad:** **Motor de evento** — gated `eventosEmbebidoOn = moduloActivo("eventos") && modosDeMundo(m).includes("embebido")` (Fronts.jsx:2724, 2744). `modosDeMundo` (store.js:513-517) deriva "embebido" de `m.eventosConfig.embebidoActivo`.
- **Flujo de usuario:** subtabs internos idénticos al Organizador: Eventos / Comercios / Asistencia / Banditas del evento / Liquidación por evento (`EVENTOS_SUBTABS`, Fronts.jsx:2947-2953). "Nuevo evento" abre `EventoDrawer` con `modosPermitidos=["embebido"]` (Fronts.jsx:3020) — el evento se publica en `estado="PENDIENTE_APROBACION"` igual que cualquier otro (pasa por Gobierno de RP).
- **Experiencia/UX:** aforo en vivo vía polling cada 6s (`useAforoLive`, Fronts.jsx:2927-2939); progress bar de ocupación con color por umbral.
- **Modelo de datos:** idéntico al de Organizador (ver sección 3) — `events`, `event_ticket_types`, `event_tickets`, `event_merchants`, `event_guests`, `event_agenda_items`, `event_checkin_log`.
- **Componentes:** `SponsorEventosTab` Fronts.jsx:2955-3026, que monta directamente `TabComerciosOrganizador`, `TabAsistenciaOrganizador`, `TabBanditasEventoOrganizador`, `TabLiqOrganizador` (Fronts.jsx:3012-3015) — **código 100% compartido con OrganizadorFront.jsx**, no duplicado.
- **Estado:** Construido completo.

## Panel de Mundo → Control de Accesos

- **Propósito:** registrar entradas/salidas de personas por código (QR/pulsera), llevar turnos de portería y ver el log reciente.
- **Capacidad:** **Acceso** — gated `accesosActivo = moduloActivo("accesos")` (Fronts.jsx:2725, 2745).
- **Flujo de usuario:** 1) Operador tipea/escanea código del usuario, elige tipo (Entrada/Salida) y zona (configurable por mundo en `modulos.accesos.config.zonas`). 2) Sistema busca la wallet por código (`buscarWalletPorCodigo`) — si no existe, error controlado. 3) Registra el movimiento. 4) Ve tabla "Turnos de portería" (quién abrió/cerró turno, por zona) y "Registros recientes".
- **Experiencia/UX:** resultado inline ok/error con `Icon`; loading por sección; nota explícita en el copy: "Sin hardware de lectura real — el código se escanea o tipea igual que en Asistencia de eventos" (Fronts.jsx:3331).
- **Modelo de datos:** `access_log` (registro) — `fetchAccesosMundo`/`registrarAccesoRemote` supabase.js:478-486; `access_shifts` (turnos) — `fetchTurnosMundo` supabase.js:497-499; depende de **Wallet** para resolver el código a `user_id`.
- **Componentes:** `SponsorAccesos` Fronts.jsx:3289-3429.
- **Estado:** Construido completo. Nota: este tab fue "movido 29-jul del panel de RedPontis a este panel del propio Mundo" (comentario Fronts.jsx:3284-3288) — antes vivía en `MundoDetail.jsx` (admin).

## Panel de Mundo → Usuarios

- **Propósito:** pulso agregado de personas en el mundo (titulares, dependientes, familias, saldo en circulación) — sin exponer datos personales.
- **Capacidad:** no está en el catálogo canónico como capacidad propia (es transversal a **Wallet**); tab siempre visible (Fronts.jsx:2746).
- **Flujo de usuario:** entra → ve grid de 6 KPIs.
- **Experiencia/UX:** error visible si falla el fetch (`error && <div className="text-error...">`, Fronts.jsx:2366-2370); empty state si no hay usuarios.
- **Modelo de datos:** `wallets` (world_id, user_id, balance, status) como fuente de "pertenencia al mundo" — comentario explícito: "La pertenencia a un mundo no tiene tabla propia: `wallets(user_id, world_id)` ya la describe" (supabase.js:2400-2401); cruza `dependents`, `nfc_bands`, `nfc_requests` — `fetchUsuariosDeMundo` supabase.js:2402-2420+.
- **Componentes:** `UsuariosMundoTab` Fronts.jsx:2325-2395.
- **Estado:** Construido completo, deliberadamente sin PII (correo/documento viven en `auth.users`, inaccesibles con la llave anónima — mismo patrón documentado en supabase.js:2389-2394).

## Panel de Mundo → Hardware

- **Propósito:** pedir stock de pulseras NFC y de equipos POS/tótems/lectores a RedPontis, y ver en qué va cada pedido.
- **Capacidad:** transversal (soporta **Wallet**/**Acceso**/**Comercio**); tab siempre visible (Fronts.jsx:2747).
- **Flujo de usuario:** 1) "Solicitar más banditas NFC": cantidad → envía. 2) "Requerir equipos": elige modelo del catálogo (`HARDWARE_FISICO`, excluye Tap2Phone porque no es despachable), cantidad, motivo opcional → envía. 3) Ve badge de solicitudes pendientes y estado de cada una (pendiente/aprobado/entregado/rechazado, con nota de RedPontis si la hay).
- **Experiencia/UX:** badge numérico rojo/tertiary de pendientes en el header de cada widget; loading/empty por sección.
- **Modelo de datos:** `nfc_band_requests` — `crearSolicitudLoteNfcRemote`/`fetchSolicitudesLoteNfcMundo` supabase.js:1965-1973; `hardware_requests` — `crearRequerimientoHardware`/`fetchRequerimientosHardwareMundo` supabase.js:2506-2518; `nfc_requests` (individuales, distinto de lote) — `fetchSolicitudesNfcMundo`.
- **Componentes:** `HardwareMundoTab` Fronts.jsx:2091-2108; `SolicitarLoteNfcWidget` Fronts.jsx:1908-1965; `RequerirHardwareWidget` Fronts.jsx:1980-2081.
- **Estado:** Construido completo (solicitud/seguimiento); la asignación real de unidades físicas la resuelve RP en Hardware/POS (admin).

## Panel de Mundo → Liquidación

- **Propósito:** ver el corte/liquidación real del mundo (volumen, comisión, neto) por lote, con vouchers/observaciones si RP los adjuntó.
- **Capacidad:** transversal a **Comercio**/**Compras y transacciones**; tab siempre visible (Fronts.jsx:2748).
- **Flujo de usuario:** al entrar, se dispara `generarLiquidacionMundo(m.id)` automáticamente para calcular el corte vigente (spinner "Calculando corte vigente…"), luego se listan los lotes históricos.
- **Experiencia/UX:** spinner mientras genera; `ModuloVacio` si no hay transacciones que liquidar; Pill de estado (PAGADO/PROCESADA en verde, RETENIDO en rojo, resto ámbar); link "Ver voucher" si existe.
- **Modelo de datos:** `liquidaciones` (unique `world_id+fecha`) — `fetchLiquidacionesMundoRemote` supabase.js:1416-1418, `upsertLoteLiquidacionRemote` (idempotente) supabase.js:1423-1429; modelo comercial (`acuerdo.tipo`/`revShare`) viene del propio objeto `m` (definido solo por RP).
- **Componentes:** `LiquidacionMundoTab` Fronts.jsx:2397-2455.
- **Estado:** Construido completo, solo lectura para el sponsor (no puede forzar corte ni marcar como pagado — eso es RP).

## Panel de Mundo → Soporte

- **Propósito:** canal de tickets hacia RedPontis (POS adicionales, cambios de módulos, incidencias).
- **Capacidad:** transversal; tab siempre visible (Fronts.jsx:2749).
- **Flujo de usuario:** "Nueva solicitud" → drawer (tipo, asunto, detalle) → se guarda local optimista y luego remoto.
- **Experiencia/UX:** update optimista en `st.tickets` antes de la respuesta remota, luego reconciliación del id real; Pill ABIERTO/resuelto.
- **Modelo de datos:** `support_tickets` — `crearTicketSoporteRemote` supabase.js:1467-1473 (comentario documenta que antes era 100% local sin sync — bug ya corregido).
- **Componentes:** `SponsorSoporte` Fronts.jsx:3431-3488.
- **Estado:** Construido completo.

---

# 2. Panel de Merchant (Comercio)

## Intro

**Ruteo/login:** `/comercio/:id` → `ComercioFront` (Fronts.jsx:3491-3500). Resuelve `comercio` y su `mundo` padre. Login vía `MerchantGate` (Fronts.jsx:3502-3564), con **dos modos**:
- **PIN rápido** (4 dígitos, si `comercio.codigo` existe): `merchantPinLogin` (store.js:1852-1861) → RPC `verificarPinOperadorRemote` (server-side, contra hash) — mismo patrón seguro que `sponsorLogin`.
- **Usuario y contraseña**: `merchantLogin` (store.js:1839-1846) — **comparación en el cliente** contra `comercio.credenciales` ya cargado en el store local (sincronizado desde Supabase) — a diferencia del PIN y de `sponsorLogin`, este camino **no** pasa por una RPC server-side.

**Qué lo diferencia del Admin RedPontis / Panel de Mundo:**
- No ve otros comercios del mundo, ni el directorio completo.
- No puede tocar su propia tarifa/MDR (`mdrOverride`/`tarifa` los define RP en el alta) — solo lo ve reflejado en "Liquidación" como dato informativo (Fronts.jsx:3814).
- No puede activar/desactivar capacidades del mundo (BNPL/Menú aparecen solo si el mundo ya los tiene activos, `bnplHabilitado`/`menuHabilitado`).
- No decide su propia visibilidad en el app (`visible_en_app` la controla el sponsor desde "Comercios").
- Sí controla 100%: su catálogo de productos, su catálogo de Menú, su programa BNPL (dentro del techo del mundo), su foto de perfil, y el cobro/recarga real.

**Nota sobre nomenclatura del spec:** los nombres de tab pedidos en el enunciado ("Cobrar, Catálogo, Consulta, Cierre") no coinciden 1:1 con los tabs reales del código — el tab real se llama **"Liquidación"** (no "Cierre") y no existe un tab dedicado "Consulta" (la consulta de ventas vive dentro de "Resumen del día" vía `VentasComercioWidget`). Tabs reales (`MerchantDashboard`, Fronts.jsx:3698-3707): Resumen del día, Mi catálogo, Catálogo de Menú (condicional), Cobrar, BNPL·Paga después (condicional), Liquidación, Mi perfil, Soporte.

## Panel de Merchant → Resumen del día

- **Propósito:** KPIs del día (transacciones aprobadas, volumen bruto, tasa de descuento, neto estimado) + feed filtrable "Mis ventas".
- **Capacidad:** **Compras y transacciones** — siempre visible dentro de Comercio.
- **Flujo de usuario:** entra → los 4 KPIs se recalculan cada vez que se visita el tab (`useEffect` con dependencia `[merchantId, tab]`, Fronts.jsx:3678-3681 — corrige un bug real donde quedaban "congelados en cero" tras cobrar desde otro tab). Debajo, `VentasComercioWidget` permite filtrar por fecha/texto y exportar CSV.
- **Experiencia/UX:** loading "Cargando…"; empty state diferenciado ("Aún no registras ventas propias…" vs "Sin ventas para estos filtros").
- **Modelo de datos:** `transactions` (`merchant_id`, `type=compra`) — `fetchVentasComercioHoy`/`fetchVentasComercio` supabase.js:2202-2211.
- **Componentes:** inline en `MerchantDashboard` Fronts.jsx:3772-3790; `VentasComercioWidget` Fronts.jsx:669-733.
- **Estado:** Construido completo.

## Panel de Merchant → Mi catálogo

- **Propósito:** el comercio administra su propio catálogo de productos (nombre, precio, categoría, stock, foto) — lo que aparece al cobrar en el POS y en su reportería.
- **Capacidad:** **Inventario** (implícito — no hay tab "Inventario" propio en Comercio; el catálogo es la superficie de autoría de esa capacidad) + base de **Comercio**.
- **Flujo de usuario:** 1) Sube foto (drag/click, valida tipo imagen). 2) Llena nombre/precio/categoría (existente o nueva)/stock opcional → "Agregar producto". 3) Tabla lista productos con toggle ACTIVO/PAUSADO, editar, eliminar.
- **Experiencia/UX:** eliminar producto valida primero si está en una **campaña BNPL vigente** — si sí, bloquea con mensaje explicativo en vez de romper la campaña (Fronts.jsx:328-337); confirmación nativa `window.confirm` antes de eliminar (Fronts.jsx:338); loading por imagen (`subiendoImg`).
- **Modelo de datos:** `products` (world_id, merchant_id, name, price, category, stock, image_url, active) — `fetchProductsRemote`/`upsertProductRemote`/`deleteProductRemote` supabase.js:2046-2066. Cruza con **BNPL** (`bnpl_campanas.productos` referencia estos ids) y con **Precompra** de eventos (mismo `products` con `event_id` set, ver sección 3).
- **Componentes:** `MiCatalogoPanel` Fronts.jsx:257-448.
- **Estado:** Construido completo.

## Panel de Merchant → Catálogo de Menú

- **Propósito:** catálogo de platos con alérgenos + programación semanal (qué días se ofrece cada plato y cupos), consumido por el calendario de Menú en la app.
- **Capacidad:** **Menú** — tab solo aparece si `menuHabilitado = (m?.modulos||[]).some(x=>x.id==="menu"&&x.enabled)` (Fronts.jsx:3697, 3701).
- **Flujo de usuario:** 1) Crea plato (nombre, precio, categoría, descripción, checklist de alérgenos de 8 opciones fijas). 2) Clic "Programar" en un plato → expande selector de días de la semana + cupos máx por día → "Guardar programación". 3) Toggle ACTIVO/PENDIENTE DE PROGRAMAR/PAUSADO.
- **Experiencia/UX:** el Pill de estado refleja **tanto** `activo` como si tiene programación real — un plato activo sin programación se muestra "PENDIENTE DE PROGRAMAR" en vez de "ACTIVO" engañoso (comentario Fronts.jsx:626-631, fix real); eliminar valida reservas futuras confirmadas primero (`fetchReservasFuturasDePlato`) y bloquea con mensaje si las hay, sugiriendo "pausar" en vez de eliminar (Fronts.jsx:517-529).
- **Modelo de datos:** `menu_items` — `fetchMenuItemsMerchant`/`crearMenuItemRemote`/`actualizarMenuItemRemote`/`eliminarMenuItemRemote` supabase.js:1025-1043; `menu_programacion` (menu_item_id, dia_semana, cupos_max) — `guardarProgramacionItem` supabase.js:1061-1066, reemplaza todo (borra+inserta) en cada guardado; `menu_reservas` no se referencia por FK sino por snapshot jsonb (documentado supabase.js:1044-1050 y 1036-1040 — borrar un `menu_item` no rompe reservas ya hechas, sí limpia filas huérfanas de programación).
- **Componentes:** `MenuCatalogoPanel` Fronts.jsx:460-666.
- **Estado:** Construido completo.

## Panel de Merchant → Cobrar

- **Propósito:** cobrar o recargar la billetera de un cliente identificado, o generar un cobro por QR sin identificación previa; incluye canje de cupones de promoción.
- **Capacidad:** **Compras y transacciones** (cobro/recarga) + **Promociones** (canje de cupón) — siempre visible.
- **Flujo de usuario (Cobrar/Recargar):** 1) Identificar al cliente por código JOI (o escaneo NFC/QR que autocompleta el input) → `buscarWalletPorCodigo`. 2) Elegir producto del catálogo (autocompleta monto) o monto libre; si el producto es financiable por BNPL, muestra cuotas disponibles. 3) Confirmar cobro/recarga → resultado ok/error con nuevo saldo.
- **Flujo de usuario (Cobrar con QR):** 1) Tipea monto → "Generar QR" crea un `charge_request`. 2) Se muestra QR (vía `api.qrserver.com`) apuntando a `joi360-app.vercel.app/#/pagar/:id`. 3) Polling cada 2s (`fetchChargeRequestRemote`) hasta que el estado cambie a `pagado`/`cancelado` o expire a los 10 min. 4) Puede cancelar manualmente.
- **Experiencia/UX:** al entrar al tab se abre automáticamente un **turno de caja** (`abrirTurnoRemote`) — necesario porque el RPC `mover_saldo_wallet` ahora exige `p_turno_id` real y abierto para cualquier operación con `merchant_id` (comentario Fronts.jsx:770-773, gap cerrado post-#114); nonce de timestamp en la referencia para evitar choque de unicidad en `transactions.reference` (Fronts.jsx:853-858, bug real hallado en vivo); mensajes de error diferenciados por motivo real (`saldo_insuficiente`, `restriccion_horario`, `restriccion_limite_diario`, `wallet_no_encontrada`) en vez de un genérico (Fronts.jsx:860-873, fix Task #181).
- **Modelo de datos:** `wallets` (lookup) — `buscarWalletPorCodigo` supabase.js:2114-2120 (también resuelve `app_profiles.codigo`); `pos_turnos` — `abrirTurnoRemote` supabase.js:2137-2148; `charge_requests` — `crearChargeRequestRemote`/`fetchChargeRequestRemote`/`cancelarChargeRequestRemote` supabase.js:2153-2169; movimiento atómico vía RPC `mover_saldo_wallet` — `cobrarPOSRemote`/`recargarPOSRemote` supabase.js:2171-2201, que escribe en `transactions`. Depende de **Inventario** (`products`) para el listado de productos y de **BNPL** (`bnpl_programa_comercio.productos_financiables`) para el badge "financiable".
- **Componentes:** `CobrarPanel` Fronts.jsx:748-1084; `CanjearCuponWidget` Fronts.jsx:1089-1128 (tabla `promociones`/`promociones_canjes`, supabase.js:1105-1123).
- **Estado:** Construido completo.

## Panel de Merchant → BNPL · Paga después

- **Propósito:** el comercio configura su propio programa BNPL (dentro del techo que el mundo definió), define productos financiables, campañas temporales, y ve reportes/cronogramas de sus propios contratos.
- **Capacidad:** **BNPL** — tab solo aparece si `bnplHabilitado = (m?.modulos||[]).some(x=>x.id==="bnpl"&&x.enabled)` (Fronts.jsx:3696, 3703). Internamente, `ProgramaBNPLPanel` también valida `bnplLimitesDelMundo(m)` (Fronts.jsx:1176-1182, 1242-1247) y muestra `ModuloVacio` si el mundo no habilitó la capacidad.
- **Flujo de usuario:** 1) Elige cuotas activas (3/6/12) — **clamping**: solo puede restringir dentro de lo que el mundo permitió, nunca ampliar (botones tachados/deshabilitados fuera del techo, Fronts.jsx:1300-1314). 2) Define comisión %, revenue share al mundo, gestión de mora (sin cargo / con cargo, con % topeado al máximo del mundo). 3) Define plan de pagos (frecuencia, días de gracia topeados). 4) Define alcance de productos financiables: todo el catálogo / categorías específicas / productos puntuales con nombre libre. 5) "Publicar programa" → guarda. 6) Gestiona campañas temporales (rango de fechas + productos adicionales). 7) Ve reportes (solicitudes pendientes, financiamientos activos, cartera vigente/vencida, próximos vencimientos, historial por usuario) y aprueba/rechaza solicitudes si `sinEvaluacion=false`. 8) Ve cronograma de sus contratos con drawer de gestión (mismas 9 acciones descritas en la sección Mundo→BNPL).
- **Experiencia/UX:** banner de notificaciones de "pérdida de servicio de un cliente" arriba de todo (Fronts.jsx:1185-1213); hint textual cuando un producto puntual supera el monto máximo financiable del mundo, avisando que "el Rules Engine bloqueará su financiamiento" (Fronts.jsx:1435-1437).
- **Modelo de datos:** `bnpl_programa_comercio` (unique `world_id,merchant_id`) — `upsertProgramaBNPL` supabase.js:951-972; `bnpl_campanas` — `fetchCampanasBNPL`/`crearCampanaBNPL`/`eliminarCampanaBNPL` supabase.js:975-991; `bnpl_contratos` — `fetchContratosBNPL` supabase.js:998-1001; `bnpl_notificaciones` — `fetchNotificacionesBNPL`/`marcarNotificacionBNPLLeida` supabase.js:1130-1140. Depende de **Inventario** (`products`) para "alcance: catálogo/categorías".
- **Componentes:** `ProgramaBNPLPanel` Fronts.jsx:1216-1454; `CampanasBNPLPanel` Fronts.jsx:1459-1525; `ReportesBNPLComercio` Fronts.jsx:1531-1665; `CronogramaBNPLWidget`+`BnplContratoDrawer` (compartidos con Mundo).
- **Estado:** Construido completo.

## Panel de Merchant → Liquidación

- **Propósito:** ver el corte de hoy (bruto/comisión/neto) y el historial diario agrupado.
- **Capacidad:** **Facturación**/**Comercio** (liquidación) — siempre visible.
- **Flujo de usuario:** entra → ve 3 tarjetas del día (volumen bruto, tasa de descuento aplicada, neto a acreditar) + tabla histórica por día.
- **Experiencia/UX:** nota informativa fija con la MDR real aplicada y sugerencia de abrir ticket de soporte ante dudas (Fronts.jsx:3812-3815); mensaje "Aún no hay transacciones aprobadas para liquidar" si vacío.
- **Modelo de datos:** `transactions` (`status=completada`, agrupado por día en cliente) — `fetchVentasComercio` supabase.js:2202-2204, con `mdrEfectivo` calculado a partir de `comercio.mdrOverride`/`tarifa` o el canal de adquirencia default del store (`st.adqChannels[0].mdr`) — **el comercio no puede editar este valor**, solo lo ve.
- **Componentes:** `MerchantLiquidacionHistorial` Fronts.jsx:3624-3667.
- **Estado:** Construido completo, solo lectura.

## Panel de Merchant → Mi perfil

- **Propósito:** subir/cambiar la foto que representa al comercio en el carrusel de la Super App.
- **Capacidad:** **Comercio** — siempre visible.
- **Flujo de usuario:** clic en el círculo de foto o "Elegir/Cambiar foto" → sube imagen → se guarda.
- **Experiencia/UX:** valida tipo de archivo (debe ser imagen); loading "Subiendo…"; toast de éxito explícito ("ya se verá en el carrusel del app").
- **Modelo de datos:** `merchants.photo_url` — `actualizarFotoMerchantRemote` supabase.js:1451-1456; archivo sube a bucket `joi360-media` — `uploadArchivo` supabase.js:333.
- **Componentes:** `PerfilComercioPanel` Fronts.jsx:3567-3617.
- **Estado:** Construido completo.

## Panel de Merchant → Soporte

- **Propósito:** enviar tickets al administrador del mundo y a RedPontis.
- **Capacidad:** transversal — siempre visible.
- **Flujo de usuario:** "Nueva solicitud" → drawer (tipo, asunto, detalle) → envía.
- **Experiencia/UX:** update optimista local + reconciliación de id remoto (mismo patrón que Soporte del Mundo).
- **Modelo de datos:** `support_tickets` (con `comercio_id`, `origen="merchant"`) — `crearTicketSoporteRemote` supabase.js:1467-1473.
- **Componentes:** inline en `MerchantDashboard` Fronts.jsx:3819-3848.
- **Estado:** Construido completo.

---

# 3. Panel de Organizador (Eventos B2B)

## Intro

**Ruteo/login:** `/organizador/:id` → `OrganizadorFront` (OrganizadorFront.jsx:235-376). Dos formas de acceso:
- **Organizador real:** `OrganizadorGate` (OrganizadorFront.jsx:203-233) pide usuario/password y llama `organizadorLogin(mundoId, usuario, password)` (store.js:1216-1223) — **comparación en cliente** contra `organizadores.credenciales` ya cargado en el store local, no una RPC server-side (a diferencia de `sponsorLogin`). El comentario del código (OrganizadorFront.jsx:200-202) llama a este login "real" porque reemplazó una versión previa donde el panel solo aceptaba la sesión del Admin RP como "vista previa" — pero el mecanismo de verificación en sí sigue siendo el patrón antiguo (comparación plana), no el hasheado server-side que ya tienen `sponsorLogin` y `merchantPinLogin`.
- **Preview de RedPontis:** `isPreviewRP = !!adminSess` (OrganizadorFront.jsx:243) — si hay sesión admin, entra en modo preview con ribbon tertiary y ve **todos** los eventos B2B del mundo; un organizador real solo ve los suyos (`eventos = isOrganizador ? todosEventos.filter(e=>e.organizadorId===orgSess.organizadorId) : todosEventos`, OrganizadorFront.jsx:248-250).

**Qué lo diferencia de RedPontis / del Panel de Mundo:**
- Solo ve/gestiona **sus propios** eventos B2B (`organizadorId` propio) — no otros eventos del mismo mundo, ni otros módulos del mundo (Wallet, Inventario, etc.) — es un dashboard 100% acotado a Eventos.
- Un evento nuevo/editado siempre entra a `estado="PENDIENTE_APROBACION"` — no puede auto-publicar; RedPontis aprueba en su Gobierno (misma cola cross-mundo que altas de comercio) (OrganizadorFront.jsx:1449-1453).
- No puede elegir el "criterio del evento" (`modo`) libremente — el `EventoDrawer` se abre con `modosPermitidos=["b2b"]` (OrganizadorFront.jsx:370, 1372) y si `organizadorFijo` está presente el campo queda fijo en B2B, no editable.
- La comisión de liquidación (`comisionPct`) es de solo lectura, tomada del `acuerdo`/`config` del módulo `eventos` que solo RP define (OrganizadorFront.jsx:1288-1289).
- Comparte código con el sponsor en modo Embebido (`TabComerciosOrganizador`, `TabAsistenciaOrganizador`, `TabBanditasEventoOrganizador`, `TabLiqOrganizador` se reusan tal cual desde `SponsorEventosTab`, Fronts.jsx:3012-3015) — misma UI, distinto actor/alcance de datos.

Tabs (OrganizadorFront.jsx:262-268): Mis Eventos, Comercios, Asistencia, Banditas del evento, Liquidaciones. No hay gating por capacidad — el actor "Organizador" en sí solo existe si el mundo tiene la capacidad **Motor de evento** en modo B2B.

## Panel de Organizador → Mis Eventos

- **Propósito:** ver/crear/editar/pausar/eliminar los eventos propios; ver aforo en tiempo real.
- **Capacidad:** **Motor de evento (crear eventos, crear entradas)**.
- **Flujo de usuario:** 1) "Crear evento" abre `EventoDrawer` (wizard de 4 pasos, ver más abajo). 2) En la lista, cada evento muestra tipos de entrada con vendidas/cupos, Pill de estado (PUBLICADO/EN REVISIÓN RP/RECHAZADO/PAUSADO), toggle Publicar/Pausar (si no está pendiente/rechazado), botón editar, y botón eliminar (solo si `vendidasDe(ev) === 0`). 3) Widget "Aforo en tiempo real" arriba de la lista, con barra doble (vendidas vs. dentro-ahora) y Pill "AFORO LLENO" si se agotó.
- **Experiencia/UX:** polling cada 6s de tickets reales vía `useTicketsLive` (OrganizadorFront.jsx:176-194) — "tiempo real" es polling, no websockets (comentario explícito); botón "Actualizar ventas" fuerza refresh inmediato; `window.confirm` antes de eliminar; eliminar con ventas > 0 se bloquea con mensaje explicativo en vez de fallar silenciosamente (OrganizadorFront.jsx:411-416).
- **Modelo de datos:** `events` — `upsertEventoRemote` OrganizadorFront.jsx:796-826/supabase.js; `event_ticket_types` — `syncTicketTypesRemote` (reemplazo completo, preserva tipos con ventas ya emitidas) supabase.js:846-898; `event_tickets` — `fetchTicketsDeEvento` supabase.js:900-902; eliminar limpia en cascada `event_ticket_types`, `event_merchants`, `event_agenda_items`, `event_checkin_log`, libera `pos_devices` — `deleteEventoRemote` supabase.js:932-947.
- **Componentes:** `TabEventosOrganizador` OrganizadorFront.jsx:379-582; `EventoDrawer` OrganizadorFront.jsx:1372-1788.
- **Estado:** Construido completo.

## Panel de Organizador → Comercios

- **Propósito:** afiliar comercios del mundo (o crear comercios ad-hoc solo para el evento), asignarles ubicación/stand, y autorar su catálogo de Precompra.
- **Capacidad:** **Comercio** (afiliación) + **Precompra** (sub-feature).
- **Flujo de usuario (afiliación):** 1) Por cada evento publicado/en revisión, se lista **todos** los comercios reales del mundo (`fetchMerchantsRemote`) con un checkbox. 2) Marcar el checkbox → `afiliarComercioEvento` (upsert en `event_merchants`, unique `event_id,merchant_id`); desmarcar → `desafiliarComercioEvento` (delete). 3) Comercio afiliado muestra input de "Ubicación / stand" (autosave `onBlur`).
- **Flujo de usuario (comercio ad-hoc):** "Agregar comercio solo para este evento" → nombre + logo opcional (sube a `joi360-media`) → `crearComercioAdHocEvento`, que inserta directo en `event_merchants` con `merchant_id` sintético (`crypto.randomUUID()`) y `es_ad_hoc=true` — **no** crea una fila en `merchants`, es exclusivo del evento.
- **Flujo de usuario (Precompra):** clic "Precompra" en cualquier comercio afiliado (real o ad-hoc) → expande `EventoCatalogoComercio` → agrega productos con nombre/precio/**stock real** (tope de unidades honrables el día del evento) → el asistente los reserva/paga en la app y retira en el stand.
- **Experiencia/UX:** widget "Hardware del evento" de solo lectura arriba (lista POS asignados a ese evento, link a Hardware/POS admin); error controlado si falla afiliar/desafiliar.
- **Modelo de datos:** `merchants` — `fetchMerchantsRemote` supabase.js:616-618; `event_merchants` (event_id, merchant_id, merchant_nombre, ubicacion, logo_url, es_ad_hoc) — `fetchEventMerchants`/`afiliarComercioEvento`/`desafiliarComercioEvento`/`crearComercioAdHocEvento`/`updateUbicacionEventoComercio` OrganizadorFront.jsx:2071-2099; **Precompra**: `products` con `event_id` **no-nulo** (nunca comparte fila con el catálogo regular, que exige `event_id IS NULL`) — `fetchProductsRemote(merchantId, eventId)`/`upsertProductRemote(product, eventId)` supabase.js:2046-2062; `pos_devices` (event_id) — `fetchPosDevicesDeEvento` supabase.js:1494-1495.
- **Componentes:** `TabComerciosOrganizador` OrganizadorFront.jsx:587-608; `EventoComerciosCard` OrganizadorFront.jsx:610-804; `EventoCatalogoComercio` (Precompra) OrganizadorFront.jsx:806-857.
- **Estado:** Construido completo. **Distinción clave de arquitectura:** este "Precompra" es un catálogo `products` separado por `event_id`, deliberadamente aislado de "Mi catálogo" del comercio (que vive en el mismo panel de Comercio, sección 2) — mismo modelo de datos, distinto scope, sin cruce entre ambos (comentario OrganizadorFront.jsx:806-812).

## Panel de Organizador → Asistencia

- **Propósito:** validar el ingreso/salida de asistentes escaneando o pegando el código QR de su entrada; alimenta el aforo en tiempo real.
- **Capacidad:** **Acceso** aplicado al **Motor de evento**.
- **Flujo de usuario:** 1) Input con autofocus captura el código (un lector QR físico funciona como teclado). 2) Sistema busca el ticket por `qr_code` entre los vendidos. 3) Si el ticket está `emitido`/`checkout`, mueve a `checkin` (rota el QR por seguridad — invalida el anterior); si está `checkin`, botón separado "Registrar salida" mueve a `checkout`. 4) Reingreso solo permitido si `ticket_type.permite_reingreso !== false` — si no, rechaza con `errorControlado("reingreso_no_permitido")`.
- **Experiencia/UX:** feed de "Últimos ingresos" (chips con hora); tabla completa con acción contextual por fila según estado (Validar ingreso / Registrar salida / Reingreso); nota informativa fija admitiendo un **gap real de datos**: "Productos más vendidos, actividades más concurridas y consumo promedio requieren que las ventas de comercio queden asociadas al evento (`transactions` no guarda `event_id`)" (OrganizadorFront.jsx:969-978) — documentado en vez de simulado.
- **Modelo de datos:** `event_tickets` (estado, checkin_at/checkout_at — columnas únicas que se sobrescriben en cada escaneo) — `setTicketEstado` supabase.js:905-917; `event_checkin_log` (historial completo de cada ingreso/salida, permite reingresos ilimitados sin perder trazabilidad) — `logCheckinEvento`/`fetchCheckinLogEvento` supabase.js:2033-2040; `event_ticket_types.permite_reingreso` — `fetchTicketTypesDeEvento` supabase.js:919-920.
- **Componentes:** `TabAsistenciaOrganizador` OrganizadorFront.jsx:860-882; `EventoAsistenciaCard` OrganizadorFront.jsx:891-1061.
- **Estado:** Construido completo (con gap de reportería explícitamente documentado, no simulado).

## Panel de Organizador → Banditas del evento

- **Propósito:** precargar una lista de invitados por documento (sin necesidad de cuenta previa en la app), activar su pulsera física con saldo inicial, y hacer cash-in adicional durante el evento.
- **Capacidad:** **Wallet** + **Acceso** aplicados al evento.
- **Flujo de usuario:** 1) Importar CSV (`nombre, documento`) → cada fila crea un `event_guest` + una `wallet` sintética en `S/0`. 2) Por invitado sin pulsera: "Activar pulsera" → drawer pide código/UID físico, monto de precarga opcional, y días de vigencia post-evento → vincula `nfc_bands` al `guest_user_id` sintético y, si hay monto, acredita saldo real vía `mover_saldo_wallet`. 3) Por invitado con pulsera: "Cash-in" → drawer de monto adicional → acredita saldo (sin turno de caja, a diferencia del POS de comercio).
- **Experiencia/UX:** KPIs de cabecera (precargado total, saldo vivo total, consumido total); Pill de estado por invitado (Invitado/Pulsera asignada/Activo/Cerrado); duplicados de documento se omiten en la importación con conteo explícito en el toast.
- **Modelo de datos:** `event_guest_lists` + `event_guests` (guest_user_id sintético, unique `event_id+documento`) — `importarInvitadosEventoRemote` supabase.js:1837-1866; `wallets` (mismo patrón que un dependiente, reusa `mover_saldo_wallet` sin cambios) — creado en la importación; `nfc_bands` (linked_user_id = guest_user_id, vence_at = fecha evento + margen) — `activarBanditaEventoRemote` supabase.js:1907-1944; `transactions` (`type=recarga_evento`) generadas por el RPC. Cruza con **Acceso** (mismo mecanismo de pulsera que Wallet/Acceso del mundo, pero con vigencia acotada al evento).
- **Componentes:** `TabBanditasEventoOrganizador` OrganizadorFront.jsx:1073-1091; `EventoBanditasCard` OrganizadorFront.jsx:1093-1207; `ActivarBanditaEventoDrawer` OrganizadorFront.jsx:1209-1250; `CashInBanditaEventoDrawer` OrganizadorFront.jsx:1252-1282.
- **Estado:** Construido completo.

## Panel de Organizador → Liquidaciones

- **Propósito:** ver la liquidación de ingresos por venta de entradas, **como instancia separada** del corte diario de la operación regular del mundo.
- **Capacidad:** **Facturación** aplicada al **Motor de evento**.
- **Flujo de usuario:** entra → ve 3 KPIs totales (ingresos brutos, comisión RedPontis, neto al organizador) + tabla por evento con su propia instancia de liquidación.
- **Experiencia/UX:** nota explicativa fija distinguiendo el corte diario del mundo (19:00 PE, vía Módulo de Liquidación de Comercios) de la instancia por evento (T+1 tras cierre del evento) (OrganizadorFront.jsx:1363-1366); columna "Corte" muestra "T+1 tras cierre del evento" si hay datos live, "pendiente sync" si no.
- **Modelo de datos:** deriva de `event_tickets` (via `ticketsMap`, `sumIngresos`) — no persiste una tabla propia de liquidación de eventos, se calcula en cliente sobre tickets reales; `comisionPct` viene de `m.modulos.find(x=>x.id==="eventos").acuerdo.porTx` o `config.comisionEntrada`, solo editable por RP (OrganizadorFront.jsx:1288-1289).
- **Componentes:** `TabLiqOrganizador` OrganizadorFront.jsx:1287-1369.
- **Estado:** parcial — el cálculo es 100% client-side sobre tickets en vivo, no hay una tabla `liquidaciones` persistida específica para eventos (a diferencia de la liquidación de comercio, que sí persiste en `liquidaciones`).

## Flujos consolidados pedidos explícitamente

### Creación de evento (`EventoDrawer`, OrganizadorFront.jsx:1372-1788)

Wizard de 4 pasos (`STEPS`, línea 1503):
1. **Información general:** nombre, descripción, banner de portada (`BannerDelEvento` — sube imagen a `joi360-media`, escribe `events.imagen_url`, máx 5MB), plano del recinto en PDF (`MapaDelEvento` — máx 10MB, `events.mapa_url`/`mapa_nombre`), fecha/hora, lugar, modalidad (presencial/virtual/mixto).
2. **Entradas y precios:** N tipos de entrada, cada uno con nombre, precio, cupos, ya-vendidas (si edita), mín/máx por compra, ventana de venta (desde/hasta), vigencia, descripción de qué incluye, toggle "Permite reingreso", y 3 checkboxes: **Preventa / Precompra / Prereserva** (flags booleanos en `event_ticket_types` — nota: esto es un flag sobre el *tipo de entrada*, distinto del catálogo de productos "Precompra" del comercio descrito arriba, que vive en `products`).
3. **Configuración y publicación:** método de acceso (QR / Bandita NFC / ambos), política de reembolso, instrucciones para el asistente, tipo de evento (fijo "Kermesse" — catálogo completo pendiente), **criterio del evento** (fijo en B2B si `organizadorFijo`), selector de organizador responsable (si no hay uno fijo), toggles de dónde se publica (privado/App/Landing), resumen final.
4. **Cronograma (Agenda):** solo disponible editando un evento ya guardado (necesita `event_id` real); cada ítem tiene hora, título, descripción, lugar, expositor, imagen opcional.

Al guardar (`save`, línea 1446): calcula `aforo` sumando cupos de todos los tipos de entrada; si es evento nuevo o venía `RECHAZADO`/`PENDIENTE_APROBACION`, fuerza `estado="PENDIENTE_APROBACION"` (release gate — nunca auto-publica); llama `upsertEventoRemote` + `syncTicketTypesRemote` (que preserva tipos con ventas ya emitidas y avisa cuáles no pudo quitar).

### Afiliación de comercios (checkbox vs. ad-hoc)

Ver sección "Panel de Organizador → Comercios" arriba — dos caminos distintos sobre la misma tabla `event_merchants`: checkbox sobre merchants reales del directorio del mundo (`merchant_id` real, FK conceptual aunque no formal) vs. "Agregar comercio solo para este evento" con `merchant_id` sintético (`es_ad_hoc=true`, sin fila en `merchants`).

### Precompra (catálogo de producto+stock por evento)

Ver "Panel de Organizador → Comercios" — `EventoCatalogoComercio` (OrganizadorFront.jsx:806-857), tabla `products` con `event_id` no-nulo, cada producto con **stock real** (tope de unidades, se agota a 0). Deliberadamente separado del catálogo regular del comercio (`event_id IS NULL`).

### Asistencia / check-in

Ver "Panel de Organizador → Asistencia" arriba — escaneo/tecleo de `qr_code`, `event_tickets.estado` (emitido→checkin→checkout, con reingreso condicionado por `permite_reingreso`), historial completo en `event_checkin_log`.

### Agenda

Sub-feature del `EventoDrawer` paso 4 — CRUD simple sobre `event_agenda_items` (hora, título, descripción, lugar, expositor, imagen), ordenado por `orden,hora`. Reemplazó un cronograma "genérico hardcodeado" que mostraba 3 ítems idénticos para cualquier evento (comentario OrganizadorFront.jsx:2013-2014).

### Tipos de entrada

Ver paso 2 del `EventoDrawer` — viven en `event_ticket_types`, sincronizados vía `syncTicketTypesRemote` con reemplazo completo salvo tipos con ventas reales ya emitidas (que se conservan y se reportan como `bloqueados` al organizador).

---

# Cobertura de capacidades canónicas en estos 3 fronts

| Capacidad canónica | Mundo | Comercio | Organizador | Notas |
|---|---|---|---|---|
| Wallet | ✅ tab propio | ✅ (Cobrar/Recargar) | ✅ (Banditas del evento) | |
| Comercio | ✅ tab propio | ✅ (es el front) | ✅ (afiliación) | |
| Compras y transacciones | ✅ tab propio | ✅ (Resumen del día) | — | |
| Promociones | ✅ tab propio (solo KPIs) | ✅ (canje en Cobrar) | — | sin CRUD, gap documentado |
| Perfil extendido | ✅ tab propio | — | — | |
| Menú | ✅ tab propio | ✅ (Catálogo de Menú) | — | |
| Inventario | ✅ tab propio | ✅ (Mi catálogo) | ✅ (Precompra) | |
| Acceso | ✅ tab propio | — | ✅ (Asistencia, Banditas) | |
| Motor de evento | ✅ (solo Embebido) | — | ✅ (es el front) | código compartido |
| Precompra | — | — | ✅ | sub-feature de Motor de evento |
| BNPL | ✅ tab propio | ✅ tab propio | — | |
| Restricciones | ✅ tab propio | — | — | |
| Facturación/Liquidación | ✅ tab propio | ✅ tab propio | ✅ tab propio | cálculo distinto por front |
| Crédito | ❌ no surfaced | ❌ | ❌ | gap |
| Turnos | parcial (solo lectura en Accesos) | interno (pos_turnos, no editable) | — | sin tab propio editable |
| Loyalty | ❌ | ❌ | ❌ | gap |
| Reserva | ❌ (solo vía Menú) | ❌ | — | gap — capacidad genérica de reservas no tiene tab propio |
| Cashback | ❌ | ❌ | ❌ | gap |
| Subsidio | ❌ | ❌ | ❌ | gap |
| Transporte | ❌ | ❌ | ❌ | gap |
| Estacionamiento | ❌ | ❌ | ❌ | gap |
| Suscripciones | ❌ | ❌ | ❌ | gap — existe como config de Wallet (`perfilesSuscripcion`) pero sin UI en ninguno de los 3 fronts |

Las capacidades marcadas ❌ están definidas en `MODULE_CATALOG` (store.js) y pueden activarse/configurarse desde el Admin de RedPontis, pero **no tienen ninguna superficie de UI** en `Fronts.jsx`/`OrganizadorFront.jsx` para el sponsor, el comercio ni el organizador — si RP las activa, no hay dónde operarlas desde estos tres fronts.