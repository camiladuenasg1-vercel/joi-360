import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "./hooks";
import { update, uid, session, organizadorLogin, organizadorLogout, organizadorSession, generarPassword, refreshEventosLive } from "./store";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, Toggle, notify, NumInput } from "./ui";
import { upsertEventoRemote, syncTicketTypesRemote, fetchTicketsDeEvento, setTicketEstado, fetchOrganizadoresRemote, fetchMerchantsRemote, fetchEventMerchants, afiliarComercioEvento, desafiliarComercioEvento, updateUbicacionEventoComercio, fetchProductsRemote, upsertProductRemote, deleteProductRemote, errorControlado, logErrorControlado, logCheckinEvento, fetchCheckinLogEvento, fetchAgendaEvento, upsertAgendaItem, deleteAgendaItem, fetchTicketTypesDeEvento, fetchPosDevicesDeEvento, uploadArchivo, importarInvitadosEventoRemote, fetchEventGuests, buscarInvitadoPorDocumentoRemote, activarBanditaEventoRemote, recargarBanditaEventoRemote, deleteEventoRemote } from "./supabase.js";

const TIPO_ENTRADA_BLANK = { id: "", nombre: "General", precio: 0, cupos: 100, descripcion: "", incluye: "" };

// El criterio del evento: quién lo gestiona y cómo se monetiza/aprueba.
// El techo lo define el mundo (modosDeMundo() en store.js — derivado del tipo
// de mundo + eventosConfig.embebidoActivo); cada evento elige UNO dentro de
// ese techo (mismo patrón de clamping que canales/BNPL).
export const MODOS_EVENTO = {
  embebido: { label: "Embebido", icon: "deployed_code", desc: "RedPontis o el Sponsor lo publica directo — sin organizador externo." },
  b2b:      { label: "B2B",      icon: "business_center", desc: "Un organizador dedicado lo gestiona desde su propio panel." },
  b2c:      { label: "B2C",      icon: "person_add",      desc: "Lo crea un usuario final desde la app — pasa por aprobación." },
};

// Mapea el evento local (admin) al contrato de la tabla events de Supabase.
export function adminEvToRemote(ev, mundoId) {
  return {
    id: ev.id, mundoId,
    titulo: ev.nombre, descripcion: ev.descripcion,
    fecha: ev.fecha, hora: ev.hora, lugar: ev.lugar,
    aforo: (ev.tiposEntrada || []).reduce((a, t) => a + (t.cupos || 0), 0) || ev.aforo || 0,
    privado: ev.privado === true,
    estado: ev.estado || "PUBLICADO",
    tipoEvento: ev.tipoEvento || "kermesse",
    categoria: ev.categoria || null,
    organizador: ev.organizador || null,
    modo: ev.modo || "embebido",
    organizadorId: ev.organizadorId || null,
    imagenUrl: ev.imagenUrl || null,
    // Plano del recinto. Por ahora un PDF y no un mapa interactivo: es lo que
    // los organizadores ya tienen hecho, y pedirles otra cosa retrasaría el
    // evento sin darle nada al asistente que no le dé el plano.
    mapaUrl: ev.mapaUrl || null,
    mapaNombre: ev.mapaNombre || null,
    uxComponents: ev.uxComponents || ["hero", "entradas", "agenda", "marketplace"],
  };
}

/**
 * Plano del recinto.
 *
 * Es un PDF y no un mapa interactivo a propósito: el plano ya existe, lo hizo
 * quien montó el evento, y pedirle que lo rehaga en otra herramienta atrasa el
 * evento sin darle nada al asistente. Cuando haga falta ubicar puestos uno por
 * uno se cambia; hoy alcanza con que la gente pueda abrirlo en el celular.
 */
function MapaDelEvento({ eventoId, url, nombre, onCambio }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const subir = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Por ahora el plano tiene que ser un PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El PDF pesa más de 10 MB. Comprímelo antes de subirlo.");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const ruta = `eventos/${eventoId || uid("ev")}/mapa-${Date.now()}.pdf`;
      const publica = await uploadArchivo("joi360-media", ruta, file);
      onCambio(publica, file.name);
    } catch (err) {
      setError(`No se pudo subir el plano: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Field label="Mapa del evento (PDF)" hint="Lo verá el asistente en la ficha del evento, dentro del app.">
      {url ? (
        <div className="flex items-center gap-3 p-3 border border-outline-variant rounded-lg bg-surface-container-low">
          <Icon n="picture_as_pdf" className="text-error text-[22px]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{nombre || "Plano del recinto"}</p>
            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              Ver plano
            </a>
          </div>
          <button type="button" onClick={() => onCambio(null, null)}
            className="text-xs text-on-surface-variant hover:text-error transition-colors px-2 py-1">
            Quitar
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-outline-variant rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
          <Icon n={subiendo ? "hourglass_empty" : "upload_file"} className="text-on-surface-variant text-[20px]" />
          <span className="text-sm text-on-surface-variant">
            {subiendo ? "Subiendo…" : "Subir plano en PDF"}
          </span>
          <input type="file" accept="application/pdf" className="hidden" onChange={subir} disabled={subiendo} />
        </label>
      )}
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </Field>
  );
}

// Banner de portada. Antes era un campo de texto libre para pegar una URL
// pública — en la práctica nadie tenía dónde alojar una imagen, así que el
// campo quedaba vacío o roto. Ahora sube el archivo directo al bucket
// joi360-media (mismo patrón que MapaDelEvento) y el resultado se refleja
// solo en el superapp: la app lee `events.imagen_url` tal cual, sin
// transformación adicional.
function BannerDelEvento({ eventoId, url, onCambio }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const subir = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El banner tiene que ser una imagen (JPG, PNG o WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen pesa más de 5 MB. Comprímela antes de subirla.");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const ruta = `eventos/${eventoId || uid("ev")}/banner-${Date.now()}.${ext}`;
      const publica = await uploadArchivo("joi360-media", ruta, file);
      onCambio(publica);
    } catch (err) {
      setError(`No se pudo subir el banner: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Field label="Imagen de portada" hint="Se ve como banner en el app del mundo y en el detalle del evento.">
      {url ? (
        <div className="relative">
          <img src={url} alt="Banner del evento" className="w-full h-32 object-cover rounded-lg border border-outline-variant" />
          <button type="button" onClick={() => onCambio("")}
            className="absolute top-2 right-2 bg-surface-container-lowest/90 hover:bg-error hover:text-white text-on-surface-variant rounded-full w-7 h-7 flex items-center justify-center transition-colors">
            <Icon n="close" className="text-[16px]" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-outline-variant rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
          <Icon n={subiendo ? "hourglass_empty" : "add_photo_alternate"} className="text-on-surface-variant text-[20px]" />
          <span className="text-sm text-on-surface-variant">
            {subiendo ? "Subiendo…" : "Subir imagen de portada"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={subir} disabled={subiendo} />
        </label>
      )}
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </Field>
  );
}

// Tickets reales por evento desde Supabase — base del aforo en tiempo real.
// No hay SDK/websockets en este proyecto (fetch plano contra PostgREST), así
// que "tiempo real" acá es polling: refresca sola cada 6s sin que nadie
// toque "Actualizar" — igual se puede forzar de inmediato con refreshKey.
const TICKETS_POLL_MS = 6000;
function useTicketsLive(eventos, refreshKey) {
  const [map, setMap] = useState({});
  const idsKey = eventos.map(e => e.id).join(",");
  React.useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      const out = {};
      await Promise.all(eventos.map(async ev => {
        try { out[ev.id] = (await fetchTicketsDeEvento(ev.id)) || []; }
        catch { out[ev.id] = null; } // null = sin datos remotos (tabla aún no migrada)
      }));
      if (vivo) setMap(out);
    };
    cargar();
    const timer = idsKey ? setInterval(cargar, TICKETS_POLL_MS) : null;
    return () => { vivo = false; if (timer) clearInterval(timer); };
  }, [idsKey, refreshKey]);
  return map;
}

const countVendidas = tk => (tk || []).filter(t => t.estado !== "anulado").length;
const countDentro   = tk => (tk || []).filter(t => t.estado === "checkin").length;
const sumIngresos   = tk => (tk || []).filter(t => t.estado !== "anulado").reduce((a, t) => a + (+t.precio || 0), 0);

/* Login real del organizador — reemplaza la antigua "vista previa RP" única.
   Sin esto, Gantt #62 ("Designar organizador(es)") quedaba bloqueado: no
   existía ninguna identidad propia, solo la sesión del Admin RP. */
function OrganizadorGate({ m, mundoId }) {
  const [f, setF] = useState({ usuario: "", password: "" });
  const [err, setErr] = useState("");
  const handleLogin = (e) => {
    e.preventDefault();
    const ok = organizadorLogin(mundoId, f.usuario, f.password);
    if (!ok) setErr("Credenciales inválidas. Solicítalas al administrador del mundo.");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0035b9 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: m.color || "#0035b9" }}><Icon n="confirmation_number" /></div>
          <div>
            <h1 className="text-lg font-black">Organizador de eventos</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase">{m.nombre} · Dashboard B2B</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Usuario"><input className={`${inputCls} font-mono text-xs`} value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} placeholder="usuario asignado por RedPontis" /></Field>
          <Field label="Contraseña"><input className={inputCls} type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
          {err && <p className="text-xs text-error">{err}</p>}
          <BtnPrimary type="submit" className="w-full"><Icon n="login" className="text-[18px]" /> Ingresar al panel</BtnPrimary>
        </form>
        <p className="text-center text-xs text-on-surface-variant mt-4">¿Sin acceso? Contacta al administrador del mundo <b>{m.nombre}</b> para que te registre como organizador.</p>
        <Link to="/login" className="block text-center text-xs text-primary hover:underline mt-3">Soy de RedPontis — iniciar sesión admin →</Link>
      </div>
    </div>
  );
}

export function OrganizadorFront() {
  const { id } = useParams();
  const st = useStore();
  const m = (st.mundos||[]).find(x => x.id === id);
  if (!m) return <div className="min-h-screen flex items-center justify-center"><p>Mundo no encontrado.</p></div>;

  const adminSess = session();
  const orgSess = organizadorSession();
  const isPreviewRP = !!adminSess;
  const isOrganizador = orgSess?.mundoId === id;

  if (!isPreviewRP && !isOrganizador) return <OrganizadorGate m={m} mundoId={id} />;

  const todosEventos = (st.eventos||[]).filter(e => e.mundoId === id);
  // Un organizador real solo ve y gestiona SUS eventos B2B; RP en preview ve todo.
  const eventos = isOrganizador ? todosEventos.filter(e => e.organizadorId === orgSess.organizadorId) : todosEventos;
  React.useEffect(() => { refreshEventosLive(id); }, [id]);
  const [tab, setTab] = useState("eventos");
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [organizadores, setOrganizadores] = useState([]);
  React.useEffect(() => { fetchOrganizadoresRemote(id).then(r => setOrganizadores(r || [])).catch(() => {}); }, [id]);
  // Aforo/ventas en tiempo real: tickets reales comprados desde la superapp.
  const [refreshKey, setRefreshKey] = useState(0);
  const ticketsMap = useTicketsLive(eventos, refreshKey);
  const refreshTickets = () => setRefreshKey(k => k + 1);

  const tabs = [
    { k: "eventos", l: "Mis Eventos", i: "confirmation_number" },
    { k: "comercios", l: "Comercios", i: "storefront" },
    { k: "asistencia", l: "Asistencia", i: "people" },
    { k: "banditas_evento", l: "Banditas del evento", i: "sensors" },
    { k: "liquidacion", l: "Liquidaciones", i: "account_balance" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bright">
      {/* Sidebar — mismo diseño admin */}
      <aside className="w-[280px] bg-surface-container-lowest border-r border-outline-variant flex flex-col h-full py-10 flex-shrink-0">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ background: m.color || "#0035b9" }}>
              <Icon n="confirmation_number" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight text-primary tracking-tight">Organizador</h1>
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">{m.nombre} · B2B{isOrganizador ? ` · ${orgSess.nombre}` : ""}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <p className="px-4 pb-1 pt-2 font-mono text-[9px] uppercase tracking-widest text-outline">Gestión de eventos</p>
          <ul className="space-y-0.5 mb-4">
            {tabs.map(t => (
              <li key={t.k}>
                <button onClick={() => setTab(t.k)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${tab === t.k ? "text-primary font-bold bg-primary-fixed border-r-4 border-primary" : "text-on-surface-variant hover:text-primary hover:bg-surface-container"}`}>
                  <Icon n={t.i} fill={tab === t.k} className="text-[20px]" />{t.l}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-outline-variant pt-4 mt-4">
            {isPreviewRP ? (
              <div className="mx-3 bg-primary-fixed border border-primary/20 rounded-lg p-3 text-[11px] text-primary mb-3">
                <p className="font-semibold mb-1 flex items-center gap-1"><Icon n="visibility" className="text-[14px]" /> Vista preview RedPontis</p>
                <p className="text-on-surface-variant">Ves todos los eventos B2B del mundo. Un organizador logueado solo ve los suyos.</p>
              </div>
            ) : (
              <button onClick={organizadorLogout} className="mx-3 w-[calc(100%-1.5rem)] flex items-center gap-2 text-sm text-on-surface-variant hover:text-error mb-3">
                <Icon n="logout" className="text-[18px]" /> Cerrar sesión
              </button>
            )}
          </div>
        </nav>
        <div className="px-4 pt-4 border-t border-outline-variant">
          <Link to={`/admin/mundos/${id}`} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
            <Icon n="arrow_back" className="text-[18px]" /> Volver al mundo
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Ribbon preview — solo cuando es RP mirando, no cuando el organizador entra con su propia sesión */}
        {isPreviewRP && (
          <div className="bg-tertiary text-white px-8 py-2 flex items-center gap-2 flex-shrink-0">
            <Icon n="visibility" className="text-[16px]" />
            <span className="font-mono text-[11px] uppercase tracking-widest">Dashboard B2B Organizador — vista previa RedPontis · {m.nombre}</span>
          </div>
        )}

        {/* TopBar — mismo diseño admin */}
        <header className="bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center px-8 h-16 z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-6">
            <span className="font-black text-xl text-on-surface">JOI 360 Ecosystem</span>
            <div className="hidden lg:flex items-center gap-5 ml-4">
              <span className="text-primary border-b-2 border-primary pb-0.5 text-sm font-medium">Eventos</span>
              <span className="text-on-surface-variant text-sm hover:text-primary cursor-pointer">Soporte</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-56 hidden md:block">
              <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
              <input className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Buscar evento..." />
            </div>
            <button className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant"><Icon n="notifications" /></button>
            <div className="h-7 w-px bg-outline-variant mx-1"></div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{isOrganizador ? orgSess.nombre : (m.entidadLegal || m.nombre)}</p>
              <p className="text-[10px] text-outline uppercase font-bold leading-none">B2B Organizador</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: m.color || "#0035b9" }}>
              {(isOrganizador ? orgSess.nombre : m.nombre)[0]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {tab === "eventos" && (
            <TabEventosOrganizador m={m} eventos={eventos} ticketsMap={ticketsMap} onRefresh={refreshTickets}
              onNew={() => { setEditingEvento(null); setNewEventOpen(true); }}
              onEdit={(ev) => { setEditingEvento(ev); setNewEventOpen(true); }} />
          )}
          {tab === "comercios" && <TabComerciosOrganizador m={m} eventos={eventos} />}
          {tab === "asistencia" && <TabAsistenciaOrganizador m={m} eventos={eventos} ticketsMap={ticketsMap} onRefresh={refreshTickets} />}
          {tab === "banditas_evento" && <TabBanditasEventoOrganizador m={m} eventos={eventos} />}
          {tab === "liquidacion" && <TabLiqOrganizador m={m} eventos={eventos} ticketsMap={ticketsMap} />}
        </div>
      </main>

      <EventoDrawer
        open={newEventOpen}
        onClose={() => { setNewEventOpen(false); setEditingEvento(null); }}
        mundoId={id}
        editing={editingEvento}
        modosPermitidos={["b2b"]}
        organizadorFijo={isOrganizador ? { id: orgSess.organizadorId, nombre: orgSess.nombre } : null}
        organizadores={organizadores}
      />
    </div>
  );
}

/* -------- Tab Eventos -------- */
function TabEventosOrganizador({ m, eventos, ticketsMap, onRefresh, onNew, onEdit }) {
  const publicados = eventos.filter(e => e.estado === "PUBLICADO").length;
  // Ventas reales (tickets emitidos desde la superapp); fallback al dato local.
  const vendidasDe = ev => {
    const tk = ticketsMap[ev.id];
    if (Array.isArray(tk)) return countVendidas(tk);
    return (ev.tiposEntrada || []).reduce((a, t) => a + (t.vendidas || t.cuposVendidos || 0), 0) || ev.vendidas || 0;
  };
  const ingresosDe = ev => {
    const tk = ticketsMap[ev.id];
    if (Array.isArray(tk)) return sumIngresos(tk);
    return (ev.tiposEntrada || [{ precio: ev.precio || 0, vendidas: ev.vendidas || 0 }])
      .reduce((s, t) => s + (t.precio || 0) * (t.vendidas || t.cuposVendidos || 0), 0);
  };
  const totalVendidas = eventos.reduce((a, e) => a + vendidasDe(e), 0);
  const totalIngresos = eventos.reduce((a, e) => a + ingresosDe(e), 0);
  const dentroAhora   = eventos.reduce((a, e) => a + countDentro(ticketsMap[e.id]), 0);

  const toggleEstado = (ev) => {
    const next = ev.estado === "PUBLICADO" ? "PAUSADO" : "PUBLICADO";
    update(s => { const _ev=(s.eventos||[]).find(x=>x.id===ev.id); if(_ev) _ev.estado=next; });
    // Rules Engine: pausado deja de aparecer en el marketplace de la app.
    upsertEventoRemote(adminEvToRemote({ ...ev, estado: next }, m.id))
      .then(() => notify(`Evento "${ev.nombre}" ${next === "PUBLICADO" ? "publicado en app y landing" : "pausado"}.`, "info"))
      .catch(e => notify(`Cambio guardado localmente, pero no se publicó en la app: ${e.message}`, "error"));
  };

  // deleteEventoRemote ya existía en supabase.js pero nunca estaba cableado
  // a ningún botón — un evento en borrador/rechazado con 0 ventas reales no
  // tenía forma de eliminarse, solo "editar y reenviar" o quedar pausado para
  // siempre. Solo se permite sin ninguna entrada vendida — con ventas reales,
  // borrar el evento se llevaría ese historial sin dejar rastro.
  const eliminarEvento = async (ev) => {
    if (vendidasDe(ev) > 0) {
      notify(`No se puede eliminar "${ev.nombre}": ya tiene ${vendidasDe(ev)} entrada(s) vendida(s). Pausa el evento en vez de eliminarlo.`, "error");
      return;
    }
    if (!window.confirm(`¿Eliminar el evento "${ev.nombre}"? No tiene entradas vendidas. Esta acción es irreversible.`)) return;
    try {
      await deleteEventoRemote(ev.supabaseId || ev.id);
      update(s => { s.eventos = (s.eventos || []).filter(x => x.id !== ev.id); });
      notify(`Evento "${ev.nombre}" eliminado.`);
    } catch (e) {
      notify(`No se pudo eliminar: ${e.message}`, "error");
    }
  };

  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Mis Eventos</h2>
          <p className="text-on-surface-variant mt-1"><b>{publicados}</b> publicados · <b>{eventos.length}</b> totales</p>
        </div>
        <div className="flex gap-2">
          <BtnOutline onClick={onRefresh}><Icon n="refresh" className="text-[18px]" /> Actualizar ventas</BtnOutline>
          <BtnPrimary onClick={onNew}><Icon n="add" className="text-[18px]" /> Crear evento</BtnPrimary>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { l: "Entradas vendidas", v: totalVendidas, i: "confirmation_number", color: "text-primary" },
          { l: "Ingresos brutos", v: `S/ ${totalIngresos.toLocaleString()}`, i: "payments", color: "text-secondary" },
          { l: "En el evento ahora", v: dentroAhora, i: "directions_walk", color: "text-tertiary" },
          { l: "Eventos publicados", v: publicados, i: "event_available", color: "text-ok" },
        ].map(({ l, v, i, color }) => (
          <div key={l} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-primary transition-colors">
            <div className="flex justify-between mb-2"><span className="font-mono text-[10px] uppercase text-outline">{l}</span><Icon n={i} className={`text-[20px] ${color}`} /></div>
            <p className="text-2xl font-black">{v}</p>
          </div>
        ))}
      </div>

      {/* ── Widget: Aforo en tiempo real (doc §5.3 — Analytics Widget nuevo) ── */}
      {eventos.filter(e => e.estado === "PUBLICADO").length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold flex items-center gap-2"><Icon n="reduce_capacity" className="text-primary text-[20px]" /> Aforo en tiempo real</p>
            <span className="font-mono text-[10px] uppercase text-outline">tickets reales · Supabase</span>
          </div>
          <div className="space-y-4">
            {eventos.filter(e => e.estado === "PUBLICADO").map(ev => {
              const tk = ticketsMap[ev.id];
              const aforo = (ev.tiposEntrada || []).reduce((a, t) => a + (t.cupos || 0), 0) || ev.aforo || 0;
              const vend = vendidasDe(ev);
              const dentro = countDentro(tk);
              const pctVend = aforo > 0 ? Math.min(100, Math.round((vend / aforo) * 100)) : 0;
              const pctDentro = aforo > 0 ? Math.min(100, Math.round((dentro / aforo) * 100)) : 0;
              const lleno = aforo > 0 && vend >= aforo;
              return (
                <div key={ev.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-sm font-medium">{ev.nombre}</p>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-on-surface-variant">
                      <span><b className="text-on-surface">{vend}</b>/{aforo} vendidas</span>
                      <span><b className="text-tertiary">{dentro}</b> dentro</span>
                      {lleno && <Pill color="bg-error">AFORO LLENO · venta bloqueada</Pill>}
                    </div>
                  </div>
                  <div className="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div className={`absolute h-full rounded-full ${lleno ? "bg-error" : "bg-primary/40"}`} style={{ width: `${pctVend}%` }}></div>
                    <div className="absolute h-full rounded-full bg-tertiary" style={{ width: `${pctDentro}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {eventos.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
          <Icon n="confirmation_number" className="text-[56px] text-outline mb-3 block mx-auto" />
          <p className="text-lg font-semibold mb-2">Sin eventos todavía</p>
          <p className="text-sm mb-4">Crea tu primer evento con el botón de arriba. Aparecerá en el app y el landing del mundo.</p>
          <BtnPrimary onClick={onNew}><Icon n="add" className="text-[18px]" /> Crear primer evento</BtnPrimary>
        </div>
      ) : (
        <div className="space-y-4">
          {eventos.map(ev => {
            const tickets = ev.tiposEntrada || [{ nombre: "General", precio: ev.precio || 0, cupos: ev.aforo || 0, vendidas: ev.vendidas || 0 }];
            const totalCupos = tickets.reduce((a, t) => a + (t.cupos || 0), 0);
            const totalVend = vendidasDe(ev);
            const pct = totalCupos > 0 ? Math.round((totalVend / totalCupos) * 100) : 0;
            const ingresos = ingresosDe(ev);
            const tkLive = ticketsMap[ev.id];
            const vendPorTipo = tipo => Array.isArray(tkLive)
              ? tkLive.filter(t => t.estado !== "anulado" && t.ticket_type_id === tipo.supabaseId).length
              : (tipo.vendidas || tipo.cuposVendidos || 0);
            return (
              <div key={ev.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="flex gap-0">
                  {ev.imagenUrl && (
                    <div className="w-32 flex-shrink-0 bg-surface-container">
                      <img src={ev.imagenUrl} alt={ev.nombre} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                    </div>
                  )}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{ev.nombre}</h3>
                        <p className="font-mono text-[10px] text-on-surface-variant uppercase">{ev.fecha} {ev.hora ? `· ${ev.hora}` : ""} · {ev.lugar}</p>
                        {ev.descripcion && <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{ev.descripcion}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Pill color={ev.estado === "PUBLICADO" ? "bg-ok" : ev.estado === "PENDIENTE_APROBACION" ? "bg-tertiary" : ev.estado === "RECHAZADO" ? "bg-error" : "bg-outline"}>
                          {ev.estado === "PENDIENTE_APROBACION" ? "EN REVISIÓN RP" : ev.estado}
                        </Pill>
                        <button onClick={() => onEdit(ev)} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="edit" className="text-[16px]" /></button>
                        {vendidasDe(ev) === 0 && (
                          <button onClick={() => eliminarEvento(ev)} className="p-1.5 rounded border border-outline-variant text-error hover:bg-error-container/20" title="Eliminar (sin entradas vendidas)">
                            <Icon n="delete" className="text-[16px]" />
                          </button>
                        )}
                        {ev.estado === "PENDIENTE_APROBACION" ? (
                          <span className="font-mono text-[9px] text-on-surface-variant uppercase px-2">esperando aprobación final</span>
                        ) : ev.estado === "RECHAZADO" ? (
                          <span className="font-mono text-[9px] text-error uppercase px-2">rechazado · edita y reenvía</span>
                        ) : (
                          <button onClick={() => toggleEstado(ev)} className="px-3 py-1.5 rounded border border-outline-variant font-mono text-[10px] uppercase hover:bg-surface-container">
                            {ev.estado === "PUBLICADO" ? "Pausar" : "Publicar"}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Tipos de entrada */}
                    <div className="flex gap-2 flex-wrap mb-3">
                      {tickets.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-xs">
                          <Icon n="confirmation_number" className="text-primary text-[14px]" />
                          <span className="font-medium">{t.nombre}</span>
                          <span className="font-mono text-on-surface-variant">S/ {t.precio}</span>
                          <span className="text-outline">· {vendPorTipo(t)}/{t.cupos || "∞"}</span>
                        </div>
                      ))}
                      {ev.privado && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-xs text-on-surface-variant">
                          <Icon n="visibility_off" className="text-[14px]" /> Privado · oculto en marketplace
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-6 font-mono text-[11px] text-on-surface-variant">
                        <span><b className="text-on-surface">{totalVend}</b> vendidas</span>
                        <span><b className="text-on-surface">{totalCupos}</b> aforo</span>
                        <span><b className="text-primary">S/ {ingresos.toLocaleString()}</b> ingresos</span>
                        {ev.metodoAcceso && <span><Icon n={ev.metodoAcceso === "bandita" ? "contactless" : "qr_code_scanner"} className="text-[14px] inline" /> {ev.metodoAcceso === "bandita" ? "Bandita NFC" : ev.metodoAcceso === "ambos" ? "QR + Bandita" : "QR"}</span>}
                      </div>
                      <span className={`font-mono text-xs font-bold ${pct >= 80 ? "text-error" : pct >= 50 ? "text-tertiary" : "text-ok"}`}>{pct}% ocupado</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-2">
                      <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-error" : pct >= 50 ? "bg-tertiary" : "bg-ok"}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* -------- Tab Comercios — afiliar/ubicar comercios + catálogo del evento
   (Gantt #63/#67/#70). Antes: la vitrina de un evento en la app mostraba
   TODOS los comercios activos del mundo — sin afiliación real. -------- */
export function TabComerciosOrganizador({ m, eventos }) {
  const publicados = eventos.filter(e => e.estado === "PUBLICADO" || e.estado === "PENDIENTE_APROBACION");
  const [merchants, setMerchants] = useState(null);
  React.useEffect(() => { fetchMerchantsRemote(m.id).then(r => setMerchants(r || [])).catch(() => setMerchants([])); }, [m.id]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Comercios del evento</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Afilia qué comercios del mundo participan en cada evento, asígnales una ubicación y define su catálogo específico (ej. menú de kermesse).</p>
      </div>
      {publicados.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
          <Icon n="storefront" className="text-[48px] text-outline mb-3 block mx-auto" />
          No hay eventos activos para afiliar comercios.
        </div>
      ) : publicados.map(ev => (
        <EventoComerciosCard key={ev.id} ev={ev} worldId={m.id} merchants={merchants} />
      ))}
    </>
  );
}

function EventoComerciosCard({ ev, worldId, merchants }) {
  const [afiliados, setAfiliados] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [catalogoAbierto, setCatalogoAbierto] = useState(null); // merchant_id
  const [hardwareEvento, setHardwareEvento] = useState(null);

  const cargar = () => fetchEventMerchants(ev.id).then(r => setAfiliados(r || [])).catch(() => setAfiliados([]));
  React.useEffect(() => { cargar(); }, [ev.id]);
  React.useEffect(() => { fetchPosDevicesDeEvento(ev.id).then(r => setHardwareEvento(r || [])).catch(() => setHardwareEvento([])); }, [ev.id]);

  const toggleAfiliar = async (merchant, afiliado) => {
    setBusyId(merchant.id);
    try {
      if (afiliado) { await desafiliarComercioEvento(afiliado.id); notify(`${merchant.name} ya no participa en "${ev.nombre}".`, "info"); }
      else { await afiliarComercioEvento(ev.id, merchant.id, merchant.name); notify(`${merchant.name} afiliado a "${ev.nombre}".`); }
      await cargar();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `afiliar-comercio:${ev.id}`, ev.mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
    finally { setBusyId(null); }
  };

  const setUbicacion = async (afiliado, ubicacion) => {
    setAfiliados(rows => rows.map(a => a.id === afiliado.id ? { ...a, ubicacion } : a));
    try { await updateUbicacionEventoComercio(afiliado.id, ubicacion); } catch {}
  };

  if (!Array.isArray(merchants)) return null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <p className="font-bold">{ev.nombre}</p>
        <p className="font-mono text-[10px] text-on-surface-variant uppercase">{ev.fecha} {ev.hora || ""} · {(afiliados || []).length} comercios afiliados</p>
      </div>
      {/* Hardware específico del evento (Gantt #60) — asignación real ya existe
          en Hardware/POS global (assignPosDeviceRemote ya acepta eventId);
          esto solo la hace visible dentro de la pantalla del evento. */}
      <div className="px-6 py-3 border-b border-outline-variant/60 flex items-center gap-2 flex-wrap">
        <Icon n="point_of_sale" className="text-[16px] text-outline flex-shrink-0" />
        <span className="font-mono text-[10px] uppercase text-outline">Hardware del evento:</span>
        {hardwareEvento === null ? (
          <span className="text-[10px] text-outline">cargando…</span>
        ) : hardwareEvento.length === 0 ? (
          <span className="text-[10px] text-outline">sin equipos prestados a este evento</span>
        ) : (
          hardwareEvento.map(d => (
            <span key={d.id} className="font-mono text-[10px] bg-surface-container px-1.5 py-0.5 rounded">{d.serial}</span>
          ))
        )}
        <Link to="/admin/hardware-pos" className="text-[10px] text-primary hover:underline ml-auto flex-shrink-0">Asignar en Hardware/POS →</Link>
      </div>
      {merchants.length === 0 ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant">Este mundo aún no tiene comercios cargados (Actores → Merchants).</p>
      ) : afiliados === null ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant">Cargando…</p>
      ) : (
        <div className="divide-y divide-outline-variant/60">
          {merchants.map(merchant => {
            const afiliado = afiliados.find(a => a.merchant_id === merchant.id);
            return (
              <div key={merchant.id} className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleAfiliar(merchant, afiliado)} disabled={busyId === merchant.id}
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${afiliado ? "bg-ok border-ok" : "border-outline-variant"}`}>
                    {afiliado && <Icon n="check" className="text-[14px] text-white" />}
                  </button>
                  <span className="flex-1 font-medium text-sm">{merchant.name}</span>
                  {afiliado && (
                    <>
                      <input className={`${inputCls} !w-44 !py-1.5 text-xs`} placeholder="Ubicación / stand"
                        defaultValue={afiliado.ubicacion || ""} onBlur={e => setUbicacion(afiliado, e.target.value)} />
                      <button onClick={() => setCatalogoAbierto(catalogoAbierto === merchant.id ? null : merchant.id)}
                        className="text-xs font-bold text-primary flex items-center gap-1 flex-shrink-0">
                        <Icon n="restaurant_menu" className="text-[16px]" /> Catálogo del evento
                      </button>
                    </>
                  )}
                </div>
                {afiliado && catalogoAbierto === merchant.id && (
                  <EventoCatalogoComercio worldId={worldId} eventId={ev.id} merchant={merchant} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EventoCatalogoComercio({ worldId, eventId, merchant }) {
  const [productos, setProductos] = useState(null);
  const [draft, setDraft] = useState({ name: "", price: "" });
  const cargar = () => fetchProductsRemote(merchant.id, eventId).then(r => setProductos(r || [])).catch(() => setProductos([]));
  React.useEffect(() => { cargar(); }, [merchant.id, eventId]);

  const agregar = async () => {
    if (!draft.name.trim() || !+draft.price) return;
    await upsertProductRemote({ world_id: worldId, merchant_id: merchant.id, name: draft.name.trim(), price: +draft.price }, eventId);
    setDraft({ name: "", price: "" });
    cargar();
  };
  const quitar = async (id) => { await deleteProductRemote(id); cargar(); };

  return (
    <div className="mt-3 ml-8 p-3 bg-surface-container-low rounded-lg border border-outline-variant">
      <p className="font-mono text-[9px] uppercase text-outline mb-2">Productos exclusivos de este evento (no afecta el catálogo regular)</p>
      {productos === null ? (
        <p className="text-xs text-on-surface-variant">Cargando…</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {productos.length === 0 && <p className="text-xs text-on-surface-variant">Sin productos aún para este evento.</p>}
          {productos.map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs bg-surface-container-lowest px-2.5 py-1.5 rounded border border-outline-variant/60">
              <span>{p.name}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono">S/ {Number(p.price).toFixed(2)}</span>
                <button onClick={() => quitar(p.id)} className="text-error"><Icon n="close" className="text-[14px]" /></button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input className={`${inputCls} !py-1.5 text-xs`} placeholder="Ej. Anticucho" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        <input className={`${inputCls} !w-20 !py-1.5 text-xs`} type="number" placeholder="S/" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} />
        <BtnOutline className="!py-1.5 !px-2.5" onClick={agregar}><Icon n="add" className="text-[16px]" /></BtnOutline>
      </div>
    </div>
  );
}

/* -------- Tab Asistencia — check-in/out por ticket real (QR Scanner) -------- */
export function TabAsistenciaOrganizador({ m, eventos, ticketsMap, onRefresh }) {
  const publicados = eventos.filter(e => e.estado === "PUBLICADO");

  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Control de asistencia</h2>
          <p className="text-on-surface-variant mt-1 text-sm">Escanea o pega el código QR de cada entrada. El check-in alimenta el aforo en tiempo real.</p>
        </div>
        <BtnOutline onClick={onRefresh}><Icon n="refresh" className="text-[18px]" /> Actualizar</BtnOutline>
      </div>
      {publicados.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
          <Icon n="people" className="text-[48px] text-outline mb-3 block mx-auto" />
          No hay eventos publicados con asistencia activa.
        </div>
      ) : publicados.map(ev => (
        <EventoAsistenciaCard key={ev.id} ev={ev} tk={ticketsMap[ev.id]} onRefresh={onRefresh} />
      ))}
    </>
  );
}

// Escaneo por código: un lector QR físico funciona como teclado (tipea el
// código + Enter) — el input captura eso sin necesitar cámara/librería QR.
// Reingresos reales (Gantt #79): checkin_at/checkout_at en event_tickets son
// columnas únicas que se sobrescriben en cada escaneo (reflejan el ÚLTIMO
// movimiento) — el historial real de cada ingreso/salida vive aparte en
// event_checkin_log, así que un ticket puede reingresar tantas veces como
// haga falta sin quedar congelado tras la primera salida.
function EventoAsistenciaCard({ ev, tk, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState(null); // {ok, mensaje, ticket}
  const [log, setLog] = useState(null);
  const [logReload, setLogReload] = useState(0);
  const [tipos, setTipos] = useState(null);

  const vendidos = Array.isArray(tk) ? tk.filter(t => t.estado !== "anulado") : [];
  const dentro = countDentro(tk);
  const recientes = vendidos.filter(t => t.checkin_at).sort((a, b) => new Date(b.checkin_at) - new Date(a.checkin_at)).slice(0, 5);

  React.useEffect(() => {
    let vivo = true;
    fetchCheckinLogEvento(ev.id).then(r => { if (vivo) setLog(r || []); }).catch(() => { if (vivo) setLog([]); });
    fetchTicketTypesDeEvento(ev.id).then(r => { if (vivo) setTipos(r || []); }).catch(() => { if (vivo) setTipos([]); });
    return () => { vivo = false; };
  }, [ev.id, logReload]);
  const ingresosDe = ticketId => (log || []).filter(l => l.ticket_id === ticketId && l.tipo === "ingreso").length;
  // Condición de reingreso (Gantt #59): un tipo de entrada con
  // permite_reingreso=false solo deja hacer el primer ingreso — un checkout
  // ya usado no puede volver a entrar con esa misma entrada.
  const permiteReingreso = ticket => (tipos || []).find(t => t.id === ticket.ticket_type_id)?.permite_reingreso !== false;

  const mover = async (ticket, estado) => {
    if (estado === "checkin" && ticket.estado === "checkout" && !permiteReingreso(ticket)) {
      return rechazar("reingreso_no_permitido", ticket);
    }
    setBusy(ticket.id);
    try {
      await setTicketEstado(ticket, estado);
      logCheckinEvento(ev.id, ticket.id, estado === "checkin" ? "ingreso" : "salida").catch(() => {});
      notify(estado === "checkin" ? "Ingreso registrado — aforo actualizado." : "Salida registrada.");
      onRefresh();
      setLogReload(k => k + 1);
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `asistencia-mover:${ev.id}`, ev.mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBusy(null); }
  };

  // Errores controlados: mensaje+acción vienen del catálogo (error_catalog),
  // y cada rechazo queda registrado en error_log para monitoreo.
  const rechazar = async (code, ticket) => {
    const err = await errorControlado(code);
    logErrorControlado(code, `asistencia:${ev.id}`, ev.mundoId);
    setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" "), ticket });
  };

  // Escanear alterna ingreso/salida según el estado actual del ticket — ya no
  // rechaza un ticket que ya usó su entrada, lo deja reingresar/resalir.
  const escanear = async (e) => {
    e.preventDefault();
    const code = codigo.trim();
    if (!code) return;
    const ticket = vendidos.find(t => t.qr_code === code);
    if (!ticket) return rechazar("codigo_no_encontrado");
    const siguiente = ticket.estado === "checkin" ? "checkout" : "checkin";
    setResultado({ ok: true, mensaje: siguiente === "checkin" ? "Ingreso validado." : "Salida registrada.", ticket });
    await mover(ticket, siguiente);
    setCodigo("");
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <div>
          <p className="font-bold">{ev.nombre}</p>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase">{ev.fecha} {ev.hora || ""} · validación QR</p>
        </div>
        <div className="flex gap-4 font-mono text-[11px] text-on-surface-variant">
          <span><b className="text-on-surface">{vendidos.length}</b> vendidas</span>
          <span><b className="text-on-surface">{vendidos.filter(t => t.checkin_at).length}</b> utilizadas</span>
          <span><b className="text-tertiary">{dentro}</b> dentro ahora</span>
        </div>
      </div>

      {/* Métricas del dashboard que el spec pide y hoy no son calculables con
          el modelo de datos actual — mismo criterio "no simulado" que
          Gobierno.jsx > Reportes: se documenta el gap, no se inventa un número. */}
      <div className="px-6 py-2.5 border-b border-outline-variant bg-surface-container-low/50 flex items-start gap-2">
        <Icon n="info" className="text-[13px] text-outline mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-outline">
          Productos más vendidos, actividades más concurridas y consumo promedio requieren que las ventas de comercio queden
          asociadas al evento (transactions no guarda event_id — mismo gap ya documentado en Gobierno &gt; Reportes). Estado de
          pulseras NFC no se lleva por evento hoy, solo por mundo.
        </p>
      </div>

      {recientes.length > 0 && (
        <div className="px-6 py-3 border-b border-outline-variant bg-surface-container-low/50 flex items-center gap-2 overflow-x-auto">
          <span className="font-mono text-[9px] uppercase text-outline flex-shrink-0">Últimos ingresos</span>
          {recientes.map(t => (
            <span key={t.id} className="flex-shrink-0 font-mono text-[10px] bg-ok/10 text-ok border border-ok/30 rounded-full px-2.5 py-1 flex items-center gap-1">
              <Icon n="check_circle" className="text-[12px]" />
              {t.qr_code.slice(-8)} · {new Date(t.checkin_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={escanear} className="px-6 py-4 border-b border-outline-variant flex gap-2 items-start">
        <div className="flex-1">
          <input autoFocus className={`${inputCls} font-mono`} placeholder="Escanea o pega el código QR de la entrada…"
            value={codigo} onChange={e => { setCodigo(e.target.value); setResultado(null); }} />
          {resultado && (
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${resultado.ok ? "text-ok" : "text-error"}`}>
              <Icon n={resultado.ok ? "check_circle" : "error"} className="text-[14px]" />
              {resultado.mensaje}{resultado.ticket && ` · ${resultado.ticket.qr_code}`}
            </p>
          )}
        </div>
        <BtnPrimary type="submit" disabled={!codigo.trim() || busy}><Icon n="qr_code_scanner" className="text-[18px]" /> Validar</BtnPrimary>
      </form>

      {!Array.isArray(tk) ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant flex items-center gap-2">
          <Icon n="cloud_off" className="text-[18px]" /> Sin conexión con la tabla de tickets (aplicar migración Supabase).
        </p>
      ) : vendidos.length === 0 ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant">Aún no hay entradas vendidas para este evento. Cuando alguien compre en la superapp, su QR aparecerá aquí para validar el ingreso.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-outline border-b border-outline-variant/60">
              <th className="px-6 py-3">Código QR</th>
              <th className="px-6 py-3">Comprada</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Ingresos</th>
              <th className="px-6 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {vendidos.map(t => (
              <tr key={t.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-3 font-mono text-xs flex items-center gap-2">
                  <Icon n="qr_code_2" className="text-primary text-[18px]" />{t.qr_code}
                </td>
                <td className="px-6 py-3 text-on-surface-variant text-xs">{new Date(t.created_at).toLocaleString("es-PE")}</td>
                <td className="px-6 py-3">
                  <Pill color={t.estado === "checkin" ? "bg-ok" : t.estado === "checkout" ? "bg-outline" : "bg-tertiary"}>
                    {t.estado === "checkin" ? "DENTRO" : t.estado === "checkout" ? "SALIÓ" : "EMITIDO"}
                  </Pill>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-on-surface-variant">{ingresosDe(t.id)}</td>
                <td className="px-6 py-3 text-right">
                  {t.estado === "emitido" && (
                    <BtnPrimary className="!py-1.5 !px-3 !text-xs" disabled={busy === t.id} onClick={() => mover(t, "checkin")}>
                      <Icon n="qr_code_scanner" className="text-[14px]" /> Validar ingreso
                    </BtnPrimary>
                  )}
                  {t.estado === "checkin" && (
                    <BtnOutline className="!py-1.5 !px-3 !text-xs" disabled={busy === t.id} onClick={() => mover(t, "checkout")}>
                      <Icon n="logout" className="text-[14px]" /> Registrar salida
                    </BtnOutline>
                  )}
                  {t.estado === "checkout" && (
                    <BtnPrimary className="!py-1.5 !px-3 !text-xs" disabled={busy === t.id} onClick={() => mover(t, "checkin")}>
                      <Icon n="qr_code_scanner" className="text-[14px]" /> Reingreso
                    </BtnPrimary>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* -------- Tab Banditas del evento (Task #119) — cash-in con lista de
   asistencia. Distinto de "Vincular Pulsera NFC" del POS/Operador (#118):
   ese asume que la persona ya tiene cuenta en la app; acá el invitado puede
   no tenerla — se le crea una wallet con user_id sintético al importar la
   lista, y el resto (cobro, consumo, recarga) reusa mover_saldo_wallet sin
   ningún cambio, mismo patrón que un dependiente. Ver
   docs/arquitectura/03-diseno-cashin-evento.md. -------- */
const ESTADO_INVITADO_LABEL = { invitado: "Invitado", bandita_asignada: "Pulsera asignada", activo: "Activo", cerrado: "Cerrado" };
const ESTADO_INVITADO_COLOR = { invitado: "bg-outline", bandita_asignada: "bg-tertiary", activo: "bg-ok", cerrado: "bg-outline" };

export function TabBanditasEventoOrganizador({ m, eventos }) {
  const publicados = eventos.filter(e => e.estado === "PUBLICADO");
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Banditas del evento</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Precarga una lista de invitados por documento, activa su pulsera física con saldo inicial y monitorea el consumo en vivo.</p>
      </div>
      {publicados.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
          <Icon n="sensors" className="text-[48px] text-outline mb-3 block mx-auto" />
          No hay eventos publicados todavía.
        </div>
      ) : publicados.map(ev => (
        <EventoBanditasCard key={ev.id} ev={ev} m={m} />
      ))}
    </>
  );
}

function EventoBanditasCard({ ev, m }) {
  const [guests, setGuests] = useState(null);
  const [importando, setImportando] = useState(false);
  const [fileName, setFileName] = useState("");
  const [activarPara, setActivarPara] = useState(null); // event_guest en edición
  const [cashInPara, setCashInPara] = useState(null);

  const load = () => fetchEventGuests(ev.id).then(setGuests).catch(() => setGuests([]));
  React.useEffect(() => { load(); }, [ev.id]);

  const totalPrecargado = (guests || []).reduce((a, g) => a + (+g.saldo_inicial || 0), 0);
  const totalSaldo = (guests || []).reduce((a, g) => a + (+g.balance || 0), 0);
  const totalConsumo = (guests || []).reduce((a, g) => a + (+g.consumo || 0), 0);

  const importarCSV = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const lineas = String(reader.result).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const primeraFila = lineas[0]?.split(",").map(c => c.trim().toLowerCase()) || [];
      const tieneEncabezado = primeraFila.includes("nombre") || primeraFila.includes("documento");
      const filas = (tieneEncabezado ? lineas.slice(1) : lineas).map(l => {
        const [nombre, documento] = l.split(",").map(c => c.trim());
        return { nombre, documento };
      }).filter(f => f.nombre && f.documento);
      if (!filas.length) { notify("El archivo no tiene filas válidas (nombre, documento).", "error"); return; }
      setImportando(true);
      try {
        const r = await importarInvitadosEventoRemote(ev.id, m.id, m.moneda, file.name, filas, m.nombre);
        notify(`${r.creados} invitados importados${r.duplicados ? ` · ${r.duplicados} documentos duplicados omitidos` : ""}.`);
        load();
      } catch (e) {
        notify("No se pudo importar la lista: " + e.message, "error");
      } finally { setImportando(false); setFileName(""); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <div>
          <p className="font-bold">{ev.nombre}</p>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase">{ev.fecha} {ev.hora || ""} · {guests === null ? "…" : guests.length} invitados</p>
        </div>
        <div className="flex gap-4 font-mono text-[11px] text-on-surface-variant">
          <span>Precargado <b className="text-on-surface">{m.moneda} {totalPrecargado.toFixed(2)}</b></span>
          <span>Saldo vivo <b className="text-on-surface">{m.moneda} {totalSaldo.toFixed(2)}</b></span>
          <span>Consumido <b className="text-tertiary">{m.moneda} {totalConsumo.toFixed(2)}</b></span>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-3">
        <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant text-sm font-medium cursor-pointer hover:border-primary/40 ${importando ? "opacity-50 pointer-events-none" : ""}`}>
          <Icon n="upload_file" className="text-[18px] text-primary" />
          {importando ? `Importando ${fileName}…` : "Importar lista (CSV: nombre, documento)"}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files[0] && importarCSV(e.target.files[0])} />
        </label>
        <span className="text-[10px] text-outline">Cada fila crea al invitado y su billetera en S/0 — sin bandita todavía.</span>
      </div>

      {guests === null ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant">Cargando…</p>
      ) : guests.length === 0 ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant">Sin invitados todavía. Importa una lista arriba.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-outline border-b border-outline-variant/60">
              <th className="px-6 py-3">Invitado</th>
              <th className="px-6 py-3">Documento</th>
              <th className="px-6 py-3">Pulsera</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-right">Saldo</th>
              <th className="px-6 py-3 text-right">Consumo</th>
              <th className="px-6 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {guests.map(g => (
              <tr key={g.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-3 font-semibold">{g.nombre}</td>
                <td className="px-6 py-3 font-mono text-xs text-on-surface-variant">{g.documento}</td>
                <td className="px-6 py-3 font-mono text-xs">{g.bandita_codigo || "—"}</td>
                <td className="px-6 py-3"><Pill color={ESTADO_INVITADO_COLOR[g.estado]}>{ESTADO_INVITADO_LABEL[g.estado] || g.estado}</Pill></td>
                <td className="px-6 py-3 text-right font-mono text-xs">{m.moneda} {Number(g.balance).toFixed(2)}</td>
                <td className="px-6 py-3 text-right font-mono text-xs text-tertiary">{m.moneda} {Number(g.consumo).toFixed(2)}</td>
                <td className="px-6 py-3 text-right">
                  {!g.bandita_codigo ? (
                    <BtnPrimary className="!py-1.5 !px-3 !text-xs" onClick={() => setActivarPara(g)}>
                      <Icon n="sensors" className="text-[14px]" /> Activar pulsera
                    </BtnPrimary>
                  ) : (
                    <BtnOutline className="!py-1.5 !px-3 !text-xs" onClick={() => setCashInPara(g)}>
                      <Icon n="add_card" className="text-[14px]" /> Cash-in
                    </BtnOutline>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activarPara && (
        <ActivarBanditaEventoDrawer guest={activarPara} ev={ev} m={m} onClose={() => setActivarPara(null)}
          onDone={() => { setActivarPara(null); load(); }} />
      )}
      {cashInPara && (
        <CashInBanditaEventoDrawer guest={cashInPara} m={m} onClose={() => setCashInPara(null)}
          onDone={() => { setCashInPara(null); load(); }} />
      )}
    </div>
  );
}

function ActivarBanditaEventoDrawer({ guest, ev, m, onClose, onDone }) {
  const [codigo, setCodigo] = useState("");
  const [monto, setMonto] = useState("");
  const [margenDias, setMargenDias] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const activar = async () => {
    if (!codigo.trim()) return;
    setBusy(true); setError(null);
    try {
      const fechaEvento = ev.fecha ? new Date(ev.fecha) : new Date();
      const venceAt = new Date(fechaEvento.getTime() + (Number(margenDias) || 0) * 86400000).toISOString();
      const r = await activarBanditaEventoRemote({
        guestId: guest.id, worldId: m.id, bandaCodigo: codigo.trim(),
        montoPrecarga: monto ? +monto : 0, venceAt, eventoNombre: ev.nombre,
      });
      notify(`Pulsera ${r.codigo} activada para ${guest.nombre}${monto ? ` · precargada con ${m.moneda} ${(+monto).toFixed(2)}` : ""}.`);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={true} onClose={onClose} icon="sensors" title="Activar pulsera de evento" subtitle={`${guest.nombre} · ${guest.documento}`}
      footer={<><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary loading={busy} loadingLabel="Activando…" disabled={!codigo.trim()} onClick={activar}>Activar pulsera</BtnPrimary></>}>
      <div className="space-y-4">
        <Field label="Código / UID de la pulsera física" hint="Tapea la pulsera contra el lector NFC o escribe el código impreso.">
          <input className={`${inputCls} font-mono`} value={codigo} onChange={e => setCodigo(e.target.value)} autoFocus placeholder="04:D6:01:5A:68:19:94" />
        </Field>
        <Field label={`Saldo a precargar (${m.moneda}, opcional)`} hint="Queda registrado como una recarga real, no un número inventado.">
          <NumInput className={inputCls} min="0" step="0.10" value={monto} onChange={setMonto} />
        </Field>
        <Field label="Vigencia: días después del evento" hint="A diferencia de una bandita normal (meses), esta vence al terminar el evento + este margen.">
          <NumInput className={inputCls} min="0" value={margenDias} onChange={setMargenDias} />
        </Field>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </Drawer>
  );
}

function CashInBanditaEventoDrawer({ guest, m, onClose, onDone }) {
  const [monto, setMonto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const recargar = async () => {
    if (!(+monto > 0)) return;
    setBusy(true); setError(null);
    try {
      const r = await recargarBanditaEventoRemote(guest.guest_user_id, m.id, +monto, `Cash-in evento · ${guest.nombre}`);
      if (!r.ok) { setError("No se pudo procesar el cash-in."); return; }
      notify(`Cash-in de ${m.moneda} ${(+monto).toFixed(2)} para ${guest.nombre}. Nuevo saldo: ${m.moneda} ${r.balance.toFixed(2)}.`);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={true} onClose={onClose} icon="add_card" title="Cash-in de pulsera de evento" subtitle={`${guest.nombre} · pulsera ${guest.bandita_codigo}`}
      footer={<><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary loading={busy} loadingLabel="Procesando…" disabled={!(+monto > 0)} onClick={recargar}>Confirmar cash-in</BtnPrimary></>}>
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">Saldo actual: <b className="text-on-surface">{m.moneda} {Number(guest.balance).toFixed(2)}</b></p>
        <Field label={`Monto a acreditar (${m.moneda})`}>
          <NumInput className={inputCls} min="0.01" step="0.10" value={monto} onChange={setMonto} autoFocus />
        </Field>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </Drawer>
  );
}

/* -------- Tab Liquidaciones — instancia "evento" separada de la diaria -------- */
/* Doc §5.2: el Módulo de Liquidación de Comercios existía solo para operación
   diaria; aquí se extiende con una instancia independiente por evento. */
export function TabLiqOrganizador({ m, eventos, ticketsMap }) {
  const moduloEvento = (m?.modulos||[]).find(x => x.id === "eventos") || {};
  const comisionPct = moduloEvento?.acuerdo?.porTx || moduloEvento?.config?.comisionEntrada || 5;

  const liqDe = ev => {
    const tk = ticketsMap[ev.id];
    const ingresos = Array.isArray(tk)
      ? sumIngresos(tk)
      : (ev.tiposEntrada || [{ precio: ev.precio || 0, vendidas: ev.vendidas || 0 }])
          .reduce((s, t) => s + (t.precio || 0) * (t.vendidas || t.cuposVendidos || 0), 0);
    const comision = ingresos * (comisionPct / 100);
    return { ingresos, comision, neto: ingresos - comision, live: Array.isArray(tk) };
  };
  const total = eventos.reduce((a, e) => { const l = liqDe(e); return { ingresos: a.ingresos + l.ingresos, comision: a.comision + l.comision, neto: a.neto + l.neto }; }, { ingresos: 0, comision: 0, neto: 0 });

  return (
    <>
      <h2 className="text-2xl font-bold mb-2">Mis liquidaciones</h2>
      <p className="text-on-surface-variant mb-6 text-sm">
        Cada evento genera su <b>instancia de liquidación propia</b>, independiente del corte diario de la operación del mundo (cafetería, kiosco).
      </p>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { l: "Ingresos brutos por entradas", v: `S/ ${Number(total.ingresos||0).toFixed(2)}`, i: "payments", accent: false },
          { l: `Comisión RedPontis (${comisionPct}% por entrada)`, v: `S/ ${Number(total.comision||0).toFixed(2)}`, i: "percent", accent: false },
          { l: "Neto al organizador", v: `S/ ${Number(total.neto||0).toFixed(2)}`, i: "account_balance", accent: true },
        ].map(({ l, v, i, accent }) => (
          <div key={l} className={`border rounded-xl p-5 shadow-sm ${accent ? "border-primary/40 bg-primary-fixed/20" : "border-outline-variant bg-surface-container-lowest"}`}>
            <div className="flex justify-between mb-2">
              <span className="font-mono text-[10px] uppercase text-outline">{l}</span>
              <Icon n={i} className={`text-[20px] ${accent ? "text-primary" : "text-on-surface-variant"}`} />
            </div>
            <p className={`text-2xl font-black ${accent ? "text-primary" : ""}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Instancias por evento */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <p className="font-semibold flex items-center gap-2"><Icon n="receipt_long" className="text-primary text-[20px]" /> Instancias de liquidación por evento</p>
          <span className="font-mono text-[10px] uppercase text-outline">separadas de la liquidación diaria</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-outline border-b border-outline-variant/60">
              <th className="px-6 py-3">Evento</th>
              <th className="px-6 py-3">Instancia</th>
              <th className="px-6 py-3 text-right">Ingresos</th>
              <th className="px-6 py-3 text-right">Comisión</th>
              <th className="px-6 py-3 text-right">Neto</th>
              <th className="px-6 py-3 text-right">Corte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {eventos.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-on-surface-variant text-center">Sin eventos con liquidación.</td></tr>
            )}
            {eventos.map(ev => {
              const l = liqDe(ev);
              return (
                <tr key={ev.id} className="hover:bg-surface-container-low">
                  <td className="px-6 py-3 font-semibold">{ev.nombre}</td>
                  <td className="px-6 py-3"><Pill color="bg-primary">EVENTO · {ev.fecha || "s/f"}</Pill></td>
                  <td className="px-6 py-3 text-right font-mono">S/ {l.ingresos.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono text-on-surface-variant">S/ {l.comision.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-primary">S/ {l.neto.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-mono text-[11px] text-on-surface-variant">{l.live ? "T+1 tras cierre del evento" : "pendiente sync"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-secondary-fixed border border-secondary/30 rounded-lg p-4 flex gap-3 text-xs text-on-surface-variant">
        <Icon n="info" className="text-secondary text-[20px]" />
        <p>La <b>operación diaria del mundo</b> (cafetería, kiosco) mantiene su corte a las <b>19:00 PE</b> vía el Módulo de Liquidación de Comercios. Las entradas de cada evento se liquidan en su <b>instancia propia</b> al cierre del evento (T+1). El neto se acredita en la cuenta bancaria del acuerdo del mundo.</p>
      </div>
    </>
  );
}

/* -------- Drawer: Crear/Editar Evento COMPLETO -------- */
export function EventoDrawer({ open, onClose, mundoId, editing, modosPermitidos = ["embebido"], organizadorFijo = null, organizadores = [] }) {
  const modoDefault = organizadorFijo ? "b2b" : (modosPermitidos[0] || "embebido");
  const blank = {
    nombre: "", descripcion: "", fecha: "", hora: "18:00", lugar: "", imagenUrl: "", mapaUrl: null, mapaNombre: null,
    tipo: "presencial", metodoAcceso: "qr",
    tipoEvento: "kermesse", // catálogo completo de Tipos de Evento: R2 (doc §5.2)
    privado: false,         // Rules Engine: privado → oculto del marketplace
    modo: modoDefault,                                   // criterio del evento: b2b | b2c | embebido
    organizadorId: organizadorFijo?.id || "",
    tiposEntrada: [{ id: uid("te"), nombre: "General", precio: 0, cupos: 100, descripcion: "", cuposVendidos: 0, minPorCompra: 1, maxPorCompra: 4, ventaDesde: "", ventaHasta: "", permiteReingreso: true, vigenciaHasta: "", preventa: false, precompra: false, prereserva: false }],
    politicaReembolso: "No reembolsable",
    instrucciones: "",
    publicarEnLanding: true,
    publicarEnApp: true,
  };
  const [f, setF] = useState(blank);
  const [step, setStep] = useState(1);
  // Cronograma real (Gantt #66/#78) — solo disponible editando un evento ya
  // publicado (necesita un event_id real para el FK); un evento nuevo se
  // guarda primero y el cronograma se carga reabriendo en modo edición.
  const [agenda, setAgenda] = useState([]);
  const [agendaItem, setAgendaItem] = useState({ hora: "", titulo: "", descripcion: "", lugar: "", expositor: "", imagen_url: "" });

  React.useEffect(() => {
    if (open) {
      setStep(1);
      if (editing) {
        setF({
          ...blank,
          ...editing,
          modo: editing.modo || modoDefault,
          organizadorId: editing.organizadorId || organizadorFijo?.id || "",
          tiposEntrada: editing.tiposEntrada || [{ id: uid("te"), nombre: "General", precio: editing.precio || 0, cupos: editing.aforo || 100, descripcion: "", cuposVendidos: editing.vendidas || 0 }],
        });
        fetchAgendaEvento(editing.id).then(r => setAgenda(r || [])).catch(() => setAgenda([]));
      } else {
        setF(blank);
        setAgenda([]);
      }
      setAgendaItem({ hora: "", titulo: "", descripcion: "" });
    }
  }, [open, editing]);

  const addAgendaItem = async () => {
    if (!agendaItem.titulo.trim()) return;
    try {
      const saved = await upsertAgendaItem({
        event_id: editing.id, hora: agendaItem.hora || null,
        titulo: agendaItem.titulo.trim(), descripcion: agendaItem.descripcion || null, orden: agenda.length,
        lugar: agendaItem.lugar || null, expositor: agendaItem.expositor || null, imagen_url: agendaItem.imagen_url || null,
      });
      setAgenda([...agenda, saved].sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      setAgendaItem({ hora: "", titulo: "", descripcion: "", lugar: "", expositor: "", imagen_url: "" });
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `agenda-agregar:${editing?.id}`, mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };
  const removeAgendaItem = async (id) => {
    try { await deleteAgendaItem(id); setAgenda(agenda.filter(a => a.id !== id)); }
    catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `agenda-quitar:${editing?.id}`, mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };

  const requiereOrganizador = f.modo === "b2b" && !organizadorFijo;
  const organizadorElegido = organizadorFijo || organizadores.find(o => o.id === f.organizadorId);
  const canPublish = f.nombre && f.fecha && (!requiereOrganizador || f.organizadorId);

  const save = async () => {
    const evId = editing?.id || uid("ev");
    // Release gate: todo evento nuevo (o rechazado que se reenvía) pasa por la
    // cola de aprobación de RedPontis antes de publicarse en la superapp.
    const estadoFinal = editing && !["RECHAZADO", "PENDIENTE_APROBACION"].includes(editing.estado)
      ? editing.estado
      : "PENDIENTE_APROBACION";
    const payload = {
      ...f,
      aforo: f.tiposEntrada.reduce((a, t) => a + (t.cupos || 0), 0),
      precio: f.tiposEntrada[0]?.precio || 0,
      vendidas: editing?.vendidas || f.tiposEntrada.reduce((a, t) => a + (t.cuposVendidos || 0), 0),
      estado: estadoFinal,
      organizador: f.modo === "b2b" ? (organizadorElegido?.nombre || null) : (f.modo === "embebido" ? null : f.organizador || null),
    };
    update(s => {
      if (editing) {
        if(!s.eventos)s.eventos=[]; const idx = s.eventos.findIndex(e => e.id === editing.id);
        s.eventos[idx] = { ...s.eventos[idx], ...payload };
      } else {
        if(!s.eventos)s.eventos=[]; s.eventos.push({ id: evId, mundoId, ...payload, asistentes: 0, createdAt: Date.now() });
      }
    });
    onClose();
    // Publicación remota: el evento y sus entradas quedan comprables en la superapp.
    try {
      await upsertEventoRemote(adminEvToRemote({ ...payload, id: evId }, mundoId));
      const { tipos: tiposSynced, bloqueados } = await syncTicketTypesRemote(evId, f.tiposEntrada);
      update(s => { const e = (s.eventos||[]).find(x => x.id === evId); if (e) e.tiposEntrada = tiposSynced; });
      notify(estadoFinal === "PENDIENTE_APROBACION"
        ? `Evento "${f.nombre}" enviado a la cola de aprobación de RedPontis. Se publicará en la app tras el visto bueno.`
        : `Evento "${f.nombre}" actualizado en la superapp.`);
      if (bloqueados?.length) {
        notify(`No se pudo quitar ${bloqueados.map(b => `"${b.nombre}" (${b.vendidos} entrada${b.vendidos !== 1 ? "s" : ""} vendida${b.vendidos !== 1 ? "s" : ""})`).join(", ")}: ya tiene entradas emitidas. Se mantiene en el evento.`, "error");
      }
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `evento-guardar:${evId}`, mundoId);
      notify(`Evento guardado localmente, pero sin publicar en la app: ${err.mensaje}`, "error");
    }
  };

  const addTipoEntrada = () => {
    setF({ ...f, tiposEntrada: [...f.tiposEntrada, { id: uid("te"), nombre: "VIP", precio: 0, cupos: 50, descripcion: "", cuposVendidos: 0, minPorCompra: 1, maxPorCompra: 4, ventaDesde: "", ventaHasta: "", permiteReingreso: true, vigenciaHasta: "", preventa: false, precompra: false, prereserva: false }] });
  };
  const updTipo = (idx, patch) => {
    const te = [...f.tiposEntrada];
    te[idx] = { ...te[idx], ...patch };
    setF({ ...f, tiposEntrada: te });
  };
  const delTipo = (idx) => {
    if (f.tiposEntrada.length <= 1) return;
    setF({ ...f, tiposEntrada: f.tiposEntrada.filter((_, i) => i !== idx) });
  };

  const canNext = step === 1 ? f.nombre && f.fecha && f.lugar : true;
  const STEPS = ["Información general", "Entradas y precios", "Configuración y publicación", "Cronograma"];

  return (
    <Drawer open={open} onClose={onClose} icon="confirmation_number"
      title={editing ? `Editar: ${editing.nombre}` : "Crear nuevo evento"}
      subtitle={`Paso ${step} de ${STEPS.length} · ${STEPS[step - 1]}`}
      width="w-[580px]"
      footer={<>
        {step > 1 && <BtnOutline onClick={() => setStep(step - 1)}>Atrás</BtnOutline>}
        {step < 3
          ? <BtnPrimary disabled={!canNext} onClick={() => setStep(step + 1)}>Siguiente <Icon n="arrow_forward" className="text-[16px]" /></BtnPrimary>
          : step === 3
          ? <BtnPrimary disabled={!canPublish} onClick={save}><Icon n="rocket_launch" className="text-[16px]" /> {editing ? "Guardar cambios" : "Publicar evento"}</BtnPrimary>
          : <BtnPrimary onClick={onClose}><Icon n="check" className="text-[16px]" /> Listo</BtnPrimary>}
        {step === 3 && editing && <BtnOutline onClick={() => setStep(4)}>Cronograma <Icon n="arrow_forward" className="text-[16px]" /></BtnOutline>}
      </>}>

      {/* Steps indicator */}
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${i + 1 <= step ? "bg-primary text-white" : "bg-surface-container border border-outline-variant text-on-surface-variant"}`}>{i + 1}</div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-outline-variant"></div>}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <Field label="Nombre del evento *"><input className={inputCls} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Festival de Primavera 2026" /></Field>
          <Field label="Descripción del evento">
            <textarea className={`${inputCls} h-20 py-2`} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} placeholder="Descripción visible en el app y landing del mundo..." />
          </Field>
          <BannerDelEvento
            eventoId={f.id}
            url={f.imagenUrl}
            onCambio={imagenUrl => setF({ ...f, imagenUrl })}
          />
          <MapaDelEvento
            eventoId={f.id}
            url={f.mapaUrl}
            nombre={f.mapaNombre}
            onCambio={(mapaUrl, mapaNombre) => setF({ ...f, mapaUrl, mapaNombre })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha *"><input className={inputCls} type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
            <Field label="Hora de inicio"><input className={inputCls} type="time" value={f.hora} onChange={e => setF({ ...f, hora: e.target.value })} /></Field>
          </div>
          <Field label="Lugar / recinto *"><input className={inputCls} value={f.lugar} onChange={e => setF({ ...f, lugar: e.target.value })} placeholder="Ej. Auditorio principal, Av. Javier Prado 1245" /></Field>
          <Field label="Modalidad">
            <div className="grid grid-cols-3 gap-2">
              {[["presencial", "Presencial"], ["virtual", "Virtual"], ["mixto", "Mixto"]].map(([v, l]) => (
                <button key={v} onClick={() => setF({ ...f, tipo: v })} className={`py-2 rounded-lg border text-sm transition-colors ${f.tipo === v ? "border-primary bg-primary-fixed text-primary font-semibold" : "border-outline-variant hover:border-primary/40"}`}>{l}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold">Tipos de entrada</h4>
            <BtnOutline className="!py-1.5 !px-3 !text-xs" onClick={addTipoEntrada}><Icon n="add" className="text-[16px]" /> Agregar tipo</BtnOutline>
          </div>
          <p className="text-xs text-on-surface-variant mb-3">Define las categorías de entrada disponibles. Cada tipo puede tener un precio y cupo diferente.</p>

          {f.tiposEntrada.map((te, idx) => (
            <div key={te.id} className="border border-outline-variant rounded-xl p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm flex items-center gap-2"><Icon n="confirmation_number" className="text-primary text-[18px]" /> Tipo de entrada {idx + 1}</p>
                {f.tiposEntrada.length > 1 && (
                  <button onClick={() => delTipo(idx)} className="text-error hover:bg-error-container/20 p-1 rounded"><Icon n="delete" className="text-[16px]" /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre del tipo">
                  <input className={inputCls} value={te.nombre} onChange={e => updTipo(idx, { nombre: e.target.value })} placeholder="Ej. General, VIP, Estudiante" />
                </Field>
                <Field label="Precio (PEN)">
                  <NumInput className={inputCls} min="0" value={te.precio} onChange={v => updTipo(idx, { precio: v })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cupos disponibles">
                  <NumInput className={inputCls} min="1" value={te.cupos} onChange={v => updTipo(idx, { cupos: v })} />
                </Field>
                <Field label="Ya vendidas (si editas)">
                  <NumInput className={inputCls} min="0" value={te.cuposVendidos || 0} onChange={v => updTipo(idx, { cuposVendidos: v })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mínimo por compra">
                  <NumInput className={inputCls} min="1" value={te.minPorCompra || 1} onChange={v => updTipo(idx, { minPorCompra: Math.max(1, v) })} />
                </Field>
                <Field label="Máximo por compra">
                  <NumInput className={inputCls} min="1" value={te.maxPorCompra || 4} onChange={v => updTipo(idx, { maxPorCompra: Math.max(1, v) })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Venta desde (opcional)">
                  <input className={inputCls} type="date" value={te.ventaDesde || ""} onChange={e => updTipo(idx, { ventaDesde: e.target.value })} />
                </Field>
                <Field label="Venta hasta (opcional)">
                  <input className={inputCls} type="date" value={te.ventaHasta || ""} onChange={e => updTipo(idx, { ventaHasta: e.target.value })} />
                </Field>
              </div>
              <Field label="Vigencia — la entrada deja de ser válida después de (opcional)">
                <input className={inputCls} type="date" value={te.vigenciaHasta || ""} onChange={e => updTipo(idx, { vigenciaHasta: e.target.value })} />
              </Field>
              <Field label="Descripción de qué incluye esta entrada (opcional)">
                <input className={inputCls} value={te.descripcion} onChange={e => updTipo(idx, { descripcion: e.target.value })} placeholder="Ej. Incluye consumo, acceso a zona VIP..." />
              </Field>
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-outline-variant cursor-pointer">
                <input type="checkbox" checked={te.permiteReingreso !== false} onChange={e => updTipo(idx, { permiteReingreso: e.target.checked })} className="rounded text-primary" />
                <span className="text-xs flex-1">Permite reingreso (salir y volver a entrar con la misma entrada)</span>
              </label>
              <div className="flex gap-4 pt-1">
                {[["preventa", "Preventa"], ["precompra", "Precompra"], ["prereserva", "Prereserva"]].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!te[k]} onChange={e => updTipo(idx, { [k]: e.target.checked })} className="rounded text-primary" />
                    <span className="text-xs">{l}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 font-mono text-xs text-on-surface-variant flex justify-between">
            <span>Aforo total estimado</span>
            <span className="font-bold text-on-surface">{f.tiposEntrada.reduce((a, t) => a + (t.cupos || 0), 0)} entradas</span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <Field label="Método de acceso al evento">
            <div className="space-y-2">
              {[
                { v: "qr", l: "Código QR", d: "El usuario muestra el QR de su entrada en el app para ingresar.", ic: "qr_code_scanner" },
                { v: "bandita", l: "Bandita NFC JOI 360", d: "El usuario toca el lector con su pulsera NFC. Sin sacar el celular.", ic: "contactless" },
                { v: "ambos", l: "QR y Bandita NFC (ambos)", d: "Acepta cualquiera de los dos métodos. Mayor flexibilidad.", ic: "devices" },
              ].map(o => (
                <label key={o.v} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${f.metodoAcceso === o.v ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
                  <input type="radio" name="acceso" checked={f.metodoAcceso === o.v} onChange={() => setF({ ...f, metodoAcceso: o.v })} className="mt-1 text-primary" />
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5"><Icon n={o.ic} className="text-primary text-[18px]" /> {o.l}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{o.d}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Política de reembolso">
            <select className={inputCls} value={f.politicaReembolso} onChange={e => setF({ ...f, politicaReembolso: e.target.value })}>
              {["No reembolsable", "Reembolso hasta 48 horas antes", "Reembolso hasta 24 horas antes", "Reembolso total hasta la fecha del evento"].map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Instrucciones adicionales para el asistente">
            <textarea className={`${inputCls} h-20 py-2`} value={f.instrucciones} onChange={e => setF({ ...f, instrucciones: e.target.value })} placeholder="Ej. Llegar 15 min antes, traer DNI, no se permiten cámaras..." />
          </Field>

          {/* Tipo de evento — fijo para el demo; catálogo completo en R2 */}
          <div className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Icon n="category" className="text-primary text-[18px]" />
              <span>Tipo de evento: <b>Kermesse</b></span>
            </div>
            <span className="font-mono text-[9px] uppercase text-outline">catálogo de tipos · R2</span>
          </div>

          {/* Criterio del evento — B2B / B2C / Embebido, acotado al techo del mundo */}
          <Field label="Criterio del evento" hint={organizadorFijo ? `Gestionado por ${organizadorFijo.nombre} (tu panel B2B)` : "Define quién lo gestiona y cómo se monetiza/aprueba — acotado a lo que el mundo permite."}>
            {organizadorFijo ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary-fixed/20">
                <Icon n={MODOS_EVENTO.b2b.icon} className="text-primary"/>
                <div><p className="text-sm font-semibold">B2B</p><p className="text-xs text-on-surface-variant">{MODOS_EVENTO.b2b.desc}</p></div>
              </div>
            ) : modosPermitidos.length <= 1 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-outline-variant bg-surface-container-low">
                <Icon n={MODOS_EVENTO[f.modo]?.icon} className="text-on-surface-variant"/>
                <div><p className="text-sm font-semibold">{MODOS_EVENTO[f.modo]?.label}</p><p className="text-xs text-on-surface-variant">{MODOS_EVENTO[f.modo]?.desc}</p></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {modosPermitidos.map(k => (
                  <label key={k} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${f.modo === k ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
                    <input type="radio" name="modo-evento" checked={f.modo === k} onChange={() => setF({ ...f, modo: k })} className="mt-1"/>
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1.5"><Icon n={MODOS_EVENTO[k].icon} className="text-primary text-[18px]"/> {MODOS_EVENTO[k].label}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{MODOS_EVENTO[k].desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Field>

          {requiereOrganizador && (
            <Field label="Organizador responsable *" hint={organizadores.length === 0 ? "Este mundo no tiene organizadores registrados — créalo primero en Actores → Organizadores." : undefined}>
              <select className={inputCls} value={f.organizadorId} onChange={e => setF({ ...f, organizadorId: e.target.value })}>
                <option value="">Elegir organizador…</option>
                {organizadores.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </Field>
          )}

          <div className="p-4 border border-outline-variant rounded-xl space-y-3">
            <h5 className="font-semibold text-sm">¿Dónde se publica este evento?</h5>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm">Evento privado</p>
                <p className="text-xs text-on-surface-variant">Rules Engine: no aparece en el marketplace; solo acceso por invitación</p>
              </div>
              <Toggle checked={f.privado} onChange={v => setF({ ...f, privado: v })} />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm">Publicar en el App del mundo</p>
                <p className="text-xs text-on-surface-variant">Visible para los usuarios del app de la comunidad</p>
              </div>
              <Toggle checked={f.publicarEnApp} onChange={v => setF({ ...f, publicarEnApp: v })} />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm">Publicar en el Landing público del mundo</p>
                <p className="text-xs text-on-surface-variant">Visible para cualquier persona que visite el landing web</p>
              </div>
              <Toggle checked={f.publicarEnLanding} onChange={v => setF({ ...f, publicarEnLanding: v })} />
            </label>
          </div>

          {/* Resumen */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
            <p className="font-semibold text-sm mb-3">Resumen del evento</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-outline font-mono uppercase">Nombre</span><span className="font-medium">{f.nombre}</span></div>
              <div className="flex justify-between"><span className="text-outline font-mono uppercase">Fecha y hora</span><span>{f.fecha} {f.hora}</span></div>
              <div className="flex justify-between"><span className="text-outline font-mono uppercase">Lugar</span><span>{f.lugar}</span></div>
              <div className="flex justify-between"><span className="text-outline font-mono uppercase">Tipos de entrada</span><span>{f.tiposEntrada.length} tipo(s)</span></div>
              <div className="flex justify-between"><span className="text-outline font-mono uppercase">Aforo total</span><span>{f.tiposEntrada.reduce((a, t) => a + (t.cupos || 0), 0)}</span></div>
              <div className="flex justify-between"><span className="text-outline font-mono uppercase">Acceso</span><span>{f.metodoAcceso === "bandita" ? "Bandita NFC" : f.metodoAcceso === "ambos" ? "QR + Bandita" : "QR"}</span></div>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant">Actividades reales del evento — reemplazan el cronograma genérico que se mostraba antes en el app.</p>
          {agenda.length === 0 && <p className="text-sm text-on-surface-variant italic">Sin actividades cargadas todavía.</p>}
          {agenda.map(a => (
            <div key={a.id} className="flex items-start gap-3 p-3 border border-outline-variant rounded-lg">
              {a.imagen_url && <img src={a.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
              <span className="font-mono text-xs text-primary font-bold w-14 flex-shrink-0">{a.hora || "—"}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{a.titulo}</p>
                {a.descripcion && <p className="text-xs text-on-surface-variant mt-0.5">{a.descripcion}</p>}
                {(a.lugar || a.expositor) && (
                  <p className="text-[10px] text-outline mt-0.5">{a.lugar}{a.lugar && a.expositor ? " · " : ""}{a.expositor && `Expositor: ${a.expositor}`}</p>
                )}
              </div>
              <button onClick={() => removeAgendaItem(a.id)} className="text-on-surface-variant hover:text-error flex-shrink-0"><Icon n="close" className="text-[16px]" /></button>
            </div>
          ))}
          <div className="border border-dashed border-outline-variant rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <input className={inputCls} type="time" value={agendaItem.hora} onChange={e => setAgendaItem({ ...agendaItem, hora: e.target.value })} />
              <input className={inputCls} placeholder="Título de la actividad" value={agendaItem.titulo} onChange={e => setAgendaItem({ ...agendaItem, titulo: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="Descripción (opcional)" value={agendaItem.descripcion} onChange={e => setAgendaItem({ ...agendaItem, descripcion: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Lugar (opcional)" value={agendaItem.lugar} onChange={e => setAgendaItem({ ...agendaItem, lugar: e.target.value })} />
              <input className={inputCls} placeholder="Expositor (opcional)" value={agendaItem.expositor} onChange={e => setAgendaItem({ ...agendaItem, expositor: e.target.value })} />
            </div>
            <input className={inputCls} placeholder="URL de imagen (opcional)" value={agendaItem.imagen_url} onChange={e => setAgendaItem({ ...agendaItem, imagen_url: e.target.value })} />
            <BtnOutline className="!py-1.5 !px-3 !text-xs" disabled={!agendaItem.titulo.trim()} onClick={addAgendaItem}><Icon n="add" className="text-[16px]" /> Agregar actividad</BtnOutline>
          </div>
        </div>
      )}
    </Drawer>
  );
}
