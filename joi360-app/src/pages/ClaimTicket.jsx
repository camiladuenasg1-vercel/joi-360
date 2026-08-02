import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSyntheticUserId, fetchEntradaPorToken, reclamarEntradaPorToken, errorControlado, logErrorControlado } from "../supabaseClient.js";
import { Icon } from "../components/ModuleAtoms.jsx";
import { showToast } from "../components/Toast.jsx";

// Reclamar una entrada compartida por enlace (Gantt #65) — contraparte de
// crearEnlaceTransferenciaEntrada. Quien abre el link (ya autenticado, Guard
// lo exige) ve el evento y acepta la entrada en su propia cuenta sin
// necesitar el código JOI de nadie.
export default function ClaimTicketPage() {
  const { token } = useParams();
  const nav = useNavigate();
  const userId = getSyntheticUserId();
  const [ticket, setTicket] = useState(null); // null=cargando, undefined=no encontrado
  const [aceptando, setAceptando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    fetchEntradaPorToken(token).then(t => { if (vivo) setTicket(t || undefined); }).catch(() => { if (vivo) setTicket(undefined); });
    return () => { vivo = false; };
  }, [token]);

  const aceptar = async () => {
    setAceptando(true); setError("");
    try {
      const r = await reclamarEntradaPorToken(token, userId);
      if (r.ok) {
        showToast("Entrada agregada a tu cuenta");
        nav("/hub");
      } else {
        const code = r.motivo === "mismo_usuario" ? "mismo_usuario"
          : r.motivo === "no_transferible" ? "entrada_no_transferible"
          : "transferencia_no_valida";
        const err = await errorControlado(code);
        logErrorControlado(code, `reclamar-entrada:${token}`, null);
        setError([err.mensaje, err.accion].filter(Boolean).join(" "));
      }
    } catch (e) {
      const err = await errorControlado("transferencia_no_valida");
      logErrorControlado("transferencia_no_valida", `reclamar-entrada:${token}`, null);
      setError([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setAceptando(false); }
  };

  return (
    <div className="min-h-screen aura-bg pb-32 flex flex-col items-center justify-center px-5">
      <div className="max-w-[430px] w-full">
        {ticket === null && (
          <div className="flex flex-col items-center gap-2 py-10">
            <span className="w-6 h-6 border-2 border-[#e4e1ee] border-t-[#3525cd] rounded-full animate-spin"/>
            <p className="text-xs text-[#777587]">Buscando la entrada…</p>
          </div>
        )}
        {ticket === undefined && (
          <div className="glass-card rounded-2xl p-6 text-center">
            <Icon name="link_off" size="text-4xl" color="text-[#777587]"/>
            <p className="font-black text-[#1b1b24] mt-2">Este enlace ya no es válido</p>
            <p className="text-xs text-[#777587] mt-1">Puede que ya haya sido usado, o que la entrada ya no esté disponible para transferir.</p>
            <button onClick={() => nav("/hub")} className="mt-4 w-full py-3 rounded-xl bg-[#3525cd] text-white font-black tap-active">Ir al inicio</button>
          </div>
        )}
        {ticket && (
          <div className="glass-card rounded-2xl p-6">
            <p className="text-[#777587] text-xs font-semibold uppercase mb-1">Te compartieron una entrada</p>
            <h1 className="text-xl font-black text-[#1b1b24]">{ticket.events?.titulo || "Evento"}</h1>
            <p className="text-sm text-[#777587] mt-1">{ticket.event_ticket_types?.nombre || "General"} · {ticket.events?.fecha} {ticket.events?.hora || ""}</p>
            {ticket.events?.lugar && <p className="text-xs text-[#777587] mt-0.5">{ticket.events.lugar}</p>}
            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            <button onClick={aceptar} disabled={aceptando}
              className="mt-5 w-full py-3.5 rounded-xl bg-[#3525cd] text-white font-black tap-active disabled:opacity-50 flex items-center justify-center gap-2">
              <Icon name="check_circle" size="text-lg"/> {aceptando ? "Aceptando…" : "Aceptar entrada"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
