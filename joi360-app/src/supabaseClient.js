// ============================================================
// Cliente Supabase (REST/PostgREST) para joi360-app
// Sin SDK — fetch plano contra la API REST con la anon key.
// Reemplaza el mock local por la fuente única de verdad compartida
// con joi360-admin.
// ============================================================

import { CANALES_ADQUIRENCIA } from "./store.js";

// Antes hardcodeado (funcionaba igual — la anon key es pública por diseño,
// no un secreto), pero sin variables de entorno el dashboard de Vercel no
// mostraba la integración con Supabase como conectada. El fallback queda
// para que un clone local siga corriendo sin pedir un .env primero.
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://kobtxrhycaloyjkeyspv.supabase.co";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYnR4cmh5Y2Fsb3lqa2V5c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzAwMjksImV4cCI6MjA5NzkwNjAyOX0.MlyyXGnsyMeVXaRfRbmFqwVhsh4FUFNztQoBaECd_i0";

const baseHeaders = {
  apikey: ANON_KEY,
  "Content-Type": "application/json",
};

// ── Sesión real de Supabase Auth ──────────────────────────────────────────
// Hasta aquí toda request salía con la anon key en Authorization, incluso ya
// logueado — auth.uid() quedaba null del lado del servidor pase lo que pase,
// que es justo lo que mover_saldo_wallet/transferir_p2p_wallet necesitan para
// confirmar que quien pide mover el saldo es el dueño de esa wallet. Sin
// mandar el JWT real no hay nada que verificar del lado de Postgres.
const SESSION_KEY = "joi360_session";
export function setSession(accessToken, expiresIn, refreshToken) {
  if (!accessToken) return;
  const expiresAt = Date.now() + (Number(expiresIn) || 3600) * 1000;
  // El refresh_token es de un solo uso pero se preserva entre llamadas si esta
  // en particular no trajo uno nuevo (no debería pasar, pero no hay razón de
  // tirar el que ya teníamos guardado).
  let anterior = null;
  try { anterior = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { /* noop */ }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, expiresAt, refreshToken: refreshToken || anterior?.refreshToken || null }));
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Bug real (05/08-ago): Supabase entrega un refresh_token en cada login, pero
// nunca se guardaba ni se usaba — el access_token vencía a la hora
// (expires_in por defecto de Supabase) y ahí se quedaba: cualquier operación
// que mueve saldo (recargar, pagar, P2P, checkout de menú/marketplace, BNPL)
// le devolvía NO_AUTENTICADO al RPC de wallet, y el mensaje que veía la
// usuaria encima no tenía nada que ver con lo que pasó de verdad. Con el
// refresh_token guardado, un token vencido se renueva solo antes de mandar
// la siguiente request — la sesión dura hasta que el refresh_token mismo
// expire (semanas), no una hora.
let _refrescando = null;
async function refrescarSesion(refreshToken) {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    if (!r.access_token) return null;
    setSession(r.access_token, r.expires_in, r.refresh_token);
    return r.access_token;
  } catch { return null; }
}
async function sessionToken() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  if (!s?.accessToken) return null;
  if (Date.now() < s.expiresAt - 30_000) return s.accessToken; // 30s de margen
  // Vencido o por vencer — un solo refresh en vuelo aunque varias llamadas lo
  // disparen al mismo tiempo, para no quemar el refresh_token dos veces.
  if (!_refrescando) _refrescando = refrescarSesion(s.refreshToken).finally(() => { _refrescando = null; });
  return await _refrescando;
}

async function rest(path, opts = {}) {
  const authToken = (await sessionToken()) || ANON_KEY;
  const headers = { ...baseHeaders, Authorization: `Bearer ${authToken}` };
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`Supabase ${path} → HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Motivos que la RPC de wallet devuelve cuando el JWT no prueba dueño de la
// billetera — sesión vencida (por eso no llevaba token) o simplemente no es
// suya. En ambos casos la única salida real es volver a iniciar sesión, no
// reintentar la misma llamada.
const MOTIVOS_SESION_INVALIDA = new Set(["NO_AUTENTICADO", "NO_AUTORIZADO"]);
function exigirAutorizacionWallet(r) {
  if (r?.ok === false && MOTIVOS_SESION_INVALIDA.has(r.motivo)) {
    clearSession();
    const e = new Error("Tu sesión expiró. Vuelve a iniciar sesión para continuar.");
    e.codigo = "sesion_invalida";
    throw e;
  }
  return r;
}

// ── Identidad del usuario ─────────────────────────────────────────────────
// Con cuentas reales este id es el uuid de Supabase Auth. Se guarda en la
// misma llave que usaba la identidad sintética para que todo lo que ya cuelga
// de ella —wallet, dependientes, entradas, actividad— quede asociado a una
// persona verificada sin tocar una sola consulta.
const SYNTH_KEY = "joi360_synthetic_user_id";
export function setUserId(id) {
  if (id) localStorage.setItem(SYNTH_KEY, id);
}
export function getSyntheticUserId() {
  let id = localStorage.getItem(SYNTH_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SYNTH_KEY, id);
  }
  return id;
}
// Sin esto, un logout + nuevo registro en el mismo dispositivo heredaba la
// identidad (wallet, entradas, actividad) de la cuenta anterior porque
// SYNTH_KEY vivía fuera de joi360_user_v3 y nunca se limpiaba.

// Membresías reales (a qué mundos pertenece esta persona) vía sus wallets —
// "unirse a un mundo" solo vivía en joi360_user_v3.memberships (localStorage),
// nunca en Supabase. Si ese estado local se pierde (caché limpiado, un bug
// de sync, "BORRA DATA" de prueba) la cuenta sigue teniendo wallets reales
// mundo por mundo, pero la app la manda a "Elige tu comunidad" como si fuera
// nueva — la pantalla de Explorar mostraba "no tienes ningún mundo" con una
// cuenta que en Supabase sí pertenece a uno. Se reconstruye desde la fuente
// real en vez de confiar solo en el localStorage.
export async function fetchMembershipsReales(userId) {
  const rows = await rest(`wallets?user_id=eq.${userId}&select=world_id`).catch(() => []);
  return [...new Set((rows || []).map(r => r.world_id))];
}
export function resetSyntheticUserId() {
  localStorage.removeItem(SYNTH_KEY);
  clearSession();
}

// ── Mundos en vivo (Fase 0 — alta en admin → render automático aquí) ─────
export async function fetchWorldsLive() {
  return rest("worlds?select=*&status=eq.activo&order=created_at");
}

// ── Catálogo Global en vivo (capacities) ─────────────────────────────────
// La app renderiza cualquier capacidad publicada por el admin sin conocerla
// de antemano: icono y nombre vienen del catálogo, no del código.
let _capsCache = null;
export async function fetchCapacitiesLive() {
  if (_capsCache) return _capsCache;
  _capsCache = await rest("capacities?status=eq.activo&select=id,name,icon,category,tier");
  return _capsCache;
}

// ── Comercios del mundo (directorio en vivo) ─────────────────────────────
// visible_en_app=eq.true: el admin del Mundo puede ocultar temporalmente un
// comercio ya activado por RedPontis sin desactivarlo (SponsorComercios,
// joi360-admin) — antes ese toggle no tenía ningún efecto real aquí.
export async function fetchMerchantsLive(worldId) {
  return rest(`merchants?world_id=eq.${worldId}&status=eq.activo&visible_en_app=eq.true&select=*&order=created_at`);
}

// Comercios AFILIADOS a un evento específico (antes: la vitrina mostraba
// todos los comercios del mundo, sin afiliación real — ver event_merchants).
export async function fetchEventMerchantsLive(eventId) {
  return rest(`event_merchants?event_id=eq.${eventId}&select=*&order=created_at`);
}

// Cronograma real por evento (Gantt #66/#78) — antes EventoAgendaSection
// renderizaba 3 items hardcodeados idénticos para todo evento.
export async function fetchAgendaEventoLive(eventId) {
  return rest(`event_agenda_items?event_id=eq.${eventId}&select=*&order=orden,hora`);
}

// Promociones — cupón QR (Gantt #38-#41, Backlog Capítulo 2). Antes
// PromocionesTemplate leía de un array 100% mock local; ahora trae las
// promociones reales del mundo + las globales de RedPontis (mundo-promos-rp).
export async function fetchPromocionesLive(worldId) {
  const [propias, globales] = await Promise.all([
    rest(`promociones?world_id=eq.${worldId}&select=*&order=created_at.desc`),
    worldId === "mundo-promos-rp" ? Promise.resolve([]) : rest(`promociones?world_id=eq.mundo-promos-rp&select=*&order=created_at.desc`),
  ]);
  return [...(propias || []), ...(globales || [])];
}

// ── Creación B2C de eventos (antes: el wizard solo simulaba con setTimeout,
// nunca llegaba a Supabase ni a la cola de aprobación real) ─────────────
export async function crearEventoB2CRemote(worldId, datos) {
  const eventId = `ev-b2c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  await rest("events?on_conflict=id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{
      id: eventId, world_id: worldId,
      organizador: datos.entidad?.nombre || null,
      titulo: datos.titulo, descripcion: datos.descripcion || null,
      tipo: "kermesse", categoria: datos.categoria || "General",
      fecha: datos.fecha || null, hora: datos.hora || null, lugar: datos.lugar || null,
      aforo_total: +datos.aforo || 0, aforo_tipo: "general", privado: false,
      estado: "PENDIENTE_APROBACION", moneda: "PEN",
      modo: "b2c", organizador_id: null,
      // Antes esto siempre quedaba null — sin este dato es estructuralmente
      // imposible construir "mis eventos" (no hay por dónde filtrar "los que
      // yo publiqué"). getSyntheticUserId() es el mismo id que ya identifica
      // al usuario en todo lo demás del módulo Eventos (tickets, Activity...).
      creado_por_user_id: getSyntheticUserId(),
      ux_components: ["hero", "entradas", "agenda", "marketplace"],
    }]),
  });
  await rest("event_ticket_types", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      event_id: eventId, nombre: "General", precio: datos.gratis ? 0 : (+datos.precio || 0),
      cupos: +datos.aforo || 100, min_por_compra: 1, max_por_compra: 4, validacion: "QR",
    }),
  });
  return eventId;
}

// ── Motor de Eventos (Caso 3 — Kermesse) ─────────────────────────────────
// Rules Engine: evento privado → oculto del marketplace (se filtra aquí).
export async function fetchEventosLive(worldId) {
  return rest(`events?world_id=eq.${worldId}&estado=eq.PUBLICADO&privado=eq.false&select=*&order=fecha`);
}
// "Mis eventos" — los que YO publiqué como usuario B2C, en cualquier estado
// (incluye PENDIENTE_APROBACION/RECHAZADO, no solo los ya publicados: el
// creador necesita ver el estado real de su propio evento).
export async function fetchMisEventosCreados(worldId) {
  const userId = getSyntheticUserId();
  return rest(`events?world_id=eq.${worldId}&creado_por_user_id=eq.${userId}&select=*&order=created_at.desc`);
}
export async function fetchTicketTypesLive(eventId) {
  return rest(`event_ticket_types?event_id=eq.${eventId}&select=*&order=precio`);
}
// Vendidas agregadas por evento en un mundo (una sola query para el marketplace)
export async function fetchVendidasPorEvento(worldId) {
  const rows = await rest(`event_tickets?world_id=eq.${worldId}&estado=neq.anulado&select=event_id`);
  const out = {};
  for (const r of rows || []) out[r.event_id] = (out[r.event_id] || 0) + 1;
  return out;
}

// Vendidas por evento (para regla de aforo y contadores de cupos)
export async function fetchVendidasPorTipo(eventId) {
  const rows = await rest(`event_tickets?event_id=eq.${eventId}&estado=neq.anulado&select=ticket_type_id`);
  const out = {};
  for (const r of rows || []) out[r.ticket_type_id] = (out[r.ticket_type_id] || 0) + 1;
  out.__total = (rows || []).length;
  return out;
}

// Compra de entradas: valida aforo/cupos, debita wallet, emite tickets con QR.
// Rules Engine: aforo lleno → bloquear venta (doc §5.2).
export async function comprarTicketsLive(userId, worldId, evento, tipo, cantidad) {
  const vendidas = await fetchVendidasPorTipo(evento.id);
  if (evento.aforo_total > 0 && vendidas.__total + cantidad > evento.aforo_total) {
    return { ok: false, motivo: "aforo" };
  }
  if ((vendidas[tipo.id] || 0) + cantidad > tipo.cupos) {
    return { ok: false, motivo: "cupos" };
  }
  const total = (+tipo.precio) * cantidad;
  if (total > 0) {
    const pago = await pagarSupabase(userId, worldId, total, `Entradas · ${evento.titulo}`);
    if (!pago.ok) return { ok: false, motivo: "saldo", balance: pago.balance };
  }
  const tickets = Array.from({ length: cantidad }, (_, i) => ({
    event_id: evento.id, ticket_type_id: tipo.id, world_id: worldId, user_id: userId,
    qr_code: `JOI-${evento.id}-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase(),
    precio: +tipo.precio, estado: "emitido",
  }));
  const rows = await rest("event_tickets", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(tickets),
  });
  return { ok: true, tickets: rows };
}

export async function fetchMisEntradasLive(userId, worldId) {
  return rest(`event_tickets?user_id=eq.${userId}&world_id=eq.${worldId}&select=*,events(titulo,fecha,hora,lugar),event_ticket_types(nombre,precio)&order=created_at.desc`);
}

// Transferir entrada (Gantt #80): solo entradas "emitido" (aún no usadas) se
// pueden transferir — mismo patrón de código libre que transferirP2PRemote.
export async function transferirEntradaRemote(ticketId, fromUserId, toCode) {
  const codigo = (toCode || "").trim();
  if (!codigo) return { ok: false, motivo: "codigo_vacio" };
  if (codigo === fromUserId) return { ok: false, motivo: "mismo_usuario" };
  const rows = await rest(`event_tickets?id=eq.${ticketId}&user_id=eq.${fromUserId}&select=id,estado`);
  const ticket = rows?.[0];
  if (!ticket) return { ok: false, motivo: "no_encontrada" };
  if (ticket.estado !== "emitido") return { ok: false, motivo: "no_transferible" };
  await rest(`event_tickets?id=eq.${ticketId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: codigo }),
  });
  return { ok: true };
}

// Transferir entrada por enlace/invitación (Gantt #65): antes solo existía el
// código JOI tecleado a mano — el emisor debía conocer de antemano el código
// exacto del destinatario. Con esto genera un token de un solo uso y comparte
// un enlace (WhatsApp/copiar); quien lo abre reclama la entrada sin código.
export async function crearEnlaceTransferenciaEntrada(ticketId, fromUserId) {
  const rows = await rest(`event_tickets?id=eq.${ticketId}&user_id=eq.${fromUserId}&select=id,estado`);
  const ticket = rows?.[0];
  if (!ticket) return { ok: false, motivo: "no_encontrada" };
  if (ticket.estado !== "emitido") return { ok: false, motivo: "no_transferible" };
  const token = crypto.randomUUID();
  await rest(`event_tickets?id=eq.${ticketId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ transfer_token: token, transfer_created_at: new Date().toISOString() }),
  });
  return { ok: true, token };
}
export async function fetchEntradaPorToken(token) {
  const rows = await rest(`event_tickets?transfer_token=eq.${token}&select=id,estado,user_id,events(titulo,fecha,hora,lugar),event_ticket_types(nombre,precio)`);
  return rows?.[0] || null;
}
export async function reclamarEntradaPorToken(token, toUserId) {
  const ticket = await fetchEntradaPorToken(token);
  if (!ticket) return { ok: false, motivo: "enlace_invalido" };
  if (ticket.estado !== "emitido") return { ok: false, motivo: "no_transferible" };
  if (ticket.user_id === toUserId) return { ok: false, motivo: "mismo_usuario" };
  await rest(`event_tickets?id=eq.${ticket.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: toUserId, transfer_token: null }),
  });
  return { ok: true };
}

// ── BNPL (Caso 1 — Mok / Hiraoka) ────────────────────────────────────────
export async function fetchProgramasBNPLLive(worldId) {
  return rest(`bnpl_programa_comercio?world_id=eq.${worldId}&activo=eq.true&select=*`);
}
// Campañas temporales de Productos Financiables (Gantt #61) — amplían la
// elegibilidad BNPL de un comercio mientras están vigentes por fecha.
export async function fetchCampanasBNPLMundo(worldId) {
  return rest(`bnpl_campanas?world_id=eq.${worldId}&select=*`);
}
export async function crearContratoBNPLLive(contrato) {
  const rows = await rest("bnpl_contratos", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(contrato),
  });
  return rows?.[0] || null;
}
export async function fetchMisContratosBNPL(userId, worldId) {
  return rest(`bnpl_contratos?user_id=eq.${userId}&world_id=eq.${worldId}&select=*&order=created_at.desc`);
}
export async function updateContratoBNPL(id, patch) {
  await rest(`bnpl_contratos?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}
export async function crearNotificacionBNPL(worldId, merchantId, contratoId, mensaje, tipo = "suspension") {
  await rest("bnpl_notificaciones", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ world_id: worldId, merchant_id: merchantId, contrato_id: contratoId, tipo, mensaje }]),
  });
}
// Portal BNPL — Historial: "Modificaciones realizadas" reutiliza el mismo
// log de bnpl_notificaciones que ya deja cada acción de ciclo de vida.
export async function fetchModificacionesBNPL(contratoId) {
  return rest(`bnpl_notificaciones?contrato_id=eq.${contratoId}&select=*&order=created_at.desc`);
}

// Portal BNPL — Planes Activos: "Pagar cuota" self-service (doc §BNPL App
// Usuario). A diferencia de registrarPagoManualBNPL (BackOffice, solo marca
// la cuota como pagada), esto es un cargo real a la wallet del usuario.
export async function pagarCuotaBNPLUsuario(userId, contrato, n) {
  const cuota = (contrato.cronograma || []).find(q => q.n === n);
  if (!cuota || cuota.estado === "pagada") return { ok: false, motivo: "cuota_invalida" };
  const wallet = await getOrCreateWallet(userId, contrato.world_id);
  // Bug real #114: el balance se leía y se volvía a escribir con un PATCH
  // directo (ver mover_saldo_wallet() en supabase.js del admin para el
  // detalle completo) — cualquiera con la anon key podía escribirle
  // cualquier número a cualquier billetera. mover_saldo_wallet es una
  // función de Postgres que hace el lock de fila + validación + escritura +
  // transacción en un solo paso atómico.
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: -Math.abs(+cuota.monto), p_tipo: "bnpl_cuota",
      p_world_id: contrato.world_id, p_merchant_id: contrato.merchant_id,
      p_reference: (`Cuota ${n}/${contrato.cuotas} · ${contrato.producto}`.slice(0, 90) + ` · ${Date.now()}`),
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  if (!r?.ok) return { ok: false, motivo: r?.motivo === "SALDO_INSUFICIENTE" ? "saldo" : "sin_wallet", balance: r?.nuevo_saldo != null ? +r.nuevo_saldo : +wallet.balance };
  const nuevoSaldo = +r.nuevo_saldo;
  const cronograma = contrato.cronograma.map(q => (q.n === n ? { ...q, estado: "pagada" } : q));
  const quedanVencidas = cronograma.some(q => q.estado === "vencida");
  const estado = !quedanVencidas && (contrato.estado === "en_mora" || contrato.estado === "suspendido") ? "firmado" : contrato.estado;
  await updateContratoBNPL(contrato.id, { cronograma, estado });
  await crearNotificacionBNPL(contrato.world_id, contrato.merchant_id, contrato.id,
    `Cuota ${n} de "${contrato.producto}" pagada por el usuario desde la app.`, "pago_usuario");
  return { ok: true, balance: nuevoSaldo, cronograma, estado };
}

// Ciclo de vida del financiamiento (Gantt #27-#29): una cuota "pendiente" que
// supera fecha + días de gracia se bloquea ("vencida"); si la política del
// comercio es suspensión sin cargo, el contrato pasa a "suspendido".
export function evaluarCicloContrato(c) {
  // Solicitudes que aún no fueron aprobadas por el comercio no entran al ciclo
  // de pago (Gantt #31) — no tienen cuota 1 cobrada, evaluarlas por fecha de
  // vencimiento las marcaría "vencida"/"suspendido" antes de siquiera existir.
  if (c.estado === "pendiente_aprobacion" || c.estado === "rechazado") return { contrato: c, patch: null, nuevaSuspension: false };
  // Bug real de QA (hallado hoy): toISOString() convierte a UTC antes de
  // formatear — en Lima (UTC-5), esto adelantaba "hoy" en la tarde/noche y
  // podía marcar "vencida" una cuota horas antes de su vencimiento real,
  // suspendiendo el contrato antes de tiempo. Mismo fix que ya se aplicó en
  // el calendario de Menú y el límite diario de Restricciones.
  const hoyDate = new Date();
  const hoy = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, "0")}-${String(hoyDate.getDate()).padStart(2, "0")}`;
  let cronogramaTocado = false;
  const cronograma = (c.cronograma || []).map(q => {
    if (q.estado !== "pendiente") return q;
    const limite = new Date(q.fecha);
    limite.setDate(limite.getDate() + (c.dias_gracia || 0));
    const limiteLocal = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
    if (limiteLocal < hoy) { cronogramaTocado = true; return { ...q, estado: "vencida" }; }
    return q;
  });
  const hayVencida = cronograma.some(q => q.estado === "vencida");
  const estado = (c.estado !== "cerrado" && hayVencida)
    ? ((c.gestion_mora || "sin_cargo_suspension") === "sin_cargo_suspension" ? "suspendido" : "en_mora")
    : c.estado;
  const nuevaSuspension = estado === "suspendido" && c.estado !== "suspendido";
  return { contrato: { ...c, cronograma, estado }, patch: (cronogramaTocado || estado !== c.estado) ? { cronograma, estado } : null, nuevaSuspension };
}

// Corre la evaluación sobre un lote de contratos, persiste los cambios y
// notifica al comercio (tabla bnpl_notificaciones) ante una suspensión nueva.
export async function sincronizarCicloBNPL(contratos) {
  const out = [];
  for (const c of contratos || []) {
    const { contrato, patch, nuevaSuspension } = evaluarCicloContrato(c);
    if (patch) {
      try {
        await updateContratoBNPL(c.id, patch);
        if (nuevaSuspension) {
          await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
            `Contrato de "${c.producto}" suspendido por mora — cuota vencida fuera del período de gracia.`);
        }
      } catch (e) { console.warn("[bnpl-lifecycle] sync", e); }
    }
    out.push(contrato);
  }
  return out;
}

// ── Familiares / dependientes vinculados (Caso 2 Raimondi) ───────────────
// El dependiente tiene su PROPIA wallet (dependent_user_id) — reutiliza toda
// la infra de saldo/transacciones. Antes: array hardcodeado sin persistencia.
export async function fetchMisDependientes(guardianUserId, worldId) {
  return rest(`dependents?guardian_user_id=eq.${guardianUserId}&world_id=eq.${worldId}&select=*&order=created_at`);
}
export async function crearDependienteRemote(worldId, guardianUserId, nombre, dni, alergias, cuotaSuscripcion = 0, alias = null) {
  // wallets.user_id es tipo uuid — el id del dependiente debe ser un UUID puro,
  // igual que getSyntheticUserId(), para poder tener su propia fila en wallets.
  const dependentUserId = crypto.randomUUID();
  const rows = await rest("dependents", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: worldId, guardian_user_id: guardianUserId, dependent_user_id: dependentUserId, nombre, dni: dni || null, alergias: alergias || null, alias: alias || null }),
  });
  // getOrCreateWallet ya resuelve la sucursal dueña de la wallet compartida
  // (si el mundo comparte saldo de grupo) — el dependiente debe caer en la
  // misma fila que el titular, no en una wallet propia de esta sucursal.
  await getOrCreateWallet(dependentUserId, worldId);
  // "Cobro por vinculación de perfil" (configField perfiles_suscripcion): si el
  // mundo lo exige, se cobra al tutor al vincular un dependiente nuevo. Va
  // neto a la recaudación de RedPontis, no al mundo — por eso el tipo es
  // "suscripcion", no "compra": fetchVolumenPeriodoMundo (liquidación) solo
  // suma type=compra, así que esto queda fuera del cálculo de comisión del
  // mundo, y sin merchant_id tampoco lo ve ningún comercio.
  if (cuotaSuscripcion > 0) {
    await pagarSupabase(guardianUserId, worldId, cuotaSuscripcion, `Vinculación de perfil · ${nombre}`, "suscripcion");
  }
  return rows?.[0] || null;
}
export async function fetchDependienteBalance(dependentUserId, worldId) {
  return fetchWalletBalance(dependentUserId, worldId);
}
// No existía forma de eliminar un dependiente ya creado — solo de crearlo y
// editarle el perfil/alergias. Bloquea si todavía tiene saldo real en su
// wallet (ese dinero es del titular, no se puede simplemente desaparecer)
// y, si no, limpia también su bandita vinculada antes de borrar la fila.
export async function verificarBloqueoEliminarDependiente(dependentUserId, worldId) {
  const walletWorldId = await resolverWorldIdWallet(worldId);
  const rows = await rest(`wallets?user_id=eq.${dependentUserId}&world_id=eq.${walletWorldId}&select=balance`).catch(() => []);
  return { balance: rows?.[0]?.balance != null ? +rows[0].balance : 0 };
}
export async function eliminarDependienteRemote(dependentUserId, worldId) {
  const walletWorldId = await resolverWorldIdWallet(worldId);
  await rest(`nfc_bands?linked_user_id=eq.${dependentUserId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ linked_user_id: null, estado: "disponible" }),
  }).catch(() => {});
  // Si la wallet es compartida con otras sucursales del grupo, no se borra —
  // eliminar al dependiente de ESTA sucursal no debe borrarle el saldo real
  // que sigue viviendo (y sigue siendo visible) para el resto del grupo.
  if (walletWorldId === worldId) {
    await rest(`wallets?user_id=eq.${dependentUserId}&world_id=eq.${walletWorldId}`, {
      method: "DELETE", headers: { Prefer: "return=minimal" },
    }).catch(() => {});
  }
  await rest(`dependents?dependent_user_id=eq.${dependentUserId}&world_id=eq.${worldId}`, {
    method: "DELETE", headers: { Prefer: "return=minimal" },
  });
}
// Antes las alergias solo se fijaban una vez, al crear el dependiente — un
// dato médico que sí cambia con el tiempo y quedaba sin forma de corregir.
export async function actualizarDependienteAlergiasRemote(dependentUserId, alergias) {
  return rest(`dependents?dependent_user_id=eq.${dependentUserId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ alergias: alergias || null }),
  });
}
// Editar nombre/DNI de un dependiente ya creado (Task #161) — antes solo se
// fijaban una vez al crearlo, sin forma de corregir un typo o un DNI mal
// tecleado después.
export async function actualizarDependientePerfilRemote(dependentUserId, { nombre, dni, alias }) {
  return rest(`dependents?dependent_user_id=eq.${dependentUserId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ nombre, dni: dni || null, alias: alias || null }),
  });
}

// ── Restricciones granulares por dependiente (Task #173) — reemplaza el
// horario/límite macro que antes fijaba RedPontis para todo el mundo. ──────
export async function fetchRestriccionesDependiente(dependentUserId, worldId) {
  const rows = await rest(`dependent_restrictions?dependent_user_id=eq.${dependentUserId}&world_id=eq.${worldId}&select=*`);
  return rows?.[0] || null;
}
export async function fetchRestriccionesDependientesBulk(dependentUserIds, worldId) {
  if (!dependentUserIds?.length) return [];
  const ids = dependentUserIds.map(id => `"${id}"`).join(",");
  return rest(`dependent_restrictions?world_id=eq.${worldId}&dependent_user_id=in.(${ids})&select=*`);
}
export async function guardarRestriccionesDependiente(worldId, dependentUserId, guardianUserId, datos) {
  await rest("dependent_restrictions?on_conflict=world_id,dependent_user_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ world_id: worldId, dependent_user_id: dependentUserId, guardian_user_id: guardianUserId, updated_at: new Date().toISOString(), ...datos }]),
  });
}

// ── Planes de suscripción del mundo (Task #174) — el mundo puede tener
// varios planes nombrados (mensual/anual) con descuento promocional; si no
// hay ninguno activo, el flujo de vinculación cae al monto fijo legado. ──────
export async function fetchPlanesSuscripcionLive(worldId) {
  return rest(`subscription_plans?world_id=eq.${worldId}&activo=eq.true&select=*&order=precio`);
}

// ── Membresías (20-ago) — planes con marca propia, comercios afiliados y
// cobro recurrente real. Reusa subscription_plans (mismo fetch de arriba,
// select=* ya trae banner_url/logo_url/color_hex/categoria_beneficio/
// beneficio_detalle) pero agrega la parte de "quién está suscrito de
// verdad" (subscription_suscriptores), que el flujo viejo de "cuota al
// vincular dependiente" nunca necesitó.
export async function fetchComerciosDePlanLive(planId) {
  return rest(`subscription_plan_merchants?plan_id=eq.${planId}&select=merchant_id`);
}
export async function fetchMisSuscripcionesMembresia(userId, worldId) {
  return rest(`subscription_suscriptores?world_id=eq.${worldId}&user_id=eq.${userId}&select=*`);
}
// Cobra el primer periodo ahora mismo (mismo mover_saldo_wallet de siempre)
// y crea el registro de suscriptor con la próxima fecha de cobro ya
// calculada — el motor de cobro recurrente (useWalletLive) solo tiene que
// mirar esa fecha desde acá en adelante.
export async function suscribirseAPlanMembresia(userId, worldId, plan) {
  const wallet = await getOrCreateWallet(userId, worldId);
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: -Math.abs(plan.precio), p_tipo: "suscripcion",
      p_world_id: worldId, p_reference: `Suscripción · ${plan.nombre} · ${Date.now()}`,
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  if (!r?.ok) return { ok: false, motivo: r?.motivo === "SALDO_INSUFICIENTE" ? "saldo" : "sin_wallet", balance: r?.nuevo_saldo != null ? +r.nuevo_saldo : +wallet.balance };
  const proxima = new Date();
  if (plan.periodo === "anual") proxima.setFullYear(proxima.getFullYear() + 1); else proxima.setMonth(proxima.getMonth() + 1);
  await rest("subscription_suscriptores?on_conflict=plan_id,user_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      world_id: worldId, plan_id: plan.id, user_id: userId, estado: "activa",
      proxima_fecha_cobro: proxima.toISOString().slice(0, 10), ultimo_cobro_at: new Date().toISOString(),
    }),
  });
  return { ok: true, balance: +r.nuevo_saldo };
}

// Motor de cobro recurrente real (patrón sincronizarCicloBNPL): al cargar la
// wallet, revisa si alguna membresía activa de este usuario en este mundo
// ya venció su próxima_fecha_cobro y la cobra -- sin esto "periodo" era un
// campo decorativo, la cuota nunca se repetía sola. metodo_pago hoy solo
// admite 'saldo_wallet' (lo único real); otros motores (Yape recurrente,
// etc.) quedan reservados para una integración futura, no se simulan acá.
export async function sincronizarCicloSuscripcionesMembresia(userId, worldId) {
  const activas = await rest(`subscription_suscriptores?world_id=eq.${worldId}&user_id=eq.${userId}&estado=eq.activa&select=*,subscription_plans(nombre,precio,periodo)`).catch(() => []);
  const hoy = new Date().toISOString().slice(0, 10);
  for (const s of activas || []) {
    if (s.metodo_pago !== "saldo_wallet" || !s.subscription_plans || s.proxima_fecha_cobro > hoy) continue;
    const plan = s.subscription_plans;
    // Si el saldo no alcanza, r.ok queda false y la fecha no avanza -- se
    // vuelve a intentar sola la próxima vez que la wallet cargue, sin dejar
    // la suscripción en un estado a medias.
    const wallet = await getOrCreateWallet(userId, worldId);
    const r = (await rest("rpc/mover_saldo_wallet", {
      method: "POST",
      body: JSON.stringify({
        p_wallet_id: wallet.id, p_delta: -Math.abs(plan.precio), p_tipo: "suscripcion",
        p_world_id: worldId, p_reference: `Suscripción · ${plan.nombre} · ciclo ${s.proxima_fecha_cobro}`,
      }),
    }).catch(() => null))?.[0];
    if (r?.ok) {
      const proxima = new Date(s.proxima_fecha_cobro);
      if (plan.periodo === "anual") proxima.setFullYear(proxima.getFullYear() + 1); else proxima.setMonth(proxima.getMonth() + 1);
      await rest(`subscription_suscriptores?id=eq.${s.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ proxima_fecha_cobro: proxima.toISOString().slice(0, 10), ultimo_cobro_at: new Date().toISOString() }),
      }).catch(() => {});
    }
  }
}

// ── Menú — strip calendar + reservas por día (Gantt nuevo, genérico) ──────
// Antes MenuTemplate reusaba `products` (vitrina de compras puntuales, sin
// día ni alérgenos). Ahora el calendario lee `menu_programacion` (qué platos
// se ofrecen cada día de la semana) + `menu_items` (con sus alérgenos).
export async function fetchMenuDelDia(worldId, diaSemana) {
  const rows = await rest(`menu_programacion?world_id=eq.${worldId}&dia_semana=eq.${diaSemana}&activo=eq.true&select=*,menu_items(*)`);
  return (rows || [])
    .filter(r => r.menu_items && r.menu_items.activo)
    .map(r => ({ ...r.menu_items, cupos_max: r.cupos_max, programacion_id: r.id }));
}
export async function fetchReservasDeFecha(beneficiarioId, worldId, fecha) {
  return rest(`menu_reservas?world_id=eq.${worldId}&beneficiario_user_id=eq.${beneficiarioId}&fecha=eq.${fecha}&estado=eq.CONFIRMADA&select=*`);
}
export async function fetchMisReservasMenu(beneficiarioIds, worldId) {
  if (!beneficiarioIds.length) return [];
  const ids = beneficiarioIds.map(id => `"${id}"`).join(",");
  return rest(`menu_reservas?world_id=eq.${worldId}&beneficiario_user_id=in.(${ids})&estado=eq.CONFIRMADA&select=*&order=fecha`);
}
export async function crearAlertaConsumo(payload) {
  await rest("consumo_alertas", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
}
export async function fetchAlertasConsumo(guardianUserId, worldId) {
  return rest(`consumo_alertas?guardian_user_id=eq.${guardianUserId}&world_id=eq.${worldId}&leida=eq.false&select=*&order=created_at.desc`);
}
export async function marcarAlertaConsumoLeida(id) {
  await rest(`consumo_alertas?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ leida: true }) });
}
// Reserva real de Menú: cobra al beneficiario Y registra la reserva para esa
// fecha. Si es un dependiente y el Mundo define límite diario
// (control.limiteDiarioPerfil — antes config muerta, nunca leída), valida
// contra lo YA reservado para esa misma fecha antes de cobrar; si excede,
// no cobra y deja una alerta real para el padre/superusuario.
export async function crearReservaMenu({ worldId, merchantId, merchantNombre, beneficiarioId, beneficiarioNombre, fecha, items, esDependiente, guardianUserId, limiteDiario }) {
  const monto = items.reduce((a, it) => a + (+it.precio) * it.cantidad, 0);
  if (esDependiente && limiteDiario != null) {
    const existentes = await fetchReservasDeFecha(beneficiarioId, worldId, fecha);
    const gastadoFecha = (existentes || []).reduce((a, r) => a + (+r.monto || 0), 0);
    if (gastadoFecha + monto > limiteDiario) {
      await crearAlertaConsumo({
        world_id: worldId, guardian_user_id: guardianUserId, dependent_user_id: beneficiarioId, dependent_nombre: beneficiarioNombre,
        tipo: "limite_excedido",
        mensaje: `Se intentó reservar S/ ${monto.toFixed(2)} en Menú para ${beneficiarioNombre} el ${fecha}, pero supera el límite diario de S/ ${limiteDiario.toFixed(2)} (ya reservado ese día: S/ ${gastadoFecha.toFixed(2)}).`,
      });
      return { ok: false, motivo: "limite_excedido", gastadoFecha, limite: limiteDiario };
    }
  }
  const cart = items.map(it => ({ product: { name: it.nombre, price: it.precio }, qty: it.cantidad }));
  const r = await comprarProductosLive(beneficiarioId, worldId, merchantId, cart);
  if (!r.ok) return r;
  await rest("menu_reservas", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      world_id: worldId, merchant_id: merchantId, merchant_nombre: merchantNombre,
      beneficiario_user_id: beneficiarioId, beneficiario_nombre: beneficiarioNombre,
      fecha, items, monto, estado: "CONFIRMADA",
    }),
  });
  return { ok: true, total: r.total };
}

// ── Errores controlados — catálogo en tabla, no mensajes genéricos ────────
// error_catalog define título/mensaje/acción por código; error_log registra
// ocurrencias para monitoreo. Fallback local si la tabla aún no existe.
let _errCatalog = null;
export async function errorControlado(code) {
  if (!_errCatalog) {
    try {
      const rows = await rest("error_catalog?select=*");
      _errCatalog = new Map((rows || []).map(r => [r.code, r]));
    } catch { _errCatalog = new Map(); }
  }
  return _errCatalog.get(code) || {
    code, titulo: "No se pudo completar", severidad: "error",
    mensaje: "Ocurrió un problema al procesar la operación.", accion: "Inténtalo nuevamente.",
  };
}
export function logErrorControlado(code, contexto = null, worldId = null) {
  rest("error_log", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ code, contexto, world_id: worldId, origen: "app" }),
  }).catch(() => {});
}

// Bug real: cada catch(e) de un flujo de dinero (recarga, pago, checkout de
// menú/marketplace, P2P, BNPL) ignoraba por completo e.message y siempre
// mostraba el mensaje genérico del catálogo — así que cuando la causa real
// era la sesión vencida (exigirAutorizacionWallet ya arma un mensaje claro:
// "Tu sesión expiró..."), la usuaria veía en su lugar el texto del código
// de error genérico (a veces literalmente el de "transferir una entrada"),
// sin ninguna pista de qué pasó ni qué hacer. Este helper deja pasar el
// mensaje real cuando ya es accionable, y solo cae al catálogo para errores
// que de verdad no tienen un mensaje mejor.
export async function mensajeDeError(e, codigoFallback) {
  if (e?.codigo === "sesion_invalida") {
    return { titulo: "Sesión expirada", mensaje: e.message, accion: "Vuelve a iniciar sesión.", severidad: "error" };
  }
  return errorControlado(codigoFallback);
}

// ── Transferencia P2P genérica (entre cualquier par de wallets del mundo) ──
// Reutilizada por: WalletTemplate (P2P entre usuarios) y la recarga de un
// tutor hacia el dependiente (mismo mecanismo, distinto origen en la UI).
export async function transferirP2PRemote(fromUserId, toUserId, worldId, monto) {
  // El monto tiene que ser positivo, y esto se valida ANTES que el saldo.
  //
  // Con un monto negativo la comparación de abajo pasa sola (0 < -120 es
  // falso), y la transferencia se invierte: al origen se le resta un negativo
  // —o sea, se le crea dinero— y al destino se le suma, dejándolo en rojo.
  // Ya pasó una vez en Raimondi: una wallet quedó en S/ -120 y otra ganó 120
  // que nadie depositó. Va acá y no en cada pantalla porque esta función es el
  // único punto por el que pasan tanto el P2P entre usuarios como la recarga
  // de un tutor a su dependiente.
  const importe = Number(monto);
  if (!Number.isFinite(importe) || importe <= 0) {
    return { ok: false, motivo: "monto" };
  }
  // Céntimos: más precisión que eso no existe en un saldo y solo sirve para
  // arrastrar errores de redondeo.
  if (Math.round(importe * 100) !== importe * 100) {
    return { ok: false, motivo: "monto" };
  }
  if (fromUserId === toUserId) return { ok: false, motivo: "destino" };

  const origen = await getOrCreateWallet(fromUserId, worldId);
  const destino = await getOrCreateWallet(toUserId, worldId);
  // Bug real #114: las 2 escrituras de arriba (débito + crédito) eran 2
  // PATCH separados y no atómicos — si el segundo fallaba después del
  // primero, el dinero desaparecía sin llegar a nadie. Y cualquiera con la
  // anon key podía saltarse esta función entera y escribir el balance
  // directo. transferir_p2p_wallet() hace las 2 escrituras + los 2 registros
  // de transacción en una sola función de Postgres (SECURITY DEFINER), con
  // lock de ambas filas — o se mueve todo o no se mueve nada.
  const r = (await rest("rpc/transferir_p2p_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_origen_wallet_id: origen.id, p_destino_wallet_id: destino.id,
      p_monto: importe, p_world_id: worldId,
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  if (!r?.ok) return { ok: false, motivo: r?.motivo === "SALDO_INSUFICIENTE" ? "saldo" : "monto", balance: r?.nuevo_saldo_origen != null ? +r.nuevo_saldo_origen : +origen.balance };
  return { ok: true, balance: +r.nuevo_saldo_origen };
}

// ── Pago por QR generado por el comercio — el operador del POS tipea el
// monto y muestra un QR (contraparte: crearChargeRequestRemote en
// joi360-admin); esta pantalla resuelve el link, y quien lo escaneó paga
// desde su propia sesión. Misma RPC atómica que ya usa cobrarPOSRemote.
export async function fetchChargeRequestRemote(id) {
  const rows = await rest(`charge_requests?id=eq.${id}&select=*`);
  return rows?.[0] || null;
}
export async function pagarChargeRequestRemote(chargeRequestId, userId) {
  const cr = await fetchChargeRequestRemote(chargeRequestId);
  if (!cr) return { ok: false, motivo: "no_encontrado" };
  if (cr.estado !== "pendiente") return { ok: false, motivo: cr.estado === "pagado" ? "ya_pagado" : "cancelado" };
  const wallet = await getOrCreateWallet(userId, cr.world_id);
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: -Math.abs(+cr.monto), p_tipo: "compra",
      p_world_id: cr.world_id, p_merchant_id: cr.merchant_id, p_reference: cr.referencia, p_turno_id: cr.turno_id || null,
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  if (!r?.ok) return { ok: false, motivo: r?.motivo === "SALDO_INSUFICIENTE" ? "saldo" : (r?.motivo || "error"), balance: r?.nuevo_saldo != null ? +r.nuevo_saldo : +wallet.balance };
  await rest(`charge_requests?id=eq.${chargeRequestId}&estado=eq.pendiente`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "pagado", pagador_user_id: userId, paid_at: new Date().toISOString() }),
  }).catch(() => {});
  return { ok: true, balance: +r.nuevo_saldo, monto: +cr.monto, merchantNombre: cr.merchant_nombre };
}

// ── Código JOI del titular — corto y digerible para compartir de palabra o
// por WhatsApp al recibir una transferencia. Antes "mi código JOI" era el
// UUID crudo de getSyntheticUserId(). Es información pública (como un alias
// de transferencia, no un secreto), así que se lee/busca directo con la
// llave anónima — igual que el código de un comercio o de un mundo. ─────────
export async function fetchMiCodigoJoi(userId) {
  const rows = await rest(`app_profiles?id=eq.${userId}&select=codigo`);
  return rows?.[0]?.codigo || null;
}
export async function buscarPorCodigoJoiRemote(codigo) {
  const rows = await rest(`app_profiles?codigo=eq.${encodeURIComponent(codigo.trim().toUpperCase())}&select=id,nombres,apellidos`);
  const c = rows?.[0];
  if (!c) return null;
  return { userId: c.id, nombre: [c.nombres, c.apellidos].filter(Boolean).join(" ") || null };
}
// El DNI sí necesita pasar por el backend: no se guarda en ninguna columna
// que la llave anónima pueda leer (mismo mecanismo que titular-dni.js).
const POS_BACKEND_URL = "https://joi-pos-backend.vercel.app";
export async function buscarPorDniRemote(dni) {
  const res = await fetch(`${POS_BACKEND_URL}/api/pos/v1/p2p-dni/${encodeURIComponent(dni.trim())}`);
  if (!res.ok) return null;
  const data = await res.json();
  return { userId: data.userId, nombre: data.nombre, codigo: data.codigo };
}

// Ticket a RedPontis/mundo — mismo support_tickets que ya usa el admin
// (SponsorSoporte), origen "usuario" para distinguir de dónde vino.
export async function crearTicketSoporteRemote(payload) {
  const rows = await rest("support_tickets", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ origen: "usuario", estado: "ABIERTO", ...payload }),
  });
  return rows?.[0] || null;
}

// ── Solicitud de pulsera NFC (antes: botones decorativos sin backend) ─────
// nombre es opcional pero recomendado: sin él, RedPontis solo ve el user_id
// crudo en su cola de solicitudes — con él, ve el nombre real de quien pidió.
export async function solicitarBanditaNfc(worldId, userId, nombre = null, universal = false) {
  await rest("nfc_requests", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ world_id: worldId, user_id: userId, status: "pendiente", nombre, universal }),
  });
}
export async function fetchMiSolicitudNfc(worldId, userId) {
  const rows = await rest(`nfc_requests?world_id=eq.${worldId}&user_id=eq.${userId}&select=*&order=created_at.desc&limit=1`);
  return rows?.[0] || null;
}
// Vigencia real de la bandita ya vinculada — nfc_requests no la tiene (solo
// dice "entregada"), vive en nfc_bands.vence_at, calculada desde la
// ACTIVACIÓN real (vincularNfcBandRemote), no desde que se cargó al almacén.
export async function fetchMiBanditaVigencia(worldId, userId) {
  const rows = await rest(`nfc_bands?world_id=eq.${worldId}&linked_user_id=eq.${userId}&select=codigo,estado,activada_at,vence_at&order=activada_at.desc&limit=1`);
  return rows?.[0] || null;
}
// El UID real de una bandita siempre viene en formato de bytes hex
// separados por dos puntos (ej. 04:D6:01:5A:68:19:94) -- mismo normalizador
// que ya usa el admin (supabase.js) para que un mismo tag lea igual sin
// importar si lo escaneó un operador o el propio usuario desde su celular.
export function normalizarUidBandita(raw) {
  const limpio = String(raw || "").trim().toUpperCase();
  if (!limpio) return null;
  const soloHex = limpio.replace(/[:\-\s.]/g, "");
  if (!/^[0-9A-F]+$/.test(soloHex) || soloHex.length < 8 || soloHex.length % 2 !== 0) return null;
  return soloHex.match(/.{2}/g).join(":");
}

// Vinculación directa desde el celular del usuario vía Web NFC (Task #230)
// -- antes la única forma de vincular una bandita era pedirla y esperar a
// que un operador la entregara físicamente con su propio lector. Con un
// celular Android con NFC, el usuario puede leer el tag él mismo y
// vincularlo al instante, sin pasar por la cola de solicitud. Mismas
// validaciones que vincular() en el POS Operador (OperadorApp.jsx): la
// banda debe existir en este mundo, estar "asignada" (disponible, no
// vinculada a nadie), y la cuenta destino no debe tener ya otra activa.
export async function vincularBanditaDirectoRemote(worldId, userId, codigoRaw, vigenciaMeses = null) {
  const normalizado = normalizarUidBandita(codigoRaw) || String(codigoRaw || "").trim().toUpperCase();
  const band = (await rest(`nfc_bands?codigo=eq.${encodeURIComponent(normalizado)}&world_id=eq.${worldId}&select=*`))?.[0];
  if (!band) throw new Error("No se encontró esta pulsera en el inventario de este mundo. Pide ayuda al mundo si el problema persiste.");
  if (band.linked_user_id) throw new Error(band.linked_user_id === userId ? "Esta pulsera ya está vinculada a tu cuenta." : "Esta pulsera ya está vinculada a otra persona.");
  if (band.estado !== "asignada") throw new Error(`Esta pulsera está en estado "${band.estado}" — no está lista para vincular todavía.`);
  const yaActiva = (await rest(`nfc_bands?world_id=eq.${worldId}&linked_user_id=eq.${userId}&estado=eq.activa&select=id,codigo&limit=1`))?.[0];
  if (yaActiva) throw new Error(`Ya tienes la pulsera ${yaActiva.codigo} vinculada y activa en este mundo. Repórtala como perdida antes de vincular una nueva.`);

  const now = new Date();
  const vence = vigenciaMeses ? new Date(now.setMonth(now.getMonth() + Number(vigenciaMeses))).toISOString() : null;
  await rest(`nfc_bands?id=eq.${band.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "activa", linked_user_id: userId, activada_at: new Date().toISOString(), vence_at: vence }),
  });

  // Si había una solicitud pendiente para esta persona, se cierra sola --
  // vincular de verdad ES lo que marca "entregada", igual que ya hace el
  // operador (mismo patrón que vincularNfcBandRemote en el admin).
  const pendientes = await rest(`nfc_requests?world_id=eq.${worldId}&user_id=eq.${userId}&status=eq.pendiente&select=id&order=created_at.asc&limit=1`).catch(() => []);
  if (pendientes?.[0]?.id) {
    await rest(`nfc_requests?id=eq.${pendientes[0].id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "entregada" }),
    }).catch(() => {});
  }
  return band.codigo;
}

// Pérdida/robo: bloquea la bandita vinculada (nadie puede reactivarla — el
// operador exige estado "asignada" para vincular) y abre una solicitud de
// reposición nueva, con motivo real para que RedPontis y el operador de
// mundo la distingan de un alta normal. La resuelve el mismo flujo de
// siempre: el operador vincula una unidad nueva, lo que ya cierra la
// solicitud pendiente automáticamente.
export async function reportarBanditaPerdidaRemote(worldId, userId, nombre = null) {
  const banda = await fetchMiBanditaVigencia(worldId, userId);
  if (banda?.codigo) {
    await rest(`nfc_bands?codigo=eq.${encodeURIComponent(banda.codigo)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ estado: "bloqueada" }),
    }).catch(() => {});
  }
  await rest("nfc_requests", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ world_id: worldId, user_id: userId, status: "pendiente", nombre, motivo: "perdida_robo" }),
  });
}

// ── Catálogos + configuración por mundo (Fase 1+2, solo lectura) ──────────
export async function fetchEmissionChannels() {
  return rest("emission_channels?select=*&order=id");
}

export async function fetchWorldChannelConfigs(worldId) {
  return rest(`world_channel_configs?world_id=eq.${worldId}&select=*`);
}

export async function fetchWorldCapacityConfig(worldId, capacityId) {
  const rows = await rest(`world_capacity_configs?world_id=eq.${worldId}&capacity_id=eq.${capacityId}&select=*`);
  return rows?.[0] || null;
}

// Cómo renderiza la app cada canal según su tipo (contrato del catálogo admin):
//   "form" → checkout embebido del PSP (Culqi/Qubit) · "qr" → QR de la red · "manual" → informativo
// `channel_type` ahora llega directo desde CANALES_EMISION.checkout_type
// (el admin sincroniza `emission_channels` en cada guardado de Emisión —
// antes esta tabla era un seed manual congelado, ver Gantt #96). Fallback
// a "qr" solo por si queda alguna fila vieja sin re-sincronizar todavía.
const CHECKOUT_TYPES = new Set(["qr", "form", "manual"]);

// Combina canal global + override del mundo, igual que CanalEmisionRow en el admin.
export async function canalesHabilitadosDeMundoLive(worldId) {
  const [channels, overrides] = await Promise.all([
    fetchEmissionChannels(),
    fetchWorldChannelConfigs(worldId),
  ]);
  const overrideMap = new Map((overrides || []).map(o => [o.channel_id, o]));
  return (channels || [])
    .filter(ch => ch.global_active)
    .map(ch => {
      const o = overrideMap.get(ch.id);
      const enabled = o ? o.channel_enabled !== false : false; // sin registro en el mundo = no habilitado
      return {
        id: ch.id, nombre: ch.name, tiempoAcreditacion: ch.acreditacion_time,
        montoMin: o?.monto_min_override ?? ch.monto_min,
        montoMax: o?.monto_max_override ?? ch.monto_max,
        checkout: CHECKOUT_TYPES.has(ch.channel_type) ? ch.channel_type : "qr",
        psp: ch.psp_name || null,
        enabled,
      };
    })
    .filter(ch => ch.enabled);
}

// Canales de ADQUIRENCIA (cobro en comercio: POS Físico / App Operador / QR
// Estático) — antes AccesosTemplate leía cfg.config['adq_'+id], una clave que
// syncAllWorlds (admin) siempre borra de world_capacity_configs antes de
// escribir (esos toggles viven en su propia tabla, world_acquiring_channel_configs,
// desde el 30-jul), así que el filtro nunca excluía nada y siempre mostraba
// los 3 canales sin importar lo que RedPontis hubiera desactivado.
export async function fetchAcquiringChannelsLive(worldId) {
  const rows = await rest(`world_acquiring_channel_configs?world_id=eq.${worldId}&select=channel_id,channel_enabled`);
  const overrideMap = new Map((rows || []).map(r => [r.channel_id, r]));
  return CANALES_ADQUIRENCIA.filter(ch => {
    if (!ch.disponible) return false;
    const o = overrideMap.get(ch.id);
    return o ? o.channel_enabled !== false : false; // sin registro en el mundo = no habilitado
  });
}

// ── Configuración VIVA del mundo (FASE 0 — fuente única de verdad) ───────
// La app deja de tener catálogo propio: lee exactamente lo que el admin
// escribió en world_capacity_configs + world_feature_flags.
//
// Devuelve: {
//   modulos: [{ id, enabled, config, servicios: { flag_code: bool } }],
//   flag(capId, flagCode) -> bool,
//   activo(capId) -> bool,
//   cfg(capId) -> objeto de configFields
// }
export async function fetchWorldConfigLive(worldId) {
  if (!worldId) return { modulos: [], flag: () => false, activo: () => false, cfg: () => ({}) };

  const [caps, flags] = await Promise.all([
    rest(`world_capacity_configs?world_id=eq.${worldId}&select=capacity_id,enabled,config`),
    rest(`world_feature_flags?world_id=eq.${worldId}&select=enabled,capacity_feature_flags(capacity_id,flag_code)`),
  ]);

  // Agrupar flags por capacidad → { wallet: { balance:true, bandita:false }, ... }
  const flagsPorCap = {};
  for (const row of flags || []) {
    const f = row.capacity_feature_flags;
    if (!f) continue;
    (flagsPorCap[f.capacity_id] ||= {})[f.flag_code] = row.enabled !== false;
  }

  const modulos = (caps || []).map(c => ({
    id: c.capacity_id,
    enabled: c.enabled !== false,
    config: c.config || {},
    servicios: flagsPorCap[c.capacity_id] || {},
  }));

  const byId = new Map(modulos.map(m => [m.id, m]));
  return {
    modulos,
    activo: (capId) => byId.get(capId)?.enabled === true,
    cfg:    (capId) => byId.get(capId)?.config || {},
    // Un flag solo cuenta como activo si SU CAPACIDAD también lo está.
    flag:   (capId, flagCode) => {
      const m = byId.get(capId);
      if (!m?.enabled) return false;
      return m.servicios[flagCode] === true;
    },
  };
}

// ── Wallet ──────────────────────────────────────────────────────────────
// La moneda de una wallet nueva debe ser la real del mundo (worlds.moneda),
// no un "PEN" fijo — hoy no se nota porque los mundos reales son todos PEN,
// pero era la fuente de verdad equivocada.
async function monedaDeMundo(worldId) {
  const rows = await rest(`worlds?id=eq.${worldId}&select=moneda`).catch(() => []);
  return rows?.[0]?.moneda || "PEN";
}

// ── Sucursales — saldo compartido (Etapa B) ─────────────────────────────────
// Un mundo con comparte_saldo_grupo=true no tiene su propia wallet: todas las
// sucursales del mismo grupo que también comparten saldo resuelven a la MISMA
// fila de `wallets`, en vez de inventar una entidad "wallet de grupo" nueva —
// se elige siempre la sucursal más antigua del grupo (created_at asc) como
// dueña real de esa fila, así ningún otro código que asuma wallets.world_id
// = un mundo real (moneda, liquidación, reportes) se rompe. Cacheado en
// memoria de la pestaña: el grupo de un mundo no cambia en caliente durante
// una sesión.
const _walletWorldCache = new Map();
async function resolverWorldIdWallet(worldId) {
  if (_walletWorldCache.has(worldId)) return _walletWorldCache.get(worldId);
  const rows = await rest(`worlds?id=eq.${worldId}&select=grupo_id,comparte_saldo_grupo`).catch(() => []);
  const w = rows?.[0];
  if (!w?.grupo_id || !w.comparte_saldo_grupo) {
    _walletWorldCache.set(worldId, worldId);
    return worldId;
  }
  const hermanos = await rest(`worlds?grupo_id=eq.${w.grupo_id}&comparte_saldo_grupo=eq.true&select=id&order=created_at.asc`).catch(() => []);
  const principal = hermanos?.[0]?.id || worldId;
  _walletWorldCache.set(worldId, principal);
  return principal;
}
export async function getOrCreateWallet(userId, worldId) {
  // Resuelve a la sucursal dueña de la wallet compartida, si aplica — de acá
  // para abajo, `worldId` YA es el mundo real donde vive la fila de wallets;
  // toda la función queda igual, solo cambia de qué mundo se lee/crea.
  worldId = await resolverWorldIdWallet(worldId);

  // 1) Camino feliz: la wallet ya existe (caso normal en todo acceso post-creación).
  const existing = await rest(`wallets?user_id=eq.${userId}&world_id=eq.${worldId}&select=*`);
  if (existing && existing.length) return existing[0];

  // 2) No existe — intentar crearla. ignore-duplicates (NO merge-duplicates: merge
  //    reenviaría balance:0 y BORRARÍA el saldo real si alguien ganó la carrera).
  //    Esto es justo lo que pasa cuando useWalletLive dispara fetchWalletBalance
  //    y fetchTxHistory en paralelo la primera vez que se visita un mundo.
  const moneda = await monedaDeMundo(worldId);
  const created = await rest(`wallets?on_conflict=user_id,world_id`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ user_id: userId, world_id: worldId, balance: 0, currency: moneda }),
  });
  if (created && created.length) return created[0];

  // 3) Si llegamos aquí, otra llamada concurrente ganó la carrera y la nuestra
  //    fue ignorada (created=[]). Releer para obtener la fila real.
  const rows = await rest(`wallets?user_id=eq.${userId}&world_id=eq.${worldId}&select=*`);
  return rows[0];
}

// Bug real #114: balance movido con PATCH directo, sin lock de fila ni
// control de quién puede escribirlo (ver mover_saldo_wallet() y el comentario
// largo en pagarCuotaBNPLUsuario más arriba para el detalle completo).
export async function recargarSupabase(userId, worldId, monto, channelId, channelNombre) {
  const wallet = await getOrCreateWallet(userId, worldId);
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: Math.abs(monto), p_tipo: "recarga",
      p_world_id: worldId, p_channel_id: channelId, p_reference: `${channelNombre}-${Date.now()}`,
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  // Bug real de QA (hallado hoy): esta función devolvía +r.nuevo_saldo sin
  // chequear r.ok, a diferencia de pagarSupabase/pagarCuotaBNPLUsuario/etc.
  // Si el RPC alguna vez rechaza sin lanzar HTTP error, el llamador veía
  // "acreditado" sobre una recarga que no ocurrió, y nuevo_saldo=null caía a
  // NaN/0 pisando el saldo real en pantalla.
  if (!r?.ok) throw new Error(r?.motivo || "No se pudo acreditar la recarga.");
  return +r.nuevo_saldo;
}

// maxRecargasDiarias (world_capacity_configs de wallet) nunca se hacía cumplir en
// ningún punto del cliente — el admin podía fijar un tope y no tenía ningún efecto
// real. Cuenta recargas reales de hoy (hora local) para poder bloquear la siguiente antes de cobrar.
export async function fetchRecargasHoyCount(userId, worldId) {
  const wallet = await getOrCreateWallet(userId, worldId);
  const hoyISO = new Date(); hoyISO.setHours(0, 0, 0, 0);
  const rows = await rest(
    `transactions?wallet_id=eq.${wallet.id}&type=eq.recarga&created_at=gte.${hoyISO.toISOString()}&select=id`
  );
  return (rows || []).length;
}

export async function pagarSupabase(userId, worldId, monto, comercioNombre = "Comercio", tipo = "compra") {
  const wallet = await getOrCreateWallet(userId, worldId);
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: -Math.abs(monto), p_tipo: tipo,
      p_world_id: worldId, p_reference: `pago-${comercioNombre}-${Date.now()}`,
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  if (!r?.ok) return { ok: false, balance: r?.nuevo_saldo != null ? +r.nuevo_saldo : +wallet.balance };
  const nuevoSaldo = +r.nuevo_saldo;
  return { ok: true, balance: nuevoSaldo };
}

// ── Perfil extendido (Gantt #93) — datos médicos/emergencia reales ────────
export async function fetchMiPerfilExtendido(userId, worldId) {
  const rows = await rest(`user_profiles?user_id=eq.${userId}&world_id=eq.${worldId}&select=*`);
  return rows?.[0] || null;
}
export async function guardarPerfilExtendido(userId, worldId, datos) {
  await rest("user_profiles?on_conflict=world_id,user_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ world_id: worldId, user_id: userId, ...datos }]),
  });
}

// ── Control de Accesos (Gantt #92) — historial real del usuario ───────────
export async function fetchMisAccesos(userId, worldId, limit = 15) {
  return rest(`access_log?user_id=eq.${userId}&world_id=eq.${worldId}&select=*&order=created_at.desc&limit=${limit}`);
}

// ── Marketplace de comercios (Gantt #90 — Caso Raimondi) ──────────────────
// Catálogo regular de TODOS los comercios del mundo en una sola query
// (event_id null = catálogo regular, no el de un evento).
export async function fetchProductosMundoLive(worldId) {
  return rest(`products?world_id=eq.${worldId}&event_id=is.null&active=eq.true&select=*&order=created_at`);
}

// Checkout unificado: debita el total del carrito y registra UNA transacción
// atribuida al comercio (merchant_id) con el detalle de items en la referencia.
// Gap real cerrado 29-jul: el stock de producto (p.stock) se mostraba en la
// UI del Marketplace pero nunca se validaba ni se decrementaba — un producto
// podía venderse sin límite aunque su stock llegara a 0 (hallazgo documentado
// desde el audit del Caso Kermesse, resuelto ahora). Solo aplica a items con
// un id real de `products` — los items de Menú (crearReservaMenu) nunca
// setean product.id, así que quedan fuera de este chequeo correctamente (su
// límite es cupos_max en menu_programacion, un concepto aparte).
export async function comprarProductosLive(userId, worldId, merchantId, items) {
  const total = items.reduce((a, it) => a + (+it.product.price) * it.qty, 0);
  const wallet = await getOrCreateWallet(userId, worldId);

  const idsConStock = items.filter(it => it.product.id).map(it => it.product.id);
  let stockPorId = new Map();
  if (idsConStock.length) {
    const rows = await rest(`products?id=in.(${idsConStock.map(id => `"${id}"`).join(",")})&select=id,stock`);
    stockPorId = new Map((rows || []).map(r => [r.id, r.stock]));
    for (const it of items) {
      const disponible = stockPorId.get(it.product.id);
      if (disponible != null && disponible < it.qty) {
        return { ok: false, motivo: "stock", producto: it.product.name, stockDisponible: disponible };
      }
    }
  }

  const detalle = items.map(it => `${it.product.name} x${it.qty}`).join(", ");
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: -Math.abs(total), p_tipo: "compra",
      p_world_id: worldId, p_merchant_id: merchantId, p_reference: (`Compra app · ${detalle}`.slice(0, 90) + ` · ${Date.now()}`),
    }),
  }))?.[0];
  exigirAutorizacionWallet(r);
  if (!r?.ok) {
    // Task #181: el RPC ahora también rechaza por restricciones del
    // dependiente (horario/límite diario), aplicadas server-side además del
    // pre-check que ya hace la pantalla — sin este mapeo, ese rechazo caía
    // en "sin_wallet" (billetera no encontrada), un mensaje falso.
    const motivo = r?.motivo === "SALDO_INSUFICIENTE" ? "saldo"
      : r?.motivo === "FUERA_DE_HORARIO" ? "restriccion_horario"
      : r?.motivo === "LIMITE_DIARIO_EXCEDIDO" ? "restriccion_limite_diario"
      : "sin_wallet";
    return { ok: false, motivo, balance: r?.nuevo_saldo != null ? +r.nuevo_saldo : +wallet.balance };
  }
  const nuevoSaldo = +r.nuevo_saldo;

  for (const it of items) {
    const disponible = stockPorId.get(it.product.id);
    if (disponible != null) {
      await rest(`products?id=eq.${it.product.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ stock: Math.max(0, disponible - it.qty) }),
      }).catch(() => {});
    }
  }

  return { ok: true, balance: nuevoSaldo, total };
}

export async function fetchWalletBalancesBatch(userId, worldIds) {
  if (!worldIds.length) return {};
  const balances = await Promise.all(worldIds.map(id => fetchWalletBalance(userId, id)));
  return Object.fromEntries(worldIds.map((id, i) => [id, balances[i]]));
}

export async function fetchWalletBalance(userId, worldId) {
  const wallet = await getOrCreateWallet(userId, worldId);
  return +wallet.balance;
}

// Cashback MACRO (13-ago): saldo separado del principal, ver mover_cashback_wallet
// en add-cashback.sql. getOrCreateWallet ya trae `select=*`, así que no hace
// falta un segundo round-trip — solo se expone el campo.
export async function fetchCashbackBalance(userId, worldId) {
  const wallet = await getOrCreateWallet(userId, worldId);
  return +(wallet.cashback_balance || 0);
}

// Loyalty v1.0.0 (26-ago) — acumulación real, derivada de transactions
// (type=compra) igual que fetchCashbackPorComercio, en vez de una columna
// de saldo propia + RPC nueva. Deliberado: mover_saldo_wallet ya tuvo 3
// reescrituras por temas de seguridad (Discrepancia #1 del maestro) -- no se
// le agrega lógica de puntos sin testeo dedicado en esta misma tanda. Este
// primer corte es de solo lectura: saldo de puntos y el detalle de qué compra
// lo generó son 100% reales, pero el canje (gastar puntos) queda para una
// versión posterior que sí amerite tocar el RPC con cuidado.
export async function fetchLoyaltyPuntos(userId, worldId, equivalencia = 0.10, caducidadMeses = null) {
  const wallet = await getOrCreateWallet(userId, worldId);
  let query = `transactions?wallet_id=eq.${wallet.id}&type=eq.compra&select=amount,merchant_id,created_at&order=created_at.desc`;
  if (caducidadMeses) {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - caducidadMeses);
    query += `&created_at=gte.${desde.toISOString()}`;
  }
  const rows = await rest(query);
  const compras = rows || [];
  const totalGastado = compras.reduce((a, r) => a + Number(r.amount), 0);
  const puntos = equivalencia > 0 ? Math.floor(totalGastado / equivalencia) : 0;
  return { puntos, compras };
}

// Puntos por varios mundos a la vez (Profile → "Mis comunidades") — mismo
// patrón fan-out que fetchWalletBalancesBatch, no una sola query SQL. Un
// mundo sin Loyalty activo devuelve 0 sin fetch extra.
export async function fetchLoyaltyPuntosBatch(userId, worldIds) {
  if (!worldIds || !worldIds.length) return {};
  const entries = await Promise.all(worldIds.map(async id => {
    try {
      const cfg = await fetchWorldConfigLive(id);
      const mod = (cfg?.modulos || []).find(m => m.id === "loyalty" && m.enabled);
      if (!mod) return [id, 0];
      const r = await fetchLoyaltyPuntos(userId, id, mod.config?.equivalencia || 0.10, mod.config?.caducidadMeses ?? null);
      return [id, r.puntos];
    } catch { return [id, 0]; }
  }));
  return Object.fromEntries(entries);
}

// Desglose de cashback por comercio (20-ago) — solo se usa cuando el mundo
// eligió modalidad "por_comercio". Derivado de transactions (cashback_ganado
// / cashback_canjeado / cashback_revertido), no de una tabla nueva — cero
// cambios en mover_cashback_wallet, cero riesgo sobre dinero real.
export async function fetchCashbackPorComercio(userId, worldId) {
  const wallet = await getOrCreateWallet(userId, worldId);
  const rows = await rest(`transactions?wallet_id=eq.${wallet.id}&type=in.(cashback_ganado,cashback_canjeado,cashback_revertido)&select=merchant_id,amount,type`);
  const porComercio = {};
  for (const r of rows || []) {
    if (!r.merchant_id) continue;
    const signo = r.type === "cashback_canjeado" ? -1 : 1;
    porComercio[r.merchant_id] = (porComercio[r.merchant_id] || 0) + signo * Number(r.amount);
  }
  return porComercio;
}

// ── Precompra de evento (Backlog #2, Documento Maestro) — el asistente ya
// compró su entrada y quiere reservar/pagar productos de los comercios del
// evento para retirar en el stand. La autoría (comercio carga producto +
// stock con event_id real) es de Task #231; esto es el lado del asistente:
// paga ahora con la misma RPC de siempre (comprarProductosLive ya valida y
// decrementa stock), event_product_orders es solo el pendiente de retiro,
// mismo rol que menu_reservas para Menú.
export async function fetchProductosEventoLive(eventId) {
  return rest(`products?event_id=eq.${eventId}&select=*&order=created_at`);
}
export async function fetchMisPedidosEvento(userId, eventId) {
  return rest(`event_product_orders?beneficiario_user_id=eq.${userId}&event_id=eq.${eventId}&select=*&order=created_at.desc`);
}
export async function crearPedidoEvento({ worldId, eventId, merchantId, beneficiarioId, beneficiarioNombre, items }) {
  const monto = items.reduce((a, it) => a + (+it.precio) * it.cantidad, 0);
  const cart = items.map(it => ({ product: { id: it.id, name: it.nombre, price: it.precio }, qty: it.cantidad }));
  const r = await comprarProductosLive(beneficiarioId, worldId, merchantId, cart);
  if (!r.ok) return r;
  await rest("event_product_orders", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      world_id: worldId, event_id: eventId, merchant_id: merchantId,
      beneficiario_user_id: beneficiarioId, beneficiario_nombre: beneficiarioNombre,
      items, monto, estado: "CONFIRMADA",
    }),
  });
  return { ok: true, total: r.total };
}

const TIPO_LABEL = { recarga: "Recarga", compra: "Pago", transferencia_p2p: "Transferencia", devolucion: "Devolución", cashback: "Cashback", puntos: "Puntos" };

// Auditoría Task #133: el mundo podía fijar "Máximo por transacción"/
// "Máximo por día" en Transferencia (P2P) desde el admin, pero nada en la
// app lo leía ni lo aplicaba — un límite que existía solo en el papel. El
// de por-transacción se valida contra el monto tipeado; este trae lo ya
// enviado hoy para poder validar el acumulado diario antes de confirmar.
export async function fetchP2PEnviadoHoy(userId, worldId) {
  const wallet = await getOrCreateWallet(userId, worldId);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const rows = await rest(`transactions?wallet_id=eq.${wallet.id}&type=eq.transferencia_p2p&reference=like.*-envio&created_at=gte.${hoy.toISOString()}&select=amount`);
  return (rows || []).reduce((a, r) => a + (+r.amount || 0), 0);
}
export async function fetchTxHistory(userId, worldId) {
  const wallet = await getOrCreateWallet(userId, worldId);
  const rows = await rest(`transactions?wallet_id=eq.${wallet.id}&select=*&order=created_at.desc&limit=20`);
  return (rows || []).map(r => ({
    id: r.id,
    tipo: r.type.toUpperCase(),
    titulo: `${TIPO_LABEL[r.type] || r.type} · S/ ${Number(r.amount).toFixed(2)}`,
    monto: r.type === "compra" ? -Number(r.amount) : Number(r.amount),
    mundoId: r.world_id,
    fecha: r.created_at,
  }));
}
