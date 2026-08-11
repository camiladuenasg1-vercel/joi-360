// ============================================================
// JOI Solutions 360 — App User Store
// KEY v3 = sincronizado con admin v3 (mismo MODULE_CATALOG)
// ============================================================

const KEY = "joi360_state_v3";

// ── Helpers ──────────────────────────────────────────────────
export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

// ── Channel catalogs (mirror of admin — Decisión R1: sin Agente Corresponsal,
//    "Saldo a saldo" es P2P, no canal de recarga) ────────────────────────────
export const CANALES_EMISION = [
  { id:"yape",     nombre:"Yape",                  icon:"smartphone",      disponible:true,  montoMin:1,  montoMax:2000,  tiempoAcreditacion:"Inmediato" },
  { id:"plin",     nombre:"Plin",                  icon:"smartphone",      disponible:true,  montoMin:1,  montoMax:2000,  tiempoAcreditacion:"Inmediato" },
  { id:"card",     nombre:"Tarjeta bancaria",       icon:"credit_card",     disponible:true,  montoMin:5,  montoMax:10000, tiempoAcreditacion:"1-2 min" },
  { id:"transfer", nombre:"Transferencia bancaria", icon:"account_balance", disponible:false, montoMin:20, montoMax:50000, tiempoAcreditacion:"1-2 horas" },
];
export const CANALES_ADQUIRENCIA = [
  { id:"pos_fisico",   nombre:"POS Físico",   icon:"point_of_sale", disponible:true },
  { id:"app_operador", nombre:"App Operador", icon:"tap_and_play",  disponible:true },
  { id:"qr_estatico",  nombre:"QR Estático",  icon:"qr_code",       disponible:true },
];

// ── Seed ─────────────────────────────────────────────────────
function seed() {
  const now = Date.now();

  const mkMod = (id, configOverride = {}) => {
    const base = {
      wallet:      { config: { monedaPermitida:"PEN", maxRecargasDiarias:3, maxPorRecarga:500, p2pEnabled:true,
                  // Canales de emisión habilitados en este mundo
                  emision_yape:true, emision_plin:true, emision_card:true, emision_transfer:false,
                }, svs: { balance:true, recarga:true, p2p:true, subwallet:true, bandita:true, notifs:true } },
      comercios:   { config: { mdrDefault:1.5, fijoTxDefault:0.10, tipoOnboarding:"Manual RedPontis",
                  // Canales de adquirencia habilitados
                  adq_pos_fisico:true, adq_app_operador:true, adq_qr_estatico:true,
                }, svs: {} },
      consumos:    { config: { horarioOperativo:null, anulacionHasta:24 }, svs: {} },
      inventario:  { config: { skuMax:500, stockNegativo:false, categoriasMax:20 }, svs: { subir_productos:true, subir_stock:true, venta_pos:true, detalle_ventas:true, detalle_consumos:true } },
      facturacion: { config: { rucEmisor:"", serieBoleta:"B001", serieFactura:"F001" }, svs: {} },
      perfil_ext:  { config: { camposMedicos:true, grupoFamiliar:true }, svs: {} },
      accesos:     { config: { zonas:"Principal,Cafetería,Auditorio", validacionDoble:false }, svs: {} },
      reservas:    { config: { anticipoMin:30, ventanaCancelacion:24 }, svs: {} },
      loyalty:     { config: { equivalencia:0.10, caducidadMeses:12 }, svs: {} },
      eventos:     { config: { comisionEntrada:5, allowB2C:false, ventanaPickup:30 }, svs: {} },
      credito:     { config: { lineaMax:1000, tasaInteres:24 }, svs: {} },
      subsidio:    { config: { categorias:"F&B,Educación", vigenciaDias:30 }, svs: {} },
      estacionamiento: { config: { tarifaHora:5, graciaMinutos:15 }, svs: {} },
      asistencia:  { config: { horarioEntrada:"07:30", horarioSalida:"14:30" }, svs: {} },
      cashback:    { config: { porcentajeDefault:3, topeMensual:50 }, svs: {} },
      control:     { config: { perfilesControladosActivo:true, maxPerfilesControlados:2, registroAlergias:true, limiteDiarioPerfil:30, montoAprobacionPadre:50, horarioConsumo:"07:00-17:00", soloMercantesAfiliados:true, notificacionConsumoRealTime:true, limiteGlobalMundo:200, alertasAdminEmail:true }, svs: {} },
      menu:        { config: { diasAnticipacion:7, cuposPorMenu:100 }, svs: {} },
      promociones: { config: { maxCuponesUsuario:5 }, svs: {} },
      turnos:      { config: { duracionDefault:30 }, svs: {} },
      bnpl:        { config: { cuotasMax:6 }, svs: {} },
      transporte:  { config: { tarifaPlana:2.5 }, svs: {} },
    };
    const b = base[id] || { config:{}, svs:{} };
    return {
      id, enabled: true,
      config: { ...b.config, ...configOverride },
      serviciosActivos: b.svs,
    };
  };

  return {
    session: null,
    mundos: [
      // ── JOI Eventos (RedPontis B2C) ──────────────────────
      {
        id: "mundo-eventos-rp", fixed: true, redpontis: true, type: "eventos_rp",
        nombre: "JOI Eventos", codigo: "EV-RP-000", vertical: "Especial RedPontis",
        color: "#722ce3", moneda: "PEN", estado: "ACTIVO",
        descripcion: "Crea y publica tu propio evento. RedPontis lo revisa antes de publicarlo. Sin comisión en fase 0.",
        eventosConfig: { modos:["b2c","embebido"], allowUserOrganizer:true, monetizacion:false, requireAprobacionRP:true, entidadLegalRequerida:true, comisionEntrada:1 },
        modulos: [
          mkMod("wallet"),
          mkMod("eventos", { allowB2C:true, comisionEntrada:1, ventanaPickup:30 }),
          mkMod("comercios"),
          mkMod("accesos"),
        ],
        createdAt: now,
      },
      // ── JOI Promos (RedPontis anunciantes) ───────────────
      {
        id: "mundo-promos-rp", fixed: true, redpontis: true, type: "promos_rp",
        nombre: "JOI Promos", codigo: "PR-RP-000", vertical: "Especial RedPontis",
        color: "#006688", moneda: "PEN", estado: "ACTIVO",
        descripcion: "Descuentos, cashback y accesos exclusivos de marcas del ecosistema JOI.",
        eventosConfig: null,
        modulos: [
          mkMod("wallet"),
          mkMod("promociones"),
          mkMod("comercios"),
        ],
        createdAt: now,
      },
      // ── Jockey Plaza (Centro Comercial) ──────────────────
      {
        id: "mundo-jockey-plaza", fixed: false, redpontis: false, type: "standard",
        nombre: "Jockey Plaza", codigo: "CC-JP-01", vertical: "Centro Comercial",
        color: "#00897b", moneda: "PEN", estado: "ACTIVO",
        descripcion: "Centro Comercial Jockey Plaza. Motor de Eventos activado para conciertos, ferias y activaciones de marca.",
        eventosConfig: { modos:["embebido"], allowUserOrganizer:false, monetizacion:true, requireAprobacionRP:false, entidadLegalRequerida:true, comisionEntrada:2 },
        modulos: [
          mkMod("wallet"),
          mkMod("consumos"),
          mkMod("comercios"),
          mkMod("eventos", { allowB2C:false, comisionEntrada:2, ventanaPickup:45 }),
          mkMod("loyalty"),
          mkMod("promociones"),
        ],
        createdAt: now - 86400000 * 2,
      },
      // ── Colegio Raimondi (Educación) ─────────────────────
      {
        id: "mundo-raimondi", fixed: false, redpontis: false, type: "standard",
        nombre: "Colegio Raimondi", codigo: "ED-LIM-001", vertical: "Educación",
        color: "#0035b9", moneda: "PEN", estado: "ACTIVO",
        descripcion: "Ecosistema educativo: wallet de alumnos, menú, asistencia y control parental.",
        eventosConfig: null,
        modulos: [
          mkMod("wallet", { maxRecargasDiarias:3, maxPorRecarga:200 }),
          mkMod("comercios"),
          mkMod("consumos"),
          mkMod("inventario"),
          mkMod("control", { limiteDiarioPerfil:30, maxPerfilesControlados:2, registroAlergias:true, horarioConsumo:"07:00-16:00" }),
          mkMod("menu", { diasAnticipacion:5, cuposPorMenu:80 }),
          mkMod("perfil_ext"),
          mkMod("accesos", { zonas:"Puerta Principal,Cafetería,Auditorio,Laboratorio" }),
          mkMod("asistencia"),
          mkMod("loyalty", { equivalencia:0.05, caducidadMeses:6 }),
        ],
        createdAt: now - 86400000 * 20,
      },
    ],
    eventos: [
      { id:"ev-001", mundoId:"mundo-eventos-rp", tipo:"b2c", titulo:"Festival Cultura Viva",
        descripcion:"Feria de arte, música y gastronomía en el Parque Kennedy.", organizador:{ nombre:"Colectivo Arte Lima", rucOEntidad:"20601234567", tipo:"entidad_existente" },
        categoria:"Arte y Cultura", fecha:"2026-07-20", hora:"15:00", lugar:"Parque Kennedy, Miraflores", aforo:800, vendidas:312, precio:0, gratis:true, estado:"PUBLICADO", aprobadoRP:true, createdAt: now - 86400000*5 },
      { id:"ev-002", mundoId:"mundo-eventos-rp", tipo:"b2c", titulo:"Tech Startup Meetup #12",
        descripcion:"Networking para fundadores y entusiastas de startups.", organizador:{ nombre:"Lima Startups Hub", rucOEntidad:"20589876543", tipo:"entidad_existente" },
        categoria:"Tecnología y Negocios", fecha:"2026-07-10", hora:"19:00", lugar:"WeWork San Isidro", aforo:120, vendidas:98, precio:25, gratis:false, estado:"PUBLICADO", aprobadoRP:true, createdAt: now - 86400000*3 },
      { id:"ev-003", mundoId:"mundo-eventos-rp", tipo:"b2c", titulo:"Concierto acústico: Noche de Jazz",
        descripcion:"Sesión íntima de jazz en vivo. Cupos muy limitados.", organizador:{ nombre:"Jazz Garage Lima", rucOEntidad:null, tipo:"nueva_entidad" },
        categoria:"Música", fecha:"2026-07-05", hora:"20:30", lugar:"Jazz Garage · Barranco", aforo:60, vendidas:44, precio:50, gratis:false, estado:"PENDIENTE_APROBACION", aprobadoRP:false, createdAt: now - 86400000*1 },
      { id:"ev-004", mundoId:"mundo-eventos-rp", tipo:"embebido", titulo:"JOI Summit 2026",
        descripcion:"Primer evento anual del ecosistema JOI. Charlas, demos y networking.", organizador:{ nombre:"RedPontis S.A.C.", rucOEntidad:"20612345678", tipo:"redpontis" },
        categoria:"Ecosistema JOI", fecha:"2026-08-15", hora:"09:00", lugar:"Centro de Convenciones Lima", aforo:2000, vendidas:876, precio:0, gratis:true, estado:"PUBLICADO", aprobadoRP:true, createdAt: now - 86400000*10 },
      { id:"ev-005", mundoId:"mundo-jockey-plaza", tipo:"embebido", titulo:"Feria Gastronómica JPC",
        descripcion:"25 restaurantes y food trucks en la Plaza Principal del centro comercial.", organizador:{ nombre:"Jockey Plaza SAC", rucOEntidad:"20123456789", tipo:"redpontis" },
        categoria:"Gastronomía", fecha:"2026-07-12", hora:"11:00", lugar:"Plaza Principal - Jockey Plaza", aforo:3000, vendidas:1200, precio:0, gratis:true, estado:"PUBLICADO", aprobadoRP:true, createdAt: now - 86400000*4 },
    ],
    promos: [
      { id:"promo-001", mundoId:"mundo-promos-rp", titulo:"20% en toda Bembos", anunciante:"Bembos S.A.C.", tipo:"descuento_porcentaje", valor:20, codigoQR:"BEMBOS20JOI", vigenciaHasta:"2026-07-31", categoria:"F&B", estado:"ACTIVO", usosMax:5000, usosActuales:1243 },
      { id:"promo-002", mundoId:"mundo-promos-rp", titulo:"S/ 30 off primera recarga", anunciante:"BCP Yape", tipo:"cashback_fijo", valor:30, codigoQR:"YPEJOI30", vigenciaHasta:"2026-09-30", categoria:"Fintech", estado:"ACTIVO", usosMax:10000, usosActuales:3421 },
      { id:"promo-003", mundoId:"mundo-promos-rp", titulo:"1 semana gratis SmartFit", anunciante:"Smart Fit Perú", tipo:"acceso_gratuito", codigoQR:"SFITJOI7D", vigenciaHasta:"2026-08-15", categoria:"Fitness", estado:"PROGRAMADA", usosMax:2000, usosActuales:0 },
    ],
  };
}

// ── Store pub/sub ─────────────────────────────────────────────
let state = null;

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : seed();
  } catch { state = seed(); }

  // Migration guards
  if (!state || !Array.isArray(state.mundos) || state.mundos.length === 0) state = seed();
  if (!state.eventos) state.eventos = seed().eventos;
  if (!state.promos)  state.promos  = seed().promos;
  if (!state.session) state.session = null;

  // Ensure each mundo has modulos array
  (state.mundos || []).forEach(m => {
    if (!m.modulos) m.modulos = [];
    m.modulos.forEach(mod => {
      if (!mod.config) mod.config = {};
      if (!mod.serviciosActivos) mod.serviciosActivos = {};
    });
  });

  return state;
}

function persist() {
  state = { ...state };
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("joi360app:update"));
}

export function getState() { return load(); }

// Devuelve los canales de emisión REALMENTE habilitados para un mundo:
// solo los que están disponibles globalmente Y activados en el config de su módulo Wallet.
export function canalesHabilitadosDeMundo(mundo) {
  const wallet = (mundo?.modulos || []).find(mo => mo.id === "wallet");
  if (!wallet) return [];
  return CANALES_EMISION.filter(ch => ch.disponible && wallet.config?.[`emision_${ch.id}`] !== false);
}

export function update(fn) { load(); fn(state); persist(); }
export function subscribe(cb) {
  const h = () => cb(load());
  window.addEventListener("joi360app:update", h);
  return () => window.removeEventListener("joi360app:update", h);
}
export function resetStore() { state = seed(); persist(); }

// ── FASE 0 — Mundos en vivo desde Supabase ───────────────────────────────
// El admin da de alta / edita mundos y aquí se renderizan automáticamente.
// Merge: los campos de plataforma (nombre, vertical, color, estado) vienen
// del remoto; los extras locales del seed (eventosConfig, redpontis, fixed)
// se conservan para los mundos que ya existían.
let _worldsFetching = false;
export async function refreshWorldsLive() {
  if (_worldsFetching) return;
  _worldsFetching = true;
  try {
    const { fetchWorldsLive } = await import("./supabaseClient.js");
    const rows = await fetchWorldsLive();
    if (!rows || !rows.length) return;
    const remoteIds = new Set(rows.map(w => w.id));
    update(s => {
      const byId = new Map((s.mundos || []).map(m => [m.id, m]));
      for (const w of rows) {
        const patch = {
          id: w.id, nombre: w.name, codigo: w.code, vertical: w.vertical,
          color: w.color_primary || "#0035b9", moneda: w.currency || "PEN",
          estado: (w.status || "activo").toUpperCase(),
          logoUrl: w.logo_url || null,
          // Derivada 100% de nombre/vertical (no hay columna propia en worlds)
          // — se regenera siempre para no quedar obsoleta tras un rename.
          descripcion: `Comunidad ${w.name} · vertical ${w.vertical}.`,
        };
        const base = byId.get(w.id);
        if (base) Object.assign(base, patch);
        else s.mundos.push({
          ...patch, fixed: false, redpontis: false, type: "standard",
          eventosConfig: null, modulos: [], createdAt: Date.parse(w.created_at) || Date.now(),
        });
      }
      // Mundos eliminados o pausados en el admin desaparecen de la app.
      s.mundos = s.mundos.filter(m => remoteIds.has(m.id));
    });
  } catch (e) {
    console.warn("[worlds-live]", e); // sin red → seguimos con el snapshot local
  } finally {
    _worldsFetching = false;
  }
}
