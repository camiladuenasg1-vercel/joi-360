/**
 * Catálogos Globales — CAPA 1 PLATAFORMA
 * Fuente única de verdad: Capacidades, Medios de Aceptación, Emisión/PSP, Hardware/POS
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { Icon, BtnPrimary, notify, InfoTip } from "./ui";
import { MODULE_CATALOG, MODULOS_PROXIMAMENTE, HARDWARE_CATALOG, REDES_PAGO, CANALES_EMISION, PSP_PROVIDERS, listPosStock, FLAG_UX_MAP, getModuloCatalogo } from "./store";
import { syncCatalogRemote, errorControlado, logErrorControlado } from "./supabase.js";

export function CatalogosGlobales() {
  const nav = useNavigate();
  const st = useStore();
  const [publicando, setPublicando] = React.useState(false);

  // Publica el Catálogo Global (Nivel 1) a Supabase: capacities + flags.
  // La superapp renderiza cualquier capacidad nueva sin tocar su código.
  // Bug real encontrado 29-jul: esto pasaba el MODULE_CATALOG estático crudo,
  // ignorando st.catalogoOverrides — un admin editaba servicios/config en
  // Catalogo.jsx (EditDrawer), veía "actualizado", pero la publicación nunca
  // reflejaba esa edición. Ahora se resuelve el catálogo EFECTIVO (con
  // overrides aplicados, mismo merge que ya usa getModuloCatalogo en cualquier
  // otro lugar del admin) antes de publicar.
  const publicarCatalogo = async () => {
    setPublicando(true);
    try {
      const catalogoEfectivo = MODULE_CATALOG.map(m => getModuloCatalogo(m.id));
      const r = await syncCatalogRemote(catalogoEfectivo, FLAG_UX_MAP);
      notify(`Catálogo publicado: ${r.capacidades} capacidades, ${r.flags} feature flags y ${r.uxAsignados} ux_components asignados (Schema Registry activo).`);
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "publicar-catalogo", null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setPublicando(false); }
  };
  const posStock = listPosStock();
  const posDisponibles = posStock.filter(d=>d.estado==="disponible").length;
  const posAsignados   = posStock.filter(d=>d.estado==="asignado").length;
  const pspActivos     = PSP_PROVIDERS.filter(p=>p.api_ready).length;
  const canalesActivos = CANALES_EMISION.filter(c=>c.disponible).length;

  const SECTIONS = [
    { id:"capacidades", route:"/admin/catalogo",    icon:"extension",
      label:"Capacidades",           badge:"Catálogo maestro",
      count: MODULE_CATALOG.filter(m => !MODULOS_PROXIMAMENTE.has(m.id)).length,
      color:"bg-primary-fixed text-primary",
      desc:"Módulos reutilizables que los mundos activan. Definen qué puede hacer cada mundo." },
    { id:"adquirencia", route:"/admin/adquirencia", icon:"payments",
      label:"Medios de Aceptación",  badge:"Redes de pago",
      count: REDES_PAGO.length,      color:"bg-secondary-fixed text-secondary",
      desc:"Redes disponibles para cobro en comercio: POS, QR, NFC, Tap2Phone." },
    { id:"emision",     route:"/admin/emision",     icon:"account_balance_wallet",
      label:"Emisión / Recargas",    badge:`${canalesActivos} activos · ${pspActivos} PSP`,
      count: CANALES_EMISION.length, color:"bg-violet-100 text-violet-700",
      desc:"Canales de recarga por categoría: billeteras digitales (QR), pasarela de pago (form), transferencia." },
    { id:"hardware",    route:"/admin/hardware-pos", icon:"devices",
      label:"Hardware / POS",        badge:`${posDisponibles} disp · ${posAsignados} asig`,
      count: HARDWARE_CATALOG.length, color:"bg-surface-container text-on-surface",
      desc:"Modelos en stock de RedPontis. Asignación directa a comercios y mundos." },
  ];

  return (
    <div>
      {/* Capa explanation */}
      <div className="mb-8 p-5 bg-primary-fixed/30 border border-primary/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Icon n="layers" className="text-primary text-[24px] mt-0.5 flex-shrink-0"/>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-on-surface">Capa 1 · Plataforma — Fuente única de verdad</h2>
              <InfoTip title="Cómo se relacionan las capas" text={
                <>Todo lo definido aquí es <b className="text-on-surface">global</b> y sirve de base para que los Mundos activen y configuren. Los Mundos no crean capacidades, las activan del catálogo. Los Comercios heredan los medios de pago de Adquirencia. Los canales de recarga son configurables por mundo pero limitados al techo global.</>
              }/>
            </div>
            <div className="flex flex-wrap gap-6 mt-3 text-xs font-mono text-on-surface-variant">
              <span className="flex items-center gap-1"><Icon n="arrow_right" className="text-[14px] text-primary"/> Catálogo define qué existe</span>
              <span className="flex items-center gap-1"><Icon n="arrow_right" className="text-[14px] text-secondary"/> Mundo activa y configura</span>
              <span className="flex items-center gap-1"><Icon n="arrow_right" className="text-[14px] text-tertiary"/> App renderiza dinámicamente</span>
            </div>
          </div>
          <BtnPrimary onClick={publicarCatalogo} disabled={publicando} className="flex-shrink-0 self-start">
            <Icon n="cloud_upload" className="text-[16px]"/> {publicando ? "Publicando…" : "Publicar catálogo en la app"}
          </BtnPrimary>
        </div>
      </div>

      {/* Catalog tiles */}
      <div className="grid md:grid-cols-2 gap-5 mb-10">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => nav(s.route)}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 text-left hover:border-primary/40 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center`}>
                <Icon n={s.icon} className="text-[24px]"/>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-on-surface">{s.count}</p>
                <p className="font-mono text-[9px] uppercase text-outline">{s.badge}</p>
              </div>
            </div>
            <h3 className="font-semibold text-on-surface mb-1">{s.label}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{s.desc}</p>
            <div className="mt-4 flex items-center gap-1 text-primary text-xs font-semibold group-hover:gap-2 transition-all">
              Gestionar <Icon n="arrow_forward" className="text-[14px]"/>
            </div>
          </button>
        ))}
      </div>

      {/* Stock snapshot */}
      <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
        <Icon n="inventory" className="text-secondary"/> Estado del stock de POS
      </h3>
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label:"Total unidades",       val:posStock.length,           icon:"devices" },
          { label:"Disponibles",          val:posDisponibles,            icon:"check_circle",   green:true },
          { label:"Asignados a comercios",val:posAsignados,              icon:"storefront" },
          { label:"En reparación / Baja", val:posStock.filter(d=>["en_reparacion","baja"].includes(d.estado)).length, icon:"build", warn:true },
        ].map(k=>(
          <div key={k.label} className={`bg-surface-container-lowest border rounded-xl p-4 ${k.green?"border-green-200":k.warn?"border-amber-200":"border-outline-variant"}`}>
            <div className="flex justify-between mb-2">
              <span className="font-mono text-[10px] uppercase text-outline leading-tight">{k.label}</span>
              <Icon n={k.icon} className={`text-[18px] ${k.green?"text-green-600":k.warn?"text-amber-600":"text-primary"}`}/>
            </div>
            <p className="text-3xl font-black">{k.val}</p>
          </div>
        ))}
      </div>

      {/* PSP status */}
      <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
        <Icon n="integration_instructions" className="text-violet-600"/> PSP / Proveedores de pago — estado de integración
      </h3>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {PSP_PROVIDERS.map(p=>(
          <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{background:p.color+"18",border:`1px solid ${p.color}30`}}>
              <Icon n={p.logo_icon} className="text-[18px]" style={{color:p.color}}/>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{p.nombre}</p>
              <p className="text-[10px] text-on-surface-variant">{p.categoria.replace("_"," ")} · {p.checkout_type}</p>
              <span className={`mt-1.5 inline-block font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border ${p.api_ready?"bg-green-100 text-green-700 border-green-200":"bg-amber-100 text-amber-700 border-amber-200"}`}>
                {p.api_ready?"✓ Activo en producción":"⏳ Pendiente de integración"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity by tier */}
      <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
        <Icon n="extension" className="text-primary"/> Capacidades por tier
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {["CORE","PREMIUM","OPCIONAL"].map(tier=>{
          const mods=MODULE_CATALOG.filter(m=>m.tier===tier);
          const COLORS={CORE:"bg-primary text-white",PREMIUM:"bg-secondary text-white",OPCIONAL:"bg-tertiary-container text-on-tertiary-container"};
          return (
            <div key={tier} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded ${COLORS[tier]}`}>{tier}</span>
                <span className="text-2xl font-black text-on-surface">{mods.length}</span>
              </div>
              <div className="space-y-1.5">
                {mods.map(m=>(
                  <div key={m.id} className="flex items-center gap-2">
                    <Icon n={m.icon} className="text-[14px] text-outline"/>
                    <span className="text-xs text-on-surface-variant">{m.name}</span>
                    <span className="ml-auto font-mono text-[9px] text-outline">{m.category}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
