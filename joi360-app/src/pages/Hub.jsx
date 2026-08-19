import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, useWalletLive, useWorldConfig, useMerchantsLive, useCatalogLive } from "../hooks.js";
import { useUser } from "../userStore.js";
import { MODULES } from "../modules.js";
import BottomNav from "../components/BottomNav.jsx";
import { getSyntheticUserId, fetchMisDependientes, fetchMisReservasMenu, fetchEventosLive } from "../supabaseClient.js";

// "Qué te toca hoy" — auto-generado solo si el mundo tiene Menú activo y
// hay algo programado para hoy (titular o algún dependiente). Sin reserva
// hoy, la sección no existe: nada de banner vacío ocupando espacio.
function MenuHoyWidget({ mundoId, nav }) {
  const [reservas, setReservas] = useState(null);
  useEffect(() => {
    let vivo = true;
    const userId = getSyntheticUserId();
    fetchMisDependientes(userId, mundoId).then(async deps => {
      const ids = [userId, ...(deps || []).map(d => d.dependent_user_id)];
      const r = await fetchMisReservasMenu(ids, mundoId).catch(() => []);
      if (vivo) setReservas(r || []);
    }).catch(() => { if (vivo) setReservas([]); });
    return () => { vivo = false; };
  }, [mundoId]);

  const hoy = new Date().toISOString().slice(0, 10);
  const deHoy = (reservas || []).filter(r => r.fecha === hoy);
  if (deHoy.length === 0) return null;

  return (
    <div className="px-5 mb-5">
      <button onClick={() => nav("/module/menu")} className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 tap-active text-left" style={{ background: "rgba(232,245,233,0.7)" }}>
        <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined fill text-green-700 text-xl">today</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Hoy te toca</p>
          {deHoy.map((r, i) => (
            <p key={r.id} className="text-sm font-bold text-[#1C1C1E] truncate">
              {r.beneficiario_nombre} · {(r.items || []).map(it => it.nombre).join(", ")}
            </p>
          ))}
        </div>
        <span className="material-symbols-outlined text-[#8A8FA8]">chevron_right</span>
      </button>
    </div>
  );
}

// Vitrina de eventos del mundo en el Home — antes el Home no mostraba
// eventos en absoluto, solo vivían dentro del módulo de Eventos. Carrusel
// horizontal a propósito (a diferencia del módulo completo, que ahora
// scrollea vertical): acá es una vitrina rápida, no el listado completo.
// Tope de 5 + "Ver más" hacia /module/eventos, la misma pantalla del
// módulo completo — no una vista distinta.
function EventosMundoWidget({ mundoId, mundo, nav }) {
  const [eventos, setEventos] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetchEventosLive(mundoId).then(r => { if (vivo) setEventos(r || []); }).catch(() => { if (vivo) setEventos([]); });
    return () => { vivo = false; };
  }, [mundoId]);

  if (!eventos || eventos.length === 0) return null;
  const top5 = eventos.slice(0, 5);

  return (
    <div className="px-5 mb-5">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[11px] font-bold text-[#8A8FA8] uppercase tracking-widest">Eventos</p>
        <button onClick={() => nav("/module/eventos")} className="text-[11px] font-bold text-[#1A3270]">Ver más →</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
        {top5.map(ev => (
          <button key={ev.id} onClick={() => nav(`/module/eventos?evento=${ev.id}`)}
            className="flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-white border border-[#CDD1E4] text-left tap-active">
            <div className="h-20 relative" style={{
              background: ev.imagen_url ? `url(${ev.imagen_url}) center/cover` : `linear-gradient(135deg,${mundo.color || "#1A3270"},#3B5BDB)`,
            }}>
              {!ev.imagen_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined fill text-white/70 text-3xl">festival</span>
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-black text-[#1C1C1E] leading-tight line-clamp-2">{ev.titulo}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: mundo.color || "#1A3270" }}>{ev.fecha}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Mi código — antes no existía ningún QR en el home: cada módulo (Billetera,
// Accesos, Perfil Pro) tenía el suyo por separado. Este es el único que
// importa para el portero o el comercio: sirve para accesos siempre, y
// también para pagar si el mundo tiene el saldo activado — nunca al revés
// (un mundo sin saldo simplemente no tiene wallet, así que un intento de
// cobro cae en el error controlado "sin_wallet" ya existente del lado del
// POS, esto solo evita prometer algo que el mundo no ofrece).
function MiCodigoWidget({ mundoId, verSaldo }) {
  const [abierto, setAbierto] = useState(false);
  const myCode = getSyntheticUserId();
  return (
    <>
      <div className="px-5 mb-5">
        <button onClick={() => setAbierto(true)} className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 tap-active text-left">
          <div className="w-11 h-11 rounded-full bg-[#DCE4FA] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined fill text-[#1A3270] text-xl">qr_code_2</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1C1C1E]">Mi código</p>
            <p className="text-[11px] text-[#8A8FA8]">{verSaldo ? "Para pagos y accesos en este mundo" : "Para accesos en este mundo"}</p>
          </div>
          <span className="material-symbols-outlined text-[#8A8FA8]">chevron_right</span>
        </button>
      </div>
      {abierto && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end items-center" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }} onClick={() => setAbierto(false)}>
          <div className="w-full max-w-[430px] bg-white rounded-t-[28px]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[#CDD1E4]" /></div>
            <div className="px-6 pb-10 pt-3 text-center">
              <div className="w-44 h-44 mx-auto rounded-2xl bg-white border-2 border-[#CDD1E4] mb-3 flex items-center justify-center overflow-hidden">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(myCode)}`}
                  alt="Mi código QR" className="w-full h-full object-contain p-2" />
              </div>
              <p className="font-black text-[#1C1C1E]">Muestra este código</p>
              <p className="text-xs text-[#8A8FA8] mt-0.5">{verSaldo ? "El comercio lo escanea para cobrarte o para registrar tu acceso." : "Se usa para registrar tu acceso en este mundo."}</p>
              <button onClick={() => setAbierto(false)} className="w-full mt-6 py-3.5 rounded-2xl bg-[#1A3270] text-white font-bold text-sm tap-active">Listo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Module icon button
function ModuleBtn({ id, onClick }) {
  const m = MODULES[id] || { icon: "settings", label: id, bg: "bg-gray-100", color: "text-gray-500" };
  return (
    <button onClick={() => onClick(id)} className="flex flex-col items-center gap-2 group">
      <div className={`w-16 h-16 rounded-2xl ${m.bg} flex items-center justify-center glass-card tap-active group-hover:scale-105 transition-all`}>
        <span className={`material-symbols-outlined ${m.color} text-3xl`}>{m.icon}</span>
      </div>
      <span className="text-[10px] font-semibold text-[#404255] text-center leading-tight max-w-[64px]">{m.label}</span>
    </button>
  );
}

export default function HubPage() {
  const nav = useNavigate();
  const st = useStore();
  const u = useUser();

  const memberships = (u?.memberships || []).map(id => (st.mundos || []).find(m => m.id === id)).filter(Boolean);
  const activeMundo = (st.mundos || []).find(m => m.id === u?.activeMundoId) || memberships[0];
  const { saldo, historial, canales, recargar: recargarLive, pagar: pagarLive } = useWalletLive(activeMundo?.id);
  const wc = useWorldConfig(activeMundo?.id);
  const puntos = u?.puntos?.[activeMundo?.id] || 0;
  const nombre = u?.auth?.nombre || "JOI";
  const initials = nombre.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  // ── Todo derivado de la config VIVA del mundo (Supabase) ──────────────
  // Grid de módulos: capacidades activas cuya experiencia no vive ya en otra
  // parte de la app. El registry mezcla la curación local + el Catálogo
  // Global de Supabase: una capacidad nueva publicada por el admin renderiza
  // aquí sin tocar el código de la app.
  const CATALOG = useCatalogLive();
  const modulos = wc.modulos.filter(m => m.enabled && CATALOG[m.id] && CATALOG[m.id].surface !== "system");
  const hasControl = wc.activo("control");
  const hasLoyalty = wc.activo("loyalty");
  const puedeRecargar = wc.flag("wallet", "recarga");
  // Dos toggles de admin controlaban lo mismo sin depender uno del otro:
  // el feature flag "bandita" (Feature Flags) decidía si esta tile aparece
  // acá, pero el config "usaPulseraNfc" (Parámetros, lo que de verdad usa
  // el POS para vincular pulseras) podía estar apagado — el usuario veía
  // "Bandita NFC" en su Hub aunque el mundo no usara pulseras físicas.
  // Ahora la tile exige ambos: el flag Y que el mundo realmente use NFC.
  const tieneBandita  = wc.flag("wallet", "bandita") && wc.cfg("wallet")?.usaPulseraNfc !== false;
  const verSaldo      = wc.flag("wallet", "balance");
  const hasMenu       = wc.activo("menu");

  // ── Acciones rápidas: UNA entrada por acción, solo si el mundo la tiene.
  // "Pagar" NO va aquí: su única entrada es el CTA central del BottomNav.
  const acciones = [];
  if (puedeRecargar) acciones.push({ k:"recargar", label:"Recargar", sub:"Añadir saldo", icon:"add_card",     path:"/pay?tab=recargar", bg:"rgba(224,247,250,0.7)", fg:"#2E7FD9" });
  if (tieneBandita)  acciones.push({ k:"nfc",      label:"Bandita NFC", sub:"Paga con tu pulsera", icon:"contactless", path:"/pay?tab=nfc", bg:"rgba(237,231,246,0.7)", fg:"#311b92" });
  if (hasControl)    acciones.push({ k:"familia",  label:"Familia", sub:"Perfiles y límites", icon:"groups",     path:"/module/control",     bg:"rgba(241,248,233,0.8)", fg:"#0BA878" });
  if (wc.activo("promociones")) acciones.push({ k:"promos", label:"Promos", sub:"Ofertas del mundo", icon:"local_offer", path:"/module/promociones", bg:"rgba(255,243,224,0.8)", fg:"#E06B00" });
  // Directorio de comercios en vivo (tabla merchants — alta en admin → aparece aquí)
  const comercios = useMerchantsLive(activeMundo?.id);
  const txs = historial.slice(0, 3);
  const totalTxBadge = historial.length;

  if (!activeMundo) return (
    <div className="min-h-screen aura-bg flex flex-col items-center justify-center gap-4 p-8">
      <span className="material-symbols-outlined text-5xl text-[#CDD1E4]">public_off</span>
      <p className="text-[#404255] text-center">Aún no perteneces a ninguna comunidad.</p>
      <button onClick={() => nav("/landing")} className="bg-[#1A3270] text-white px-6 py-3 rounded-2xl font-bold text-sm aura-primary">
        Explorar comunidades →
      </button>
    </div>
  );

  return (
    <div className="min-h-screen aura-bg pb-32">
      <div className="max-w-[430px] mx-auto">
        {/* ── Header ── */}
        <div className="px-5 pt-12 pb-2">
          <div className="flex justify-between items-start">
            {/* Left: greeting */}
            <div>
              <h1 className="text-[26px] font-black text-[#1C1C1E] tracking-tight leading-tight">
                {new Date().getHours() < 12 ? "Buenos días," : new Date().getHours() < 18 ? "Buenas tardes," : "Buenas noches,"}
                <br />{nombre.split(" ")[0]}
              </h1>
              <p className="text-[#8A8FA8] text-sm mt-0.5">{activeMundo.nombre}</p>
            </div>

            {/* Right icons — order: Avatar → Globe → Bell (Image 2) */}
            <div className="flex items-center gap-2 mt-1">
              {/* Avatar — dark, initials */}
              <button onClick={() => nav("/profile")}
                className="w-10 h-10 rounded-full flex items-center justify-center tap-active"
                style={{background:"#3a3a4a"}}>
                <span className="text-white font-black text-sm tracking-tight">{initials}</span>
              </button>

              {/* Globe — switch mundo */}
              <button onClick={() => nav("/mundos")}
                className="w-10 h-10 glass-card rounded-full flex items-center justify-center tap-active">
                <span className="material-symbols-outlined text-[#404255] text-xl">public</span>
              </button>

              {/* Bell — sin centro de notificaciones real todavía; sin badge fijo/inventado */}
              <button className="w-10 h-10 glass-card rounded-full flex items-center justify-center relative tap-active">
                <span className="material-symbols-outlined fill text-[#404255] text-xl">notifications</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Balance ── */}
        <div className="px-5 mb-5 mt-3">
          <p className="text-[#8A8FA8] text-[11px] font-semibold uppercase tracking-widest mb-1">
            {verSaldo ? "Saldo disponible" : "Mi identidad"}
          </p>
          {verSaldo ? (
            <p className="text-[42px] font-black text-[#1C1C1E] tracking-tight leading-none">
              S/ {saldo.toFixed(2)}
            </p>
          ) : (
            // Mundo en modo solo-identificación: sin saldo, sin montos.
            <p className="text-[26px] font-black text-[#1C1C1E] tracking-tight leading-none">
              {nombre}
            </p>
          )}
          <p className="text-[#8A8FA8] text-sm mt-2">{activeMundo.nombre}</p>
          {hasLoyalty && (
            <button onClick={() => nav("/module/loyalty")}
              className="flex items-center gap-1.5 mt-3 px-3 py-1.5 glass-card rounded-full w-fit tap-active">
              <span className="material-symbols-outlined fill text-amber-500 text-base">stars</span>
              <span className="text-[#404255] text-xs font-bold">{puntos.toLocaleString()} pts</span>
              <span className="material-symbols-outlined text-[#CDD1E4] text-sm">chevron_right</span>
            </button>
          )}
        </div>

        <MiCodigoWidget mundoId={activeMundo.id} verSaldo={verSaldo}/>
        {hasMenu && <MenuHoyWidget mundoId={activeMundo.id} nav={nav}/>}

        {/* Módulos del mundo — driven by admin config. Justo debajo del saldo. */}
        {modulos.length > 0 && (
          <div className="px-5 mb-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-bold text-[#1C1C1E]">Mis módulos</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
              {modulos.map(mod => {
                const meta = CATALOG[mod.id] || { icon:"settings", label: mod.id, bg:"bg-gray-100", color:"text-gray-500" };
                return (
                  <button key={mod.id} onClick={() => nav(`/module/${mod.id}`)}
                    className="flex flex-col items-center gap-2 group flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl ${meta.bg} flex items-center justify-center glass-card tap-active group-hover:scale-105 transition-all`}>
                      <span className={`material-symbols-outlined ${meta.color} text-3xl`}
                        style={{fontVariationSettings:"'FILL' 1"}}>{meta.icon}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#404255] text-center leading-tight max-w-[64px]">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Acciones del mundo ────────────────────────────────────────
            Una sola entrada por acción, derivadas de los feature flags —
            Familia y Recargar solo aparecen si el admin activó esa capacidad.
            "Pagar" no aparece aquí: su única entrada es el CTA del BottomNav. */}
        {acciones.length > 0 && (
          <div className="px-5 mb-5">
            <div className="grid grid-cols-2 gap-3">
              {acciones.map((a, i) => {
                // La primera acción ocupa el ancho completo si es la única.
                const full = acciones.length === 1 || (acciones.length % 2 === 1 && i === acciones.length - 1);
                return (
                  <button key={a.k} onClick={() => nav(a.path)}
                    className={`glass-card rounded-2xl p-4 flex items-center justify-between tap-active ${full ? "col-span-2" : ""}`}
                    style={{ background: a.bg }}>
                    <div className="text-left">
                      <p className="font-bold text-sm" style={{ color: a.fg }}>{a.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: a.fg, opacity: 0.6 }}>{a.sub}</p>
                    </div>
                    <span className="material-symbols-outlined text-2xl" style={{ color: a.fg }}>{a.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comercios */}
        {comercios.length > 0 && (
          <div className="px-5 mb-5">
            <p className="text-[11px] font-bold text-[#8A8FA8] uppercase tracking-widest mb-3">Comercios disponibles</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
              {comercios.map(c => (
                <button key={c.id} onClick={() => nav("/module/comercios", { state: { filtro: c.id } })}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 glass-card rounded-2xl p-3 w-20 tap-active">
                  <div className="w-10 h-10 rounded-xl bg-[#1A3270] flex items-center justify-center overflow-hidden">
                    {c.fotoUrl ? <img src={c.fotoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-black text-base">{c.nombre[0]}</span>}
                  </div>
                  <span className="text-[9px] font-semibold text-[#404255] text-center leading-tight">{c.nombre.split(" ").slice(0,2).join(" ")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {wc.activo("eventos") && <EventosMundoWidget mundoId={activeMundo.id} mundo={activeMundo} nav={nav}/>}

        {/* Últimos movimientos */}
        {txs.length > 0 && (
          <div className="px-5 mb-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-[#8A8FA8] uppercase tracking-widest">Últimos movimientos</p>
              <button onClick={() => nav("/activity")} className="text-[11px] font-bold text-[#1A3270]">Ver todo →</button>
            </div>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#CDD1E4]/50">
              {txs.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.monto > 0 ? "bg-green-50" : "bg-[#EEF2FD]"}`}>
                    <span className={`material-symbols-outlined fill text-base ${t.monto > 0 ? "text-green-600" : "text-[#1A3270]"}`}>
                      {t.monto > 0 ? "add_card" : "shopping_bag"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#1C1C1E] text-sm font-semibold">{t.titulo}</p>
                    <p className="text-[#8A8FA8] text-[11px]">{new Date(t.fecha).toLocaleDateString("es-PE")}</p>
                  </div>
                  <p className={`font-black text-sm ${t.monto > 0 ? "text-green-600" : "text-[#1C1C1E]"}`}>
                    {t.monto > 0 ? "+" : ""}S/ {Math.abs(t.monto).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <BottomNav badge={totalTxBadge > 0 ? Math.min(totalTxBadge, 9) : 0} />
    </div>
  );
}
