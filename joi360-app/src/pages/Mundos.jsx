import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, useWalletBalances } from "../hooks.js";
import { useUser, setActiveMundo } from "../userStore.js";

export default function MundosPage() {
  const nav = useNavigate();
  const st = useStore();
  const u = useUser();
  const [activeIdx, setActiveIdx] = useState(0);

  const memberships = (u?.memberships || []).map(id => (st.mundos || []).find(m => m.id === id)).filter(Boolean);
  const balances = useWalletBalances(memberships.map(m => m.id));
  if (!memberships.length) return (
    <div className="min-h-screen bg-[#CDD1E4] flex flex-col items-center justify-center">
      <p className="text-[#404255]">No tienes mundos activos.</p>
      <button onClick={() => nav("/landing")} className="mt-4 bg-[#1A3270] text-white px-6 py-3 rounded-2xl font-bold">Explorar</button>
    </div>
  );

  const activeMundo = memberships[activeIdx];

  const handleSelect = (idx) => {
    setActiveIdx(idx);
    setActiveMundo(memberships[idx].id);
  };

  const handleActivate = () => {
    setActiveMundo(activeMundo.id);
    nav("/hub");
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col relative" style={{
      background: "radial-gradient(circle at 50% 30%, rgba(252,248,255,0.8) 0%, rgba(220,216,229,0.9) 100%)"
    }}>
      {/* Blurred bg image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#b0aac0]/40 backdrop-blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-20 flex justify-between items-start px-5 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1E]">Mis Mundos</h1>
          <p className="text-[#404255] text-sm mt-0.5">{memberships.length} comunidades disponibles</p>
        </div>
        <button onClick={() => nav(-1)} className="w-9 h-9 rounded-full glass flex items-center justify-center tap-active">
          <span className="material-symbols-outlined text-[#1C1C1E] text-xl">close</span>
        </button>
      </div>

      {/* Card stack — Image 2 style */}
      <div className="relative z-20 flex-1 flex items-center justify-center" style={{perspective:"1000px"}}>
        <div className="relative w-full max-w-[340px] mx-auto" style={{height:"360px"}}>
          {memberships.map((m, i) => {
            const diff = i - activeIdx;
            const isActive = diff === 0;
            const isBehindTop = diff === -1;
            const isBehindBot = diff === 1;
            const saldo = balances[m.id] || 0;
            const mod = (st.mundos || []).find(w => w.id === m.id);

            if (Math.abs(diff) > 1) return null;

            let style = {};
            let cls = "absolute w-full rounded-[28px] p-6 flex flex-col justify-between transition-all duration-500 cursor-pointer";

            if (isActive) {
              style = { transform: "translateZ(0) scale(1)", zIndex:10, opacity:1, filter:"none",
                background:"linear-gradient(135deg, #0D1A45 0%, #0A1230 100%)",
                boxShadow:"0 25px 60px -10px rgba(0,0,0,0.5)", height:"300px", top:"30px" };
            } else if (isBehindTop) {
              style = { transform:"translateY(-55px) scale(0.9) translateZ(-120px)", zIndex:9, opacity:0.65, filter:"blur(1.5px)",
                background:"linear-gradient(135deg, rgba(86,94,116,0.9) 0%, rgba(63,70,92,0.95) 100%)",
                height:"280px", top:"0px" };
            } else {
              style = { transform:"translateY(55px) scale(0.85) translateZ(-200px)", zIndex:8, opacity:0.45, filter:"blur(3px)",
                background:"linear-gradient(135deg, rgba(119,117,135,0.8) 0%, rgba(92,100,122,0.85) 100%)",
                height:"260px", top:"70px" };
            }

            return (
              <div key={m.id} className={cls} style={style} onClick={() => handleSelect(i)}>
                {isActive && <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-white" style={{boxShadow:"0 0 12px rgba(255,255,255,0.9)"}} />}
                <div>
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">JOI SOLUTIONS</p>
                  <h2 className={`text-white font-black ${isActive ? "text-xl" : "text-base"} leading-tight`}>{m.nombre}</h2>
                  <p className="text-white/60 text-xs mt-1">{mod?.vertical} {mod?.vertical && "•"} {mod?.moneda || "PEN"}</p>
                </div>
                <div>
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">SALDO</p>
                  <p className={`text-white font-black ${isActive ? "text-3xl" : "text-xl"}`}>S/ {saldo.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="relative z-20 flex justify-center gap-2 mb-4">
        {memberships.map((_, i) => (
          <button key={i} onClick={() => handleSelect(i)}
            className={`rounded-full transition-all ${activeIdx===i ? "w-5 h-2 bg-[#1C1C1E]" : "w-2 h-2 bg-[#1C1C1E]/30"}`} />
        ))}
      </div>

      {/* Bottom action */}
      <div className="relative z-20 flex justify-center pb-10 px-5">
        <button onClick={handleActivate}
          className="w-full max-w-[340px] glass flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[#1C1C1E] tap-active shadow-sm">
          <span className="material-symbols-outlined text-[#1C1C1E]">list_alt</span>
          Entrar a {activeMundo.nombre} →
        </button>
      </div>

      {/* Explore more */}
      <div className="relative z-20 flex justify-center pb-8">
        <button onClick={() => nav("/landing")} className="text-[#404255] text-sm font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-base">add_circle</span>
          Unirse a más comunidades
        </button>
      </div>
    </div>
  );
}
