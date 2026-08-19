import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, useWalletBalances, useWalletLive } from "../hooks.js";
import { useUser, logoutUser, setActiveMundo } from "../userStore.js";
import { getSyntheticUserId, fetchMisDependientes, fetchDependienteBalance, crearTicketSoporteRemote } from "../supabaseClient.js";
import BottomNav from "../components/BottomNav.jsx";
import { showToast } from "../components/Toast.jsx";

// Contenido real, honesto — no un documento legal fabricado, solo una
// descripción precisa de qué guarda hoy JOI 360 (Gantt #12).
const PRIVACIDAD_TEXTO = `JOI 360 guarda lo mínimo necesario para operar tu cuenta:

• Nombre y correo que usaste al registrarte.
• Tu código JOI (identificador único de pago).
• Saldo y movimientos de billetera por cada mundo al que perteneces.
• Datos de perfil médico/alergias, solo si los completaste en Restricciones.
• Historial de compras, financiamientos BNPL y entradas a eventos.

No compartimos estos datos con terceros fuera del mundo (colegio, condominio, evento) al que perteneces. Este es un entorno de demostración — los datos aquí son de prueba, no producción real.`;

const TERMINOS_TEXTO = `JOI 360 es la super-app del ecosistema RedPontis. Al usarla aceptas que:

• Tu saldo en cada mundo es independiente y solo se usa dentro de ese mundo.
• Las recargas y pagos que confirmes son operaciones reales sobre tu cuenta.
• RedPontis actúa como operador de la plataforma; cada mundo (colegio, condominio, evento) es responsable de sus propias políticas.
• Este es un entorno de demostración construido para JOI 360 — no sustituye un contrato legal formal.`;

// Canal de soporte para atención al usuario (13-ago) — antes solo existía un
// botón de escalar contextual dentro de una transferencia P2P fallida
// (enviarSoporteP2P en Module.jsx); esto es la entrada general, siempre
// visible, con categorías reales incluyendo Devolución/Reembolso.
const CATEGORIAS_SOPORTE = [
  { id: "devolucion", label: "Devolución o reembolso", icon: "currency_exchange" },
  { id: "cobro", label: "Problema con un cobro", icon: "receipt_long" },
  { id: "recarga", label: "Problema con una recarga", icon: "add_card" },
  { id: "bandita", label: "Problema con mi bandita/pulsera", icon: "contactless" },
  { id: "otro", label: "Otro", icon: "help" },
];

export default function ProfilePage() {
  const nav = useNavigate();
  const st = useStore();
  const u = useUser();
  const [modal, setModal] = useState(null); // "privacidad" | "terminos" | "ayuda" | null
  const [ayudaForm, setAyudaForm] = useState({ categoria: "devolucion", asunto: "", detalle: "", monto: "" });
  const [enviandoAyuda, setEnviandoAyuda] = useState(false);
  const [ayudaEnviada, setAyudaEnviada] = useState(false);

  const nombre = u?.auth?.nombre || "Usuario";
  const email = u?.auth?.email || "";
  const initials = nombre.split(" ").map(p=>p[0]).join("").toUpperCase().slice(0,2);
  const memberships = (u?.memberships||[]).map(id=>(st.mundos||[]).find(m=>m.id===id)).filter(Boolean);
  const activeMundo = (st.mundos||[]).find(m=>m.id===u?.activeMundoId);
  const balances = useWalletBalances(memberships.map(m => m.id));
  const { historial } = useWalletLive(activeMundo?.id);
  const totalBalance = memberships.reduce((a,m)=>a+(balances[m.id]||0),0);
  const totalTx = historial.length;
  const myCode = getSyntheticUserId();

  // Mi Familia — vista consolidada de todos mis dependientes, en todos mis
  // mundos. Criterio confirmado por la usuaria: un dependiente es un perfil
  // ligado a la cuenta principal, identificado por bandita NFC/QR puramente
  // para consumo (no accede a más que su propio saldo), y su alta puede
  // tener costo de suscripción o ser gratuita según lo configure cada mundo
  // (capacidad Suscripciones, depende de Wallet). La creación en
  // sí sigue viviendo en Restricciones de cada mundo (el cobro es propio de
  // esa wallet) — esta sección solo consolida la vista y entra al mundo
  // correcto para gestionar.
  const membershipIds = memberships.map(m => m.id).join(",");
  const [familia, setFamilia] = useState(null);
  useEffect(() => {
    if (!memberships.length) { setFamilia([]); return; }
    let vivo = true;
    Promise.all(memberships.map(async m => {
      const deps = await fetchMisDependientes(myCode, m.id).catch(() => []);
      return Promise.all((deps || []).map(async d => ({
        ...d, mundoId: m.id, mundoNombre: m.nombre,
        balance: await fetchDependienteBalance(d.dependent_user_id, m.id).catch(() => 0),
      })));
    })).then(arrs => { if (vivo) setFamilia(arrs.flat()); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipIds]);

  const irAGestionarFamilia = (mundoId) => {
    if (mundoId && mundoId !== activeMundo?.id) setActiveMundo(mundoId);
    nav("/module/control");
  };

  const enviarTicketAyuda = async () => {
    if (!ayudaForm.asunto.trim()) return;
    setEnviandoAyuda(true);
    try {
      const cat = CATEGORIAS_SOPORTE.find(c => c.id === ayudaForm.categoria);
      const detalleConMonto = ayudaForm.categoria === "devolucion" && ayudaForm.monto
        ? `Monto reclamado: S/ ${ayudaForm.monto}\n\n${ayudaForm.detalle}`
        : ayudaForm.detalle;
      await crearTicketSoporteRemote({
        world_id: activeMundo?.id || null, user_id: myCode,
        tipo: cat?.label || "Otro", asunto: ayudaForm.asunto, detalle: detalleConMonto,
      });
      setAyudaEnviada(true);
    } catch {
      showToast({ titulo: "No se pudo enviar", mensaje: "Intenta de nuevo en unos minutos." }, "error");
    } finally { setEnviandoAyuda(false); }
  };
  const cerrarAyuda = () => { setModal(null); setAyudaEnviada(false); setAyudaForm({ categoria: "devolucion", asunto: "", detalle: "", monto: "" }); };

  const compartirCodigo = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Mi código JOI", text: myCode }); return; }
      catch (e) { /* usuario canceló el share sheet — no es un error */ }
    }
    navigator.clipboard?.writeText(myCode);
    showToast("Código copiado — pégalo donde te lo pidan.", "info");
  };

  return (
    <div className="min-h-screen aura-bg pb-32">
      <div className="max-w-[430px] mx-auto">
        <div className="px-5 pt-12 pb-5">
          <h1 className="text-3xl font-black text-[#1C1C1E] mb-5">Mi perfil</h1>
          {/* User card */}
          <div className="glass-card rounded-3xl p-5 mb-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-[#1A3270] flex items-center justify-center aura-primary">
                <span className="text-white font-black text-2xl">{initials}</span>
              </div>
              <div>
                <p className="text-[#1C1C1E] font-black text-xl">{nombre}</p>
                <p className="text-[#8A8FA8] text-sm">{email}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#EEF2FD] rounded-2xl p-3 text-center">
                <p className="text-[#1A3270] font-black text-lg">S/ {totalBalance.toFixed(0)}</p>
                <p className="text-[#8A8FA8] text-[10px] font-semibold uppercase">Total</p>
              </div>
              <div className="bg-[#EEF2FD] rounded-2xl p-3 text-center">
                <p className="text-[#1A3270] font-black text-lg">{memberships.length}</p>
                <p className="text-[#8A8FA8] text-[10px] font-semibold uppercase">Mundos</p>
              </div>
              <div className="bg-[#EEF2FD] rounded-2xl p-3 text-center">
                <p className="text-[#1A3270] font-black text-lg">{totalTx}</p>
                <p className="text-[#8A8FA8] text-[10px] font-semibold uppercase">Transacciones</p>
              </div>
            </div>
          </div>

          {/* Mi código JOI — identificador único de la cuenta. Ingrésalo (o compártelo)
              donde te pidan un destinatario: transferir P2P, transferir una entrada, etc. */}
          <div className="glass-card rounded-3xl p-5 mb-4">
            <p className="text-[#8A8FA8] text-[10px] font-bold uppercase tracking-widest mb-2">Mi código JOI</p>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-sm text-[#1C1C1E] break-all">{myCode}</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => { navigator.clipboard?.writeText(myCode); showToast("Código copiado.", "info"); }}
                  className="glass-card w-9 h-9 rounded-full flex items-center justify-center tap-active">
                  <span className="material-symbols-outlined text-[#1A3270] text-[18px]">content_copy</span>
                </button>
                <button onClick={compartirCodigo} className="glass-card w-9 h-9 rounded-full flex items-center justify-center tap-active">
                  <span className="material-symbols-outlined text-[#1A3270] text-[18px]">share</span>
                </button>
              </div>
            </div>
            <p className="text-[#8A8FA8] text-xs mt-2">Compártelo con quien vaya a transferirte saldo o una entrada — lo ingresan como "código del destinatario".</p>
          </div>

          {/* Mi Familia — dependientes con bandita NFC/QR, ligados a la wallet
              de cada mundo, netamente para consumo. */}
          <div className="glass-card rounded-3xl overflow-hidden mb-4">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#CDD1E4]/50">
              <p className="text-[#1C1C1E] font-bold">Mi familia</p>
              <button onClick={() => irAGestionarFamilia(activeMundo?.id)} className="text-xs font-bold text-[#1A3270]">+ Agregar</button>
            </div>
            {familia === null ? (
              <div className="px-5 py-6 text-center text-sm text-[#8A8FA8]">Cargando…</div>
            ) : familia.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-[#8A8FA8] text-sm">Aún no tienes familiares registrados.</p>
                <p className="text-[#8A8FA8] text-xs mt-1">Un familiar es un perfil con su propio saldo, identificado por bandita NFC o QR — solo para consumo. Algunos mundos cobran por vincularlo, otros lo dan gratis.</p>
              </div>
            ) : (
              familia.map(d => (
                <button key={`${d.mundoId}-${d.dependent_user_id}`} onClick={() => irAGestionarFamilia(d.mundoId)}
                  className="w-full flex items-center gap-3 px-5 py-4 border-b border-[#CDD1E4]/30 last:border-0 tap-active text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#DCE4FA] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1A3270] font-black text-sm">{d.nombre?.[0] || "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1C1E] font-bold text-sm truncate">{d.nombre}</p>
                    <p className="text-[#8A8FA8] text-xs">{d.mundoNombre}{d.alergias ? ` · alergias: ${d.alergias}` : ""}</p>
                  </div>
                  <p className="text-[#1C1C1E] font-black text-sm flex-shrink-0">S/ {(d.balance||0).toFixed(2)}</p>
                </button>
              ))
            )}
          </div>

          {/* Mis comunidades */}
          <div className="glass-card rounded-3xl overflow-hidden mb-4">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#CDD1E4]/50">
              <p className="text-[#1C1C1E] font-bold">Mis comunidades</p>
              <button onClick={() => nav("/landing")} className="text-xs font-bold text-[#1A3270]">+ Unirme</button>
            </div>
            {memberships.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-[#8A8FA8] text-sm">Aún no te has unido.</p>
                <button onClick={() => nav("/landing")} className="mt-2 text-[#1A3270] text-sm font-bold">Explorar →</button>
              </div>
            ) : (
              memberships.map(m => {
                const bal = balances[m.id] || 0;
                const pts = u?.puntos?.[m.id] || 0;
                const isActive = m.id === activeMundo?.id;
                return (
                  <div key={m.id} className={`flex items-center gap-3 px-5 py-4 border-b border-[#CDD1E4]/30 last:border-0 ${isActive?"bg-[#F2F2F7]":""}`}>
                    <div className="w-10 h-10 rounded-xl bg-[#1A3270] flex items-center justify-center">
                      <span className="text-white font-black text-base">{m.nombre[0]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#1C1C1E] font-bold text-sm">{m.nombre}</p>
                      <p className="text-[#8A8FA8] text-xs">{m.vertical} · {pts.toLocaleString()} pts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#1C1C1E] font-black text-sm">S/ {bal.toFixed(2)}</p>
                      {isActive ? <p className="text-[10px] font-mono text-[#1A3270]">ACTIVO</p>
                        : <button onClick={() => { setActiveMundo(m.id); showToast(`Cambiado a ${m.nombre}`); }} className="text-[10px] font-bold text-[#8A8FA8]">Activar</button>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Settings */}
          <div className="glass-card rounded-3xl overflow-hidden mb-4">
            <p className="text-[#8A8FA8] text-[10px] font-bold uppercase tracking-widest px-5 pt-4 pb-2">Configuración</p>

            <button onClick={() => setModal("privacidad")}
              className="w-full flex items-center gap-3 px-5 py-4 border-t border-[#CDD1E4]/30 tap-active text-left">
              <span className="material-symbols-outlined text-[#8A8FA8]">privacy_tip</span>
              <span className="text-[#404255] text-sm flex-1">Privacidad y datos</span>
              <span className="material-symbols-outlined text-[#CDD1E4] text-sm">chevron_right</span>
            </button>

            <button onClick={() => setModal("terminos")}
              className="w-full flex items-center gap-3 px-5 py-4 border-t border-[#CDD1E4]/30 tap-active text-left">
              <span className="material-symbols-outlined text-[#8A8FA8]">description</span>
              <span className="text-[#404255] text-sm flex-1">Términos y condiciones</span>
              <span className="material-symbols-outlined text-[#CDD1E4] text-sm">chevron_right</span>
            </button>

            <button onClick={() => setModal("ayuda")}
              className="w-full flex items-center gap-3 px-5 py-4 border-t border-[#CDD1E4]/30 tap-active text-left">
              <span className="material-symbols-outlined text-[#8A8FA8]">support_agent</span>
              <span className="text-[#404255] text-sm flex-1">Centro de ayuda</span>
              <span className="material-symbols-outlined text-[#CDD1E4] text-sm">chevron_right</span>
            </button>
          </div>

          {(modal === "privacidad" || modal === "terminos") && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setModal(null)}>
              <div className="glass-card rounded-t-3xl w-full max-w-[430px] max-h-[75vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[#1C1C1E] font-black text-lg">{modal === "privacidad" ? "Privacidad y datos" : "Términos y condiciones"}</h2>
                  <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full bg-[#EEF2FD] flex items-center justify-center tap-active">
                    <span className="material-symbols-outlined text-[#404255] text-lg">close</span>
                  </button>
                </div>
                <p className="text-[#404255] text-sm whitespace-pre-line leading-relaxed">{modal === "privacidad" ? PRIVACIDAD_TEXTO : TERMINOS_TEXTO}</p>
              </div>
            </div>
          )}

          {modal === "ayuda" && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={cerrarAyuda}>
              <div className="glass-card rounded-t-3xl w-full max-w-[430px] max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[#1C1C1E] font-black text-lg">Centro de ayuda</h2>
                  <button onClick={cerrarAyuda} className="w-8 h-8 rounded-full bg-[#EEF2FD] flex items-center justify-center tap-active">
                    <span className="material-symbols-outlined text-[#404255] text-lg">close</span>
                  </button>
                </div>
                {ayudaEnviada ? (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-[#1A3270] text-5xl block mb-2">check_circle</span>
                    <p className="text-[#1C1C1E] font-black text-lg">Enviado</p>
                    <p className="text-[#8A8FA8] text-sm mt-1">{activeMundo?.nombre || "El mundo"} o RedPontis te contactarán pronto.</p>
                    <button onClick={cerrarAyuda} className="mt-5 w-full py-3 rounded-2xl bg-[#1A3270] text-white font-bold text-sm tap-active">Listo</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[#8A8FA8] text-[10px] font-bold uppercase tracking-widest mb-2">¿Sobre qué necesitas ayuda?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIAS_SOPORTE.map(c => (
                          <button key={c.id} onClick={() => setAyudaForm(f => ({ ...f, categoria: c.id }))}
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold text-left tap-active ${ayudaForm.categoria === c.id ? "border-[#1A3270] bg-[#EEF2FD] text-[#1A3270]" : "border-[#CDD1E4] text-[#404255]"}`}>
                            <span className="material-symbols-outlined text-[16px]">{c.icon}</span> {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[#8A8FA8] text-[10px] font-bold uppercase tracking-widest mb-1.5">Asunto</p>
                      <input value={ayudaForm.asunto} onChange={e => setAyudaForm(f => ({ ...f, asunto: e.target.value }))}
                        placeholder="Resumen breve" className="w-full glass-card rounded-xl px-4 py-3 text-sm text-[#1C1C1E] outline-none" />
                    </div>
                    {ayudaForm.categoria === "devolucion" && (
                      <div>
                        <p className="text-[#8A8FA8] text-[10px] font-bold uppercase tracking-widest mb-1.5">Monto reclamado (S/)</p>
                        <input value={ayudaForm.monto} onChange={e => setAyudaForm(f => ({ ...f, monto: e.target.value.replace(/[^0-9.]/g, "") }))}
                          placeholder="0.00" className="w-full glass-card rounded-xl px-4 py-3 text-sm text-[#1C1C1E] outline-none" />
                      </div>
                    )}
                    <div>
                      <p className="text-[#8A8FA8] text-[10px] font-bold uppercase tracking-widest mb-1.5">Cuéntanos qué pasó</p>
                      <textarea value={ayudaForm.detalle} onChange={e => setAyudaForm(f => ({ ...f, detalle: e.target.value }))}
                        rows={4} placeholder="Mientras más detalle, más rápido te ayudamos" className="w-full glass-card rounded-xl px-4 py-3 text-sm text-[#1C1C1E] outline-none resize-none" />
                    </div>
                    <button onClick={enviarTicketAyuda} disabled={!ayudaForm.asunto.trim() || enviandoAyuda}
                      className="w-full py-3.5 rounded-2xl bg-[#1A3270] text-white font-bold text-sm tap-active disabled:opacity-40">
                      {enviandoAyuda ? "Enviando…" : "Enviar"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button onClick={() => { logoutUser(); nav("/auth"); }}
            className="w-full py-4 rounded-2xl border border-red-200 bg-red-50 text-red-500 font-bold text-sm tap-active mb-4">
            Cerrar sesión
          </button>

          <div className="glass-card rounded-2xl py-3 text-center">
            <p className="text-[#CDD1E4] text-xs font-mono">v2.0</p>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
