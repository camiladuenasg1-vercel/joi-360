import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, session } from "./store";
import { getSyncStatus, onSyncStatus, fetchResumenNotificacionesRedPontis } from "./supabase.js";
import { useStore } from "./hooks";

/* Badge de sincronización con Supabase (Render Engine en vivo):
   lo que el admin guarda se upserta a la fuente que lee la superapp. */
export function SyncBadge() {
  const [s, setS] = useState(getSyncStatus());
  useEffect(() => onSyncStatus(setS), []);
  const meta = {
    idle:    { dot: "bg-outline-variant", label: "App en espera" },
    syncing: { dot: "bg-amber-400 animate-pulse", label: "Publicando a la app…" },
    ok:      { dot: "bg-ok", label: "App sincronizada" },
    error:   { dot: "bg-error", label: "Error de sync" },
  }[s.state] || { dot: "bg-outline-variant", label: s.state };
  return (
    <span title={s.error || "Configuración publicada a la superapp vía Supabase"}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
      <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>{meta.label}
    </span>
  );
}

export const Icon = ({ n, className = "", fill = false }) => (
  <span className={`msi ${fill ? "msi-fill" : ""} ${className}`}>{n}</span>
);

export const Pill = ({ color = "bg-ok", children }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
    <span className={`w-2 h-2 rounded-full ${color}`}></span>{children}
  </span>
);

export const TierTag = ({ tier }) => {
  const map = {
    CORE: "bg-primary-fixed text-primary",
    PREMIUM: "bg-tertiary-fixed text-tertiary",
    OPCIONAL: "bg-surface-container text-on-surface-variant",
    "MOTOR BASE": "bg-secondary-fixed text-secondary",
  };
  return <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${map[tier] || ""}`}>{tier}</span>;
};

export const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange && onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-primary" : "bg-outline-variant"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`}></span>
  </button>
);

// Icono de info que revela una guía breve al hacer click (no satura la
// pantalla con párrafos fijos). Reemplaza los banners largos de texto que
// antes iban siempre visibles junto a cada sección.
export function InfoTip({ title, text, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocClick); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <span className="relative inline-flex" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-outline hover:text-primary transition-colors"
        aria-label={title || "Más información"}>
        <Icon n="info" className="text-[15px]" />
      </button>
      {open && (
        <div className={`absolute z-40 top-6 ${align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"} w-72 p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-lg text-xs text-on-surface-variant leading-relaxed`}>
          {title && <p className="font-semibold text-on-surface mb-1">{title}</p>}
          {text}
        </div>
      )}
    </span>
  );
}

export const Field = ({ label, hint, children }) => (
  <div>
    <label className="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-outline mt-1">{hint}</p>}
  </div>
);

export const inputCls = "w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

// Input numérico controlado que SÍ deja reescribir: el patrón viejo
// (`value={f.x||0}` + `onChange={e=>setF({...f,x:+e.target.value})}`)
// coacciona a número en cada tecla, así que borrar el campo o escribir un
// decimal ("2.") rebota de inmediato al número redondeado y el usuario
// nunca puede terminar de escribir. Este componente guarda el string crudo
// mientras el input tiene foco y solo emite el número parseado al perder
// el foco (o Enter), igual que cualquier campo numérico nativo esperaría.
export function NumInput({ value, onChange, className = inputCls, allowNull = false, ...props }) {
  const [raw, setRaw] = useState(() => (value === null || value === undefined ? "" : String(value)));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setRaw(value === null || value === undefined ? "" : String(value)); }, [value, focused]);
  const commit = (str) => {
    if (str === "" || str === "-" || str === "." || str === "-.") { onChange(allowNull ? null : 0); return; }
    const n = Number(str);
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <input
      {...props}
      type="number"
      className={className}
      value={raw}
      onFocus={() => setFocused(true)}
      onChange={e => setRaw(e.target.value)}
      onBlur={e => { setFocused(false); commit(e.target.value); }}
      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); props.onKeyDown?.(e); }}
    />
  );
}

export const Drawer = ({ open, onClose, title, subtitle, icon, children, footer, width = "w-[480px]" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-[3px]" onClick={onClose}></div>
      <aside className={`relative ${width} max-w-full h-full bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col slide-in`}>
        <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-start bg-surface">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                <Icon n={icon} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-on-surface leading-tight">{title}</h2>
              {subtitle && <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant">
            <Icon n="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="p-5 border-t border-outline-variant bg-surface flex justify-end gap-3">{footer}</div>}
      </aside>
    </div>
  );
};

// Spinner reutilizable para el estado loading de los botones — antes cada
// pantalla resolvía "guardando…" a mano (texto swap + disabled por separado,
// sin spinner), con el riesgo real de que alguna se olvidara el disabled y
// permitiera doble-click mientras el guardado en curso todavía viaja en la
// sync en cascada hacia Supabase (ver SyncBadge arriba).
const BtnSpinner = () => <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" aria-hidden="true"/>;

export const BtnPrimary = ({ children, loading, loadingLabel, disabled, ...p }) => (
  <button {...p} disabled={disabled || loading} className={`px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 ${p.className || ""}`}>
    {loading && <BtnSpinner/>}{loading ? (loadingLabel || children) : children}
  </button>
);
export const BtnOutline = ({ children, loading, loadingLabel, disabled, ...p }) => (
  <button {...p} disabled={disabled || loading} className={`px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors flex items-center justify-center gap-2 ${p.className || ""}`}>
    {loading && <BtnSpinner/>}{loading ? (loadingLabel || children) : children}
  </button>
);

// ── Campanita de notificaciones (Task #170) ─────────────────────────────
// Un solo fetch agregado (fetchResumenNotificacionesRedPontis) junta las 4
// colas que ya existían dispersas (Aprobaciones, Hardware, Soporte,
// Liquidación) — no hay tabla de "notificaciones" nueva que mantener
// sincronizada, la notificación ES el item pendiente en su propia tabla.
// Tickets de soporte salen de st.tickets (ya vive en el store, sin fetch
// aparte) para no duplicar esa reconciliación.
function useResumenNotificaciones() {
  const st = useStore();
  const [remoto, setRemoto] = useState(null);
  const cargar = () => fetchResumenNotificacionesRedPontis().then(setRemoto).catch(() => setRemoto(null));
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60_000); // refresco silencioso, sin que la usuaria tenga que recargar la página
    return () => clearInterval(id);
  }, []);
  const soporte = (st.tickets || []).filter(t => t.estado === "ABIERTO").length;
  return {
    aprobaciones: remoto?.aprobaciones || 0,
    hardware: remoto?.hardware || 0,
    liquidacion: remoto?.liquidacion || 0,
    soporte,
    detalle: remoto?.detalle || null,
    recargar: cargar,
  };
}

function NotificationBell({ r }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const total = r.aprobaciones + r.hardware + r.liquidacion + r.soporte;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filas = [
    { n: r.aprobaciones, icon: "approval", label: "Aprobaciones pendientes", detalle: "Eventos y comercios esperando revisión.", to: "/admin/gobierno" },
    { n: r.hardware, icon: "inventory_2", label: "Hardware por atender", detalle: "Requerimientos de equipo, lotes NFC y banditas con cobro pendiente.", to: "/admin/hardware-pos" },
    { n: r.soporte, icon: "support_agent", label: "Tickets de soporte abiertos", detalle: "Casos sin asignar o sin respuesta todavía.", to: "/admin/soporte" },
    { n: r.liquidacion, icon: "account_balance", label: "Liquidación retenida", detalle: "Lotes que no alcanzaron el mínimo o quedaron con neto negativo.", to: "/admin/liquidacion" },
  ];

  const ir = (to) => { setOpen(false); nav(to); };

  return (
    <span className="relative inline-flex" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} title="Notificaciones"
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors">
        <Icon n="notifications" className="text-[20px]" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[9px] font-black flex items-center justify-center">{total > 99 ? "99+" : total}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-40 top-11 right-0 w-80 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <p className="font-semibold text-sm">Notificaciones</p>
            <button onClick={r.recargar} className="text-outline hover:text-primary" title="Actualizar"><Icon n="refresh" className="text-[16px]" /></button>
          </div>
          {total === 0 ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Todo al día — sin pendientes.</p>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {filas.filter(f => f.n > 0).map(f => (
                <button key={f.label} onClick={() => ir(f.to)} className="w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-container transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center flex-shrink-0"><Icon n={f.icon} className="text-[18px]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">{f.label} <span className="font-mono text-[10px] text-tertiary">({f.n})</span></p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">{f.detalle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// Orden alineado al guion del demo (doc §8): plataforma → mundos → pagos → operación.
const NAV = [
  { group: "Plataforma", items: [
    { to: "/admin", icon: "dashboard", label: "Dashboard", exact: true },
    { to: "/admin/catalogos", icon: "library_books", label: "Catálogos Globales" },
    { to: "/admin/gobierno", icon: "approval", label: "Aprobaciones" },
  ]},
  { group: "Comunidades", items: [
    { to: "/admin/mundos", icon: "public", label: "Todos los Mundos" },
  ]},
  { group: "Operación", items: [
    { to: "/admin/usuarios", icon: "group", label: "Usuarios" },
    { to: "/admin/liquidacion", icon: "account_balance", label: "Liquidación" },
    { to: "/admin/calculadora", icon: "calculate", label: "Calculadora Comercial" },
    { to: "/admin/soporte", icon: "support_agent", label: "Soporte" },
    { to: "/admin/monitoreo", icon: "troubleshoot", label: "Monitoreo de Errores" },
    { to: "/admin/resumen", icon: "analytics", label: "Reportes y Auditoría" },
  ]},
  { group: "Público", items: [
    // Deshabilitada por el momento: hasta tener una UI más estética para
    // construir web con render config, esta pantalla queda fuera del
    // alcance activo — no se elimina el código, solo se saca del uso real.
    { to: "/landing", icon: "language", label: "Landing", proximamente: true },
  ]},
];

// Badge por ruta: cada NAV item que tiene algo pendiente que atender muestra
// su numeral, calculado desde el mismo resumen que usa la campanita —
// evita que la usuaria tenga que abrir el dropdown para saber por dónde
// entrar; puede simplemente seguir el numeral rojo hasta la pestaña.
function badgesPorRuta(r) {
  return {
    "/admin/gobierno": r.aprobaciones,
    "/admin/catalogos": r.hardware,
    "/admin/soporte": r.soporte,
    "/admin/liquidacion": r.liquidacion,
  };
}

export function Shell({ children, title, contextNav }) {
  const loc = useLocation();
  const nav = useNavigate();
  const s = session();
  const r = useResumenNotificaciones();
  const badges = badgesPorRuta(r);

  useEffect(() => { if (!s) nav("/login"); }, [s]);

  return (
    <div className="flex h-screen overflow-hidden">
      <nav className="w-[260px] flex-shrink-0 h-screen bg-surface border-r border-outline-variant flex flex-col py-8 z-30">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">RP</div>
          <div>
            <h1 className="font-bold text-primary leading-tight">Redpontis Admin</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">JOI 360 · Control central</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          {NAV.map(group => (
            <div key={group.group} className="mb-3">
              <p className="px-4 pb-1 pt-3 font-mono text-[9px] uppercase tracking-widest text-outline">{group.group}</p>
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const active = loc.pathname === item.to;
                  const badge = badges[item.to] || 0;
                  if (item.proximamente) return (
                    <li key={item.to}>
                      <div title="Próximamente" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-outline cursor-not-allowed">
                        <Icon n={item.icon} className="text-[20px]" />
                        {item.label}
                        <span className="ml-auto font-mono text-[8px] uppercase bg-surface-container px-1.5 py-0.5 rounded">Próx.</span>
                      </div>
                    </li>
                  );
                  return (
                    <li key={item.to}>
                      <Link to={item.to} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${active ? "text-primary font-bold bg-primary-fixed border-r-4 border-primary" : "text-on-surface-variant hover:text-primary hover:bg-surface-container"}`}>
                        <Icon n={item.icon} fill={active} className="text-[20px]" />
                        {item.label}
                        {badge > 0 && <span className="ml-auto w-5 h-5 rounded-full bg-error text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{badge > 9 ? "9+" : badge}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="px-4 pt-4 border-t border-outline-variant space-y-2">
          <button onClick={() => { logout(); nav("/login"); }} className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm">
            <Icon n="logout" className="text-[20px]" /> Salir
          </button>
          <div className="flex items-center gap-3 px-4 pt-2">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">{(s?.name || "A")[0]}</div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate">{s?.name}</p>
              <p className="font-mono text-[10px] text-on-surface-variant truncate">{s?.email}</p>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-surface-container-lowest border-b border-outline-variant shadow-sm flex justify-between items-center px-8 z-20">
          <h2 className="font-black text-on-surface">{title || "Joi 360 Ecosystem"}</h2>
          <div className="flex items-center gap-4">
            {contextNav}
            <NotificationBell r={r} />
            <SyncBadge />
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest hidden md:block">JOI 360 · v2.0</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-background">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Toasts globales ---------- */
let _tid = 0;
export function notify(msg, type = "success") {
  window.dispatchEvent(new CustomEvent("joi360:toast", { detail: { id: ++_tid, msg, type } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const h = (e) => {
      const t = e.detail;
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500);
    };
    window.addEventListener("joi360:toast", h);
    return () => window.removeEventListener("joi360:toast", h);
  }, []);
  const STYLE = {
    error:   "bg-error-container border-error/30 text-error",
    warning: "bg-tertiary-fixed border-tertiary/30 text-tertiary",
    info:    "bg-surface-container-lowest border-primary/30 text-on-surface",
    success: "bg-surface-container-lowest border-ok/40 text-on-surface",
  };
  const ICON = { error: "error", warning: "warning", info: "info", success: "check_circle" };
  const ICON_COLOR = { error: "text-error", warning: "text-tertiary", info: "text-primary", success: "text-ok" };
  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`slide-in pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm ${STYLE[t.type] || STYLE.success}`}>
          <Icon n={ICON[t.type] || ICON.success} fill className={`text-[20px] ${ICON_COLOR[t.type] || ICON_COLOR.success}`} />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
