"use strict";

const HOY = new Date(2026, 8, 28);
const MONEDA = "PEN";
const ACTOR = "camila@redpontis.pe";

const COLORES_TRAMO = ["#1F66B8", "#AB4F00", "#C8202F", "#7A1420", "#4A1030", "#36235E", "#0F5C52", "#6B4FA3", "#8A3B00", "#2F3A56"];
const CICLO_DIAS = { MENSUAL: 28, TRIMESTRAL: 90, SEMESTRAL: 181, ANUAL: 365 };

const GRUPOS = [
  { k: "diaCorte",           l: "Día de corte",              d: "Qué día vence el cargo del ciclo",                i: "event_available" },
  { k: "anticipacion",       l: "Anticipación de emisión",   d: "Cuántos días antes del vencimiento se emite",      i: "schedule_send" },
  { k: "gracia",             l: "Período de gracia",         d: "Cuántos días pasan antes de darlo por vencido",    i: "hourglass_bottom" },
  { k: "tramosMora",         l: "Tramos de morosidad",       d: "Cómo se agrupa la antigüedad de la deuda",         i: "stacked_bar_chart" },
  { k: "recargoMora",        l: "Recargo por mora",          d: "Cuánto se recarga, cómo se presenta y hasta dónde", i: "percent" },
  { k: "suspension",         l: "Suspensión y reactivación", d: "Cuándo se corta el servicio y cómo vuelve",        i: "pause_circle" },
  { k: "cadencia",           l: "Cadencia de avisos",        d: "Qué avisos salen y en qué momento",                i: "notifications_active" },
  { k: "renovacionConDeuda", l: "Renovación con deuda",      d: "Qué hacer al renovar si quedó deuda abierta",      i: "autorenew" },
  { k: "limiteRechazos",     l: "Límite de rechazos",        d: "Cuántos rechazos consecutivos se toleran",          i: "credit_card_off" },
];

const KINDS_AVISO = {
  PRE_DUE:           { label: "Antes del cobro",              ico: "schedule_send" },
  ON_DUE:            { label: "El día del cobro",             ico: "event" },
  POST_DUE_REMINDER: { label: "Recordatorio si sigue impago",  ico: "notifications_active" },
  GRACE_END:         { label: "Fin del período de gracia",    ico: "hourglass_bottom" },
  PAYMENT_CONFIRMED: { label: "Confirmación de pago",          ico: "check_circle" },
};

const MODOS_CORTE = { FIXED_MONTH_DAY: "Día fijo del mes", RELATIVE_TO_SIGNUP: "Según fecha de alta" };
const TIPOS_RECARGO = { NONE: "Sin recargo", FIXED: "Monto fijo", PERCENT: "Porcentaje" };
const APLICACIONES_RECARGO = { SEPARATE_CONCEPT: "Concepto separado", SAME_CHARGE: "Sumado al cargo" };
const REACTIVACIONES = { AUTO_ON_PAYMENT: "Automática al pagar", MANUAL: "Manual" };
const POLITICAS_RENOVACION = { ISSUE_ANYWAY: "Emitir igual", HOLD_UNTIL_PAID: "Retener hasta que pague", SUSPEND: "Suspender" };

/// El producto se contrata por mundo o por comercio, discriminadamente. Un mundo con la facultad
/// delegada por Red Pontis habilita la capacidad a sus comercios escribiendo en merchant_module,
/// les entrega credenciales de Cognito y les fija una política. Nada de eso toca a los demás.
const ESTADOS_CAPACIDAD = {
  ENABLED:            { label: "Habilitado",     cls: "b-paid",      opera: true,  d: "Tiene el panel y puede emitir" },
  PENDING_ENABLEMENT: { label: "Pendiente",      cls: "b-pending",   opera: false, d: "Contratado a Red Pontis, falta que el mundo lo habilite" },
  DISABLED:           { label: "Deshabilitado",  cls: "b-cancelled", opera: false, d: "Estuvo activo. Sus datos siguen enteros" },
  NOT_CONTRACTED:     { label: "No contratado",  cls: "b-cancelled", opera: false, d: "No compró el producto. La venta la hace Red Pontis" },
};

const ESTADOS_CREDENCIAL = {
  DELIVERED: { label: "Entregada", cls: "b-paid" },
  SUSPENDED: { label: "Suspendida", cls: "b-cancelled" },
  REVOKED:   { label: "Invalidada", cls: "b-cancelled" },
  ERROR:     { label: "Con error",  cls: "b-arrears" },
};

const MEDIOS_PAGO = {
  CARD:     "Tarjeta",
  QR:       "QR interoperable",
  TRANSFER: "Transferencia",
  WALLET:   "Billetera JOI",
  CASH:     "Efectivo en caja",
};

const CAMPOS_PLANTILLA = { asunto: "Asunto", cuerpo: "Cuerpo", firma: "Firma" };

const ROLES_ENTREGA = {
  "collections-admin":    "Administrador de la cobranza",
  "collections-operator": "Operador de cobranza",
  "collections-readonly": "Solo lectura",
};

const RANGOS = [
  { campo: "anticipacion_dias",            ruta: ["anticipacion", "dias"],           min: 0, max: 60 },
  { campo: "gracia_dias",                  ruta: ["gracia", "dias"],                 min: 0, max: 60 },
  { campo: "suspension_cargos_vencidos",   ruta: ["suspension", "cargosVencidos"],   min: 1, max: 12 },
  { campo: "limite_rechazos_consecutivos", ruta: ["limiteRechazos", "consecutivos"], min: 0, max: 10 },
];

const ESTADOS = {
  PAID:           { label: "Pagado",     cls: "b-paid",      moroso: false },
  PENDING:        { label: "Pendiente",  cls: "b-pending",   moroso: false },
  PARTIALLY_PAID: { label: "Parcial",    cls: "b-partial",   moroso: false },
  OVERDUE:        { label: "Vencido",    cls: "b-overdue",   moroso: true  },
  IN_ARREARS:     { label: "En mora",    cls: "b-arrears",   moroso: true  },
  CANCELLED:      { label: "Anulado",    cls: "b-cancelled", moroso: false },
  SCHEDULED:      { label: "Programado", cls: "b-cancelled", moroso: false },
};

const money = (n) => "S/ " + Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => "S/ " + Number(n).toLocaleString("es-PE", { maximumFractionDigits: 0 });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fecha = (s) => {
  const d = s instanceof Date ? s : new Date(s + "T00:00:00");
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};
const dias = (a, b) => Math.round((b - a) / 86400000);
const addMes = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDia = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clonar = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
const ordenarClaves = (v) => (v && typeof v === "object" && !Array.isArray(v)
  ? Object.keys(v).sort().reduce((a, k) => { a[k] = v[k]; return a; }, {}) : v);
const firma = (v) => JSON.stringify(v, (k, x) => ordenarClaves(x));
const leerRuta = (o, ruta) => ruta.reduce((a, k) => (a == null ? a : a[k]), o);

function toast(msg, type = "ok") {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + type;
  const ic = type === "err" ? "error" : type === "info" ? "info" : "check_circle";
  el.innerHTML = `<span class="msi">${ic}</span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

const S = {
  tab: "resumen",
  grupo: "collections-admin",
  rol: "ADMIN",
  caja: null,
  planes: [
    { id: "p-esencial", nombre: "YOKI Esencial", monto: 49, periodicidad: "MENSUAL", activo: true, permanencia: 0,
      reglaPlan: {} },
    { id: "p-full", nombre: "YOKI Full", monto: 89, periodicidad: "MENSUAL", activo: true, permanencia: 3,
      reglaPlan: {
        gracia: { dias: 2 },
        cadencia: [
          { kind: "PRE_DUE",           label: "Primer aviso previo",          offset: -7, on: true },
          { kind: "PRE_DUE",           label: "Segundo aviso previo",         offset: -2, on: true },
          { kind: "ON_DUE",            label: "El día del cobro",             offset: 0,  on: true },
          { kind: "POST_DUE_REMINDER", label: "Recordatorio al día siguiente", offset: 1, on: true },
          { kind: "POST_DUE_REMINDER", label: "Recordatorio a los tres días",  offset: 3, on: true },
          { kind: "GRACE_END",         label: "Fin del período de gracia",    offset: 2,  on: true },
          { kind: "PAYMENT_CONFIRMED", label: "Confirmación de pago",         offset: 0,  on: true },
        ],
      } },
    { id: "p-corp", nombre: "YOKI Corporativo", monto: 249, periodicidad: "MENSUAL", activo: true, permanencia: 6,
      reglaPlan: {
        recargoMora: { tipo: "FIXED", valor: 25, aplicacion: "SAME_CHARGE", tope: 75 },
        renovacionConDeuda: { politica: "HOLD_UNTIL_PAID" },
      } },
    { id: "p-anual", nombre: "YOKI Anual", monto: 890, periodicidad: "ANUAL", activo: true, permanencia: 12,
      reglaPlan: {
        diaCorte: { modo: "FIXED_MONTH_DAY", dia: 1 },
        anticipacion: { dias: 15 },
      } },
  ],
  suscriptores: [],
  cargos: [],
  reglaCartera: {
    diaCorte: { modo: "FIXED_MONTH_DAY", dia: 5 },
    anticipacion: { dias: 3 },
    gracia: { dias: 5 },
    tramosMora: [
      { nombre: "1 a 30 días",    desde: 1,  hasta: 30 },
      { nombre: "31 a 60 días",   desde: 31, hasta: 60 },
      { nombre: "61 a 90 días",   desde: 61, hasta: 90 },
      { nombre: "Más de 90 días", desde: 91, hasta: null },
    ],
    recargoMora: { tipo: "PERCENT", valor: 5, aplicacion: "SEPARATE_CONCEPT", tope: 30 },
    suspension: { cargosVencidos: 3, reactivacion: "AUTO_ON_PAYMENT" },
    cadencia: [
      { kind: "PRE_DUE",           label: "Aviso previo al cobro",        offset: -3, on: true },
      { kind: "ON_DUE",            label: "El día del cobro",             offset: 0,  on: true },
      { kind: "POST_DUE_REMINDER", label: "Recordatorio si sigue impago", offset: 1,  on: true },
      { kind: "GRACE_END",         label: "Fin del período de gracia",    offset: 5,  on: true },
      { kind: "PAYMENT_CONFIRMED", label: "Confirmación de pago",         offset: 0,  on: true },
    ],
    renovacionConDeuda: { politica: "ISSUE_ANYWAY" },
    limiteRechazos: { consecutivos: 3 },
  },
  politicasCartera: { topeRecordatoriosDia: 3, cancelarTrasMeses: 6 },

  /// El mundo dueño de la caja de alcance WORLD. facultadDelegada es lo que Red Pontis le concedió:
  /// sin eso, habilitar comercios y entregar credenciales lo sigue haciendo Red Pontis.
  mundo: {
    id: "JOCKEY-01", code: "JOCKEY-01", nombre: "Jockey Plaza",
    facultadDelegada: true, facultadDesde: "2026-06-01", facultadPor: "contratos@redpontis.pe",
  },

  /// Los comercios del mundo con el estado de su capacidad de cobranzas. La cartera de YOKI es la
  /// que vive en S.suscriptores / S.cargos (es la caja de alcance MERCHANT); los demás traen su
  /// agregado sembrado, que es todo lo que el mundo puede ver sin autorización nominal.
  comercios: [
    { id: "m-yoki", worldId: "JOCKEY-01", nombre: "YOKI", slug: "yoki",
      rubro: "Gimnasios y bienestar", ruc: "20512345678", esCajaPropia: true,
      capacidad: { estado: "ENABLED", configurado: true, habilitadoEl: "2026-07-15",
        habilitadoPor: "operaciones@jockeyplaza.pe", deshabilitadoEl: null, revisionPendiente: false,
        politicaSnapshot: null },
      autorizacionDetalle: null,
      credenciales: [
        { id: "cr-yoki-1", correo: "operaciones@yoki.pe", rol: "collections-admin",
          scopeType: "COLLECTIONS_MERCHANT", estado: "DELIVERED", secreto: "cob_live_7Hh2k9QvR4nT",
          revelado: true, entregadaEl: "2026-07-15", por: "operaciones@jockeyplaza.pe", motivo: null },
      ],
      cartera: null },

    { id: "m-altomayo", worldId: "JOCKEY-01", nombre: "Café Altomayo", slug: "altomayo",
      rubro: "Cafeterías", ruc: "20498877123", esCajaPropia: false,
      capacidad: { estado: "ENABLED", configurado: false, habilitadoEl: "2026-09-22",
        habilitadoPor: "operaciones@jockeyplaza.pe", deshabilitadoEl: null, revisionPendiente: false,
        politicaSnapshot: null },
      autorizacionDetalle: null,
      credenciales: [],
      cartera: { cobradoPeriodo: 0, filas: [] } },

    { id: "m-dermaclinic", worldId: "JOCKEY-01", nombre: "Derma Clinic", slug: "dermaclinic",
      rubro: "Salud y estética", ruc: "20551234098", esCajaPropia: false,
      capacidad: { estado: "PENDING_ENABLEMENT", configurado: false, habilitadoEl: null,
        habilitadoPor: null, deshabilitadoEl: null, revisionPendiente: false, politicaSnapshot: null },
      autorizacionDetalle: null,
      credenciales: [],
      cartera: null },

    { id: "m-petstyle", worldId: "JOCKEY-01", nombre: "Pet Style", slug: "petstyle",
      rubro: "Mascotas", ruc: "20604455881", esCajaPropia: false,
      capacidad: { estado: "DISABLED", configurado: true, habilitadoEl: "2026-03-02",
        habilitadoPor: "operaciones@jockeyplaza.pe", deshabilitadoEl: "2026-08-30",
        revisionPendiente: false, politicaSnapshot: null },
      autorizacionDetalle: { otorgada: true, cuando: "2026-04-10", por: "gerencia@petstyle.pe", revocadaEl: null },
      credenciales: [
        { id: "cr-pet-1", correo: "gerencia@petstyle.pe", rol: "collections-admin",
          scopeType: "COLLECTIONS_MERCHANT", estado: "SUSPENDED", secreto: "cob_live_2Qp8m5XzB1kL",
          revelado: true, entregadaEl: "2026-03-02", por: "operaciones@jockeyplaza.pe", motivo: null },
      ],
      cartera: { cobradoPeriodo: 1840, filas: [
        { nombre: "Rosa Linares Guerra",    documento: "43221009", plan: "Pet Style Mensual", monto: 60, deuda: 0,   mora: 0,  atraso: 0,   activo: true },
        { nombre: "Hugo Maldonado Pérez",   documento: "47118822", plan: "Pet Style Mensual", monto: 60, deuda: 60,  mora: 0,  atraso: 12,  activo: true },
        { nombre: "Nadia Quiroz Salas",     documento: "45990011", plan: "Pet Style Plus",    monto: 95, deuda: 190, mora: 9,  atraso: 44,  activo: true },
        { nombre: "Tomás Arrieta Vilca",    documento: "42775533", plan: "Pet Style Mensual", monto: 60, deuda: 180, mora: 14, atraso: 76,  activo: true },
        { nombre: "Lorena Pacheco Ríos",    documento: "48003344", plan: "Pet Style Plus",    monto: 95, deuda: 380, mora: 28, atraso: 133, activo: false },
        { nombre: "Bruno Zegarra Ocaña",    documento: "41668877", plan: "Pet Style Mensual", monto: 60, deuda: 0,   mora: 0,  atraso: 0,   activo: true },
      ] } },

    { id: "m-tecnomundo", worldId: "JOCKEY-01", nombre: "TecnoMundo", slug: "tecnomundo",
      rubro: "Electrónica", ruc: "20387766554", esCajaPropia: false,
      capacidad: { estado: "NOT_CONTRACTED", configurado: false, habilitadoEl: null,
        habilitadoPor: null, deshabilitadoEl: null, revisionPendiente: false, politicaSnapshot: null },
      autorizacionDetalle: null,
      credenciales: [],
      cartera: null },
  ],

  /// La política que el mundo le fija a la cobranza de sus comercios. Tiene efecto real: recorta
  /// medios de pago, tapa el recargo de mora y la gracia, informa su comisión y manda plantillas.
  politicaMundo: {
    mediosPago: ["CARD", "QR", "WALLET"],
    topeMontoCargo: 2500,
    topeMontoLote: 80000,
    topeRecargoMoraPct: 12,
    topeGraciaDias: 7,
    topeRecordatoriosDia: 3,
    comisionMundoPct: 1.5,
    solicitaDetalleNominal: true,
    plantillas: [
      { kind: "PRE_DUE",           nombre: "Aviso previo al cobro",     obligatoria: true,  camposEditables: ["asunto", "firma"] },
      { kind: "ON_DUE",            nombre: "Aviso del día del cobro",   obligatoria: true,  camposEditables: ["asunto"] },
      { kind: "POST_DUE_REMINDER", nombre: "Recordatorio de impago",    obligatoria: false, camposEditables: ["asunto", "cuerpo", "firma"] },
      { kind: "PAYMENT_CONFIRMED", nombre: "Confirmación de pago",      obligatoria: true,  camposEditables: ["firma"] },
    ],
  },

  /// Lo que el comercio ofrece por su cuenta. Lo efectivo es la intersección con la política.
  mediosComercio: ["CARD", "QR", "TRANSFER", "WALLET", "CASH"],
  plantillasComercio: {
    PRE_DUE:           { activa: true, asunto: "Tu cuota de YOKI vence pronto", cuerpo: "Hola, te recordamos que tu cuota vence en pocos días.", firma: "Equipo YOKI" },
    ON_DUE:            { activa: true, asunto: "Hoy vence tu cuota de YOKI",     cuerpo: "Hoy es el día de cobro de tu plan.",                   firma: "Equipo YOKI" },
    POST_DUE_REMINDER: { activa: true, asunto: "Quedó pendiente tu cuota",       cuerpo: "Tu cuota sigue impaga. Podés pagarla con este link.",  firma: "Equipo YOKI" },
    PAYMENT_CONFIRMED: { activa: true, asunto: "Recibimos tu pago",              cuerpo: "Gracias, tu pago quedó acreditado.",                   firma: "Equipo YOKI" },
  },

  /// Simuladores del prototipo: permiten recorrer los caminos degradados sin tocar código.
  simulado: { idpCaido: false },
  borradorPolitica: null,
  erroresPolitica: [],

  reglaNivel: "PORTFOLIO",
  reglaPlanId: null,
  borradorRegla: null,
  erroresRegla: [],
  vigenciasProgramadas: [],
  historialReglas: [],
  bitacora: [],
  importJob: null,
  filtros: { q: "", plan: "", estado: "", tramo: "" },
};

function plan(id) { return S.planes.find((p) => p.id === id); }
function planPorNombre(n) { return S.planes.find((p) => p.nombre.toLowerCase() === String(n).trim().toLowerCase()); }

function comercioPorId(id) { return S.comercios.find((m) => m.id === id) || null; }
function comerciosDelMundo() { return S.comercios.filter((m) => m.worldId === S.mundo.id); }
function esCajaDeMundo() { return !!(S.caja && S.caja.scope === "WORLD"); }

/// La cartera de alcance comercio está debajo de un mundo, así que le aplica su política. La del
/// mundo es cartera propia: no hay otro mundo encima. Sin caja elegida el dataset sembrado es el
/// de YOKI, que es un comercio del mundo.
function politicaAplicable() { return esCajaDeMundo() ? null : S.politicaMundo; }

function comercioDeLaCaja() {
  if (!S.caja || S.caja.scope !== "MERCHANT") return null;
  return S.comercios.find((m) => m.slug === S.caja.code) || null;
}

function mediosEfectivos() {
  const pol = politicaAplicable();
  if (!pol) return S.mediosComercio.slice();
  return S.mediosComercio.filter((m) => pol.mediosPago.includes(m));
}
function mediosRecortados() {
  const pol = politicaAplicable();
  if (!pol) return [];
  return S.mediosComercio.filter((m) => !pol.mediosPago.includes(m));
}

function topeRecordatoriosEfectivo() {
  const pol = politicaAplicable();
  const propio = S.politicasCartera.topeRecordatoriosDia;
  return pol ? Math.min(propio, pol.topeRecordatoriosDia) : propio;
}

/// Fase 1: la comisión del mundo se informa en el cargo, no mueve dinero. Es un monto declarado.
function comisionInformada(monto) {
  const pol = politicaAplicable();
  if (!pol) return null;
  return { pct: pol.comisionMundoPct, monto: r2(Number(monto) * Number(pol.comisionMundoPct) / 100) };
}
function sellarComision(cargo) {
  const c = comisionInformada(total(cargo));
  cargo.comisionMundoPct = c ? c.pct : null;
  cargo.comisionMundo = c ? c.monto : null;
  return cargo;
}

/// Tras una reactivación, el comercio no vuelve a emitir hasta que el mundo confirme la revisión de
/// reglas. Es la única puerta que corta la emisión de cargos nuevos.
function emisionBloqueada() {
  const m = comercioDeLaCaja();
  if (m && m.capacidad.revisionPendiente)
    return `rules_review_pending: ${S.mundo.nombre} reactivó la capacidad de ${m.nombre} y hasta que un ADMIN del mundo confirme la revisión de reglas no se puede emitir.`;
  return null;
}

function notaEmisionBloqueada() {
  const b = emisionBloqueada();
  if (!b) return "";
  return `<div class="note n-err"><span class="msi">block</span>
    <div><b>Emisión suspendida.</b> ${esc(b)} Tus datos están completos: lo que falta es esa confirmación.</div></div>`;
}

function plantillaPolitica(kind) { return S.politicaMundo.plantillas.find((t) => t.kind === kind) || null; }
function campoEditable(kind, campo) {
  const t = plantillaPolitica(kind);
  return !t || t.camposEditables.includes(campo);
}

function grupoPropio(planId, grupo) {
  const p = plan(planId);
  return !!(p && p.reglaPlan && p.reglaPlan[grupo] != null);
}

function reglaEfectiva(planId) {
  const origen = {};
  const efectiva = { origen };
  GRUPOS.forEach(({ k }) => {
    const propio = planId != null && grupoPropio(planId, k);
    origen[k] = propio ? "PLAN" : "PORTFOLIO";
    efectiva[k] = clonar(propio ? plan(planId).reglaPlan[k] : S.reglaCartera[k]);
  });
  efectiva.planId = planId == null ? null : planId;
  return efectiva;
}

function soloGrupos(regla) {
  const r = {};
  GRUPOS.forEach(({ k }) => { r[k] = clonar(regla[k]); });
  return r;
}

function planesQueHeredan(grupo) { return S.planes.filter((p) => !grupoPropio(p.id, grupo)); }

function contextoRegla(nivel, planId, vigenciaDesde) {
  if (nivel === "PLAN") {
    const p = plan(planId);
    return { nivel, planId, planes: [p], montoReferencia: p.monto, vigenciaDesde, politicaMundo: politicaAplicable() };
  }
  const paraCiclo = planesQueHeredan("anticipacion");
  const paraMonto = planesQueHeredan("recargoMora");
  const montos = (paraMonto.length ? paraMonto : S.planes).map((p) => p.monto);
  return {
    nivel: "PORTFOLIO", planId: null, vigenciaDesde,
    planes: paraCiclo.length ? paraCiclo : S.planes,
    montoReferencia: Math.min(...montos),
    politicaMundo: politicaAplicable(),
  };
}

function validarReglaEfectiva(efectiva, contexto = {}) {
  const errores = [];
  const sumar = (codigo, campos, mensaje) => errores.push({ codigo, campos, mensaje });
  const entero = (v) => Number.isInteger(v);

  const corte = efectiva.diaCorte || {};
  if (!MODOS_CORTE[corte.modo])
    sumar("invalid_cutoff_day", ["dia_corte_modo"], "El modo del día de corte tiene que ser FIXED_MONTH_DAY o RELATIVE_TO_SIGNUP.");
  else if (corte.modo === "FIXED_MONTH_DAY" && !(entero(corte.dia) && corte.dia >= 1 && corte.dia <= 31))
    sumar("invalid_cutoff_day", ["dia_corte_dia"], "El día de corte tiene que ser un entero entre 1 y 31.");

  RANGOS.forEach((r) => {
    const v = leerRuta(efectiva, r.ruta);
    if (!(entero(v) && v >= r.min && v <= r.max))
      sumar("invalid_rule_range", [r.campo], `${r.campo} tiene que ser un entero entre ${r.min} y ${r.max}.`);
  });

  const recargo = efectiva.recargoMora || {};
  if (!TIPOS_RECARGO[recargo.tipo])
    sumar("invalid_rule_range", ["recargo_mora_tipo"], "recargo_mora_tipo tiene que ser NONE, FIXED o PERCENT.");
  if (!APLICACIONES_RECARGO[recargo.aplicacion])
    sumar("invalid_rule_range", ["recargo_mora_aplicacion"], "recargo_mora_aplicacion tiene que ser SAME_CHARGE o SEPARATE_CONCEPT.");
  if (!(Number.isFinite(Number(recargo.valor)) && Number(recargo.valor) >= 0))
    sumar("invalid_rule_range", ["recargo_mora_valor"], "recargo_mora_valor tiene que ser un número mayor o igual que cero.");
  if (!(Number.isFinite(Number(recargo.tope)) && Number(recargo.tope) >= 0))
    sumar("invalid_rule_range", ["recargo_mora_tope"], "recargo_mora_tope tiene que ser un número mayor o igual que cero.");
  if (!REACTIVACIONES[(efectiva.suspension || {}).reactivacion])
    sumar("invalid_rule_range", ["suspension_reactivacion"], "suspension_reactivacion tiene que ser AUTO_ON_PAYMENT o MANUAL.");
  if (!POLITICAS_RENOVACION[(efectiva.renovacionConDeuda || {}).politica])
    sumar("invalid_rule_range", ["renovacion_con_deuda_politica"], "renovacion_con_deuda_politica tiene que ser ISSUE_ANYWAY, HOLD_UNTIL_PAID o SUSPEND.");

  const tramos = efectiva.tramosMora || [];
  if (tramos.length < 1 || tramos.length > 10) {
    sumar("invalid_delinquency_buckets", ["tramos_mora"], "Tiene que haber entre 1 y 10 tramos de morosidad.");
  } else {
    if (tramos[0].desde !== 1)
      sumar("invalid_delinquency_buckets", ["tramos_mora[0].desde"], "El primer tramo tiene que empezar en el día 1.");
    if (tramos[tramos.length - 1].hasta != null)
      sumar("invalid_delinquency_buckets", [`tramos_mora[${tramos.length - 1}].hasta`], "El último tramo tiene que quedar abierto.");
    tramos.forEach((t, i) => {
      const ultimo = i === tramos.length - 1;
      if (!(entero(t.desde) && t.desde >= 1))
        sumar("invalid_delinquency_buckets", [`tramos_mora[${i}].desde`], `El tramo ${i + 1} arranca en un día que no es un entero válido.`);
      if (ultimo) return;
      if (!(entero(t.hasta) && t.hasta >= t.desde)) {
        sumar("invalid_delinquency_buckets", [`tramos_mora[${i}].hasta`], `El tramo ${i + 1} termina antes de empezar o no es un entero.`);
        return;
      }
      const sig = tramos[i + 1];
      if (!entero(sig.desde)) return;
      if (sig.desde <= t.hasta)
        sumar("invalid_delinquency_buckets", [`tramos_mora[${i}].hasta`, `tramos_mora[${i + 1}].desde`],
          `Los tramos ${i + 1} y ${i + 2} se solapan: el día ${sig.desde} cae en los dos.`);
      else if (sig.desde > t.hasta + 1)
        sumar("invalid_delinquency_buckets", [`tramos_mora[${i}].hasta`, `tramos_mora[${i + 1}].desde`],
          `Queda un hueco entre los tramos ${i + 1} y ${i + 2}: nadie cubre del día ${t.hasta + 1} al ${sig.desde - 1}.`);
    });
  }

  const cadencia = efectiva.cadencia || [];
  if (cadencia.length > 10)
    sumar("invalid_reminder_cadence", ["cadencia"], "No puede haber más de 10 avisos en la cadencia.");
  cadencia.forEach((a, i) => {
    if (!KINDS_AVISO[a.kind])
      sumar("invalid_reminder_cadence", [`cadencia[${i}].kind`], `El aviso ${i + 1} tiene un tipo que no existe.`);
    if (!(entero(a.offset) && a.offset >= -60 && a.offset <= 180))
      sumar("invalid_rule_range", [`cadencia[${i}].offset`], `cadencia[${i}].offset tiene que ser un entero entre -60 y 180.`);
  });
  const vistos = new Map();
  cadencia.forEach((a, i) => {
    const clave = `${a.kind}@${a.offset}`;
    if (vistos.has(clave))
      sumar("invalid_reminder_cadence", [`cadencia[${vistos.get(clave)}]`, `cadencia[${i}]`],
        `Hay dos avisos ${a.kind} con el mismo desplazamiento (${a.offset}). Se mandaría dos veces lo mismo.`);
    else vistos.set(clave, i);
  });

  const gracia = leerRuta(efectiva, ["gracia", "dias"]);
  const vencidos = leerRuta(efectiva, ["suspension", "cargosVencidos"]);
  if (vencidos === 0)
    sumar("invalid_rule_combination", ["suspension_cargos_vencidos"], "Suspender tras cero cargos vencidos dejaría a toda la cartera suspendida.");
  if (entero(gracia) && entero(vencidos) && vencidos > 0 && gracia >= vencidos * 30)
    sumar("invalid_rule_combination", ["gracia_dias", "suspension_cargos_vencidos"],
      `La gracia de ${gracia} días alcanza o pasa los ${vencidos * 30} días que disparan la suspensión.`);
  if (TIPOS_RECARGO[recargo.tipo] && recargo.tipo !== "NONE" && Number(recargo.tope) > 0) {
    const base = Number(contexto.montoReferencia != null ? contexto.montoReferencia : 0);
    const unidad = recargo.tipo === "PERCENT" ? r2(base * Number(recargo.valor) / 100) : Number(recargo.valor);
    if (unidad > 0 && Number(recargo.tope) < unidad)
      sumar("invalid_rule_combination", ["recargo_mora_tope", "recargo_mora_valor"],
        `El tope de ${recargo.tope} queda por debajo de una sola aplicación del recargo (${r2(unidad)}).`);
  }
  const planes = contexto.planes || [];
  const anticipacion = leerRuta(efectiva, ["anticipacion", "dias"]);
  if (planes.length && entero(anticipacion)) {
    const ciclo = Math.min(...planes.map((p) => CICLO_DIAS[p.periodicidad] || CICLO_DIAS.MENSUAL));
    if (anticipacion > ciclo)
      sumar("invalid_rule_combination", ["anticipacion_dias"],
        `La anticipación de ${anticipacion} días pasa el ciclo más corto de los planes que usan la regla (${ciclo} días).`);
  }

  /// Tope del mundo. Solo entra cuando hay política aplicable, así que los cinco códigos que ya
  /// validaba la regla no cambian de comportamiento para la cartera propia de un mundo.
  const pol = contexto.politicaMundo;
  if (pol) {
    const baseRef = Number(contexto.montoReferencia != null ? contexto.montoReferencia : 0);
    const pctRecargo = recargo.tipo === "PERCENT" ? Number(recargo.valor)
      : recargo.tipo === "FIXED" && baseRef > 0 ? r2(Number(recargo.valor) * 100 / baseRef) : null;
    if (pctRecargo != null && Number.isFinite(pctRecargo) && pctRecargo > Number(pol.topeRecargoMoraPct))
      sumar("policy_limit_exceeded", ["recargo_mora_valor"],
        `${S.mundo.nombre} permite hasta ${pol.topeRecargoMoraPct}% de recargo por mora. Esta regla llega al ${pctRecargo}%${
          recargo.tipo === "FIXED" ? ` (${money(recargo.valor)} sobre ${money(baseRef)})` : ""}.`);
    if (entero(gracia) && gracia > Number(pol.topeGraciaDias))
      sumar("policy_limit_exceeded", ["gracia_dias"],
        `${S.mundo.nombre} permite hasta ${pol.topeGraciaDias} días de gracia. Esta regla pide ${gracia}.`);
  }

  if (contexto.vigenciaDesde) {
    const d = new Date(contexto.vigenciaDesde + "T00:00:00");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(contexto.vigenciaDesde) || Number.isNaN(d.getTime()))
      sumar("rule_effective_date_in_past", ["vigencia_desde"], "La fecha de vigencia tiene que venir como AAAA-MM-DD.");
    else if (d < HOY)
      sumar("rule_effective_date_in_past", ["vigencia_desde"], `La vigencia no puede empezar antes de hoy, ${fecha(HOY)}.`);
  }
  return errores;
}

function validarPoliticas(p, contexto = {}) {
  const errores = [];
  const entero = (v) => Number.isInteger(v);
  if (!(entero(p.topeRecordatoriosDia) && p.topeRecordatoriosDia >= 1 && p.topeRecordatoriosDia <= 10))
    errores.push({ codigo: "invalid_rule_range", campos: ["tope_recordatorios_dia"], mensaje: "tope_recordatorios_dia tiene que ser un entero entre 1 y 10." });
  if (!(entero(p.cancelarTrasMeses) && p.cancelarTrasMeses >= 1 && p.cancelarTrasMeses <= 60))
    errores.push({ codigo: "invalid_rule_range", campos: ["cancelar_tras_meses"], mensaje: "cancelar_tras_meses tiene que ser un entero entre 1 y 60." });
  const pol = contexto.politicaMundo;
  if (pol && entero(p.topeRecordatoriosDia) && p.topeRecordatoriosDia > pol.topeRecordatoriosDia)
    errores.push({ codigo: "policy_limit_exceeded", campos: ["tope_recordatorios_dia"],
      mensaje: `${S.mundo.nombre} permite hasta ${pol.topeRecordatoriosDia} recordatorios manuales por suscriptor por día.` });
  return errores;
}

const CAMPOS_POLITICA = [
  { k: "mediosPago",             l: "Medios de pago habilitados",          fmt: (v) => (v || []).length ? v.map((x) => MEDIOS_PAGO[x] || x).join(" · ") : "ninguno" },
  { k: "topeMontoCargo",         l: "Monto máximo por cargo",              fmt: (v) => (v == null ? "sin límite" : money(v)) },
  { k: "topeMontoLote",          l: "Monto máximo por lote",               fmt: (v) => (v == null ? "sin límite" : money(v)) },
  { k: "topeRecargoMoraPct",     l: "Recargo por mora máximo",             fmt: (v) => `${v}% del cargo` },
  { k: "topeGraciaDias",         l: "Días de gracia máximos",              fmt: (v) => `${v} ${v === 1 ? "día" : "días"}` },
  { k: "topeRecordatoriosDia",   l: "Recordatorios manuales por día",      fmt: (v) => `${v} por suscriptor` },
  { k: "comisionMundoPct",       l: "Comisión del mundo sobre el cobro",   fmt: (v) => `${v}% informado, sin movimiento de dinero` },
  { k: "solicitaDetalleNominal", l: "Detalle nominal de cartera",          fmt: (v) => (v ? "se le pide autorización al comercio" : "solo agregado, nunca nombres") },
  { k: "plantillas",             l: "Plantillas de aviso",                 fmt: (v) => (v || []).map((t) => `${t.nombre}${t.obligatoria ? " (obligatoria)" : ""} [${t.camposEditables.join("/") || "sin campos editables"}]`).join(" · ") },
];

function resumenPolitica(p) {
  return CAMPOS_POLITICA.filter((c) => c.k !== "plantillas").map((c) => `${c.l} ${c.fmt(p[c.k])}`).join(" · ");
}

function diffPolitica(antes, despues) {
  return CAMPOS_POLITICA.filter((c) => firma(antes[c.k]) !== firma(despues[c.k])).map((c) => ({
    campo: c.k, label: c.l, antes: c.fmt(antes[c.k]), despues: c.fmt(despues[c.k]),
  }));
}

function validarPoliticaMundo(p) {
  const errores = [];
  const sumar = (codigo, campos, mensaje) => errores.push({ codigo, campos, mensaje });
  const entero = (v) => Number.isInteger(v);
  const num = (v) => Number.isFinite(Number(v));

  if (!Array.isArray(p.mediosPago) || p.mediosPago.length === 0)
    sumar("invalid_payment_methods", ["medios_pago"], "Tiene que quedar al menos un medio de pago habilitado: sin ninguno, el comercio no podría cobrar.");
  (p.mediosPago || []).forEach((m, i) => {
    if (!MEDIOS_PAGO[m]) sumar("invalid_payment_methods", [`medios_pago[${i}]`], `"${m}" no está en el vocabulario de medios de pago.`);
  });
  if (p.topeMontoCargo != null && !(num(p.topeMontoCargo) && Number(p.topeMontoCargo) > 0))
    sumar("invalid_rule_range", ["tope_monto_cargo"], "tope_monto_cargo tiene que quedar vacío (sin límite) o ser un número mayor que cero.");
  if (p.topeMontoLote != null && !(num(p.topeMontoLote) && Number(p.topeMontoLote) > 0))
    sumar("invalid_rule_range", ["tope_monto_lote"], "tope_monto_lote tiene que quedar vacío (sin límite) o ser un número mayor que cero.");
  if (p.topeMontoCargo != null && p.topeMontoLote != null && num(p.topeMontoCargo) && num(p.topeMontoLote)
    && Number(p.topeMontoLote) < Number(p.topeMontoCargo))
    sumar("invalid_rule_combination", ["tope_monto_lote", "tope_monto_cargo"],
      `El tope por lote (${money(p.topeMontoLote)}) queda por debajo del tope de un solo cargo (${money(p.topeMontoCargo)}): ningún lote pasaría.`);
  if (!(num(p.topeRecargoMoraPct) && Number(p.topeRecargoMoraPct) >= 0 && Number(p.topeRecargoMoraPct) <= 100))
    sumar("invalid_rule_range", ["tope_recargo_mora_pct"], "tope_recargo_mora_pct tiene que ser un número entre 0 y 100.");
  if (!(entero(p.topeGraciaDias) && p.topeGraciaDias >= 0 && p.topeGraciaDias <= 60))
    sumar("invalid_rule_range", ["tope_gracia_dias"], "tope_gracia_dias tiene que ser un entero entre 0 y 60.");
  if (!(entero(p.topeRecordatoriosDia) && p.topeRecordatoriosDia >= 1 && p.topeRecordatoriosDia <= 10))
    sumar("invalid_rule_range", ["tope_recordatorios_dia"], "tope_recordatorios_dia tiene que ser un entero entre 1 y 10.");
  if (!(num(p.comisionMundoPct) && Number(p.comisionMundoPct) >= 0 && Number(p.comisionMundoPct) <= 30))
    sumar("invalid_rule_range", ["comision_mundo_pct"], "comision_mundo_pct tiene que ser un número entre 0 y 30.");
  (p.plantillas || []).forEach((t, i) => {
    if (!KINDS_AVISO[t.kind]) sumar("invalid_template_fields", [`plantillas[${i}].kind`], `El tipo de aviso "${t.kind}" no existe.`);
    (t.camposEditables || []).forEach((c) => {
      if (!CAMPOS_PLANTILLA[c]) sumar("invalid_template_fields", [`plantillas[${i}].campos_editables`], `"${c}" no es un campo de la plantilla.`);
    });
  });
  return errores;
}

function resumenGrupo(k, v) {
  if (v == null) return "—";
  if (k === "diaCorte") return v.modo === "RELATIVE_TO_SIGNUP" ? "Según fecha de alta" : `Día ${v.dia} del mes`;
  if (k === "anticipacion") return `${v.dias} ${v.dias === 1 ? "día" : "días"} antes del vencimiento`;
  if (k === "gracia") return `${v.dias} ${v.dias === 1 ? "día" : "días"} de gracia`;
  if (k === "tramosMora") return v.map((t) => `${t.nombre} (${t.desde}${t.hasta == null ? " y más" : " a " + t.hasta})`).join(" · ");
  if (k === "recargoMora") return v.tipo === "NONE" ? "Sin recargo"
    : `${v.tipo === "PERCENT" ? v.valor + "%" : money(v.valor)} · ${APLICACIONES_RECARGO[v.aplicacion] || v.aplicacion} · ${Number(v.tope) > 0 ? "tope " + money(v.tope) : "sin tope"}`;
  if (k === "suspension") return `tras ${v.cargosVencidos} cargos vencidos · reactivación ${(REACTIVACIONES[v.reactivacion] || v.reactivacion).toLowerCase()}`;
  if (k === "cadencia") return v.length === 0 ? "Sin avisos"
    : v.map((a) => `${a.kind} ${a.offset > 0 ? "+" : ""}${a.offset}${a.on ? "" : " (apagado)"}`).join(" · ");
  if (k === "renovacionConDeuda") return POLITICAS_RENOVACION[v.politica] || v.politica;
  if (k === "limiteRechazos") return v.consecutivos === 0 ? "Sin límite" : `${v.consecutivos} rechazos consecutivos`;
  return JSON.stringify(v);
}

function diffReglas(antes, despues) {
  return GRUPOS.filter((g) => firma(antes[g.k]) !== firma(despues[g.k])).map((g) => ({
    campo: g.k, label: g.l,
    antes: resumenGrupo(g.k, antes[g.k]), despues: resumenGrupo(g.k, despues[g.k]),
  }));
}

function seed() {
  const perfiles = [
    ["44871203", "Lucía Ramírez Paredes",     "lucia.ramirez@gmail.com",      "987654321", "p-full",     "al_dia"],
    ["41209887", "Diego Salcedo Vargas",      "diego.salcedo@outlook.com",    "986112340", "p-full",     "pendiente"],
    ["70123456", "Mariana Ocampo Ruiz",       "mariana.ocampo@gmail.com",     "912223344", "p-esencial", "mora_30"],
    ["09887654", "Carlos Benavides León",     "cbenavides@empresa.pe",        "998877665", "p-esencial", "al_dia"],
    ["46552118", "Andrea Chávez Molina",      "andrea.chavez@gmail.com",      "977665544", "p-full",     "mora_60"],
    ["72884190", "Renzo Ibáñez Cortez",       "renzo.ibanez@gmail.com",       "933221100", "p-corp",     "pendiente"],
    ["20512345678", "Servicios Andinos SAC",  "facturacion@serviciosandinos.pe", "914785236", "p-corp",  "mora_90"],
    ["43998210", "Paola Núñez Ferrer",        "paola.nunez@gmail.com",        "",          "p-esencial", "al_dia"],
    ["48112907", "Sebastián Loayza Prado",    "sebastian.loayza@gmail.com",   "965874123", "p-full",     "parcial"],
    ["45003311", "Valeria Ttito Quispe",      "valeria.ttito@gmail.com",      "951236478", "p-anual",    "al_dia"],
    ["42665510", "Jorge Alcántara Vega",      "jorge.alcantara@gmail.com",    "900112233", "p-full",     "mora_120"],
    ["47001122", "Camila Fuentes Rojas",      "camila.fuentes@gmail.com",     "911223344", "p-esencial", "pendiente"],
    ["43887766", "Iván Portocarrero Díaz",    "ivan.portocarrero@gmail.com",  "922113355", "p-full",     "al_dia"],
    ["46998877", "Silvana Barrios Peña",      "silvana.barrios@gmail.com",    "933556677", "p-esencial", "mora_30"],
    ["41556677", "Óscar Villanueva Soto",     "oscar.villanueva@gmail.com",   "944778899", "p-corp",     "al_dia"],
    ["48223344", "Daniela Espinoza Cruz",     "daniela.espinoza@gmail.com",   "955001122", "p-full",     "pendiente"],
    ["42998811", "Fernando Cáceres Luna",     "fernando.caceres@gmail.com",   "966334455", "p-esencial", "mora_60"],
    ["45771122", "Gabriela Mendoza Ríos",     "gabriela.mendoza@gmail.com",   "977889900", "p-full",     "al_dia"],
    ["49001133", "Álvaro Del Solar Paz",      "alvaro.delsolar@gmail.com",    "988112233", "p-anual",    "pendiente"],
    ["44223355", "Patricia Loza Cárdenas",    "patricia.loza@gmail.com",      "999223344", "p-esencial", "al_dia"],
    ["47889900", "Rodrigo Tapia Bustos",      "rodrigo.tapia@gmail.com",      "910334455", "p-full",     "mora_30"],
    ["43112244", "Milagros Yañez Arce",       "milagros.yanez@gmail.com",     "921445566", "p-esencial", "al_dia"],
  ];

  let ci = 0;
  perfiles.forEach(([doc, nombre, correo, tel, planId, perfil], i) => {
    const p = plan(planId);
    const sus = {
      id: "s-" + (i + 1), documento: doc, nombre, correo, telefono: tel,
      planId, monto: p.monto, periodicidad: p.periodicidad,
      estado: perfil === "mora_120" ? "SUSPENDED" : "ACTIVE",
      altaEl: iso(addMes(HOY, -(6 + (i % 8)))),
      saldoFavor: 0, perfil,
    };
    S.suscriptores.push(sus);

    const plantillas = {
      al_dia:   [["PAID", -2], ["PAID", -1], ["PENDING", 0.2]],
      pendiente:[["PAID", -2], ["PAID", -1], ["PENDING", 0]],
      parcial:  [["PAID", -2], ["PARTIALLY_PAID", -1], ["PENDING", 0]],
      mora_30:  [["PAID", -3], ["OVERDUE", -1], ["PENDING", 0]],
      mora_60:  [["PAID", -4], ["OVERDUE", -2], ["OVERDUE", -1]],
      mora_90:  [["OVERDUE", -3], ["OVERDUE", -2], ["OVERDUE", -1]],
      mora_120: [["IN_ARREARS", -4], ["IN_ARREARS", -3], ["IN_ARREARS", -2]],
    }[perfil];

    const snapshot = reglaEfectiva(planId);

    plantillas.forEach(([estado, offMes]) => {
      const base = addMes(HOY, Math.trunc(offMes));
      const venc = new Date(base.getFullYear(), base.getMonth(), snapshot.diaCorte.dia);
      if (offMes > 0) venc.setMonth(venc.getMonth() + 1);
      const cicloIni = new Date(venc.getFullYear(), venc.getMonth(), 1);
      const cicloFin = new Date(venc.getFullYear(), venc.getMonth() + 1, 0);
      const pagado = estado === "PAID" ? sus.monto : estado === "PARTIALLY_PAID" ? r2(sus.monto * 0.4) : 0;
      ci += 1;
      const cargo = {
        id: "C-" + String(2600 + ci),
        suscriptorId: sus.id, planId,
        periodo: `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}`,
        cicloIni: iso(cicloIni), cicloFin: iso(cicloFin),
        emitido: iso(addDia(venc, -snapshot.anticipacion.dias)), vence: iso(venc),
        base: sus.monto, mora: 0, pagado: r2(pagado),
        estado, medio: estado === "PAID" ? (ci % 3 === 0 ? "QR" : "CARD") : null,
        pagadoEl: estado === "PAID" ? iso(addDia(venc, -1)) : null,
        intentos: estado === "OVERDUE" || estado === "IN_ARREARS" ? 2 : estado === "PAID" ? 1 : 0,
        avisos: [], manual: false, rulesSnapshot: clonar(snapshot),
      };
      cargo.mora = moraCalculada(cargo);
      sellarComision(cargo);
      S.cargos.push(cargo);
    });
  });
}

const total = (c) => r2(c.base + c.mora);
const saldo = (c) => r2(total(c) - c.pagado);
const atrasoDias = (c) => Math.max(0, dias(new Date(c.vence + "T00:00:00"), HOY));
const esMoroso = (c) => ESTADOS[c.estado].moroso;
const sus = (id) => S.suscriptores.find((x) => x.id === id);
const cargosDe = (id) => S.cargos.filter((c) => c.suscriptorId === id);
const deudaDe = (id) => r2(cargosDe(id).filter((c) => esMoroso(c) || c.estado === "PENDING" || c.estado === "PARTIALLY_PAID").reduce((a, c) => a + saldo(c), 0));
const moraDe = (id) => r2(cargosDe(id).filter(esMoroso).reduce((a, c) => a + c.mora, 0));
const atrasoMax = (id) => Math.max(0, ...cargosDe(id).filter(esMoroso).map(atrasoDias), 0);

function tramosDe(lista) {
  return (lista || []).map((t, i) => ({
    ...t, label: t.nombre, min: t.desde,
    max: t.hasta == null ? Infinity : t.hasta,
    id: `t${i + 1}_${t.desde}_${t.hasta == null ? "mas" : t.hasta}`,
    color: COLORES_TRAMO[i % COLORES_TRAMO.length],
  }));
}
function tramosCartera() { return tramosDe(S.reglaCartera.tramosMora); }
function tramoPorId(id) { return tramosCartera().find((t) => t.id === id) || { id, label: "tramo", color: "#5A6078" }; }
function tramoDe(d, lista) {
  return tramosDe(lista || S.reglaCartera.tramosMora).find((t) => d >= t.min && d <= t.max) || null;
}

function reglaDelCargo(c) { return c.rulesSnapshot || reglaEfectiva(c.planId); }
function atrasoEfectivo(c) { return Math.max(0, atrasoDias(c) - Number(reglaDelCargo(c).gracia.dias || 0)); }

function moraCalculada(c) {
  if (!ESTADOS[c.estado].moroso) return 0;
  const recargo = reglaDelCargo(c).recargoMora;
  if (!recargo || recargo.tipo === "NONE") return 0;
  const atraso = atrasoEfectivo(c);
  if (atraso <= 0) return 0;
  const periodos = Math.max(1, Math.ceil(atraso / 30));
  const unidad = recargo.tipo === "PERCENT" ? c.base * (Number(recargo.valor) / 100) : Number(recargo.valor);
  const bruto = r2(unidad * periodos);
  return Number(recargo.tope) > 0 ? r2(Math.min(bruto, Number(recargo.tope))) : bruto;
}

function evaluarSuspension(suscriptorId) {
  const vencidos = cargosDe(suscriptorId).filter(esMoroso).sort((a, b) => (a.vence < b.vence ? -1 : 1));
  if (vencidos.length === 0) return { vencidos: 0, limite: null, corresponde: false, reactivacion: null };
  const regla = reglaDelCargo(vencidos[0]).suspension;
  return {
    vencidos: vencidos.length, limite: regla.cargosVencidos,
    corresponde: vencidos.length >= regla.cargosVencidos, reactivacion: regla.reactivacion,
  };
}

function avisosDelCargo(c) {
  const venc = new Date(c.vence + "T00:00:00");
  return reglaDelCargo(c).cadencia
    .filter((a) => a.on && a.kind !== "PAYMENT_CONFIRMED")
    .map((a) => ({ ...a, cuando: iso(addDia(venc, a.offset)) }))
    .sort((a, b) => (a.cuando < b.cuando ? -1 : 1));
}

function avisosProximos(planId, ventana) {
  const cadencia = reglaEfectiva(planId).cadencia.filter((a) => a.on && a.kind !== "PAYMENT_CONFIRMED");
  const hasta = addDia(HOY, ventana);
  const abiertos = S.cargos.filter((c) => c.planId === planId && c.estado !== "CANCELLED" && saldo(c) > 0);
  let cuenta = 0;
  abiertos.forEach((c) => {
    const venc = new Date(c.vence + "T00:00:00");
    cadencia.forEach((a) => {
      const cuando = addDia(venc, a.offset);
      if (cuando >= HOY && cuando <= hasta) cuenta += 1;
    });
  });
  return { total: cuenta, cargosAbiertos: abiertos.length, cadenciaVacia: cadencia.length === 0 };
}

function proximoCobro(s) {
  const corte = reglaEfectiva(s.planId).diaCorte;
  const dia = corte.modo === "RELATIVE_TO_SIGNUP" ? new Date(s.altaEl + "T00:00:00").getDate() : corte.dia;
  const mes = HOY.getMonth() + 1;
  const ultimo = new Date(HOY.getFullYear(), mes + 1, 0).getDate();
  return iso(new Date(HOY.getFullYear(), mes, Math.min(dia, ultimo)));
}

function bita(entidad, accion, detalle) {
  S.bitacora.unshift({ id: "b" + Date.now() + Math.random(), entidad, accion, detalle, quien: ACTOR, cuando: new Date() });
}

const periodoHoy = () => `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}`;

/// Normaliza la cartera de un comercio a filas comparables. La de YOKI se calcula de S.cargos
/// porque es la cartera viva del prototipo; las demás vienen sembradas.
function filasCartera(m) {
  if (m.cartera) return m.cartera.filas;
  if (!m.esCajaPropia) return [];
  return S.suscriptores.map((s) => ({
    nombre: s.nombre, documento: s.documento, plan: plan(s.planId).nombre, monto: s.monto,
    deuda: deudaDe(s.id), mora: moraDe(s.id), atraso: atrasoMax(s.id), activo: s.estado === "ACTIVE",
  }));
}

function cobradoPeriodoDe(m) {
  if (m.cartera) return m.cartera.cobradoPeriodo;
  if (!m.esCajaPropia) return 0;
  return r2(S.cargos.filter((c) => c.periodo === periodoHoy()).reduce((a, c) => a + c.pagado, 0));
}

/// Lo que el mundo ve SIEMPRE de la cartera de su comercio: cuántos, cuánto, desde cuándo y cuánto
/// se cobró. Ningún nombre sale de acá.
function agregadoComercio(m) {
  const filas = filasCartera(m);
  const porTramo = tramosCartera().map((t) => {
    const g = filas.filter((f) => f.atraso >= t.min && f.atraso <= t.max);
    return { ...t, n: g.length, monto: r2(g.reduce((a, f) => a + f.deuda, 0)) };
  });
  return {
    suscriptores: filas.length,
    activos: filas.filter((f) => f.activo).length,
    deudores: filas.filter((f) => f.atraso > 0).length,
    porCobrar: r2(filas.reduce((a, f) => a + f.deuda, 0)),
    mora: r2(filas.reduce((a, f) => a + f.mora, 0)),
    cobradoPeriodo: cobradoPeriodoDe(m),
    porTramo,
  };
}

/// Agregado siempre, nominal solo con las dos puertas abiertas: que la política del mundo lo pida
/// y que el comercio lo haya autorizado. Si falta una, se dice cuál y qué haría falta.
function visibilidadCartera(m) {
  const aut = m.autorizacionDetalle;
  if (!S.politicaMundo.solicitaDetalleNominal) return {
    nivel: "AGGREGATE", motivo: "world_policy_aggregate_only",
    mensaje: "La política del mundo está fijada en solo agregado: ni siquiera con autorización del comercio se muestran nombres.",
    quehacer: "Para pedir el detalle, activá “Detalle nominal de cartera” en Política del mundo y esperá la autorización del comercio.",
  };
  if (!(aut && aut.otorgada)) return {
    nivel: "AGGREGATE",
    motivo: aut && aut.revocadaEl ? "merchant_authorization_revoked" : "merchant_authorization_required",
    mensaje: aut && aut.revocadaEl
      ? `${m.nombre} revocó la autorización el ${fecha(aut.revocadaEl)}. Desde entonces el mundo ve solo el agregado.`
      : `${m.nombre} todavía no autorizó que el mundo vea su cartera con nombres.`,
    quehacer: `La autorización la otorga ${m.nombre} desde su propio panel, en Reglas y avisos. Es explícita, revocable y queda en bitácora. El mundo no puede dársela a sí mismo.`,
  };
  return {
    nivel: "NOMINAL", motivo: null,
    mensaje: `${m.nombre} autorizó el detalle nominal el ${fecha(aut.cuando)} (${aut.por}).`,
    quehacer: "El comercio puede revocarla en cualquier momento y el mundo vuelve al agregado.",
  };
}

function motivoRolMundo() {
  return S.rol === "LECTURA"
    ? "Tu rol es de solo lectura. Red Pontis puede cambiarlo."
    : "Habilitar comercios, fijar la política del mundo, emitir credenciales y confirmar la revisión de reglas requieren el grupo collections-admin.";
}
function motivoFacultad() {
  return `Red Pontis no delegó a ${S.mundo.nombre} la facultad de habilitación. La habilitación y la entrega de credenciales las hace Red Pontis; acá el estado se ve en consulta.`;
}
function puedeAdministrarMundo() { return S.rol === "ADMIN"; }
function bloqueoMundo() {
  if (!puedeAdministrarMundo()) return motivoRolMundo();
  if (!S.mundo.facultadDelegada) return motivoFacultad();
  return null;
}

/// Puerta única de toda escritura de esta pista. Devuelve el código de error en vez de escribir, así
/// llamar a la función por código tampoco deja pasar nada.
function guardaMundo(merchantId, opciones = {}) {
  if (!puedeAdministrarMundo()) return { ok: false, codigo: "forbidden", mensaje: motivoRolMundo() };
  let m = null;
  if (merchantId != null) {
    m = comercioPorId(merchantId);
    if (!m || m.worldId !== S.mundo.id) return {
      ok: false, codigo: "forbidden",
      mensaje: `El comercio ${merchantId} no pertenece a ${S.mundo.nombre}. No se escribió nada.`,
    };
  }
  if (opciones.exigeFacultad !== false && !S.mundo.facultadDelegada)
    return { ok: false, codigo: "delegation_not_granted", mensaje: motivoFacultad() };
  if (opciones.exigeHabilitado && !(m && m.capacidad.estado === "ENABLED")) return {
    ok: false, codigo: "capability_not_enabled",
    mensaje: `${m ? m.nombre : "El comercio"} no tiene la capacidad habilitada.`,
  };
  return { ok: true, comercio: m };
}

function habilitarCobranzas(merchantId) {
  const g = guardaMundo(merchantId);
  if (!g.ok) return g;
  const m = g.comercio;
  if (m.capacidad.estado === "NOT_CONTRACTED") return {
    ok: false, codigo: "capability_not_contracted",
    mensaje: `${m.nombre} no tiene contratado el Gestor de Cobranzas. La venta la hace Red Pontis; el mundo solo habilita lo contratado.`,
  };
  if (m.capacidad.estado === "ENABLED") return {
    ok: false, codigo: "capability_already_enabled", mensaje: `${m.nombre} ya lo tiene habilitado.`,
  };
  const reactivacion = !!m.capacidad.habilitadoEl;
  m.capacidad.estado = "ENABLED";
  m.capacidad.habilitadoEl = iso(HOY);
  m.capacidad.habilitadoPor = ACTOR;
  m.capacidad.deshabilitadoEl = null;
  m.capacidad.politicaSnapshot = clonar(S.politicaMundo);
  m.capacidad.revisionPendiente = reactivacion;
  m.credenciales.filter((c) => c.estado === "SUSPENDED").forEach((c) => { c.estado = "DELIVERED"; });
  bita("merchant_module", "HABILITAR",
    `comercio ${m.nombre} (${m.id}) · mundo ${S.mundo.nombre} (${S.mundo.id}) · module_code cobranzas · enabled true · scope MERCHANT · ${fecha(HOY)} · actor ${ACTOR} · política vigente: ${resumenPolitica(S.politicaMundo)}`);
  return { ok: true, comercio: m, reactivacion };
}

function deshabilitarCobranzas(merchantId) {
  const g = guardaMundo(merchantId, { exigeHabilitado: true });
  if (!g.ok) return g;
  const m = g.comercio;
  const filas = filasCartera(m);
  m.capacidad.estado = "DISABLED";
  m.capacidad.deshabilitadoEl = iso(HOY);
  const suspendidas = m.credenciales.filter((c) => c.estado === "DELIVERED");
  suspendidas.forEach((c) => { c.estado = "SUSPENDED"; });
  bita("merchant_module", "DESHABILITAR",
    `comercio ${m.nombre} (${m.id}) · mundo ${S.mundo.nombre} (${S.mundo.id}) · enabled false · ${fecha(HOY)} · actor ${ACTOR} · ${filas.length} suscriptores y sus cargos quedan intactos · ${suspendidas.length} credenciales suspendidas, ningún usuario de Cognito borrado`);
  return { ok: true, comercio: m, conservados: filas.length, credenciales: suspendidas.length };
}

function confirmarRevisionReglas(merchantId) {
  if (!puedeAdministrarMundo()) return { ok: false, codigo: "forbidden", mensaje: motivoRolMundo() };
  const m = comercioPorId(merchantId);
  if (!m || m.worldId !== S.mundo.id) return {
    ok: false, codigo: "forbidden", mensaje: `El comercio ${merchantId} no pertenece a ${S.mundo.nombre}. No se escribió nada.`,
  };
  if (!m.capacidad.revisionPendiente) return {
    ok: false, codigo: "review_not_pending", mensaje: `${m.nombre} no tiene revisión de reglas pendiente.`,
  };
  m.capacidad.revisionPendiente = false;
  bita("merchant_module", "CONFIRMAR_REVISION",
    `comercio ${m.nombre} (${m.id}) · revisión de reglas confirmada tras la reactivación · ${fecha(HOY)} · actor ${ACTOR} · queda habilitado para volver a emitir`);
  return { ok: true, comercio: m };
}

const CORREO_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function mascaraSecreto(sec) { return "cob_live_" + "•".repeat(8) + String(sec).slice(-4); }
function secretoVisible(c) { return c.revelado ? mascaraSecreto(c.secreto) : c.secreto; }
function credencialVigente(m, correo) {
  return m.credenciales.find((c) => c.correo === correo && (c.estado === "DELIVERED" || c.estado === "SUSPENDED")) || null;
}

function emitirCredencial({ merchantId, correo, rol, confirmarReemision }) {
  const g = guardaMundo(merchantId, { exigeHabilitado: true });
  if (!g.ok) return g;
  const m = g.comercio;
  const mail = String(correo == null ? "" : correo).trim().toLowerCase();
  if (!CORREO_OK.test(mail)) return {
    ok: false, codigo: "invalid_email", mensaje: `"${correo}" no tiene formato de correo. No se creó usuario ni credencial.`,
  };
  if (!ROLES_ENTREGA[rol]) return {
    ok: false, codigo: "invalid_role", mensaje: `El rol tiene que ser uno de ${Object.keys(ROLES_ENTREGA).join(", ")}.`,
  };
  const previa = credencialVigente(m, mail);
  if (previa && !confirmarReemision) return {
    ok: false, codigo: "credential_reissue_requires_confirmation", previa,
    mensaje: `${mail} ya tiene una credencial entregada el ${fecha(previa.entregadaEl)}. Reemitir la invalida y hay que confirmarlo.`,
  };
  if (S.simulado.idpCaido) {
    const intento = {
      id: "cr-err-" + m.credenciales.length + "-" + Date.now(), correo: mail, rol, scopeType: "COLLECTIONS_MERCHANT", estado: "ERROR",
      secreto: null, revelado: true, entregadaEl: null, por: ACTOR, motivo: "identity_provider_unavailable",
    };
    m.credenciales.unshift(intento);
    bita("delivery", "ERROR",
      `comercio ${m.nombre} (${m.id}) · ${mail} como ${rol} · identity_provider_unavailable · no se creó usuario ni credencial · reintentable · actor ${ACTOR}`);
    return {
      ok: false, codigo: "identity_provider_unavailable", credencial: intento,
      mensaje: "Cognito no respondió. No se creó el usuario ni se emitió la credencial: la entrega quedó en estado de error y se puede reintentar.",
    };
  }
  if (previa) {
    previa.estado = "REVOKED";
    previa.revocadaEl = iso(HOY);
  }
  const cred = {
    id: "cr-" + m.credenciales.length + "-" + Date.now(), correo: mail, rol, scopeType: "COLLECTIONS_MERCHANT", estado: "DELIVERED",
    secreto: "cob_live_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6),
    revelado: false, entregadaEl: iso(HOY), por: ACTOR, motivo: null,
  };
  m.credenciales.unshift(cred);
  bita("delivery", previa ? "REEMITIR" : "ENTREGAR",
    `comercio ${m.nombre} (${m.id}) · mundo ${S.mundo.nombre} · usuario ${mail} creado o localizado en Cognito y agregado al grupo ${rol} · portal_credential scope_type COLLECTIONS_MERCHANT · ${fecha(HOY)} · actor ${ACTOR}${previa ? ` · invalida la credencial del ${fecha(previa.entregadaEl)}` : ""}`);
  const enClaro = cred.secreto;
  cred.revelado = true;
  return { ok: true, comercio: m, credencial: cred, secreto: enClaro, reemision: !!previa };
}

function guardarPoliticaMundo(p) {
  if (!puedeAdministrarMundo()) return { ok: false, codigo: "forbidden", mensaje: motivoRolMundo() };
  const errores = validarPoliticaMundo(p);
  if (errores.length) return { ok: false, codigo: "invalid_policy", errores, mensaje: `La política no se guardó: ${errores.length} ${errores.length === 1 ? "problema" : "problemas"} por corregir.` };
  const antes = clonar(S.politicaMundo);
  const cambios = diffPolitica(antes, p);
  if (cambios.length === 0) return { ok: false, codigo: "no_changes", mensaje: "No hay nada distinto para guardar." };
  S.politicaMundo = clonar(p);
  S.borradorPolitica = null;
  S.erroresPolitica = [];
  cambios.forEach((c) => bita("world_collection_policy", "ACTUALIZAR",
    `mundo ${S.mundo.nombre} (${S.mundo.id}) · ${c.campo}: "${c.antes}" → "${c.despues}" · aplica a lo que se cree desde ${fecha(HOY)}, no retroactivo · actor ${ACTOR}`));
  return { ok: true, cambios };
}

/// Del lado del comercio: autoriza o revoca que su mundo vea la cartera con nombres.
function autorizarDetalleCartera(merchantId, otorgar) {
  if (S.rol !== "ADMIN") return { ok: false, codigo: "forbidden", mensaje: motivoRolMundo() };
  const m = comercioPorId(merchantId);
  if (!m) return { ok: false, codigo: "forbidden", mensaje: `El comercio ${merchantId} no existe. No se escribió nada.` };
  if (otorgar) m.autorizacionDetalle = { otorgada: true, cuando: iso(HOY), por: ACTOR, revocadaEl: null };
  else m.autorizacionDetalle = {
    otorgada: false, cuando: m.autorizacionDetalle ? m.autorizacionDetalle.cuando : null,
    por: ACTOR, revocadaEl: iso(HOY),
  };
  bita("merchant_data_sharing", otorgar ? "AUTORIZAR" : "REVOCAR",
    `comercio ${m.nombre} (${m.id}) ${otorgar ? "autoriza" : "revoca"} que ${S.mundo.nombre} vea el detalle nominal de su cartera · ${fecha(HOY)} · actor ${ACTOR}`);
  return { ok: true, comercio: m, otorgada: otorgar };
}

function activarPlantilla(kind, activa) {
  if (!puedeEditarReglas()) return { ok: false, codigo: "forbidden", mensaje: motivoRolMundo() };
  const t = plantillaPolitica(kind);
  const propia = S.plantillasComercio[kind];
  if (!t || !propia) return { ok: false, codigo: "not_found", mensaje: "Esa plantilla no está en la política del mundo." };
  if (!activa && t.obligatoria) return {
    ok: false, codigo: "policy_template_mandatory",
    mensaje: `"${t.nombre}" es obligatoria por política de ${S.mundo.nombre}: no se puede desactivar desde el comercio.`,
  };
  propia.activa = !!activa;
  bita("merchant_notification_template", activa ? "ACTIVAR" : "DESACTIVAR",
    `plantilla ${kind} ${activa ? "activada" : "desactivada"} en el comercio · actor ${ACTOR}`);
  return { ok: true };
}

function editarPlantilla(kind, valores) {
  if (!puedeEditarReglas()) return { ok: false, codigo: "forbidden", mensaje: motivoRolMundo() };
  const t = plantillaPolitica(kind);
  const propia = S.plantillasComercio[kind];
  if (!t || !propia) return { ok: false, codigo: "not_found", mensaje: "Esa plantilla no está en la política del mundo." };
  const prohibidos = Object.keys(valores).filter((c) => !campoEditable(kind, c));
  if (prohibidos.length) return {
    ok: false, codigo: "policy_field_not_editable", campos: prohibidos,
    mensaje: `${S.mundo.nombre} dejó editable solo ${t.camposEditables.map((c) => CAMPOS_PLANTILLA[c]).join(", ") || "ningún campo"} de "${t.nombre}". No se escribió nada.`,
  };
  const cambios = Object.keys(valores).filter((c) => propia[c] !== valores[c]);
  cambios.forEach((c) => { propia[c] = valores[c]; });
  if (cambios.length) bita("merchant_notification_template", "ACTUALIZAR",
    `plantilla ${kind} · campos ${cambios.join(", ")} · actor ${ACTOR}`);
  return { ok: true, cambios };
}

/// Las ocho pestañas de la cartera son iguales en las dos cajas. Las dos de gobierno del mundo
/// existen solo cuando la caja es de alcance WORLD: en la caja de un comercio no hay nada que
/// gobernar y la pestaña no se renderiza.
const TABS_CARTERA = [
  { k: "resumen",      l: "Resumen",      i: "dashboard" },
  { k: "planes",       l: "Planes",       i: "workspace_premium" },
  { k: "suscriptores", l: "Suscriptores", i: "groups" },
  { k: "carga",        l: "Cargar cartera", i: "upload_file" },
  { k: "cobros",       l: "Cobros",       i: "receipt_long" },
  { k: "morosidad",    l: "Morosidad",    i: "running_with_errors" },
  { k: "prorateo",     l: "Prorateo",     i: "calculate" },
  { k: "reglas",       l: "Reglas y avisos", i: "tune" },
];

const TABS_MUNDO = [
  { k: "comercios", l: "Comercios",          i: "storefront" },
  { k: "politica",  l: "Política del mundo", i: "policy" },
];

function tabsVisibles() {
  return esCajaDeMundo() ? TABS_CARTERA.concat(TABS_MUNDO) : TABS_CARTERA.slice();
}

function renderTabs() {
  const tabs = tabsVisibles();
  document.getElementById("tabs").innerHTML = tabs.map((t) =>
    `${t.k === "comercios" ? `<p class="navgh">Gobierno del mundo</p>` : ""}
     <button class="navtab ${S.tab === t.k ? "on" : ""}" data-tab="${t.k}"><span class="msi">${t.i}</span>${t.l}</button>`
  ).join("");
  document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { S.tab = b.dataset.tab; render(); });
}

const ROLES = {
  "collections-admin":    { nivel: "ADMIN",    label: "Administrador", puede: "Todo: planes, precios, reglas, cartera, prorateo y anulaciones." },
  "collections-operator": { nivel: "OPERADOR", label: "Operador",      puede: "Cargar cartera, cobrar, recordar y registrar pagos. No cambia reglas ni precios." },
  "collections-readonly": { nivel: "LECTURA",  label: "Solo lectura",  puede: "Ver y exportar. Ninguna escritura." },
};

const CAJAS = [
  { id: "yoki", scope: "MERCHANT", code: "yoki", titulo: "YOKI",
    detalle: "Gestor de Cobranzas · YOKI · Jockey Plaza", sub: "Comercio · RUC 20512345678 · PEN",
    ruta: "/joi360app/cobranzas/comercio/yoki", ico: "card_membership",
    grad: "linear-gradient(135deg,#6B4FA3,#3B5BDB)" },
  { id: "jockey", scope: "WORLD", code: "JOCKEY-01", titulo: "Jockey Plaza",
    detalle: "Gestor de Cobranzas · Jockey Plaza", sub: "Mundo · cartera propia del mundo · PEN",
    ruta: "/joi360app/cobranzas/mundo/JOCKEY-01", ico: "public",
    grad: "linear-gradient(135deg,#1A3270,#1F66B8)" },
];

function pintarLogin() {
  const cont = document.getElementById("lroles");
  cont.innerHTML = Object.entries(ROLES).map(([g, r]) =>
    `<button class="chip ${S.grupo === g ? "on" : ""}" data-rol="${g}">${r.label}</button>`).join("");
  document.getElementById("lrolhint").innerHTML =
    `<span class="mono">${S.grupo}</span> → nivel <b>${ROLES[S.grupo].nivel}</b>. ${ROLES[S.grupo].puede}`;
  document.querySelectorAll("[data-rol]").forEach((b) => b.onclick = () => { S.grupo = b.dataset.rol; pintarLogin(); });

  document.getElementById("lcajas").innerHTML = CAJAS.map((c) => `
    <button class="lcaja" data-caja="${c.id}">
      <span class="ci" style="background:${c.grad}"><span class="msi">${c.ico}</span></span>
      <span class="cb"><b>${c.titulo}</b><span>${c.detalle}</span><code>${c.ruta}</code></span>
      <span class="msi" style="color:var(--outline)">chevron_right</span>
    </button>`).join("");
  document.querySelectorAll("[data-caja]").forEach((b) => b.onclick = () => entrar(b.dataset.caja));
}

function entrar(cajaId) {
  S.caja = CAJAS.find((c) => c.id === cajaId);
  S.rol = ROLES[S.grupo].nivel;
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "flex";
  document.getElementById("navTitular").textContent = S.caja.titulo;
  document.getElementById("navRol").textContent = ROLES[S.grupo].label;
  document.getElementById("topTitle").textContent = `Gestor de Cobranzas · ${S.caja.titulo}`;
  document.getElementById("topScope").innerHTML =
    `<span class="dot"></span>${S.caja.scope === "WORLD" ? "Alcance mundo" : "Alcance comercio"}`;
  document.getElementById("titNombre").textContent = S.caja.titulo;
  document.getElementById("titSub").innerHTML = esc(S.caja.sub);
  document.getElementById("titLogo").style.background = S.caja.grad;
  document.getElementById("titLogo").innerHTML = `<span class="msi">${S.caja.ico}</span>`;
  S.tab = "resumen";
  render();
  toast(`Entraste como ${ROLES[S.grupo].label} a la cartera de ${S.caja.titulo}.`, "info");
}

function salir() {
  document.getElementById("app").style.display = "none";
  document.getElementById("login").style.display = "flex";
  pintarLogin();
}

/// El servidor ya bloquea la escritura al nivel LECTURA de forma transversal. Acá se deshabilita
/// con el motivo visible, en vez de esconder la acción: así el operador entiende por qué no puede.
function bloquear(selectores, motivo) {
  selectores.forEach((sel) => document.querySelectorAll(sel).forEach((b) => {
    b.disabled = true; b.title = motivo; b.style.opacity = ".45"; b.style.cursor = "not-allowed";
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toast(motivo, "err"); };
  }));
}

function aplicarSoloLectura() {
  if (S.rol === "LECTURA") {
    bloquear(["#view .btn.bp", "#view .mini", "#view .sw", "#view #drop", `#view [data-w="rule"]`, `#view [data-w="world"]`],
      "Tu rol es de solo lectura. Red Pontis puede cambiarlo.");
    return;
  }
  if (S.rol === "OPERADOR") {
    bloquear(["#view #nuevoPlan", "#view [data-precio]", "#view #okReglas", "#view .sw", `#view [data-w="rule"]`],
      "Cambiar reglas y precios requiere el grupo collections-admin.");
    bloquear([`#view [data-w="world"]`], motivoRolMundo());
  }
}

function puedeEditarReglas() { return S.rol === "ADMIN"; }

const VISTAS = {
  resumen:      [vResumen, wResumen],
  planes:       [vPlanes, wPlanes],
  suscriptores: [vSuscriptores, wSuscriptores],
  carga:        [vCarga, wCarga],
  cobros:       [vCobros, wCobros],
  morosidad:    [vMorosidad, wMorosidad],
  prorateo:     [vProrateo, wProrateo],
  reglas:       [vReglas, wReglas],
  comercios:    [vComercios, wComercios],
  politica:     [vPolitica, wPolitica],
};

function render() {
  if (!tabsVisibles().some((t) => t.k === S.tab)) S.tab = "resumen";
  renderTabs();
  const v = document.getElementById("view");
  const [vista, wire] = VISTAS[S.tab];
  v.innerHTML = vista();
  if (wire) wire();
  document.getElementById("roBanner").innerHTML = S.rol === "LECTURA"
    ? `<div class="note n-warn"><span class="msi">visibility</span><div>Estás con el grupo
       <span class="mono">collections-readonly</span>. Podés ver y exportar; las acciones de escritura
       están deshabilitadas.</div></div>`
    : S.rol === "OPERADOR"
      ? `<div class="note n-info"><span class="msi">badge</span><div>Estás con el grupo
         <span class="mono">collections-operator</span>. Podés operar la cobranza; cambiar reglas y
         precios de plan requiere <span class="mono">collections-admin</span>.</div></div>`
      : "";
  aplicarSoloLectura();
  document.querySelector("main.content").scrollTop = 0;
}

function kpi(ico, color, bg, valor, label, det, tab) {
  return `<button class="kpi" ${tab ? `data-goto="${tab}"` : ""}>
    <div class="ico" style="background:${bg};color:${color}"><span class="msi">${ico}</span></div>
    <div class="v">${valor}</div><div class="l">${label}</div>${det ? `<div class="d">${det}</div>` : ""}</button>`;
}

function vResumen() {
  const activos = S.suscriptores.filter((s) => s.estado === "ACTIVE");
  const mrr = r2(activos.reduce((a, s) => a + (s.periodicidad === "ANUAL" ? s.monto / 12 : s.monto), 0));
  const delPeriodo = S.cargos.filter((c) => c.periodo === `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}`);
  const emitido = r2(delPeriodo.reduce((a, c) => a + total(c), 0));
  const cobrado = r2(S.cargos.filter((c) => c.estado === "PAID").reduce((a, c) => a + c.pagado, 0));
  const pendiente = r2(S.cargos.filter((c) => c.estado === "PENDING" || c.estado === "PARTIALLY_PAID").reduce((a, c) => a + saldo(c), 0));
  const vencido = r2(S.cargos.filter(esMoroso).reduce((a, c) => a + saldo(c), 0));
  const deudores = S.suscriptores.filter((s) => atrasoMax(s.id) > 0);
  const tasa = activos.length ? (deudores.length / activos.length) : 0;

  const porTramo = tramosCartera().map((t) => {
    const m = r2(S.cargos.filter((c) => esMoroso(c) && tramoDe(atrasoDias(c))?.id === t.id).reduce((a, c) => a + saldo(c), 0));
    return { ...t, monto: m };
  });
  const maxTramo = Math.max(1, ...porTramo.map((t) => t.monto));

  const meses = [-4, -3, -2, -1, 0].map((off) => {
    const d = addMes(HOY, off);
    const per = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cs = S.cargos.filter((c) => c.periodo === per);
    return {
      label: d.toLocaleDateString("es-PE", { month: "short" }).replace(".", ""),
      emitido: r2(cs.reduce((a, c) => a + total(c), 0)),
      cobrado: r2(cs.reduce((a, c) => a + c.pagado, 0)),
    };
  });
  const maxMes = Math.max(1, ...meses.map((m) => m.emitido));

  const prox = {};
  S.cargos.filter((c) => c.estado === "PENDING").forEach((c) => {
    prox[c.vence] = prox[c.vence] || { n: 0, m: 0 };
    prox[c.vence].n += 1; prox[c.vence].m += total(c);
  });
  const proxLista = Object.entries(prox).sort((a, b) => a[0] < b[0] ? -1 : 1).slice(0, 4);

  const porEstado = Object.keys(ESTADOS).map((k) => ({
    k, ...ESTADOS[k],
    n: S.cargos.filter((c) => c.estado === k).length,
    m: r2(S.cargos.filter((c) => c.estado === k).reduce((a, c) => a + total(c), 0)),
  })).filter((x) => x.n > 0);

  return `
  <div class="banner">
    <div>
      <h3>Lo que este panel responde</h3>
      <p>Quién te debe, cuánto te debe, desde cuándo, y cuánto es el prorateo si alguien cambia de plan.
      Desde cualquier fila podés disparar el recordatorio con su link de pago y su QR.</p>
    </div>
    <span class="msi">query_stats</span>
  </div>

  <div class="kpis">
    ${kpi("groups", "#1A3270", "#EEF2FD", activos.length, "Cartera activa", money0(mrr) + " recurrente / mes", "suscriptores")}
    ${kpi("payments", "#097A54", "#E7F5EF", money0(cobrado), "Cobrado acumulado", "todos los períodos", "cobros")}
    ${kpi("hourglass_top", "#1F66B8", "#EAF2FC", money0(pendiente), "Pendiente", S.cargos.filter((c) => c.estado === "PENDING").length + " cargos por vencer", "cobros")}
    ${kpi("running_with_errors", "#C8202F", "#FCECEE", money0(vencido), "Vencido", deudores.length + " deudores", "morosidad")}
    ${kpi("percent", "#AB4F00", "#FDF1E3", (tasa * 100).toFixed(1) + "%", "Tasa de morosidad", "sobre cartera activa", "morosidad")}
    ${kpi("trending_up", "#6B4FA3", "#F1ECF9", money0(emitido), "Emitido este mes", "proyección " + money0(mrr), "cobros")}
  </div>

  <div class="grid2" style="align-items:start">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Emitido y cobrado</h3><p>Últimos cinco períodos</p></div></div>
      <div class="spark">
        ${meses.map((m) => `<div class="col" title="${m.label}: emitido ${money(m.emitido)} · cobrado ${money(m.cobrado)}">
          <div class="s2" style="height:${(m.emitido / maxMes) * 100}%"></div>
          <div class="s1" style="height:${(m.cobrado / maxMes) * 100}%;margin-top:-100%;position:relative"></div>
        </div>`).join("")}
      </div>
      <div style="display:flex;gap:6px">${meses.map((m) => `<div class="sl" style="flex:1">${m.label}</div>`).join("")}</div>
      <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--osv)">
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--ok);border-radius:2px;margin-right:5px"></span>Cobrado</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--ov);border-radius:2px;margin-right:5px"></span>Emitido</span>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Antigüedad de la deuda</h3><p>Cuánto y desde cuándo</p></div></div>
      <div class="bars">
        ${porTramo.map((t) => `<div class="bar">
          <span class="bl">${t.label}</span>
          <span class="btrack"><span class="bfill" style="width:${(t.monto / maxTramo) * 100}%;background:${t.color}"></span></span>
          <span class="bv">${money(t.monto)}</span></div>`).join("")}
      </div>
      <button class="link" data-goto="morosidad" style="margin-top:14px">Ver deudores <span class="msi" style="font-size:14px">arrow_forward</span></button>
    </div>
  </div>

  <div class="grid2" style="align-items:start;margin-top:24px">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Próximos vencimientos</h3><p>Cargos pendientes por fecha</p></div></div>
      ${proxLista.length === 0 ? `<p style="font-size:13px;color:var(--osv)">Sin cargos pendientes.</p>` :
        proxLista.map(([f, x]) => `<div class="kv"><span class="k">${fecha(f)}</span><span class="v">${x.n} cargos · ${money(x.m)}</span></div>`).join("")}
    </div>
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Distribución por estado</h3><p>Todos los cargos emitidos</p></div></div>
      ${porEstado.map((e) => `<div class="kv"><span class="k"><span class="badge ${e.cls}">${e.label}</span></span><span class="v">${e.n} · ${money(e.m)}</span></div>`).join("")}
    </div>
  </div>`;
}

function wResumen() {
  document.querySelectorAll("[data-goto]").forEach((b) => b.onclick = () => { S.tab = b.dataset.goto; render(); });
}

function vPlanes() {
  const filas = S.planes.map((p) => {
    const subs = S.suscriptores.filter((s) => s.planId === p.id);
    const activos = subs.filter((s) => s.estado === "ACTIVE").length;
    const enMora = subs.filter((s) => atrasoMax(s.id) > 0).length;
    const desfasados = subs.filter((s) => s.monto !== p.monto).length;
    const cobrado = r2(S.cargos.filter((c) => c.planId === p.id).reduce((a, c) => a + c.pagado, 0));
    return { p, activos, enMora, desfasados, cobrado };
  });

  return `
  <div class="note n-info"><span class="msi">info</span>
    <div>Cambiar el precio de un plan <b>no altera a los suscriptores que ya lo tienen</b>. Se crea una versión
    nueva y los vigentes siguen con su monto hasta que migres la cartera con una acción explícita.
    Los cargos ya emitidos nunca cambian.</div></div>

  <div class="sech">
    <div><h3>Planes de YOKI</h3><p>Monto, frecuencia y día de cobro</p></div>
    <button class="btn bp" id="nuevoPlan"><span class="msi">add</span>Nuevo plan</button>
  </div>

  <div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Plan</th><th>Monto</th><th>Frecuencia</th><th>Día de cobro</th><th>Permanencia</th><th>Reglas</th>
      <th class="num">Activos</th><th class="num">En mora</th><th class="num">Cobrado</th><th>Estado</th><th></th></tr></thead>
    <tbody>${filas.map(({ p, activos, enMora, desfasados, cobrado }) => `<tr>
      <td class="strong">${esc(p.nombre)}${desfasados ? `<div style="font-size:10px;color:var(--warning);margin-top:2px">${desfasados} con precio anterior</div>` : ""}</td>
      <td class="num strong">${money(p.monto)}</td>
      <td>${p.periodicidad === "ANUAL" ? "Anual" : "Mensual"}</td>
      <td>${esc(resumenGrupo("diaCorte", reglaEfectiva(p.id).diaCorte))}
        ${reglaEfectiva(p.id).origen.diaCorte === "PLAN" ? `<div style="font-size:10px;color:var(--tertiary);margin-top:2px">regla propia del plan</div>` : ""}</td>
      <td>${p.permanencia ? p.permanencia + " meses" : "Sin permanencia"}</td>
      <td><button class="link" data-reglasplan="${p.id}">${propios(p.id).length
        ? `${propios(p.id).length} de 9 propios` : "Todo heredado"}</button></td>
      <td class="num">${activos}</td>
      <td class="num" style="${enMora ? "color:var(--error);font-weight:600" : ""}">${enMora}</td>
      <td class="num">${money(cobrado)}</td>
      <td><span class="badge ${p.activo ? "b-paid" : "b-cancelled"}">${p.activo ? "Activo" : "Inactivo"}</span></td>
      <td><button class="mini" data-precio="${p.id}"><span class="msi">edit</span>Precio</button></td>
    </tr>`).join("")}</tbody>
  </table></div></div>`;
}

function wPlanes() {
  document.getElementById("nuevoPlan").onclick = drawerNuevoPlan;
  document.querySelectorAll("[data-precio]").forEach((b) => b.onclick = () => drawerPrecio(b.dataset.precio));
  document.querySelectorAll("[data-reglasplan]").forEach((b) => b.onclick = () => irAReglasDePlan(b.dataset.reglasplan));
}

function propios(planId) { return GRUPOS.filter((g) => grupoPropio(planId, g.k)).map((g) => g.k); }

function irAReglasDePlan(planId) {
  S.tab = "reglas"; S.reglaNivel = "PLAN"; S.reglaPlanId = planId;
  S.borradorRegla = null; S.erroresRegla = [];
  render();
}

function drawerNuevoPlan() {
  abrirDrawer({
    titulo: "Nuevo plan", sub: "YOKI · Jockey Plaza", ico: "workspace_premium",
    cuerpo: `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div><label class="fl">Nombre del plan</label><input id="pn" placeholder="Ej. YOKI Premium"></div>
        <div class="grid2">
          <div><label class="fl">Monto (${MONEDA})</label><input id="pm" type="number" step="0.01" min="0" value="0"></div>
          <div><label class="fl">Frecuencia</label><select id="pf">
            <option value="MENSUAL">Mensual</option><option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTRAL">Semestral</option><option value="ANUAL">Anual</option></select></div>
        </div>
        <div class="grid2">
          <div><label class="fl">Modo de cobro</label><select id="pmd">
            ${Object.entries(MODOS_CORTE).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
          <div><label class="fl">Día de cobro</label><input id="pd" type="number" min="1" max="31" value="5"></div>
        </div>
        <p class="hint" style="margin-top:-8px">El día de corte queda como <b>regla propia del plan</b>. Los otros ocho
          grupos de la regla se heredan de la cartera y se ajustan desde Reglas y avisos.</p>
        <div><label class="fl">Permanencia mínima (meses)</label><input id="pp" type="number" min="0" value="0">
          <p class="hint">Cero significa sin permanencia. Una baja dentro de la permanencia pide confirmación.</p></div>
        <div class="note n-warn" style="margin:0"><span class="msi">event_repeat</span>
          <div>Si el día de cobro es 29, 30 o 31, en los meses que no tienen ese día el cargo se emite el último día del mes.</div></div>
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okPlan">Crear plan</button>`,
    luego: () => {
      document.getElementById("okPlan").onclick = () => {
        const nombre = document.getElementById("pn").value.trim();
        const monto = Number(document.getElementById("pm").value);
        if (nombre.length < 3) return toast("El nombre del plan necesita al menos 3 caracteres.", "err");
        if (planPorNombre(nombre)) return toast("Ya existe un plan con ese nombre en este comercio.", "err");
        if (!(monto > 0)) return toast("El monto tiene que ser mayor que cero.", "err");
        const modo = document.getElementById("pmd").value;
        const dia = Number(document.getElementById("pd").value) || 1;
        if (modo === "FIXED_MONTH_DAY" && !(dia >= 1 && dia <= 31))
          return toast("El día de corte tiene que estar entre 1 y 31.", "err");
        S.planes.push({
          id: "p-" + Date.now(), nombre, monto: r2(monto),
          periodicidad: document.getElementById("pf").value,
          permanencia: Number(document.getElementById("pp").value) || 0,
          activo: true,
          reglaPlan: { diaCorte: { modo, dia } },
        });
        bita("collection_plan", "CREAR", `Plan "${nombre}" creado con monto ${money(monto)} y día de corte propio (${resumenGrupo("diaCorte", { modo, dia })})`);
        cerrarDrawer(); toast(`Plan "${nombre}" creado.`); render();
      };
    },
  });
}

function drawerPrecio(planId) {
  const p = plan(planId);
  const vigentes = S.suscriptores.filter((s) => s.planId === planId && s.estado === "ACTIVE");
  abrirDrawer({
    titulo: "Cambiar precio", sub: p.nombre, ico: "price_change",
    cuerpo: `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="kv"><span class="k">Monto vigente</span><span class="v">${money(p.monto)}</span></div>
        <div><label class="fl">Monto nuevo (${MONEDA})</label><input id="np" type="number" step="0.01" min="0" value="${p.monto}"></div>
        <div class="note n-warn" style="margin:0"><span class="msi">group</span>
          <div><b>${vigentes.length} suscriptores</b> tienen este plan hoy. Al guardar el precio nuevo
          <b>siguen con ${money(p.monto)}</b>. Solo cambian si migrás la cartera con el botón de abajo.</div></div>
        <div style="border-top:1px solid var(--ov);padding-top:16px">
          <label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;cursor:pointer">
            <input type="checkbox" id="mig" style="width:16px;height:16px;margin-top:2px">
            <span>Migrar también a los ${vigentes.length} suscriptores vigentes al precio nuevo.
            <span style="color:var(--osv);display:block;font-size:11px;margin-top:2px">Los cargos ya emitidos no cambian. Queda en bitácora.</span></span>
          </label>
        </div>
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okPrecio">Guardar precio</button>`,
    luego: () => {
      document.getElementById("okPrecio").onclick = () => {
        const nuevo = Number(document.getElementById("np").value);
        if (!(nuevo > 0)) return toast("El monto tiene que ser mayor que cero.", "err");
        const anterior = p.monto;
        const migrar = document.getElementById("mig").checked;
        p.monto = r2(nuevo);
        bita("collection_plan_version", "CREAR", `${p.nombre}: precio ${money(anterior)} → ${money(nuevo)}`);
        if (migrar) {
          vigentes.forEach((s) => { s.monto = r2(nuevo); });
          bita("subscription", "MIGRAR_PRECIO", `${vigentes.length} suscriptores de ${p.nombre} migrados a ${money(nuevo)}`);
          toast(`Precio actualizado y ${vigentes.length} suscriptores migrados.`);
        } else {
          toast(`Precio actualizado. Los ${vigentes.length} vigentes siguen con ${money(anterior)}.`, "info");
        }
        cerrarDrawer(); render();
      };
    },
  });
}

function vSuscriptores() {
  return `
  <div class="fbar">
    <div class="search"><span class="msi">search</span><input id="q" placeholder="Buscar por documento, nombre o correo" value="${esc(S.filtros.q)}"></div>
    <select id="fplan" style="width:auto"><option value="">Todos los planes</option>
      ${S.planes.map((p) => `<option value="${p.id}" ${S.filtros.plan === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("")}</select>
    <select id="festado" style="width:auto"><option value="">Toda la cobranza</option>
      <option value="al_dia" ${S.filtros.estado === "al_dia" ? "selected" : ""}>Al día</option>
      <option value="debe" ${S.filtros.estado === "debe" ? "selected" : ""}>Con deuda</option>
      <option value="suspendido" ${S.filtros.estado === "suspendido" ? "selected" : ""}>Suspendidos</option></select>
    <span class="fcount" id="cnt"></span>
    <button class="btn bo" id="expSus"><span class="msi">download</span>CSV</button>
  </div>
  <div id="tblSus"></div>`;
}

function filtrarSus() {
  const q = S.filtros.q.toLowerCase().trim();
  return S.suscriptores.filter((s) => {
    if (q && !(`${s.documento} ${s.nombre} ${s.correo}`.toLowerCase().includes(q))) return false;
    if (S.filtros.plan && s.planId !== S.filtros.plan) return false;
    if (S.filtros.estado === "al_dia" && deudaDe(s.id) > 0) return false;
    if (S.filtros.estado === "debe" && deudaDe(s.id) <= 0) return false;
    if (S.filtros.estado === "suspendido" && s.estado !== "SUSPENDED") return false;
    return true;
  });
}

function tablaSus() {
  const rows = filtrarSus();
  document.getElementById("cnt").textContent = `${rows.length} de ${S.suscriptores.length}`;
  const box = document.getElementById("tblSus");
  if (rows.length === 0) {
    const hayFiltro = S.filtros.q || S.filtros.plan || S.filtros.estado;
    box.innerHTML = `<div class="tablewrap"><div class="empty">
      <span class="msi">${hayFiltro ? "filter_alt_off" : "group_off"}</span>
      <h4>${hayFiltro ? "Ningún suscriptor coincide con los filtros" : "Todavía no cargaste tu cartera"}</h4>
      <p>${hayFiltro ? "Tu cartera sigue completa. Probá con otros filtros." : "Cargá tu archivo para ver acá a toda tu cartera."}</p>
      <button class="btn ${hayFiltro ? "bo" : "bp"}" id="accEmpty">${hayFiltro ? "Limpiar filtros" : "Cargar cartera"}</button>
    </div></div>`;
    document.getElementById("accEmpty").onclick = () => {
      if (hayFiltro) { S.filtros = { q: "", plan: "", estado: "", tramo: "" }; render(); }
      else { S.tab = "carga"; render(); }
    };
    return;
  }
  box.innerHTML = `<div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Documento</th><th>Suscriptor</th><th>Plan</th><th class="num">Monto</th>
      <th>Próximo cobro</th><th>Suscripción</th><th class="num">Deuda</th><th>Antigüedad</th><th></th></tr></thead>
    <tbody>${rows.map((s) => {
      const d = deudaDe(s.id), at = atrasoMax(s.id), t = tramoDe(at);
      return `<tr>
        <td class="mono" style="font-size:12px">${esc(s.documento)}</td>
        <td><div class="strong">${esc(s.nombre)}</div><div style="font-size:11px;color:var(--osv)">${esc(s.correo)}</div></td>
        <td>${esc(plan(s.planId).nombre)}</td>
        <td class="num">${money(s.monto)}</td>
        <td style="font-size:12px">${fecha(proximoCobro(s))}</td>
        <td><span class="badge ${s.estado === "ACTIVE" ? "b-paid" : "b-arrears"}">${s.estado === "ACTIVE" ? "Activa" : "Suspendida"}</span></td>
        <td class="num" style="${d > 0 ? "color:var(--error);font-weight:700" : "color:var(--osv)"}">${d > 0 ? money(d) : "—"}</td>
        <td>${at > 0 ? `<span class="badge" style="background:${t.color}1a;color:${t.color}">${at} días</span>` : `<span style="color:var(--osv)">—</span>`}</td>
        <td><button class="mini" data-ficha="${s.id}"><span class="msi">person</span>Ficha</button></td>
      </tr>`;
    }).join("")}</tbody></table></div></div>`;
  document.querySelectorAll("[data-ficha]").forEach((b) => b.onclick = () => drawerFicha(b.dataset.ficha));
}

function wSuscriptores() {
  tablaSus();
  const q = document.getElementById("q");
  q.oninput = () => { S.filtros.q = q.value; tablaSus(); };
  document.getElementById("fplan").onchange = (e) => { S.filtros.plan = e.target.value; tablaSus(); };
  document.getElementById("festado").onchange = (e) => { S.filtros.estado = e.target.value; tablaSus(); };
  document.getElementById("expSus").onclick = () => exportar("cartera", filtrarSus().map((s) => ({
    documento: s.documento, nombre: s.nombre, correo: s.correo, telefono: s.telefono,
    plan: plan(s.planId).nombre, monto: s.monto, proximo_cobro: proximoCobro(s),
    suscripcion: s.estado, deuda: deudaDe(s.id), mora: moraDe(s.id), antiguedad_dias: atrasoMax(s.id),
  })));
}

function drawerFicha(id) {
  const s = sus(id);
  const cs = cargosDe(id).slice().sort((a, b) => a.vence < b.vence ? 1 : -1);
  const p = plan(s.planId);
  const d = deudaDe(id), at = atrasoMax(id);
  const avisos = cs.flatMap((c) => c.avisos.map((a) => ({ ...a, cargo: c.id })));
  abrirDrawer({
    titulo: s.nombre, sub: `${s.documento} · ${p.nombre}`, ico: "person", ancho: 620,
    cuerpo: `
      ${d > 0 ? `<div class="note n-err"><span class="msi">running_with_errors</span>
        <div>Debe <b>${money(d)}</b> en ${cs.filter((c) => saldo(c) > 0 && c.estado !== "CANCELLED").length} cargos.
        El más viejo lleva <b>${at} días</b> de atraso. Mora acumulada ${money(moraDe(id))}.</div></div>`
        : `<div class="note n-ok"><span class="msi">check_circle</span><div>Está al día. Sin cargos pendientes de pago.</div></div>`}

      ${(() => {
        const sp = evaluarSuspension(id);
        if (!sp.limite) return "";
        return `<div class="note ${sp.corresponde ? "n-warn" : "n-info"}"><span class="msi">pause_circle</span>
          <div>Lleva <b>${sp.vencidos} ${sp.vencidos === 1 ? "cargo vencido" : "cargos vencidos"}</b> y la regla congelada
          del cargo más viejo suspende a los <b>${sp.limite}</b>. ${sp.corresponde ? "Corresponde suspender." : "Todavía no corresponde suspender."}
          Reactivación ${(REACTIVACIONES[sp.reactivacion] || sp.reactivacion).toLowerCase()}.</div></div>`;
      })()}

      <div class="sech" style="margin-top:4px"><h3 style="font-size:13px">Datos</h3></div>
      <div class="kv"><span class="k">Correo</span><span class="v">${esc(s.correo)}</span></div>
      <div class="kv"><span class="k">Teléfono</span><span class="v">${s.telefono ? esc(s.telefono) : "—"}</span></div>
      <div class="kv"><span class="k">Plan</span><span class="v">${esc(p.nombre)} · ${money(s.monto)}</span></div>
      <div class="kv"><span class="k">Frecuencia</span><span class="v">${p.periodicidad === "ANUAL" ? "Anual" : "Mensual"}</span></div>
      <div class="kv"><span class="k">Alta</span><span class="v">${fecha(s.altaEl)}</span></div>
      <div class="kv"><span class="k">Próximo cobro</span><span class="v">${fecha(proximoCobro(s))}</span></div>
      <div class="kv"><span class="k">Saldo a favor</span><span class="v">${s.saldoFavor > 0 ? money(s.saldoFavor) : "—"}</span></div>

      <div class="sech" style="margin-top:22px"><h3 style="font-size:13px">Historial de cargos</h3></div>
      <div class="tl">${cs.map((c) => `<div class="tli">
        <span class="tic"><span class="msi" style="color:${esMoroso(c) ? "var(--error)" : c.estado === "PAID" ? "var(--ok)" : "var(--info)"}">
          ${c.estado === "PAID" ? "check_circle" : esMoroso(c) ? "error" : "schedule"}</span></span>
        <span class="tt"><b>${c.periodo} · ${money(total(c))} <span class="badge ${ESTADOS[c.estado].cls}">${ESTADOS[c.estado].label}</span></b>
          <span>Vence ${fecha(c.vence)}${c.mora > 0 ? ` · mora ${money(c.mora)}` : ""}${saldo(c) > 0 && c.estado !== "PENDING" ? ` · saldo ${money(saldo(c))}` : ""}
            <br><span class="mono" style="font-size:10px;color:var(--outline)">snapshot: gracia ${reglaDelCargo(c).gracia.dias}d ·
            ${reglaDelCargo(c).recargoMora.tipo} ${reglaDelCargo(c).recargoMora.valor} · ${reglaDelCargo(c).cadencia.length} avisos</span></span></span>
        <span class="td">${c.id}</span></div>`).join("")}</div>

      <div class="sech" style="margin-top:22px"><h3 style="font-size:13px">Avisos enviados</h3></div>
      ${avisos.length === 0 ? `<p style="font-size:12px;color:var(--osv)">Todavía no se le envió ningún aviso desde el panel.</p>`
        : `<div class="tl">${avisos.map((a) => `<div class="tli">
            <span class="tic"><span class="msi" style="color:var(--info)">${a.tipo === "QR" ? "qr_code_2" : a.tipo === "LINK" ? "link" : "mail"}</span></span>
            <span class="tt"><b>${esc(a.label)}</b><span>${a.cargo} · ${a.manual ? "manual" : "automático"}</span></span>
            <span class="td">${a.cuando}</span></div>`).join("")}</div>`}

      <div class="sech" style="margin-top:22px"><h3 style="font-size:13px">Acciones</h3></div>
      <div class="chips">
        <button class="chip" id="fProrateo"><span class="msi" style="font-size:15px">calculate</span> Cambiar de plan</button>
        ${d > 0 ? `<button class="chip" id="fRecordar"><span class="msi" style="font-size:15px">notifications_active</span> Mandar recordatorio</button>` : ""}
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cerrar</button>`,
    luego: () => {
      document.getElementById("fProrateo").onclick = () => { cerrarDrawer(); S.tab = "prorateo"; S.prorateoSus = id; render(); };
      const r = document.getElementById("fRecordar");
      if (r) r.onclick = () => {
        const c = cs.find((x) => saldo(x) > 0 && x.estado !== "CANCELLED");
        cerrarDrawer(); drawerCobrar(c.id);
      };
    },
  });
}

function vCobros() {
  return `
  <div class="fbar">
    <div class="search"><span class="msi">search</span><input id="cq" placeholder="Buscar por suscriptor o id de cargo" value="${esc(S.filtros.q)}"></div>
    <select id="cest" style="width:auto"><option value="">Todos los estados</option>
      ${Object.keys(ESTADOS).map((k) => `<option value="${k}" ${S.filtros.estado === k ? "selected" : ""}>${ESTADOS[k].label}</option>`).join("")}</select>
    <select id="cplan" style="width:auto"><option value="">Todos los planes</option>
      ${S.planes.map((p) => `<option value="${p.id}" ${S.filtros.plan === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("")}</select>
    <span class="fcount" id="ccnt"></span>
    <button class="btn bo" id="expCob"><span class="msi">download</span>CSV</button>
  </div>
  <div id="tblCob"></div>`;
}

function filtrarCargos() {
  const q = S.filtros.q.toLowerCase().trim();
  return S.cargos.filter((c) => {
    const s = sus(c.suscriptorId);
    if (q && !(`${c.id} ${s.nombre} ${s.documento}`.toLowerCase().includes(q))) return false;
    if (S.filtros.estado && c.estado !== S.filtros.estado) return false;
    if (S.filtros.plan && c.planId !== S.filtros.plan) return false;
    return true;
  }).sort((a, b) => a.vence < b.vence ? 1 : -1);
}

function tablaCobros() {
  const rows = filtrarCargos();
  document.getElementById("ccnt").textContent = `${rows.length} de ${S.cargos.length}`;
  const box = document.getElementById("tblCob");
  if (rows.length === 0) {
    box.innerHTML = `<div class="tablewrap"><div class="empty"><span class="msi">filter_alt_off</span>
      <h4>Ningún cargo coincide con los filtros</h4><p>Los cargos siguen ahí. Probá con otros filtros.</p>
      <button class="btn bo" id="limpiaC">Limpiar filtros</button></div></div>`;
    document.getElementById("limpiaC").onclick = () => { S.filtros = { q: "", plan: "", estado: "", tramo: "" }; render(); };
    return;
  }
  box.innerHTML = `<div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Cargo</th><th>Suscriptor</th><th>Período</th><th>Vence</th>
      <th class="num">Base</th><th class="num">Mora</th><th class="num">Total</th><th class="num">Saldo</th>
      <th>Estado</th><th>Medio</th><th class="num">Int.</th><th></th></tr></thead>
    <tbody>${rows.map((c) => {
      const s = sus(c.suscriptorId);
      const at = atrasoDias(c);
      return `<tr>
        <td class="mono" style="font-size:11px">${c.id}</td>
        <td><div class="strong" style="font-size:12px">${esc(s.nombre)}</div><div style="font-size:10px;color:var(--osv)">${esc(plan(c.planId).nombre)}</div></td>
        <td class="mono" style="font-size:11px">${c.periodo}</td>
        <td style="font-size:12px">${fecha(c.vence)}${esMoroso(c) ? `<div style="font-size:10px;color:var(--error)">+${at} días</div>` : ""}</td>
        <td class="num">${money(c.base)}</td>
        <td class="num" style="${c.mora > 0 ? "color:var(--warning)" : "color:var(--outline)"}">${c.mora > 0 ? money(c.mora) : "—"}</td>
        <td class="num strong">${money(total(c))}</td>
        <td class="num" style="${saldo(c) > 0 ? "color:var(--error);font-weight:600" : "color:var(--ok)"}">${saldo(c) > 0 ? money(saldo(c)) : money(0)}</td>
        <td><span class="badge ${ESTADOS[c.estado].cls}">${ESTADOS[c.estado].label}</span></td>
        <td style="font-size:11px;color:var(--osv)">${c.medio || "—"}</td>
        <td class="num" style="font-size:11px">${c.intentos}</td>
        <td>${saldo(c) > 0 && c.estado !== "CANCELLED"
          ? `<button class="mini" data-cobrar="${c.id}"><span class="msi">bolt</span>Cobrar</button>`
          : `<span style="color:var(--outline);font-size:11px">—</span>`}</td>
      </tr>`;
    }).join("")}</tbody></table></div></div>`;
  document.querySelectorAll("[data-cobrar]").forEach((b) => b.onclick = () => drawerCobrar(b.dataset.cobrar));
}

function wCobros() {
  tablaCobros();
  const q = document.getElementById("cq");
  q.oninput = () => { S.filtros.q = q.value; tablaCobros(); };
  document.getElementById("cest").onchange = (e) => { S.filtros.estado = e.target.value; tablaCobros(); };
  document.getElementById("cplan").onchange = (e) => { S.filtros.plan = e.target.value; tablaCobros(); };
  document.getElementById("expCob").onclick = () => exportar("cobros", filtrarCargos().map((c) => ({
    cargo: c.id, suscriptor: sus(c.suscriptorId).nombre, documento: sus(c.suscriptorId).documento,
    plan: plan(c.planId).nombre, periodo: c.periodo, emitido: c.emitido, vence: c.vence,
    base: c.base, mora: c.mora, total: total(c), pagado: c.pagado, saldo: saldo(c),
    estado: c.estado, medio: c.medio || "", intentos: c.intentos,
  })));
}

function matrizQr(semilla) {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) { h ^= semilla.charCodeAt(i); h = Math.imul(h, 16777619); }
  const n = 25, cel = [];
  let x = h >>> 0;
  const sig = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const marca = (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
    let on;
    if (marca) {
      const li = i % (n - 7) < 7 ? i % n : i, lj = j;
      const bi = i < 7 ? i : i - (n - 7), bj = j < 7 ? j : j - (n - 7);
      on = bi === 0 || bi === 6 || bj === 0 || bj === 6 || (bi >= 2 && bi <= 4 && bj >= 2 && bj <= 4);
    } else on = sig() > 0.52;
    if (on) cel.push(`<rect x="${j}" y="${i}" width="1" height="1"/>`);
  }
  return `<svg class="qr" viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="#fff"/><g fill="#1A3270">${cel.join("")}</g></svg>`;
}

function bloqueSnapshot(c) {
  const r = reglaDelCargo(c);
  const marca = (k) => (r.origen && r.origen[k] === "PLAN"
    ? `<span class="badge b-partial" style="margin-left:6px">plan</span>`
    : `<span class="badge b-cancelled" style="margin-left:6px">cartera</span>`);
  const fila = (k, l) => `<div class="kv"><span class="k">${l}</span>
    <span class="v" style="font-weight:500">${esc(resumenGrupo(k, r[k]))}${marca(k)}</span></div>`;
  const programados = avisosDelCargo(c);
  return `<div class="card" style="padding:16px;margin-bottom:18px;border-left:3px solid var(--tertiary)">
    <div class="sech" style="margin-bottom:8px">
      <div><h3 style="font-size:13px">Reglas congeladas de este cargo</h3>
        <p>Nacieron con el cargo. Un cambio de reglas no las mueve.</p></div>
      <span class="badge b-partial"><span class="msi" style="font-size:13px">ac_unit</span>snapshot</span></div>
    ${fila("diaCorte", "Día de corte")}
    ${fila("anticipacion", "Anticipación")}
    ${fila("gracia", "Gracia")}
    ${fila("recargoMora", "Recargo por mora")}
    ${fila("suspension", "Suspensión")}
    ${fila("renovacionConDeuda", "Renovación con deuda")}
    ${fila("limiteRechazos", "Límite de rechazos")}
    <div class="kv"><span class="k">Atraso neto de gracia</span>
      <span class="v">${atrasoEfectivo(c)} ${atrasoEfectivo(c) === 1 ? "día" : "días"}</span></div>
    <div class="kv"><span class="k">Mora que sale de esta regla</span>
      <span class="v" style="color:var(--warning)">${money(moraCalculada(c))}</span></div>
    <div class="sech" style="margin:14px 0 4px"><div><h3 style="font-size:12px">Avisos que programó su cadencia</h3>
      <p>${programados.length} ${programados.length === 1 ? "aviso" : "avisos"} ${marcaProcedencia(r, "cadencia")}</p></div></div>
    ${programados.length === 0
      ? `<p class="hint">La cadencia congelada de este cargo no tiene avisos activos: no se le va a avisar nada.</p>`
      : `<div class="tl">${programados.map((a) => `<div class="tli">
          <span class="tic"><span class="msi" style="font-size:15px">${KINDS_AVISO[a.kind].ico}</span></span>
          <span class="tt"><b>${esc(a.label)}</b><span class="mono">${a.kind} ${a.offset > 0 ? "+" : ""}${a.offset}</span></span>
          <span class="td">${fecha(a.cuando)}</span></div>`).join("")}</div>`}
  </div>`;
}

function marcaProcedencia(regla, k) {
  return regla.origen && regla.origen[k] === "PLAN" ? "· cadencia propia del plan" : "· cadencia de la cartera";
}

/// Lo que el mundo le impone al cobro de este cargo: con qué se puede pagar y qué comisión queda
/// informada. En fase 1 la comisión no mueve plata, solo se declara.
function bloquePoliticaDelCargo(c) {
  const pol = politicaAplicable();
  if (!pol) return "";
  const efectivos = mediosEfectivos();
  const fuera = mediosRecortados();
  const com = c.comisionMundo != null
    ? { pct: c.comisionMundoPct, monto: c.comisionMundo }
    : comisionInformada(total(c));
  return `<div class="card" style="padding:16px;margin-bottom:18px;border-left:3px solid var(--info)">
    <div class="sech" style="margin-bottom:8px">
      <div><h3 style="font-size:13px">Lo que fija ${esc(S.mundo.nombre)}</h3>
        <p>Política del mundo sobre la cobranza de este comercio</p></div>
      <span class="badge b-pending"><span class="msi" style="font-size:13px">policy</span>política</span></div>
    <div class="kv"><span class="k">Medios de pago que se pueden ofrecer</span>
      <span class="v" style="font-weight:500">${efectivos.length ? efectivos.map((m) => esc(MEDIOS_PAGO[m])).join(" · ") : "ninguno habilitado"}</span></div>
    ${fuera.length ? `<div class="kv"><span class="k">Recortados por el mundo</span>
      <span class="v" style="font-weight:500;color:var(--osv);text-decoration:line-through">${fuera.map((m) => esc(MEDIOS_PAGO[m])).join(" · ")}</span></div>` : ""}
    <div class="kv"><span class="k">Comisión del mundo informada</span>
      <span class="v">${com ? `${money(com.monto)} <span class="mono" style="font-size:10px;color:var(--osv)">${com.pct}% de ${money(total(c))}</span>` : "—"}</span></div>
    <div class="kv"><span class="k">Tope por cargo</span>
      <span class="v">${pol.topeMontoCargo == null ? "sin límite" : money(pol.topeMontoCargo)}</span></div>
    <div class="note n-info" style="margin:12px 0 0"><span class="msi">info</span>
      <div>La comisión del mundo <b>solo se informa</b>: en esta fase no genera movimiento de dinero,
      no se descuenta del cobro ni se liquida. Queda registrada en el cargo como monto declarado.</div></div>
  </div>`;
}

function drawerCobrar(cargoId) {
  const c = S.cargos.find((x) => x.id === cargoId);
  const s = sus(c.suscriptorId);
  const token = "pay_" + c.id.toLowerCase().replace("-", "") + "_" + Math.abs(c.id.charCodeAt(2) * 7919).toString(36);
  const url = `https://pagos.joi360.pe/c/${token}`;
  abrirDrawer({
    titulo: "Cobrar este cargo", sub: `${c.id} · ${s.nombre}`, ico: "bolt", ancho: 560,
    cuerpo: `
      <div class="card" style="padding:16px;margin-bottom:18px">
        <div class="kv"><span class="k">Suscriptor</span><span class="v">${esc(s.nombre)}</span></div>
        <div class="kv"><span class="k">Período</span><span class="v">${c.periodo}</span></div>
        <div class="kv"><span class="k">Vence</span><span class="v">${fecha(c.vence)}${esMoroso(c) ? ` · <span style="color:var(--error)">${atrasoDias(c)} días de atraso</span>` : ""}</span></div>
        <div class="kv"><span class="k">Monto base</span><span class="v">${money(c.base)}</span></div>
        ${c.mora > 0 ? `<div class="kv"><span class="k">Mora acumulada</span><span class="v" style="color:var(--warning)">${money(c.mora)}</span></div>` : ""}
        ${c.pagado > 0 ? `<div class="kv"><span class="k">Ya pagado</span><span class="v" style="color:var(--ok)">${money(c.pagado)}</span></div>` : ""}
        <div class="kv"><span class="k">Total a cobrar</span><span class="v" style="font-size:17px;color:var(--primary)">${money(saldo(c))}</span></div>
      </div>

      ${bloqueSnapshot(c)}
      ${bloquePoliticaDelCargo(c)}

      <div class="sech"><div><h3 style="font-size:13px">QR de pago</h3><p>Se puede mostrar en pantalla o adjuntar al aviso</p></div></div>
      ${matrizQr(token)}
      <p class="hint" style="text-align:center;margin-bottom:18px">Representación visual. El QR real lo emite el backend con la librería <span class="mono">qrcode</span>, que ya es dependencia del proyecto.</p>

      <div class="sech"><div><h3 style="font-size:13px">Link de pago</h3><p>Un solo cargo, con vencimiento, no adivinable</p></div></div>
      <div class="copybox" style="margin-bottom:8px"><span style="flex:1">${url}</span>
        <button class="mini" id="cp"><span class="msi">content_copy</span>Copiar</button></div>
      <p class="hint" style="margin-bottom:18px">El suscriptor paga sin crear cuenta. Si el cargo ya está pagado, el link lo informa y no permite pagar dos veces.</p>

      <div class="sech"><div><h3 style="font-size:13px">Mandar recordatorio</h3><p>Acá está el valor de la gestión previa</p></div></div>
      <div class="chips" style="margin-bottom:14px">
        <button class="chip on" data-inc="LINK">Incluir link</button>
        <button class="chip on" data-inc="QR">Incluir QR</button>
      </div>
      <div class="note n-info" style="margin:0"><span class="msi">mark_email_read</span>
        <div>Se manda a <b>${esc(s.correo)}</b> con la marca de YOKI. Queda en la bitácora del suscriptor.
        Tope de ${topeRecordatoriosEfectivo()} recordatorios manuales por día por persona${
          politicaAplicable() && topeRecordatoriosEfectivo() < S.politicasCartera.topeRecordatoriosDia
            ? `: la cartera pide ${S.politicasCartera.topeRecordatoriosDia} y ${esc(S.mundo.nombre)} tapa en ${S.politicaMundo.topeRecordatoriosDia}` : ""}.</div></div>`,
    pie: `<button class="btn bo" data-cerrar>Cerrar</button>
          <button class="btn bo" id="pagoManual"><span class="msi">price_check</span>Registrar pago</button>
          <button class="btn bp" id="okAviso"><span class="msi">send</span>Enviar recordatorio</button>`,
    luego: () => {
      const inc = new Set(["LINK", "QR"]);
      document.querySelectorAll("[data-inc]").forEach((b) => b.onclick = () => {
        const k = b.dataset.inc;
        if (inc.has(k)) { inc.delete(k); b.classList.remove("on"); } else { inc.add(k); b.classList.add("on"); }
      });
      document.getElementById("cp").onclick = () => {
        navigator.clipboard?.writeText(url);
        toast("Link de pago copiado.", "info");
      };
      document.getElementById("okAviso").onclick = () => {
        if (inc.size === 0) return toast("Elegí al menos link o QR.", "err");
        c.avisos.unshift({
          label: "Recordatorio de pago", tipo: inc.has("QR") && inc.has("LINK") ? "LINK+QR" : [...inc][0],
          manual: true, cuando: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
        });
        bita("notification_event", "ENVIAR_MANUAL", `Recordatorio a ${s.nombre} por ${c.id} (${[...inc].join(" + ")})`);
        cerrarDrawer(); toast(`Recordatorio enviado a ${s.nombre}.`); render();
      };
      document.getElementById("pagoManual").onclick = () => {
        const monto = saldo(c);
        c.pagado = r2(c.pagado + monto);
        c.estado = "PAID"; c.medio = "MANUAL"; c.pagadoEl = iso(HOY);
        bita("payment", "PAGO_MANUAL", `${s.nombre} · ${c.id} · ${money(monto)} registrado como MANUAL`);
        cerrarDrawer(); toast(`Pago de ${money(monto)} registrado. El cargo quedó pagado.`); render();
      };
    },
  });
}

function vMorosidad() {
  const deudores = S.suscriptores
    .map((s) => ({ s, deuda: deudaDe(s.id), mora: moraDe(s.id), at: atrasoMax(s.id), n: cargosDe(s.id).filter((c) => saldo(c) > 0 && c.estado !== "CANCELLED").length }))
    .filter((x) => x.at > 0)
    .sort((a, b) => b.deuda - a.deuda);

  const porTramo = tramosCartera().map((t) => {
    const g = deudores.filter((x) => tramoDe(x.at)?.id === t.id);
    return { ...t, n: g.length, monto: r2(g.reduce((a, x) => a + x.deuda, 0)) };
  });
  const filtrados = S.filtros.tramo ? deudores.filter((x) => tramoDe(x.at)?.id === S.filtros.tramo) : deudores;
  const totalDeuda = r2(deudores.reduce((a, x) => a + x.deuda, 0));

  return `
  <div class="banner" style="background:linear-gradient(135deg,#7A1420,#C8202F)">
    <div><h3>${deudores.length} personas te deben ${money(totalDeuda)}</h3>
      <p>Ordenado por monto. Desde cualquier fila podés mandar el recordatorio con su link y su QR,
      o seleccionar un tramo completo y mandarlo a todos.</p></div>
    <span class="msi">running_with_errors</span>
  </div>

  <div class="kpis">
    ${porTramo.map((t) => `<button class="kpi" data-tramo="${t.id}" style="${S.filtros.tramo === t.id ? "border-color:" + t.color + ";box-shadow:0 0 0 2px " + t.color + "22" : ""}">
      <div class="ico" style="background:${t.color}1a;color:${t.color}"><span class="msi">schedule</span></div>
      <div class="v">${money0(t.monto)}</div><div class="l">${t.label}</div>
      <div class="d">${t.n} ${t.n === 1 ? "deudor" : "deudores"}</div></button>`).join("")}
  </div>

  <div class="sech">
    <div><h3>${S.filtros.tramo ? "Deudores de " + esc(tramoPorId(S.filtros.tramo).label) : "Todos los deudores"}</h3>
      <p>${filtrados.length} de ${deudores.length}</p></div>
    <div style="display:flex;gap:10px">
      ${S.filtros.tramo ? `<button class="btn bo" id="verTodos">Ver todos</button>` : ""}
      <button class="btn bo" id="expMor"><span class="msi">download</span>CSV</button>
      <button class="btn bp" id="masivo"><span class="msi">campaign</span>Recordar a los ${filtrados.length}</button>
    </div>
  </div>

  <div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Suscriptor</th><th>Contacto</th><th>Plan</th><th class="num">Cargos</th>
      <th class="num">Deuda</th><th class="num">Mora</th><th>Antigüedad</th><th>Tramo</th><th></th></tr></thead>
    <tbody>${filtrados.map(({ s, deuda, mora, at, n }) => {
      const t = tramoDe(at);
      return `<tr>
        <td><div class="strong">${esc(s.nombre)}</div><div class="mono" style="font-size:10px;color:var(--osv)">${esc(s.documento)}</div></td>
        <td style="font-size:11px;color:var(--osv)">${esc(s.correo)}${s.telefono ? `<br>${esc(s.telefono)}` : ""}</td>
        <td style="font-size:12px">${esc(plan(s.planId).nombre)}</td>
        <td class="num">${n}</td>
        <td class="num strong" style="color:var(--error)">${money(deuda)}</td>
        <td class="num" style="color:var(--warning)">${mora > 0 ? money(mora) : "—"}</td>
        <td class="num">${at} días</td>
        <td><span class="badge" style="background:${t.color}1a;color:${t.color}">${t.label}</span></td>
        <td><button class="mini" data-cobrar="${cargosDe(s.id).filter((c) => saldo(c) > 0 && c.estado !== "CANCELLED").sort((a, b) => a.vence < b.vence ? -1 : 1)[0].id}">
          <span class="msi">notifications_active</span>Recordar</button></td>
      </tr>`;
    }).join("")}</tbody></table></div></div>`;
}

function wMorosidad() {
  document.querySelectorAll("[data-tramo]").forEach((b) => b.onclick = () => {
    S.filtros.tramo = S.filtros.tramo === b.dataset.tramo ? "" : b.dataset.tramo; render();
  });
  const vt = document.getElementById("verTodos");
  if (vt) vt.onclick = () => { S.filtros.tramo = ""; render(); };
  document.querySelectorAll("[data-cobrar]").forEach((b) => b.onclick = () => drawerCobrar(b.dataset.cobrar));
  document.getElementById("masivo").onclick = () => {
    const deudores = S.suscriptores.filter((s) => atrasoMax(s.id) > 0 && (!S.filtros.tramo || tramoDe(atrasoMax(s.id))?.id === S.filtros.tramo));
    abrirDrawer({
      titulo: "Recordatorio masivo", sub: `${deudores.length} destinatarios`, ico: "campaign",
      cuerpo: `<div class="note n-warn"><span class="msi">group</span>
          <div>Va a <b>${deudores.length} personas</b>${S.filtros.tramo ? ` del tramo <b>${esc(tramoPorId(S.filtros.tramo).label)}</b>` : ""}.
          Quien haya pagado entre esta selección y el envío queda excluido automáticamente.</div></div>
        <div class="tl" style="max-height:260px;overflow-y:auto">${deudores.map((s) => `<div class="tli">
          <span class="tic"><span class="msi">person</span></span>
          <span class="tt"><b>${esc(s.nombre)}</b><span>${esc(s.correo)} · debe ${money(deudaDe(s.id))}</span></span></div>`).join("")}</div>`,
      pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okMasivo">Enviar a ${deudores.length}</button>`,
      luego: () => {
        document.getElementById("okMasivo").onclick = () => {
          deudores.forEach((s) => {
            const c = cargosDe(s.id).filter((x) => saldo(x) > 0 && x.estado !== "CANCELLED")[0];
            if (c) c.avisos.unshift({ label: "Recordatorio masivo", tipo: "LINK+QR", manual: true, cuando: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) });
          });
          bita("notification_event", "ENVIAR_MASIVO", `Recordatorio masivo a ${deudores.length} deudores`);
          cerrarDrawer(); toast(`Recordatorio enviado a ${deudores.length} personas.`); render();
        };
      },
    });
  };
  document.getElementById("expMor").onclick = () => {
    const rows = S.suscriptores.filter((s) => atrasoMax(s.id) > 0 && (!S.filtros.tramo || tramoDe(atrasoMax(s.id))?.id === S.filtros.tramo));
    exportar("morosidad", rows.map((s) => ({
      documento: s.documento, nombre: s.nombre, correo: s.correo, telefono: s.telefono,
      plan: plan(s.planId).nombre, cargos_pendientes: cargosDe(s.id).filter((c) => saldo(c) > 0).length,
      deuda: deudaDe(s.id), mora: moraDe(s.id), antiguedad_dias: atrasoMax(s.id), tramo: tramoDe(atrasoMax(s.id)).label,
    })));
  };
}

const COLUMNAS = ["documento", "nombre", "correo", "telefono", "plan", "monto", "periodicidad", "fecha_primer_cobro"];
const OBLIGATORIAS = ["documento", "nombre", "correo", "plan", "monto", "fecha_primer_cobro"];
const PERIODICIDADES = ["MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"];

const MOTIVOS = {
  documento_invalido: "El documento tiene que ser DNI de 8 dígitos, RUC de 11, o carné de 9 a 12 alfanumérico.",
  nombre_invalido: "El nombre necesita al menos 3 caracteres.",
  correo_invalido: "El correo no tiene un formato válido.",
  telefono_invalido: "El teléfono, si viene, tiene que tener 9 dígitos.",
  plan_no_existe: "Ese plan no existe en este comercio.",
  monto_invalido: "El monto tiene que ser numérico y mayor que cero.",
  periodicidad_invalida: "La periodicidad tiene que ser MENSUAL, TRIMESTRAL, SEMESTRAL o ANUAL.",
  fecha_invalida: "La fecha tiene que venir como AAAA-MM-DD y ser una fecha real.",
  documento_duplicado_en_archivo: "Ese documento ya apareció en una fila anterior del mismo archivo.",
  monto_excede_tope_mundo: "El monto pasa el tope por cargo que fijó el mundo.",
};

/// El tope por cargo del mundo es un dato vivo: el motivo lo nombra con el número vigente.
function motivoDe(codigo) {
  const pol = politicaAplicable();
  if (codigo === "monto_excede_tope_mundo")
    return `El monto pasa el tope por cargo que fijó ${S.mundo.nombre}${pol && pol.topeMontoCargo != null ? ` (${money(pol.topeMontoCargo)})` : ""}.`;
  return MOTIVOS[codigo];
}

function parseCsv(texto) {
  const lineas = texto.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lineas.length === 0) return { error: "El archivo está vacío." };
  const cab = lineas[0].split(",").map((h) => h.trim().toLowerCase());
  const faltan = OBLIGATORIAS.filter((c) => !cab.includes(c));
  if (faltan.length) return { error: `Faltan columnas obligatorias: ${faltan.join(", ")}.` };
  if (lineas.length === 1) return { error: "El archivo trae encabezados pero ninguna fila de datos." };
  const filas = lineas.slice(1).map((l, i) => {
    const celdas = l.split(",").map((c) => c.trim());
    const o = { _fila: i + 2 };
    cab.forEach((h, j) => { if (COLUMNAS.includes(h)) o[h] = celdas[j] == null ? "" : celdas[j]; });
    return o;
  });
  return { filas };
}

function validarFila(f, vistos) {
  const errores = [];
  const doc = String(f.documento || "");
  const esDni = /^\d{8}$/.test(doc), esRuc = /^\d{11}$/.test(doc), esCe = /^[A-Za-z0-9]{9,12}$/.test(doc);
  if (!doc || !(esDni || esRuc || esCe)) errores.push("documento_invalido");
  else if (vistos.has(doc)) errores.push("documento_duplicado_en_archivo");

  if (!f.nombre || f.nombre.trim().length < 3) errores.push("nombre_invalido");
  if (!f.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.correo)) errores.push("correo_invalido");
  if (f.telefono && !/^\d{9}$/.test(f.telefono)) errores.push("telefono_invalido");
  if (!planPorNombre(f.plan)) errores.push("plan_no_existe");

  const montoTexto = String(f.monto || "").replace(",", ".");
  const monto = Number(montoTexto);
  if (!montoTexto || Number.isNaN(monto) || !(monto > 0)) errores.push("monto_invalido");
  else {
    const pol = politicaAplicable();
    if (pol && pol.topeMontoCargo != null && monto > Number(pol.topeMontoCargo)) errores.push("monto_excede_tope_mundo");
  }

  const per = String(f.periodicidad || "").toUpperCase();
  if (per && !PERIODICIDADES.includes(per)) errores.push("periodicidad_invalida");

  const fv = String(f.fecha_primer_cobro || "");
  const fok = /^\d{4}-\d{2}-\d{2}$/.test(fv) && !Number.isNaN(new Date(fv + "T00:00:00").getTime());
  if (!fok) errores.push("fecha_invalida");

  if (!errores.includes("documento_invalido") && !errores.includes("documento_duplicado_en_archivo")) vistos.add(doc);

  const existente = S.suscriptores.find((s) => s.documento === doc);
  return { fila: f, errores, monto: r2(monto), periodicidad: per || null, accion: existente ? "ACTUALIZAR" : "ALTA", existente };
}

function vCarga() {
  const j = S.importJob;
  if (!j) {
    return `
    ${notaEmisionBloqueada()}
    <div class="note n-info"><span class="msi">info</span>
      <div>La carga tiene dos pasos: primero se valida fila por fila y recién después se puede confirmar.
      <b>Las filas con error no bloquean a las correctas.</b></div></div>
    <div class="drop" id="drop">
      <span class="msi">cloud_upload</span>
      <h4>Arrastrá tu archivo CSV acá</h4>
      <p>O hacé clic para elegirlo. En este directorio hay uno de ejemplo: <span class="mono">ejemplo-cartera-yoki.csv</span></p>
      <input type="file" id="file" accept=".csv,text/csv" style="display:none">
    </div>
    <div class="sech" style="margin-top:24px"><div><h3>Columnas que espera el archivo</h3>
      <p>Se resuelven por nombre, no por posición</p></div>
      <button class="btn bo" id="plantilla"><span class="msi">download</span>Descargar plantilla</button></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Columna</th><th>Obligatoria</th><th>Regla</th></tr></thead>
      <tbody>
        <tr><td class="mono">documento</td><td>Sí</td><td>DNI 8 dígitos, RUC 11, o carné 9 a 12 alfanumérico</td></tr>
        <tr><td class="mono">nombre</td><td>Sí</td><td>Mínimo 3 caracteres</td></tr>
        <tr><td class="mono">correo</td><td>Sí</td><td>Formato de correo válido</td></tr>
        <tr><td class="mono">telefono</td><td>No</td><td>Si viene, 9 dígitos</td></tr>
        <tr><td class="mono">plan</td><td>Sí</td><td>Tiene que coincidir con un plan del comercio</td></tr>
        <tr><td class="mono">monto</td><td>Sí</td><td>Numérico mayor que cero. Acepta coma decimal</td></tr>
        <tr><td class="mono">periodicidad</td><td>No</td><td>MENSUAL, TRIMESTRAL, SEMESTRAL o ANUAL</td></tr>
        <tr><td class="mono">fecha_primer_cobro</td><td>Sí</td><td>AAAA-MM-DD, fecha real</td></tr>
      </tbody></table></div></div>`;
  }

  const val = j.resultados.filter((r) => r.errores.length === 0);
  const inv = j.resultados.filter((r) => r.errores.length > 0);
  const altas = val.filter((r) => r.accion === "ALTA");
  const upd = val.filter((r) => r.accion === "ACTUALIZAR");
  const cambios = upd.map((r) => {
    const d = [];
    if (r.existente.correo !== r.fila.correo) d.push(["correo", r.existente.correo, r.fila.correo]);
    if ((r.existente.telefono || "") !== (r.fila.telefono || "")) d.push(["teléfono", r.existente.telefono || "—", r.fila.telefono || "—"]);
    if (r.existente.monto !== r.monto) d.push(["monto", money(r.existente.monto), money(r.monto)]);
    if (r.existente.nombre !== r.fila.nombre) d.push(["nombre", r.existente.nombre, r.fila.nombre]);
    return { r, d };
  }).filter((x) => x.d.length > 0);

  return `
  ${notaEmisionBloqueada()}
  <div class="sech"><div><h3>Validación de <span class="mono">${esc(j.filename)}</span></h3>
    <p>${j.resultados.length} filas leídas · estado ${j.estado}</p></div>
    <button class="btn bo" id="otroArchivo"><span class="msi">restart_alt</span>Cargar otro archivo</button></div>

  <div class="kpis">
    ${kpi("fact_check", "#1A3270", "#EEF2FD", j.resultados.length, "Filas leídas", "")}
    ${kpi("check_circle", "#097A54", "#E7F5EF", val.length, "Válidas", `${altas.length} altas · ${upd.length} actualizaciones`)}
    ${kpi("error", "#C8202F", "#FCECEE", inv.length, "Con error", inv.length ? "no bloquean a las válidas" : "ninguna")}
    ${kpi("published_with_changes", "#6B4FA3", "#F1ECF9", cambios.length, "Con cambios reales", "de las actualizaciones")}
  </div>

  ${inv.length ? `<div class="sec">
    <div class="sech"><div><h3>Filas con error</h3><p>Estas no se van a importar. El resto sí.</p></div>
      <button class="btn bo" id="expErr"><span class="msi">download</span>Descargar errores</button></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Fila</th><th>Documento</th><th>Nombre</th><th>Motivo</th></tr></thead>
      <tbody>${inv.map((r) => `<tr>
        <td class="mono">${r.fila._fila}</td>
        <td class="mono" style="font-size:11px">${esc(r.fila.documento)}</td>
        <td style="font-size:12px">${esc(r.fila.nombre)}</td>
        <td>${r.errores.map((e) => `<div style="font-size:11px;color:var(--error);display:flex;gap:6px;align-items:flex-start">
          <span class="msi" style="font-size:13px">error</span><span><b class="mono">${e}</b> — ${esc(motivoDe(e))}</span></div>`).join("")}</td>
      </tr>`).join("")}</tbody></table></div></div></div>` : ""}

  ${cambios.length ? `<div class="sec">
    <div class="sech"><div><h3>Vista previa de cambios</h3><p>Qué se va a modificar en la cartera que ya tenés</p></div></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Suscriptor</th><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
      <tbody>${cambios.flatMap(({ r, d }) => d.map((c, k) => `<tr>
        <td>${k === 0 ? `<div class="strong" style="font-size:12px">${esc(r.fila.nombre)}</div><div class="mono" style="font-size:10px;color:var(--osv)">${esc(r.fila.documento)}</div>` : ""}</td>
        <td style="font-size:12px">${c[0]}</td>
        <td style="font-size:12px;color:var(--osv)">${esc(c[1])}</td>
        <td style="font-size:12px;font-weight:600;color:var(--primary)">${esc(c[2])}</td>
      </tr>`)).join("")}</tbody></table></div></div></div>` : ""}

  ${altas.length ? `<div class="sec">
    <div class="sech"><div><h3>Altas nuevas</h3><p>${altas.length} personas que todavía no están en la cartera</p></div></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Documento</th><th>Nombre</th><th>Correo</th><th>Plan</th><th class="num">Monto</th><th>Primer cobro</th></tr></thead>
      <tbody>${altas.map((r) => `<tr>
        <td class="mono" style="font-size:11px">${esc(r.fila.documento)}</td>
        <td class="strong" style="font-size:12px">${esc(r.fila.nombre)}</td>
        <td style="font-size:11px;color:var(--osv)">${esc(r.fila.correo)}</td>
        <td style="font-size:12px">${esc(r.fila.plan)}</td>
        <td class="num">${money(r.monto)}</td>
        <td style="font-size:12px">${fecha(r.fila.fecha_primer_cobro)}</td>
      </tr>`).join("")}</tbody></table></div></div></div>` : ""}

  ${(() => {
    const pol = politicaAplicable();
    if (!pol) return "";
    const montoLote = r2(val.reduce((a, r) => a + r.monto, 0));
    const pasa = pol.topeMontoLote != null && montoLote > Number(pol.topeMontoLote);
    return `<div class="note ${pasa ? "n-err" : "n-info"}"><span class="msi">${pasa ? "block" : "policy"}</span>
      <div>Topes de <b>${esc(S.mundo.nombre)}</b>: ${pol.topeMontoCargo == null ? "sin límite por cargo" : `hasta ${money(pol.topeMontoCargo)} por cargo`} ·
      ${pol.topeMontoLote == null ? "sin límite por lote" : `hasta ${money(pol.topeMontoLote)} por lote`}.
      Este lote suma <b>${money(montoLote)}</b>.
      ${pasa ? `<div style="margin-top:6px"><b class="mono">policy_limit_exceeded</b> — el lote no se puede confirmar hasta que baje del tope. No se escribe nada.</div>` : ""}</div></div>`;
  })()}

  <div class="note ${j.estado === "APLICADO" ? "n-ok" : "n-warn"}">
    <span class="msi">${j.estado === "APLICADO" ? "task_alt" : "pending_actions"}</span>
    <div>${j.estado === "APLICADO"
      ? `Carga aplicada: ${j.creadas} altas y ${j.actualizadas} actualizaciones. Quedó registrada en la bitácora.`
      : `Revisá el resumen y confirmá. Se importan solo las <b>${val.length} filas válidas</b>. Las ${inv.length} con error quedan afuera.`}</div></div>

  ${j.estado !== "APLICADO" ? `<div style="display:flex;gap:10px;justify-content:flex-end">
    <button class="btn bo" id="cancelarJob">Cancelar</button>
    <button class="btn bp" id="aplicarJob" ${val.length === 0 ? "disabled" : ""}>
      <span class="msi">task_alt</span>Confirmar e importar ${val.length} filas</button></div>` : ""}`;
}

function wCarga() {
  const j = S.importJob;
  if (!j) {
    const drop = document.getElementById("drop");
    const file = document.getElementById("file");
    drop.onclick = () => file.click();
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) leer(e.dataTransfer.files[0]); };
    file.onchange = () => { if (file.files[0]) leer(file.files[0]); };
    document.getElementById("plantilla").onclick = () => {
      descargar("plantilla-cartera.csv", COLUMNAS.join(",") + "\n" + "44871203,Nombre Apellido,correo@dominio.com,987654321,YOKI Full,89.00,MENSUAL,2026-10-05\n");
      toast("Plantilla descargada.", "info");
    };
    return;
  }
  const oa = document.getElementById("otroArchivo");
  if (oa) oa.onclick = () => { S.importJob = null; render(); };
  const ee = document.getElementById("expErr");
  if (ee) ee.onclick = () => exportar("errores-carga", j.resultados.filter((r) => r.errores.length).map((r) => ({
    fila: r.fila._fila, documento: r.fila.documento, nombre: r.fila.nombre,
    codigos: r.errores.join(" | "), motivos: r.errores.map((e) => motivoDe(e)).join(" | "),
  })));
  const cj = document.getElementById("cancelarJob");
  if (cj) cj.onclick = () => { S.importJob = null; toast("Carga cancelada. No se importó nada.", "info"); render(); };
  const aj = document.getElementById("aplicarJob");
  if (aj) aj.onclick = aplicarCarga;
}

function leer(f) {
  if (!/\.csv$/i.test(f.name)) return toast("El archivo tiene que ser un CSV.", "err");
  const fr = new FileReader();
  fr.onload = () => {
    const { error, filas } = parseCsv(String(fr.result));
    if (error) return toast(error, "err");
    const vistos = new Set();
    S.importJob = { filename: f.name, estado: "VALIDADO", resultados: filas.map((x) => validarFila(x, vistos)), creadas: 0, actualizadas: 0 };
    const v = S.importJob.resultados.filter((r) => r.errores.length === 0).length;
    toast(`${filas.length} filas leídas · ${v} válidas · ${filas.length - v} con error`, filas.length - v ? "info" : "ok");
    render();
  };
  fr.onerror = () => toast("No se pudo leer el archivo.", "err");
  fr.readAsText(f, "utf-8");
}

function aplicarCarga() {
  const frenado = emisionBloqueada();
  if (frenado) return toast(frenado, "err");
  const j = S.importJob;
  const val = j.resultados.filter((r) => r.errores.length === 0);
  const pol = politicaAplicable();
  const montoLote = r2(val.reduce((a, r) => a + r.monto, 0));
  if (pol && pol.topeMontoLote != null && montoLote > Number(pol.topeMontoLote))
    return toast(`policy_limit_exceeded: el lote suma ${money(montoLote)} y ${S.mundo.nombre} permite hasta ${money(pol.topeMontoLote)} por lote. No se importó nada.`, "err");
  let creadas = 0, actualizadas = 0;
  val.forEach((r) => {
    const p = planPorNombre(r.fila.plan);
    if (r.existente) {
      const s = r.existente;
      if (s.correo !== r.fila.correo) bita("subscriber", "ACTUALIZAR", `${s.nombre}: correo ${s.correo} → ${r.fila.correo}`);
      if (s.monto !== r.monto) bita("subscription", "ACTUALIZAR", `${s.nombre}: monto ${money(s.monto)} → ${money(r.monto)}`);
      s.correo = r.fila.correo; s.telefono = r.fila.telefono || ""; s.nombre = r.fila.nombre; s.monto = r.monto;
      actualizadas += 1;
    } else {
      const id = "s-imp-" + (S.suscriptores.length + 1) + "-" + creadas;
      S.suscriptores.push({
        id, documento: r.fila.documento, nombre: r.fila.nombre, correo: r.fila.correo,
        telefono: r.fila.telefono || "", planId: p.id, monto: r.monto,
        periodicidad: r.periodicidad || p.periodicidad, estado: "ACTIVE",
        altaEl: iso(HOY), saldoFavor: 0, perfil: "importado",
      });
      const venc = new Date(r.fila.fecha_primer_cobro + "T00:00:00");
      const snapshot = reglaEfectiva(p.id);
      S.cargos.push(sellarComision({
        id: "C-" + String(3900 + S.cargos.length), suscriptorId: id, planId: p.id,
        periodo: `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}`,
        cicloIni: iso(new Date(venc.getFullYear(), venc.getMonth(), 1)),
        cicloFin: iso(new Date(venc.getFullYear(), venc.getMonth() + 1, 0)),
        emitido: iso(addDia(venc, -snapshot.anticipacion.dias)), vence: iso(venc),
        base: r.monto, mora: 0, pagado: 0, estado: "SCHEDULED",
        medio: null, pagadoEl: null, intentos: 0, avisos: [], manual: false,
        rulesSnapshot: snapshot,
      }));
      creadas += 1;
    }
  });
  j.estado = "APLICADO"; j.creadas = creadas; j.actualizadas = actualizadas;
  bita("import_job", "APLICAR", `${j.filename}: ${creadas} altas, ${actualizadas} actualizaciones, ${j.resultados.length - val.length} rechazadas`);
  toast(`Importado: ${creadas} altas y ${actualizadas} actualizaciones.`);
  render();
}

function prorratear({ cicloIni, cicloFin, efectiva, montoActual, montoNuevo }) {
  const ini = new Date(cicloIni + "T00:00:00");
  const fin = new Date(cicloFin + "T00:00:00");
  const ef = new Date(efectiva + "T00:00:00");
  if (ef < ini || ef > fin) return { error: "La fecha efectiva tiene que caer dentro del ciclo en curso." };
  const diasCiclo = dias(ini, fin) + 1;
  const consumidos = dias(ini, ef);
  const restantes = diasCiclo - consumidos;
  const credito = montoActual * restantes / diasCiclo;
  const cargo = montoNuevo * restantes / diasCiclo;
  const neto = r2(cargo - credito);
  return {
    diasCiclo, consumidos, restantes,
    credito: r2(credito), cargo: r2(cargo), neto,
    direccion: neto > 0 ? "CARGO" : neto < 0 ? "CREDITO" : "NINGUNO",
  };
}

function vProrateo() {
  const elegido = S.prorateoSus || S.suscriptores[0].id;
  const s = sus(elegido);
  const pActual = plan(s.planId);
  const cicloIni = iso(new Date(HOY.getFullYear(), HOY.getMonth(), 1));
  const cicloFin = iso(new Date(HOY.getFullYear(), HOY.getMonth() + 1, 0));
  const destino = S.prorateoPlan && S.prorateoPlan !== s.planId ? S.prorateoPlan : (S.planes.find((p) => p.id !== s.planId) || pActual).id;
  const pNuevo = plan(destino);
  const efectiva = S.prorateoFecha || iso(HOY);
  const res = prorratear({ cicloIni, cicloFin, efectiva, montoActual: s.monto, montoNuevo: pNuevo.monto });

  return `
  ${notaEmisionBloqueada()}
  <div class="note n-info"><span class="msi">functions</span>
    <div>El prorateo se calcula sobre los <b>días que quedan del ciclo</b>: se acredita lo no usado del plan
    actual y se cobra lo que resta del plan nuevo. El redondeo se aplica <b>una sola vez sobre el neto</b>,
    para que la suma no se desvíe. Nada se aplica hasta que confirmes.</div></div>

  <div class="grid2" style="align-items:start">
    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Simulador</h3><p>Elegí la persona, el plan destino y la fecha</p></div></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div><label class="fl">Suscriptor</label><select id="prSus">
          ${S.suscriptores.map((x) => `<option value="${x.id}" ${x.id === elegido ? "selected" : ""}>${esc(x.nombre)} · ${esc(plan(x.planId).nombre)}</option>`).join("")}</select></div>
        <div class="grid2">
          <div><label class="fl">Plan actual</label><input value="${esc(pActual.nombre)} · ${money(s.monto)}" disabled></div>
          <div><label class="fl">Plan destino</label><select id="prPlan">
            ${S.planes.filter((p) => p.id !== s.planId).map((p) => `<option value="${p.id}" ${p.id === destino ? "selected" : ""}>${esc(p.nombre)} · ${money(p.monto)}</option>`).join("")}</select></div>
        </div>
        <div><label class="fl">Fecha efectiva del cambio</label>
          <input type="date" id="prFecha" value="${efectiva}" min="${cicloIni}" max="${cicloFin}">
          <p class="hint">Ciclo en curso: ${fecha(cicloIni)} a ${fecha(cicloFin)}</p></div>
      </div>
    </div>

    <div class="card" style="padding:20px">
      <div class="sech"><div><h3>Cálculo</h3><p>Lo que se le va a cobrar o acreditar</p></div></div>
      ${res.error ? `<div class="note n-err" style="margin:0"><span class="msi">error</span><div>${res.error}</div></div>` : `
      <div class="kv"><span class="k">Días totales del ciclo</span><span class="v mono">${res.diasCiclo}</span></div>
      <div class="kv"><span class="k">Días ya consumidos</span><span class="v mono">${res.consumidos}</span></div>
      <div class="kv"><span class="k">Días que quedan</span><span class="v mono">${res.restantes}</span></div>
      <div class="kv"><span class="k">Crédito por lo no usado<br><span style="font-size:11px">${money(s.monto)} × ${res.restantes} / ${res.diasCiclo}</span></span>
        <span class="v" style="color:var(--ok)">− ${money(res.credito)}</span></div>
      <div class="kv"><span class="k">Cargo por lo que resta<br><span style="font-size:11px">${money(pNuevo.monto)} × ${res.restantes} / ${res.diasCiclo}</span></span>
        <span class="v" style="color:var(--info)">+ ${money(res.cargo)}</span></div>
      <div style="margin-top:16px;padding:16px;border-radius:10px;background:${res.direccion === "CARGO" ? "var(--info-bg)" : res.direccion === "CREDITO" ? "var(--ok-bg)" : "var(--sc)"}">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--osv);margin-bottom:6px">
          ${res.direccion === "CARGO" ? "A cobrar ahora" : res.direccion === "CREDITO" ? "Saldo a favor" : "Sin movimiento"}</div>
        <div style="font-size:30px;font-weight:900;color:${res.direccion === "CARGO" ? "var(--info)" : res.direccion === "CREDITO" ? "var(--ok)" : "var(--osv)"}">
          ${money(Math.abs(res.neto))}</div>
        <p style="font-size:12px;color:var(--osv);margin-top:8px">
          ${res.direccion === "CARGO" ? `Sube de ${money(s.monto)} a ${money(pNuevo.monto)}. Se emite un cargo por la diferencia y el próximo ciclo sale completo al precio nuevo.`
            : res.direccion === "CREDITO" ? `Baja de ${money(s.monto)} a ${money(pNuevo.monto)}. La diferencia queda como saldo a favor y se descuenta del próximo cargo.`
            : "Los montos coinciden: solo cambia el plan, sin movimiento de dinero."}</p>
      </div>
      ${pActual.permanencia ? `<div class="note n-warn" style="margin-top:14px"><span class="msi">lock_clock</span>
        <div>${esc(pActual.nombre)} tiene permanencia de ${pActual.permanencia} meses. Verificá que ya se haya cumplido.</div></div>` : ""}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
        <button class="btn bp" id="prAplicar"><span class="msi">published_with_changes</span>Aplicar cambio de plan</button></div>`}
    </div>
  </div>

  <div class="sec" style="margin-top:24px">
    <div class="sech"><div><h3>Casos que el motor tiene que resolver igual</h3>
      <p>Los mismos que quedan como pruebas obligatorias en tasks.md T-60</p></div></div>
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Caso</th><th>Ciclo</th><th>Efectiva</th><th>De → a</th><th class="num">Días rest.</th><th class="num">Neto</th><th>Dirección</th></tr></thead>
      <tbody>${[
        ["Sube a mitad de ciclo", 30, 15, 50, 80], ["Baja a mitad de ciclo", 30, 15, 80, 50],
        ["Mismo monto", 30, 10, 50, 50], ["Efectiva = inicio", 30, 1, 50, 80],
        ["Efectiva = fin", 30, 30, 50, 80], ["Febrero", 28, 14, 49, 89],
      ].map(([nombre, dc, dia, ma, mn]) => {
        const ini = new Date(2026, dc === 28 ? 1 : 8, 1);
        const fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
        const ef = new Date(ini.getFullYear(), ini.getMonth(), dia);
        const r = prorratear({ cicloIni: iso(ini), cicloFin: iso(fin), efectiva: iso(ef), montoActual: ma, montoNuevo: mn });
        return `<tr><td class="strong" style="font-size:12px">${nombre}</td><td class="num">${r.diasCiclo}</td>
          <td class="num">día ${dia}</td><td class="num">${money(ma)} → ${money(mn)}</td>
          <td class="num">${r.restantes}</td><td class="num strong">${money(r.neto)}</td>
          <td><span class="badge ${r.direccion === "CARGO" ? "b-pending" : r.direccion === "CREDITO" ? "b-paid" : "b-cancelled"}">${r.direccion}</span></td></tr>`;
      }).join("")}</tbody></table></div></div>
  </div>`;
}

function wProrateo() {
  const ps = document.getElementById("prSus");
  ps.onchange = () => { S.prorateoSus = ps.value; S.prorateoPlan = null; render(); };
  const pp = document.getElementById("prPlan");
  if (pp) pp.onchange = () => { S.prorateoPlan = pp.value; render(); };
  const pf = document.getElementById("prFecha");
  if (pf) pf.onchange = () => { S.prorateoFecha = pf.value; render(); };
  const ap = document.getElementById("prAplicar");
  if (ap) ap.onclick = () => {
    const frenado = emisionBloqueada();
    if (frenado) return toast(frenado, "err");
    const s = sus(S.prorateoSus || S.suscriptores[0].id);
    const pNuevo = plan(S.prorateoPlan || S.planes.find((p) => p.id !== s.planId).id);
    const cicloIni = iso(new Date(HOY.getFullYear(), HOY.getMonth(), 1));
    const cicloFin = iso(new Date(HOY.getFullYear(), HOY.getMonth() + 1, 0));
    const res = prorratear({ cicloIni, cicloFin, efectiva: S.prorateoFecha || iso(HOY), montoActual: s.monto, montoNuevo: pNuevo.monto });
    if (res.error) return toast(res.error, "err");
    const antes = plan(s.planId).nombre, montoAntes = s.monto;
    s.planId = pNuevo.id; s.monto = pNuevo.monto; s.periodicidad = pNuevo.periodicidad;
    if (res.direccion === "CARGO") {
      S.cargos.push(sellarComision({
        id: "C-" + String(4500 + S.cargos.length), suscriptorId: s.id, planId: pNuevo.id,
        periodo: `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}-AJ`,
        cicloIni, cicloFin, emitido: iso(HOY), vence: iso(addDia(HOY, 5)),
        base: res.neto, mora: 0, pagado: 0, estado: "PENDING",
        medio: null, pagadoEl: null, intentos: 0, avisos: [], manual: true,
        rulesSnapshot: reglaEfectiva(pNuevo.id),
      }));
      toast(`Plan cambiado. Se emitió un cargo de ajuste por ${money(res.neto)}.`);
    } else if (res.direccion === "CREDITO") {
      s.saldoFavor = r2(s.saldoFavor + Math.abs(res.neto));
      toast(`Plan cambiado. Quedó ${money(Math.abs(res.neto))} de saldo a favor.`);
    } else toast("Plan cambiado sin movimiento de dinero.");
    bita("plan_change", "APLICAR", `${s.nombre}: ${antes} (${money(montoAntes)}) → ${pNuevo.nombre} (${money(pNuevo.monto)}) · ${res.restantes}/${res.diasCiclo} días · neto ${money(res.neto)}`);
    S.tab = "suscriptores"; render();
  };
}

function nivelClave() { return S.reglaNivel === "PLAN" ? "PLAN:" + S.reglaPlanId : "PORTFOLIO"; }
function etiquetaGrupo(k) { const g = GRUPOS.find((x) => x.k === k); return g ? g.l : k; }

function mezclarRegla(declarada, base) {
  const r = {};
  GRUPOS.forEach(({ k }) => { r[k] = clonar(declarada && declarada[k] != null ? declarada[k] : base[k]); });
  return r;
}

function nuevoBorrador() {
  return {
    clave: nivelClave(),
    grupos: soloGrupos(reglaEfectiva(S.reglaNivel === "PLAN" ? S.reglaPlanId : null)),
    politicas: clonar(S.politicasCartera),
    vigencia: iso(HOY), crudo: {},
  };
}

function borrador() {
  if (!S.borradorRegla || S.borradorRegla.clave !== nivelClave()) {
    S.borradorRegla = nuevoBorrador();
    S.erroresRegla = [];
  }
  return S.borradorRegla;
}

function limpiarCrudo(prefijo) {
  const b = borrador();
  Object.keys(b.crudo).forEach((k) => { if (k.indexOf(prefijo) === 0) delete b.crudo[k]; });
}

function campo(id, valor) {
  const b = borrador();
  return b.crudo[id] != null ? b.crudo[id] : valor;
}

function inputNum(id, valor, min, max, editable, paso) {
  return `<input type="number" id="${id}" data-w="rule" min="${min}" max="${max}"${paso ? ` step="${paso}"` : ""}
    value="${esc(campo(id, valor))}"${editable ? "" : " disabled"}>`;
}
function inputTexto(id, valor, editable) {
  return `<input id="${id}" data-w="rule" value="${esc(campo(id, valor))}"${editable ? "" : " disabled"}>`;
}
function selectDe(id, valor, opciones, editable) {
  const v = String(campo(id, valor));
  return `<select id="${id}" data-w="rule"${editable ? "" : " disabled"}>${Object.entries(opciones)
    .map(([k, l]) => `<option value="${k}"${k === v ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
}

function textoOffset(a) {
  if (a.kind === "PAYMENT_CONFIRMED") return "al acreditarse el pago";
  if (a.offset === 0) return "el día del vencimiento";
  return a.offset < 0 ? `${Math.abs(a.offset)} días antes` : `${a.offset} días después`;
}

function editorTramos(tramos, editable) {
  return `<div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>#</th><th>Nombre</th><th>Desde</th><th>Hasta</th><th></th></tr></thead>
    <tbody>${tramos.map((t, i) => {
      const ultimo = i === tramos.length - 1;
      return `<tr>
        <td class="mono">${i + 1}</td>
        <td>${inputTexto(`rgTramoNombre${i}`, t.nombre, editable)}</td>
        <td>${i === 0 ? `<span class="badge b-cancelled">día 1</span>` : inputNum(`rgTramoDesde${i}`, t.desde, 1, 3650, editable)}</td>
        <td>${ultimo ? `<span class="badge b-cancelled">abierto</span>` : inputNum(`rgTramoHasta${i}`, t.hasta, 1, 3650, editable)}</td>
        <td>${editable && tramos.length > 1 ? `<button class="mini" data-w="rule" data-tramodel="${i}"><span class="msi">delete</span></button>` : ""}</td>
      </tr>`;
    }).join("")}</tbody></table></div></div>
    ${editable ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px">
      <p class="hint" style="margin:0">Contiguos y sin solape. El primero arranca el día 1, el último queda abierto. Hasta 10 tramos.</p>
      <button class="mini" data-w="rule" data-tramoadd="1"><span class="msi">add</span>Agregar tramo</button></div>` : ""}`;
}

function editorCadencia(cadencia, editable) {
  const kinds = Object.keys(KINDS_AVISO).reduce((a, k) => { a[k] = KINDS_AVISO[k].label; return a; }, {});
  return `${cadencia.length === 0 ? `<div class="note n-warn" style="margin-bottom:12px"><span class="msi">notifications_off</span>
      <div><b>La cadencia quedó vacía.</b> Los cargos que nazcan con esta regla no van a generar ningún aviso.</div></div>` : ""}
    <div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Tipo</th><th>Texto</th><th>Desfase</th><th>Cuándo sale</th><th>Activo</th><th></th></tr></thead>
      <tbody>${cadencia.map((a, i) => `<tr>
        <td>${selectDe(`rgAvisoKind${i}`, a.kind, kinds, editable)}
          <div class="mono" style="font-size:9px;color:var(--outline);margin-top:3px">${a.kind}</div></td>
        <td>${inputTexto(`rgAvisoLabel${i}`, a.label, editable)}</td>
        <td>${inputNum(`rgAvisoOffset${i}`, a.offset, -60, 180, editable)}</td>
        <td style="font-size:11px;color:var(--osv)">${textoOffset(a)}</td>
        <td><button class="sw ${a.on ? "on" : ""}" data-w="rule" data-avisoon="${i}"><i></i></button></td>
        <td>${editable ? `<button class="mini" data-w="rule" data-avisodel="${i}"><span class="msi">delete</span></button>` : ""}</td>
      </tr>`).join("")}</tbody></table></div></div>
    ${editable ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px">
      <p class="hint" style="margin:0">Hasta 10 avisos. Dos del mismo tipo no pueden caer en el mismo desfase.</p>
      <button class="mini" data-w="rule" data-avisoadd="1"><span class="msi">add</span>Agregar aviso</button></div>` : ""}`;
}

function editorGrupo(k, v, editable) {
  if (k === "diaCorte") return `<div class="grid2">
    <div><label class="fl">Modo</label>${selectDe("rgCorteModo", v.modo, MODOS_CORTE, editable)}</div>
    <div><label class="fl">Día del mes</label>
      ${inputNum("rgCorteDia", v.dia, 1, 31, editable && campo("rgCorteModo", v.modo) === "FIXED_MONTH_DAY")}
      <p class="hint">Si el mes no tiene ese día, el cargo se emite el último.</p></div></div>`;
  if (k === "anticipacion") return `<label class="fl">Días antes del vencimiento</label>
    ${inputNum("rgAnticipacion", v.dias, 0, 60, editable)}
    <p class="hint">Entre 0 y 60. No puede pasar el ciclo más corto de los planes que usan la regla.</p>`;
  if (k === "gracia") return `<label class="fl">Días de gracia</label>
    ${inputNum("rgGracia", v.dias, 0, 60, editable)}
    <p class="hint">Entre 0 y 60. Tiene que quedar por debajo del plazo que dispara la suspensión.</p>`;
  if (k === "tramosMora") return editorTramos(v, editable);
  if (k === "recargoMora") return `
    <div class="grid2">
      <div><label class="fl">Tipo</label>${selectDe("rgRecargoTipo", v.tipo, TIPOS_RECARGO, editable)}</div>
      <div><label class="fl">Valor</label>
        ${inputNum("rgRecargoValor", v.valor, 0, 100000, editable && campo("rgRecargoTipo", v.tipo) !== "NONE", "0.5")}</div>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div><label class="fl">Presentación</label>${selectDe("rgRecargoAplicacion", v.aplicacion, APLICACIONES_RECARGO, editable)}</div>
      <div><label class="fl">Tope acumulable</label>${inputNum("rgRecargoTope", v.tope, 0, 100000, editable, "0.5")}
        <p class="hint">Cero significa sin tope.</p></div>
    </div>`;
  if (k === "suspension") return `<div class="grid2">
    <div><label class="fl">Suspender tras</label>${inputNum("rgSuspensionCargos", v.cargosVencidos, 1, 12, editable)}
      <p class="hint">cargos vencidos, de 1 a 12</p></div>
    <div><label class="fl">Reactivación</label>${selectDe("rgSuspensionReactivacion", v.reactivacion, REACTIVACIONES, editable)}</div></div>`;
  if (k === "cadencia") return editorCadencia(v, editable);
  if (k === "renovacionConDeuda") return `<label class="fl">Política</label>
    ${selectDe("rgRenovacion", v.politica, POLITICAS_RENOVACION, editable)}
    <p class="hint">Qué hacer con el cargo del ciclo nuevo cuando el anterior quedó impago.</p>`;
  if (k === "limiteRechazos") return `<label class="fl">Rechazos consecutivos tolerados</label>
    ${inputNum("rgRechazos", v.consecutivos, 0, 10, editable)}
    <p class="hint">Cero significa sin límite.</p>`;
  return "";
}

function cardGrupo(g, valor, nivelPlan, propio, editable) {
  const marca = nivelPlan
    ? (propio ? `<span class="badge b-partial"><span class="msi" style="font-size:12px">call_split</span>Propio del plan</span>`
              : `<span class="badge b-cancelled"><span class="msi" style="font-size:12px">link</span>Heredado de la cartera</span>`)
    : `<span class="badge b-pending"><span class="msi" style="font-size:12px">account_balance_wallet</span>Regla de cartera</span>`;
  const accion = !nivelPlan ? "" : propio
    ? `<button class="mini" data-w="rule" data-herencia="${g.k}"><span class="msi">settings_backup_restore</span>Devolver a herencia de la cartera</button>`
    : `<button class="mini" data-w="rule" data-propio="${g.k}"><span class="msi">call_split</span>Declararlo propio del plan</button>`;
  return `<div class="card" style="padding:18px;margin-bottom:14px;border-left:3px solid ${propio || !nivelPlan ? "var(--primary)" : "var(--ov)"}">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <span class="msi" style="color:var(--primary)">${g.i}</span>
        <div><h3 style="font-size:13px">${g.l}</h3><p>${g.d}</p></div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${marca}${accion}</div>
    </div>
    ${editorGrupo(g.k, valor, editable)}
    ${nivelPlan && !propio ? `<p class="hint" style="margin-top:10px">Muestra el valor que hoy tiene la cartera.
      Para cambiarlo solo en este plan, declaralo propio.</p>` : ""}
  </div>`;
}

function vReglas() {
  const nivelPlan = S.reglaNivel === "PLAN" && plan(S.reglaPlanId);
  const p = nivelPlan ? plan(S.reglaPlanId) : null;
  const b = borrador();
  const ef = reglaEfectiva(p ? p.id : null);
  const editable = puedeEditarReglas();
  const programada = S.vigenciasProgramadas.find((v) => v.clave === nivelClave());
  const mios = p ? propios(p.id) : [];
  const prox = p ? avisosProximos(p.id, 30) : null;
  const historial = S.historialReglas.filter((h) => h.clave === nivelClave());

  return `
  <div class="note n-warn"><span class="msi">ac_unit</span>
    <div>Un cambio de reglas afecta <b>solo a los cargos que se emitan después</b>. Los ya emitidos conservan
    su <span class="mono">rulesSnapshot</span>: su mora, su gracia, su suspensión y su cadencia se siguen
    calculando con la copia que guardaron al nacer.</div></div>

  ${cardPoliticaDelMundo()}

  <div class="sech">
    <div><h3>Nivel de la regla</h3><p>La cartera es la base. Cada plan hereda los nueve grupos o declara los suyos.</p></div>
    ${editable ? `<span class="pill"><span class="dot"></span>Escritura habilitada</span>`
      : `<span class="pill warn"><span class="dot"></span>Solo consulta con tu rol</span>`}
  </div>
  <div class="chips" style="margin-bottom:20px">
    <button class="chip ${nivelPlan ? "" : "on"}" data-nivel="PORTFOLIO">
      <span class="msi" style="font-size:15px">account_balance_wallet</span> Cartera</button>
    ${S.planes.map((x) => `<button class="chip ${nivelPlan && x.id === p.id ? "on" : ""}" data-nivel="${x.id}">
      ${esc(x.nombre)} · ${propios(x.id).length ? propios(x.id).length + "/9 propios" : "todo heredado"}</button>`).join("")}
  </div>

  ${nivelPlan ? `<div class="card" style="padding:20px;margin-bottom:20px">
    <div class="sech"><div><h3>${esc(p.nombre)}</h3>
      <p>${money(p.monto)} · ${p.periodicidad === "ANUAL" ? "anual" : p.periodicidad.toLowerCase()} ·
      ${S.suscriptores.filter((s) => s.planId === p.id && s.estado === "ACTIVE").length} suscripciones vigentes</p></div>
      <span class="badge ${mios.length ? "b-partial" : "b-cancelled"}">${mios.length} de 9 grupos propios</span></div>
    <div class="kv"><span class="k">Grupos propios</span><span class="v">${mios.length ? mios.map(etiquetaGrupo).join(", ") : "ninguno, hereda todo"}</span></div>
    <div class="kv"><span class="k">Avisos en los próximos 30 días</span>
      <span class="v">${prox.total} sobre ${prox.cargosAbiertos} ${prox.cargosAbiertos === 1 ? "cargo abierto" : "cargos abiertos"}</span></div>
    ${prox.cadenciaVacia
      ? `<div class="note n-err" style="margin:14px 0 0"><span class="msi">notifications_off</span>
          <div><b>La cadencia vigente de este plan no tiene ningún aviso activo.</b> Los cargos de
          ${esc(p.nombre)} no generarían avisos: la cobranza quedaría solo en gestión manual.</div></div>`
      : prox.total === 0
        ? `<div class="note n-info" style="margin:14px 0 0"><span class="msi">event_busy</span>
            <div>La cadencia tiene avisos activos, pero ninguno cae en los próximos 30 días con los cargos abiertos de hoy.</div></div>`
        : ""}
  </div>` : `<div class="card" style="padding:20px;margin-bottom:20px">
    <div class="sech"><div><h3>Regla de cartera</h3>
      <p>Es la base de todos los planes. Cambiarla alcanza a cada plan que herede el grupo</p></div>
      <span class="badge b-pending">${S.planes.length} planes</span></div>
    ${GRUPOS.map((g) => `<div class="kv"><span class="k">${g.l}</span>
      <span class="v" style="font-weight:500">${planesQueHeredan(g.k).length} de ${S.planes.length} planes lo heredan</span></div>`).join("")}
  </div>`}

  ${programada ? `<div class="note n-info"><span class="msi">event_upcoming</span>
    <div><b>Rige hoy</b> la versión que ves abajo. <b>Desde el ${fecha(programada.desde)}</b> empieza a regir
    otra versión ya aprobada por ${programada.quien}:
    ${(() => {
      const d = diffReglas(ef, mezclarRegla(programada.declarada, S.reglaCartera));
      return d.length === 0 ? `<div style="margin-top:6px">sin diferencias contra la vigente.</div>`
        : `<div style="margin-top:6px">${d.map((c) => `<div><b>${esc(c.label)}</b>: ${esc(c.antes)} → ${esc(c.despues)}</div>`).join("")}</div>`;
    })()}</div></div>` : ""}

  ${S.erroresRegla.length ? `<div class="note n-err"><span class="msi">error</span>
    <div><b>No se escribió nada.</b> Lo que escribiste quedó en pantalla para que lo corrijas.
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
        ${S.erroresRegla.map((e) => `<div>
          <span class="mono" style="font-weight:700">${e.codigo}</span>
          <span class="mono" style="font-size:10px">[${esc(e.campos.join(", "))}]</span>
          <div>${esc(e.mensaje)}</div></div>`).join("")}
      </div></div></div>` : ""}

  ${GRUPOS.map((g) => {
    const propio = nivelPlan ? grupoPropio(p.id, g.k) : true;
    return cardGrupo(g, b.grupos[g.k], !!nivelPlan, propio, editable && propio);
  }).join("")}

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px"><div><h3 style="font-size:13px">Vigencia del cambio</h3>
      <p>Desde cuándo empieza a regir lo que estás editando</p></div></div>
    <div class="grid2">
      <div><label class="fl">Rige desde</label>
        <input type="date" id="rgVigencia" data-w="rule" min="${iso(HOY)}" value="${esc(campo("rgVigencia", b.vigencia))}"${editable ? "" : " disabled"}>
        <p class="hint">Hoy es ${fecha(HOY)}. Una fecha futura deja rigiendo la regla actual hasta ese día.</p></div>
      <div style="display:flex;align-items:flex-end;justify-content:flex-end;gap:10px">
        <button class="btn bo" id="rgReset" data-w="rule"><span class="msi">undo</span>Descartar cambios</button>
        <button class="btn bp" id="okReglas" data-w="rule"><span class="msi">save</span>Revisar impacto y guardar</button>
      </div>
    </div>
  </div>

  ${nivelPlan ? "" : `<div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px"><div><h3 style="font-size:13px">Políticas de la cartera</h3>
      <p>Transversales: no se heredan por plan ni se congelan en el cargo</p></div></div>
    <div class="grid2">
      <div><label class="fl">Tope de recordatorios manuales por día</label>
        ${inputNum("rgTope", b.politicas.topeRecordatoriosDia, 1, 10, editable)}</div>
      <div><label class="fl">Cancelar tras</label>
        ${inputNum("rgCancelar", b.politicas.cancelarTrasMeses, 1, 60, editable)}
        <p class="hint">meses suspendido</p></div>
    </div>
  </div>`}

  <div class="sec" style="margin-top:24px">
    <div class="sech"><div><h3>Historial de vigencias</h3>
      <p>${historial.length ? historial.length + " cambios en este nivel" : "Todavía no cambiaste nada en este nivel"}</p></div></div>
    ${historial.length === 0 ? `<div class="tablewrap"><div class="empty"><span class="msi">history_toggle_off</span>
      <h4>Sin versiones guardadas</h4><p>Cuando guardes un cambio vas a ver acá qué cambió, desde cuándo rige y quién lo aprobó.</p></div></div>`
      : `<div class="tablewrap"><div class="tablescroll"><table>
        <thead><tr><th>Guardado</th><th>Rige desde</th><th>Estado</th><th>Qué cambió</th><th>Usuario</th></tr></thead>
        <tbody>${historial.map((h) => `<tr>
          <td class="mono" style="font-size:11px">${h.cuando.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
          <td style="font-size:12px">${fecha(h.desde)}</td>
          <td><span class="badge ${h.estado === "VIGENTE" ? "b-paid" : h.estado === "PROGRAMADA" ? "b-pending" : "b-cancelled"}">${h.estado}</span></td>
          <td style="font-size:11px">${h.cambios.map((c) => `<div><b>${esc(c.label)}</b>: ${esc(c.antes)} → ${esc(c.despues)}</div>`).join("")}</td>
          <td style="font-size:11px;color:var(--osv)">${h.quien}</td></tr>`).join("")}</tbody></table></div></div>`}
  </div>

  <div class="sec" style="margin-top:24px">
    <div class="sech"><div><h3>Bitácora</h3><p>Todo cambio sensible queda registrado</p></div></div>
    ${S.bitacora.length === 0 ? `<div class="tablewrap"><div class="empty"><span class="msi">history</span>
      <h4>Sin movimientos todavía</h4><p>Cargá cartera, cambiá un precio o aplicá un prorateo y vas a verlo acá.</p></div></div>`
      : `<div class="tablewrap"><div class="tablescroll"><table>
      <thead><tr><th>Cuándo</th><th>Entidad</th><th>Acción</th><th>Detalle</th><th>Usuario</th></tr></thead>
      <tbody>${S.bitacora.slice(0, 20).map((x) => `<tr>
        <td class="mono" style="font-size:11px">${x.cuando.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
        <td class="mono" style="font-size:11px">${x.entidad}</td>
        <td><span class="badge b-pending">${x.accion}</span></td>
        <td style="font-size:12px">${esc(x.detalle)}</td>
        <td style="font-size:11px;color:var(--osv)">${x.quien}</td></tr>`).join("")}</tbody></table></div></div>`}
  </div>`;
}

function absorberFormulario() {
  const b = borrador();
  const g = b.grupos;
  const vista = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const v = String(el.value == null ? "" : el.value);
    b.crudo[id] = v;
    return v;
  };
  const texto = (obj, prop, id) => { const v = vista(id); if (v != null) obj[prop] = v; };
  const numero = (obj, prop, id) => {
    const v = vista(id);
    if (v == null) return;
    obj[prop] = v.trim() === "" ? NaN : Number(v);
  };

  texto(g.diaCorte, "modo", "rgCorteModo");
  numero(g.diaCorte, "dia", "rgCorteDia");
  numero(g.anticipacion, "dias", "rgAnticipacion");
  numero(g.gracia, "dias", "rgGracia");
  texto(g.recargoMora, "tipo", "rgRecargoTipo");
  numero(g.recargoMora, "valor", "rgRecargoValor");
  texto(g.recargoMora, "aplicacion", "rgRecargoAplicacion");
  numero(g.recargoMora, "tope", "rgRecargoTope");
  numero(g.suspension, "cargosVencidos", "rgSuspensionCargos");
  texto(g.suspension, "reactivacion", "rgSuspensionReactivacion");
  texto(g.renovacionConDeuda, "politica", "rgRenovacion");
  numero(g.limiteRechazos, "consecutivos", "rgRechazos");
  g.tramosMora.forEach((t, i) => {
    texto(t, "nombre", `rgTramoNombre${i}`);
    if (i > 0) numero(t, "desde", `rgTramoDesde${i}`);
    if (i < g.tramosMora.length - 1) numero(t, "hasta", `rgTramoHasta${i}`);
  });
  g.cadencia.forEach((a, i) => {
    texto(a, "kind", `rgAvisoKind${i}`);
    texto(a, "label", `rgAvisoLabel${i}`);
    numero(a, "offset", `rgAvisoOffset${i}`);
  });
  if (S.reglaNivel !== "PLAN") {
    numero(b.politicas, "topeRecordatoriosDia", "rgTope");
    numero(b.politicas, "cancelarTrasMeses", "rgCancelar");
  }
  const vig = vista("rgVigencia");
  if (vig != null && vig !== "") b.vigencia = vig;
  return b;
}

function impactoRegla(nivel, planId, grupos) {
  const relevantes = (grupos || []).filter((k) => GRUPOS.some((g) => g.k === k));
  const planesAfectados = nivel === "PLAN" ? [plan(planId)]
    : S.planes.filter((p) => relevantes.length === 0 || relevantes.some((k) => !grupoPropio(p.id, k)));
  const ids = new Set(planesAfectados.map((p) => p.id));
  const suscripciones = S.suscriptores.filter((s) => ids.has(s.planId) && s.estado === "ACTIVE");
  const susIds = new Set(suscripciones.map((s) => s.id));
  const delAlcance = S.cargos.filter((c) => susIds.has(c.suscriptorId));
  const futuros = delAlcance.filter((c) => (c.estado === "SCHEDULED" || c.estado === "PENDING") && c.vence >= iso(HOY));
  return {
    planesAfectados, suscripciones: suscripciones.length,
    futuros: futuros.length, emitidos: delAlcance.length - futuros.length,
  };
}

function drawerImpactoRegla({ nivel, planId, cambios, vigencia, titulo, alConfirmar }) {
  const imp = impactoRegla(nivel, planId, cambios.map((c) => c.campo));
  const futura = vigencia > iso(HOY);
  abrirDrawer({
    titulo: titulo || "Confirmar el cambio de reglas",
    sub: nivel === "PLAN" ? plan(planId).nombre : "Regla de cartera",
    ico: "rule", ancho: 620,
    cuerpo: `
      <div class="note ${futura ? "n-info" : "n-warn"}"><span class="msi">${futura ? "event_upcoming" : "group"}</span>
        <div>${futura
          ? `La versión nueva <b>empieza a regir el ${fecha(vigencia)}</b>. Hasta ese día sigue rigiendo la actual.`
          : `El cambio rige <b>desde hoy</b> para todo cargo que se emita de acá en adelante.`}</div></div>

      <div class="kpis" style="grid-template-columns:1fr 1fr">
        ${kpi("groups", "#1A3270", "#EEF2FD", imp.suscripciones, "Suscripciones vigentes afectadas",
          `${imp.planesAfectados.length} ${imp.planesAfectados.length === 1 ? "plan" : "planes"}: ${imp.planesAfectados.map((x) => esc(x.nombre)).join(", ")}`)}
        ${kpi("event_repeat", "#1F66B8", "#EAF2FC", imp.futuros, "Cargos futuros programados", "van a nacer con la regla nueva")}
      </div>

      <div class="note n-ok"><span class="msi">ac_unit</span>
        <div><b>${imp.emitidos} cargos ya emitidos no se tocan.</b> Cada uno conserva el snapshot con el que nació:
        su mora, su gracia, su suspensión y su cadencia se siguen calculando con esa copia.</div></div>

      <div class="sech"><div><h3 style="font-size:13px">Qué cambia</h3>
        <p>${cambios.length} ${cambios.length === 1 ? "grupo" : "grupos"} · nivel ${nivel === "PLAN" ? "plan" : "cartera"}</p></div></div>
      <div class="tablewrap"><div class="tablescroll"><table>
        <thead><tr><th>Grupo</th><th>Antes</th><th>Después</th></tr></thead>
        <tbody>${cambios.map((c) => `<tr>
          <td class="strong" style="font-size:12px">${esc(c.label)}
            <div class="mono" style="font-size:10px;color:var(--osv)">${esc(c.campo)}</div></td>
          <td style="font-size:11px;color:var(--osv)">${esc(c.antes)}</td>
          <td style="font-size:11px;font-weight:600;color:var(--primary)">${esc(c.despues)}</td></tr>`).join("")}</tbody>
      </table></div></div>

      <div class="kv" style="margin-top:14px"><span class="k">Nivel</span>
        <span class="v">${nivel === "PLAN" ? "Plan · " + esc(plan(planId).nombre) : "Cartera"}</span></div>
      <div class="kv"><span class="k">Rige desde</span><span class="v">${fecha(vigencia)}</span></div>
      <div class="kv"><span class="k">Actor</span><span class="v mono" style="font-size:11px">${ACTOR}</span></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar, no escribir nada</button>
          <button class="btn bp" id="okImpacto"><span class="msi">check</span>Confirmar y guardar</button>`,
    luego: () => { document.getElementById("okImpacto").onclick = alConfirmar; },
  });
}

function escribirRegla(nivel, planId, declarada, politicas) {
  if (nivel === "PLAN") plan(planId).reglaPlan = clonar(declarada);
  else {
    S.reglaCartera = soloGrupos(declarada);
    if (politicas) S.politicasCartera = clonar(politicas);
  }
}

function registrarCambioRegla({ nivel, planId, declarada, politicas, cambios, vigencia, accion }) {
  const clave = nivel === "PLAN" ? "PLAN:" + planId : "PORTFOLIO";
  const programada = vigencia > iso(HOY);
  if (programada) {
    S.vigenciasProgramadas = S.vigenciasProgramadas.filter((v) => v.clave !== clave);
    S.vigenciasProgramadas.push({
      clave, nivel, planId, desde: vigencia, quien: ACTOR, cuando: new Date(),
      declarada: clonar(declarada), politicas: clonar(politicas),
    });
  } else {
    S.historialReglas.forEach((h) => { if (h.clave === clave && h.estado === "VIGENTE") h.estado = "SUPERADA"; });
    escribirRegla(nivel, planId, declarada, politicas);
  }
  S.historialReglas.unshift({
    id: "h" + Date.now() + Math.random(), clave, nivel, planId, desde: vigencia,
    estado: programada ? "PROGRAMADA" : "VIGENTE", cambios, quien: ACTOR, cuando: new Date(),
  });
  cambios.forEach((c) => bita("collection_rule", accion || "ACTUALIZAR",
    `nivel ${nivel === "PLAN" ? "plan " + plan(planId).nombre : "cartera"} · ${c.campo}: "${c.antes}" → "${c.despues}" · rige ${c.vigencia || vigencia} · actor ${ACTOR}`));
  S.borradorRegla = null;
  S.erroresRegla = [];
}

function guardarRegla() {
  if (!puedeEditarReglas()) return toast("Cambiar reglas requiere el grupo collections-admin.", "err");
  const b = absorberFormulario();
  const nivel = S.reglaNivel === "PLAN" ? "PLAN" : "PORTFOLIO";
  const planId = nivel === "PLAN" ? S.reglaPlanId : null;
  const antes = reglaEfectiva(planId);
  const declarada = nivel === "PLAN"
    ? propios(planId).reduce((a, k) => { a[k] = clonar(b.grupos[k]); return a; }, {})
    : soloGrupos(b.grupos);
  const despues = nivel === "PLAN" ? mezclarRegla(declarada, S.reglaCartera) : soloGrupos(declarada);
  const errores = validarReglaEfectiva(despues, contextoRegla(nivel, planId, b.vigencia))
    .concat(nivel === "PORTFOLIO" ? validarPoliticas(b.politicas, { politicaMundo: politicaAplicable() }) : []);
  if (errores.length) {
    S.erroresRegla = errores;
    render();
    return toast(`La regla no se guardó: ${errores.length} ${errores.length === 1 ? "problema" : "problemas"} por corregir.`, "err");
  }
  S.erroresRegla = [];
  const cambios = diffReglas(antes, despues);
  if (nivel === "PORTFOLIO") {
    if (b.politicas.topeRecordatoriosDia !== S.politicasCartera.topeRecordatoriosDia)
      cambios.push({ campo: "topeRecordatoriosDia", label: "Tope de recordatorios por día",
        antes: String(S.politicasCartera.topeRecordatoriosDia), despues: String(b.politicas.topeRecordatoriosDia) });
    if (b.politicas.cancelarTrasMeses !== S.politicasCartera.cancelarTrasMeses)
      cambios.push({ campo: "cancelarTrasMeses", label: "Cancelar tras",
        antes: S.politicasCartera.cancelarTrasMeses + " meses", despues: b.politicas.cancelarTrasMeses + " meses" });
  }
  if (cambios.length === 0) { render(); return toast("No hay nada distinto para guardar.", "info"); }
  const vigencia = b.vigencia;
  const politicas = clonar(b.politicas);
  drawerImpactoRegla({
    nivel, planId, cambios, vigencia,
    alConfirmar: () => {
      registrarCambioRegla({ nivel, planId, declarada, politicas, cambios, vigencia });
      cerrarDrawer();
      toast(vigencia > iso(HOY)
        ? `Guardado. Empieza a regir el ${fecha(vigencia)}; hasta entonces rige la versión actual.`
        : "Guardado. Rige desde hoy para los cargos futuros; los emitidos conservan su snapshot.");
      render();
    },
  });
}

function declararPropio(planId, grupo) {
  if (!puedeEditarReglas()) return toast("Cambiar reglas requiere el grupo collections-admin.", "err");
  const p = plan(planId);
  if (!p.reglaPlan) p.reglaPlan = {};
  if (p.reglaPlan[grupo] != null) return;
  p.reglaPlan[grupo] = clonar(S.reglaCartera[grupo]);
  S.borradorRegla = null;
  S.erroresRegla = [];
  bita("collection_rule", "DECLARAR_PROPIO",
    `nivel plan ${p.nombre} · ${grupo}: "heredado de la cartera" → "propio con el valor de la cartera (${resumenGrupo(grupo, p.reglaPlan[grupo])})" · actor ${ACTOR}`);
  toast(`${etiquetaGrupo(grupo)} ahora es propio de ${p.nombre}. Arranca con el valor de la cartera y ya es editable.`);
  render();
}

function devolverAHerencia(planId, grupo) {
  if (!puedeEditarReglas()) return toast("Cambiar reglas requiere el grupo collections-admin.", "err");
  const p = plan(planId);
  const antes = reglaEfectiva(planId);
  const declarada = Object.keys(p.reglaPlan || {}).filter((k) => k !== grupo)
    .reduce((a, k) => { a[k] = clonar(p.reglaPlan[k]); return a; }, {});
  const despues = mezclarRegla(declarada, S.reglaCartera);
  const errores = validarReglaEfectiva(despues, contextoRegla("PLAN", planId));
  if (errores.length) {
    S.erroresRegla = errores;
    render();
    return toast(`No se puede devolver ${etiquetaGrupo(grupo)} a la herencia: la regla efectiva quedaría inválida.`, "err");
  }
  const cambios = diffReglas(antes, despues);
  if (cambios.length === 0) return aplicarHerencia(planId, grupo, cambios);
  drawerImpactoRegla({
    nivel: "PLAN", planId, cambios, vigencia: iso(HOY),
    titulo: "Devolver el grupo a la herencia de la cartera",
    alConfirmar: () => { cerrarDrawer(); aplicarHerencia(planId, grupo, cambios); },
  });
}

function aplicarHerencia(planId, grupo, cambios) {
  const p = plan(planId);
  const lista = cambios && cambios.length ? cambios
    : [{ campo: grupo, label: etiquetaGrupo(grupo), antes: "propio del plan", despues: "heredado de la cartera" }];
  if (p.reglaPlan) delete p.reglaPlan[grupo];
  registrarCambioRegla({
    nivel: "PLAN", planId, declarada: clonar(p.reglaPlan || {}), politicas: null,
    cambios: lista, vigencia: iso(HOY), accion: "DEVOLVER_A_HERENCIA",
  });
  toast(`${etiquetaGrupo(grupo)} vuelve a heredar de la cartera.`);
  render();
}

function wReglas() {
  document.querySelectorAll("[data-nivel]").forEach((b) => b.onclick = () => {
    const v = b.dataset.nivel;
    S.reglaNivel = v === "PORTFOLIO" ? "PORTFOLIO" : "PLAN";
    S.reglaPlanId = v === "PORTFOLIO" ? null : v;
    S.borradorRegla = null;
    S.erroresRegla = [];
    render();
  });
  document.querySelectorAll("[data-propio]").forEach((b) => b.onclick = () => declararPropio(S.reglaPlanId, b.dataset.propio));
  document.querySelectorAll("[data-herencia]").forEach((b) => b.onclick = () => devolverAHerencia(S.reglaPlanId, b.dataset.herencia));

  document.querySelectorAll("[data-tramoadd]").forEach((b) => b.onclick = () => {
    const tramos = absorberFormulario().grupos.tramosMora;
    if (tramos.length >= 10) return toast("Diez tramos es el máximo.", "err");
    const ultimo = tramos[tramos.length - 1];
    const corte = Number.isInteger(ultimo.desde) ? ultimo.desde + 29 : 30;
    ultimo.hasta = corte;
    tramos.push({ nombre: `Más de ${corte} días`, desde: corte + 1, hasta: null });
    limpiarCrudo("rgTramo");
    render();
  });
  document.querySelectorAll("[data-tramodel]").forEach((b) => b.onclick = () => {
    const tramos = absorberFormulario().grupos.tramosMora;
    if (tramos.length <= 1) return toast("Tiene que quedar al menos un tramo.", "err");
    const i = Number(b.dataset.tramodel);
    const quitado = tramos.splice(i, 1)[0];
    if (i > 0 && quitado.hasta != null) tramos[i - 1].hasta = quitado.hasta;
    tramos[0].desde = 1;
    tramos[tramos.length - 1].hasta = null;
    limpiarCrudo("rgTramo");
    toast(`Tramo "${quitado.nombre}" eliminado. El tramo anterior absorbe su rango.`, "info");
    render();
  });
  document.querySelectorAll("[data-avisoadd]").forEach((b) => b.onclick = () => {
    const cadencia = absorberFormulario().grupos.cadencia;
    if (cadencia.length >= 10) return toast("Diez avisos es el máximo.", "err");
    cadencia.push({ kind: "POST_DUE_REMINDER", label: "Recordatorio nuevo", offset: 7, on: true });
    limpiarCrudo("rgAviso");
    render();
  });
  document.querySelectorAll("[data-avisodel]").forEach((b) => b.onclick = () => {
    const cadencia = absorberFormulario().grupos.cadencia;
    cadencia.splice(Number(b.dataset.avisodel), 1);
    limpiarCrudo("rgAviso");
    render();
  });
  document.querySelectorAll("[data-avisoon]").forEach((b) => b.onclick = () => {
    const cadencia = absorberFormulario().grupos.cadencia;
    const a = cadencia[Number(b.dataset.avisoon)];
    if (a) a.on = !a.on;
    render();
  });

  document.getElementById("rgReset").onclick = () => {
    S.borradorRegla = null;
    S.erroresRegla = [];
    toast("Cambios descartados. Volvés a ver la regla vigente.", "info");
    render();
  };
  document.getElementById("okReglas").onclick = guardarRegla;
  wPoliticaDelMundo();
}

/// ─────────────────────────────────────────────────────────────────────────────────────────────
/// Lado comercio: la política que le baja su mundo. Se ve, no se edita, y recorta lo que se puede
/// hacer en esta cartera. Acá también otorga o revoca el detalle nominal.
/// ─────────────────────────────────────────────────────────────────────────────────────────────

function cardPoliticaDelMundo() {
  const pol = politicaAplicable();
  const m = comercioDeLaCaja();
  if (!pol || !m) return "";
  const efectivos = mediosEfectivos();
  const fuera = mediosRecortados();
  const aut = m.autorizacionDetalle;
  const otorgada = !!(aut && aut.otorgada);
  const rev = m.capacidad.revisionPendiente;

  return `<div class="card" style="padding:20px;margin-bottom:20px;border-left:3px solid var(--info)">
    <div class="sech"><div><h3>Lo que fija ${esc(S.mundo.nombre)}</h3>
      <p>Política del mundo sobre la cobranza de este comercio · congelada en la habilitación del ${
        m.capacidad.habilitadoEl ? fecha(m.capacidad.habilitadoEl) : "—"}</p></div>
      <span class="badge b-pending"><span class="msi" style="font-size:13px">policy</span>solo consulta</span></div>

    <div class="kv"><span class="k">Medios de pago que podés ofrecer</span>
      <span class="v" style="font-weight:500">${efectivos.map((x) => esc(MEDIOS_PAGO[x])).join(" · ") || "ninguno"}</span></div>
    ${fuera.length ? `<div class="kv"><span class="k">Recortados por el mundo</span>
      <span class="v" style="font-weight:500;color:var(--osv);text-decoration:line-through">${fuera.map((x) => esc(MEDIOS_PAGO[x])).join(" · ")}</span></div>` : ""}
    <div class="kv"><span class="k">Recargo por mora máximo</span><span class="v">${pol.topeRecargoMoraPct}% del cargo</span></div>
    <div class="kv"><span class="k">Días de gracia máximos</span><span class="v">${pol.topeGraciaDias}</span></div>
    <div class="kv"><span class="k">Recordatorios manuales por día</span>
      <span class="v">${pol.topeRecordatoriosDia} por suscriptor · efectivo ${topeRecordatoriosEfectivo()}</span></div>
    <div class="kv"><span class="k">Monto máximo por cargo</span><span class="v">${pol.topeMontoCargo == null ? "sin límite" : money(pol.topeMontoCargo)}</span></div>
    <div class="kv"><span class="k">Monto máximo por lote</span><span class="v">${pol.topeMontoLote == null ? "sin límite" : money(pol.topeMontoLote)}</span></div>
    <div class="kv"><span class="k">Comisión del mundo</span>
      <span class="v">${pol.comisionMundoPct}% informado en cada cargo</span></div>

    <div class="note n-info" style="margin:14px 0 0"><span class="msi">info</span>
      <div>Si guardás una regla que pasa el tope de mora o de gracia, se rechaza con
      <span class="mono">policy_limit_exceeded</span> y se te dice cuál es el tope. La comisión del mundo
      <b>solo se informa</b>: en esta fase no mueve dinero.</div></div>

    ${rev ? `<div class="note n-warn" style="margin:14px 0 0"><span class="msi">fact_check</span>
      <div><b>Revisión de reglas pendiente.</b> ${esc(S.mundo.nombre)} reactivó la capacidad y hasta que
      confirme la revisión de reglas no se vuelve a emitir. Tus datos están completos; falta esa confirmación,
      que es de nivel ADMIN del mundo.</div></div>` : ""}

    <div class="sech" style="margin:20px 0 8px"><div><h3 style="font-size:13px">Plantillas de aviso</h3>
      <p>Las obligatorias no se pueden desactivar. Solo son editables los campos que la política declara</p></div></div>
    ${pol.plantillas.map((t) => {
      const propia = S.plantillasComercio[t.kind] || { activa: false };
      return `<div class="rowflex">
        <span class="msi" style="color:var(--primary)">${KINDS_AVISO[t.kind] ? KINDS_AVISO[t.kind].ico : "mail"}</span>
        <div class="rf1"><b>${esc(t.nombre)} ${t.obligatoria
            ? `<span class="badge b-pending">obligatoria</span>` : `<span class="badge b-cancelled">opcional</span>`}</b>
          <span class="mono">${t.kind}</span>
          <span>Editables: ${t.camposEditables.map((c) => esc(CAMPOS_PLANTILLA[c])).join(", ") || "ninguno"}</span></div>
        <button class="mini" data-w="world" data-plantillaedit="${t.kind}"><span class="msi">edit</span>Editar</button>
        <button class="sw ${propia.activa ? "on" : ""}" data-w="world" data-plantillaon="${t.kind}"
          ${t.obligatoria ? ` title="${esc(`"${t.nombre}" es obligatoria por política de ${S.mundo.nombre}: no se puede desactivar desde el comercio.`)}"` : ""}><i></i></button>
      </div>`;
    }).join("")}

    <div class="sech" style="margin:20px 0 8px"><div><h3 style="font-size:13px">Detalle nominal de tu cartera</h3>
      <p>Qué ve ${esc(S.mundo.nombre)} de tus suscriptores</p></div></div>
    <div class="note ${otorgada ? "n-warn" : "n-ok"}" style="margin:0 0 12px">
      <span class="msi">${otorgada ? "visibility" : "visibility_off"}</span>
      <div>${otorgada
        ? `Hoy ${esc(S.mundo.nombre)} <b>ve tu cartera con nombres</b>. Lo autorizaste el ${fecha(aut.cuando)} (${esc(aut.por)}).
           Podés revocarlo cuando quieras y vuelve a ver solo el agregado.`
        : `Hoy ${esc(S.mundo.nombre)} ve <b>solo el agregado</b>: cuántos suscriptores, cuánto por cobrar, la mora por tramo
           y lo cobrado del período. <b>Ningún nombre.</b>${aut && aut.revocadaEl ? ` Revocado el ${fecha(aut.revocadaEl)}.` : ""}`}</div></div>
    <div class="rowflex">
      <div class="rf1"><b>Autorizar el detalle nominal</b>
        <span>${S.politicaMundo.solicitaDetalleNominal
          ? "La política del mundo pide esta autorización. Es explícita, revocable y queda en bitácora."
          : "La política del mundo está en solo agregado: aunque autorices, no se muestran nombres."}</span></div>
      <button class="sw ${otorgada ? "on" : ""}" data-w="world" data-autorizo="${m.id}"><i></i></button>
    </div>
  </div>`;
}

function wPoliticaDelMundo() {
  const m = comercioDeLaCaja();
  if (!m) return;
  document.querySelectorAll("[data-autorizo]").forEach((b) => b.onclick = () => {
    const otorgada = !!(m.autorizacionDetalle && m.autorizacionDetalle.otorgada);
    if (otorgada) return drawerRevocarDetalle(m);
    drawerAutorizarDetalle(m);
  });
  document.querySelectorAll("[data-plantillaon]").forEach((b) => b.onclick = () => {
    const kind = b.dataset.plantillaon;
    const propia = S.plantillasComercio[kind];
    const r = activarPlantilla(kind, !propia.activa);
    if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
    toast(`Plantilla ${kind} ${propia.activa ? "activada" : "desactivada"}.`, "info");
    render();
  });
  document.querySelectorAll("[data-plantillaedit]").forEach((b) => b.onclick = () => drawerPlantilla(b.dataset.plantillaedit));
}

function drawerPlantilla(kind) {
  const t = plantillaPolitica(kind);
  const propia = S.plantillasComercio[kind];
  if (!t || !propia) return toast("Esa plantilla no está en la política del mundo.", "err");
  const motivo = (campo) => `${S.mundo.nombre} no dejó editable el campo ${CAMPOS_PLANTILLA[campo]} de esta plantilla.`;
  abrirDrawer({
    titulo: t.nombre, sub: `${kind} · plantilla de ${S.mundo.nombre}`, ico: "mail", ancho: 560,
    cuerpo: `
      <div class="note ${t.obligatoria ? "n-warn" : "n-info"}"><span class="msi">${t.obligatoria ? "lock" : "edit_note"}</span>
        <div>${t.obligatoria ? "Plantilla <b>obligatoria</b>: no se puede desactivar desde el comercio." : "Plantilla opcional: se puede desactivar."}
        Campos editables: <b>${t.camposEditables.map((c) => esc(CAMPOS_PLANTILLA[c])).join(", ") || "ninguno"}</b>.
        El resto llega fijo desde la política y se muestra deshabilitado con el motivo.</div></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${Object.keys(CAMPOS_PLANTILLA).map((campo) => {
          const ed = campoEditable(kind, campo);
          const valor = propia[campo] == null ? "" : propia[campo];
          return `<div><label class="fl">${esc(CAMPOS_PLANTILLA[campo])}${ed ? "" : " · fijado por el mundo"}</label>
            ${campo === "cuerpo"
              ? `<textarea id="pl-${campo}" rows="3"${ed ? "" : ` disabled title="${esc(motivo(campo))}"`}>${esc(valor)}</textarea>`
              : `<input id="pl-${campo}" value="${esc(valor)}"${ed ? "" : ` disabled title="${esc(motivo(campo))}"`}>`}
            ${ed ? "" : `<p class="hint">${esc(motivo(campo))}</p>`}</div>`;
        }).join("")}
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okPlantilla">Guardar plantilla</button>`,
    luego: () => {
      document.getElementById("okPlantilla").onclick = () => {
        const valores = {};
        Object.keys(CAMPOS_PLANTILLA).forEach((campo) => {
          if (!campoEditable(kind, campo)) return;
          const el = document.getElementById("pl-" + campo);
          if (el) valores[campo] = String(el.value == null ? "" : el.value);
        });
        const r = editarPlantilla(kind, valores);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(r.cambios.length ? `Plantilla actualizada: ${r.cambios.join(", ")}.` : "No hubo cambios en la plantilla.", r.cambios.length ? "ok" : "info");
        render();
      };
    },
  });
}

function drawerAutorizarDetalle(m) {
  const ag = agregadoComercio(m);
  abrirDrawer({
    titulo: "Autorizar el detalle nominal", sub: `${m.nombre} → ${S.mundo.nombre}`, ico: "visibility", ancho: 560,
    cuerpo: `
      <div class="note n-warn"><span class="msi">privacy_tip</span>
        <div>Al autorizar, ${esc(S.mundo.nombre)} va a ver <b>nombre, documento, plan, deuda y antigüedad</b>
        de tus ${ag.suscriptores} suscriptores. Hoy solo ve el agregado.</div></div>
      <div class="kv"><span class="k">Qué ve hoy</span><span class="v">Agregado: ${ag.suscriptores} suscriptores · ${money(ag.porCobrar)} por cobrar</span></div>
      <div class="kv"><span class="k">Qué vería</span><span class="v">La lista nominal completa</span></div>
      <div class="kv"><span class="k">Revocable</span><span class="v">Sí, en cualquier momento</span></div>
      <div class="kv"><span class="k">Queda registrado</span><span class="v mono" style="font-size:11px">merchant_data_sharing</span></div>
      <div class="note n-info" style="margin-top:14px"><span class="msi">info</span>
        <div>La autorización es del comercio, no del mundo: ${esc(S.mundo.nombre)} no puede dársela a sí mismo
        ni saltearla desde su panel.</div></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okAut">Autorizar</button>`,
    luego: () => {
      document.getElementById("okAut").onclick = () => {
        const r = autorizarDetalleCartera(m.id, true);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(`${S.mundo.nombre} ya puede ver tu cartera con nombres.`);
        render();
      };
    },
  });
}

function drawerRevocarDetalle(m) {
  abrirDrawer({
    titulo: "Revocar el detalle nominal", sub: `${m.nombre} → ${S.mundo.nombre}`, ico: "visibility_off", ancho: 560,
    cuerpo: `
      <div class="note n-info"><span class="msi">lock_reset</span>
        <div>${esc(S.mundo.nombre)} vuelve a ver <b>solo el agregado</b> de tu cartera: cantidad de suscriptores,
        monto por cobrar, mora por tramo y cobrado del período. Ningún nombre.</div></div>
      <div class="kv"><span class="k">Lo que ya vio</span><span class="v">No se puede deshacer</span></div>
      <div class="kv"><span class="k">Lo que verá desde hoy</span><span class="v">Agregado solamente</span></div>
      <div class="kv"><span class="k">Queda registrado</span><span class="v mono" style="font-size:11px">merchant_data_sharing · REVOCAR</span></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button><button class="btn bp" id="okRev">Revocar</button>`,
    luego: () => {
      document.getElementById("okRev").onclick = () => {
        const r = autorizarDetalleCartera(m.id, false);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(`Autorización revocada. ${S.mundo.nombre} vuelve al agregado.`, "info");
        render();
      };
    },
  });
}

/// ─────────────────────────────────────────────────────────────────────────────────────────────
/// Lado mundo: los comercios y lo que el mundo les habilita, les entrega y les limita.
/// ─────────────────────────────────────────────────────────────────────────────────────────────

function miniMundo(attr, valor, ico, texto, bloqueo) {
  return `<button class="mini" data-w="world" data-${attr}="${esc(valor)}"${
    bloqueo ? ` disabled title="${esc(bloqueo)}" style="opacity:.45;cursor:not-allowed"` : ""}>
    <span class="msi">${ico}</span>${esc(texto)}</button>`;
}

function credencialesVivas(m) { return m.credenciales.filter((c) => c.estado === "DELIVERED"); }

function vComercios() {
  const ms = comerciosDelMundo();
  const sinFacultad = S.mundo.facultadDelegada ? null : motivoFacultad();
  const hab = ms.filter((m) => m.capacidad.estado === "ENABLED");
  const pend = ms.filter((m) => m.capacidad.estado === "PENDING_ENABLEMENT");
  const sinContrato = ms.filter((m) => m.capacidad.estado === "NOT_CONTRACTED");
  const conCredencial = hab.filter((m) => credencialesVivas(m).length > 0);
  const revisiones = hab.filter((m) => m.capacidad.revisionPendiente);

  return `
  <div class="banner">
    <div><h3>${ms.length} comercios en ${esc(S.mundo.nombre)}</h3>
      <p>Acá el mundo habilita el Gestor de Cobranzas a un comercio, le entrega sus credenciales y entra
      a ver su cartera. Cada habilitación escribe en <span class="mono">merchant_module</span> del comercio
      que elegís y en ninguno más.</p></div>
    <span class="msi">storefront</span>
  </div>

  <div class="note ${S.mundo.facultadDelegada ? "n-ok" : "n-warn"}">
    <span class="msi">${S.mundo.facultadDelegada ? "verified_user" : "gpp_maybe"}</span>
    <div>${S.mundo.facultadDelegada
      ? `Red Pontis le <b>delegó a ${esc(S.mundo.nombre)} la facultad de habilitación</b> el ${fecha(S.mundo.facultadDesde)}
         (${esc(S.mundo.facultadPor)}). El mundo habilita, deshabilita y entrega credenciales a sus comercios.`
      : `Red Pontis <b>no delegó la facultad de habilitación</b> a ${esc(S.mundo.nombre)}.
         <b>La habilitación y la entrega de credenciales las realiza Red Pontis.</b> Acá el estado se ve en
         consulta: las acciones de escritura quedan deshabilitadas con el motivo.`}</div></div>

  <div class="note n-info"><span class="msi">science</span>
    <div><b>Simuladores del prototipo.</b> Existen solo acá, para poder recorrer los dos caminos sin tocar código.
      <div class="chips" style="margin-top:10px">
        <button class="chip ${S.mundo.facultadDelegada ? "on" : ""}" data-sim="facultad">
          <span class="msi" style="font-size:15px">${S.mundo.facultadDelegada ? "toggle_on" : "toggle_off"}</span>
          Facultad delegada por Red Pontis</button>
        <button class="chip ${S.simulado.idpCaido ? "on" : ""}" data-sim="idp">
          <span class="msi" style="font-size:15px">${S.simulado.idpCaido ? "cloud_off" : "cloud_done"}</span>
          Proveedor de identidad caído</button>
      </div></div></div>

  <div class="kpis">
    ${kpi("storefront", "#1A3270", "#EEF2FD", ms.length, "Comercios del mundo", "todos los actores")}
    ${kpi("task_alt", "#097A54", "#E7F5EF", hab.length, "Con cobranzas habilitada", `${conCredencial.length} ya con credenciales`)}
    ${kpi("pending_actions", "#1F66B8", "#EAF2FC", pend.length, "Pendientes de habilitación", "contratados a Red Pontis")}
    ${kpi("fact_check", "#AB4F00", "#FDF1E3", revisiones.length, "Revisión de reglas pendiente", "reactivados, no emiten todavía")}
    ${kpi("sell", "#6B4FA3", "#F1ECF9", sinContrato.length, "Sin el producto", "la venta la hace Red Pontis")}
  </div>

  <div class="sech">
    <div><h3>Capacidad de cobranzas por comercio</h3>
      <p>Estado, credenciales entregadas y qué ve el mundo de cada cartera</p></div>
    <button class="btn bo" id="expComercios"><span class="msi">download</span>CSV</button>
  </div>

  <div class="tablewrap"><div class="tablescroll"><table>
    <thead><tr><th>Comercio</th><th>Capacidad</th><th>Configuración</th><th>Credenciales</th>
      <th>Qué ve el mundo</th><th>Cartera</th><th></th></tr></thead>
    <tbody>${ms.map((m) => {
      const cap = m.capacidad;
      const est = ESTADOS_CAPACIDAD[cap.estado];
      const vis = visibilidadCartera(m);
      const vivas = credencialesVivas(m);
      const err = m.credenciales.filter((c) => c.estado === "ERROR").length;
      const tieneDatos = cap.estado === "ENABLED" || cap.estado === "DISABLED";
      const ag = tieneDatos ? agregadoComercio(m) : null;
      const acciones = [];
      if (cap.estado === "PENDING_ENABLEMENT" || cap.estado === "DISABLED")
        acciones.push(miniMundo("habilitar", m.id, "play_circle", "Habilitar", sinFacultad));
      if (cap.estado === "ENABLED") {
        if (cap.revisionPendiente) acciones.push(miniMundo("revision", m.id, "fact_check", "Confirmar revisión", null));
        acciones.push(miniMundo("credenciales", m.id, "key", vivas.length ? "Credenciales" : "Entregar acceso", sinFacultad));
        acciones.push(miniMundo("deshabilitar", m.id, "pause_circle", "Deshabilitar", sinFacultad));
      }
      if (cap.estado === "NOT_CONTRACTED")
        acciones.push(`<span class="hint" style="margin:0">Lo vende Red Pontis</span>`);
      return `<tr>
        <td><div class="strong">${esc(m.nombre)}</div>
          <div style="font-size:11px;color:var(--osv)">${esc(m.rubro)}</div>
          <div class="mono" style="font-size:10px;color:var(--outline)">RUC ${esc(m.ruc)} · ${esc(m.id)}</div></td>
        <td><span class="badge ${est.cls}">${est.label}</span>
          <div style="font-size:10px;color:var(--osv);margin-top:3px">${esc(est.d)}</div>
          ${cap.habilitadoEl ? `<div class="mono" style="font-size:10px;color:var(--outline)">desde ${cap.habilitadoEl}${
            cap.deshabilitadoEl ? ` · off ${cap.deshabilitadoEl}` : ""}</div>` : ""}</td>
        <td>${cap.estado === "NOT_CONTRACTED" || cap.estado === "PENDING_ENABLEMENT"
            ? `<span style="color:var(--outline)">—</span>`
            : cap.revisionPendiente
              ? `<span class="badge b-overdue">Revisión pendiente</span>
                 <div style="font-size:10px;color:var(--warning);margin-top:3px">no emite hasta confirmar</div>`
              : cap.configurado
                ? `<span class="badge b-paid">Configurado</span>`
                : `<span class="badge b-pending">Sin configurar</span>
                   <div style="font-size:10px;color:var(--osv);margin-top:3px">habilitado, todavía no cargó cartera ni reglas</div>`}</td>
        <td>${vivas.length
            ? vivas.map((c) => `<div style="font-size:11px"><b>${esc(c.correo)}</b>
                <div class="mono" style="font-size:10px;color:var(--osv)">${esc(c.rol)}</div></div>`).join("")
            : `<span style="color:var(--outline);font-size:11px">${cap.estado === "ENABLED" ? "sin entregar" : "—"}</span>`}
          ${err ? `<div class="badge b-arrears" style="margin-top:4px">${err} con error</div>` : ""}</td>
        <td><span class="badge ${vis.nivel === "NOMINAL" ? "b-partial" : "b-cancelled"}">
            ${vis.nivel === "NOMINAL" ? "Detalle nominal" : "Solo agregado"}</span>
          ${vis.motivo ? `<div class="mono" style="font-size:9px;color:var(--outline);margin-top:3px">${vis.motivo}</div>` : ""}</td>
        <td class="num">${ag
            ? `<div class="strong">${money0(ag.porCobrar)}</div>
               <div style="font-size:10px;color:var(--osv)">${ag.suscriptores} suscriptores · ${ag.deudores} deudores</div>`
            : `<span style="color:var(--outline)">—</span>`}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${tieneDatos ? `<button class="link" data-cartera="${m.id}">Ver cartera</button>` : ""}
          ${acciones.join("")}</div></td>
      </tr>`;
    }).join("")}</tbody>
  </table></div></div>

  <div class="note n-info" style="margin-top:16px"><span class="msi">lock_person</span>
    <div>La exportación de esta pestaña sale <b>siempre agregada</b>, incluso del comercio que autorizó el
    detalle: el CSV del mundo no lleva nombres de los suscriptores de sus comercios.</div></div>`;
}

function wComercios() {
  document.querySelectorAll("[data-sim]").forEach((b) => b.onclick = () => {
    if (b.dataset.sim === "facultad") {
      S.mundo.facultadDelegada = !S.mundo.facultadDelegada;
      toast(S.mundo.facultadDelegada
        ? `Simulación: Red Pontis delegó la facultad a ${S.mundo.nombre}.`
        : "Simulación: sin facultad delegada. Habilitar y entregar credenciales lo hace Red Pontis.", "info");
    } else {
      S.simulado.idpCaido = !S.simulado.idpCaido;
      toast(S.simulado.idpCaido
        ? "Simulación: el proveedor de identidad está caído. La emisión va a fallar con identity_provider_unavailable."
        : "Simulación: el proveedor de identidad volvió.", "info");
    }
    render();
  });
  document.querySelectorAll("[data-habilitar]").forEach((b) => b.onclick = () => drawerHabilitar(b.dataset.habilitar));
  document.querySelectorAll("[data-deshabilitar]").forEach((b) => b.onclick = () => drawerDeshabilitar(b.dataset.deshabilitar));
  document.querySelectorAll("[data-credenciales]").forEach((b) => b.onclick = () => drawerCredenciales(b.dataset.credenciales));
  document.querySelectorAll("[data-revision]").forEach((b) => b.onclick = () => drawerRevision(b.dataset.revision));
  document.querySelectorAll("[data-cartera]").forEach((b) => b.onclick = () => drawerCarteraComercio(b.dataset.cartera));
  document.getElementById("expComercios").onclick = () => exportar("comercios-cobranzas", comerciosDelMundo().map((m) => {
    const tieneDatos = m.capacidad.estado === "ENABLED" || m.capacidad.estado === "DISABLED";
    const ag = tieneDatos ? agregadoComercio(m) : null;
    return {
      comercio: m.nombre, id: m.id, rubro: m.rubro, ruc: m.ruc,
      capacidad: m.capacidad.estado, configurado: m.capacidad.configurado ? "SI" : "NO",
      revision_pendiente: m.capacidad.revisionPendiente ? "SI" : "NO",
      habilitado_el: m.capacidad.habilitadoEl || "", deshabilitado_el: m.capacidad.deshabilitadoEl || "",
      credenciales_vivas: credencialesVivas(m).length,
      visibilidad: visibilidadCartera(m).nivel,
      suscriptores: ag ? ag.suscriptores : "", por_cobrar: ag ? ag.porCobrar : "",
      mora: ag ? ag.mora : "", cobrado_periodo: ag ? ag.cobradoPeriodo : "",
    };
  }));
}

function filaEscritura(k, v) {
  return `<div class="kv"><span class="k mono" style="font-size:11px">${k}</span>
    <span class="v mono" style="font-size:11px">${esc(v)}</span></div>`;
}

function drawerHabilitar(merchantId) {
  const m = comercioPorId(merchantId);
  if (!m) return toast(`forbidden: el comercio ${merchantId} no pertenece a ${S.mundo.nombre}.`, "err");
  const otros = comerciosDelMundo().filter((x) => x.id !== m.id);
  const reactivacion = !!m.capacidad.habilitadoEl;
  const pol = S.politicaMundo;
  abrirDrawer({
    titulo: "Habilitar el Gestor de Cobranzas", sub: `${m.nombre} · ${S.mundo.nombre}`, ico: "play_circle", ancho: 620,
    cuerpo: `
      ${S.mundo.facultadDelegada ? "" : `<div class="note n-err"><span class="msi">block</span>
        <div><b class="mono">delegation_not_granted</b> — ${esc(motivoFacultad())}</div></div>`}
      ${reactivacion ? `<div class="note n-warn"><span class="msi">restart_alt</span>
        <div>Es una <b>reactivación</b>: ${esc(m.nombre)} estuvo habilitado del ${fecha(m.capacidad.habilitadoEl)}
        al ${fecha(m.capacidad.deshabilitadoEl)}. Sus datos siguen enteros. Al reactivar queda pendiente la
        <b>confirmación de revisión de reglas</b> antes de que pueda volver a emitir.</div></div>` : ""}

      <div class="sech" style="margin-bottom:8px"><div><h3 style="font-size:13px">Qué se escribe</h3>
        <p>Una fila en <span class="mono">merchant_module</span>, la de este comercio</p></div>
        <span class="badge b-partial"><span class="msi" style="font-size:13px">edit_note</span>1 fila</span></div>
      <div class="card" style="padding:16px;margin-bottom:16px">
        ${filaEscritura("tabla", "merchant_module")}
        ${filaEscritura("merchant_id", m.id)}
        ${filaEscritura("world_id", S.mundo.id)}
        ${filaEscritura("module_code", "cobranzas")}
        ${filaEscritura("scope", "MERCHANT")}
        ${filaEscritura("enabled", "true")}
        ${filaEscritura("enabled_at", iso(HOY))}
        ${filaEscritura("enabled_by", ACTOR)}
        ${filaEscritura("config_json", "snapshot de la política del mundo")}
      </div>

      <div class="note n-ok"><span class="msi">lock</span>
        <div><b>Los otros ${otros.length} comercios del mundo no se tocan.</b>
        ${otros.map((x) => esc(x.nombre)).join(", ")} quedan exactamente como están: la capacidad por comercio
        es independiente comercio por comercio, y también del <span class="mono">world_module</span> del mundo.</div></div>

      <div class="sech"><div><h3 style="font-size:13px">Política que queda congelada en la habilitación</h3>
        <p>Es la vigente hoy. Un cambio posterior de política no reescribe esta fila</p></div></div>
      <div class="card" style="padding:16px">
        ${CAMPOS_POLITICA.map((c) => `<div class="kv"><span class="k">${c.l}</span>
          <span class="v" style="font-weight:500">${esc(c.fmt(pol[c.k]))}</span></div>`).join("")}
      </div>

      <div class="kv" style="margin-top:14px"><span class="k">Actor</span>
        <span class="v mono" style="font-size:11px">${ACTOR}</span></div>
      <div class="kv"><span class="k">Fecha</span><span class="v">${fecha(HOY)}</span></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar, no escribir nada</button>
          <button class="btn bp" id="okHabilitar"><span class="msi">check</span>Habilitar a ${esc(m.nombre)}</button>`,
    luego: () => {
      document.getElementById("okHabilitar").onclick = () => {
        const r = habilitarCobranzas(m.id);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(r.reactivacion
          ? `${m.nombre} quedó habilitado otra vez. Falta confirmar la revisión de reglas para que vuelva a emitir.`
          : `${m.nombre} ya tiene el Gestor de Cobranzas. Entregale las credenciales para que entre.`);
        render();
      };
    },
  });
}

function drawerDeshabilitar(merchantId) {
  const m = comercioPorId(merchantId);
  if (!m) return toast(`forbidden: el comercio ${merchantId} no pertenece a ${S.mundo.nombre}.`, "err");
  const ag = agregadoComercio(m);
  const vivas = credencialesVivas(m);
  abrirDrawer({
    titulo: "Deshabilitar el Gestor de Cobranzas", sub: `${m.nombre} · ${S.mundo.nombre}`, ico: "pause_circle", ancho: 620,
    cuerpo: `
      ${S.mundo.facultadDelegada ? "" : `<div class="note n-err"><span class="msi">block</span>
        <div><b class="mono">delegation_not_granted</b> — ${esc(motivoFacultad())}</div></div>`}
      <div class="note n-warn"><span class="msi">pause_circle</span>
        <div>${esc(m.nombre)} <b>pierde el acceso al panel</b>: sus ${vivas.length}
        ${vivas.length === 1 ? "credencial queda suspendida" : "credenciales quedan suspendidas"} y no puede entrar
        ni emitir. El usuario de Cognito <b>no se borra</b>.</div></div>
      <div class="note n-ok"><span class="msi">inventory_2</span>
        <div><b>No se destruye ningún dato.</b> Quedan enteros:</div></div>
      <div class="card" style="padding:16px;margin-bottom:16px">
        <div class="kv"><span class="k">Suscriptores de su cartera</span><span class="v">${ag.suscriptores}</span></div>
        <div class="kv"><span class="k">Monto por cobrar</span><span class="v">${money(ag.porCobrar)}</span></div>
        <div class="kv"><span class="k">Mora acumulada</span><span class="v">${money(ag.mora)}</span></div>
        <div class="kv"><span class="k">Planes, reglas y cargos emitidos</span><span class="v">se conservan</span></div>
        <div class="kv"><span class="k">Autorización de detalle nominal</span>
          <span class="v">${m.autorizacionDetalle && m.autorizacionDetalle.otorgada ? "se mantiene" : "sin cambios"}</span></div>
      </div>
      <div class="note n-info" style="margin:0"><span class="msi">fact_check</span>
        <div>Si más adelante lo reactivás, la capacidad vuelve con una <b>confirmación de revisión de reglas
        pendiente</b>: hasta que un ADMIN la confirme, ${esc(m.nombre)} no vuelve a emitir.</div></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button>
          <button class="btn bp" id="okDeshabilitar"><span class="msi">pause</span>Deshabilitar</button>`,
    luego: () => {
      document.getElementById("okDeshabilitar").onclick = () => {
        const r = deshabilitarCobranzas(m.id);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(`${m.nombre} quedó deshabilitado. Sus ${r.conservados} suscriptores y sus cargos siguen enteros.`, "info");
        render();
      };
    },
  });
}

function drawerRevision(merchantId) {
  const m = comercioPorId(merchantId);
  if (!m) return toast(`forbidden: el comercio ${merchantId} no pertenece a ${S.mundo.nombre}.`, "err");
  const ef = reglaEfectiva(null);
  abrirDrawer({
    titulo: "Confirmar la revisión de reglas", sub: `${m.nombre} · reactivación`, ico: "fact_check", ancho: 620,
    cuerpo: `
      <div class="note n-warn"><span class="msi">fact_check</span>
        <div>${esc(m.nombre)} volvió a quedar habilitado el ${fecha(m.capacidad.habilitadoEl)} después de haber
        estado deshabilitado. Mientras la revisión siga pendiente <b>no se emite ningún cargo</b>:
        las reglas con las que dejó de operar pueden haber quedado viejas.</div></div>
      <div class="sech"><div><h3 style="font-size:13px">Qué hay que mirar antes de confirmar</h3>
        <p>Es una confirmación de nivel ADMIN, queda en bitácora</p></div></div>
      <div class="card" style="padding:16px;margin-bottom:16px">
        <div class="kv"><span class="k">Día de corte</span><span class="v" style="font-weight:500">${esc(resumenGrupo("diaCorte", ef.diaCorte))}</span></div>
        <div class="kv"><span class="k">Gracia</span><span class="v" style="font-weight:500">${esc(resumenGrupo("gracia", ef.gracia))}</span></div>
        <div class="kv"><span class="k">Recargo por mora</span><span class="v" style="font-weight:500">${esc(resumenGrupo("recargoMora", ef.recargoMora))}</span></div>
        <div class="kv"><span class="k">Cadencia de avisos</span><span class="v" style="font-weight:500">${ef.cadencia.length} avisos</span></div>
        <div class="kv"><span class="k">Tope de mora del mundo</span><span class="v">${S.politicaMundo.topeRecargoMoraPct}%</span></div>
        <div class="kv"><span class="k">Tope de gracia del mundo</span><span class="v">${S.politicaMundo.topeGraciaDias} días</span></div>
      </div>
      <div class="note n-info" style="margin:0"><span class="msi">info</span>
        <div>Confirmar no cambia ninguna regla: solo declara que se revisaron y habilita la emisión.</div></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button>
          <button class="btn bp" id="okRevision"><span class="msi">check</span>Confirmar revisión</button>`,
    luego: () => {
      document.getElementById("okRevision").onclick = () => {
        const r = confirmarRevisionReglas(m.id);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(`Revisión confirmada. ${m.nombre} puede volver a emitir.`);
        render();
      };
    },
  });
}

function drawerCredenciales(merchantId) {
  const m = comercioPorId(merchantId);
  if (!m) return toast(`forbidden: el comercio ${merchantId} no pertenece a ${S.mundo.nombre}.`, "err");
  const sinFacultad = !S.mundo.facultadDelegada;
  abrirDrawer({
    titulo: "Entrega de credenciales", sub: `${m.nombre} · ${S.mundo.nombre}`, ico: "key", ancho: 620,
    cuerpo: `
      <div class="note ${sinFacultad ? "n-warn" : "n-info"}"><span class="msi">${sinFacultad ? "gpp_maybe" : "badge"}</span>
        <div>${sinFacultad
          ? `<b>Las credenciales las entrega Red Pontis.</b> ${esc(motivoFacultad())} El formulario queda en consulta.`
          : `Con la facultad delegada, <b>${esc(S.mundo.nombre)} entrega el acceso</b>: se crea o localiza el usuario
             en Cognito, se lo agrega al grupo del rol elegido y se emite la credencial en
             <span class="mono">portal_credential</span> con <span class="mono">scope_type COLLECTIONS_MERCHANT</span>.`}</div></div>
      ${S.simulado.idpCaido ? `<div class="note n-err"><span class="msi">cloud_off</span>
        <div><b>Simulador activo: proveedor de identidad caído.</b> La emisión va a responder
        <span class="mono">identity_provider_unavailable</span> y la entrega va a quedar en estado de error,
        reintentable. Apagalo desde la pestaña Comercios.</div></div>` : ""}

      <div class="sech"><div><h3 style="font-size:13px">Credenciales de este comercio</h3>
        <p>El secreto se ve una sola vez, al emitirlo. Después queda enmascarado</p></div></div>
      ${m.credenciales.length === 0
        ? `<p class="hint" style="margin-bottom:18px">Todavía no se entregó ninguna credencial a ${esc(m.nombre)}.</p>`
        : `<div class="tablewrap" style="margin-bottom:18px"><div class="tablescroll"><table>
            <thead><tr><th>Correo</th><th>Rol</th><th>Secreto</th><th>Estado</th><th>Entregada</th><th></th></tr></thead>
            <tbody>${m.credenciales.map((c) => `<tr>
              <td style="font-size:12px"><b>${esc(c.correo)}</b>
                <div class="mono" style="font-size:10px;color:var(--outline)">${esc(c.scopeType)}</div></td>
              <td class="mono" style="font-size:10px">${esc(c.rol)}</td>
              <td class="mono" style="font-size:11px">${c.secreto ? esc(secretoVisible(c)) : "—"}</td>
              <td><span class="badge ${ESTADOS_CREDENCIAL[c.estado].cls}">${ESTADOS_CREDENCIAL[c.estado].label}</span>
                ${c.motivo ? `<div class="mono" style="font-size:9px;color:var(--error);margin-top:3px">${esc(c.motivo)}</div>` : ""}</td>
              <td style="font-size:11px">${c.entregadaEl ? fecha(c.entregadaEl) : "—"}
                <div style="font-size:10px;color:var(--osv)">${esc(c.por || "")}</div></td>
              <td>${c.estado === "ERROR"
                ? `<button class="mini" data-reintentar="${esc(c.correo)}|${esc(c.rol)}"><span class="msi">refresh</span>Reintentar</button>`
                : ""}</td></tr>`).join("")}</tbody></table></div></div>`}

      <div class="sech"><div><h3 style="font-size:13px">Entregar un acceso</h3>
        <p>Correo del titular y rol del grupo de Cognito</p></div></div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div><label class="fl">Correo del titular</label>
          <input id="crCorreo" placeholder="operaciones@comercio.pe"${sinFacultad ? " disabled" : ""}>
          <p class="hint">Si el correo no tiene formato válido, responde <span class="mono">invalid_email</span> y no se crea nada.</p></div>
        <div><label class="fl">Rol</label>
          <select id="crRol"${sinFacultad ? " disabled" : ""}>
            ${Object.entries(ROLES_ENTREGA).map(([k, l]) => `<option value="${k}">${esc(l)} · ${k}</option>`).join("")}</select>
          <p class="hint">${esc(ROLES["collections-operator"].puede)}</p></div>
      </div>`,
    pie: `<button class="btn bo" data-cerrar>Cerrar</button>
          <button class="btn bp" id="okCred"${sinFacultad ? ` disabled title="${esc(motivoFacultad())}"` : ""}>
            <span class="msi">key</span>Emitir credencial</button>`,
    luego: () => {
      document.querySelectorAll("[data-reintentar]").forEach((b) => b.onclick = () => {
        const [correo, rol] = String(b.dataset.reintentar).split("|");
        entregarCredencial(m, correo, rol, false);
      });
      const ok = document.getElementById("okCred");
      ok.onclick = () => entregarCredencial(m,
        String(document.getElementById("crCorreo").value || ""),
        document.getElementById("crRol").value, false);
    },
  });
}

function entregarCredencial(m, correo, rol, confirmarReemision) {
  const r = emitirCredencial({ merchantId: m.id, correo, rol, confirmarReemision });
  if (r.ok) {
    cerrarDrawer();
    drawerCredencialEmitida(m, r.credencial, r.secreto, r.reemision);
    render();
    return r;
  }
  if (r.codigo === "credential_reissue_requires_confirmation") {
    drawerConfirmarReemision(m, correo, rol, r.previa);
    return r;
  }
  if (r.codigo === "identity_provider_unavailable") {
    toast(`${r.codigo}: ${r.mensaje}`, "err");
    render();
    drawerCredenciales(m.id);
    return r;
  }
  toast(`${r.codigo}: ${r.mensaje}`, "err");
  return r;
}

function drawerCredencialEmitida(m, cred, secreto, reemision) {
  abrirDrawer({
    titulo: reemision ? "Credencial reemitida" : "Credencial entregada", sub: `${m.nombre} · ${cred.correo}`,
    ico: "vpn_key", ancho: 560,
    cuerpo: `
      <div class="note n-ok"><span class="msi">task_alt</span>
        <div>Usuario creado o localizado en Cognito, agregado al grupo <span class="mono">${esc(cred.rol)}</span>
        y credencial emitida en <span class="mono">portal_credential</span>.
        ${reemision ? "La credencial anterior quedó <b>invalidada</b>." : ""}</div></div>
      <div class="sech"><div><h3 style="font-size:13px">Secreto de acceso</h3>
        <p>Se muestra una sola vez. Después queda enmascarado para siempre</p></div></div>
      <div class="copybox" style="margin-bottom:8px"><span style="flex:1">${esc(secreto)}</span>
        <button class="mini" id="cpSec"><span class="msi">content_copy</span>Copiar</button></div>
      <div class="note n-warn"><span class="msi">visibility_off</span>
        <div>Copialo ahora y entregalo por un canal seguro. En la lista de credenciales va a aparecer como
        <span class="mono">${esc(mascaraSecreto(secreto))}</span>. Si se pierde, hay que reemitir, y eso
        invalida esta credencial.</div></div>
      <div class="kv"><span class="k">Correo</span><span class="v">${esc(cred.correo)}</span></div>
      <div class="kv"><span class="k">Rol</span><span class="v mono" style="font-size:11px">${esc(cred.rol)}</span></div>
      <div class="kv"><span class="k">Alcance</span><span class="v mono" style="font-size:11px">${esc(cred.scopeType)}</span></div>
      <div class="kv"><span class="k">Ruta del panel</span>
        <span class="v mono" style="font-size:11px">/joi360app/cobranzas/comercio/${esc(m.slug)}</span></div>
      <div class="kv"><span class="k">Entregada</span><span class="v">${fecha(cred.entregadaEl)} · ${esc(cred.por)}</span></div>`,
    pie: `<button class="btn bp" data-cerrar>Listo, lo copié</button>`,
    luego: () => {
      document.getElementById("cpSec").onclick = () => {
        navigator.clipboard?.writeText(secreto);
        toast("Secreto copiado.", "info");
      };
    },
  });
}

function drawerConfirmarReemision(m, correo, rol, previa) {
  abrirDrawer({
    titulo: "Reemitir la credencial", sub: `${m.nombre} · ${correo}`, ico: "autorenew", ancho: 560,
    cuerpo: `
      <div class="note n-warn"><span class="msi">warning</span>
        <div><b class="mono">credential_reissue_requires_confirmation</b> — ${esc(correo)} ya tiene una credencial
        entregada el ${fecha(previa.entregadaEl)}. Reemitir <b>invalida la anterior</b>: quien la esté usando
        pierde el acceso en el momento.</div></div>
      <div class="kv"><span class="k">Credencial vigente</span><span class="v mono" style="font-size:11px">${esc(secretoVisible(previa))}</span></div>
      <div class="kv"><span class="k">Entregada</span><span class="v">${fecha(previa.entregadaEl)} · ${esc(previa.por)}</span></div>
      <div class="kv"><span class="k">Rol actual</span><span class="v mono" style="font-size:11px">${esc(previa.rol)}</span></div>
      <div class="kv"><span class="k">Rol nuevo</span><span class="v mono" style="font-size:11px">${esc(rol)}</span></div>
      <div class="note n-info" style="margin-top:14px"><span class="msi">history</span>
        <div>La reemisión queda en bitácora con fecha, actor, correo y rol.</div></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar</button>
          <button class="btn bp" id="okReemitir"><span class="msi">autorenew</span>Reemitir e invalidar la anterior</button>`,
    luego: () => {
      document.getElementById("okReemitir").onclick = () => entregarCredencial(m, correo, rol, true);
    },
  });
}

function drawerCarteraComercio(merchantId) {
  const m = comercioPorId(merchantId);
  if (!m) return toast(`forbidden: el comercio ${merchantId} no pertenece a ${S.mundo.nombre}.`, "err");
  const ag = agregadoComercio(m);
  const vis = visibilidadCartera(m);
  const filas = vis.nivel === "NOMINAL" ? filasCartera(m) : [];
  const maxTramo = Math.max(1, ...ag.porTramo.map((t) => t.monto));
  abrirDrawer({
    titulo: `Cartera de ${m.nombre}`, sub: `${m.rubro} · visto desde ${S.mundo.nombre}`, ico: "receipt_long", ancho: 720,
    cuerpo: `
      <div class="note n-ok"><span class="msi">visibility</span>
        <div>El mundo ve <b>siempre el agregado</b> de la cartera de su comercio: cuántos suscriptores, cuánto
        hay por cobrar, la mora por tramo y lo cobrado del período. Nunca nombres sin autorización.</div></div>

      <div class="kpis" style="grid-template-columns:1fr 1fr">
        ${kpi("groups", "#1A3270", "#EEF2FD", ag.suscriptores, "Suscriptores", `${ag.activos} activos · ${ag.deudores} deudores`)}
        ${kpi("hourglass_top", "#C8202F", "#FCECEE", money0(ag.porCobrar), "Por cobrar", `mora ${money0(ag.mora)}`)}
        ${kpi("payments", "#097A54", "#E7F5EF", money0(ag.cobradoPeriodo), "Cobrado del período", periodoHoy())}
        ${kpi("storefront", "#6B4FA3", "#F1ECF9", ESTADOS_CAPACIDAD[m.capacidad.estado].label, "Capacidad",
          m.capacidad.habilitadoEl ? "desde " + fecha(m.capacidad.habilitadoEl) : "sin habilitar")}
      </div>

      <div class="sech"><div><h3 style="font-size:13px">Mora por tramo</h3>
        <p>Con los tramos de la cartera · ${ag.deudores} ${ag.deudores === 1 ? "deudor" : "deudores"}</p></div></div>
      <div class="bars" style="margin-bottom:20px">
        ${ag.porTramo.map((t) => `<div class="bar">
          <span class="bl">${esc(t.label)}</span>
          <span class="btrack"><span class="bfill" style="width:${(t.monto / maxTramo) * 100}%;background:${t.color}"></span></span>
          <span class="bv">${money(t.monto)}</span></div>`).join("")}
      </div>

      <div class="sech"><div><h3 style="font-size:13px">Detalle nominal</h3>
        <p>Nombre por nombre, solo con autorización del comercio</p></div>
        <span class="badge ${vis.nivel === "NOMINAL" ? "b-partial" : "b-cancelled"}">${vis.nivel === "NOMINAL" ? "autorizado" : "no autorizado"}</span></div>

      ${vis.nivel === "NOMINAL"
        ? `<div class="note n-warn"><span class="msi">privacy_tip</span><div>${esc(vis.mensaje)} ${esc(vis.quehacer)}</div></div>
           <div class="tablewrap"><div class="tablescroll"><table>
             <thead><tr><th>Suscriptor</th><th>Plan</th><th class="num">Deuda</th><th class="num">Mora</th><th>Antigüedad</th></tr></thead>
             <tbody>${filas.map((f) => `<tr>
               <td><div class="strong" style="font-size:12px">${esc(f.nombre)}</div>
                 <div class="mono" style="font-size:10px;color:var(--osv)">${esc(f.documento)}</div></td>
               <td style="font-size:12px">${esc(f.plan)}</td>
               <td class="num" style="${f.deuda > 0 ? "color:var(--error);font-weight:600" : "color:var(--osv)"}">${f.deuda > 0 ? money(f.deuda) : "—"}</td>
               <td class="num" style="color:var(--warning)">${f.mora > 0 ? money(f.mora) : "—"}</td>
               <td>${f.atraso > 0 ? `${f.atraso} días` : `<span style="color:var(--osv)">al día</span>`}</td>
             </tr>`).join("")}</tbody></table></div></div>`
        : `<div class="tablewrap"><div class="empty">
             <span class="msi">visibility_off</span>
             <h4>Sin nombres: el agregado es todo lo que podés ver</h4>
             <p>${esc(vis.mensaje)}</p>
             <p style="margin-top:-8px"><b>Qué haría falta:</b> ${esc(vis.quehacer)}</p>
             <div class="chips" style="justify-content:center">
               <span class="pill warn"><span class="dot"></span>${esc(vis.motivo)}</span></div>
           </div></div>`}

      ${ag.suscriptores === 0 ? `<div class="note n-info" style="margin-top:16px"><span class="msi">pending_actions</span>
        <div>${esc(m.nombre)} tiene la capacidad habilitada pero <b>todavía no cargó cartera</b>:
        el agregado está en cero porque no hay nada emitido, no porque esté oculto.</div></div>` : ""}`,
    pie: `<button class="btn bo" data-cerrar>Cerrar</button>`,
  });
}

/// ─────────────────────────────────────────────────────────────────────────────────────────────
/// Política del mundo
/// ─────────────────────────────────────────────────────────────────────────────────────────────

function politicaBorrador() {
  if (!S.borradorPolitica) S.borradorPolitica = Object.assign(clonar(S.politicaMundo), { crudo: {} });
  return S.borradorPolitica;
}

function campoPol(id, valor) {
  const b = politicaBorrador();
  if (b.crudo[id] != null) return b.crudo[id];
  return valor == null ? "" : valor;
}

function absorberPolitica() {
  const b = politicaBorrador();
  const leer = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const v = String(el.value == null ? "" : el.value);
    b.crudo[id] = v;
    return v;
  };
  const num = (prop, id, nulable) => {
    const v = leer(id);
    if (v == null) return;
    if (nulable && v.trim() === "") { b[prop] = null; return; }
    b[prop] = v.trim() === "" ? NaN : Number(v);
  };
  num("topeMontoCargo", "polTopeCargo", true);
  num("topeMontoLote", "polTopeLote", true);
  num("topeRecargoMoraPct", "polTopeMora");
  num("topeGraciaDias", "polTopeGracia");
  num("topeRecordatoriosDia", "polTopeRecordatorios");
  num("comisionMundoPct", "polComision");
  return b;
}

function vPolitica() {
  const b = politicaBorrador();
  const editable = puedeAdministrarMundo();
  const ms = comerciosDelMundo();
  const alcanzados = ms.filter((m) => m.capacidad.estado === "ENABLED");
  const inputPol = (id, valor, min, max, paso) => `<input type="number" id="${id}" data-w="world"
    min="${min}" max="${max}"${paso ? ` step="${paso}"` : ""} value="${esc(campoPol(id, valor))}"${editable ? "" : " disabled"}>`;

  return `
  <div class="note n-warn"><span class="msi">ac_unit</span>
    <div>La política <b>aplica a lo que se cree después</b>, igual que las reglas. Los cargos ya emitidos y las
    habilitaciones ya hechas conservan el snapshot con el que nacieron: cambiarla no reescribe nada hacia atrás.</div></div>

  <div class="sech">
    <div><h3>Política de ${esc(S.mundo.nombre)} sobre la cobranza de sus comercios</h3>
      <p>Alcanza a los ${alcanzados.length} comercios con la capacidad habilitada. No toca la cartera propia del mundo</p></div>
    ${editable ? `<span class="pill"><span class="dot"></span>Escritura habilitada</span>`
      : `<span class="pill warn"><span class="dot"></span>Solo consulta con tu rol</span>`}
  </div>

  ${S.erroresPolitica.length ? `<div class="note n-err"><span class="msi">error</span>
    <div><b>No se escribió nada.</b> Lo que escribiste quedó en pantalla para que lo corrijas.
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
        ${S.erroresPolitica.map((e) => `<div>
          <span class="mono" style="font-weight:700">${e.codigo}</span>
          <span class="mono" style="font-size:10px">[${esc(e.campos.join(", "))}]</span>
          <div>${esc(e.mensaje)}</div></div>`).join("")}
      </div></div></div>` : ""}

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="msi" style="color:var(--primary)">credit_card</span>
        <div><h3 style="font-size:13px">Medios de pago habilitados</h3>
          <p>El comercio solo puede ofrecer los que el mundo habilita. Lo que ofrezca de más queda recortado</p></div></div>
    </div>
    <div class="chips">
      ${Object.entries(MEDIOS_PAGO).map(([k, l]) => `<button class="chip ${b.mediosPago.includes(k) ? "on" : ""}"
        data-w="world" data-medio="${k}">${esc(l)}</button>`).join("")}
    </div>
    <p class="hint">Lo que ofrece el comercio hoy: ${S.mediosComercio.map((x) => esc(MEDIOS_PAGO[x])).join(", ")}.
      Con esta política le quedan ${S.mediosComercio.filter((x) => b.mediosPago.includes(x)).length} de ${S.mediosComercio.length}.</p>
  </div>

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="msi" style="color:var(--primary)">price_check</span>
        <div><h3 style="font-size:13px">Topes de monto</h3>
          <p>Dejalos vacíos para no poner límite</p></div></div>
    </div>
    <div class="grid2">
      <div><label class="fl">Monto máximo por cargo (${MONEDA})</label>
        ${inputPol("polTopeCargo", b.topeMontoCargo, 0, 1000000, "0.5")}
        <p class="hint">Vacío = sin límite. Una fila de carga que lo pase se rechaza con <span class="mono">monto_excede_tope_mundo</span>.</p></div>
      <div><label class="fl">Monto máximo por lote (${MONEDA})</label>
        ${inputPol("polTopeLote", b.topeMontoLote, 0, 10000000, "0.5")}
        <p class="hint">Vacío = sin límite. Un lote que lo pase no se puede confirmar: <span class="mono">policy_limit_exceeded</span>.</p></div>
    </div>
  </div>

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="msi" style="color:var(--primary)">percent</span>
        <div><h3 style="font-size:13px">Topes de la regla del comercio</h3>
          <p>Si el comercio guarda una regla que los pasa, se rechaza con <span class="mono">policy_limit_exceeded</span></p></div></div>
    </div>
    <div class="grid3">
      <div><label class="fl">Recargo por mora máximo (%)</label>
        ${inputPol("polTopeMora", b.topeRecargoMoraPct, 0, 100, "0.5")}
        <p class="hint">Sobre el monto del cargo. Un recargo fijo se compara convertido a porcentaje.</p></div>
      <div><label class="fl">Días de gracia máximos</label>
        ${inputPol("polTopeGracia", b.topeGraciaDias, 0, 60)}
        <p class="hint">Entre 0 y 60.</p></div>
      <div><label class="fl">Recordatorios manuales por día</label>
        ${inputPol("polTopeRecordatorios", b.topeRecordatoriosDia, 1, 10)}
        <p class="hint">Por suscriptor. Tapa el tope propio de la cartera del comercio.</p></div>
    </div>
  </div>

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="msi" style="color:var(--primary)">account_balance</span>
        <div><h3 style="font-size:13px">Comisión del mundo</h3>
          <p>Se informa en cada cargo emitido. En fase 1 <b>no genera movimiento de dinero</b></p></div></div>
    </div>
    <div class="grid2">
      <div><label class="fl">Comisión sobre el cobro (%)</label>
        ${inputPol("polComision", b.comisionMundoPct, 0, 30, "0.1")}
        <p class="hint">Entre 0 y 30.</p></div>
      <div><div class="note n-info" style="margin:0"><span class="msi">info</span>
        <div>El comercio la ve en cada cargo y queda registrada como <b>monto informado</b>. No se descuenta del
        cobro, no se liquida y no arma asiento: eso llega cuando exista la liquidación entre mundo y comercio.</div></div></div>
    </div>
  </div>

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="msi" style="color:var(--primary)">mail</span>
        <div><h3 style="font-size:13px">Plantillas de aviso</h3>
          <p>Una plantilla obligatoria no se puede desactivar desde el comercio. Solo son editables los campos que marques</p></div></div>
    </div>
    ${b.plantillas.map((t, i) => `<div style="padding:12px 0;border-bottom:1px solid #EDEFF6">
      <div class="rowflex" style="border:0;padding:0">
        <span class="msi" style="color:var(--primary)">${KINDS_AVISO[t.kind] ? KINDS_AVISO[t.kind].ico : "mail"}</span>
        <div class="rf1"><b>${esc(t.nombre)}</b><span class="mono">${t.kind}</span></div>
        <span class="pill">${t.obligatoria ? "obligatoria" : "opcional"}</span>
        <button class="sw ${t.obligatoria ? "on" : ""}" data-w="world" data-plantoblig="${i}"><i></i></button>
      </div>
      <div class="chips" style="margin-top:8px;padding-left:34px">
        <span class="hint" style="margin:0 4px 0 0;align-self:center">Campos editables por el comercio:</span>
        ${Object.entries(CAMPOS_PLANTILLA).map(([c, l]) => `<button class="chip ${t.camposEditables.includes(c) ? "on" : ""}"
          data-w="world" data-plancampo="${i}:${c}">${esc(l)}</button>`).join("")}
      </div>
    </div>`).join("")}
  </div>

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px">
      <div style="display:flex;gap:10px;align-items:flex-start"><span class="msi" style="color:var(--primary)">visibility</span>
        <div><h3 style="font-size:13px">Visibilidad de la cartera del comercio</h3>
          <p>El agregado se ve siempre. El detalle nominal necesita que el comercio lo autorice</p></div></div>
    </div>
    <div class="rowflex">
      <div class="rf1"><b>Pedir detalle nominal a los comercios</b>
        <span>${b.solicitaDetalleNominal
          ? "Cada comercio decide si autoriza. Sin autorización, el mundo ve solo el agregado con el motivo explícito."
          : "Ni siquiera con autorización del comercio se muestran nombres: la política fija solo agregado."}</span></div>
      <button class="sw ${b.solicitaDetalleNominal ? "on" : ""}" data-w="world" data-detallenominal="1"><i></i></button>
    </div>
    <div class="kv" style="margin-top:10px"><span class="k">Autorizaciones vigentes hoy</span>
      <span class="v">${ms.filter((m) => m.autorizacionDetalle && m.autorizacionDetalle.otorgada).length} de ${ms.length} comercios</span></div>
  </div>

  <div class="card" style="padding:18px;margin-bottom:14px">
    <div class="sech" style="margin-bottom:12px"><div><h3 style="font-size:13px">Guardar la política</h3>
      <p>Se muestra el impacto y se pide confirmación antes de escribir</p></div></div>
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button class="btn bo" id="polReset" data-w="world"><span class="msi">undo</span>Descartar cambios</button>
      <button class="btn bp" id="okPolitica" data-w="world"><span class="msi">save</span>Revisar impacto y guardar</button>
    </div>
  </div>

  <div class="sec" style="margin-top:24px">
    <div class="sech"><div><h3>Bitácora del gobierno del mundo</h3>
      <p>Habilitaciones, política, entregas y autorizaciones</p></div></div>
    ${(() => {
      const propias = S.bitacora.filter((x) => ["merchant_module", "world_collection_policy", "delivery", "merchant_data_sharing"].includes(x.entidad));
      return propias.length === 0
        ? `<div class="tablewrap"><div class="empty"><span class="msi">history</span>
            <h4>Sin movimientos de gobierno todavía</h4>
            <p>Habilitá un comercio, entregá credenciales o cambiá la política y vas a verlo acá.</p></div></div>`
        : `<div class="tablewrap"><div class="tablescroll"><table>
            <thead><tr><th>Cuándo</th><th>Entidad</th><th>Acción</th><th>Detalle</th><th>Usuario</th></tr></thead>
            <tbody>${propias.slice(0, 20).map((x) => `<tr>
              <td class="mono" style="font-size:11px">${x.cuando.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              <td class="mono" style="font-size:11px">${x.entidad}</td>
              <td><span class="badge b-pending">${x.accion}</span></td>
              <td style="font-size:11px">${esc(x.detalle)}</td>
              <td style="font-size:11px;color:var(--osv)">${x.quien}</td></tr>`).join("")}</tbody></table></div></div>`;
    })()}
  </div>`;
}

function wPolitica() {
  document.querySelectorAll("[data-medio]").forEach((b) => b.onclick = () => {
    const pol = absorberPolitica();
    const k = b.dataset.medio;
    pol.mediosPago = pol.mediosPago.includes(k) ? pol.mediosPago.filter((x) => x !== k) : pol.mediosPago.concat([k]);
    render();
  });
  document.querySelectorAll("[data-plantoblig]").forEach((b) => b.onclick = () => {
    const pol = absorberPolitica();
    const t = pol.plantillas[Number(b.dataset.plantoblig)];
    if (t) t.obligatoria = !t.obligatoria;
    render();
  });
  document.querySelectorAll("[data-plancampo]").forEach((b) => b.onclick = () => {
    const pol = absorberPolitica();
    const [i, campo] = String(b.dataset.plancampo).split(":");
    const t = pol.plantillas[Number(i)];
    if (t) t.camposEditables = t.camposEditables.includes(campo)
      ? t.camposEditables.filter((x) => x !== campo) : t.camposEditables.concat([campo]);
    render();
  });
  document.querySelectorAll("[data-detallenominal]").forEach((b) => b.onclick = () => {
    const pol = absorberPolitica();
    pol.solicitaDetalleNominal = !pol.solicitaDetalleNominal;
    render();
  });
  document.getElementById("polReset").onclick = () => {
    S.borradorPolitica = null;
    S.erroresPolitica = [];
    toast("Cambios descartados. Volvés a ver la política vigente.", "info");
    render();
  };
  document.getElementById("okPolitica").onclick = revisarPolitica;
}

function revisarPolitica() {
  if (!puedeAdministrarMundo()) return toast(motivoRolMundo(), "err");
  const b = absorberPolitica();
  const limpia = CAMPOS_POLITICA.reduce((a, c) => { a[c.k] = clonar(b[c.k]); return a; }, {});
  const errores = validarPoliticaMundo(limpia);
  if (errores.length) {
    S.erroresPolitica = errores;
    render();
    return toast(`La política no se guardó: ${errores.length} ${errores.length === 1 ? "problema" : "problemas"} por corregir.`, "err");
  }
  S.erroresPolitica = [];
  const cambios = diffPolitica(S.politicaMundo, limpia);
  if (cambios.length === 0) { render(); return toast("No hay nada distinto para guardar.", "info"); }
  drawerImpactoPolitica(limpia, cambios);
}

function drawerImpactoPolitica(nueva, cambios) {
  const ms = comerciosDelMundo();
  const alcanzados = ms.filter((m) => m.capacidad.estado === "ENABLED");
  const pendientes = ms.filter((m) => m.capacidad.estado === "PENDING_ENABLEMENT" || m.capacidad.estado === "DISABLED");
  abrirDrawer({
    titulo: "Confirmar la política del mundo", sub: S.mundo.nombre, ico: "policy", ancho: 620,
    cuerpo: `
      <div class="note n-warn"><span class="msi">group</span>
        <div><b>${alcanzados.length} ${alcanzados.length === 1 ? "comercio queda" : "comercios quedan"} alcanzados</b>
        por la política nueva: ${alcanzados.map((m) => esc(m.nombre)).join(", ") || "ninguno"}.
        ${pendientes.length ? `Otros ${pendientes.length} la van a recibir cuando se los habilite.` : ""}</div></div>

      <div class="kpis" style="grid-template-columns:1fr 1fr">
        ${kpi("storefront", "#1A3270", "#EEF2FD", alcanzados.length, "Comercios alcanzados", "con la capacidad habilitada")}
        ${kpi("event_repeat", "#1F66B8", "#EAF2FC", cambios.length, "Campos que cambian", "aplican a lo que se cree después")}
      </div>

      <div class="note n-ok"><span class="msi">ac_unit</span>
        <div><b>Nada retroactivo.</b> Los cargos ya emitidos conservan la comisión informada y los medios con los
        que nacieron, y las reglas vigentes de cada comercio no se reescriben: el tope nuevo se aplica cuando
        el comercio vuelva a guardar su regla.</div></div>

      <div class="sech"><div><h3 style="font-size:13px">Qué cambia</h3>
        <p>${cambios.length} ${cambios.length === 1 ? "campo" : "campos"} de la política</p></div></div>
      <div class="tablewrap"><div class="tablescroll"><table>
        <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
        <tbody>${cambios.map((c) => `<tr>
          <td class="strong" style="font-size:12px">${esc(c.label)}
            <div class="mono" style="font-size:10px;color:var(--osv)">${esc(c.campo)}</div></td>
          <td style="font-size:11px;color:var(--osv)">${esc(c.antes)}</td>
          <td style="font-size:11px;font-weight:600;color:var(--primary)">${esc(c.despues)}</td></tr>`).join("")}</tbody>
      </table></div></div>

      <div class="kv" style="margin-top:14px"><span class="k">Rige desde</span><span class="v">${fecha(HOY)}</span></div>
      <div class="kv"><span class="k">Actor</span><span class="v mono" style="font-size:11px">${ACTOR}</span></div>`,
    pie: `<button class="btn bo" data-cerrar>Cancelar, no escribir nada</button>
          <button class="btn bp" id="okImpactoPol"><span class="msi">check</span>Confirmar y guardar</button>`,
    luego: () => {
      document.getElementById("okImpactoPol").onclick = () => {
        const r = guardarPoliticaMundo(nueva);
        if (!r.ok) return toast(`${r.codigo}: ${r.mensaje}`, "err");
        cerrarDrawer();
        toast(`Política guardada. Alcanza a ${alcanzados.length} ${alcanzados.length === 1 ? "comercio" : "comercios"} para lo que se cree desde hoy.`);
        render();
      };
    },
  });
}

function abrirDrawer({ titulo, sub, ico, cuerpo, pie, luego, ancho }) {
  document.getElementById("drawer").innerHTML = `<div class="ov"><div class="bg" data-cerrar></div>
    <aside class="dw" ${ancho ? `style="width:${ancho}px"` : ""}>
      <div class="dh"><div style="display:flex;gap:12px;align-items:center">
        <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-fixed);color:var(--primary);display:flex;align-items:center;justify-content:center"><span class="msi">${ico}</span></div>
        <div><h3>${esc(titulo)}</h3><p>${esc(sub)}</p></div></div>
        <button class="x" data-cerrar><span class="msi">close</span></button></div>
      <div class="db">${cuerpo}</div>${pie ? `<div class="df">${pie}</div>` : ""}</aside></div>`;
  document.querySelectorAll("[data-cerrar]").forEach((b) => b.onclick = cerrarDrawer);
  if (luego) luego();
}
function cerrarDrawer() { document.getElementById("drawer").innerHTML = ""; }

function descargar(nombre, contenido) {
  const blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportar(nombre, filas) {
  if (!filas.length) return toast("No hay filas para exportar con los filtros actuales.", "info");
  const cab = Object.keys(filas[0]);
  const cel = (v) => { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cab.join(","), ...filas.map((f) => cab.map((c) => cel(f[c])).join(","))].join("\n");
  descargar(`${nombre}-${iso(HOY)}.csv`, csv);
  toast(`${filas.length} filas exportadas.`, "info");
}

seed();
pintarLogin();
document.getElementById("btnSalir").onclick = salir;
document.getElementById("btnExport").onclick = () => {
  const mapa = { suscriptores: "expSus", cobros: "expCob", morosidad: "expMor", comercios: "expComercios" };
  const b = document.getElementById(mapa[S.tab]);
  if (b) return b.click();
  exportar("cartera", S.suscriptores.map((s) => ({
    documento: s.documento, nombre: s.nombre, correo: s.correo, telefono: s.telefono,
    plan: plan(s.planId).nombre, monto: s.monto, proximo_cobro: proximoCobro(s),
    deuda: deudaDe(s.id), mora: moraDe(s.id), antiguedad_dias: atrasoMax(s.id),
  })));
};
