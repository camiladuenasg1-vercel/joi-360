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
        <p className="text-[#1b1b24] text-sm font-semibold truncate">{title}</p>
        <p className="text-[#777587] text-[11px]">{sub}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {amount && <p className={`font-black text-sm ${amountColor || "text-[#1b1b24]"}`}>{amount}</p>}
        {badge && <Badge label={badge.label} color={badge.color} />}
      </div>
    </div>
  );
}

/** Service toggle row — shows if a specific service is active */
export function ServiceRow({ active, nombre, desc }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${active ? "bg-[#f5f2ff]" : "bg-[#fafafa] opacity-50"}`}>
      <span className={`material-symbols-outlined fill text-base mt-0.5 flex-shrink-0 ${active ? "text-[#3525cd]" : "text-[#c7c4d8]"}`}>
        {active ? "check_circle" : "radio_button_unchecked"}
      </span>
      <div>
        <p className={`text-sm font-semibold ${active ? "text-[#1b1b24]" : "text-[#c7c4d8]"}`}>{nombre}</p>
        {desc && <p className="text-[11px] text-[#777587] mt-0.5 leading-snug">{desc}</p>}
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
          <div className="w-11 h-11 rounded-xl bg-[#e2dfff] flex items-center justify-center">
            <span className="material-symbols-outlined fill text-[#3525cd]">{icon || "event_available"}</span>
          </div>
          <div>
            <p className="font-bold text-[#1b1b24] text-sm">{space}</p>
            {location && <p className="text-xs text-[#777587]">{location}</p>}
          </div>
        </div>
        <Badge label={s.label} color={s.color} />
      </div>
      <div className="flex justify-between pt-2 border-t border-[#e4e1ee]/50">
        <span className="text-xs text-[#777587] flex items-center gap-1">
          <span className="material-symbols-outlined text-[#3525cd] text-sm">schedule</span>
          {hora}
        </span>
        <span className="text-xs font-bold text-[#3525cd] tap-active cursor-pointer">Ver detalle →</span>
      </div>
    </GlassCard>
  );
}

/** Event card */
export function EventCard({ nombre, fecha, precio, icono, available, onBuy }) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-[#e2dfff] to-[#dae2fd] flex items-center justify-center relative">
        <span className="material-symbols-outlined fill text-[#3525cd] text-5xl">{icono || "confirmation_number"}</span>
        <div className="absolute top-2 right-2">
          <Badge label={precio === 0 ? "Gratis" : `S/ ${precio}`} color={precio === 0 ? "green" : "primary"} />
        </div>
      </div>
      <div className="p-3">
        <p className="font-black text-[#1b1b24] text-sm">{nombre}</p>
        <p className="text-xs text-[#3525cd] font-bold flex items-center gap-1 mt-1">
          <span className="material-symbols-outlined text-sm">calendar_today</span>{fecha}
        </p>
        {typeof available === "number" && (
          <p className="text-[10px] text-[#777587] mt-1">{available} lugares disponibles</p>
        )}
        <button onClick={onBuy}
          className="mt-2 w-full py-2.5 rounded-xl text-white text-xs font-black tap-active"
          style={{background:"linear-gradient(135deg,#3525cd,#4f46e5)", boxShadow:"0 4px 12px rgba(53,37,205,0.25)"}}>
          {precio === 0 ? "Reservar lugar" : "Comprar entrada"}
        </button>
      </div>
    </GlassCard>
  );
}

/** Progress bar with label */
export function ProgressBar({ value, max, label, sub, color }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  const barColor = color || (pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#3525cd");
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        {label && <p className="text-[11px] font-bold text-[#777587] uppercase">{label}</p>}
        {sub && <p className="text-xs font-black text-[#1b1b24]">{sub}</p>}
      </div>
      <div className="h-2 bg-[#e4e1ee] rounded-full overflow-hidden">
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
      <div className="w-10 h-10 rounded-xl bg-[#3525cd] flex items-center justify-center">
        <span className="text-white font-black text-base">{nombre[0]}</span>
      </div>
      <p className="text-[9px] font-semibold text-[#464555] text-center leading-tight line-clamp-2">{nombre}</p>
    </button>
  );
}

/** Config summary card — shows what admin configured */
export function ConfigSummary({ items }) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-black text-[#3525cd] uppercase tracking-widest flex items-center gap-1">
        <span className="material-symbols-outlined fill text-[12px]">settings</span>
        Configurado por tu comunidad
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f0ecf9] border border-[#e2dfff]">
            <span className="material-symbols-outlined fill text-[#3525cd] text-[11px]">{item.icon}</span>
            <span className="text-[11px] font-semibold text-[#464555]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
