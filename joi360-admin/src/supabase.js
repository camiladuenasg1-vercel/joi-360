// ============================================================================
// JOI360 Admin · Capa de sincronización con Supabase (Fase 0 — Demo E2E)
// El admin es la FUENTE DE ESCRITURA: todo lo que se configura aquí se
// upserta a Supabase, y la superapp (joi360-app) lo renderiza en vivo.
// Mismo patrón fetch-plano que joi360-app/src/supabaseClient.js.
// ============================================================================

const SUPA_URL = "https://kobtxrhycaloyjkeyspv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYnR4cmh5Y2Fsb3lqa2V5c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzAwMjksImV4cCI6MjA5NzkwNjAyOX0.MlyyXGnsyMeVXaRfRbmFqwVhsh4FUFNztQoBaECd_i0";

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${path} → HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const upsertHeaders = { Prefer: "resolution=merge-duplicates,return=minimal" };

// ── Estado de sincronización (para el badge "Sync" del Shell) ───────────────
// "idle" | "syncing" | "ok" | "error"
let syncStatus = { state: "idle", at: null, error: null };
const syncListeners = new Set();
function setSyncStatus(state, error = null) {
  syncStatus = { state, at: Date.now(), error };
  syncListeners.forEach(fn => fn(syncStatus));
}
export function getSyncStatus() { return syncStatus; }
export function onSyncStatus(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); }

// ── Cache del catálogo de flags (capacity_id + flag_code → uuid) ────────────
let flagIdCache = null;
async function flagMap() {
  if (flagIdCache) return flagIdCache;
  const rows = await rest("capacity_feature_flags?select=id,capacity_id,flag_code");
  flagIdCache = new Map(rows.map(r => [`${r.capacity_id}:${r.flag_code}`, r.id]));
  return flagIdCache;
}

// Asegura que un flag exista en el catálogo global (Nivel 1). Devuelve su uuid.
export async function ensureGlobalFlag(capacityId, flagCode, nombre, descripcion, uxComponent = null) {
  const map = await flagMap();
  const key = `${capacityId}:${flagCode}`;
  if (map.has(key)) return map.get(key);
  const rows = await rest("capacity_feature_flags", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      capacity_id: capacityId, flag_code: flagCode, name: nombre,
      description: descripcion || null, default_value: false,
      affects: "usuario_final", ux_component: uxComponent,
    }),
  });
  map.set(key, rows[0].id);
  return rows[0].id;
}

// ── Mapeo mundo(admin) → tablas Supabase ────────────────────────────────────
function worldRow(m) {
  return {
    id: m.id,
    code: m.codigo || m.id,
    name: m.nombre,
    vertical: m.vertical || "Educación",
    status: (m.estado || "ACTIVO").toLowerCase(),
    color_primary: m.color || "#0035b9",
    currency: m.moneda || "PEN",
    // Gap real (auditoría #122): el acuerdo comercial vivía SOLO en el
    // localStorage de la sesión que creó el mundo — otra pestaña, otro
    // navegador o un "reset demo" lo perdían para siempre, y Liquidación
    // caía en su default silencioso (5% transaccional) sin que nadie lo
    // hubiera pactado. Ahora viaja con el resto del mundo.
    // OJO: {} (sin tipo) es el bug histórico documentado más abajo en
    // store.js — es "vacío" pero truthy. Si esta sesión todavía lo
    // arrastra, NUNCA se manda como si fuera real: se manda null, para no
    // pisar un acuerdo real que ya haya llegado por otra vía (ej. el PATCH
    // directo de una corrección administrativa).
    acuerdo: m.acuerdo?.tipo ? m.acuerdo : null,
    // Task #128: clave de operador del mundo para el login "Soy Mundo" del
    // POS (bandita/accesos/eventos/consultar) — distinta de la de cada
    // comercio, mismo patrón (código corto + PIN) que ya usa el terminal.
    pos_pin: m.posPin || null,
    // Logo/imagen del mundo (Task #166) — antes se guardaba como base64 en
    // memoria local y nunca viajaba a Supabase; sin esta columna el thumbnail
    // del card de comunidad en el superapp no tenía de dónde leer.
    logo_url: m.logoUrl || null,
    updated_at: new Date().toISOString(),
  };
}

// Mundos creados directo en Supabase (u otro browser/sesión admin) — el admin
// solo escribía hasta ahora, nunca releía worlds. Ver refreshMundosLive() en store.js.
export async function fetchWorldsLive() {
  return rest("worlds?select=*&order=created_at");
}
// Traídos en bulk (no por mundo) para reconstruir `modulos` de un mundo recién
// reconciliado sin N+1 requests — mismas tablas que escribe syncAllWorlds().
export async function fetchAllCapacityConfigs() {
  return rest("world_capacity_configs?select=*");
}
export async function fetchAllFeatureFlags() {
  return rest("world_feature_flags?select=*,capacity_feature_flags(capacity_id,flag_code)");
}

// Módulos fuera del alcance de los 3 casos TEC (Raimondi/Kermesse/BNPL) —
// visibles en el catálogo como "Próximamente", no activables ni sincronizables.
// Vive aquí (y no en store.js) porque store.js importa de este archivo.
//
// "promociones" volvió a esta lista 02-ago. Había salido el 28-jul porque el
// cupón QR tenía backend real, pero JOI Promos no está operativo ni en el
// superapp ni en el panel de RedPontis y quedó fuera del alcance. Dejarlo
// activable ofrecía una capacidad que después no rendía nada: el mundo la
// prendía y se encontraba con pestañas vacías.
export const MODULOS_PROXIMAMENTE = new Set([
  "facturacion", "reservas", "loyalty", "credito", "subsidio",
  "estacionamiento", "asistencia", "cashback", "turnos", "transporte",
  "promociones",
]);

// Canales de emisión activables por mundo (claves emision_<id> en config de wallet)
// "yape"/"plin" unificados en "qr_billetera", "card" renombrado a "culqi".
// "qubit" retirado 30-jul: era un PSP placeholder sin convenio real, nunca
// activable — el canal "Tarjeta (Qubit)" se retiró junto con el PSP
// (ver CANALES_EMISION en store.js).
const CHANNEL_IDS = ["qr_billetera", "transfer", "culqi"];

// Canales de adquirencia activables por mundo (claves adq_<id> en config de
// comercios) — mismos ids que CANALES_ADQUIRENCIA en store.js (no se puede
// importar de ahí, ver nota de MODULOS_PROXIMAMENTE más arriba).
const ACQUIRING_CHANNEL_IDS = ["pos_fisico", "app_operador", "qr_estatico"];

// ── SYNC COMPLETO (debounced desde store.update) ────────────────────────────
// Deriva TODO el estado remoto desde los mundos locales:
//   worlds + world_capacity_configs + world_feature_flags + world_channel_configs
export async function syncAllWorlds(mundos) {
  if (!mundos || !mundos.length) return;
  setSyncStatus("syncing");
  try {
    // 1. worlds (bulk upsert por id)
    await rest("worlds?on_conflict=id", {
      method: "POST", headers: upsertHeaders,
      body: JSON.stringify(mundos.map(worldRow)),
    });

    // 2. world_capacity_configs (bulk, on_conflict world_id+capacity_id)
    const capRows = [];
    for (const m of mundos) for (const mod of (m.modulos || [])) {
      // Módulos "Próximamente" no se sincronizan: un localStorage viejo con
      // crédito/etc. activado no debe volver a filtrarlos a Supabase.
      if (MODULOS_PROXIMAMENTE.has(mod.id)) continue;
      // Las claves emision_* viven en world_channel_configs, no en el config JSON
      const config = { ...(mod.config || {}) };
      for (const k of Object.keys(config)) if (k.startsWith("emision_") || k.startsWith("adq_")) delete config[k];

      // El modelo del Motor de Eventos vivía SOLO en el localStorage del admin
      // (m.eventosConfig). Es la decisión que define quién puede crear un
      // evento y dónde se renderiza, o sea justo lo que el superapp y el POS
      // necesitan saber — y no tenían cómo. Viaja con el resto de la
      // render-config, que es donde el resto del ecosistema ya mira.
      if (mod.id === "eventos") {
        const ec = m.eventosConfig || {};
        config.modoEventos = ec.modoEventos || (m.type === "eventos_rp" ? "b2c" : "b2b");
        // B2B nunca convive con embebido: se normaliza al escribir para que un
        // estado imposible no llegue a la base aunque el local venga sucio.
        config.embebidoActivo = config.modoEventos === "b2b" ? false : !!ec.embebidoActivo;
        config.modeloComisionEventos = ec.modeloComisionEventos || "transaccional";
        if (ec.comisionEntrada != null) config.comisionEntrada = ec.comisionEntrada;
        if (ec.comisionFijaMensual != null) config.comisionFijaMensual = ec.comisionFijaMensual;
      }

      capRows.push({ world_id: m.id, capacity_id: mod.id, enabled: mod.enabled !== false, config });
    }
    if (capRows.length) await rest("world_capacity_configs?on_conflict=world_id,capacity_id", {
      method: "POST", headers: upsertHeaders, body: JSON.stringify(capRows),
    });

    // 3. world_feature_flags (bulk, on_conflict world_id+flag_id)
    const map = await flagMap();
    const flagRows = [];
    for (const m of mundos) for (const mod of (m.modulos || [])) {
      // Wallet en modo identificación (perfiles sin saldo): las capacidades
      // transaccionales dependen de modelo_perfil.modelo=consumo — se apagan solas.
      const identificacion = mod.id === "wallet" && mod.config?.modelo_perfil_modelo === "identificacion";
      for (const [code, enabled] of Object.entries(mod.serviciosActivos || {})) {
        let flagId = map.get(`${mod.id}:${code}`);
        if (!flagId) {
          // Flag nuevo (ej. bnpl:*): nace en el Catálogo Global (Nivel 1) antes
          // de ser toggleable a nivel Mundo (principio no negociable del doc).
          try { flagId = await ensureGlobalFlag(mod.id, code, code); } catch { continue; }
        }
        const efectivo = identificacion && ["balance", "recarga", "p2p", "subwallet"].includes(code)
          ? false : enabled === true;
        flagRows.push({ world_id: m.id, flag_id: flagId, enabled: efectivo });
      }
    }
    if (flagRows.length) await rest("world_feature_flags?on_conflict=world_id,flag_id", {
      method: "POST", headers: upsertHeaders, body: JSON.stringify(flagRows),
    });

    // 4. world_channel_configs (bulk, on_conflict world_id+channel_id)
    // CanalEmisionRow (MundoDetail.jsx) guarda el toggle como objeto
    // {enabled, montoMinOverride, montoMaxOverride}, no como booleano plano —
    // "!== false" sobre un objeto es siempre true, así que un canal apagado
    // explícitamente (enabled:false) sincronizaba igual como habilitado.
    const channelEnabled = val => typeof val === "object" && val !== null ? val.enabled !== false : val !== false;
    const chRows = [];
    for (const m of mundos) {
      const wallet = (m.modulos || []).find(x => x.id === "wallet");
      if (!wallet) continue;
      for (const ch of CHANNEL_IDS) {
        const key = `emision_${ch}`;
        if (wallet.config && key in wallet.config) {
          chRows.push({ world_id: m.id, channel_id: ch, channel_enabled: channelEnabled(wallet.config[key]) });
        }
      }
      // Migración legacy: "card" fue renombrado a "culqi" al unificar canales.
      // Un mundo con config vieja (emision_card, sin emision_culqi todavía) se
      // migra en el sync mismo, para no depender de resetear el config a mano.
      if (wallet.config && "emision_card" in wallet.config && !("emision_culqi" in wallet.config)) {
        chRows.push({ world_id: m.id, channel_id: "culqi", channel_enabled: channelEnabled(wallet.config.emision_card) });
      }
    }
    if (chRows.length) await rest("world_channel_configs?on_conflict=world_id,channel_id", {
      method: "POST", headers: upsertHeaders, body: JSON.stringify(chRows),
    });

    // 5. world_acquiring_channel_configs (bulk, on_conflict world_id+channel_id)
    // Gap real cerrado 30-jul: los toggles adq_* se guardaban en config y se
    // borraban en el paso 2 (línea de arriba) sin destino — "Canales" en la
    // config de un mundo siempre mostraba el default del catálogo porque el
    // toggle real nunca llegaba a Supabase. Mismo patrón que el paso 4.
    const acqRows = [];
    for (const m of mundos) {
      const comercios = (m.modulos || []).find(x => x.id === "comercios");
      if (!comercios?.config) continue;
      for (const ch of ACQUIRING_CHANNEL_IDS) {
        const key = `adq_${ch}`;
        if (key in comercios.config) {
          acqRows.push({ world_id: m.id, channel_id: ch, channel_enabled: comercios.config[key] !== false });
        }
      }
    }
    if (acqRows.length) await rest("world_acquiring_channel_configs?on_conflict=world_id,channel_id", {
      method: "POST", headers: upsertHeaders, body: JSON.stringify(acqRows),
    });

    setSyncStatus("ok");
  } catch (e) {
    console.warn("[supabase-sync]", e);
    setSyncStatus("error", e.message);
  }
}

// Debounce: una sola sincronización por ráfaga de cambios en el store.
let syncTimer = null;
export function scheduleSync(getMundos) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncAllWorlds(getMundos()), 800);
}

// ── STORAGE (bucket joi360-media) ───────────────────────────────────────────
// Contratos PDF, foto de perfil de comercio, imágenes de producto. Sin SDK
// de Supabase en este proyecto (solo el rest() de arriba) — se llama directo
// al endpoint REST de Storage, igual patrón fetch-plano que el resto del archivo.
export async function uploadArchivo(bucket, path, file) {
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) throw new Error(`Storage upload → HTTP ${res.status}: ${await res.text()}`);
  return `${SUPA_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── CATÁLOGO GLOBAL de canales de emisión (Gantt #96) ───────────────────────
// Gap real encontrado: joi360-app lee su catálogo de canales desde la tabla
// `emission_channels` (fetchEmissionChannels), pero nada en el admin la
// escribía — quedaba como un seed manual congelado, desconectado de
// CANALES_EMISION/Emision.jsx. Se llama explícitamente desde Emision.jsx en
// cada guardado del catálogo (no es per-mundo, por eso no vive en
// syncAllWorlds). `rows` ya viene armado por el caller (necesita cruzar
// PSP_PROVIDERS, que vive en store.js — este archivo no puede importar de
// store.js para evitar el ciclo, ver nota de MODULOS_PROXIMAMENTE arriba).
export async function syncEmissionChannels(rows) {
  if (!rows || !rows.length) return;
  await rest("emission_channels?on_conflict=id", {
    method: "POST", headers: upsertHeaders, body: JSON.stringify(rows),
  });
}

// Gap real encontrado 27-jul: ids retirados del catálogo (ej. "yape"/"plin"
// unificados en "qr_billetera", "card" renombrado a "culqi") quedaban
// global_active=true en Supabase para siempre porque el upsert de arriba
// nunca desactiva lo que ya no está en el catálogo actual. Se llama junto
// con syncEmissionChannels en cada guardado del catálogo.
export async function pruneStaleEmissionChannels(currentIds) {
  const rows = await rest("emission_channels?select=id&global_active=eq.true");
  const stale = (rows || []).map(r => r.id).filter(id => !currentIds.includes(id));
  if (!stale.length) return;
  await rest(`emission_channels?id=in.(${stale.join(",")})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ global_active: false }),
  });
}

// Mismo patrón que emission_channels — Adquirencia.jsx (medios de aceptación)
// no tenía ningún consumidor de Supabase, así que lo configurado ahí solo
// vivía en localStorage de quien lo editó. Se llama en cada guardado.
export async function syncAcquiringChannels(rows) {
  if (!rows || !rows.length) return;
  await rest("acquiring_channels?on_conflict=id", {
    method: "POST", headers: upsertHeaders, body: JSON.stringify(rows),
  });
}
export async function pruneStaleAcquiringChannels(currentIds) {
  const rows = await rest("acquiring_channels?select=id&global_active=eq.true");
  const stale = (rows || []).map(r => r.id).filter(id => !currentIds.includes(id));
  if (!stale.length) return;
  await rest(`acquiring_channels?id=in.(${stale.join(",")})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ global_active: false }),
  });
}

export async function deleteWorldRemote(worldId) {
  // Antes tragaba el error silenciosamente — el diálogo de borrado siempre
  // notificaba "eliminado" aunque el DELETE remoto hubiera fallado de verdad
  // (ver DeleteMundoDialog en MundoDetail.jsx), dejando el mundo local
  // borrado pero el remoto intacto, sin ningún aviso real del desfase.
  await rest(`worlds?id=eq.${worldId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// Cambiar el logo de un mundo YA creado (Task #166) — PATCH directo en vez
// de esperar el sync debounced completo, mismo patrón que cambiarImagen()
// de un producto de comercio.
export async function actualizarLogoMundoRemote(worldId, logoUrl) {
  await rest(`worlds?id=eq.${worldId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ logo_url: logoUrl || null, updated_at: new Date().toISOString() }),
  });
}

// ── Errores controlados — catálogo en tabla, no mensajes genéricos ──────────
// error_catalog define título/mensaje/acción por código; error_log registra
// ocurrencias para monitoreo. Fallback local si la tabla aún no existe.
let errCatalogCache = null;
export async function errorControlado(code) {
  if (!errCatalogCache) {
    try {
      const rows = await rest("error_catalog?select=*");
      errCatalogCache = new Map((rows || []).map(r => [r.code, r]));
    } catch { errCatalogCache = new Map(); }
  }
  return errCatalogCache.get(code) || {
    code, titulo: "No se pudo completar", severidad: "error",
    mensaje: "Ocurrió un problema al procesar la operación.", accion: "Inténtalo nuevamente.",
  };
}
export function logErrorControlado(code, contexto = null, worldId = null) {
  rest("error_log", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ code, contexto, world_id: worldId, origen: "admin" }),
  }).catch(() => {});
}

// Widget de monitoreo (Gantt #97) — RedPontis ve las ocurrencias reales
// registradas por logErrorControlado en ambas apps (origen: admin | app).
export async function fetchErrorLog(limit = 200) {
  return rest(`error_log?select=*&order=created_at.desc&limit=${limit}`);
}
export async function fetchErrorCatalogMap() {
  const rows = await rest("error_catalog?select=*");
  return new Map((rows || []).map(r => [r.code, r]));
}

// ── Control de Accesos (Gantt #92) — sin hardware real: un operador escanea
// o tipea el código del usuario, mismo patrón que Asistencia de Kermesse.
export async function fetchAccesosMundo(worldId, limit = 30) {
  return rest(`access_log?world_id=eq.${worldId}&select=*&order=created_at.desc&limit=${limit}`);
}
export async function registrarAccesoRemote(worldId, userId, tipo, zona) {
  await rest("access_log", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ world_id: worldId, user_id: userId, tipo, zona: zona || null }),
  });
}

// ── Turnos de Control de Accesos — el operador marca cuándo toma y cuándo
// deja el puesto; el mundo ve esa ventana en su panel de monitoreo, no solo
// los registros de entrada/salida sueltos. Uno por zona: dos porterías
// pueden tener turnos abiertos al mismo tiempo sin pisarse.
export async function fetchTurnoAbiertoRemote(worldId, zona) {
  const zf = zona ? `zona=eq.${encodeURIComponent(zona)}` : `zona=is.null`;
  const rows = await rest(`access_shifts?world_id=eq.${worldId}&${zf}&fin_at=is.null&select=*&order=inicio_at.desc&limit=1`);
  return rows?.[0] || null;
}
export async function fetchTurnosMundo(worldId, limit = 20) {
  return rest(`access_shifts?world_id=eq.${worldId}&select=*&order=inicio_at.desc&limit=${limit}`);
}
export async function iniciarTurnoRemote(worldId, zona, operadorNombre) {
  const rows = await rest("access_shifts", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: worldId, zona: zona || null, operador_nombre: operadorNombre?.trim() || null }),
  });
  return rows?.[0] || null;
}
export async function cerrarTurnoRemote(shiftId) {
  await rest(`access_shifts?id=eq.${shiftId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ fin_at: new Date().toISOString() }),
  });
}

// ── Comercios (merchants) ────────────────────────────────────────────────────
// "+v || null" convertía un 0% (tarifa/fijo legítimamente cero, ej. un
// comercio sin comisión) en null ("sin override, usa el default del mundo")
// — un merchant configurado a propósito en 0% terminaba heredando la tarifa
// del mundo en su lugar. Solo null/"" cuentan como "sin definir".
const numOrNull = v => (v === "" || v == null ? null : +v);
export async function addMerchantRemote(mundoId, comercio) {
  const rows = await rest("merchants", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      world_id: mundoId, name: comercio.nombre,
      status: "activo",
      mdr_override: numOrNull(comercio.tarifa),
      fixed_fee_override: numOrNull(comercio.fijoTx),
      ruc: comercio.ruc || null, razon_social: comercio.razonSocial || null,
      direccion_fiscal: comercio.direccionFiscal || null,
      apoderado_nombre: comercio.apoderadoNombre || null, apoderado_documento: comercio.apoderadoDocumento || null, apoderado_correo: comercio.apoderadoCorreo || null,
      contacto_nombre: comercio.contactoNombre || null, contacto_documento: comercio.contactoDocumento || null, contacto_correo: comercio.contactoCorreo || null,
      banco: comercio.banco || null, cuenta_bancaria: comercio.cuentaBancaria || null, cci: comercio.cci || null,
      codigo: comercio.codigo || null, pos_pin: comercio.posPin || null,
    }),
  });
  return rows?.[0]?.id || null;
}
// El código es único por comercio (sin guión, fácil de tipear en el POS) —
// generarCodigoComercio() solo tiene ~900 combinaciones por slug de nombre,
// así que antes de aceptarlo hay que verificar que nadie más lo tenga.
export async function existeCodigoComercioRemote(codigo) {
  const rows = await rest(`merchants?codigo=eq.${encodeURIComponent(codigo)}&select=id&limit=1`);
  return (rows || []).length > 0;
}
// PIN de comercio o de mundo: nunca se compara en el cliente contra un valor
// leído de Supabase (eso es justo el hallazgo que exponía worlds.pos_pin en
// texto plano vía la llave anónima). Esta RPC hace la comparación server-side
// contra el hash y devuelve solo id/tipo/nombre — nunca el PIN.
export async function verificarPinOperadorRemote(codigo, pin) {
  const rows = await rest("rpc/verificar_pin_operador", {
    method: "POST",
    body: JSON.stringify({ p_codigo: codigo, p_pin: pin }),
  });
  return rows?.[0] || null;
}
export async function fetchMerchantsRemote(worldId) {
  return rest(`merchants?world_id=eq.${worldId}&select=*&order=created_at`);
}

// ── Eliminación segura de Comercio (nuevo, 29-jul): antes solo existía alta,
// nunca baja. Deshabilitar primero (deja de admitir compras — la app ya
// filtra merchants por status=eq.activo, así que este PATCH basta para
// sacarlo de la vitrina sin tocar código de la app) y solo se permite
// eliminar definitivamente si el chequeo de bloqueos sale limpio.
export async function actualizarEstadoMerchantRemote(merchantId, status) {
  await rest(`merchants?id=eq.${merchantId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
}
// Antes solo existía alta — corregir un RUC, cuenta bancaria o tarifa mal
// tipeada después de crear el comercio no tenía forma de hacerse desde acá
// (había que editar Supabase a mano). Mismo mapeo de campos que
// addMerchantRemote, en PATCH.
export async function actualizarMerchantRemote(merchantId, comercio) {
  await rest(`merchants?id=eq.${merchantId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      name: comercio.nombre,
      mdr_override: numOrNull(comercio.tarifa),
      fixed_fee_override: numOrNull(comercio.fijoTx),
      ruc: comercio.ruc || null, razon_social: comercio.razonSocial || null,
      direccion_fiscal: comercio.direccionFiscal || null,
      apoderado_nombre: comercio.apoderadoNombre || null, apoderado_documento: comercio.apoderadoDocumento || null, apoderado_correo: comercio.apoderadoCorreo || null,
      contacto_nombre: comercio.contactoNombre || null, contacto_documento: comercio.contactoDocumento || null, contacto_correo: comercio.contactoCorreo || null,
      banco: comercio.banco || null, cuenta_bancaria: comercio.cuentaBancaria || null, cci: comercio.cci || null,
      codigo: comercio.codigo || null, pos_pin: comercio.posPin || null,
    }),
  });
}
export async function eliminarMerchantRemote(merchantId) {
  await rest(`merchants?id=eq.${merchantId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
// No existe un estado "liquidado" persistido por comercio en ningún lado del
// sistema — generarLiquidaciones() (store.js) simula el volumen del mundo con
// un hash determinista, no lee transacciones reales, y no hay tabla de lotes
// de liquidación en Supabase. Por eso "ventas pendientes de liquidar" usa como
// proxy HONESTO las ventas reales del comercio desde el último corte TEÓRICO
// (según liquidacion_horaCorte configurado en el mundo) — no una liquidación
// efectivamente cerrada, porque esa noción no existe hoy. Documentado así en
// vez de fingir una verificación que el sistema no puede hacer de verdad.
const BNPL_ESTADOS_TERMINALES = new Set(["cerrado", "incobrable", "rechazado"]);
export async function verificarBloqueosEliminacionMerchant(worldId, merchantId, ultimoCorteISO) {
  const [contratos, ventas, reservas, hardware] = await Promise.all([
    rest(`bnpl_contratos?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&select=id,estado`).catch(() => []),
    rest(`transactions?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&type=eq.compra&created_at=gte.${ultimoCorteISO}&select=id,amount`).catch(() => []),
    rest(`menu_reservas?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&estado=eq.CONFIRMADA&fecha=gte.${ultimoCorteISO.slice(0, 10)}&select=id,monto`).catch(() => []),
    rest(`pos_devices?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&select=id,estado`).catch(() => []),
  ]);
  const bnplActivos = (contratos || []).filter(c => !BNPL_ESTADOS_TERMINALES.has(c.estado));
  const montoVentasPendientes = (ventas || []).reduce((a, t) => a + (+t.amount || 0), 0);
  const montoReservas = (reservas || []).reduce((a, r) => a + (+r.monto || 0), 0);
  return {
    bnplActivos: bnplActivos.length,
    ventasPendientes: { count: (ventas || []).length, monto: montoVentasPendientes },
    reservasFuturas: { count: (reservas || []).length, monto: montoReservas },
    hardwareAsignado: (hardware || []).length,
    bloqueaDuro: bnplActivos.length > 0 || montoVentasPendientes > 0 || (reservas || []).length > 0,
  };
}

// Eliminar un MUNDO no tenía ningún chequeo (a diferencia de eliminar un
// comercio, que sí verifica BNPL/ventas/reservas/hardware antes de dejar
// borrar) — un mundo contiene N comercios, sus transacciones, y sobre todo
// dinero real sentado en wallets.balance de titulares y dependientes. Un
// DELETE sobre worlds no mueve ese saldo a ningún lado — solo deja de haber
// mundo al que pertenezca. Mismo patrón de "chequeo real antes de bloquear",
// a escala de mundo (hallado en auditoría E2E multi-rol, ago-2026).
export async function verificarBloqueosEliminacionMundo(worldId) {
  const [wallets, contratos, liquidaciones, reservas, eventos, hardware] = await Promise.all([
    rest(`wallets?world_id=eq.${worldId}&select=balance`).catch(() => []),
    rest(`bnpl_contratos?world_id=eq.${worldId}&select=id,estado`).catch(() => []),
    rest(`liquidaciones?world_id=eq.${worldId}&estado=in.(PENDIENTE,RETENIDO)&select=id,neto`).catch(() => []),
    rest(`menu_reservas?world_id=eq.${worldId}&estado=eq.CONFIRMADA&fecha=gte.${new Date().toISOString().slice(0, 10)}&select=id,monto`).catch(() => []),
    rest(`events?world_id=eq.${worldId}&select=id`).catch(() => []),
    rest(`pos_devices?world_id=eq.${worldId}&select=id`).catch(() => []),
  ]);
  const bnplActivos = (contratos || []).filter(c => !BNPL_ESTADOS_TERMINALES.has(c.estado));
  const saldoTotalWallets = (wallets || []).reduce((a, w) => a + (+w.balance || 0), 0);
  const montoLiquidacionesPendientes = (liquidaciones || []).reduce((a, l) => a + (+l.neto || 0), 0);
  const montoReservas = (reservas || []).reduce((a, r) => a + (+r.monto || 0), 0);
  const eventIds = (eventos || []).map(e => e.id);
  let ticketsEmitidos = 0;
  if (eventIds.length) {
    const tickets = await rest(`event_tickets?event_id=in.(${eventIds.join(",")})&select=id`).catch(() => []);
    ticketsEmitidos = (tickets || []).length;
  }
  return {
    saldoTotalWallets, walletsConSaldo: (wallets || []).filter(w => (+w.balance || 0) > 0).length,
    bnplActivos: bnplActivos.length,
    liquidacionesPendientes: { count: (liquidaciones || []).length, monto: montoLiquidacionesPendientes },
    reservasFuturas: { count: (reservas || []).length, monto: montoReservas },
    ticketsEmitidos,
    hardwareAsignado: (hardware || []).length,
    bloqueaDuro: saldoTotalWallets > 0 || bnplActivos.length > 0 || (liquidaciones || []).length > 0 || (reservas || []).length > 0 || ticketsEmitidos > 0,
  };
}

// ── Solicitudes de Alta de Comercio (Gantt #52/#57): BackOffice Mundo envía,
// Admin RP aprueba/rechaza en Gobierno.jsx (misma cola cross-mundo que eventos).
export async function crearSolicitudComercio(worldId, worldNombre, data) {
  await rest("merchant_requests", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      world_id: worldId, world_nombre: worldNombre, nombre: data.nombre, rubro_id: data.rubro || null,
      ruc: data.ruc || null, razon_social: data.razonSocial || null, direccion_fiscal: data.direccionFiscal || null,
      apoderado_nombre: data.apoderadoNombre || null, apoderado_documento: data.apoderadoDocumento || null, apoderado_correo: data.apoderadoCorreo || null,
      contacto_nombre: data.contactoNombre || null, contacto_documento: data.contactoDocumento || null, contacto_correo: data.contactoCorreo || null,
      banco: data.banco || null, cuenta_bancaria: data.cuentaBancaria || null, cci: data.cci || null,
      tarifa: +data.tarifa || null, fijo_tx: +data.fijoTx || null, pos_solicitados: +data.pos || 0,
      estado: "PENDIENTE",
    }]),
  });
}
export async function fetchSolicitudesComercioGlobal() {
  return rest(`merchant_requests?estado=eq.PENDIENTE&select=*&order=created_at.desc`);
}
export async function fetchSolicitudesComercioMundo(worldId) {
  return rest(`merchant_requests?world_id=eq.${worldId}&select=*&order=created_at.desc`);
}
export async function resolverSolicitudComercio(id, estado, motivoRechazo = null) {
  const body = { estado };
  if (estado === "RECHAZADO") body.motivo_rechazo = motivoRechazo;
  await rest(`merchant_requests?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

// ── Historial de resueltos (30-jul) — cola de aprobaciones cross-mundo: antes
// solo se veían los pendientes; una vez aprobado/rechazado el ítem
// desaparecía sin dejar rastro visible en el propio panel de Gobierno.
export async function fetchEventosResueltosGlobal(limit = 30) {
  return rest(`events?estado=in.(PUBLICADO,RECHAZADO)&select=*&order=updated_at.desc&limit=${limit}`);
}
export async function fetchSolicitudesComercioResueltasGlobal(limit = 30) {
  return rest(`merchant_requests?estado=in.(APROBADO,RECHAZADO)&select=*&order=created_at.desc&limit=${limit}`);
}

// ── Reconciliación: comercios creados/editados DIRECTO en Supabase (por otra
// sesión/otro panel) no existen en el store local (localStorage) del admin —
// sin esto, sus paneles (Cobrar, Mi catálogo) no son alcanzables desde aquí.
// Usa el UUID remoto como id local: un solo identificador, sin duplicar.
export async function reconciliarComerciosMundo(worldId, comerciosLocales) {
  const remotos = await fetchMerchantsRemote(worldId);
  const localIds = new Set((comerciosLocales || []).map(c => c.supabaseId || c.id));
  const nuevos = (remotos || [])
    .filter(r => r.status !== "inactivo" && !localIds.has(r.id))
    .map(r => ({
      id: r.id, supabaseId: r.id, mundoId: worldId, nombre: r.name,
      rubro: "otro", tarifa: r.mdr_override ?? 1.5, fijoTx: r.fixed_fee_override ?? 0.10,
      pos: 0, posSolicitados: 0, estado: "ACTIVO", visibleEnApp: r.visible_en_app !== false,
      createdAt: Date.parse(r.created_at) || Date.now(),
    }));
  return nuevos;
}

// ── Motor de Eventos (Caso 3) ────────────────────────────────────────────────
export async function upsertEventoRemote(ev) {
  await rest("events?on_conflict=id", {
    method: "POST", headers: upsertHeaders,
    body: JSON.stringify([{
      id: ev.id,
      world_id: ev.mundoId,
      organizador: ev.organizador?.nombre || ev.organizador || null,
      titulo: ev.titulo,
      descripcion: ev.descripcion || null,
      tipo: ev.tipoEvento || "kermesse",
      categoria: ev.categoria || null,
      fecha: ev.fecha || null,
      hora: ev.hora || null,
      lugar: ev.lugar || null,
      aforo_total: +ev.aforo || 0,
      aforo_tipo: ev.aforoTipo || "general",
      privado: ev.privado === true,
      estado: ev.estado || "PUBLICADO",
      moneda: ev.moneda || "PEN",
      // Criterio del evento — B2B (organizador dedicado) | B2C (usuario final)
      // | Embebido (RedPontis/Sponsor lo publica directo). Techo: modosDeMundo(m).
      modo: ev.modo || "embebido",
      organizador_id: ev.organizadorId || null,
      imagen_url: ev.imagenUrl || null,
      mapa_url: ev.mapaUrl || null,
      mapa_nombre: ev.mapaNombre || null,
      ux_components: ev.uxComponents || ["hero", "entradas", "agenda", "marketplace"],
      updated_at: new Date().toISOString(),
    }]),
  });
}

// Eventos creados directo en Supabase / otro browser-sesión admin — mismo gap
// que refreshMundosLive(). Ver refreshEventosLive() en store.js.
export async function fetchEventosDeMundo(worldId) {
  return rest(`events?world_id=eq.${worldId}&select=*&order=created_at.desc`);
}

// Landing pública de JOI Solutions (cross-mundo) — mismo criterio real que
// ya usa el marketplace de la superapp (fetchEventosLive: PUBLICADO + no
// privado), sin filtrar por world_id porque la landing muestra eventos de
// TODO el ecosistema, no de un mundo puntual.
export async function fetchEventosPublicosLanding() {
  return rest(`events?estado=eq.PUBLICADO&privado=eq.false&select=*&order=fecha`);
}
export async function fetchEventoPublico(eventId) {
  const rows = await rest(`events?id=eq.${eventId}&estado=eq.PUBLICADO&privado=eq.false&select=*`);
  return rows?.[0] || null;
}

export async function syncTicketTypesRemote(eventId, tipos) {
  // Reemplazo completo: la edición del drawer define el set vigente.
  const existentes = await rest(`event_ticket_types?event_id=eq.${eventId}&select=id`);
  const keep = new Set((tipos || []).map(t => t.supabaseId).filter(Boolean));
  for (const row of existentes || []) {
    if (!keep.has(row.id)) {
      await rest(`event_ticket_types?id=eq.${row.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    }
  }
  const out = [];
  for (const t of tipos || []) {
    const body = {
      event_id: eventId, nombre: t.nombre, descripcion: t.descripcion || t.incluye || null,
      precio: +t.precio || 0, moneda: t.moneda || "PEN", cupos: +t.cupos || 0,
      min_por_compra: +t.minPorCompra || 1, max_por_compra: +t.maxPorCompra || 4,
      venta_desde: t.ventaDesde || null, venta_hasta: t.ventaHasta || null,
      validacion: "QR",
      permite_reingreso: t.permiteReingreso !== false,
      vigencia_hasta: t.vigenciaHasta || null,
      preventa: !!t.preventa, precompra: !!t.precompra, prereserva: !!t.prereserva,
    };
    if (t.supabaseId) {
      await rest(`event_ticket_types?id=eq.${t.supabaseId}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body),
      });
      out.push({ ...t });
    } else {
      const rows = await rest("event_ticket_types", {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body),
      });
      out.push({ ...t, supabaseId: rows[0].id });
    }
  }
  return out;
}

export async function fetchTicketsDeEvento(eventId) {
  return rest(`event_tickets?event_id=eq.${eventId}&select=*&order=created_at.desc`);
}
// Recibe el ticket completo (no solo el id): necesita event_id para generar
// el nuevo qr_code con el mismo formato que comprarTicketsLive.
export async function setTicketEstado(ticket, estado) {
  const patch = { estado };
  if (estado === "checkin") {
    patch.checkin_at = new Date().toISOString();
    // Rotación real del QR en cada ingreso (spec: "cada ingreso invalida el
    // QR anterior y genera uno nuevo" — evita fraude por duplicación de
    // código, antes el mismo qr_code se reutilizaba indefinidamente).
    patch.qr_code = `JOI-${ticket.event_id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  }
  if (estado === "checkout") patch.checkout_at = new Date().toISOString();
  await rest(`event_tickets?id=eq.${ticket.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch),
  });
}
export async function fetchTicketTypesDeEvento(eventId) {
  return rest(`event_ticket_types?event_id=eq.${eventId}&select=*&order=precio`);
}
// Existía pero nunca estaba cableado a ningún botón real — un evento en
// borrador o rechazado, con 0 entradas vendidas, no tenía forma de
// eliminarse; solo quedaba "editar y reenviar" o pausado para siempre.
// Tragaba el error en silencio, igual que deleteWorldRemote antes de su fix.
export async function deleteEventoRemote(eventId) {
  await rest(`events?id=eq.${eventId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ── BNPL (Caso 1 — Mok / Hiraoka) ───────────────────────────────────────────
export async function upsertProgramaBNPL(worldId, merchantId, programa) {
  await rest("bnpl_programa_comercio?on_conflict=world_id,merchant_id", {
    method: "POST", headers: upsertHeaders,
    body: JSON.stringify([{
      world_id: worldId, merchant_id: merchantId,
      merchant_nombre: programa.merchantNombre || null,
      cuotas_activas: programa.cuotasActivas || [3],
      comision_pct: +programa.comisionPct || 5,
      revenue_share_pct: +programa.revenueSharePct || 30,
      productos_financiables: programa.productosFinanciables || [],
      gestion_mora: programa.gestionMora || "sin_cargo_suspension",
      mora_pct: +programa.moraPct || 0,
      frecuencia: programa.frecuencia || "mensual",
      dias_personalizados: programa.frecuencia === "personalizada" ? (+programa.diasPersonalizados || null) : null,
      dias_gracia: programa.diasGracia != null ? +programa.diasGracia : null,
      alcance: programa.alcance || "puntuales",
      categorias: programa.categorias || [],
      cuota_inicial: +programa.cuotaInicial || 0,
      activo: programa.activo !== false,
    }]),
  });
}
// Campañas temporales de Productos Financiables (Gantt #61) — vigentes por
// rango de fecha, adicionan productos financiables sobre el alcance base.
export async function fetchCampanasBNPL(worldId, merchantId) {
  return rest(`bnpl_campanas?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&select=*&order=created_at.desc`);
}
export async function crearCampanaBNPL(worldId, merchantId, data) {
  const rows = await rest("bnpl_campanas", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      world_id: worldId, merchant_id: merchantId, nombre: data.nombre,
      fecha_inicio: data.fechaInicio || null, fecha_fin: data.fechaFin || null,
      productos: data.productos || [],
    }]),
  });
  return rows?.[0] || null;
}
export async function eliminarCampanaBNPL(id) {
  await rest(`bnpl_campanas?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
export async function fetchProgramaBNPL(worldId, merchantId = null) {
  const q = merchantId
    ? `bnpl_programa_comercio?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&select=*`
    : `bnpl_programa_comercio?world_id=eq.${worldId}&select=*`;
  return rest(q);
}
export async function fetchContratosBNPL(worldId, merchantId = null) {
  const base = `bnpl_contratos?world_id=eq.${worldId}&select=*&order=created_at.desc`;
  return rest(merchantId ? `${base}&merchant_id=eq.${merchantId}` : base);
}
export async function updateContratoBNPL(id, patch) {
  await rest(`bnpl_contratos?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}
// Administración de Solicitudes (Gantt #31) — antes la evaluación crediticia
// era 100% self-service en la app (un timeout falso que siempre aprobaba,
// sin que el comercio la viera ni tuviera contexto del usuario). Ahora una
// solicitud con evaluación requerida nace "pendiente_aprobacion" y el
// comercio la resuelve aquí, con visibilidad del historial del usuario.
// Solicitud BNPL iniciada por el operador en el punto de venta (App Operador,
// Gantt #45) — mismo esquema que crearContratoBNPLLive (app), pero disponible
// desde el admin porque acá el flujo lo dispara el operador, no el usuario.
export async function crearSolicitudBNPLDesdeOperador(payload) {
  const rows = await rest("bnpl_contratos", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return rows?.[0] || null;
}
// ── Menú — catálogo de platos + programación semanal ────────────────────
// Distinto de `products` (vitrina general de compras puntuales): un plato de
// Menú tiene alérgenos y se programa por día de la semana con recurrencia.
// Genérico a propósito — cualquier mundo con capacidad "menu" puede usarlo,
// no es específico al caso Raimondi.
export async function fetchMenuItemsMerchant(merchantId) {
  return rest(`menu_items?merchant_id=eq.${merchantId}&select=*&order=created_at.desc`);
}
export async function crearMenuItemRemote(payload) {
  const rows = await rest("menu_items", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  return rows?.[0] || null;
}
export async function actualizarMenuItemRemote(id, patch) {
  await rest(`menu_items?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}
export async function eliminarMenuItemRemote(id) {
  // menu_reservas.items no referencia menu_items — es un snapshot jsonb, no
  // queda huérfano. menu_programacion sí referencia menu_item_id y no se
  // limpiaba sola: borrar el plato dejaba filas de programación fantasma
  // (Task E2E cross-role, ago-2026). Se borra primero por si la FK real
  // bloquearía el DELETE del plato con programación todavía activa.
  await rest(`menu_programacion?menu_item_id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
  await rest(`menu_items?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
// menu_reservas.items es un jsonb con snapshots {id, nombre, precio, cantidad}
// (ver crearReservaMenu en joi360-app) — no hay FK, así que se busca por
// containment. Antes de borrar un plato del catálogo hay que saber si alguien
// ya lo reservó para una fecha futura (Task E2E cross-role, ago-2026): borrarlo
// hoy no rompe el histórico de esa reserva (el snapshot sobrevive), pero el
// plato desaparecería del catálogo del comercio sin que nadie del mundo se
// entere de que ya hay una entrega comprometida.
export async function fetchReservasFuturasDePlato(merchantId, menuItemId, hoyISO) {
  const filtro = encodeURIComponent(JSON.stringify([{ id: menuItemId }]));
  return rest(`menu_reservas?merchant_id=eq.${merchantId}&estado=eq.CONFIRMADA&fecha=gte.${hoyISO}&items=cs.${filtro}&select=id,fecha,beneficiario_nombre`);
}
export async function fetchProgramacionMerchant(merchantId) {
  return rest(`menu_programacion?merchant_id=eq.${merchantId}&select=*`);
}
// Reemplaza toda la programación de un plato en un solo paso (borra + inserta)
// en vez de diffear día por día — más simple y suficientemente barato para
// el tamaño real de este catálogo (unos pocos platos por comercio).
export async function guardarProgramacionItem(worldId, merchantId, menuItemId, diasSemana, cuposMax) {
  await rest(`menu_programacion?menu_item_id=eq.${menuItemId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!diasSemana.length) return;
  const rows = diasSemana.map(dia => ({ world_id: worldId, merchant_id: merchantId, menu_item_id: menuItemId, dia_semana: dia, cupos_max: cuposMax || null }));
  await rest("menu_programacion", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
}
export async function fetchReservasMenuMerchant(merchantId, fecha) {
  return rest(`menu_reservas?merchant_id=eq.${merchantId}&fecha=eq.${fecha}&select=*&order=created_at.desc`);
}
// El cobro ya ocurre en la app (crearReservaMenu -> mover_saldo_wallet) — esto
// es la acción que faltaba en el POS/operador: cerrar el círculo marcando la
// reserva YA PAGADA como entregada/retirada, mismo patrón que la validación
// de entrada de Eventos (algo pagado se consume/confirma, no se vuelve a cobrar).
export async function marcarMenuReservaEntregadaRemote(id) {
  await rest(`menu_reservas?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "ENTREGADA", entregado_at: new Date().toISOString() }),
  });
}

// ── Promociones — cupón QR (Gantt #38-#41, Backlog Capítulo 2) ─────────────
// Alcance mínimo viable confirmado por la usuaria 28-jul: antes TabPromos
// (MundoDetail.jsx) y PromocionesTemplate (app) eran 100% mock local
// (st.promos en memoria) — 'promociones' seguía en MODULOS_PROXIMAMENTE por
// eso. Ahora hay tabla real; el catálogo sigue en MODULOS_PROXIMAMENTE
// porque banners/push/A-B testing (el resto del spec) siguen sin construir.
export async function fetchPromocionesMundo(worldId) {
  return rest(`promociones?world_id=eq.${worldId}&select=*&order=created_at.desc`);
}
export async function crearPromocionRemote(payload) {
  const rows = await rest("promociones", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return rows?.[0] || null;
}
export async function actualizarPromocionRemote(id, patch) {
  await rest(`promociones?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}
export async function eliminarPromocionRemote(id) {
  await rest(`promociones?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
// Canje en el punto de venta: el operador teclea/escanea el código, se valida
// vigencia/estado/cupos disponibles y recién ahí se incrementa el uso.
export async function canjearCuponRemote(codigoQr, worldId, userId) {
  const codigo = (codigoQr || "").trim().toUpperCase();
  if (!codigo) return { ok: false, motivo: "codigo_vacio" };
  const rows = await rest(`promociones?codigo_qr=eq.${encodeURIComponent(codigo)}&world_id=eq.${worldId}&select=*`);
  const promo = rows?.[0];
  if (!promo) return { ok: false, motivo: "no_encontrado" };
  if (promo.estado !== "VIGENTE") return { ok: false, motivo: "pausada" };
  if (promo.vigencia_hasta && promo.vigencia_hasta < new Date().toISOString().slice(0, 10)) return { ok: false, motivo: "vencida" };
  if (promo.usos_max != null && promo.usos_actuales >= promo.usos_max) return { ok: false, motivo: "agotada" };
  await rest(`promociones?id=eq.${promo.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ usos_actuales: promo.usos_actuales + 1 }),
  });
  await rest("promociones_canjes", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ promocion_id: promo.id, world_id: worldId, user_id: userId || "operador" }),
  });
  return { ok: true, promo };
}

export async function resolverSolicitudBNPL(id, estado, motivo = null) {
  const patch = { estado };
  if (estado === "rechazado") patch.rechazo_motivo = motivo || null;
  await rest(`bnpl_contratos?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}
export async function crearNotificacionBNPL(worldId, merchantId, contratoId, mensaje, tipo = "suspension") {
  await rest("bnpl_notificaciones", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ world_id: worldId, merchant_id: merchantId, contrato_id: contratoId, tipo, mensaje }]),
  });
}
export async function fetchNotificacionesBNPL(worldId, merchantId, soloNoLeidas = true) {
  const base = `bnpl_notificaciones?world_id=eq.${worldId}&merchant_id=eq.${merchantId}&select=*&order=created_at.desc`;
  return rest(soloNoLeidas ? `${base}&leida=eq.false` : base);
}
export async function marcarNotificacionBNPLLeida(id) {
  await rest(`bnpl_notificaciones?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ leida: true }) });
}

// Ciclo de vida del financiamiento (Gantt #27-#29) — misma lógica que
// joi360-app/src/supabaseClient.js (duplicada a propósito: cada front evalúa
// los contratos que ve — el admin los de todo el mundo, la app los del user).
export function evaluarCicloContrato(c) {
  // Solicitudes que aún no fueron aprobadas por el comercio no entran al ciclo
  // de pago (Gantt #31) — no tienen cuota 1 cobrada, evaluarlas por fecha de
  // vencimiento las marcaría "vencida"/"suspendido" antes de siquiera existir.
  if (c.estado === "pendiente_aprobacion" || c.estado === "rechazado") return { contrato: c, patch: null, nuevaSuspension: false };
  const hoy = new Date().toISOString().slice(0, 10);
  let cronogramaTocado = false;
  const cronograma = (c.cronograma || []).map(q => {
    if (q.estado !== "pendiente") return q;
    const limite = new Date(q.fecha);
    limite.setDate(limite.getDate() + (c.dias_gracia || 0));
    if (limite.toISOString().slice(0, 10) < hoy) { cronogramaTocado = true; return { ...q, estado: "vencida" }; }
    return q;
  });
  const hayVencida = cronograma.some(q => q.estado === "vencida");
  const estado = (c.estado !== "cerrado" && hayVencida)
    ? ((c.gestion_mora || "sin_cargo_suspension") === "sin_cargo_suspension" ? "suspendido" : "en_mora")
    : c.estado;
  const nuevaSuspension = estado === "suspendido" && c.estado !== "suspendido";
  return { contrato: { ...c, cronograma, estado }, patch: (cronogramaTocado || estado !== c.estado) ? { cronograma, estado } : null, nuevaSuspension };
}
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

// ── Gestión del Financiamiento — 9 acciones administrativas sobre un
// contrato ya firmado (Caso BNPL, roadmap Flujos UX). Todas parten del mismo
// patrón: recalculan cronograma/estado con updateContratoBNPL() y registran
// una fila en bnpl_notificaciones (tabla ya existente, reusada con nuevos
// valores de `tipo`) — es la forma en que "notifica a RedPontis" hoy, igual
// que ya hacía la suspensión automática por mora.
// Gap documentado a propósito: ninguna de estas dispara una re-aceptación
// interactiva del usuario en la app (el doc lo pide) — construir ese flujo es
// una superficie nueva completa en joi360-app, fuera de esta pasada.
const cuotasPendientes = c => (c.cronograma || []).filter(q => q.estado === "pendiente" || q.estado === "vencida");
export const saldoPendienteBNPL = c => cuotasPendientes(c).reduce((a, q) => a + (+q.monto || 0), 0);

function generarCuotas(desdeN, cantidad, montoPorCuota, primerVenc) {
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date(primerVenc);
    fecha.setMonth(fecha.getMonth() + i);
    return { n: desdeN + i, fecha: fecha.toISOString().slice(0, 10), monto: montoPorCuota, estado: "pendiente" };
  });
}

// 1) Reprogramar cuotas — redistribuye el saldo pendiente en un nuevo número de cuotas futuras.
export async function reprogramarCuotasBNPL(c, nuevasCuotas, primerVenc) {
  const saldo = saldoPendienteBNPL(c);
  const pagadas = (c.cronograma || []).filter(q => q.estado === "pagada");
  const montoPorCuota = +(saldo / nuevasCuotas).toFixed(2);
  const cronograma = [...pagadas, ...generarCuotas(pagadas.length + 1, nuevasCuotas, montoPorCuota, primerVenc)];
  await updateContratoBNPL(c.id, { cronograma, cuotas: cronograma.length, estado: "firmado" });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Cuotas reprogramadas en "${c.producto}": ${nuevasCuotas} cuotas nuevas de S/ ${montoPorCuota.toFixed(2)} desde ${primerVenc}.`, "reprogramacion");
}

// 2) Modificar fecha de vencimiento de una cuota puntual.
export async function modificarFechaCuotaBNPL(c, n, nuevaFecha) {
  const cronograma = (c.cronograma || []).map(q => q.n === n
    ? { ...q, fecha: nuevaFecha, estado: q.estado === "vencida" ? "pendiente" : q.estado } : q);
  await updateContratoBNPL(c.id, { cronograma });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Cuota ${n} de "${c.producto}" movida a ${nuevaFecha}.`, "modificacion_fecha");
}

// 3) Refinanciar saldo pendiente — como reprogramar, pero puede además cambiar la tasa aplicada.
export async function refinanciarBNPL(c, nuevasCuotas, primerVenc, nuevoInteresPct) {
  const saldo = saldoPendienteBNPL(c);
  const conInteres = nuevoInteresPct ? saldo * (1 + nuevoInteresPct / 100) : saldo;
  const pagadas = (c.cronograma || []).filter(q => q.estado === "pagada");
  const montoPorCuota = +(conInteres / nuevasCuotas).toFixed(2);
  const cronograma = [...pagadas, ...generarCuotas(pagadas.length + 1, nuevasCuotas, montoPorCuota, primerVenc)];
  await updateContratoBNPL(c.id, { cronograma, cuotas: cronograma.length, estado: "firmado", interes_pct: nuevoInteresPct ?? c.interes_pct });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Refinanciado "${c.producto}": saldo de S/ ${saldo.toFixed(2)} en ${nuevasCuotas} cuotas nuevas de S/ ${montoPorCuota.toFixed(2)}.`, "refinanciamiento");
}

// 4) Condonar intereses — recalcula las cuotas pendientes quitando el % de interés del contrato.
export async function condonarInteresesBNPL(c) {
  const interesPct = +c.interes_pct || 0;
  if (!interesPct) return;
  const cronograma = (c.cronograma || []).map(q => q.estado === "pagada" ? q : { ...q, monto: +(q.monto / (1 + interesPct / 100)).toFixed(2) });
  await updateContratoBNPL(c.id, { cronograma, interes_pct: 0 });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Intereses condonados en las cuotas pendientes de "${c.producto}".`, "condonacion");
}

// 5) Eliminar mora — limpia cuotas vencidas y reactiva el contrato suspendido/en mora.
export async function eliminarMoraBNPL(c) {
  const cronograma = (c.cronograma || []).map(q => q.estado === "vencida" ? { ...q, estado: "pendiente" } : q);
  await updateContratoBNPL(c.id, { cronograma, estado: "firmado" });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Mora eliminada — contrato de "${c.producto}" reactivado.`, "eliminacion_mora");
}

// 6) Aplicar descuento extraordinario — reduce el saldo pendiente en un monto fijo, prorrateado.
export async function aplicarDescuentoBNPL(c, montoDescuento) {
  const saldo = saldoPendienteBNPL(c);
  if (saldo <= 0) return;
  const factor = Math.max(0, (saldo - montoDescuento) / saldo);
  const cronograma = (c.cronograma || []).map(q => (q.estado === "pendiente" || q.estado === "vencida")
    ? { ...q, monto: +(q.monto * factor).toFixed(2) } : q);
  await updateContratoBNPL(c.id, { cronograma });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Descuento extraordinario de S/ ${montoDescuento.toFixed(2)} aplicado a "${c.producto}".`, "descuento");
}

// 7) Registrar pago manual de una cuota puntual (ej. pago en efectivo fuera del app).
export async function registrarPagoManualBNPL(c, n) {
  const cronograma = (c.cronograma || []).map(q => q.n === n ? { ...q, estado: "pagada", pagada_manual: true } : q);
  const quedanPendientes = cronograma.some(q => q.estado !== "pagada");
  await updateContratoBNPL(c.id, { cronograma, estado: quedanPendientes ? c.estado : "cerrado" });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Pago manual registrado: cuota ${n} de "${c.producto}".`, "pago_manual");
}

// 8) Cancelar anticipadamente — cierra el contrato; las cuotas pendientes quedan canceladas.
export async function cancelarAnticipadoBNPL(c) {
  const cronograma = (c.cronograma || []).map(q => q.estado === "pagada" ? q : { ...q, estado: "cancelada" });
  await updateContratoBNPL(c.id, { cronograma, estado: "cerrado" });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Contrato de "${c.producto}" cancelado anticipadamente.`, "cancelacion");
}

// 9) Declarar incobrable — marca el contrato como pérdida, saca las cuotas pendientes de cobranza activa.
export async function declararIncobrableBNPL(c) {
  const saldo = saldoPendienteBNPL(c);
  const cronograma = (c.cronograma || []).map(q => q.estado === "pagada" ? q : { ...q, estado: "incobrable" });
  await updateContratoBNPL(c.id, { cronograma, estado: "incobrable" });
  await crearNotificacionBNPL(c.world_id, c.merchant_id, c.id,
    `Contrato de "${c.producto}" declarado incobrable — saldo de S/ ${saldo.toFixed(2)} dado de baja.`, "incobrable");
}

// ── Cola de aprobación de eventos (release gate de RedPontis por mundo) ─────
export async function fetchEventosPendientes(worldId) {
  return rest(`events?world_id=eq.${worldId}&estado=eq.PENDIENTE_APROBACION&select=*&order=created_at.desc`);
}
// Cola global (Gantt #101, Gobierno.jsx) — misma tabla, sin filtrar por mundo,
// para la vista de aprobaciones a nivel RedPontis (cross-mundo).
export async function fetchEventosPendientesGlobal() {
  return rest(`events?estado=eq.PENDIENTE_APROBACION&select=*&order=created_at.desc`);
}
// Reportes RedPontis cross-mundo (Gantt #81 — eventos/entradas/recaudación):
// mismas tablas que ya usa el reporte por-mundo, sin filtrar por world_id.
export async function fetchEventosGlobalTodos() {
  return rest(`events?select=*&order=fecha.desc`);
}
export async function fetchTicketsGlobalTodos() {
  return rest(`event_tickets?select=*`);
}
export async function setEventoEstadoRemote(eventId, estado, motivoRechazo = null) {
  const body = { estado, updated_at: new Date().toISOString() };
  if (estado === "RECHAZADO") body.motivo_rechazo = motivoRechazo;
  await rest(`events?id=eq.${eventId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

// ── Alertas al mundo (30-jul) — antes rechazar una aprobación (evento o
// solicitud de comercio) no dejaba ningún rastro visible para el sponsor
// afectado; ahora cada rechazo genera una alerta real que su dashboard lee.
export async function crearAlertaMundo(worldId, tipo, titulo, mensaje, referenciaId = null) {
  await rest("world_alerts", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ world_id: worldId, tipo, titulo, mensaje, referencia_id: referenciaId }),
  });
}
export async function fetchAlertasMundo(worldId, limit = 50) {
  return rest(`world_alerts?world_id=eq.${worldId}&select=*&order=created_at.desc&limit=${limit}`);
}
export async function marcarAlertaMundoLeida(id) {
  await rest(`world_alerts?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ leida: true }) });
}

// ── Publicación del Catálogo Global (Nivel 1) a Supabase ────────────────────
// Empuja MODULE_CATALOG → capacities + capacity_feature_flags para que la
// superapp renderice cualquier capacidad nueva sin tocar su código.
export async function syncCatalogRemote(catalog, uxMap = {}) {
  setSyncStatus("syncing");
  try {
    // capacities.tier/name/category no admiten NULL — un solo registro
    // corrupto (ej. un catalogoOverrides viejo sin tier) tumbaba el POST
    // completo (Postgres rechaza todo el batch, no solo la fila mala), así
    // que el resto del catálogo tampoco se publicaba. Se rellena con
    // defaults seguros en vez de fallar en bloque.
    await rest("capacities?on_conflict=id", {
      method: "POST", headers: upsertHeaders,
      body: JSON.stringify(catalog.map(c => ({
        id: c.id, name: c.name || c.id, tier: c.tier || "OPCIONAL", category: c.category || "Mixto",
        description: c.desc || null, icon: c.icon || "extension",
        active_by_default: c.tier === "CORE", forced_active: c.id === "wallet",
        version: "1.0", status: "activo",
      }))),
    });
    let flags = 0, uxAsignados = 0;
    for (const c of catalog) {
      for (const sv of (c.servicios || [])) {
        if (typeof sv === "string") continue; // servicios legados sin id estable
        const ux = uxMap[`${c.id}:${sv.id}`] || null;
        try { await ensureGlobalFlag(c.id, sv.id, sv.nombre, sv.desc || null, ux); flags++; } catch {}
        // Activar ux_component también en flags ya existentes (Schema Registry)
        if (ux) {
          try {
            await rest(`capacity_feature_flags?capacity_id=eq.${c.id}&flag_code=eq.${encodeURIComponent(sv.id)}`, {
              method: "PATCH", headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ ux_component: ux }),
            });
            uxAsignados++;
          } catch {}
        }
      }
    }
    setSyncStatus("ok");
    return { capacidades: catalog.length, flags, uxAsignados };
  } catch (e) {
    setSyncStatus("error", e.message);
    throw e;
  }
}

// ── Liquidación real (Gantt nuevo, 29-jul): antes generarLiquidaciones()
// (store.js) simulaba el volumen con un hash determinista y el lote solo
// vivía en memoria local — nunca en Supabase. Reemplazado por lectura real
// de `transactions` y persistencia real en la tabla `liquidaciones`
// (unique world_id+fecha, upsert idempotente para que "Forzar corte" no
// duplique el lote del día).
export async function fetchTodasLiquidacionesRemote() {
  return rest(`liquidaciones?select=*&order=fecha.desc`);
}

// ── Campanita de notificaciones (Task #170) ─────────────────────────────
// No hay una tabla de "notificaciones" separada que mantener sincronizada
// con cada cola real (eso duplicaría la fuente de verdad y podría
// desalinearse) — la notificación ES el item pendiente en su propia tabla.
// Un solo fetch agregado junta las 4 colas que ya existían dispersas
// (Aprobaciones, Hardware, Soporte, Liquidación) para la campanita y los
// badges del sidebar.
export async function fetchResumenNotificacionesRedPontis() {
  const [eventos, comercios, equipos, lotesNfc, banditasCobro, liquidaciones] = await Promise.all([
    rest(`events?estado=eq.PENDIENTE_APROBACION&select=id,titulo,world_id,created_at`).catch(() => []),
    rest(`merchant_requests?estado=eq.PENDIENTE&select=id,nombre,world_id,created_at`).catch(() => []),
    rest(`hardware_requests?estado=eq.pendiente&select=id,cantidad,modelo_nombre,world_id,created_at`).catch(() => []),
    rest(`nfc_band_requests?estado=eq.pendiente&select=id,cantidad,world_id,created_at`).catch(() => []),
    rest(`nfc_asignaciones?estado_pago=eq.pendiente&select=id,cantidad,monto_total,world_id,created_at`).catch(() => []),
    rest(`liquidaciones?estado=eq.RETENIDO&select=id,world_id,neto,created_at`).catch(() => []),
  ]);
  const aprobaciones = (eventos || []).length + (comercios || []).length;
  const hardware = (equipos || []).length + (lotesNfc || []).length + (banditasCobro || []).length;
  const soporte = 0; // se completa client-side con st.tickets (ya vive en el store, sin fetch aparte)
  return {
    aprobaciones, hardware, liquidacion: (liquidaciones || []).length, soporte,
    detalle: { eventos, comercios, equipos, lotesNfc, banditasCobro, liquidaciones },
  };
}
export async function fetchLiquidacionesMundoRemote(worldId) {
  return rest(`liquidaciones?world_id=eq.${worldId}&select=*&order=fecha.desc`);
}
export async function fetchVolumenPeriodoMundo(worldId, desdeISO, hastaISO) {
  const rows = await rest(`transactions?world_id=eq.${worldId}&type=eq.compra&created_at=gte.${desdeISO}&created_at=lt.${hastaISO}&select=amount`);
  return { volumen: (rows || []).reduce((a, t) => a + (+t.amount || 0), 0), txCount: (rows || []).length };
}
export async function upsertLoteLiquidacionRemote(lote) {
  const rows = await rest("liquidaciones?on_conflict=world_id,fecha", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(lote),
  });
  return rows?.[0] || null;
}
export async function marcarLiquidacionRemote(id, estado, extra = {}) {
  const body = { estado };
  if (extra.voucherUrl !== undefined) body.voucher_url = extra.voucherUrl;
  if (extra.voucherNombre !== undefined) body.voucher_nombre = extra.voucherNombre;
  if (extra.observacion !== undefined) body.observacion = extra.observacion;
  await rest(`liquidaciones?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });
}

// Bug real encontrado 29-jul (auditoría de BackOffice Mundo): "Visible en
// app" (SponsorComercios, Fronts.jsx) escribía solo a
// mundo.sponsorConfig.comerciosOcultos — un campo que NUNCA se sincroniza a
// Supabase (confirmado: cero referencias a sponsorConfig en todo supabase.js)
// y que la app tampoco leía aunque existiera. El toggle daba un toast de
// éxito sin ningún efecto real — mismo patrón que el bug de Publicidad ya
// cerrado esta sesión. Corregido con una columna real en merchants.
export async function actualizarVisibilidadMerchantRemote(merchantId, visible) {
  await rest(`merchants?id=eq.${merchantId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ visible_en_app: visible }),
  });
}
export async function actualizarFotoMerchantRemote(merchantId, photoUrl) {
  await rest(`merchants?id=eq.${merchantId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ photo_url: photoUrl }),
  });
}

// ── Soporte real (Gantt nuevo, 29-jul): hallazgo de la auditoría de
// BackOffice Mundo — st.tickets (usado por Soporte.jsx de Admin RP,
// SponsorSoporte del panel de Mundo, y el ticket de merchant en
// MerchantDashboard) era 100% local, sin ninguna sincronización a Supabase
// en ningún punto. Un sponsor o comercio "enviaba" un ticket a RedPontis con
// un toast de éxito, pero si RedPontis estaba en otro navegador/dispositivo
// (el caso real, son organizaciones distintas) nunca lo veía. Tabla real
// support_tickets + reconciliación al montar App.jsx, mismo patrón que
// liquidaciones.
export async function crearTicketSoporteRemote(payload) {
  const rows = await rest("support_tickets", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return rows?.[0] || null;
}
export async function fetchTicketsSoporteRemote() {
  return rest(`support_tickets?select=*&order=created_at.desc`);
}
export async function actualizarTicketSoporteRemote(id, patch) {
  await rest(`support_tickets?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

// ── POS — inventario real (Caso 2 Raimondi: cierra el dead code local) ─────
// Tabla pos_devices ya existía (creada por el otro chat de catálogos) con
// columnas en español (modelo, estado) — nos adaptamos a ese esquema en vez
// de duplicarlo; solo se agregó `serial` (aditivo).
export async function fetchPosDevicesRemote() {
  return rest("pos_devices?select=*&order=created_at.desc");
}
// Hardware prestado a un evento puntual (Gantt #60) — assignPosDeviceRemote
// ya soporta eventId desde antes; esto solo lo hace visible dentro de la
// pantalla del evento en vez de solo en el inventario global de Hardware.
export async function fetchPosDevicesDeEvento(eventId) {
  return rest(`pos_devices?event_id=eq.${eventId}&select=*`);
}
// Designación de Hardware por comercio, a nivel Mundo (Gantt #57) — antes el
// admin del mundo solo veía "POS solicitados" (un número tecleado a mano en
// el alta del comercio); esto trae la asignación REAL desde pos_devices.
export async function fetchPosDevicesDeMundo(worldId) {
  return rest(`pos_devices?world_id=eq.${worldId}&select=id,merchant_id,modelo,estado,serial`);
}
// Volumen real transaccionado por comercio dentro del mundo (Gantt #57) —
// referencia honesta para "seguimiento de liquidación cross-comercio": el
// motor de liquidación (generarLiquidaciones) calcula el lote en AGREGADO
// por mundo, no por comercio, así que no existe un monto de liquidación real
// por comercio que mostrar. Lo que sí es real es el volumen de transacciones
// por comercio, que se muestra como referencia junto con esa aclaración.
export async function fetchVolumenPorComercioMundo(worldId) {
  return rest(`transactions?world_id=eq.${worldId}&type=eq.compra&select=merchant_id,amount`);
}
// ── Catálogo de modelos de hardware, editable por RedPontis (Task #172) ────
// Distinto de HARDWARE_CATALOG (store.js): esos son los modelos "de fábrica"
// con integración de backend real (api_integration) y no se inventan desde
// la UI. Este es para modelos que RedPontis suma ad-hoc — registrar el
// MODELO es su propio paso, separado de registrar unidades/serie (abajo) y
// separado de asignar una unidad a un mundo (ya existía, sin tocar).
export async function fetchHardwareModelosCustom() {
  return rest("hardware_modelos_custom?activo=eq.true&select=*&order=created_at.desc");
}
export async function crearHardwareModeloCustom(payload) {
  const rows = await rest("hardware_modelos_custom", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return rows?.[0] || null;
}
export async function desactivarHardwareModeloCustom(id) {
  await rest(`hardware_modelos_custom?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ activo: false }),
  });
}

// ── Planes de suscripción por mundo (Task #174) — reemplaza el monto fijo
// único (wallet.montoSuscripcion) por planes nombrados con período y
// descuento promocional opcional, elegibles por el usuario en la superapp. ──
export async function fetchPlanesSuscripcion(worldId) {
  return rest(`subscription_plans?world_id=eq.${worldId}&select=*&order=created_at`);
}
export async function crearPlanSuscripcion(worldId, payload) {
  const rows = await rest("subscription_plans", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: worldId, ...payload }),
  });
  return rows?.[0] || null;
}
export async function actualizarPlanSuscripcion(id, payload) {
  await rest(`subscription_plans?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
}
export async function eliminarPlanSuscripcion(id) {
  await rest(`subscription_plans?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

export async function registerPosDeviceRemote(modelo, serial, tipoIngreso = "venta") {
  const rows = await rest("pos_devices", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ modelo, serial, estado: "disponible", tipo_ingreso: tipoIngreso }),
  });
  return rows?.[0] || null;
}
// Carga masiva (Gantt #53 — spec: "Código de equipo, individual o carga
// masiva vía archivo"): filas ya parseadas por el caller desde el archivo
// subido (modelo/serial/tipoIngreso), inserta todas de una vez.
export async function registerPosDevicesBulkRemote(rows) {
  if (!rows?.length) return [];
  const body = rows.map(r => ({ modelo: r.modelo, serial: r.serial, estado: "disponible", tipo_ingreso: r.tipoIngreso || "venta" }));
  return rest("pos_devices", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
}
// eventId es opcional (Gantt #64/#73): un POS puede asignarse solo a
// mundo+merchant como antes, o además a un evento puntual (préstamo temporal
// de hardware mientras dura el evento — se libera igual que cualquier POS).
export async function assignPosDeviceRemote(deviceId, worldId, merchantId, eventId = null) {
  await rest(`pos_devices?id=eq.${deviceId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "asignado", world_id: worldId, merchant_id: merchantId, event_id: eventId, assigned_at: new Date().toISOString() }),
  });
}
export async function releasePosDeviceRemote(deviceId) {
  await rest(`pos_devices?id=eq.${deviceId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "disponible", world_id: null, merchant_id: null, event_id: null, assigned_at: null }),
  });
}
// La tabla ya filtraba por "en_reparacion"/"baja" (PosDevicesTab) pero no
// existía ningún botón que pusiera una unidad en esos estados, ni forma de
// corregir una serie mal tipeada, ni de eliminar una unidad del inventario.
export async function updatePosDeviceEstadoRemote(deviceId, estado) {
  await rest(`pos_devices?id=eq.${deviceId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado }),
  });
}
export async function actualizarSerialPosDeviceRemote(deviceId, serial) {
  await rest(`pos_devices?id=eq.${deviceId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ serial }),
  });
}
export async function eliminarPosDeviceRemote(deviceId) {
  await rest(`pos_devices?id=eq.${deviceId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ── Banditas NFC — stock real por lote (30-jul) ─────────────────────────────
// Carga masiva desde CSV: un código único por bandita, agrupado por lote.
// upsert por codigo (unique) para que reintentar un CSV no duplique filas.
export async function fetchNfcBandsRemote(worldId = null) {
  return rest(worldId ? `nfc_bands?world_id=eq.${worldId}&select=*&order=created_at.desc` : `nfc_bands?select=*&order=created_at.desc`);
}
export async function registerNfcBandsBulkRemote(rows) {
  if (!rows?.length) return [];
  const body = rows.map(r => ({ codigo: r.codigo, lote: r.lote, estado: "disponible" }));
  return rest("nfc_bands?on_conflict=codigo", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body),
  });
}
export async function liberarNfcBandRemote(bandId) {
  await rest(`nfc_bands?id=eq.${bandId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "disponible", world_id: null }),
  });
}
// ── Asignación de banditas a un mundo, con precio/forma de cobro (corrección
// de modelo confirmada por la usuaria: el precio y el modelo comercial se
// estipulan al ASIGNAR, no al cargar el lote al almacén — ahí todavía no se
// sabe a qué mundo va ni bajo qué condición). Cada llamada es su propio lote
// comercial (nfc_asignaciones); las banditas elegidas quedan trazadas a esa
// asignación vía asignacion_id, con el precio denormalizado para verlo por
// código individual sin tener que cruzar tablas.
export async function crearAsignacionNfcRemote({ lote, worldId, bandIds, modelo, precioUnitario, formaCobro }) {
  if (!bandIds?.length) throw new Error("No hay banditas seleccionadas para asignar.");
  const esGratuita = modelo === "gratuita";
  const precio = esGratuita ? null : (Number(precioUnitario) || 0);
  const monto = esGratuita ? null : Math.round(precio * bandIds.length * 100) / 100;
  const formaCobroFinal = esGratuita ? null : formaCobro;
  const estadoPago = esGratuita ? "gratuita" : (formaCobroFinal === "descuento_ventas" ? "pendiente_descuento" : "pendiente");
  const [asig] = await rest("nfc_asignaciones", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      world_id: worldId, lote, cantidad: bandIds.length, modelo,
      precio_unitario: precio, monto_total: monto, forma_cobro: formaCobroFinal,
      estado_pago: estadoPago,
    }),
  });
  const ids = bandIds.map(id => `"${id}"`).join(",");
  await rest(`nfc_bands?id=in.(${ids})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "asignada", world_id: worldId, asignacion_id: asig.id, precio_unitario: precio }),
  });
  return asig;
}
// Editar el modelo/precio de una asignación YA creada (Task #171) — mismo
// "espejo" que crearAsignacionNfcRemote: gratuita -> pagada, pagada ->
// gratuita, o solo cambiar precio/forma de cobro. Aplica a TODA la
// asignación (el lote comercial completo, no bandita por bandita —
// dividirlo requeriría reasignar unidades individuales a una asignación
// nueva, que es un caso aparte). Bloqueada una vez que ya se cobró o se
// descontó: eso es un hecho contable consumado, no se reescribe.
export async function actualizarAsignacionNfcRemote(id, { modelo, precioUnitario, formaCobro }) {
  const actual = (await rest(`nfc_asignaciones?id=eq.${id}&select=cantidad,estado_pago`))?.[0];
  if (!actual) throw new Error("Asignación no encontrada.");
  if (!["gratuita", "pendiente", "pendiente_descuento"].includes(actual.estado_pago)) {
    throw new Error("Esta asignación ya fue cobrada o descontada — no se puede editar.");
  }
  const esGratuita = modelo === "gratuita";
  const precio = esGratuita ? null : (Number(precioUnitario) || 0);
  const monto = esGratuita ? null : Math.round(precio * actual.cantidad * 100) / 100;
  const formaCobroFinal = esGratuita ? null : formaCobro;
  const estadoPago = esGratuita ? "gratuita" : (formaCobroFinal === "descuento_ventas" ? "pendiente_descuento" : "pendiente");
  await rest(`nfc_asignaciones?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ modelo, precio_unitario: precio, monto_total: monto, forma_cobro: formaCobroFinal, estado_pago: estadoPago }),
  });
  await rest(`nfc_bands?asignacion_id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ precio_unitario: precio }),
  });
}
// Marca una asignación como pagada. Sirve para los dos modelos que requieren
// cobro: "anticipado" (se paga antes de entregar) y "contraentrega" (se paga
// AL entregar — ahí "pagar" y "entregar" son la misma acción en la UI,
// aunque en la base es el mismo PATCH que anticipado).
export async function marcarAsignacionPagadaRemote(id, { comprobanteUrl, comprobanteNombre, descripcion } = {}) {
  await rest(`nfc_asignaciones?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      estado_pago: "pagado",
      comprobante_url: comprobanteUrl || null, comprobante_nombre: comprobanteNombre || null,
      descripcion: descripcion || null, pagado_at: new Date().toISOString(),
    }),
  });
}
// Cobro pendiente real que bloquea entrega (anticipado/contraentrega, no
// descuento de ventas — ese se resuelve solo, vía liquidación).
export async function fetchAsignacionesPendientesCobro() {
  return rest(`nfc_asignaciones?estado_pago=eq.pendiente&select=*&order=created_at.asc`);
}
export async function fetchHistorialAsignacionesNfc() {
  return rest(`nfc_asignaciones?select=*&order=created_at.desc&limit=200`);
}
// ── Integración con Liquidación: forma_cobro "descuento_ventas" no se cobra
// aparte, se resta del neto del próximo corte del mundo como "descuento por
// hardware". marcarAsignacionesDescontadasRemote se llama después de que el
// corte se guarda con éxito, para no descontar dos veces el mismo lote.
export async function fetchAsignacionesPendientesDescuentoMundo(worldId) {
  return rest(`nfc_asignaciones?world_id=eq.${worldId}&estado_pago=eq.pendiente_descuento&select=id,monto_total`);
}
export async function marcarAsignacionesDescontadasRemote(ids) {
  if (!ids?.length) return;
  const list = ids.map(id => `"${id}"`).join(",");
  await rest(`nfc_asignaciones?id=in.(${list})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado_pago: "descontado" }),
  });
}
export async function renombrarLoteNfcRemote(loteViejo, loteNuevo) {
  await rest(`nfc_bands?lote=eq.${encodeURIComponent(loteViejo)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ lote: loteNuevo }),
  });
}
// Borrar un lote entero solo tiene sentido para deshacer una carga mala
// (códigos mal tipeados, archivo equivocado) — si alguna bandita YA salió
// del almacén (world_id asignado, sea "asignada" o "activa" en manos de un
// usuario real) eso es historial real, no un error de carga, y no se borra.
export async function eliminarLoteNfcRemote(lote) {
  const enUso = await rest(`nfc_bands?lote=eq.${encodeURIComponent(lote)}&world_id=not.is.null&select=id`);
  if (enUso?.length) {
    throw new Error(`No se puede eliminar: ${enUso.length} bandita(s) del lote ya están asignadas a un mundo o activas. Revierte esas asignaciones primero.`);
  }
  await rest(`nfc_bands?lote=eq.${encodeURIComponent(lote)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
// Deshace asignaciones a mundo que todavía NO llegaron a manos de un usuario
// real (linked_user_id vacío) — las regresa al almacén para poder corregir o
// eliminar el lote. Una bandita ya "activa" (vinculada a un usuario) nunca se
// toca acá.
export async function revertirAsignacionesLoteRemote(lote) {
  const asignadas = await rest(`nfc_bands?lote=eq.${encodeURIComponent(lote)}&estado=eq.asignada&linked_user_id=is.null&select=id`);
  if (!asignadas?.length) return 0;
  const ids = asignadas.map(b => `"${b.id}"`).join(",");
  await rest(`nfc_bands?id=in.(${ids})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "disponible", world_id: null }),
  });
  return asignadas.length;
}

// ── Vinculación física de una bandita a un usuario (Task #118) ──────────────
// `linked_user_id`/`activada_at`/`vence_at` ya existían en el esquema de
// nfc_bands pero ningún código los escribía — la única forma de "vincular"
// era editando Supabase a mano. Este es el paso que faltaba: el operador del
// POS escanea (o tipea) el código físico de la pulsera y el código JOI del
// usuario, y esto los une de verdad. Vigencia (vence_at) sale de la config
// real del mundo (Wallet → "vigencia de la pulsera NFC en meses"); si el
// mundo no la configuró, la pulsera queda sin vencimiento.
// El UID real de una bandita siempre se guarda como bytes hex en MAYÚSCULAS
// separados por ":" (04:D6:01:5A:68:19:94) — pero puede llegar sin separador
// (el lector nativo del T6 lo entrega así) o en minúsculas. Se normaliza acá
// para que un match exacto encuentre la bandita sin importar el formato de
// entrada.
export function normalizarUidBandita(raw) {
  const limpio = String(raw || "").trim().toUpperCase();
  if (!limpio) return null;
  const soloHex = limpio.replace(/[:\-\s.]/g, "");
  if (!/^[0-9A-F]+$/.test(soloHex) || soloHex.length < 8 || soloHex.length % 2 !== 0) return null;
  return soloHex.match(/.{2}/g).join(":");
}
export async function buscarNfcBandPorCodigo(codigo, worldId) {
  const normalizado = normalizarUidBandita(codigo) || codigo.trim().toUpperCase();
  const rows = await rest(`nfc_bands?codigo=eq.${encodeURIComponent(normalizado)}&world_id=eq.${worldId}&select=*`);
  return rows?.[0] || null;
}
// worldId es opcional por compatibilidad, pero sin él no se puede cerrar la
// solicitud pendiente automáticamente (queda igual que antes: solo vincula
// la bandita). Con worldId, vincular de verdad ES lo que marca "entregada" —
// antes ese estado dependía de que alguien lo marcara a mano en el admin,
// pudiendo quedar "entregada" sin que la pulsera se hubiera vinculado nunca,
// o viceversa.
// Bandita universal (Task #168): si la solicitud que se está resolviendo
// vino marcada universal:true (el titular la pidió para usar en todos sus
// mundos, no solo este), la banda se vincula SIN mundo fijo (world_id null)
// — bandResolver.js ya deja pasar una banda sin world_id en cualquier mundo,
// y shop-charge.js ya debita la wallet del mundo del lector que la lee, así
// que no hace falta tocar nada más para que funcione cross-mundo.
export async function vincularNfcBandRemote(bandId, userId, vigenciaMeses = null, worldId = null) {
  const now = new Date();
  const vence = vigenciaMeses ? new Date(now.setMonth(now.getMonth() + Number(vigenciaMeses))).toISOString() : null;

  let pendienteId = null, universal = false;
  if (worldId) {
    const pendientes = await rest(`nfc_requests?world_id=eq.${worldId}&user_id=eq.${userId}&status=eq.pendiente&select=id,universal&order=created_at.asc&limit=1`).catch(() => []);
    pendienteId = pendientes?.[0]?.id || null;
    universal = pendientes?.[0]?.universal === true;
  }

  await rest(`nfc_bands?id=eq.${bandId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      estado: "activa", linked_user_id: userId, activada_at: new Date().toISOString(), vence_at: vence,
      ...(universal ? { world_id: null } : {}),
    }),
  });

  if (pendienteId) {
    await rest(`nfc_requests?id=eq.${pendienteId}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "entregada" }),
    }).catch(() => {});
  }
}

// ── Bandita de evento con saldo pre-cargado (Task #119) ────────────────────
// Distinto de vincularNfcBandRemote: acá la persona puede NO tener cuenta
// todavía — se le crea una wallet con un user_id sintético (mismo patrón que
// un dependiente), así que cobro/consumo/recarga reusan mover_saldo_wallet
// sin ningún cambio. Ver docs/arquitectura/03-diseno-cashin-evento.md.
export async function importarInvitadosEventoRemote(eventId, worldId, moneda, nombreArchivo, filas, importadoPor) {
  const lista = await rest("event_guest_lists", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ event_id: eventId, world_id: worldId, nombre_archivo: nombreArchivo || null, importado_por: importadoPor || null }),
  });
  const listaId = lista?.[0]?.id;
  if (!listaId) throw new Error("No se pudo crear la lista de invitados.");

  let creados = 0, duplicados = 0;
  for (const fila of filas) {
    const nombre = String(fila.nombre || "").trim();
    const documento = String(fila.documento || "").trim();
    if (!nombre || !documento) continue;
    const guestUserId = crypto.randomUUID();
    try {
      await rest("event_guests", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ guest_list_id: listaId, event_id: eventId, world_id: worldId, nombre, documento, guest_user_id: guestUserId, estado: "invitado" }),
      });
    } catch {
      duplicados++; continue; // documento ya cargado para este evento (unique event_id+documento)
    }
    await rest("wallets?on_conflict=user_id,world_id", {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: guestUserId, world_id: worldId, balance: 0, currency: moneda || "PEN" }),
    });
    creados++;
  }
  return { listaId, creados, duplicados };
}

// Trae la lista completa con saldo actual (join contra wallets) y consumo
// total (join contra transactions) — para el panel "Banditas del evento".
export async function fetchEventGuests(eventId) {
  const guests = await rest(`event_guests?event_id=eq.${eventId}&select=*&order=created_at`);
  if (!guests?.length) return [];
  const ids = guests.map(g => `"${g.guest_user_id}"`).join(",");
  const worldId = guests[0].world_id;
  const wallets = await rest(`wallets?user_id=in.(${ids})&world_id=eq.${worldId}&select=id,user_id,balance`).catch(() => []);
  const walletPorGuest = new Map((wallets || []).map(w => [w.user_id, w]));
  const walletIds = (wallets || []).map(w => w.id);
  const txs = walletIds.length
    ? await rest(`transactions?type=eq.compra&status=eq.completada&wallet_id=in.(${walletIds.map(id => `"${id}"`).join(",")})&select=wallet_id,amount`).catch(() => [])
    : [];
  const consumoPorWallet = new Map();
  for (const t of txs || []) {
    consumoPorWallet.set(t.wallet_id, (consumoPorWallet.get(t.wallet_id) || 0) + (+t.amount || 0));
  }
  return guests.map(g => {
    const wallet = walletPorGuest.get(g.guest_user_id);
    return { ...g, balance: wallet ? +wallet.balance : 0, consumo: wallet ? (consumoPorWallet.get(wallet.id) || 0) : 0 };
  });
}

export async function buscarInvitadoPorDocumentoRemote(eventId, documento) {
  const rows = await rest(`event_guests?event_id=eq.${eventId}&documento=eq.${encodeURIComponent(documento.trim())}&select=*`);
  return rows?.[0] || null;
}
export async function buscarInvitadoPorBanditaRemote(worldId, codigoBandita) {
  const band = await buscarNfcBandPorCodigo(codigoBandita, worldId);
  if (!band?.linked_user_id) return null;
  const rows = await rest(`event_guests?world_id=eq.${worldId}&guest_user_id=eq.${band.linked_user_id}&select=*`);
  return rows?.[0] ? { guest: rows[0], band } : null;
}

// Activa la bandita física de un invitado ya cargado en la lista: vincula
// nfc_bands (igual que #118, pero linked_user_id es el guest_user_id
// sintético, y la vigencia es la del evento + margen, no meses) y, si hay
// monto de precarga, lo acredita como una recarga real (p_tipo
// "recarga_evento") — queda en el ledger, no es un número inventado.
export async function activarBanditaEventoRemote({ guestId, worldId, bandaCodigo, montoPrecarga, venceAt, eventoNombre }) {
  const guestRows = await rest(`event_guests?id=eq.${guestId}&select=*`);
  const guest = guestRows?.[0];
  if (!guest) throw new Error("Invitado no encontrado.");

  const band = await buscarNfcBandPorCodigo(bandaCodigo, worldId);
  if (!band) throw new Error(`No se encontró la pulsera "${bandaCodigo.toUpperCase()}" en el inventario de este mundo.`);
  if (band.linked_user_id && band.linked_user_id !== guest.guest_user_id) throw new Error("Esta pulsera ya está vinculada a otra persona.");
  if (band.estado === "bloqueada") throw new Error("Esta pulsera está bloqueada.");

  await rest(`nfc_bands?id=eq.${band.id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "activa", linked_user_id: guest.guest_user_id, activada_at: new Date().toISOString(), vence_at: venceAt || null }),
  });

  let balance = 0;
  const monto = +montoPrecarga || 0;
  if (monto > 0) {
    const wallet = await rest(`wallets?user_id=eq.${guest.guest_user_id}&world_id=eq.${worldId}&select=id,balance`).then(r => r?.[0]);
    if (!wallet) throw new Error("No se encontró la billetera del invitado — vuelve a importar la lista.");
    const r = (await rest("rpc/mover_saldo_wallet", {
      method: "POST",
      body: JSON.stringify({
        p_wallet_id: wallet.id, p_delta: Math.abs(monto), p_tipo: "recarga_evento",
        p_world_id: worldId, p_reference: `Precarga bandita evento${eventoNombre ? " · " + eventoNombre : ""}`,
      }),
    }))?.[0];
    if (!r?.ok) throw new Error("No se pudo precargar el saldo.");
    balance = +r.nuevo_saldo;
  }

  await rest(`event_guests?id=eq.${guestId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ bandita_codigo: band.codigo, saldo_inicial: monto, vence_at: venceAt || null, estado: monto > 0 ? "activo" : "bandita_asignada" }),
  });

  return { balance, codigo: band.codigo };
}

// Cash-in adicional durante el evento — mismo mover_saldo_wallet que una
// recarga normal, sin turno de caja (el organizador no tiene pos_turnos).
export async function recargarBanditaEventoRemote(guestUserId, worldId, monto, referencia) {
  const wallet = await rest(`wallets?user_id=eq.${guestUserId}&world_id=eq.${worldId}&select=id`).then(r => r?.[0]);
  if (!wallet) return { ok: false, motivo: "sin_wallet" };
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({ p_wallet_id: wallet.id, p_delta: Math.abs(monto), p_tipo: "recarga_evento", p_world_id: worldId, p_reference: referencia || "Cash-in evento" }),
  }))?.[0];
  if (!r?.ok) return { ok: false, motivo: r?.motivo || "sin_wallet" };
  return { ok: true, balance: +r.nuevo_saldo };
}

// ── Solicitud de LOTE de banditas NFC — el mundo pide más stock a RedPontis
// (distinto de nfc_requests, que es un usuario final pidiendo SU pulsera).
// entregarLoteNfcRemote() asigna banditas reales del almacén (world_id IS
// NULL, estado disponible) al mundo — no fabrica códigos nuevos, consume
// stock real ya cargado por CSV, igual que el flujo manual de asignar de a
// una, solo que aquí RedPontis entrega N de una vez contra una solicitud.
export async function crearSolicitudLoteNfcRemote(worldId, cantidad) {
  await rest("nfc_band_requests", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ world_id: worldId, cantidad, estado: "pendiente" }),
  });
}
export async function fetchSolicitudesLoteNfcMundo(worldId) {
  return rest(`nfc_band_requests?world_id=eq.${worldId}&select=*&order=created_at.desc`);
}
export async function fetchSolicitudesLoteNfcTodas() {
  return rest(`nfc_band_requests?select=*&order=created_at.desc`);
}
export async function fetchStockAlmacenNfc() {
  const rows = await rest(`nfc_bands?world_id=is.null&estado=eq.disponible&select=id`);
  return rows?.length || 0;
}
export async function entregarLoteNfcRemote(requestId, worldId, cantidad) {
  const disponibles = await rest(`nfc_bands?world_id=is.null&estado=eq.disponible&select=id&limit=${cantidad}`);
  if (!disponibles || disponibles.length < cantidad) {
    throw new Error(`Solo hay ${disponibles?.length || 0} banditas disponibles en almacén — no alcanza para entregar ${cantidad}.`);
  }
  const ids = disponibles.map(b => `"${b.id}"`).join(",");
  await rest(`nfc_bands?id=in.(${ids})`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "asignada", world_id: worldId }),
  });
  await rest(`nfc_band_requests?id=eq.${requestId}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "entregado", resolved_at: new Date().toISOString() }),
  });
}

// ── Canales de adquirencia por mundo — el gap real: los toggles adq_* que
// ModuleConfigDrawer guarda en config se borraban en cada sync (ver el
// `delete config[k]` de adq_* en syncAllWorlds) y nunca llegaban a ningún
// lado — por eso "Canales" en la config de un mundo siempre mostraba el
// default del catálogo. Mismo patrón world_id+channel_id que world_channel_configs.
export async function syncWorldAcquiringChannels(worldId, rows) {
  if (!rows?.length) return;
  await rest("world_acquiring_channel_configs?on_conflict=world_id,channel_id", {
    method: "POST", headers: upsertHeaders,
    body: JSON.stringify(rows.map(r => ({ world_id: worldId, channel_id: r.channel_id, channel_enabled: r.channel_enabled }))),
  });
}
export async function fetchWorldAcquiringChannels(worldId) {
  return rest(`world_acquiring_channel_configs?world_id=eq.${worldId}&select=channel_id,channel_enabled`);
}

// ── Cronograma real por evento (Gantt #66/#78) — antes EventoAgendaSection
// en la app renderizaba 3 items hardcodeados idénticos para todo evento.
export async function fetchAgendaEvento(eventId) {
  return rest(`event_agenda_items?event_id=eq.${eventId}&select=*&order=orden,hora`);
}
export async function upsertAgendaItem(item) {
  const rows = await rest("event_agenda_items", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([item]),
  });
  return rows?.[0] || null;
}
export async function deleteAgendaItem(id) {
  await rest(`event_agenda_items?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ── Reingresos reales (Gantt #79) — event_tickets.checkin_at/checkout_at son
// columnas únicas (se sobrescriben en cada escaneo, ver setTicketEstado); acá
// va el log aparte que sí conserva cada ingreso/salida para armar el
// historial real y permitir reingreso sin repensar el schema de tickets.
export async function logCheckinEvento(eventId, ticketId, tipo) {
  await rest("event_checkin_log", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ event_id: eventId, ticket_id: ticketId, tipo }),
  });
}
export async function fetchCheckinLogEvento(eventId) {
  return rest(`event_checkin_log?event_id=eq.${eventId}&select=*&order=created_at.desc`);
}

// ── Catálogo de productos por comercio (Cafetería, Kiosco...) ──────────────
// eventId opcional: catálogo regular (event_id IS NULL) vs. catálogo propio
// de un evento específico (Gantt #70 — ej. menú exclusivo de la kermesse).
export async function fetchProductsRemote(merchantId, eventId = null) {
  const base = `products?merchant_id=eq.${merchantId}&select=*&order=created_at`;
  return rest(eventId ? `${base}&event_id=eq.${eventId}` : `${base}&event_id=is.null`);
}
export async function upsertProductRemote(product, eventId = null) {
  if (product.id) {
    await rest(`products?id=eq.${product.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ name: product.name, price: product.price, category: product.category || null, stock: product.stock ?? null, active: product.active !== false, image_url: product.image_url || null }),
    });
    return product.id;
  }
  const rows = await rest("products", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: product.world_id, merchant_id: product.merchant_id, event_id: eventId, name: product.name, price: product.price, category: product.category || null, stock: product.stock ?? null, active: true, image_url: product.image_url || null }),
  });
  return rows?.[0]?.id || null;
}
export async function deleteProductRemote(id) {
  await rest(`products?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ── Comercios afiliados a un evento (Gantt #63/#67 — Caso 3 Kermesse) ──────
// Antes: la vitrina de un evento en la app mostraba TODOS los comercios
// activos del mundo, sin afiliación real. Ver EventoMarketplaceSection (app).
export async function fetchEventMerchants(eventId) {
  return rest(`event_merchants?event_id=eq.${eventId}&select=*&order=created_at`);
}
export async function afiliarComercioEvento(eventId, merchantId, merchantNombre) {
  const rows = await rest("event_merchants?on_conflict=event_id,merchant_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{ event_id: eventId, merchant_id: merchantId, merchant_nombre: merchantNombre }]),
  });
  return rows?.[0] || null;
}
export async function desafiliarComercioEvento(id) {
  await rest(`event_merchants?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
export async function updateUbicacionEventoComercio(id, ubicacion) {
  await rest(`event_merchants?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ubicacion }),
  });
}

// ── Cobro POS con identificación previa del pagador (Caso 2 Raimondi) ──────
// Busca la wallet por su código (user_id completo o de un dependiente),
// debita, e inscribe la venta con merchant_id (antes: transactions no
// distinguía qué comercio cobró → imposible aislar "mis ventas").
export async function buscarWalletPorCodigo(codigo, worldId) {
  const rows = await rest(`wallets?user_id=eq.${encodeURIComponent(codigo.trim())}&world_id=eq.${worldId}&select=id,user_id,balance`);
  return rows?.[0] || null;
}
// Bug real #114: hasta acá el balance se leía y se volvía a escribir con un
// PATCH plano — dos cobros a la misma wallet casi al mismo tiempo podían
// leer el mismo saldo viejo y pisarse uno al otro, y cualquiera con la anon
// key del bundle podía escribirle cualquier número a cualquier billetera
// directo por REST, sin pasar por esta función. mover_saldo_wallet() es una
// función de Postgres (SECURITY DEFINER) que hace el lock de fila + validación
// + escritura + registro de transacción en un solo paso atómico — anon puede
// ejecutarla (GRANT EXECUTE) pero ya no puede tocar wallets.balance directo
// (REVOKE UPDATE), así que este es ahora el único camino real para mover saldo.
// Gap real (auditoría post-#114): mover_saldo_wallet ahora exige, para
// cualquier llamada con p_merchant_id, un p_turno_id que sea un turno real y
// abierto de ESE merchant en pos_turnos — si no, lo rechaza con
// TURNO_INVALIDO. El Operador web nunca tuvo turno (a diferencia del POS
// nativo T6, que sí valida contra pos_turnos en joi-pos-backend) — esto abre
// uno real al entrar a Cobrar/Recargar, reutilizando el turno abierto si ya
// hay uno para no duplicar el cuadre de caja.
export async function abrirTurnoRemote(merchantId, worldId) {
  const abiertos = await rest(
    `pos_turnos?merchant_id=eq.${merchantId}&estado=eq.abierto&select=id&order=abierto_at.desc&limit=1`
  ).catch(() => []);
  if (abiertos?.[0]?.id) return abiertos[0].id;
  const creado = await rest("pos_turnos", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: worldId, merchant_id: merchantId, device_serial: "web-operador" }),
  }).catch(() => []);
  return creado?.[0]?.id || null;
}

export async function cobrarPOSRemote(userId, worldId, merchantId, monto, referencia, turnoId) {
  const wallet = await rest(`wallets?user_id=eq.${userId}&world_id=eq.${worldId}&select=id`).then(r => r?.[0]);
  if (!wallet) return { ok: false, motivo: "sin_wallet" };
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: -Math.abs(monto), p_tipo: "compra",
      p_world_id: worldId, p_merchant_id: merchantId, p_reference: referencia, p_turno_id: turnoId || null,
    }),
  }))?.[0];
  if (!r?.ok) return { ok: false, motivo: r?.motivo === "SALDO_INSUFICIENTE" ? "saldo" : (r?.motivo || "sin_wallet"), balance: r?.nuevo_saldo != null ? +r.nuevo_saldo : undefined };
  return { ok: true, balance: +r.nuevo_saldo };
}
// Recarga presencial en POS (efectivo / tarjeta presente) — el operador recibe
// el pago físico y acredita el monto a la billetera del cliente ya identificado.
export async function recargarPOSRemote(userId, worldId, merchantId, monto, canalId, referencia, turnoId) {
  const wallet = await rest(`wallets?user_id=eq.${userId}&world_id=eq.${worldId}&select=id`).then(r => r?.[0]);
  if (!wallet) return { ok: false, motivo: "sin_wallet" };
  const r = (await rest("rpc/mover_saldo_wallet", {
    method: "POST",
    body: JSON.stringify({
      p_wallet_id: wallet.id, p_delta: Math.abs(monto), p_tipo: "recarga",
      p_world_id: worldId, p_merchant_id: merchantId, p_channel_id: canalId, p_reference: referencia, p_turno_id: turnoId || null,
    }),
  }))?.[0];
  // Bug real de QA (hallado hoy): esto siempre reportaba "sin_wallet" ante
  // cualquier rechazo del RPC, aunque el motivo real fuera otro — engañoso
  // para el operador. Ahora se propaga el motivo real cuando existe.
  if (!r?.ok) return { ok: false, motivo: r?.motivo || "sin_wallet" };
  return { ok: true, balance: +r.nuevo_saldo };
}
export async function fetchVentasComercio(merchantId, limit = 300) {
  return rest(`transactions?merchant_id=eq.${merchantId}&type=eq.compra&select=id,amount,reference,status,created_at&order=created_at.desc&limit=${limit}`);
}
// Ventas reales del día (Gantt #101) — antes "Resumen del día" del Merchant
// Dashboard usaba mockMerchantTxs() (datos falsos) para las 4 tarjetas de
// cabecera, mientras VentasComercioWidget mostraba el feed real justo debajo
// — números falsos y reales conviviendo sin ninguna etiqueta que avisara.
export async function fetchVentasComercioHoy(merchantId) {
  const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
  return rest(`transactions?merchant_id=eq.${merchantId}&type=eq.compra&created_at=gte.${inicio.toISOString()}&select=amount,status,created_at&order=created_at.desc`);
}

// ── Familiares / dependientes vinculados a un tutor ────────────────────────
export async function fetchDependientesMundo(worldId) {
  return rest(`dependents?world_id=eq.${worldId}&select=*&order=created_at.desc`);
}
export async function fetchDependientesDe(guardianUserId, worldId) {
  return rest(`dependents?guardian_user_id=eq.${guardianUserId}&world_id=eq.${worldId}&select=*&order=created_at`);
}
export async function crearDependienteRemote(worldId, guardianUserId, nombre, alergias) {
  // wallets.user_id es tipo uuid — el id del dependiente debe ser un UUID puro.
  const dependentUserId = crypto.randomUUID();
  const rows = await rest("dependents", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: worldId, guardian_user_id: guardianUserId, dependent_user_id: dependentUserId, nombre, alergias: alergias || null }),
  });
  // El dependiente obtiene su propia wallet — reutiliza toda la infra de saldo.
  await rest("wallets?on_conflict=user_id,world_id", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: dependentUserId, world_id: worldId, balance: 0, currency: "PEN" }),
  });
  return rows?.[0] || null;
}

// ── Solicitudes de pulsera NFC (antes: botones decorativos sin backend) ────
export async function crearSolicitudNfcRemote(worldId, userId) {
  await rest("nfc_requests", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ world_id: worldId, user_id: userId, status: "pendiente" }),
  });
}
// El admin no podía saber QUIÉN pedía una bandita — nfc_requests solo guarda
// user_id, y ese id es tan real para el titular como para un dependiente
// suyo (misma tabla wallets, mismo synthetic uuid). Se resuelve cruzando
// contra dependents (para dependientes) y contra la vista de solo lectura
// usuarios_perfil (para titulares — ver fix-vista-perfiles-titular.sql,
// expone nombres/apellidos de auth.users.user_metadata sin exponer la
// tabla completa de Auth).
export async function fetchSolicitudesNfcMundo(worldId) {
  const [reqs, deps] = await Promise.all([
    rest(`nfc_requests?world_id=eq.${worldId}&select=*&order=created_at.desc`),
    rest(`dependents?world_id=eq.${worldId}&select=dependent_user_id,nombre,guardian_user_id`).catch(() => []),
  ]);
  const depPorUserId = new Map((deps || []).map(d => [d.dependent_user_id, d]));
  const titularIds = (reqs || []).map(r => r.user_id).filter(id => !depPorUserId.has(id));
  let perfilesPorUserId = new Map();
  if (titularIds.length) {
    const perfiles = await rest(`usuarios_perfil?user_id=in.(${titularIds.join(",")})&select=user_id,nombres,apellidos`).catch(() => []);
    perfilesPorUserId = new Map((perfiles || []).map(p => [p.user_id, p]));
  }
  return (reqs || []).map(r => {
    const dep = depPorUserId.get(r.user_id);
    if (dep) return { ...r, nombre: dep.nombre, esDependiente: true };
    const perfil = perfilesPorUserId.get(r.user_id);
    const nombreTitular = perfil ? [perfil.nombres, perfil.apellidos].filter(Boolean).join(" ") : null;
    return { ...r, nombre: nombreTitular || null, esDependiente: false };
  });
}
// Cross-mundo, para que RedPontis mida cuántas banditas físicas necesita
// producir/asignar por mundo (Hardware → Banditas NFC → "Demanda por mundo").
export async function fetchSolicitudesNfcTodas() {
  return rest(`nfc_requests?select=*&order=created_at.desc`);
}
export async function resolverSolicitudNfcRemote(id, status) {
  await rest(`nfc_requests?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
}

// ── Reportes en vivo del mundo, por tipo de transacción ────────────────────
export async function fetchTransaccionesMundo(worldId, tipo, limit = 15) {
  return rest(`transactions?world_id=eq.${worldId}&type=eq.${tipo}&select=amount,reference,status,created_at,channel_id,wallets(user_id)&order=created_at.desc&limit=${limit}`);
}

// ── Consumos del mundo en vivo (para paneles merchant/sponsor) ──────────────
export async function fetchConsumosMundo(worldId, limit = 15) {
  return rest(`transactions?world_id=eq.${worldId}&type=eq.compra&select=amount,reference,status,created_at&order=created_at.desc&limit=${limit}`);
}

// Historial de ventas agrupado por comercio (Gantt #53) — fetchConsumosMundo
// arriba es un feed cronológico plano sin merchant_id, no sirve para armar un
// ranking por comercio. Trae todas las compras del mundo con su merchant_id
// crudo; el agrupado/sumado se hace en el widget (join con la lista local de
// comercios, que ya trae el nombre real).
export async function fetchVentasPorComercioMundo(worldId, limit = 1000) {
  return rest(`transactions?world_id=eq.${worldId}&type=eq.compra&select=merchant_id,amount,created_at&order=created_at.desc&limit=${limit}`);
}
// Historial de Ventas del Mundo (Gantt #58) — tabla real por transacción, no
// agregada, para filtrar por comercio/fecha/usuario/producto (reference es el
// campo más cercano a "producto" que guarda transactions: no hay línea de
// detalle de ítem, solo una descripción de referencia por venta).
export async function fetchHistorialVentasMundo(worldId, limit = 300) {
  return rest(`transactions?world_id=eq.${worldId}&type=eq.compra&select=id,merchant_id,amount,reference,status,created_at,wallets(user_id)&order=created_at.desc&limit=${limit}`);
}

// ── KPIs reales para el dashboard del sponsor por módulo (30-jul) — antes el
// tab "Mis módulos" solo dejaba editar condiciones, sin ninguna cifra real de
// lo que efectivamente pasa en cada módulo. products no tiene world_id propio
// (cuelga de merchant_id) así que se resuelve vía los comercios del mundo.
export async function fetchProductosMundo(worldId) {
  const merchants = await rest(`merchants?world_id=eq.${worldId}&select=id`);
  const ids = (merchants || []).map(m => m.id);
  if (!ids.length) return [];
  return rest(`products?merchant_id=in.(${ids.join(",")})&select=id,name,stock,price,merchant_id`);
}
export async function fetchMenuReservasMundo(worldId, limit = 300) {
  return rest(`menu_reservas?world_id=eq.${worldId}&select=*&order=created_at.desc&limit=${limit}`);
}
export async function fetchAlertasConsumoMundo(worldId, limit = 100) {
  return rest(`consumo_alertas?world_id=eq.${worldId}&select=*&order=created_at.desc&limit=${limit}`);
}
export async function fetchPerfilesExtendidosMundo(worldId) {
  return rest(`user_profiles?world_id=eq.${worldId}&select=user_id,tipo_sangre,alergias,clinica`);
}

// ── Organizadores B2B (entidad real — antes: OrganizadorFront era solo una
// vista previa del Admin RP, sin actor propio ni login) ─────────────────────
export async function crearOrganizadorRemote(worldId, nombre, entidadLegal, ruc, usuario, password) {
  const rows = await rest("organizadores", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ world_id: worldId, nombre, entidad_legal: entidadLegal || null, ruc: ruc || null, usuario, password, estado: "activo" }),
  });
  return rows?.[0] || null;
}
export async function fetchOrganizadoresRemote(worldId) {
  return rest(`organizadores?world_id=eq.${worldId}&select=*&order=created_at`);
}
export async function desactivarOrganizadorRemote(id) {
  await rest(`organizadores?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ estado: "inactivo" }) });
}
// Antes solo existía desactivar — un organizador inactivo quedaba huérfano
// sin ningún control para reactivarlo ni corregir nombre/entidad legal/RUC
// mal tipeados (había que editarlo a mano en Supabase). Genérico para poder
// reutilizarlo en ambos casos.
export async function actualizarOrganizadorRemote(id, patch) {
  await rest(`organizadores?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
}

// ── Checklist pre-demo: sondeo del estado real de la infraestructura ────────
export async function probeDemoInfra() {
  const probe = async (path) => { try { await rest(path); return true; } catch { return false; } };
  const [eventsOk, bnplOk, writeOk] = await Promise.all([
    probe("events?select=id&limit=1"),
    probe("bnpl_contratos?select=id&limit=1"),
    // La escritura del admin requiere las políticas RLS de la migración:
    rest("worlds?select=id&limit=1").then(async () => {
      try {
        await rest("worlds?on_conflict=id", {
          method: "POST", headers: upsertHeaders,
          body: JSON.stringify([{ id: "mundo-eventos-rp", name: "JOI Eventos", code: "EV-RP-000", vertical: "Especial RedPontis", status: "activo", currency: "PEN", color_primary: "#722ce3" }]),
        });
        return true;
      } catch { return false; }
    }).catch(() => false),
  ]);
  return { eventsOk, bnplOk, writeOk };
}

// ── Usuarios del superapp (personas reales, no comercios) ──────────────────
//
// Lo que se lee acá es deliberadamente incompleto: app_profiles guarda el
// nombre y las versiones enmascaradas, mientras que el correo y el número de
// documento completos viven en auth.users, donde la llave anónima no llega.
// Es decir: este panel no puede filtrar un dato sensible aunque alguien se lo
// proponga, porque nunca lo tuvo. Para soporte real hace falta llave de
// servicio y un endpoint server-side, no una pantalla más.
export async function fetchPerfilesUsuarios(ids = null) {
  const filtro = ids?.length ? `&id=in.(${ids.join(",")})` : "";
  return rest(`app_profiles?select=*${filtro}&order=created_at.desc`);
}

// La pertenencia a un mundo no tiene tabla propia: wallets(user_id, world_id)
// ya la describe, y es la misma fila que sostiene el saldo.
export async function fetchUsuariosDeMundo(worldId) {
  const wallets = await rest(`wallets?world_id=eq.${worldId}&select=id,user_id,balance,status`);
  if (!wallets?.length) return [];
  const ids = [...new Set(wallets.map(w => w.user_id))];
  const idsEnLista = ids.map(i => `"${i}"`).join(",");
  const [perfiles, dependientes, bandas, solicitudes] = await Promise.all([
    fetchPerfilesUsuarios(ids).catch(() => []),
    rest(`dependents?world_id=eq.${worldId}&select=guardian_user_id,dependent_user_id,nombre`).catch(() => []),
    // Bandita por persona: para que la tabla de usuarios muestre de un vistazo
    // si tiene pulsera activa (y su vigencia) sin tener que ir a otra pestaña.
    rest(`nfc_bands?world_id=eq.${worldId}&linked_user_id=in.(${idsEnLista})&select=id,linked_user_id,codigo,vence_at`).catch(() => []),
    rest(`nfc_requests?world_id=eq.${worldId}&status=eq.pendiente&user_id=in.(${idsEnLista})&select=user_id`).catch(() => []),
  ]);
  const porId = Object.fromEntries((perfiles || []).map(p => [p.id, p]));
  const aCargo = {};
  (dependientes || []).forEach(d => {
    aCargo[d.guardian_user_id] = (aCargo[d.guardian_user_id] || 0) + 1;
  });
  const esDependiente = new Set((dependientes || []).map(d => d.dependent_user_id));
  const nombreDependiente = Object.fromEntries((dependientes || []).map(d => [d.dependent_user_id, d.nombre]));
  const guardianDeDependiente = Object.fromEntries((dependientes || []).map(d => [d.dependent_user_id, d.guardian_user_id]));
  const bandaPorUsuario = Object.fromEntries((bandas || []).map(b => [b.linked_user_id, b]));
  const solicitudPendientePorUsuario = new Set((solicitudes || []).map(s => s.user_id));

  return wallets.map(w => {
    const p = porId[w.user_id];
    const banda = bandaPorUsuario[w.user_id];
    return {
      userId: w.user_id,
      walletId: w.id,
      balance: Number(w.balance) || 0,
      estadoWallet: w.status || "activa",
      // Un dependiente no tiene cuenta propia: existe porque un titular lo creó.
      // Distinguirlo evita contar dos veces a la misma familia como "usuarios".
      tipo: esDependiente.has(w.user_id) ? "dependiente" : p ? "titular" : "sin_perfil",
      nombre: p ? `${p.nombres} ${p.apellidos}`.trim() : nombreDependiente[w.user_id] || null,
      docTipo: p?.doc_tipo || null,
      docMask: p?.doc_mask || null,
      emailMask: p?.email_mask || null,
      creado: p?.created_at || null,
      dependientesACargo: aCargo[w.user_id] || 0,
      guardianUserId: guardianDeDependiente[w.user_id] || null,
      bandita: banda ? { id: banda.id, estado: "activa", codigo: banda.codigo, venceAt: banda.vence_at } : solicitudPendientePorUsuario.has(w.user_id) ? { estado: "solicitada" } : null,
    };
  });
}

// Detalle de una persona: consumo real y en qué mundos está.
export async function fetchDetalleUsuario(userId) {
  const wallets = await rest(`wallets?user_id=eq.${userId}&select=id,world_id,balance,status`);
  const walletIds = (wallets || []).map(w => w.id);
  const movimientos = walletIds.length
    ? await rest(`transactions?wallet_id=in.(${walletIds.join(",")})&select=*&order=created_at.desc&limit=100`).catch(() => [])
    : [];
  const consumo = (movimientos || [])
    .filter(t => t.type === "compra" && t.status !== "rechazada")
    .reduce((a, t) => a + Math.abs(Number(t.amount) || 0), 0);
  const recargado = (movimientos || [])
    .filter(t => t.type === "recarga" && t.status !== "rechazada")
    .reduce((a, t) => a + Math.abs(Number(t.amount) || 0), 0);
  return {
    mundos: wallets || [],
    movimientos: movimientos || [],
    consumo,
    recargado,
    saldoTotal: (wallets || []).reduce((a, w) => a + (Number(w.balance) || 0), 0),
  };
}

// ── Requerimiento de equipos (POS, tótem, lectores) ────────────────────────
//
// Las banditas ya tenían su cola (nfc_lote_requests). Los equipos no: el mundo
// pedía un POS por WhatsApp y RedPontis se enteraba cuando podía. Es la misma
// necesidad —"necesito equipo, ¿en qué va?"— así que sigue el mismo patrón:
// el mundo pide, RedPontis ve la demanda agregada y resuelve.
export async function crearRequerimientoHardware(worldId, modeloId, modeloNombre, cantidad, motivo) {
  const rows = await rest("hardware_requests", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      world_id: worldId, modelo_id: modeloId, modelo_nombre: modeloNombre || null,
      cantidad: +cantidad, motivo: motivo || null, estado: "pendiente",
    }),
  });
  return rows?.[0] || null;
}
export async function fetchRequerimientosHardwareMundo(worldId) {
  return rest(`hardware_requests?world_id=eq.${worldId}&select=*&order=created_at.desc`);
}
// Cross-mundo: lo que RedPontis necesita para saber cuánto equipo comprar.
export async function fetchRequerimientosHardwareTodos() {
  return rest("hardware_requests?select=*&order=created_at.desc");
}
export async function resolverRequerimientoHardware(id, estado, nota) {
  await rest(`hardware_requests?id=eq.${id}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      estado,
      nota_redpontis: nota || null,
      resuelto_at: estado === "pendiente" ? null : new Date().toISOString(),
    }),
  });
}
// Las solicitudes de lote de banditas ya tienen su fetch cross-mundo más
// arriba (fetchSolicitudesLoteNfcTodas, sobre nfc_band_requests); el tablero
// de demanda de hardware reutiliza esa misma, no hace falta otra.
