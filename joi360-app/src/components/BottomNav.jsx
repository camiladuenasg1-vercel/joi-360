import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
  { k:"hub", path:"/hub", icon:"home", label:"Inicio" },
  { k:"activity", path:"/activity", icon:"show_chart", label:"Actividad" },
  { k:"pay", path:"/pay", icon:"qr_code_scanner", label:"Pagar", cta:true },
  { k:"mundos", path:"/mundos", icon:"public", label:"Explorar" },
  { k:"profile", path:"/profile", icon:"person", label:"Perfil" },
];

export default function BottomNav({ badge = 0 }) {
  const nav = useNavigate();
  const loc = useLocation();
  const active = TABS.find(t => loc.pathname === t.path)?.k || "hub";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] flex justify-center pb-6 px-5 pointer-events-none">
      <nav className="glass-nav w-full max-w-[430px] rounded-full flex items-center justify-around px-2 py-2 pointer-events-auto">
        {TABS.map(t => {
          const isActive = active === t.k;
          if (t.cta) return (
            <button key={t.k} onClick={() => nav(t.path)}
              className="flex flex-col items-center justify-center relative -top-3">
              <div className="w-14 h-14 rounded-2xl bg-[#1A3270] flex items-center justify-center aura-primary">
                <span className="material-symbols-outlined fill text-white text-2xl">{t.icon}</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-tight text-[#404255]/60 mt-1">{t.label}</span>
            </button>
          );
          return (
            <button key={t.k} onClick={() => nav(t.path)}
              className="flex flex-col items-center justify-center px-2 py-1 relative">
              {t.k === "activity" && badge > 0 && (
                <span className="absolute -top-0.5 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full z-10">{badge}</span>
              )}
              <span className={`material-symbols-outlined text-2xl transition-colors ${isActive ? "fill text-[#1A3270]" : "text-[#8A8FA8]"}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{t.icon}</span>
              <span className={`text-[9px] font-bold uppercase tracking-tight mt-0.5 transition-colors ${isActive ? "text-[#1A3270]" : "text-[#8A8FA8]"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
