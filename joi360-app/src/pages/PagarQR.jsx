import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSyntheticUserId, fetchChargeRequestRemote, pagarChargeRequestRemote, errorControlado, logErrorControlado, mensajeDeError } from "../supabaseClient.js";
import { Icon } from "../components/ModuleAtoms.jsx";
import { showToast } from "../components/Toast.jsx";

// Contraparte de "Cobrar con QR" (joi360-admin): el operador tipea el monto
// y muestra un QR que codifica esta URL. Quien lo escanea con la cámara de
// su celular llega acá ya logueado (Guard lo exige) y confirma el pago
// desde su propia sesión — el comercio nunca ve ni maneja su código JOI.
export default function PagarQRPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const userId = getSyntheticUserId();
  const [cr, setCr] = useState(null); // null=cargando, undefined=no encontrado
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState("");
  const [pagado, setPagado] = useState(null); // resultado ok

  useEffect(() => {
    let vivo = true;
    fetchChargeRequestRemote(id).then(r => { if (vivo) setCr(r || undefined); }).catch(() => { if (vivo) setCr(undefined); });
    return () => { vivo = false; };
  }, [id]);

  const confirmar = async () => {
    setPagando(true); setError("");
    try {
      const r = await pagarChargeRequestRemote(id, userId);
      if (r.ok) {
        setPagado(r);
        showToast({ titulo: "Pago confirmado", mensaje: `S/ ${r.monto.toFixed(2)} a ${r.merchantNombre || "el comercio"}.` }, "success");
      } else {
        const code = r.motivo === "saldo" ? "saldo_insuficiente" : "operacion_no_completada";
        const err = await errorControlado(code);
        logErrorControlado(code, `pagar-qr:${id}`, cr?.world_id || null);
        setError(r.motivo === "ya_pagado" ? "Este cobro ya fue pagado." : r.motivo === "cancelado" ? "El comercio canceló este cobro." : [err.mensaje, err.accion].filter(Boolean).join(" "));
      }
    } catch (e) {
      const err = await mensajeDeError(e, "operacion_no_completada");
      logErrorControlado("operacion_no_completada", `pagar-qr:${id}`, cr?.world_id || null);
      setError([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setPagando(false); }
  };

  return (
    <div className="min-h-screen aura-bg pb-32 flex flex-col items-center justify-center px-5">
      <div className="max-w-[430px] w-full">
        {cr === null && (
          <div className="flex flex-col items-center gap-2 py-10">
            <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
            <p className="text-xs text-[#777587]">Buscando el cobro…</p>
          </div>
        )}
        {cr === undefined && (
          <div className="glass-card rounded-2xl p-6 text-center">
            <Icon name="link_off" size="text-4xl" color="text-[#777587]"/>
            <p className="font-black text-[#1b1b24] mt-2">Este código ya no es válido</p>
            <p className="text-xs text-[#777587] mt-1">Pídele al comercio que genere uno nuevo.</p>
            <button onClick={() => nav("/hub")} className="mt-4 w-full py-3 rounded-xl bg-[#3525cd] text-white font-black tap-active">Ir al inicio</button>
          </div>
        )}
        {pagado && (
          <div className="glass-card rounded-2xl p-6 text-center">
            <Icon name="check_circle" fill size="text-5xl" color="text-green-600"/>
            <p className="font-black text-[#1b1b24] text-lg mt-2">Pago confirmado</p>
            <p className="text-sm text-[#777587] mt-1">S/ {pagado.monto.toFixed(2)} a {pagado.merchantNombre || "el comercio"}</p>
            <button onClick={() => nav("/hub")} className="mt-5 w-full py-3.5 rounded-xl bg-[#3525cd] text-white font-black tap-active">Ir al inicio</button>
          </div>
        )}
        {cr && !pagado && (
          cr.estado !== "pendiente" ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Icon name={cr.estado === "pagado" ? "check_circle" : "cancel"} size="text-4xl" color="text-[#777587]"/>
              <p className="font-black text-[#1b1b24] mt-2">{cr.estado === "pagado" ? "Este cobro ya fue pagado" : "El comercio canceló este cobro"}</p>
              <button onClick={() => nav("/hub")} className="mt-4 w-full py-3 rounded-xl bg-[#3525cd] text-white font-black tap-active">Ir al inicio</button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6">
              <p className="text-[#777587] text-xs font-semibold uppercase mb-1">Te está cobrando</p>
              <h1 className="text-xl font-black text-[#1b1b24]">{cr.merchant_nombre || "Comercio"}</h1>
              <p className="text-4xl font-black text-[#3525cd] mt-4">S/ {Number(cr.monto).toFixed(2)}</p>
              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
              <button onClick={confirmar} disabled={pagando}
                className="mt-5 w-full py-3.5 rounded-xl bg-[#3525cd] text-white font-black tap-active disabled:opacity-50 flex items-center justify-center gap-2">
                <Icon name="check_circle" size="text-lg"/> {pagando ? "Confirmando…" : "Confirmar y pagar"}
              </button>
              <button onClick={() => nav("/hub")} disabled={pagando} className="w-full mt-2 py-2 text-xs font-bold text-[#777587] tap-active">Cancelar</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
