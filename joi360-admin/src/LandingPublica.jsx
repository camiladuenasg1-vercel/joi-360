import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "./hooks";
import { Icon } from "./ui";
import { fetchEventosPublicosLanding, fetchEventoPublico, fetchTicketTypesDeEvento } from "./supabase.js";

// URL de la superapp donde de verdad se compra la entrada — la landing
// pública solo muestra e invita, nunca cobra (decisión confirmada: comprar
// exige cuenta JOI 360, la landing no construye un checkout de invitado
// paralelo a la wallet).
const SUPERAPP_URL = "https://joi360-app.vercel.app";

// Redirección a instalación (13-ago, confirmado por Camila): en móvil, antes
// de mandar a alguien al login/registro web, se le ofrece instalar JOI 360
// como PWA (agregar a pantalla de inicio) -- no existe app nativa en
// tiendas todavía, esto es lo más cercano a "descargar la app" que
// funciona hoy. En desktop el comportamiento no cambia: directo al login/
// registro de la superapp.
const esMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Calcula el destino real de "Ingresar"/"Únete" — mismo helper para el header
// y para cada card/CTA de la landing, así todos quedan consistentes.
function destinoIngreso(nextPath) {
  const authUrl = `${SUPERAPP_URL}/#/auth${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
  if (!esMobile()) return authUrl;
  return `/landing/instalar?to=${encodeURIComponent(authUrl)}`;
}

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
            <a href={destinoIngreso()} className="bg-white text-primary px-4 py-1.5 rounded-full text-xs font-black hover:bg-white/90 transition-colors">
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
                <a href={destinoIngreso()} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
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
    ? destinoIngreso(`/module/eventos?mundo=${mundo.id}&eventId=${id}`)
    : destinoIngreso();

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

/* ── Instalar PWA (13-ago): destino de "Ingresar"/"Únete" cuando entran desde
   el celular, antes de mandarlos al login/registro web. No hay app nativa en
   tiendas todavía — esto es "agregar a pantalla de inicio", lo más cercano a
   una descarga real que funciona hoy sin pasar por App Store/Play Store. ── */
export function LandingInstalar() {
  const [params] = useSearchParams();
  const to = params.get("to") || `${SUPERAPP_URL}/#/auth`;
  const esIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 py-12 text-white text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center mb-6">
        <span className="font-black text-2xl">JOI</span>
      </div>
      <h1 className="text-2xl font-black mb-2">Instala JOI 360 en tu celular</h1>
      <p className="text-white/70 text-sm max-w-sm mb-8">Agrégala a tu pantalla de inicio — se abre como una app, sin ocupar espacio de una tienda.</p>

      <div className="bg-white/10 border border-white/15 rounded-2xl p-5 max-w-sm w-full text-left space-y-3 mb-8">
        {esIOS ? (
          <>
            <InstruccionPaso n="1" texto={<>Toca el ícono <b>Compartir</b> (el cuadrado con la flecha hacia arriba) en la barra inferior de Safari.</>} />
            <InstruccionPaso n="2" texto={<>Desliza y elige <b>"Agregar a pantalla de inicio"</b>.</>} />
            <InstruccionPaso n="3" texto={<>Toca <b>"Agregar"</b> — listo, JOI 360 queda en tu pantalla de inicio.</>} />
          </>
        ) : (
          <>
            <InstruccionPaso n="1" texto={<>Toca el menú <b>⋮</b> (arriba a la derecha de Chrome).</>} />
            <InstruccionPaso n="2" texto={<>Elige <b>"Instalar app"</b> o <b>"Agregar a pantalla de inicio"</b>.</>} />
            <InstruccionPaso n="3" texto={<>Confirma — listo, JOI 360 queda instalada como una app.</>} />
          </>
        )}
      </div>

      <a href={to} className="w-full max-w-sm bg-white text-primary text-center py-3.5 rounded-2xl font-bold text-sm hover:bg-white/90 transition-colors mb-3">
        Ya la instalé, continuar →
      </a>
      <a href={to} className="text-white/60 text-xs font-medium hover:text-white/80 transition-colors">
        Continuar sin instalar
      </a>
    </div>
  );
}

function InstruccionPaso({ n, texto }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black flex-shrink-0">{n}</span>
      <p className="text-sm text-white/90 leading-snug">{texto}</p>
    </div>
  );
}
