import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "./hooks";
import { update, uid, moduleCat, MODULE_CATALOG, DEPENDENCY_MAP, MODULOS_PROXIMAMENTE, CANALES_EMISION, CANALES_ADQUIRENCIA, PSP_PROVIDERS, promoVigente, generarPassword, ejecutarEntrega, listSponsorOptions, crearAnunciante, HARDWARE_CATALOG, hardwareModelById, listPosStock, asignarPos, liberarPos, rubrosDeVertical, rubroNombre, getFlagDev, DEV_STATUS_META, getFlagUx, modosDeMundo, liquidacionConfigDe } from "./store";
import { Icon, Pill, TierTag, Toggle, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify } from "./ui";
import { EntregaMerchantDrawer } from "./EntregaMerchant";
import { deleteWorldRemote, addMerchantRemote, reconciliarComerciosMundo, crearOrganizadorRemote, fetchOrganizadoresRemote, desactivarOrganizadorRemote, errorControlado, logErrorControlado, fetchPosDevicesDeMundo, fetchVolumenPorComercioMundo, fetchPromocionesMundo, crearPromocionRemote, actualizarPromocionRemote, actualizarEstadoMerchantRemote, eliminarMerchantRemote, verificarBloqueosEliminacionMerchant, verificarBloqueosEliminacionMundo, uploadArchivo, actualizarLogoMundoRemote, fetchPlanesSuscripcion, crearPlanSuscripcion, actualizarPlanSuscripcion, eliminarPlanSuscripcion } from "./supabase.js";
import { MODOS_EVENTO } from "./OrganizadorFront.jsx";

// Cola de aprobación de eventos: movida a /admin/gobierno (30-jul). Ahora es
// cross-mundo y también cubre solicitudes de alta de comercio, con filtros,
// motivo de rechazo y alerta real al mundo — ver Gobierno.jsx.

export function MundoDetail() {
  const { id } = useParams();
  const st = useStore();
  const nav = useNavigate();
  const m = (st.mundos||[]).find(x => x.id === id);
  const [tab, setTab] = useState("resumen");
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  React.useEffect(() => {
    if (!m) return;
    // Reconciliación: comercios creados/renombrados directo en Supabase (otra
    // sesión/otro panel) no viven en el store local — sin esto sus paneles
    // (Cobrar, Mi catálogo) no serían alcanzables desde este admin.
    reconciliarComerciosMundo(id, st.comercios).then(nuevos => {
      if (nuevos.length) update(s => { s.comercios = [...(s.comercios || []), ...nuevos]; });
    }).catch(() => {});
  }, [id]);

  if (!m) return <p className="text-on-surface-variant">Mundo no encontrado.</p>;

  const comercios = (st.comercios||[]).filter(c => c.mundoId === id);
  const eventosOn = (m.modulos||[]).some(x => x.id === "eventos" && x.enabled) || m.type === "eventos_rp" || m.type === "eventos";
  const ws = worldStatus(m, comercios);
  const readyForDelivery = ws.k === "LISTO" || ws.k === "ENTREGADO";
  const tabs = [
    { k: "resumen",   label: "Resumen",            icon: "dashboard" },
    { k: "perfil",    label: "Perfil",              icon: "photo_camera" },
    { k: "modulos",   label: "Capacidades",         icon: "extension" },
    { k: "comercios", label: "Actores",             icon: "groups" },
    { k: "acuerdo",   label: "Acuerdo Comercial",  icon: "handshake" },
    ...(eventosOn ? [
      { k: "eventos", label: "Motor de Eventos", icon: "settings" },
    ] : []),
    ...((m.type === "promos" || m.type === "promos_rp") ? [{ k: "promos", label: "Promociones", icon: "campaign" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-3">
        <Link to="/admin/mundos" className="hover:text-primary flex items-center gap-1"><Icon n="arrow_back" className="text-[14px]" /> Mundos</Link>
        <span>/</span><span className="text-primary">{m.codigo}</span>
      </div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {m.logoUrl ? (
              <img src={m.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: m.color }}>
                <Icon n={m.type === "eventos" ? "confirmation_number" : m.type === "promos" ? "campaign" : "public"} className="text-[22px]" />
              </span>
            )}
            {m.nombre}
          </h1>
          <p className="text-on-surface-variant mt-1">{m.vertical} · {m.entidadLegal} · RUC {m.ruc} · {m.moneda}</p>
        </div>
        <div className="flex items-center gap-3">
          <Pill color={m.estado === "ACTIVO" ? "bg-ok" : "bg-outline"}>{m.estado}</Pill>
          <Pill color={ws.color}>{ws.label}</Pill>
          {m.entrega?.entregado
            ? <Pill color="bg-secondary-container">ENTREGADO</Pill>
            : !m.redpontis && <Pill color="bg-tertiary">PENDIENTE</Pill>}
          {(m.modulos||[]).find(x => x.id === "eventos" && x.enabled) &&
           modosDeMundo(m).includes("b2b") && (
            <BtnOutline onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/organizador/${m.id}`, "_blank")}>
              <Icon n="business_center" className="text-[16px]" /> Dashboard B2B Organizador
            </BtnOutline>
          )}
          <ContratoControl m={m} />
          <BtnOutline onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/mundo/${m.id}`, "_blank")}>
            <Icon n="open_in_new" className="text-[16px]" /> Vista previa Dashboard
          </BtnOutline>
          <BtnPrimary onClick={() => setEntregaOpen(true)} disabled={!readyForDelivery && !m.entrega?.entregado}
            title={!readyForDelivery && !m.entrega?.entregado ? "Carga al menos 1 comercio y configura los módulos core para poder entregar" : ""}>
            <Icon n={m.entrega?.entregado ? "key" : "local_shipping"} className="text-[16px]" /> {m.entrega?.entregado ? "Credenciales entregadas" : "Entregar Dashboard"}
          </BtnPrimary>
          {!m.fixed && (
            <button onClick={() => setDeleteOpen(true)} className="p-2.5 rounded-lg border border-error/40 text-error hover:bg-error-container/20 transition-colors" title="Eliminar mundo">
              <Icon n="delete" className="text-[18px]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-8 border-b border-outline-variant">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${tab === t.k ? "text-primary border-primary font-semibold" : "text-on-surface-variant border-transparent hover:text-primary"}`}>
            <Icon n={t.icon} className="text-[18px]" />{t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && <TabResumen m={m} comercios={comercios} st={st} goto={setTab} />}
      {tab === "perfil" && <PerfilMundoPanel m={m} />}
      {tab === "modulos" && <TabModulos m={m} />}
      {tab === "comercios" && <TabComercios m={m} comercios={comercios} st={st} />}
      {tab === "acuerdo" && <TabAcuerdo m={m} />}
      {tab === "eventos" && <TabEventos m={m} st={st} goto={setTab} />}
      {tab === "promos" && <TabPromos m={m} st={st} />}
      <EntregaDrawer m={m} open={entregaOpen} onClose={() => setEntregaOpen(false)} />
      <DeleteMundoDialog m={m} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

/* ── OperadorMundoCard — clave del POS para "Soy Mundo" (Task #128). Un
   operador de mundo (portero, punto de entrega de banditas, mesa de
   ayuda) no representa a ningún comercio — por eso necesita su propia
   clave, separada de la de cada comercio, para entrar al POS/T6 y ver
   Vincular Pulsera / Validar Acceso / Validar Entrada / Consultar. ── */
function OperadorMundoCard({ m }) {
  const [pin, setPin] = useState(m.posPin || "");
  const [ver, setVer] = useState(false);
  const dirty = pin !== (m.posPin || "");

  const guardar = () => {
    update(s => {
      const mu = (s.mundos||[]).find(x => x.id === m.id);
      if (mu) mu.posPin = pin.trim() || null;
    });
    notify(pin.trim() ? "Clave de operador del mundo guardada." : "Clave de operador del mundo eliminada.");
  };
  const generar = () => {
    const nueva = String(Math.floor(1000 + Math.random() * 9000));
    setPin(nueva);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[220px]">
        <p className="text-xs font-bold text-on-surface mb-1 flex items-center gap-1.5">
          <Icon n="badge" className="text-[16px] text-secondary"/> Clave de operador del Mundo (POS)
        </p>
        <p className="text-[11px] text-on-surface-variant">
          Código: <b className="font-mono">{m.codigo}</b> · para entrar al POS eligiendo "Soy Mundo" — vincular pulseras, validar accesos/entradas y consultar, sin cobrar saldo.
        </p>
      </div>
      <div className="flex items-center gap-1">
        <input className={`${inputCls} w-32 font-mono`} type={ver ? "text" : "password"} value={pin}
          onChange={e => setPin(e.target.value)} placeholder="Sin clave"/>
        <button type="button" onClick={() => setVer(v => !v)} className="p-2.5 text-on-surface-variant hover:text-primary" title={ver ? "Ocultar" : "Ver"}>
          <Icon n={ver ? "visibility_off" : "visibility"} className="text-[18px]"/>
        </button>
      </div>
      <BtnOutline onClick={generar}><Icon n="casino" className="text-[16px]"/> Generar</BtnOutline>
      <BtnPrimary onClick={guardar} disabled={!dirty}><Icon n="save" className="text-[16px]"/> Guardar</BtnPrimary>
      <a href={`${window.location.origin}${window.location.pathname}#/operador-mundo/${m.id}`} target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary text-sm font-medium transition-colors">
        <Icon n="open_in_new" className="text-[16px]"/> Abrir POS del Mundo
      </a>
    </div>
  );
}

/* ── ContratoControl — el contrato PDF subido manualmente es la fuente de
   verdad cuando existe; el ContratoView autogenerado (a partir de acuerdo +
   módulos) queda como borrador de referencia, no como el contrato real. ── */
function ContratoControl({ m }) {
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { notify("El contrato debe ser un archivo PDF.", "error"); return; }
    setSubiendo(true);
    try {
      const path = `contratos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      update(s => {
        const mu = (s.mundos||[]).find(x => x.id === m.id);
        if (mu) { mu.contratoUrl = url; mu.contratoNombre = file.name; mu.docContrato = true; }
      });
      notify("Contrato PDF actualizado.");
    } catch (e) {
      notify("No se pudo subir el contrato: " + e.message, "error");
    } finally {
      setSubiendo(false);
    }
  };

  if (m.contratoUrl) {
    return (
      <div className="flex items-center gap-1">
        <BtnOutline onClick={() => window.open(m.contratoUrl, "_blank")} title={m.contratoNombre || ""}>
          <Icon n="task" className="text-[16px] text-ok" /> Ver contrato
        </BtnOutline>
        <label className="p-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer" title="Reemplazar contrato">
          <Icon n={subiendo ? "hourglass_empty" : "upload_file"} className="text-[18px]" />
          <input type="file" accept="application/pdf" className="hidden" disabled={subiendo} onChange={e => subir(e.target.files?.[0])} />
        </label>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <label className="cursor-pointer">
        <span className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${subiendo ? "opacity-60 border-outline-variant text-on-surface-variant" : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"}`}>
          <Icon n="upload_file" className="text-[16px]" /> {subiendo ? "Subiendo…" : "Adjuntar contrato"}
        </span>
        <input type="file" accept="application/pdf" className="hidden" disabled={subiendo} onChange={e => subir(e.target.files?.[0])} />
      </label>
      <BtnOutline onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/contrato/${m.id}`, "_blank")} title="Borrador generado automáticamente a partir del acuerdo — no es el contrato firmado">
        <Icon n="description" className="text-[16px]" /> Ver borrador
      </BtnOutline>
    </div>
  );
}

function DeleteMundoDialog({ m, open, onClose }) {
  const nav = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const correrChequeo = () => {
    setChecking(true); setErr(null);
    verificarBloqueosEliminacionMundo(m.id).then(setCheck).catch(e => setErr(e.message)).finally(() => setChecking(false));
  };
  // Eliminar un mundo antes NO verificaba nada — a diferencia de eliminar un
  // comercio, que sí chequea BNPL/ventas/reservas/hardware. Un mundo contiene
  // N comercios y, sobre todo, dinero real en wallets.balance de titulares y
  // dependientes: un DELETE sobre worlds no mueve ese saldo a ningún lado.
  React.useEffect(() => { if (open) { setConfirm(""); correrChequeo(); } }, [open]);

  if (!open) return null;
  const puedeEliminar = check && !check.bloqueaDuro;

  const del = async () => {
    setBusy(true);
    try {
      await deleteWorldRemote(m.id); // el sync no borra — eliminación remota explícita
      update(s => { s.mundos = s.mundos.filter(x => x.id !== m.id); });
      notify(`Mundo "${m.nombre}" eliminado del ecosistema.`, "info");
      nav("/admin/mundos");
    } catch (e) { notify(`No se pudo eliminar: ${e.message}`, "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-error-container flex items-center justify-center"><Icon n="delete_forever" className="text-error text-[24px]" /></div>
          <div>
            <h3 className="font-semibold">Eliminar mundo</h3>
            <p className="font-mono text-[10px] uppercase text-on-surface-variant">{m.nombre} · {m.codigo}</p>
          </div>
        </div>
        <div className="bg-error-container/30 border border-error/30 rounded-lg p-3 mb-4 text-sm text-error">
          ⚠ Esta acción es <b>irreversible</b>. Se eliminarán todos los módulos, comercios y configuraciones asociadas al mundo <b>{m.nombre}</b>.
        </div>

        <p className="font-semibold text-sm mb-2">Verificar pendientes antes de eliminar</p>
        {checking ? (
          <p className="text-xs text-on-surface-variant mb-4">Verificando…</p>
        ) : err ? (
          <p className="text-xs text-error mb-4">{err}</p>
        ) : check ? (
          <div className="space-y-1.5 mb-4">
            <ChequeoRow ok={check.saldoTotalWallets === 0}
              label={`Saldo real en billeteras de usuarios: ${m.moneda} ${check.saldoTotalWallets.toFixed(2)} (${check.walletsConSaldo} billetera(s) con saldo)`} />
            <ChequeoRow ok={check.bnplActivos === 0} label={`Financiamientos BNPL activos: ${check.bnplActivos}`} />
            <ChequeoRow ok={check.liquidacionesPendientes.count === 0}
              label={`Liquidaciones pendientes o retenidas: ${check.liquidacionesPendientes.count} (${m.moneda} ${check.liquidacionesPendientes.monto.toFixed(2)})`} />
            <ChequeoRow ok={check.reservasFuturas.count === 0}
              label={`Reservas de Menú confirmadas a futuro: ${check.reservasFuturas.count}`} />
            <ChequeoRow ok={check.ticketsEmitidos === 0} label={`Entradas de evento emitidas: ${check.ticketsEmitidos}`} />
            <ChequeoRow ok warn={check.hardwareAsignado > 0}
              label={`Equipos POS asignados: ${check.hardwareAsignado}${check.hardwareAsignado ? " (no bloquea la eliminación)" : ""}`} />
            <button onClick={correrChequeo} className="text-[10px] text-primary font-semibold">↻ Volver a verificar</button>
          </div>
        ) : null}

        {!puedeEliminar && check && (
          <p className="text-xs text-on-surface-variant italic mb-3">Resuelve los pendientes de arriba antes de poder eliminar este mundo.</p>
        )}
        {puedeEliminar && (
          <p className="text-sm text-on-surface-variant mb-3">Para confirmar, escribe el nombre del mundo: <b>{m.nombre}</b></p>
        )}
        {puedeEliminar && (
          <input className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm mb-4 focus:ring-2 focus:ring-error/20 focus:border-error outline-none" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={m.nombre} />
        )}
        <div className="flex gap-3 justify-end">
          <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          {puedeEliminar && (
            <button disabled={confirm !== m.nombre || busy} onClick={del} className="px-4 py-2 rounded-lg bg-error text-white text-sm font-medium disabled:opacity-40 hover:bg-error/90 transition-colors">
              {busy ? "Eliminando…" : "Sí, eliminar mundo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Entrega del Dashboard de Mundo ---------------- */
function EntregaDrawer({ m, open, onClose }) {
  const entregado = m.entrega?.entregado;
  const [cred, setCred] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [emailEntrega, setEmailEntrega] = useState("");

  React.useEffect(() => {
    if (open) {
      setConfirm(false);
      setEmailEntrega(m.contactoCorreo || m.contactoEmail || "");
      setCred(m.entrega?.credenciales || {
        usuario: `${(m.contactoNombre||"sponsor").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12)}@${(m.codigo || m.id).toLowerCase().replace(/[^a-z0-9]/g, "")}.joi360.pe`,
        password: generarPassword(),
      });
    }
  }, [open]);

  if (!cred) return null;
  const url = `${window.location.origin}${window.location.pathname}#/mundo/${m.id}`;

  const mensajeEntrega = `Hola,

Tu Dashboard del Mundo JOI 360 — ${m.nombre} ya está disponible.

Accede con las siguientes credenciales:

🔗 URL del dashboard: ${url}
👤 Usuario: ${cred.usuario}
🔑 Contraseña: ${cred.password}

Desde tu panel podrás:
• Ver KPIs del mundo en tiempo real (wallets, transacciones, comercios)
• Gestionar comercios, visibilidad y publicidad del mundo
• Ver y responder solicitudes de soporte
• Revisar reportes y actividad del ecosistema

Si tienes dudas, contacta al equipo RedPontis.

Saludos,
Equipo RedPontis · JOI 360`;

  const copiarMensaje = () => {
    navigator.clipboard?.writeText(mensajeEntrega);
    notify("Mensaje de entrega copiado. Pégalo en el correo o WhatsApp al sponsor.", "info");
  };

  const entregar = () => {
    ejecutarEntrega(m.id, { ...cred, emailEntrega });
    notify(`Dashboard del mundo "${m.nombre}" entregado.${emailEntrega ? ` Copia el mensaje para enviarlo a ${emailEntrega}.` : ""}`);
    onClose();
  };

  const copiar = (txt, label) => {
    navigator.clipboard?.writeText(txt);
    notify(`${label} copiado al portapapeles.`, "info");
  };

  return (
    <Drawer open={open} onClose={onClose} icon="local_shipping"
      title={entregado ? "Credenciales del Sponsor" : "Entrega del Dashboard de Mundo"}
      subtitle={`${m.nombre} · ${m.codigo}`}
      footer={entregado
        ? <div className="flex gap-2 w-full">
            <BtnOutline onClick={copiarMensaje} className="flex-1"><Icon n="content_copy" className="text-[16px]" /> Copiar mensaje de entrega</BtnOutline>
            <BtnPrimary onClick={onClose}>Cerrar</BtnPrimary>
          </div>
        : <><BtnOutline onClick={onClose}>Cancelar</BtnOutline>
           <BtnPrimary disabled={!confirm} onClick={entregar}><Icon n="rocket_launch" className="text-[16px]" /> Ejecutar entrega</BtnPrimary></>}>
      <div className="space-y-6">

        {/* Banner */}
        <div className={`border rounded-lg p-4 flex gap-3 ${entregado ? "bg-secondary-fixed border-secondary/30" : "bg-surface-container-low border-primary/20"}`}>
          <Icon n={entregado ? "verified" : "info"} className={`text-[20px] ${entregado ? "text-secondary" : "text-primary"}`} />
          <p className="text-xs text-on-surface-variant">
            {entregado
              ? <>Panel entregado el <b>{new Date(m.entrega.fechaEntrega).toLocaleDateString("es-PE")}</b>. El sponsor accede con las credenciales de abajo. Usa "Copiar mensaje" para reenviar por email o WhatsApp.</>
              : <>Al ejecutar la entrega, el dashboard quedará <b>protegido con login del sponsor</b>. Verá los módulos habilitados, comercios cargados, KPIs en tiempo real y soporte. Todo lo configurado por RedPontis cae en cascada a su panel.</>}
          </p>
        </div>

        {/* Datos del mundo */}
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
          <p className="font-mono text-[10px] uppercase text-outline mb-3">Datos del mundo y entidad</p>
          <div className="space-y-1.5 text-sm">
            {[
              ["Mundo", m.nombre],
              ["Vertical", m.vertical],
              ["Entidad legal", m.entidadLegal],
              m.ruc && ["RUC", m.ruc],
              (m.apoderadoNombre || m.representanteLegal) && ["Apoderado", m.apoderadoNombre || m.representanteLegal],
              m.contactoNombre && ["Contacto", `${m.contactoNombre}${m.contactoCorreo ? ` · ${m.contactoCorreo}` : ""}`],
              ["Acuerdo", `${m.acuerdo?.tipo}${m.acuerdo?.revShare ? ` · ${m.acuerdo.revShare}%` : ""}${m.acuerdo?.fijoMensual ? ` + S/ ${m.acuerdo.fijoMensual}/mes` : ""}`],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-on-surface-variant flex-shrink-0">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email de entrega */}
        <section>
          <h4 className="font-semibold text-sm mb-3 pb-2 border-b border-outline-variant/50 flex items-center gap-2">
            <Icon n="email" className="text-primary text-[18px]" /> Email para la entrega de credenciales
          </h4>
          <Field label="Email del representante del sponsor" hint="Copia el mensaje de entrega abajo para enviarlo por email o WhatsApp.">
            <div className="flex gap-2">
              <input
                className={inputCls}
                type="email"
                value={emailEntrega}
                onChange={e => setEmailEntrega(e.target.value)}
                placeholder="sponsor@entidad.com"
              />
              {emailEntrega && (
                <a href={`mailto:${emailEntrega}?subject=Tu Dashboard JOI 360 - ${m.nombre}&body=${encodeURIComponent(mensajeEntrega)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary-fixed flex-shrink-0 transition-colors">
                  <Icon n="send" className="text-[14px]" /> Abrir correo
                </a>
              )}
            </div>
          </Field>
          <button onClick={copiarMensaje} className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 border border-outline-variant rounded-lg text-sm text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
            <Icon n="content_copy" className="text-[16px]" /> Copiar mensaje completo de entrega (email / WhatsApp)
          </button>
        </section>

        {/* Credenciales */}
        <section>
          <h4 className="font-semibold text-sm mb-4 pb-2 border-b border-outline-variant/50 flex items-center gap-2">
            <Icon n="key" className="text-primary text-[18px]" /> Credenciales de acceso al Dashboard
          </h4>
          <div className="space-y-4">
            <Field label="URL del dashboard (link externo)">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} readOnly value={url} />
                <BtnOutline className="!px-3" onClick={() => copiar(url, "Link")}><Icon n="content_copy" className="text-[16px]" /></BtnOutline>
              </div>
            </Field>
            <Field label="Usuario del sponsor">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} value={cred.usuario} readOnly={entregado} onChange={e => setCred({ ...cred, usuario: e.target.value })} />
                <BtnOutline className="!px-3" onClick={() => copiar(cred.usuario, "Usuario")}><Icon n="content_copy" className="text-[16px]" /></BtnOutline>
              </div>
            </Field>
            <Field label="Contraseña">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} value={cred.password} readOnly={entregado} onChange={e => setCred({ ...cred, password: e.target.value })} />
                {!entregado && <BtnOutline className="!px-3" onClick={() => { setCred({ ...cred, password: generarPassword() }); notify("Contraseña regenerada.", "info"); }}><Icon n="autorenew" className="text-[16px]" /></BtnOutline>}
                <BtnOutline className="!px-3" onClick={() => copiar(cred.password, "Contraseña")}><Icon n="content_copy" className="text-[16px]" /></BtnOutline>
              </div>
            </Field>
          </div>
        </section>

        {/* Confirmación */}
        {!entregado && (
          <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-outline-variant/50">
            <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-0.5 rounded text-primary" />
            <span className="text-sm text-on-surface-variant">
              Confirmo que la configuración del mundo está completa y autorizo la entrega del dashboard al sponsor con estas credenciales.
              {emailEntrega && <span className="text-primary"> Se notificará a <b>{emailEntrega}</b>.</span>}
            </span>
          </label>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Perfil (Task #166) — mismo patrón que PerfilComercioPanel
   (Fronts.jsx): la imagen que se ve como thumbnail en el card de comunidad
   del superapp. Antes esto no existía como módulo editable — el logo solo
   se podía fijar al crear el mundo (y encima solo quedaba en localStorage,
   base64, nunca sincronizado a Supabase). ---------------- */
function PerfilMundoPanel({ m }) {
  const [subiendo, setSubiendo] = useState(false);

  const subirLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("El logo debe ser un archivo de imagen (PNG/JPG).", "error"); return; }
    setSubiendo(true);
    try {
      const path = `mundos/${m.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      await actualizarLogoMundoRemote(m.id, url);
      update(s => { const w = (s.mundos || []).find(x => x.id === m.id); if (w) w.logoUrl = url; });
      notify("Logo actualizado — ya se verá en el card de comunidad del app.");
    } catch (e) {
      notify("No se pudo subir el logo: " + e.message, "error");
    } finally { setSubiendo(false); }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-2">Perfil</h2>
      <p className="text-on-surface-variant mb-6">La imagen que elijas aquí es la que distingue a {m.nombre} en el card de comunidad de la Super App.</p>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-lg">
        <div className="flex items-center gap-5">
          <label className="w-24 h-24 rounded-2xl border border-dashed border-outline-variant flex items-center justify-center text-outline cursor-pointer overflow-hidden hover:border-primary/50 flex-shrink-0">
            {m.logoUrl ? (
              <img src={m.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : subiendo ? (
              <Icon n="hourglass_empty" className="text-[28px]" />
            ) : (
              <div className="text-center">
                <Icon n="add_a_photo" className="text-[24px] block mx-auto" />
                <span className="text-[9px] font-mono uppercase">Subir logo</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={subiendo} onChange={e => subirLogo(e.target.files?.[0])} />
          </label>
          <div className="flex-1">
            <p className="font-semibold">{m.nombre}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{m.vertical} · {m.codigo}</p>
            <label className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary cursor-pointer hover:underline">
              <Icon n="upload_file" className="text-[14px]" /> {m.logoUrl ? (subiendo ? "Subiendo…" : "Cambiar logo") : (subiendo ? "Subiendo…" : "Elegir logo")}
              <input type="file" accept="image/*" className="hidden" disabled={subiendo} onChange={e => subirLogo(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Resumen ---------------- */
function TabResumen({ m, comercios, st, goto }) {
  const ws = worldStatus(m, comercios);
  const tickets = (st.tickets||[]).filter(t => t.mundoId === m.id);
  const safeGoto = goto || (() => {});
  const activos = (m.modulos||[]).filter(x => x.enabled);
  const eventos = (st.eventos||[]).filter(e => e.mundoId === m.id);
  const promos = (st.promos||[]).filter(p => p.mundoId === m.id);
  const ac = m.acuerdo || {};

  const checklist = [
    { done: activos.length >= 2,          label: `${activos.length} capacidades habilitadas`,   detail: "Activa al menos Wallet y Comercios para comenzar.", action:"modulos" },
    { done: activos.filter(x=>x.config&&Object.keys(x.config).length>0).length>=1, label:"Capacidades configuradas", detail:"Configura parámetros y canales de al menos una capacidad.", action:"modulos" },
    { done: comercios.length > 0,          label: `${comercios.length} actor(es) cargados`,      detail:"Carga al menos 1 comercio o actor.", action:"comercios" },
    { done: !!ac.tipo,                     label: `Acuerdo: ${ac.tipo||"pendiente"}`,            detail:"Define el acuerdo comercial del mundo.", action:"acuerdo" },
    { done: m.entrega?.entregado,          label: "Dashboard entregado al sponsor",              detail:"Genera credenciales y activa el panel." },
  ];
  const completados = checklist.filter(x=>x.done).length;

  return (
    <div className="space-y-6">
      {/* WORLD INFO CARD */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Icon n="public" className="text-primary" /> Ficha del mundo</h3>
          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${ws.k==="ENTREGADO"?"bg-ok text-white":"bg-amber-100 text-amber-700"}`}>{ws.label}</span>
        </div>
        <div className="p-6 grid md:grid-cols-3 gap-5">
          {[
            {l:"Nombre",       v:m.nombre,                  i:"badge"},
            {l:"Código",       v:m.codigo,                  i:"tag"},
            {l:"Vertical",     v:m.vertical,                i:"category"},
            {l:"País",         v:m.pais||"—",               i:"flag"},
            {l:"Entidad legal",v:m.entidadLegal||"—",       i:"business"},
            {l:"RUC",          v:m.ruc||"—",                i:"receipt"},
            {l:"Moneda",       v:m.moneda,                  i:"payments"},
            {l:"Estado",       v:m.estado,                  i:"radio_button_checked"},
            {l:"Creado",       v:m.createdAt?new Date(m.createdAt).toLocaleDateString("es-PE"):"—", i:"calendar_today"},
            {l:"Acuerdo",      v:ac.tipo?`${ac.tipo}${ac.revShare?` · ${ac.revShare}%`:""}`:"Pendiente", i:"handshake"},
          ].map((r,i) => (
            <div key={i} className="flex items-start gap-2">
              <Icon n={r.i} className="text-outline text-[16px] mt-0.5 flex-shrink-0"/>
              <div>
                <p className="font-mono text-[8px] uppercase text-outline tracking-wider">{r.l}</p>
                <p className="text-sm font-medium text-on-surface mt-0.5">{r.v}</p>
              </div>
            </div>
          ))}
        </div>
        {m.descripcion && (
          <div className="px-6 pb-5">
            <p className="font-mono text-[8px] uppercase text-outline tracking-wider mb-1">Descripción</p>
            <p className="text-sm text-on-surface-variant">{m.descripcion}</p>
          </div>
        )}
      </div>

      {/* OPERADOR DE MUNDO (POS) — clave para "Soy Mundo": bandita, accesos,
          eventos, consultar. No cobra saldo — eso sigue siendo del comercio. */}
      <OperadorMundoCard m={m} />

      {/* STATS ROW */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {v:activos.length,     l:"Capacidades activas",  i:"extension",        c:"text-primary",   action:"modulos"},
          {v:comercios.length,   l:"Actores cargados",     i:"groups",           c:"text-secondary", action:"comercios"},
          {v:(m.modulos||[]).filter(x=>x.enabled&&x.acuerdo?.gratuito===false&&(x.acuerdo?.fijoMensual>0||x.acuerdo?.porTx>0||x.acuerdo?.setup>0)).length, l:"Con pricing", i:"payments", c:"text-tertiary", action:"modulos"},
          {v:tickets.filter(t=>t.estado==="ABIERTO").length, l:"Tickets abiertos", i:"support_agent", c:"text-error", action:null},
        ].map((s,i)=>(
          <button key={i} onClick={()=>s.action&&safeGoto(s.action)}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-left hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <Icon n={s.i} className={`${s.c} text-[22px]`}/>
              <p className={`text-3xl font-black ${s.c}`}>{s.v}</p>
            </div>
            <p className="font-mono text-[9px] uppercase text-outline">{s.l}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* CAPACIDADES ACTIVAS */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Icon n="extension" className="text-primary" /> Capacidades activadas</h3>
            <button onClick={()=>safeGoto("modulos")} className="text-[10px] font-mono text-primary hover:underline">Configurar →</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {activos.length === 0
              ? <p className="text-xs text-on-surface-variant italic">Sin capacidades activas. Ve a la tab Capacidades.</p>
              : activos.map(x => {
                const c = moduleCat(x.id);
                if(!c) return null;
                const hasPricing = x.acuerdo?.tipo;
                return (
                  <span key={x.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs">
                    <Icon n={c.icon} className="text-primary text-[14px]"/>
                    <span className="font-medium">{c.name}</span>
                    {x.emision && <span className="font-mono text-[7px] text-secondary bg-secondary-fixed px-1 rounded">E</span>}
                    {x.adquirencia && <span className="font-mono text-[7px] text-primary bg-primary-fixed px-1 rounded">A</span>}
                    {hasPricing && <Icon n="payments" className="text-ok text-[11px]" fill/>}
                  </span>
                );
              })
            }
          </div>
          {/* Dependency alert if any */}
          {activos.some(x => {
            const deps = DEPENDENCY_MAP[x.id]||[];
            return deps.some(d => !activos.find(a=>a.id===d));
          }) && (
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <Icon n="warning" className="text-amber-500 text-[16px] flex-shrink-0 mt-0.5"/>
              <div>
                <b>Dependencias pendientes.</b> Algunas capacidades requieren otras para funcionar.
                <button onClick={()=>safeGoto("modulos")} className="ml-1 underline">Ver en Capacidades →</button>
              </div>
            </div>
          )}
        </div>

        {/* CHECKLIST */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon n="checklist" className="text-primary text-[20px]"/>
            <h3 className="font-semibold text-sm">Checklist de activación</h3>
            <span className="ml-auto font-mono text-[10px] text-primary bg-primary-fixed px-2 py-0.5 rounded">{completados}/{checklist.length}</span>
          </div>
          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden mb-4">
            <div className="h-full bg-primary rounded-full transition-all" style={{width:`${(completados/checklist.length)*100}%`}}/>
          </div>
          <div className="space-y-2">
            {checklist.map((c,i)=>(
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${c.done?"border-ok/30 bg-ok/5":"border-outline-variant"}`}>
                <Icon n={c.done?"check_circle":"radio_button_unchecked"} className={`text-[18px] flex-shrink-0 mt-0.5 ${c.done?"text-ok":"text-outline"}`} fill={c.done}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${c.done?"line-through text-on-surface-variant":""}`}>{c.label}</p>
                  {!c.done&&<p className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{c.detail}</p>}
                </div>
                {!c.done&&c.action&&(
                  <button onClick={()=>safeGoto(c.action)} className="text-primary font-mono text-[9px] flex-shrink-0">IR →</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TICKETS */}
      {tickets.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><Icon n="support_agent" className="text-primary"/>Solicitudes de soporte</h3>
          <div className="space-y-2">
            {tickets.map(t=>(
              <div key={t.id} className="flex items-start justify-between p-3 border border-outline-variant rounded-lg gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.asunto}</p>
                  <p className="font-mono text-[9px] text-outline uppercase">{t.tipo} · {new Date(t.createdAt).toLocaleDateString("es-PE")}</p>
                </div>
                <Pill color={t.estado==="ABIERTO"?"bg-tertiary-container":"bg-ok"}>{t.estado}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



/* ── worldStatus ──────────────────────────────────────────────────── */
function worldStatus(m, comercios) {
  if (m.entrega?.entregado) return { k:"ENTREGADO", color:"bg-secondary", label:"Entregado al sponsor" };
  const mods = (m.modulos||[]).filter(x => x.enabled);
  const configured = mods.filter(x => x.config && Object.keys(x.config).length > 0).length;
  if ((comercios||[]).length > 0 && configured >= 2) return { k:"LISTO", color:"bg-ok", label:"Listo para entregar" };
  if (mods.length > 0) return { k:"CONFIGURANDO", color:"bg-tertiary-container", label:"En configuración" };
  return { k:"BORRADOR", color:"bg-outline", label:"Borrador" };
}

/* ── APP_PREVIEW ─────────────────────────────────────────────────── */
const APP_PREVIEW = {
  wallet:      { label:"Billetera",  color:"bg-[#dae2fd] text-[#3525cd]", views:["Balance y saldo en tiempo real","Botón Recargar con canales habilitados","Transferencia P2P si está activa","Bandita NFC vinculada","Historial de movimientos"] },
  comercios:   { label:"Comercios",  color:"bg-[#dae2fd] text-blue-700",  views:["Directorio de comercios del mundo","Info + categoría por comercio","Click → pagar con QR o NFC"] },
  consumos:    { label:"Consumos",   color:"bg-[#f0ecf9] text-gray-700",  views:["Historial de compras en el mundo","Detalle por transacción","Estadísticas del período"] },
  inventario:  { label:"Inventario", color:"bg-[#fafafa] text-gray-600",  views:["Sin vista propia en app","Alimenta el POS y el historial de consumos"] },
  loyalty:     { label:"Lealtad",    color:"bg-[#fff8e1] text-amber-600", views:["Contador de puntos + nivel (Bronce/Plata/Oro)","Catálogo de canje según equivalencia","Historial de devengo por comercio"] },
  eventos:     { label:"Eventos",    color:"bg-[#fce4ec] text-pink-700",  views:["Listado de eventos del mundo","Compra de entrada / reserva","Si B2C activo: formulario crear evento (3 pasos)"] },
  control:     { label:"Familia",    color:"bg-[#f1f8e9] text-green-700", views:["Tarjetas de dependientes","Barra de límite diario por hijo","Registro de alergias (si habilitado)","Modal de límites y notificaciones"] },
  menu:        { label:"Menú",       color:"bg-[#fff3e0] text-orange-600",views:["Opciones del menú del día","Pre-orden con cupos en tiempo real","Filtros + restricciones alimentarias"] },
  accesos:     { label:"Accesos",    color:"bg-[#e8eaf6] text-indigo-600",views:["QR de identificación personal","Zonas habilitadas para el usuario","Historial de entradas/salidas"] },
  asistencia:  { label:"Asistencia", color:"bg-[#e0f2f1] text-teal-600",  views:["Botones entrada / salida","Contador de marcaciones del día","Historial A tiempo / Tarde"] },
  cashback:    { label:"Cashback",   color:"bg-[#ffdbcc] text-orange-800",views:["Saldo de cashback disponible","% de retorno del configField","Historial por comercio"] },
  subsidio:    { label:"Subsidio",   color:"bg-[#f3e5f5] text-purple-600",views:["Saldo subsidiado separado del libre","Categorías donde puede usarse","Fecha de caducidad"] },
  credito:     { label:"Crédito",    color:"bg-[#e8f5e9] text-green-700", views:["Línea disponible vs. usada","Simulador de cuotas","Cuotas pendientes"] },
  perfil_ext:  { label:"Perfil Pro", color:"bg-[#f5f5f5] text-gray-700",  views:["Datos médicos / emergencia","QR personal de identificación","Grupo familiar vinculado"] },
  estacionamiento:{ label:"Parking", color:"bg-[#e3f2fd] text-blue-600",  views:["Timer activo + costo en tiempo real","Historial de sesiones"] },
  promociones: { label:"Promos",     color:"bg-[#fff8e1] text-amber-600", views:["Cupones activos (mundo + JOI Promos)","QR de canje por cupón","Estado activo / agotado"] },
  reservas:    { label:"Reservas",   color:"bg-[#e8f5e9] text-green-600", views:["Flujo nueva reserva","Mis reservas próximas","Cancelar / reagendar"] },
  turnos:      { label:"Turnos",     color:"bg-[#e0f7fa] text-cyan-600",  views:["Agenda disponible","Mis citas próximas"] },
  transporte:  { label:"Transporte", color:"bg-[#e1f5fe] text-blue-600",  views:["Pago de viaje por NFC o QR","Rutas del mundo","Historial de viajes"] },
  bnpl:        { label:"BNPL",       color:"bg-[#ede7f6] text-purple-600",views:["Simulador de cuotas interactivo","Al pagar: opción de diferir","Historial de cuotas"] },
};

/* ── TabModulos ───────────────────────────────────────────────────── */
function TabModulos({ m }) {
  const [cfg, setCfg] = useState(null);
  const [eventosPopup, setEventosPopup] = useState(false); // popup de estrategia al activar "eventos" en un mundo ya existente
  const tiers = ["CORE","PREMIUM","OPCIONAL"];

  const toggleMod = (modId, field, val) => {
    update(st => {
      const mundo = (st.mundos||[]).find(x => x.id === m.id);
      if (!mundo) return;
      const mod = (mundo.modulos||[]).find(x => x.id === modId);
      if (mod) mod[field] = val;
    });
    const c = moduleCat(modId);
    if (val && field === "enabled") {
      const deps = DEPENDENCY_MAP[modId] || [];
      const activos = (m.modulos||[]).filter(x => x.enabled);
      const missing = deps.filter(d => !activos.find(a => a.id === d));
      if (missing.length > 0) {
        const names = missing.map(d => moduleCat(d)?.name || d).join(", ");
        notify(`${c?.name||modId} activado. ⚠ Requiere: ${names}`, "info");
        return;
      }
    }
    notify(`${c?.name||modId}: ${val?"activado":"desactivado"}.`, "info");
  };

  const addModule = (modId) => {
    const c = moduleCat(modId);
    if (!c) return;
    update(st => {
      const mundo = (st.mundos||[]).find(x => x.id === m.id);
      if (!mundo) return;
      if (!mundo.modulos) mundo.modulos = [];
      if (!(mundo.modulos||[]).find(x => x.id === modId))
        mundo.modulos.push({ id:modId, enabled:true, emision:c.e||false, adquirencia:c.a||false, config:{}, serviciosActivos:{} });
      // Motor de Eventos: fijar eventosConfig ahora mismo, no dejarlo null hasta
      // que alguien visite la pestaña Motor de Eventos por separado — el mismo
      // gap que ya se resolvió en el wizard de creación (Step6Eventos), pero
      // para un mundo que ya existía.
      if (modId === "eventos" && !mundo.eventosConfig) {
        mundo.eventosConfig = {
          modoEventos: mundo.type === "eventos_rp" ? "b2c" : "b2b",
          embebidoActivo: false,
          comisionEntrada: 5,
        };
      }
    });
    if (modId === "eventos") setEventosPopup(true);
    else notify(`Capacidad "${c.name}" agregada al mundo.`);
  };

  const enabledIds = (m.modulos||[]).map(x => x.id);
  const available = MODULE_CATALOG.filter(c => !enabledIds.includes(c.id));

  return (
    <div>
      {tiers.map(tier => {
        const mods = (m.modulos||[]).filter(x => moduleCat(x.id)?.tier === tier);
        if (!mods.length) return null;
        const TIER_COLORS = { CORE:"bg-primary text-white", PREMIUM:"bg-secondary text-white", OPCIONAL:"bg-tertiary-container text-on-tertiary-container" };
        return (
          <section key={tier} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`font-mono text-[11px] font-black uppercase px-3 py-1 rounded ${TIER_COLORS[tier]}`}>{tier}</span>
              <div className="flex-1 h-px bg-outline-variant/60"/>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mods.filter(x => moduleCat(x.id)).map(x => {
                const c = moduleCat(x.id);
                const deps = DEPENDENCY_MAP[x.id] || [];
                const activos = (m.modulos||[]).filter(a => a.enabled);
                const missingDeps = deps.filter(d => !activos.find(a => a.id === d));
                const appPrev = APP_PREVIEW[x.id];

                return (
                  <div key={x.id} className={`bg-surface-container-lowest border rounded-xl overflow-hidden flex flex-col transition-all ${x.enabled?"border-outline-variant hover:border-primary/40":"border-outline-variant/50 opacity-70"}`}>
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                          <Icon n={c?.icon} className="text-[22px]"/>
                        </div>
                        <Pill color={x.enabled?"bg-ok":"bg-outline"}>{x.enabled?"ACTIVO":"INACTIVO"}</Pill>
                      </div>
                      <h4 className="font-semibold text-sm">{c?.name}</h4>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{c?.desc}</p>

                      {/* App preview when enabled */}
                      {appPrev && x.enabled && (
                        <div className="mt-3 p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest">
                          <p className="font-mono text-[8px] uppercase text-outline mb-1.5 flex items-center gap-1">
                            <Icon n="smartphone" className="text-[10px]"/> El usuario verá en la Super App
                          </p>
                          <div className="space-y-0.5">
                            {appPrev.views.slice(0,3).map((v,j) => (
                              <p key={j} className="text-[10px] text-on-surface-variant flex items-start gap-1">
                                <span className="text-primary mt-0.5 flex-shrink-0">›</span>{v}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dependency warnings when disabled */}
                      {!x.enabled && deps.length > 0 && (
                        <div className="mt-3 p-2.5 rounded-lg border border-dashed border-outline-variant/50">
                          <p className="text-[9px] text-outline text-center mb-1">Requiere:</p>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {deps.map(dep => {
                              const depCat = moduleCat(dep);
                              const depActive = activos.find(a => a.id === dep);
                              return depCat ? (
                                <span key={dep} className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${depActive?"bg-ok/10 text-ok":"bg-amber-50 text-amber-700"}`}>
                                  {depActive?"✓":"!"} {depCat.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dep warning when active but missing deps */}
                      {x.enabled && missingDeps.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex gap-1.5 text-[10px] text-amber-800">
                          <Icon n="warning" className="text-amber-500 text-[12px] flex-shrink-0 mt-0.5"/>
                          <span>Requiere: {missingDeps.map(d=>moduleCat(d)?.name||d).join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/60 flex items-center gap-2">
                      <Toggle checked={x.enabled} onChange={v => toggleMod(x.id,"enabled",v)}/>
                      <span className="font-mono text-[10px] uppercase text-on-surface-variant flex-1">
                        {x.enabled?"Habilitado":"Deshabilitado"}
                      </span>
                      <button onClick={() => setCfg(x.id)}
                        className="px-2.5 py-1 rounded border border-primary text-primary font-mono text-[10px] uppercase hover:bg-primary/5 transition-colors flex-shrink-0">
                        Configurar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {available.length > 0 && (
        <section className="mb-8">
          <h3 className="font-semibold mb-3 text-sm text-on-surface-variant flex items-center gap-2">
            <Icon n="add_circle" className="text-primary"/> Agregar del catálogo global
          </h3>
          <div className="flex flex-wrap gap-2">
            {available.filter(c=>moduleCat(c.id)).map(c => {
              const prox = MODULOS_PROXIMAMENTE.has(c.id);
              return (
                <button key={c.id} onClick={() => !prox && addModule(c.id)} disabled={prox}
                  title={prox ? "Fuera del alcance actual — disponible próximamente" : ""}
                  className={`flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-xs transition-colors ${prox ? "border-outline-variant opacity-50 cursor-not-allowed" : "border-outline-variant hover:border-primary hover:text-primary"}`}>
                  <Icon n={prox ? "schedule" : "add"} className="text-[14px]"/> {c.name}
                  <span className={`font-mono text-[9px] ${prox ? "px-1.5 py-0.5 rounded bg-surface-container text-outline uppercase" : "text-outline"}`}>{prox ? "Próximamente" : c.tier}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {cfg && <ModuleConfigDrawer mundoId={m.id} modId={cfg} onClose={() => setCfg(null)}/>}
      {eventosPopup && <EventosActivadoPopup m={m} onClose={() => setEventosPopup(false)}/>}
    </div>
  );
}

/* ── Selector de modelo del Motor de Eventos ───────────────────────────
   Un solo componente para las dos superficies que deciden lo mismo: el popup
   que salta al activar la capacidad y la pestaña Motor de Eventos. Antes eran
   dos bloques distintos y ya habían derivado — el popup daba B2B por sentado y
   dejaba marcar Embebido al lado, que es justo lo que no puede coexistir.

   Las dependencias son reales, no cosméticas:
     · B2B  → mundo organizador. Se le entrega un panel dedicado. No convive
              con B2C ni con Embebido.
     · B2C  → el evento lo crea un usuario final desde la app.
     · Embebido → solo bajo B2C, y el evento es del mundo: lo carga su propio
              panel y RedPontis lo aprueba. Al activarlo hay que definir la
              comisión, porque sin modelo comercial no se puede liquidar. */
function SelectorModoEventos({ m, compacto = false }) {
  const cfg = m.eventosConfig || {};
  const modo = cfg.modoEventos || (m.type === "eventos_rp" ? "b2c" : "b2b");
  const esB2B = modo === "b2b";
  const embebido = !!cfg.embebidoActivo;

  const setCfg = patch => update(s => {
    const mu = (s.mundos || []).find(x => x.id === m.id);
    if (mu) mu.eventosConfig = { ...(mu.eventosConfig || cfg), ...patch };
  });

  // Cambiar a B2B apaga Embebido en el mismo gesto: dejar el flag prendido
  // "por si acaso" es cómo se cuelan estados imposibles.
  const elegirModo = nuevo => setCfg(
    nuevo === "b2b"
      ? { modoEventos: "b2b", embebidoActivo: false }
      : { modoEventos: "b2c" }
  );

  const activarEmbebido = v => setCfg(
    v
      ? { embebidoActivo: true, modeloComisionEventos: cfg.modeloComisionEventos || "transaccional" }
      : { embebidoActivo: false }
  );

  return (
    <>
      {/* JOI Eventos es B2C por definición: es el mundo donde publica el
          usuario final. Ofrecer B2B ahí sería una opción que no existe. */}
      {m.type !== "eventos_rp" && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {["b2b", "b2c"].map(op => {
            const mo = MODOS_EVENTO[op];
            const activo = modo === op;
            return (
              <button key={op} onClick={() => elegirModo(op)}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${activo ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
                <Icon n={mo.icon} className={activo ? "text-primary text-[20px]" : "text-outline text-[20px]"} />
                <p className="text-sm font-semibold mt-2">{mo.label}</p>
                <p className="text-xs text-on-surface-variant mt-1">{mo.desc}</p>
              </button>
            );
          })}
        </div>
      )}

      {esB2B ? (
        <div className="p-4 bg-secondary-fixed/30 border border-secondary/20 rounded-xl flex items-start gap-3">
          <Icon n="business_center" className="text-secondary text-[20px] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Mundo organizador (B2B)</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {m.nombre} gestiona sus eventos desde un panel propio, con aprobación final de RedPontis.
              Embebido y B2C quedan fuera mientras el modo sea B2B.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={`p-4 rounded-xl border-2 transition-colors mb-4 ${embebido ? "border-primary bg-primary-fixed/20" : "border-outline-variant border-dashed"}`}>
            <div className="flex justify-between items-start mb-2">
              <Icon n={MODOS_EVENTO.embebido.icon} className={embebido ? "text-primary" : "text-outline"} />
              <Toggle checked={embebido} onChange={activarEmbebido} />
            </div>
            <p className="text-sm font-semibold">Activar Embebido</p>
            <p className="text-xs text-on-surface-variant mt-1">
              El evento pasa a ser del mundo: se carga desde su propio panel y RedPontis lo aprueba
              antes de que salga al superapp, en un carrusel propio separado del de comercios.
            </p>
          </div>

          {embebido && !compacto && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-bold text-amber-900 mb-3 flex items-center gap-1.5">
                <Icon n="payments" className="text-[16px]" /> Comisión de RedPontis para Embebido — obligatorio al activar
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {["transaccional", "mixto", "revenue"].map(modelo => (
                  <button key={modelo} onClick={() => setCfg({ modeloComisionEventos: modelo })}
                    className={`py-2.5 rounded-lg border text-xs font-semibold capitalize transition-colors ${(cfg.modeloComisionEventos || "transaccional") === modelo ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant"}`}>
                    {modelo === "transaccional" ? "% por entrada" : modelo === "mixto" ? "Mixto" : "Revenue fijo"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(cfg.modeloComisionEventos || "transaccional") !== "revenue" && (
                  <Field label="Comisión por entrada (%)">
                    <NumInput className={inputCls} value={cfg.comisionEntrada || 0}
                      onChange={v => setCfg({ comisionEntrada: v })} />
                  </Field>
                )}
                {(cfg.modeloComisionEventos === "mixto" || cfg.modeloComisionEventos === "revenue") && (
                  <Field label={`Cuota fija mensual (${m.moneda})`}>
                    <NumInput className={inputCls} value={cfg.comisionFijaMensual || 0}
                      onChange={v => setCfg({ comisionFijaMensual: v })} />
                  </Field>
                )}
              </div>
            </div>
          )}

          {embebido && compacto && (
            <p className="text-xs text-on-surface-variant">
              Define la comisión de RedPontis en la pestaña <b>Motor de Eventos</b> antes de publicar el primer evento.
            </p>
          )}
        </>
      )}
    </>
  );
}

/* ── Popup de estrategia de Eventos ────────────────────────────────────
   Salta al activar la capacidad en un mundo ya existente, para que la decisión
   se tome en el momento y no en una pestaña que hay que descubrir después.
   Se puede volver a abrir desde la pestaña Motor de Eventos: elegir el modelo
   no es una puerta de un solo sentido, y un mundo puede cambiar de estrategia. */
function EventosActivadoPopup({ m, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Icon n="confirmation_number" className="text-primary text-[22px]" />
          <h3 className="font-semibold">Modelo del Motor de Eventos</h3>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          Define quién crea los eventos de <b>{m.nombre}</b>. Puedes cambiarlo después desde la pestaña Motor de Eventos.
        </p>
        <SelectorModoEventos m={m} compacto />
        <div className="mt-5">
          <BtnPrimary onClick={onClose} className="w-full justify-center">
            <Icon n="check" className="text-[16px]" /> Listo
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// e/a en MODULE_CATALOG clasifican la capacidad en la matriz Emisión/Adquirencia
// del Catálogo Maestro (¿tiene lado app? ¿tiene lado POS/admin?) — un uso
// distinto a "administra canales reales de pago/recarga". Usar e/a también
// para decidir el tab Canales hacía que 15 capacidades (Accesos, Reservas,
// Loyalty, Eventos, BNPL...) mostraran los mismos toggles globales de
// Wallet/Comercios sin usarlos de verdad — "repite canales y no estandariza".
// Solo Wallet (emisión/recargas) y Comercios (adquirencia/cobro) son dueños
// reales de esa configuración.
const CAPACIDADES_CON_CANALES = new Set(["wallet", "comercios"]);

/* ── ModuleConfigDrawer ───────────────────────────────────────────── */
const PERIODO_LABEL = { mensual: "Mensual", anual: "Anual" };

// Planes de suscripción (Task #174) — CRUD directo contra Supabase, sin
// pasar por el draft f/save() del drawer: igual patrón que "Gestionar
// modelos" en HardwarePOS (PosDevicesTab), cada plan es su propia fila y se
// guarda al toque, no junto con el resto de la config del módulo.
function PlanesSuscripcionPanel({ worldId, moneda }) {
  const [planes, setPlanes] = useState(null);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", descripcion: "", precio: "", periodo: "mensual", descuento_pct: "" });
  const [guardando, setGuardando] = useState(false);

  const load = () => fetchPlanesSuscripcion(worldId).then(setPlanes).catch(() => setPlanes([]));
  React.useEffect(() => { load(); }, [worldId]);

  const crear = async () => {
    if (!nuevo.nombre.trim() || !(+nuevo.precio > 0)) return;
    setGuardando(true);
    try {
      await crearPlanSuscripcion(worldId, {
        nombre: nuevo.nombre.trim(), descripcion: nuevo.descripcion.trim() || null,
        precio: +nuevo.precio, periodo: nuevo.periodo,
        descuento_pct: nuevo.descuento_pct ? +nuevo.descuento_pct : null, activo: true,
      });
      setNuevo({ nombre: "", descripcion: "", precio: "", periodo: "mensual", descuento_pct: "" });
      setCreando(false);
      load();
    } finally { setGuardando(false); }
  };
  const toggleActivo = async (p) => { await actualizarPlanSuscripcion(p.id, { activo: !p.activo }); load(); };
  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar el plan "${p.nombre}"?`)) return;
    await eliminarPlanSuscripcion(p.id);
    load();
  };

  return (
    <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-on-surface">Planes de suscripción</p>
        <button onClick={()=>setCreando(v=>!v)} className="text-[10px] text-primary font-bold underline">{creando ? "Cancelar" : "+ Nuevo plan"}</button>
      </div>
      <p className="text-[10px] text-on-surface-variant">El usuario elige entre estos planes al vincular un dependiente. Si no hay ninguno activo, se usa el monto fijo de "Monto de la suscripción por perfil" de arriba.</p>

      {creando && (
        <div className="p-3 bg-surface rounded-lg border border-outline-variant space-y-2">
          <input className="w-full h-8 px-2 border border-outline-variant rounded-lg text-xs" placeholder="Nombre (ej. Plan Mensual)"
            value={nuevo.nombre} onChange={e=>setNuevo(n=>({...n, nombre: e.target.value}))}/>
          <input className="w-full h-8 px-2 border border-outline-variant rounded-lg text-xs" placeholder="Descripción (opcional)"
            value={nuevo.descripcion} onChange={e=>setNuevo(n=>({...n, descripcion: e.target.value}))}/>
          <div className="flex gap-2">
            <input type="number" min="0" step="0.01" className="flex-1 h-8 px-2 border border-outline-variant rounded-lg text-xs" placeholder={`Precio (${moneda||"PEN"})`}
              value={nuevo.precio} onChange={e=>setNuevo(n=>({...n, precio: e.target.value}))}/>
            <select className="h-8 px-2 border border-outline-variant rounded-lg text-xs" value={nuevo.periodo} onChange={e=>setNuevo(n=>({...n, periodo: e.target.value}))}>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
            <input type="number" min="0" max="100" className="w-24 h-8 px-2 border border-outline-variant rounded-lg text-xs" placeholder="% desc."
              value={nuevo.descuento_pct} onChange={e=>setNuevo(n=>({...n, descuento_pct: e.target.value}))}/>
          </div>
          <BtnPrimary className="!py-1.5 !px-3 !text-xs" loading={guardando} loadingLabel="Creando…" onClick={crear}>Crear plan</BtnPrimary>
        </div>
      )}

      {planes === null ? (
        <p className="text-xs text-on-surface-variant">Cargando…</p>
      ) : planes.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">Sin planes creados — se usa el monto fijo.</p>
      ) : (
        <div className="space-y-1.5">
          {planes.map(p => (
            <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border ${p.activo ? "bg-surface border-outline-variant" : "bg-surface-container opacity-50 border-outline-variant"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-on-surface">{p.nombre} <span className="font-mono text-[9px] text-on-surface-variant">· {PERIODO_LABEL[p.periodo]||p.periodo}</span></p>
                <p className="text-[10px] text-on-surface-variant">
                  S/ {Number(p.precio).toFixed(2)}
                  {p.descuento_pct > 0 && <span className="ml-1 text-green-700 font-bold">-{p.descuento_pct}% → S/ {(p.precio*(1-p.descuento_pct/100)).toFixed(2)}</span>}
                </p>
              </div>
              <button onClick={()=>toggleActivo(p)} className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded-full border font-bold ${p.activo?"bg-green-100 text-green-700 border-green-200":"bg-surface-container-low text-outline border-outline-variant"}`}>{p.activo?"Activo":"Inactivo"}</button>
              <button onClick={()=>eliminar(p)} className="w-6 h-6 flex items-center justify-center text-error hover:bg-error-container/40 rounded-full">
                <Icon n="delete" className="text-[14px]"/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleConfigDrawer({ mundoId, modId, onClose }) {
  const st = useStore();
  const m = (st.mundos||[]).find(x => x.id === mundoId);
  const mod = m?.modulos?.find(x => x.id === modId);
  const c = modId ? moduleCat(modId) : null;
  const appPreview = APP_PREVIEW[modId];
  const [f, setF] = useState({});
  const [tab, setTab] = useState("config");

  React.useEffect(() => {
    if (mod) setF({ config:{...mod.config}, serviciosActivos:{...(mod.serviciosActivos||{})}, acuerdo:{ gratuito: true, modelo:"transaccional", ...(mod.acuerdo||{}) } });
  }, [modId]);

  if (!mod || !c || !m) return null;
  const tieneCanales = CAPACIDADES_CON_CANALES.has(modId);

  const save = () => {
    // Canales que el admin nunca tocó muestran un default visual (ch.disponible)
    // pero ese default nunca se escribe a f.config hasta que se togglea al menos
    // una vez — sin este backfill, "Guardar" sin tocar nada deja el mundo sin
    // ningún canal real en world_channel_configs pese a que la UI los muestra ON.
    const configConCanales = { ...f.config };
    if (tieneCanales && c?.e) for (const ch of CANALES_EMISION) {
      const key = `emision_${ch.id}`;
      if (configConCanales[key] === undefined) configConCanales[key] = { enabled: ch.disponible, montoMinOverride: null, montoMaxOverride: null };
    }
    if (tieneCanales && c?.a) for (const ch of CANALES_ADQUIRENCIA) {
      const key = `adq_${ch.id}`;
      if (configConCanales[key] === undefined) configConCanales[key] = ch.disponible;
    }
    update(s => {
      const mu = (s.mundos||[]).find(x => x.id === mundoId);
      if (!mu) return;
      const mo = (mu.modulos||[]).find(x => x.id === modId);
      if (!mo) return;
      mo.config = configConCanales;
      mo.serviciosActivos = f.serviciosActivos;
      mo.acuerdo = f.acuerdo;
    });
    notify(`Configuración de "${c.name}" guardada.`);
    onClose();
  };

  const TABS = [
    { k:"config",    l:"Parámetros",    i:"tune" },
    ...(c?.microservicios ? [{ k:"microservicios", l:"Microservicios", i:"account_tree" }] : []),
    // Canales solo aplica a Wallet/Comercios — los únicos dueños reales de
    // configuración de canales de emisión/adquirencia (ver CAPACIDADES_CON_CANALES).
    ...(tieneCanales ? [{ k:"canales", l:"Canales", i:"settings_input_antenna" }] : []),
    { k:"pricing",   l:"Pricing",       i:"payments" },
    { k:"servicios", l:"Feature Flags", i:"toggle_on" },
    { k:"app",       l:"Vista App",     i:"smartphone" },
  ];

  return (
    <Drawer open={!!modId} onClose={onClose} icon={c?.icon}
      title={`Configurar ${c?.name}`}
      subtitle={`${m.nombre} · ${mod.enabled?"Habilitado":"Deshabilitado"}`}
      width="w-[540px]"
      footer={<><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary onClick={save}><Icon n="save" className="text-[16px]"/> Guardar</BtnPrimary></>}>

      <div className="space-y-0">
        {/* Info banner */}
        <div className="px-5 pt-4 pb-3">
          <div className="p-3 rounded-lg bg-primary-fixed/30 border border-primary/20 text-xs text-on-surface-variant">
            <Icon n="info" className="inline text-primary mr-1 text-[14px] align-text-top"/>
            {c?.desc} Configuración por mundo — se propaga a la Super App y frente de comercio.
          </div>
          {appPreview && (
            <div className="mt-2 p-3 rounded-lg bg-surface-container border border-outline-variant text-xs">
              <p className="font-mono text-[8px] uppercase text-outline mb-1.5 flex items-center gap-1">
                <Icon n="smartphone" className="text-[10px]"/> El usuario verá
              </p>
              <div className="flex flex-wrap gap-1">
                {appPreview.views.map((v,i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${appPreview.color}`}>{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant overflow-x-auto">
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab===t.k?"border-primary text-primary":"border-transparent text-on-surface-variant hover:text-on-surface"}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* MICROSERVICIOS (solo capacidades que lo definan, hoy: Wallet) */}
        {tab === "microservicios" && (
          <section className="p-5 space-y-3">
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-900">
              <Icon n="account_tree" className="inline mr-1 text-[14px] align-text-top"/>
              Cada microservicio tiene su propia configuración y puede depender de otro. Si está bloqueado, revisa la dependencia indicada.
            </div>
            {/* Auditoría Task #132: acá existía un microservicio "Familiares /
                Sub-perfiles" (habilitarFamiliares) que nunca se leía en ningún
                lado del superapp — un admin lo prendía y no pasaba nada. La
                gestión real de familiares/dependientes vive en la capacidad
                Restricciones (control.perfilesControladosActivo), ya
                construida y en uso. Se retiró el toggle muerto de acá para no
                confundir con un segundo interruptor que no hacía nada. */}
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface-variant">
              <Icon n="info" className="inline mr-1 text-[14px] align-text-top text-primary"/>
              La gestión de familiares/dependientes (agregar, restricciones, alergias, banditas) vive en la capacidad <b>Restricciones</b>, no acá — actívala en la pestaña Módulos si este mundo la necesita.
            </div>
            {(() => {
              const defaultsLookup = {};
              (c.microservicios||[]).forEach(m2 => (m2.campos||[]).forEach(cf => { defaultsLookup[`${m2.id}_${cf.key}`] = cf.default; }));
              return (c.microservicios||[]).map(ms => (
                <MicroservicioCard key={ms.id} ms={ms} config={f.config||{}} defaultsLookup={defaultsLookup}
                  onChange={(key, val) => setF({ ...f, config: { ...f.config, [key]: val } })}
                  moneda={m.moneda}/>
              ));
            })()}
          </section>
        )}

        {/* CANALES */}
        {tab === "canales" && (
          <section className="p-5 space-y-5">
            <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-lg text-xs text-on-surface-variant">
              Selecciona qué canales del catálogo global estarán disponibles en este mundo. Los usuarios solo ven los habilitados aquí.
            </div>
            {c?.e && (
              <div>
                <p className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary"/> Canales de Emisión (recargas)
                </p>
                <p className="text-[11px] text-on-surface-variant mb-3">
                  El mundo puede <b>restringir</b> los límites de un canal global, pero nunca superarlos.
                </p>
                <div className="space-y-2">
                  {CANALES_EMISION.map(ch => (
                    <CanalEmisionRow key={ch.id} ch={ch} f={f} setF={setF}/>
                  ))}
                </div>
              </div>
            )}
            {c?.a && (
              <div>
                <p className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary"/> Canales de Adquirencia (medios de pago)
                </p>
                <div className="space-y-2">
                  {CANALES_ADQUIRENCIA.map(ch => {
                    const key = `adq_${ch.id}`;
                    const on = f.config?.[key] !== false && ch.disponible;
                    return (
                      <label key={ch.id} className={`flex items-center gap-3 p-3 rounded-lg border ${ch.disponible?"cursor-pointer":"cursor-not-allowed"} ${on?"border-primary/40 bg-primary-fixed/10":"border-outline-variant"} ${!ch.disponible?"opacity-40":""}`}>
                        <Toggle checked={on} disabled={!ch.disponible} onChange={v => setF({...f, config:{...f.config,[key]:v}})}/>
                        <Icon n={ch.icon} className="text-[18px] text-on-surface-variant"/>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{ch.nombre}</p>
                          <p className="text-[10px] text-on-surface-variant">{ch.desc}</p>
                        </div>
                        {!ch.disponible && <span className="text-[9px] font-mono text-outline">Próximamente</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {!c?.e && !c?.a && <p className="text-sm text-on-surface-variant italic">Esta capacidad no gestiona canales de pago.</p>}
          </section>
        )}

        {/* PRICING */}
        {tab === "pricing" && (
          <section className="p-5 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <b>Pricing por mundo</b> — independiente del catálogo global. Define el acuerdo para esta capacidad en {m.nombre}.
            </div>

            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${f.acuerdo?.gratuito?"border-ok/50 bg-ok/5":"border-outline-variant"}`}>
              <Toggle checked={f.acuerdo?.gratuito !== false} onChange={v=>setF({...f,acuerdo:{...f.acuerdo,gratuito:v}})}/>
              <div className="flex-1">
                <p className="text-sm font-medium">Gratuito por el momento</p>
                <p className="text-[11px] text-on-surface-variant">RedPontis aún no cobra mantenimiento, implementación ni comisión por esta capacidad. Actívalo para definir un pricing real.</p>
              </div>
            </label>

            {f.acuerdo?.gratuito !== false ? (
              <div className="p-3 bg-surface-container rounded-lg text-xs font-mono text-on-surface-variant">
                Sin costo — no se factura al mundo por esta capacidad.
              </div>
            ) : (<>
              <div>
                <p className="text-[10px] font-mono uppercase text-on-surface-variant mb-2">Modelo de cobro</p>
                <div className="grid grid-cols-3 gap-2">
                  {["fijo","transaccional","mixto"].map(modo => (
                    <button key={modo} onClick={() => setF({...f, acuerdo:{...f.acuerdo, modelo:modo}})}
                      className={`py-2.5 rounded-lg border text-xs font-semibold capitalize transition-colors ${f.acuerdo?.modelo===modo?"bg-primary text-white border-primary":"border-outline-variant text-on-surface-variant"}`}>
                      {modo==="fijo"?"Fijo":modo==="transaccional"?"% Tx":"Mixto"}
                    </button>
                  ))}
                </div>
              </div>
              {(f.acuerdo?.modelo==="fijo"||f.acuerdo?.modelo==="mixto") && (
                <Field label={`Cuota fija mensual (${m.moneda})`}>
                  <NumInput className={inputCls} value={f.acuerdo?.fijoMensual||0} onChange={v=>setF({...f,acuerdo:{...f.acuerdo,fijoMensual:v}})}/>
                </Field>
              )}
              {(f.acuerdo?.modelo==="transaccional"||f.acuerdo?.modelo==="mixto") && (
                <Field label="% por transacción">
                  <NumInput className={inputCls} step="0.1" value={f.acuerdo?.porTx||0} onChange={v=>setF({...f,acuerdo:{...f.acuerdo,porTx:v}})}/>
                </Field>
              )}
              <Field label={`Setup (${m.moneda})`}>
                <NumInput className={inputCls} value={f.acuerdo?.setup||0} onChange={v=>setF({...f,acuerdo:{...f.acuerdo,setup:v}})}/>
              </Field>
              {f.acuerdo?.modelo && (
                <div className="p-3 bg-surface-container rounded-lg text-xs font-mono text-on-surface-variant">
                  Resumen: {f.acuerdo.modelo==="fijo"?`${m.moneda} ${f.acuerdo.fijoMensual||0}/mes`:f.acuerdo.modelo==="transaccional"?`${f.acuerdo.porTx||0}% por tx`:`${m.moneda} ${f.acuerdo.fijoMensual||0}/mes + ${f.acuerdo.porTx||0}% por tx`}
                  {(f.acuerdo.setup||0)>0&&` + ${m.moneda} ${f.acuerdo.setup} setup`}
                </div>
              )}
            </>)}
          </section>
        )}

        {/* FEATURE FLAGS */}
        {tab === "servicios" && (
          <section className="p-5 space-y-3">
            <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-lg text-xs text-on-surface-variant space-y-1">
              <p><b className="text-on-surface">Feature Flags = qué ve y qué puede hacer el usuario</b></p>
              <p>Cada servicio aquí es un <b>flag toggleable por mundo</b>. Si se activa, el app renderiza esa funcionalidad. Si se desactiva, desaparece de la experiencia del usuario.</p>
            </div>
            {(c?.servicios||[]).length === 0 && (
              <div className="p-4 text-center text-on-surface-variant text-sm border border-outline-variant rounded-lg">
                Este módulo no tiene feature flags configurables — sus funciones son siempre activas al habilitar el módulo.
              </div>
            )}
            {(c?.servicios||[]).map((sv, idx) => {
              const svId = typeof sv === "string" ? sv : sv.id;
              const svNombre = typeof sv === "string" ? sv : sv.nombre;
              const svDesc = typeof sv === "object" ? sv.desc : "";
              const dev = getFlagDev(modId, svId);
              const ready = dev.status === "ready";
              const on = ready && f.serviciosActivos?.[svId] !== false;
              const devMeta = DEV_STATUS_META[dev.status] || DEV_STATUS_META.planned;
              return (
                <div key={idx} className={`rounded-xl border overflow-hidden transition-all ${!ready?"border-outline-variant/60 opacity-70":on?"border-secondary/40 bg-secondary-fixed/5":"border-outline-variant"}`}>
                  <label className={`flex items-center gap-3 p-3.5 ${ready?"cursor-pointer":"cursor-not-allowed"}`}>
                    <Toggle checked={on} disabled={!ready} onChange={v => ready && setF({...f, serviciosActivos:{...f.serviciosActivos,[svId]:v}})}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold">{svNombre}</p>
                        {!ready && <span className={`font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border ${devMeta.badge}`}>{devMeta.label}</span>}
                      </div>
                      {svDesc && <p className="text-[11px] text-on-surface-variant mt-0.5">{svDesc}</p>}
                      {getFlagUx(modId, svId) && (
                        <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                          <Icon n="smartphone" className="text-[11px]"/>
                          <span className="font-mono uppercase text-[8px] tracking-wider text-outline mr-0.5">vista en app</span>
                          {getFlagUx(modId, svId)}
                        </p>
                      )}
                      {!ready && <p className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1"><Icon n="lock" className="text-[11px]"/>Disponible cuando el equipo dev complete el desarrollo{dev.api && dev.api!=="propio" ? ` · API: ${dev.api}` : ""}</p>}
                    </div>
                    <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full ${on?"bg-green-100 text-green-700":"bg-surface-container text-outline"}`}>
                      {on ? "ON" : "OFF"}
                    </span>
                  </label>
                </div>
              );
            })}
            {(c?.servicios||[]).length > 0 && (
              <div className="flex gap-2 pt-2 items-center">
                <button className="text-xs text-primary underline" onClick={() => {
                  const all = {...f.serviciosActivos};
                  (c.servicios||[]).forEach(sv=>{ const id = typeof sv==="string"?sv:sv.id; if(getFlagDev(modId,id).status==="ready") all[id]=true; });
                  setF({...f, serviciosActivos: all});
                }}>Activar todos los disponibles</button>
                <span className="text-outline">·</span>
                <button className="text-xs text-on-surface-variant underline" onClick={() => {
                  const none = {};
                  (c.servicios||[]).forEach(sv=>{ const id = typeof sv==="string"?sv:sv.id; none[id]=false; });
                  setF({...f, serviciosActivos: none});
                }}>Desactivar todos</button>
                <span className="ml-auto font-mono text-[9px] text-outline">
                  {(c.servicios||[]).filter(sv=>getFlagDev(modId, typeof sv==="string"?sv:sv.id).status==="ready").length}/{(c.servicios||[]).length} listos para activar
                </span>
              </div>
            )}
          </section>
        )}

        {/* CONFIG FIELDS */}
        {tab === "config" && (
          <section className="p-5 space-y-4">
            <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-lg text-xs text-on-surface-variant">
              Define los <b>parámetros de operación</b> de esta capacidad en este mundo. <b>El pricing se define en el Acuerdo Comercial, no aquí.</b>
            </div>
            {(c?.configFields||[]).length === 0 && (
              <div className="p-4 text-center text-on-surface-variant text-sm border border-outline-variant rounded-lg">
                Este módulo no tiene parámetros adicionales configurables en esta versión.
              </div>
            )}
            {(c?.configFields||[]).map(cf => (
              <ConfigFieldInput key={cf.key} cf={cf}
                value={f.config?.[cf.key] ?? cf.default}
                onChange={v => setF({...f, config:{...f.config,[cf.key]:v}})}
                moneda={m.moneda}/>
            ))}
            {(c?.configFields||[]).some(cf=>cf.nullable) && (
              <p className="text-[10px] text-on-surface-variant italic">Campos con «Sin límite»: dejar vacío para no restringir.</p>
            )}
            {modId === "wallet" && (f.config?.perfilesSuscripcion ?? c.configFields.find(cf=>cf.key==="perfilesSuscripcion")?.default) && (
              <PlanesSuscripcionPanel worldId={mundoId} moneda={m.moneda}/>
            )}
          </section>
        )}

        {/* VISTA APP */}
        {tab === "app" && (
          <section className="p-5 space-y-4">
            <div className="p-3 bg-[#0A1628]/5 border border-[#0A1628]/10 rounded-lg text-xs text-on-surface-variant flex items-start gap-2">
              <Icon n="smartphone" className="text-[16px] text-primary flex-shrink-0 mt-0.5"/>
              <span>Vista dinámica según los <b>Feature Flags activos</b>. Los items en gris están desactivados en este mundo.</span>
            </div>

            {/* Render por feature flag — el puente flag → ux_component → vista (Schema Registry) */}
            {(c?.servicios || []).some(sv => typeof sv === "object" && getFlagUx(modId, sv.id)) && (
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-2">
                  <Icon n="toggle_on" className="text-primary text-[18px]"/> Render por feature flag (estado real de este mundo)
                </p>
                <div className="space-y-1.5">
                  {(c?.servicios || []).filter(sv => typeof sv === "object" && getFlagUx(modId, sv.id)).map(sv => {
                    const dev = getFlagDev(modId, sv.id);
                    const on = dev.status === "ready" && f.serviciosActivos?.[sv.id] !== false;
                    return (
                      <div key={sv.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${on ? "bg-surface" : "bg-surface-container opacity-50"}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${on ? "bg-ok" : "bg-outline"}`}></span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${on ? "" : "line-through text-outline"}`}>{sv.nombre}</p>
                          <p className={`text-[10px] ${on ? "text-primary" : "text-outline"}`}>{getFlagUx(modId, sv.id)}</p>
                        </div>
                        <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${on ? "bg-green-100 text-green-700" : "bg-surface-container text-outline"}`}>{on ? "RENDERIZA" : "OCULTO"}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="font-mono text-[8px] uppercase text-outline mt-2.5">flag → ux_component → vista · publicado en capacity_feature_flags</p>
              </div>
            )}

            {appPreview ? (
              <>
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${appPreview.color}`}>{appPreview.label}</span>
                    Cuando esta capacidad está activa, el usuario ve:
                  </p>
                  <div className="space-y-2">
                    {appPreview.views.map((v, i) => {
                      // Determinar si este view corresponde a un servicio activo
                      const servicios = c?.servicios || [];
                      const svKeys = servicios.map(sv => typeof sv === "string" ? sv : sv.id);
                      // Heurística simple: si todos los servicios están activos, o si el módulo no tiene servicios, mostrar activo
                      const hayServicios = svKeys.length > 0;
                      const svActivos = svKeys.filter(id => f.serviciosActivos?.[id] !== false);
                      const ratio = hayServicios ? svActivos.length / svKeys.length : 1;
                      // Los primeros views van ligados a los primeros servicios activos
                      const active = !hayServicios || i < Math.ceil(ratio * appPreview.views.length);
                      return (
                        <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg transition-all ${active ? "bg-surface" : "bg-surface-container opacity-40"}`}>
                          <span className={`font-black mt-0.5 text-sm ${active ? "text-primary" : "text-outline"}`}>›</span>
                          <span className={`text-xs ${active ? "text-on-surface-variant" : "text-outline line-through"}`}>{v}</span>
                          {!active && <span className="ml-auto font-mono text-[8px] text-outline">desactivado</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Config fields que controlan la UI */}
                {(c?.configFields||[]).filter(cf => ["switch","select"].includes(cf.type)).length > 0 && (
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                    <p className="text-xs font-bold text-on-surface mb-3">Config fields que controlan la UI:</p>
                    <div className="space-y-2">
                      {(c.configFields||[]).filter(cf => ["switch","select"].includes(cf.type)).map(cf => {
                        const val = f.config?.[cf.key] ?? cf.default;
                        return (
                          <div key={cf.key} className="flex items-center gap-2 text-[11px]">
                            <Icon n={cf.type==="switch"?(val?"check_box":"check_box_outline_blank"):"tune"} className={`text-[15px] ${val?"text-primary":"text-outline"}`}/>
                            <span className="text-on-surface-variant flex-1">{cf.label}</span>
                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${cf.type==="switch"?(val?"bg-green-100 text-green-700":"bg-red-50 text-red-500"):"bg-surface-container text-outline"}`}>
                              {cf.type==="switch" ? (val?"Activo":"Inactivo") : String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* API integration note for payment-related modules */}
                {["wallet","comercios","consumos","cashback","credito"].includes(modId) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                    <Icon n="integration_instructions" className="inline mr-1 text-[13px] align-text-top"/>
                    <b>Integración backend:</b> Este módulo se conectará con la API EcoreGateway.
                    {modId==="wallet" && " Endpoints: /wallet/customer, /memberships/transfer, /system-recharge."}
                    {modId==="comercios" && " Endpoints: /merchants/sale, /merchants/pre-sale, /merchants/confirm-sale, /merchants/void."}
                    {modId==="consumos" && " Endpoints: /merchants/session, /memberships/transactions, /settlements."}
                    {modId==="cashback" && " Calculado en backend por RedPontis. API: /memberships/{id}/system-recharge con tipo=cashback."}
                    {modId==="credito" && " Requiere scoring externo. Endpoint: /memberships/{id}/self-update-spending-limit."}
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-on-surface-variant">
                <Icon n="smartphone" className="text-[48px] text-outline mb-3 block mx-auto"/>
                <p className="text-sm">Sin preview configurado para este módulo.</p>
                <p className="text-xs text-outline mt-1">La experiencia en app se generará automáticamente al activar los Feature Flags.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </Drawer>
  );
}

function CanalEmisionRow({ ch, f, setF }) {
  const key = `emision_${ch.id}`;
  const raw = f.config?.[key];
  const cfg = raw === undefined
    ? { enabled: ch.disponible, montoMinOverride: null, montoMaxOverride: null }
    : typeof raw === "boolean"
      ? { enabled: raw, montoMinOverride: null, montoMaxOverride: null }
      : { enabled: raw.enabled !== false, montoMinOverride: raw.montoMinOverride ?? null, montoMaxOverride: raw.montoMaxOverride ?? null };

  const upd = patch => setF({ ...f, config: { ...f.config, [key]: { ...cfg, ...patch } } });
  const clampMin = v => v === "" || v === null ? null : Math.max(Number(v), ch.montoMin);
  const clampMax = v => {
    if (v === "" || v === null) return null;
    const n = Number(v);
    if (ch.montoMax === 0) return n;
    return Math.min(n, ch.montoMax);
  };

  const psp = PSP_PROVIDERS.find(p=>p.id===ch.psp_id);
  const efectivoMin = cfg.montoMinOverride ?? ch.montoMin;
  const efectivoMax = cfg.montoMaxOverride ?? (ch.montoMax || null);

  const CAT_COLOR = {
    billetera_digital: "border-violet-200 bg-violet-50",
    pasarela_pago:     "border-emerald-200 bg-emerald-50",
    transferencia:     "border-gray-200 bg-gray-50",
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${cfg.enabled ? (CAT_COLOR[ch.categoria]||"border-secondary/40") : "border-outline-variant"} ${!ch.disponible?"opacity-40":""}`}>
      <label className="flex items-center gap-3 p-3 cursor-pointer bg-surface-container-low">
        <Toggle checked={cfg.enabled && ch.disponible} disabled={!ch.disponible} onChange={v => upd({ enabled: v })}/>
        <Icon n={ch.icon} className="text-[18px] text-on-surface-variant"/>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium">{ch.nombre}</p>
            <span className="font-mono text-[8px] uppercase text-outline bg-surface-container px-1 rounded">{ch.checkout_type}</span>
            {psp && <span className={`font-mono text-[8px] uppercase px-1 rounded ${psp.api_ready?"text-green-700 bg-green-100":"text-amber-700 bg-amber-100"}`}>{psp.api_ready?"Lista para integrar":"Requiere convenio"}</span>}
          </div>
          <p className="text-[10px] text-on-surface-variant">{ch.desc}</p>
        </div>
        {!ch.disponible && <span className="text-[9px] font-mono text-outline">Próximamente</span>}
      </label>
      {cfg.enabled && ch.disponible && (
        <div className="p-3 bg-surface border-t border-outline-variant/40 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] font-mono uppercase text-on-surface-variant mb-1">Monto mín. (S/) · global S/{ch.montoMin}</p>
            <input type="number" className={inputCls} placeholder={String(ch.montoMin)}
              value={cfg.montoMinOverride ?? ""}
              onChange={e => upd({ montoMinOverride: clampMin(e.target.value) })}/>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase text-on-surface-variant mb-1">Monto máx. (S/) · global {ch.montoMax===0?"sin límite":`S/${ch.montoMax}`}</p>
            <input type="number" className={inputCls} placeholder={ch.montoMax===0?"Sin límite":String(ch.montoMax)}
              value={cfg.montoMaxOverride ?? ""}
              onChange={e => upd({ montoMaxOverride: clampMax(e.target.value) })}/>
          </div>
          <p className="col-span-2 text-[10px] text-on-surface-variant font-mono">
            Rango efectivo en este mundo: S/{efectivoMin} – {efectivoMax ? `S/${efectivoMax}` : "sin límite"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── MicroservicioCard — jerarquía Servicio→Microservicio del storytelling ── */
function MicroservicioCard({ ms, config, defaultsLookup, onChange, moneda }) {
  const depKey = ms.dependsOn ? `${ms.dependsOn.microservicio}_${ms.dependsOn.campo}` : null;
  const depVal = depKey ? (config[depKey] ?? defaultsLookup?.[depKey]) : null;
  const blocked = ms.dependsOn && depVal !== ms.dependsOn.valor;

  return (
    <div className={`rounded-xl border overflow-hidden ${blocked ? "border-outline-variant opacity-60" : "border-violet-200"}`}>
      <div className={`p-3 flex items-center gap-2 ${blocked ? "bg-surface-container-low" : "bg-violet-50"}`}>
        <Icon n={ms.icon} className={`text-[18px] ${blocked ? "text-on-surface-variant" : "text-violet-700"}`}/>
        <div className="flex-1">
          <p className="text-sm font-bold flex items-center gap-1.5">
            {ms.nombre}
            {ms.obligatorio && <span className="font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">Obligatorio</span>}
          </p>
          <p className="text-[11px] text-on-surface-variant">{ms.desc}</p>
        </div>
      </div>

      {blocked ? (
        <div className="p-3 text-[11px] text-on-surface-variant flex items-center gap-1.5">
          <Icon n="lock" className="text-[14px]"/> Requiere que <b>{ms.dependsOn.microservicio}</b> tenga
          <b> {ms.dependsOn.campo} = {ms.dependsOn.valor}</b> para habilitarse.
        </div>
      ) : (
        <div className="p-3 space-y-3 bg-surface">
          {/* Campos normales (switch/select/currency) */}
          {(ms.campos||[]).map(cf => {
            const key = `${ms.id}_${cf.key}`;
            const val = config[key] ?? cf.default;
            if (cf.type === "switch") return (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <Toggle checked={!!val} onChange={v => onChange(key, v)}/>
                <div className="flex-1">
                  <p className="text-xs font-medium">{cf.label}</p>
                  {cf.hint && <p className="text-[10px] text-on-surface-variant">{cf.hint}</p>}
                </div>
              </label>
            );
            if (cf.type === "select") return (
              <Field key={key} label={cf.label}>
                <select className={inputCls} value={val} onChange={e => onChange(key, e.target.value)}>
                  {cf.options.map(o => <option key={o} value={o}>{cf.optionLabels?.[o] || o}</option>)}
                </select>
              </Field>
            );
            if (cf.type === "currency") return (
              <Field key={key} label={cf.label} hint={cf.nullable ? `Vacío = ${cf.nullLabel}` : undefined}>
                <input className={inputCls} type="number" value={val ?? ""} placeholder={cf.nullable ? cf.nullLabel : ""}
                  onChange={e => onChange(key, e.target.value === "" ? null : +e.target.value)}/>
              </Field>
            );
            if (cf.type === "number") return (
              <Field key={key} label={cf.label} hint={cf.hint || (cf.nullable ? `Vacío = ${cf.nullLabel}` : undefined)}>
                <input className={inputCls} type="number" min="0" value={val ?? ""} placeholder={cf.nullable ? (cf.nullLabel||"") : String(cf.default ?? "")}
                  onChange={e => onChange(key, e.target.value === "" ? (cf.nullable?null:0) : +e.target.value)}/>
              </Field>
            );
            if (cf.type === "time") return (
              <Field key={key} label={cf.label} hint={cf.hint}>
                <input className={inputCls} type="time" value={val ?? cf.default ?? ""} onChange={e => onChange(key, e.target.value)}/>
              </Field>
            );
            return null;
          })}

          {/* Caso especial: Recarga tiene "tipos" en vez de "campos" */}
          {(ms.tipos||[]).map(tp => {
            const enabledKey = `recarga_${tp.id}_enabled`;
            const minKey = `recarga_${tp.id}_min`;
            const maxKey = `recarga_${tp.id}_max`;
            const enabled = config[enabledKey] ?? false;
            return (
              <div key={tp.id} className={`rounded-lg border ${enabled ? "border-primary/40" : "border-outline-variant"}`}>
                <label className="flex items-center gap-3 p-2.5 cursor-pointer">
                  <Toggle checked={enabled} onChange={v => onChange(enabledKey, v)}/>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{tp.nombre}</p>
                    <p className="text-[10px] text-on-surface-variant">{tp.hint}</p>
                  </div>
                </label>
                {enabled && (
                  <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-2">
                    <input className={`${inputCls} text-xs`} type="number" placeholder={`Mín. (${moneda})`}
                      value={config[minKey] ?? ""} onChange={e => onChange(minKey, e.target.value === "" ? null : +e.target.value)}/>
                    <input className={`${inputCls} text-xs`} type="number" placeholder={`Máx. (${moneda}) — vacío=sin límite`}
                      value={config[maxKey] ?? ""} onChange={e => onChange(maxKey, e.target.value === "" ? null : +e.target.value)}/>
                  </div>
                )}
              </div>
            );
          })}

          {/* Efectos por plataforma */}
          {ms.efectos && (
            <div className="pt-2 border-t border-outline-variant/50 flex flex-wrap gap-1.5">
              {Object.entries(ms.efectos).map(([plat, txt]) => (
                <span key={plat} title={txt} className="font-mono text-[8px] uppercase bg-surface-container-low text-on-surface-variant px-1.5 py-0.5 rounded cursor-help">
                  {{app:"App Usuario", mundo:"Mundo (BO)", pos:"POS"}[plat] || plat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ConfigFieldInput — renders a single configField by type ─────────── */
function ConfigFieldInput({ cf, value, onChange, moneda = "PEN" }) {
  const isNull = value === null || value === undefined || value === "";
  const cur = isNull ? cf.default : value;

  const clearable = cf.nullable;
  const setNull = () => onChange(null);
  const unsetNull = () => onChange(cf.default);

  const label = (
    <div className="flex items-start justify-between mb-1.5">
      <div className="flex-1">
        <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant leading-tight">{cf.label}</label>
        {cf.hint && <p className="text-[10px] text-outline mt-0.5">{cf.hint}</p>}
      </div>
      {clearable && (
        <button onClick={isNull ? unsetNull : setNull}
          className="ml-2 text-[10px] text-primary underline flex-shrink-0">
          {isNull ? "Definir valor" : `Usar «${cf.nullLabel || "Sin límite"}»`}
        </button>
      )}
    </div>
  );

  if (clearable && isNull) {
    return (
      <div className="space-y-1">
        {label}
        <div className="h-10 px-3 bg-surface-container border border-outline-variant/50 rounded-lg flex items-center text-sm text-outline italic">
          {cf.nullLabel || "Sin límite"}
        </div>
      </div>
    );
  }

  if (cf.type === "switch") return (
    <div>
      {label}
      <label className="flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant rounded-lg cursor-pointer">
        <Toggle checked={!!cur} onChange={onChange}/>
        <span className="text-sm text-on-surface-variant flex-1">{!!cur ? "Activado" : "Desactivado"}</span>
        <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full ${!!cur ? "bg-green-100 text-green-700" : "bg-surface-container text-outline"}`}>
          {!!cur ? "ON" : "OFF"}
        </span>
      </label>
    </div>
  );

  if (cf.type === "select") return (
    <div>
      {label}
      <select className={inputCls} value={cur ?? ""} onChange={e => onChange(e.target.value)}>
        {(cf.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  if (cf.type === "number") return (
    <div>
      {label}
      <input className={inputCls} type="number" value={cur ?? ""} placeholder={String(cf.default ?? "")}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}/>
    </div>
  );

  if (cf.type === "percent") return (
    <div>
      {label}
      <div className="relative">
        <input className={`${inputCls} pr-8`} type="number" step="0.1" min="0" max="100"
          value={cur ?? ""} placeholder={String(cf.default ?? "")}
          onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}/>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-bold">%</span>
      </div>
    </div>
  );

  if (cf.type === "currency") return (
    <div>
      {label}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-semibold">{moneda}</span>
        <input className={`${inputCls} pl-10`} type="number" step="0.01" min="0"
          value={cur ?? ""} placeholder={String(cf.default ?? "")}
          onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}/>
      </div>
    </div>
  );

  if (cf.type === "time") return (
    <div>
      {label}
      <input className={inputCls} type="time" value={cur ?? ""} onChange={e => onChange(e.target.value || null)}/>
    </div>
  );

  if (cf.type === "timerange") return (
    <div>
      {label}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] font-mono uppercase text-outline mb-1">Desde</p>
          <input className={inputCls} type="time" value={(cur||"").split("-")[0]?.trim()||""}
            onChange={e => {
              const parts = (cur||"08:00-20:00").split("-");
              onChange(`${e.target.value}-${parts[1]?.trim()||"20:00"}`);
            }}/>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase text-outline mb-1">Hasta</p>
          <input className={inputCls} type="time" value={(cur||"").split("-")[1]?.trim()||""}
            onChange={e => {
              const parts = (cur||"08:00-20:00").split("-");
              onChange(`${parts[0]?.trim()||"08:00"}-${e.target.value}`);
            }}/>
        </div>
      </div>
    </div>
  );

  // default: text
  return (
    <div>
      {label}
      <input className={inputCls} type="text" value={cur ?? ""} placeholder={String(cf.default ?? "")}
        onChange={e => onChange(e.target.value)}/>
    </div>
  );
}

/* ── TabActores (Merchants + Organizadores + Sponsors) ────────────── */
function TabComercios({ m, comercios }) {
  const [actorTab, setActorTab] = useState("comercios");
  const ACTOR_TABS = [
    { id:"comercios",    label:"Merchants",     icon:"storefront",          count:comercios.length },
    { id:"organizadores",label:"Organizadores", icon:"confirmation_number", count:0 },
    { id:"sponsors",     label:"Sponsors",      icon:"campaign",            count:0 },
  ];
  return (
    <div>
      <div className="flex gap-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-1 mb-6 w-fit">
        {ACTOR_TABS.map(t => (
          <button key={t.id} onClick={() => setActorTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${actorTab===t.id?"bg-surface-container text-on-surface shadow-sm":"text-on-surface-variant hover:bg-surface-container/40"}`}>
            <Icon n={t.icon} className="text-[16px]"/>
            {t.label}
            {t.count > 0 && <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>
      {actorTab === "comercios"    && <ActoresMerchants m={m} comercios={comercios}/>}
      {actorTab === "organizadores"&& <ActoresOrganizadores m={m}/>}
      {actorTab === "sponsors"     && <ActoresSponsors m={m}/>}
    </div>
  );
}

const BANCOS_PE = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Banco de la Nación", "Otro"];

function ActoresMerchants({ m, comercios }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [eliminando, setEliminando] = useState(null); // comercio en flujo de eliminación
  const [entregando, setEntregando] = useState(null); // comercio en flujo de entrega de panel
  const [devices, setDevices] = useState(null);
  const [volumenTxs, setVolumenTxs] = useState(null);
  React.useEffect(() => {
    fetchPosDevicesDeMundo(m.id).then(setDevices).catch(() => setDevices([]));
    fetchVolumenPorComercioMundo(m.id).then(setVolumenTxs).catch(() => setVolumenTxs([]));
  }, [m.id]);
  const hardwareDe = mid => (devices || []).filter(d => d.merchant_id === mid);
  const volumenDe = mid => (volumenTxs || []).filter(t => t.merchant_id === mid).reduce((a, t) => a + (+t.amount || 0), 0);
  const blank = {
    nombre:"", rubro: rubrosDeVertical(m.vertical)[0]?.id || "otro", tarifa:1.5, fijoTx:0.10, pos:1,
    ruc:"", razonSocial:"", direccionFiscal:"",
    apoderadoNombre:"", apoderadoDocumento:"", apoderadoCorreo:"",
    contactoNombre:"", contactoDocumento:"", contactoCorreo:"",
    banco: BANCOS_PE[0], cuentaBancaria:"", cci:"",
  };
  const [f, setF] = useState(blank);

  const save = () => {
    const localId = uid("com");
    update(st => {
      if (!st.comercios) st.comercios = [];
      st.comercios.push({ id:localId, mundoId:m.id, ...f, tarifa:+f.tarifa, fijoTx:+f.fijoTx, pos:+f.pos, posSolicitados:+f.pos, estado:"ACTIVO", createdAt:Date.now() });
    });
    // Alta remota: la superapp muestra el comercio del mundo al instante.
    addMerchantRemote(m.id, f).then(supabaseId => {
      if (supabaseId) {
        update(st => {
          const c = (st.comercios||[]).find(x => x.id === localId);
          if (c) c.supabaseId = supabaseId;
        });
        notify("Comercio habilitado.");
      } else {
        notify("Comercio guardado localmente, pero no se pudo publicar en la app.", "error");
      }
    }).catch(e => notify(`Comercio guardado localmente, pero no se pudo publicar: ${e.message}`, "error"));
    setF(blank); setOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-on-surface-variant max-w-2xl">Carga de merchants del mundo <b>{m.nombre}</b>. Cada uno obtiene su frente dedicado y sus POS se consolidan en el Dashboard.</p>
        <BtnPrimary onClick={() => setOpen(true)}><Icon n="add" className="text-[18px]"/> Nuevo Merchant</BtnPrimary>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              <th className="p-4 font-medium">Comercio</th>
              <th className="p-4 font-medium">Código</th>
              <th className="p-4 font-medium">Rubro</th>
              <th className="p-4 font-medium">Tarifa</th>
              <th className="p-4 font-medium">Hardware asignado</th>
              <th className="p-4 font-medium">Volumen real (ref.)</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium text-right">Panel del Merchant</th>
              <th className="p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {comercios.length === 0
              ? <tr><td colSpan="9" className="p-8 text-center text-on-surface-variant text-sm">Aún no hay comercios cargados en este mundo.</td></tr>
              : comercios.map(c => {
                const merchantId = c.supabaseId || c.id;
                const hw = hardwareDe(merchantId);
                return (
                <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 font-semibold">{c.nombre}</td>
                  <td className="p-4 font-mono text-xs text-on-surface-variant">{c.codigo || "—"}</td>
                  <td className="p-4 text-on-surface-variant">{rubroNombre(c.rubro)}</td>
                  <td className="p-4 font-mono text-xs">{c.tarifa}% + {m.moneda} {Number(c.fijoTx||0).toFixed(2)}</td>
                  <td className="p-4">
                    {devices === null ? <span className="text-on-surface-variant text-xs">…</span> : hw.length === 0 ? (
                      <span className="font-mono text-[10px] text-tertiary">{c.posSolicitados > 0 ? `${c.posSolicitados} solicitado(s), sin asignar` : "sin asignar"}</span>
                    ) : (
                      <span className="font-mono text-xs">{hw.length} asignado{hw.length !== 1 ? "s" : ""} <span className="text-on-surface-variant">({hw.filter(d => d.estado === "asignado").length} activo{hw.filter(d => d.estado === "asignado").length !== 1 ? "s" : ""})</span></span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs">{volumenTxs === null ? "…" : `${m.moneda} ${volumenDe(merchantId).toFixed(2)}`}</td>
                  <td className="p-4"><Pill color={c.estado === "ACTIVO" ? "bg-ok" : "bg-outline"}>{c.estado}</Pill></td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {!c.entregado && <span className="font-mono text-[10px] text-tertiary">Sin credenciales</span>}
                      <button onClick={() => setEntregando(c)} title={c.entregado ? "Ver / reenviar credenciales" : "Entregar panel al merchant"}
                        className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                        <Icon n={c.entregado ? "key" : "local_shipping"} className="text-[16px]"/> {c.entregado ? "Credenciales" : "Entregar panel"}
                      </button>
                      <button onClick={() => nav(`/comercio/${c.id}`)} className="text-primary text-sm font-medium hover:underline">Abrir →</button>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setEliminando(c)} title="Deshabilitar / Eliminar comercio"
                      className="p-1.5 rounded-lg border border-error/30 text-error hover:bg-error-container/20 transition-colors">
                      <Icon n="delete" className="text-[16px]"/>
                    </button>
                  </td>
                </tr>
              );})
            }
          </tbody>
        </table>
      </div>
      {eliminando && <EliminarComercioDialog m={m} comercio={eliminando} onClose={() => setEliminando(null)} />}
      {entregando && <EntregaMerchantDrawer comercio={entregando} m={m} open={true} onClose={() => setEntregando(null)} />}
      <div className="mt-4 bg-surface-container-low border border-outline-variant rounded-lg p-4 text-xs text-on-surface-variant flex gap-2">
        <Icon n="info" className="text-secondary text-[18px] flex-shrink-0"/>
        <span>El "Hardware asignado" y el "Volumen real" son datos reales (pos_devices y transacciones del comercio). La liquidación formal, en cambio, se calcula hoy en <b>lote agregado por mundo</b> (pestaña Liquidación de RedPontis), no desglosada por comercio — el motor no reparte el neto entre comercios individuales todavía.</span>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} icon="storefront" title="Alta de Merchant" subtitle={`Mundo: ${m.nombre}`} width="w-[560px]"
        footer={<><BtnOutline onClick={() => setOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!f.nombre || !f.ruc || !f.razonSocial} onClick={save}>Habilitar merchant</BtnPrimary></>}>
        <div className="space-y-5">
          <Field label="Nombre comercial"><input className={inputCls} value={f.nombre} onChange={e => setF({...f, nombre:e.target.value})} placeholder="Ej. Cafetería Norte"/></Field>
          <Field label="Rubro" hint={`Filtrado por vertical del mundo: ${m.vertical}`}>
            <select className={inputCls} value={f.rubro} onChange={e => setF({...f, rubro:e.target.value})}>
              {rubrosDeVertical(m.vertical).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tarifa MDR (%)"><input className={inputCls} type="number" step="0.1" value={f.tarifa} onChange={e => setF({...f, tarifa:e.target.value})}/></Field>
            <Field label={`Fijo por Tx (${m.moneda})`}><input className={inputCls} type="number" step="0.01" value={f.fijoTx} onChange={e => setF({...f, fijoTx:e.target.value})}/></Field>
          </div>
          <Field label="POS solicitados" hint="La solicitud se consolida en el Dashboard del Mundo.">
            <input className={inputCls} type="number" min="0" value={f.pos} onChange={e => setF({...f, pos:e.target.value})}/>
          </Field>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="balance" className="text-[16px] text-secondary"/> Datos legales <span className="text-error">*</span>
            </p>
            <div className="space-y-3">
              <Field label="Razón social"><input className={inputCls} value={f.razonSocial} onChange={e => setF({...f, razonSocial:e.target.value})} placeholder="Razón social completa"/></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RUC"><input className={`${inputCls} font-mono`} value={f.ruc} onChange={e => setF({...f, ruc:e.target.value})} placeholder="20XXXXXXXXX"/></Field>
                <Field label="Dirección fiscal"><input className={inputCls} value={f.direccionFiscal} onChange={e => setF({...f, direccionFiscal:e.target.value})} placeholder="Av. ..."/></Field>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="gavel" className="text-[16px] text-secondary"/> Apoderado
            </p>
            <div className="space-y-3">
              <Field label="Nombre completo"><input className={inputCls} value={f.apoderadoNombre} onChange={e => setF({...f, apoderadoNombre:e.target.value})} placeholder="Nombre y apellidos"/></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Documento"><input className={`${inputCls} font-mono`} value={f.apoderadoDocumento} onChange={e => setF({...f, apoderadoDocumento:e.target.value})} placeholder="DNI / CE"/></Field>
                <Field label="Correo"><input className={inputCls} type="email" value={f.apoderadoCorreo} onChange={e => setF({...f, apoderadoCorreo:e.target.value})} placeholder="apoderado@empresa.com"/></Field>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="support_agent" className="text-[16px] text-secondary"/> Contacto comercial
            </p>
            <div className="space-y-3">
              <Field label="Nombre completo"><input className={inputCls} value={f.contactoNombre} onChange={e => setF({...f, contactoNombre:e.target.value})} placeholder="Nombre y apellidos"/></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Documento"><input className={`${inputCls} font-mono`} value={f.contactoDocumento} onChange={e => setF({...f, contactoDocumento:e.target.value})} placeholder="DNI / CE"/></Field>
                <Field label="Correo"><input className={inputCls} type="email" value={f.contactoCorreo} onChange={e => setF({...f, contactoCorreo:e.target.value})} placeholder="contacto@empresa.com"/></Field>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="account_balance" className="text-[16px] text-secondary"/> Datos bancarios
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Banco">
                <select className={inputCls} value={f.banco} onChange={e => setF({...f, banco:e.target.value})}>
                  {BANCOS_PE.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="N° de cuenta"><input className={`${inputCls} font-mono`} value={f.cuentaBancaria} onChange={e => setF({...f, cuentaBancaria:e.target.value})} placeholder="000-000000-0-00"/></Field>
              <Field label="CCI"><input className={`${inputCls} font-mono`} value={f.cci} onChange={e => setF({...f, cci:e.target.value})} placeholder="00200000000000000000"/></Field>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// Corte teórico más reciente según liquidacion_horaCorte del mundo. No existe
// un lote de liquidación cerrado y persistido por comercio en ningún lado del
// sistema (generarLiquidaciones simula el volumen del mundo, no lee
// transacciones reales) — este corte teórico es el proxy más honesto
// disponible para "¿tiene este comercio ventas que aún no pasaron por un
// ciclo de liquidación?".
function ultimoCorteISO(horaCorte) {
  const [hh, mm] = (horaCorte || "19:00").split(":").map(Number);
  const now = new Date();
  const corteHoy = new Date(now); corteHoy.setHours(hh, mm || 0, 0, 0);
  const corte = now >= corteHoy ? corteHoy : new Date(corteHoy.getTime() - 24 * 60 * 60 * 1000);
  return corte.toISOString();
}

/* ── Eliminación segura de Comercio (nuevo, 29-jul): antes solo existía dar
   de alta, nunca baja. Flujo guiado en 3 pasos — deshabilitar primero (para
   de admitir compras nuevas de inmediato), verificar pendientes reales
   (BNPL activo, ventas del corte aún no liquidadas, reservas de Menú a
   futuro, hardware asignado como aviso no bloqueante), y solo entonces
   habilitar la eliminación definitiva con confirmación por nombre. ────── */
function EliminarComercioDialog({ m, comercio, onClose }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const [estado, setEstado] = useState(comercio.estado);
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState(null);

  const horaCorte = liquidacionConfigDe(m).horaCorte;

  const correrChequeo = () => {
    setChecking(true); setErr(null);
    verificarBloqueosEliminacionMerchant(m.id, merchantId, ultimoCorteISO(horaCorte))
      .then(setCheck)
      .catch(e => setErr(e.message))
      .finally(() => setChecking(false));
  };

  React.useEffect(() => {
    if (estado === "INACTIVO") correrChequeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deshabilitar = async () => {
    setBusy(true);
    try {
      await actualizarEstadoMerchantRemote(merchantId, "suspendido");
      update(st => { const c = (st.comercios||[]).find(x => x.id === comercio.id); if (c) c.estado = "INACTIVO"; });
      setEstado("INACTIVO");
      notify(`${comercio.nombre} deshabilitado — deja de admitir compras nuevas de inmediato.`);
      correrChequeo();
    } catch (e) { notify(`No se pudo deshabilitar: ${e.message}`, "error"); }
    finally { setBusy(false); }
  };

  const eliminar = async () => {
    setBusy(true);
    try {
      await eliminarMerchantRemote(merchantId);
      update(st => { st.comercios = (st.comercios||[]).filter(x => x.id !== comercio.id); });
      notify(`${comercio.nombre} eliminado definitivamente.`);
      onClose();
    } catch (e) { notify(`No se pudo eliminar: ${e.message}`, "error"); }
    finally { setBusy(false); }
  };

  const puedeEliminar = estado === "INACTIVO" && check && !check.bloqueaDuro;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-error-container flex items-center justify-center"><Icon n="delete_forever" className="text-error text-[24px]" /></div>
          <div>
            <h3 className="font-semibold">Eliminar comercio</h3>
            <p className="font-mono text-[10px] uppercase text-on-surface-variant">{comercio.nombre} · {m.nombre}</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <StepRow n={1} done={estado === "INACTIVO"} title="Deshabilitar — deja de admitir compras nuevas">
            {estado === "ACTIVO" ? (
              <BtnPrimary disabled={busy} onClick={deshabilitar}>{busy ? "Deshabilitando…" : "Deshabilitar comercio"}</BtnPrimary>
            ) : <p className="text-xs text-ok flex items-center gap-1"><Icon n="check_circle" className="text-[14px]"/> Deshabilitado — ya no aparece en la app.</p>}
          </StepRow>

          <StepRow n={2} done={!!check && !check.bloqueaDuro} active={estado === "INACTIVO"} title="Verificar pendientes (BNPL, liquidación, reservas)">
            {estado !== "INACTIVO" ? (
              <p className="text-xs text-on-surface-variant italic">Disponible tras deshabilitar.</p>
            ) : checking ? (
              <p className="text-xs text-on-surface-variant">Verificando…</p>
            ) : err ? (
              <p className="text-xs text-error">{err}</p>
            ) : check ? (
              <div className="space-y-1.5">
                <ChequeoRow ok={check.bnplActivos === 0} label={`Financiamientos BNPL activos: ${check.bnplActivos}`} />
                <ChequeoRow ok={check.ventasPendientes.count === 0}
                  label={`Ventas desde el corte de las ${horaCorte} aún no liquidadas: ${check.ventasPendientes.count} (${m.moneda} ${check.ventasPendientes.monto.toFixed(2)})`} />
                <ChequeoRow ok={check.reservasFuturas.count === 0}
                  label={`Reservas de Menú confirmadas a futuro: ${check.reservasFuturas.count}`} />
                <ChequeoRow ok warn={check.hardwareAsignado > 0}
                  label={`Equipos POS asignados: ${check.hardwareAsignado}${check.hardwareAsignado ? " (reasignar aparte — no bloquea la eliminación)" : ""}`} />
                <button onClick={correrChequeo} className="text-[10px] text-primary font-semibold">↻ Volver a verificar</button>
              </div>
            ) : null}
          </StepRow>

          <StepRow n={3} done={false} active={puedeEliminar} title="Confirmar eliminación definitiva (irreversible)">
            {!puedeEliminar ? (
              <p className="text-xs text-on-surface-variant italic">Resuelve los pendientes del paso 2 primero.</p>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant mb-2">Escribe el nombre del comercio para confirmar: <b>{comercio.nombre}</b></p>
                <input className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm mb-1 focus:ring-2 focus:ring-error/20 focus:border-error outline-none" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={comercio.nombre} />
              </>
            )}
          </StepRow>
        </div>

        <div className="flex gap-3 justify-end">
          <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
          {puedeEliminar && (
            <button disabled={confirm !== comercio.nombre || busy} onClick={eliminar} className="px-4 py-2 rounded-lg bg-error text-white text-sm font-medium disabled:opacity-40 hover:bg-error/90 transition-colors">
              {busy ? "Eliminando…" : "Sí, eliminar comercio"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRow({ n, title, done, active = true, children }) {
  return (
    <div className={`p-3 rounded-lg border ${done ? "border-ok/30 bg-ok/5" : active ? "border-outline-variant" : "border-outline-variant/40 opacity-60"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${done ? "bg-ok text-white" : "bg-outline-variant text-on-surface-variant"}`}>{done ? "✓" : n}</span>
        <p className="text-xs font-semibold text-on-surface">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ChequeoRow({ ok, warn, label }) {
  const color = warn ? "text-tertiary" : ok ? "text-ok" : "text-error";
  const icon = warn ? "info" : ok ? "check_circle" : "cancel";
  return (
    <div className={`flex items-start gap-1.5 text-[11px] ${color}`}>
      <Icon n={icon} className="text-[14px] flex-shrink-0 mt-0.5"/>
      <span>{label}</span>
    </div>
  );
}

/* ── Organizadores — entidad real con login propio (cierra Gantt Kermesse
   #62 "Designar organizador(es)", antes bloqueado por falta de esta pieza) */
function ActoresOrganizadores({ m }) {
  const modoB2B = modosDeMundo(m).includes("b2b");
  const [organizadores, setOrganizadores] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nombre: "", entidadLegal: "", ruc: "" });
  const [creando, setCreando] = useState(false);
  const [credencialesNuevas, setCredencialesNuevas] = useState(null);

  const load = () => fetchOrganizadoresRemote(m.id).then(r => setOrganizadores(r || [])).catch(() => setOrganizadores([]));
  React.useEffect(() => { load(); }, [m.id]);

  const slugUsuario = (nombre) => nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 20) || "organizador";

  const crear = async () => {
    if (!f.nombre.trim()) return;
    setCreando(true);
    try {
      const usuario = `${slugUsuario(f.nombre)}@organizadores.joi360.pe`;
      const password = generarPassword();
      const remoto = await crearOrganizadorRemote(m.id, f.nombre.trim(), f.entidadLegal || null, f.ruc || null, usuario, password);
      // Espejo local con credenciales — mismo patrón demo-auth que merchants/sponsors.
      update(s => {
        if (!s.organizadores) s.organizadores = [];
        s.organizadores.push({ id: remoto?.id || uid("org"), supabaseId: remoto?.id, mundoId: m.id, nombre: f.nombre.trim(), entidadLegal: f.entidadLegal, ruc: f.ruc, credenciales: { usuario, password }, estado: "activo", createdAt: Date.now() });
      });
      setCredencialesNuevas({ nombre: f.nombre.trim(), usuario, password });
      setF({ nombre: "", entidadLegal: "", ruc: "" });
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "organizador-crear", m.id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setCreando(false); }
  };

  const desactivar = async (org) => {
    try {
      await desactivarOrganizadorRemote(org.id);
      update(s => { const local = (s.organizadores || []).find(o => o.supabaseId === org.id || o.id === org.id); if (local) local.estado = "inactivo"; });
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "organizador-desactivar", m.id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };

  if (!modoB2B) return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <h3 className="font-semibold">Organizadores</h3>
        <p className="text-xs text-on-surface-variant mt-0.5">Personas o entidades que gestionan eventos dentro de este mundo.</p>
      </div>
      <div className="px-6 py-12 text-center">
        <Icon n="confirmation_number" className="text-outline text-[40px] mb-3"/>
        <p className="font-medium text-on-surface-variant">Modo B2B no habilitado</p>
        <p className="text-xs text-outline mt-1">Activa el criterio <b>B2B</b> en la pestaña Eventos para poder registrar organizadores.</p>
      </div>
    </div>
  );

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Organizadores</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Cada uno tiene su propio login al Dashboard B2B y solo ve sus propios eventos.</p>
        </div>
        <BtnPrimary onClick={() => { setCredencialesNuevas(null); setOpen(true); }}><Icon n="add" className="text-[18px]"/> Nuevo organizador</BtnPrimary>
      </div>
      {organizadores === null ? (
        <p className="px-6 py-8 text-sm text-on-surface-variant">Cargando…</p>
      ) : organizadores.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Icon n="confirmation_number" className="text-outline text-[40px] mb-3"/>
          <p className="font-medium text-on-surface-variant">Sin organizadores todavía</p>
          <p className="text-xs text-outline mt-1">Regístralo y podrá gestionar sus propios eventos B2B desde su panel.</p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/60">
          {organizadores.map(o => (
            <div key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold">{o.nombre[0]}</div>
                <div>
                  <p className="font-semibold text-sm">{o.nombre}</p>
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase">{o.entidad_legal || "sin entidad legal"}{o.ruc ? ` · RUC ${o.ruc}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill color={o.estado === "activo" ? "bg-ok" : "bg-outline"}>{o.estado.toUpperCase()}</Pill>
                {o.estado === "activo" && (
                  <button onClick={() => desactivar(o)} className="text-xs text-error hover:underline">Desactivar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} icon="business_center" title="Nuevo organizador" subtitle={m.nombre}
        footer={credencialesNuevas ? <BtnPrimary onClick={() => setOpen(false)}>Listo</BtnPrimary> :
          <><BtnOutline onClick={() => setOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!f.nombre.trim()} loading={creando} loadingLabel="Creando…" onClick={crear}>Crear organizador</BtnPrimary></>}>
        {credencialesNuevas ? (
          <div className="space-y-4">
            <div className="p-4 bg-ok/10 border border-ok/30 rounded-xl text-center">
              <Icon n="check_circle" fill className="text-ok text-[32px] block mx-auto mb-2"/>
              <p className="font-semibold">{credencialesNuevas.nombre} registrado</p>
              <p className="text-xs text-on-surface-variant">Entrégale estas credenciales para su Dashboard B2B.</p>
            </div>
            <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-outline">Usuario</span><span>{credencialesNuevas.usuario}</span></div>
              <div className="flex justify-between"><span className="text-outline">Contraseña</span><span>{credencialesNuevas.password}</span></div>
            </div>
            <p className="text-xs text-on-surface-variant">Panel: <code>/organizador/{m.id}</code></p>
          </div>
        ) : (
          <div className="space-y-5">
            <Field label="Nombre del organizador *"><input className={inputCls} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. APAFA Colegio Raimondi"/></Field>
            <Field label="Entidad legal"><input className={inputCls} value={f.entidadLegal} onChange={e => setF({ ...f, entidadLegal: e.target.value })} placeholder="Ej. Asociación de Padres de Familia"/></Field>
            <Field label="RUC"><input className={inputCls} value={f.ruc} onChange={e => setF({ ...f, ruc: e.target.value })} placeholder="20XXXXXXXXX"/></Field>
            <p className="text-xs text-on-surface-variant">Se generará usuario y contraseña automáticamente al crear.</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function ActoresSponsors({ m }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low">
        <h3 className="font-semibold">Sponsors</h3>
        <p className="text-xs text-on-surface-variant mt-0.5">Marcas o empresas que patrocinan activaciones y campañas en este mundo.</p>
      </div>
      <div className="px-6 py-12 text-center">
        <Icon n="campaign" className="text-outline text-[40px] mb-3"/>
        <p className="font-medium text-on-surface-variant">Sin sponsors</p>
        <p className="text-xs text-outline mt-1">Los sponsors gestionan campañas, beneficios y activaciones desde un panel dedicado.</p>
        <p className="text-xs text-outline mt-2 font-mono">Disponible en R1 — Gestión de actores multi-rol</p>
      </div>
    </div>
  );
}

const ACUERDO_LABELS = {
  transaccional: { t: "Transaccional puro", d: "Solo % sobre volumen procesado. Sin fijos." },
  revenue: { t: "Revenue puro", d: "Fee fijo mensual. Sin variable." },
  mixto: { t: "Mixto", d: "Fijo mensual + % transaccional." },
  fijo: { t: "Venta fija", d: "Pago único o periódico cerrado. Sin variable." },
};
const FRECUENCIA_LABELS = { diaria: "Diaria", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" };

function ModeloRow({ k, v }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <p className="font-mono text-[10px] text-outline uppercase pt-0.5 flex-shrink-0">{k}</p>
      <p className="text-right text-sm">{v}</p>
    </div>
  );
}

/* ── TabAcuerdo — Acuerdo Comercial del mundo (Sheet 10) ─────────────── */
function TabAcuerdo({ m }) {
  const comerciosMod = (m.modulos || []).find(x => x.id === "comercios");
  const cfg = comerciosMod?.config || {};
  const acuerdo = m.acuerdo || null;
  const [f, setF] = useState({
    mdrDefault: cfg.mdrDefault ?? 1.5,
    fijoTxDefault: cfg.fijoTxDefault ?? 0.10,
    modeloRecaudacion: cfg.liquidacion_modeloRecaudacion || "redpontis",
    settlementFrequency: cfg.settlementFrequency || "semanal",
    retentionPercentage: cfg.retentionPercentage ?? 0,
    validFrom: cfg.validFrom || new Date().toISOString().slice(0, 10),
    validUntil: cfg.validUntil || "",
  });
  const [dirty, setDirty] = useState(false);
  const set = patch => { setF({ ...f, ...patch }); setDirty(true); };

  // Todo se guarda dentro de comerciosMod.config — es lo único de este tab que
  // syncAllWorlds() realmente sube a Supabase (world_capacity_configs.config).
  // Antes: frecuencia/retención/vigencia se guardaban en mundo.acuerdoComercial,
  // un campo que ningún sync lee — se perdían silenciosamente al recargar desde
  // otra sesión. modeloRecaudacion reusa la misma key que el tab Microservicios
  // (liquidacion_modeloRecaudacion) para que ambas vistas queden sincronizadas.
  const save = () => {
    update(st => {
      const mundo = st.mundos.find(x => x.id === m.id);
      const com = (mundo.modulos || []).find(x => x.id === "comercios");
      if (com) {
        com.config.mdrDefault = +f.mdrDefault;
        com.config.fijoTxDefault = +f.fijoTxDefault;
        com.config.liquidacion_modeloRecaudacion = f.modeloRecaudacion;
        com.config.settlementFrequency = f.settlementFrequency;
        com.config.retentionPercentage = +f.retentionPercentage;
        com.config.validFrom = f.validFrom;
        com.config.validUntil = f.validUntil || null;
      }
    });
    notify("Tarifas de merchant guardadas");
    setDirty(false);
  };

  const label = acuerdo ? (ACUERDO_LABELS[acuerdo.tipo] || { t: acuerdo.tipo, d: "" }) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modelo comercial real, tal como quedó grabado en la creación del
            mundo (m.acuerdo) — es el mismo objeto que usa el motor de
            Liquidación (procesarLiquidacionMundo), no un cálculo aparte. */}
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
          <h4 className="flex items-center gap-2 font-semibold border-b border-outline-variant/50 pb-2 mb-3">
            <Icon n="handshake" className="text-outline text-[20px]" /> Modelo comercial
          </h4>
          {!acuerdo ? (
            <p className="text-sm text-on-surface-variant">
              Este mundo no tiene un acuerdo comercial grabado — fue creado antes de que este paso existiera en el asistente, o quedó incompleto. Contacta a Plataforma para completarlo.
            </p>
          ) : (
            <div className="space-y-2">
              <ModeloRow k="Tipo" v={<><b className="text-primary uppercase">{label.t}</b>{label.d && <span className="block text-[11px] text-on-surface-variant font-normal normal-case mt-0.5">{label.d}</span>}</>} />
              {(acuerdo.tipo === "transaccional" || acuerdo.tipo === "mixto") && <ModeloRow k="Revenue share" v={`${acuerdo.revShare}%`} />}
              {(acuerdo.tipo === "revenue" || acuerdo.tipo === "mixto" || acuerdo.tipo === "fijo") && <ModeloRow k={acuerdo.tipo === "fijo" ? "Monto cerrado" : "Fijo mensual"} v={`${m.moneda} ${acuerdo.fijoMensual}`} />}
              <ModeloRow k="Setup" v={`${m.moneda} ${acuerdo.setup}`} />
              <ModeloRow k="Vigencia" v={acuerdo.vigencia} />
              <ModeloRow k="Frecuencia de liquidación" v={FRECUENCIA_LABELS[acuerdo.frecuenciaLiquidacion] || acuerdo.frecuenciaLiquidacion} />
            </div>
          )}
          <p className="text-[10px] text-on-surface-variant mt-3 italic">
            Este es el modelo que corre en Liquidación. Para cambiarlo (revenue share, fijo, vigencia) contacta a Plataforma — no es autoservicio desde aquí para evitar desalinear liquidaciones ya generadas.
          </p>
        </div>

        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
          <h4 className="flex items-center gap-2 font-semibold border-b border-outline-variant/50 pb-2 mb-3">
            <Icon n="description" className="text-outline text-[20px]" /> Contrato
          </h4>
          <p className="text-[11px] text-on-surface-variant mb-3">
            El PDF subido aquí es el contrato real firmado con el sponsor. Reemplaza cualquier borrador generado automáticamente.
          </p>
          <ContratoControl m={m} />
        </div>
      </div>

      {!comerciosMod ? (
        <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant text-center">
          <Icon n="storefront" className="text-[32px] text-on-surface-variant mb-2"/>
          <p className="text-sm text-on-surface-variant">
            Este mundo no tiene la capacidad <b>Comercios</b> activa, así que no hay tarifas de merchant que configurar. Actívala en la pestaña Capacidades si el mundo va a tener comercios propios.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs font-mono uppercase text-outline">Tarifas a merchants de este mundo</p>
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
            <p className="text-xs font-bold text-on-surface mb-1 flex items-center gap-1.5">
              <Icon n="storefront" className="text-[16px] text-primary"/> Tarifa a Merchants (default del mundo)
            </p>
            <p className="text-[11px] text-on-surface-variant mb-3">
              Aplica a todo merchant nuevo. Un merchant individual puede tener su propia tarifa (override) al crearlo o editarlo en Actores.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="MDR — Merchant Discount Rate (%)">
                <input className={inputCls} type="number" step="0.1" min="0" max="10" value={f.mdrDefault}
                  onChange={e => set({ mdrDefault: e.target.value })}/>
              </Field>
              <Field label={`Comisión fija por Tx (${m.moneda})`}>
                <input className={inputCls} type="number" step="0.01" min="0" value={f.fijoTxDefault}
                  onChange={e => set({ fijoTxDefault: e.target.value })}/>
              </Field>
            </div>
          </div>

          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
            <p className="text-xs font-bold text-on-surface mb-1 flex items-center gap-1.5">
              <Icon n="account_balance" className="text-[16px] text-secondary"/> Modelo de recaudación
            </p>
            <p className="text-[11px] text-on-surface-variant mb-3">
              Quién recauda los pagos de los comercios de este mundo — decisión comercial, no un default técnico.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[["redpontis","RedPontis recauda"],["mundo","El Mundo recauda"]].map(([k,l]) => (
                <button key={k} onClick={() => set({ modeloRecaudacion: k })}
                  className={`py-2.5 rounded-lg border text-xs font-semibold transition-colors ${f.modeloRecaudacion===k?"bg-secondary text-white border-secondary":"border-outline-variant text-on-surface-variant"}`}>
                  {l}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-on-surface mb-1 flex items-center gap-1.5">
              <Icon n="event_repeat" className="text-[16px] text-secondary"/> Frecuencia de liquidación
            </p>
            <p className="text-[11px] text-on-surface-variant mb-3">
              Con qué frecuencia se transfiere al sponsor los fondos acumulados, ya descontadas comisiones y retención.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {["diario","semanal","quincenal","mensual"].map(freq => (
                <button key={freq} onClick={() => set({ settlementFrequency: freq })}
                  className={`py-2.5 rounded-lg border text-xs font-semibold capitalize transition-colors ${f.settlementFrequency===freq?"bg-secondary text-white border-secondary":"border-outline-variant text-on-surface-variant"}`}>
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
              <Icon n="lock" className="text-[16px]"/> Retención RedPontis — confidencial
            </p>
            <p className="text-[11px] text-amber-800 mb-3">
              Solo visible y editable desde Plataforma. El Admin del Mundo (sponsor) <b>nunca</b> ve este porcentaje — solo el monto neto ya liquidado.
            </p>
            <Field label="% Retención sobre lo liquidado">
              <input className={inputCls} type="number" step="0.1" min="0" max="100" value={f.retentionPercentage}
                onChange={e => set({ retentionPercentage: e.target.value })}/>
            </Field>
          </div>

          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="event" className="text-[16px] text-on-surface-variant"/> Vigencia de la tarifa
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Desde"><input className={inputCls} type="date" value={f.validFrom} onChange={e => set({ validFrom: e.target.value })}/></Field>
              <Field label="Hasta" hint="Vacío = vigente indefinidamente">
                <input className={inputCls} type="date" value={f.validUntil} onChange={e => set({ validUntil: e.target.value })}/>
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <BtnPrimary onClick={save} disabled={!dirty}>
              <Icon n="save" className="text-[16px]"/> Guardar tarifas
            </BtnPrimary>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TabEventos — configuración del Motor de Eventos. El criterio B2B/B2C ya
   no se elige a mano acá: lo deriva modosDeMundo() del tipo de mundo. RP solo
   activa "Embebido" y fija la comisión; la creación/gestión de eventos ya no
   se hace desde el admin de RedPontis — ve a la Cola de aprobación (tab
   aparte) para revisar lo que publiquen el organizador B2B, el propio mundo
   (si Embebido está activo) o el usuario final en JOI Eventos. */
function TabEventos({ m, st, goto }) {
  const nav = useNavigate();
  // Elegir el modelo no es una puerta de un solo sentido: un mundo puede
  // cambiar de estrategia y tiene que poder volver a ver esta decisión.
  const [verPopupModo, setVerPopupModo] = useState(false);
  const eventos = (st.eventos||[]).filter(e => e.mundoId === m.id);
  // La configuración del modelo la lleva SelectorModoEventos, que es el mismo
  // componente que usa el popup: dos copias del mismo formulario ya habían
  // derivado una vez y esta pestaña terminó permitiendo lo que el popup no.

  return (
    <div className="space-y-8">
      {verPopupModo && <EventosActivadoPopup m={m} onClose={() => setVerPopupModo(false)}/>}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold flex items-center gap-2"><Icon n="settings" className="text-primary"/> Motor de Eventos — Configuración</h3>
          <BtnOutline onClick={() => setVerPopupModo(true)}><Icon n="tune" className="text-[16px]"/> Volver a elegir el modelo</BtnOutline>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          Elige el modelo del mundo. <b>B2B</b> no convive con B2C ni Embebido — es un mundo organizador, se le entrega el panel dedicado. <b>B2C</b> sí puede convivir con Embebido (el propio mundo publica, bajo comisión de RedPontis).
        </p>

        <SelectorModoEventos m={m} />
      </section>

      <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{eventos.length} evento{eventos.length===1?"":"s"} en este mundo</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Nada se publica en la superapp sin tu aprobación final, sin importar quién lo haya creado.</p>
        </div>
        <BtnOutline onClick={() => nav("/admin/gobierno")}><Icon n="approval" className="text-[18px]"/> Ir a Cola de aprobación</BtnOutline>
      </div>
    </div>
  );
}

/* ── TabPromos — cupón QR real (Gantt #38-#41) ───────────────────────
   Antes: st.promos era 100% mock local (localStorage), sin ninguna tabla en
   Supabase. Ahora crea/lista/pausa promociones reales; el canje ocurre en el
   POS del comercio (CobrarPanel, Fronts.jsx) contra el mismo backend. */
function generarCodigoQR(titulo) {
  const base = (titulo || "PROMO").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "PROMO";
  const suf = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suf}`;
}

function TabPromos({ m }) {
  const [promos, setPromos] = useState(null);
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = { titulo: "", sponsor: "", tipo: "Descuento %", valor: "", hasta: "", cupos: 0 };
  const [f, setF] = useState(blank);

  React.useEffect(() => {
    fetchPromocionesMundo(m.id).then(setPromos).catch(() => setPromos([]));
  }, [m.id, reload]);

  const save = async () => {
    setSaving(true);
    try {
      await crearPromocionRemote({
        world_id: m.id, merchant_nombre: f.sponsor || m.nombre, titulo: f.titulo,
        tipo: f.tipo, valor: f.valor ? +f.valor : null,
        vigencia_hasta: f.hasta || null, usos_max: +f.cupos > 0 ? +f.cupos : null,
        codigo_qr: generarCodigoQR(f.titulo),
      });
      setF(blank); setOpen(false); setReload(k => k + 1);
      notify("Promoción publicada — el cupón QR ya está activo en la app.");
    } catch (e) {
      notify("No se pudo publicar la promoción.", "error");
    } finally { setSaving(false); }
  };

  const togglePausa = async p => {
    await actualizarPromocionRemote(p.id, { estado: p.estado === "PAUSADA" ? "VIGENTE" : "PAUSADA" });
    setReload(k => k + 1);
  };

  if (promos === null) return <p className="text-sm text-on-surface-variant py-8">Cargando promociones…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-on-surface-variant max-w-2xl">Cupones QR con vigencia. Los vigentes aparecen para <b>todos los usuarios del app</b> y se canjean desde el POS del comercio.</p>
        <BtnPrimary onClick={() => setOpen(true)}><Icon n="add" className="text-[18px]"/> Nueva Promoción</BtnPrimary>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm divide-y divide-outline-variant/60">
        {promos.length === 0 && <p className="p-8 text-center text-sm text-on-surface-variant">Sin promociones registradas.</p>}
        {promos.map(p => (
          <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-container-low gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-primary"><Icon n="percent"/></div>
              <div>
                <h4 className="font-semibold text-sm">{p.titulo}</h4>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase">{p.merchant_nombre} · {p.tipo}{p.valor ? ` ${p.valor}` : ""} · hasta {p.vigencia_hasta || "sin límite"}</p>
                <p className="font-mono text-[10px] text-primary mt-0.5">{p.codigo_qr} · {p.usos_actuales} canjeado{p.usos_actuales !== 1 ? "s" : ""}{p.usos_max ? ` / ${p.usos_max}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Pill color={p.estado==="PAUSADA"?"bg-outline":"bg-ok"}>{p.estado}</Pill>
              <button onClick={() => togglePausa(p)} className="px-3 py-1.5 rounded border border-outline-variant font-mono text-[10px] uppercase hover:bg-surface-container">
                {p.estado==="PAUSADA"?"Reactivar":"Pausar"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} icon="campaign" title="Nueva promoción" subtitle={m.nombre}
        footer={<><BtnOutline onClick={() => setOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!f.titulo || saving} onClick={save}>{saving ? "Publicando…" : "Publicar"}</BtnPrimary></>}>
        <div className="space-y-5">
          <Field label="Título"><input className={inputCls} value={f.titulo} onChange={e => setF({...f, titulo:e.target.value})} placeholder="Ej. 2x1 en entradas"/></Field>
          <Field label="Sponsor / comercio" hint="Vacío = promoción del mundo, sin comercio específico."><input className={inputCls} value={f.sponsor} onChange={e => setF({...f, sponsor:e.target.value})}/></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select className={inputCls} value={f.tipo} onChange={e => setF({...f, tipo:e.target.value})}>
                {["Descuento %","Cashback","Cupón","2x1"].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Valor" hint="% o monto, según el tipo"><input className={inputCls} type="number" value={f.valor} onChange={e => setF({...f, valor:e.target.value})} placeholder="15"/></Field>
          </div>
          <Field label="Vigente hasta" hint="Vacío = sin fecha límite"><input className={inputCls} type="date" value={f.hasta} onChange={e => setF({...f, hasta:e.target.value})}/></Field>
          <Field label="Cupos (0 = ilimitado)"><input className={inputCls} type="number" min="0" value={f.cupos} onChange={e => setF({...f, cupos:e.target.value})}/></Field>
        </div>
      </Drawer>
    </div>
  );
}
