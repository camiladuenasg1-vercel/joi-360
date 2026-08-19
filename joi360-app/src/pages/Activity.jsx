import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, useWalletLive } from "../hooks.js";
import { useUser } from "../userStore.js";
import { getSyntheticUserId, fetchMisEntradasLive } from "../supabaseClient.js";
import BottomNav from "../components/BottomNav.jsx";

const TYPES = ["Todos","Pagos","Recargas","Asistencia","Otros"];

export default function ActivityPage() {
  const nav = useNavigate();
  const st = useStore();
  const u = useUser();
  const [tab, setTab] = useState("Todos");
  const [filterMundo, setFilterMundo] = useState(null);

  const activeMundo = (st.mundos||[]).find(m=>m.id===u?.activeMundoId);
  const memberships = (u?.memberships||[]).map(id=>(st.mundos||[]).find(m=>m.id===id)).filter(Boolean);
  const { historial } = useWalletLive(activeMundo?.id);

  // Entradas de eventos compradas — antes ausentes del feed de Actividad
  // (solo mostraba movimientos de wallet). El cobro ya aparece como
  // transacción "compra" real; esto es la entrada en sí (monto:0, sin
  // duplicar el gasto).
  const [misEntradas, setMisEntradas] = useState([]);
  useEffect(() => {
    if (!activeMundo?.id) { setMisEntradas([]); return; }
    let vivo = true;
    fetchMisEntradasLive(getSyntheticUserId(), activeMundo.id)
      .then(rows => { if (vivo) setMisEntradas((rows || []).map(t => ({
        id: `entrada-${t.id}`, tipo: "ASISTENCIA",
        titulo: t.events?.titulo ? `Entrada · ${t.events.titulo}` : "Entrada de evento",
        monto: 0, mundoId: t.world_id, fecha: t.created_at,
      }))); })
      .catch(() => { if (vivo) setMisEntradas([]); });
    return () => { vivo = false; };
  }, [activeMundo?.id]);

  const allTxs = [...historial, ...misEntradas].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));

  const filtered = allTxs.filter(t => {
    const mundoOK = !filterMundo || t.mundoId === filterMundo;
    const tabOK = tab==="Todos" || (tab==="Pagos"&&t.monto<0&&t.tipo==="PAGO") || (tab==="Recargas"&&t.tipo==="RECARGA") || (tab==="Asistencia"&&t.tipo==="ASISTENCIA") || (tab==="Otros"&&!["PAGO","RECARGA","ASISTENCIA"].includes(t.tipo));
    return mundoOK && tabOK;
  });

  const grouped = filtered.reduce((acc,t) => {
    const d = new Date(t.fecha);
    const today = new Date(); const yest = new Date(today); yest.setDate(yest.getDate()-1);
    const label = d.toDateString()===today.toDateString() ? "Hoy" : d.toDateString()===yest.toDateString() ? "Ayer" : d.toLocaleDateString("es-PE",{day:"numeric",month:"long"});
    if(!acc[label]) acc[label]=[];
    acc[label].push(t);
    return acc;
  }, {});

  const gastos = filtered.filter(t=>t.monto<0).reduce((a,t)=>a+Math.abs(t.monto),0);
  const entradas = filtered.filter(t=>t.monto>0).reduce((a,t)=>a+t.monto,0);

  const TX_ICON = { PAGO:"shopping_bag", RECARGA:"add_card", ASISTENCIA:"how_to_reg", BENEFICIO:"stars" };
  const TX_COLOR = { PAGO:"bg-[#FBE7E9] text-[#E8394B]", RECARGA:"bg-green-50 text-green-600", ASISTENCIA:"bg-[#E6F7F1] text-[#0BA878]", BENEFICIO:"bg-amber-50 text-amber-600" };

  return (
    <div className="min-h-screen aura-bg pb-32">
      <div className="max-w-[430px] mx-auto">
        {/* Header */}
        <div className="px-5 pt-12 pb-4">
          <h1 className="text-3xl font-black text-[#1C1C1E]">Actividad</h1>
          <p className="text-[#404255] text-sm mt-1">Todo lo que recargas, pagas y usas</p>
          {/* Summary chips */}
          <div className="flex gap-3 mt-4">
            <div className="glass-card rounded-2xl px-4 py-3 flex-1">
              <p className="text-[#404255] text-[10px] font-semibold uppercase">Gastado</p>
              <p className="text-red-500 font-black text-lg">- S/ {gastos.toFixed(2)}</p>
            </div>
            <div className="glass-card rounded-2xl px-4 py-3 flex-1">
              <p className="text-[#404255] text-[10px] font-semibold uppercase">Ingresado</p>
              <p className="text-green-600 font-black text-lg">+ S/ {entradas.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Filtro por mundo */}
        {memberships.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 mb-3">
            <button onClick={()=>setFilterMundo(null)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${!filterMundo?"border-[#1A3270] bg-[#1A3270]/5 text-[#1A3270]":"border-[#CDD1E4] text-[#404255]"}`}>Todos</button>
            {memberships.map(m=>(
              <button key={m.id} onClick={()=>setFilterMundo(m.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${filterMundo===m.id?"border-[#1A3270] bg-[#1A3270]/5 text-[#1A3270]":"border-[#CDD1E4] text-[#404255]"}`}>{m.nombre}</button>
            ))}
          </div>
        )}

        {/* Type tabs */}
        <div className="px-5 mb-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TYPES.map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${tab===t?"bg-[#1A3270] text-white aura-primary-sm":"glass-card text-[#404255]"}`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Groups */}
        <div className="px-5 space-y-6">
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-12 glass-card rounded-3xl">
              <span className="material-symbols-outlined text-4xl text-[#CDD1E4] block mb-2">receipt_long</span>
              <p className="text-[#404255] text-sm font-semibold">Sin movimientos</p>
            </div>
          )}
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <p className="text-[11px] font-bold text-[#404255] uppercase tracking-widest mb-3">{date}</p>
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#CDD1E4]/50">
                {txs.map(t => {
                  const m = (st.mundos||[]).find(x=>x.id===t.mundoId);
                  const ic = TX_ICON[t.tipo] || "receipt";
                  const cl = TX_COLOR[t.tipo] || "bg-[#EEF2FD] text-[#1A3270]";
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cl}`}>
                        <span className="material-symbols-outlined fill text-base">{ic}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#1C1C1E] text-sm font-semibold">{t.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m && <span className="text-[9px] font-bold bg-[#DCE4FA] text-[#1A3270] px-1.5 py-0.5 rounded">{m.nombre}</span>}
                          <span className="text-[#404255] text-[11px]">{new Date(t.fecha).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</span>
                        </div>
                      </div>
                      {t.monto !== 0 && (
                        <p className={`font-black text-sm ${t.monto>0?"text-green-600":"text-[#1C1C1E]"}`}>
                          {t.monto>0?"+":""}S/ {Math.abs(t.monto).toFixed(2)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
