// ============================================================
// JOI Solutions 360 — Backbone simulado (prototipo)
// Todo lo que el Admin RedPontis guarda aquí se propaga a los
// frentes: Dashboard del Mundo, Frente Comercio y Landing.
// Fase 0: además se sincroniza a Supabase (ver supabase.js),
// de donde la superapp lee la configuración en vivo.
// ============================================================

import { scheduleSync, fetchWorldsLive, fetchAllCapacityConfigs, fetchAllFeatureFlags, fetchEventosDeMundo, fetchTicketTypesDeEvento, fetchTicketsDeEvento, fetchTodasLiquidacionesRemote, fetchLiquidacionesMundoRemote, fetchVolumenPeriodoMundo, upsertLoteLiquidacionRemote, marcarLiquidacionRemote, crearTicketSoporteRemote, fetchTicketsSoporteRemote, actualizarTicketSoporteRemote, reconciliarComerciosMundo, fetchAsignacionesPendientesDescuentoMundo, marcarAsignacionesDescontadasRemote } from "./supabase.js";

const KEY = "joi360_state_v3";

// --- Catálogo Maestro de Módulos (R0, matriz Emisión/Adquirencia) ---
export const MODULE_CATALOG = [

  // ── CORE ──────────────────────────────────────────────────────────────────
  { id: "wallet", name: "Wallet", tier: "CORE", category: "Emisión", e: true, a: false, icon: "account_balance_wallet",
    desc: "Núcleo de identidad digital del ecosistema. Gestiona perfiles, cuentas, saldos y la relación del usuario con el mundo. Centraliza identificación, pertenencia y capacidad transaccional.",
    servicios: [
      { id:"balance",   nombre:"Balance y saldo",       desc:"Pantalla principal de saldo en tiempo real. Siempre visible si Wallet está activa." },
      { id:"recarga",   nombre:"Recarga de saldo",      desc:"Botón Recargar en el Hub + modal con canales habilitados del catálogo de Emisión del mundo." },
      { id:"p2p",       nombre:"Transferencia P2P",     desc:"Enviar saldo a otro usuario del mismo mundo. Toggle en configField p2pEnabled." },
      { id:"subwallet", nombre:"Sub-wallets / Familia", desc:"Crear perfiles dependientes con saldo propio. Se conecta con el módulo Control para límites y alergias." },
      { id:"bandita",   nombre:"Bandita NFC",           desc:"Vincular pulsera NFC al perfil. Pago tap en cualquier POS con lector NFC habilitado." },
      { id:"notifs",    nombre:"Notificaciones push",   desc:"Push inmediato al usuario en cada movimiento de saldo (recarga, pago, P2P)." },
      { id:"qr_fijo",   nombre:"QR (fijo, siempre activo)", desc:"Código QR de pago del usuario, generado apenas se activa Wallet. Ya está siempre activo en la práctica — este toggle solo lo confirma explícitamente, igual que Bandita NFC." },
    ],
    pricing: { modelo: "mixto", fijoMensual: 1200, porTx: 0.5, setup: 800, moneda: "PEN" },
    settlementSugerido: { frecuencia: "diaria", corte: "19:00", retencion: 0 },
    configFields: [
      { key: "monedaPermitida", label: "Moneda de operación del mundo", type: "select", options: ["PEN", "USD"], default: "PEN" },
      { key: "maxRecargasDiarias", label: "Cantidad máxima de recargas por usuario por día", type: "number", default: 3, nullable: true, nullLabel: "Sin límite" },
      { key: "maxPorRecarga", label: "Máximo por recarga", type: "currency", default: 500, nullable: true, nullLabel: "Sin tope por recarga" },
      { key: "p2pEnabled", label: "Habilitar transferencias entre usuarios del mismo mundo", type: "switch", default: true },
      { key: "usaPulseraNfc", label: "Este mundo usa pulseras NFC físicas", type: "switch", default: true,
        hint: "Antes esto quedaba encendido automáticamente con solo activar Wallet, sin poder apagarlo — un mundo que solo cobra por QR/app, sin banditas físicas, no tenía forma de reflejarlo. Apagado, el POS deja de ofrecer 'Vincular pulsera' y de aceptar identificación por NFC." },
      { key: "vigenciaBanditasMeses", label: "Vigencia de la pulsera NFC (meses)", type: "number", default: 12, nullable: true, nullLabel: "Sin vencimiento",
        hint: "El plazo empieza a correr cuando la pulsera se vincula a la persona, no cuando se carga el lote al almacén. Vencida, el POS la rechaza." },
      { key: "perfilesSuscripcion", label: "Cobrar suscripción por perfil vinculado", type: "switch", default: false, hint: "Cobra al padre/tutor una cuota única al vincular cada nuevo dependiente." },
      { key: "montoSuscripcion", label: "Monto de la suscripción por perfil (PEN)", type: "currency", default: 5, hint: "Solo aplica si la suscripción está activada." },
    ],
    posiblesIngresos: ["Suscripción por perfil", "Comisión por recarga"],
    // ── Microservicios de Wallet (storytelling de flujo real) ──────────
    // Jerarquía estructurada: cada microservicio tiene sus campos propios,
    // una dependencia explícita y efectos declarados por plataforma.
    // Convive con `servicios`/`configFields` de arriba (no los reemplaza
    // todavía) — se renderiza en su propia pestaña dentro del drawer.
    microservicios: [
      {
        id: "modelo_perfil", nombre: "Modelo de Perfil", icon: "account_circle",
        desc: "Decisión base de identidad de este mundo: define si los perfiles manejan saldo (consumo) o solo identifican al usuario. Todo lo demás en Wallet depende de esta elección.",
        dependsOn: null,
        campos: [
          { key: "modelo", label: "Modelo de perfil", type: "select", options: ["consumo", "identificacion"],
            optionLabels: { consumo: "Consumo (con saldo)", identificacion: "Solo identificación (sin saldo)" }, default: "consumo" },
        ],
        efectos: { app: "Determina si el perfil muestra saldo o solo identificación.", mundo: "BO: modelo de operación de Wallet para todo el mundo." },
      },
      {
        id: "familiares", nombre: "Familiares / Sub-perfiles", icon: "group",
        desc: "Permite vincular familiares registrados en la cuenta como sub-perfiles de este mundo.",
        dependsOn: null,
        campos: [
          { key: "habilitarFamiliares", label: "Habilitar familiares", type: "switch", default: false,
            hint: "Permite que familiares registrados en la cuenta se vinculen a este mundo." },
        ],
        efectos: { app: "Habilita 'Agregar familiar' en el perfil.", mundo: "BO: registro de usuarios/familiares dentro de una cuenta." },
      },
      {
        id: "transferencia", nombre: "Transferencia (P2P)", icon: "swap_horiz",
        desc: "Transferencia de saldo entre usuarios del mismo mundo.",
        dependsOn: { microservicio: "modelo_perfil", campo: "modelo", valor: "consumo" },
        campos: [
          { key: "enabled", label: "Habilitar P2P", type: "switch", default: true },
          { key: "maxPorTx", label: "Máximo por transacción", type: "currency", default: null, nullable: true, nullLabel: "Sin límite" },
          { key: "maxPorDia", label: "Máximo por día", type: "currency", default: null, nullable: true, nullLabel: "Sin límite" },
        ],
        efectos: { app: "Botón Transferir + límites aplicados.", mundo: "Ver transferencias entre usuarios." },
      },
      {
        id: "medios", nombre: "Habilitar Medios", icon: "contactless",
        desc: "Decide si este mundo usa pulseras NFC además de QR para identificar y pagar.",
        dependsOn: null,
        campos: [
          { key: "usaPulsera", label: "Usar pulseras NFC en este mundo", type: "switch", default: false },
        ],
        efectos: { mundo: "Inventario de pulseras: total / vinculadas / disponibles / bloqueadas.", pos: "Funcionalidad de vinculación de pulsera.", app: "Botón 'Solicitar bandita NFC'." },
      },
    ],
  },

  { id: "comercios", name: "Comercios", tier: "CORE", category: "Adquirencia", e: false, a: true, icon: "storefront",
    desc: "Administra los puntos de atención, venta o prestación de servicios que operan dentro del ecosistema. Centraliza creación, configuración y operación de los comercios habilitados por el sponsor.",
    servicios: [
      { id:"registro",    nombre:"Registro de comercio", desc:"Alta del merchant: datos, tarifa, operación. Aparece en el directorio del mundo en la Super App." },
      { id:"plataforma",  nombre:"Compras y pagos",      desc:"El usuario puede pagar en este comercio desde la Super App (QR, NFC, POS)." },
      { id:"pos",         nombre:"Habilitar POS",        desc:"Asignar terminales o medios de aceptación al comercio. Canales del catálogo de Adquirencia." },
      { id:"liquidacion", nombre:"Liquidación",          desc:"Corte y pago al merchant. Frecuencia y retención configurables por mundo." },
      { id:"reportes",    nombre:"Reportería",           desc:"El merchant ve sus ventas, transacciones y liquidaciones en su panel." },
    ],
    pricing: { modelo: "transaccional", porTx: 1.2, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "mdrDefault", label: "Tasa de descuento al comercio — MDR (%)", type: "percent", default: 1.5 },
      { key: "fijoTxDefault", label: "Cargo fijo por transacción (PEN)", type: "currency", default: 0.10 },
      { key: "tipoOnboarding", label: "Alta de comercios: responsable del proceso", type: "select", options: ["Automático (app)", "Manual por RedPontis", "Manual por el sponsor"], default: "Manual RedPontis" },
    ],
    posiblesIngresos: ["Comisión por transacción del comercio", "Fee por comercio"],
    // ── Microservicios de Comercios (storytelling de flujo real) ────────
    // Mismo patrón que Wallet: cada uno con campos propios y dependencia
    // explícita. Convive con `servicios`/`configFields` de arriba.
    microservicios: [
      {
        id: "plataforma", nombre: "Plataforma Comercio", icon: "storefront",
        desc: "Interruptor a nivel mundo: habilita el BackOffice de gestión a todos los comercios registrados en este mundo.",
        dependsOn: null,
        campos: [
          { key: "habilitarBackoffice", label: "Habilitar BackOffice a todos los comercios", type: "switch", default: true,
            hint: "Cada comercio incorporado recibe su propio panel de gestión al activarse." },
        ],
        efectos: { mundo: "BO: registro de comercios con acceso propio.", app: "Directorio de comercios del mundo." },
      },
      {
        id: "hardware", nombre: "Hardware", icon: "point_of_sale",
        desc: "Inventario de equipos físicos del ecosistema: tótems, POS y ticketeras. RedPontis registra el stock; el mundo asigna a comercios específicos.",
        dependsOn: null,
        campos: [
          { key: "totems", label: "Tótems registrados", type: "number", default: 0, nullable: false, hint: "Cantidad disponible para este mundo." },
          { key: "posUnidades", label: "POS registrados", type: "number", default: 0, nullable: false },
          { key: "ticketeras", label: "Ticketeras registradas", type: "number", default: 0, nullable: false },
          { key: "cargaMasiva", label: "Permitir carga masiva por Excel (cantidad + modelo + código)", type: "switch", default: false,
            hint: "Habilita subir un archivo con múltiples unidades de una vez, en vez de registrarlas de a una." },
        ],
        efectos: { mundo: "BO: asignar equipos ya registrados a comercios específicos.", pos: "Terminal operativo vinculado al comercio." },
      },
      {
        id: "liquidacion", nombre: "Módulo de Liquidación", icon: "account_balance",
        desc: "Obligatorio — siempre activo en todos los mundos. Define quién recauda los pagos y bajo qué reglas se liquida a los comercios.",
        dependsOn: null,
        obligatorio: true,
        campos: [
          { key: "modeloRecaudacion", label: "Modelo de recaudación", type: "select",
            options: ["redpontis", "mundo"], optionLabels: { redpontis: "RedPontis recauda", mundo: "El Mundo recauda" },
            default: "redpontis", hint: "Se define al negociar el acuerdo comercial con este mundo — no es un default técnico, es una decisión comercial por mundo." },
          { key: "frecuencia", label: "Frecuencia de liquidación", type: "select",
            options: ["diaria", "semanal", "quincenal", "mensual"], default: "diaria" },
          { key: "horaCorte", label: "Hora de cierre de lote", type: "time", default: "19:00" },
          { key: "montoMinimo", label: "Monto mínimo de liquidación", type: "currency", default: null, nullable: true, nullLabel: "Sin monto mínimo" },
        ],
        efectos: { mundo: "BO: montos por comercio, comisiones RP, estado de liquidaciones.", app: "" },
      },
      {
        id: "creacion", nombre: "Creación de Comercios", icon: "playlist_add_check",
        desc: "Reglas comerciales bajo las cuales se incorporan los comercios de este mundo.",
        dependsOn: null,
        campos: [
          { key: "cantidadEsperada", label: "Cantidad aproximada de comercios esperados", type: "number", default: null, nullable: true, nullLabel: "Sin estimar" },
          { key: "tarifaEsPiso", label: "La tarifa mínima actúa como piso (el mundo puede subirla, nunca bajarla)", type: "switch", default: false,
            hint: "Depende del plan negociado con este mundo. Si es revenue share, normalmente se activa como piso; si no, queda como default editable libremente." },
        ],
        efectos: { mundo: "Determina si el mundo puede modificar la tarifa base del comercio, y en qué dirección." },
      },
    ],
  },

  { id: "consumos", name: "Compras y Transacciones", tier: "CORE", category: "Adquirencia", e: false, a: true, icon: "point_of_sale",
    desc: "Motor transaccional del backoffice del mundo. Procesa operaciones económicas: compras, pagos, devoluciones, anulaciones y movimientos de saldo en el POS y app.",
    servicios: [
      { id:"venta_pos",   nombre:"Venta y anulación POS", desc:"El cajero registra ventas y puede anular dentro del plazo configurado." },
      { id:"compra_app",  nombre:"Compra desde la app",   desc:"El usuario paga escaneando QR o con NFC desde su Super App." },
      { id:"historial",   nombre:"Historial de consumos",  desc:"El usuario ve sus compras en el mundo con detalle de monto, comercio y fecha." },
      { id:"conciliacion",nombre:"Conciliación y liquidación", desc:"Proceso automático de cierre diario y preparación de pago al merchant." },
    ],
    pricing: { modelo: "transaccional", porTx: 0.3, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "horarioOperativo", label: "Horario de operación del POS", type: "timerange", default: null, nullable: true, nullLabel: "Sin restricción horaria (24/7)" },
      { key: "anulacionHasta", label: "Horas máximas para anular una transacción", type: "number", default: 24, nullable: true, nullLabel: "Sin límite para anulaciones" },
    ],
    posiblesIngresos: ["Comisión por transacción"],
  },

  { id: "inventario", name: "Inventario", tier: "CORE", category: "Adquirencia", e: false, a: true, icon: "inventory_2",
    desc: "Administra categorías, productos, stock y disponibilidad de artículos o servicios comercializados dentro del ecosistema. Soporta Consumos, Menú y Motor de Eventos.",
    servicios: [
      { id: "subir_productos",  nombre: "Subir productos",                desc: "El merchant carga su catálogo con nombre, precio, imagen y descripción." },
      { id: "subir_stock",      nombre: "Subir cantidades (stock)",        desc: "Control de inventario: el merchant registra y actualiza el stock disponible por producto." },
      { id: "venta_pos",        nombre: "Venta de productos en POS",      desc: "El catálogo se integra con el POS para registrar ventas por producto." },
      { id: "detalle_ventas",   nombre: "Registro a detalle de ventas",   desc: "Reportería de ventas desglosada por producto, categoría, fecha y monto." },
      { id: "detalle_consumos", nombre: "Registro a detalle de consumos", desc: "Historial de consumos por usuario con detalle de los productos adquiridos." },
    ],
    pricing: { modelo: "fijo", fijoMensual: 200, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "skuMax",        label: "Máximo de SKUs por merchant", type: "number", default: 500, nullable: true, nullLabel: "Sin límite de SKUs", hint: "Aplica si no se incluye SKUs ilimitados en el contrato." },
      { key: "stockNegativo", label: "Permitir venta con stock negativo (sin bloqueo de caja)", type: "switch", default: false },
      { key: "categoriasMax", label: "Categorías máximas por merchant", type: "number", default: 20, nullable: true, nullLabel: "Sin límite de categorías" },
    ],
    posiblesIngresos: ["Mensualidad"],
  },

  // ── PREMIUM ────────────────────────────────────────────────────────────────
  { id: "facturacion", name: "Facturación", tier: "PREMIUM", category: "Adquirencia", e: false, a: true, icon: "receipt_long",
    desc: "Genera comprobantes electrónicos asociados a transacciones del ecosistema: boletas, facturas y notas de crédito. Integración con proveedor PSE y SUNAT.",
    servicios: ["Integración con proveedor PSE", "Emisión de boletas/facturas para suscripciones", "Emisión de boletas/facturas para compras a comercios", "Nota de crédito", "Integración SUNAT"],
    pricing: { modelo: "transaccional", porTx: 0.15, setup: 500, moneda: "PEN" },
    configFields: [
      { key: "rucEmisor",    label: "RUC de la entidad emisora de comprobantes", type: "text", default: "" },
      { key: "serieBoleta",  label: "Serie de boleta electrónica (ej. B001)", type: "text", default: "B001" },
      { key: "serieFactura", label: "Serie de factura electrónica (ej. F001)", type: "text", default: "F001" },
    ],
    posiblesIngresos: ["Cantidad de boletas o facturas emitidas"],
  },

  { id: "perfil_ext", name: "Perfil extendido", tier: "PREMIUM", category: "Datos", e: false, a: false, icon: "badge",
    desc: "Almacena información adicional de usuarios más allá de los datos básicos, adaptándose a las necesidades de cada sponsor (salud, emergencia, identificación TAQ/QR).",
    servicios: [
      { id: "tipo_sangre",         nombre: "Tipo de sangre",           desc: "Campo de tipo de sangre en el perfil extendido del usuario." },
      { id: "alergias",            nombre: "Alergias",                 desc: "Campo de alergias del usuario, visible para el mundo en Restricciones/Control." },
      { id: "clinica",             nombre: "Clínica / centro de salud", desc: "Clínica u hospital de referencia del usuario." },
      { id: "contacto_emergencia", nombre: "Contacto de emergencia",   desc: "Nombre y teléfono de contacto de emergencia del usuario." },
    ],
    pricing: { modelo: "fijo", fijoMensual: 180, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "camposMedicos", label: "Mostrar sección de datos médicos y emergencia en el perfil", type: "switch", default: true },
      { key: "grupoFamiliar", label: "Habilitar gestión de grupo familiar vinculado al perfil", type: "switch", default: true },
    ],
    posiblesIngresos: ["Mensualidad por módulo o por perfil"],
  },

  { id: "accesos", name: "Accesos", tier: "PREMIUM", category: "Emisión", e: true, a: true, icon: "door_open",
    desc: "Controla el ingreso y salida de personas mediante TAQ/QR, registrando eventos y restricciones por zona, horario y tipo de usuario.",
    servicios: [
      { id: "identificacion",     nombre: "Identificación del usuario con TAQ o QR", desc: "Escaneo real de bandita NFC, QR o búsqueda por DNI en el POS." },
      { id: "consulta_pos",       nombre: "Consulta en POS",                          desc: "Ficha del usuario (nombre, alergias, contacto de emergencia) al identificarlo." },
      { id: "registro_tipo",      nombre: "Registro de accesos por tipo de usuario (sponsor)", desc: "Cada acceso queda en access_log con el usuario real que lo generó." },
      { id: "registro_zonas",     nombre: "Registro de zonas o servicios por mundo",  desc: "El operador elige la zona al registrar, pero hoy no restringe el paso — solo queda como dato del registro." },
      { id: "registro_horarios",  nombre: "Registro de horarios",                     desc: "Control de acceso por franja horaria." },
    ],
    pricing: { modelo: "fijo", fijoMensual: 250, setup: 200, moneda: "PEN" },
    configFields: [
      { key: "zonas",           label: "Zonas de acceso habilitadas (separadas por coma)", type: "text", default: "Principal,Cafetería,Auditorio" },
      { key: "validacionDoble", label: "Exigir doble validación (tap NFC + PIN) en zonas de alta seguridad", type: "switch", default: false },
    ],
    posiblesIngresos: ["Mensualidad por módulo"],
  },

  { id: "reservas", name: "Reservas", tier: "PREMIUM", category: "Mixto", e: true, a: true, icon: "event_available",
    desc: "Reserva de recursos, espacios, servicios o actividades para fechas y horarios específicos. El usuario reserva (E) y el operador valida/cobra (A).",
    servicios: ["Identificación del usuario con TAQ o QR", "Consulta en POS", "Registro de zonas o servicios por mundo", "Registro de horarios y capacidad", "Reservar desde la app", "Lista de espera", "Recordatorios push"],
    pricing: { modelo: "mixto", fijoMensual: 220, porTx: 0.2, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "anticipoMin",        label: "Porcentaje mínimo de anticipo al reservar", type: "percent", default: 30, nullable: true, nullLabel: "Sin anticipo obligatorio" },
      { key: "ventanaCancelacion", label: "Horas antes de la reserva para cancelar sin penalidad", type: "number", default: 24, nullable: true, nullLabel: "Cancelación gratuita siempre" },
    ],
    posiblesIngresos: ["Mensualidad por módulo"],
  },

  // ── OPCIONAL ───────────────────────────────────────────────────────────────
  { id: "loyalty", name: "Puntos Loyalty", tier: "OPCIONAL", category: "Mixto", e: true, a: true, icon: "loyalty",
    desc: "Acumula, consulta y redime puntos generados por actividades o consumos dentro del ecosistema. Devengo en comercio (A), saldo en wallet (E).",
    servicios: [
      { id:"acumulacion", nombre:"Acumulación automática", desc:"Por cada compra el usuario gana puntos según la equivalencia configurada." },
      { id:"saldo_pts",   nombre:"Saldo de puntos",       desc:"Contador visible en el Hub y en el módulo de Lealtad." },
      { id:"canje_app",   nombre:"Canje en la app",       desc:"El usuario canjea puntos por vouchers, descuentos o artículos desde la Super App." },
      { id:"canje_pos",   nombre:"Canje en comercio",     desc:"El usuario usa puntos como medio de pago en el POS del merchant." },
      { id:"niveles",     nombre:"Niveles / Tiers",       desc:"Bronce, Plata, Oro — barra de progreso visible al usuario." },
    ],
    pricing: { modelo: "transaccional", porTx: 0.6, setup: 300, moneda: "PEN" },
    configFields: [
      { key: "equivalencia",    label: "Valor de 1 punto en PEN", type: "currency", default: 0.10 },
      { key: "caducidadMeses", label: "Meses hasta que los puntos no canjeados expiran", type: "number", default: 12, nullable: true, nullLabel: "Puntos sin caducidad" },
    ],
    posiblesIngresos: ["Mensualidad"],
  },

  { id: "eventos", name: "Motor de Eventos", tier: "OPCIONAL", category: "Mixto", e: true, a: true, icon: "confirmation_number",
    desc: "Comercializa entradas para eventos, actividades o experiencias. Gestiona disponibilidad, validación y control de asistencia. Incluye capacidad de preventa y pedido anticipado.",
    servicios: [
      { id:"crear",       nombre:"Crear evento",         desc:"Admin o usuario B2C puede crear eventos con título, fecha, lugar, categoría y aforo." },
      { id:"entradas",    nombre:"Entradas y precios",   desc:"Tipos de entrada (general, VIP) con precios diferenciados." },
      { id:"aforo",       nombre:"Gestión de aforo",     desc:"Barra de capacidad visible al usuario. Bloqueo automático al llenarse." },
      { id:"monitoreo",   nombre:"Monitoreo en vivo",    desc:"Dashboard del organizador con ventas y asistencia en tiempo real." },
      { id:"taq_qr",      nombre:"Validación TAQ / QR",  desc:"El usuario muestra QR de entrada y el POS valida acceso." },
      { id:"preventa",    nombre:"Preventa / Pre-orden",  desc:"Compra anticipada de entrada con pickup QR. Integra con Inventario si aplica." },
    ],
    pricing: { modelo: "transaccional", porTx: 5.0, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "comisionEntrada", label: "Porcentaje de comisión RedPontis sobre cada entrada vendida", type: "percent", default: 5 },
      { key: "allowB2C",       label: "Habilitar que usuarios del app creen sus propios eventos", type: "switch", default: false },
      { key: "ventanaPickup",  label: "Tiempo máximo para recoger preventa (minutos)", type: "number", default: 30, hint: "Aplica en eventos con modalidad de recojo físico de entradas." },
    ],
  },

  { id: "credito", name: "Crédito", tier: "OPCIONAL", category: "Emisión", e: true, a: false, icon: "credit_score",
    desc: "Otorga líneas de crédito o saldo financiado a usuarios para realizar consumos dentro del ecosistema. Alto control regulatorio.",
    servicios: ["Scoring básico de riesgo", "Línea revolvente", "Cuotas fijas", "Recordatorios de cobranza", "Historial crediticio"],
    pricing: { modelo: "transaccional", porTx: 2.5, setup: 1500, moneda: "PEN" },
    configFields: [
      { key: "lineaMax",     label: "Monto máximo de línea de crédito asignable por usuario", type: "currency", default: 1000 },
      { key: "tasaInteres",  label: "Tasa efectiva anual (TEA) aplicada al saldo en cuotas", type: "percent", default: 24 },
    ],
  },

  { id: "subsidio", name: "Subsidio", tier: "OPCIONAL", category: "Emisión", e: true, a: false, icon: "volunteer_activism",
    desc: "Asigna fondos con reglas específicas de uso para determinados usuarios, grupos o categorías. Saldo dirigido con vigencia y segmentación.",
    servicios: ["Saldo segmentado por grupo o usuario", "Categorías de gasto permitidas", "Vigencia del subsidio", "Reportería sponsor", "Recarga masiva de subsidios"],
    pricing: { modelo: "fijo", fijoMensual: 400, setup: 600, moneda: "PEN" },
    configFields: [
      { key: "categorias",   label: "Categorías de comercio donde se puede usar el saldo subsidiado", type: "text", default: "F&B,Educación" },
      { key: "vigenciaDias", label: "Días de vigencia de cada carga de subsidio", type: "number", default: 30, nullable: true, nullLabel: "Sin caducidad" },
    ],
  },

  { id: "estacionamiento", name: "Estacionamiento", tier: "OPCIONAL", category: "Mixto", e: true, a: true, icon: "local_parking",
    desc: "Gestiona accesos, permanencia, reservas y pagos relacionados con espacios de estacionamiento. Reutiliza Accesos + Reservas + Consumos.",
    servicios: ["Pago por hora", "Pago por día / mensualidad", "Reserva de slot anticipada", "Validación QR o placa", "Control de permanencia"],
    pricing: { modelo: "transaccional", porTx: 1.5, setup: 400, moneda: "PEN" },
    configFields: [
      { key: "tarifaHora",    label: "Tarifa estándar por hora de estacionamiento", type: "currency", default: 5 },
      { key: "graciaMinutos", label: "Minutos de gracia sin cobro al ingreso/egreso", type: "number", default: 15, nullable: true, nullLabel: "Sin minutos de gracia" },
    ],
  },

  { id: "asistencia", name: "Asistencia", tier: "OPCIONAL", category: "Mixto", e: false, a: false, icon: "health_and_safety",
    desc: "Próximamente: registro y consulta de presencia de usuarios en actividades, clases o instalaciones. Reporte a padres, justificaciones y reportería por mundo. Aún no construido en la app — sin parámetros configurables todavía.",
    servicios: ["Marcaciones de entrada y salida", "Reporte automático a padres/tutores", "Justificaciones de inasistencia", "Reportería de asistencia por mundo", "Identificación TAQ o QR"],
    pricing: { modelo: "fijo", fijoMensual: 600, setup: 1000, moneda: "PEN" },
    lock: "Educación",
    configFields: [],
  },

  { id: "cashback", name: "Cashback", tier: "OPCIONAL", category: "Adquirencia", e: true, a: true, icon: "currency_exchange",
    desc: "Devuelve un porcentaje del consumo a la wallet del usuario. Se devenga en el comercio (A) y se acredita en la wallet (E). Motor de growth y retención.",
    servicios: ["% de retorno sobre venta", "Tope de cashback por usuario / mes", "Categorías con cashback diferenciado", "Vigencia del cashback acumulado", "Historial de retornos"],
    pricing: { modelo: "transaccional", porTx: 0.5, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "porcentajeDefault", label: "Porcentaje de cashback sobre el monto de compra", type: "percent", default: 3 },
      { key: "topeMensual",       label: "Tope máximo de cashback mensual por usuario", type: "currency", default: 50, nullable: true, nullLabel: "Sin tope mensual" },
    ],
  },

  { id: "control", name: "Restricciones", tier: "OPCIONAL", category: "Emisión", e: true, a: false, icon: "shield_lock",
    desc: "Establece reglas de uso sobre saldo, productos, horarios, comercios o categorías autorizadas. Control parental: límites, bloqueos horarios y alergias para dependientes.",
    servicios: [
      { id: "reglas_mundo",   nombre: "Reglas por mundo",            desc: "Límites y restricciones que aplican a TODOS los usuarios del mundo (tope diario global, categorías bloqueadas)." },
      { id: "reglas_sponsor", nombre: "Reglas por sponsor",          desc: "El sponsor añade reglas sobre las del mundo para su grupo de merchants/usuarios." },
      { id: "perfiles_ctrl",  nombre: "Perfiles controlados",        desc: "Un padre/tutor registra dependientes y controla su consumo: límites, categorías, horarios y alertas en tiempo real." },
      { id: "aprobaciones",   nombre: "Aprobaciones en tiempo real", desc: "Montos sobre el umbral quedan pendientes de aprobación del padre antes de procesarse." },
      { id: "alertas",        nombre: "Alertas push / email",        desc: "Notificaciones en tiempo real al padre o administrador cuando se dispara una regla." },
    ],
    pricing: { modelo: "fijo", fijoMensual: 320, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "perfilesControladosActivo", label: "Activar gestión de perfiles controlados (control parental)", type: "switch", default: true, hint: "Permite que usuarios adultos registren dependientes y controlen su consumo desde el app." },
      { key: "maxPerfilesControlados",   label: "Máximo de dependientes por cuenta", type: "number", default: 2, nullable: true, nullLabel: "Sin límite", hint: "Elige 1 o 2 para el caso educativo estándar." },
      { key: "registroAlergias",         label: "Habilitar registro de alergias alimentarias por dependiente", type: "switch", default: true, hint: "Se propaga al módulo de Menú y al POS del comercio." },
      { key: "limiteDiarioPerfil",       label: "Límite diario de consumo del dependiente (PEN)", type: "currency", default: 30, nullable: true, nullLabel: "Sin límite" },
      { key: "montoAprobacionPadre",     label: "Monto a partir del cual se requiere aprobación del padre (PEN)", type: "currency", default: 50, nullable: true, nullLabel: "No requerir aprobación" },
      { key: "horarioConsumo",           label: "Rango horario permitido para consumo del dependiente", type: "text", default: "07:00-17:00", nullable: true, nullLabel: "Sin restricción horaria" },
      { key: "soloMercantesAfiliados",   label: "Dependiente solo puede consumir en comercios del mundo", type: "switch", default: true },
      { key: "notificacionConsumoRealTime", label: "Notificar al padre en cada transacción del dependiente", type: "switch", default: true },
      { key: "limiteGlobalMundo",        label: "Límite diario para usuarios sin perfil controlado (PEN)", type: "currency", default: 200, nullable: true, nullLabel: "Sin límite global" },
      { key: "alertasAdminEmail",        label: "Notificar al administrador cuando se bloquee una transacción", type: "switch", default: true },
    ],
  },

  { id: "menu", name: "Menú", tier: "OPCIONAL", category: "Datos", e: false, a: false, icon: "restaurant_menu",
    desc: "El padre/usuario programa el menú y el concesionario valida y entrega. Catálogo diario con cupos, restricciones alimentarias y pre-orden.",
    servicios: [
      { id: "calendario",                nombre: "Calendario semanal de menú",   desc: "El comercio programa las opciones de cada día." },
      { id: "cupos",                      nombre: "Cupos por opción de menú",     desc: "Límite de raciones por opción, en tiempo real." },
      { id: "restricciones_alimentarias", nombre: "Restricciones alimentarias (integra con Perfil extendido)", desc: "Alerta de alergia al elegir una opción del menú." },
      { id: "preorden",                   nombre: "Pre-orden desde la app",       desc: "El padre/usuario reserva y paga la opción con anticipación." },
      { id: "validacion_pos",             nombre: "Validación en POS / entrega",  desc: "El concesionario confirma la entrega de la pre-orden desde el POS." },
    ],
    pricing: { modelo: "mixto", fijoMensual: 280, porTx: 0.3, setup: 400, moneda: "PEN" },
    configFields: [
      { key: "diasAnticipacion", label: "Días de anticipación para reservar un menú", type: "number", default: 7 },
      { key: "cuposPorMenu",     label: "Cupos predeterminados por opción de menú", type: "number", default: 100 },
      { key: "metodoReserva", label: "Método de reserva", type: "select", options: ["saldo", "qr"],
        optionLabels: { saldo: "Pago con saldo", qr: "Pago con QR" }, default: "saldo" },
    ],
  },

  { id: "promociones", name: "Promociones", tier: "OPCIONAL", category: "Mixto", e: true, a: true, icon: "campaign",
    desc: "Campañas, cupones, banners y redención QR. Activación contextual del beneficio por compra, visita o acción del usuario.",
    servicios: ["Cupón QR", "Banner en home del app", "Push segmentado por segmento", "A/B testing de campañas"],
    pricing: { modelo: "mixto", fijoMensual: 150, porTx: 0.1, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "maxCuponesUsuario", label: "Máximo de cupones activos simultáneos por usuario", type: "number", default: 5 },
    ],
  },

  { id: "turnos", name: "Turnos", tier: "OPCIONAL", category: "Emisión", e: true, a: false, icon: "schedule",
    desc: "Gestiona citas o turnos programados para atención, servicios o actividades con capacidad limitada. Especialización de Reservas.",
    servicios: ["Cita individual agendada", "Cita grupal con cupo", "Recordatorio automático 24h antes", "Recordatorio automático 1h antes", "Cancelación y reagendamiento"],
    pricing: { modelo: "fijo", fijoMensual: 180, setup: 0, moneda: "PEN" },
    configFields: [
      { key: "duracionDefault", label: "Duración predeterminada de cada turno (minutos)", type: "number", default: 30 },
    ],
  },

  { id: "bnpl", name: "BNPL", tier: "OPCIONAL", category: "Mixto", e: true, a: true, icon: "calendar_clock",
    desc: "Compra ahora paga después en marca blanca. El Mundo lo habilita y define el techo; el Comercio lo activa y configura su programa. Jerarquía de 4 microservicios (Casos TEC V2.0 — Caso Mok).",
    servicios: [
      { id:"elegibilidad", nombre:"Elegibilidad / Evaluación",   desc:"Mecanismo de evaluación crediticia, incluida la opción 'sin evaluación' (marca blanca). Requiere Wallet activo: la identidad la resuelve el mundo." },
      { id:"limites",      nombre:"Límites del Mundo",           desc:"Cuotas disponibles (3/6/12), días de gracia (máx. 10) y score opcional/obligatorio. Techo que hereda el Comercio: solo puede restringir, nunca ampliar." },
      { id:"programa",     nombre:"Programa del Comercio",       desc:"Cuotas activas dentro del límite, comisión / revenue share, productos financiables y gestión de mora. Se configura en el BackOffice del comercio." },
      { id:"contratos",    nombre:"Operación / Contratos",       desc:"Contrato digital + cronograma de cuotas al momento de la venta. Se integra con Compras y Transacciones." },
    ],
    pricing: { modelo: "transaccional", porTx: 3.5, setup: 800, moneda: "PEN" },
    // Límites del Mundo (Nivel 2) — techo heredado por cada comercio (clamping)
    configFields: [
      { key: "cuotas3",  label: "Ofrecer 3 cuotas (sin interés)",  type: "switch", default: true },
      { key: "cuotas6",  label: "Ofrecer 6 cuotas (con interés)",  type: "switch", default: true },
      { key: "cuotas12", label: "Ofrecer 12 cuotas (con interés)", type: "switch", default: false },
      { key: "diasGracia", label: "Días de gracia antes de la primera cuota (máx. 10)", type: "number", default: 5 },
      { key: "scoreObligatorio", label: "Exigir score crediticio al usuario", type: "switch", default: false },
      { key: "sinEvaluacion", label: "Permitir modalidad 'sin evaluación' (marca blanca)", type: "switch", default: true },
      { key: "montoMaxBNPL", label: "Monto máximo financiable por compra", type: "currency", default: 3000 },
      { key: "moraMaxPct", label: "Porcentaje máximo de mora que puede cobrar un comercio", type: "number", default: 5 },
    ],
    microservicios: [
      { id: "elegibilidad", nombre: "Elegibilidad / Evaluación crediticia", icon: "fact_check",
        desc: "Define cómo se evalúa al usuario antes de financiar. Mok opera 'sin evaluación': la identidad la resuelve Wallet.",
        dependsOn: null,
        campos: [
          { key: "modalidad", label: "Modalidad de evaluación", type: "select", options: ["sin_evaluacion", "score_interno", "integracion_personalizada"],
            optionLabels: { sin_evaluacion: "Sin evaluación (marca blanca)", score_interno: "Score interno RedPontis", integracion_personalizada: "Integración personalizada (score externo del mundo)" }, default: "sin_evaluacion" },
        ],
        efectos: { app: "Estados Elegible / No elegible / Evaluando en el checkout.", mundo: "BO: criterio de elegibilidad del mundo." } },
      { id: "limites", nombre: "Límites del Mundo", icon: "vertical_align_top",
        desc: "Techo de cuotas, gracia y score. El Programa del Comercio hereda este techo y solo puede restringirlo (mismo patrón de clamping que canales de emisión).",
        dependsOn: null,
        campos: [],
        efectos: { app: "El selector de cuotas nunca ofrece más de lo que el mundo permite.", mundo: "BO: techo visible en la config del comercio." } },
      { id: "programa", nombre: "Programa del Comercio", icon: "storefront",
        desc: "Cada comercio (ej. Hiraoka) activa sus cuotas dentro del límite, define comisión/revenue share, restringe productos financiables y elige la gestión de mora. El mecanismo elegido acá solo define qué opciones existen para el Mundo — cada Comercio decide si lo usa.",
        dependsOn: null,
        campos: [
          { key: "revenueShareActivo", label: "Habilitar revenue share para este Mundo", type: "switch", default: false },
          { key: "revenueShareMecanismo", label: "Mecanismo de revenue share disponible", type: "select", options: ["comision", "interes", "ambos"],
            optionLabels: { comision: "Comisión administrativa", interes: "Interés", ambos: "Comisión + interés" }, default: "comision" },
        ],
        efectos: { app: "Solo los productos financiables muestran la opción BNPL.", mundo: "BO comercio: pestaña BNPL con su programa." } },
      { id: "contratos", nombre: "Operación / Contratos", icon: "history_edu",
        desc: "Contrato digital y cronograma de cuotas generados al momento de la venta. Endpoint EcoreGateway: stub con el mismo contrato request/response que Culqi/Qubit.",
        dependsOn: null,
        campos: [],
        efectos: { app: "El usuario firma el contrato y ve su cronograma en 'Paga después'.", mundo: "BO: widget Cronograma BNPL con contratos vigentes." } },
    ],
  },

  { id: "transporte", name: "Transporte", tier: "OPCIONAL", category: "Emisión", e: true, a: true, icon: "directions_bus",
    desc: "Derecho de viaje y cobro por uso. Gestiona rutas, tarifas y acceso al transporte dentro del mundo. Reutiliza Accesos + Wallet.",
    servicios: ["Pago tap NFC", "QR de abordaje", "Registro de rutas", "Precio fijo por viaje", "Tarifa por zona"],
    pricing: { modelo: "transaccional", porTx: 0.5, setup: 300, moneda: "PEN" },
    configFields: [
      { key: "tarifaPlana", label: "Precio fijo por viaje o uso del transporte dentro del mundo", type: "currency", default: 2.5 },
    ],
  },

];

// Verticales R1 según storytelling de flujo real (7 verticales de negocio +
// 2 legados sin equivalente en el doc, mantenidos por compatibilidad con
// mundos ya activos + 1 interno de RedPontis).
export const VERTICALS = [
  "Educación", "Evento", "Retail", "Hospitalidad", "Salud", "Club Deportivo", "Entretenimiento",
  "Empresa", "Comunidad", // legados — sin mundos nuevos esperados, no se eliminan por compatibilidad
  "Especial RedPontis", // interno — excluido del selector de creación
];

// Giros (2do nivel) por vertical — aparece como select dependiente al elegir
// la vertical en el wizard de creación de mundo.
export const GIROS_POR_VERTICAL = {
  "Educación": ["Colegio", "Universidad", "Instituto", "Academia", "Centro de idiomas"],
  "Evento": ["Feria", "Festival", "Concierto", "Kermesse", "Circo", "Evento corporativo", "Evento universitario"],
  "Retail": ["Centro comercial", "Tienda por departamento", "Boulevard", "Stripcenter", "Tienda de conveniencia", "Supermercado"],
  "Hospitalidad": ["Hotel", "Resort", "Parque temático", "Crucero"],
  "Salud": ["Clínica", "Hospital", "Centro médico", "Centro odontológico", "Centro de diagnóstico", "Laboratorio", "Centro de rehabilitación / terapia"],
  "Club Deportivo": ["Club deportivo"],
  "Entretenimiento": ["Discoteca", "Casino", "Rooftop", "Karaoke", "Club social"],
  "Empresa": ["Corporativo / Comedor empresarial"],
  "Comunidad": ["Comunidad vecinal"],
  "Especial RedPontis": ["Interno RedPontis"],
};
export const CORE_IDS = MODULE_CATALOG.filter(m => m.tier === "CORE").map(m => m.id);

const defaultModuleState = (id) => {
  const cat = MODULE_CATALOG.find(m => m.id === id);
  const config = {};
  (cat?.configFields || []).forEach(f => { config[f.key] = f.default; });
  const serviciosActivos = {};
  (cat?.servicios || []).forEach((sv, i) => {
    const key = typeof sv === "string" ? sv : sv.id;
    // qr_fijo (Gantt #20) ya está siempre activo en la práctica, sin importar
    // su posición en el array — el toggle solo lo confirma explícitamente.
    serviciosActivos[key] = key === "qr_fijo" ? true : i < 3;
  });
  return {
    id,
    enabled: true,
    emision: cat?.e || false,
    adquirencia: cat?.a || false,
    config,
    serviciosActivos,
    acuerdo: cat?.pricing ? { ...cat.pricing } : null,
  };
};

// El criterio B2B/B2C ya no se elige a mano: lo define el tipo de mundo.
// JOI Eventos (mundo especial RP) opera B2C por naturaleza; cualquier otro
// mundo con el Motor de Eventos activo opera B2B por defecto. "Embebido" es
// un toggle aparte que se suma cuando el propio mundo publica sus eventos.
// B2B es excluyente con B2C/Embebido: un mundo B2B es un mundo "organizador"
// (se entrega el panel a un tercero); B2C sí puede convivir con Embebido
// (el propio mundo publica bajo el modelo B2C, con comisión RP).
export function modosDeMundo(m) {
  const base = m.eventosConfig?.modoEventos || (m.type === "eventos_rp" ? "b2c" : "b2b");
  if (base === "b2b") return ["b2b"];
  return ["b2c", ...(m.eventosConfig?.embebidoActivo ? ["embebido"] : [])];
}

// --- Seed inicial ---
function seed() {
  const now = Date.now();
  return {
    users: [{ email: "camila.duenas@redpontis.com", password: "RedpontisAdmin2026", name: "Camila Dueñas" }],
    session: null,
    mundos: [
      {
        id: "mundo-eventos-rp",
        fixed: true,
        redpontis: true,
        type: "eventos_rp",
        nombre: "JOI Eventos",
        codigo: "EV-RP-000",
        vertical: "Especial RedPontis",
        entidadLegal: "RedPontis S.A.C.",
        ruc: "20612345678",
        moneda: "PEN",
        estado: "ACTIVO",
        color: "#722ce3",
        descripcion: "Mundo RedPontis de eventos: usuarios B2C pueden registrar, publicar y gestionar su propio evento desde el app. RedPontis monitorea. Fase 0: sin monetización.",
        // Configuración del Motor de Eventos para este mundo — B2C se deriva
        // de m.type==="eventos_rp" (ver modosDeMundo). Embebido activo porque
        // RedPontis también publica eventos propios directo en este mundo.
        eventosConfig: {
          embebidoActivo: true,
          monetizacion: false,  // fase 0: sin comisión, sin cobro (lo lee la superapp)
          comisionEntrada: 1,
        },
        modulos: (() => {
          const mods = ["wallet", "eventos", "comercios", "accesos"].map(defaultModuleState);
          const evMod = mods.find(m => m.id === "eventos");
          if (evMod) {
            evMod.config.allowB2C = true;
            evMod.config.comisionEntrada = 1;   // 1% en JOI Eventos
            evMod.config.ventanaPickup = 30;
            // Servicios iniciales
            evMod.serviciosActivos = {
              "Crear evento": true, "Crear entrada (tipos y precios)": true,
              "Gestión de aforo": true, "Monitoreo de evento en tiempo real": true,
              "Monitoreo de venta de entradas": true, "Identificación del usuario con TAQ o QR": true,
              "Consulta en POS": false, "Pre-orden / preventa de entradas": true,
              "Pago anticipado": true, "Pickup QR para retiro": true,
            };
          }
          return mods;
        })(),
        acuerdo: { tipo: "transaccional", revShare: 1, fijoMensual: 0, setup: 0, vigencia: "indefinida", nota: "Fase 0 — 1% rev-share sobre entradas vendidas" },
        createdAt: now,
      },
      // JOI Promos (mundo-promos-rp) existió como segundo mundo especial de
      // RedPontis pero se sacó del alcance activo por pedido explícito de la
      // usuaria: "solo vamos a manejar un mundo propio de JOI, JOI Eventos".
      // Antes había 2 mundos demo horneados aquí (Jockey Plaza, Colegio
      // Raimondi con ids fijos mundo-jockey-plaza/mundo-raimondi) — el mismo
      // problema que comercios/tickets/liquidaciones: si state.mundos se
      // reseedeaba por CUALQUIER motivo (origen nuevo, guard de state vacío),
      // el siguiente update() los empujaba a Supabase vía scheduleSync,
      // reintroduciendo mundos fantasma en producción. seed() ya no crea
      // mundos que no sean plataforma real (JOI Eventos/JOI Promos, fixed).
    ],
    // Sin data mock horneada: liquidación, eventos, promos, comercios,
    // tickets y anunciantes arrancan reales en 0 y se llenan solo con lo
    // que sincroniza Supabase o crea el admin — mismo mandato del borrado
    // total (#125). Antes había filas demo (com-1, tk-1, liq-1...) que la
    // reconciliación remota solo AGREGABA encima, nunca reemplazaba, así
    // que contaminaban los KPIs del Dashboard para siempre.
    eventos: [],
    promos: [],
    comercios: [],
    tickets: [],
    anunciantes: [],
    liquidaciones: [],
    sponsorSession: null,
    anuncianteSession: null,
  };
}

// --- Store con pub/sub ---
let state = null;

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : seed();
  } catch { state = seed(); }

  // ── guard: ensure state is a valid object ──
  if (!state || typeof state !== "object") state = seed();
  if (!Array.isArray(state.mundos) || state.mundos.length === 0) state = seed();

  // ── migración suave: añade campos nuevos sin borrar data existente ──
  const s = seed();
  if (!state.tickets)       state.tickets       = s.tickets;
  if (!state.anunciantes)   state.anunciantes   = s.anunciantes;
  if (!state.liquidaciones) state.liquidaciones = s.liquidaciones;
  if (!state.eventos || state.eventos.length === 0) state.eventos = s.eventos;
  if (!state.promos  || state.promos.length  === 0) state.promos  = s.promos;
  if (!state.comercios)     state.comercios     = s.comercios || [];
  if (!state.perfilesControlados) state.perfilesControlados = [];
  if (!state.posStock)  state.posStock  = POS_STOCK_SEED.map(d=>({...d}));
  if (!state.anuncianteSession) state.anuncianteSession = null;

  // ── purga de filas demo ya persistidas en localStorage de sesiones viejas
  // (com-1, tk-1, liq-1, anu-1, promo-001, ev-001...) — el seed() ya no las
  // crea, pero un browser que las cargó antes de este fix las sigue
  // arrastrando para siempre porque la reconciliación remota solo agrega,
  // nunca reemplaza. Corre en cada load(), es barato e idempotente: los ids
  // reales vienen de Supabase (uuid) y jamás chocan con estos literales.
  const IDS_DEMO = /^(com-\d+|tk-\d+|anu-\d+|liq-\d+|promo-\d+|ev-00[1-4])$/;
  ["comercios", "tickets", "anunciantes", "liquidaciones", "promos", "eventos"].forEach(key => {
    if (Array.isArray(state[key])) state[key] = state[key].filter(x => !IDS_DEMO.test(x.id));
  });
  // mundo-promos-rp (#139): eliminado de Supabase y ya no lo crea seed(),
  // pero una pestaña vieja con este mundo cacheado en localStorage lo
  // reintroducía a Supabase en su próxima mutación (mismo mecanismo del
  // incidente de mundo-raimondi/mundo-jockey-plaza) — se purga acá para que
  // eso no pueda volver a pasar sin importar qué versión del bundle tenga
  // abierta cada pestaña.
  if (Array.isArray(state.mundos)) state.mundos = state.mundos.filter(m => m.id !== "mundo-promos-rp");

  // ── auto-cura: la cuenta admin demo (admin@redpontis.com / demo) ya
  // quedó persistida en browsers viejos — se reemplaza por la real, igual
  // que la purga de ids demo de arriba. No se toca si ya es la real o si
  // el admin ya creó otras cuentas reales por su cuenta (signup).
  if (Array.isArray(state.users) && state.users.length === 1 && state.users[0].email === "admin@redpontis.com") {
    state.users = [{ email: "camila.duenas@redpontis.com", password: "RedpontisAdmin2026", name: "Camila Dueñas" }];
  }

  // ── auto-cura: anunciantes con esquema viejo (nombre/estado) → esquema actual (razonSocial/credenciales) ──
  // Si no hacemos esto, el localStorage que ya quedó guardado en el navegador
  // sigue corrupto para siempre y solo se arregla con "Reiniciar demo" (perdiendo todo lo demás).
  (state.anunciantes || []).forEach(a => {
    if (!a.razonSocial) a.razonSocial = a.nombre || "Anunciante sin nombre";
    if (!a.credenciales) {
      const slug = a.razonSocial.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
      a.credenciales = { usuario: `${slug}@promos.joi360.pe`, password: generarPassword() };
    }
  });

  // ── auto-cura: verticales renombradas (Centro Comercial→Retail, Club→Club Deportivo) ──
  // y giro por defecto en mundos creados antes de que existiera ese campo.
  const VERTICAL_RENAME = { "Centro Comercial": "Retail", "Club": "Club Deportivo" };
  (state.mundos || []).forEach(m => {
    if (VERTICAL_RENAME[m.vertical]) m.vertical = VERTICAL_RENAME[m.vertical];
    if (!m.giro) m.giro = (GIROS_POR_VERTICAL[m.vertical] || [])[0] || null;
  });

  // ── migra campos por mundo ──
  (state.mundos||[]).forEach(m => {
    if (!m.entrega) m.entrega = { entregado: false, credenciales: null, fechaEntrega: null };
    if (!m.sponsorConfig) m.sponsorConfig = { bienvenida: "¡Hola, {nombre}! Descubre tus beneficios exclusivos.", bannerTitulo: "", bannerActivo: false, comerciosOcultos: [] };
    // migrate fixed RP worlds to new flags
    if (m.id === "mundo-eventos-rp" && !m.redpontis) {
      m.redpontis = true;
      m.type = "eventos_rp";
      m.nombre = "JOI Eventos";
      m.eventosConfig = s.mundos.find(x=>x.id==="mundo-eventos-rp")?.eventosConfig || m.eventosConfig;
    }
    if (m.id === "mundo-promos-rp" && !m.redpontis) {
      m.redpontis = true;
      m.type = "promos_rp";
      m.nombre = "JOI Promos";
    }
    // ensure modulos array is valid
    if (!m.modulos) m.modulos = [];
    m.modulos.forEach(mod => {
      if (!mod.config) mod.config = {};
      if (!mod.serviciosActivos) mod.serviciosActivos = {};
    });
    // migra eventosConfig del esquema viejo (modos[] elegido a mano) al nuevo
    // (el B2B/B2C se deriva del tipo de mundo, solo "embebido" queda como toggle)
    if (m.eventosConfig && Array.isArray(m.eventosConfig.modos)) {
      const { modos, allowUserOrganizer, requireAprobacionRP, entidadLegalRequerida, ...rest } = m.eventosConfig;
      m.eventosConfig = { ...rest, embebidoActivo: modos.includes("embebido") };
    }
    // 30-jul: B2B/B2C pasa de derivarse solo del tipo de mundo a ser una
    // elección explícita (modoEventos), porque ambos NO deben poder coexistir
    // con Embebido a la vez — un mundo B2B es fundamentalmente un mundo
    // "organizador", B2C sí puede convivir con Embebido. Mundos ya
    // configurados con Eventos reciben el default que ya tenían en la
    // práctica (preserva el comportamiento actual de Raimondi/Kermesse y de
    // los mundos fijos RP), pero ahora queda guardado explícito y editable.
    if (m.eventosConfig && !m.eventosConfig.modoEventos) {
      m.eventosConfig.modoEventos = m.type === "eventos_rp" ? "b2c" : "b2b";
    }
  });

  return state;
}

function persist() {
  state = { ...state }; // nueva identidad → re-render en frentes suscritos
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("joi360:update"));
}

export function getState() { return load(); }

export function update(fn) {
  load();
  fn(state);
  persist();
  // Fase 0 — Render Engine en vivo: cada mutación del admin se sincroniza
  // (debounced) a Supabase, la fuente única que lee la superapp.
  scheduleSync(() => (load().mundos || []));
}

// Ya no hay "demo" que reiniciar (el pipeline es push+deploy a producción) —
// esto queda solo como recuperación ante estado local corrupto (ver
// ErrorBoundary): descarta la caché local y vuelve a poblarse en vivo desde
// Supabase, no reintroduce data de ejemplo (seed() ya no la tiene).
export function reiniciarCacheLocal() {
  state = seed();
  persist();
  scheduleSync(() => (load().mundos || []));
}

export function subscribe(cb) {
  const h = () => cb(load());
  window.addEventListener("joi360:update", h);
  return () => window.removeEventListener("joi360:update", h);
}

// --- Helpers de dominio ---
export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

// Mundos creados directo en Supabase (u otro browser/sesión admin) eran
// invisibles aquí — el admin solo escribía, nunca releía "worlds". Solo
// AGREGA/actualiza campos de plataforma; nunca borra mundos locales aún no
// sincronizados (el admin sigue siendo la fuente de escritura, no Supabase).
export async function refreshMundosLive() {
  let rows, capRows, flagRows;
  try {
    [rows, capRows, flagRows] = await Promise.all([
      fetchWorldsLive(), fetchAllCapacityConfigs(), fetchAllFeatureFlags(),
    ]);
  } catch (e) { console.warn("[mundos-live]", e); return; }
  if (!rows || !rows.length) return;

  // world_capacity_configs + world_feature_flags → modulos[] (solo para mundos
  // NUEVOS: uno ya existente localmente conserva su config, puede tener
  // ediciones locales aún no sincronizadas que no queremos pisar).
  const capsByWorld = new Map();
  for (const c of capRows || []) {
    if (!capsByWorld.has(c.world_id)) capsByWorld.set(c.world_id, []);
    capsByWorld.get(c.world_id).push(c);
  }
  const serviciosPorCapacidad = new Map(); // `${world_id}:${capacity_id}` → {code: enabled}
  for (const f of flagRows || []) {
    const cff = f.capacity_feature_flags;
    if (!cff) continue;
    const key = `${f.world_id}:${cff.capacity_id}`;
    if (!serviciosPorCapacidad.has(key)) serviciosPorCapacidad.set(key, {});
    serviciosPorCapacidad.get(key)[cff.flag_code] = f.enabled;
  }
  const modulosDe = worldId => (capsByWorld.get(worldId) || []).map(c => ({
    id: c.capacity_id, enabled: c.enabled !== false, config: c.config || {},
    serviciosActivos: serviciosPorCapacidad.get(`${worldId}:${c.capacity_id}`) || {},
  }));

  // El modelo del Motor de Eventos se reconstruye desde Supabase, no se hereda
  // de lo que tuviera esta pestaña.
  //
  // Se escribía a la base pero nunca se leía de vuelta, y con varias pestañas
  // del admin abiertas cada una guardaba su propia copia en memoria: la última
  // en sincronizar pisaba a las demás. Así se perdió una configuración real —
  // un mundo pasado a B2C+Embebido volvió solo a B2B minutos después, porque
  // otra pestaña con el estado viejo sincronizó encima.
  const eventosConfigDe = worldId => {
    const cap = (capsByWorld.get(worldId) || []).find(c => c.capacity_id === "eventos");
    const cfg = cap?.config;
    if (!cfg?.modoEventos) return undefined; // nunca sincronizado: no se inventa
    return {
      modoEventos: cfg.modoEventos,
      embebidoActivo: cfg.modoEventos === "b2b" ? false : !!cfg.embebidoActivo,
      modeloComisionEventos: cfg.modeloComisionEventos || "transaccional",
      ...(cfg.comisionEntrada != null ? { comisionEntrada: cfg.comisionEntrada } : {}),
      ...(cfg.comisionFijaMensual != null ? { comisionFijaMensual: cfg.comisionFijaMensual } : {}),
      ...(cfg.monetizacion != null ? { monetizacion: cfg.monetizacion } : {}),
    };
  };

  update(st => {
    if (!st.mundos) st.mundos = [];
    const byId = new Map(st.mundos.map(m => [m.id, m]));
    for (const w of rows) {
      const patch = {
        id: w.id, nombre: w.name, codigo: w.code, vertical: w.vertical,
        color: w.color_primary || "#0035b9", moneda: w.currency || "PEN",
        estado: (w.status || "activo").toUpperCase(),
        posPin: w.pos_pin || null,
      };
      const base = byId.get(w.id);
      if (base) {
        Object.assign(base, patch);
        // Mundo ya reconciliado antes con modulos vacíos (capacity_configs no
        // existían todavía en ese momento) — reintenta el backfill.
        if (!(base.modulos || []).length) base.modulos = modulosDe(w.id);
        // La base manda sobre lo que tuviera esta pestaña en memoria.
        const ec = eventosConfigDe(w.id);
        if (ec) base.eventosConfig = ec;
        // El acuerdo no tiene UI de auto-edición (a propósito, ver TabAcuerdo)
        // así que no hay nada local que este merge pueda pisar — si Supabase
        // ya tiene uno real y esta pestaña no, se adopta. `!base.acuerdo` no
        // alcanza: acuerdo:{} es truthy (el mismo bug de siempre) y quedaba
        // sin sanar en sesiones viejas que ya tenían ese objeto vacío.
        if (!base.acuerdo?.tipo && w.acuerdo?.tipo) base.acuerdo = w.acuerdo;
      }
      else st.mundos.push({
        ...patch, fixed: false, redpontis: false, type: "standard",
        descripcion: `Comunidad ${w.name} · vertical ${w.vertical}.`,
        modulos: modulosDe(w.id),
        entrega: { entregado: false, credenciales: null, fechaEntrega: null },
        sponsorConfig: { bienvenida: `¡Hola, {nombre}! Bienvenido al ecosistema ${w.name}.`, bannerTitulo: "", bannerActivo: false, comerciosOcultos: [] },
        eventosConfig: eventosConfigDe(w.id) || null,
        // acuerdo va en null y no en {}: generarLiquidacionMundo hace
        // `m.acuerdo || {tipo:"transaccional", revShare:5}`, y un objeto vacío
        // es truthy, así que el fallback no aplicaba y `acuerdo.tipo` quedaba
        // undefined. Ninguna rama del cálculo coincidía y la comisión salía 0
        // en silencio para todo mundo llegado por reconciliación.
        acuerdo: w.acuerdo || null,
        createdAt: Date.parse(w.created_at) || Date.now(),
      });
    }
    // Poda: un mundo borrado de verdad en Supabase (por otra pestaña, u otro
    // admin) se quedaba fantasma para siempre en este browser — mismo defecto
    // que ya causó que 2 mundos demo reaparecieran hoy tras un borrado. Solo
    // se llega aquí con `rows` ya confirmado no-vacío (guard de arriba), así
    // que nunca se poda por un fetch fallido; `fixed` (plataforma RP) nunca
    // se poda de todas formas, por las dudas.
    const idsRemotos = new Set(rows.map(w => w.id));
    st.mundos = st.mundos.filter(m => m.fixed || idsRemotos.has(m.id));
  });
}

// Eventos creados directo en Supabase (u otro browser/sesión admin) eran
// invisibles en OrganizadorFront — mismo gap que refreshMundosLive(). Solo
// AGREGA eventos remotos ausentes; nunca pisa uno que ya exista localmente
// (podría tener ediciones locales aún no sincronizadas).
export async function refreshEventosLive(worldId) {
  let rows;
  try { rows = await fetchEventosDeMundo(worldId); } catch (e) { console.warn("[eventos-live]", e); return; }
  if (!rows || !rows.length) return;
  const localIds = new Set((load().eventos || []).map(e => e.id));
  const faltantes = rows.filter(r => !localIds.has(r.id));
  if (!faltantes.length) return;

  const nuevos = [];
  for (const r of faltantes) {
    let tiposEntrada = [];
    try {
      const [tipos, tickets] = await Promise.all([fetchTicketTypesDeEvento(r.id), fetchTicketsDeEvento(r.id)]);
      const vendidasPorTipo = new Map();
      for (const t of tickets || []) if (t.estado !== "anulado") vendidasPorTipo.set(t.ticket_type_id, (vendidasPorTipo.get(t.ticket_type_id) || 0) + 1);
      tiposEntrada = (tipos || []).map(t => ({
        supabaseId: t.id, nombre: t.nombre, descripcion: t.descripcion, precio: t.precio,
        cupos: t.cupos, minPorCompra: t.min_por_compra, maxPorCompra: t.max_por_compra,
        ventaDesde: t.venta_desde, ventaHasta: t.venta_hasta, vendidas: vendidasPorTipo.get(t.id) || 0,
      }));
    } catch (e) { console.warn("[eventos-live] tipos/tickets", r.id, e); }

    nuevos.push({
      id: r.id, mundoId: r.world_id, nombre: r.titulo, descripcion: r.descripcion,
      fecha: r.fecha, hora: r.hora, lugar: r.lugar, aforo: r.aforo_total || 0, aforoTipo: r.aforo_tipo || "general",
      privado: r.privado === true, estado: r.estado || "PUBLICADO",
      tipoEvento: r.tipo || "kermesse", categoria: r.categoria || null,
      organizador: r.organizador || null, moneda: r.moneda || "PEN",
      modo: r.modo || "embebido", organizadorId: r.organizador_id || null,
      imagenUrl: r.imagen_url || "",
      mapaUrl: r.mapa_url || null,
      mapaNombre: r.mapa_nombre || null,
      uxComponents: r.ux_components || ["hero", "entradas", "agenda", "marketplace"],
      tiposEntrada, createdAt: Date.parse(r.created_at) || Date.now(),
    });
  }
  update(st => { if (!st.eventos) st.eventos = []; st.eventos.push(...nuevos); });
}

export function getMundo(id) { return (load().mundos||[]).find(m => m.id === id); }
export function comerciosDe(mundoId) { return load().comercios.filter(c => c.mundoId === mundoId); }
export function eventosDe(mundoId) { return load().eventos.filter(e => e.mundoId === mundoId); }
export function promosDe(mundoId) { return load().promos.filter(p => p.mundoId === mundoId); }

export function promoVigente(p) {
  const today = new Date().toISOString().slice(0, 10);
  return p.desde <= today && today <= p.hasta;
}

export function moduleCat(id) { return MODULE_CATALOG.find(m => m.id === id); }

// Antes solo se reconciliaban comercios al abrir el detalle de un mundo
// (reconciliarComerciosMundo, en MundoDetail.jsx) — así el KPI "Comercios en
// ecosistema" del Dashboard solo contaba lo que ese browser ya había
// visitado. Recorre TODOS los mundos reales al abrir la app, mismo patrón
// que refreshMundosLive/reconciliarLiquidacionesRemoto.
export async function reconciliarComerciosGlobal() {
  const mundos = (load().mundos || []).filter(m => !m.redpontis);
  for (const m of mundos) {
    let nuevos;
    try { nuevos = await reconciliarComerciosMundo(m.id, load().comercios); } catch { continue; }
    if (nuevos && nuevos.length) update(st => { st.comercios = [...(st.comercios || []), ...nuevos]; });
  }
}

// ── Dependency Map between capacidades ────────────────────────────────────────
// key: module ID, value: array of module IDs that MUST be active first
// Módulos fuera de alcance — definición canónica en supabase.js (este archivo
// importa de ahí; re-export para que los componentes sigan importando de store).
export { MODULOS_PROXIMAMENTE } from "./supabase.js";

export const DEPENDENCY_MAP = {
  loyalty:        ["wallet"],
  cashback:       ["wallet", "comercios"],
  consumos:       ["wallet", "comercios"],
  inventario:     ["comercios"],
  facturacion:    ["comercios", "consumos"],
  menu:           ["inventario"],
  subsidio:       ["wallet"],
  credito:        ["wallet"],
  // Crédito quedó fuera del alcance del caso Mok — BNPL solo depende de Wallet
  // y Comercios (doc: "BNPL y Motor de Eventos requieren, para operar
  // correctamente, que Wallet y Comercios también estén habilitados").
  bnpl:           ["wallet", "comercios"],
  eventos:        ["wallet", "comercios"],
  estacionamiento:["accesos", "wallet"],
  transporte:     ["wallet"],
  control:        ["wallet"],
  asistencia:     ["accesos"],
  reservas:       ["wallet"],
  turnos:         ["wallet"],
};

// ── Eventos & Promos helpers ──────────────────────────────────────────────
export function getEventos(mundoId) {
  const st = getState();
  return (st.eventos || []).filter(e => !mundoId || e.mundoId === mundoId);
}
export function addEvento(evento) {
  const st = getState();
  const nuevos = [{ ...evento, id: `ev-${Date.now()}`, createdAt: Date.now() }, ...(st.eventos || [])];
  update(s => { s.eventos = nuevos; });
}
export function updateEvento(id, patch) {
  update(s => { const i = (s.eventos||[]).findIndex(e=>e.id===id); if(i>=0) s.eventos[i]={...s.eventos[i],...patch}; });
}
export function getPromos(mundoId) {
  const st = getState();
  return (st.promos || []).filter(p => !mundoId || p.mundoId === mundoId);
}

// --- Auth ---
// Sin alta de cuenta propia: solo se ingresa con credenciales asignadas
// por RedPontis (ver users en seed()).
export function login(email, password) {
  const s = load();
  const u = s.users.find(u => u.email === email && u.password === password);
  if (!u) return null;
  update(st => { st.session = { email: u.email, name: u.name }; });
  return u;
}
export function logout() { update(st => { st.session = null; }); }
export function session() { return load().session; }

// --- Entrega del Dashboard de Mundo ---
// ════════════════════════════════════════════════════════════════════
// DEV STATUS por Feature Flag — sistema de 2 niveles
// Nivel 1 (Catálogo Global): RedPontis DEFINE el estado de desarrollo de
//   cada flag y su endpoint backend (EcoreGateway o desarrollo propio).
// Nivel 2 (Config por Mundo): el Admin Mundo solo puede ACTIVAR flags
//   cuyo dev_status sea "ready". Los demás se muestran bloqueados.
// Estados: ready | in_progress | planned
// api: endpoint de EcoreGateway si es de MEDIO DE PAGO; "propio" si es
//   desarrollo interno RedPontis; null si aún no está definido.
// ════════════════════════════════════════════════════════════════════
export const FLAG_DEV_MAP = {
  // ── Wallet (medios de pago → EcoreGateway) ──
  "wallet:balance":        { status: "ready",       api: "GET /v2/wallet/customer" },
  "wallet:recarga":        { status: "ready",       api: "POST /memberships/{id}/system-recharge" },
  "wallet:p2p":            { status: "ready",       api: "POST /v2/wallet/customer/memberships/transfer" },
  "wallet:bandita":        { status: "ready",       api: "GET /merchants/session/{tag_id}" },
  "wallet:subwallet":      { status: "ready",       api: "propio" },
  "wallet:notifs":         { status: "planned",     api: "propio" },
  // ── Comercios (adquirencia → EcoreGateway) ──
  "comercios:registro":    { status: "ready",       api: "propio" },
  "comercios:plataforma":  { status: "ready",       api: "propio" },
  "comercios:pos":         { status: "ready",       api: "POST /merchants/{id}/sale" },
  "comercios:liquidacion": { status: "ready",       api: "GET /merchants/{id}/settlements" },
  "comercios:reportes":    { status: "ready",       api: "GET /merchants/{id}/sales/summary" },
  // ── Compras y Transacciones (flujo de venta → EcoreGateway) ──
  "consumos:venta_pos":    { status: "ready",       api: "POST /merchants/{id}/pre-sale → sale → confirm-sale · void" },
  "consumos:compra_app":   { status: "ready",       api: "POST /v2/auctions/payment-sessions/{id}/pay" },
  "consumos:historial":    { status: "ready",       api: "GET /v2/wallet/customer" },
  "consumos:conciliacion": { status: "ready",       api: "GET /sponsors/settlements" },
  // ── BNPL (Caso Mok) — sin endpoint EcoreGateway documentado: se usa un stub
  //    que respeta el contrato request/response de Culqi/Qubit (doc §3.2).
  //    Marcado "ready" al cierre del checklist del Caso 1; simulado para demo.
  "bnpl:elegibilidad":     { status: "ready",       api: "stub · contrato Culqi/Qubit (simulado demo)" },
  "bnpl:limites":          { status: "ready",       api: "propio" },
  "bnpl:programa":         { status: "ready",       api: "propio" },
  "bnpl:contratos":        { status: "ready",       api: "stub · contrato Culqi/Qubit (simulado demo)" },
  // ── Motor de Eventos (Caso Kermesse) ──
  "eventos:aforo":         { status: "ready",       api: "propio · tabla events/event_tickets (Supabase)" },
  "eventos:ticketing":     { status: "ready",       api: "propio · event_ticket_types (Supabase)" },
  "eventos:crear":         { status: "ready",       api: "propio · wizard de creación (portada, mapa, merchants, preventa)" },
  "eventos:entradas":      { status: "ready",       api: "propio · event_ticket_types (Supabase)" },
  "eventos:monitoreo":     { status: "ready",       api: "propio · OrganizadorFront (polling 6s, aforo + asistencia)" },
  "eventos:taq_qr":        { status: "ready",       api: "propio · EntradaScreen POS nativo" },
  "eventos:preventa":      { status: "ready",       api: "propio · compra anticipada + pickup" },

  // ── Auditoría #123 (04-ago): estos 4 módulos estaban activos en mundos
  // reales pero sin ninguna entrada acá — sus toggles individuales quedaban
  // deshabilitados por default (tier PREMIUM/OPCIONAL → "planned"), aunque
  // la funcionalidad real ya existía. Cada línea de abajo se verificó contra
  // el código real antes de marcarla "ready" — lo que no se pudo confirmar
  // (aprobación de padre en tiempo real, bloqueo por horario, zonas que
  // restringen paso, reportería de ventas por producto, validar entrega de
  // menú en POS) se dejó fuera a propósito: son banners informativos o datos
  // que se registran pero no se hacen cumplir todavía.
  "inventario:subir_productos":  { status: "ready", api: "propio · upsertProductRemote" },
  "inventario:subir_stock":      { status: "ready", api: "propio · products.stock, decrementado en cada venta" },
  "inventario:venta_pos":        { status: "ready", api: "propio · POS Cobrar por producto" },
  "inventario:detalle_consumos": { status: "ready", api: "propio · transactions.reference con detalle de ítems" },

  "perfil_ext:tipo_sangre":         { status: "ready", api: "propio · user_profiles.tipo_sangre" },
  "perfil_ext:alergias":            { status: "ready", api: "propio · user_profiles.alergias" },
  "perfil_ext:clinica":             { status: "ready", api: "propio · user_profiles.clinica" },
  "perfil_ext:contacto_emergencia": { status: "ready", api: "propio · user_profiles.contacto_emergencia_*" },

  "accesos:identificacion": { status: "ready", api: "propio · bandita NFC / QR / DNI en el POS" },
  "accesos:consulta_pos":   { status: "ready", api: "propio · ficha del titular en el POS" },
  "accesos:registro_tipo":  { status: "ready", api: "propio · access_log" },

  "control:perfiles_ctrl": { status: "ready", api: "propio · dependents + P2P a wallet del dependiente" },
  "control:alertas":       { status: "ready", api: "propio · consumo_alertas (límite diario de Menú)" },

  "menu:calendario": { status: "ready", api: "propio · menu_programacion" },
  "menu:cupos":       { status: "ready", api: "propio · menu_programacion.cupos_max" },
  "menu:preorden":    { status: "ready", api: "propio · crearReservaMenu" },
  "menu:validacion_pos": { status: "ready", api: "propio · marcarMenuReservaEntregadaRemote (POS Operador → Entregar Menú)" },
};
const FLAG_TIER_DEFAULT = { CORE: "in_progress", "MOTOR BASE": "in_progress", PREMIUM: "planned", OPCIONAL: "planned", FUTURO: "planned" };

export function getFlagDev(modId, flagId) {
  const ov = getState().flagDevStatus?.[`${modId}:${flagId}`];
  if (ov) return ov;
  const base = FLAG_DEV_MAP[`${modId}:${flagId}`];
  if (base) return base;
  const mod = MODULE_CATALOG.find(m => m.id === modId);
  return { status: FLAG_TIER_DEFAULT[mod?.tier] || "planned", api: null };
}
export function setFlagDev(modId, flagId, patch) {
  update(s => {
    if (!s.flagDevStatus) s.flagDevStatus = {};
    const key = `${modId}:${flagId}`;
    s.flagDevStatus[key] = { ...getFlagDev(modId, flagId), ...patch };
  });
}
// ════════════════════════════════════════════════════════════════════
// UX COMPONENT por Feature Flag — el puente Configuración → Vista
// (campo ux_component del Schema Registry, doc §1). Declara QUÉ superficie
// de la superapp renderiza cada flag; se publica a capacity_feature_flags
// y el admin lo muestra en "Vista App" del drawer de configuración.
// ════════════════════════════════════════════════════════════════════
export const FLAG_UX_MAP = {
  "wallet:balance":        "HeroBalance · Hub (saldo en tiempo real)",
  "wallet:recarga":        "QuickAction Recargar + Pay → Recargar (canales del mundo)",
  "wallet:p2p":            "Billetera → Transferir P2P",
  "wallet:subwallet":      "Hub → acción Familia (sub-wallets)",
  "wallet:bandita":        "Pay → Bandita NFC + QuickAction",
  "wallet:notifs":         "Push en cada movimiento de saldo",
  "comercios:registro":    "Hub → fila Comercios del mundo (merchants en vivo)",
  "comercios:plataforma":  "Pay → QR · pagar en comercio",
  "comercios:pos":         "POS del comercio (panel merchant → Cobrar)",
  "comercios:liquidacion": "Panel merchant → Liquidación",
  "comercios:reportes":    "Panel merchant → Resumen del día + Ventas en vivo",
  "consumos:venta_pos":    "POS · venta y anulación",
  "consumos:compra_app":   "Pay → QR · compra desde la app",
  "consumos:historial":    "Módulo Mis Compras + Actividad",
  "consumos:conciliacion": "Liquidación diaria (backoffice)",
  "inventario:subir_productos":  "Catálogo del comercio (panel merchant)",
  "inventario:subir_stock":      "Stock por producto (panel merchant)",
  "inventario:venta_pos":        "POS → venta por producto",
  "inventario:detalle_ventas":   "Reportería de ventas por producto",
  "inventario:detalle_consumos": "Historial de consumos con detalle de productos",
  "bnpl:elegibilidad":     "Paga después → estados Elegible / Evaluando / Aprobado",
  "bnpl:limites":          "Paga después → techo de cuotas del selector (clamping)",
  "bnpl:programa":         "Paga después → productos financiables por comercio",
  "bnpl:contratos":        "Paga después → contrato digital + cronograma",
  "eventos:aforo":         "Evento → barra de aforo + bloqueo 'Agotado'",
  "eventos:ticketing":     "Evento → Ticket Selector + Mis Entradas con QR",
};
export function getFlagUx(modId, flagId) { return FLAG_UX_MAP[`${modId}:${flagId}`] || null; }

export const DEV_STATUS_META = {
  ready:       { label: "Listo",          badge: "bg-green-100 text-green-700 border-green-200" },
  in_progress: { label: "En desarrollo",  badge: "bg-amber-100 text-amber-700 border-amber-200" },
  planned:     { label: "Planificado",    badge: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function generarPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function ejecutarEntrega(mundoId, credenciales) {
  update(st => {
    const m = (st.mundos||[]).find(x => x.id === mundoId);
    const { emailEntrega, ...cred } = typeof credenciales === "object" ? credenciales : { password: credenciales };
    m.entrega = { entregado: true, credenciales: cred, emailEntrega: emailEntrega || null, fechaEntrega: Date.now() };
  });
}

export function sponsorLogin(mundoId, usuario, password) {
  const m = getMundo(mundoId);
  const c = m?.entrega?.credenciales;
  if (c && c.usuario === usuario && c.password === password) {
    update(st => { st.sponsorSession = { mundoId, usuario }; });
    return true;
  }
  return false;
}
export function sponsorLogout() { update(st => { st.sponsorSession = null; }); }

// ── Organizador B2B — login real (antes: OrganizadorFront solo aceptaba la
// sesión del Admin RP como "vista previa"; no existía identidad propia). ──
export function organizadorLogin(mundoId, usuario, password) {
  const org = (load().organizadores || []).find(o => o.mundoId === mundoId && o.credenciales?.usuario === usuario && o.credenciales?.password === password && o.estado !== "INACTIVO");
  if (org) {
    update(st => { st.organizadorSession = { mundoId, organizadorId: org.supabaseId || org.id, nombre: org.nombre }; });
    return true;
  }
  return false;
}
export function organizadorLogout() { update(st => { st.organizadorSession = null; }); }
export function organizadorSession() { return getState().organizadorSession || null; }

// --- KPIs mock deterministas por módulo/mundo ---
export function mockKpi(mundoId, modId) {
  let h = 0;
  for (const ch of mundoId + modId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = (min, max) => min + (h = (h * 1103515245 + 12345) >>> 0) % (max - min);
  return { uso: r(40, 98), txs: r(120, 4800), trend: r(0, 2) === 0 ? -r(1, 9) : r(2, 18) };
}


// ============ CATÁLOGO GLOBAL DE HARDWARE / DISPOSITIVOS ============
// ============ HARDWARE CATALOG (modelos en stock de RedPontis) ============
// Este catálogo define los MODELOS disponibles para asignar a comercios.
// Las UNIDADES FÍSICAS viven en la tabla `pos_devices` de Supabase:
//   pos_devices(id, modelo_id, serial, estado, world_id, merchant_id, assigned_at)
// Estado posible por unidad: disponible | asignado | en_reparacion | baja
// Cuando el Admin RP crea un comercio o edita uno, puede elegir un modelo de este
// catálogo y el sistema busca una unidad con estado='disponible' en stock.
export const HARDWARE_CATALOG = [
  { id:"pos_ingenico",   marca:"Ingenico",  modelo:"MOVE 5000",           tipo:"POS Físico",
    icon:"point_of_sale", desc:"Terminal inalámbrica. NFC + chip + banda. 4G/WiFi.",
    conexion:"4G/WiFi", nfc:true, precio:1200, moneda:"PEN",
    api_integration:"verifone_ingenico", // slug del módulo de integración backend
    pos_type:"physical",                  // physical | tap2phone | qr_frame
  },
  { id:"pos_verifone",   marca:"Verifone",  modelo:"V240m",               tipo:"POS Físico",
    icon:"point_of_sale", desc:"Terminal de sobremesa táctil. NFC + ticket. Ethernet/WiFi.",
    conexion:"Ethernet/WiFi", nfc:true, precio:980, moneda:"PEN",
    api_integration:"verifone_ingenico",
    pos_type:"physical",
  },
  { id:"pos_pax",        marca:"PAX",       modelo:"A920 Pro",            tipo:"POS Físico",
    icon:"point_of_sale", desc:"Android POS. Pantalla táctil 5\". NFC + QR + impresora. 4G/WiFi.",
    conexion:"4G/WiFi", nfc:true, precio:850, moneda:"PEN",
    api_integration:"pax_a9xx",
    pos_type:"physical",
  },
  { id:"tap2phone_app",  marca:"JOI 360",   modelo:"Tap2Phone App",       tipo:"Tap2Phone",
    icon:"tap_and_play", desc:"Android del merchant como POS. Requiere Android 9+ con NFC. Sin hardware adicional.",
    conexion:"App", nfc:true, precio:0, moneda:"PEN",
    api_integration:"joi_tap2phone",
    pos_type:"tap2phone",
  },
  { id:"qr_frame",       marca:"JOI 360",   modelo:"QR Frame Digital",    tipo:"QR Dinámico",
    icon:"qr_code_scanner", desc:"Pantalla en el mostrador con QR dinámico por transacción. USB.",
    conexion:"USB/WiFi", nfc:false, precio:350, moneda:"PEN",
    api_integration:"joi_qr_frame",
    pos_type:"qr_frame",
  },
  { id:"qr_estatico",    marca:"JOI 360",   modelo:"QR Estático Impreso", tipo:"QR Estático",
    icon:"qr_code", desc:"Código QR en vinilo para mostrador. Sin electricidad. Sin conexión.",
    conexion:"Ninguna", nfc:false, precio:80, moneda:"PEN",
    api_integration:null,   // no requiere integración — el QR es estático del merchant
    pos_type:"qr_static",
  },
  { id:"totem_t1",       marca:"JOI 360",   modelo:"Tótem Self-Service T1", tipo:"Tótem",
    icon:"tablet", desc:"Pantalla táctil 15\" con lector QR integrado y NFC. Autopago. WiFi.",
    conexion:"WiFi/Ethernet", nfc:true, precio:4500, moneda:"PEN",
    api_integration:"joi_totem",
    pos_type:"kiosk",
  },
  { id:"bandita_reader", marca:"JOI 360",   modelo:"Lector NFC Bandita B1", tipo:"Lector NFC",
    icon:"contactless", desc:"Lector NFC dedicado para pulseras JOI. USB/BT al POS o tótem.",
    conexion:"USB/Bluetooth", nfc:true, precio:280, moneda:"PEN",
    api_integration:"joi_nfc_reader",
    pos_type:"nfc_reader",
  },
];

// Helpers para el catálogo de hardware
export function hardwareModelById(id) { return HARDWARE_CATALOG.find(h=>h.id===id); }

// Seed de unidades de ejemplo (POS en stock de RedPontis)
// En Supabase esto vive en pos_devices — aquí es solo el estado de demostración.
export const POS_STOCK_SEED = [
  { id:"dev-001", modelo_id:"pos_ingenico",  serial:"ING-MV5K-001", estado:"disponible",  world_id:null, merchant_id:null },
  { id:"dev-002", modelo_id:"pos_ingenico",  serial:"ING-MV5K-002", estado:"asignado",    world_id:"mundo-raimondi", merchant_id:"com-1" },
  { id:"dev-003", modelo_id:"pos_verifone",  serial:"VFN-V240-001", estado:"disponible",  world_id:null, merchant_id:null },
  { id:"dev-004", modelo_id:"pos_pax",       serial:"PAX-A920-001", estado:"disponible",  world_id:null, merchant_id:null },
  { id:"dev-005", modelo_id:"pos_pax",       serial:"PAX-A920-002", estado:"en_reparacion",world_id:null, merchant_id:null },
  { id:"dev-006", modelo_id:"qr_frame",      serial:"JOI-QRF-001",  estado:"disponible",  world_id:null, merchant_id:null },
  { id:"dev-007", modelo_id:"totem_t1",      serial:"JOI-TMT-001",  estado:"asignado",    world_id:"mundo-raimondi", merchant_id:null },
];

export function listPosStock() { return getState().posStock || POS_STOCK_SEED; }
export function posDisponibles(modelo_id) {
  return listPosStock().filter(d=>d.modelo_id===modelo_id && d.estado==="disponible");
}
export function asignarPos(deviceId, worldId, merchantId) {
  update(s=>{
    if(!s.posStock) s.posStock = [...POS_STOCK_SEED];
    const d=s.posStock.find(x=>x.id===deviceId);
    if(d){ d.estado="asignado"; d.world_id=worldId; d.merchant_id=merchantId; d.assigned_at=Date.now(); }
  });
  // Caller should call notify() after this
}
export function liberarPos(deviceId) {
  update(s=>{
    if(!s.posStock) s.posStock = [...POS_STOCK_SEED];
    const d=s.posStock.find(x=>x.id===deviceId);
    if(d){ d.estado="disponible"; d.world_id=null; d.merchant_id=null; d.assigned_at=null; }
  });
}


// ============ CATÁLOGO GLOBAL DE RUBROS (Sheet 06) ============
// Aparece como SELECT al crear un merchant. Se filtra por la vertical del mundo
// + "Multi" (rubros que aplican a cualquier vertical) + "Otro" como fallback siempre visible.
export const RUBRO_CATALOG = [
  { id: "restaurante",      nombre: "Restaurantes y Cafeterías",          verticales: ["Multi"] },
  { id: "retail_moda",      nombre: "Retail — Ropa y Moda",               verticales: ["Retail", "Multi"] },
  { id: "retail_tech",      nombre: "Retail — Tecnología / Electrónica",  verticales: ["Retail", "Multi"] },
  { id: "supermercado",     nombre: "Supermercado / Minimarket",          verticales: ["Multi"] },
  { id: "salud",            nombre: "Salud y Farmacia",                  verticales: ["Salud", "Multi"] },
  { id: "belleza",          nombre: "Belleza y Bienestar",                verticales: ["Multi"] },
  { id: "entretenimiento",  nombre: "Entretenimiento",                    verticales: ["Entretenimiento", "Retail", "Multi"] },
  { id: "academia",         nombre: "Educación / Academia",               verticales: ["Educación"] },
  { id: "deportes",         nombre: "Deportes y Recreación",              verticales: ["Club Deportivo", "Multi"] },
  { id: "corporativo",      nombre: "Servicios Corporativos",             verticales: ["Empresa"] },
  { id: "hospedaje",        nombre: "Hospedaje / Turismo",                verticales: ["Hospitalidad", "Multi"] },
  { id: "food_court",       nombre: "Gastronomía Rápida (Food Court)",    verticales: ["Retail", "Multi"] },
  { id: "parking",          nombre: "Servicio de Parking",                verticales: ["Multi"] },
  { id: "libreria",         nombre: "Librería / Papelería",               verticales: ["Educación", "Multi"] },
  { id: "bar",              nombre: "Bar / Nightlife",                    verticales: ["Entretenimiento", "Multi"] },
  { id: "conveniencia",     nombre: "Tienda de Conveniencia",             verticales: ["Multi"] },
  { id: "vecinal",          nombre: "Comunidad / Vecinal",                verticales: ["Comunidad"] },
  { id: "otro",             nombre: "Otro / No especificado",             verticales: ["Multi"] },
];

// Devuelve los rubros aplicables a la vertical del mundo (los suyos + los "Multi"), "Otro" siempre al final.
export function rubrosDeVertical(vertical) {
  const especificos = RUBRO_CATALOG.filter(r => r.id !== "otro" && r.verticales.includes(vertical));
  const multi = RUBRO_CATALOG.filter(r => r.id !== "otro" && r.verticales.includes("Multi") && !r.verticales.includes(vertical));
  const otro = RUBRO_CATALOG.filter(r => r.id === "otro");
  return [...especificos, ...multi, ...otro];
}

// Resuelve el nombre a mostrar de un rubro. Si es un id del catálogo, devuelve su nombre.
// Si es texto libre legado (de antes del catálogo global), lo muestra tal cual sin crashear.
export function rubroNombre(value) {
  const found = RUBRO_CATALOG.find(r => r.id === value);
  return found ? found.nombre : (value || "—");
}

// "Familiares vinculados" / "Titular" son términos genéricos que no calzan
// en un colegio (donde la cuenta principal es un "Tutor" y el dependiente un
// "Alumno") — el vertical del mundo decide el vocabulario correcto en vez de
// forzar un solo nombre para todos los rubros.
export function nomenclaturaFamiliar(vertical) {
  if (vertical === "Educación") {
    return { principal: "Tutor", dependiente: "Alumno", tituloSeccion: "Tutores y alumnos vinculados" };
  }
  return { principal: "Cuenta principal", dependiente: "Cuenta dependiente", tituloSeccion: "Cuentas vinculadas" };
}


// ============ PSP / PROVEEDORES DE PAGO (catálogo global) ============
// Separamos el PROVEEDOR del CANAL. Un canal (ej. "billetera_digital/yape")
// apunta a un PSP que define cómo se conecta en backend.
// api_ready: false = pendiente de integración oficial.
// checkout_type: qr | form | manual
// Reducido a los 2 PSP reales del alcance actual (30-jul): QR genérico
// (Ligo agrega Yape/Plin/BIM por estándar ASBANC — no es un QR específico de
// una billetera) y Culqi. Ninguno tiene todavía convenio comercial firmado
// con RedPontis, así que ambos quedan marcados como pendientes de
// integración (api_ready:false) hasta que exista un convenio real, aunque
// Culqi ya funcione técnicamente en este ambiente de pruebas.
// Antes había 6 entradas: BCP/Yape y BBVA/Plin quedaron redundantes con el
// canal de QR ya unificado (mismo id "ligo" que ese canal usa); Qubit y
// Niubiz eran placeholders sin convenio ni fecha real — no forman parte del
// roadmap actual, se retiran del catálogo hasta que haya integración real.
export const PSP_PROVIDERS = [
  { id:"ligo",      nombre:"QR", categoria:"billetera_digital",
    api_slug:"ligo",   api_ready:false, checkout_type:"qr",
    api_endpoint:null,  // pendiente convenio Ligo
    logo_icon:"qr_code_2", color:"#EC4899",
    desc:"QR genérico interoperable (estándar ASBANC vía Ligo): un solo código aceptado por cualquier billetera — Yape, Plin y demás. Pendiente de integración." },
  { id:"culqi",     nombre:"Culqi",             categoria:"pasarela_pago",
    api_slug:"culqi",  api_ready:false,  checkout_type:"form",
    api_endpoint:"https://api.culqi.com/v2",
    logo_icon:"credit_card", color:"#10B981",
    desc:"Pasarela peruana. Visa / Mastercard, checkout embebido vía Culqi.js. Pendiente de convenio comercial firmado." },
];

// ============ CANALES DE EMISIÓN (recargas / top-up de wallet) ============
// Estructurados por CATEGORÍA, cada uno apunta a un psp_id del catálogo PSP_PROVIDERS.
// checkout_type define cómo la app renderiza este canal:
//   "qr"    → muestra logo + texto, el QR lo genera el backend al iniciar la recarga
//   "form"  → renderiza botón "Pagar con tarjeta" que abre el checkout del PSP
//   "manual"→ flujo informativo, sin UI transaccional en app
export const CANALES_EMISION = [
  // ── QR INTEROPERABLE (un solo canal, PSP configurable) ────────────
  // Antes: "Yape" y "Plin" eran 2 canales separados, cada uno atado a un
  // convenio bancario propio (BCP / BBVA). Unificados: un solo QR que
  // cualquier billetera puede escanear — el proveedor (Ligo agrega todas
  // las redes vía estándar ASBANC; Culqi como alternativa) es elegible
  // desde este mismo canal, sin duplicar configuración por billetera.
  { id:"qr_billetera", categoria:"billetera_digital", nombre:"QR", icon:"qr_code_2", disponible:true,
    psp_id:"ligo",  checkout_type:"qr",
    montoMin:1, montoMax:2000,  comisionPSP:0,    comisionTarget:"plataforma",
    tiempoAcreditacion:"Inmediato", horarioGlobal:"00:00-23:59", monedas:["PEN"],
    desc:"QR genérico interoperable: un solo código aceptado por cualquier billetera (Yape, Plin y demás), vía Ligo (agrega todas las redes por estándar ASBANC). Canal separado de 'Tarjeta (Culqi)'. Pendiente de integración (requiere convenio Ligo)." },

  // ── PASARELAS DE PAGO (checkout embebido en app) ──────────────────
  { id:"culqi",   categoria:"pasarela_pago",    nombre:"Tarjeta (Culqi)",  icon:"credit_card", disponible:true,
    psp_id:"culqi",     checkout_type:"form",
    montoMin:5, montoMax:10000, comisionPSP:2.99, comisionTarget:"sponsor",
    tiempoAcreditacion:"1-2 min", horarioGlobal:"00:00-23:59", monedas:["PEN","USD"],
    desc:"Visa / Mastercard vía Culqi. Checkout form embebido. Comisión PSP trasladada al sponsor." },
  // ── TRANSFERENCIA BANCARIA (corporativo / case-by-case) ───────────
  { id:"transfer", categoria:"transferencia", nombre:"Transferencia bancaria", icon:"account_balance", disponible:false,
    psp_id:null, checkout_type:"manual",
    montoMin:20, montoMax:50000, comisionPSP:0, comisionTarget:"plataforma",
    tiempoAcreditacion:"1-2 horas", horarioGlobal:"08:00-18:00", monedas:["PEN","USD"],
    desc:"CCI interbancaria. Solo para mundos corporativos de alto volumen. Activación manual por Admin RP." },
];

// Helpers para la UI y la app
export const CATEGORIAS_EMISION = [
  { id:"billetera_digital", label:"Billeteras digitales", icon:"smartphone",   color:"bg-violet-50 border-violet-200 text-violet-700" },
  { id:"pasarela_pago",     label:"Pasarela de pago",     icon:"credit_card",  color:"bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id:"transferencia",     label:"Transferencia",         icon:"account_balance", color:"bg-gray-50 border-gray-200 text-gray-600" },
];
export function canalesPorCategoria(canales) {
  return CATEGORIAS_EMISION.map(cat => ({
    ...cat,
    canales: canales.filter(ch => ch.categoria === cat.id),
  })).filter(cat => cat.canales.length > 0);
}


// ============ CANALES DE ADQUIRENCIA (medios de pago en comercio) ============
export const CANALES_ADQUIRENCIA = [
  { id:"pos_fisico",    nombre:"POS Físico",          tipo:"Terminal",   icon:"point_of_sale",    disponible:true,
    proveedor:"Ingenico / Verifone", costoUnitario:0, modoArrendamiento:"Comodato",
    requiereConexion:true, aceptaNFC:true, aceptaChip:true, aceptaBanda:true,
    desc:"Terminal físico con NFC, chip y banda. Incluye QR siempre activo y, si el mundo tiene pulseras NFC habilitadas (Wallet → Habilitar Medios), lector de bandita NFC — no son canales aparte." },
  { id:"app_operador",  nombre:"App Operador",        tipo:"App POS",    icon:"tap_and_play",     disponible:true,
    proveedor:"JOI 360 App", costoUnitario:0, modoArrendamiento:"App gratuita",
    requiereConexion:true, aceptaNFC:true, aceptaChip:false, aceptaBanda:false,
    desc:"Android del operador del comercio como POS. Requiere Android 9+ con NFC. Sin hardware adicional." },
  { id:"qr_estatico",   nombre:"QR Estático",         tipo:"QR",         icon:"qr_code",          disponible:true,
    proveedor:"JOI 360", costoUnitario:0, modoArrendamiento:"Sticker impreso",
    requiereConexion:false, aceptaNFC:false,
    desc:"QR impreso en vinilo. Un código fijo por comercio. Sin conexión a internet requerida." },
  // Tap2Phone real (cobrar tarjetas físicas — Visa/Mastercard contactless —
  // tocando el celular del operador, sin terminal aparte) todavía no existe
  // como funcionalidad: requiere una integración de adquirencia certificada
  // (Visa/Mastercard Tap to Phone) que no está construida. Queda listado y
  // configurable — mismo patrón que "Transferencia bancaria" — pero
  // "Próximamente" hasta tener ese convenio. No confundir con "App Operador":
  // ese canal ya es real hoy (el celular del comercio como POS vía JOI 360
  // App, cobrando a la wallet JOI, no tarjetas físicas).
  { id:"tap2phone",     nombre:"Tap2Phone (tarjetas)", tipo:"App POS",    icon:"contactless",      disponible:false,
    proveedor:"Por definir (Visa/Mastercard Tap to Phone)", costoUnitario:0, modoArrendamiento:"App gratuita",
    requiereConexion:true, aceptaNFC:true, aceptaChip:false, aceptaBanda:false,
    desc:"Cobrar tarjetas físicas contactless tocando el celular del operador, sin terminal aparte. Requiere convenio de adquirencia certificado — pendiente de integración." },
];

// ============ CATÁLOGO GLOBAL DE REDES DE PAGO ============
export const REDES_PAGO = [
  { id: "visa", nombre: "Visa", categoria: "Tarjetas", activo: true },
  { id: "mc", nombre: "Mastercard", categoria: "Tarjetas", activo: true },
  { id: "amex", nombre: "American Express", categoria: "Tarjetas", activo: false },
  { id: "diners", nombre: "Diners Club", categoria: "Tarjetas", activo: false },
  { id: "joi_wallet", nombre: "JOI Wallet (nativo)", categoria: "Billetera JOI", activo: true },
  { id: "joi_bandita", nombre: "Bandita NFC JOI 360", categoria: "Billetera JOI", activo: true },
  { id: "yape", nombre: "Yape", categoria: "Billeteras PE", activo: true },
  { id: "plin", nombre: "Plin", categoria: "Billeteras PE", activo: true },
  { id: "lukita", nombre: "Lukita", categoria: "Billeteras PE", activo: false },
  { id: "transfer_bcp", nombre: "Transferencia BCP", categoria: "Banca directa", activo: false },
  { id: "transfer_bbva", nombre: "Transferencia BBVA", categoria: "Banca directa", activo: false },
  { id: "transfer_ibk", nombre: "Transferencia Interbank", categoria: "Banca directa", activo: false },
  { id: "cash", nombre: "Efectivo (Cash-in agente)", categoria: "Efectivo", activo: false },
  { id: "qr_bim", nombre: "QR BIM / Interoperabilidad", categoria: "QR interoperable", activo: true },
];

// --- Catálogo ---
export function actualizarModuloCatalogo(id, patch) {
  // En MVP el catálogo vive en memoria por mundo; este helper actualiza overrides globales
  update(st => {
    if (!st.catalogoOverrides) st.catalogoOverrides = {};
    st.catalogoOverrides[id] = { ...(st.catalogoOverrides[id] || {}), ...patch };
  });
}
export function getModuloCatalogo(id) {
  const st = load();
  const base = MODULE_CATALOG.find(m => m.id === id);
  const override = st.catalogoOverrides?.[id] || {};
  return { ...base, ...override, pricing: { ...base.pricing, ...(override.pricing || {}) } };
}

// --- Anunciantes (sponsors de promos sueltas en mundo Promos Redpontis) ---
export function crearAnunciante(data) {
  const id = uid("anu");
  const cred = { usuario: `${data.razonSocial.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}@promos.joi360.pe`, password: generarPassword() };
  update(st => {
    st.anunciantes.push({ id, ...data, credenciales: cred, createdAt: Date.now() });
  });
  return { id, credenciales: cred };
}
export function getAnunciante(id) { return (load().anunciantes||[]).find(a => a.id === id); }
export function listAnunciantes() { return load().anunciantes; }

// Para el select del drawer de promo
export function listSponsorOptions(mundoId) {
  const st = load();
  const m = (st.mundos||[]).find(x => x.id === mundoId);
  const opts = [];
  // 1) Comercios del mundo
  (st.comercios||[]).filter(c => c.mundoId === mundoId).forEach(c => opts.push({ type: "comercio", id: c.id, label: `${c.nombre} (comercio de este mundo)` }));
  // 2) Entidades legales de otros mundos (útil para Promos Redpontis)
  (st.mundos||[]).filter(x => x.id !== mundoId).forEach(x => opts.push({ type: "entidad_mundo", id: x.id, label: `${x.entidadLegal} (entidad legal de mundo ${x.nombre})` }));
  // 3) Anunciantes ya registrados
  (st.anunciantes||[]).forEach(a => opts.push({ type: "anunciante", id: a.id, label: `${a.razonSocial} (anunciante)` }));
  return opts;
}

// --- Sesión de anunciante (panel dedicado durante vigencia de promo) ---
export function anuncianteLogin(usuario, password) {
  const a = (load().anunciantes||[]).find(x => x.credenciales?.usuario === usuario && x.credenciales?.password === password);
  if (!a) return false;
  // Debe tener al menos una promo vigente
  const tienePromoVigente = load().promos.some(p => p.anuncianteId === a.id && p.estado !== "FINALIZADA");
  if (!tienePromoVigente) return "EXPIRADO";
  update(st => { st.anuncianteSession = { anuncianteId: a.id }; });
  return true;
}
export function anuncianteLogout() { update(st => { st.anuncianteSession = null; }); }

// --- Acuerdos de mundo ---
export function actualizarAcuerdoMundo(mundoId, acuerdo) {
  update(st => {
    const m = (st.mundos||[]).find(x => x.id === mundoId);
    m.acuerdo = acuerdo;
  });
}

// --- Liquidaciones (corte diario 19:00 PE, MVP) ---
// Lee la Configuración de Liquidación y Comisiones real del mundo (Gantt
// #54 — antes generarLiquidaciones() la ignoraba por completo y aplicaba un
// corte diario a las 19:00 fijo para todos). Vive en comerciosMod.config con
// prefijo del microservicio ("liquidacion_"), mismo patrón que el resto de
// microservicios y que TabAcuerdo ya usa para modeloRecaudacion.
export function liquidacionConfigDe(m) {
  const cfg = (m.modulos || []).find(x => x.id === "comercios")?.config || {};
  return {
    modeloRecaudacion: cfg.liquidacion_modeloRecaudacion || "redpontis",
    frecuencia: cfg.liquidacion_frecuencia || "diaria",
    horaCorte: cfg.liquidacion_horaCorte || "19:00",
    montoMinimo: cfg.liquidacion_montoMinimo ?? null,
  };
}

// Un mundo con frecuencia no-diaria solo corta en su día correspondiente:
// semanal = lunes, quincenal = días 1 y 16, mensual = día 1. Evita que
// "Forzar corte ahora" genere lotes fuera de la política configurada.
function correspondeCorteHoy(frecuencia, fecha) {
  if (frecuencia === "diaria") return true;
  const d = new Date(fecha + "T12:00:00");
  if (frecuencia === "semanal") return d.getDay() === 1;
  if (frecuencia === "quincenal") return d.getDate() === 1 || d.getDate() === 16;
  if (frecuencia === "mensual") return d.getDate() === 1;
  return true;
}

// Convierte una fila real de Supabase (snake_case) al shape local que ya
// usa la UI (camelCase) — mismo shape que antes producía el simulador, para
// no tener que reescribir Liquidacion.jsx/PagesCore.jsx aparte.
function loteRemotoALocal(row, mundoNombre) {
  return {
    id: row.id,
    fecha: row.fecha,
    mundoId: row.world_id,
    mundoNombre: mundoNombre || row.world_id,
    entidadLegal: row.entidad_legal,
    volumen: +row.volumen || 0,
    txCount: row.tx_count || 0,
    tipoAcuerdo: row.tipo_acuerdo,
    revShare: row.rev_share,
    comision: +row.comision || 0,
    neto: +row.neto || 0,
    estado: row.estado,
    moneda: row.moneda || "PEN",
    cortes: row.hora_corte ? `${row.hora_corte} PE` : "",
    modeloRecaudacion: row.modelo_recaudacion,
    frecuencia: row.frecuencia,
    montoMinimo: row.monto_minimo,
    voucherUrl: row.voucher_url || null,
    voucherNombre: row.voucher_nombre || null,
    observacion: row.observacion || null,
    descuentoHardware: +row.descuento_hardware || 0,
  };
}

// Gap real cerrado 29-jul (pedido explícito de la usuaria): antes esto
// simulaba volumen/comisión con un hash determinista de world_id+fecha y el
// lote solo vivía en memoria local, nunca en Supabase — el número que se
// mostraba como "Comisión acumulada" no tenía ninguna relación con
// transacciones reales. Ahora es async: por cada mundo cuya frecuencia
// corresponde hoy, si ya existe un lote de hoy (local o remoto) lo reusa
// (idempotente); si no, suma transacciones REALES (fetchVolumenPeriodoMundo)
// desde el fin del último período liquidado (o desde la creación del mundo
// si es el primer corte) hasta ahora, aplica la MISMA lógica de negocio de
// antes (tipo de acuerdo, retención bajo monto mínimo) sobre ese volumen
// real, y persiste el lote en la tabla real `liquidaciones` (upsert
// idempotente por world_id+fecha) antes de reflejarlo en el store local.
// Extraído de generarLiquidaciones() (30-jul) para poder correr el corte de
// UN mundo solo — el dashboard del sponsor lo llama al abrir su pestaña de
// Liquidación, sin recorrer (ni tocar) el resto de mundos de la plataforma.
async function procesarLiquidacionMundo(m, today) {
  const acuerdo = m.acuerdo || { tipo: "transaccional", revShare: 5 };
  const liqCfg = liquidacionConfigDe(m);
  if (!correspondeCorteHoy(liqCfg.frecuencia, today)) return null;

  let existentes = [];
  try { existentes = await fetchLiquidacionesMundoRemote(m.id); } catch { existentes = []; }
  const yaHoy = existentes.find(l => l.fecha === today);
  if (yaHoy) return loteRemotoALocal(yaHoy, m.nombre);

  const ultimaHasta = existentes.length
    ? existentes.map(l => l.periodo_hasta).filter(Boolean).sort().slice(-1)[0]
    : (m.createdAt ? new Date(m.createdAt).toISOString() : "2020-01-01T00:00:00.000Z");
  const hastaISO = new Date().toISOString();

  let volumen = 0, txCount = 0;
  try {
    const r = await fetchVolumenPeriodoMundo(m.id, ultimaHasta, hastaISO);
    volumen = r.volumen; txCount = r.txCount;
  } catch { volumen = 0; txCount = 0; }

  let comision = 0;
  if (acuerdo.tipo === "transaccional") comision = volumen * (acuerdo.revShare / 100);
  else if (acuerdo.tipo === "mixto") comision = volumen * (acuerdo.revShare / 100) + (acuerdo.fijoMensual / 30);
  else if (acuerdo.tipo === "revenue") comision = acuerdo.fijoMensual / 30;
  else if (acuerdo.tipo === "fijo") comision = acuerdo.fijoMensual / 30;

  // Descuento por hardware: banditas asignadas al mundo bajo forma de cobro
  // "descuento de ventas" que todavía no se descontaron de ningún corte —
  // no se cobran aparte, se restan acá. Se marcan como descontadas recién
  // si el corte se guarda con éxito, para no descontar el mismo lote dos veces.
  let descuentoHardware = 0, asignacionesADescontar = [];
  try {
    asignacionesADescontar = await fetchAsignacionesPendientesDescuentoMundo(m.id);
    descuentoHardware = (asignacionesADescontar || []).reduce((a, r) => a + (Number(r.monto_total) || 0), 0);
  } catch { descuentoHardware = 0; asignacionesADescontar = []; }

  const neto = volumen - comision - descuentoHardware;
  // Monto mínimo de liquidación: si el neto a acreditar no lo alcanza, el
  // lote se genera igual (para no perder el volumen del período) pero
  // queda marcado RETENIDO en vez de PENDIENTE — no se libera hasta acumular.
  // Un neto negativo (comisión fija > volumen real del período, típico en
  // acuerdos "mixto"/"fijo" con poco tráfico) SIEMPRE queda RETENIDO,
  // exista o no un monto mínimo configurado — nunca es correcto ofrecer
  // como "pendiente de pago" un lote donde el mundo le debería a RedPontis.
  const retenido = neto < 0 || (liqCfg.montoMinimo != null && neto < liqCfg.montoMinimo);

  const lote = {
    world_id: m.id, fecha: today, entidad_legal: m.entidadLegal || null,
    volumen: Math.round(volumen * 100) / 100, tx_count: txCount,
    tipo_acuerdo: acuerdo.tipo, rev_share: acuerdo.revShare ?? null,
    comision: Math.round(comision * 100) / 100, neto: Math.round(neto * 100) / 100,
    descuento_hardware: Math.round(descuentoHardware * 100) / 100,
    estado: retenido ? "RETENIDO" : "PENDIENTE", moneda: m.moneda,
    hora_corte: liqCfg.horaCorte, modelo_recaudacion: liqCfg.modeloRecaudacion,
    frecuencia: liqCfg.frecuencia, monto_minimo: liqCfg.montoMinimo,
    periodo_desde: ultimaHasta, periodo_hasta: hastaISO,
  };
  try {
    const saved = await upsertLoteLiquidacionRemote(lote);
    if (saved && asignacionesADescontar.length) {
      await marcarAsignacionesDescontadasRemote(asignacionesADescontar.map(a => a.id)).catch(() => {});
    }
    return saved ? loteRemotoALocal(saved, m.nombre) : null;
  } catch (e) { console.warn("[liquidacion]", m.id, e); return null; }
}

export async function generarLiquidaciones() {
  const today = new Date().toISOString().slice(0, 10);
  const st = load();
  const items = [];
  for (const m of (st.mundos || [])) {
    const item = await procesarLiquidacionMundo(m, today);
    if (item) items.push(item);
  }
  update(s => {
    if (!s.liquidaciones) s.liquidaciones = [];
    const idsLocales = new Set(s.liquidaciones.map(l => l.id));
    items.filter(i => !idsLocales.has(i.id)).forEach(i => s.liquidaciones.push(i));
  });
  return items;
}

// Corte de un solo mundo, real, bajo demanda — usado por el dashboard del
// sponsor (Liquidación no es "solo lectura": cada vez que el sponsor entra a
// la pestaña, se calcula el corte vigente con transacciones reales si aún no
// existe uno para hoy, igual que ya hacía el corte global de RedPontis).
export async function generarLiquidacionMundo(mundoId) {
  const st = load();
  const m = (st.mundos || []).find(x => x.id === mundoId);
  if (!m) return null;
  const today = new Date().toISOString().slice(0, 10);
  const item = await procesarLiquidacionMundo(m, today);
  if (item) {
    update(s => {
      if (!s.liquidaciones) s.liquidaciones = [];
      if (!s.liquidaciones.some(l => l.id === item.id)) s.liquidaciones.push(item);
    });
  }
  return item;
}

// Trae TODOS los lotes reales de Supabase y los mergea al store local (por
// id, sin duplicar) — para que Liquidacion.jsx y el KPI "Comisión acumulada"
// del dashboard reflejen lotes generados en cualquier sesión/navegador, no
// solo los que este browser generó. Llamado una vez al montar App.jsx, mismo
// patrón que refreshMundosLive().
export async function reconciliarLiquidacionesRemoto() {
  let rows;
  try { rows = await fetchTodasLiquidacionesRemote(); } catch { return; }
  if (!rows || !rows.length) return;
  update(st => {
    if (!st.liquidaciones) st.liquidaciones = [];
    const idsLocales = new Set(st.liquidaciones.map(l => l.id));
    rows.forEach(row => {
      if (idsLocales.has(row.id)) return;
      const mundo = (st.mundos || []).find(m => m.id === row.world_id);
      st.liquidaciones.push(loteRemotoALocal(row, mundo?.nombre));
    });
  });
}

export async function marcarLiquidacion(id, estado, extra = {}) {
  const actual = (load().liquidaciones || []).find(x => x.id === id);
  // Nunca se puede "procesar" (dar por pagado) un lote con neto negativo —
  // significaría depositarle al mundo una comisión que no cubrió con su
  // volumen real del período. Bug real #115: esto llegó a pasar sin ningún
  // guard y dejó lotes negativos marcados PROCESADA en producción.
  if (estado === "PROCESADA" && actual && Number(actual.neto) < 0) {
    throw new Error("No se puede procesar un lote con neto negativo — queda RETENIDO hasta que el volumen del período cubra la comisión.");
  }
  update(st => {
    const l = (st.liquidaciones||[]).find(x => x.id === id);
    if (l) {
      l.estado = estado;
      if (extra.voucherUrl !== undefined) l.voucherUrl = extra.voucherUrl;
      if (extra.voucherNombre !== undefined) l.voucherNombre = extra.voucherNombre;
      if (extra.observacion !== undefined) l.observacion = extra.observacion;
    }
  });
  try { await marcarLiquidacionRemote(id, estado, extra); } catch (e) { console.warn("[liquidacion-marcar]", e); }
}

// --- Tickets globales ---
// Gap real cerrado 29-jul: antes esto era puro estado local (nunca llegaba a
// Supabase, pese al toast "enviado a RedPontis" que veían sponsors/comercios
// en otro navegador). Ahora escribe local (feedback inmediato) y remoto
// (fuente real, world_id/comercio_id/origen preservados).
export async function crearTicketInterno(data) {
  const localId = uid("tk");
  update(st => { st.tickets.push({ id: localId, origen: "interno", estado: "ABIERTO", asignado: null, ...data, createdAt: Date.now() }); });
  try {
    const saved = await crearTicketSoporteRemote({
      world_id: data.mundoId || null, comercio_id: data.comercioId || null,
      origen: data.origen || "interno", tipo: data.tipo || null, asunto: data.asunto,
      detalle: data.detalle || null, modulo: data.modulo || null,
      prioridad: data.prioridad || "Media", estado: "ABIERTO",
    });
    if (saved) update(st => {
      const t = (st.tickets || []).find(x => x.id === localId);
      if (t) t.id = saved.id; // reemplaza el id local por el real, para que actualizarTicket ya apunte a Supabase
    });
  } catch (e) { console.warn("[ticket-crear]", e); }
}
export async function actualizarTicket(id, patch) {
  update(st => {
    const t = (st.tickets||[]).find(x => x.id === id);
    if (t) Object.assign(t, patch);
  });
  try { await actualizarTicketSoporteRemote(id, patch); } catch (e) { console.warn("[ticket-actualizar]", e); }
}
export async function reconciliarTicketsRemoto() {
  let rows;
  try { rows = await fetchTicketsSoporteRemote(); } catch { return; }
  if (!rows) return;
  update(st => {
    if (!st.tickets) st.tickets = [];
    const idsLocales = new Set(st.tickets.map(t => t.id));
    rows.forEach(row => {
      if (idsLocales.has(row.id)) return;
      st.tickets.push({
        id: row.id, mundoId: row.world_id, comercioId: row.comercio_id,
        origen: row.origen, tipo: row.tipo, asunto: row.asunto, detalle: row.detalle,
        modulo: row.modulo, prioridad: row.prioridad, estado: row.estado,
        asignado: row.asignado, clickupId: row.clickup_id,
        createdAt: Date.parse(row.created_at) || Date.now(),
      });
    });
  });
}
export function enviarTicketAClickUp(id) {
  // MVP mock — en producción se llamaría al webhook ClickUp
  actualizarTicket(id, { clickupId: `CU-${Math.floor(Math.random() * 100000)}`, clickupSyncedAt: Date.now() });
}

// --- Sesión de Merchant ---
export function merchantLogin(comercioId, usuario, password) {
  const c = load().comercios.find(x => x.id === comercioId);
  if (c?.credenciales?.usuario === usuario && c?.credenciales?.password === password) {
    update(st => { st.merchantSession = { comercioId, usuario }; });
    return true;
  }
  return false;
}
export function merchantLogout() { update(st => { st.merchantSession = null; }); }

// --- Sesión de Operador de Mundo (Task #128) ---
// Distinta de merchantLogin: un operador de mundo no representa a ningún
// comercio (no cobra saldo, por diseño) — solo la clave del mundo, mismo
// patrón que el POS nativo T6 usa con worlds.pos_pin.
export function worldOperatorLogin(worldId, pin) {
  const m = load().mundos.find(x => x.id === worldId);
  if (m?.posPin && String(pin).trim() === String(m.posPin).trim()) {
    update(st => { st.worldOperatorSession = { worldId }; });
    return true;
  }
  return false;
}
export function worldOperatorLogout() { update(st => { st.worldOperatorSession = null; }); }
