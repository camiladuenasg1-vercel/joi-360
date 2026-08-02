/**
 * Monitoreo de Errores (Gantt #97) — RedPontis ve en vivo las ocurrencias
 * reales registradas por errorControlado/logErrorControlado en ambas apps.
 * Antes: error_log solo se escribía (fire-and-forget), nadie lo leía nunca.
 */
import React, { useState, useEffect } from "react";
import { useStore } from "./hooks";
import { fetchErrorLog, fetchErrorCatalogMap } from "./supabase";
import { Icon } from "./ui";

const SEV_COLOR = {
  error:   "bg-error-container/30 text-error border-error/30",
  warning: "bg-tertiary-fixed text-tertiary border-tertiary/30",
  info:    "bg-secondary-fixed text-secondary border-secondary/30",
};
const ORIGEN_LABEL = { admin: "Admin RP", app: "Super App" };

export function Monitoreo() {
  const st = useStore();
  const [log, setLog] = useState(null);
  const [catalog, setCatalog] = useState(new Map());
  const [filtroSev, setFiltroSev] = useState("Todas");
  const [filtroOrigen, setFiltroOrigen] = useState("Todos");

  useEffect(() => {
    Promise.all([fetchErrorLog(200), fetchErrorCatalogMap()])
      .then(([rows, cat]) => { setLog(rows || []); setCatalog(cat); })
      .catch(() => setLog([]));
  }, []);

  const rows = (log || []).map(r => ({ ...r, cat: catalog.get(r.code) }));
  const filtered = rows.filter(r =>
    (filtroSev === "Todas" || (r.cat?.severidad || "error") === filtroSev) &&
    (filtroOrigen === "Todos" || r.origen === filtroOrigen)
  );

  const total = rows.length;
  const errores = rows.filter(r => (r.cat?.severidad || "error") === "error").length;
  const advertencias = rows.filter(r => r.cat?.severidad === "warning").length;
  const porCodigo = {};
  rows.forEach(r => { porCodigo[r.code] = (porCodigo[r.code] || 0) + 1; });
  const topCodigo = Object.entries(porCodigo).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
          <span className="text-primary">Ecosistema RedPontis</span>
          <span className="text-outline-variant">·</span>
          <span>Operaciones</span>
        </div>
        <h1 className="text-3xl font-bold">Monitoreo de Errores</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl">
          Ocurrencias reales de <code className="font-mono text-xs bg-surface-container px-1 rounded">error_log</code> registradas
          por el catálogo de errores controlados en el Admin y la Super App — últimas 200.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPI label="Ocurrencias (últimas 200)" value={log === null ? "…" : total} icon="troubleshoot" tone="primary" />
        <KPI label="Severidad error" value={log === null ? "…" : errores} icon="error" tone="error" />
        <KPI label="Severidad advertencia" value={log === null ? "…" : advertencias} icon="warning" tone="secondary" />
        <KPI label="Código más frecuente" value={topCodigo ? `${topCodigo[0]} (${topCodigo[1]})` : "—"} icon="query_stats" tone="primary" small />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright/50">
          <h3 className="text-xl font-bold">Registro de ocurrencias</h3>
          <div className="flex gap-2">
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 text-xs" value={filtroSev} onChange={e => setFiltroSev(e.target.value)}>
              <option value="Todas">Cualquier severidad</option>
              <option value="error">Error</option>
              <option value="warning">Advertencia</option>
              <option value="info">Info</option>
            </select>
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 text-xs" value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}>
              <option value="Todos">Cualquier origen</option>
              <option value="admin">Admin RP</option>
              <option value="app">Super App</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface border-b border-outline-variant font-mono text-[10px] uppercase tracking-wider text-outline">
                <th className="px-4 py-3 font-medium">Cuándo</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Severidad</th>
                <th className="px-4 py-3 font-medium">Contexto</th>
                <th className="px-4 py-3 font-medium">Mundo</th>
                <th className="px-4 py-3 font-medium">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {log === null && <tr><td colSpan="6" className="p-10 text-center text-on-surface-variant">Cargando…</td></tr>}
              {log !== null && filtered.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-on-surface-variant">Sin ocurrencias para estos filtros.</td></tr>}
              {filtered.map(r => {
                const mundo = r.world_id ? (st.mundos||[]).find(m => m.id === r.world_id) : null;
                const sev = r.cat?.severidad || "error";
                return (
                  <tr key={r.id} className="hover:bg-surface-container-low">
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-PE")}</td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold">{r.code}</p>
                      {r.cat?.titulo && <p className="text-[10px] text-on-surface-variant">{r.cat.titulo}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-mono text-[9px] uppercase font-bold ${SEV_COLOR[sev]}`}>{sev}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{r.contexto || "—"}</td>
                    <td className="px-4 py-3 text-xs">{mundo?.nombre || (r.world_id ? <span className="text-outline font-mono text-[10px]">{r.world_id}</span> : "—")}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-container text-outline">{ORIGEN_LABEL[r.origen] || r.origen || "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface flex justify-between items-center text-sm">
          <span className="font-mono text-[10px] uppercase text-on-surface-variant">{filtered.length} de {total} ocurrencia(s) · fuente: error_log (Supabase)</span>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, tone = "primary", small }) {
  const colors = {
    error: "bg-error-container/30 text-error",
    secondary: "bg-secondary-container/30 text-secondary",
    primary: "bg-primary-container/30 text-primary",
  };
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${colors[tone].split(" ")[0]} rounded-full blur-xl group-hover:scale-110 transition-transform duration-500`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-lg ${colors[tone]} flex items-center justify-center`}>
          <Icon n={icon} />
        </div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 relative z-10">{label}</p>
      <p className={`${small ? "text-lg" : "text-4xl"} font-black relative z-10 truncate`}>{value}</p>
    </div>
  );
}
