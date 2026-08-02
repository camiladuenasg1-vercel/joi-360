import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loginUser } from "../userStore.js";

export default function AuthPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ nombre: "", email: "", password: "" });
  const [err, setErr] = useState("");

  const submit = e => {
    e.preventDefault();
    if (!f.email || !f.password) { setErr("Completa todos los campos."); return; }
    if (mode === "register" && !f.nombre) { setErr("Ingresa tu nombre."); return; }
    loginUser(mode === "register" ? f.nombre : f.email.split("@")[0], f.email);
    nav(next || "/landing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1530] via-[#151d3b] to-[#0a0f26] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#3525cd]/15 blur-[80px]" />
        <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-[#3525cd]/10 blur-[80px]" />
      </div>
      <div className="w-full max-w-[390px] relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-[#3525cd] mx-auto mb-4 flex items-center justify-center shadow-xl aura-primary">
            <span className="text-white font-black text-xl tracking-tighter">JOI</span>
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">JOI 360</h1>
          <p className="text-white/40 text-xs mt-1 font-mono uppercase tracking-widest">Ecosistema cerrado de pagos</p>
        </div>
        <div className="rounded-3xl p-6" style={{background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)"}}>
          {/* Segmented control */}
          <div className="flex rounded-2xl p-1 mb-6 gap-1" style={{background:"rgba(0,0,0,0.25)"}}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode===m?"bg-white text-[#3525cd] shadow-sm":"text-white/50 hover:text-white/70"}`}>
                {m==="login" ? "Iniciar sesión" : "Registrarme"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode==="register" && (
              <div>
                <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-2">Nombre completo</label>
                <input
                  className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
                  style={{background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.18)", caretColor:"white"}}
                  placeholder="María García"
                  value={f.nombre}
                  onChange={e=>setF({...f,nombre:e.target.value})}
                  onFocus={e=>e.target.style.borderColor="rgba(255,255,255,0.45)"}
                  onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.18)"}
                />
              </div>
            )}
            <div>
              <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-2">Email</label>
              <input
                type="email"
                className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
                style={{background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.18)", caretColor:"white"}}
                placeholder="correo@email.com"
                value={f.email}
                onChange={e=>setF({...f,email:e.target.value})}
                onFocus={e=>e.target.style.borderColor="rgba(255,255,255,0.45)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.18)"}
              />
            </div>
            <div>
              <label className="text-white/60 text-[11px] font-bold uppercase tracking-widest block mb-2">Contraseña</label>
              <input
                type="password"
                className="w-full rounded-2xl px-4 py-3.5 text-white text-sm outline-none transition-all"
                style={{background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.18)", caretColor:"white"}}
                placeholder="••••••••"
                value={f.password}
                onChange={e=>setF({...f,password:e.target.value})}
                onFocus={e=>e.target.style.borderColor="rgba(255,255,255,0.45)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.18)"}
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)"}}>
                <span className="material-symbols-outlined fill text-red-400 text-base">error</span>
                <p className="text-red-300 text-xs font-semibold">{err}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl py-4 font-black text-base text-white transition-all mt-1 tap-active"
              style={{background:"linear-gradient(135deg,#3525cd,#4f46e5)", boxShadow:"0 8px 24px rgba(53,37,205,0.45)"}}>
              {mode==="login" ? "Entrar al ecosistema →" : "Crear cuenta →"}
            </button>
          </form>

          <div className="mt-5 pt-4" style={{borderTop:"1px solid rgba(255,255,255,0.08)"}}>
            <button
              onClick={() => { loginUser("Salvador","salvador@joi360.pe"); nav(next || "/landing"); }}
              className="w-full text-white/35 text-xs hover:text-white/60 transition-colors text-center py-1.5 font-medium">
              Explorar como invitado
            </button>
          </div>
        </div>
        <p className="text-white/15 text-[10px] text-center mt-6 font-mono">RedPontis S.A.C. · Lima, Perú</p>
      </div>
    </div>
  );
}
