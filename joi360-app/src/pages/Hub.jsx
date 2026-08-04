import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, useWalletLive, useWorldConfig, useMerchantsLive, useCatalogLive } from "../hooks.js";
import { useUser } from "../userStore.js";
import { MODULES } from "../modules.js";
import BottomNav from "../components/BottomNav.jsx";

// Module icon button
function ModuleBtn({ id, onClick }) {
  const m = MODULES[id] || { icon: "settings", label: id, bg: "bg-gray-100", color: "text-gray-500" };
  return (
    <button onClick={() => onClick(id)} className="flex flex-col items-center gap-2 group">
      <div className={`w-16 h-16 rounded-2xl ${m.bg} flex items-center justify-center glass-card tap-active group-hover:scale-105 transition-all`}>
        <span className={`material-symbols-outlined ${m.color} text-3xl`}>{m.icon}</span>
      </div>
      <span className="text-[10px] font-semibold text-[#464555] text-center leading-tight max-w-[64px]">{m.label}</span>
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

  // ── Acciones rápidas: UNA entrada por acción, solo si el mundo la tiene.
  // "Pagar" NO va aquí: su única entrada es el CTA central del BottomNav.
  const acciones = [];
  if (puedeRecargar) acciones.push({ k:"recargar", label:"Recargar", sub:"Añadir saldo", icon:"add_card",     path:"/pay?tab=recargar", bg:"rgba(224,247,250,0.7)", fg:"#006064" });
  if (tieneBandita)  acciones.push({ k:"nfc",      label:"Bandita NFC", sub:"Paga con tu pulsera", icon:"contactless", path:"/pay?tab=nfc", bg:"rgba(237,231,246,0.7)", fg:"#311b92" });
  if (hasControl)    acciones.push({ k:"familia",  label:"Familia", sub:"Perfiles y límites", icon:"groups",     path:"/module/control",     bg:"rgba(241,248,233,0.8)", fg:"#33691e" });
  if (wc.activo("promociones")) acciones.push({ k:"promos", label:"Promos", sub:"Ofertas del mundo", icon:"local_offer", path:"/module/promociones", bg:"rgba(255,243,224,0.8)", fg:"#e65100" });
  // Directorio de comercios en vivo (tabla merchants — alta en admin → aparece aquí)
  const comercios = useMerchantsLive(activeMundo?.id);
  const txs = historial.slice(0, 3);
  const totalTxBadge = historial.length;

  if (!activeMundo) return (
    <div className="min-h-screen aura-bg flex flex-col items-center justify-center gap-4 p-8">
      <span className="material-symbols-outlined text-5xl text-[#c7c4d8]">public_off</span>
      <p className="text-[#464555] text-center">Aún no perteneces a ninguna comunidad.</p>
      <button onClick={() => nav("/landing")} className="bg-[#3525cd] text-white px-6 py-3 rounded-2xl font-bold text-sm aura-primary">
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
              <h1 className="text-[26px] font-black text-[#1b1b24] tracking-tight leading-tight">
                {new Date().getHours() < 12 ? "Buenos días," : new Date().getHours() < 18 ? "Buenas tardes," : "Buenas noches,"}
                <br />{nombre.split(" ")[0]}
              </h1>
              <p className="text-[#777587] text-sm mt-0.5">{activeMundo.nombre}</p>
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
                <span className="material-symbols-outlined text-[#464555] text-xl">public</span>
              </button>

              {/* Bell — sin centro de notificaciones real todavía; sin badge fijo/inventado */}
              <button className="w-10 h-10 glass-card rounded-full flex items-center justify-center relative tap-active">
                <span className="material-symbols-outlined fill text-[#464555] text-xl">notifications</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Balance ── */}
        <div className="px-5 mb-5 mt-3">
          <p className="text-[#777587] text-[11px] font-semibold uppercase tracking-widest mb-1">
            {verSaldo ? "Saldo disponible" : "Mi identidad"}
          </p>
          {verSaldo ? (
            <p className="text-[42px] font-black text-[#1b1b24] tracking-tight leading-none">
              S/ {saldo.toFixed(2)}
            </p>
          ) : (
            // Mundo en modo solo-identificación: sin saldo, sin montos.
            <p className="text-[26px] font-black text-[#1b1b24] tracking-tight leading-none">
              {nombre}
            </p>
          )}
          <p className="text-[#777587] text-sm mt-2">{activeMundo.nombre}</p>
          {hasLoyalty && (
            <button onClick={() => nav("/module/loyalty")}
              className="flex items-center gap-1.5 mt-3 px-3 py-1.5 glass-card rounded-full w-fit tap-active">
              <span className="material-symbols-outlined fill text-amber-500 text-base">stars</span>
              <span className="text-[#464555] text-xs font-bold">{puntos.toLocaleString()} pts</span>
              <span className="material-symbols-outlined text-[#c7c4d8] text-sm">chevron_right</span>
            </button>
          )}
        </div>

        {/* Módulos del mundo — driven by admin config. Justo debajo del saldo. */}
        {modulos.length > 0 && (
          <div className="px-5 mb-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[15px] font-bold text-[#1b1b24]">Mis módulos</h2>
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
                    <span className="text-[10px] font-semibold text-[#464555] text-center leading-tight max-w-[64px]">{meta.label}</span>
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
            <p className="text-[11px] font-bold text-[#777587] uppercase tracking-widest mb-3">Comercios disponibles</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
              {comercios.map(c => (
                <button key={c.id} onClick={() => nav("/module/comercios", { state: { filtro: c.id } })}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 glass-card rounded-2xl p-3 w-20 tap-active">
                  <div className="w-10 h-10 rounded-xl bg-[#3525cd] flex items-center justify-center overflow-hidden">
                    {c.fotoUrl ? <img src={c.fotoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-black text-base">{c.nombre[0]}</span>}
                  </div>
                  <span className="text-[9px] font-semibold text-[#464555] text-center leading-tight">{c.nombre.split(" ").slice(0,2).join(" ")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Últimos movimientos */}
        {txs.length > 0 && (
          <div className="px-5 mb-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-[#777587] uppercase tracking-widest">Últimos movimientos</p>
              <button onClick={() => nav("/activity")} className="text-[11px] font-bold text-[#3525cd]">Ver todo →</button>
            </div>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#e4e1ee]/50">
              {txs.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.monto > 0 ? "bg-green-50" : "bg-[#f0ecf9]"}`}>
                    <span className={`material-symbols-outlined fill text-base ${t.monto > 0 ? "text-green-600" : "text-[#3525cd]"}`}>
                      {t.monto > 0 ? "add_card" : "shopping_bag"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#1b1b24] text-sm font-semibold">{t.titulo}</p>
                    <p className="text-[#777587] text-[11px]">{new Date(t.fecha).toLocaleDateString("es-PE")}</p>
                  </div>
                  <p className={`font-black text-sm ${t.monto > 0 ? "text-green-600" : "text-[#1b1b24]"}`}>
                    {t.monto > 0 ? "+" : ""}S/ {Math.abs(t.monto).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected indicator */}
        <div className="flex justify-center pb-8">
          <div className="glass-card flex items-center gap-2 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#3525cd] animate-pulse" />
            <span className="text-[10px] font-bold text-[#464555] uppercase tracking-widest">Conectado · {activeMundo.nombre}</span>
            <button onClick={() => nav("/mundos")} className="material-symbols-outlined text-[#777587] text-sm">swap_horiz</button>
          </div>
        </div>
      </div>

      <BottomNav badge={totalTxBadge > 0 ? Math.min(totalTxBadge, 9) : 0} />
    </div>
  );
}
