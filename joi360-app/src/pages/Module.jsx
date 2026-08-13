import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../hooks.js";
import { useUser } from "../userStore.js";
import { useModuleConfig, useWalletLive, useMerchantsLive, useCatalogLive } from "../hooks.js";
import {
  getSyntheticUserId, fetchEventosLive, fetchVendidasPorEvento,
  fetchTicketTypesLive, fetchVendidasPorTipo, comprarTicketsLive,
  fetchMisEntradasLive, transferirEntradaRemote, crearEnlaceTransferenciaEntrada, fetchEventMerchantsLive, fetchProgramasBNPLLive, crearContratoBNPLLive, updateContratoBNPL, fetchMisContratosBNPL, sincronizarCicloBNPL, pagarCuotaBNPLUsuario, fetchModificacionesBNPL, fetchCampanasBNPLMundo,
  errorControlado, logErrorControlado, mensajeDeError, fetchProductosMundoLive, comprarProductosLive, fetchMisAccesos,
  fetchMiPerfilExtendido, guardarPerfilExtendido,
  fetchMisDependientes, crearDependienteRemote, actualizarDependienteAlergiasRemote, actualizarDependientePerfilRemote, fetchDependienteBalance,
  verificarBloqueoEliminarDependiente, eliminarDependienteRemote,
  fetchRestriccionesDependiente, fetchRestriccionesDependientesBulk, guardarRestriccionesDependiente,
  fetchPlanesSuscripcionLive,
  transferirP2PRemote, fetchP2PEnviadoHoy, solicitarBanditaNfc, fetchMiSolicitudNfc, fetchMiBanditaVigencia, reportarBanditaPerdidaRemote, vincularBanditaDirectoRemote, crearEventoB2CRemote, fetchMisEventosCreados, fetchAgendaEventoLive, fetchPromocionesLive,
  fetchMiCodigoJoi, buscarPorCodigoJoiRemote, buscarPorDniRemote, crearTicketSoporteRemote,
  fetchMenuDelDia, fetchReservasDeFecha, fetchMisReservasMenu, crearReservaMenu,
  fetchAlertasConsumo, marcarAlertaConsumoLeida, fetchAcquiringChannelsLive,
} from "../supabaseClient.js";
import { MODULES } from "../modules.js";
import BottomNav from "../components/BottomNav.jsx";
import {
  Icon, Chip, Tag, SectionCard, SectionHeader, StatGrid,
  ProgressBar, ListItem, HeroBalance, EmptyState, ConfigBanner, PrimaryBtn
} from "../components/ModuleAtoms.jsx";
import { showToast } from "../components/Toast.jsx";

// ─── QR helper ────────────────────────────────────────────────────────────────
// Un importe no lleva signo, ni letras, ni más de dos decimales. Filtrarlo al
// escribir evita que un "-" llegue al backend disfrazado de monto válido, y de
// paso le ahorra al usuario descubrir el error recién al tocar el botón.
function soloImporte(v) {
  const limpio = String(v).replace(/[^\d.]/g, "");
  const [entero, ...resto] = limpio.split(".");
  if (!resto.length) return entero;
  return `${entero}.${resto.join("").slice(0, 2)}`;
}

const QR_CELLS = Array.from({length:81},(_,i)=>(i*7+3)%3!==0?"bg-[#1b1b24] rounded-[1px]":"");
function QRCode({ label, sub, value }) {
  return (
    <div className="text-center">
      <div className="w-44 h-44 mx-auto rounded-2xl bg-white border-2 border-[#e4e1ee] mb-3 flex items-center justify-center relative overflow-hidden">
        {value ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(value)}`}
            alt={`Código QR · ${value}`} className="w-full h-full object-contain p-2" />
        ) : (
          <>
            <div className="absolute inset-2 grid grid-cols-9 gap-0.5">
              {QR_CELLS.map((c,i)=><div key={i} className={c}/>)}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <Icon name="qr_code" fill size="text-xl" color="text-[#3525cd]" />
              </div>
            </div>
          </>
        )}
      </div>
      {label && <p className="font-black text-[#1b1b24]">{label}</p>}
      {sub && <p className="text-xs text-[#777587] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── MODULE HEADER ────────────────────────────────────────────────────────────
function ModuleHeader({ title, icon, iconBg, iconColor, onBack, action, children }) {
  return (
    <div className="px-5 pt-10 pb-4">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="w-10 h-10 glass-card rounded-full flex items-center justify-center tap-active">
          <Icon name="arrow_back" size="text-xl" color="text-[#1b1b24]" />
        </button>
        {action}
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl ${iconBg || "bg-[#e2dfff]"} flex items-center justify-center`}>
          <Icon name={icon} fill size="text-2xl" color={iconColor || "text-[#3525cd]"} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#1b1b24]">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: WALLET
// config: maxRecargasDiarias, maxPorRecarga, p2pEnabled, monedaPermitida
// ══════════════════════════════════════════════════════════════════════════════
function WalletTemplate({ cfg, u }) {
  const nav = useNavigate();
  const mundoId = cfg.mundo.id;
  const { saldo, cashback, historial, canales, refresh } = useWalletLive(mundoId);
  const puntos = u?.puntos?.[mundoId] || 0;
  const [hidden, setHidden] = useState(false);
  const txs = historial.slice(0,5);
  const maxPorRecarga = cfg.config.maxPorRecarga;
  const currency = cfg.config.monedaPermitida || "S/";
  const myCode = getSyntheticUserId();

  // Código JOI corto (app_profiles.codigo) — el UUID de myCode sigue siendo
  // la identidad interna real (wallets, transacciones, todo cuelga de él),
  // pero nadie debería tener que dictar un UUID de memoria para recibir una
  // transferencia. Mientras carga o si la cuenta todavía no tiene código
  // generado, se cae al UUID como antes (nunca deja a la usuaria sin nada
  // que compartir).
  const [miCodigoJoi, setMiCodigoJoi] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetchMiCodigoJoi(myCode).then(r => { if (vivo) setMiCodigoJoi(r); }).catch(() => { if (vivo) setMiCodigoJoi(null); });
    return () => { vivo = false; };
  }, []);
  const codigoParaCompartir = miCodigoJoi || myCode;

  // Dependientes reales del titular — para poder pedir la bandita NFC (o
  // cualquier otra acción del módulo) A NOMBRE de un hijo, no solo del padre.
  const [dependientes, setDependientes] = useState([]);
  useEffect(() => {
    let vivo = true;
    fetchMisDependientes(myCode, mundoId).then(r => { if (vivo) setDependientes(r || []); }).catch(() => { if (vivo) setDependientes([]); });
    return () => { vivo = false; };
  }, [mundoId]);

  // P2P real: transferir a otro usuario por su código JOI o por su DNI.
  // Antes solo aceptaba el código, y encima el input se mandaba TAL CUAL
  // como el userId destino — funcionaba solo porque el código ERA el UUID.
  // Ahora hay que resolver primero (código corto o DNI) a un userId real
  // antes de poder mostrar a quién le estás mandando el dinero.
  const [p2pOpen, setP2pOpen] = useState(false);
  const [p2pModo, setP2pModo] = useState("codigo"); // "codigo" | "dni"
  const [p2pInput, setP2pInput] = useState("");
  const [p2pBuscando, setP2pBuscando] = useState(false);
  const [p2pBusquedaError, setP2pBusquedaError] = useState("");
  const [p2pDestino, setP2pDestino] = useState(null); // { userId, nombre }
  const [p2pConfirmoIrreversible, setP2pConfirmoIrreversible] = useState(false);
  const [p2pMonto, setP2pMonto] = useState("");
  const [p2pSending, setP2pSending] = useState(false);
  const [p2pResult, setP2pResult] = useState(null);

  const buscarDestinoP2P = async () => {
    const valor = p2pInput.trim();
    if (!valor) return;
    setP2pBuscando(true); setP2pBusquedaError(""); setP2pDestino(null);
    try {
      const r = p2pModo === "dni" ? await buscarPorDniRemote(valor) : await buscarPorCodigoJoiRemote(valor);
      if (!r) { setP2pBusquedaError(p2pModo === "dni" ? "No encontramos ninguna cuenta con ese DNI." : "No encontramos ninguna cuenta con ese código."); return; }
      if (r.userId === myCode) { setP2pBusquedaError("Ese código es el tuyo — no puedes transferirte a ti mismo."); return; }
      setP2pDestino(r);
    } catch {
      setP2pBusquedaError("No se pudo buscar. Intenta de nuevo.");
    } finally { setP2pBuscando(false); }
  };

  const enviarSoporteP2P = async () => {
    try {
      await crearTicketSoporteRemote({
        world_id: mundoId, tipo: "P2P",
        asunto: "Problema con una transferencia",
        detalle: p2pResult?.ok ? `Transferencia enviada por S/ ${p2pMonto} — la usuaria reporta un problema.` : "Consulta iniciada desde el modal de transferencia.",
      });
      showToast({ titulo: "Enviado a soporte", mensaje: "El mundo o RedPontis te contactará." }, "success");
    } catch {
      showToast({ titulo: "No se pudo enviar", mensaje: "Intenta de nuevo en unos minutos." }, "error");
    }
  };

  // Solicitud real de bandita NFC — antes esta tarjeta mostraba "Vinculada"
  // fijo sin importar el estado real, y solo para el titular: un padre con
  // hijos registrados no tenía forma de pedir la pulsera DE UN HIJO, solo la
  // suya propia. Ahora es una fila por beneficiario (titular + cada
  // dependiente), cada una con su propio estado real en nfc_requests.
  const beneficiarios = [
    { id: myCode, nombre: u?.auth?.nombre || "Tú", esTitular: true },
    ...(dependientes || []).map(d => ({ id: d.dependent_user_id, nombre: d.nombre, esTitular: false })),
  ];
  // Web NFC (NDEFReader) solo existe en Chrome/Android sobre HTTPS -- en
  // iOS/desktop no hay soporte del navegador, así que el botón de vincular
  // directo ni se muestra ahí; esos casos siguen usando "Solicitar" como antes.
  const nfcSoportado = typeof window !== "undefined" && "NDEFReader" in window;
  const [solicitudesNfc, setSolicitudesNfc] = useState({}); // { [beneficiarioId]: request | null | undefined }
  const [solicitandoNfcId, setSolicitandoNfcId] = useState(null);
  const [vigenciasNfc, setVigenciasNfc] = useState({}); // { [beneficiarioId]: {vence_at, estado} | null }
  useEffect(() => {
    let vivo = true;
    Promise.all(beneficiarios.map(b =>
      fetchMiSolicitudNfc(mundoId, b.id).then(r => [b.id, r]).catch(() => [b.id, null])
    )).then(pares => { if (vivo) setSolicitudesNfc(Object.fromEntries(pares)); });
    return () => { vivo = false; };
  }, [mundoId, dependientes?.length]);
  // Vigencia solo tiene sentido consultarla una vez que la solicitud está
  // "entregada" — antes de eso no hay bandita real vinculada todavía.
  useEffect(() => {
    let vivo = true;
    const entregadas = beneficiarios.filter(b => solicitudesNfc[b.id]?.status === "entregada");
    if (!entregadas.length) return;
    Promise.all(entregadas.map(b =>
      fetchMiBanditaVigencia(mundoId, b.id).then(r => [b.id, r]).catch(() => [b.id, null])
    )).then(pares => { if (vivo) setVigenciasNfc(prev => ({ ...prev, ...Object.fromEntries(pares) })); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mundoId, JSON.stringify(Object.fromEntries(beneficiarios.map(b => [b.id, solicitudesNfc[b.id]?.status])))]);
  // Bandita universal (Task #168): solo tiene sentido para la cuenta
  // principal — un dependiente vive en un único mundo, así que su bandita
  // siempre queda scoped a ese mundo. El backend (bands-link) discrimina la
  // wallet correcta según el mundo del lector físico que la lee; acá solo
  // se marca la intención al solicitarla.
  const [universalTitular, setUniversalTitular] = useState(false);
  const pedirBandita = async (beneficiarioId, beneficiarioNombre, universal = false) => {
    setSolicitandoNfcId(beneficiarioId);
    try {
      await solicitarBanditaNfc(mundoId, beneficiarioId, beneficiarioNombre || null, universal);
      const r = await fetchMiSolicitudNfc(mundoId, beneficiarioId);
      setSolicitudesNfc(prev => ({ ...prev, [beneficiarioId]: r }));
      showToast({ titulo: "Solicitud enviada", mensaje: `Acércate al módulo de ${cfg.mundo.nombre} para recoger y vincular tu pulsera — ellos gestionan la entrega.` }, "success");
    } catch (e) {
      showToast({ titulo: "No se pudo enviar la solicitud", mensaje: "Intenta de nuevo en unos minutos." }, "error");
    } finally { setSolicitandoNfcId(null); }
  };
  // Pérdida/robo: la pulsera vinculada se bloquea (no queda "disponible" para
  // que cualquiera la reactive) y se abre una solicitud nueva — mismo camino
  // que una solicitud normal, pero con un motivo real. La resuelve el
  // operador del mundo re-vinculando una unidad nueva.
  const [reportandoPerdidaId, setReportandoPerdidaId] = useState(null);
  const reportarPerdida = async (beneficiarioId, beneficiarioNombre) => {
    setReportandoPerdidaId(beneficiarioId);
    try {
      await reportarBanditaPerdidaRemote(mundoId, beneficiarioId, beneficiarioNombre || null);
      const r = await fetchMiSolicitudNfc(mundoId, beneficiarioId);
      setSolicitudesNfc(prev => ({ ...prev, [beneficiarioId]: r }));
      setVigenciasNfc(prev => ({ ...prev, [beneficiarioId]: null }));
      showToast({ titulo: "Reposición solicitada", mensaje: "Avisamos al mundo — te contactarán para entregarte una pulsera nueva." }, "success");
    } catch (e) {
      showToast({ titulo: "No se pudo enviar el reporte", mensaje: "Intenta de nuevo en unos minutos." }, "error");
    } finally { setReportandoPerdidaId(null); }
  };

  // Vincular directo con el celular (Task #230) — antes la única forma de
  // vincular una pulsera era pedirla y esperar a que un operador la
  // entregara con su propio lector. Con Web NFC (Android/Chrome) el usuario
  // lee el tag él mismo y queda vinculado al instante.
  const [vinculandoDirecto, setVinculandoDirecto] = useState(null); // {id, nombre} | null
  const onVinculadoDirecto = async (beneficiarioId) => {
    const [solicitud, vigencia] = await Promise.all([
      fetchMiSolicitudNfc(mundoId, beneficiarioId),
      fetchMiBanditaVigencia(mundoId, beneficiarioId),
    ]);
    setSolicitudesNfc(prev => ({ ...prev, [beneficiarioId]: solicitud }));
    setVigenciasNfc(prev => ({ ...prev, [beneficiarioId]: vigencia }));
    setVinculandoDirecto(null);
  };

  // Límites de Transferencia (P2P) que el mundo fija en el microservicio del
  // mismo nombre — antes existían solo en el catálogo del admin, nada acá
  // los leía ni los aplicaba (Task #133).
  const maxPorTxP2P = cfg.config.transferencia_maxPorTx;
  const maxPorDiaP2P = cfg.config.transferencia_maxPorDia;
  const enviarP2P = async () => {
    const monto = +p2pMonto;
    if (!(monto > 0) || !p2pDestino || !p2pConfirmoIrreversible) return;
    setP2pSending(true); setP2pResult(null);
    if (maxPorTxP2P != null && monto > +maxPorTxP2P) {
      setP2pResult({ ok: false, mensaje: `Este mundo permite transferir hasta S/ ${(+maxPorTxP2P).toFixed(2)} por transacción.` });
      setP2pSending(false); return;
    }
    if (maxPorDiaP2P != null) {
      const enviadoHoy = await fetchP2PEnviadoHoy(myCode, mundoId).catch(() => 0);
      if (enviadoHoy + monto > +maxPorDiaP2P) {
        setP2pResult({ ok: false, mensaje: `Ya transferiste S/ ${enviadoHoy.toFixed(2)} hoy — el límite diario de este mundo es S/ ${(+maxPorDiaP2P).toFixed(2)}.` });
        setP2pSending(false); return;
      }
    }
    try {
      const r = await transferirP2PRemote(myCode, p2pDestino.userId, mundoId, monto);
      if (!r.ok) {
        const code = r.motivo === "saldo" ? "saldo_insuficiente" : "transferencia_no_valida";
        const err = await errorControlado(code);
        logErrorControlado(code, "wallet-p2p", mundoId);
        r.mensaje = r.motivo === "monto"
          ? "El monto debe ser mayor a cero, con hasta dos decimales."
          : r.motivo === "destino"
            ? "No puedes transferirte a ti mismo."
            : [err.mensaje, err.accion].filter(Boolean).join(" ");
      }
      setP2pResult(r);
      if (r.ok) { refresh(); setP2pMonto(""); }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "wallet-p2p", mundoId);
      setP2pResult({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setP2pSending(false); }
  };
  const cerrarP2P = () => {
    setP2pOpen(false); setP2pModo("codigo"); setP2pInput(""); setP2pDestino(null);
    setP2pBusquedaError(""); setP2pConfirmoIrreversible(false); setP2pMonto(""); setP2pResult(null);
  };

  return (
    <div className="px-5 space-y-4 pb-8">
      {/* Balance hero — solo si RedPontis activó el flag balance para este mundo;
          mundos en modo identificación (sin saldo) no deben ver esto. */}
      {cfg.has("balance") && (
      <div className="rounded-3xl p-8 text-center text-white relative overflow-hidden"
        style={{background:"linear-gradient(135deg,#3525cd 0%,#4f46e5 100%)"}}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-2">Saldo disponible</p>
        <p className="text-5xl font-black tracking-tight">
          {hidden ? "••••" : `${currency} ${saldo.toFixed(2)}`}
        </p>
        <p className="text-white/50 text-xs mt-1.5">{cfg.mundo.nombre}</p>
        {!hidden && cashback > 0 && (
          <p className="text-[11px] font-bold text-white/80 mt-2 flex items-center justify-center gap-1">
            <Icon name="redeem" size="text-sm" color="text-white/80" /> + {currency} {cashback.toFixed(2)} en cashback disponible
          </p>
        )}
        {maxPorRecarga && (
          <p className="text-white/40 text-[10px] mt-0.5">Máximo por recarga: {currency} {maxPorRecarga}</p>
        )}
        <button onClick={()=>setHidden(h=>!h)}
          className="mt-4 px-4 py-2 rounded-full bg-white/15 text-xs font-bold flex items-center gap-1 mx-auto">
          <Icon name={hidden?"visibility":"visibility_off"} size="text-sm" color="text-white" />
          {hidden ? "Mostrar" : "Ocultar"}
        </button>
      </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        {cfg.has("recarga") && (
        <SectionCard className="p-4 flex flex-col gap-2 tap-active cursor-pointer" onClick={() => nav("/pay?tab=recargar")}>
          <div className="w-10 h-10 rounded-full bg-[#3525cd]/10 flex items-center justify-center">
            <Icon name="add_card" fill size="text-xl" color="text-[#3525cd]" />
          </div>
          <p className="font-bold text-sm text-[#1b1b24]">Recargar</p>
          <p className="text-xs text-[#777587]">Agregar saldo</p>
        </SectionCard>
        )}
        {cfg.config.p2pEnabled && cfg.has("p2p") && (
          <SectionCard className="p-4 flex flex-col gap-2 tap-active cursor-pointer" onClick={() => setP2pOpen(true)}>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Icon name="swap_horiz" fill size="text-xl" color="text-green-600" />
            </div>
            <p className="font-bold text-sm text-[#1b1b24]">Transferir</p>
            <p className="text-xs text-[#777587]">Entre usuarios del mundo</p>
          </SectionCard>
        )}
      </div>

      {/* Mi código JOI — compártelo para recibir transferencias, o que un
          comercio te identifique en el POS. */}
      <SectionCard className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider">Mi código JOI</p>
          <p className="font-mono text-base font-black text-[#3525cd] mt-0.5">{codigoParaCompartir}</p>
          <p className="text-[10px] text-[#777587] mt-0.5">Compártelo para recibir una transferencia</p>
        </div>
        <div className="flex gap-1.5">
          {navigator.share && (
            <button onClick={() => navigator.share({ title: "Mi código JOI", text: `Mi código JOI es ${codigoParaCompartir}` }).catch(() => {})} className="glass-card w-9 h-9 rounded-full flex items-center justify-center tap-active">
              <Icon name="share" size="text-base" color="text-[#3525cd]"/>
            </button>
          )}
          <button onClick={() => navigator.clipboard?.writeText(codigoParaCompartir)} className="glass-card w-9 h-9 rounded-full flex items-center justify-center tap-active">
            <Icon name="content_copy" size="text-base" color="text-[#3525cd]"/>
          </button>
        </div>
      </SectionCard>

      {/* Modal P2P */}
      {p2pOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end items-center" style={{background:"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)"}} onClick={cerrarP2P}>
          <div className="w-full max-w-[430px] bg-white rounded-t-[28px]" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[#e4e1ee]"/></div>
            <div className="px-6 pb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-[#1b1b24]">Transferir saldo</h3>
                <button onClick={cerrarP2P} className="w-9 h-9 rounded-full bg-[#f0ecf9] flex items-center justify-center">
                  <Icon name="close" size="text-xl" color="text-[#464555]"/>
                </button>
              </div>
              {p2pResult?.ok ? (
                <div className="text-center py-4">
                  <Icon name="check_circle" fill size="text-5xl" color="text-green-600"/>
                  <p className="font-black text-[#1b1b24] mt-2">Transferencia enviada</p>
                  <p className="text-xs text-[#777587] mt-1">A {p2pDestino?.nombre || "el destinatario"}</p>
                  <div className="mt-4 space-y-2">
                    <PrimaryBtn label="Listo" onClick={cerrarP2P}/>
                    <button onClick={enviarSoporteP2P} className="w-full py-2 text-xs font-bold text-[#777587] tap-active">¿Algo salió mal? Contactar soporte</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex bg-[#f0ecf9] rounded-2xl p-1 gap-1">
                    {[["codigo", "Código JOI"], ["dni", "DNI"]].map(([v, l]) => (
                      <button key={v} onClick={() => { setP2pModo(v); setP2pInput(""); setP2pDestino(null); setP2pBusquedaError(""); }}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors ${p2pModo === v ? "bg-white text-[#3525cd] shadow-sm" : "text-[#777587]"}`}>{l}</button>
                    ))}
                  </div>

                  {!p2pDestino ? (
                    <div>
                      <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">{p2pModo === "dni" ? "DNI del destinatario" : "Código JOI del destinatario"}</label>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm font-mono outline-none focus:ring-2 focus:ring-[#3525cd]/20"
                          value={p2pInput} inputMode={p2pModo === "dni" ? "numeric" : "text"}
                          onChange={e=>setP2pInput(p2pModo === "dni" ? e.target.value.replace(/\D/g,"").slice(0,8) : e.target.value)}
                          onKeyDown={e => e.key === "Enter" && buscarDestinoP2P()}
                          placeholder={p2pModo === "dni" ? "8 dígitos" : "Ej. CAMIL385"}/>
                        <button onClick={buscarDestinoP2P} disabled={!p2pInput.trim() || p2pBuscando}
                          className="px-4 rounded-2xl bg-[#3525cd] text-white font-bold text-sm tap-active disabled:opacity-40">
                          {p2pBuscando ? "…" : "Buscar"}
                        </button>
                      </div>
                      {p2pBusquedaError && <p className="text-xs text-red-600 mt-2">{p2pBusquedaError}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Le vas a transferir a</p>
                          <p className="text-sm font-bold text-[#1b1b24]">{p2pDestino.nombre || "Usuario JOI"}</p>
                        </div>
                        <button onClick={() => { setP2pDestino(null); setP2pInput(""); }} className="text-[11px] font-bold text-[#3525cd] tap-active">Cambiar</button>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Monto ({currency})</label>
                        <div className="flex items-center bg-[#f0ecf9] rounded-2xl px-4">
                          <span className="text-[#777587] font-bold mr-2 text-lg">{currency}</span>
                          <input className="flex-1 text-xl font-black text-[#1b1b24] bg-transparent py-3 outline-none" type="number"
                            value={p2pMonto} onChange={e=>setP2pMonto(soloImporte(e.target.value))} placeholder="0.00"/>
                        </div>
                        {(maxPorTxP2P != null || maxPorDiaP2P != null) && (
                          <p className="text-[10px] text-[#777587] mt-1.5">
                            {maxPorTxP2P != null && `Máx. ${currency} ${(+maxPorTxP2P).toFixed(2)} por transferencia`}
                            {maxPorTxP2P != null && maxPorDiaP2P != null && " · "}
                            {maxPorDiaP2P != null && `Máx. ${currency} ${(+maxPorDiaP2P).toFixed(2)} por día`}
                          </p>
                        )}
                      </div>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={p2pConfirmoIrreversible} onChange={e=>setP2pConfirmoIrreversible(e.target.checked)} className="mt-0.5 rounded text-[#3525cd]"/>
                        <span className="text-xs text-[#464555]">Entiendo que, una vez enviada, esta transferencia <b>no se puede revertir</b>.</span>
                      </label>
                      {p2pResult && !p2pResult.ok && (
                        <p className="text-xs text-red-600">{p2pResult.mensaje}</p>
                      )}
                      <PrimaryBtn label={p2pSending ? "Enviando…" : "Transferir"} icon="swap_horiz" disabled={!p2pMonto || !p2pConfirmoIrreversible || p2pSending} onClick={enviarP2P}/>
                    </>
                  )}
                  <button onClick={enviarSoporteP2P} className="w-full py-1 text-[11px] font-bold text-[#777587] tap-active">¿Tienes un problema? Contactar soporte</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canales de recarga habilitados para este mundo */}
      <SectionCard>
        <SectionHeader label="Cómo recargar en este mundo" icon="add_card" />
        <div className="p-4 space-y-2">
          {canales.map(ch => (
            <div key={ch.id} className="rounded-2xl p-3.5 border border-[#e4e1ee] flex items-center gap-3 tap-active cursor-pointer hover:border-[#3525cd]/20 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#f0ecf9] flex items-center justify-center flex-shrink-0">
                <Icon name="payments" fill size="text-lg" color="text-[#3525cd]" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#1b1b24] text-sm">{ch.nombre}</p>
              </div>
              <Icon name="chevron_right" size="text-lg" color="text-[#c7c4d8]" />
            </div>
          ))}
          {/* Bandita NFC — requiere el feature flag Y que el mundo de verdad
              use pulseras físicas (config.usaPulseraNfc, lo mismo que ya
              exige el POS para ofrecer "Vincular pulsera") — mismo criterio
              en todos los frentes, no solo el feature flag suelto. Estado
              real desde nfc_requests, una fila por beneficiario (titular +
              cada dependiente) — un padre puede pedir la pulsera de un hijo
              sin que eso reemplace la suya propia. */}
          {cfg.has("bandita") && cfg.config?.usaPulseraNfc !== false && beneficiarios.map(b => {
            const solicitud = solicitudesNfc[b.id];
            const vigencia = vigenciasNfc[b.id];
            const venceAt = vigencia?.vence_at ? new Date(vigencia.vence_at) : null;
            const diasParaVencer = venceAt ? Math.ceil((venceAt - new Date()) / 86400000) : null;
            const vencida = diasParaVencer != null && diasParaVencer <= 0;
            const porVencer = diasParaVencer != null && diasParaVencer > 0 && diasParaVencer <= 30;
            const nombreParaAcciones = b.esTitular ? (u?.auth?.nombre || null) : b.nombre;
            return (
              <div key={b.id} className="rounded-2xl p-3.5 border border-[#e4e1ee]"
                style={{background:"linear-gradient(135deg,rgba(237,231,246,0.4),white)"}}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#ede7f6] flex items-center justify-center flex-shrink-0">
                    <Icon name="contactless" fill size="text-lg" color="text-[#673ab7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Antes mostraba el nombre del MUNDO en la card de la
                        cuenta principal (confuso fuera de Educación: leía
                        como si la pulsera fuera del colegio, no tuya) —
                        ahora usa tu propio nombre, igual que ya hacían las
                        cards de cada dependiente. */}
                    <p className="font-bold text-[#1b1b24] text-sm">Bandita NFC · {b.esTitular ? (nombreParaAcciones || "Mi cuenta") : b.nombre}</p>
                    {solicitud === undefined ? (
                      <p className="text-[10px] text-[#777587]">Cargando…</p>
                    ) : solicitud?.status === "entregada" ? (
                      vencida ? (
                        <p className="text-[10px] text-red-600 font-bold">Vencida el {venceAt.toLocaleDateString("es-PE")}</p>
                      ) : venceAt ? (
                        <p className={`text-[10px] font-bold ${porVencer ? "text-orange-600" : "text-green-700"}`}>
                          Vinculada · vence {venceAt.toLocaleDateString("es-PE")}
                        </p>
                      ) : (
                        <p className="text-[10px] text-green-700 font-bold">Vinculada · sin vencimiento</p>
                      )
                    ) : solicitud?.status === "pendiente" ? (
                      <p className="text-[10px] text-orange-600 font-bold">
                        {solicitud?.motivo === "perdida_robo" ? "Reposición en camino · pendiente de entrega" : "Solicitud enviada · pendiente de entrega"}
                      </p>
                    ) : solicitud?.status === "rechazada" ? (
                      <p className="text-[10px] text-red-600 font-bold">Solicitud rechazada</p>
                    ) : (
                      <p className="text-[10px] text-[#777587]">Aún no vinculada</p>
                    )}
                  </div>
                  {(solicitud === null || solicitud?.status === "rechazada" || (solicitud?.status === "entregada" && (vencida || porVencer))) && (
                    <button onClick={() => pedirBandita(b.id, nombreParaAcciones, b.esTitular && universalTitular)} disabled={solicitandoNfcId === b.id}
                      className="flex-shrink-0 text-[11px] font-bold text-white bg-[#673ab7] px-3 py-1.5 rounded-full tap-active disabled:opacity-50">
                      {solicitandoNfcId === b.id ? "Enviando…" : (solicitud?.status === "entregada" ? "Renovar" : "Solicitar")}
                    </button>
                  )}
                </div>
                {nfcSoportado && (solicitud === null || solicitud?.status === "rechazada" || (solicitud?.status === "entregada" && (vencida || porVencer))) && (
                  <button onClick={() => setVinculandoDirecto({ id: b.id, nombre: nombreParaAcciones })}
                    className="mt-2.5 pt-2.5 border-t border-[#e4e1ee]/60 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#673ab7] tap-active">
                    <Icon name="nfc" size="text-sm" color="text-[#673ab7]" />
                    ¿Ya tienes la pulsera en mano? Vincúlala ahora con tu celular
                  </button>
                )}
                {b.esTitular && (solicitud === null || solicitud?.status === "rechazada") && (
                  <label className="mt-2.5 pt-2.5 border-t border-[#e4e1ee]/60 flex items-start gap-2 text-[10px] text-[#777587] cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={universalTitular} onChange={e=>setUniversalTitular(e.target.checked)}/>
                    <span>Quiero usarla para consumir en <b>todos los mundos</b> a los que pertenezco, no solo {cfg.mundo.nombre}.</span>
                  </label>
                )}
                {solicitud?.status === "entregada" && !vencida && (
                  <button onClick={() => reportarPerdida(b.id, nombreParaAcciones)} disabled={reportandoPerdidaId === b.id}
                    className="mt-2.5 pt-2.5 border-t border-[#e4e1ee]/60 w-full flex items-center gap-1.5 text-[11px] font-semibold text-red-600 disabled:opacity-50">
                    <Icon name="report" size="text-sm" color="text-red-600" />
                    {reportandoPerdidaId === b.id ? "Reportando…" : "Reportar pérdida o robo"}
                  </button>
                )}
              </div>
            );
          })}
          {cfg.has("bandita") && cfg.config?.usaPulseraNfc !== false && (
            <button onClick={() => nav("/module/control?agregar=1")}
              className="w-full rounded-2xl p-3.5 border border-dashed border-[#c7c4d8] flex items-center justify-center gap-2 text-[#3525cd] text-sm font-bold tap-active">
              <Icon name="person_add" size="text-lg" color="text-[#3525cd]" />
              Agregar familiar para pedirle su bandita
            </button>
          )}
        </div>
      </SectionCard>

      {/* Movements */}
      <SectionCard>
        <SectionHeader label="Movimientos recientes" icon="receipt_long" action="Ver todos" />
        {txs.length === 0
          ? <EmptyState icon="receipt_long" title="Sin movimientos" subtitle="Tus transacciones aparecerán aquí." />
          : txs.map(t=>(
            <ListItem key={t.id}
              icon={t.monto>0?"add_card":"shopping_bag"}
              iconBg={t.monto>0?"bg-green-50":"bg-[#f0ecf9]"}
              iconColor={t.monto>0?"text-green-600":"text-[#3525cd]"}
              title={t.titulo}
              subtitle={new Date(t.fecha).toLocaleDateString("es-PE")}
              right={<span className={`font-black text-sm ${t.monto>0?"text-green-600":"text-[#1b1b24]"}`}>{t.monto>0?"+":""}{currency} {Math.abs(t.monto).toFixed(2)}</span>}
            />
          ))}
      </SectionCard>

      {vinculandoDirecto && (
        <VincularBanditaWebNfcModal
          mundoId={mundoId}
          beneficiarioId={vinculandoDirecto.id}
          beneficiarioNombre={vinculandoDirecto.nombre}
          vigenciaMeses={cfg.config?.vigenciaBanditasMeses ?? null}
          onClose={() => setVinculandoDirecto(null)}
          onVinculado={() => onVinculadoDirecto(vinculandoDirecto.id)}
        />
      )}
    </div>
  );
}

// Vincular una bandita leyéndola directo con el celular (Task #230) vía Web
// NFC (NDEFReader) -- solo Chrome/Android. scan() exige un gesto real del
// usuario (el botón "Empezar a leer"), por eso no arranca solo al abrir el
// modal.
function VincularBanditaWebNfcModal({ mundoId, beneficiarioId, beneficiarioNombre, vigenciaMeses, onClose, onVinculado }) {
  const [estado, setEstado] = useState("listo"); // listo | leyendo | vinculando | error | exito
  const [errorMsg, setErrorMsg] = useState("");
  const [codigoLeido, setCodigoLeido] = useState("");

  const vincular = async (codigo) => {
    setCodigoLeido(codigo);
    setEstado("vinculando");
    try {
      await vincularBanditaDirectoRemote(mundoId, beneficiarioId, codigo, vigenciaMeses);
      setEstado("exito");
      showToast({ titulo: "Pulsera vinculada", mensaje: `Lista para usar ${beneficiarioNombre ? `— ${beneficiarioNombre}` : ""}.` }, "success");
      onVinculado();
    } catch (e) {
      setEstado("error");
      setErrorMsg(e.message || "No se pudo vincular la pulsera.");
    }
  };

  const empezarLectura = async () => {
    setEstado("leyendo"); setErrorMsg("");
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.onreading = (event) => {
        if (event.serialNumber) vincular(event.serialNumber);
      };
      ndef.onreadingerror = () => { setEstado("error"); setErrorMsg("No se pudo leer la pulsera. Acércala bien al celular e inténtalo de nuevo."); };
    } catch (e) {
      setEstado("error");
      setErrorMsg(e.name === "NotAllowedError" ? "Necesitas dar permiso de NFC para vincular la pulsera." : "No se pudo activar el lector NFC de tu celular.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-8" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[#e4e1ee] rounded-full mx-auto mb-5" />
        <div className="text-center mb-5">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 ${estado === "exito" ? "bg-green-50" : estado === "error" ? "bg-red-50" : "bg-[#ede7f6]"}`}>
            <Icon name={estado === "exito" ? "check_circle" : estado === "error" ? "error" : "nfc"} fill
              size="text-4xl" color={estado === "exito" ? "text-green-600" : estado === "error" ? "text-red-500" : "text-[#673ab7]"} />
          </div>
          <h3 className="text-[#1b1b24] font-black text-xl">
            {estado === "exito" ? "¡Pulsera vinculada!" : estado === "error" ? "No se pudo vincular" : `Vincular pulsera${beneficiarioNombre ? ` de ${beneficiarioNombre}` : ""}`}
          </h3>
          {estado === "listo" && <p className="text-[#777587] text-xs mt-1.5">Acerca la parte trasera de tu celular a la pulsera y mantenla ahí unos segundos.</p>}
          {estado === "leyendo" && <p className="text-[#777587] text-xs mt-1.5">Buscando la pulsera… acércala al celular.</p>}
          {estado === "vinculando" && <p className="text-[#777587] text-xs mt-1.5 font-mono">{codigoLeido} — vinculando…</p>}
          {estado === "error" && <p className="text-red-600 text-xs mt-1.5">{errorMsg}</p>}
          {estado === "exito" && <p className="text-[#777587] text-xs mt-1.5">Ya puedes usarla para pagar.</p>}
        </div>
        {estado === "listo" && (
          <button onClick={empezarLectura} className="w-full py-3.5 bg-[#673ab7] text-white rounded-2xl font-bold text-sm tap-active">
            Empezar a leer
          </button>
        )}
        {estado === "leyendo" && (
          <div className="flex justify-center py-2">
            <span className="w-8 h-8 border-2 border-[#e4e1ee] border-t-[#673ab7] rounded-full animate-spin" />
          </div>
        )}
        {estado === "error" && (
          <button onClick={() => setEstado("listo")} className="w-full py-3.5 bg-[#673ab7] text-white rounded-2xl font-bold text-sm tap-active">
            Reintentar
          </button>
        )}
        {(estado === "listo" || estado === "error") && (
          <button onClick={onClose} className="w-full py-3 mt-2 text-[#777587] text-xs font-bold tap-active">Cancelar</button>
        )}
        {estado === "exito" && (
          <button onClick={onClose} className="w-full py-3.5 bg-[#3525cd] text-white rounded-2xl font-bold text-sm tap-active">Listo</button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: LOYALTY
// config: equivalencia, caducidadMeses
// servicios: saldo de puntos, canje en app, canje en comercio, niveles, caducidad
// ══════════════════════════════════════════════════════════════════════════════
function LoyaltyTemplate({ cfg, u }) {
  const mundoId = cfg.mundo.id;
  const puntos = u?.puntos?.[mundoId] || 0;
  const equiv = cfg.config.equivalencia || 0.10;
  const cad = cfg.config.caducidadMeses;
  const nivel = puntos<500?"Bronce":puntos<2000?"Plata":"Oro";
  const nextPts = puntos<500?500:puntos<2000?2000:5000;
  const pct = Math.min((puntos/nextPts)*100,100);
  const cashValue = (puntos * equiv).toFixed(2);

  return (
    <div className="px-5 space-y-4 pb-8">
      {/* Hero */}
      <SectionCard className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[11px] font-bold text-[#3525cd]/70 uppercase tracking-widest">Puntos acumulados</p>
            <p className="text-5xl font-black text-[#3525cd] mt-1">{puntos.toLocaleString()}</p>
            <p className="text-xs text-[#777587] mt-1">≈ S/ {cashValue} de valor</p>
          </div>
          <div className="text-right">
            <Chip label={nivel} color="bg-[#ffdbcc] text-[#7b2f00]" />
            {cad && <p className="text-[10px] text-[#777587] mt-2">Caducan en {cad} meses</p>}
          </div>
        </div>
        <p className="text-xs text-[#777587] mb-1.5 flex justify-between">
          <span>Progreso al siguiente nivel</span>
          <span className="font-bold text-[#3525cd]">{Math.max(0,nextPts-puntos)} pts faltantes</span>
        </p>
        <ProgressBar value={puntos} max={nextPts} />
        <div className="mt-3 p-3 bg-[#f0ecf9] rounded-2xl">
          <p className="text-[11px] text-[#777587]">
            Equivalencia · <b className="text-[#3525cd]">1 punto = S/ {equiv.toFixed(2)}</b>
          </p>
        </div>
      </SectionCard>

      {/* Categories */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {icon:"confirmation_number", label:"Vouchers", sub:"Cupones", color:"bg-[#e2dfff]", c:"text-[#3525cd]"},
          {icon:"payments", label:"Cashback", sub:"A tu saldo", color:"bg-[#ffdbcc]", c:"text-[#7b2f00]"},
          {icon:"redeem", label:"Exclusivos", sub:"Artículos", color:"bg-[#e8f5e9]", c:"text-[#388e3c]"},
        ].map((cat,i)=>(
          <SectionCard key={i} className="p-3 flex flex-col items-center gap-2 tap-active cursor-pointer">
            <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center`}>
              <Icon name={cat.icon} fill size="text-xl" color={cat.c} />
            </div>
            <p className="text-xs font-bold text-[#1b1b24]">{cat.label}</p>
            <p className="text-[10px] text-[#777587]">{cat.sub}</p>
          </SectionCard>
        ))}
      </div>

      {/* Featured rewards */}
      <SectionCard>
        <SectionHeader label="Destacados para ti" icon="stars" action="Ver todo" />
        <div className="p-4 flex gap-3 overflow-x-auto scrollbar-hide">
          {[{pts:250,label:"Voucher Cafetería",sub:"10% descuento"},{pts:800,label:"Entrada Evento",sub:"Acceso premium"},{pts:1500,label:"Artículo Exclusivo",sub:"Edición limitada"}].map((r,i)=>(
            <div key={i} className="flex-shrink-0 w-40 rounded-2xl border border-[#e4e1ee] overflow-hidden tap-active">
              <div className="h-20 bg-[#f0ecf9] flex items-center justify-center relative">
                <Icon name="redeem" fill size="text-4xl" color="text-[#3525cd]" />
                <span className="absolute top-2 right-2 bg-[#3525cd] text-white text-[9px] font-black px-1.5 py-0.5 rounded">{r.pts} pts</span>
              </div>
              <div className="p-2.5"><p className="text-xs font-bold text-[#1b1b24]">{r.label}</p><p className="text-[10px] text-[#777587]">{r.sub}</p></div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Activity */}
      <SectionCard>
        <SectionHeader label="Actividad de puntos" icon="history" />
        {[{pts:"+45",desc:"Compra en Cafetería",t:"Hace 2h",ic:"add",bg:"bg-green-50",c:"text-green-600"},
          {pts:"+100",desc:"Bono de asistencia",t:"Ayer",ic:"military_tech",bg:"bg-[#e2dfff]",c:"text-[#3525cd]"},
          {pts:"-250",desc:"Canje de voucher",t:"Hace 3d",ic:"redeem",bg:"bg-amber-50",c:"text-amber-600"}].map((h,i)=>(
          <ListItem key={i} icon={h.ic} iconBg={h.bg} iconColor={h.c} title={h.desc} subtitle={h.t}
            right={<span className={`font-black text-sm ${h.pts.startsWith("+")?"text-green-600":"text-amber-600"}`}>{h.pts}</span>} />
        ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: RESERVAS
// config: anticipoMin, ventanaCancelacion
// servicios: reservar desde app, zonas, horarios, lista de espera
// ══════════════════════════════════════════════════════════════════════════════
function ReservasTemplate({ cfg, u }) {
  const [tab, setTab] = useState("proximas");
  const [showNew, setShowNew] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const anticipo = cfg.config.anticipoMin;
  const cancelHrs = cfg.config.ventanaCancelacion;

  const SPACES = [
    {id:"comedor",label:"Comedor",icon:"restaurant",avail:"Alta",color:"bg-green-50",c:"text-green-700"},
    {id:"gym",label:"Gym",icon:"fitness_center",avail:"Media",color:"bg-amber-50",c:"text-amber-700"},
    {id:"lab",label:"Laboratorio",icon:"biotech",avail:"Con tutor",color:"bg-blue-50",c:"text-blue-700"},
    {id:"biblio",label:"Biblioteca",icon:"menu_book",avail:"Silencio",color:"bg-purple-50",c:"text-purple-700"},
  ];

  const NEXT = [
    {space:"Comedor Central",icon:"restaurant",hora:"12:30–13:15",status:"Confirmada",statusColor:"text-green-700 bg-green-100"},
    {space:"Sala reuniones B",icon:"groups",hora:"15:00–16:30",status:"Pendiente",statusColor:"text-amber-700 bg-amber-100"},
  ];

  if (showNew) return (
    <div className="px-5 pb-8">
      <button onClick={()=>{setShowNew(false);setSelectedSpace(null);}} className="flex items-center gap-1.5 text-[#777587] text-xs font-semibold mb-5 tap-active">
        <Icon name="arrow_back" size="text-base" color="text-[#777587]" /> Volver
      </button>
      <div className="flex gap-2 mb-5">
        {[1,2,3].map(n=>(
          <div key={n} className={`flex-1 h-1.5 rounded-full ${n===1?"bg-[#3525cd]":"bg-[#e4e1ee]"}`}/>
        ))}
      </div>
      <h2 className="text-2xl font-black text-[#1b1b24] mb-1">Selecciona un espacio</h2>
      <p className="text-sm text-[#777587] mb-5">Elige el área que deseas reservar.</p>
      {anticipo && <ConfigBanner icon="payments" message={`Esta reserva requiere un anticipo mínimo del ${anticipo}%.`} color="amber" />}
      {anticipo && <div className="mb-4"/>}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {SPACES.map(s=>(
          <button key={s.id} onClick={()=>setSelectedSpace(s.id)}
            className={`glass-card rounded-2xl p-4 flex flex-col gap-3 text-left tap-active transition-all ${selectedSpace===s.id?"border-2 border-[#3525cd] bg-[#f0ecf9]":""}`}>
            <div className={`w-11 h-11 rounded-xl ${selectedSpace===s.id?"bg-[#3525cd]/10":"bg-[#f0ecf9]"} flex items-center justify-center`}>
              <Icon name={s.icon} fill size="text-2xl" color={selectedSpace===s.id?"text-[#3525cd]":"text-[#777587]"} />
            </div>
            <div>
              <p className="font-bold text-sm text-[#1b1b24]">{s.label}</p>
              <span className={`text-[10px] font-bold ${s.c} ${s.color} px-2 py-0.5 rounded-full`}>{s.avail}</span>
            </div>
          </button>
        ))}
      </div>
      {cancelHrs && <p className="text-xs text-[#777587] text-center mb-4">Cancela sin costo hasta {cancelHrs}h antes.</p>}
      <PrimaryBtn label="Continuar" icon="arrow_forward" disabled={!selectedSpace} onClick={()=>{setShowNew(false);setSelectedSpace(null);}} />
    </div>
  );

  return (
    <div className="px-5 space-y-4 pb-8">
      <PrimaryBtn label="Nueva Reserva" icon="add_circle" onClick={()=>setShowNew(true)} />
      <div className="flex gap-1 glass-card rounded-2xl p-1">
        {["proximas","historial"].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===t?"bg-[#3525cd] text-white":"text-[#464555]"}`}>
            {t==="proximas"?"Próximas":"Historial"}
          </button>
        ))}
      </div>
      {tab==="proximas" ? (
        <SectionCard>
          {NEXT.map((r,i)=>(
            <div key={i} className="p-4 border-b border-[#e4e1ee]/40 last:border-0">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#e2dfff] flex items-center justify-center">
                    <Icon name={r.icon} fill size="text-xl" color="text-[#3525cd]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#1b1b24]">{r.space}</p>
                    <p className="text-xs text-[#777587]">{cfg.mundo.nombre}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${r.statusColor}`}>{r.status}</span>
              </div>
              <div className="flex gap-4 pt-2 border-t border-[#e4e1ee]/40">
                <span className="text-xs text-[#3525cd] font-semibold flex items-center gap-1"><Icon name="schedule" size="text-sm" color="text-[#3525cd]"/>{r.hora}</span>
              </div>
            </div>
          ))}
        </SectionCard>
      ) : (
        <SectionCard><EmptyState icon="history" title="Sin historial" subtitle="Tus reservas anteriores aparecerán aquí." /></SectionCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: ASISTENCIA
// config: horarioEntrada, horarioSalida
// ══════════════════════════════════════════════════════════════════════════════
function AsistenciaTemplate({ cfg, u }) {
  const [entradas, setEntradas] = useState(8);
  const [salidas, setSalidas] = useState(7);
  const horIn = cfg.config.horarioEntrada || "07:30";
  const horOut = cfg.config.horarioSalida || "14:30";

  const mark = (type) => {
    if(type==="entrada") setEntradas(e=>e+1); else setSalidas(s=>s+1);
    showToast(`${type==="entrada"?"Entrada":"Salida"} registrada`);
  };

  return (
    <div className="px-5 space-y-4 pb-8">
      {/* Horario del mundo */}
      <ConfigBanner icon="schedule" message={`Horario de asistencia: ${horIn} – ${horOut}`} color="blue" />

      {/* Stats */}
      <SectionCard className="p-5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider mb-1">Registros de hoy</p>
            <p className="text-5xl font-black text-[#3525cd]">{entradas+salidas}</p>
          </div>
          <Chip label="Semana 12" color="bg-[#e2dfff] text-[#3525cd]" />
        </div>
        <div className="h-2 w-full bg-[#e4e1ee] rounded-full overflow-hidden flex gap-0.5">
          <div className="h-full bg-emerald-500 rounded-full" style={{width:`${(entradas/(entradas+salidas||1))*65}%`}}/>
          <div className="h-full bg-rose-500 rounded-full" style={{width:`${(salidas/(entradas+salidas||1))*65}%`}}/>
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-[#777587] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Entradas: <b>{entradas}</b></span>
          <span className="text-[#777587] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>Salidas: <b>{salidas}</b></span>
        </div>
      </SectionCard>

      {/* Mark buttons */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {type:"entrada",label:"Entrada",icon:"login",color:"bg-emerald-500",shadow:"shadow-emerald-500/20",tc:"text-emerald-600"},
          {type:"salida",label:"Salida",icon:"logout",color:"bg-rose-500",shadow:"shadow-rose-500/20",tc:"text-rose-600"},
        ].map(btn=>(
          <button key={btn.type} onClick={()=>mark(btn.type)}
            className="glass-card rounded-3xl p-6 flex flex-col items-center gap-3 tap-active">
            <div className={`w-14 h-14 rounded-2xl ${btn.color} flex items-center justify-center shadow-lg ${btn.shadow}`}>
              <Icon name={btn.icon} fill size="text-3xl" color="text-white" />
            </div>
            <div className="text-center">
              <p className={`font-black ${btn.tc}`}>{btn.label}</p>
              <p className="text-[10px] text-[#777587] uppercase font-bold">Marcar ahora</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent */}
      <SectionCard>
        <SectionHeader label="Historial reciente" icon="history" action="Ver todo" />
        {[
          {type:"entrada",lugar:"Puerta Principal",hora:"07:42 AM",ok:true},
          {type:"salida",lugar:"Puerta Secundaria",hora:"Ayer 04:15 PM",ok:null},
          {type:"entrada",lugar:"Puerta Principal",hora:"Ayer 07:55 AM",ok:false},
        ].map((h,i)=>(
          <ListItem key={i}
            icon={h.type==="entrada"?"login":"logout"}
            iconBg={h.type==="entrada"?"bg-emerald-100":"bg-rose-100"}
            iconColor={h.type==="entrada"?"text-emerald-600":"text-rose-600"}
            title={h.type==="entrada"?"Entrada":"Salida"}
            subtitle={`${h.lugar} · ${h.hora}`}
            right={
              h.ok===true ? <Chip label="A tiempo" color="bg-emerald-100 text-emerald-700"/> :
              h.ok===false ? <Chip label="Tarde" color="bg-rose-100 text-rose-700"/> :
              <Chip label="Finalizado" color="bg-[#f0ecf9] text-[#777587]"/>
            }
          />
        ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: RESTRICCIONES (CONTROL PARENTAL)
// config: perfilesControladosActivo, maxPerfilesControlados, registroAlergias,
//         limiteDiarioPerfil, montoAprobacionPadre, horarioConsumo, notificacionConsumoRealTime
// ══════════════════════════════════════════════════════════════════════════════
// Misma taxonomía fija que ALERGENOS_MENU en el panel de comercio
// (joi360-admin/src/Fronts.jsx) — el bloqueo de platos en Menú compara estas
// strings contra item.alergenos, así que deben coincidir exactamente. Es la
// única fuente de "alergias" en la superapp: se usa al crear/editar un
// dependiente (Restricciones) y en el perfil del propio titular (Perfil
// Extendido), en vez de que cada pantalla tenga su propio campo de texto libre.
const ALERGIAS_CATALOG = ["Gluten","Lactosa","Mariscos","Nueces","Huevo","Soya","Frutos rojos","Maní"];

function AlertasConsumoBanner({ guardianId, worldId, reload, onLeida }) {
  const [alertas, setAlertas] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetchAlertasConsumo(guardianId, worldId).then(r => { if (vivo) setAlertas(r || []); }).catch(() => { if (vivo) setAlertas([]); });
    return () => { vivo = false; };
  }, [guardianId, worldId, reload]);

  if (!alertas || alertas.length === 0) return null;
  const marcar = async (id) => {
    setAlertas(a => a.filter(x => x.id !== id));
    try { await marcarAlertaConsumoLeida(id); onLeida?.(); } catch {}
  };
  return (
    <div className="space-y-2">
      {alertas.map(a => (
        <div key={a.id} className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5">
          <Icon name="report" fill size="text-base" color="text-red-600"/>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-red-700 uppercase tracking-wide">{a.tipo === "limite_excedido" ? "Límite diario excedido" : "Alerta de consumo"}</p>
            <p className="text-xs text-red-700 mt-0.5">{a.mensaje}</p>
          </div>
          <button onClick={() => marcar(a.id)} className="text-[10px] font-bold text-red-700 flex-shrink-0 tap-active">Marcar leída</button>
        </div>
      ))}
    </div>
  );
}

function ReglasMundoBanner({ montoAprobacion, horario, limiteDiario }) {
  const [abierto, setAbierto] = useState(false);
  const reglas = [
    montoAprobacion && { icon: "approval", label: `Compras sobre S/ ${montoAprobacion} requieren tu aprobación antes de procesarse.` },
    horario && { icon: "schedule", label: `Horario por defecto del mundo: ${horario}.` },
    limiteDiario != null && { icon: "speed", label: `Límite diario por defecto: S/ ${Number(limiteDiario).toFixed(2)}.` },
  ].filter(Boolean);
  if (!reglas.length) return null;
  return (
    <div className="rounded-2xl bg-[#f0ecf9] overflow-hidden">
      <button onClick={() => setAbierto(a => !a)} className="w-full flex items-center justify-between gap-2 p-3.5 tap-active">
        <div className="flex items-center gap-2.5">
          <Icon name="rule" fill size="text-base" color="text-[#3525cd]" />
          <p className="text-xs font-bold text-[#3525cd]">Reglas de este mundo</p>
        </div>
        <Icon name={abierto ? "expand_less" : "expand_more"} size="text-base" color="text-[#3525cd]" />
      </button>
      {abierto && (
        <div className="px-3.5 pb-3.5 space-y-2.5">
          {reglas.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Icon name={r.icon} fill size="text-sm" color="text-[#777587]" />
              <p className="text-xs text-[#4b4a58] leading-relaxed">{r.label}</p>
            </div>
          ))}
          <p className="text-[10px] text-[#9c9ab0]">Puedes darle a cada dependiente su propio límite, horario y productos bloqueados desde "Configurar restricciones" en su tarjeta.</p>
        </div>
      )}
    </div>
  );
}

function RestriccionesTemplate({ cfg, u }) {
  const nav = useNavigate();
  const worldId = cfg.mundo.id;
  const guardianId = getSyntheticUserId();
  const { maxPerfilesControlados, registroAlergias,
          limiteDiarioPerfil, montoAprobacionPadre, horarioConsumo, notificacionConsumoRealTime } = cfg.config;
  // Cobro por suscripción: capacidad propia (Suscripciones, depende de
  // Wallet) desde el 12-ago — antes vivía como configField escondido dentro
  // de Wallet. Activa = el mundo la prendió; sin eso, ningún dependiente
  // nuevo cobra cuota, sin importar si hay planes creados.
  const suscripcionesCfg = useModuleConfig("suscripciones");
  const perfilesSuscripcion = !!suscripcionesCfg;

  // "Agregar familiar para pedirle su bandita" (Wallet) navega acá con
  // ?agregar=1 — quien vino a pedir una bandita para un dependiente que
  // todavía no existe entra directo al flujo de creación, sin tener que
  // encontrar por su cuenta el módulo de Restricciones.
  const location = useLocation();
  const [dependientes, setDependientes] = useState(null); // [{...dependent, balance, gastadoHoy}]
  const [addingChild, setAddingChild] = useState(() => new URLSearchParams(location.search).get("agregar") === "1");
  const [pasoSuscripcion, setPasoSuscripcion] = useState(false); // paso 2: confirmar cobro antes de crear
  const [nuevo, setNuevo] = useState({ nombre: "", dni: "", alias: "", alergias: [] });
  const [otraAlergiaNueva, setOtraAlergiaNueva] = useState(""); // "+ Otra" del catálogo fijo de alergias, al crear un dependiente
  const [creando, setCreando] = useState(false);
  const [saldoGuardian, setSaldoGuardian] = useState(null);
  const [rechargeFor, setRechargeFor] = useState(null); // dependent_user_id
  const [rechargeMonto, setRechargeMonto] = useState("");
  const [rechargeError, setRechargeError] = useState(null);
  const [dependienteError, setDependienteError] = useState(null);
  const [recharging, setRecharging] = useState(false);
  const [reload, setReload] = useState(0);
  // Planes de suscripción (Task #174) — si el mundo definió varios (mensual/
  // anual, con descuento opcional), el usuario elige entre ellos en vez de
  // pagar un monto fijo único.
  const [planesSuscripcion, setPlanesSuscripcion] = useState(null);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState(null);
  const [codigoAbierto, setCodigoAbierto] = useState(null); // dependent_user_id con QR/código visible
  const [eliminandoId, setEliminandoId] = useState(null); // dependent_user_id con confirmación de borrado abierta
  const [borrandoDep, setBorrandoDep] = useState(false);
  const [errorEliminarDep, setErrorEliminarDep] = useState(null);
  const [editandoAlergiasId, setEditandoAlergiasId] = useState(null); // dependent_user_id en edición
  const [editAlergiasArr, setEditAlergiasArr] = useState([]);
  const [guardandoAlergias, setGuardandoAlergias] = useState(false);
  const [otraAlergiaEdit, setOtraAlergiaEdit] = useState("");
  // Editar perfil de un dependiente ya creado (Task #161) — nombre y DNI,
  // antes fijos desde la creación sin forma de corregirlos.
  const [editandoPerfilId, setEditandoPerfilId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDni, setEditDni] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilError, setPerfilError] = useState(null);
  // Restricciones granulares por dependiente (Task #173) — antes horario y
  // límite diario eran un único valor que RedPontis fijaba para TODO el
  // mundo; ahora el tutor los configura por cada dependiente, y puede elegir
  // qué productos del catálogo real del comercio bloquearle.
  const [restriccionesAbiertoId, setRestriccionesAbiertoId] = useState(null);
  const [restriccionesDraft, setRestriccionesDraft] = useState(null);
  const [catalogoMundo, setCatalogoMundo] = useState(null);
  const [guardandoRestricciones, setGuardandoRestricciones] = useState(false);

  const abrirRestricciones = async (dep) => {
    setRestriccionesAbiertoId(dep.dependent_user_id);
    if (catalogoMundo === null) {
      fetchProductosMundoLive(worldId).then(setCatalogoMundo).catch(() => setCatalogoMundo([]));
    }
    const actual = await fetchRestriccionesDependiente(dep.dependent_user_id, worldId).catch(() => null);
    setRestriccionesDraft({
      horario_inicio: actual?.horario_inicio || "", horario_fin: actual?.horario_fin || "",
      limite_diario: actual?.limite_diario != null ? String(actual.limite_diario) : "",
      productos_bloqueados: actual?.productos_bloqueados || [],
    });
  };
  const guardarRestriccionesBtn = async (dep) => {
    setGuardandoRestricciones(true);
    try {
      await guardarRestriccionesDependiente(worldId, dep.dependent_user_id, guardianId, {
        horario_inicio: restriccionesDraft.horario_inicio || null,
        horario_fin: restriccionesDraft.horario_fin || null,
        limite_diario: restriccionesDraft.limite_diario === "" ? null : +restriccionesDraft.limite_diario,
        productos_bloqueados: restriccionesDraft.productos_bloqueados,
      });
      setRestriccionesAbiertoId(null);
      setReload(k => k + 1);
    } catch {} finally { setGuardandoRestricciones(false); }
  };

  // toISOString() adelanta la fecha en horario de tarde/noche en Perú (UTC-5) —
  // debe coincidir con la fecha local que crearReservaMenu usa para guardar
  // (ver diasStripDe), si no el conteo "gastado hoy" mira el día equivocado.
  const hoyDate = new Date();
  const hoyISO = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, "0")}-${String(hoyDate.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    let vivo = true;
    fetchMisDependientes(guardianId, worldId).then(async rows => {
      if (!vivo) return;
      const restricciones = await fetchRestriccionesDependientesBulk((rows || []).map(d => d.dependent_user_id), worldId).catch(() => []);
      const porId = new Map((restricciones || []).map(r => [r.dependent_user_id, r]));
      const conSaldo = await Promise.all((rows || []).map(async d => {
        const restriccion = porId.get(d.dependent_user_id) || null;
        const limiteEfectivo = restriccion?.limite_diario ?? limiteDiarioPerfil;
        const [balance, reservasHoy] = await Promise.all([
          fetchDependienteBalance(d.dependent_user_id, worldId),
          limiteEfectivo != null ? fetchReservasDeFecha(d.dependent_user_id, worldId, hoyISO).catch(() => []) : Promise.resolve([]),
        ]);
        const gastadoHoy = (reservasHoy || []).reduce((a, r) => a + (+r.monto || 0), 0);
        return { ...d, balance, gastadoHoy, restriccion, limiteEfectivo };
      }));
      setDependientes(conSaldo);
    }).catch(() => { if (vivo) setDependientes([]); });
    return () => { vivo = false; };
  }, [guardianId, worldId, reload]);

  useEffect(() => {
    if (!perfilesSuscripcion) { setPlanesSuscripcion([]); return; }
    let vivo = true;
    fetchPlanesSuscripcionLive(worldId).then(r => { if (vivo) setPlanesSuscripcion(r || []); }).catch(() => { if (vivo) setPlanesSuscripcion([]); });
    return () => { vivo = false; };
  }, [worldId, perfilesSuscripcion]);

  const toggleAlergia = (a) => setNuevo(n => ({ ...n, alergias: n.alergias.includes(a) ? n.alergias.filter(x => x !== a) : [...n.alergias, a] }));
  const precioPlan = p => p.descuento_pct > 0 ? p.precio * (1 - p.descuento_pct / 100) : p.precio;
  const hayPlanes = (planesSuscripcion || []).length > 0;
  const planSeleccionado = (planesSuscripcion || []).find(p => p.id === planSeleccionadoId) || null;
  // El monto fijo único (montoSuscripcion) se retiró — el plan elegido en el
  // paso 2 es el único mecanismo real. Con la suscripción activada pero sin
  // ningún plan creado todavía, no hay forma de cobrar (bloqueado, no un
  // fallback silencioso a un monto sin definir).
  const cuotaSuscripcion = !perfilesSuscripcion ? 0 : hayPlanes ? (planSeleccionado ? precioPlan(planSeleccionado) : null) : null;

  const crear = async () => {
    setCreando(true); setDependienteError(null);
    try {
      await crearDependienteRemote(worldId, guardianId, nuevo.nombre.trim(), nuevo.dni.trim(), nuevo.alergias.join(", "), cuotaSuscripcion || 0, nuevo.alias.trim() || null);
      setNuevo({ nombre: "", dni: "", alias: "", alergias: [] });
      setAddingChild(false); setPasoSuscripcion(false); setPlanSeleccionadoId(null);
      setReload(k => k + 1);
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "dependiente-crear", worldId);
      setDependienteError([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setCreando(false); }
  };

  // Sin suscripción: se crea directo. Con suscripción: pasa a la pantalla de
  // confirmación de cobro (paso 2), donde se ve el saldo real del tutor antes
  // de descontar — el débito en sí lo hace crear()→crearDependienteRemote,
  // que ya cobra vía pagarSupabase (RPC real, rechaza si el saldo no alcanza).
  const continuar = async () => {
    if (!nuevo.nombre.trim()) return;
    if (!perfilesSuscripcion) { crear(); return; }
    setDependienteError(null);
    const saldo = await fetchDependienteBalance(guardianId, worldId).catch(() => 0);
    setSaldoGuardian(saldo);
    setPasoSuscripcion(true);
  };

  const recargar = async (dep) => {
    const monto = +rechargeMonto;
    if (!(monto > 0)) return;
    setRecharging(true); setRechargeError(null);
    try {
      const r = await transferirP2PRemote(guardianId, dep.dependent_user_id, worldId, monto);
      if (r.ok) { setRechargeFor(null); setRechargeMonto(""); setReload(k => k + 1); }
      else {
        const code = r.motivo === "saldo" ? "saldo_insuficiente" : "transferencia_no_valida";
        const err = await errorControlado(code);
        logErrorControlado(code, "dependiente-recarga", worldId);
        setRechargeError(r.motivo === "monto"
          ? "El monto debe ser mayor a cero, con hasta dos decimales."
          : [err.mensaje, err.accion].filter(Boolean).join(" "));
      }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "dependiente-recarga", worldId);
      setRechargeError([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setRecharging(false); }
  };

  // Paso 2: confirmar el cobro de suscripción antes de crear — se ve el
  // saldo real del tutor (fetchDependienteBalance reusado, funciona para
  // cualquier user_id) para que no descubra el rechazo recién al confirmar.
  if (addingChild && pasoSuscripcion) {
    const saldoInsuficiente = saldoGuardian != null && cuotaSuscripcion != null && saldoGuardian < cuotaSuscripcion;
    return (
      <div className="px-5 pb-8">
        <button onClick={()=>setPasoSuscripcion(false)} className="flex items-center gap-1.5 text-[#777587] text-xs font-semibold mb-5 tap-active">
          <Icon name="arrow_back" size="text-base" color="text-[#777587]"/> Volver
        </button>
        <h3 className="text-2xl font-black text-[#1b1b24] mb-1">Confirmar suscripción</h3>
        <p className="text-sm text-[#777587] mb-5">
          {hayPlanes ? `Elige un plan para vincular a ${nuevo.nombre.trim()}.` : `${cfg.mundo.nombre} cobra una cuota única al vincular a ${nuevo.nombre.trim()}.`}
        </p>

        {hayPlanes && (
          <div className="space-y-2 mb-5">
            {planesSuscripcion.map(p => {
              const precio = precioPlan(p);
              const elegido = planSeleccionadoId === p.id;
              return (
                <button key={p.id} onClick={()=>setPlanSeleccionadoId(p.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 tap-active transition-colors ${elegido ? "border-[#3525cd] bg-[#f0ecf9]" : "border-[#e4e1ee]"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#1b1b24] text-sm">{p.nombre}</span>
                    <span className="font-mono text-[9px] uppercase text-[#777587]">{p.periodo === "anual" ? "Anual" : "Mensual"}</span>
                  </div>
                  {p.descripcion && <p className="text-xs text-[#777587] mt-0.5">{p.descripcion}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-black text-[#3525cd]">S/ {precio.toFixed(2)}</span>
                    {p.descuento_pct > 0 && (
                      <>
                        <span className="text-xs text-[#777587] line-through">S/ {Number(p.precio).toFixed(2)}</span>
                        <span className="text-[9px] font-black bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">-{p.descuento_pct}%</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl p-4 border border-[#e4e1ee] space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#777587]">{hayPlanes ? "Plan elegido" : "Cuota de vinculación"}</span>
            <span className="font-black text-[#1b1b24]">{cuotaSuscripcion != null ? `S/ ${cuotaSuscripcion.toFixed(2)}` : "—"}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-[#e4e1ee]">
            <span className="text-sm text-[#777587]">Tu saldo actual</span>
            <span className={`font-black ${saldoInsuficiente ? "text-red-600" : "text-[#1b1b24]"}`}>
              {saldoGuardian == null ? "Cargando…" : `S/ ${saldoGuardian.toFixed(2)}`}
            </span>
          </div>
        </div>
        {saldoInsuficiente ? (
          <>
            <p className="text-xs text-red-600 mb-4">Saldo insuficiente. Recarga tu billetera antes de vincular a {nuevo.nombre.trim()}.</p>
            <PrimaryBtn label="Recargar billetera" icon="add_card" onClick={() => nav ? nav("/pay?tab=recargar") : null} />
          </>
        ) : (
          <>
            {dependienteError && <p className="text-xs text-red-600 mb-3">{dependienteError}</p>}
            <PrimaryBtn label={creando ? "Cobrando y registrando…" : cuotaSuscripcion != null ? `Pagar S/ ${cuotaSuscripcion.toFixed(2)} y registrar` : "Elige un plan"}
              icon="task_alt" disabled={creando || saldoGuardian == null || cuotaSuscripcion == null} onClick={crear} />
          </>
        )}
      </div>
    );
  }

  if (addingChild) return (
    <div className="px-5 pb-8">
      <button onClick={()=>setAddingChild(false)} className="flex items-center gap-1.5 text-[#777587] text-xs font-semibold mb-5 tap-active">
        <Icon name="arrow_back" size="text-base" color="text-[#777587]"/> Volver
      </button>
      <h3 className="text-2xl font-black text-[#1b1b24] mb-1">Agregar dependiente</h3>
      <p className="text-sm text-[#777587] mb-5">
        Registra un menor para controlar su consumo.
        {perfilesSuscripcion && hayPlanes && " Este mundo tiene planes de suscripción para vincular perfiles."}
      </p>
      {perfilesSuscripcion && !hayPlanes && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          Este mundo todavía no tiene planes de suscripción configurados — no se puede vincular un nuevo dependiente hasta que el administrador cree uno.
        </p>
      )}
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Nombre completo</label>
          <input className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none focus:ring-2 focus:ring-[#3525cd]/20"
            placeholder="Ej. Ana García" value={nuevo.nombre} onChange={e=>setNuevo(n=>({...n, nombre: e.target.value}))}/>
        </div>
        <div>
          <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">DNI</label>
          <input className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none focus:ring-2 focus:ring-[#3525cd]/20"
            placeholder="8 dígitos" inputMode="numeric" value={nuevo.dni} onChange={e=>setNuevo(n=>({...n, dni: e.target.value.replace(/\D/g,"")}))}/>
        </div>
        <div>
          <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Alias (opcional)</label>
          <input className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none focus:ring-2 focus:ring-[#3525cd]/20"
            placeholder="Ej. Anita — cómo le dicen" value={nuevo.alias} onChange={e=>setNuevo(n=>({...n, alias: e.target.value}))}/>
        </div>
        {registroAlergias && (
          <div>
            <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Alergias alimentarias</label>
            <div className="flex flex-wrap gap-2 items-center">
              {ALERGIAS_CATALOG.map(a=>(
                <button key={a} onClick={()=>toggleAlergia(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border tap-active transition-colors ${nuevo.alergias.includes(a)?"bg-red-50 border-red-300 text-red-700":"border-[#e4e1ee] text-[#464555]"}`}>{a}</button>
              ))}
              {nuevo.alergias.filter(a=>!ALERGIAS_CATALOG.includes(a)).map(a=>(
                <button key={a} onClick={()=>toggleAlergia(a)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border tap-active bg-red-50 border-red-300 text-red-700">{a}</button>
              ))}
              <input value={otraAlergiaNueva} onChange={e=>setOtraAlergiaNueva(e.target.value)}
                onKeyDown={e=>{ if (e.key==="Enter" && otraAlergiaNueva.trim()) { e.preventDefault(); setNuevo(n=>({...n, alergias: [...n.alergias, otraAlergiaNueva.trim()]})); setOtraAlergiaNueva(""); } }}
                onBlur={()=>{ if (otraAlergiaNueva.trim()) { setNuevo(n=>({...n, alergias: [...n.alergias, otraAlergiaNueva.trim()]})); setOtraAlergiaNueva(""); } }}
                placeholder="+ Otra…" className="px-3 py-1.5 rounded-full text-xs border border-dashed border-[#c7c4d8] text-[#464555] bg-transparent outline-none w-20 focus:w-32 transition-all"/>
            </div>
          </div>
        )}
        {dependienteError && <p className="text-xs text-red-600">{dependienteError}</p>}
        <PrimaryBtn label={creando ? "Registrando…" : perfilesSuscripcion ? "Continuar" : "Registrar dependiente"}
          icon={perfilesSuscripcion ? "arrow_forward" : "person_add"} disabled={!nuevo.nombre.trim() || creando || (perfilesSuscripcion && !hayPlanes)} onClick={continuar} />
      </div>
    </div>
  );

  const total = dependientes || [];

  return (
    <div className="px-5 space-y-4 pb-8">
      <AlertasConsumoBanner guardianId={guardianId} worldId={worldId} reload={reload} onLeida={() => setReload(k => k + 1)} />

      <ReglasMundoBanner montoAprobacion={montoAprobacionPadre} horario={horarioConsumo} limiteDiario={limiteDiarioPerfil} />

      <div className="flex justify-between items-center">
        <div>
          <p className="font-black text-[#1b1b24]">Mi familia</p>
          <p className="text-xs text-[#777587]">{total.length} de {maxPerfilesControlados || "∞"} dependientes</p>
        </div>
        {(!maxPerfilesControlados || total.length < maxPerfilesControlados) && (
          <button onClick={()=>setAddingChild(true)}
            className="flex items-center gap-1.5 bg-[#3525cd] text-white text-xs font-black px-3 py-2 rounded-2xl tap-active"
            style={{boxShadow:"0 4px 12px rgba(53,37,205,0.25)"}}>
            <Icon name="add" size="text-sm" color="text-white"/>Añadir
          </button>
        )}
      </div>

      <StatGrid stats={[
        {label:"Saldo total",value:`S/ ${total.reduce((a,c)=>a+(c.balance||0),0).toFixed(2)}`,color:"text-[#3525cd]"},
        {label:"Dependientes",value:total.length,color:"text-green-600"},
      ]} />

      {dependientes === null ? (
        <SectionCard className="p-6 text-center text-sm text-[#777587]">Cargando…</SectionCard>
      ) : total.length === 0 ? (
        <SectionCard><EmptyState icon="family_restroom" title="Sin dependientes" subtitle="Agrega un familiar para controlar su consumo y recargarle saldo."/></SectionCard>
      ) : total.map((c)=>{
        const alergiasArr = (c.alergias || "").split(",").map(a=>a.trim()).filter(Boolean);
        return (
        <SectionCard key={c.id}>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#e2dfff] flex items-center justify-center">
                  <span className="text-[#3525cd] font-black text-xl">{c.nombre[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-black text-[#1b1b24]">{c.alias || c.nombre}</p>
                    {editandoPerfilId !== c.dependent_user_id && (
                      <button onClick={()=>{setEditandoPerfilId(c.dependent_user_id); setEditNombre(c.nombre); setEditDni(c.dni||""); setEditAlias(c.alias||""); setPerfilError(null);}}
                        className="w-5 h-5 flex items-center justify-center tap-active flex-shrink-0">
                        <Icon name="edit" size="text-xs" color="text-[#777587]"/>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#777587] font-mono">{c.alias ? c.nombre : ""}{c.alias && c.dni ? " · " : ""}{c.dni ? `DNI ${c.dni}` : (c.alias ? "" : c.dependent_user_id.slice(0,12))}</p>
                  {registroAlergias && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {alergiasArr.map(a=><span key={a} className="text-[9px] font-black bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">{a}</span>)}
                      {editandoAlergiasId !== c.dependent_user_id && (
                        <button onClick={()=>{setEditandoAlergiasId(c.dependent_user_id); setEditAlergiasArr(alergiasArr); setOtraAlergiaEdit("");}}
                          className="text-[9px] font-bold text-[#3525cd] tap-active">{alergiasArr.length ? "Editar" : "+ Agregar alergias"}</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={()=>setCodigoAbierto(codigoAbierto === c.dependent_user_id ? null : c.dependent_user_id)}
                className="glass-card w-9 h-9 rounded-full flex items-center justify-center tap-active flex-shrink-0">
                <Icon name="qr_code" size="text-base" color="text-[#3525cd]"/>
              </button>
            </div>
            {editandoPerfilId === c.dependent_user_id && (
              <div className="bg-[#f0ecf9] rounded-2xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider">Editar perfil</p>
                <div>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-1">Nombre completo</label>
                  <input className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-[#1b1b24] outline-none"
                    value={editNombre} onChange={e=>setEditNombre(e.target.value)}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-1">DNI</label>
                  <input className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-[#1b1b24] outline-none"
                    placeholder="8 dígitos" inputMode="numeric" value={editDni} onChange={e=>setEditDni(e.target.value.replace(/\D/g,""))}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-1">Alias (opcional)</label>
                  <input className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-[#1b1b24] outline-none"
                    placeholder="Cómo le dicen" value={editAlias} onChange={e=>setEditAlias(e.target.value)}/>
                </div>
                {perfilError && <p className="text-xs text-red-600">{perfilError}</p>}
                <div className="flex gap-2">
                  <button onClick={()=>setEditandoPerfilId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[#777587] tap-active">Cancelar</button>
                  <button disabled={guardandoPerfil || !editNombre.trim()} onClick={async()=>{
                    setGuardandoPerfil(true); setPerfilError(null);
                    try {
                      await actualizarDependientePerfilRemote(c.dependent_user_id, { nombre: editNombre.trim(), dni: editDni.trim(), alias: editAlias.trim() });
                      setEditandoPerfilId(null);
                      setReload(k=>k+1);
                    } catch { setPerfilError("No se pudo guardar. Intenta de nuevo."); } finally { setGuardandoPerfil(false); }
                  }} className="flex-1 py-2.5 bg-[#3525cd] text-white rounded-xl font-bold text-sm tap-active disabled:opacity-50">{guardandoPerfil?"Guardando…":"Guardar"}</button>
                </div>
                <button onClick={()=>{setEditandoPerfilId(null); setEliminandoId(c.dependent_user_id); setErrorEliminarDep(null);}}
                  className="w-full py-2 text-xs font-bold text-red-600 tap-active">Eliminar dependiente</button>
              </div>
            )}
            {eliminandoId === c.dependent_user_id && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-red-700">¿Eliminar a {c.nombre}?</p>
                <p className="text-xs text-red-700/80 leading-relaxed">Se borra su perfil, restricciones y se libera su bandita vinculada (si tiene). Esta acción no se puede deshacer.</p>
                {errorEliminarDep && <p className="text-xs font-bold text-red-700">{errorEliminarDep}</p>}
                <div className="flex gap-2">
                  <button onClick={()=>setEliminandoId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[#777587] bg-white tap-active">Cancelar</button>
                  <button disabled={borrandoDep} onClick={async()=>{
                    setBorrandoDep(true); setErrorEliminarDep(null);
                    try {
                      const { balance } = await verificarBloqueoEliminarDependiente(c.dependent_user_id, worldId);
                      if (balance > 0) {
                        setErrorEliminarDep(`Tiene S/ ${balance.toFixed(2)} en su billetera — transfiérelo antes de eliminarlo.`);
                        return;
                      }
                      await eliminarDependienteRemote(c.dependent_user_id, worldId);
                      setEliminandoId(null);
                      setReload(k=>k+1);
                    } catch { setErrorEliminarDep("No se pudo eliminar. Intenta de nuevo."); } finally { setBorrandoDep(false); }
                  }} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm tap-active disabled:opacity-50">{borrandoDep?"Eliminando…":"Sí, eliminar"}</button>
                </div>
              </div>
            )}
            {editandoAlergiasId === c.dependent_user_id && (
              <div className="bg-[#f0ecf9] rounded-2xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider">Alergias alimentarias de {c.nombre.split(" ")[0]}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {ALERGIAS_CATALOG.map(a=>(
                    <button key={a} onClick={()=>setEditAlergiasArr(arr=>arr.includes(a)?arr.filter(x=>x!==a):[...arr,a])}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border tap-active transition-colors ${editAlergiasArr.includes(a)?"bg-red-50 border-red-300 text-red-700":"bg-white border-[#e4e1ee] text-[#464555]"}`}>{a}</button>
                  ))}
                  {editAlergiasArr.filter(a=>!ALERGIAS_CATALOG.includes(a)).map(a=>(
                    <button key={a} onClick={()=>setEditAlergiasArr(arr=>arr.filter(x=>x!==a))}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border tap-active bg-red-50 border-red-300 text-red-700">{a}</button>
                  ))}
                  <input value={otraAlergiaEdit} onChange={e=>setOtraAlergiaEdit(e.target.value)}
                    onKeyDown={e=>{ if (e.key==="Enter" && otraAlergiaEdit.trim()) { e.preventDefault(); setEditAlergiasArr(arr=>[...arr, otraAlergiaEdit.trim()]); setOtraAlergiaEdit(""); } }}
                    onBlur={()=>{ if (otraAlergiaEdit.trim()) { setEditAlergiasArr(arr=>[...arr, otraAlergiaEdit.trim()]); setOtraAlergiaEdit(""); } }}
                    placeholder="+ Otra…" className="px-3 py-1.5 rounded-full text-xs border border-dashed border-[#c7c4d8] text-[#464555] bg-white outline-none w-20 focus:w-32 transition-all"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setEditandoAlergiasId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[#777587] tap-active">Cancelar</button>
                  <button disabled={guardandoAlergias} onClick={async()=>{
                    setGuardandoAlergias(true);
                    try {
                      await actualizarDependienteAlergiasRemote(c.dependent_user_id, editAlergiasArr.join(", "));
                      setEditandoAlergiasId(null);
                      setReload(k=>k+1);
                    } catch {} finally { setGuardandoAlergias(false); }
                  }} className="flex-1 py-2.5 bg-[#3525cd] text-white rounded-xl font-bold text-sm tap-active disabled:opacity-50">{guardandoAlergias?"Guardando…":"Guardar"}</button>
                </div>
              </div>
            )}
            {codigoAbierto === c.dependent_user_id && (
              <div className="bg-[#f0ecf9] rounded-2xl p-4">
                <p className="text-xs text-[#777587] text-center mb-3">Muestra esto en el POS del comercio para identificar a {c.nombre.split(" ")[0]}.</p>
                <QRCode label={c.nombre} sub="Identificación en el POS · QR/pulsera" value={c.dependent_user_id} />
                <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 mt-3">
                  <p className="font-mono text-xs text-[#1b1b24]">{c.dependent_user_id}</p>
                  <button onClick={() => navigator.clipboard?.writeText(c.dependent_user_id)} className="w-7 h-7 rounded-full flex items-center justify-center tap-active flex-shrink-0">
                    <Icon name="content_copy" size="text-sm" color="text-[#3525cd]"/>
                  </button>
                </div>
              </div>
            )}
            <div className={`grid gap-2 ${c.limiteEfectivo != null ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="bg-[#f0ecf9] p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold text-[#777587] uppercase">Saldo</p>
                <p className="font-black text-[#1b1b24] text-sm mt-0.5">S/ {(c.balance||0).toFixed(2)}</p>
              </div>
              <div className="bg-[#f0ecf9] p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold text-[#777587] uppercase">Horario</p>
                <p className="font-black text-[#1b1b24] text-[10px] mt-0.5">
                  {c.restriccion?.horario_inicio ? `${c.restriccion.horario_inicio}-${c.restriccion.horario_fin}` : horarioConsumo || "Sin límite"}
                </p>
              </div>
              {c.limiteEfectivo != null && (
                <div className={`p-2.5 rounded-xl text-center ${c.gastadoHoy >= c.limiteEfectivo ? "bg-red-50" : "bg-[#f0ecf9]"}`}>
                  <p className="text-[10px] font-bold text-[#777587] uppercase">Hoy</p>
                  <p className={`font-black text-sm mt-0.5 ${c.gastadoHoy >= c.limiteEfectivo ? "text-red-600" : "text-[#1b1b24]"}`}>S/ {(c.gastadoHoy||0).toFixed(0)}/{Number(c.limiteEfectivo).toFixed(0)}</p>
                </div>
              )}
            </div>
            <button onClick={()=>restriccionesAbiertoId === c.dependent_user_id ? setRestriccionesAbiertoId(null) : abrirRestricciones(c)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#3525cd] bg-[#f0ecf9] tap-active">
              <Icon name="tune" size="text-sm" color="text-[#3525cd]"/>
              {restriccionesAbiertoId === c.dependent_user_id ? "Cerrar restricciones" : c.restriccion ? "Editar restricciones" : "Configurar restricciones"}
            </button>
            {restriccionesAbiertoId === c.dependent_user_id && restriccionesDraft && (
              <div className="bg-[#f0ecf9] rounded-2xl p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider">Horario de consumo</label>
                    {(restriccionesDraft.horario_inicio || restriccionesDraft.horario_fin) ? (
                      <button onClick={()=>setRestriccionesDraft(d=>({...d, horario_inicio: "", horario_fin: ""}))}
                        className="text-[9px] font-bold text-[#3525cd] tap-active">Quitar restricción</button>
                    ) : (
                      <span className="text-[9px] font-bold text-green-700">{horarioConsumo ? `Usa el del mundo: ${horarioConsumo}` : "Sin restricción de horario"}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-[#777587] block mb-1">Desde</label>
                      <input type="time" className="w-full bg-white rounded-xl px-3 py-2 text-sm text-[#1b1b24] outline-none"
                        value={restriccionesDraft.horario_inicio} onChange={e=>setRestriccionesDraft(d=>({...d, horario_inicio: e.target.value}))}/>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#777587] block mb-1">Hasta</label>
                      <input type="time" className="w-full bg-white rounded-xl px-3 py-2 text-sm text-[#1b1b24] outline-none"
                        value={restriccionesDraft.horario_fin} onChange={e=>setRestriccionesDraft(d=>({...d, horario_fin: e.target.value}))}/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-1">Límite diario (S/)</label>
                  <input type="number" min="0" placeholder={limiteDiarioPerfil != null ? `Por defecto del mundo: S/ ${limiteDiarioPerfil}` : "Sin límite"}
                    className="w-full bg-white rounded-xl px-3 py-2 text-sm text-[#1b1b24] outline-none"
                    value={restriccionesDraft.limite_diario} onChange={e=>setRestriccionesDraft(d=>({...d, limite_diario: e.target.value}))}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Productos bloqueados</label>
                  {catalogoMundo === null ? (
                    <p className="text-xs text-[#777587]">Cargando catálogo…</p>
                  ) : catalogoMundo.length === 0 ? (
                    <p className="text-xs text-[#777587]">Este mundo todavía no tiene productos cargados.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto bg-white rounded-xl divide-y divide-[#e4e1ee]">
                      {catalogoMundo.map(p => {
                        const bloqueado = restriccionesDraft.productos_bloqueados.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer">
                            <span className={bloqueado ? "text-red-600 font-semibold" : "text-[#1b1b24]"}>{p.name}</span>
                            <input type="checkbox" checked={bloqueado} onChange={()=>setRestriccionesDraft(d=>({
                              ...d, productos_bloqueados: bloqueado ? d.productos_bloqueados.filter(id=>id!==p.id) : [...d.productos_bloqueados, p.id],
                            }))}/>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setRestriccionesAbiertoId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[#777587] tap-active">Cancelar</button>
                  <button disabled={guardandoRestricciones} onClick={()=>guardarRestriccionesBtn(c)}
                    className="flex-1 py-2.5 bg-[#3525cd] text-white rounded-xl font-bold text-sm tap-active disabled:opacity-50">{guardandoRestricciones?"Guardando…":"Guardar"}</button>
                </div>
              </div>
            )}
            {rechargeFor === c.dependent_user_id ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="flex items-center bg-[#f0ecf9] rounded-2xl px-3 flex-1">
                    <span className="text-[#777587] font-bold mr-1 text-sm">S/</span>
                    <input autoFocus className="flex-1 text-lg font-black text-[#1b1b24] bg-transparent py-2.5 outline-none" type="number"
                      value={rechargeMonto} onChange={e=>setRechargeMonto(soloImporte(e.target.value))} placeholder="0.00"/>
                  </div>
                  <button disabled={!rechargeMonto || recharging} onClick={()=>recargar(c)}
                    className="px-4 py-2.5 bg-[#3525cd] text-white rounded-2xl font-bold text-sm tap-active disabled:opacity-50">
                    {recharging ? "…" : "Enviar"}
                  </button>
                  <button onClick={()=>{setRechargeFor(null);setRechargeMonto("");setRechargeError(null);}} className="text-[#777587] text-xs">Cancelar</button>
                </div>
                {rechargeError && <p className="text-xs text-red-600">{rechargeError}</p>}
              </div>
            ) : (
              <button onClick={()=>setRechargeFor(c.dependent_user_id)}
                className="w-full py-3 bg-[#3525cd] text-white rounded-2xl font-bold text-sm tap-active" style={{boxShadow:"0 4px 12px rgba(53,37,205,0.25)"}}>
                Recargar desde mi saldo
              </button>
            )}
          </div>
        </SectionCard>
      );})}

      {notificacionConsumoRealTime && (
        <ConfigBanner icon="notifications_active" message="Los intentos de compra que excedan el límite diario o incluyan un alérgeno bloqueado aparecen como alerta arriba, al abrir esta sección." color="blue"/>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: ACCESOS
// config: zonas, validacionDoble
// servicios: TAQ NFC, QR scan, geofencing, horarios
// Caso Raimondi: además del propio acceso del titular, refleja el ingreso/
// salida real de cada dependiente (perfil manejado con bandita NFC) — el
// colegio registra el movimiento desde TabAccesos (MundoDetail.jsx, ya
// genérico por user_id, no requirió cambios) y el padre lo ve aquí.
// ══════════════════════════════════════════════════════════════════════════════
function AccesosTemplate({ cfg, u }) {
  const worldId = cfg.mundo.id;
  const zonas = (cfg.config.zonas || "Principal").split(",").map(z=>z.trim());
  const myCode = getSyntheticUserId();
  const [accesos, setAccesos] = useState(null);
  const [dependientes, setDependientes] = useState(null);
  const [accesosDependientes, setAccesosDependientes] = useState({});
  const [qrAbierto, setQrAbierto] = useState(null); // dependent_user_id o null
  const [canalesAdq, setCanalesAdq] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetchMisAccesos(myCode, worldId).then(r => { if (vivo) setAccesos(r || []); }).catch(() => { if (vivo) setAccesos([]); });
    fetchMisDependientes(myCode, worldId).then(async deps => {
      if (!vivo) return;
      setDependientes(deps || []);
      const entries = await Promise.all((deps || []).map(async d =>
        [d.dependent_user_id, await fetchMisAccesos(d.dependent_user_id, worldId).catch(() => [])]
      ));
      if (vivo) setAccesosDependientes(Object.fromEntries(entries));
    }).catch(() => { if (vivo) setDependientes([]); });
    fetchAcquiringChannelsLive(worldId).then(r => { if (vivo) setCanalesAdq(r || []); }).catch(() => { if (vivo) setCanalesAdq([]); });
    return () => { vivo = false; };
  }, [worldId, myCode]);

  return (
    <div className="px-5 space-y-4 pb-8">
      <SectionCard className="p-6">
        <QRCode label={cfg.mundo.nombre} sub="Muestra este QR en el punto de acceso" value={myCode} />
        {/* Medios de pago habilitados */}
        <div className="mt-4 pt-4 border-t border-[#e4e1ee]/50">
          <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider mb-2">Medios de pago en comercios</p>
          <div className="flex flex-wrap gap-2">
            {(canalesAdq || []).map(ch=>(
              <div key={ch.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f0ecf9] rounded-xl">
                <Icon name={ch.icon} fill size="text-sm" color="text-[#3525cd]" />
                <span className="text-[10px] font-semibold text-[#464555]">{ch.nombre}</span>
              </div>
            ))}
          </div>
        </div>
        {cfg.config.validacionDoble && (
          <div className="mt-4"><ConfigBanner icon="security" message="Esta zona requiere doble validación: TAQ NFC + PIN." color="blue"/></div>
        )}
        <div className="flex gap-2 mt-4">
          <PrimaryBtn label="Refrescar QR" icon="refresh" full={false} />
          <button className="flex-1 py-4 glass-card rounded-2xl font-bold text-sm text-[#464555] tap-active flex items-center justify-center gap-2">
            <Icon name="share" size="text-base" color="text-[#464555]"/>Compartir
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader label="Zonas habilitadas" icon="map" />
        {zonas.map((z,i)=>(
          <ListItem key={i} icon="door_open" iconBg="bg-[#e2dfff]" title={z} subtitle="Acceso activo"
            right={<Chip label="Activa" color="bg-green-100 text-green-700" dot="bg-green-500"/>} />
        ))}
      </SectionCard>

      <SectionCard>
        <SectionHeader label="Registros de acceso" icon="history"/>
        {accesos === null ? (
          <p className="px-4 py-6 text-sm text-[#777587]">Cargando…</p>
        ) : accesos.length === 0 ? (
          <div className="px-4 pb-4"><EmptyState icon="history" title="Sin registros aún" subtitle="Cuando registres tu ingreso o salida en un punto de acceso, aparecerá aquí."/></div>
        ) : accesos.map(h => (
          <ListItem key={h.id} icon={h.tipo==="entrada"?"login":"logout"}
            iconBg={h.tipo==="entrada"?"bg-emerald-100":"bg-rose-100"} iconColor={h.tipo==="entrada"?"text-emerald-600":"text-rose-600"}
            title={h.tipo==="entrada"?"Entrada":"Salida"} subtitle={`${h.zona || "Sin zona"} · ${new Date(h.created_at).toLocaleString("es-PE")}`}
          />
        ))}
      </SectionCard>

      {/* Accesos de mi familia — entrada/salida real de cada dependiente (ej. alumno con bandita NFC) */}
      {dependientes && dependientes.length > 0 && (
        <SectionCard>
          <SectionHeader label="Accesos de mi familia" icon="family_restroom"/>
          <div className="px-4 pb-4 space-y-3">
            {dependientes.map(d => {
              const historial = accesosDependientes[d.dependent_user_id] || [];
              const ultimo = historial[0];
              const dentro = ultimo?.tipo === "entrada";
              return (
                <div key={d.id} className="border border-[#e4e1ee] rounded-2xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#1b1b24]">{d.nombre}</p>
                      {ultimo ? (
                        <p className={`text-xs mt-0.5 font-semibold flex items-center gap-1 ${dentro ? "text-emerald-600" : "text-rose-600"}`}>
                          <Icon name={dentro ? "login" : "logout"} size="text-xs" color={dentro ? "text-emerald-600" : "text-rose-600"}/>
                          {dentro ? "Dentro del colegio" : "Fuera del colegio"} · {new Date(ultimo.created_at).toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ) : (
                        <p className="text-xs text-[#777587] mt-0.5">Sin registros de acceso aún</p>
                      )}
                    </div>
                    <button onClick={() => setQrAbierto(o => o === d.dependent_user_id ? null : d.dependent_user_id)}
                      className="flex-shrink-0 text-[10px] font-bold text-[#3525cd] bg-[#f0ecf9] px-3 py-1.5 rounded-xl tap-active">
                      {qrAbierto === d.dependent_user_id ? "Ocultar código" : "Ver código"}
                    </button>
                  </div>
                  {qrAbierto === d.dependent_user_id && (
                    <div className="mt-3 pt-3 border-t border-[#e4e1ee]">
                      <QRCode label={d.nombre} sub="Código de acceso — bandita NFC o QR en portería" value={d.dependent_user_id} />
                    </div>
                  )}
                  {historial.length > 1 && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#e4e1ee]/60 space-y-1">
                      {historial.slice(1, 4).map(h => (
                        <p key={h.id} className="text-[10px] text-[#777587]">
                          {h.tipo === "entrada" ? "Entrada" : "Salida"} · {h.zona || "Sin zona"} · {new Date(h.created_at).toLocaleString("es-PE")}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: CASHBACK
// config: porcentajeDefault, topeMensual
// ══════════════════════════════════════════════════════════════════════════════
function CashbackTemplate({ cfg, u }) {
  const pct = cfg.config.porcentajeDefault || 3;
  const tope = cfg.config.topeMensual;

  return (
    <div className="px-5 space-y-4 pb-8">
      <div className="rounded-3xl p-6 text-white" style={{background:"linear-gradient(135deg,#7e3000 0%,#a44100 100%)"}}>
        <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">Cashback disponible</p>
        <p className="text-5xl font-black">S/ 24.50</p>
        <p className="text-white/60 text-xs mt-2">+ S/ 8.30 pendiente de acreditar</p>
        {tope && <p className="text-white/40 text-[10px] mt-1">Tope mensual: S/ {tope}</p>}
        <button className="mt-4 bg-white text-[#7b2f00] text-sm font-black px-5 py-2.5 rounded-2xl tap-active">Transferir a billetera</button>
      </div>

      <SectionCard className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#1b1b24]">Tu tasa de retorno</p>
          <span className="text-2xl font-black text-[#7b2f00]">{pct}%</span>
        </div>
        <p className="text-xs text-[#777587] mt-1">Por cada S/ 100 que gastas recibes S/ {pct} de vuelta.</p>
        <div className="mt-3 p-3 bg-orange-50 rounded-2xl">
          <p className="text-xs text-orange-700">💡 Gasta en <b>Cafetería Central</b> para acumular más rápido</p>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader label="Historial de cashback" icon="history"/>
        {[{l:"Cafetería Central",s:"+S/ 1.55",t:"Hoy",ic:"restaurant",bg:"bg-orange-50",c:"text-orange-500"},
          {l:"Librería Campus",s:"+S/ 4.20",t:"Ayer",ic:"menu_book",bg:"bg-blue-50",c:"text-blue-500"},
          {l:"Tienda JOI",s:"+S/ 18.75",t:"Hace 3d",ic:"storefront",bg:"bg-purple-50",c:"text-purple-500"}].map((h,i)=>(
          <ListItem key={i} icon={h.ic} iconBg={h.bg} iconColor={h.c} title={h.l} subtitle={h.t}
            right={<span className="font-black text-sm text-orange-600">{h.s}</span>}/>
        ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: MENU (Gantt #91 — Caso Raimondi)
// config: diasAnticipacion, cuposPorMenu · asociado a comercios reales y su
// catálogo (products). Checkout tipo carrito (mismo mecanismo que el
// Marketplace) + membresía: el titular reserva el módulo Menú a un perfil de
// familiar (dependiente) puntual — selector "Pedir para" antes de armar el
// carrito, cobra del saldo propio del perfil seleccionado (los dependientes
// tienen wallet propia), y muestra sus alergias registradas si las tiene.
// El retiro/entrega se sigue validando en el POS del comercio.
// ══════════════════════════════════════════════════════════════════════════════
// Strip calendar genérico: N días desde hoy, cada uno resuelto a su
// diaSemana real (0=domingo..6=sábado, igual que Date.getDay()) — reutilizable
// por cualquier mundo con un caso de "menú/turno recurrente por día", no es
// específico al Caso Raimondi.
function diasStripDe(cantidad) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(hoy); d.setDate(d.getDate() + i);
    // toISOString() convierte a UTC antes de formatear — en horario de tarde/noche
    // en Perú (UTC-5) eso adelanta la fecha un día (reservas de "hoy" caían en
    // "mañana" pese a que el strip mostraba "HOY" resaltado). Formatear en local.
    const fechaLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      fecha: fechaLocal,
      diaSemana: d.getDay(),
      diaLabel: d.toLocaleDateString("es-PE", { weekday: "short" }).replace(".", ""),
      numLabel: d.getDate(),
      esHoy: i === 0,
    };
  });
}

// Borrador de reserva (día + para quién + carrito) sobrevive a la navegación
// fuera de Menú — el caso real es "no tengo saldo, voy a Recargar, vuelvo":
// sin esto, el carrito armado se perdía apenas se salía de la pantalla.
function draftKey(worldId) { return `joi360:menu-draft:${worldId}`; }
function leerDraft(worldId) {
  try { return JSON.parse(sessionStorage.getItem(draftKey(worldId)) || "null"); } catch { return null; }
}

function MenuTemplate({ cfg, u }) {
  const worldId = cfg.mundo.id;
  const nav = useNavigate();
  const userId = getSyntheticUserId();
  const nombreTitular = u?.auth?.nombre || "Yo";
  const { saldo: saldoTitular, refresh: refreshWallet } = useWalletLive(worldId);
  const comercios = useMerchantsLive(worldId);
  const controlCfg = useModuleConfig("control");
  const limiteDiarioDefault = controlCfg?.config?.limiteDiarioPerfil ?? null;
  const draftInicial = leerDraft(worldId);

  const [vista, setVista] = useState("calendario"); // calendario | reservas
  // metodoReserva ("saldo" | "qr") es una decisión real del admin que antes no
  // tenía ningún efecto: el checkout siempre cobraba saldo sin importar lo
  // configurado. En modo QR aún no existe un flujo real de canje en POS —
  // se avisa honestamente en vez de simular un cobro que el mundo pidió evitar.
  const metodoReserva = cfg.config.metodoReserva || "saldo";
  const [metodoElegido, setMetodoElegido] = useState("saldo"); // solo relevante si metodoReserva === "ambos"
  const dias = cfg.config.diasAnticipacion || 7;
  const strip = diasStripDe(Math.min(Math.max(dias, 1), 14));
  const [fecha, setFecha] = useState(draftInicial?.fecha || strip[0].fecha);
  const diaActivo = strip.find(d => d.fecha === fecha) || strip[0];

  const [menuDelDia, setMenuDelDia] = useState(null);
  const [misReservas, setMisReservas] = useState(null);
  const [filtroComercio, setFiltroComercio] = useState("todos");
  const [dependientes, setDependientes] = useState(null);
  const [miPerfilExt, setMiPerfilExt] = useState(null); // alergias propias del titular (Perfil Extendido)
  const [restricciones, setRestricciones] = useState({}); // { [dependent_user_id]: dependent_restrictions row }
  const [beneficiarioId, setBeneficiarioId] = useState(draftInicial?.beneficiarioId ?? null); // null = todavía no se eligió a propósito
  const [saldoBeneficiario, setSaldoBeneficiario] = useState(null);
  const [cart, setCart] = useState(draftInicial?.cart || []);
  const [enCheckout, setEnCheckout] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [avisoMixto, setAvisoMixto] = useState(false);

  // Guarda el borrador en cada cambio real — así "Recargar saldo y volver"
  // (o cualquier otra salida sin querer, como una llamada) no borra lo que
  // ya se había armado.
  useEffect(() => {
    try {
      if (cart.length) sessionStorage.setItem(draftKey(worldId), JSON.stringify({ fecha, beneficiarioId, cart }));
      else sessionStorage.removeItem(draftKey(worldId));
    } catch {}
  }, [worldId, fecha, beneficiarioId, cart]);

  useEffect(() => {
    let vivo = true;
    fetchMisDependientes(userId, worldId).then(async r => {
      if (!vivo) return;
      setDependientes(r || []);
      const rest = await fetchRestriccionesDependientesBulk((r || []).map(d => d.dependent_user_id), worldId).catch(() => []);
      if (vivo) setRestricciones(Object.fromEntries((rest || []).map(x => [x.dependent_user_id, x])));
    }).catch(() => { if (vivo) setDependientes([]); });
    fetchMiPerfilExtendido(userId, worldId).then(r => { if (vivo) setMiPerfilExt(r); }).catch(() => { if (vivo) setMiPerfilExt(null); });
    return () => { vivo = false; };
  }, [worldId]);

  // El carrito es por día — cambiar de día empieza una selección nueva. La
  // única excepción es el primer render: si venimos de un borrador
  // restaurado (sessionStorage) para este mismo día, no hay que vaciarlo.
  const primerRenderMenu = React.useRef(true);
  useEffect(() => {
    let vivo = true;
    setMenuDelDia(null); setResultado(null);
    if (primerRenderMenu.current) primerRenderMenu.current = false; else setCart([]);
    fetchMenuDelDia(worldId, diaActivo.diaSemana).then(r => { if (vivo) setMenuDelDia(r || []); }).catch(() => { if (vivo) setMenuDelDia([]); });
    return () => { vivo = false; };
  }, [worldId, diaActivo.diaSemana]);

  const refrescarSaldoBeneficiario = () => {
    if (beneficiarioId === null) return;
    if (beneficiarioId === userId) { setSaldoBeneficiario(saldoTitular); return; }
    fetchDependienteBalance(beneficiarioId, worldId).then(setSaldoBeneficiario).catch(() => setSaldoBeneficiario(null));
  };
  useEffect(refrescarSaldoBeneficiario, [beneficiarioId, worldId, saldoTitular]);

  const nombreDe = id => comercios.find(c => c.id === id)?.nombre || "Comercio";

  // Beneficiarios: el titular + TODOS sus dependientes reales, directo — sin
  // un paso previo de "activar membresía" por familiar. Ese toggle mezclaba
  // dos cosas que no tienen relación: membresía/suscripción es un concepto
  // de pago del mundo (planes, Task #174), y elegir para quién es un menú es
  // solo identificar al beneficiario, igual que ya funciona en Billetera y
  // Restricciones. Las alergias del titular vienen de su propio Perfil
  // Extendido — antes quedaban fuera del bloqueo de platos, solo se aplicaba
  // a dependientes.
  const beneficiarios = [
    { id: userId, nombre: nombreTitular, tipo: "titular", alergias: miPerfilExt?.alergias || null,
      alergiasArr: (miPerfilExt?.alergias || "").split(",").map(a => a.trim()).filter(Boolean), restriccion: null },
    ...(dependientes || [])
      .map(d => ({ id: d.dependent_user_id, nombre: d.nombre, tipo: "dependiente", alergias: d.alergias, alergiasArr: (d.alergias || "").split(",").map(a => a.trim()).filter(Boolean), restriccion: restricciones[d.dependent_user_id] || null })),
  ];
  // Sin fallback automático al titular: si hay dependientes, la usuaria
  // SIEMPRE debe elegir a propósito para quién es el menú — pedido explícito
  // para no reservar/cobrar por accidente al perfil equivocado. Solo se
  // auto-selecciona cuando no hay ninguna elección real que hacer (titular
  // sin dependientes registrados).
  const beneficiario = beneficiarios.find(b => b.id === beneficiarioId);
  useEffect(() => {
    if (beneficiarioId !== null) return;
    if (dependientes === null) return;
    if (beneficiarios.length <= 1) setBeneficiarioId(userId);
  }, [dependientes]);

  // Se trae siempre (no solo en la vista "Mis reservas") — el strip calendar
  // y el resumen "Hoy" en la vista de calendario también necesitan saber
  // qué días ya tienen reserva.
  const idsBeneficiarios = beneficiarios.map(b => b.id);
  useEffect(() => {
    let vivo = true;
    fetchMisReservasMenu(idsBeneficiarios, worldId).then(r => { if (vivo) setMisReservas(r || []); }).catch(() => { if (vivo) setMisReservas([]); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId, idsBeneficiarios.join(",")]);
  // Cuando se confirma una reserva nueva (pagar()) hay que refrescar esta
  // lista para que el punto del día recién reservado aparezca sin recargar.
  const recargarMisReservas = () => fetchMisReservasMenu(idsBeneficiarios, worldId).then(setMisReservas).catch(() => {});

  const visibles = (menuDelDia || []).filter(p => filtroComercio === "todos" || p.merchant_id === filtroComercio);
  const cartMerchant = cart[0]?.item.merchant_id || null;
  const total = cart.reduce((a, it) => a + (+it.item.precio) * it.qty, 0);
  const unidades = cart.reduce((a, it) => a + it.qty, 0);
  const bloqueadoPorAlergia = item => (item.alergenos || []).some(a => beneficiario.alergiasArr.includes(a));
  const bloqueadoPorRestriccion = item => (beneficiario?.restriccion?.productos_bloqueados || []).includes(item.id);
  // El límite diario propio del dependiente (Restricciones) manda sobre el
  // valor por defecto que RedPontis fijó para todo el mundo.
  const limiteDiario = beneficiario?.restriccion?.limite_diario ?? limiteDiarioDefault;

  const agregar = (p) => {
    if (bloqueadoPorAlergia(p) || bloqueadoPorRestriccion(p)) return;
    if (cartMerchant && p.merchant_id !== cartMerchant) { setAvisoMixto(true); return; }
    setAvisoMixto(false);
    setCart(c => {
      const i = c.findIndex(it => it.item.id === p.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { item: p, qty: 1 }];
    });
  };
  const quitar = (pid) => setCart(c => c.map(it => it.item.id === pid ? { ...it, qty: it.qty - 1 } : it).filter(it => it.qty > 0));

  const pagar = async () => {
    setPagando(true);
    try {
      const r = await crearReservaMenu({
        worldId, merchantId: cartMerchant, merchantNombre: nombreDe(cartMerchant),
        beneficiarioId: beneficiario.id, beneficiarioNombre: beneficiario.nombre, fecha,
        items: cart.map(it => ({ id: it.item.id, nombre: it.item.nombre, precio: +it.item.precio, cantidad: it.qty })),
        esDependiente: beneficiario.tipo === "dependiente", guardianUserId: userId, limiteDiario,
      });
      if (r.ok) {
        setResultado({ ok: true, total: r.total, comercio: nombreDe(cartMerchant) });
        setCart([]); setEnCheckout(false); refreshWallet(); refrescarSaldoBeneficiario(); recargarMisReservas();
      } else if (r.motivo === "limite_excedido") {
        setResultado({ ok: false, titulo: "Límite diario alcanzado", mensaje: `${beneficiario.nombre} ya tiene S/ ${r.gastadoFecha.toFixed(2)} reservado el ${fecha}. El límite diario de este mundo es S/ ${r.limite.toFixed(2)}. Se avisó al padre/superusuario.`, accion: null });
      } else if (r.motivo === "restriccion_horario" || r.motivo === "restriccion_limite_diario") {
        // Rechazo del RPC server-side (Task #181) — normalmente ya lo evita
        // bloqueadoPorRestriccion/fueraDeHorario antes de llegar acá, pero si
        // la config cambió a mitad de sesión, este es el mensaje real.
        const err = await errorControlado(r.motivo);
        logErrorControlado(r.motivo, `menu-checkout:${cartMerchant}`, worldId);
        setResultado({ ok: false, titulo: err.titulo, mensaje: err.mensaje, accion: err.accion });
      } else {
        const err = await errorControlado("saldo_insuficiente");
        logErrorControlado("saldo_insuficiente", `menu-checkout:${cartMerchant}`, worldId);
        setResultado({ ok: false, titulo: err.titulo, mensaje: `${err.mensaje} Saldo de ${beneficiario.nombre}: S/ ${(r.balance ?? saldoBeneficiario ?? 0).toFixed(2)}.`, accion: err.accion });
      }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", `menu-checkout:${cartMerchant}`, worldId);
      setResultado({ ok: false, titulo: err.titulo, mensaje: err.mensaje, accion: err.accion });
    } finally { setPagando(false); }
  };

  // ── Éxito ──
  if (resultado?.ok) return (
    <div className="px-5 pb-8">
      <SectionCard className="p-6 text-center">
        <Icon name="check_circle" fill size="text-5xl" color="text-green-600"/>
        <p className="font-black text-[#1b1b24] text-lg mt-2">Reserva confirmada</p>
        <p className="text-sm text-[#777587] mt-1">Reservaste el menú del <b>{new Date(fecha + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</b> en <b>{resultado.comercio}</b> para <b>{beneficiario.nombre}</b> · S/ {resultado.total.toFixed(2)}.</p>
        <div className="mt-4 flex flex-col gap-2">
          <PrimaryBtn label="Ver mis reservas" icon="event_available" onClick={() => { setResultado(null); setVista("reservas"); }}/>
          <button onClick={() => setResultado(null)} className="text-sm font-bold text-[#3525cd] tap-active">Seguir reservando</button>
        </div>
      </SectionCard>
    </div>
  );

  // ── Checkout ──
  if (enCheckout) return (
    <div className="px-5 space-y-4 pb-8">
      <button onClick={() => setEnCheckout(false)} className="flex items-center gap-1.5 text-sm font-bold text-[#3525cd] tap-active">
        <Icon name="arrow_back" size="text-base" color="text-[#3525cd]"/> Seguir eligiendo
      </button>
      <SectionCard className="p-5">
        <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider">{nombreDe(cartMerchant)} · Para {beneficiario.nombre} · {new Date(fecha + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" })}</p>
        <p className="font-black text-lg text-[#1b1b24] mb-3">Tu reserva</p>
        {beneficiario.alergias && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl mb-3 flex items-start gap-2">
            <Icon name="warning" size="text-base" color="text-amber-600"/>
            <p className="text-xs text-amber-800"><b>Alergias registradas de {beneficiario.nombre}:</b> {beneficiario.alergias}</p>
          </div>
        )}
        <div className="space-y-2 mb-4">
          {cart.map(it => (
            <div key={it.item.id} className="flex items-center justify-between text-sm">
              <span className="flex-1">{it.item.nombre}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => quitar(it.item.id)} className="w-6 h-6 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active"><Icon name="remove" size="text-xs" color="text-[#3525cd]"/></button>
                <span className="font-bold w-4 text-center">{it.qty}</span>
                <button onClick={() => agregar(it.item)} className="w-6 h-6 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active"><Icon name="add" size="text-xs" color="text-[#3525cd]"/></button>
                <span className="font-mono text-xs w-16 text-right">S/ {((+it.item.precio) * it.qty).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#e4e1ee] pt-3 flex justify-between items-center mb-1">
          <span className="font-bold text-[#1b1b24]">Total</span>
          <span className="font-black text-xl text-[#3525cd]">S/ {total.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-[#777587] mb-4">Saldo de {beneficiario.nombre}: S/ {(saldoBeneficiario ?? 0).toFixed(2)}{limiteDiario != null && beneficiario.tipo === "dependiente" ? ` · Límite diario del mundo: S/ ${(+limiteDiario).toFixed(2)}` : ""}</p>
        {resultado && !resultado.ok && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl mb-3">
            <p className="font-bold text-red-700 text-sm">{resultado.titulo}</p>
            <p className="text-xs text-red-600 mt-0.5">{[resultado.mensaje, resultado.accion].filter(Boolean).join(" ")}</p>
          </div>
        )}
        {metodoReserva === "ambos" && (
          <div className="flex bg-[#f0ecf9] rounded-2xl p-1 gap-1 mb-3">
            {[["saldo", "Con saldo"], ["qr", "Con QR en el punto de venta"]].map(([v, l]) => (
              <button key={v} onClick={() => setMetodoElegido(v)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold tap-active ${metodoElegido === v ? "bg-white text-[#3525cd] shadow-sm" : "text-[#777587]"}`}>{l}</button>
            ))}
          </div>
        )}
        {(metodoReserva === "qr" || (metodoReserva === "ambos" && metodoElegido === "qr")) ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-xs text-amber-800"><b>Este mundo reserva con pago por QR en el punto de venta</b>, no con saldo de la billetera — ese flujo de canje aún no está construido. Por ahora no se puede confirmar esta reserva desde la app.</p>
          </div>
        ) : beneficiario.tipo === "titular" && (saldoBeneficiario ?? 0) < total ? (
          // Saldo insuficiente del propio titular: en vez de solo mostrar el
          // error, se manda directo a Recargar. El carrito ya queda guardado
          // (sessionStorage) así que al volver sigue exactamente donde estaba.
          <div className="space-y-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-xs text-red-700">Te falta saldo: tienes S/ {(saldoBeneficiario ?? 0).toFixed(2)} y necesitas S/ {total.toFixed(2)}.</p>
            </div>
            <PrimaryBtn label="Recargar saldo" icon="add_card" onClick={() => nav("/pay?tab=recargar")}/>
          </div>
        ) : (
          <PrimaryBtn label={pagando ? "Procesando…" : `Reservar S/ ${total.toFixed(2)} con el saldo de ${beneficiario.nombre}`} icon="event_available"
            disabled={!cart.length || pagando} onClick={pagar}/>
        )}
      </SectionCard>
    </div>
  );

  // ── Vista "Mis reservas" ──
  if (vista === "reservas") {
    const porFecha = {};
    (misReservas || []).forEach(r => { (porFecha[r.fecha] = porFecha[r.fecha] || []).push(r); });
    const fechas = Object.keys(porFecha).sort();
    return (
      <div className="px-5 space-y-4 pb-28">
        <div className="flex bg-[#f0ecf9] rounded-2xl p-1 gap-1">
          {[["calendario", "Calendario"], ["reservas", "Mis reservas"]].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)} className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors ${vista === v ? "bg-white text-[#3525cd] shadow-sm" : "text-[#777587]"}`}>{l}</button>
          ))}
        </div>
        {misReservas === null ? (
          <div className="py-8 flex flex-col items-center gap-2"><span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/></div>
        ) : fechas.length === 0 ? (
          <SectionCard><EmptyState icon="event_available" title="Sin reservas programadas" subtitle="Cuando reserves un menú para un día futuro, aparecerá aquí."/></SectionCard>
        ) : fechas.map(f => (
          <SectionCard key={f} className="p-4">
            <p className="font-black text-sm text-[#1b1b24] mb-2">{new Date(f + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
            <div className="space-y-2">
              {porFecha[f].map(r => (
                <div key={r.id} className="flex justify-between items-center text-xs bg-[#f0ecf9]/60 rounded-xl px-3 py-2">
                  <div>
                    <p className="font-bold text-[#1b1b24]">{r.beneficiario_nombre} · {r.merchant_nombre}</p>
                    <p className="text-[#777587]">{(r.items || []).map(it => `${it.nombre} x${it.cantidad}`).join(", ")}</p>
                  </div>
                  <span className="font-mono font-bold text-[#3525cd]">S/ {Number(r.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    );
  }

  return (
    <div className="px-5 space-y-4 pb-28">
      <div className="flex bg-[#f0ecf9] rounded-2xl p-1 gap-1">
        {[["calendario", "Calendario"], ["reservas", "Mis reservas"]].map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)} className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors ${vista === v ? "bg-white text-[#3525cd] shadow-sm" : "text-[#777587]"}`}>{l}</button>
        ))}
      </div>

      {/* Strip calendar — selección de día, respeta diasAnticipacion. El punto
          bajo el día marca que ya hay una reserva confirmada ahí, para poder
          ver de un vistazo la programación completa sin entrar día por día. */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {strip.map(d => {
          const tieneReserva = (misReservas || []).some(r => r.fecha === d.fecha);
          return (
            <button key={d.fecha} onClick={() => setFecha(d.fecha)}
              className={`flex-shrink-0 w-14 py-2.5 rounded-2xl text-center transition-all relative ${fecha === d.fecha ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>
              <p className="text-[9px] font-bold uppercase">{d.esHoy ? "Hoy" : d.diaLabel}</p>
              <p className="font-black text-base">{d.numLabel}</p>
              {tieneReserva && (
                <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${fecha === d.fecha ? "bg-white" : "bg-[#3525cd]"}`}/>
              )}
            </button>
          );
        })}
      </div>

      {/* Qué toca hoy — resumen rápido, sin tener que navegar el strip */}
      {(() => {
        const hoy = strip.find(d => d.esHoy);
        const reservaHoy = hoy && (misReservas || []).find(r => r.fecha === hoy.fecha);
        if (!hoy || !reservaHoy) return null;
        return (
          <SectionCard className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <Icon name="today" fill size="text-lg" color="text-green-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider">Hoy te toca</p>
              <p className="text-sm font-bold text-[#1b1b24] truncate">{reservaHoy.beneficiario_nombre} · {(reservaHoy.items || []).map(it => it.nombre).join(", ")}</p>
              <p className="text-[10px] text-[#777587]">{reservaHoy.merchant_nombre}</p>
            </div>
          </SectionCard>
        );
      })()}

      {/* ¿Para quién? */}
      <div>
        <p className="text-[11px] font-bold text-[#777587] uppercase tracking-widest mb-2">Reservar para</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {beneficiarios.map(b => (
            <button key={b.id} onClick={() => setBeneficiarioId(b.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${beneficiarioId === b.id ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>
              <Icon name={b.tipo === "titular" ? "person" : "face"} size="text-sm" color={beneficiarioId === b.id ? "text-white" : "text-[#777587]"}/>
              {b.nombre}
            </button>
          ))}
        </div>
        {beneficiario?.alergias && (
          <p className="text-[10px] text-amber-700 mt-2 flex items-center gap-1">
            <Icon name="warning" size="text-xs" color="text-amber-600"/> Alergias de {beneficiario.nombre}: {beneficiario.alergias} — los platos que las contienen están bloqueados abajo.
          </p>
        )}
      </div>

      {!beneficiario ? (
        <SectionCard className="p-6 text-center">
          <Icon name="family_restroom" size="text-3xl" color="text-[#3525cd]"/>
          <p className="font-bold text-sm text-[#1b1b24] mt-2">Elige para quién es el menú</p>
          <p className="text-xs text-[#777587] mt-1">Toca uno de los nombres de arriba en "Reservar para" antes de ver los platos disponibles.</p>
        </SectionCard>
      ) : (
        <>
          {comercios.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button onClick={() => setFiltroComercio("todos")} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${filtroComercio === "todos" ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>Todos</button>
              {comercios.map(c => (
                <button key={c.id} onClick={() => setFiltroComercio(c.id)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${filtroComercio === c.id ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>{c.nombre}</button>
              ))}
            </div>
          )}

          {avisoMixto && (
            <ConfigBanner icon="warning" color="amber"
              message={`Tu reserva actual es de ${nombreDe(cartMerchant)}. Termina o vacía esa reserva antes de agregar platos de otro comercio.`}/>
          )}

          {menuDelDia === null ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
              <p className="text-xs text-[#777587]">Cargando menú del día…</p>
            </div>
          ) : visibles.length === 0 ? (
            <SectionCard><EmptyState icon="restaurant_menu" title="Sin menú programado" subtitle="Ningún comercio programó platos para este día todavía. Prueba con otro día del calendario."/></SectionCard>
          ) : (
            <div className="space-y-3">
              {visibles.map(p => {
                const enCart = cart.find(it => it.item.id === p.id);
                const bloqueadoAlergia = bloqueadoPorAlergia(p);
                const bloqueadoRestriccion = bloqueadoPorRestriccion(p);
                const bloqueado = bloqueadoAlergia || bloqueadoRestriccion;
                return (
                  <SectionCard key={p.id} className={`p-4 ${bloqueado ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-[#fff3e0] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"/> : <Icon name="lunch_dining" fill size="text-2xl" color="text-orange-500"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1b1b24]">{p.nombre}</p>
                        <p className="text-xs text-[#777587]">{nombreDe(p.merchant_id)}{p.categoria ? ` · ${p.categoria}` : ""}</p>
                        {p.descripcion && <p className="text-[10px] text-[#777587] mt-0.5">{p.descripcion}</p>}
                        {p.alergenos?.length > 0 && <p className="text-[10px] text-amber-700 mt-0.5">Contiene: {p.alergenos.join(", ")}</p>}
                        {bloqueadoAlergia && <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1"><Icon name="block" size="text-xs" color="text-red-600"/>Bloqueado por alergia de {beneficiario.nombre}</p>}
                        {!bloqueadoAlergia && bloqueadoRestriccion && <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1"><Icon name="block" size="text-xs" color="text-red-600"/>Restringido para {beneficiario.nombre}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-[#3525cd]">S/ {Number(p.precio).toFixed(2)}</p>
                        <button onClick={() => agregar(p)} disabled={bloqueado}
                          className="mt-1 text-[10px] bg-[#3525cd] text-white px-2.5 py-1 rounded-xl font-bold tap-active disabled:opacity-40 disabled:bg-[#c7c4d8]">
                          {bloqueado ? "Bloqueado" : enCart ? `Agregar (${enCart.qty})` : "Agregar"}
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-5 z-40">
          <div className="max-w-[430px] mx-auto">
            <button onClick={() => { setResultado(null); setEnCheckout(true); }}
              className="w-full py-3.5 rounded-2xl bg-[#3525cd] text-white font-black flex items-center justify-between px-5 tap-active" style={{boxShadow:"0 8px 24px rgba(53,37,205,0.35)"}}>
              <span className="flex items-center gap-2"><Icon name="shopping_cart" size="text-base" color="text-white"/>{unidades} {unidades === 1 ? "item" : "items"} · {nombreDe(cartMerchant)}</span>
              <span>S/ {total.toFixed(2)} →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR DE EVENTOS · secciones del Render Engine (piloto ux_component, doc §1)
// Cada evento declara en events.ux_components QUÉ secciones renderiza su
// pantalla y en qué orden; aquí solo existe el registry que las resuelve.
// ══════════════════════════════════════════════════════════════════════════════

function EventoHeroSection({ ev, vendidas, mundo }) {
  const lleno = ev.aforo_total > 0 && vendidas >= ev.aforo_total;
  return (
    <SectionCard className="overflow-hidden">
      <div className="h-24 flex items-center justify-center relative bg-cover bg-center"
        style={ev.imagen_url
          ? { backgroundImage: `url(${ev.imagen_url})` }
          : { background: `linear-gradient(135deg,${mundo.color||"#3525cd"}25,#dae2fd)` }}>
        {!ev.imagen_url && <Icon name="festival" fill size="text-6xl" color="text-[#3525cd]"/>}
        <div className="absolute top-2 left-3"><Chip label={`Tipo · ${ev.tipo === "kermesse" ? "Kermesse" : ev.tipo}`} color="bg-[#e2dfff] text-[#3525cd]"/></div>
        {lleno && <div className="absolute top-2 right-3"><Chip label="Aforo lleno" color="bg-red-100 text-red-700"/></div>}
      </div>
      <div className="p-4">
        <p className="font-black text-xl text-[#1b1b24]">{ev.titulo}</p>
        {ev.descripcion && <p className="text-sm text-[#777587] mt-1">{ev.descripcion}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          <p className="text-xs text-[#3525cd] font-semibold flex items-center gap-1"><Icon name="calendar_today" size="text-xs" color="text-[#3525cd]"/>{ev.fecha} {ev.hora && `· ${ev.hora}`}</p>
          {ev.lugar && <p className="text-xs text-[#777587] flex items-center gap-1"><Icon name="location_on" size="text-xs" color="text-[#777587]"/>{ev.lugar}</p>}
          {ev.organizador && <p className="text-xs text-[#777587]">Organiza: <b>{ev.organizador}</b></p>}
        </div>
        {ev.aforo_total > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-[#777587] mb-1">
              <span>Aforo</span><span>{vendidas}/{ev.aforo_total} entradas</span>
            </div>
            <ProgressBar value={vendidas} max={ev.aforo_total}/>
          </div>
        )}
        {/* El link al mapa solo vivía en la tarjeta de la lista -- al entrar al
            detalle (donde de verdad se decide comprar) desaparecía. */}
        {ev.mapa_url && (
          <a href={ev.mapa_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-[#f0ecf9] tap-active">
            <Icon name="map" size="text-base" color="text-[#3525cd]"/>
            <span className="text-xs font-bold text-[#3525cd]">{ev.mapa_nombre || "Ver mapa del evento"}</span>
          </a>
        )}
      </div>
    </SectionCard>
  );
}

function EventoAgendaSection({ ev }) {
  const [items, setItems] = useState(null); // null = cargando
  useEffect(() => {
    let vivo = true;
    fetchAgendaEventoLive(ev.id).then(r => { if (vivo) setItems(r || []); }).catch(() => { if (vivo) setItems([]); });
    return () => { vivo = false; };
  }, [ev.id]);

  const hora = ev.hora || "10:00";
  // Sin cronograma real cargado: fallback genérico (mejor que una sección vacía).
  const rows = (items && items.length > 0)
    ? items.map(a => ({ h: a.hora || "", t: a.titulo, d: a.descripcion, icon: "event" }))
    : [
        { h: hora, t: "Apertura de puertas", icon: "door_open" },
        { h: "", t: "Stands, juegos y comida disponibles", icon: "storefront" },
        { h: "", t: "Cierre y liquidación del evento", icon: "nightlight" },
      ];
  return (
    <SectionCard>
      <SectionHeader label="Agenda del evento" icon="calendar_month"/>
      <div className="px-4 pb-4 space-y-0">
        {rows.map((it, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#f0ecf9] flex items-center justify-center flex-shrink-0">
                <Icon name={it.icon} size="text-base" color="text-[#3525cd]"/>
              </div>
              {i < rows.length - 1 && <div className="w-px flex-1 bg-[#e4e1ee] my-1"/>}
            </div>
            <div className="pb-4 pt-1">
              <p className="text-sm font-semibold text-[#1b1b24]">{it.t}</p>
              {(it.h || it.d) && <p className="text-[11px] text-[#777587]">{[it.h, it.d].filter(Boolean).join(" · ")}</p>}
              {i === 0 && !it.h && <p className="text-[11px] text-[#777587]">{ev.fecha} · {hora}</p>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function EventoMarketplaceSection({ ev, mundo, comercios }) {
  const [afiliados, setAfiliados] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetchEventMerchantsLive(ev.id).then(r => { if (vivo) setAfiliados(r || []); }).catch(() => { if (vivo) setAfiliados([]); });
    return () => { vivo = false; };
  }, [ev.id]);
  if (!afiliados || !afiliados.length) return null;
  // event_merchants no guarda foto propia -- se cruza por merchant_id contra
  // el directorio real de comercios del mundo (ya trae fotoUrl).
  const fotoPorId = Object.fromEntries((comercios || []).map(c => [c.id, c.fotoUrl]));
  return (
    <SectionCard>
      <SectionHeader label="Comercios en el evento" icon="storefront"/>
      <div className="px-4 pb-4 flex gap-3 overflow-x-auto scrollbar-hide">
        {afiliados.map(c => (
          <div key={c.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-[#f0ecf9] rounded-2xl p-3 w-20">
            <div className="w-10 h-10 rounded-xl bg-[#3525cd] flex items-center justify-center overflow-hidden">
              {(c.logo_url || fotoPorId[c.merchant_id]) ? (
                <img src={c.logo_url || fotoPorId[c.merchant_id]} alt="" className="w-full h-full object-cover"/>
              ) : (
                <span className="text-white font-black text-base">{(c.merchant_nombre || "?")[0]}</span>
              )}
            </div>
            <span className="text-[9px] font-semibold text-[#464555] text-center leading-tight">{(c.merchant_nombre || "Comercio").split(" ").slice(0,2).join(" ")}</span>
            {c.ubicacion && <span className="text-[8px] text-[#9a97ab] text-center leading-tight">{c.ubicacion}</span>}
          </div>
        ))}
      </div>
      <p className="px-4 pb-3 text-[10px] text-[#c7c4d8]">Paga con tu saldo del mundo en cualquier comercio durante el evento.</p>
    </SectionCard>
  );
}

// Ticket Selector (Organism reutilizado del catálogo, doc §5.3) + checkout con Wallet.
function EventoEntradasSection({ ev, mundo, onComprado }) {
  const userId = getSyntheticUserId();
  const { saldo, refresh: refreshWallet } = useWalletLive(mundo.id);
  const [tipos, setTipos] = useState(null);           // null = cargando
  const [vendidasTipo, setVendidasTipo] = useState({});
  const [sel, setSel] = useState(null);               // tipo seleccionado
  const [qty, setQty] = useState(1);
  const [comprando, setComprando] = useState(false);
  const [resultado, setResultado] = useState(null);   // {ok, motivo?, tickets?}
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let vivo = true;
    Promise.all([fetchTicketTypesLive(ev.id), fetchVendidasPorTipo(ev.id)])
      .then(([t, v]) => { if (vivo) { setTipos(t || []); setVendidasTipo(v || {}); } })
      .catch(() => { if (vivo) setTipos([]); });
    return () => { vivo = false; };
  }, [ev.id, reload]);

  const totalVendidas = vendidasTipo.__total || 0;
  const aforoLleno = ev.aforo_total > 0 && totalVendidas >= ev.aforo_total;
  // toISOString() adelanta la fecha en horario de tarde/noche en Perú (UTC-5) —
  // cerraba/abría la ventana de venta un día antes de lo real (ver diasStripDe).
  const hoyLocalDate = new Date();
  const hoy = `${hoyLocalDate.getFullYear()}-${String(hoyLocalDate.getMonth() + 1).padStart(2, "0")}-${String(hoyLocalDate.getDate()).padStart(2, "0")}`;
  const enVentana = t => (!t.venta_desde || t.venta_desde.slice(0,10) <= hoy) && (!t.venta_hasta || t.venta_hasta.slice(0,10) >= hoy);
  const restantesDe = t => Math.max(0, (t.cupos || 0) - (vendidasTipo[t.id] || 0));

  const elegir = t => {
    setSel(t); setResultado(null);
    setQty(Math.max(1, t.min_por_compra || 1));
  };
  const maxQty = sel ? Math.min(sel.max_por_compra || 4, restantesDe(sel)) : 1;
  const totalPagar = sel ? (+sel.precio) * qty : 0;

  const comprar = async () => {
    if (!sel) return;
    setComprando(true);
    try {
      const r = await comprarTicketsLive(userId, mundo.id, ev, sel, qty);
      if (!r.ok) {
        // Errores controlados: mensaje/acción del catálogo + registro en error_log
        const code = r.motivo === "aforo" ? "aforo_lleno" : r.motivo === "cupos" ? "cupos_agotados" : r.motivo === "saldo" ? "saldo_insuficiente" : null;
        if (code) {
          const err = await errorControlado(code);
          logErrorControlado(code, `compra-entradas:${ev.id}`, mundo.id);
          r.titulo = err.titulo; r.mensaje = err.mensaje; r.accion = err.accion;
        }
      }
      setResultado(r);
      if (r.ok) { setSel(null); setReload(k => k + 1); refreshWallet(); }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", `compra-entradas:${ev.id}`, mundo.id);
      setResultado({ ok: false, titulo: err.titulo, mensaje: err.mensaje, accion: err.accion });
    } finally { setComprando(false); }
  };

  return (
    <SectionCard>
      <SectionHeader label="Entradas" icon="confirmation_number"/>
      <div className="px-4 pb-4 space-y-3">

        {/* Estado: compra realizada */}
        {resultado?.ok && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="check_circle" fill size="text-xl" color="text-green-600"/>
              <p className="font-bold text-green-800">Compra realizada</p>
            </div>
            <p className="text-xs text-green-700 mb-2">{resultado.tickets.length} entrada(s) emitida(s) con QR. Preséntalo al ingresar.</p>
            <button onClick={onComprado} className="text-xs font-black text-green-700 underline">Ver mis entradas →</button>
          </div>
        )}
        {/* Estados de error de la compra */}
        {resultado && !resultado.ok && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="font-bold text-red-700 text-sm">
              {resultado.titulo || "No se pudo completar la compra"}
            </p>
            <p className="text-xs text-red-600 mt-1">
              {resultado.mensaje
                ? [resultado.mensaje, resultado.motivo === "saldo" ? `Tu saldo actual: S/ ${(resultado.balance ?? saldo).toFixed(2)}.` : null, resultado.accion].filter(Boolean).join(" ")
                : resultado.detalle || "Intenta nuevamente."}
            </p>
          </div>
        )}

        {aforoLleno && !resultado?.ok && (
          <ConfigBanner icon="block" message="Aforo lleno — la venta de entradas está bloqueada por el organizador." color="red"/>
        )}

        {/* Loading */}
        {tipos === null && (
          <div className="py-6 flex flex-col items-center gap-2">
            <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
            <p className="text-xs text-[#777587]">Cargando entradas…</p>
          </div>
        )}

        {/* Sin tipos */}
        {tipos !== null && tipos.length === 0 && (
          <EmptyState icon="confirmation_number" title="Sin entradas a la venta" subtitle="El organizador aún no publica los tipos de entrada de este evento."/>
        )}

        {/* Ticket Selector */}
        {(tipos || []).map(t => {
          const restantes = restantesDe(t);
          const agotado = restantes <= 0;
          const fuera = !enVentana(t);
          const activo = sel?.id === t.id;
          const bloqueado = agotado || fuera || aforoLleno;
          return (
            <button key={t.id} disabled={bloqueado} onClick={() => elegir(t)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all tap-active ${activo ? "border-[#3525cd] bg-[#f0ecf9]" : "border-[#e4e1ee]"} ${bloqueado ? "opacity-50" : ""}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-[#1b1b24]">{t.nombre}</p>
                  {t.descripcion && <p className="text-xs text-[#777587] mt-0.5">{t.descripcion}</p>}
                  <p className="text-[10px] text-[#777587] mt-1">
                    {agotado ? "Agotado" : `${restantes} disponibles`} · máx {t.max_por_compra || 4} por compra
                    {fuera && " · fuera de ventana de venta"}
                  </p>
                </div>
                <p className="font-black text-[#3525cd] flex-shrink-0 ml-3">{+t.precio === 0 ? "Gratis" : `S/ ${(+t.precio).toFixed(2)}`}</p>
              </div>
            </button>
          );
        })}

        {/* Stepper + checkout */}
        {sel && !aforoLleno && (
          <div className="p-4 glass-card rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#1b1b24]">Cantidad · {sel.nombre}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(sel.min_por_compra || 1, q - 1))}
                  className="w-8 h-8 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active"><Icon name="remove" size="text-base" color="text-[#3525cd]"/></button>
                <span className="font-black text-lg text-[#1b1b24] w-6 text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                  className="w-8 h-8 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active"><Icon name="add" size="text-base" color="text-[#3525cd]"/></button>
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#777587]">
              <span>Pagas con tu saldo del mundo</span>
              <span>Saldo: <b className="text-[#1b1b24]">S/ {saldo.toFixed(2)}</b></span>
            </div>
            <PrimaryBtn
              label={comprando ? "Procesando…" : totalPagar === 0 ? `Reservar ${qty} entrada(s)` : `Pagar S/ ${totalPagar.toFixed(2)}`}
              icon="confirmation_number" disabled={comprando} onClick={comprar}/>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// Registry del Render Engine: ux_component → sección concreta.
const EVENT_SECTION_REGISTRY = {
  hero:        (p) => <EventoHeroSection {...p}/>,
  entradas:    (p) => <EventoEntradasSection {...p}/>,
  agenda:      (p) => <EventoAgendaSection {...p}/>,
  marketplace: (p) => <EventoMarketplaceSection {...p}/>,
};

// Una entrada deja de dar acceso apenas se usa o se anula. El POS ya lo
// rechaza; acá se refleja para que nadie llegue a la puerta creyendo que
// todavía le sirve.
const esUsada = t => t.estado === "checkin" || t.estado === "checkout" || t.estado === "anulado";

const horaCorta = iso => {
  try {
    return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return ""; }
};
const fechaHoraCorta = iso => {
  try {
    return new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return ""; }
};

// Mis Entradas — QR emitidos, estado de check-in.
function MisEntradasList({ mundo, refreshKey }) {
  const userId = getSyntheticUserId();
  const [entradas, setEntradas] = useState(null);
  const [reload, setReload] = useState(0);
  const [transferAbierto, setTransferAbierto] = useState(null); // ticket.id
  const [transferCode, setTransferCode] = useState("");
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [generandoLink, setGenerandoLink] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(null); // ticket completo

  useEffect(() => {
    let vivo = true;
    const traer = () => fetchMisEntradasLive(userId, mundo.id)
      .then(rows => { if (vivo) setEntradas(rows || []); })
      .catch(() => { if (vivo) setEntradas(prev => prev ?? []); });
    traer();

    // El check-in ocurre en el POS, no acá: sin esto la persona sigue viendo
    // "Lista para usar" con su QR después de haber entrado. Se refresca al
    // volver a la pantalla —que es el momento natural, ya pasó la puerta— y
    // cada pocos segundos mientras la tiene abierta, que es cuando está
    // parada frente al operador.
    const alVolver = () => { if (document.visibilityState === "visible") traer(); };
    document.addEventListener("visibilitychange", alVolver);
    const t = setInterval(traer, 8000);
    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [mundo.id, refreshKey, reload]);

  const transferir = async (ticketId) => {
    setTransfiriendo(true); setTransferError("");
    try {
      const r = await transferirEntradaRemote(ticketId, userId, transferCode);
      if (r.ok) { setTransferAbierto(null); setTransferCode(""); setReload(k => k + 1); }
      else {
        // Errores controlados: mensaje/acción del catálogo + registro en error_log
        const code = r.motivo === "mismo_usuario" ? "mismo_usuario"
          : r.motivo === "no_transferible" ? "entrada_no_transferible"
          : "transferencia_no_valida";
        const err = await errorControlado(code);
        logErrorControlado(code, `transferir-entrada:${ticketId}`, mundo.id);
        setTransferError([err.mensaje, err.accion].filter(Boolean).join(" "));
      }
    } catch (e) {
      const err = await mensajeDeError(e, "transferencia_no_valida");
      logErrorControlado("transferencia_no_valida", `transferir-entrada:${ticketId}`, mundo.id);
      setTransferError([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setTransfiriendo(false); }
  };

  const compartirEnlace = async (ticketId) => {
    setGenerandoLink(true); setTransferError("");
    try {
      const r = await crearEnlaceTransferenciaEntrada(ticketId, userId);
      if (!r.ok) {
        const code = r.motivo === "no_transferible" ? "entrada_no_transferible" : "transferencia_no_valida";
        const err = await errorControlado(code);
        logErrorControlado(code, `enlace-entrada:${ticketId}`, mundo.id);
        setTransferError([err.mensaje, err.accion].filter(Boolean).join(" "));
        return;
      }
      const url = `${location.origin}${location.pathname}#/reclamar/${r.token}`;
      if (navigator.share) {
        try { await navigator.share({ title: "Te comparto mi entrada", url }); }
        catch (e) { /* usuario canceló el share sheet — no es un error */ }
      } else {
        await navigator.clipboard.writeText(url);
        showToast("Enlace copiado — compártelo con quien recibirá la entrada");
      }
      setTransferAbierto(null);
    } finally { setGenerandoLink(false); }
  };

  if (entradas === null) return (
    <div className="py-10 flex flex-col items-center gap-2">
      <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
      <p className="text-xs text-[#777587]">Cargando tus entradas…</p>
    </div>
  );
  if (!entradas.length) return (
    <SectionCard>
      <EmptyState icon="qr_code_2" title="Sin entradas" subtitle="Cuando compres una entrada, tu QR de acceso aparecerá aquí."/>
    </SectionCard>
  );
  return (
    <div className="space-y-3">
      {entradas.map(t => (
        <SectionCard key={t.id} className="p-4">
          <div className="flex gap-4 items-center">
            {/* Una entrada ya usada no vuelve a servir: mostrarle el QR a la
                persona la invita a que lo intente y se lo rechacen en la
                puerta. En su lugar va un sello que dice qué pasó y cuándo. */}
            {esUsada(t) ? (
              <div className="w-[74px] h-[74px] shrink-0 rounded-xl bg-[#f0ecf9] flex flex-col items-center justify-center gap-0.5">
                <Icon name={t.estado === "anulado" ? "block" : "task_alt"} fill size="text-2xl"
                  color={t.estado === "anulado" ? "text-red-500" : "text-green-600"}/>
                {t.checkin_at && (
                  <span className="text-[9px] font-bold text-[#777587]">{horaCorta(t.checkin_at)}</span>
                )}
              </div>
            ) : (
              <button className="flex-shrink-0 tap-active" onClick={() => setQrFullscreen(t)} aria-label="Ver QR a pantalla completa">
                <QRCode label="" sub="" value={t.qr_code}/>
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-[#1b1b24] leading-tight">{t.events?.titulo || "Evento"}</p>
              <p className="text-xs text-[#777587] mt-0.5">{t.event_ticket_types?.nombre || "General"} · {t.events?.fecha} {t.events?.hora || ""}</p>
              {esUsada(t) ? (
                <p className="text-[10px] text-[#777587] mt-1">
                  {t.estado === "anulado"
                    ? "Esta entrada fue anulada y ya no da acceso."
                    : `Ya se usó para ingresar${t.checkin_at ? ` · ${fechaHoraCorta(t.checkin_at)}` : ""}. No sirve para un segundo ingreso.`}
                </p>
              ) : (
                <p className="font-mono text-[9px] text-[#777587] mt-1 truncate">{t.qr_code}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Chip label={t.estado === "checkin" ? "Dentro del evento" : t.estado === "checkout" ? "Evento completado" : t.estado === "anulado" ? "Anulada" : "Lista para usar"}
                  color={t.estado === "checkin" ? "bg-green-100 text-green-700" : t.estado === "checkout" ? "bg-gray-100 text-gray-500" : t.estado === "anulado" ? "bg-red-100 text-red-600" : "bg-[#e2dfff] text-[#3525cd]"}/>
                {t.estado === "emitido" && (
                  <button onClick={() => { setTransferAbierto(transferAbierto === t.id ? null : t.id); setTransferCode(""); setTransferError(""); }}
                    className="text-[10px] font-bold text-[#3525cd] flex items-center gap-0.5 tap-active">
                    <Icon name="send" size="text-xs" color="text-[#3525cd]"/>Transferir
                  </button>
                )}
              </div>
            </div>
          </div>
          {transferAbierto === t.id && (
            <div className="mt-3 pt-3 border-t border-[#e4e1ee] space-y-2.5">
              <button onClick={() => compartirEnlace(t.id)} disabled={generandoLink}
                className="w-full py-2.5 bg-[#e2dfff] text-[#3525cd] rounded-xl font-bold text-xs tap-active disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Icon name="link" size="text-sm" color="text-[#3525cd]"/> {generandoLink ? "Generando enlace…" : "Compartir enlace de invitación"}
              </button>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[#e4e1ee]"/><span className="text-[9px] text-[#c7c4d8] font-bold uppercase">o por código</span><div className="flex-1 h-px bg-[#e4e1ee]"/>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <input className="w-full bg-[#f0ecf9] rounded-xl px-3 py-2 text-xs font-mono text-[#1b1b24] outline-none"
                    placeholder="Código JOI del destinatario" value={transferCode}
                    onChange={e => { setTransferCode(e.target.value); setTransferError(""); }}/>
                  {transferError && <p className="text-[10px] text-red-500 mt-1">{transferError}</p>}
                </div>
                <button onClick={() => transferir(t.id)} disabled={!transferCode.trim() || transfiriendo}
                  className="px-3 py-2 bg-[#3525cd] text-white rounded-xl font-bold text-xs tap-active disabled:opacity-50 flex-shrink-0">
                  {transfiriendo ? "…" : "Enviar"}
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      ))}
      {qrFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-8" onClick={() => setQrFullscreen(null)}>
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active" onClick={() => setQrFullscreen(null)} aria-label="Cerrar">
            <Icon name="close" size="text-xl" color="text-[#1b1b24]"/>
          </button>
          <Chip label={qrFullscreen.estado === "checkin" ? "Dentro del evento" : qrFullscreen.estado === "checkout" ? "Evento completado" : qrFullscreen.estado === "anulado" ? "Anulada" : "Lista para usar"}
            color={qrFullscreen.estado === "checkin" ? "bg-green-100 text-green-700" : qrFullscreen.estado === "checkout" ? "bg-gray-100 text-gray-500" : qrFullscreen.estado === "anulado" ? "bg-red-100 text-red-600" : "bg-[#e2dfff] text-[#3525cd]"}/>
          <div className="mt-6 w-full max-w-[320px]">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(qrFullscreen.qr_code)}`}
              alt={`Código QR · ${qrFullscreen.qr_code}`} className="w-full aspect-square rounded-2xl border-2 border-[#e4e1ee]" />
          </div>
          <p className="font-black text-lg text-[#1b1b24] mt-6 text-center">{qrFullscreen.events?.titulo || "Evento"}</p>
          <p className="text-sm text-[#777587] mt-1 text-center">{qrFullscreen.event_ticket_types?.nombre || "General"} · {qrFullscreen.events?.fecha} {qrFullscreen.events?.hora || ""}</p>
          <p className="font-mono text-[10px] text-[#c7c4d8] mt-3 text-center">{qrFullscreen.qr_code}</p>
        </div>
      )}
    </div>
  );
}

/**
 * "Mis eventos" — gestión real del evento que el propio usuario B2C publicó.
 *
 * Antes de esto no existía forma de responder: un usuario publicaba su
 * evento (crearEventoB2CRemote) y quedaba a ciegas — sin saber si RedPontis
 * ya lo aprobó, cuántas entradas se vendieron, o cómo compartirlo. El botón
 * "Crear y publicar" era una puerta de un solo sentido.
 *
 * El check-in en puerta sigue siendo responsabilidad de quien recibe a la
 * gente en el evento (POS/operador), no de esta pantalla — acá el creador ve
 * estado, ventas reales e invita gente, no escanea entradas.
 */
function MisEventosCreadosList({ worldId, refreshKey }) {
  const [eventos, setEventos] = useState(null);
  const [stats, setStats] = useState({}); // { [eventId]: { vendidas, ingresos, aforo } }
  const [copiadoId, setCopiadoId] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetchMisEventosCreados(worldId).then(async rows => {
      if (!vivo) return;
      setEventos(rows || []);
      const entries = await Promise.all((rows || []).map(async ev => {
        try {
          const [tipos, vendidasPorTipo] = await Promise.all([fetchTicketTypesLive(ev.id), fetchVendidasPorTipo(ev.id)]);
          const ingresos = (tipos || []).reduce((a, t) => a + (+t.precio || 0) * (vendidasPorTipo[t.id] || 0), 0);
          return [ev.id, { vendidas: vendidasPorTipo.__total || 0, ingresos, aforo: ev.aforo_total || 0 }];
        } catch { return [ev.id, { vendidas: 0, ingresos: 0, aforo: ev.aforo_total || 0 }]; }
      }));
      if (vivo) setStats(Object.fromEntries(entries));
    }).catch(() => { if (vivo) setEventos([]); });
    return () => { vivo = false; };
  }, [worldId, refreshKey]);

  const compartir = (ev) => {
    // La ficha pública real vive en la Landing Page (joi360-admin), no en el
    // superapp — /evento-publico/:id nunca existió como ruta acá.
    const url = `https://joi360-admin.vercel.app/#/landing/eventos/${ev.id}`;
    navigator.clipboard?.writeText(url);
    setCopiadoId(ev.id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const ESTADO_INFO = {
    PENDIENTE_APROBACION: { label: "En revisión de RedPontis", color: "text-amber-600 bg-amber-50", icon: "hourglass_top" },
    PUBLICADO: { label: "Publicado", color: "text-green-700 bg-green-50", icon: "check_circle" },
    PAUSADO: { label: "Pausado", color: "text-[#777587] bg-[#f0ecf9]", icon: "pause_circle" },
    RECHAZADO: { label: "Rechazado", color: "text-red-600 bg-red-50", icon: "cancel" },
  };

  if (eventos === null) return (
    <div className="py-10 flex flex-col items-center gap-2">
      <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
      <p className="text-xs text-[#777587]">Cargando tus eventos…</p>
    </div>
  );

  if (eventos.length === 0) return (
    <SectionCard className="p-8 text-center">
      <Icon name="event_note" size="text-4xl" color="text-[#c7c4d8]"/>
      <p className="text-[#464555] font-bold text-sm mt-3">Todavía no publicaste ningún evento</p>
      <p className="text-[#777587] text-xs mt-1">Usa "Crear y publicar mi evento" arriba para empezar.</p>
    </SectionCard>
  );

  return (
    <div className="space-y-3">
      {eventos.map(ev => {
        const info = ESTADO_INFO[ev.estado] || ESTADO_INFO.PENDIENTE_APROBACION;
        const s = stats[ev.id] || { vendidas: 0, ingresos: 0, aforo: ev.aforo_total || 0 };
        return (
          <SectionCard key={ev.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-black text-[#1b1b24] text-sm leading-tight">{ev.titulo}</p>
              <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${info.color}`}>
                <Icon name={info.icon} size="text-[11px]"/>{info.label}
              </span>
            </div>
            <p className="text-[#777587] text-xs">{ev.fecha} {ev.hora ? `· ${ev.hora}` : ""} {ev.lugar ? `· ${ev.lugar}` : ""}</p>

            {ev.estado === "RECHAZADO" && ev.motivo_rechazo && (
              <p className="text-red-600 text-xs mt-2 bg-red-50 rounded-xl px-3 py-2">{ev.motivo_rechazo}</p>
            )}

            {(ev.estado === "PUBLICADO" || ev.estado === "PAUSADO") && (
              <>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-[#f0ecf9] rounded-xl px-3 py-2">
                    <p className="text-[9px] font-bold text-[#777587] uppercase tracking-widest">Vendidas</p>
                    <p className="text-base font-black text-[#1b1b24]">{s.vendidas}{s.aforo > 0 ? ` / ${s.aforo}` : ""}</p>
                  </div>
                  <div className="bg-[#f0ecf9] rounded-xl px-3 py-2">
                    <p className="text-[9px] font-bold text-[#777587] uppercase tracking-widest">Ingresos</p>
                    <p className="text-base font-black text-[#1b1b24]">S/ {s.ingresos.toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={() => compartir(ev)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[#3525cd] text-white text-xs font-bold flex items-center justify-center gap-1.5 tap-active">
                  <Icon name={copiadoId === ev.id ? "check" : "link"} size="text-sm" color="text-white"/>
                  {copiadoId === ev.id ? "Enlace copiado" : "Copiar enlace para invitar"}
                </button>
              </>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: EVENTOS — marketplace en vivo (Supabase) + creación B2C
//   allowB2C → usuario puede crear evento
//   Estados del marketplace: Loading / Empty / Con resultados / Error / Compra realizada
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Carrusel de eventos del propio mundo.
 *
 * Separado del listado general a propósito: un evento embebido lo creó el
 * mundo y lo aprobó RedPontis, mientras que los demás vienen de un organizador
 * externo o de un usuario final. Para un apoderado de Raimondi, "la kermesse
 * del colegio" y "un evento que alguien publicó en la app" no son la misma
 * cosa, y mezclarlos en una lista los volvía indistinguibles.
 *
 * Va en columna (scroll vertical) y no en carrusel horizontal — antes
 * apilaba las tarjetas en una franja que sangraba a los bordes; con más de
 * 2-3 eventos, las de más a la derecha quedaban escondidas y nada indicaba
 * que había más para ver. En columna todas quedan visibles, sin límite,
 * simplemente scrolleando hacia abajo con el resto de la pantalla.
 */
function CarruselDelMundo({ eventos, mundo, vendidasMap, onVerEntradas, comercios }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-1.5 h-4 rounded-full"
          style={{ background: mundo.color || "#3525cd" }}
        />
        <p className="text-[11px] font-black uppercase tracking-wider text-[#1b1b24]">
          Eventos de {mundo.nombre}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {eventos.map(ev => (
          <TarjetaEventoMundo
            key={ev.id}
            ev={ev}
            mundo={mundo}
            vendidas={vendidasMap[ev.id] || 0}
            onVerEntradas={onVerEntradas}
            comerciosDelMundo={comercios}
          />
        ))}
      </div>
    </div>
  );
}

function TarjetaEventoMundo({ ev, mundo, vendidas, onVerEntradas, comerciosDelMundo }) {
  const [afiliados, setAfiliados] = useState(null);
  const lleno = ev.aforo_total > 0 && vendidas >= ev.aforo_total;

  useEffect(() => {
    let vivo = true;
    fetchEventMerchantsLive(ev.id)
      .then(r => { if (vivo) setAfiliados(r || []); })
      .catch(() => { if (vivo) setAfiliados([]); });
    return () => { vivo = false; };
  }, [ev.id]);
  // event_merchants no guarda foto propia -- se cruza por merchant_id contra
  // el directorio real de comercios del mundo (ya trae fotoUrl).
  const fotoPorId = Object.fromEntries((comerciosDelMundo || []).map(c => [c.id, c.fotoUrl]));

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white border border-[#e4e1ee]">
      {/* Portada real cuando existe; si no, el degradado del mundo. Un
          placeholder gris haría ver el evento como algo sin terminar. */}
      <div
        className="h-36 relative"
        style={{
          background: ev.imagen_url
            ? `url(${ev.imagen_url}) center/cover`
            : `linear-gradient(135deg,${mundo.color || "#3525cd"},#4f46e5)`,
        }}
      >
        {!ev.imagen_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon name="festival" fill size="text-5xl" color="text-white/70" />
          </div>
        )}
        {lleno && (
          <div className="absolute top-2 right-2">
            <Chip label="Agotado" color="bg-red-100 text-red-700" />
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="font-black text-[#1b1b24] leading-tight mb-1.5">{ev.titulo}</p>

        <p className="text-xs font-semibold flex items-center gap-1 mb-1" style={{ color: mundo.color || "#3525cd" }}>
          <Icon name="calendar_today" size="text-xs" color="text-current" />
          {ev.fecha}{ev.hora && ` · ${ev.hora}`}
        </p>
        {ev.lugar && (
          <p className="text-xs text-[#777587] flex items-center gap-1 mb-2">
            <Icon name="location_on" size="text-xs" color="text-[#777587]" />
            {ev.lugar}
          </p>
        )}

        {ev.descripcion && (
          <p className="text-xs text-[#56546b] leading-5 mb-3 line-clamp-3">{ev.descripcion}</p>
        )}

        {ev.aforo_total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-[#777587] mb-1">
              <span>Aforo</span><span>{vendidas}/{ev.aforo_total}</span>
            </div>
            <ProgressBar value={vendidas} max={ev.aforo_total} />
          </div>
        )}

        {/* Comercios del evento: quién va a estar vendiendo adentro. Es de las
            primeras cosas que se preguntan antes de comprar una entrada. */}
        {Array.isArray(afiliados) && afiliados.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#777587] mb-1.5">
              Comercios en el evento
            </p>
            <div className="flex flex-wrap gap-1.5">
              {afiliados.slice(0, 4).map(c => (
                <span key={c.id} className="flex items-center gap-1 text-[10px] pl-1 pr-2 py-1 rounded-full bg-[#f0ecf9] text-[#3525cd] font-semibold">
                  {(c.logo_url || fotoPorId[c.merchant_id]) ? (
                    <img src={c.logo_url || fotoPorId[c.merchant_id]} alt="" className="w-4 h-4 rounded-full object-cover"/>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#3525cd] text-white flex items-center justify-center text-[8px] font-black">{(c.merchant_nombre||"?")[0]}</span>
                  )}
                  {c.merchant_nombre}
                </span>
              ))}
              {afiliados.length > 4 && (
                <span className="text-[10px] px-2 py-1 text-[#777587] font-semibold">
                  +{afiliados.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {ev.mapa_url && (
          <a
            href={ev.mapa_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[#f0ecf9] tap-active"
          >
            <Icon name="map" size="text-base" color="text-[#3525cd]" />
            <span className="text-xs font-bold text-[#3525cd]">Ver mapa del evento</span>
          </a>
        )}

        <PrimaryBtn
          label={lleno ? "Agotado" : "Ver entradas"}
          icon={lleno ? "block" : "confirmation_number"}
          disabled={lleno}
          onClick={() => onVerEntradas(ev)}
        />
      </div>
    </div>
  );
}

function EventosTemplate({ cfg, u }) {
  const evCfg = cfg.mundo.eventosConfig || {};
  const canCreate = cfg.config.allowB2C;
  const pickup = cfg.config.ventanaPickup || 30;
  const monetizacion = evCfg.monetizacion !== false;
  const worldId = cfg.mundo.id;
  // event_merchants no guarda foto propia -- se cruza por merchant_id contra
  // el directorio real de comercios del mundo (ya trae fotoUrl).
  const comerciosDelMundo = useMerchantsLive(worldId);

  // ── Marketplace en vivo: eventos publicados (no privados) desde Supabase ──
  const [liveEvents, setLiveEvents] = useState(null); // null=cargando
  const [liveError, setLiveError] = useState(false);
  const [vendidasMap, setVendidasMap] = useState({});
  const [detalle, setDetalle] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Deep-link a un evento específico (?evento=<id>) — el carrusel del Home
  // antes mandaba a todos los eventos por igual al listado genérico, sin
  // importar cuál se tocó. Se abre el detalle apenas cargan los eventos.
  const location = useLocation();
  const eventoDeepLinkId = new URLSearchParams(location.search).get("evento");
  const [deepLinkAbierto, setDeepLinkAbierto] = useState(false);
  useEffect(() => {
    if (deepLinkAbierto || !eventoDeepLinkId || !liveEvents) return;
    const match = liveEvents.find(e => e.id === eventoDeepLinkId);
    if (match) setDetalle(match);
    setDeepLinkAbierto(true);
  }, [eventoDeepLinkId, liveEvents, deepLinkAbierto]);

  useEffect(() => {
    let vivo = true;
    setLiveError(false);
    Promise.all([fetchEventosLive(worldId), fetchVendidasPorEvento(worldId)])
      .then(([evs, vend]) => { if (vivo) { setLiveEvents(evs || []); setVendidasMap(vend || {}); } })
      .catch(() => {
        if (!vivo) return;
        // Antes caía a un fallback de seed local (mock) si el fetch real
        // fallaba por CUALQUIER motivo, no solo "tabla no migrada" — mostraba
        // eventos inventados como si fueran reales del mundo, sin avisar.
        // Ahora se muestra el estado de error real, con reintento explícito.
        setLiveEvents([]); setLiveError(true);
      });
    return () => { vivo = false; };
  }, [worldId, reloadKey]);

  const allEvents = liveEvents || [];
  // Los eventos del propio mundo se separan del resto. Un evento embebido lo
  // creó el mundo y lo aprobó RedPontis; los demás vienen de un organizador o
  // de un usuario final. Mostrarlos en la misma lista los volvía
  // indistinguibles justo donde la diferencia importa.
  const eventosDelMundo = allEvents.filter(e => e.modo === "embebido");
  const otrosEventos = allEvents.filter(e => e.modo !== "embebido");
  const [tab, setTab] = useState("eventos");
  const [creando, setCreando] = useState(false);
  const [step, setStep] = useState(1);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo:"", fecha:"", hora:"18:00", lugar:"", descripcion:"",
    categoria:"General", precio:0, gratis:true, aforo:100,
    entidad: { tipo:"personal", nombre:"", ruc:"" }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const CATEGORIAS = ["Arte y Cultura","Música","Tecnología y Negocios","Deporte","Gastronomía","Educación","General"];
  const ICONS = {"Arte y Cultura":"palette","Música":"music_note","Tecnología y Negocios":"hub","Deporte":"sports_soccer","Gastronomía":"restaurant","Educación":"school","General":"confirmation_number","Ecosistema JOI":"stars"};

  // Criterio B2C: el usuario final publica su propio evento — entra a la
  // MISMA cola de aprobación de RedPontis que los eventos B2B/Embebido
  // (antes: esto solo simulaba con un setTimeout, nunca llegaba a Supabase).
  const submitEvento = async () => {
    setSubmitting(true);
    try {
      await crearEventoB2CRemote(worldId, nuevoEvento);
      setSubmitted(true); setCreando(false); setStep(1); setReloadKey(k => k + 1);
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "crear-evento-b2c", worldId);
      showToast({ titulo: "No se pudo enviar el evento", mensaje: err.mensaje, accion: "Revisa los datos e inténtalo nuevamente." }, "error");
      // Se queda en el formulario (step 3, revisar y enviar) para que el usuario pueda reintentar —
      // antes esto fingía éxito y sacaba al usuario del flujo sin que el evento llegara a Supabase.
    } finally { setSubmitting(false); }
  };

  if (creando) return (
    <div className="px-5 pb-8">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {[1,2,3].map(n=>(
          <React.Fragment key={n}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step>=n?"text-white":"text-[#c7c4d8] border border-[#e4e1ee]"}`}
              style={step>=n?{background:"linear-gradient(135deg,#3525cd,#4f46e5)"}:{}}>
              {step>n?<Icon name="check" size="text-sm" color="text-white"/>:n}
            </div>
            {n<3&&<div className={`flex-1 h-1 rounded-full ${step>n?"bg-[#3525cd]":"bg-[#e4e1ee]"}`}/>}
          </React.Fragment>
        ))}
      </div>
      <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider mb-1">
        {step===1?"Datos del evento":step===2?"Entidad organizadora":"Revisar y enviar"}
      </p>

      {step===1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#1b1b24]">Tu evento</h2>
          {[{l:"Título del evento",k:"titulo",p:"Ej. Festival de Jazz Barranco"},{l:"Fecha",k:"fecha",t:"date"},{l:"Hora",k:"hora",t:"time"},{l:"Lugar / Dirección",k:"lugar",p:"Ej. Parque Kennedy, Miraflores"}].map(f=>(
            <div key={f.k}>
              <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">{f.l}</label>
              <input type={f.t||"text"} className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none focus:ring-2 focus:ring-[#3525cd]/20"
                placeholder={f.p||""} value={nuevoEvento[f.k]||""} onChange={e=>setNuevoEvento(p=>({...p,[f.k]:e.target.value}))}/>
            </div>
          ))}
          <div>
            <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(c=>(
                <button key={c} onClick={()=>setNuevoEvento(p=>({...p,categoria:c}))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border tap-active ${nuevoEvento.categoria===c?"bg-[#3525cd] text-white border-[#3525cd]":"border-[#e4e1ee] text-[#464555]"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Descripción</label>
            <textarea className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none resize-none" rows={3}
              placeholder="Cuéntanos de qué trata tu evento..." value={nuevoEvento.descripcion} onChange={e=>setNuevoEvento(p=>({...p,descripcion:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Aforo</label>
              <input type="number" className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none" value={nuevoEvento.aforo} onChange={e=>setNuevoEvento(p=>({...p,aforo:+e.target.value}))}/>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">Precio (S/)</label>
              <input type="number" disabled={nuevoEvento.gratis} className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none disabled:opacity-40" value={nuevoEvento.gratis?0:nuevoEvento.precio} onChange={e=>setNuevoEvento(p=>({...p,precio:+e.target.value}))}/>
            </div>
          </div>
          <label className="flex items-center gap-3 p-3 glass-card rounded-2xl tap-active cursor-pointer">
            <div onClick={()=>setNuevoEvento(p=>({...p,gratis:!p.gratis}))} className={`w-11 h-6 rounded-full transition-colors ${nuevoEvento.gratis?"bg-green-500":"bg-[#e4e1ee]"} relative`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${nuevoEvento.gratis?"right-1":"left-1"}`}/>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1b1b24]">Entrada gratuita</p>
              <p className="text-xs text-[#777587]">{nuevoEvento.gratis?"Sin costo para los asistentes":"Cobro por entrada"}</p>
            </div>
          </label>
          <div className="flex gap-2">
            <button onClick={()=>{setCreando(false);setStep(1);}} className="flex-1 py-3 glass-card rounded-2xl font-bold text-sm text-[#464555] tap-active">Cancelar</button>
            <PrimaryBtn label="Continuar →" onClick={()=>setStep(2)} disabled={!nuevoEvento.titulo||!nuevoEvento.fecha} full={false}/>
          </div>
        </div>
      )}

      {step===2 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#1b1b24]">Entidad organizadora</h2>
          <p className="text-sm text-[#777587]">Es opcional: solo hace falta si publicas a nombre de una empresa o entidad legal. Si es un evento personal, puedes saltarlo.</p>
          {[
            {k:"personal",l:"Evento personal",d:"Publicas a título propio, sin empresa ni RUC"},
            {k:"existente",l:"Entidad existente",d:"Asocia tu RUC o el de tu empresa ya registrada"},
            {k:"nueva",l:"Nueva entidad",d:"Registra una nueva entidad legal para este evento"},
          ].map(op=>(
            <button key={op.k} onClick={()=>setNuevoEvento(p=>({...p,entidad:{...p.entidad,tipo:op.k}}))}
              className={`w-full p-4 rounded-2xl border-2 text-left tap-active transition-all ${nuevoEvento.entidad.tipo===op.k?"border-[#3525cd] bg-[#f0ecf9]":"border-[#e4e1ee] glass-card"}`}>
              <p className="font-bold text-[#1b1b24]">{op.l}</p>
              <p className="text-xs text-[#777587] mt-0.5">{op.d}</p>
            </button>
          ))}
          {nuevoEvento.entidad.tipo!=="personal" && (
            <>
              <div>
                <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">
                  {nuevoEvento.entidad.tipo==="existente"?"Nombre de la entidad / empresa":"Razón social de la nueva entidad"}
                </label>
                <input className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none" placeholder="Ej. Jazz Garage Lima S.R.L."
                  value={nuevoEvento.entidad.nombre} onChange={e=>setNuevoEvento(p=>({...p,entidad:{...p.entidad,nombre:e.target.value}}))}/>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#777587] uppercase tracking-wider block mb-2">
                  {nuevoEvento.entidad.tipo==="existente"?"RUC":"RUC (si ya tienes) o dejalo vacío"}
                </label>
                <input className="w-full bg-[#f0ecf9] rounded-2xl px-4 py-3 text-[#1b1b24] text-sm outline-none" placeholder="20XXXXXXXXX"
                  value={nuevoEvento.entidad.ruc} onChange={e=>setNuevoEvento(p=>({...p,entidad:{...p.entidad,ruc:e.target.value}}))}/>
              </div>
            </>
          )}
          <ConfigBanner icon="approval" message="Tu evento será revisado por RedPontis antes de publicarse. Recibirás una notificación." color="blue"/>
          {!monetizacion && (
            <ConfigBanner icon="volunteer_activism" message="Fase 0 — RedPontis no cobra comisión sobre tus entradas." color="green"/>
          )}
          <div className="flex gap-2">
            <button onClick={()=>setStep(1)} className="flex-1 py-3 glass-card rounded-2xl font-bold text-sm text-[#464555] tap-active">Atrás</button>
            <PrimaryBtn label="Revisar →" onClick={()=>setStep(3)} disabled={nuevoEvento.entidad.tipo!=="personal" && !nuevoEvento.entidad.nombre} full={false}/>
          </div>
        </div>
      )}

      {step===3 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#1b1b24]">Confirmar envío</h2>
          <SectionCard className="p-4 space-y-3">
            {[
              {l:"Título",v:nuevoEvento.titulo},{l:"Fecha",v:`${nuevoEvento.fecha} ${nuevoEvento.hora}`},
              {l:"Lugar",v:nuevoEvento.lugar},{l:"Categoría",v:nuevoEvento.categoria},
              {l:"Aforo",v:`${nuevoEvento.aforo} personas`},{l:"Precio",v:nuevoEvento.gratis?"Gratuito":`S/ ${nuevoEvento.precio}`},
              {l:"Organizador",v:nuevoEvento.entidad.tipo==="personal"?"Evento personal (sin entidad legal)":`${nuevoEvento.entidad.nombre} · ${nuevoEvento.entidad.tipo==="nueva"?"Nueva entidad":"Entidad existente"}`},
            ].map((r,i)=>(
              <div key={i} className="flex justify-between items-start">
                <p className="text-[11px] font-bold text-[#777587] uppercase w-24 flex-shrink-0">{r.l}</p>
                <p className="text-sm text-[#1b1b24] font-semibold text-right flex-1">{r.v}</p>
              </div>
            ))}
          </SectionCard>
          <div className="flex gap-2">
            <button onClick={()=>setStep(2)} className="flex-1 py-3 glass-card rounded-2xl font-bold text-sm text-[#464555] tap-active">Atrás</button>
            <button onClick={submitEvento} disabled={submitting}
              className="flex-1 py-4 rounded-2xl text-white font-black text-sm tap-active disabled:opacity-50 flex items-center justify-center gap-2"
              style={{background:"linear-gradient(135deg,#3525cd,#4f46e5)"}}>
              {submitting?<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Enviando...</>:"Publicar evento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Vista detalle: secciones resueltas por el Render Engine (ux_components) ──
  if (detalle) {
    const vendidas = vendidasMap[detalle.id] || 0;
    const secciones = detalle.ux_components || ["hero", "entradas", "agenda", "marketplace"];
    return (
      <div className="px-5 space-y-4 pb-8">
        <button onClick={() => { setDetalle(null); setReloadKey(k => k + 1); }}
          className="flex items-center gap-1.5 text-sm font-bold text-[#3525cd] tap-active">
          <Icon name="arrow_back" size="text-base" color="text-[#3525cd]"/> Todos los eventos
        </button>
        {secciones.map(k => {
          const Section = EVENT_SECTION_REGISTRY[k];
          if (!Section) return null;
          return <React.Fragment key={k}>{Section({
            ev: detalle, vendidas, mundo: cfg.mundo, comercios: comerciosDelMundo,
            onComprado: () => { setDetalle(null); setTab("mis_entradas"); setReloadKey(x => x + 1); },
          })}</React.Fragment>;
        })}
      </div>
    );
  }

  return (
    <div className="px-5 space-y-4 pb-8">
      {/* Success toast */}
      {submitted && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <Icon name="check_circle" fill size="text-2xl" color="text-green-600"/>
          <div>
            <p className="font-bold text-green-800">Evento enviado</p>
            <p className="text-xs text-green-600">En revisión por RedPontis. Te notificamos pronto.</p>
          </div>
          <button onClick={()=>setSubmitted(false)} className="ml-auto"><Icon name="close" size="text-base" color="text-green-600"/></button>
        </div>
      )}

      {/* Info para quien puede crear eventos — B2B/B2C/comisión son clasificación
          interna de RedPontis, nunca se le muestran al usuario final; solo se
          le informa lo que necesita saber si va a publicar un evento propio. */}
      {canCreate && (
        <SectionCard className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl">
              <Icon name="approval" fill size="text-sm" color="text-amber-600"/>
              <span className="text-xs text-amber-800">Tu evento requiere aprobación de RedPontis antes de publicarse</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl">
              <Icon name="business" fill size="text-sm" color="text-blue-600"/>
              <span className="text-xs text-blue-800">Debes asociar una entidad legal para organizar</span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* CTA crear evento (B2C) */}
      {canCreate && (
        <button onClick={()=>{setCreando(true);setStep(1);}}
          className="w-full py-4 rounded-2xl text-white font-black text-sm tap-active flex items-center justify-center gap-2"
          style={{background:`linear-gradient(135deg,${cfg.mundo.color||"#3525cd"},#4f46e5)`,boxShadow:`0 6px 20px ${cfg.mundo.color||"#3525cd"}40`}}>
          <Icon name="add_circle" fill size="text-base" color="text-white"/>Crear y publicar mi evento
        </button>
      )}
      {/* Tabs: marketplace / mis entradas / (si puede publicar) mis eventos */}
      <div className="flex gap-2">
        {[["eventos","Eventos"],["mis_entradas","Mis entradas"],...(canCreate ? [["mis_eventos","Mis eventos"]] : [])].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===t?"bg-[#3525cd] text-white":"glass-card text-[#464555]"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "mis_entradas" && <MisEntradasList mundo={cfg.mundo} refreshKey={reloadKey}/>}

      {tab === "mis_eventos" && <MisEventosCreadosList worldId={worldId} refreshKey={reloadKey}/>}

      {tab === "eventos" && (
        <>
          {/* Estado: cargando */}
          {liveEvents === null && (
            <div className="py-10 flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
              <p className="text-xs text-[#777587]">Buscando eventos…</p>
            </div>
          )}

          {/* Estado: error de conexión */}
          {liveError && liveEvents?.length === 0 && (
            <SectionCard>
              <EmptyState icon="cloud_off" title="No pudimos cargar los eventos"
                subtitle="Revisa tu conexión e intenta de nuevo."
                action="Reintentar" onAction={()=>{setLiveEvents(null);setReloadKey(k=>k+1);}}/>
            </SectionCard>
          )}

          {/* Carrusel propio del mundo — solo eventos Embebido, que son los que
              el mundo creó desde su panel y RedPontis aprobó. Van en su propia
              franja y no mezclados con el resto porque no son "un evento más
              del marketplace": son del colegio, y para el apoderado esa
              distinción es la que importa. */}
          {eventosDelMundo.length > 0 && (
            <CarruselDelMundo
              eventos={eventosDelMundo}
              mundo={cfg.mundo}
              vendidasMap={vendidasMap}
              onVerEntradas={setDetalle}
              comercios={comerciosDelMundo}
            />
          )}

          {/* Estado: con resultados */}
          {otrosEventos.length > 0 && (
            <div className="space-y-3">
              {eventosDelMundo.length > 0 && (
                <p className="text-[11px] font-black uppercase tracking-wider text-[#777587] pt-2">
                  Otros eventos de la comunidad
                </p>
              )}
              {otrosEventos.map(ev=>{
                const icon = ICONS[ev.categoria]||"festival";
                const vendidas = vendidasMap[ev.id] || 0;
                const lleno = ev.aforo_total > 0 && vendidas >= ev.aforo_total;
                return (
                  <SectionCard key={ev.id} className="overflow-hidden">
                    <div className="h-20 flex items-center justify-center relative" style={{background:`linear-gradient(135deg,${cfg.mundo.color||"#3525cd"}15,#dae2fd)`}}>
                      <Icon name={icon} fill size="text-5xl" color="text-[#3525cd]"/>
                      <div className="absolute top-2 left-3 flex gap-1.5">
                        <Chip label={ev.tipo === "kermesse" ? "Kermesse" : "Evento"} color="bg-[#e2dfff] text-[#3525cd]"/>
                      </div>
                      {lleno && <div className="absolute top-2 right-3"><Chip label="Agotado" color="bg-red-100 text-red-700"/></div>}
                    </div>
                    <div className="p-4">
                      <p className="font-black text-[#1b1b24] mb-1">{ev.titulo}</p>
                      <p className="text-xs text-[#3525cd] font-semibold flex items-center gap-1 mb-1">
                        <Icon name="calendar_today" size="text-xs" color="text-[#3525cd]"/>{ev.fecha} {ev.hora && `· ${ev.hora}`}
                      </p>
                      {ev.lugar && <p className="text-xs text-[#777587] flex items-center gap-1 mb-2"><Icon name="location_on" size="text-xs" color="text-[#777587]"/>{ev.lugar}</p>}
                      {ev.organizador && (
                        <p className="text-[10px] text-[#777587] mb-2">Organiza: <b>{ev.organizador}</b></p>
                      )}
                      {ev.aforo_total > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-[#777587] mb-1">
                            <span>Aforo</span><span>{vendidas}/{ev.aforo_total} entradas</span>
                          </div>
                          <ProgressBar value={vendidas} max={ev.aforo_total}/>
                        </div>
                      )}
                      <PrimaryBtn
                        label={lleno ? "Agotado" : "Ver entradas"}
                        icon={lleno ? "block" : "confirmation_number"}
                        disabled={lleno}
                        onClick={()=>setDetalle(ev)}/>
                      {pickup && !lleno && <p className="text-center text-[10px] text-[#c7c4d8] mt-2">Pre-orden disponible · retiro en {pickup} min</p>}
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}

          {/* Estado: sin resultados */}
          {liveEvents !== null && !liveError && allEvents.length === 0 && (
            <SectionCard>
              <EmptyState icon="confirmation_number" title="Sin eventos publicados"
                subtitle={canCreate?"Sé el primero en publicar un evento en esta comunidad.":"El organizador aún no ha publicado eventos."}
                action={canCreate?"Crear mi evento":null} onAction={()=>{setCreando(true);setStep(1);}}/>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE GENÉRICO — para módulos sin template dedicado aún
// ══════════════════════════════════════════════════════════════════════════════
function GenericTemplate({ cfg, moduleId }) {
  const CATALOG = useCatalogLive();
  const m = CATALOG[moduleId] || MODULES[moduleId] || { icon:"settings", label:moduleId, bg:"bg-gray-100", color:"text-gray-500" };
  const configEntries = Object.entries(cfg.config || {});
  // Feature flags del módulo tal como los configuró el admin — la vista se
  // arma desde la config viva, no desde código dedicado (Render Engine).
  const flagEntries = Object.entries(cfg.servicios || {});

  return (
    <div className="px-5 pb-8 space-y-4">
      <div className={`${m.bg || "bg-[#f0ecf9]"} rounded-3xl p-8 text-center`}>
        <Icon name={m.icon} fill size="text-5xl" color={m.color || "text-[#3525cd]"}/>
        <p className="font-black text-[#1b1b24] text-lg mt-3">{m.label}</p>
        <p className="text-sm text-[#777587] mt-1">Módulo activo en <b>{cfg.mundo.nombre}</b></p>
      </div>
      {flagEntries.length > 0 && (
        <SectionCard>
          <SectionHeader label="Servicios habilitados por tu comunidad" icon="toggle_on"/>
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {flagEntries.map(([code, on]) => (
              <Chip key={code}
                label={code.replace(/_/g, " ")}
                color={on ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400 line-through"}/>
            ))}
          </div>
        </SectionCard>
      )}
      {configEntries.length > 0 && (
        <SectionCard>
          <SectionHeader label="Configuración activa" icon="settings"/>
          {configEntries.slice(0,6).map(([k,v],i)=>(
            <ListItem key={i} title={k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}
              subtitle={typeof v==="boolean"?(v?"Activado":"Desactivado"):String(v)||"—"}
              right={typeof v==="boolean"?<div className={`w-8 h-4 rounded-full ${v?"bg-[#3525cd]":"bg-[#e4e1ee]"}`}/>:null}
            />
          ))}
        </SectionCard>
      )}
      <SectionCard><EmptyState icon="auto_awesome" title="Vista resuelta por configuración" subtitle="Esta pantalla se genera desde el Catálogo Global y la configuración del mundo — sin código dedicado."/></SectionCard>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: SUBSIDIO
// config: categorias, vigenciaDias
// ══════════════════════════════════════════════════════════════════════════════
function SubsidioTemplate({ cfg, u }) {
  const mundoId = cfg.mundo.id;
  const cats = (cfg.config.categorias || "F&B,Educación").split(",").map(c=>c.trim());
  const vig = cfg.config.vigenciaDias;
  const saldo = 85.00; // demo

  return (
    <div className="px-5 space-y-4 pb-8">
      <div className="rounded-3xl p-8 text-center text-white" style={{background:"linear-gradient(135deg,#5800c3 0%,#7c3aed 100%)"}}>
        <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2">Saldo subsidiado</p>
        <p className="text-5xl font-black">S/ {saldo.toFixed(2)}</p>
        <p className="text-white/50 text-xs mt-2">{vig ? `Vence en ${vig} días` : "Sin caducidad"}</p>
      </div>
      <SectionCard className="p-4">
        <p className="text-sm font-bold text-[#1b1b24] mb-3">Válido solo en estas categorías</p>
        <div className="flex flex-wrap gap-2">
          {cats.map(c=>(
            <div key={c} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-50 border border-purple-200">
              <Icon name="check_circle" fill size="text-sm" color="text-purple-600"/>
              <span className="text-xs font-bold text-purple-700">{c}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#777587] mt-3">Solo puedes usar este saldo en comercios de estas categorías dentro de {cfg.mundo.nombre}.</p>
      </SectionCard>
      <SectionCard>
        <SectionHeader label="Historial de subsidio" icon="history"/>
        {[{l:"Cafetería Central",s:"-S/ 12.50",t:"Hoy",cat:"F&B"},
          {l:"Librería Campus",s:"-S/ 8.00",t:"Ayer",cat:"Educación"},
          {l:"Recarga de subsidio",s:"+S/ 100.00",t:"Lunes",cat:"Sistema"}].map((h,i)=>(
          <ListItem key={i} icon={h.s.startsWith("-")?"shopping_bag":"add_card"}
            iconBg={h.s.startsWith("-")?"bg-purple-50":"bg-green-50"}
            iconColor={h.s.startsWith("-")?"text-purple-600":"text-green-600"}
            title={h.l} subtitle={`${h.cat} · ${h.t}`}
            right={<span className={`font-black text-sm ${h.s.startsWith("-")?"text-[#1b1b24]":"text-green-600"}`}>{h.s}</span>}/>
        ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: CRÉDITO
// config: lineaMax, tasaInteres
// ══════════════════════════════════════════════════════════════════════════════
function CreditoTemplate({ cfg, u }) {
  const lineaMax = cfg.config.lineaMax || 1000;
  const tasa = cfg.config.tasaInteres || 24;
  const usado = 320;
  const disponible = lineaMax - usado;

  return (
    <div className="px-5 space-y-4 pb-8">
      <SectionCard className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[11px] font-bold text-[#777587] uppercase tracking-widest">Línea disponible</p>
            <p className="text-4xl font-black text-green-600 mt-1">S/ {disponible.toFixed(2)}</p>
          </div>
          <Chip label={`TEA ${tasa}%`} color="bg-amber-100 text-amber-700"/>
        </div>
        <div className="mb-2 text-xs text-[#777587] flex justify-between">
          <span>Usado: S/ {usado.toFixed(2)}</span>
          <span>Total: S/ {lineaMax.toFixed(2)}</span>
        </div>
        <ProgressBar value={usado} max={lineaMax}/>
      </SectionCard>
      <div className="grid grid-cols-2 gap-3">
        <SectionCard className="p-4 text-center">
          <Icon name="credit_card" fill size="text-3xl" color="text-[#3525cd]"/>
          <p className="font-bold text-sm text-[#1b1b24] mt-2">Usar crédito</p>
          <p className="text-xs text-[#777587]">Al pagar en POS</p>
        </SectionCard>
        <SectionCard className="p-4 text-center">
          <Icon name="payments" fill size="text-3xl" color="text-green-600"/>
          <p className="font-bold text-sm text-[#1b1b24] mt-2">Pagar cuota</p>
          <p className="text-xs text-[#777587]">Vence en 12 días</p>
        </SectionCard>
      </div>
      <SectionCard>
        <SectionHeader label="Cuotas pendientes" icon="schedule"/>
        {[{n:"Cuota 1/3",v:106.67,f:"15 Dic",estado:"Pendiente"},
          {n:"Cuota 2/3",v:106.67,f:"15 Ene",estado:"Futura"},
          {n:"Cuota 3/3",v:106.66,f:"15 Feb",estado:"Futura"}].map((c,i)=>(
          <ListItem key={i} icon="receipt" iconBg="bg-[#f0ecf9]" iconColor="text-[#3525cd]"
            title={c.n} subtitle={`Vence ${c.f}`}
            right={<div className="text-right"><p className="font-black text-sm text-[#1b1b24]">S/ {c.v.toFixed(2)}</p><Chip label={c.estado} color={c.estado==="Pendiente"?"bg-amber-100 text-amber-700":"bg-[#f0ecf9] text-[#777587]"}/></div>}/>
        ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: PERFIL EXTENDIDO
// config: camposMedicos, grupoFamiliar
// ══════════════════════════════════════════════════════════════════════════════
function PerfilExtTemplate({ cfg, u }) {
  const worldId = cfg.mundo.id;
  const userId = getSyntheticUserId();
  const medicos = cfg.config.camposMedicos !== false;
  const familiar = cfg.config.grupoFamiliar !== false;
  const nombre = u?.auth?.nombre || "Usuario";
  const initials = nombre.split(" ").map(p=>p[0]).join("").toUpperCase().slice(0,2);

  const [perfil, setPerfil] = useState(null);       // null=cargando, {} si nunca guardado
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [guardarError, setGuardarError] = useState(null);
  const [dependientes, setDependientes] = useState(null);
  const [otraAlergiaPerfil, setOtraAlergiaPerfil] = useState("");
  // Selector de perfil (Task #155) — antes esta pantalla SOLO leía/escribía la
  // ficha médica del titular logueado. Un dependiente nunca podía tener tipo
  // de sangre, clínica o contacto de emergencia propios: no había forma de
  // decirle a esta pantalla "estoy viendo la ficha de mi hijo", así que
  // guardarPerfilExtendido (que ya acepta cualquier userId) nunca se llamaba
  // con el id del dependiente. Las alergias NO se duplican acá para un
  // dependiente — su fuente real sigue siendo dependents.alergias, editable
  // desde Restricciones (Task #175); acá se muestran solo de lectura.
  const [perfilActivoId, setPerfilActivoId] = useState(userId);

  useEffect(() => {
    let vivo = true;
    fetchMisDependientes(userId, worldId).then(r => { if (vivo) setDependientes(r || []); }).catch(() => { if (vivo) setDependientes([]); });
    return () => { vivo = false; };
  }, [worldId, userId]);

  useEffect(() => {
    let vivo = true;
    setPerfil(null); setEditando(false);
    fetchMiPerfilExtendido(perfilActivoId, worldId).then(r => { if (vivo) setPerfil(r || {}); }).catch(() => { if (vivo) setPerfil({}); });
    return () => { vivo = false; };
  }, [worldId, perfilActivoId]);

  const perfiles = [
    { id: userId, nombre, esTitular: true },
    ...(dependientes || []).map(d => ({ id: d.dependent_user_id, nombre: d.nombre, esTitular: false, alergias: d.alergias })),
  ];
  const activo = perfiles.find(p => p.id === perfilActivoId) || perfiles[0];

  const abrirEdicion = () => {
    setDraft({
      tipo_sangre: perfil?.tipo_sangre || "", alergias: perfil?.alergias || "",
      clinica: perfil?.clinica || "", contacto_emergencia_nombre: perfil?.contacto_emergencia_nombre || "",
      contacto_emergencia_telefono: perfil?.contacto_emergencia_telefono || "",
    });
    setOtraAlergiaPerfil("");
    setEditando(true);
  };
  const guardar = async () => {
    setGuardando(true); setGuardarError(null);
    try {
      await guardarPerfilExtendido(perfilActivoId, worldId, draft);
      setPerfil(draft); setEditando(false);
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "perfil-ext-guardar", worldId);
      setGuardarError([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setGuardando(false); }
  };

  const CAMPOS_TODOS = [
    { key: "tipo_sangre", icon: "water_drop", label: "Tipo de sangre", bg: "bg-red-50", c: "text-red-600", placeholder: "Ej. O+" },
    { key: "alergias", icon: "no_food", label: "Alergias", bg: "bg-amber-50", c: "text-amber-600", placeholder: "Ej. Mariscos, Nueces" },
    { key: "clinica", icon: "local_hospital", label: "Clínica de atención", bg: "bg-blue-50", c: "text-blue-600", placeholder: "Ej. Clínica San Pablo" },
  ];
  // Cada campo (tipo_sangre/alergias/clinica/contacto_emergencia) es un feature
  // flag independiente en el catálogo — antes se mostraban los 4 en bloque
  // apenas camposMedicos estaba activo, sin respetar cuáles activó RedPontis.
  // Para un dependiente, alergias se excluye de este formulario — es de solo
  // lectura acá, se edita en Restricciones.
  const CAMPOS = CAMPOS_TODOS.filter(f => cfg.has(f.key) && (activo.esTitular || f.key !== "alergias"));
  const mostrarEmergencia = cfg.has("contacto_emergencia");

  return (
    <div className="px-5 space-y-4 pb-8">
      {/* Profile card */}
      <SectionCard className="p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#3525cd] flex items-center justify-center mx-auto mb-3" style={{boxShadow:"0 8px 24px rgba(53,37,205,0.3)"}}>
          <span className="text-white font-black text-2xl">{initials}</span>
        </div>
        <p className="font-black text-[#1b1b24] text-xl">{nombre}</p>
        <p className="text-xs text-[#777587] mt-1">{u?.auth?.email}</p>
        <div className="flex justify-center gap-2 mt-3">
          <Tag label="TAQ NFC" icon="contactless"/>
          <Tag label="QR activo" icon="qr_code"/>
        </div>
      </SectionCard>

      {/* Medical data — real, editable, persistido en Supabase */}
      {medicos && (
        <SectionCard>
          <SectionHeader label="Datos médicos y emergencia" icon="medical_information" action={editando ? undefined : "Editar"} onAction={editando ? undefined : abrirEdicion}/>
          {(dependientes?.length || 0) > 0 && (
            <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
              {perfiles.map(p => (
                <button key={p.id} onClick={()=>{ if (!editando) setPerfilActivoId(p.id); }} disabled={editando}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border tap-active transition-colors disabled:opacity-40 ${p.id===perfilActivoId?"bg-[#3525cd] text-white border-[#3525cd]":"border-[#e4e1ee] text-[#464555]"}`}>
                  {p.esTitular ? `${p.nombre} (tú)` : p.nombre}
                </button>
              ))}
            </div>
          )}
          {!activo.esTitular && (
            <p className="px-4 pb-3 text-[11px] text-[#777587]">
              Ficha de {activo.nombre}. {activo.alergias ? `Alergias: ${activo.alergias}. ` : ""}Las alergias se editan desde Restricciones, no acá.
            </p>
          )}
          {perfil === null ? (
            <p className="px-4 py-4 text-sm text-[#777587]">Cargando…</p>
          ) : editando ? (
            <div className="px-4 pb-4 space-y-3">
              {CAMPOS.map(f => f.key === "alergias" ? (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-2">{f.label}</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {ALERGIAS_CATALOG.map(a => {
                      const arr = (draft.alergias || "").split(",").map(x=>x.trim()).filter(Boolean);
                      const activa = arr.includes(a);
                      return (
                        <button key={a} type="button"
                          onClick={() => setDraft(d => {
                            const cur = (d.alergias || "").split(",").map(x=>x.trim()).filter(Boolean);
                            const next = cur.includes(a) ? cur.filter(x=>x!==a) : [...cur, a];
                            return { ...d, alergias: next.join(", ") };
                          })}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border tap-active transition-colors ${activa?"bg-red-50 border-red-300 text-red-700":"border-[#e4e1ee] text-[#464555]"}`}>{a}</button>
                      );
                    })}
                    {(draft.alergias || "").split(",").map(x=>x.trim()).filter(Boolean).filter(a=>!ALERGIAS_CATALOG.includes(a)).map(a => (
                      <button key={a} type="button"
                        onClick={() => setDraft(d => {
                          const cur = (d.alergias || "").split(",").map(x=>x.trim()).filter(Boolean);
                          return { ...d, alergias: cur.filter(x=>x!==a).join(", ") };
                        })}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border tap-active bg-red-50 border-red-300 text-red-700">{a}</button>
                    ))}
                    <input value={otraAlergiaPerfil} onChange={e=>setOtraAlergiaPerfil(e.target.value)}
                      onKeyDown={e=>{ if (e.key==="Enter" && otraAlergiaPerfil.trim()) { e.preventDefault();
                        setDraft(d => { const cur = (d.alergias || "").split(",").map(x=>x.trim()).filter(Boolean); return { ...d, alergias: [...cur, otraAlergiaPerfil.trim()].join(", ") }; });
                        setOtraAlergiaPerfil(""); } }}
                      onBlur={()=>{ if (otraAlergiaPerfil.trim()) {
                        setDraft(d => { const cur = (d.alergias || "").split(",").map(x=>x.trim()).filter(Boolean); return { ...d, alergias: [...cur, otraAlergiaPerfil.trim()].join(", ") }; });
                        setOtraAlergiaPerfil(""); } }}
                      placeholder="+ Otra…" className="px-3 py-1.5 rounded-full text-xs border border-dashed border-[#c7c4d8] text-[#464555] bg-[#f0ecf9] outline-none w-20 focus:w-32 transition-all"/>
                  </div>
                </div>
              ) : (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-1">{f.label}</label>
                  <input className="w-full bg-[#f0ecf9] rounded-xl px-3 py-2.5 text-sm text-[#1b1b24] outline-none"
                    placeholder={f.placeholder} value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}/>
                </div>
              ))}
              {mostrarEmergencia && (
              <div>
                <label className="text-[10px] font-bold text-[#777587] uppercase tracking-wider block mb-1">Contacto de emergencia</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-[#f0ecf9] rounded-xl px-3 py-2.5 text-sm text-[#1b1b24] outline-none" placeholder="Nombre"
                    value={draft.contacto_emergencia_nombre} onChange={e => setDraft(d => ({ ...d, contacto_emergencia_nombre: e.target.value }))}/>
                  <input className="w-32 bg-[#f0ecf9] rounded-xl px-3 py-2.5 text-sm text-[#1b1b24] outline-none" placeholder="Teléfono"
                    value={draft.contacto_emergencia_telefono} onChange={e => setDraft(d => ({ ...d, contacto_emergencia_telefono: e.target.value }))}/>
                </div>
              </div>
              )}
              {guardarError && <p className="text-xs text-red-600">{guardarError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setEditando(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[#777587] tap-active">Cancelar</button>
                <button onClick={guardar} disabled={guardando} className="flex-1 py-2.5 bg-[#3525cd] text-white rounded-xl font-bold text-sm tap-active disabled:opacity-50">{guardando ? "Guardando…" : "Guardar"}</button>
              </div>
            </div>
          ) : !CAMPOS.some(f => perfil[f.key]) && !(mostrarEmergencia && perfil.contacto_emergencia_nombre) ? (
            <div className="px-4 pb-4"><EmptyState icon="medical_information" title="Sin datos médicos" subtitle={`Toca "Editar" para registrar ${activo.esTitular ? "tus datos médicos" : `los datos médicos de ${activo.nombre}`}.`}/></div>
          ) : (
            <>
              {CAMPOS.filter(f => perfil[f.key]).map(f => (
                <ListItem key={f.key} icon={f.icon} iconBg={f.bg} iconColor={f.c} title={f.label} subtitle={perfil[f.key]}/>
              ))}
              {mostrarEmergencia && perfil.contacto_emergencia_nombre && (
                <ListItem icon="phone_in_talk" iconBg="bg-green-50" iconColor="text-green-600" title="Contacto de emergencia"
                  subtitle={`${perfil.contacto_emergencia_nombre}${perfil.contacto_emergencia_telefono ? " · " + perfil.contacto_emergencia_telefono : ""}`}/>
              )}
            </>
          )}
        </SectionCard>
      )}

      {/* QR / TAQ identification — solo para un dependiente: la del titular ya
          está cubierta en Billetera ("Mi código JOI") y en Accesos, así que
          repetirla acá era puro relleno. Antes esta tarjeta además ignoraba
          perfilActivoId y siempre mostraba el QR del titular aunque estuvieras
          viendo la ficha de un hijo. */}
      {!activo.esTitular && (
        <SectionCard className="p-6">
          <p className="font-bold text-[#1b1b24] text-center mb-4">Identificación de {activo.nombre}</p>
          <QRCode label={activo.nombre} sub="Identificación en el mundo · TAQ/QR" value={activo.id} />
        </SectionCard>
      )}

      {/* Grupo familiar — reutiliza los dependientes reales del módulo Restricciones */}
      {familiar && (
        <SectionCard>
          <SectionHeader label="Grupo familiar vinculado" icon="group"/>
          {dependientes === null ? (
            <p className="px-4 py-4 text-sm text-[#777587]">Cargando…</p>
          ) : dependientes.length === 0 ? (
            <div className="px-4 pb-4"><EmptyState icon="group_add" title="Sin miembros vinculados" subtitle='Agrega familiares desde el módulo "Mi Familia" para gestión conjunta en el mundo.'/></div>
          ) : dependientes.map(d => (
            <ListItem key={d.id} icon="person" iconBg="bg-[#e2dfff]" iconColor="text-[#3525cd]" title={d.nombre}
              subtitle={d.alergias ? `Alergias: ${d.alergias}` : "Sin alergias registradas"}
              onClick={medicos ? () => setPerfilActivoId(d.dependent_user_id) : undefined}
              right={medicos ? <Icon name="medical_information" size="text-sm" color="text-[#3525cd]"/> : undefined}/>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: ESTACIONAMIENTO
// config: tarifaHora, graciaMinutos
// ══════════════════════════════════════════════════════════════════════════════
function EstacionamientoTemplate({ cfg, u }) {
  const tarifa = cfg.config.tarifaHora || 5;
  const gracia = cfg.config.graciaMinutos || 15;
  const [active, setActive] = useState(false);
  const [mins, setMins] = useState(0);

  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(()=>setMins(m=>m+1), 60000);
    return ()=>clearInterval(t);
  }, [active]);

  const costo = Math.max(0, ((mins - gracia) / 60) * tarifa);

  return (
    <div className="px-5 space-y-4 pb-8">
      <ConfigBanner icon="timer" message={`Tarifa: S/ ${tarifa}/hora · ${gracia} min de gracia al ingreso/egreso.`} color="blue"/>

      {active ? (
        <SectionCard className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3" style={{boxShadow:"0 0 24px rgba(34,197,94,0.4)"}}>
            <Icon name="local_parking" fill size="text-3xl" color="text-white"/>
          </div>
          <p className="text-[11px] font-bold text-green-600 uppercase tracking-widest">Estacionamiento activo</p>
          <p className="text-4xl font-black text-[#1b1b24] mt-1">{mins}min</p>
          <p className="text-2xl font-black text-[#3525cd] mt-1">S/ {costo.toFixed(2)}</p>
          <p className="text-xs text-[#777587] mt-1">{gracia > mins ? `${gracia - mins} min de gracia restantes` : `Cobro activo · S/ ${tarifa}/hr`}</p>
          <button onClick={()=>{setActive(false);setMins(0);}}
            className="mt-4 w-full py-3 rounded-2xl bg-red-500 text-white font-black tap-active">
            Registrar salida
          </button>
        </SectionCard>
      ) : (
        <SectionCard className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0ecf9] flex items-center justify-center mx-auto mb-3">
            <Icon name="local_parking" fill size="text-3xl" color="text-[#3525cd]"/>
          </div>
          <p className="text-[#777587] text-sm mb-4">Sin estacionamiento activo</p>
          <PrimaryBtn label="Registrar entrada" icon="login" onClick={()=>setActive(true)}/>
        </SectionCard>
      )}

      <SectionCard>
        <SectionHeader label="Historial" icon="history"/>
        {[{d:"Hoy · 2h 15min",v:"S/ 10.00"},{d:"Ayer · 45min",v:"S/ 0.00 (gracia)"},{d:"Lunes · 3h",v:"S/ 15.00"}].map((h,i)=>(
          <ListItem key={i} icon="local_parking" iconBg="bg-[#e3f2fd]" iconColor="text-blue-600"
            title={h.d} subtitle={cfg.mundo.nombre}
            right={<span className="font-black text-sm text-[#1b1b24]">{h.v}</span>}/>
        ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: PROMOCIONES
// config: maxCuponesUsuario
// servicios: Cupón QR, Banner, Push
// ══════════════════════════════════════════════════════════════════════════════
function PromocionesTemplate({ cfg, u }) {
  const maxCupones = cfg.config.maxCuponesUsuario || 5;
  const [promos, setPromos] = useState(null);
  const [verQR, setVerQR] = useState(null); // promo abierta en modal

  useEffect(() => {
    let vivo = true;
    fetchPromocionesLive(cfg.mundo.id).then(r => { if (vivo) setPromos(r || []); }).catch(() => { if (vivo) setPromos([]); });
    return () => { vivo = false; };
  }, [cfg.mundo.id]);

  // Bug real de QA (hallado hoy): toISOString() convierte a UTC antes de
  // formatear — en Lima (UTC-5), después de ~19:00 ya devuelve el día
  // siguiente, marcando cupones "vencidos" horas antes de su vencimiento real.
  const hoyDatePromos = new Date();
  const hoy = `${hoyDatePromos.getFullYear()}-${String(hoyDatePromos.getMonth() + 1).padStart(2, "0")}-${String(hoyDatePromos.getDate()).padStart(2, "0")}`;
  const PROMOS = (promos || []).map(p => {
    const vencida = p.vigencia_hasta && p.vigencia_hasta < hoy;
    const agotada = p.usos_max != null && p.usos_actuales >= p.usos_max;
    const activo = p.estado === "VIGENTE" && !vencida && !agotada;
    return {
      id: p.id, titulo: p.titulo, desc: p.merchant_nombre,
      icon: "local_offer", color: activo ? "bg-amber-50" : "bg-[#f0ecf9]", c: activo ? "text-amber-600" : "text-[#777587]",
      vence: p.vigencia_hasta ? new Date(p.vigencia_hasta).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "Sin vencimiento",
      activo, agotada, codigoQR: p.codigo_qr, valor: p.valor, tipo: p.tipo,
    };
  });

  return (
    <div className="px-5 space-y-4 pb-8">
      <div className="glass-card rounded-2xl p-4 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold text-[#777587] uppercase">Cupones activos</p>
          <p className="text-2xl font-black text-[#3525cd]">{PROMOS.filter(p=>p.activo).length} <span className="text-sm font-bold text-[#777587]">/ {maxCupones}</span></p>
        </div>
        <Icon name="confirmation_number" fill size="text-3xl" color="text-[#3525cd]"/>
      </div>

      <p className="text-[11px] font-bold text-[#777587] uppercase tracking-widest px-1">Disponibles para ti</p>
      {promos === null ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
        </div>
      ) : PROMOS.length === 0 ? (
        <EmptyState icon="confirmation_number" title="Sin promociones" subtitle="Cuando este mundo publique un cupón, aparecerá aquí."/>
      ) : (
        <div className="space-y-3">
          {PROMOS.map((p) => (
            <SectionCard key={p.id} className={`p-4 ${!p.activo?"opacity-50":""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl ${p.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={p.icon} fill size="text-2xl" color={p.c}/>
                </div>
                <div className="flex-1">
                  <p className="font-black text-[#1b1b24]">{p.titulo}</p>
                  <p className="text-xs text-[#777587]">{p.desc}</p>
                  {p.tipo === "Descuento %" && p.valor && <p className="text-xs font-black text-[#3525cd] mt-0.5">{p.valor}% de descuento</p>}
                  {p.tipo === "Cashback" && p.valor && <p className="text-xs font-black text-green-600 mt-0.5">S/ {p.valor} cashback</p>}
                  <p className="text-[10px] text-[#c7c4d8] font-bold mt-1">Vence: {p.vence}</p>
                </div>
                {p.activo ? (
                  <button onClick={() => setVerQR(p)} className="bg-[#3525cd] text-white text-[10px] font-black px-3 py-1.5 rounded-xl tap-active flex-shrink-0">Ver QR</button>
                ) : (
                  <Chip label={p.agotada ? "Agotada" : "Vencida"} color="bg-[#f0ecf9] text-[#777587]"/>
                )}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {verQR && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6" onClick={() => setVerQR(null)}>
          <div className="glass-card rounded-3xl w-full max-w-[340px] p-6 text-center" onClick={e => e.stopPropagation()}>
            <p className="font-black text-[#1b1b24] mb-1">{verQR.titulo}</p>
            <p className="text-xs text-[#777587] mb-4">{verQR.desc}</p>
            <QRCode label="" sub="" value={verQR.codigoQR}/>
            <p className="font-mono text-sm font-bold text-[#3525cd] mt-3">{verQR.codigoQR}</p>
            <p className="text-[10px] text-[#777587] mt-1">Muéstralo en el POS del comercio para canjearlo.</p>
            <button onClick={() => setVerQR(null)} className="mt-4 w-full py-3 rounded-xl bg-[#f0ecf9] text-[#3525cd] font-bold text-sm tap-active">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: TURNOS
// config: duracionDefault
// ══════════════════════════════════════════════════════════════════════════════
function TurnosTemplate({ cfg, u }) {
  const duracion = cfg.config.duracionDefault || 30;

  const CITAS = [
    {titulo:"Consulta médica",servicio:"Tópico escolar",fecha:"Mañana 10:00 AM",estado:"Confirmada",icon:"medical_services"},
    {titulo:"Reunión de padres",servicio:"Salón 3B",fecha:"Vie 15 Nov · 3 PM",estado:"Pendiente",icon:"groups"},
  ];

  return (
    <div className="px-5 space-y-4 pb-8">
      <ConfigBanner icon="timer" message={`Duración estándar por turno: ${duracion} minutos.`} color="blue"/>
      <PrimaryBtn label="Agendar nuevo turno" icon="add_circle"/>
      <SectionCard>
        <SectionHeader label="Mis citas" icon="calendar_month"/>
        {CITAS.length === 0
          ? <EmptyState icon="event_busy" title="Sin citas agendadas" subtitle="Agenda tu primera cita usando el botón de arriba."/>
          : CITAS.map((c,i)=>(
            <div key={i} className="p-4 border-b border-[#e4e1ee]/40 last:border-0">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-11 h-11 rounded-xl bg-[#e0f7fa] flex items-center justify-center flex-shrink-0">
                  <Icon name={c.icon} fill size="text-xl" color="text-cyan-700"/>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#1b1b24]">{c.titulo}</p>
                  <p className="text-xs text-[#777587]">{c.servicio}</p>
                </div>
                <Chip label={c.estado} color={c.estado==="Confirmada"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}/>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#3525cd] font-semibold ml-14">
                <Icon name="schedule" size="text-sm" color="text-[#3525cd]"/>{c.fecha}
              </div>
            </div>
          ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: TRANSPORTE
// config: tarifaPlana
// ══════════════════════════════════════════════════════════════════════════════
function TransporteTemplate({ cfg, u }) {
  const tarifa = cfg.config.tarifaPlana || 2.5;
  const mundoId = cfg.mundo.id;
  const { saldo } = useWalletLive(mundoId);

  return (
    <div className="px-5 space-y-4 pb-8">
      <SectionCard className="p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#e1f5fe] flex items-center justify-center mx-auto mb-4">
          <Icon name="directions_bus" fill size="text-4xl" color="text-blue-600"/>
        </div>
        <p className="text-[11px] font-bold text-[#777587] uppercase tracking-widest">Tarifa por viaje</p>
        <p className="text-4xl font-black text-blue-600 mt-1">S/ {tarifa.toFixed(2)}</p>
        <p className="text-xs text-[#777587] mt-1">Saldo disponible: S/ {saldo.toFixed(2)}</p>
        <div className="flex gap-2 mt-4">
          <PrimaryBtn label="Pagar con TAQ" icon="contactless" full={false}/>
          <button className="flex-1 py-4 glass-card rounded-2xl font-bold text-sm text-[#464555] tap-active flex items-center justify-center gap-2">
            <Icon name="qr_code" size="text-base" color="text-[#464555]"/>QR
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader label="Mis viajes recientes" icon="history"/>
        {[
          {r:`Ruta A · ${cfg.mundo.nombre} → Comedor`,t:"Hoy 12:10",v:`S/ ${tarifa.toFixed(2)}`,ic:"directions_bus"},
          {r:`Ruta B · Comedor → ${cfg.mundo.nombre}`,t:"Hoy 13:45",v:`S/ ${tarifa.toFixed(2)}`,ic:"directions_bus"},
          {r:`Ruta Expresa · ${cfg.mundo.nombre} ↔ Centro`,t:"Ayer 08:05",v:`S/ ${(tarifa*1.5).toFixed(2)}`,ic:"airport_shuttle"},
        ].map((h,i)=>(
          <ListItem key={i} icon={h.ic} iconBg="bg-[#e1f5fe]" iconColor="text-blue-600"
            title={h.r} subtitle={h.t}
            right={<span className="font-black text-sm text-[#1b1b24]">{h.v}</span>}/>
        ))}
      </SectionCard>

      {/* Route map stub */}
      <SectionCard className="overflow-hidden">
        <SectionHeader label="Rutas activas" icon="route"/>
        <div className="h-32 bg-gradient-to-br from-blue-50 to-[#e1f5fe] flex items-center justify-center">
          <div className="text-center">
            <Icon name="map" fill size="text-4xl" color="text-blue-300"/>
            <p className="text-xs text-blue-400 font-semibold mt-1">Mapa de rutas · {cfg.mundo.nombre}</p>
          </div>
        </div>
        <div className="divide-y divide-[#e4e1ee]/40">
          {["Ruta A · Principal","Ruta B · Express","Ruta C · Nocturna"].map((r,i)=>(
            <ListItem key={i} icon="directions_bus" iconBg="bg-[#e1f5fe]" iconColor="text-blue-600"
              title={r} subtitle={`S/ ${tarifa.toFixed(2)} por viaje`}
              right={<Chip label={i<2?"Activa":"Suspendida"} color={i<2?"bg-green-100 text-green-700":"bg-[#f0ecf9] text-[#777587]"}/>}/>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: BNPL
// config: cuotasMax
// ══════════════════════════════════════════════════════════════════════════════
// BNPL (Caso Mok): el Mundo define el techo, el Comercio su programa, y aquí
// el usuario financia un producto: elegir → cuotas → contrato → cronograma.
// Estados: Disponible / No elegible / Evaluando / Aprobado / Rechazado / Firmado.
const INTERES_POR_CUOTAS = { 3: 0, 6: 0.18, 12: 0.24 };
const FRECUENCIA_LABEL = { semanal: "semanal", quincenal: "quincenal", mensual: "mensual", personalizada: "personalizada" };

function cronogramaDe(monto, cuotas, diasGracia, frecuencia = "mensual", diasPersonalizados = 30) {
  const interes = INTERES_POR_CUOTAS[cuotas] ?? 0.24;
  const total = monto * (1 + interes);
  const cuotaMonto = +(total / cuotas).toFixed(2);
  const base = new Date();
  base.setDate(base.getDate() + (diasGracia || 0));
  const pasoDias = frecuencia === "semanal" ? 7 : frecuencia === "quincenal" ? 15 : frecuencia === "personalizada" ? (diasPersonalizados || 30) : null;
  return Array.from({ length: cuotas }, (_, i) => {
    const f = new Date(base);
    if (pasoDias) f.setDate(f.getDate() + pasoDias * (i + 1)); else f.setMonth(f.getMonth() + i + 1);
    // Bug real de QA: toISOString() convierte a UTC antes de formatear — la
    // hora del día en que se firma el contrato podía adelantar la fecha de
    // cada cuota del cronograma en un día.
    const fechaLocalCuota = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
    return { n: i + 1, fecha: fechaLocalCuota, monto: cuotaMonto, estado: "pendiente" };
  });
}

function BNPLTemplate({ cfg, u }) {
  const worldId = cfg.mundo.id;
  const userId = getSyntheticUserId();
  const c = cfg.config || {};
  // Techo del Mundo (Límites) — con fallback al config legado cuotasMax
  const cuotasMundo = [c.cuotas3 !== false && 3, c.cuotas6 !== false && 6, c.cuotas12 === true && 12].filter(Boolean);
  const cuotasTecho = cuotasMundo.length ? cuotasMundo : [3, 6].filter(n => n <= (c.cuotasMax || 6));
  const diasGracia = Math.min(+c.diasGracia || 5, 10);
  const montoMax = +c.montoMaxBNPL || 3000;
  const sinEvaluacion = c.sinEvaluacion !== false;

  const [programas, setProgramas] = useState(null);   // programas por comercio
  const [contratos, setContratos] = useState(null);   // mis contratos
  const [sel, setSel] = useState(null);                // {programa, producto}
  const [cuotasSel, setCuotasSel] = useState(null);
  const [fase, setFase] = useState("idle");            // idle|evaluando|pendiente_aprobacion|aprobado|pago|firmado|rechazado
  const [rechazoMsg, setRechazoMsg] = useState(null);
  const [solicitudId, setSolicitudId] = useState(null); // id del contrato mientras está pendiente_aprobacion
  const [verificando, setVerificando] = useState(false);
  const [contratoAbierto, setContratoAbierto] = useState(null);
  const [reload, setReload] = useState(0);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [vista, setVista] = useState("comercios");   // comercios | activos | historial
  const [pagandoCuota, setPagandoCuota] = useState(null); // `${contratoId}-${n}` en curso
  const [pagoMsg, setPagoMsg] = useState(null);
  const [productosMundo, setProductosMundo] = useState(null);
  const [campanas, setCampanas] = useState(null);
  const { saldo: walletSaldo, refresh: refrescarWallet } = useWalletLive(worldId);

  useEffect(() => {
    let vivo = true;
    fetchProgramasBNPLLive(worldId).then(r => { if (vivo) setProgramas(r || []); }).catch(() => { if (vivo) setProgramas([]); });
    fetchMisContratosBNPL(userId, worldId)
      .then(r => sincronizarCicloBNPL(r || []))
      .then(r => { if (vivo) setContratos(r); })
      .catch(() => { if (vivo) setContratos([]); });
    fetchProductosMundoLive(worldId).then(r => { if (vivo) setProductosMundo(r || []); }).catch(() => { if (vivo) setProductosMundo([]); });
    fetchCampanasBNPLMundo(worldId).then(r => { if (vivo) setCampanas(r || []); }).catch(() => { if (vivo) setCampanas([]); });
    return () => { vivo = false; };
  }, [worldId, reload]);

  // Elegibilidad de productos según el alcance del programa (Gantt #61):
  // catalogo = todo el catálogo real del comercio, categorias = filtrado por
  // categoría, puntuales = lista manual (comportamiento original). Las
  // campañas vigentes por fecha se suman siempre, sobre cualquier alcance.
  const productosFinanciablesDe = prog => {
    const productosComercio = (productosMundo || []).filter(p => p.merchant_id === prog.merchant_id);
    let base;
    if (prog.alcance === "catalogo") {
      base = productosComercio.map(p => ({ id: p.id, nombre: p.name, precio: +p.price }));
    } else if (prog.alcance === "categorias") {
      base = productosComercio.filter(p => (prog.categorias || []).includes(p.category)).map(p => ({ id: p.id, nombre: p.name, precio: +p.price }));
    } else {
      base = prog.productos_financiables || [];
    }
    // Bug real de QA: toISOString() adelanta "hoy" en la tarde/noche (Lima
    // es UTC-5) — una campaña BNPL vigente podía leerse como vencida horas antes.
    const hoyDateFin = new Date();
    const hoy = `${hoyDateFin.getFullYear()}-${String(hoyDateFin.getMonth() + 1).padStart(2, "0")}-${String(hoyDateFin.getDate()).padStart(2, "0")}`;
    const campanasVigentes = (campanas || []).filter(c =>
      c.merchant_id === prog.merchant_id && (!c.fecha_inicio || c.fecha_inicio <= hoy) && (!c.fecha_fin || c.fecha_fin >= hoy));
    const extra = campanasVigentes.flatMap(c => {
      if (prog.alcance === "puntuales") return (c.productos || []).map(pid => (prog.productos_financiables || []).find(p => p.id === pid)).filter(Boolean);
      return (c.productos || []).map(pid => productosComercio.find(p => p.id === pid)).filter(Boolean).map(p => ({ id: p.id, nombre: p.name, precio: +p.price }));
    });
    const vistos = new Set();
    return [...base, ...extra].filter(p => (vistos.has(p.id) ? false : (vistos.add(p.id), true)));
  };

  const pagarCuota = async (contrato, n) => {
    setPagandoCuota(`${contrato.id}-${n}`);
    setPagoMsg(null);
    try {
      const r = await pagarCuotaBNPLUsuario(userId, contrato, n);
      if (!r.ok) {
        setPagoMsg({ tipo: "error", texto: r.motivo === "saldo" ? "Saldo insuficiente en tu wallet de este mundo." : "No se pudo procesar el pago." });
      } else {
        setPagoMsg({ tipo: "ok", texto: `Cuota ${n} pagada. Nuevo saldo: S/ ${r.balance.toFixed(2)}.` });
        refrescarWallet();
        setReload(k => k + 1);
      }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      setPagoMsg({ tipo: "error", texto: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally {
      setPagandoCuota(null);
    }
  };

  // Rules Engine: mora + modalidad suspensión → bloquear nuevas compras BNPL en ese comercio
  const comercioSuspendido = prog =>
    prog.gestion_mora === "sin_cargo_suspension" &&
    (contratos || []).some(k => k.merchant_id === prog.merchant_id && (k.estado === "en_mora" || k.estado === "suspendido"));

  const elegir = (prog, producto) => {
    // Rules Engine: monto > techo del mundo → bloquear
    if (producto.precio > montoMax) return;
    setSel({ prog, producto });
    setCuotasSel(null);
    setFase("idle");
    setSolicitudId(null);
  };

  const cuotasDisponibles = sel
    ? cuotasTecho.filter(n => (sel.prog.cuotas_activas || []).includes(n)) // clamping mundo ∩ comercio
    : [];

  // Administración de Solicitudes (Gantt #31): antes "evaluar" era un timeout
  // falso que siempre aprobaba sin que el comercio lo viera. Ahora, cuando el
  // mundo exige evaluación, se crea una solicitud real (estado
  // "pendiente_aprobacion") que el comercio resuelve desde su panel — recién
  // ahí el usuario puede continuar al cobro de la 1ra cuota.
  const evaluar = async () => {
    if (!cuotasSel) return;
    if (sinEvaluacion) { setFase("aprobado"); return; }
    setFase("evaluando");
    try {
      const diasGraciaEfectivo = sel.prog.dias_gracia != null ? sel.prog.dias_gracia : diasGracia;
      const frecuenciaEfectiva = sel.prog.frecuencia || "mensual";
      const cron = cronogramaDe(sel.producto.precio, cuotasSel, diasGraciaEfectivo, frecuenciaEfectiva, sel.prog.dias_personalizados);
      const row = await crearContratoBNPLLive({
        world_id: worldId, merchant_id: sel.prog.merchant_id, merchant_nombre: sel.prog.merchant_nombre,
        user_id: userId, producto: sel.producto.nombre, monto: sel.producto.precio,
        cuotas: cuotasSel, dias_gracia: diasGraciaEfectivo, interes_pct: (INTERES_POR_CUOTAS[cuotasSel] ?? 0.24) * 100,
        gestion_mora: sel.prog.gestion_mora || "sin_cargo_suspension",
        frecuencia: frecuenciaEfectiva, primer_venc: (cron[1] || cron[0]).fecha,
        cronograma: cron, estado: "pendiente_aprobacion",
      });
      setSolicitudId(row?.id || null);
      setFase("pendiente_aprobacion");
    } catch (e) {
      setRechazoMsg("No se pudo enviar la solicitud. Intenta nuevamente.");
      setFase("rechazado");
    }
  };

  const verificarSolicitud = async () => {
    if (!solicitudId) return;
    setVerificando(true);
    try {
      const rows = await fetchMisContratosBNPL(userId, worldId);
      const c = (rows || []).find(x => x.id === solicitudId);
      if (c?.estado === "aprobado") setFase("aprobado");
      else if (c?.estado === "rechazado") { setRechazoMsg(c.rechazo_motivo || "El comercio rechazó tu solicitud."); setFase("rechazado"); }
    } finally { setVerificando(false); }
  };

  // Cobro de la 1ra cuota vía Culqi (form) al momento de firmar (Gantt #31):
  // el contrato solo se crea/confirma si el cobro se confirma; cuota 1 nace
  // "pagada". Si vino de una solicitud aprobada, el contrato ya existe (nació
  // pendiente_aprobacion) — solo se actualiza; si no requería evaluación,
  // recién ahora se crea.
  const confirmarPagoYFirmar = async () => {
    setProcesandoPago(true);
    try {
      const diasGraciaEfectivo = sel.prog.dias_gracia != null ? sel.prog.dias_gracia : diasGracia;
      const frecuenciaEfectiva = sel.prog.frecuencia || "mensual";
      const cron = cronogramaDe(sel.producto.precio, cuotasSel, diasGraciaEfectivo, frecuenciaEfectiva, sel.prog.dias_personalizados);
      cron[0] = { ...cron[0], estado: "pagada" };
      if (solicitudId) {
        await updateContratoBNPL(solicitudId, { cronograma: cron, estado: "firmado" });
      } else {
        await crearContratoBNPLLive({
          world_id: worldId, merchant_id: sel.prog.merchant_id, merchant_nombre: sel.prog.merchant_nombre,
          user_id: userId, producto: sel.producto.nombre, monto: sel.producto.precio,
          cuotas: cuotasSel, dias_gracia: diasGraciaEfectivo, interes_pct: (INTERES_POR_CUOTAS[cuotasSel] ?? 0.24) * 100,
          gestion_mora: sel.prog.gestion_mora || "sin_cargo_suspension",
          frecuencia: frecuenciaEfectiva, primer_venc: (cron[1] || cron[0]).fecha,
          cronograma: cron, estado: "firmado",
        });
      }
      setFase("firmado");
      setReload(k => k + 1);
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "bnpl-firmar", worldId);
      setRechazoMsg([err.mensaje, err.accion].filter(Boolean).join(" "));
      setFase("rechazado");
    } finally {
      setProcesandoPago(false);
    }
  };

  // ── Flujo de financiamiento activo ──
  if (sel) {
    const precio = sel.producto.precio;
    const interes = cuotasSel ? (INTERES_POR_CUOTAS[cuotasSel] ?? 0.24) : 0;
    const diasGraciaEfectivo = sel.prog.dias_gracia != null ? sel.prog.dias_gracia : diasGracia;
    const cron = cuotasSel ? cronogramaDe(precio, cuotasSel, diasGraciaEfectivo, sel.prog.frecuencia || "mensual", sel.prog.dias_personalizados) : [];
    return (
      <div className="px-5 space-y-4 pb-8">
        <button onClick={() => { setSel(null); setFase("idle"); setSolicitudId(null); }} className="flex items-center gap-1.5 text-sm font-bold text-[#3525cd] tap-active">
          <Icon name="arrow_back" size="text-base" color="text-[#3525cd]"/> Productos financiables
        </button>

        <SectionCard className="p-4">
          <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider">{sel.prog.merchant_nombre}</p>
          <div className="flex justify-between items-start mt-1">
            <p className="font-black text-lg text-[#1b1b24] flex-1 mr-3">{sel.producto.nombre}</p>
            <p className="font-black text-xl text-purple-700">S/ {Number(precio).toFixed(2)}</p>
          </div>
        </SectionCard>

        {/* Estado: firmado */}
        {fase === "firmado" ? (
          <SectionCard className="p-5 text-center">
            <Icon name="verified" fill size="text-5xl" color="text-green-600"/>
            <p className="font-black text-[#1b1b24] text-lg mt-2">Contrato firmado</p>
            <p className="text-sm text-[#777587] mt-1">Tu compra quedó financiada en {cuotasSel} cuotas. El cronograma está en "Mis contratos".</p>
            <div className="mt-4"><PrimaryBtn label="Ver mis contratos" icon="receipt_long" onClick={() => { setSel(null); setFase("idle"); setSolicitudId(null); }}/></div>
          </SectionCard>
        ) : fase === "rechazado" ? (
          <SectionCard className="p-5 text-center">
            <Icon name="cancel" fill size="text-5xl" color="text-red-500"/>
            <p className="font-black text-[#1b1b24] text-lg mt-2">Financiamiento rechazado</p>
            <p className="text-sm text-[#777587] mt-1">{rechazoMsg || "No pudimos completar la operación. Intenta nuevamente o paga con saldo."}</p>
          </SectionCard>
        ) : (
          <>
            {/* BNPL Selector — cuotas: intersección techo del mundo ∩ programa del comercio */}
            <SectionCard className="p-5">
              <p className="font-bold text-sm text-[#1b1b24] mb-1">Elige tus cuotas</p>
              <p className="text-[10px] text-[#777587] mb-3">Techo del mundo: {cuotasTecho.join("/")} cuotas · {sel.prog.merchant_nombre} ofrece: {(sel.prog.cuotas_activas||[]).join("/")}</p>
              <div className="grid grid-cols-3 gap-2">
                {cuotasDisponibles.map(n => (
                  <button key={n} onClick={() => setCuotasSel(n)}
                    className={`text-center p-3 rounded-2xl border-2 transition-all tap-active ${cuotasSel === n ? "border-purple-600 bg-[#ede7f6]" : "border-[#e4e1ee]"}`}>
                    <p className="font-black text-purple-700">{n}x</p>
                    <p className="text-[10px] text-[#777587]">{INTERES_POR_CUOTAS[n] === 0 ? "0% interés" : `${INTERES_POR_CUOTAS[n] * 100}% anual`}</p>
                    <p className="font-bold text-[11px] text-[#1b1b24] mt-1">S/ {(precio * (1 + (INTERES_POR_CUOTAS[n] ?? 0)) / n).toFixed(2)}/mes</p>
                  </button>
                ))}
              </div>
              {cuotasDisponibles.length === 0 && (
                <p className="text-xs text-red-500">Este comercio no tiene cuotas activas dentro del límite del mundo.</p>
              )}
              <p className="text-[10px] text-[#777587] mt-3 flex items-center gap-1">
                <Icon name="event" size="text-xs" color="text-[#777587]"/>{diasGraciaEfectivo} días de gracia · cobro {FRECUENCIA_LABEL[sel.prog.frecuencia] || "mensual"}
              </p>
            </SectionCard>

            {/* Estados: evaluando / aprobado / contrato */}
            {fase === "idle" && (
              <PrimaryBtn label={sinEvaluacion ? "Continuar sin evaluación" : "Evaluar elegibilidad"} icon="fact_check"
                disabled={!cuotasSel} onClick={evaluar}/>
            )}
            {fase === "evaluando" && (
              <SectionCard className="p-5 text-center">
                <span className="inline-block w-7 h-7 border-2 border-[#e4e1ee] border-t-purple-600 rounded-full animate-spin"/>
                <p className="font-bold text-sm text-[#1b1b24] mt-2">Enviando solicitud…</p>
              </SectionCard>
            )}
            {fase === "pendiente_aprobacion" && (
              <SectionCard className="p-5 text-center">
                <Icon name="hourglass_top" size="text-4xl" color="text-purple-500"/>
                <p className="font-black text-[#1b1b24] text-base mt-2">Solicitud enviada</p>
                <p className="text-sm text-[#777587] mt-1">{sel.prog.merchant_nombre} está revisando tu solicitud de financiamiento. Te avisaremos aquí en cuanto la resuelvan.</p>
                <button onClick={verificarSolicitud} disabled={verificando} className="mt-4 text-sm font-bold text-[#3525cd] tap-active disabled:opacity-50">
                  {verificando ? "Verificando…" : "Verificar estado →"}
                </button>
              </SectionCard>
            )}
            {(fase === "aprobado" || fase === "pago") && cuotasSel && (
              <SectionCard className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="task_alt" fill size="text-xl" color="text-green-600"/>
                  <p className="font-black text-[#1b1b24]">Aprobado — Contrato digital</p>
                </div>
                <div className="space-y-1.5 text-xs mb-3">
                  {[["Producto", sel.producto.nombre], ["Comercio", sel.prog.merchant_nombre],
                    ["Monto financiado", `S/ ${Number(precio).toFixed(2)}`],
                    ["Cuotas", `${cuotasSel} de S/ ${(precio * (1 + interes) / cuotasSel).toFixed(2)}`],
                    ["Interés", interes === 0 ? "Sin interés" : `${interes * 100}% anual`],
                    ["Frecuencia de cobro", FRECUENCIA_LABEL[sel.prog.frecuencia] || "mensual"],
                    ["Días de gracia", `${diasGraciaEfectivo} días`],
                    ["Gestión de mora", sel.prog.gestion_mora === "con_cargo" ? `Con cargo por mora (${sel.prog.mora_pct || 0}%)` : "Suspensión sin cargo"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span className="text-[#777587]">{l}</span><span className="font-semibold text-[#1b1b24] text-right">{v}</span></div>
                  ))}
                </div>
                <div className="bg-[#f0ecf9] rounded-2xl p-3 mb-4 max-h-36 overflow-y-auto">
                  <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider mb-2">Cronograma de cuotas</p>
                  {cron.map(q => (
                    <div key={q.n} className="flex justify-between text-[11px] py-0.5">
                      <span className="text-[#777587]">Cuota {q.n} · {q.fecha}</span>
                      <span className="font-bold text-[#1b1b24]">S/ {q.monto.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {fase === "aprobado" ? (
                  <PrimaryBtn label="Continuar al pago de la 1ra cuota" icon="credit_card" onClick={() => setFase("pago")}/>
                ) : (
                  <div className="border-t border-[#e4e1ee] pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#1b1b24] font-black text-sm">Cobro de la 1ra cuota</p>
                    </div>
                    <div className="space-y-2 mb-4">
                      <input disabled={procesandoPago} className="w-full bg-[#f0ecf9] rounded-xl px-4 py-3 text-sm font-mono text-[#1b1b24] outline-none disabled:opacity-60" defaultValue="4111 1111 1111 1111"/>
                      <div className="grid grid-cols-2 gap-2">
                        <input disabled={procesandoPago} className="bg-[#f0ecf9] rounded-xl px-4 py-3 text-sm font-mono text-[#1b1b24] outline-none disabled:opacity-60" defaultValue="12/28"/>
                        <input disabled={procesandoPago} className="bg-[#f0ecf9] rounded-xl px-4 py-3 text-sm font-mono text-[#1b1b24] outline-none disabled:opacity-60" defaultValue="123"/>
                      </div>
                    </div>
                    <PrimaryBtn label={procesandoPago ? "Procesando con Culqi…" : `Pagar S/ ${cron[0].monto.toFixed(2)} y firmar contrato`}
                      icon="history_edu" disabled={procesandoPago} onClick={confirmarPagoYFirmar}/>
                    <p className="text-center text-[9px] text-[#c7c4d8] mt-2 uppercase tracking-wider">Checkout embebido · contrato Culqi (simulado para demo)</p>
                  </div>
                )}
              </SectionCard>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Vista principal: Comercios con BNPL / Mis Planes / Historial ──
  const activos = (contratos || []).filter(k => k.estado !== "cerrado" && k.estado !== "incobrable" && k.estado !== "rechazado");
  const historial = (contratos || []).filter(k => k.estado === "cerrado" || k.estado === "incobrable" || k.estado === "rechazado");

  return (
    <div className="px-5 space-y-4 pb-8">
      <SectionCard className="p-6 text-center">
        <Icon name="schedule_send" fill size="text-5xl" color="text-purple-600"/>
        <p className="font-black text-[#1b1b24] text-xl mt-3">Paga después</p>
        <p className="text-sm text-[#777587] mt-1">Financia productos seleccionados en hasta <b className="text-purple-600">{Math.max(...cuotasTecho)} cuotas</b></p>
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {cuotasTecho.map(n=>(
            <div key={n} className="px-4 py-2.5 bg-[#ede7f6] rounded-2xl">
              <p className="font-black text-purple-700">{n}x</p>
              <p className="text-[10px] text-purple-500">{INTERES_POR_CUOTAS[n] === 0 ? "0% interés" : "Con interés"}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex bg-[#f0ecf9] rounded-2xl p-1 gap-1">
        {[["comercios", "Comercios con BNPL"], ["activos", `Mis Planes${activos.length ? ` (${activos.length})` : ""}`], ["historial", "Historial"]].map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors ${vista === v ? "bg-white text-purple-700 shadow-sm" : "text-[#777587]"}`}>
            {l}
          </button>
        ))}
      </div>

      {vista === "comercios" && (
        <>
          {/* Portal BNPL — Comercios con BNPL: descubrimiento previo a la compra */}
          {programas === null ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-purple-600 rounded-full animate-spin"/>
              <p className="text-xs text-[#777587]">Cargando comercios…</p>
            </div>
          ) : programas.length === 0 ? (
            <SectionCard>
              <EmptyState icon="storefront" title="Sin comercios con BNPL activo"
                subtitle="Cuando un comercio de este mundo active su programa 'Paga después', aparecerá aquí con sus cuotas y productos."/>
            </SectionCard>
          ) : programas.map(prog => {
            const suspendido = comercioSuspendido(prog);
            const productos = productosFinanciablesDe(prog);
            return (
              <SectionCard key={prog.id}>
                <SectionHeader label={prog.merchant_nombre || "Comercio"} icon="storefront"/>
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-[10px] text-[#777587]"><b className="text-purple-600">{(prog.cuotas_activas||[]).join("/")}x</b> · {productos.length} producto{productos.length !== 1 ? "s" : ""} financiable{productos.length !== 1 ? "s" : ""} · cobro {FRECUENCIA_LABEL[prog.frecuencia] || "mensual"}</p>
                  {suspendido && <ConfigBanner icon="block" message="Compras BNPL suspendidas en este comercio por mora pendiente." color="red"/>}
                  {productos.length === 0 && (
                    <p className="text-xs text-[#777587] py-2">Este comercio aún no define productos financiables.</p>
                  )}
                  {productos.map((p, i) => {
                    const sobreTecho = p.precio > montoMax; // Rules Engine: monto > techo → bloquear
                    const bloqueado = sobreTecho || suspendido;
                    return (
                      <button key={p.id || i} disabled={bloqueado} onClick={() => elegir(prog, p)}
                        className={`w-full p-3.5 rounded-2xl border-2 border-[#e4e1ee] text-left tap-active flex justify-between items-center ${bloqueado ? "opacity-50" : "hover:border-purple-300"}`}>
                        <div>
                          <p className="font-bold text-sm text-[#1b1b24]">{p.nombre}</p>
                          <p className="text-[10px] text-[#777587]">
                            {sobreTecho ? "No elegible · supera el monto máximo del mundo" : `Hasta ${Math.max(...cuotasTecho.filter(n => (prog.cuotas_activas||[]).includes(n)), 0) || "—"} cuotas · ver detalle`}
                          </p>
                        </div>
                        <p className="font-black text-purple-700">S/ {Number(p.precio).toFixed(2)}</p>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            );
          })}
        </>
      )}

      {vista === "activos" && (
        <SectionCard>
          <SectionHeader label="Mis planes activos" icon="receipt_long"/>
          <div className="px-4 pb-4 space-y-2">
            {contratos === null ? (
              <p className="text-xs text-[#777587] py-2">Cargando…</p>
            ) : activos.length === 0 ? (
              <EmptyState icon="schedule_send" title="Sin planes activos" subtitle="Financia un producto en 'Comercios con BNPL' y tu plan aparecerá aquí."/>
            ) : activos.map(k => {
              const pendientes = (k.cronograma || []).filter(q => q.estado !== "pagada");
              const proxima = [...(k.cronograma || [])].filter(q => q.estado !== "pagada").sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
              const saldoPendiente = pendientes.reduce((a, q) => a + (+q.monto || 0), 0);
              return (
                <div key={k.id} className="rounded-2xl border-2 border-[#e4e1ee] overflow-hidden">
                  <button onClick={() => setContratoAbierto(contratoAbierto === k.id ? null : k.id)}
                    className="w-full p-3.5 text-left flex justify-between items-center tap-active">
                    <div>
                      <p className="font-bold text-sm text-[#1b1b24]">{k.producto}</p>
                      <p className="text-[10px] text-[#777587]">{k.merchant_nombre} · {FRECUENCIA_LABEL[k.frecuencia] || "mensual"} · {pendientes.length} cuota{pendientes.length !== 1 ? "s" : ""} pendiente{pendientes.length !== 1 ? "s" : ""}</p>
                      {proxima && <p className="text-[10px] text-[#777587]">Próximo vencimiento: {proxima.fecha}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-purple-700 text-sm">S/ {saldoPendiente.toFixed(2)}</p>
                      <Chip label={k.estado === "pendiente_aprobacion" ? "En revisión" : k.estado === "suspendido" ? "Suspendido" : k.estado === "en_mora" ? "En mora" : "Firmado"}
                        color={k.estado === "pendiente_aprobacion" ? "bg-purple-100 text-purple-700" : k.estado === "suspendido" || k.estado === "en_mora" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}/>
                    </div>
                  </button>
                  {k.estado === "suspendido" && (
                    <div className="px-4 pb-2"><ConfigBanner icon="block" message="Suspendido por mora — la cuota vencida superó el período de gracia." color="red"/></div>
                  )}
                  {k.estado === "pendiente_aprobacion" && (
                    <div className="px-4 pb-2"><ConfigBanner icon="hourglass_top" message={`${k.merchant_nombre} está revisando esta solicitud.`} color="blue"/></div>
                  )}
                  {contratoAbierto === k.id && k.estado !== "pendiente_aprobacion" && (
                    <div className="px-4 pb-3 bg-[#f0ecf9]/50">
                      <div className="flex justify-between items-center py-2">
                        <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider">Cronograma</p>
                        <p className="text-[10px] text-[#777587]">Saldo en wallet: S/ {Number(walletSaldo).toFixed(2)}</p>
                      </div>
                      {(k.cronograma || []).map(q => (
                        <div key={q.n} className="flex justify-between items-center text-[11px] py-1">
                          <span className="text-[#777587]">Cuota {q.n} · {q.fecha} · {q.estado === "pagada" ? "pagada" : q.estado === "vencida" ? "vencida" : "pendiente"}</span>
                          <span className="flex items-center gap-2">
                            <span className={`font-bold ${q.estado === "vencida" ? "text-red-500" : "text-[#1b1b24]"}`}>S/ {Number(q.monto).toFixed(2)}</span>
                            {q.estado !== "pagada" && (
                              <button disabled={pagandoCuota === `${k.id}-${q.n}`} onClick={() => pagarCuota(k, q.n)}
                                className="px-2 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-bold tap-active disabled:opacity-50">
                                {pagandoCuota === `${k.id}-${q.n}` ? "Pagando…" : "Pagar cuota"}
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                      {pagoMsg && <p className={`text-[10px] mt-2 ${pagoMsg.tipo === "error" ? "text-red-500" : "text-green-600"}`}>{pagoMsg.texto}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {vista === "historial" && (
        <SectionCard>
          <SectionHeader label="Historial BNPL" icon="history"/>
          <div className="px-4 pb-4 space-y-2">
            {contratos === null ? (
              <p className="text-xs text-[#777587] py-2">Cargando…</p>
            ) : historial.length === 0 ? (
              <EmptyState icon="history" title="Sin financiamientos finalizados" subtitle="Los contratos cerrados, cancelados o declarados incobrables aparecerán aquí."/>
            ) : historial.map(k => <HistorialContratoBNPL key={k.id} contrato={k} abierto={contratoAbierto === k.id} onToggle={() => setContratoAbierto(contratoAbierto === k.id ? null : k.id)}/>)}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// Portal BNPL — Historial: contrato aceptado, cronograma original, historial
// de pagos, modificaciones realizadas (bnpl_notificaciones), intereses y mora.
function HistorialContratoBNPL({ contrato: k, abierto, onToggle }) {
  const [mods, setMods] = useState(null);
  useEffect(() => {
    if (!abierto || mods !== null) return;
    fetchModificacionesBNPL(k.id).then(setMods).catch(() => setMods([]));
  }, [abierto]);

  const pagadas = (k.cronograma || []).filter(q => q.estado === "pagada");
  return (
    <div className="rounded-2xl border-2 border-[#e4e1ee] overflow-hidden">
      <button onClick={onToggle} className="w-full p-3.5 text-left flex justify-between items-center tap-active">
        <div>
          <p className="font-bold text-sm text-[#1b1b24]">{k.producto}</p>
          <p className="text-[10px] text-[#777587]">{k.merchant_nombre} · {k.cuotas} cuotas · {new Date(k.created_at).toLocaleDateString("es-PE")}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-[#1b1b24] text-sm">S/ {Number(k.monto).toFixed(2)}</p>
          <Chip label={k.estado === "incobrable" ? "Incobrable" : k.estado === "rechazado" ? "Rechazado" : "Cerrado"} color={k.estado === "rechazado" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}/>
        </div>
      </button>
      {k.estado === "rechazado" && k.rechazo_motivo && (
        <p className="px-4 pb-3 text-[11px] text-[#777587]">Motivo: {k.rechazo_motivo}</p>
      )}
      {abierto && (
        <div className="px-4 pb-3 bg-[#f0ecf9]/50 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2">
            <div><span className="text-[#777587]">Interés</span><p className="font-bold text-[#1b1b24]">{k.interes_pct || 0}% anual</p></div>
            <div><span className="text-[#777587]">Gestión de mora</span><p className="font-bold text-[#1b1b24]">{k.gestion_mora === "con_cargo" ? "Con cargo" : "Suspensión sin cargo"}</p></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider mb-1">Cronograma original</p>
            {(k.cronograma || []).map(q => (
              <div key={q.n} className="flex justify-between text-[11px] py-0.5">
                <span className="text-[#777587]">Cuota {q.n} · {q.fecha} · {q.estado}</span>
                <span className={`font-bold ${q.estado === "vencida" ? "text-red-500" : "text-[#1b1b24]"}`}>S/ {Number(q.monto).toFixed(2)}</span>
              </div>
            ))}
            <p className="text-[10px] text-[#777587] mt-1">{pagadas.length} de {k.cuotas} cuotas pagadas.</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider mb-1">Modificaciones realizadas</p>
            {mods === null ? (
              <p className="text-[11px] text-[#777587]">Cargando…</p>
            ) : mods.length === 0 ? (
              <p className="text-[11px] text-[#777587]">Sin modificaciones — el contrato se cumplió según lo firmado.</p>
            ) : mods.map(m => (
              <div key={m.id} className="text-[11px] py-1 border-t border-[#e4e1ee] first:border-t-0">
                <p className="text-[#1b1b24]">{m.mensaje}</p>
                <p className="text-[9px] text-[#777587]">{new Date(m.created_at).toLocaleString("es-PE")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: CONSUMOS (historial de compras del mundo)
// config: horarioOperativo, anulacionHasta
// ══════════════════════════════════════════════════════════════════════════════
function ConsumosTemplate({ cfg, u }) {
  const mundoId = cfg.mundo.id;
  const { historial } = useWalletLive(mundoId);
  const txs = historial.filter(t=>t.monto<0).slice(0,10);
  const totalGastado = txs.reduce((a,t)=>a+Math.abs(t.monto),0);
  const horario = cfg.config.horarioOperativo;

  return (
    <div className="px-5 space-y-4 pb-8">
      {horario && <ConfigBanner icon="schedule" message={`POS operativo: ${horario}`} color="blue"/>}
      <StatGrid stats={[
        {label:"Total gastado",value:`S/ ${totalGastado.toFixed(2)}`,icon:"shopping_bag",color:"text-[#3525cd]"},
        {label:"Compras",value:txs.length,icon:"receipt",color:"text-[#464555]"},
      ]}/>
      <SectionCard>
        <SectionHeader label="Mis compras en este mundo" icon="receipt_long"/>
        {txs.length===0
          ? <EmptyState icon="receipt_long" title="Sin compras" subtitle="Tus transacciones en este mundo aparecerán aquí."/>
          : txs.map(t=>(
            <ListItem key={t.id} icon="shopping_bag" iconBg="bg-[#f0ecf9]" iconColor="text-[#3525cd]"
              title={t.titulo} subtitle={new Date(t.fecha).toLocaleDateString("es-PE")}
              right={<span className="font-black text-sm text-[#1b1b24]">S/ {Math.abs(t.monto).toFixed(2)}</span>}/>
          ))}
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER PRINCIPAL — elige el template según moduleId + config
// ══════════════════════════════════════════════════════════════════════════════
// Registry de superficies: un ux_component (definido por el admin en el
// Catálogo Global) puede resolver a un template dedicado ya existente, de modo
// que una capacidad NUEVA que reutilice una superficie conocida ("Ticket
// Selector", "Paga después", "Cronograma") renderice rico, sin tocar la app.
const UX_SURFACE_REGISTRY = [
  { match: /ticket|entrada|aforo|evento/i,        fn: (cfg, u) => <EventosTemplate cfg={cfg} u={u}/> },
  { match: /paga después|cuota|cronograma|bnpl/i, fn: (cfg, u) => <BNPLTemplate cfg={cfg} u={u}/> },
  { match: /billetera|saldo|herobalance|wallet/i,  fn: (cfg, u) => <WalletTemplate cfg={cfg} u={u}/> },
  { match: /lealtad|puntos|loyalty/i,             fn: (cfg, u) => <LoyaltyTemplate cfg={cfg} u={u}/> },
];
function resolvePorUxComponent(cfg) {
  // Busca en las flags activas del módulo un ux_component que apunte a una
  // superficie conocida. cfg.servicios = { flag_code: bool }.
  const activos = Object.entries(cfg.servicios || {}).filter(([, on]) => on).map(([k]) => k);
  for (const code of activos) {
    for (const s of UX_SURFACE_REGISTRY) {
      if (s.match.test(code)) return s.fn;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATE: COMERCIOS · Marketplace del mundo (Gantt #90 — Caso Raimondi)
// Vista general con filtro por comercio ANTES de los productos + checkout
// unificado. Antes: la capacidad "comercios" renderizaba MenuTemplate
// (hardcodeado, sin dimensión de comercio — parecía un solo comercio).
// ══════════════════════════════════════════════════════════════════════════════
function MarketplaceTemplate({ cfg, u }) {
  const worldId = cfg.mundo.id;
  const userId = getSyntheticUserId();
  const nombreTitular = u?.auth?.nombre || "Yo";
  const location = useLocation();
  const { saldo, refresh: refreshWallet } = useWalletLive(worldId);
  const comercios = useMerchantsLive(worldId);
  const [productos, setProductos] = useState(null);
  const [filtro, setFiltro] = useState(location.state?.filtro || "todos");     // "todos" | merchant_id
  const [dependientes, setDependientes] = useState(null);
  const [restricciones, setRestricciones] = useState({}); // { [dependent_user_id]: dependent_restrictions row }
  const [beneficiarioId, setBeneficiarioId] = useState(userId);
  const [saldoBeneficiario, setSaldoBeneficiario] = useState(null);
  const [cart, setCart] = useState([]);              // [{product, qty}] — un comercio a la vez
  const [enCheckout, setEnCheckout] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [resultado, setResultado] = useState(null);  // {ok, ...} | {ok:false, titulo, mensaje, accion}
  const [avisoMixto, setAvisoMixto] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetchProductosMundoLive(worldId).then(r => { if (vivo) setProductos(r || []); }).catch(() => { if (vivo) setProductos([]); });
    fetchMisDependientes(userId, worldId).then(async r => {
      if (!vivo) return;
      setDependientes(r || []);
      const rest = await fetchRestriccionesDependientesBulk((r || []).map(d => d.dependent_user_id), worldId).catch(() => []);
      if (vivo) setRestricciones(Object.fromEntries((rest || []).map(x => [x.dependent_user_id, x])));
    }).catch(() => { if (vivo) setDependientes([]); });
    return () => { vivo = false; };
  }, [worldId]);

  const beneficiarios = [
    { id: userId, nombre: nombreTitular, tipo: "titular", restriccion: null },
    ...(dependientes || []).map(d => ({ id: d.dependent_user_id, nombre: d.nombre, tipo: "dependiente", restriccion: restricciones[d.dependent_user_id] || null })),
  ];
  const beneficiario = beneficiarios.find(b => b.id === beneficiarioId) || beneficiarios[0];
  const bloqueadoPorRestriccion = p => (beneficiario.restriccion?.productos_bloqueados || []).includes(p.id);
  const fueraDeHorario = () => {
    const h = beneficiario.restriccion;
    if (!h?.horario_inicio || !h?.horario_fin) return false;
    const ahora = new Date();
    const actual = ahora.getHours() * 60 + ahora.getMinutes();
    const [hi, mi] = h.horario_inicio.split(":").map(Number);
    const [hf, mf] = h.horario_fin.split(":").map(Number);
    return !(actual >= hi * 60 + mi && actual <= hf * 60 + mf);
  };

  const refrescarSaldoBeneficiario = () => {
    if (beneficiarioId === userId) { setSaldoBeneficiario(saldo); return; }
    fetchDependienteBalance(beneficiarioId, worldId).then(setSaldoBeneficiario).catch(() => setSaldoBeneficiario(null));
  };
  useEffect(refrescarSaldoBeneficiario, [beneficiarioId, worldId, saldo]);

  const nombreDe = id => comercios.find(c => c.id === id)?.nombre || "Comercio";
  const comercioActivo = filtro !== "todos" ? comercios.find(c => c.id === filtro) : null;
  const visibles = (productos || []).filter(p => filtro === "todos" || p.merchant_id === filtro);
  const cartMerchant = cart[0]?.product.merchant_id || null;
  const total = cart.reduce((a, it) => a + (+it.product.price) * it.qty, 0);
  const unidades = cart.reduce((a, it) => a + it.qty, 0);
  const saldoMostrado = beneficiarioId === userId ? saldo : (saldoBeneficiario ?? 0);

  const agregar = (p) => {
    if (bloqueadoPorRestriccion(p)) return;
    if (cartMerchant && p.merchant_id !== cartMerchant) { setAvisoMixto(true); return; }
    setAvisoMixto(false);
    setCart(c => {
      const i = c.findIndex(it => it.product.id === p.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { product: p, qty: 1 }];
    });
  };
  const quitar = (pid) => setCart(c => c.map(it => it.product.id === pid ? { ...it, qty: it.qty - 1 } : it).filter(it => it.qty > 0));

  const pagar = async () => {
    if (fueraDeHorario()) {
      setResultado({ ok: false, titulo: "Fuera de horario", mensaje: `${beneficiario.nombre} solo puede comprar entre ${beneficiario.restriccion.horario_inicio} y ${beneficiario.restriccion.horario_fin}.`, accion: null });
      return;
    }
    setPagando(true);
    try {
      const r = await comprarProductosLive(beneficiario.id, worldId, cartMerchant, cart);
      if (r.ok) {
        setResultado({ ok: true, total: r.total, comercio: nombreDe(cartMerchant), beneficiario: beneficiario.nombre });
        setCart([]); setEnCheckout(false); refreshWallet(); refrescarSaldoBeneficiario();
      } else if (r.motivo === "stock") {
        setResultado({ ok: false, titulo: "Sin stock suficiente", mensaje: `"${r.producto}" solo tiene ${r.stockDisponible} disponible(s) — ajusta la cantidad en tu carrito.`, accion: null });
      } else if (r.motivo === "restriccion_horario" || r.motivo === "restriccion_limite_diario") {
        // Rechazo del RPC server-side (Task #181) — normalmente ya lo evita
        // el chequeo de fueraDeHorario()/bloqueadoPorRestriccion de arriba,
        // pero si la config cambió a mitad de sesión, este es el mensaje real.
        const err = await errorControlado(r.motivo);
        logErrorControlado(r.motivo, `marketplace-checkout:${cartMerchant}`, worldId);
        setResultado({ ok: false, titulo: err.titulo, mensaje: err.mensaje, accion: err.accion });
      } else {
        const err = await errorControlado("saldo_insuficiente");
        logErrorControlado("saldo_insuficiente", `marketplace-checkout:${cartMerchant}`, worldId);
        setResultado({ ok: false, titulo: err.titulo, mensaje: `${err.mensaje} Saldo de ${beneficiario.nombre}: S/ ${(r.balance ?? saldoMostrado).toFixed(2)}.`, accion: err.accion });
      }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", `marketplace-checkout:${cartMerchant}`, worldId);
      setResultado({ ok: false, titulo: err.titulo, mensaje: err.mensaje, accion: err.accion });
    } finally { setPagando(false); }
  };

  // ── Éxito de compra (popup de éxito estructurado) ──
  if (resultado?.ok) return (
    <div className="px-5 pb-8">
      <SectionCard className="p-6 text-center">
        <Icon name="check_circle" fill size="text-5xl" color="text-green-600"/>
        <p className="font-black text-[#1b1b24] text-lg mt-2">Compra realizada</p>
        <p className="text-sm text-[#777587] mt-1">Pagaste <b>S/ {resultado.total.toFixed(2)}</b> a <b>{resultado.comercio}</b> con el saldo de <b>{resultado.beneficiario}</b>. El detalle está en Actividad.</p>
        <div className="mt-4"><PrimaryBtn label="Seguir comprando" icon="storefront" onClick={() => setResultado(null)}/></div>
      </SectionCard>
    </div>
  );

  // ── Checkout unificado ──
  if (enCheckout) return (
    <div className="px-5 space-y-4 pb-8">
      <button onClick={() => setEnCheckout(false)} className="flex items-center gap-1.5 text-sm font-bold text-[#3525cd] tap-active">
        <Icon name="arrow_back" size="text-base" color="text-[#3525cd]"/> Seguir comprando
      </button>
      <SectionCard className="p-5">
        <p className="text-[11px] font-bold text-[#777587] uppercase tracking-wider">{nombreDe(cartMerchant)}</p>
        <p className="font-black text-lg text-[#1b1b24] mb-3">Tu pedido</p>
        <div className="space-y-2 mb-4">
          {cart.map(it => (
            <div key={it.product.id} className="flex items-center justify-between text-sm">
              <span className="flex-1">{it.product.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => quitar(it.product.id)} className="w-6 h-6 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active"><Icon name="remove" size="text-xs" color="text-[#3525cd]"/></button>
                <span className="font-bold w-4 text-center">{it.qty}</span>
                <button onClick={() => agregar(it.product)} className="w-6 h-6 rounded-full bg-[#f0ecf9] flex items-center justify-center tap-active"><Icon name="add" size="text-xs" color="text-[#3525cd]"/></button>
                <span className="font-mono text-xs w-16 text-right">S/ {((+it.product.price) * it.qty).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#e4e1ee] pt-3 flex justify-between items-center mb-1">
          <span className="font-bold text-[#1b1b24]">Total</span>
          <span className="font-black text-xl text-[#3525cd]">S/ {total.toFixed(2)}</span>
        </div>
        {beneficiarios.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 mb-1">
            {beneficiarios.map(b => (
              <button key={b.id} onClick={() => setBeneficiarioId(b.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${beneficiarioId === b.id ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>
                <Icon name={b.tipo === "titular" ? "person" : "face"} size="text-sm" color={beneficiarioId === b.id ? "text-white" : "text-[#777587]"}/>
                {b.nombre}
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[#777587] mb-4">Saldo de {beneficiario.nombre}: S/ {saldoMostrado.toFixed(2)}</p>
        {resultado && !resultado.ok && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl mb-3">
            <p className="font-bold text-red-700 text-sm">{resultado.titulo}</p>
            <p className="text-xs text-red-600 mt-0.5">{[resultado.mensaje, resultado.accion].filter(Boolean).join(" ")}</p>
          </div>
        )}
        <PrimaryBtn label={pagando ? "Procesando…" : `Pagar S/ ${total.toFixed(2)} con saldo de ${beneficiario.nombre}`} icon="account_balance_wallet"
          disabled={!cart.length || pagando} onClick={pagar}/>
      </SectionCard>
    </div>
  );

  // ── Vista general: filtro de comercios ANTES de productos ──
  return (
    <div className="px-5 space-y-4 pb-28">
      {comercios.length === 0 ? (
        <SectionCard><EmptyState icon="storefront" title="Sin comercios" subtitle="Cuando el mundo cargue comercios, aparecerán aquí con su catálogo."/></SectionCard>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setFiltro("todos")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${filtro === "todos" ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>Todos</button>
            {comercios.map(c => (
              <button key={c.id} onClick={() => setFiltro(c.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${filtro === c.id ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>
                <span className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
                  {c.fotoUrl ? <img src={c.fotoUrl} alt="" className="w-full h-full object-cover"/> : <span className="text-[8px] font-black">{c.nombre[0]}</span>}
                </span>
                {c.nombre}
              </button>
            ))}
          </div>

          {comercioActivo && (
            <SectionCard className="p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#3525cd] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {comercioActivo.fotoUrl ? <img src={comercioActivo.fotoUrl} alt="" className="w-full h-full object-cover"/> : <span className="text-white font-black text-xl">{comercioActivo.nombre[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[#1b1b24]">{comercioActivo.nombre}</p>
                <p className="text-[11px] text-[#777587]">{visibles.length} {visibles.length === 1 ? "producto" : "productos"} disponibles</p>
              </div>
            </SectionCard>
          )}

          {beneficiarios.length > 1 && (
            <div>
              <p className="text-[10px] font-bold text-[#777587] uppercase tracking-wider mb-2">Comprando para</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {beneficiarios.map(b => (
                  <button key={b.id} onClick={() => setBeneficiarioId(b.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${beneficiarioId === b.id ? "bg-[#3525cd] text-white" : "glass-card text-[#464555]"}`}>
                    <Icon name={b.tipo === "titular" ? "person" : "face"} size="text-sm" color={beneficiarioId === b.id ? "text-white" : "text-[#777587]"}/>
                    {b.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {avisoMixto && (
            <ConfigBanner icon="warning" color="amber"
              message={`Tu pedido actual es de ${nombreDe(cartMerchant)}. Termina o vacía ese pedido antes de agregar productos de otro comercio.`}/>
          )}

          {productos === null ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
              <p className="text-xs text-[#777587]">Cargando catálogos…</p>
            </div>
          ) : visibles.length === 0 ? (
            <SectionCard><EmptyState icon="inventory_2" title="Sin productos" subtitle={filtro === "todos" ? "Los comercios aún no cargan su catálogo." : `${nombreDe(filtro)} aún no carga su catálogo.`}/></SectionCard>
          ) : (
            <div className="space-y-3">
              {visibles.map(p => {
                const enCart = cart.find(it => it.product.id === p.id);
                const bloqueado = bloqueadoPorRestriccion(p);
                return (
                  <SectionCard key={p.id} className={`p-4 flex items-center gap-3 ${bloqueado ? "opacity-60" : ""}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f0ecf9] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover"/> : <Icon name="sell" fill size="text-xl" color="text-[#3525cd]"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1b1b24] text-sm">{p.name}</p>
                      <p className="text-[10px] text-[#777587]">{nombreDe(p.merchant_id)}{p.category ? ` · ${p.category}` : ""}</p>
                      {bloqueado && <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1"><Icon name="block" size="text-xs" color="text-red-600"/>Restringido para {beneficiario.nombre}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-[#3525cd] text-sm">S/ {Number(p.price).toFixed(2)}</p>
                      {!bloqueado && (
                        <button onClick={() => agregar(p)}
                          className="mt-1 text-[10px] bg-[#3525cd] text-white px-2.5 py-1 rounded-xl font-bold tap-active">
                          {enCart ? `Agregar (${enCart.qty})` : "Agregar"}
                        </button>
                      )}
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}

          {cart.length > 0 && (
            <div className="fixed bottom-24 left-0 right-0 px-5 z-40">
              <div className="max-w-[430px] mx-auto">
                <button onClick={() => { setResultado(null); setEnCheckout(true); }}
                  className="w-full py-3.5 rounded-2xl bg-[#3525cd] text-white font-black flex items-center justify-between px-5 tap-active" style={{boxShadow:"0 8px 24px rgba(53,37,205,0.35)"}}>
                  <span className="flex items-center gap-2"><Icon name="shopping_cart" size="text-base" color="text-white"/>{unidades} {unidades === 1 ? "item" : "items"} · {nombreDe(cartMerchant)}</span>
                  <span>S/ {total.toFixed(2)} →</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TEMPLATE_MAP = {
  wallet:          (cfg, u) => <WalletTemplate cfg={cfg} u={u}/>,
  loyalty:         (cfg, u) => <LoyaltyTemplate cfg={cfg} u={u}/>,
  reservas:        (cfg, u) => <ReservasTemplate cfg={cfg} u={u}/>,
  asistencia:      (cfg, u) => <AsistenciaTemplate cfg={cfg} u={u}/>,
  control:         (cfg, u) => <RestriccionesTemplate cfg={cfg} u={u}/>,
  accesos:         (cfg, u) => <AccesosTemplate cfg={cfg} u={u}/>,
  cashback:        (cfg, u) => <CashbackTemplate cfg={cfg} u={u}/>,
  menu:            (cfg, u) => <MenuTemplate cfg={cfg} u={u}/>,
  comercios:       (cfg, u) => <MarketplaceTemplate cfg={cfg} u={u}/>,
  eventos:         (cfg, u) => <EventosTemplate cfg={cfg} u={u}/>,
  subsidio:        (cfg, u) => <SubsidioTemplate cfg={cfg} u={u}/>,
  credito:         (cfg, u) => <CreditoTemplate cfg={cfg} u={u}/>,
  perfil_ext:      (cfg, u) => <PerfilExtTemplate cfg={cfg} u={u}/>,
  estacionamiento: (cfg, u) => <EstacionamientoTemplate cfg={cfg} u={u}/>,
  promociones:     (cfg, u) => <PromocionesTemplate cfg={cfg} u={u}/>,
  turnos:          (cfg, u) => <TurnosTemplate cfg={cfg} u={u}/>,
  transporte:      (cfg, u) => <TransporteTemplate cfg={cfg} u={u}/>,
  bnpl:            (cfg, u) => <BNPLTemplate cfg={cfg} u={u}/>,
  consumos:        (cfg, u) => <ConsumosTemplate cfg={cfg} u={u}/>,
};

const MODULE_META = {
  wallet:      { title:"Billetera",        icon:"account_balance_wallet", bg:"bg-[#dae2fd]", color:"text-[#3525cd]" },
  consumos:    { title:"Mis Compras",      icon:"receipt_long",           bg:"bg-[#f0ecf9]", color:"text-[#464555]" },
  comercios:   { title:"Comercios",        icon:"storefront",             bg:"bg-[#dae2fd]", color:"text-[#565e74]" },
  loyalty:     { title:"Lealtad",          icon:"stars",                  bg:"bg-[#fff8e1]", color:"text-amber-600" },
  reservas:    { title:"Reservas",         icon:"event_available",        bg:"bg-[#e8f5e9]", color:"text-green-700" },
  asistencia:  { title:"Asistencia",       icon:"how_to_reg",             bg:"bg-[#e0f2f1]", color:"text-teal-700"  },
  control:     { title:"Mi Familia",       icon:"family_restroom",        bg:"bg-[#f1f8e9]", color:"text-green-700" },
  accesos:     { title:"Accesos",          icon:"vpn_key",                bg:"bg-[#e8eaf6]", color:"text-indigo-700"},
  cashback:    { title:"Cashback",         icon:"payments",               bg:"bg-[#ffdbcc]", color:"text-[#7e3000]" },
  menu:        { title:"Menú",             icon:"restaurant_menu",        bg:"bg-[#fff3e0]", color:"text-orange-700"},
  eventos:     { title:"Eventos",          icon:"confirmation_number",    bg:"bg-[#fce4ec]", color:"text-pink-700"  },
  subsidio:    { title:"Subsidio",         icon:"savings",                bg:"bg-[#f3e5f5]", color:"text-purple-700"},
  credito:     { title:"Crédito",          icon:"credit_card",            bg:"bg-[#e8f5e9]", color:"text-green-700" },
  estacionamiento:{title:"Parking",        icon:"local_parking",          bg:"bg-[#e3f2fd]", color:"text-blue-700"  },
  perfil_ext:  { title:"Perfil Pro",       icon:"badge",                  bg:"bg-[#f5f5f5]", color:"text-gray-700"  },
  promociones: { title:"Promociones",      icon:"local_offer",            bg:"bg-[#fff8e1]", color:"text-amber-700" },
  turnos:      { title:"Mis Turnos",       icon:"pending_actions",        bg:"bg-[#e0f7fa]", color:"text-cyan-700"  },
  transporte:  { title:"Transporte",       icon:"directions_bus",         bg:"bg-[#e1f5fe]", color:"text-blue-700"  },
  bnpl:        { title:"Paga después",     icon:"schedule_send",          bg:"bg-[#ede7f6]", color:"text-purple-700"},
};

export default function ModulePage() {
  const { moduleId } = useParams();
  const nav = useNavigate();
  const u = useUser();
  const cfg = useModuleConfig(moduleId);
  const CATALOG = useCatalogLive();
  // Metadata: curación local → Catálogo Global (Supabase) → genérico.
  // Una capacidad nueva del catálogo abre con GenericTemplate y su nombre real.
  const catMeta = CATALOG[moduleId];
  const meta = MODULE_META[moduleId]
    || (catMeta && { title: catMeta.label, icon: catMeta.icon, bg: catMeta.bg || "bg-[#f0ecf9]", color: catMeta.color || "text-[#3525cd]" })
    || { title: moduleId, icon:"settings", bg:"bg-gray-100", color:"text-gray-500" };

  // Not enabled in this world
  if (!cfg) {
    return (
      <div className="min-h-screen aura-bg flex flex-col">
        <div className="px-5 pt-10 pb-4">
          <button onClick={()=>nav(-1)} className="w-10 h-10 glass-card rounded-full flex items-center justify-center tap-active">
            <Icon name="arrow_back" size="text-xl" color="text-[#1b1b24]"/>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-8">
          <EmptyState icon="block" title="Módulo no disponible"
            subtitle="Este módulo no está habilitado en tu comunidad activa o requiere configuración adicional."
            action="Volver al hub" onAction={()=>nav("/hub")}/>
        </div>
        <BottomNav/>
      </div>
    );
  }

  // Resolución del template en 2 pasos (Render Engine):
  //  1. Template dedicado por capacidad (TEMPLATE_MAP).
  //  2. Si es una capacidad nueva del catálogo sin template propio, se intenta
  //     reutilizar un template dedicado según el ux_component de sus flags
  //     (mismo principio que el registry de secciones del evento). Si tampoco,
  //     GenericTemplate arma la vista desde la config viva.
  const templateFn = TEMPLATE_MAP[moduleId] || resolvePorUxComponent(cfg);
  const content = templateFn ? templateFn(cfg, u) : <GenericTemplate cfg={cfg} moduleId={moduleId}/>;

  return (
    <div className="min-h-screen aura-bg pb-32">
      <div className="max-w-[430px] mx-auto">
        <ModuleHeader
          title={meta.title}
          icon={meta.icon}
          iconBg={meta.bg}
          iconColor={meta.color}
          onBack={()=>nav(-1)}
          action={
            <div className="flex items-center gap-1.5 px-3 py-1.5 glass-card rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
              <p className="text-[10px] font-bold text-[#464555] uppercase tracking-wider">{cfg.mundo.nombre}</p>
            </div>
          }>
          <p className="text-xs text-[#777587]">Activo en {cfg.mundo.nombre}</p>
        </ModuleHeader>

        {content}
      </div>
      <BottomNav/>
    </div>
  );
}
