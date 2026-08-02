import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { MODULE_CATALOG, update, MODULOS_PROXIMAMENTE } from "./store";
import { Icon, Pill, TierTag, BtnPrimary, BtnOutline, Toggle, notify } from "./ui";

const TIER_ORDER = ["CORE", "PREMIUM", "OPCIONAL"];
const TIER_COLOR = { CORE: "bg-primary text-white", PREMIUM: "bg-secondary text-white", OPCIONAL: "bg-tertiary-container text-on-tertiary-container" };

const svLabel = (sv) => typeof sv === "string" ? sv : sv?.nombre || sv?.id || "";

export function ModulosMundo() {
  const st = useStore();
  const nav = useNavigate();
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "matrix"
  const [tierFilter, setTierFilter] = useState("Todos");
  const [mundoFilter, setMundoFilter] = useState("Todos");
  const [catFilter, setCatFilter] = useState("Todos");

  const mundos = (st.mundos || []).filter(m => m.estado === "ACTIVO");
  const CATS = ["Todos", ...new Set(MODULE_CATALOG.map(m => m.category))];

  const filteredMods = MODULE_CATALOG.filter(m =>
    (tierFilter === "Todos" || m.tier === tierFilter) &&
    (catFilter === "Todos" || m.category === catFilter)
  );

  const filteredMundos = mundoFilter === "Todos"
    ? mundos
    : mundos.filter(m => m.id === mundoFilter);

  // Per-module stats
  const modStats = MODULE_CATALOG.reduce((acc, mod) => {
    acc[mod.id] = mundos.filter(m => (m.modulos||[]).some(x => x.id === mod.id && x.enabled)).length;
    return acc;
  }, {});

  // Global stats
  const totalActivaciones = Object.values(modStats).reduce((a, b) => a + b, 0);
  const modsConAlMenosUnMundo = Object.values(modStats).filter(v => v > 0).length;

  const toggleModule = (mundoId, modId, val) => {
    if (MODULOS_PROXIMAMENTE.has(modId)) {
      // Bug real encontrado 29-jul: esta pantalla no chequeaba MODULOS_PROXIMAMENTE
      // (a diferencia de Catalogo.jsx/MundoDetail.jsx, que sí lo hacen) — el toggle
      // parecía funcionar (estado local + toast de éxito) pero syncAllWorlds
      // (supabase.js) salta silenciosamente cualquier capacidad Próximamente, así
      // que nunca llegaba a Supabase. No corrompe datos (nunca hay escritura), pero
      // engañaba al admin haciéndole creer que activó algo que nunca se activó.
      notify("Este módulo está Próximamente — aún no se puede activar para ningún mundo.", "error");
      return;
    }
    update(s => {
      const mu = s.mundos.find(x => x.id === mundoId);
      if (!mu) return;
      if (!mu.modulos) mu.modulos = [];
      let mod = mu.modulos.find(x => x.id === modId);
      if (!mod) {
        const cat = MODULE_CATALOG.find(m => m.id === modId);
        const config = {};
        (cat?.configFields || []).forEach(cf => { config[cf.key] = cf.default; });
        const serviciosActivos = {};
        (cat?.servicios || []).forEach((sv, i) => {
          serviciosActivos[typeof sv === "string" ? sv : sv.id] = i < 3;
        });
        mod = { id: modId, enabled: false, emision: cat?.e || false, adquirencia: cat?.a || false, config, serviciosActivos };
        mu.modulos.push(mod);
      }
      mod.enabled = val;
    });
    const cat = MODULE_CATALOG.find(m => m.id === modId);
    notify(`${cat?.name} ${val ? "activado" : "desactivado"} en ese mundo.`, "info");
  };

  // ── MATRIX VIEW ──────────────────────────────────────────────────────────
  if (viewMode === "matrix") {
    return (
      <div className="max-w-full">
        <ViewHeader viewMode={viewMode} setViewMode={setViewMode} nav={nav}
          tierFilter={tierFilter} setTierFilter={setTierFilter}
          mundoFilter={mundoFilter} setMundoFilter={setMundoFilter}
          catFilter={catFilter} setCatFilter={setCatFilter}
          mundos={mundos} CATS={CATS}
          totalActivaciones={totalActivaciones} modsConAlMenosUnMundo={modsConAlMenosUnMundo}
          totalMods={MODULE_CATALOG.length} totalMundos={mundos.length} />

        <div className="overflow-x-auto rounded-xl border border-outline-variant shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant font-mono text-[11px] uppercase sticky left-0 bg-surface-container-low z-10 min-w-[220px]">
                  Módulo
                </th>
                {filteredMundos.map(m => (
                  <th key={m.id} className="px-3 py-3 font-semibold text-[11px] text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color }}>{m.nombre[0]}</div>
                      <span className="text-on-surface font-semibold leading-tight max-w-[90px] text-center">{m.nombre}</span>
                      {m.redpontis && <span className="text-[8px] font-black text-primary bg-primary-fixed px-1 rounded">RP</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIER_ORDER.map(tier => {
                const tierMods = filteredMods.filter(m => m.tier === tier);
                if (!tierMods.length) return null;
                return (
                  <React.Fragment key={tier}>
                    <tr>
                      <td colSpan={filteredMundos.length + 1} className="px-4 py-2 bg-surface-container border-t border-outline-variant">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${TIER_COLOR[tier] || "bg-outline text-white"}`}>{tier}</span>
                      </td>
                    </tr>
                    {tierMods.map(mod => {
                      const prox = MODULOS_PROXIMAMENTE.has(mod.id);
                      return (
                      <tr key={mod.id} className={`border-t border-outline-variant/50 hover:bg-surface-container-low/50 transition-colors ${prox ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-outline-variant/30">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                              <Icon n={mod.icon} className="text-[18px]" />
                            </div>
                            <div>
                              <p className="font-semibold text-[13px] leading-tight flex items-center gap-1.5">
                                {mod.name}
                                {prox && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-outline-variant/60 text-on-surface-variant">Próximamente</span>}
                              </p>
                              <p className="text-[10px] text-on-surface-variant font-mono">{mod.category}</p>
                            </div>
                          </div>
                        </td>
                        {filteredMundos.map(mundo => {
                          const mm = (mundo.modulos||[]).find(x => x.id === mod.id) || null;
                          const isOn = mm?.enabled || false;
                          return (
                            <td key={mundo.id} className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Toggle checked={isOn && !prox} disabled={prox} onChange={v => toggleModule(mundo.id, mod.id, v)} />
                                {isOn && !prox && (
                                  <button onClick={() => nav(`/admin/mundos/${mundo.id}`)}
                                    className="text-[9px] text-primary hover:underline font-mono">cfg →</button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── CARDS VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">
      <ViewHeader viewMode={viewMode} setViewMode={setViewMode} nav={nav}
        tierFilter={tierFilter} setTierFilter={setTierFilter}
        mundoFilter={mundoFilter} setMundoFilter={setMundoFilter}
        catFilter={catFilter} setCatFilter={setCatFilter}
        mundos={mundos} CATS={CATS}
        totalActivaciones={totalActivaciones} modsConAlMenosUnMundo={modsConAlMenosUnMundo}
        totalMods={MODULE_CATALOG.length} totalMundos={mundos.length} />

      {TIER_ORDER.map(tier => {
        const tierMods = filteredMods.filter(m => m.tier === tier);
        if (!tierMods.length) return null;
        return (
          <div key={tier} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`font-mono text-[11px] font-black uppercase px-3 py-1 rounded ${TIER_COLOR[tier] || "bg-outline text-white"}`}>{tier}</span>
              <div className="flex-1 h-px bg-outline-variant/60" />
              <span className="font-mono text-[10px] text-outline">{tierMods.length} módulos</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {tierMods.map(mod => {
                const prox = MODULOS_PROXIMAMENTE.has(mod.id);
                const mundosActivos = filteredMundos.filter(m =>
                  (m.modulos||[]).some(x => x.id === mod.id && x.enabled)
                );
                const mundosInactivos = filteredMundos.filter(m =>
                  !(m.modulos||[]).some(x => x.id === mod.id && x.enabled)
                );

                return (
                  <div key={mod.id} className={`bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm ${prox ? "opacity-60" : ""}`}>
                    {/* Module header */}
                    <div className="px-5 py-4 border-b border-outline-variant/60 flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                        <Icon n={mod.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{mod.name}</h3>
                          <Pill color="bg-surface-container">{mod.category}</Pill>
                          {prox && <Pill color="bg-outline-variant/60">Próximamente</Pill>}
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-2">{mod.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-black text-primary">{mundosActivos.length}</p>
                        <p className="font-mono text-[8px] uppercase text-outline">{filteredMundos.length > 0 ? `de ${filteredMundos.length}` : "mundos"}</p>
                      </div>
                    </div>

                    {/* Services chips */}
                    {mod.servicios?.length > 0 && (
                      <div className="px-5 py-2.5 border-b border-outline-variant/40 flex gap-1.5 flex-wrap bg-surface-container-low/50">
                        {mod.servicios.slice(0, 4).map((sv, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-surface border border-outline-variant rounded-full font-mono text-[9px] text-on-surface-variant">
                            {svLabel(sv)}
                          </span>
                        ))}
                        {mod.servicios.length > 4 && (
                          <span className="font-mono text-[9px] text-outline">+{mod.servicios.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Active worlds */}
                    {mundosActivos.length > 0 && (
                      <div className="divide-y divide-outline-variant/40">
                        {mundosActivos.map(mundo => {
                          const mm = (mundo.modulos||[]).find(x => x.id === mod.id) || null;
                          const svActivos = Object.values(mm?.serviciosActivos || {}).filter(Boolean).length;
                          const svTotal = mod.servicios?.length || 0;
                          const acuerdo = mm?.acuerdo;
                          return (
                            <div key={mundo.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-container-low/40 transition-colors">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: mundo.color }}>
                                {mundo.nombre[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold truncate">{mundo.nombre}</p>
                                  {mundo.redpontis && <span className="text-[8px] font-black text-primary bg-primary-fixed px-1 rounded">RP</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {mm?.emision && <span className="font-mono text-[9px] text-secondary bg-secondary-fixed px-1.5 rounded">E</span>}
                                  {mm?.adquirencia && <span className="font-mono text-[9px] text-primary bg-primary-fixed px-1.5 rounded">A</span>}
                                  {svTotal > 0 && <span className="font-mono text-[9px] text-outline">{svActivos}/{svTotal} svcs</span>}
                                  {acuerdo?.fijoMensual > 0 && <span className="font-mono text-[9px] text-outline">S/{acuerdo.fijoMensual}/mes</span>}
                                  {acuerdo?.porTx > 0 && <span className="font-mono text-[9px] text-outline">{acuerdo.porTx}% tx</span>}
                                  {mm?.config?.comisionEntrada > 0 && <span className="font-mono text-[9px] text-tertiary">{mm.config.comisionEntrada}% entrada</span>}
                                </div>
                              </div>
                              <button onClick={() => nav(`/admin/mundos/${mundo.id}`)}
                                className="text-[10px] text-primary hover:text-primary/80 font-mono flex items-center gap-0.5 flex-shrink-0">
                                <Icon n="open_in_new" className="text-[12px]" />cfg
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inactive worlds — foldable */}
                    {mundosInactivos.length > 0 && (
                      <div className="px-5 py-3 bg-surface-container-low/50 border-t border-outline-variant/40">
                        <p className="font-mono text-[9px] uppercase text-outline mb-2">No activado en:</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {mundosInactivos.map(mundo => (
                            <button key={mundo.id} disabled={prox}
                              onClick={() => toggleModule(mundo.id, mod.id, true)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full border border-outline-variant bg-surface transition-colors text-[10px] text-on-surface-variant font-mono ${prox ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:text-primary"}`}>
                              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: mundo.color }}/>
                              {mundo.nombre}
                              <Icon n="add" className="text-[10px]" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {mundosActivos.length === 0 && mundosInactivos.length === 0 && (
                      <div className="px-5 py-4 text-center text-xs text-on-surface-variant italic">Sin mundos activos con este filtro.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared header ─────────────────────────────────────────────────────────────
function ViewHeader({ viewMode, setViewMode, nav, tierFilter, setTierFilter, mundoFilter, setMundoFilter, catFilter, setCatFilter, mundos, CATS, totalActivaciones, modsConAlMenosUnMundo, totalMods, totalMundos }) {
  return (
    <>
      {/* Breadcrumb + title */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Plataforma</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Vista por Módulo</span>
          </div>
          <h1 className="text-3xl font-bold">Vista por Módulo</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Qué módulo está activo en qué mundo. Actívalos directamente aquí o entra al mundo para configurar parámetros.</p>
        </div>
        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
            {[["cards","grid_view","Cards"],["matrix","table_chart","Matriz"]].map(([v,ic,l]) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${viewMode===v?"bg-surface-container text-on-surface font-semibold shadow-sm":"text-on-surface-variant hover:bg-surface-container/40"}`}>
                <Icon n={ic} className="text-[14px]" />{l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Módulos en catálogo", value: totalMods, icon: "extension" },
          { label: "Activados en algún mundo", value: modsConAlMenosUnMundo, icon: "check_circle" },
          { label: "Activaciones totales", value: totalActivaciones, icon: "hub" },
          { label: "Mundos activos", value: totalMundos, icon: "public" },
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 flex items-center gap-3">
            <Icon n={s.icon} className="text-primary text-[22px]" />
            <div>
              <p className="text-2xl font-black text-on-surface">{s.value}</p>
              <p className="font-mono text-[9px] uppercase text-outline">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-6">
        <div>
          <p className="font-mono text-[9px] uppercase text-outline mb-1.5">Tier</p>
          <div className="flex bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
            {["Todos","CORE","PREMIUM","OPCIONAL"].map(t => (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${tierFilter===t?"bg-surface-container text-on-surface font-semibold shadow-sm":"text-on-surface-variant"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase text-outline mb-1.5">Categoría</p>
          <div className="flex bg-surface-container-lowest border border-outline-variant rounded-lg p-1 flex-wrap">
            {CATS.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${catFilter===c?"bg-surface-container text-on-surface font-semibold shadow-sm":"text-on-surface-variant"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase text-outline mb-1.5">Filtrar mundo</p>
          <select className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm h-[34px]"
            value={mundoFilter} onChange={e => setMundoFilter(e.target.value)}>
            <option value="Todos">Todos los mundos ({totalMundos})</option>
            {mundos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}
