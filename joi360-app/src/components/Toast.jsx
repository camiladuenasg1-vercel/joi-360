/**
 * Popups estructurados de éxito/advertencia/alerta (Gantt #98).
 * Antes: cada página (Hub, Pay, Profile, Module) tenía su propio estado
 * local {msg, ok} copiado y pegado — sin severidad real (solo verde/rojo)
 * y sin estructura (un string plano, ignorando que errorControlado ya
 * devuelve titulo/mensaje/accion/severidad reales del catálogo). Mismo
 * patrón que notify()/Toaster() del admin (evento global en window, sin
 * context ni prop-drilling), con 4 severidades en vez de 3.
 */
import React, { useState, useEffect } from "react";

let _tid = 0;

// input: string simple, o { titulo?, mensaje, accion? } estructurado.
export function showToast(input, severidad = "success") {
  const detail = typeof input === "string" ? { mensaje: input } : { ...input };
  window.dispatchEvent(new CustomEvent("joi360:app-toast", {
    detail: { id: ++_tid, severidad: detail.severidad || severidad, ...detail },
  }));
}

const ICONS = { success: "check_circle", info: "info", warning: "warning", error: "error" };
const STYLES = {
  success: "bg-green-600",
  info: "bg-[#3525cd]",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const h = (e) => {
      const t = e.detail;
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500);
    };
    window.addEventListener("joi360:app-toast", h);
    return () => window.removeEventListener("joi360:app-toast", h);
  }, []);
  if (!toasts.length) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4 w-full">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-start gap-2 px-5 py-3 rounded-2xl shadow-xl text-white max-w-[420px] w-full ${STYLES[t.severidad] || STYLES.success}`}>
          <span className="material-symbols-outlined text-[18px] mt-0.5">{ICONS[t.severidad] || ICONS.success}</span>
          <div className="flex-1">
            {t.titulo && <p className="text-sm font-bold leading-tight">{t.titulo}</p>}
            <p className={`text-sm ${t.titulo ? "font-normal opacity-90 mt-0.5" : "font-bold"}`}>{t.mensaje}</p>
            {t.accion && <p className="text-xs font-normal opacity-80 mt-0.5">{t.accion}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
