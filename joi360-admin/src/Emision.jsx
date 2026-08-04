/**
 * Emisión / Canales de Recarga — Catálogo Global
 * Muestra canales agrupados por categoría (billetera_digital | pasarela_pago | transferencia)
 * y el catálogo de PSP/Proveedores con su estado de integración.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CANALES_EMISION, PSP_PROVIDERS, CATEGORIAS_EMISION, canalesPorCategoria, update, getState } from "./store";
import { Icon, Toggle, BtnPrimary, BtnOutline, Field, inputCls, notify, InfoTip, NumInput } from "./ui";
import { syncEmissionChannels, pruneStaleEmissionChannels } from "./supabase";

// Empuja el catálogo global a `emission_channels` (Supabase) — antes esta
// tabla era un seed manual congelado que joi360-app leía sin que el admin
// la escribiera nunca; cualquier edición acá (PSP, montos, on/off) se
// perdía en el camino. Se llama en cada guardado del catálogo.
function pushChannelsToSupabase(channels) {
  const rows = channels.map(ch => ({
    id: ch.id, name: ch.nombre, channel_type: ch.checkout_type,
    psp_name: (PSP_PROVIDERS.find(p => p.id === ch.psp_id) || {}).nombre || null,
    monto_min: ch.montoMin, monto_max: ch.montoMax,
    comision_psp: ch.comisionPSP, comision_target: ch.comisionTarget,
    acreditacion_time: ch.tiempoAcreditacion, horario_global: ch.horarioGlobal,
    monedas: ch.monedas, global_active: ch.disponible,
  }));
  syncEmissionChannels(rows).catch(e => console.warn("[emission_channels sync]", e));
  pruneStaleEmissionChannels(channels.map(ch => ch.id)).catch(e => console.warn("[emission_channels prune]", e));
}

const CAT_COLORS = {
  billetera_digital: "bg-violet-100 text-violet-700 border-violet-200",
  pasarela_pago:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  transferencia:     "bg-gray-100 text-gray-600 border-gray-200",
};
const CAT_BG = {
  billetera_digital: "bg-violet-50 border-violet-100",
  pasarela_pago:     "bg-emerald-50 border-emerald-100",
  transferencia:     "bg-gray-50 border-gray-100",
};

export function Emision() {
  const nav = useNavigate();
  const [tab, setTab] = useState("canales");
  const [editing, setEditing] = useState(null);
  const [channels, setChannels] = useState(() => getState().emisionChannels || CANALES_EMISION);
  const [f, setF] = useState(null);

  const grupos = canalesPorCategoria(channels);

  const startEdit = (ch) => { setEditing(ch.id); setF({ ...ch }); };
  const save = () => {
    update(s => {
      if (!s.emisionChannels) s.emisionChannels = [...CANALES_EMISION];
      const idx = s.emisionChannels.findIndex(x => x.id === editing);
      if (idx >= 0) s.emisionChannels[idx] = { ...f };
      else s.emisionChannels.push({ ...f });
    });
    const next = getState().emisionChannels || CANALES_EMISION;
    setChannels(next);
    pushChannelsToSupabase(next);
    setEditing(null); setF(null);
    notify(`Canal "${f.nombre}" actualizado en catálogo global.`);
  };
  const toggleDisponible = (id, val) => {
    update(s => {
      if (!s.emisionChannels) s.emisionChannels = [...CANALES_EMISION];
      const ch = (s.emisionChannels||[]).find(x => x.id === id);
      if (ch) ch.disponible = val;
    });
    const next = getState().emisionChannels || CANALES_EMISION;
    setChannels(next);
    pushChannelsToSupabase(next);
    notify(`Canal ${val ? "habilitado" : "deshabilitado"} globalmente.`);
  };

  return (
    <div className="max-w-5xl">
      <button onClick={() => nav("/admin/catalogos")}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-xs font-semibold mb-4 transition-colors">
        <Icon n="arrow_back" className="text-[14px]"/> Catálogos Globales
      </button>

      <div className="mb-6">
        <p className="font-mono text-[10px] text-outline uppercase tracking-widest mb-1">Plataforma › Catálogos › Emisión</p>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Canales de Emisión / Recargas</h1>
          <InfoTip title="Cómo funciona esta jerarquía" text={
            <>
              <b className="text-on-surface">Catálogo global (aquí)</b> define el techo de montos, comisión PSP y horario.{" "}
              <b className="text-on-surface">Cada mundo</b> activa canales y puede restringir esos límites, nunca ampliarlos.{" "}
              <b className="text-on-surface">La app</b> solo muestra lo que el mundo habilitó.
            </>
          }/>
        </div>
        <p className="text-sm text-on-surface-variant mt-1">Billeteras digitales usan QR nativo · pasarelas renderizan checkout embebido en la app.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant">
        {[{k:"canales",l:"Canales de recarga"},{k:"psp",l:"PSP / Proveedores"}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab===t.k?"text-primary border-primary font-semibold":"text-on-surface-variant border-transparent hover:text-primary"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── CANALES TAB ───────────────────────────────────────────── */}
      {tab === "canales" && (
        <div className="space-y-8">
          {grupos.map(grp => (
            <div key={grp.id}>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-4 ${CAT_COLORS[grp.id]}`}>
                <Icon n={grp.icon} className="text-[14px]"/>{grp.label}
              </div>
              <div className="space-y-3">
                {grp.canales.map(ch => {
                  const psp = PSP_PROVIDERS.find(p=>p.id===ch.psp_id);
                  return (
                    <div key={ch.id} className={`border rounded-xl overflow-hidden transition-all ${ch.disponible?"border-outline-variant":"border-outline-variant/40 opacity-60"}`}>
                      <div className={`p-4 flex items-start gap-4 ${CAT_BG[ch.categoria]}`}>
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                          <Icon n={ch.icon} className="text-[22px] text-on-surface-variant"/>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold">{ch.nombre}</h3>
                            <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border ${CAT_COLORS[ch.categoria]}`}>{ch.categoria.replace("_"," ")}</span>
                            <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-surface-container text-outline">
                              checkout: {ch.checkout_type}
                            </span>
                            {psp && (
                              <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border ${psp.api_ready?"bg-green-100 text-green-700 border-green-200":"bg-amber-100 text-amber-700 border-amber-200"}`}>
                                {psp.api_ready ? "Activo en producción" : "Pendiente de integración"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mb-3">{ch.desc}</p>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                            <Param label="Monto mín." val={`S/ ${ch.montoMin}`} />
                            <Param label="Monto máx." val={ch.montoMax===0?"Sin límite":`S/ ${ch.montoMax}`} />
                            <Param label="Comisión PSP" val={ch.comisionPSP>0?`${ch.comisionPSP}%`:"Gratis"} highlight={ch.comisionPSP>0}/>
                            <Param label="Quién la absorbe" val={ch.comisionTarget==="sponsor"?"Sponsor":"Plataforma"}/>
                            <Param label="Acreditación" val={ch.tiempoAcreditacion}/>
                            <Param label="Horario" val={ch.horarioGlobal}/>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <BtnOutline className="!py-1.5 !px-3 text-xs" onClick={()=>startEdit(ch)}>
                            <Icon n="edit" className="text-[14px]"/> Editar
                          </BtnOutline>
                          <div className="flex flex-col items-center gap-0.5">
                            <Toggle checked={ch.disponible} onChange={v=>toggleDisponible(ch.id,v)}/>
                            <span className="text-[9px] font-mono text-outline">{ch.disponible?"Global ON":"Global OFF"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PSP TAB ────────────────────────────────────────────────── */}
      {tab === "psp" && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs text-on-surface-variant">Proveedores de pago y su estado de integración.</p>
            <InfoTip title="Cómo se activa un PSP" text="Cada PSP tiene su propia integración backend, independiente del resto. Un canal de emisión apunta a un PSP; al activar la integración solo se cambia su estado y se añade el endpoint — sin tocar la UI ni el catálogo de canales."/>
          </div>
          {PSP_PROVIDERS.map(p => (
            <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{background:p.color+"20",border:`1px solid ${p.color}40`}}>
                <Icon n={p.logo_icon} className="text-[20px]" style={{color:p.color}}/>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold">{p.nombre}</p>
                  <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-surface-container text-outline">{p.categoria.replace("_"," ")}</span>
                  <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded bg-surface-container text-outline">checkout: {p.checkout_type}</span>
                  <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border font-bold ${p.api_ready?"bg-green-100 text-green-700 border-green-200":"bg-amber-100 text-amber-700 border-amber-200"}`}>
                    {p.api_ready?"✓ Activo en producción":"⏳ Pendiente de integración"}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mb-2">{p.desc}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-mono text-[10px] text-outline">slug: {p.api_slug}</span>
                  {p.api_endpoint
                    ? <span className="font-mono text-[10px] text-green-700">{p.api_endpoint}</span>
                    : <span className="font-mono text-[10px] text-amber-600">endpoint: pendiente de convenio</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT DRAWER */}
      {editing && f && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={()=>{setEditing(null);setF(null);}}/>
          <div className="relative w-full max-w-md bg-surface shadow-2xl border-l border-outline-variant h-screen flex flex-col z-10 overflow-y-auto">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface z-10">
              <div><h2 className="font-semibold">Editar: {f.nombre}</h2>
                <p className="font-mono text-[10px] text-outline uppercase">Parámetros globales del canal</p></div>
              <button onClick={()=>{setEditing(null);setF(null);}}><Icon n="close"/></button>
            </div>
            <div className="p-5 space-y-4 flex-1">
              <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-lg text-xs text-on-surface-variant">
                Estos parámetros son el <b>techo global</b>. Los mundos pueden restringirlos más, nunca superarlos.
              </div>
              <Field label="PSP / Proveedor">
                <select className={inputCls} value={f.psp_id||""} onChange={e=>setF({...f,psp_id:e.target.value})}>
                  <option value="">Sin PSP (manual)</option>
                  {PSP_PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.api_ready?"API activa":"pendiente"}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monto mínimo (S/)"><NumInput className={inputCls} value={f.montoMin||0} onChange={v=>setF({...f,montoMin:v})}/></Field>
                <Field label="Monto máximo (S/ · 0=sin límite)"><NumInput className={inputCls} value={f.montoMax||0} onChange={v=>setF({...f,montoMax:v})}/></Field>
              </div>
              <Field label="Comisión PSP (%)" hint="Esta comisión la cobra el PSP — RedPontis la traslada al sponsor en la liquidación">
                <NumInput className={inputCls} step="0.01" value={f.comisionPSP||0} onChange={v=>setF({...f,comisionPSP:v})}/>
              </Field>
              <Field label="¿Quién absorbe la comisión PSP?">
                <select className={inputCls} value={f.comisionTarget||"sponsor"} onChange={e=>setF({...f,comisionTarget:e.target.value})}>
                  <option value="sponsor">Sponsor (se descuenta en liquidación)</option>
                  <option value="plataforma">Plataforma RedPontis (absorbido)</option>
                  <option value="usuario">Usuario (se cobra al recargar)</option>
                </select>
              </Field>
              <Field label="Tiempo de acreditación"><input className={inputCls} value={f.tiempoAcreditacion||""} onChange={e=>setF({...f,tiempoAcreditacion:e.target.value})} placeholder="Inmediato, 1-2 min…"/></Field>
              <Field label="Horario global (HH:MM-HH:MM)"><input className={inputCls} value={f.horarioGlobal||"00:00-23:59"} onChange={e=>setF({...f,horarioGlobal:e.target.value})}/></Field>
              <Field label="Descripción"><textarea className={`${inputCls} resize-none`} rows={2} value={f.desc||""} onChange={e=>setF({...f,desc:e.target.value})}/></Field>
              <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
                <Toggle checked={f.disponible} onChange={v=>setF({...f,disponible:v})}/>
                <div><p className="text-sm font-medium">Canal disponible globalmente</p>
                  <p className="text-[10px] text-on-surface-variant">Desactivar previene que cualquier mundo lo habilite</p></div>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-outline-variant flex gap-3 sticky bottom-0 bg-surface">
              <BtnOutline className="flex-1" onClick={()=>{setEditing(null);setF(null);}}>Cancelar</BtnOutline>
              <BtnPrimary className="flex-1" onClick={save}><Icon n="save" className="text-[16px]"/>Guardar</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Param({label,val,highlight}){
  return (
    <div>
      <p className="font-mono text-[8px] uppercase text-outline">{label}</p>
      <p className={`font-semibold text-xs mt-0.5 ${highlight?"text-amber-600":""}`}>{val}</p>
    </div>
  );
}
