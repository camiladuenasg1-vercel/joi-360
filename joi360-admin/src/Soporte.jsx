import React, { useState } from "react";
import { useStore } from "./hooks";
import { actualizarTicket, crearTicketInterno, enviarTicketAClickUp, MODULE_CATALOG, session } from "./store";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify } from "./ui";
import { fetchWalletIdDeUsuario, procesarDevolucionRemote } from "./supabase.js";

const PRIORIDADES = ["Baja", "Media", "Alta", "Crítica"];
const PRI_COLOR = { Baja: "text-outline", Media: "text-primary", Alta: "text-tertiary", "Crítica": "text-error" };

export function Soporte() {
  const st = useStore();
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroPri, setFiltroPri] = useState("Todas");
  const [open, setOpen] = useState(false);
  const [devolviendo, setDevolviendo] = useState(null); // ticket en flujo de devolución
  const blank = { tipo: "Incidencia", asunto: "", detalle: "", mundoId: "", modulo: "", prioridad: "Media" };
  const [f, setF] = useState(blank);

  const tickets = (st.tickets || []).filter(t =>
    (filtroEstado === "Todos" || t.estado === filtroEstado) &&
    (filtroPri === "Todas" || t.prioridad === filtroPri)
  );

  const abiertos = (st.tickets || []).filter(t => t.estado === "ABIERTO").length;
  const enProgreso = (st.tickets || []).filter(t => t.estado === "EN_PROGRESO").length;
  const DIA_MS = 24 * 60 * 60 * 1000;
  const resueltos24h = (st.tickets || []).filter(t => (t.estado === "ATENDIDO" || t.estado === "RESUELTO") && (Date.now() - (t.createdAt || 0)) < DIA_MS).length;

  // Bug real cerrado 29-jul: no hacía nada (sin onClick). Ahora exporta un
  // CSV real de los tickets visibles con el filtro actual.
  const exportarCsv = () => {
    if (!tickets.length) { notify("No hay tickets para exportar con este filtro.", "error"); return; }
    const header = "id,asunto,origen,usuario,mundo,modulo,prioridad,estado,asignado,fecha\n";
    const filas = tickets.map(t => {
      const mundo = t.mundoId ? (st.mundos || []).find(m => m.id === t.mundoId) : null;
      return [t.id, t.asunto, t.origen || "", t.usuarioId || "", mundo?.nombre || "Global", t.modulo || "", t.prioridad || "", t.estado, t.asignado || "", new Date(t.createdAt).toISOString()]
        .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
    }).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const crear = () => {
    crearTicketInterno({ ...f, prioridad: f.prioridad, estado: "ABIERTO" });
    notify(`Ticket #${f.asunto.slice(0, 30)}… creado y asignado al equipo RedPontis.`);
    setF(blank); setOpen(false);
  };

  const cambiarEstado = (t, estado) => {
    actualizarTicket(t.id, { estado });
    notify(`Ticket actualizado a ${estado}.`, "info");
  };
  const enviarClickup = (t) => {
    enviarTicketAClickUp(t.id);
    notify(`Ticket sincronizado con ClickUp (mock).`, "info");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span className="text-primary">Ecosistema RedPontis</span>
            <span className="text-outline-variant">·</span>
            <span>Operaciones</span>
          </div>
          <h1 className="text-3xl font-bold">Centro de Soporte y Tickets</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">Gestión centralizada de incidentes y solicitudes. Recibe tickets desde los <b>Dashboards de Mundo</b> (sponsors) y tickets internos generados por el equipo. Integración con ClickUp disponible.</p>
        </div>
        <div className="flex gap-3">
          <BtnOutline onClick={exportarCsv}><Icon n="download" className="text-[18px]" /> Exportar CSV</BtnOutline>
          <BtnPrimary onClick={() => setOpen(true)}><Icon n="add" className="text-[18px]" /> Nuevo Ticket</BtnPrimary>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPI label="Tickets abiertos" value={abiertos} icon="warning" tone="error" />
        <KPI label="En progreso" value={enProgreso} icon="sync" tone="secondary" />
        <KPI label="Resueltos (24h)" value={resueltos24h} icon="check_circle" tone="primary" />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-bright/50">
          <h3 className="text-xl font-bold">Registro de Tickets</h3>
          <div className="flex gap-2">
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 text-xs" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="Todos">Todos los estados</option>
              <option value="ABIERTO">Abierto</option>
              <option value="EN_PROGRESO">En progreso</option>
              <option value="ATENDIDO">Atendido</option>
              <option value="RESUELTO">Resuelto</option>
            </select>
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-1.5 text-xs" value={filtroPri} onChange={e => setFiltroPri(e.target.value)}>
              <option value="Todas">Cualquier prioridad</option>
              {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface border-b border-outline-variant font-mono text-[10px] uppercase tracking-wider text-outline">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Origen · Mundo</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Módulo</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Asignado</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {tickets.length === 0 && <tr><td colSpan="9" className="p-10 text-center text-on-surface-variant">Sin tickets para estos filtros.</td></tr>}
              {tickets.map(t => {
                const mundo = t.mundoId ? (st.mundos||[]).find(m => m.id === t.mundoId) : null;
                const mod = t.modulo ? MODULE_CATALOG.find(m => m.id === t.modulo) : null;
                // Devolución/reembolso: dinero real involucrado -- se marca
                // distinto para que no se pierda entre incidencias comunes.
                const esDevolucion = /devoluci|reembolso/i.test(t.tipo || "");
                return (
                  <tr key={t.id} className={`hover:bg-surface-container-low group ${esDevolucion ? "bg-tertiary/5" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface">#{t.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        {esDevolucion && <Icon n="currency_exchange" className="text-tertiary text-[14px]" />}
                        {t.asunto}
                      </p>
                      <p className="text-xs text-on-surface-variant line-clamp-1">{t.detalle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[10px] uppercase">{t.origen === "sponsor" ? "Sponsor" : t.origen === "interno" ? "Interno" : t.origen === "usuario" ? "Usuario" : t.origen === "merchant" ? "Merchant" : "—"}</p>
                      <p className="text-[10px] text-outline">{mundo?.nombre || "Global"}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px]">{t.usuarioId || <span className="text-outline italic">—</span>}</td>
                    <td className="px-4 py-3">
                      {mod ? <span className="inline-flex items-center gap-1 text-xs"><Icon n={mod.icon} className="text-primary text-[14px]" />{mod.name}</span> : <span className="text-outline text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${t.prioridad === "Crítica" ? "bg-error" : t.prioridad === "Alta" ? "bg-tertiary" : t.prioridad === "Media" ? "bg-primary" : "bg-outline"}`}></div>
                        <span className={`font-mono text-[10px] uppercase font-bold ${PRI_COLOR[t.prioridad]}`}>{t.prioridad || "Media"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={t.estado} onChange={e => cambiarEstado(t, e.target.value)} className="bg-transparent border border-outline-variant rounded-full px-2 py-0.5 text-[10px] font-mono uppercase">
                        {["ABIERTO", "EN_PROGRESO", "ATENDIDO", "RESUELTO"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{t.asignado || <i className="text-outline">Sin asignar</i>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {esDevolucion && t.usuarioId && t.estado !== "RESUELTO" && (
                          <button onClick={() => setDevolviendo(t)} title="Procesar devolución (acredita a la wallet)"
                            className="px-2 py-1 rounded border border-tertiary/40 text-tertiary hover:bg-tertiary/10 text-[10px] font-bold flex items-center gap-1">
                            <Icon n="currency_exchange" className="text-[14px]" /> Devolver
                          </button>
                        )}
                        {!t.clickupId && <button onClick={() => enviarClickup(t)} title="Enviar a ClickUp" className="p-1.5 rounded border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary"><Icon n="ios_share" className="text-[16px]" /></button>}
                        {t.clickupId && <span className="px-2 py-0.5 rounded bg-secondary-fixed text-secondary font-mono text-[9px] uppercase">{t.clickupId}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant bg-surface flex justify-between items-center text-sm">
          <span className="font-mono text-[10px] uppercase text-on-surface-variant">{tickets.length} ticket(s) reales (support_tickets) · Integración ClickUp por webhook (mock)</span>
        </div>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} icon="support_agent" title="Nuevo ticket interno" subtitle="Generado por el equipo RedPontis"
        footer={<><BtnOutline onClick={() => setOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!f.asunto} onClick={crear}><Icon n="send" className="text-[16px]" /> Crear ticket</BtnPrimary></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select className={inputCls} value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>
                {["Incidencia", "Operativo", "Bug", "Requerimiento", "Otro"].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Prioridad">
              <select className={inputCls} value={f.prioridad} onChange={e => setF({ ...f, prioridad: e.target.value })}>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Asunto"><input className={inputCls} value={f.asunto} onChange={e => setF({ ...f, asunto: e.target.value })} placeholder="Resumen del incidente" /></Field>
          <Field label="Detalle"><textarea className={`${inputCls} h-24 py-2`} value={f.detalle} onChange={e => setF({ ...f, detalle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mundo (opcional)">
              <select className={inputCls} value={f.mundoId} onChange={e => setF({ ...f, mundoId: e.target.value })}>
                <option value="">Global</option>
                {useStore().mundos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </Field>
            <Field label="Módulo (opcional)">
              <select className={inputCls} value={f.modulo} onChange={e => setF({ ...f, modulo: e.target.value })}>
                <option value="">—</option>
                {MODULE_CATALOG.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Drawer>

      {devolviendo && <DevolucionDrawer ticket={devolviendo} onClose={() => setDevolviendo(null)} />}
    </div>
  );
}

// Reglas de devolución (13-ago): confirmación explícita de Camila -- solo un
// admin RedPontis autenticado puede acreditar una devolución real, re-
// confirmando su contraseña en el momento (step-up), no solo confiando en
// la sesión local ya abierta. Ver procesar_devolucion en add-procesar-devolucion.sql.
function DevolucionDrawer({ ticket, onClose }) {
  const st = useStore();
  const mundo = ticket.mundoId ? (st.mundos || []).find(m => m.id === ticket.mundoId) : null;
  const [monto, setMonto] = useState("");
  const [password, setPassword] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const admin = session();

  const confirmar = async () => {
    const m2 = +monto;
    if (!m2 || m2 <= 0 || !password || !mundo) return;
    setProcesando(true);
    try {
      const walletId = await fetchWalletIdDeUsuario(ticket.usuarioId, mundo.id);
      if (!walletId) {
        setResultado({ ok: false, motivo: "No se encontró la billetera de este usuario en este mundo." });
        return;
      }
      const r = await procesarDevolucionRemote(admin?.email, password, walletId, m2, mundo.id, ticket.id, `Devolución · ${ticket.asunto}`);
      if (!r.ok) {
        const msg = r.motivo === "ADMIN_NO_AUTENTICADO" ? "Contraseña incorrecta." : r.motivo === "SIN_WALLET" ? "No se encontró la billetera." : "No se pudo procesar la devolución.";
        setResultado({ ok: false, motivo: msg });
        return;
      }
      actualizarTicket(ticket.id, { estado: "RESUELTO" });
      setResultado({ ok: true, balance: r.balance });
      notify(`Devolución de S/ ${m2.toFixed(2)} acreditada.`);
    } catch (e) {
      setResultado({ ok: false, motivo: "Error de conexión. Intenta de nuevo." });
    } finally { setProcesando(false); }
  };

  return (
    <Drawer open={true} onClose={onClose} icon="currency_exchange" title="Procesar devolución" subtitle={`${ticket.asunto} · ${ticket.usuarioId}`}
      footer={!resultado?.ok && <><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary disabled={!monto || !password || procesando} onClick={confirmar}>{procesando ? "Procesando…" : "Confirmar devolución"}</BtnPrimary></>}>
      <div className="space-y-5">
        {resultado?.ok ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <Icon n="check_circle" fill className="text-green-600 text-[32px] block mx-auto mb-1" />
            <p className="font-bold text-green-800">Devolución acreditada</p>
            <p className="text-xs text-green-700">Nuevo saldo del usuario: S/ {resultado.balance.toFixed(2)}</p>
            <BtnOutline className="mt-3" onClick={onClose}>Cerrar</BtnOutline>
          </div>
        ) : (
          <>
            <div className="p-3 bg-tertiary/10 border border-tertiary/30 rounded-lg text-[11px] text-on-surface">
              <b>Usuario:</b> {ticket.usuarioId} · <b>Mundo:</b> {mundo?.nombre || "—"}<br/>
              <b>Reclamo:</b> {ticket.detalle}
            </div>
            <Field label="Monto a devolver">
              <input className={`${inputCls} font-mono`} type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Confirma tu contraseña de admin" hint="Requerido para autorizar movimiento de dinero real.">
              <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            {resultado && !resultado.ok && <p className="text-xs text-error">{resultado.motivo}</p>}
          </>
        )}
      </div>
    </Drawer>
  );
}

function KPI({ label, value, icon, tone = "primary", trend }) {
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
        {trend && <span className={`text-[10px] font-mono px-2 py-1 rounded-md ${colors[tone]}`}>{trend}</span>}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1 relative z-10">{label}</p>
      <p className="text-4xl font-black relative z-10">{value}</p>
    </div>
  );
}
