import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginUser } from "../userStore.js";
import { setUserId } from "../supabaseClient.js";
import {
  TIPOS_DOCUMENTO, tipoDocumento, REGLAS_PASSWORD, passwordValida,
  registrarUsuario, iniciarSesion, correoConfirmado, reenviarConfirmacion,
} from "../auth.js";

const campo = {
  background: "rgba(255,255,255,0.12)",
  border: "1.5px solid rgba(255,255,255,0.18)",
  caretColor: "white",
};
const enfoque = e => (e.target.style.borderColor = "rgba(255,255,255,0.45)");
const desenfoque = e => (e.target.style.borderColor = "rgba(255,255,255,0.18)");

function Etiqueta({ children }) {
  return (
    <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-2">
      {children}
    </label>
  );
}

function Entrada({ label, ...props }) {
  return (
    <div>
      {label && <Etiqueta>{label}</Etiqueta>}
      <input
        {...props}
        className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
        style={campo}
        onFocus={enfoque}
        onBlur={desenfoque}
      />
    </div>
  );
}

function Aviso({ tono = "error", children }) {
  const c = tono === "error"
    ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", texto: "text-red-300", icono: "error", ic: "text-red-400" }
    : { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", texto: "text-green-300", icono: "check_circle", ic: "text-green-400" };
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: c.background, border: c.border }}>
      <span className={`material-symbols-outlined fill ${c.ic} text-base leading-5`}>{c.icono}</span>
      <p className={`${c.texto} text-xs font-semibold leading-5`}>{children}</p>
    </div>
  );
}

const VACIO = {
  nombres: "", apellidos: "", docTipo: "DNI", docNumero: "",
  email: "", password: "", password2: "",
};

export default function AuthPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");

  const [mode, setMode] = useState("login");
  const [f, setF] = useState(VACIO);
  const [terminos, setTerminos] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(false);
  // Cuando el registro sale bien la pantalla cambia a esperar la confirmación.
  // La contraseña se conserva solo en memoria y solo para poder preguntar si el
  // correo ya quedó activo; nunca se guarda en el dispositivo.
  const [pendiente, setPendiente] = useState(null);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(""); };

  const tipo = tipoDocumento(f.docTipo);
  const docOk = f.docNumero.length === tipo.digitos ||
    (!tipo.soloNumeros && f.docNumero.length >= 6);
  const passOk = passwordValida(f.password);
  const coincide = f.password.length > 0 && f.password === f.password2;

  const registroListo =
    f.nombres.trim() && f.apellidos.trim() && docOk &&
    /^\S+@\S+\.\S+$/.test(f.email) && passOk && coincide && terminos;

  const loginListo = /^\S+@\S+\.\S+$/.test(f.email) && f.password.length > 0;

  function entrar(u) {
    setUserId(u.id);
    loginUser(u.nombre, u.email);
    nav(next || "/landing");
  }

  async function enviar(e) {
    e.preventDefault();
    if (cargando) return;
    setErr("");
    setCargando(true);
    try {
      if (mode === "login") {
        entrar(await iniciarSesion(f.email, f.password));
      } else {
        await registrarUsuario({
          nombres: f.nombres, apellidos: f.apellidos,
          docTipo: f.docTipo, docNumero: f.docNumero,
          email: f.email, password: f.password,
        });
        setPendiente({ email: f.email.trim().toLowerCase(), password: f.password });
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setCargando(false);
    }
  }

  if (pendiente) {
    return (
      <EsperandoConfirmacion
        datos={pendiente}
        onConfirmado={entrar}
        onVolver={() => { setPendiente(null); setF({ ...VACIO, email: pendiente.email }); setMode("login"); setTerminos(false); }}
      />
    );
  }

  return (
    <Marco>
      <div className="flex rounded-2xl p-1 mb-6 gap-1" style={{ background: "rgba(0,0,0,0.25)" }}>
        {["login", "register"].map(m => (
          <button key={m} onClick={() => { setMode(m); setErr(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === m ? "bg-white text-[#3525cd] shadow-sm" : "text-white/50 hover:text-white/70"}`}>
            {m === "login" ? "Iniciar sesión" : "Registrarme"}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="space-y-4">
        {mode === "register" && (
          <>
            <Entrada label="Nombres" placeholder="María Fernanda" value={f.nombres}
              onChange={e => set("nombres", e.target.value)} autoComplete="given-name" />
            <Entrada label="Apellidos" placeholder="García Rojas" value={f.apellidos}
              onChange={e => set("apellidos", e.target.value)} autoComplete="family-name" />

            <div>
              <Etiqueta>Documento de identidad</Etiqueta>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={f.docTipo}
                  onChange={e => { set("docTipo", e.target.value); set("docNumero", ""); }}
                  className="w-full rounded-2xl px-3 py-3.5 text-white text-sm outline-none appearance-none"
                  style={campo}>
                  {TIPOS_DOCUMENTO.map(t => (
                    <option key={t.id} value={t.id} className="text-[#1b1b24]">{t.label}</option>
                  ))}
                </select>
                <input
                  value={f.docNumero}
                  onChange={e => {
                    const v = tipo.soloNumeros ? e.target.value.replace(/\D/g, "") : e.target.value.toUpperCase();
                    set("docNumero", v.slice(0, tipo.digitos));
                  }}
                  placeholder={tipo.id === "DNI" ? "8 dígitos" : "N.º de documento"}
                  inputMode={tipo.soloNumeros ? "numeric" : "text"}
                  className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
                  style={campo} onFocus={enfoque} onBlur={desenfoque} />
              </div>
            </div>
          </>
        )}

        <Entrada label="Correo electrónico" type="email" placeholder="correo@email.com"
          value={f.email} onChange={e => set("email", e.target.value)} autoComplete="email" />

        <div>
          <div className="flex items-end justify-between mb-2">
            <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest">Contraseña</label>
            <button type="button" onClick={() => setVerPass(v => !v)}
              className="text-white/50 text-[11px] font-bold hover:text-white/80 transition-colors">
              {verPass ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <input
            type={verPass ? "text" : "password"} placeholder="••••••••"
            value={f.password} onChange={e => set("password", e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
            style={campo} onFocus={enfoque} onBlur={desenfoque} />
        </div>

        {mode === "register" && (
          <>
            {/* Los requisitos se ven mientras se escribe: enterarse de la regla
                recién al fallar el envío es la peor forma de descubrirla. */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
              {REGLAS_PASSWORD.map(r => {
                const ok = r.cumple(f.password);
                return (
                  <span key={r.id} className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${ok ? "text-green-300" : "text-white/40"}`}>
                    <span className="material-symbols-outlined text-[14px] leading-none">
                      {ok ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    {r.label}
                  </span>
                );
              })}
            </div>

            <div>
              <Etiqueta>Confirmar contraseña</Etiqueta>
              <input
                type={verPass ? "text" : "password"} placeholder="••••••••"
                value={f.password2} onChange={e => set("password2", e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
                style={campo} onFocus={enfoque} onBlur={desenfoque} />
              {f.password2.length > 0 && !coincide && (
                <p className="text-red-300 text-[11px] font-semibold mt-2 px-1">Las contraseñas no coinciden.</p>
              )}
            </div>

            <button type="button" onClick={() => { setTerminos(t => !t); setErr(""); }}
              className="flex items-start gap-3 w-full text-left pt-1">
              <span
                className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-all mt-px"
                style={{
                  background: terminos ? "#3525cd" : "rgba(255,255,255,0.10)",
                  border: `1.5px solid ${terminos ? "#3525cd" : "rgba(255,255,255,0.25)"}`,
                }}>
                {terminos && <span className="material-symbols-outlined text-white text-[15px] leading-none">check</span>}
              </span>
              <span className="text-white/60 text-xs leading-5">
                Acepto los términos y condiciones y la política de privacidad de JOI 360.
              </span>
            </button>
          </>
        )}

        {err && <Aviso>{err}</Aviso>}

        <button type="submit" disabled={cargando || !(mode === "login" ? loginListo : registroListo)}
          className="w-full rounded-2xl py-4 font-black text-base text-white transition-all mt-1 tap-active disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg,#3525cd,#4f46e5)",
            boxShadow: "0 8px 24px rgba(53,37,205,0.45)",
          }}>
          {cargando ? "Un momento…" : mode === "login" ? "Entrar al ecosistema →" : "Crear cuenta →"}
        </button>
      </form>
    </Marco>
  );
}

/**
 * Espera de confirmación. No es una pantalla muerta: mientras está abierta le
 * pregunta a Supabase si el correo ya quedó activo, y en cuanto lo está entra
 * sola. Así la persona toca el enlace en su correo, vuelve a la app y ya está,
 * sin tener que adivinar qué hacer al regresar.
 */
function EsperandoConfirmacion({ datos, onConfirmado, onVolver }) {
  const [estado, setEstado] = useState("esperando"); // esperando | reenviando | reenviado
  const [err, setErr] = useState("");

  const revisar = useCallback(async () => {
    try {
      const listo = await correoConfirmado(datos.email, datos.password);
      if (listo) {
        const u = await iniciarSesion(datos.email, datos.password);
        onConfirmado(u);
      }
    } catch (e) {
      setErr(e.message);
    }
  }, [datos, onConfirmado]);

  useEffect(() => {
    const t = setInterval(revisar, 5000);
    // Volver a la pestaña después de tocar el enlace es la señal más fuerte de
    // que algo cambió: se revisa en ese momento y no en el siguiente intervalo.
    const alVolver = () => { if (document.visibilityState === "visible") revisar(); };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", revisar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", revisar);
    };
  }, [revisar]);

  async function reenviar() {
    setEstado("reenviando");
    setErr("");
    try {
      await reenviarConfirmacion(datos.email);
      setEstado("reenviado");
    } catch (e) {
      setErr(e.message);
      setEstado("esperando");
    }
  }

  return (
    <Marco>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: "rgba(53,37,205,0.35)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <span className="material-symbols-outlined text-white text-[30px]">mark_email_unread</span>
        </div>
        <h2 className="text-white text-xl font-black tracking-tight mb-2.5">Confirma tu correo</h2>
        <p className="text-white/55 text-sm leading-6">
          Te enviamos un enlace a <span className="text-white font-semibold">{datos.email}</span>. Ábrelo
          para activar tu cuenta y vuelve acá: entramos solos.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {err && <Aviso>{err}</Aviso>}
        {estado === "reenviado" && <Aviso tono="ok">Correo reenviado. Revisa también la carpeta de spam.</Aviso>}

        <button onClick={revisar}
          className="w-full rounded-2xl py-4 font-black text-base text-white transition-all tap-active"
          style={{ background: "linear-gradient(135deg,#3525cd,#4f46e5)", boxShadow: "0 8px 24px rgba(53,37,205,0.45)" }}>
          Ya confirmé mi correo
        </button>

        <button onClick={reenviar} disabled={estado === "reenviando"}
          className="w-full rounded-2xl py-3.5 font-bold text-sm text-white/70 transition-all disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
          {estado === "reenviando" ? "Enviando…" : "Reenviar el correo"}
        </button>

        <button onClick={onVolver}
          className="w-full text-white/40 text-xs hover:text-white/70 transition-colors text-center py-2 font-semibold">
          Volver al inicio de sesión
        </button>
      </div>
    </Marco>
  );
}

function Marco({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1530] via-[#151d3b] to-[#0a0f26] flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#3525cd]/15 blur-[80px]" />
        <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-[#3525cd]/10 blur-[80px]" />
      </div>
      <div className="w-full max-w-[390px] relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-[#3525cd] mx-auto mb-4 flex items-center justify-center shadow-xl aura-primary">
            <span className="text-white font-black text-xl tracking-tighter">JOI</span>
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">JOI 360</h1>
          <p className="text-white/40 text-xs mt-1 font-mono uppercase tracking-widest">Ecosistema cerrado de pagos</p>
        </div>
        <div className="rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          {children}
        </div>
        <p className="text-white/15 text-[10px] text-center mt-6 font-mono">RedPontis S.A.C. · Lima, Perú</p>
      </div>
    </div>
  );
}
