# Mapa de navegación

**Sidebar (`NAV`, `joi360-admin/src/ui.jsx:261-282`)** — agrupado en 4 secciones, se renderiza en `Shell` (`ui.jsx:297-374`):

| Grupo | Ítems (label → ruta) |
|---|---|
| **Plataforma** | Dashboard → `/admin` · Catálogos Globales → `/admin/catalogos` · Aprobaciones → `/admin/gobierno` |
| **Comunidades** | Todos los Mundos → `/admin/mundos` · Grupos y Sucursales → `/admin/grupos` |
| **Operación** | Usuarios → `/admin/usuarios` · Liquidación → `/admin/liquidacion` · Calculadora Comercial → `/admin/calculadora` · Soporte → `/admin/soporte` · Monitoreo de Errores → `/admin/monitoreo` · Reportes y Auditoría → `/admin/resumen` |
| **Público** | Landing → `/landing` (fuera del admin, apunta a `LandingPublica.jsx`) |

Cada ítem del sidebar puede llevar un badge numérico rojo (`badgesPorRuta`, `ui.jsx:288-295`) alimentado por `fetchResumenNotificacionesRedPontis` (aprobaciones, hardware, liquidación, soporte). Hay una campanita de notificaciones (`NotificationBell`, `ui.jsx:202-258`) con el mismo resumen agregado, refrescado cada 60 s.

**Rutas `/admin/*` que NO están en el sidebar** (solo alcanzables por deep-link o por otro botón dentro de la app):
- `/admin/catalogo` (Capacidades) — se llega desde el tile "Capacidades" de Catálogos Globales.
- `/admin/adquirencia`, `/admin/emision`, `/admin/hardware-pos` — se llega desde los tiles de Catálogos Globales.
- `/admin/modulos-mundo` — se llega desde el KPI "Módulos contratados" del Dashboard o "Capacidades activas" de Gobierno.
- `/admin/catalogo-productos` y `/admin/anunciantes` — **sin ningún punto de entrada dentro de la app** (ni en NAV, ni en ningún botón/link de otra pantalla); solo se llega tecleando la URL.

**Auth / sesión**: el login vive en `/login` (`Login`, `PagesCore.jsx:142-188`). Envía email+password a `verificarAdminLoginRemote` (`supabase.js:561-567`), que llama al RPC `verificar_admin_login` — la contraseña nunca se compara en el cliente, solo el hash en el servidor. Si es válido, `login()` (`store.js:1023-1028`) escribe `{ email, name }` en `state.session`, persistido en `localStorage` (clave `joi360_state_v3`). El "gate" real de cada pantalla `/admin/*` es puramente client-side: `Shell` corre `useEffect(() => { if (!s) nav("/login"); }, [s])` (`ui.jsx:304`) — si no hay sesión local, redirige. No hay un componente `<PrivateRoute>` en `App.jsx`; cada ruta admin está envuelta en `<A><Shell>...` y es `Shell` quien empuja a `/login`. Todas las llamadas REST a Supabase (`supabase.js:12-29`) usan la **misma anon key pública** sin importar si hay sesión admin — la protección real de escritura/lectura sensible depende de políticas RLS en Supabase, no del estado de sesión del admin. Es un solo rol "Platform Admin" sin permisos diferenciados (confirmado explícitamente en Gobierno, ver más abajo). `/pos` es la entrada paralela para operadores de comercio/mundo (PIN, no email/password).

---

## Mapeo contra la lista canónica de capacidades

Fuente de verdad: `MODULE_CATALOG` (`store.js:24-457`) y `MODULOS_PROXIMAMENTE` (`supabase.js:182-186`, re-exportado en `store.js:976`):

```js
MODULOS_PROXIMAMENTE = new Set([
  "facturacion", "reservas", "loyalty", "credito", "subsidio",
  "estacionamiento", "asistencia", "cashback", "turnos", "transporte",
  "promociones",
]);
```

| Capacidad canónica (negocio) | id en código | ¿Activa o Próximamente? |
|---|---|---|
| Wallet | `wallet` | **Activa** (CORE) |
| Comercio | `comercios` | **Activa** (CORE) |
| Compras y transacciones | `consumos` | **Activa** (CORE) |
| Promociones | `promociones` | **Próximamente** — el tab "Promociones" con CRUD real (tabla `promociones`) solo aparece si `m.type === "promos"`/`"promos_rp"`, y ese tipo de mundo (`mundo-promos-rp`) fue purgado activamente del seed (`store.js:632-638`) — código funcional pero inalcanzable en la práctica |
| Perfil extendido | `perfil_ext` | **Activa** (PREMIUM) |
| Menú | `menu` | **Activa** (OPCIONAL) |
| Inventario | `inventario` | **Activa** (CORE) |
| Acceso | `accesos` | **Activa** (PREMIUM) |
| Motor de evento (crear eventos, crear entradas) | `eventos` | **Activa** (OPCIONAL) — todos los flags de `eventos:*` están `ready` en `FLAG_DEV_MAP` |
| Precompra | *(no es módulo propio)* | Sub-feature: `eventos.preventa` ("Preventa / Pre-orden", ready) + `menu.preorden` (ready) |
| Crédito | `credito` | **Próximamente** |
| BNPL | `bnpl` | **Activa** (OPCIONAL) — la más desarrollada de las "opcionales": 4 microservicios, `FLAG_DEV_MAP` ready |
| Turnos | `turnos` | **Próximamente** |
| Loyalty | `loyalty` | **Próximamente** ("Puntos Loyalty") |
| Reserva | `reservas` | **Próximamente** |
| Facturación | `facturacion` | **Próximamente** |
| Cashback | `cashback` | **Próximamente** |
| Restricciones | `control` | **Activa** (OPCIONAL) — control parental real (`dependents`) |
| Subsidio | `subsidio` | **Próximamente** |
| Transporte | `transporte` | **Próximamente** |
| Estacionamiento | `estacionamiento` | **Próximamente** |
| Suscripciones | *(no es módulo propio)* | Sub-feature de Wallet: config `perfilesSuscripcion` + CRUD real contra `subscription_plans` (`PlanesSuscripcionPanel`, `MundoDetail.jsx:1196-1300`) — **activa** |

Nota: el catálogo de código tiene además **"Asistencia"** (`asistencia`), que no está en la lista canónica del negocio — está en `MODULOS_PROXIMAMENTE`, bloqueada a la vertical Educación (`lock: "Educación"`), y su propia descripción dice literalmente "Aún no construido en la app — sin parámetros configurables todavía" (`store.js:318-324`).

Un módulo "Próximamente" nunca llega a Supabase: `syncAllWorlds` lo salta explícitamente (`supabase.js:216-218`), y el wizard de creación de mundo / `Catalogo.jsx` / `MundoDetail.jsx` / `ModulosMundo.jsx` deshabilitan su toggle (Mundos.jsx y ModulosMundo.jsx lo chequean explícitamente — hubo un bug real el 29-jul donde `ModulosMundo.jsx` no lo chequeaba y el toggle parecía funcionar sin persistir nada, `ModulosMundo.jsx:43-52`).

---

# Rutas

### Dashboard — `/admin`
- **Propósito**: portada del panel — de un vistazo, cuántos mundos/módulos/comercios hay activos, cuánta comisión se acumuló, y qué está pendiente (liquidaciones, tickets).
- **Capacidades involucradas**: ninguna en particular; agrega datos de todas.
- **Flujo de usuario**:
  1. El admin entra tras el login y aterriza aquí.
  2. Ve 6 tarjetas KPI (mundos activos, módulos contratados, comercios, comisión acumulada, liq. pendientes, tickets abiertos); cada una es clicable y navega a la sección relacionada.
  3. Abajo ve dos listas: "Mundos del ecosistema" (click → ficha del mundo) y, a la derecha, "Liquidaciones recientes" / "Tickets recientes" (últimos 4 y 3, con botón "Ver todos"/"Gestionar").
- **Experiencia / UX notas**: sin loading state explícito (los datos ya viven en el store local reactivo); estado vacío para liquidaciones con ícono + CTA "Ve a Liquidación y ejecuta el corte" (`PagesCore.jsx:92-96`); el color de "Comisión" y "Tickets abiertos" cambia a rojo/error si hay pendientes (`PagesCore.jsx:29-31`).
- **Modelo de datos**: 100% derivado del store local (`st.mundos`, `st.comercios`, `st.liquidaciones`, `st.tickets`), que a su vez se llena en `App.jsx:48` con `refreshMundosLive()` (tablas `worlds`, `world_capacity_configs`, `world_feature_flags`), `reconciliarLiquidacionesRemoto()` (`liquidaciones`), `reconciliarComerciosGlobal()` (`merchants`) y `reconciliarTicketsRemoto()` (`support_tickets`). No hay fetch propio en este componente.
- **Componentes clave / archivo:línea**: `AdminDashboard` — `PagesCore.jsx:7-140`.
- **Estado**: Construido completo.

---

### Mundos — `/admin/mundos`
- **Propósito**: catálogo de todas las "comunidades" (mundos) del ecosistema y punto de entrada para dar de alta una nueva, con su acuerdo comercial y sus capacidades.
- **Capacidades involucradas**: todas (aquí se eligen las capacidades iniciales al crear un mundo).
- **Flujo de usuario**:
  1. El admin filtra/busca por vertical, estado, tipo de acuerdo o texto libre.
  2. Cada card de mundo muestra logo/color, código, vertical+moneda, resumen del Motor de Eventos o del acuerdo, y contadores de módulos/comercios; botones "Ver frente" (abre el dashboard público del mundo en pestaña nueva) y "Configurar" (va a la ficha).
  3. "Crear Mundo" abre un wizard de **6-7 pasos**: (1) Contexto (vertical, giro, nombre, país, logo, color, descripción), (2) Entidad legal y bancaria (razón social, RUC, moneda, banco/CCI, grupo opcional con "comparte saldo"), (3) Representante y contacto (apoderado que firma vs. persona de contacto que recibe el primer acceso, con adjuntos PDF de contrato y ficha RUC), (4) Servicios a contratar (5 servicios "iniciales" resaltados: Wallet/Comercios/Consumos siempre on, Reservas/Promociones bloqueados por estar Próximamente; catálogo completo colapsable con todos los módulos), (5) Estrategia de Eventos (solo si activó Motor de Eventos — B2B es automático, Embebido es opcional), (6) Acuerdo comercial (transaccional/revenue/mixto/fijo + vigencia + frecuencia de liquidación), (7) Resumen y confirmación con checkbox obligatorio antes de "Habilitar Mundo".
  4. Al habilitar, navega directo a la ficha del mundo recién creado.
- **Experiencia / UX notas**: guarda explícito contra doble-click en "Habilitar Mundo" (`creando` state) porque dos clics rápidos llegaron a crear un mundo duplicado en producción, `Mundos.jsx:221-228`; subida de logo valida tipo imagen y tamaño ≤5 MB con mensaje de error concreto, `Mundos.jsx:322-324`; subida de contrato/ficha RUC exige PDF y ≤15 MB, `Mundos.jsx:458-459, 475-480`; estado vacío con ícono + CTA cuando el filtro no matchea nada, `Mundos.jsx:75-81`; en el paso de Servicios, los módulos "Próximamente" se muestran con opacidad reducida, checkbox bloqueado y badge "próximamente" — no se puede seleccionar ninguno para un mundo nuevo, `Mundos.jsx:611-658`.
- **Modelo de datos**: escribe en `worlds` (vía `syncAllWorlds`/`update()`), lee `grupos` (`fetchGruposRemote`) para el selector de grupo; los archivos (logo, contrato, ficha RUC) se suben a Supabase Storage bucket `joi360-media` (`uploadArchivo`). `grupoId` en el mundo es un **soft-link** a `grupos.id` (no hay FK enforced visible en el código admin, solo una verificación de bloqueo antes de borrar un grupo).
- **Componentes clave / archivo:línea**: `Mundos` — `Mundos.jsx:25-150`; `MundoWizard` — `Mundos.jsx:160-312`; pasos `Step1Contexto`…`Step7Resumen` — `Mundos.jsx:314-972`.
- **Estado**: Construido completo.

---

### Grupos y Sucursales — `/admin/grupos`
- **Propósito**: agrupar varias "sucursales" (mundos) de un mismo cliente (ej. Jockey Plaza + Boulevard de Asia) bajo una identidad financiera común (Emisor/Adquirente/tipo de wallet), aunque cada sucursal se vea como comunidad independiente en la app.
- **Capacidades involucradas**: Wallet (define si es wallet regular o gift card / prepago para todas las sucursales del grupo).
- **Flujo de usuario**:
  1. El admin ve tarjetas por grupo: logo, nombre, cantidad de sucursales, tipo de wallet, Emisor/Adquirente, y chips de cada sucursal ligada (con ícono de billetera si comparte saldo).
  2. "Nuevo grupo" abre un drawer: nombre, logo, Emisor (texto libre), Adquirente (RedPontis vs. Cuenta propia del cliente — si es cuenta propia, pide banco/titular/cuenta/CCI), y tipo de wallet (regular vs. gift card).
  3. Las sucursales mismas **no se crean acá** — se crean desde el wizard de Mundos, eligiendo el grupo en el paso 2.
  4. "Eliminar" un grupo primero corre `verificarBloqueoEliminarGrupo`; si tiene sucursales ligadas, muestra un modal de bloqueo con la lista de sucursales y la instrucción de desvincularlas primero; si no tiene, pide confirmación simple.
- **Experiencia / UX notas**: al subir el logo, lo oculta momentáneamente (`setF(prev => ({...prev, logoUrl: null}))`) para no mostrar el logo viejo mientras sube el nuevo, `Grupos.jsx:57`; texto contextual que cambia según el adquirente elegido explicando quién ejecuta las transferencias, `Grupos.jsx:203-207`; dos modales de confirmación distintos (bloqueado vs. eliminación libre), `Grupos.jsx:237-263`.
- **Modelo de datos**: tabla `grupos` (columnas: `nombre`, `logo_url`, `emisor`, `adquirente`, `adquirente_banco/cuenta/cci/titular`, `tipo_wallet`). `worlds.grupo_id` es el soft-link inverso — se lee con `fetchGruposRemote`/`worlds?grupo_id=eq.` pero no hay FK declarada en el código cliente.
- **Componentes clave / archivo:línea**: `Grupos` — `Grupos.jsx:25-267`.
- **Estado**: Construido completo.

---

### Ficha de Mundo (MundoDetail) — `/admin/mundos/:id`
- **Propósito**: pantalla central de configuración de un mundo específico — perfil visual, capacidades contratadas y su config, actores (comercios/organizadores), acuerdo comercial y, si aplica, Motor de Eventos/Promociones. Es el hub desde donde se entrega el panel al sponsor.
- **Capacidades involucradas**: todas — es donde cada una se activa/configura por mundo.
- **Flujo de usuario (general)**:
  1. El admin llega desde "Configurar" en Mundos, o desde cualquier link profundo (Dashboard, Gobierno, etc.).
  2. Header: logo/nombre, pill de estado (ACTIVO/INACTIVO), pill de status calculado (`worldStatus`: BORRADOR → CONFIGURANDO → LISTO → ENTREGADO), control de contrato PDF, botón "Vista previa Dashboard" (abre el frente público en pestaña nueva) y botón "Entrega de panel".
  3. Navega entre tabs: Resumen, Perfil, Capacidades, Actores, Acuerdo Comercial, y condicionalmente Motor de Eventos (si el mundo tiene la capacidad `eventos` activa o es de tipo eventos) y Promociones (solo si `type` es `promos`/`promos_rp`, hoy inalcanzable).
  4. "Entrega de panel" abre un hub con 4 tarjetas: Panel de Mundo (sponsor), Panel de Merchant (salta a Actores), Panel de Organizador (solo si B2B activo), y clave PIN de Operador de Mundo (portero/banditas, sin cobrar saldo) — cada una lleva a su propio flujo de entrega.
  5. "Eliminar mundo" (si no es fijo) corre un checklist de bloqueos antes de permitir escribir el nombre y confirmar.
- **Experiencia / UX notas**: `DeleteMundoDialog` verifica 6 señales reales antes de habilitar el borrado — saldo en billeteras de usuarios, BNPL activos, liquidaciones pendientes/retenidas, reservas de Menú a futuro, entradas de evento emitidas (todos bloquean) y hardware asignado (solo aviso, no bloquea) — y exige tipear el nombre exacto del mundo, `MundoDetail.jsx:322-410`; `EntregaDrawer` genera usuario/password automáticos (`generarPassword`), permite copiar el "mensaje de entrega" completo (para email/WhatsApp) y un link `mailto:` prellenado, con checkbox de confirmación obligatorio, `MundoDetail.jsx:413-593`; el reconciliador de comercios al montar corrige un bug real de duplicados (Adidas/Aruma aparecían 2 veces) filtrando contra el estado vivo dentro del updater, no contra el snapshot al montar, `MundoDetail.jsx:32-53`.
- **Modelo de datos**: `worlds` (fila del mundo), `world_capacity_configs`/`world_feature_flags`/`world_channel_configs`/`world_acquiring_channel_configs` (config por capacidad), `merchants` (Actores), `bnpl_contratos`/`liquidaciones`/`menu_reservas`/`event_tickets`/`pos_devices`/`wallets` (chequeos de bloqueo de borrado, vía RPCs de verificación).
- **Componentes clave / archivo:línea**: `MundoDetail` — `MundoDetail.jsx:14-137`; `EntregaHubDrawer` — `:237-267`; `ContratoControl` — `:272-320`; `DeleteMundoDialog` — `:322-410`; `EntregaDrawer` — `:413-593`.
- **Estado**: Construido completo.

#### Sub-tab: Resumen
- **Propósito**: vista ejecutiva del mundo — ficha de datos, capacidades activas, checklist de qué falta para "activar" el mundo de verdad, y tickets abiertos.
- **Flujo de usuario**: el admin ve la ficha (nombre, código, vertical, país, entidad legal, RUC, moneda, estado, fecha de creación, acuerdo), 4 stats clicables (capacidades activas, actores cargados, con pricing, tickets abiertos — cada una navega a otro tab), un checklist de 5 ítems con barra de progreso (capacidades habilitadas, capacidades configuradas, actores cargados, acuerdo definido, dashboard entregado), y alerta si alguna capacidad activa tiene dependencias sin cumplir.
- **UX notas**: cada ítem del checklist sin completar tiene un botón "IR →" que salta al tab correspondiente, `MundoDetail.jsx:786-788`.
- **Componentes / archivo:línea**: `TabResumen` — `MundoDetail.jsx:652-814`; `worldStatus` — `:819-826`.
- **Estado**: Construido completo.

#### Sub-tab: Perfil
- **Propósito**: subir/cambiar el logo que identifica al mundo en el card de comunidad de la Super App.
- **Flujo de usuario**: el admin arrastra o selecciona una imagen; se sube a Storage y se guarda en `worlds.logo_url`.
- **UX notas**: valida que sea archivo de imagen, `MundoDetail.jsx:605`.
- **Modelo de datos**: `actualizarLogoMundoRemote` → `worlds.logo_url`.
- **Componentes / archivo:línea**: `PerfilMundoPanel` — `MundoDetail.jsx:600-649`.
- **Estado**: Construido completo.

#### Sub-tab: Capacidades (Módulos)
- **Propósito**: activar/desactivar capacidades del mundo y configurar cada una (parámetros, microservicios, canales de emisión/adquirencia, pricing, feature flags, y una vista previa de cómo se ve en la app).
- **Flujo de usuario**:
  1. Ve tarjetas por tier (CORE/PREMIUM/OPCIONAL) con toggle ON/OFF y botón "Configurar".
  2. Al activar una capacidad con dependencias no cumplidas, un toast avisa cuáles faltan (no bloquea la activación, solo informa), `MundoDetail.jsx:866-876`.
  3. "Agregar del catálogo global" lista las capacidades aún no añadidas al mundo; las "Próximamente" aparecen deshabilitadas con tooltip explicando por qué.
  4. "Configurar" abre un drawer con hasta 6 tabs: Parámetros, Microservicios (solo si el catálogo los define, hoy Wallet y BNPL), Canales (solo Wallet/Comercios), Pricing, Feature Flags, Vista App.
  5. En Feature Flags, cada servicio tiene su estado de desarrollo (`ready`/`in_progress`/`planned`) — solo los `ready` se pueden togglear; los demás aparecen bloqueados con candado y explicación.
  6. Si el módulo es `wallet` y tiene `perfilesSuscripcion` activo, aparece el panel de Planes de Suscripción (alta/edición/activo-inactivo/eliminar) directamente dentro de Parámetros.
  7. Al activar `eventos` por primera vez en un mundo existente, salta un popup obligatorio para elegir el modelo (B2B vs. B2C+Embebido).
- **UX notas**: solo Wallet y Comercios tienen tab de "Canales" — una auditoría (comentario en código) retiró ese tab de las otras 15 capacidades porque repetían los mismos toggles globales sin usarlos de verdad, `MundoDetail.jsx:1179-1187`; al guardar sin tocar canales, se hace un "backfill" con los defaults visuales para que no se pierdan silenciosamente, `MundoDetail.jsx:1318-1331`; feature flags bloqueados muestran quién los desarrolla (EcoreGateway vs. desarrollo propio), `MundoDetail.jsx:1564`.
- **Modelo de datos**: `world_capacity_configs` (enabled + config JSON por `world_id`+`capacity_id`), `world_feature_flags` (flag on/off por mundo, referenciando `capacity_feature_flags`), `world_channel_configs`/`world_acquiring_channel_configs` (canales), `subscription_plans` (planes de Wallet).
- **Componentes / archivo:línea**: `TabModulos` — `MundoDetail.jsx:853-1025`; `ModuleConfigDrawer` — `:1302-1729`; `CanalEmisionRow` — `:1731-1798`; `MicroservicioCard` — `:1798-1907`; `ConfigFieldInput` — `:1907-2062`; `PlanesSuscripcionPanel` — `:1196-1300`.
- **Estado**: Construido completo.

#### Sub-tab: Actores (Comercios / Organizadores / Sponsors)
- **Propósito**: gestionar los "actores" del mundo — comercios (merchants) con su tarifa y datos legales, organizadores de eventos B2B, y sponsors publicitarios.
- **Capacidades involucradas**: Comercio, Motor de Evento (para Organizadores).
- **Flujo de usuario**:
  1. **Merchants** (siempre disponible): tabla con nombre, código (asignado por Supabase, público e inmutable desde el admin), rubro, tarifa MDR+fijo, hardware asignado (real, cruzado contra `pos_devices`), volumen real de transacciones, estado, y acciones "Editar"/"Eliminar"/"Entregar panel". "Nuevo Merchant" abre un formulario largo: comerciales (nombre, rubro filtrado por vertical del mundo, tarifa, fijo, POS solicitados) + datos legales (razón social, RUC, dirección) + apoderado + contacto comercial + datos bancarios.
  2. Eliminar un comercio es un flujo guiado de 3 pasos: (1) deshabilitar (deja de admitir compras de inmediato), (2) verificar pendientes reales (BNPL activo, ventas del corte aún no liquidadas, reservas de Menú a futuro, catálogo de productos/menú no vacío — todos bloquean; hardware asignado solo avisa), (3) confirmar escribiendo el nombre del comercio.
  3. **Organizadores** (solo si el mundo está en modo B2B): tabla con nombre/entidad legal/RUC, estado activo/inactivo, botones Editar/Desactivar/Reactivar. "Nuevo organizador" genera usuario+password automáticos y muestra las credenciales una sola vez para copiar.
  4. **Sponsors**: pantalla placeholder, sin funcionalidad real.
- **UX notas**: cuando el mundo no está en modo B2B, el tab Organizadores muestra un estado explicativo ("Activa el criterio B2B en la pestaña Eventos") en vez de una lista vacía sin contexto, `MundoDetail.jsx:2549-2561`; el alta de comercio guarda local primero (feedback inmediato) y publica remoto después, con toast de error específico si el remoto falla mientras lo local sí quedó guardado, `MundoDetail.jsx:2143-2153`.
- **Modelo de datos**: `merchants` (alta/edición/baja vía `addMerchantRemote`/`actualizarMerchantRemote`/`eliminarMerchantRemote`), `pos_devices` (hardware asignado, solo lectura acá), `transactions` (volumen real, solo lectura), tabla de organizadores propia (vía `crearOrganizadorRemote`/`fetchOrganizadoresRemote`, nombre de tabla no confirmado en este archivo pero expuesto por esas funciones de `supabase.js`).
- **Componentes / archivo:línea**: `TabComercios` — `MundoDetail.jsx:2062-2091`; `ActoresMerchants` — `:2095-2307`; `EliminarComercioDialog` — `:2329-2445`; `ActoresOrganizadores` — `:2472-2632`; `ActoresSponsors` — `:2634-2649`.
- **Estado**: Construido parcial — Merchants y Organizadores completos; **Sponsors es solo UI, sin backend** (placeholder explícito "Disponible en R1").

#### Sub-tab: Acuerdo Comercial
- **Propósito**: mostrar el modelo comercial ya pactado (de solo lectura, salvo contacto a Plataforma) y configurar las tarifas por defecto a merchants, modelo de recaudación, frecuencia de liquidación y retención confidencial de RedPontis.
- **Flujo de usuario**: el admin ve el acuerdo grabado en la creación del mundo (tipo, revenue share/fijo, setup, vigencia, frecuencia — no editable acá "para evitar desalinear liquidaciones ya generadas"), gestiona el contrato PDF, y si el mundo tiene la capacidad Comercios activa, define MDR/fijo por defecto, modelo de recaudación (RedPontis vs. El Mundo), frecuencia de liquidación, % de retención (bloque ámbar "confidencial", nunca visible para el sponsor) y vigencia de la tarifa.
- **UX notas**: el bloque de retención está explícitamente marcado como oculto al Admin del Mundo — "solo visible y editable desde Plataforma", `MundoDetail.jsx:2811-2817`; botón "Guardar tarifas" solo se habilita si hubo cambio real (`dirty`), `MundoDetail.jsx:2836-2840`.
- **Modelo de datos**: todo se guarda dentro de `world_capacity_configs.config` del módulo `comercios` (no en un campo separado del mundo) — comentario explícito en el código de que antes se guardaba en un campo que ningún sync leía y se perdía silenciosamente, `MundoDetail.jsx:2685-2690`.
- **Componentes / archivo:línea**: `TabAcuerdo` — `MundoDetail.jsx:2669-2845`.
- **Estado**: Construido completo.

#### Sub-tab: Motor de Eventos
- **Propósito**: elegir el modelo de creación de eventos del mundo (B2B vs. B2C, con Embebido opcional) y su comisión.
- **Capacidades involucradas**: Motor de evento.
- **Flujo de usuario**: el admin elige B2B (mundo organizador, panel dedicado, excluyente con B2C/Embebido) o B2C (el usuario final crea eventos; puede sumar Embebido para que el propio mundo también publique, con comisión de RedPontis obligatoria a definir); la aprobación final de cualquier evento siempre pasa por Gobierno → Aprobaciones.
- **UX notas**: cambiar a B2B apaga Embebido en el mismo gesto para no dejar estados imposibles, `MundoDetail.jsx:1053-1057`.
- **Modelo de datos**: `m.eventosConfig` (local) se propaga al `config` del módulo `eventos` en `world_capacity_configs` al sincronizar.
- **Componentes / archivo:línea**: `TabEventos` — `MundoDetail.jsx:2853-2887`; `SelectorModoEventos` — `:1040-1150`.
- **Estado**: Construido completo.

#### Sub-tab: Promociones
- **Propósito**: cupones QR con vigencia, canjeables en el POS del comercio.
- **Capacidades involucradas**: Promociones (capacidad marcada Próximamente en el catálogo general).
- **Flujo de usuario**: crear/editar/pausar/eliminar promociones con título, sponsor opcional, tipo (Descuento %/Cashback/Cupón/2x1), valor, vigencia y cupos; genera un código QR único.
- **UX notas**: no permite eliminar una promo con canjes ya registrados, solo pausarla, `MundoDetail.jsx:2952-2956`.
- **Modelo de datos**: `promociones` (CRUD real) + `promociones_canjes` (historial de canjes).
- **Componentes / archivo:línea**: `TabPromos` — `MundoDetail.jsx:2899-3017`.
- **Estado**: Construido completo **pero inalcanzable** — el tab solo se renderiza si `m.type` es `"promos"`/`"promos_rp"` (`MundoDetail.jsx:71`), y el único mundo que tenía ese tipo (`mundo-promos-rp`, "JOI Promos") fue retirado del alcance y su fila se purga activamente en cada `load()` (`store.js:632-638`). Backend real, ruta muerta en la práctica.

---

### Gobierno / Aprobaciones — `/admin/gobierno`
- **Propósito**: cola central de aprobaciones cross-mundo (eventos y altas de comercio) que cualquier mundo/organizador propone, reportes agregados del Motor de Eventos, y gestión de administradores de plataforma.
- **Capacidades involucradas**: Motor de evento, Comercio.
- **Flujo de usuario**:
  1. Tab **Aprobaciones** (default): filtra por Todos/Eventos/Comercios; cada solicitud pendiente (evento o alta de comercio) muestra un resumen y botones "Rechazar" (abre modal que exige un motivo obligatorio, se guarda y se envía como alerta real al mundo) / "Aprobar y publicar" o "Aprobar y habilitar". "Ver detalles" en un evento abre un modal con descripción completa, banner, mapa, tipos de entrada y comercios afiliados. Debajo, un historial de "Resueltos recientes" (últimos 15, aprobados+rechazados) con ícono de ojo para ver el motivo de un rechazo.
  2. Tab **Reportes**: KPIs cross-mundo de eventos (totales, entradas vendidas, recaudación, comisión RedPontis), desglose por estado y por mundo, con nota honesta de que los consumos dentro de eventos no se pueden atribuir (falta `event_id` en `transactions`).
  3. Tab **Auditoría**: placeholder — explícitamente dice que no existe infraestructura de audit-log en el proyecto, con link a Monitoreo de Errores como alternativa real disponible.
  4. Tab **Usuarios**: lista de "Administradores de plataforma" (`admin_users`), crear nuevo admin (email+nombre+password) y cambiar contraseña de uno existente; nota explícita de que todo admin creado tiene acceso total ("Platform Admin") — roles limitados llegan "en R1".
- **Experiencia / UX notas**: el motivo de rechazo es obligatorio (botón deshabilitado si está vacío), `Gobierno.jsx:353-361`; comentario explícito de que antes esta pantalla era 100% decorativa (arrays hardcodeados, botones sin `onClick`) y ahora es real, `Gobierno.jsx:1-15`.
- **Modelo de datos**: `events` (estado `PENDIENTE_APROBACION`/`PUBLICADO`/`RECHAZADO`), `merchant_requests` (solicitudes de alta de comercio), `event_ticket_types`/`event_merchants` (detalle del modal), `world_alerts` (notificación al mundo tras rechazo), `admin_users` (gestión de admins, nunca expone `password_hash`).
- **Componentes clave / archivo:línea**: `Gobierno` — `Gobierno.jsx:22-487`; `DetalleEventoPendienteModal` — `:499-592`; `ReportesEventosRP` — `:594-672`.
- **Estado**: Construido parcial — Aprobaciones y Reportes completos y reales; Usuarios completo pero sin roles diferenciados; **Auditoría es solo un placeholder honesto, sin backend**.

---

### Usuarios — `/admin/usuarios`
- **Propósito**: ver a las personas registradas en cada mundo (titulares y dependientes), su saldo y su bandita NFC — con PII enmascarada por diseño.
- **Capacidades involucradas**: Wallet, Restricciones (perfiles controlados/dependientes).
- **Flujo de usuario**:
  1. El admin elige un mundo (selector) y opcionalmente busca por nombre/correo/documento.
  2. La tabla agrupa: fila del titular (o "sin_perfil") con sus dependientes indentados debajo (jerarquía visual real, no filas planas), con nomenclatura adaptada al rubro (Tutor/Alumno en Educación, Cuenta principal/dependiente en el resto).
  3. Click en el ícono de ojo lleva al detalle de esa persona.
- **Experiencia / UX notas**: el documento y el correo **llegan ya enmascarados desde la base** — el panel no tiene acceso al valor completo, ni siquiera técnicamente, `Usuarios.jsx:19-27`; estados de carga y error distintos y explícitos (`Vacio` con ícono contextual), `Usuarios.jsx:249-257`.
- **Modelo de datos**: `fetchUsuariosDeMundo` (probablemente sobre `wallets`+`dependents`+`usuarios_perfil` enmascarados server-side), `nfc_bands` para el estado de la bandita.
- **Componentes clave / archivo:línea**: `Usuarios` — `Usuarios.jsx:28-172`; `FilaUsuario` — `:183-235`.
- **Estado**: Construido completo.

### Detalle de Usuario — `/admin/usuarios/persona/:userId`
- **Propósito**: vista de página completa de una persona — datos enmascarados, mundos donde tiene billetera, historial de movimientos, y la única acción de soporte permitida sin tocar PII: desvincular su bandita NFC.
- **Flujo de usuario**: el admin llega desde la tabla de Usuarios (o por URL directa con `?mundo=`); ve documento/correo enmascarados, bandita vinculada con botón "Desvincular" (con confirmación nativa del navegador), KPIs de consumido/recargado/saldo total, lista de mundos con saldo, e historial de movimientos con signo +/− y color.
- **UX notas**: nota explícita y visible de que "para verlos [los datos completos] en un caso de soporte hace falta acceso con llave de servicio, que queda auditado", `Usuarios.jsx:364-371`; la desvinculación de bandita es la única mutación de esta pantalla, con `window.confirm` antes de ejecutar, `Usuarios.jsx:300-311`.
- **Modelo de datos**: `fetchUsuarioResumen`, `fetchDetalleUsuario`, `liberarNfcBandRemote` → `nfc_bands`.
- **Componentes clave / archivo:línea**: `UsuarioDetallePage` — `Usuarios.jsx:264-430`.
- **Estado**: Construido completo.

---

### Liquidación — `/admin/liquidacion`
- **Propósito**: motor de corte y pago a los mundos — genera lotes de liquidación con volumen real de transacciones, y el admin los marca como procesados adjuntando el voucher de depósito.
- **Capacidades involucradas**: Comercio (modelo de recaudación/tarifa), Compras y transacciones (volumen real).
- **Flujo de usuario**:
  1. El admin ve KPIs del día (lotes, volumen, comisión, pendientes) y 3 tabs: Hoy, Pendientes, Historial.
  2. "Forzar corte ahora" corre el corte para todos los mundos cuya frecuencia corresponde hoy (diaria siempre, semanal lunes, quincenal días 1/16, mensual día 1).
  3. Cada fila de lote muestra mundo, tipo de acuerdo con el desglose del cálculo, volumen, comisión RP, neto (con descuento por hardware si aplica), estado y acción "Procesar" (solo si el neto ≥ 0).
  4. "Procesar" abre un modal de 2 pasos: (1) adjuntar voucher/comprobante + observación libre, (2) pantalla de confirmación explícita resumiendo el monto antes de registrar como irreversible.
- **Experiencia / UX notas**: un lote con neto negativo **nunca** se puede marcar como procesado — el store lanza error si se intenta, `store.js:1771-1773`; un lote bajo el monto mínimo o con neto negativo queda `RETENIDO` automáticamente en vez de `PENDIENTE`; la modal de confirmación resume explícitamente si hay voucher/observación antes de dejar confirmar, `Liquidacion.jsx:214-227`.
- **Modelo de datos**: tabla `liquidaciones` (columnas: `world_id`, `fecha`, `entidad_legal`, `volumen`, `tx_count`, `tipo_acuerdo`, `rev_share`, `comision`, `neto`, `descuento_hardware`, `estado`, `voucher_url`, `observacion`, `periodo_desde/hasta`), calculada sobre `transactions` reales del período (`fetchVolumenPeriodoMundo`) y sobre `nfc_asignaciones` pendientes de descuento por hardware.
- **Componentes clave / archivo:línea**: `Liquidacion` — `Liquidacion.jsx:7-145`; `ProcesarLiquidacionModal` — `:147-233`; lógica de corte real en `store.js:1643-1784` (`procesarLiquidacionMundo`, `generarLiquidaciones`, `marcarLiquidacion`).
- **Estado**: Construido completo.

---

### Calculadora Comercial — `/admin/calculadora`
- **Propósito**: "documento de negociación" unificado — cruza en una sola vista los términos comerciales reales de Comercios + BNPL + Eventos para un mundo (y opcionalmente un merchant específico), con un simulador de liquidación a monto libre.
- **Capacidades involucradas**: Comercio, BNPL, Motor de evento.
- **Flujo de usuario**:
  1. El admin elige mundo → (opcional) merchant específico, para ver sus overrides de MDR/fijo si los tiene.
  2. Ve los términos aplicados: Comercios (MDR, fijo, modelo de recaudación, frecuencia, retención, vigencia), BNPL (revenue share, comisión, cuotas activas, gestión de mora — si el mundo lo tiene activo y el merchant tiene programa), Eventos (comisión por entrada — si aplica).
  3. En el panel lateral, ingresa un monto de venta a simular y ve el desglose completo (MDR, fijo, liquidado bruto, retención, neto al sponsor) en tiempo real.
  4. "Copiar documento de negociación" arma un texto plano con todo el resumen y lo copia al portapapeles.
- **UX notas**: reemplazó un simulador viejo que vivía enterrado en Acuerdo Comercial y solo veía un monto fijo de 100 sin cruzar con BNPL/Eventos — comentario explícito de por qué se separó, `Calculadora.jsx:1-10`.
- **Modelo de datos**: solo lectura — `merchants` (`fetchMerchantsRemote`), `bnpl_programa_comercio` (`fetchProgramaBNPL`), y `mundo.eventosConfig` local.
- **Componentes clave / archivo:línea**: `Calculadora` — `Calculadora.jsx:16-210`.
- **Estado**: Construido completo.

---

### Adquirencia — `/admin/adquirencia`
- **Propósito**: catálogo global de canales de cobro (POS físico, QR, gateway online, Tap2Phone) con sus redes de pago habilitadas, tasas base y política de liquidación; también el catálogo de hardware físico disponible.
- **Capacidades involucradas**: Comercio (adquirencia).
- **Flujo de usuario**:
  1. El admin ve KPIs (terminales POS activas, canales habilitados, redes activas) y una grilla de canales con toggle activar/desactivar y botón "Configurar" (abre drawer con política de liquidación, MDR/fijo, y checklist de redes de pago por categoría).
  2. "Nuevo canal" crea uno desde cero con los mismos campos.
  3. Botón "Ver hardware" cambia a una grilla de solo-lectura del catálogo de dispositivos (marca/modelo/tipo/precio).
- **UX notas**: la config de aquí es el "techo global" — un mundo puede restringirla, nunca superarla (mensaje explícito en el drawer), `Adquirencia.jsx:212-213`; cada guardado empuja el catálogo a Supabase (antes solo vivía en `localStorage` de quien lo editaba), `Adquirencia.jsx:7-18`.
- **Modelo de datos**: tabla `acquiring_channels` (sincronizada vía `syncAcquiringChannels`/`pruneStaleAcquiringChannels`); el catálogo de hardware (`HARDWARE_CATALOG`) es una constante en código, no una tabla — **soft-link conceptual** con `hardware_modelos_custom` (gestionado en HardwarePOS) que sí es tabla real.
- **Componentes clave / archivo:línea**: `Adquirencia` — `Adquirencia.jsx:38-180`; `ChannelDrawer` — `:183-263`; `NuevoCanalDrawer` — `:266-327`.
- **Estado**: Construido completo.

---

### Emisión — `/admin/emision`
- **Propósito**: catálogo global de canales de recarga de saldo (billetera digital/QR, pasarela de pago, transferencia) y su PSP asociado, con estado de integración real (activo en producción vs. pendiente de convenio).
- **Capacidades involucradas**: Wallet (emisión).
- **Flujo de usuario**: el admin ve dos tabs — "Canales de recarga" (agrupados por categoría, con monto mín/máx, comisión PSP, quién la absorbe, tiempo de acreditación, horario, toggle global on/off, y botón Editar) y "PSP / Proveedores" (lista de proveedores con estado de integración y endpoint).
- **UX notas**: tooltip explicando la jerarquía de 3 niveles (catálogo global define el techo → mundo restringe → app renderiza), `Emision.jsx:86-93`; solo hay 2 PSP reales en el alcance actual (Ligo/QR genérico y Culqi), ambos marcados `api_ready:false` porque ninguno tiene convenio comercial firmado todavía aunque Culqi ya funcione técnicamente en pruebas (comentario explícito en `store.js`).
- **Modelo de datos**: tabla `emission_channels` (sincronizada vía `syncEmissionChannels`/`pruneStaleEmissionChannels`); `PSP_PROVIDERS` es constante en código (catálogo de 2 proveedores), no una tabla propia.
- **Componentes clave / archivo:línea**: `Emision` — `Emision.jsx:40-253`.
- **Estado**: Construido completo (como catálogo); los PSP en sí están **pendientes de integración real** (`api_ready:false` en ambos).

---

### Hardware / POS — `/admin/hardware-pos`
- **Propósito**: inventario real de dispositivos físicos de RedPontis (terminales POS y pulseras NFC), su asignación a mundos/comercios/eventos, y la demanda que los mundos han solicitado.
- **Capacidades involucradas**: Comercio, Acceso (Wallet — banditas NFC).
- **Flujo de usuario**:
  1. Tab **POS / Tótem**: filtra por modelo/estado, registra unidades individuales (modelo + serial + tipo de ingreso gratis/alquiler/venta) o en carga masiva (CSV/Excel real vía SheetJS), asigna una unidad disponible a mundo+merchant (o evento), edita el serial, gestiona un catálogo de "modelos custom" además de los de fábrica.
  2. Tab **Banditas NFC**: stock real de pulseras por lote — carga masiva con detección automática de columna UID por formato (no por nombre de columna ni posición, porque exports reales traen columnas variables), alta rápida de una sola bandita, asignación de un lote (o selección parcial) a un mundo con modelo gratuita/pagada + forma de cobro (contraentrega/anticipado), marcar pago con comprobante adjunto, historial completo de asignaciones, renombrar/eliminar/revertir un lote.
  3. Tab **Demanda de mundos**: junta requerimientos de equipo y solicitudes de lote de pulseras pendientes de todos los mundos, con acción de aprobar/marcar entregado/rechazar y nota opcional para el mundo.
- **Experiencia / UX notas**: el parser de Excel detecta si es `.xlsx`/`.xls` y usa SheetJS en vez de leer como texto plano — bug real reportado por la usuaria donde un Excel real se leía como basura sin error visible, `HardwarePOS.jsx:13-40`; el UID de la bandita se detecta por **formato hexadecimal real**, probando cada columna, en vez de por nombre de encabezado o posición — evita guardar un número de fila como si fuera el código de la bandita, `HardwarePOS.jsx:962-984`; borrar un lote con banditas ya asignadas se rechaza, ofreciendo "revertir a almacén" como salida en vez de dejar a la usuaria sin ninguna acción, `HardwarePOS.jsx:1175-1203`; una bandita "suelta" sin lote cae a un bucket fijo `"Sueltas"` porque `nfc_bands.lote` es `NOT NULL` en la base, `HardwarePOS.jsx:1025-1029`.
- **Modelo de datos**: `pos_devices` (equipos físicos, con `world_id`/`merchant_id`/`event_id` — **soft-link**, sin FK visible), `nfc_bands` (pulseras, `lote`+`estado`+`world_id`+`linked_user_id`), `nfc_asignaciones` (lotes asignados a un mundo con estado de pago), `nfc_band_requests`/`hardware_requests` (demanda de los mundos), `hardware_modelos_custom` (modelos agregados por RedPontis).
- **Componentes clave / archivo:línea**: `HardwarePOS` — `HardwarePOS.jsx:57-87`; `DemandaMundosTab` — `:100-250`; `PosDevicesTab` — `:264-842`; `BanditasNfcTab` — `:843-1820`.
- **Estado**: Construido completo.

---

### Catálogos Globales — `/admin/catalogos`
- **Propósito**: hub "Capa 1 · Plataforma" — punto de entrada a los 4 catálogos maestros (Capacidades, Medios de Aceptación, Emisión/Recargas, Hardware/POS) con contadores en vivo, más un resumen de stock de POS y estado de integración de PSPs.
- **Capacidades involucradas**: todas indirectamente (es el índice).
- **Flujo de usuario**: el admin ve 4 tiles clicables (cada uno navega a su ruta real: `/admin/catalogo`, `/admin/adquirencia`, `/admin/emision`, `/admin/hardware-pos`), un resumen de stock de POS, tarjetas de estado de cada PSP, y capacidades agrupadas por tier. Botón "Re-sincronizar todo" fuerza un resync manual completo del catálogo global a Supabase (respaldo — desde un fix anterior cada edición del catálogo ya se publica sola al guardar).
- **UX notas**: `InfoTip` explica la jerarquía de 3 capas (catálogo define → mundo activa/configura → app renderiza), `Catalogos.jsx:70-72`; el contador de "Capacidades" excluye explícitamente las módulos Próximamente, `Catalogos.jsx:44`.
- **Modelo de datos**: solo lectura/orquestación — llama `syncCatalogRemote` (tablas `capacities`/`capacity_feature_flags`) al re-sincronizar.
- **Componentes clave / archivo:línea**: `CatalogosGlobales` — `Catalogos.jsx:12-181`.
- **Estado**: Construido completo.

---

### Catálogo de Productos — `/admin/catalogo-productos`
- **Propósito**: catálogo maestro de hardware físico (POS, tótems, banditas) y software (apps, dashboards) con inventario y precios, pensado como fuente única para todos los selects del sistema.
- **Capacidades involucradas**: ninguna directa — es un inventario auxiliar.
- **Flujo de usuario**: el admin filtra por tipo/categoría/búsqueda, ve KPIs de inventario (ítems, unidades disponibles, reservadas, valor de inventario), edita/crea productos en un drawer, y ajusta el stock disponible de un ítem con un pequeño control +/− inline.
- **UX notas**: el ajuste de stock es un mini-formulario inline con check/cruz para confirmar o cancelar, `CatalogoProductos.jsx:165-177`.
- **Modelo de datos**: **100% local** — `st.catalogoProductos`, sembrado desde `CATALOG_SEED` y persistido solo en `localStorage` (`update()`/`store.js`). El archivo **no importa `supabase.js`** — a diferencia de casi todas las demás pantallas, nada de este catálogo se sincroniza a Supabase; cada sesión/navegador del admin ve su propia copia.
- **Componentes clave / archivo:línea**: `CatalogoProductos` — `CatalogoProductos.jsx:34-200`; `ProductoDrawer` — `:202-251`.
- **Estado**: Construido parcial — CRUD completo en UI, **pero sin persistencia compartida real** (no hay tabla Supabase detrás); además, esta ruta **no tiene ningún punto de entrada** en el resto de la app (ni sidebar ni links) — solo por URL directa.

---

### Monitoreo de Errores — `/admin/monitoreo`
- **Propósito**: ver en vivo las ocurrencias reales de errores controlados registrados tanto por el Admin como por la Super App.
- **Capacidades involucradas**: ninguna — transversal.
- **Flujo de usuario**: el admin ve KPIs (ocurrencias últimas 200, severidad error, severidad advertencia, código más frecuente), filtra por severidad y origen (Admin RP / Super App), y una tabla con fecha, código, severidad, contexto, mundo y origen de cada ocurrencia.
- **UX notas**: comentario explícito de que antes `error_log` se escribía pero nadie lo leía nunca (fire-and-forget) — esta pantalla lo cierra, `Monitoreo.jsx:1-4`.
- **Modelo de datos**: `error_log` (ocurrencias reales) cruzado con `error_catalog` (metadatos: título, severidad) vía `fetchErrorLog`/`fetchErrorCatalogMap`. `error_log.world_id` es soft-link contra `st.mundos` (resuelto en cliente, sin JOIN server-side).
- **Componentes clave / archivo:línea**: `Monitoreo` — `Monitoreo.jsx:18-128`.
- **Estado**: Construido completo.

---

### Soporte — `/admin/soporte`
- **Propósito**: centro de tickets — recibe incidencias desde los Dashboards de Mundo (sponsors) y permite crear tickets internos del equipo RedPontis, con integración (mock) a ClickUp.
- **Capacidades involucradas**: ninguna — transversal.
- **Flujo de usuario**: el admin filtra por estado/prioridad, ve KPIs (abiertos, en progreso, resueltos en 24h), cambia el estado de un ticket con un select inline, envía un ticket a ClickUp (genera un ID mock), exporta CSV real de los tickets visibles con el filtro actual, y crea tickets internos vía drawer (tipo, prioridad, asunto, detalle, mundo y módulo opcionales).
- **UX notas**: comentario explícito de que "Exportar CSV" antes no hacía nada (sin `onClick`) — bug real cerrado el 29-jul, `Soporte.jsx:27-28`; la integración ClickUp es explícitamente un mock ("MVP mock — en producción se llamaría al webhook ClickUp"), `store.js:1833-1836`.
- **Modelo de datos**: tabla real `support_tickets` (`crearTicketSoporteRemote`/`actualizarTicketSoporteRemote`/`fetchTicketsSoporteRemote`) — escritura local inmediata + sync remoto, con reemplazo del id local por el id real de Supabase al confirmar (`store.js:1791-1806`).
- **Componentes clave / archivo:línea**: `Soporte` — `Soporte.jsx:9-197`.
- **Estado**: Construido completo (tickets reales); integración ClickUp es **mock explícito, sin backend real**.

---

### Resumen (Reportes y Auditoría) — `/admin/resumen`
- **Propósito**: extractos reales de liquidación exportables a CSV, filtrados por mundo/rango de fechas, más el mismo feed de `error_log` que Monitoreo pero enfocado en auditoría.
- **Capacidades involucradas**: ninguna — transversal.
- **Flujo de usuario**: el admin ve 3 tarjetas KPI (lotes de liquidación, tickets abiertos, alertas críticas/altas), 4 KPIs adicionales de mundos/módulos/liquidados/comisión, exporta liquidaciones a CSV con un click o abre un drawer para generarlo filtrado por mundo y rango de fechas, y ve/filtra la tabla de errores recientes por mundo.
- **UX notas**: comentario extenso y explícito de que esta pantalla era 100% decorativa antes (aritmética inventada, log de actividad hardcodeado con fechas fijas, botones que solo mostraban un toast) y de que "Extracciones programadas" se eliminó por completo porque no existe ninguna infraestructura real de cron/envío — decisión documentada de no inventar ese número, `Resumen.jsx:27-39`.
- **Modelo de datos**: `liquidaciones` (mismo store que Liquidacion.jsx) y `error_log` (`fetchErrorLog`).
- **Componentes clave / archivo:línea**: `Resumen` — `Resumen.jsx:17-201`.
- **Estado**: Construido completo (dentro de su alcance honesto — sin auditoría de acciones de admin, documentado como gap real).

---

### Vista por Módulo (ModulosMundo) — `/admin/modulos-mundo`
- **Propósito**: vista cruzada "qué capacidad está activa en qué mundo", con dos modos: tarjetas por módulo (con lista de mundos activos/inactivos) o matriz módulo×mundo con toggles inline.
- **Capacidades involucradas**: todas.
- **Flujo de usuario**: el admin filtra por tier/categoría/mundo, alterna entre vista Cards y Matriz, y puede activar una capacidad para un mundo directamente desde acá con un toggle (sin entrar a la ficha del mundo) — cada mundo activo tiene un link "cfg →" a su ficha para ajustar parámetros.
- **UX notas**: comentario explícito de un bug real (29-jul) donde esta pantalla no chequeaba `MODULOS_PROXIMAMENTE` — el toggle parecía funcionar (estado local + toast de éxito) pero `syncAllWorlds` descartaba silenciosamente el cambio, engañando al admin; ahora bloquea el toggle con mensaje de error explícito, `ModulosMundo.jsx:42-52`.
- **Modelo de datos**: escribe directo sobre `m.modulos` del store local (mismo mecanismo que `TabModulos` de MundoDetail), sincronizado después vía `syncAllWorlds` a `world_capacity_configs`.
- **Componentes clave / archivo:línea**: `ModulosMundo` — `ModulosMundo.jsx:12-296`; `ViewHeader` — `:299-373`.
- **Estado**: Construido completo. Único punto de entrada: KPI "Módulos contratados" del Dashboard o "Capacidades activas" de Gobierno — no está en el sidebar.

---

### Contrato (borrador) — `/contrato/:id`
- **Propósito**: generar un documento imprimible/PDF de la propuesta de acuerdo comercial de un mundo, a partir de sus datos + módulos + acuerdo ya cargados — un borrador de referencia, no el contrato firmado real.
- **Capacidades involucradas**: ninguna en particular — resume todas las contratadas.
- **Flujo de usuario**: se abre en pestaña nueva desde "Ver borrador" en la ficha del mundo; muestra datos de la entidad, tipo de acuerdo, tabla de módulos contratados con su pricing (o "GRATUITO POR EL MOMENTO"), términos y condiciones estándar, y firmas simuladas; botones "Imprimir / Guardar PDF" (usa `window.print()`) y "Cerrar".
- **UX notas**: pie de página explícito: "DOCUMENTO TENTATIVO — NO TIENE VALIDEZ LEGAL HASTA SER FIRMADO", `Contrato.jsx:138`; el contrato PDF subido manualmente en la ficha del mundo (`ContratoControl`) es la fuente de verdad real cuando existe — este borrador autogenerado queda solo de referencia (comentado explícitamente en `MundoDetail.jsx:269-271`).
- **Modelo de datos**: 100% derivado del store local (`m.acuerdo`, `m.modulos`) — sin escritura, sin fetch propio; no está bajo `/admin/*` (es pública, sin `Shell`/auth gate, pensada para compartir el link a firma externa).
- **Componentes clave / archivo:línea**: `ContratoView` — `Contrato.jsx:6-142`.
- **Estado**: Construido completo.

---

## Rutas adicionales encontradas en App.jsx (no listadas explícitamente, pero bajo `/admin/*`)

### Catálogo de Capacidades — `/admin/catalogo`
- **Propósito**: la "Capa 1" real del catálogo maestro — define feature flags y config fields de cada capacidad (independiente del pricing, que es por mundo), con su estado de desarrollo por flag.
- **Flujo de usuario**: el admin filtra por categoría (Emisión/Adquirencia/Mixto), ve tarjetas por tier con feature flags (chips), cuenta de config fields, y "Editar servicios y configuración" (deshabilitado si el módulo está Próximamente, con tooltip explicando por qué). El drawer de edición tiene 3 tabs: Feature Flags (agregar/quitar, y fijar su `dev_status` ready/en desarrollo/planificado + endpoint backend), Config Fields (solo lectura de los definidos en código), Vista en App (preview de qué ve el usuario final).
- **UX notas**: guardar publica inmediatamente a la app (`actualizarModuloCatalogo` + notify "publicado en la app"), `Catalogo.jsx:179-190`.
- **Modelo de datos**: `capacities` (metadatos), `capacity_feature_flags` (flags con `dev_status`/`api`), publicado vía `syncCatalogRemote`.
- **Componentes clave / archivo:línea**: `Catalogo` — `Catalogo.jsx:28-161`; `EditDrawer` — `:164-365`.
- **Estado**: Construido completo. Único punto de entrada: tile "Capacidades" dentro de Catálogos Globales — no está en el sidebar.

### Anunciantes — `/admin/anunciantes`
- **Propósito**: gestionar entidades legales que publican promociones puntuales en "Promos Redpontis" (un producto distinto de los mundos), con panel dedicado durante la vigencia de su promo.
- **Flujo de usuario**: tabla de anunciantes con credenciales de su panel (copiables), conteo de promos vigentes/finalizadas, y botón "Abrir panel". El botón "Crear promo" redirige a `/admin/mundos/mundo-promos-rp`.
- **UX notas**: política de cierre automático documentada — al finalizar la última promo vigente, el panel se desactiva y se envía correo de conformidad (`Anunciantes.jsx:103-108`) — aunque no hay evidencia en el código de un job real que ejecute ese envío.
- **Modelo de datos**: `st.anunciantes`/`st.promos` (local, con `promoVigente` como filtro de negocio).
- **Componentes clave / archivo:línea**: `Anunciantes` — `Anunciantes.jsx:7-113`.
- **Estado**: **Solo UI, efectivamente muerta** — el botón principal de la pantalla ("Crear promo") apunta a `/admin/mundos/mundo-promos-rp`, un mundo que el propio `store.js` purga activamente de `state.mundos` en cada `load()` porque "JOI Promos... se sacó del alcance activo" (`store.js:568-578, 632-638`). Sin punto de entrada en el resto de la app (ni sidebar ni links) — solo por URL directa.