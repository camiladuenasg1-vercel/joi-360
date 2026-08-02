import React, { useState, useEffect } from "react";
import { useStore } from "./hooks";
import { fetchErrorLog } from "./supabase.js";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify } from "./ui";

// Descarga un CSV real en el navegador — mismo patrón ya usado en
// RecargasMundoWidget/VentasComercioWidget (Fronts.jsx).
function descargarCsv(nombreArchivo, header, filas) {
  const csv = header + filas.map(f => f.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivo; a.click();
  URL.revokeObjectURL(url);
}

export function Resumen() {
  const st = useStore();
  const [mundoFilter, setMundoFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ mundo: "Todos", desde: "", hasta: "" });
  const [errLog, setErrLog] = useState(null);

  useEffect(() => { fetchErrorLog(100).then(setErrLog).catch(() => setErrLog([])); }, []);

  const tickets = st.tickets || [];
  // Gap real cerrado 29-jul (pedido explícito de la usuaria): antes esta
  // pantalla era 100% decorativa — KPIs con aritmética inventada (ej.
  // "1200 + liquidaciones.length"), un log de actividad hardcodeado con
  // fechas fijas del pasado, y "Exportar todo"/"Generar reporte" que solo
  // mostraban un toast sin producir nada real. liquidaciones ahora es real
  // (motor de Liquidación reescrito, lee transacciones reales — ver
  // Liquidacion.jsx/store.js). El log de actividad se reemplaza por
  // error_log real (Gantt #97 ya lo dejaba pendiente: "falta widget de
  // monitoreo de error_log en RedPontis") en vez de inventar un audit-log de
  // acciones de admin que no existe en ningún lado del esquema. "Extracciones
  // programadas" se elimina por completo: no hay ninguna fuente real de
  // reportes programados (no hay cron ni infraestructura de envío), inventar
  // un número ahí sería el mismo problema que se está corrigiendo.
  const liquidaciones = st.liquidaciones || [];
  const alertas = tickets.filter(t => t.prioridad === "Crítica" || t.prioridad === "Alta").length;

  const filteredErr = mundoFilter === "Todos" ? (errLog || []) : (errLog || []).filter(l => l.world_id === mundoFilter);
  const mundoNombreDe = id => (st.mundos || []).find(m => m.id === id)?.nombre || id || "—";

  const exportarLiquidaciones = (filtroMundo, desde, hasta) => {
    const filas = liquidaciones
      .filter(l => (filtroMundo === "Todos" || l.mundoId === filtroMundo))
      .filter(l => (!desde || l.fecha >= desde) && (!hasta || l.fecha <= hasta))
      .map(l => [l.fecha, l.mundoNombre, l.tipoAcuerdo, l.volumen, l.comision, l.neto, l.estado]);
    if (!filas.length) { notify("No hay lotes de liquidación reales para ese filtro.", "error"); return false; }
    descargarCsv(`liquidaciones_${new Date().toISOString().slice(0, 10)}.csv`,
      "fecha,mundo,tipo_acuerdo,volumen,comision,neto,estado\n", filas);
    return true;
  };

  const generar = () => {
    const ok = exportarLiquidaciones(reportForm.mundo, reportForm.desde, reportForm.hasta);
    if (ok) { notify("Reporte generado y descargado."); setModalOpen(false); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Operación</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Resumen Operativo</span>
          </div>
          <h1 className="text-3xl font-bold">Reportes y Auditoría</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">Extractos reales de liquidación y monitoreo de errores del sistema (error_log, ambas apps).</p>
        </div>
        <div className="flex gap-3">
          <BtnOutline onClick={() => exportarLiquidaciones("Todos", "", "") && notify("Exportado.")}>
            <Icon n="download" className="text-[18px]" /> Exportar liquidaciones
          </BtnOutline>
          <BtnPrimary onClick={() => setModalOpen(true)}>
            <Icon n="add_chart" className="text-[18px]" /> Generar reporte filtrado
          </BtnPrimary>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { t: "Lotes de liquidación (total)", v: `${liquidaciones.length}`, ic: "receipt_long", sub: "reales, no simulados", badge: "Liquidación", tone: "primary" },
          { t: "Tickets de soporte abiertos", v: `${tickets.filter(t => t.estado === "ABIERTO").length}`, ic: "support_agent", sub: "en todos los mundos", badge: "Soporte", tone: "tertiary" },
          { t: "Alertas de auditoría", v: alertas, ic: "warning", sub: alertas > 0 ? `${alertas} tickets críticos/altos` : "Sin alertas críticas", badge: "Pendientes", tone: "error" },
        ].map(({ t, v, ic, sub, badge, tone }) => (
          <div key={t} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-${tone} bg-${tone === "primary" ? "surface-container-low" : tone === "tertiary" ? "surface-container-low" : "error-container"}`}>
                <Icon n={ic} />
              </div>
              <span className={`font-mono text-[10px] px-2 py-1 bg-surface-container rounded-full text-on-surface-variant flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-${tone}`}></span> {badge}
              </span>
            </div>
            <h3 className="text-on-surface-variant text-sm mb-1">{t}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{v}</span>
              <span className={`text-xs font-medium text-${tone}`}>{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* KPI resumen de mundos */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          ["Mundos activos", st.mundos?.filter(m => m.estado === "ACTIVO").length || 0, "public"],
          ["Módulos contratados (total)", st.mundos?.reduce((a, m) => a + (m.modulos||[]).filter(x => x.enabled).length, 0) || 0, "extension"],
          ["Lotes liquidados", liquidaciones.filter(l => l.estado === "PROCESADA").length, "check_circle"],
          ["Comisión acumulada", `S/ ${liquidaciones.reduce((a, l) => a + (l.comision || 0), 0).toFixed(0)}`, "account_balance"],
        ].map(([t, v, ic]) => (
          <div key={t} className="bg-primary-fixed border border-primary/20 rounded-xl p-4">
            <div className="flex justify-between mb-1"><span className="font-mono text-[9px] uppercase text-primary/70">{t}</span><Icon n={ic} className="text-primary text-[18px]" /></div>
            <p className="text-xl font-black text-primary">{v}</p>
          </div>
        ))}
      </div>

      {/* Errores reales del sistema (error_log, ambas apps) — reemplaza el
          log de "actividad" que antes eran 5 filas hardcodeadas con fechas
          fijas del pasado. No existe ningún audit-log real de acciones de
          admin en el esquema (crear uno sería una feature aparte, no un
          "make it real" de esta pantalla) — esto sí es 100% real: cada fila
          es una ocurrencia real logueada por errorControlado/logErrorControlado
          en admin o app. */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-outline-variant flex items-center justify-between bg-surface-bright">
          <h3 className="text-lg font-semibold">Errores recientes del sistema</h3>
          <div className="relative">
            <Icon n="filter_list" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
            <select className="pl-9 pr-8 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20" value={mundoFilter} onChange={e => setMundoFilter(e.target.value)}>
              <option value="Todos">Todos los mundos</option>
              {(st.mundos || []).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant font-mono text-[10px] uppercase tracking-wider border-b border-outline-variant">
              <tr>
                <th className="px-6 py-3 font-medium">Fecha / Hora</th>
                <th className="px-6 py-3 font-medium">Origen</th>
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Mundo</th>
                <th className="px-6 py-3 font-medium">Contexto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {errLog === null && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant">Cargando…</td></tr>
              )}
              {errLog !== null && filteredErr.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant">
                  <Icon n="check_circle" className="text-[32px] text-ok mb-2 block mx-auto" />
                  Sin errores registrados para este filtro.
                </td></tr>
              )}
              {filteredErr.map(l => (
                <tr key={l.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-6 py-4 text-on-surface-variant text-xs">{new Date(l.created_at).toLocaleString("es-PE")}</td>
                  <td className="px-6 py-4">
                    <span className={`font-mono text-[10px] px-2 py-1 rounded-full ${l.origen === "app" ? "bg-secondary-container text-on-secondary-container" : "bg-primary-container text-primary"}`}>{l.origen || "—"}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-sm font-mono">{l.code}</td>
                  <td className="px-6 py-4 text-on-surface-variant text-xs">{mundoNombreDe(l.world_id)}</td>
                  <td className="px-6 py-4 text-on-surface-variant text-xs">{l.contexto || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface-bright flex justify-between items-center text-sm">
          <span className="text-on-surface-variant font-mono text-[10px] uppercase">{filteredErr.length} registros reales (error_log)</span>
          <div className="flex gap-1">
            <button className="p-1 rounded hover:bg-surface-container text-outline"><Icon n="chevron_left" className="text-[20px]" /></button>
            <button className="p-1 rounded hover:bg-surface-container text-primary"><Icon n="chevron_right" className="text-[20px]" /></button>
          </div>
        </div>
      </div>

      <Drawer open={modalOpen} onClose={() => setModalOpen(false)} icon="add_chart" title="Generar Reporte de Liquidación" subtitle="Reportes y Auditoría"
        footer={<><BtnOutline onClick={() => setModalOpen(false)}>Cancelar</BtnOutline><BtnPrimary onClick={generar}><Icon n="download" className="text-[16px]" /> Generar y descargar CSV</BtnPrimary></>}>
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant">Descarga un CSV real con los lotes de liquidación (fecha, mundo, acuerdo, volumen, comisión, neto, estado) filtrados por mundo y rango de fechas. Volumen calculado sobre transacciones reales, no simulado.</p>
          <Field label="Mundo">
            <select className={inputCls} value={reportForm.mundo} onChange={e => setReportForm({ ...reportForm, mundo: e.target.value })}>
              <option value="Todos">Todos los mundos</option>
              {(st.mundos || []).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha inicio"><input className={inputCls} type="date" value={reportForm.desde} onChange={e => setReportForm({ ...reportForm, desde: e.target.value })} /></Field>
            <Field label="Fecha fin"><input className={inputCls} type="date" value={reportForm.hasta} onChange={e => setReportForm({ ...reportForm, hasta: e.target.value })} /></Field>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
