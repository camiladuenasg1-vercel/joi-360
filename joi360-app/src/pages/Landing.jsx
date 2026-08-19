import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks.js";
import { useUser, joinMundo, setActiveMundo, logoutUser } from "../userStore.js";
import { getSyntheticUserId, getOrCreateWallet } from "../supabaseClient.js";
import MundoInfoModal from "../components/MundoInfoModal.jsx";

export default function LandingPage() {
  const nav = useNavigate();
  const st = useStore();
  const u = useUser();
  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState(null);
  // Antes "Unirme" te dejaba directo en el Hub sin mostrar nada más que lo
  // que ya cabía en la card — ahora abre un detalle completo primero, y solo
  // ahí adentro está el botón real de unión (Task de UX pedida por la usuaria).
  const [preview, setPreview] = useState(null); // { mundo, mode: "preview" | "success" }

  // Filtro rápido por vertical (Educación, Retail, etc.) — antes solo se
  // podía filtrar escribiendo el nombre de la vertical a mano en el buscador.
  const [verticalFiltro, setVerticalFiltro] = useState("Todas");

  const publicMundos = (st.mundos || []).filter(m => m.estado === "ACTIVO" && !m.fixed && !m.redpontis);
  const verticales = [...new Set(publicMundos.map(m => m.vertical).filter(Boolean))].sort();
  const filtered = publicMundos.filter(m =>
    (verticalFiltro === "Todas" || m.vertical === verticalFiltro) &&
    (search === "" ||
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.vertical?.toLowerCase().includes(search.toLowerCase()))
  );
  const joined = u?.memberships || [];
  const isFirstTime = joined.length === 0;

  const VERTICAL_COLORS = {
    "Educación":          { bg:"bg-blue-50",   border:"border-blue-100",   badge:"bg-blue-600",   text:"text-blue-700" },
    "Centro Comercial":   { bg:"bg-teal-50",   border:"border-teal-100",   badge:"bg-teal-600",   text:"text-teal-700" },
    "Empresa":            { bg:"bg-slate-50",  border:"border-slate-100",  badge:"bg-slate-600",  text:"text-slate-700" },
    "Club":               { bg:"bg-green-50",  border:"border-green-100",  badge:"bg-green-600",  text:"text-green-700" },
    "Especial RedPontis": { bg:"bg-purple-50", border:"border-purple-100", badge:"bg-purple-600", text:"text-purple-700" },
  };

  const abrirPreview = (m) => setPreview({ mundo: m, mode: "preview" });

  const confirmarUnion = async () => {
    const m = preview.mundo;
    setJoining(m.id);
    // Antes "unirse" era 100% local (memberships en localStorage) — la
    // wallet recién se creaba la primera vez que la persona abría la
    // pestaña Wallet de ese mundo. Si nunca la abría (o lo hacía desde otro
    // dispositivo), el POS no encontraba ninguna fila en `wallets` al
    // buscarla por su código JOI y respondía "usuario no reconocido",
    // aunque la cuenta y la membresía fueran reales. Se crea acá, al
    // momento de unirse, para que exista desde el primer instante.
    const walletMod = (m.modulos || []).find(x => x.id === "wallet" && x.enabled);
    if (walletMod) {
      await getOrCreateWallet(getSyntheticUserId(), m.id).catch(() => {});
    }
    joinMundo(m.id); setActiveMundo(m.id);
    setJoining(null);
    setPreview({ mundo: m, mode: "success" });
  };

  const irAlHub = () => nav("/hub");

  return (
    <div className="min-h-screen aura-bg">
      <div className="max-w-[430px] mx-auto pb-20">

        {/* Header */}
        <div className="px-5 pt-12 pb-5">

          {/* Top bar — salida y estado */}
          <div className="flex items-center justify-between mb-6">
            {isFirstTime ? (
              /* Primera vez: solo opción de salir / logout */
              <button
                onClick={() => { logoutUser(); nav("/auth"); }}
                className="flex items-center gap-1.5 text-[#8A8FA8] text-xs font-semibold hover:text-[#404255] transition-colors">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Salir
              </button>
            ) : (
              /* Ya tiene mundos: volver al hub */
              <button
                onClick={() => nav("/hub")}
                className="flex items-center gap-1.5 text-[#8A8FA8] text-xs font-semibold hover:text-[#404255] transition-colors">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Mi hub
              </button>
            )}

            {/* Badge de estado */}
            {isFirstTime ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider">Sin comunidad</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-green-700 text-[10px] font-bold uppercase tracking-wider">{joined.length} comunidad{joined.length !== 1 ? "es" : ""}</span>
              </div>
            )}
          </div>

          {/* Título */}
          <p className="text-[#8A8FA8] text-[11px] font-mono uppercase tracking-widest mb-2">JOI 360 · ECOSISTEMA</p>
          <h1 className="text-3xl font-black text-[#1C1C1E] leading-tight">
            {isFirstTime ? "Elige tu\ncomunidad" : "Explorar\ncomunidades"}
          </h1>
          <p className="text-[#8A8FA8] text-sm mt-2 leading-relaxed">
            {isFirstTime
              ? "Cada mundo activa módulos, billetera y condiciones propias."
              : "Únete a más comunidades para acceder a sus servicios."}
          </p>

          {/* Empty state banner — solo si no tiene ninguna comunidad */}
          {isFirstTime && (
            <div className="mt-4 glass-card rounded-2xl p-4 flex items-start gap-3 border border-amber-100 bg-amber-50/60">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined fill text-amber-600 text-base">info</span>
              </div>
              <div>
                <p className="text-amber-900 font-bold text-sm">Necesitas unirte a al menos una comunidad</p>
                <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
                  Selecciona una comunidad debajo para activar tu billetera y acceder a sus módulos.
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-3 glass-card rounded-2xl px-4 py-3 mt-4">
            <span className="material-symbols-outlined text-[#8A8FA8] text-xl">search</span>
            <input
              className="flex-1 bg-transparent text-[#1C1C1E] placeholder-[#CDD1E4] outline-none text-sm"
              placeholder="Buscar por nombre o tipo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[#CDD1E4] hover:text-[#8A8FA8] transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Filtro rápido por vertical */}
          {verticales.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-3 pb-1">
              {["Todas", ...verticales].map(v => (
                <button key={v} onClick={() => setVerticalFiltro(v)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    verticalFiltro === v ? "bg-[#1A3270] text-white" : "glass-card text-[#8A8FA8]"}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de comunidades */}
        <div className="px-5 space-y-4">

          {/* RedPontis fixed worlds — always shown at top, pinned */}
          {search === "" && (() => {
            const rpWorlds = (st.mundos||[]).filter(m=>m.redpontis && m.estado==="ACTIVO");
            if (!rpWorlds.length) return null;
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background:"linear-gradient(135deg,#3B5BDB,#3B5BDB)"}}>
                    <span className="text-white text-[9px] font-black uppercase tracking-widest">Especial JOI Solutions</span>
                  </div>
                  <p className="text-[11px] font-bold text-[#8A8FA8] uppercase tracking-wider">Siempre disponibles</p>
                </div>
                {rpWorlds.map(m=>{
                  const isJoined = joined.includes(m.id);
                  const evCfg = m.eventosConfig;
                  return (
                    <div key={m.id} className="rounded-3xl overflow-hidden border border-purple-100 glass-card"
                      style={{background:"linear-gradient(135deg,rgba(114,44,227,0.04) 0%,rgba(255,255,255,0.95) 100%)"}}>
                      <div className="px-5 pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 overflow-hidden"
                            style={{background:m.color}}>
                            {m.logoUrl ? (
                              <img src={m.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined fill text-xl">
                                {m.type==="eventos_rp"?"confirmation_number":"campaign"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-[#1C1C1E] text-base">{m.nombre}</h3>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{background:m.color}}>JOI</span>
                            </div>
                            <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">{m.vertical}</p>
                          </div>
                          {isJoined && <span className="text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Miembro</span>}
                        </div>
                        <p className="text-xs text-[#404255] leading-relaxed mb-3">{m.descripcion}</p>
                        {m.type === "eventos_rp" && (
                          <div className="flex items-start gap-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                            <span className="material-symbols-outlined fill text-purple-600 text-base mt-0.5">edit_calendar</span>
                            <p className="text-xs text-purple-800 leading-snug">
                              <b>Puedes crear y publicar eventos aquí.</b> Asocia una entidad legal existente o registra una nueva.
                              {!evCfg?.comisionEntrada && " · Sin comisión en fase 0."}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="px-5 py-4 bg-white/70">
                        <button
                          onClick={()=> isJoined ? nav("/hub") : abrirPreview(m)}
                          className="w-full py-3.5 rounded-2xl font-black text-sm transition-all tap-active flex items-center justify-center gap-2 text-white"
                          style={{background:`linear-gradient(135deg,${m.color},#3B5BDB)`,boxShadow:`0 4px 14px ${m.color}40`}}>
                          {isJoined ? (
                            <><span className="material-symbols-outlined fill text-base">home</span>Ir a {m.nombre} →</>
                          ) : (
                            "Ver detalle →"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="h-px bg-[#CDD1E4]/70 my-2"/>
              </div>
            );
          })()}

          {/* Empty state — sin resultados de búsqueda */}
          {filtered.length === 0 && publicMundos.length > 0 && (
            <div className="text-center py-12 glass-card rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF2FD] flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-[#CDD1E4]">search_off</span>
              </div>
              <p className="text-[#404255] text-sm font-bold">Sin resultados</p>
              <p className="text-[#8A8FA8] text-xs mt-1">Intenta con otro término</p>
              <button onClick={() => setSearch("")}
                className="mt-3 text-[#1A3270] text-xs font-bold hover:underline">
                Limpiar búsqueda
              </button>
            </div>
          )}

          {/* Empty state — sin mundos publicados por el admin */}
          {publicMundos.length === 0 && (
            <div className="text-center py-16 glass-card rounded-3xl">
              <div className="w-16 h-16 rounded-3xl bg-[#EEF2FD] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-[#CDD1E4]">public_off</span>
              </div>
              <p className="text-[#404255] text-base font-bold mb-1">Aún no hay comunidades</p>
              <p className="text-[#8A8FA8] text-sm leading-relaxed max-w-[220px] mx-auto">
                Las comunidades las habilita RedPontis desde el panel de administración.
              </p>
              <div className="mt-6 mx-6 p-4 bg-[#EEF2FD] rounded-2xl text-left">
                <p className="text-[#1A3270] text-xs font-bold mb-1">¿Eres administrador?</p>
                <p className="text-[#8A8FA8] text-xs">Ve a <b>joi360-admin.vercel.app</b> y crea un mundo en estado ACTIVO.</p>
              </div>
              <button onClick={() => { logoutUser(); nav("/auth"); }}
                className="mt-6 text-[#8A8FA8] text-xs font-semibold hover:text-[#404255] transition-colors flex items-center gap-1 mx-auto">
                <span className="material-symbols-outlined text-sm">logout</span>
                Cerrar sesión
              </button>
            </div>
          )}

          {/* Todas las comunidades — segunda sección, separada de "Especial JOI Solutions" */}
          {filtered.length > 0 && (
            <p className="text-[11px] font-bold text-[#8A8FA8] uppercase tracking-wider">Todas las comunidades</p>
          )}
          {filtered.map(m => {
            const vc = VERTICAL_COLORS[m.vertical] || { bg:"bg-gray-50", border:"border-gray-100", badge:"bg-gray-600", text:"text-gray-700" };
            const isJoined = joined.includes(m.id);
            const servCount = (m.modulos || []).filter(x => x.enabled).length;
            const comCount = (st.comercios || []).filter(c => c.mundoId === m.id).length;

            return (
              <div key={m.id}
                className={`glass-card rounded-3xl overflow-hidden border transition-all ${vc.border} ${isJoined ? "ring-2 ring-[#1A3270]/20" : ""}`}>

                {/* Card header */}
                <div className={`${vc.bg} px-5 pt-5 pb-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${vc.badge} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}>
                        {m.logoUrl ? (
                          <img src={m.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-black text-xl">{m.nombre[0]}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-[#1C1C1E] font-black text-base leading-tight">{m.nombre}</h3>
                        <span className={`text-[10px] font-black ${vc.text} uppercase tracking-wider`}>{m.vertical}</span>
                      </div>
                    </div>
                    {isJoined && (
                      <div className="flex items-center gap-1 flex-shrink-0 bg-green-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined fill text-[10px]">check_circle</span>
                        Miembro
                      </div>
                    )}
                  </div>

                  <p className="text-[#404255] text-xs mt-3 leading-relaxed line-clamp-2">
                    {m.descripcion || `Comunidad ${m.vertical} con servicios integrados JOI 360.`}
                  </p>

                  {/* Meta chips */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <span className="text-[#8A8FA8] text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">apps</span>
                      <b className="text-[#1C1C1E]">{servCount}</b> servicios
                    </span>
                    <span className="text-[#8A8FA8] text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">storefront</span>
                      <b className="text-[#1C1C1E]">{comCount}</b> comercios
                    </span>
                    <span className="text-[#8A8FA8] text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">monetization_on</span>
                      {m.moneda || "PEN"}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 py-4 bg-white">
                  <button
                    onClick={() => isJoined ? nav("/hub") : abrirPreview(m)}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all tap-active flex items-center justify-center gap-2
                      ${isJoined
                        ? "bg-[#EEF2FD] text-[#1A3270] border border-[#DCE4FA]"
                        : "text-white"}`}
                    style={!isJoined ? {
                      background: "linear-gradient(135deg,#1A3270,#3B5BDB)",
                      boxShadow: "0 4px 14px rgba(26,50,112,0.25)"
                    } : {}}>
                    {isJoined ? (
                      <>
                        <span className="material-symbols-outlined fill text-base">home</span>
                        Ir a mi hub →
                      </>
                    ) : (
                      "Ver detalle →"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — solo si ya tiene mundos */}
        {!isFirstTime && (
          <div className="px-5 mt-6 text-center">
            <button onClick={() => nav("/hub")}
              className="glass-card px-6 py-3 rounded-2xl text-[#1A3270] text-sm font-bold tap-active inline-flex items-center gap-2">
              <span className="material-symbols-outlined fill text-base">home</span>
              Volver a mi hub
            </button>
          </div>
        )}
      </div>

      {preview && (
        <MundoInfoModal
          mundo={preview.mundo}
          mode={preview.mode}
          loading={joining === preview.mundo.id}
          comerciosCount={(st.comercios || []).filter(c => c.mundoId === preview.mundo.id).length}
          onClose={() => setPreview(null)}
          onConfirm={preview.mode === "success" ? irAlHub : confirmarUnion}
        />
      )}
    </div>
  );
}
