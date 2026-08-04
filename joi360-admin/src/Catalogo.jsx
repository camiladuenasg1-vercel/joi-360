/**
 * Catálogo de Capacidades — CAPA 1 PLATAFORMA
 * Define QUÉ EXISTE y CÓMO FUNCIONA cada capacidad.
 * NO define pricing (eso va por mundo).
 * Los servicios son FEATURE FLAGS que controlan qué renderiza el app.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MODULE_CATALOG, update, actualizarModuloCatalogo, getModuloCatalogo, getFlagDev, setFlagDev, DEV_STATUS_META, getFlagUx, MODULOS_PROXIMAMENTE } from "./store";
import { Icon, BtnPrimary, BtnOutline, Pill, Toggle, notify, InfoTip } from "./ui";

const inputCls = "w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30";
const inputLabel = "block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1.5";

const CAT_COLORS = {
  "Emisión":      { dot:"bg-secondary",  pill:"bg-secondary-fixed text-secondary" },
  "Adquirencia":  { dot:"bg-primary",    pill:"bg-primary-fixed text-primary" },
  "Mixto":        { dot:"bg-tertiary",   pill:"bg-tertiary-fixed text-tertiary" },
};

const TIER_COLORS = {
  CORE:"bg-primary text-white",
  PREMIUM:"bg-secondary text-white",
  OPCIONAL:"bg-tertiary-container text-on-tertiary-container",
};

export function Catalogo() {
  const nav = useNavigate();
  const [filter, setFilter] = useState("Todos");
  const [editing, setEditing] = useState(null); // module id being edited
  const categories = ["Todos", "Emisión", "Adquirencia", "Mixto"];
  const tiers = ["CORE", "PREMIUM", "OPCIONAL"];

  const filtered = filter === "Todos" ? MODULE_CATALOG : MODULE_CATALOG.filter(m => m.category === filter);

  return (
    <div className="max-w-5xl">
      {/* Back nav */}
      <button onClick={() => nav("/admin/catalogos")}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-xs font-semibold mb-4 transition-colors">
        <Icon n="arrow_back" className="text-[14px]" /> Catálogos Globales
      </button>

      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] text-outline uppercase tracking-widest mb-1">Plataforma › Catálogos Globales › Capacidades</p>
        <h1 className="text-3xl font-bold mb-2">Catálogo de Capacidades</h1>
        <p className="text-on-surface-variant max-w-2xl">
          Define la <b>naturaleza y comportamiento</b> de cada capacidad del ecosistema.
          Los servicios son <b>feature flags</b> — cada uno controla qué ve y qué puede hacer el usuario en la Super App.
          <span className="text-primary font-semibold"> El pricing se configura por mundo</span> al activar la capacidad.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6">
        <p className="font-mono text-[9px] uppercase tracking-wider text-outline mb-2">Categoría</p>
        <div className="flex bg-surface-container-lowest border border-outline-variant rounded-xl p-1 w-fit">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter===c?"bg-surface-container text-on-surface shadow-sm":"text-on-surface-variant hover:bg-surface-container/40"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tier sections */}
      {tiers.map(tier => {
        const mods = filtered.filter(m => m.tier === tier);
        if (!mods.length) return null;
        return (
          <div key={tier} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`font-mono text-[11px] font-black uppercase px-3 py-1 rounded ${TIER_COLORS[tier]}`}>{tier}</span>
              <div className="flex-1 h-px bg-outline-variant/60" />
              <span className="font-mono text-[10px] text-outline">{mods.length} capacidades</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mods.map(m => {
                const catColor = CAT_COLORS[m.category] || CAT_COLORS.Mixto;
                const svCount = (m.servicios || []).length;
                const svLabel = (sv) => typeof sv === "string" ? sv : sv.nombre;
                const prox = MODULOS_PROXIMAMENTE.has(m.id);

                return (
                  <div key={m.id} className={`bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden transition-all ${prox ? "opacity-60" : "hover:border-primary/30 hover:shadow-sm"}`}>
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                          <Icon n={m.icon} />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${catColor.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
                            {m.category}
                          </span>
                          {prox && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-outline-variant/60 text-on-surface-variant flex items-center gap-1">
                              <Icon n="schedule" className="text-[12px]" /> Próximamente
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-on-surface mb-1">{m.name}</h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed mb-4 line-clamp-3">{m.desc}</p>

                      {/* Nature: what it does in the ecosystem */}
                      <div className="mb-3 p-2.5 bg-surface-container rounded-lg text-[11px] space-y-1">
                        {m.e && m.a ? (
                          <p className="text-on-surface-variant"><b className="text-on-surface">Mixto</b> — afecta wallet del usuario + comercio/POS</p>
                        ) : m.e ? (
                          <p className="text-on-surface-variant"><b className="text-on-surface">Emisión</b> — afecta la wallet y experiencia del usuario</p>
                        ) : (
                          <p className="text-on-surface-variant"><b className="text-on-surface">Adquirencia</b> — afecta al comercio y operación del POS</p>
                        )}
                      </div>

                      {/* Feature flags chips */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(m.servicios || []).slice(0, 3).map((sv, i) => (
                          <span key={i} className="font-mono text-[9px] px-1.5 py-0.5 bg-surface border border-outline-variant rounded text-on-surface-variant">
                            {svLabel(sv)}
                          </span>
                        ))}
                        {svCount > 3 && <span className="font-mono text-[9px] text-outline">+{svCount - 3}</span>}
                      </div>

                      {/* Config fields count */}
                      <div className="flex items-center gap-3 text-[10px] text-outline font-mono">
                        <span>{svCount} feature flags</span>
                        <span>·</span>
                        <span>{(m.configFields || []).length} config fields</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="px-5 py-3 bg-surface-container-low border-t border-outline-variant">
                      <button onClick={() => !prox && setEditing(m.id)} disabled={prox}
                        title={prox ? "Módulo próximamente disponible — aún no se puede activar ni configurar" : undefined}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${prox ? "border-outline-variant/60 text-outline cursor-not-allowed" : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"}`}>
                        <Icon n={prox ? "schedule" : "edit"} className="text-[14px]" /> {prox ? "Próximamente — no disponible" : "Editar servicios y configuración"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit Drawer */}
      {editing && <EditDrawer modId={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── EDIT DRAWER ────────────────────────────────────────────────────────────────
function EditDrawer({ modId, onClose }) {
  const m = MODULE_CATALOG.find(x => x.id === modId);
  const efectivo = getModuloCatalogo(modId);
  const [f, setF] = useState({
    servicios: [...(efectivo.servicios || [])],
    nuevoServicio: "",
  });
  const [tab, setTab] = useState("servicios");

  if (!m) return null;

  const normSv = (sv) => typeof sv === "string" ? { id: sv, nombre: sv, desc: "" } : sv;
  const svLabel = (sv) => typeof sv === "string" ? sv : sv.nombre;

  const save = () => {
    actualizarModuloCatalogo(modId, { servicios: f.servicios });
    notify(`Catálogo de "${m.name}" actualizado.`);
    onClose();
  };

  const addSv = () => {
    if (!f.nuevoServicio.trim()) return;
    const newSv = { id: f.nuevoServicio.trim().toLowerCase().replace(/\s+/g, "_"), nombre: f.nuevoServicio.trim(), desc: "" };
    setF({ ...f, servicios: [...f.servicios, newSv], nuevoServicio: "" });
  };

  const removeSv = (idx) => setF({ ...f, servicios: f.servicios.filter((_, i) => i !== idx) });

  const catColor = CAT_COLORS[m.category] || CAT_COLORS.Mixto;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface shadow-2xl border-l border-outline-variant h-screen flex flex-col z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
            <Icon n={m.icon} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-lg">{m.name}</h2>
              <InfoTip title="Sobre este catálogo" text="Define los feature flags y config fields de esta capacidad, que cada mundo elige y configura al activarla. El pricing se define en el mundo, no aquí." />
            </div>
            <p className="font-mono text-[10px] text-outline uppercase">{m.category} · {m.tier}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1">
            <Icon n="close" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant">
          {[{id:"servicios",label:"Feature Flags"},{id:"config",label:"Config Fields"},{id:"app",label:"Vista en App"}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab===t.id?"border-primary text-primary":"border-transparent text-on-surface-variant"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "servicios" && (
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-secondary-container/20 border border-secondary-container text-xs text-on-surface-variant space-y-1.5">
                <p className="font-semibold text-on-surface flex items-center gap-1">
                  <Icon n="rule" className="text-[14px] text-secondary" /> Nivel 1 · Definición global (RedPontis)
                </p>
                <p>Aquí se <b>define</b> qué flags existen y su <b>estado de desarrollo</b>. Cada flag es un desarrollo independiente del equipo dev. Los mundos solo podrán activar flags en estado <b className="text-green-700">Listo</b> — los demás aparecen bloqueados en su configuración.</p>
              </div>

              <div className="space-y-2">
                {f.servicios.map((sv, idx) => {
                  const n = normSv(sv);
                  const flagId = typeof sv === "string" ? sv : sv.id;
                  const dev = getFlagDev(modId, flagId);
                  const meta = DEV_STATUS_META[dev.status] || DEV_STATUS_META.planned;
                  return (
                    <div key={idx} className="rounded-lg border border-outline-variant overflow-hidden">
                      <div className="flex items-center gap-2 p-3 bg-surface-container-low">
                        <span className={`font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${meta.badge}`}>{meta.label}</span>
                        <span className="text-sm font-medium flex-1">{n.nombre}</span>
                        <select className="text-[10px] font-mono border border-outline-variant rounded px-1 py-0.5 bg-surface"
                          value={dev.status}
                          onChange={e => { setFlagDev(modId, flagId, { status: e.target.value }); setF({...f}); }}>
                          <option value="ready">Listo</option>
                          <option value="in_progress">En desarrollo</option>
                          <option value="planned">Planificado</option>
                        </select>
                        <button onClick={() => removeSv(idx)} className="text-outline hover:text-error p-0.5">
                          <Icon n="close" className="text-[14px]" />
                        </button>
                      </div>
                      {n.desc && (
                        <p className="text-[11px] text-on-surface-variant px-3 py-2 bg-surface border-t border-outline-variant/30">{n.desc}</p>
                      )}
                      {getFlagUx(modId, flagId) && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary-fixed/20 border-t border-outline-variant/30">
                          <Icon n="smartphone" className="text-[13px] text-primary flex-shrink-0"/>
                          <span className="font-mono text-[8px] uppercase tracking-wider text-outline flex-shrink-0">vista en app</span>
                          <span className="text-[10px] text-primary flex-1">{getFlagUx(modId, flagId)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-2 bg-surface border-t border-outline-variant/30">
                        <Icon n="api" className="text-[13px] text-outline flex-shrink-0"/>
                        <input className="flex-1 font-mono text-[10px] bg-transparent focus:outline-none text-on-surface-variant"
                          placeholder="Endpoint backend (EcoreGateway) o «propio»"
                          value={dev.api || ""}
                          onChange={e => { setFlagDev(modId, flagId, { api: e.target.value || null }); setF({...f}); }}/>
                        {dev.api && dev.api !== "propio" && <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">EcoreGateway</span>}
                        {dev.api === "propio" && <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 flex-shrink-0">Desarrollo propio</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input className={inputCls} value={f.nuevoServicio} onChange={e => setF({ ...f, nuevoServicio: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addSv()} placeholder="Nuevo feature flag…" />
                <BtnOutline className="!px-3" onClick={addSv}><Icon n="add" className="text-[16px]" /></BtnOutline>
              </div>
            </div>
          )}

          {tab === "config" && (
            <div className="p-5 space-y-3">
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <Icon n="tune" className="text-[16px] text-amber-500 flex-shrink-0 mt-0.5" />
                <p>Estos campos aparecen en <b>Configurar capacidad → [Mundo]</b> cuando se activa. Son los controles operativos reales que afectan el comportamiento en el app.</p>
              </div>
              <div className="space-y-2">
                {(m.configFields || []).map(cf => (
                  <div key={cf.key} className="rounded-lg border border-outline-variant overflow-hidden">
                    <div className="flex justify-between items-center p-2.5 bg-surface-container-low">
                      <span className="font-medium text-xs text-on-surface flex-1 mr-2">{cf.label}</span>
                      <span className="font-mono text-[10px] text-outline uppercase flex-shrink-0 bg-surface-container px-1.5 py-0.5 rounded">{cf.type}</span>
                    </div>
                    {cf.hint && (
                      <p className="text-[11px] text-on-surface-variant/80 px-3 py-2 bg-surface border-t border-outline-variant/30 italic">{cf.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "app" && (
            <div className="p-5 space-y-4">
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <p className="font-semibold text-sm text-on-surface flex items-center gap-2 mb-3">
                  <Icon n="smartphone" className="text-primary text-[16px]" />
                  Cuando esta capacidad está activa, el usuario ve:
                </p>
                <div className="space-y-2">
                  {(m.servicios || []).map((sv, i) => {
                    const n = normSv(sv);
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-surface">
                        <span className="text-primary font-black mt-0.5 flex-shrink-0">›</span>
                        <div>
                          <p className="text-xs font-medium text-on-surface">{n.nombre}</p>
                          {n.desc && <p className="text-[10px] text-on-surface-variant">{n.desc}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-3 bg-surface-container rounded-xl text-xs text-on-surface-variant">
                <p className="font-semibold text-on-surface mb-1">Config fields que controlan la UI:</p>
                {(m.configFields || []).slice(0, 5).map((cf, i) => (
                  <div key={i} className="flex items-start gap-1.5 mt-1">
                    <Icon n="tune" className="text-[10px] text-outline mt-0.5" />
                    <span><b>{cf.label.split("(")[0].trim()}</b></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-outline-variant flex gap-3 bg-surface-container-lowest">
          <BtnOutline className="flex-1" onClick={onClose}>Cancelar</BtnOutline>
          <BtnPrimary className="flex-1" onClick={save}>
            <Icon n="save" className="text-[16px]" /> Guardar catálogo
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}
