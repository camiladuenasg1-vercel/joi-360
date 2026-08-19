// ── MOLECULES ────────────────────────────────────────────────────────────────
// Combinations of atoms with light interaction logic.

import React from "react";
import { GlassCard, IconBox, Badge } from "../atoms/index.jsx";

/** Transaction row */
export function TxRow({ icon, iconBg, iconColor, title, sub, amount, amountColor, badge }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined fill ${iconColor} text-base`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#1C1C1E] text-sm font-semibold truncate">{title}</p>
        <p className="text-[#8A8FA8] text-[11px]">{sub}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {amount && <p className={`font-black text-sm ${amountColor || "text-[#1C1C1E]"}`}>{amount}</p>}
        {badge && <Badge label={badge.label} color={badge.color} />}
      </div>
    </div>
  );
}

/** Service toggle row — shows if a specific service is active */
export function ServiceRow({ active, nombre, desc }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${active ? "bg-[#F2F2F7]" : "bg-[#F2F2F7] opacity-50"}`}>
      <span className={`material-symbols-outlined fill text-base mt-0.5 flex-shrink-0 ${active ? "text-[#1A3270]" : "text-[#CDD1E4]"}`}>
        {active ? "check_circle" : "radio_button_unchecked"}
      </span>
      <div>
        <p className={`text-sm font-semibold ${active ? "text-[#1C1C1E]" : "text-[#CDD1E4]"}`}>{nombre}</p>
        {desc && <p className="text-[11px] text-[#8A8FA8] mt-0.5 leading-snug">{desc}</p>}
      </div>
    </div>
  );
}

/** Reservation card */
export function ReservationCard({ space, hora, status, icon, location }) {
  const STATUS = {
    "Confirmada": { color: "green", label: "Confirmada" },
    "Pendiente":  { color: "amber", label: "Pendiente" },
    "Cancelada":  { color: "red",   label: "Cancelada" },
  };
  const s = STATUS[status] || { color: "slate", label: status };
  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#DCE4FA] flex items-center justify-center">
            <span className="material-symbols-outlined fill text-[#1A3270]">{icon || "event_available"}</span>
          </div>
          <div>
            <p className="font-bold text-[#1C1C1E] text-sm">{space}</p>
            {location && <p className="text-xs text-[#8A8FA8]">{location}</p>}
          </div>
        </div>
        <Badge label={s.label} color={s.color} />
      </div>
      <div className="flex justify-between pt-2 border-t border-[#CDD1E4]/50">
        <span className="text-xs text-[#8A8FA8] flex items-center gap-1">
          <span className="material-symbols-outlined text-[#1A3270] text-sm">schedule</span>
          {hora}
        </span>
        <span className="text-xs font-bold text-[#1A3270] tap-active cursor-pointer">Ver detalle →</span>
      </div>
    </GlassCard>
  );
}

/** Event card */
export function EventCard({ nombre, fecha, precio, icono, available, onBuy }) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-[#DCE4FA] to-[#DCE4FA] flex items-center justify-center relative">
        <span className="material-symbols-outlined fill text-[#1A3270] text-5xl">{icono || "confirmation_number"}</span>
        <div className="absolute top-2 right-2">
          <Badge label={precio === 0 ? "Gratis" : `S/ ${precio}`} color={precio === 0 ? "green" : "primary"} />
        </div>
      </div>
      <div className="p-3">
        <p className="font-black text-[#1C1C1E] text-sm">{nombre}</p>
        <p className="text-xs text-[#1A3270] font-bold flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-sm">calendar_today</span>{fecha}
        </p>
        {typeof available === "number" && (
          <p className="text-[10px] text-[#8A8FA8] mt-1">{available} lugares disponibles</p>
        )}
        <button onClick={onBuy}
          className="mt-2 w-full py-2.5 rounded-xl text-white text-xs font-black tap-active"
          style={{background:"linear-gradient(135deg,#1A3270,#3B5BDB)", boxShadow:"0 4px 12px rgba(26,50,112,0.25)"}}>
          {precio === 0 ? "Reservar lugar" : "Comprar entrada"}
        </button>
      </div>
    </GlassCard>
  );
}

/** Progress bar with label */
export function ProgressBar({ value, max, label, sub, color }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  const barColor = color || (pct > 80 ? "#E8394B" : pct > 50 ? "#E06B00" : "#1A3270");
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        {label && <p className="text-[11px] font-bold text-[#8A8FA8] uppercase">{label}</p>}
        {sub && <p className="text-xs font-black text-[#1C1C1E]">{sub}</p>}
      </div>
      <div className="h-2 bg-[#CDD1E4] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`, background:barColor}} />
      </div>
    </div>
  );
}

/** Merchant chip */
export function MerchantChip({ nombre, categoria, onClick }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 glass-card rounded-2xl p-3 w-20 flex-shrink-0 tap-active">
      <div className="w-10 h-10 rounded-xl bg-[#1A3270] flex items-center justify-center">
        <span className="text-white font-black text-base">{nombre[0]}</span>
      </div>
      <p className="text-[9px] font-semibold text-[#404255] text-center leading-tight line-clamp-2">{nombre}</p>
    </button>
  );
}

/** Config summary card — shows what admin configured */
export function ConfigSummary({ items }) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-black text-[#1A3270] uppercase tracking-widest flex items-center gap-1">
        <span className="material-symbols-outlined fill text-[12px]">settings</span>
        Configurado por tu comunidad
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#EEF2FD] border border-[#DCE4FA]">
            <span className="material-symbols-outlined fill text-[#1A3270] text-[11px]">{item.icon}</span>
            <span className="text-[11px] font-semibold text-[#404255]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
