/**
 * ATOMIC DESIGN — Module UI Building Blocks
 * Atoms → Molecules → Organisms (Module templates)
 */
import React from "react";

// ── ATOMS ──────────────────────────────────────────────────────────────────

export function Icon({ name, fill = false, size = "text-2xl", color = "" }) {
  return (
    <span
      className={`material-symbols-outlined ${size} ${color} select-none`}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : {}}>
      {name}
    </span>
  );
}

export function Chip({ label, color = "bg-[#DCE4FA] text-[#1A3270]", dot }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}

export function Tag({ label, icon }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2FD] border border-[#DCE4FA]">
      {icon && <Icon name={icon} size="text-sm" color="text-[#1A3270]" />}
      <span className="text-xs font-semibold text-[#404255]">{label}</span>
    </div>
  );
}

// ── MOLECULES ──────────────────────────────────────────────────────────────

export function SectionCard({ children, className = "", ...props }) {
  return (
    <div className={`glass-card rounded-3xl overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SectionHeader({ label, icon, action, onAction }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#CDD1E4]/50">
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size="text-lg" fill color="text-[#1A3270]" />}
        <p className="font-bold text-[#1C1C1E] text-sm">{label}</p>
      </div>
      {action && (
        <button onClick={onAction} className="text-[11px] font-bold text-[#1A3270] uppercase tracking-wider">
          {action}
        </button>
      )}
    </div>
  );
}

export function StatGrid({ stats }) {
  return (
    <div className={`grid gap-3 ${stats.length <= 2 ? "grid-cols-2" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {stats.map((s, i) => (
        <div key={i} className="bg-[#EEF2FD] rounded-2xl p-3 text-center">
          {s.icon && <Icon name={s.icon} fill size="text-2xl" color={s.iconColor || "text-[#1A3270]"} />}
          <p className={`font-black leading-tight mt-1 ${s.big ? "text-3xl" : "text-xl"} ${s.color || "text-[#1C1C1E]"}`}>{s.value}</p>
          <p className="text-[10px] font-bold text-[#8A8FA8] uppercase tracking-wider mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max, color = "bg-[#1A3270]" }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  const autoColor = pct > 80 ? "bg-red-500" : pct > 55 ? "bg-amber-500" : color;
  return (
    <div className="h-2 bg-[#CDD1E4] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${autoColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ListItem({ icon, iconBg, iconColor, title, subtitle, right, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#CDD1E4]/40 last:border-0 w-full text-left ${onClick ? "tap-active hover:bg-[#F2F2F7]" : ""}`}>
      {icon && (
        <div className={`w-10 h-10 rounded-2xl ${iconBg || "bg-[#EEF2FD]"} flex items-center justify-center flex-shrink-0`}>
          <Icon name={icon} fill size="text-base" color={iconColor || "text-[#1A3270]"} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1C1C1E] truncate">{title}</p>
        {subtitle && <p className="text-xs text-[#8A8FA8] mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
      {onClick && <Icon name="chevron_right" size="text-lg" color="text-[#CDD1E4]" />}
    </Tag>
  );
}

export function HeroBalance({ label, amount, currency = "S/", subtitle, dark = false, children }) {
  return (
    <div
      className={`rounded-3xl p-8 text-center relative overflow-hidden ${dark ? "text-white" : "text-[#1C1C1E]"}`}
      style={dark ? { background: "linear-gradient(135deg,#1A3270 0%,#3B5BDB 100%)" } : { background: "#EEF2FD" }}>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${dark ? "text-white/60" : "text-[#8A8FA8]"}`}>{label}</p>
      <p className={`text-5xl font-black tracking-tight ${dark ? "text-white" : "text-[#1A3270]"}`}>
        {currency} {typeof amount === "number" ? amount.toFixed(2) : amount}
      </p>
      {subtitle && <p className={`text-xs mt-2 ${dark ? "text-white/50" : "text-[#8A8FA8]"}`}>{subtitle}</p>}
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 rounded-3xl bg-[#EEF2FD] flex items-center justify-center mx-auto mb-4">
        <Icon name={icon || "inbox"} size="text-3xl" color="text-[#CDD1E4]" />
      </div>
      <p className="font-bold text-[#404255]">{title}</p>
      {subtitle && <p className="text-sm text-[#8A8FA8] mt-1 leading-relaxed">{subtitle}</p>}
      {action && (
        <button onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-2xl text-white text-sm font-bold tap-active"
          style={{ background: "linear-gradient(135deg,#1A3270,#3B5BDB)" }}>
          {action}
        </button>
      )}
    </div>
  );
}

export function ConfigBanner({ icon = "info", message, color = "amber" }) {
  const MAP = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue:  "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red:   "bg-red-50 border-red-200 text-red-800",
  };
  return (
    <div className={`flex gap-3 p-4 rounded-2xl border ${MAP[color]}`}>
      <Icon name={icon} fill size="text-base" color="" />
      <p className="text-xs leading-relaxed">{message}</p>
    </div>
  );
}

export function PrimaryBtn({ label, icon, onClick, disabled, full = true, loading, loadingLabel }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${full ? "w-full" : ""} py-4 rounded-2xl text-white font-black text-sm tap-active disabled:opacity-30 flex items-center justify-center gap-2`}
      style={{ background: "linear-gradient(135deg,#1A3270,#3B5BDB)", boxShadow: "0 6px 20px rgba(26,50,112,0.28)" }}>
      {loading
        ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />{loadingLabel || label}</>
        : <>{icon && <Icon name={icon} fill size="text-base" color="text-white" />}{label}</>}
    </button>
  );
}
