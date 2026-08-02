/**
 * Gobierno — dashboard RedPontis-level (Gantt #101).
 * Antes: 100% decorativo — AUDIT_LOG y PENDING_APPROVALS eran arrays
 * hardcodeados (timestamps tipo "Hoy 11:32" como strings literales, no
 * fechas reales), y los botones Aprobar/Rechazar no tenían onClick. Dejado
 * a propósito así en un bloque anterior de esta misma sesión, justo para
 * no duplicar trabajo con esta tarea.
 * Aprobaciones ahora es real: misma cola/mecanismo que TabAprobacionEventos
 * (MundoDetail.jsx), pero cross-mundo — un organizador B2B publica en
 * cualquier mundo → aparece aquí sin filtrar por world_id.
 * Auditoría: no existe ninguna tabla/infraestructura de audit-log en todo
 * el proyecto (verificado) — construir eso es trabajo de una escala mayor
 * (logging en cada mutación del admin); se deja honestamente marcado como
 * próxima fase, mismo criterio que Usuarios ya usaba.
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Pill, BtnPrimary, BtnOutline, notify, Field, inputCls } from "./ui";
import { useStore } from "./hooks";
import { fetchEventosPendientesGlobal, setEventoEstadoRemote, errorControlado, logErrorControlado, fetchEventosGlobalTodos, fetchTicketsGlobalTodos, fetchSolicitudesComercioGlobal, resolverSolicitudComercio, addMerchantRemote, crearAlertaMundo, fetchEventosResueltosGlobal, fetchSolicitudesComercioResueltasGlobal } from "./supabase";

export function Gobierno() {
  const st = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState("aprobaciones");
  const [pendientes, setPendientes] = useState(null);
  const [solicitudesComercio, setSolicitudesComercio] = useState(null);
  const [eventosResueltos, setEventosResueltos] = useState(null);
  const [comercioResueltos, setComercioResueltos] = useState(null);
  const [busy, setBusy] = useState(null);
  const [reload, setReload] = useState(0);
  const [eventosTodos, setEventosTodos] = useState(null);
  const [ticketsTodos, setTicketsTodos] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos | eventos | comercios
  const [rechazando, setRechazando] = useState(null); // { item, kind: 'evento'|'comercio' }
  const [motivo, setMotivo] = useState("");
  const [viendoMotivo, setViendoMotivo] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetchEventosPendientesGlobal()
      .then(rows => { if (vivo) setPendientes(rows || []); })
      .catch(() => { if (vivo) setPendientes([]); });
    fetchSolicitudesComercioGlobal()
      .then(rows => { if (vivo) setSolicitudesComercio(rows || []); })
      .catch(() => { if (vivo) setSolicitudesComercio([]); });
    fetchEventosResueltosGlobal()
      .then(rows => { if (vivo) setEventosResueltos(rows || []); })
      .catch(() => { if (vivo) setEventosResueltos([]); });
    fetchSolicitudesComercioResueltasGlobal()
      .then(rows => { if (vivo) setComercioResueltos(rows || []); })
      .catch(() => { if (vivo) setComercioResueltos([]); });
    return () => { vivo = false; };
  }, [reload]);

  useEffect(() => {
    let vivo = true;
    fetchEventosGlobalTodos().then(rows => { if (vivo) setEventosTodos(rows || []); }).catch(() => { if (vivo) setEventosTodos([]); });
    fetchTicketsGlobalTodos().then(rows => { if (vivo) setTicketsTodos(rows || []); }).catch(() => { if (vivo) setTicketsTodos([]); });
    return () => { vivo = false; };
  }, []);

  const mundoNombre = worldId => (st.mundos || []).find(m => m.id === worldId)?.nombre || worldId;

  const resolver = async (ev, estado, motivoRechazo = null) => {
    setBusy(ev.id);
    try {
      await setEventoEstadoRemote(ev.id, estado, motivoRechazo);
      if (estado === "RECHAZADO") {
        await crearAlertaMundo(ev.world_id, "aprobacion_rechazada", `Evento rechazado: ${ev.titulo}`,
          `RedPontis rechazó tu evento "${ev.titulo}". Motivo: ${motivoRechazo}`, ev.id);
      }
      notify(estado === "PUBLICADO"
        ? `"${ev.titulo}" aprobado — ya está visible en la superapp de ${mundoNombre(ev.world_id)}.`
        : `"${ev.titulo}" rechazado — se avisó al mundo con el motivo.`, estado === "PUBLICADO" ? "success" : "info");
      setReload(k => k + 1);
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "gobierno-aprobacion-evento", ev.world_id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBusy(null); }
  };

  const resolverComercio = async (sol, estado, motivoRechazo = null) => {
    setBusy(sol.id);
    try {
      if (estado === "APROBADO") {
        await addMerchantRemote(sol.world_id, {
          nombre: sol.nombre, tarifa: sol.tarifa, fijoTx: sol.fijo_tx,
          ruc: sol.ruc, razonSocial: sol.razon_social, direccionFiscal: sol.direccion_fiscal,
          apoderadoNombre: sol.apoderado_nombre, apoderadoDocumento: sol.apoderado_documento, apoderadoCorreo: sol.apoderado_correo,
          contactoNombre: sol.contacto_nombre, contactoDocumento: sol.contacto_documento, contactoCorreo: sol.contacto_correo,
          banco: sol.banco, cuentaBancaria: sol.cuenta_bancaria, cci: sol.cci,
        });
      }
      await resolverSolicitudComercio(sol.id, estado, motivoRechazo);
      if (estado === "RECHAZADO") {
        await crearAlertaMundo(sol.world_id, "aprobacion_rechazada", `Solicitud de comercio rechazada: ${sol.nombre}`,
          `RedPontis rechazó tu solicitud de alta de comercio "${sol.nombre}". Motivo: ${motivoRechazo}`, sol.id);
      }
      notify(estado === "APROBADO"
        ? `"${sol.nombre}" aprobado — ya es un comercio activo en ${mundoNombre(sol.world_id)}.`
        : `"${sol.nombre}" rechazado — se avisó al mundo con el motivo.`, estado === "APROBADO" ? "success" : "info");
      setReload(k => k + 1);
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "gobierno-aprobacion-comercio", sol.world_id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBusy(null); }
  };

  const confirmarRechazo = async () => {
    if (!motivo.trim()) { notify("Escribe el motivo del rechazo — el mundo lo verá como referencia.", "error"); return; }
    const { item, kind } = rechazando;
    setRechazando(null);
    if (kind === "evento") await resolver(item, "RECHAZADO", motivo.trim());
    else await resolverComercio(item, "RECHAZADO", motivo.trim());
    setMotivo("");
  };

  const mundos = st.mundos || [];
  const comercios = st.comercios || [];
  const capacidadesActivas = mundos.reduce((a, m) => a + (m.modulos || []).filter(x => x.enabled).length, 0);
  const totalPendientes = (pendientes?.length || 0) + (solicitudesComercio?.length || 0);
  const pendientesF = filtroTipo === "comercios" ? [] : (pendientes || []);
  const solicitudesF = filtroTipo === "eventos" ? [] : (solicitudesComercio || []);
  const resueltosRechazados = [
    ...(eventosResueltos || []).filter(e => e.estado === "RECHAZADO").map(e => ({ ...e, _kind: "evento", _titulo: e.titulo })),
    ...(comercioResueltos || []).filter(s => s.estado === "RECHAZADO").map(s => ({ ...s, _kind: "comercio", _titulo: s.nombre })),
  ].filter(r => filtroTipo === "todos" || (filtroTipo === "eventos" && r._kind === "evento") || (filtroTipo === "comercios" && r._kind === "comercio"))
   .sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""));
  const resueltosAprobados = [
    ...(eventosResueltos || []).filter(e => e.estado === "PUBLICADO").map(e => ({ ...e, _kind: "evento", _titulo: e.titulo })),
    ...(comercioResueltos || []).filter(s => s.estado === "APROBADO").map(s => ({ ...s, _kind: "comercio", _titulo: s.nombre })),
  ].filter(r => filtroTipo === "todos" || (filtroTipo === "eventos" && r._kind === "evento") || (filtroTipo === "comercios" && r._kind === "comercio"))
   .sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""))
   .slice(0, 10);

  const TABS = [
    { id:"aprobaciones", label:"Aprobaciones", badge: totalPendientes },
    { id:"reportes", label:"Reportes" },
    { id:"auditoria", label:"Auditoría" },
    { id:"usuarios", label:"Usuarios" },
  ];

  return (
    <div>
      {/* Layer context */}
      <div className="mb-6 p-4 bg-surface-container-low border border-outline-variant/60 rounded-xl flex items-start gap-3">
        <Icon n="admin_panel_settings" className="text-primary text-[22px] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm text-on-surface">Capa 1 · Plataforma — Gobierno del ecosistema</p>
          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
            Controla qué pasa en el ecosistema: aprueba eventos B2C, revisa cambios críticos y gestiona accesos administrativos.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-[9px] uppercase text-outline">Roles disponibles en R1</p>
          <p className="text-xs text-on-surface-variant">Fase inicial: un admin global</p>
        </div>
      </div>

      {/* KPIs cross-mundo (datos reales, mismos st.mundos/comercios que reconciliaWorldsLive mantiene sincronizados) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Mundos activos" value={mundos.filter(m => m.estado !== "INACTIVO").length} icon="public" onClick={() => nav("/admin/mundos")} />
        <KPI label="Comercios" value={comercios.length} icon="storefront" />
        <KPI label="Capacidades activas" value={capacidadesActivas} icon="extension" onClick={() => nav("/admin/modulos-mundo")} />
        <KPI label="Pendientes de aprobar" value={pendientes === null || solicitudesComercio === null ? "…" : totalPendientes} icon="approval" tone={totalPendientes ? "tertiary" : "primary"} onClick={() => setTab("aprobaciones")} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${tab===t.id?"bg-surface-container text-on-surface shadow-sm":"text-on-surface-variant hover:bg-surface-container/50"}`}>
            {t.label}
            {t.badge > 0 && <span className="bg-error text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* APROBACIONES — real, cross-mundo (eventos + solicitudes de alta de comercio) */}
      {tab === "aprobaciones" && (
        <div>
          <div className="flex gap-1 mb-5">
            {[["todos", "Todos"], ["eventos", "Eventos"], ["comercios", "Comercios"]].map(([k, l]) => (
              <button key={k} onClick={() => setFiltroTipo(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtroTipo === k ? "bg-primary text-white" : "bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary/40"}`}>
                {l}
              </button>
            ))}
          </div>
          {pendientes === null || solicitudesComercio === null ? (
            <p className="text-on-surface-variant py-8 text-center">Cargando cola…</p>
          ) : pendientesF.length === 0 && solicitudesF.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-ok/20 mx-auto mb-3 flex items-center justify-center">
                <Icon n="check_circle" className="text-ok text-[28px]" />
              </div>
              <p className="font-semibold text-on-surface">Todo al día</p>
              <p className="text-sm text-on-surface-variant mt-1">Sin aprobaciones pendientes en ningún mundo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudesF.map(s => (
                <div key={s.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-outline-variant/60 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center flex-shrink-0">
                      <Icon n="add_business" className="text-secondary text-[20px]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] uppercase text-outline">Alta de Comercio</span>
                        <span className="font-mono text-[9px] text-outline">·</span>
                        <span className="font-mono text-[9px] uppercase text-outline">{mundoNombre(s.world_id)}</span>
                      </div>
                      <p className="font-semibold text-on-surface">{s.nombre}</p>
                      <p className="text-xs text-on-surface-variant">
                        {s.razon_social} · RUC {s.ruc} · Contacto: {s.contacto_nombre || "—"} ({s.contacto_correo || "—"})
                      </p>
                    </div>
                    <Pill color="bg-amber-100 text-amber-700">Pendiente</Pill>
                  </div>
                  <div className="px-5 py-3 bg-surface-container-low flex items-center justify-between">
                    <p className="text-xs text-on-surface-variant">Revisa los datos legales antes de habilitar el comercio en {mundoNombre(s.world_id)}.</p>
                    <div className="flex gap-2">
                      <BtnOutline className="!py-1.5 !px-3 text-xs text-error border-error/30 hover:bg-error/5" disabled={busy === s.id} onClick={() => setRechazando({ item: s, kind: "comercio" })}>
                        Rechazar
                      </BtnOutline>
                      <BtnPrimary className="!py-1.5 !px-3 text-xs !bg-ok" disabled={busy === s.id} onClick={() => resolverComercio(s, "APROBADO")}>
                        <Icon n="check" className="text-[14px]" /> {busy === s.id ? "Habilitando…" : "Aprobar y habilitar"}
                      </BtnPrimary>
                    </div>
                  </div>
                </div>
              ))}
              {pendientesF.map(p => (
                <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-outline-variant/60 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Icon n="confirmation_number" className="text-amber-600 text-[20px]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] uppercase text-outline">{p.modo === "b2b" ? "Evento B2B" : p.modo === "embebido" ? "Evento embebido" : "Evento B2C"}</span>
                        <span className="font-mono text-[9px] text-outline">·</span>
                        <span className="font-mono text-[9px] uppercase text-outline">{mundoNombre(p.world_id)}</span>
                      </div>
                      <p className="font-semibold text-on-surface">{p.titulo}</p>
                      <p className="text-xs text-on-surface-variant">
                        {p.fecha} {p.hora ? `· ${p.hora}` : ""} · {p.lugar || "sin lugar"} · Organiza: {p.organizador || "—"}
                      </p>
                    </div>
                    <Pill color="bg-amber-100 text-amber-700">Pendiente</Pill>
                  </div>
                  <div className="px-5 py-3 bg-surface-container-low flex items-center justify-between">
                    <p className="text-xs text-on-surface-variant">Revisa los detalles antes de publicar en el app y el landing.</p>
                    <div className="flex gap-2">
                      <BtnOutline className="!py-1.5 !px-3 text-xs text-error border-error/30 hover:bg-error/5" disabled={busy === p.id} onClick={() => setRechazando({ item: p, kind: "evento" })}>
                        Rechazar
                      </BtnOutline>
                      <BtnPrimary className="!py-1.5 !px-3 text-xs !bg-ok" disabled={busy === p.id} onClick={() => resolver(p, "PUBLICADO")}>
                        <Icon n="check" className="text-[14px]" /> {busy === p.id ? "Publicando…" : "Aprobar y publicar"}
                      </BtnPrimary>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant/60">
            <p className="text-xs text-on-surface-variant flex items-center gap-2">
              <Icon n="info" className="text-[14px] text-outline" />
              Las aprobaciones llegan aquí cuando un organizador B2B, un mundo con Embebido activo, o un usuario B2C crea un evento con la opción <b>"Requiere aprobación RedPontis"</b> activa, o cuando un Mundo envía una <b>Solicitud de Alta de Comercio</b> — de cualquier mundo del ecosistema. El Mundo no puede habilitar comercios de forma autónoma.
            </p>
          </div>

          {/* Resueltos recientes — historial con motivo de rechazo visible por ícono de ojo */}
          <h3 className="font-semibold text-sm mt-8 mb-3">Resueltos recientes</h3>
          {eventosResueltos === null || comercioResueltos === null ? (
            <p className="text-on-surface-variant text-sm py-4">Cargando historial…</p>
          ) : resueltosRechazados.length === 0 && resueltosAprobados.length === 0 ? (
            <p className="text-on-surface-variant text-sm py-4">Sin resoluciones todavía.</p>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              {[...resueltosRechazados, ...resueltosAprobados].slice(0, 15).map(r => (
                <div key={`${r._kind}-${r.id}`} className="px-5 py-3 flex items-center justify-between border-b border-outline-variant/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon n={r._kind === "evento" ? "confirmation_number" : "add_business"} className="text-outline text-[16px]" />
                    <div>
                      <p className="text-sm font-medium">{r._titulo}</p>
                      <p className="font-mono text-[10px] text-outline">{mundoNombre(r.world_id)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill color={r.estado === "RECHAZADO" ? "bg-error-container text-error" : "bg-ok"}>{r.estado}</Pill>
                    {r.estado === "RECHAZADO" && (
                      <button onClick={() => setViendoMotivo(r)} title="Ver motivo de rechazo" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary">
                        <Icon n="visibility" className="text-[16px]" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: motivo de rechazo (obligatorio) — se usa como referencia y se envía como alerta real al mundo */}
      {rechazando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setRechazando(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><Icon n="cancel" className="text-error text-[20px]" /> Motivo del rechazo</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Se guarda como referencia y se envía como alerta real a <b>{mundoNombre(rechazando.item.world_id)}</b>.
            </p>
            <Field label="Motivo">
              <textarea className={`${inputCls} !h-24 resize-none`} value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Ej. Falta RUC vigente / El evento no cumple con las políticas del mundo…" autoFocus />
            </Field>
            <div className="flex gap-3 mt-5">
              <BtnOutline className="flex-1" onClick={() => { setRechazando(null); setMotivo(""); }}>Cancelar</BtnOutline>
              <BtnPrimary className="flex-1 !bg-error" disabled={!motivo.trim()} onClick={confirmarRechazo}>
                <Icon n="close" className="text-[16px]" /> Confirmar rechazo
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* Popup: ver motivo de rechazo ya registrado */}
      {viendoMotivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setViendoMotivo(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><Icon n="visibility" className="text-[20px]" /> Motivo del rechazo</h3>
            <p className="text-xs text-on-surface-variant uppercase font-mono mb-3">{viendoMotivo._titulo} · {mundoNombre(viendoMotivo.world_id)}</p>
            <p className="text-sm bg-surface-container-low rounded-lg p-3">{viendoMotivo.motivo_rechazo || "Sin motivo registrado."}</p>
            <BtnOutline className="w-full mt-5" onClick={() => setViendoMotivo(null)}>Cerrar</BtnOutline>
          </div>
        </div>
      )}

      {/* REPORTES — RedPontis cross-mundo: eventos, entradas, recaudación (Gantt #81).
          "Consumos" (venta de productos de comercio DENTRO de un evento) queda
          fuera de este reporte a propósito: transactions no guarda event_id,
          así que hoy no hay forma de atribuir una venta de comercio a un evento
          específico — gap real, documentado abajo en vez de simulado. */}
      {tab === "reportes" && (
        <ReportesEventosRP mundos={mundos} eventos={eventosTodos} tickets={ticketsTodos} mundoNombre={mundoNombre} />
      )}

      {/* AUDITORÍA — no existe infraestructura de audit-log en el proyecto todavía
          (verificado: ninguna tabla ni hook de logging en las mutaciones del admin).
          Construirlo es trabajo de otra escala (logging en cada mutación); se deja
          honesto en vez de simular con datos fijos, mismo criterio que Usuarios. */}
      {tab === "auditoria" && (
        <div className="p-4 border border-dashed border-outline-variant rounded-xl text-center py-16">
          <Icon n="history" className="text-outline text-[32px] mb-2" />
          <p className="text-sm font-medium text-on-surface-variant">Log de auditoría disponible en una próxima fase</p>
          <p className="text-xs text-outline mt-1 max-w-md mx-auto">
            Registrar cada cambio crítico (config, acuerdos, actores) requiere instrumentar las mutaciones del admin con
            un log dedicado — no existe todavía. El Monitoreo de Errores (Operación) sí registra en vivo las ocurrencias
            reales del catálogo de errores controlados.
          </p>
          <BtnOutline className="mt-4 !py-1.5 !px-3 text-xs" onClick={() => nav("/admin/monitoreo")}>
            <Icon n="troubleshoot" className="text-[14px]"/> Ver Monitoreo de Errores
          </BtnOutline>
        </div>
      )}

      {/* USUARIOS */}
      {tab === "usuarios" && (
        <div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">Administradores de plataforma</p>
                <p className="text-xs text-on-surface-variant">Acceso total al panel central JOI 360</p>
              </div>
              <BtnPrimary className="!py-1.5 !px-3 text-xs opacity-50 cursor-not-allowed" disabled>
                <Icon n="add" className="text-[14px]" /> Invitar
              </BtnPrimary>
            </div>
            {(st.users || [{email:"admin@redpontis.com", name:"Admin RedPontis"}]).map((u, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(u.name||u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name || "—"}</p>
                  <p className="text-xs text-on-surface-variant">{u.email}</p>
                </div>
                <Pill color="bg-primary-fixed text-primary">Platform Admin</Pill>
              </div>
            ))}
          </div>
          <div className="p-4 border border-dashed border-outline-variant rounded-xl text-center">
            <Icon n="group_add" className="text-outline text-[28px] mb-2" />
            <p className="text-sm font-medium text-on-surface-variant">Multi-usuario disponible en R1</p>
            <p className="text-xs text-outline mt-0.5">En la siguiente fase podrás invitar admins de comunidad, merchants y organizadores con acceso limitado.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const ESTADO_LABEL = {
  BORRADOR: "Borrador", PENDIENTE_APROBACION: "Pendiente", PUBLICADO: "Publicado",
  FINALIZADO: "Finalizado", RECHAZADO: "Rechazado",
};

function ReportesEventosRP({ mundos, eventos, tickets, mundoNombre }) {
  if (eventos === null || tickets === null) return <p className="text-on-surface-variant py-8 text-center">Cargando reportes…</p>;

  const porEstado = {};
  for (const e of eventos) porEstado[e.estado] = (porEstado[e.estado] || 0) + 1;

  const checkins = tickets.filter(t => t.checkin_at).length;
  const recaudacionTotal = tickets.reduce((a, t) => a + (+t.precio || 0), 0);

  const porMundo = {};
  for (const t of tickets) {
    porMundo[t.world_id] = porMundo[t.world_id] || { entradas: 0, recaudacion: 0, checkins: 0 };
    porMundo[t.world_id].entradas += 1;
    porMundo[t.world_id].recaudacion += +t.precio || 0;
    if (t.checkin_at) porMundo[t.world_id].checkins += 1;
  }
  const filas = Object.entries(porMundo).sort((a, b) => b[1].recaudacion - a[1].recaudacion).map(([worldId, v]) => {
    const m = mundos.find(x => x.id === worldId);
    const comisionPct = +m?.eventosConfig?.comisionEntrada || 0;
    return { worldId, ...v, comisionRP: v.recaudacion * (comisionPct / 100), comisionPct };
  });
  const comisionRPTotal = filas.reduce((a, f) => a + f.comisionRP, 0);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Eventos totales" value={eventos.length} icon="confirmation_number" />
        <KPI label="Entradas vendidas" value={tickets.length} icon="local_activity" />
        <KPI label="Recaudación total" value={`S/ ${recaudacionTotal.toFixed(2)}`} icon="payments" />
        <KPI label="Comisión RedPontis" value={`S/ ${comisionRPTotal.toFixed(2)}`} icon="account_balance" />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
        <h4 className="font-semibold text-sm mb-3">Eventos por estado</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(porEstado).map(([estado, n]) => (
            <span key={estado} className="font-mono text-[10px] uppercase px-2.5 py-1 rounded-full bg-surface-container-low border border-outline-variant text-on-surface-variant">
              {ESTADO_LABEL[estado] || estado}: <b className="text-on-surface">{n}</b>
            </span>
          ))}
          {eventos.length === 0 && <p className="text-xs text-on-surface-variant">Sin eventos creados aún en el ecosistema.</p>}
        </div>
        <p className="text-xs text-on-surface-variant mt-3">
          Asistencia real (check-in): <b className="text-on-surface">{checkins}</b> de {tickets.length} entradas
          {tickets.length > 0 && ` (${Math.round(checkins / tickets.length * 100)}%)`}.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low">
          <h4 className="font-semibold text-sm">Recaudación por mundo</h4>
        </div>
        {filas.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-6 text-center">Sin entradas vendidas aún.</p>
        ) : filas.map(f => (
          <div key={f.worldId} className="px-5 py-3 flex items-center justify-between border-b border-outline-variant/40 last:border-0">
            <div>
              <p className="text-sm font-medium">{mundoNombre(f.worldId)}</p>
              <p className="text-xs text-on-surface-variant">{f.entradas} entradas · {f.checkins} check-in · comisión {f.comisionPct}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">S/ {f.recaudacion.toFixed(2)}</p>
              <p className="text-xs text-on-surface-variant">RP: S/ {f.comisionRP.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/60">
        <p className="text-xs text-on-surface-variant flex items-start gap-2">
          <Icon n="info" className="text-[14px] text-outline mt-0.5 flex-shrink-0" />
          <span><b>Consumos dentro de eventos</b> (venta de productos de comercio en el stand de un evento) no está en este
          reporte: la tabla de transacciones no guarda a qué evento pertenece cada venta, así que hoy no hay forma real de
          atribuirla — gap de modelo de datos, no simulado con cifras falsas.</span>
        </p>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, tone = "primary", onClick }) {
  const colors = {
    primary: "bg-primary-container/30 text-primary",
    tertiary: "bg-tertiary-fixed text-tertiary",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm relative overflow-hidden group ${onClick ? "hover:border-primary/40 transition-colors" : ""}`}>
      <div className={`w-9 h-9 rounded-lg ${colors[tone]} flex items-center justify-center mb-3`}>
        <Icon n={icon} className="text-[18px]" />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-on-surface-variant mb-0.5">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </Tag>
  );
}
