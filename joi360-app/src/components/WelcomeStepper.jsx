import React, { useState } from "react";
import { Icon } from "./ModuleAtoms.jsx";

// Stepper de bienvenida — primera apertura de la superapp, una sola vez.
// Gap real reportado en el roadmap para el CTO (25-ago): un usuario nuevo
// pasaba del registro directo a la lista de comunidades sin ningún contexto
// de qué es JOI 360 como ecosistema. Solo texto/iconos ya existentes en el
// design system -- sin assets nuevos. Se marca visto en localStorage (no en
// Supabase): es una conveniencia de primera vez del dispositivo, no un dato
// de cuenta que deba viajar entre dispositivos.
const KEY_VISTO = "joi360_bienvenida_vista";

export function bienvenidaYaVista() {
  try { return localStorage.getItem(KEY_VISTO) === "1"; } catch { return true; }
}

const PASOS = [
  {
    icon: "hub",
    titulo: "Todas tus comunidades, un solo lugar",
    texto: "Colegios, clubes, centros comerciales y más — cada comunidad a la que te unes activa su propia billetera y sus propios servicios dentro de JOI 360.",
  },
  {
    icon: "account_balance_wallet",
    titulo: "Tu billetera, tu control",
    texto: "Recarga saldo, paga en los comercios afiliados y, si lo necesitas, da saldo con límites propios a tu familia.",
  },
  {
    icon: "qr_code_scanner",
    titulo: "Paga en segundos",
    texto: "Con tu código QR o tu pulsera, en cualquier comercio afiliado de la comunidad — sin efectivo, sin vueltas.",
  },
];

export default function WelcomeStepper({ onFinish }) {
  const [paso, setPaso] = useState(0);
  const ultimo = paso === PASOS.length - 1;

  const cerrar = () => {
    try { localStorage.setItem(KEY_VISTO, "1"); } catch {}
    onFinish?.();
  };

  const p = PASOS[paso];

  return (
    <div className="fixed inset-0 z-[60] aura-bg flex flex-col">
      <div className="flex justify-end px-5 pt-6">
        <button onClick={cerrar} className="text-[#404255] text-xs font-semibold px-3 py-1.5 hover:text-[#1C1C1E] transition-colors">
          Omitir
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-[420px] mx-auto w-full">
        <div className="w-24 h-24 rounded-[28px] bg-[#1A3270] flex items-center justify-center mb-8 aura-primary">
          <Icon name={p.icon} fill size="text-5xl" color="text-white" />
        </div>
        <h1 className="text-[#1C1C1E] text-2xl font-black tracking-tight leading-tight mb-3">{p.titulo}</h1>
        <p className="text-[#404255] text-sm leading-relaxed">{p.texto}</p>
      </div>

      <div className="px-8 pb-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          {PASOS.map((_, i) => (
            <button
              key={i}
              onClick={() => setPaso(i)}
              aria-label={`Paso ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === paso ? "w-6 bg-[#1A3270]" : "w-1.5 bg-[#CDD1E4]"}`}
            />
          ))}
        </div>
        <button
          onClick={() => (ultimo ? cerrar() : setPaso(p => p + 1))}
          className="w-full py-4 rounded-2xl font-black text-base text-white tap-active transition-all"
          style={{ background: "linear-gradient(135deg,#1A3270,#3B5BDB)", boxShadow: "0 8px 24px rgba(26,50,112,0.25)" }}>
          {ultimo ? "Empezar →" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
