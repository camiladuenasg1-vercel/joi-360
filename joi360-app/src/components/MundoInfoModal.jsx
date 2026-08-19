import React from "react";
import { MODULES } from "../modules.js";

// Modal de detalle de comunidad — reemplaza dos huecos reales:
// 1) Antes, tocar "Unirme" te metía directo al Hub sin mostrar nada más que
//    lo que ya cabía en la card (Landing.jsx). Acá se abre este modal primero,
//    con la info completa, y recién adentro está el botón real de unión.
// 2) Antes, esa misma unión terminaba en el Hub con un pill "Conectado ·
//    {mundo}" pegado abajo de la pantalla para siempre — ruido permanente sin
//    información real (el cambio de mundo ya vive en el ícono de globo del
//    header del Hub). Este modal, en su variante "success", da la bienvenida
//    real una sola vez, en el momento en que corresponde: justo al unirte.
export default function MundoInfoModal({ mundo: m, comerciosCount = 0, mode = "preview", loading = false, onClose, onConfirm }) {
  if (!m) return null;
  const modulosActivos = (m.modulos || []).filter(x => x.enabled);
  const chips = modulosActivos
    .map(x => ({ id: x.id, ...(MODULES[x.id] || { icon: "extension", label: x.id, bg: "bg-gray-50", color: "text-gray-500" }) }))
    .filter(c => c.surface !== "system");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={mode === "preview" ? onClose : undefined} />
      <div className="relative w-full sm:max-w-[420px] bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-5 pb-3 flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#CDD1E4]" />
        </div>

        {mode === "success" ? (
          <div className="px-6 pt-4 pb-2 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined fill text-green-600 text-3xl">check_circle</span>
            </div>
            <h2 className="text-2xl font-black text-[#1C1C1E]">¡Bienvenido a {m.nombre}!</h2>
            <p className="text-[#8A8FA8] text-sm mt-2 leading-relaxed">Tu billetera en esta comunidad ya está activa.</p>
          </div>
        ) : (
          <div className="px-6 pt-2 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden text-white font-black text-xl" style={{ background: m.color || "#1A3270" }}>
                {m.logoUrl ? <img src={m.logoUrl} alt="" className="w-full h-full object-cover" /> : m.nombre[0]}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-[#1C1C1E] leading-tight">{m.nombre}</h2>
                <span className="text-[10px] font-black text-[#1A3270] uppercase tracking-wider">{m.vertical}</span>
              </div>
            </div>
            <p className="text-[#404255] text-sm mt-4 leading-relaxed">
              {m.descripcion || `Comunidad ${m.vertical} con servicios integrados JOI 360.`}
            </p>
          </div>
        )}

        {chips.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold text-[#8A8FA8] uppercase tracking-widest mb-3">
              {mode === "success" ? "Ya tienes acceso a" : "Qué vas a tener disponible"}
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map(c => (
                <div key={c.id} className={`flex items-center gap-1.5 ${c.bg} rounded-full pl-2 pr-3 py-1.5`}>
                  <span className={`material-symbols-outlined ${c.color} text-base`}>{c.icon}</span>
                  <span className="text-xs font-semibold text-[#1C1C1E]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 pb-4 flex flex-wrap gap-4">
          <span className="text-[#8A8FA8] text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">storefront</span>
            <b className="text-[#1C1C1E]">{comerciosCount}</b> comercios
          </span>
          <span className="text-[#8A8FA8] text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">monetization_on</span>
            {m.moneda || "PEN"}
          </span>
        </div>

        <div className="px-6 pb-8 pt-2">
          <button
            disabled={loading}
            onClick={onConfirm}
            className="w-full py-4 rounded-2xl font-black text-sm text-white transition-all tap-active flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: `linear-gradient(135deg,${m.color || "#1A3270"},#3B5BDB)`, boxShadow: `0 4px 14px ${m.color || "#1A3270"}40` }}>
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uniéndome...</>
            ) : mode === "success" ? (
              <><span className="material-symbols-outlined fill text-base">home</span>Ir a mi hub →</>
            ) : (
              `Unirme a ${m.nombre} →`
            )}
          </button>
          {mode === "preview" && (
            <button onClick={onClose} className="w-full text-center text-[#8A8FA8] text-sm font-semibold mt-3">Cancelar</button>
          )}
        </div>
      </div>
    </div>
  );
}
