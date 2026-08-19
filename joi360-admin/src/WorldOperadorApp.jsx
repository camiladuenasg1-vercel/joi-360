/**
 * App Operador de Mundo — "Soy Mundo" (Task #128). Ruta /operador-mundo/:worldId,
 * paralela a /operador/:comercioId pero para quien NO representa a ningún
 * comercio (portero, punto de entrega de banditas, mesa de ayuda): vincula
 * pulseras y valida accesos, sin cobrar saldo — por eso su clave es la del
 * mundo (worlds.pos_pin), no la de un comercio.
 *
 * AccesosOperador y VincularBanditaOperador ya operaban 100% sobre `m`
 * (el mundo) — el prop `comercio` que reciben nunca se usaba dentro de su
 * cuerpo, así que se reusan tal cual, sin duplicar código.
 */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "./hooks";
import { worldOperatorLogin, worldOperatorLogout } from "./store";
import { Icon, BtnPrimary, notify, inputCls } from "./ui";
import { AccesosOperador, VincularBanditaOperador, ConsultarFichaOperador } from "./OperadorApp.jsx";

export function WorldOperadorApp() {
  const { worldId } = useParams();
  const st = useStore();
  const m = (st.mundos || []).find(x => x.id === worldId);
  if (!m) return <div className="min-h-screen flex items-center justify-center bg-surface-bright"><p className="text-on-surface-variant">Mundo no encontrado.</p></div>;
  const sess = st.worldOperatorSession?.worldId === worldId;
  if (!sess) return <WorldGate m={m} />;
  return <WorldOperadorShell m={m} />;
}

function WorldGate({ m }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!m.codigo) { setErr("Este mundo todavía no tiene código de operador. Pídeselo a RedPontis."); return; }
    setErr(""); setBusy(true);
    try {
      const ok = await worldOperatorLogin(m.id, pin);
      if (!ok) setErr("Clave incorrecta.");
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#1A3270 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg text-white flex items-center justify-center font-bold text-xl" style={{ background: m.color || "#1A3270" }}><Icon n="public" /></div>
          <div>
            <h1 className="text-lg font-black">{m.nombre}</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase">Operador de Mundo · Código {m.codigo}</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Clave del mundo</label>
            <input className={`${inputCls} font-mono`} type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" autoFocus />
          </div>
          {err && <p className="text-xs text-error">{err}</p>}
          <BtnPrimary type="submit" disabled={busy} className="w-full"><Icon n="login" className="text-[18px]" /> {busy ? "Verificando…" : "Ingresar"}</BtnPrimary>
        </form>
        <p className="text-center text-xs text-on-surface-variant mt-4">Vincular pulseras, validar accesos — no cobra saldo. Para cobrar, entra como comercio.</p>
      </div>
    </div>
  );
}

const MODOS = [
  { id: "bandita", nombre: "Vincular Pulsera NFC", icon: "sensors", desc: "Asociar una pulsera física a la cuenta de un usuario." },
  { id: "accesos", nombre: "Validar Acceso", icon: "door_open", desc: "Registrar entrada o salida por código." },
  { id: "ficha", nombre: "Consultar Ficha", icon: "medical_information", desc: "Ver alergias, tipo de sangre y contacto de emergencia por DNI o bandita." },
];

function WorldOperadorShell({ m }) {
  const [modo, setModo] = useState(null);
  const walletMod = (m?.modulos || []).find(x => x.id === "wallet" && x.enabled);
  const banditaOn = !!walletMod && walletMod.config?.usaPulseraNfc !== false;
  const accesosOn = (m?.modulos || []).some(x => x.id === "accesos" && x.enabled);
  const fichaOn = (m?.modulos || []).some(x => x.id === "perfil_ext" && x.enabled);
  const disponibles = MODOS.filter(md => {
    if (md.id === "bandita") return banditaOn;
    if (md.id === "accesos") return accesosOn;
    if (md.id === "ficha") return fichaOn;
    return true;
  });

  // Cierre de sesión definitivo por inactividad (Task #143) — mismo terminal
  // compartido que /operador/:comercioId, mismo riesgo si alguien se aleja
  // sin cerrar sesión.
  useEffect(() => {
    const INACTIVITY_MS = 5 * 60 * 1000;
    const cerrarPorInactividad = () => {
      worldOperatorLogout();
      notify("Sesión cerrada por inactividad.", "info");
    };
    let timer = setTimeout(cerrarPorInactividad, INACTIVITY_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(cerrarPorInactividad, INACTIVITY_MS); };
    const eventos = ["pointerdown", "keydown", "touchstart"];
    eventos.forEach(e => document.addEventListener(e, reset));
    return () => { clearTimeout(timer); eventos.forEach(e => document.removeEventListener(e, reset)); };
  }, []);

  return (
    <div className="min-h-screen bg-surface-bright">
      <header className="bg-surface-container-lowest border-b border-outline-variant px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          {modo && (
            <button onClick={() => setModo(null)} className="p-1 -ml-1 rounded hover:bg-surface-container flex-shrink-0">
              <Icon n="arrow_back" className="text-[20px]" />
            </button>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{modo ? MODOS.find(md => md.id === modo)?.nombre : m.nombre}</p>
            <p className="font-mono text-[9px] text-on-surface-variant uppercase truncate">{modo ? m.nombre : "Operador de Mundo"}</p>
          </div>
        </div>
        <button onClick={() => { worldOperatorLogout(); notify("Sesión cerrada.", "info"); }} className="p-1.5 rounded hover:bg-surface-container flex-shrink-0">
          <Icon n="logout" className="text-[18px] text-on-surface-variant" />
        </button>
      </header>

      <div className="max-w-md mx-auto p-4">
        {!modo && (
          <div className="space-y-3">
            {disponibles.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <Icon n="extension_off" className="text-[40px] mb-3 opacity-60" />
                <p className="text-sm">Este mundo no tiene capacidades de operador de mundo activas todavía.</p>
              </div>
            )}
            {disponibles.map(md => (
              <button key={md.id} onClick={() => setModo(md.id)}
                className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl text-left hover:border-primary/40 tap-active transition-colors">
                <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center flex-shrink-0">
                  <Icon n={md.icon} className="text-primary text-[22px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{md.nombre}</p>
                  <p className="text-xs text-on-surface-variant">{md.desc}</p>
                </div>
                <Icon n="chevron_right" className="text-outline text-[20px] flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {modo === "bandita" && <VincularBanditaOperador comercio={null} m={m} />}
        {modo === "accesos" && <AccesosOperador comercio={null} m={m} />}
        {modo === "ficha" && <ConsultarFichaOperador comercio={null} m={m} />}
      </div>
    </div>
  );
}
