import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore, useWalletLive, useModuleConfig } from "../hooks.js";
import { useUser } from "../userStore.js";
import { getSyntheticUserId, solicitarBanditaNfc, fetchMiSolicitudNfc, fetchRecargasHoyCount, errorControlado, logErrorControlado, mensajeDeError } from "../supabaseClient.js";
import BottomNav from "../components/BottomNav.jsx";
import { showToast } from "../components/Toast.jsx";


const QR_CELLS = Array.from({length:81},(_,i)=>{
  const f=(i*7+3)%3!==0;
  return f?"bg-[#1b1b24] rounded-[1px]":"";
});

export default function PayPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const st = useStore(); const u = useUser();
  const [tab, setTab] = useState(params.get("tab") || "qr");
  // useState solo lee ?tab= una vez, al montar. Si PayPage ya estaba montado
  // (ej. venías de Recargar) y desde el Home tocás "Bandita NFC", el router
  // solo cambia el query param -- no remonta el componente -- así que el tab
  // se quedaba pegado en el anterior (hallado en vivo: "bandita me lleva a
  // recarga"). Se re-sincroniza cada vez que cambia el query param.
  useEffect(() => {
    const t = params.get("tab");
    if (t) setTab(t);
  }, [params]);
  const [monto, setMonto] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [canalSel, setCanalSel] = useState(null);

  const activeMundo = (st.mundos||[]).find(m=>m.id===u?.activeMundoId);
  const { saldo, canales: canalesMundo, recargar: recargarLive, pagar: pagarLive } = useWalletLive(activeMundo?.id);
  const walletCfg = useModuleConfig("wallet");
  const maxPorRecarga = walletCfg?.config?.maxPorRecarga;
  const maxRecargasDiarias = walletCfg?.config?.maxRecargasDiarias;

  // Solicitud real de pulsera NFC (antes: botones decorativos sin backend)
  const myCode = getSyntheticUserId();
  const [nfcReq, setNfcReq] = useState(null); // null=cargando, undefined=sin solicitud, {status}
  const [solicitando, setSolicitando] = useState(false);
  useEffect(() => {
    if (!activeMundo?.id) return;
    fetchMiSolicitudNfc(activeMundo.id, myCode).then(r => setNfcReq(r || undefined)).catch(() => setNfcReq(undefined));
  }, [activeMundo?.id]);
  const solicitarPulsera = async () => {
    setSolicitando(true);
    try { await solicitarBanditaNfc(activeMundo.id, myCode, u?.auth?.nombre || null); setNfcReq({ status: "pendiente" }); }
    finally { setSolicitando(false); }
  };

  const [pagando, setPagando] = useState(false);
  const handlePay = async () => {
    const m = +monto;
    if (!m || pagando) return;
    setPagando(true);
    try {
      const ok = await pagarLive(m, "Comercio QR");
      if (ok) { showToast(`Pago S/ ${m.toFixed(2)} aprobado`); setMonto(""); setQrGenerated(false); }
      else {
        const err = await errorControlado("saldo_insuficiente");
        logErrorControlado("saldo_insuficiente", "pay-qr", activeMundo?.id);
        showToast({ titulo: err.titulo, mensaje: err.mensaje, accion: err.accion }, err.severidad);
      }
    } catch (e) {
      // Antes esto no tenía catch: si la sesión estaba vencida, pagarLive
      // lanzaba y el error quedaba sin capturar — sin toast, sin pista de
      // qué pasó, el botón solo dejaba de girar.
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "pay-qr", activeMundo?.id);
      showToast({ titulo: err.titulo, mensaje: err.mensaje, accion: err.accion }, err.severidad);
    } finally { setPagando(false); }
  };

  // Recarga en 2 pasos: validar → checkout según checkout_type del canal
  // ("form" abre el checkout embebido del PSP; "qr" muestra el QR de la red).
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [validandoRech, setValidandoRech] = useState(false);
  const handleRech = async () => {
    const m = +monto;
    if (!m || !canalSel) return;
    if (m < canalSel.montoMin || (canalSel.montoMax > 0 && m > canalSel.montoMax)) {
      showToast(`${canalSel.nombre} acepta entre S/ ${canalSel.montoMin} y S/ ${canalSel.montoMax}`, "warning");
      return;
    }
    if (maxPorRecarga && m > maxPorRecarga) {
      showToast(`Este mundo permite un máximo de S/ ${maxPorRecarga} por recarga`, "warning");
      return;
    }
    if (maxRecargasDiarias) {
      setValidandoRech(true);
      try {
        const yaHoy = await fetchRecargasHoyCount(getSyntheticUserId(), activeMundo.id);
        if (yaHoy >= maxRecargasDiarias) {
          showToast(`Ya alcanzaste el máximo de ${maxRecargasDiarias} recargas hoy en este mundo`, "warning");
          return;
        }
      } finally { setValidandoRech(false); }
    }
    setCheckoutOpen(true);
  };

  const confirmarRecarga = async () => {
    const m = +monto;
    setProcesando(true);
    try {
      await recargarLive(m, canalSel.id, canalSel.nombre);
      showToast(`S/ ${m.toFixed(2)} acreditado vía ${canalSel.nombre}`);
      setMonto(""); setCanalSel(null); setCheckoutOpen(false);
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", "recarga-checkout", activeMundo?.id);
      showToast({ titulo: err.titulo, mensaje: err.mensaje, accion: err.accion }, err.severidad);
    } finally { setProcesando(false); }
  };

  return (
    <div className="min-h-screen aura-bg pb-32">
      <div className="max-w-[430px] mx-auto">
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => nav(-1)} className="w-9 h-9 glass-card rounded-full flex items-center justify-center tap-active">
              <span className="material-symbols-outlined text-[#1b1b24]">arrow_back</span>
            </button>
            <h1 className="text-xl font-black text-[#1b1b24]">Centro de Pagos</h1>
          </div>
          {/* Balance chip */}
          <div className="glass-card rounded-2xl px-5 py-4 flex justify-between items-center">
            <div>
              <p className="text-[#777587] text-xs font-semibold uppercase">Saldo en {activeMundo?.nombre}</p>
              <p className="text-[#1b1b24] font-black text-2xl">S/ {saldo.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-[#3525cd]/10 flex items-center justify-center">
              <span className="material-symbols-outlined fill text-[#3525cd]">account_balance_wallet</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mb-5">
          <div className="flex gap-1 glass-card rounded-2xl p-1">
            {[{k:"qr",l:"Pagar QR"},{k:"recargar",l:"Recargar"},...(walletCfg?.has("bandita") && walletCfg?.config?.usaPulseraNfc !== false ? [{k:"nfc",l:"Bandita NFC"}] : [])].map(t=>(
              <button key={t.k} onClick={() => { setTab(t.k); setMonto(""); setQrGenerated(false); setCanalSel(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===t.k?"bg-[#3525cd] text-white aura-primary-sm":"text-[#464555]"}`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5">
          {/* QR TAB */}
          {tab==="qr" && (
            <div className="space-y-4">
              <div className="glass-card rounded-3xl p-6">
                <p className="text-[#777587] text-xs font-semibold uppercase text-center mb-4">Monto a pagar</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[#777587] text-2xl">S/</span>
                  <input className="flex-1 text-5xl font-black text-[#1b1b24] text-center bg-[#f0ecf9] rounded-2xl py-4 outline-none"
                    type="number" placeholder="0.00" value={monto} onChange={e=>{setMonto(e.target.value);setQrGenerated(false);}} autoFocus />
                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {[5,10,20,50,100].map(v=><button key={v} onClick={()=>setMonto(v)} className="py-2 glass-card rounded-xl text-sm font-bold text-[#464555] tap-active">S/ {v}</button>)}
                </div>
                {!qrGenerated ? (
                  <button onClick={()=>setQrGenerated(true)} disabled={!monto||+monto<=0}
                    className="w-full py-4 rounded-2xl bg-[#3525cd] text-white font-black aura-primary disabled:opacity-30 tap-active">
                    Generar código QR
                  </button>
                ) : (
                  <div className="text-center">
                    {/* QR simulado */}
                    <div className="w-44 h-44 mx-auto rounded-2xl bg-white border-2 border-[#e4e1ee] mb-3 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-2 grid grid-cols-9 gap-0.5">
                        {QR_CELLS.map((c,i)=><div key={i} className={c}/>)}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                          <span className="material-symbols-outlined fill text-[#3525cd] text-xl">qr_code</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[#1b1b24] text-3xl font-black">S/ {parseFloat(monto||0).toFixed(2)}</p>
                    <p className="text-[#777587] text-xs mt-1">QR válido · El comercio escanea</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handlePay} disabled={pagando} className="flex-1 py-3 rounded-2xl bg-[#3525cd] text-white font-bold text-sm tap-active aura-primary disabled:opacity-50">{pagando ? "Procesando…" : "Simular pago"}</button>
                      <button onClick={()=>{setQrGenerated(false);setMonto("");}} disabled={pagando} className="flex-1 py-3 rounded-2xl glass-card text-[#464555] font-bold text-sm tap-active disabled:opacity-50">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Selector de billetera activa */}
              <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined fill text-[#3525cd]">account_balance_wallet</span>
                <div className="flex-1">
                  <p className="text-[#1b1b24] text-sm font-bold">{activeMundo?.nombre || "Sin mundo activo"}</p>
                  <p className="text-[#777587] text-xs">Billetera activa · S/ {saldo.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* RECARGAR TAB */}
          {tab==="recargar" && (
            <div className="space-y-3">
              {canalesMundo.length === 0 && (
                <div className="glass-card rounded-2xl p-4 text-center text-[#777587] text-sm">
                  Este mundo no tiene canales de recarga habilitados.
                </div>
              )}
              {canalesMundo.map(ch => {
                const ICONS = { qr_billetera:"📱", card:"💳", transfer:"🏦", culqi:"💳", qubit:"💳" };
                const selected = canalSel?.id === ch.id;
                return (
                  <div key={ch.id} onClick={() => { setCanalSel(ch); setCheckoutOpen(false); }}
                    className={`glass-card rounded-2xl p-4 flex items-center gap-4 tap-active cursor-pointer transition-all ${selected?"ring-2 ring-[#3525cd]":""}`}>
                    <span className="text-3xl">{ICONS[ch.id] || "💰"}</span>
                    <div className="flex-1">
                      <p className="text-[#1b1b24] font-bold text-sm">{ch.nombre}</p>
                      <p className="text-[#777587] text-xs">{ch.tiempoAcreditacion} · S/ {ch.montoMin}–{ch.montoMax > 0 ? `S/ ${ch.montoMax}` : "sin límite"}</p>
                      {ch.psp && <p className="text-[9px] text-[#c7c4d8] uppercase tracking-wider mt-0.5">PSP: {ch.psp} · {ch.checkout === "form" ? "checkout embebido" : ch.checkout === "qr" ? "QR de la red" : "manual"}</p>}
                    </div>
                    <span className={`material-symbols-outlined ${selected?"text-[#3525cd]":"text-[#c7c4d8]"}`}>{selected?"check_circle":"chevron_right"}</span>
                  </div>
                );
              })}
              <div className="glass-card rounded-2xl p-4">
                <p className="text-[#777587] text-xs font-semibold uppercase mb-3">
                  {canalSel ? `Monto a recargar vía ${canalSel.nombre}` : "Elige un canal arriba"}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#777587] text-xl">S/</span>
                  <input className="flex-1 text-2xl font-black text-[#1b1b24] text-center bg-[#f0ecf9] rounded-xl py-3 outline-none disabled:opacity-40"
                    type="number" placeholder="0.00" value={monto} onChange={e=>setMonto(e.target.value)} disabled={!canalSel} />
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[20,50,100,200].map(v=><button key={v} onClick={()=>setMonto(v)} disabled={!canalSel} className="py-2 glass-card rounded-xl text-sm font-bold text-[#464555] tap-active disabled:opacity-30">S/ {v}</button>)}
                </div>
                {!checkoutOpen && (
                  <button onClick={handleRech} disabled={!monto||+monto<=0||!canalSel||validandoRech}
                    className="w-full py-3 rounded-xl bg-[#3525cd] text-white font-black aura-primary disabled:opacity-30 tap-active">
                    {validandoRech ? "Validando…" : "Continuar"}
                  </button>
                )}
              </div>

              {/* Checkout renderizado según checkout_type del canal (catálogo admin) */}
              {checkoutOpen && canalSel && (
                <div className="glass-card rounded-2xl p-5">
                  {canalSel.checkout === "form" ? (
                    <>
                      {/* Checkout embebido del PSP (Culqi / Qubit) — simulado */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#1b1b24] font-black text-sm">Pago con tarjeta</p>
                      </div>
                      <div className="space-y-2 mb-4">
                        <input className="w-full bg-[#f0ecf9] rounded-xl px-4 py-3 text-sm font-mono text-[#1b1b24] outline-none" defaultValue="4111 1111 1111 1111" />
                        <div className="grid grid-cols-2 gap-2">
                          <input className="bg-[#f0ecf9] rounded-xl px-4 py-3 text-sm font-mono text-[#1b1b24] outline-none" defaultValue="12/28" />
                          <input className="bg-[#f0ecf9] rounded-xl px-4 py-3 text-sm font-mono text-[#1b1b24] outline-none" defaultValue="123" />
                        </div>
                      </div>
                      <button onClick={confirmarRecarga} disabled={procesando}
                        className="w-full py-3 rounded-xl bg-[#3525cd] text-white font-black aura-primary tap-active disabled:opacity-50">
                        {procesando ? "Procesando con el PSP…" : `Pagar S/ ${(+monto).toFixed(2)}`}
                      </button>
                      <p className="text-center text-[9px] text-[#c7c4d8] mt-2 uppercase tracking-wider">Checkout embebido · contrato {canalSel.psp || "PSP"} (simulado para demo)</p>
                    </>
                  ) : canalSel.checkout === "qr" ? (
                    <>
                      <p className="text-[#1b1b24] font-black text-sm text-center mb-3">Escanea con {canalSel.nombre}</p>
                      <div className="w-40 h-40 mx-auto rounded-2xl bg-white border-2 border-[#e4e1ee] mb-3 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-2 grid grid-cols-9 gap-0.5">
                          {QR_CELLS.map((c,i)=><div key={i} className={c}/>)}
                        </div>
                      </div>
                      <p className="text-center text-[#1b1b24] font-black text-xl mb-3">S/ {(+monto).toFixed(2)}</p>
                      <button onClick={confirmarRecarga} disabled={procesando}
                        className="w-full py-3 rounded-xl bg-[#3525cd] text-white font-black aura-primary tap-active disabled:opacity-50">
                        {procesando ? "Acreditando…" : "Ya pagué — acreditar"}
                      </button>
                      <p className="text-center text-[9px] text-[#c7c4d8] mt-2 uppercase tracking-wider">QR generado por el backend RedPontis (simulado para demo)</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[#1b1b24] font-black text-sm mb-2">Transferencia bancaria</p>
                      <p className="text-xs text-[#777587] mb-3">Transfiere a la CCI del mundo y el equipo acreditará tu saldo en 1–2 horas hábiles.</p>
                      <button onClick={confirmarRecarga} disabled={procesando}
                        className="w-full py-3 rounded-xl bg-[#3525cd] text-white font-black aura-primary tap-active disabled:opacity-50">
                        {procesando ? "Registrando…" : "Registrar transferencia"}
                      </button>
                    </>
                  )}
                  <button onClick={()=>setCheckoutOpen(false)} className="w-full py-2 mt-2 text-[#777587] text-xs font-bold tap-active">Cancelar</button>
                </div>
              )}
            </div>
          )}

          {/* NFC TAB */}
          {tab==="nfc" && walletCfg?.has("bandita") && walletCfg?.config?.usaPulseraNfc !== false && (
            <div className="space-y-4">
              {nfcReq === undefined && (
                <div className="glass-card rounded-3xl p-6 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-[#ede7f6] flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined fill text-[#673ab7] text-5xl">contactless</span>
                  </div>
                  <h3 className="text-[#1b1b24] font-black text-xl mb-2">Aún no tienes pulsera</h3>
                  <p className="text-[#777587] text-xs mb-5">Solicítala y el comercio/administrador de {activeMundo?.nombre} te la entregará físicamente.</p>
                  <button onClick={solicitarPulsera} disabled={solicitando}
                    className="w-full py-3.5 bg-[#3525cd] text-white rounded-2xl font-bold text-sm tap-active disabled:opacity-50 aura-primary">
                    {solicitando ? "Enviando…" : "Solicitar pulsera NFC"}
                  </button>
                </div>
              )}
              {nfcReq?.status === "pendiente" && (
                <div className="glass-card rounded-3xl p-6 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined fill text-amber-600 text-5xl">pending</span>
                  </div>
                  <h3 className="text-[#1b1b24] font-black text-xl mb-2">Solicitud enviada</h3>
                  <p className="text-[#777587] text-xs">Tu pulsera está en preparación. Te avisaremos cuando esté lista para recoger.</p>
                </div>
              )}
              {nfcReq?.status === "rechazada" && (
                <div className="glass-card rounded-3xl p-6 text-center">
                  <p className="text-red-600 text-sm font-bold mb-3">Tu solicitud anterior fue rechazada.</p>
                  <button onClick={solicitarPulsera} disabled={solicitando}
                    className="w-full py-3.5 bg-[#3525cd] text-white rounded-2xl font-bold text-sm tap-active disabled:opacity-50">
                    Volver a solicitar
                  </button>
                </div>
              )}
              {nfcReq?.status === "entregada" && (
                <div className="glass-card rounded-3xl p-6 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-[#ede7f6] flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined fill text-[#673ab7] text-5xl">contactless</span>
                  </div>
                  <h3 className="text-[#1b1b24] font-black text-xl mb-2">Bandita NFC JOI 360</h3>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700 text-xs font-bold">Entregada · activa</span>
                  </div>
                  <p className="text-[#777587] text-xs mb-1 font-mono">{myCode.slice(0,16)}</p>
                  <p className="text-[#777587] text-xs mb-5">Saldo: S/ {saldo.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
