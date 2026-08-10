import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { Icon } from "./ui";
import { fetchEventosPublicosLanding, fetchEventoPublico, fetchTicketTypesDeEvento } from "./supabase.js";

// URL de la superapp donde de verdad se compra la entrada — la landing
// pública solo muestra e invita, nunca cobra (decisión confirmada: comprar
// exige cuenta JOI 360, la landing no construye un checkout de invitado
// paralelo a la wallet).
const SUPERAPP_URL = "https://joi360-app.vercel.app";

/* ── Layout compartido: header + nav + footer — antes la landing era una
   sola pantalla plana sin rutas propias. ──────────────────────────────── */
function LandingLayout({ children, active }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">JOI Solutions</span>
            <span className="font-mono text-[9px] uppercase text-white/60 hidden sm:inline">Ecosistema JOI 360</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <Link to="/landing" className={active === "inicio" ? "text-white" : "text-white/60 hover:text-white transition-colors"}>Inicio</Link>
            <Link to="/landing/eventos" className={active === "eventos" ? "text-white" : "text-white/60 hover:text-white transition-colors"}>Eventos</Link>
            <a href={`${SUPERAPP_URL}/#/auth`} className="bg-white text-primary px-4 py-1.5 rounded-full text-xs font-black hover:bg-white/90 transition-colors">
              Ingresar →
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-outline-variant py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-on-surface-variant">
          <p>JOI Solutions · Ecosistema JOI 360 — pagos, billetera y servicios por comunidad.</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Home: comunidades + eventos destacados ──────────────────────────── */
export function LandingHome() {
  const st = useStore();
  const [eventos, setEventos] = useState(null);
  const mundosPublicos = (st.mundos || []).filter(m => m.estado === "ACTIVO" && !m.fixed);

  useEffect(() => { fetchEventosPublicosLanding().then(setEventos).catch(() => setEventos([])); }, []);

  return (
    <LandingLayout active="inicio">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-2">JOI Solutions</p>
          <h1 className="text-4xl font-black mb-4">Un ecosistema, muchas comunidades</h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Cada mundo tiene su propia billetera, comercios y servicios. Únete a una comunidad o descubre los eventos que se publican en ella.
          </p>
        </div>

        {/* Eventos destacados */}
        {eventos !== null && eventos.length > 0 && (
          <div className="mb-16">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold">Eventos publicados</h2>
              <Link to="/landing/eventos" className="text-primary text-sm font-semibold hover:underline">Ver todos →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {eventos.slice(0, 3).map(ev => (
                <EventoCard key={ev.id} ev={ev} mundo={mundosPublicos.find(m => m.id === ev.world_id)} />
              ))}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6">Comunidades habilitadas</h2>
        {mundosPublicos.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Icon n="public_off" className="text-[40px] mb-3 opacity-60" />
            <p className="text-sm">Todavía no hay comunidades activas.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mundosPublicos.map(m => (
              <div key={m.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 overflow-hidden" style={{ background: m.color }}>
                  {m.logoUrl ? <img src={m.logoUrl} alt="" className="w-full h-full object-cover" /> : <Icon n="public" className="text-[24px]" />}
                </div>
                <h3 className="text-lg font-bold mb-1">{m.nombre}</h3>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-3">{m.vertical}</p>
                <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{m.descripcion}</p>
                <a href={`${SUPERAPP_URL}/#/auth`} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                  <Icon n="login" className="text-[16px]" /> Únete a esta comunidad →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </LandingLayout>
  );
}

function EventoCard({ ev, mundo }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(`/landing/eventos/${ev.id}`)}
      className="text-left bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:border-primary/50 transition-colors">
      <div className="h-36 bg-surface-container flex items-center justify-center overflow-hidden">
        {ev.imagen_url ? <img src={ev.imagen_url} alt="" className="w-full h-full object-cover" /> : <Icon n="confirmation_number" className="text-[36px] text-outline" />}
      </div>
      <div className="p-4">
        <p className="font-mono text-[9px] uppercase text-primary mb-1">{mundo?.nombre || "JOI 360"}</p>
        <h3 className="font-bold text-sm leading-tight mb-1">{ev.titulo}</h3>
        <p className="text-xs text-on-surface-variant">{ev.fecha} {ev.lugar ? `· ${ev.lugar}` : ""}</p>
      </div>
    </button>
  );
}

/* ── Eventos: catálogo público completo, cross-mundo ─────────────────── */
export function LandingEventos() {
  const st = useStore();
  const [eventos, setEventos] = useState(null);
  const [search, setSearch] = useState("");
  const mundos = st.mundos || [];

  useEffect(() => { fetchEventosPublicosLanding().then(setEventos).catch(() => setEventos([])); }, []);

  const filtrados = (eventos || []).filter(ev =>
    search === "" || ev.titulo.toLowerCase().includes(search.toLowerCase()) || ev.lugar?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LandingLayout active="eventos">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black mb-2">Eventos</h1>
        <p className="text-on-surface-variant mb-6">Publicados por comunidades y organizadores del ecosistema JOI 360.</p>
        <div className="flex items-center gap-3 border border-outline-variant rounded-xl px-4 py-2.5 mb-8 max-w-md bg-surface-container-lowest">
          <Icon n="search" className="text-outline" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Buscar por nombre o lugar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {eventos === null ? (
          <p className="text-sm text-on-surface-variant py-10 text-center">Cargando eventos…</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Icon n="event_busy" className="text-[40px] mb-3 opacity-60" />
            <p className="text-sm">{eventos.length === 0 ? "No hay eventos publicados todavía." : "Ningún evento coincide con tu búsqueda."}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map(ev => (
              <EventoCard key={ev.id} ev={ev} mundo={mundos.find(m => m.id === ev.world_id)} />
            ))}
          </div>
        )}
      </div>
    </LandingLayout>
  );
}

/* ── Detalle de evento: todo lo que cargó el organizador/usuario + CTA
   real ("Regístrate para comprar", nunca checkout de invitado). ────────── */
export function LandingEventoDetalle() {
  const { id } = useParams();
  const st = useStore();
  const [ev, setEv] = useState(undefined); // undefined = cargando, null = no encontrado
  const [tipos, setTipos] = useState([]);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetchEventoPublico(id).then(async data => {
      if (!vivo) return;
      setEv(data || null);
      if (data) fetchTicketTypesDeEvento(id).then(r => { if (vivo) setTipos(r || []); }).catch(() => {});
    }).catch(() => { if (vivo) setEv(null); });
    return () => { vivo = false; };
  }, [id]);

  const mundo = (st.mundos || []).find(m => m.id === ev?.world_id);
  const desde = tipos.length ? Math.min(...tipos.map(t => +t.precio || 0)) : null;
  // next lleva de vuelta al módulo Eventos del mundo correspondiente, con el
  // id del evento — así después de registrarse/loguearse la persona no
  // aterriza en un hub genérico, sino directo donde puede comprar esta
  // entrada puntual.
  const linkRegistro = mundo
    ? `${SUPERAPP_URL}/#/auth?next=${encodeURIComponent(`/module/eventos?mundo=${mundo.id}&eventId=${id}`)}`
    : `${SUPERAPP_URL}/#/auth`;

  const compartir = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <LandingLayout active="eventos">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {ev === undefined ? (
          <p className="text-sm text-on-surface-variant py-10 text-center">Cargando evento…</p>
        ) : ev === null ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Icon n="event_busy" className="text-[40px] mb-3 opacity-60" />
            <p className="text-sm">Este evento no está disponible o ya no está publicado.</p>
            <Link to="/landing/eventos" className="text-primary text-sm font-semibold hover:underline mt-3 inline-block">← Ver otros eventos</Link>
          </div>
        ) : (
          <>
            <div className="h-56 rounded-2xl bg-surface-container overflow-hidden mb-6 flex items-center justify-center">
              {ev.imagen_url ? <img src={ev.imagen_url} alt="" className="w-full h-full object-cover" /> : <Icon n="confirmation_number" className="text-[56px] text-outline" />}
            </div>
            <p className="font-mono text-[10px] uppercase text-primary mb-1">{mundo?.nombre || "JOI 360"}{ev.categoria ? ` · ${ev.categoria}` : ""}</p>
            <h1 className="text-3xl font-black mb-3">{ev.titulo}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant mb-6">
              <span className="flex items-center gap-1.5"><Icon n="calendar_month" className="text-[18px]" />{ev.fecha}{ev.hora ? ` · ${ev.hora}` : ""}</span>
              {ev.lugar && <span className="flex items-center gap-1.5"><Icon n="location_on" className="text-[18px]" />{ev.lugar}</span>}
            </div>
            {ev.descripcion && <p className="text-on-surface-variant leading-relaxed mb-8 whitespace-pre-line">{ev.descripcion}</p>}

            {tipos.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold mb-3">Entradas</h3>
                <div className="space-y-2">
                  {tipos.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3">
                      <span className="text-sm font-medium">{t.nombre}</span>
                      <span className="font-mono text-sm font-bold">{+t.precio > 0 ? `S/ ${Number(t.precio).toFixed(2)}` : "Gratis"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <a href={linkRegistro}
                className="flex-1 bg-primary text-white text-center py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors">
                {desde != null ? `Regístrate para comprar${desde > 0 ? ` desde S/ ${desde.toFixed(2)}` : ""} →` : "Regístrate para asistir →"}
              </a>
              <button onClick={compartir} title="Copiar enlace"
                className="px-4 py-3.5 rounded-2xl border border-outline-variant hover:bg-surface-container transition-colors">
                <Icon n={copiado ? "check" : "link"} className="text-[20px]" />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-3">Necesitas una cuenta JOI 360 para comprar — es gratis y toma un minuto.</p>
          </>
        )}
      </div>
    </LandingLayout>
  );
}
