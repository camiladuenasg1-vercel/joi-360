// ── ATOMS ────────────────────────────────────────────────────────────────────
// Smallest building blocks. No business logic, pure UI.

import React from "react";

/** Capsule badge (status indicator) */
export function Badge({ label, color = "primary", icon }) {
  const COLORS = {
    primary:  "bg-[#DCE4FA] text-[#1A3270] border-[#DCE4FA]/50",
    green:    "bg-green-50  text-green-700  border-green-200",
    amber:    "bg-amber-50  text-amber-700  border-amber-200",
    red:      "bg-red-50    text-red-600    border-red-200",
    slate:    "bg-slate-50  text-slate-600  border-slate-200",
    teal:     "bg-teal-50   text-teal-700   border-teal-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${COLORS[color]}`}>
      {icon && <span className="material-symbols-outlined fill text-[11px]">{icon}</span>}
      {label}
    </span>
  );
}

/** Section heading */
export function SectionTitle({ children, action, onAction }) {
  return (
    <div className="flex justify-between items-center mb-3">
      <p className="text-[11px] font-black text-[#8A8FA8] uppercase tracking-widest">{children}</p>
      {action && <button onClick={onAction} className="text-[11px] font-bold text-[#1A3270]">{action}</button>}
    </div>
  );
}

/** Icon box with color bg */
export function IconBox({ icon, bg, color, size = "md", filled = false }) {
  const sz = size === "lg" ? "w-14 h-14 rounded-2xl text-3xl" : size === "sm" ? "w-8 h-8 rounded-xl text-base" : "w-11 h-11 rounded-xl text-2xl";
  return (
    <div className={`${sz} ${bg} flex items-center justify-center flex-shrink-0`}>
      <span className={`material-symbols-outlined ${color} ${filled ? "fill" : ""}`}
        style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
    </div>
  );
}

/** Large numeric display */
export function BigNumber({ prefix, value, suffix, sub, color = "text-[#1C1C1E]" }) {
  return (
    <div>
      {sub && <p className="text-[11px] font-bold text-[#8A8FA8] uppercase tracking-widest mb-1">{sub}</p>}
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-xl font-bold text-[#8A8FA8]">{prefix}</span>}
        <span className={`text-5xl font-black tracking-tight leading-none ${color}`}>{value}</span>
        {suffix && <span className="text-lg text-[#8A8FA8] font-semibold">{suffix}</span>}
      </div>
    </div>
  );
}

/** Stat chip grid item */
export function StatChip({ label, value, icon, color = "bg-[#EEF2FD]" }) {
  return (
    <div className={`${color} rounded-2xl p-3`}>
      {icon && <span className="material-symbols-outlined fill text-[#1A3270] text-base block mb-1">{icon}</span>}
      <p className="text-[10px] font-bold text-[#8A8FA8] uppercase">{label}</p>
      <p className="font-black text-[#1C1C1E] text-sm mt-0.5">{value}</p>
    </div>
  );
}

/** Glass card wrapper */
export function GlassCard({ children, className = "", onClick }) {
  return (
    <div className={`glass-card rounded-2xl ${onClick ? "tap-active cursor-pointer" : ""} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

/** Config hint chip — shows what admin set */
export function ConfigHint({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EEF2FD] border border-[#DCE4FA]">
      <span className="material-symbols-outlined fill text-[#1A3270] text-sm">{icon}</span>
      <span className="text-[11px] font-semibold text-[#404255]">{label}</span>
    </div>
  );
}

/** Module not enabled fallback */
export function ModuleDisabled({ name, mundo }) {
  return (
    <div className="px-5 pb-8 text-center pt-4">
      <div className="w-16 h-16 rounded-3xl bg-[#EEF2FD] flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-[#CDD1E4] text-3xl">block</span>
      </div>
      <p className="text-[#1C1C1E] font-black text-lg">Módulo no disponible</p>
      <p className="text-[#8A8FA8] text-sm mt-2 max-w-[260px] mx-auto leading-relaxed">
        <b>{name}</b> no está habilitado en <b>{mundo?.nombre}</b> por tu comunidad.
      </p>
      <p className="text-[#CDD1E4] text-xs mt-4">Contacta a tu administrador para activarlo.</p>
    </div>
  );
}
