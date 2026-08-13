import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { update, uid, MODULE_CATALOG, CORE_IDS, VERTICALS, GIROS_POR_VERTICAL, modosDeMundo, MODULOS_PROXIMAMENTE, MONEDAS_CATALOG } from "./store";
import { Icon, Pill, TierTag, Toggle, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify, NumInput } from "./ui";
import { uploadArchivo, fetchGruposRemote } from "./supabase.js";

const COLORS = ["#0035b9", "#006688", "#722ce3", "#0e7c43", "#b3541e"];
const PAISES = ["Perú", "Chile", "Colombia", "México", "Ecuador", "Bolivia"];
const ACUERDOS = [
  { k: "transaccional", t: "Transaccional puro", d: "Solo % sobre volumen procesado. Sin fijos. Ideal para validar." },
  { k: "revenue", t: "Revenue puro", d: "Fee fijo mensual. Sin variable. Predecible para el sponsor." },
  { k: "mixto", t: "Mixto (recomendado)", d: "Fijo mensual + % transaccional. Cubre operación base y escala con uso." },
  { k: "fijo", t: "Venta fija", d: "Pago único o periódico cerrado. Sin variable. Proyectos acotados." },
];
// Vigencia del acuerdo es una fecha específica (no un dropdown de meses) —
// se sugiere +12 meses desde hoy como punto de partida editable.
function vigenciaPorDefecto() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function Mundos() {
  const st = useStore();
  const nav = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filtroVertical, setFiltroVertical] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroAcuerdo, setFiltroAcuerdo] = useState("Todos");
  const [search, setSearch] = useState("");

  const verticalesDisponibles = [...new Set((st.mundos||[]).map(m => m.vertical))].sort();
  const mundosFiltrados = (st.mundos||[]).filter(m =>
    (filtroVertical === "Todos" || m.vertical === filtroVertical) &&
    (filtroEstado === "Todos" || m.estado === filtroEstado) &&
    (filtroAcuerdo === "Todos" || m.acuerdo?.tipo === filtroAcuerdo) &&
    (search === "" || m.nombre.toLowerCase().includes(search.toLowerCase()) || (m.entidadLegal || "").toLowerCase().includes(search.toLowerCase()) || (m.codigo || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Ecosystem Management</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Mundos</span>
          </div>
          <h1 className="text-3xl font-bold">Mundos</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">Comunidades configuradas en Lima–Perú: cada mundo tiene contexto + vertical + entidad legal + acuerdo comercial + módulos contratados.</p>
        </div>
        <BtnPrimary onClick={() => setWizardOpen(true)}><Icon n="add" className="text-[18px]" /> Crear Mundo</BtnPrimary>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
          <input className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-surface" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar mundo, entidad o código..." />
        </div>
        <select className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface" value={filtroVertical} onChange={e => setFiltroVertical(e.target.value)}>
          <option value="Todos">Todas las verticales</option>
          {verticalesDisponibles.map(v => <option key={v}>{v}</option>)}
        </select>
        <select className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="Todos">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
        <select className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface" value={filtroAcuerdo} onChange={e => setFiltroAcuerdo(e.target.value)}>
          <option value="Todos">Todos los acuerdos</option>
          {["transaccional","mixto","revenue","fijo"].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
        </select>
        <span className="flex items-center text-xs text-on-surface-variant font-mono">{mundosFiltrados.length} de {(st.mundos||[]).length}</span>
      </div>
      {mundosFiltrados.length === 0 && (
        <div className="col-span-3 flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <Icon n="search_off" className="text-[48px] text-outline mb-4" />
          <p className="font-semibold text-lg">Sin resultados</p>
          <p className="text-sm mt-1">Prueba con otros filtros o crea un nuevo mundo.</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mundosFiltrados.map(m => {
          const nMod = (m.modulos||[]).filter(x => x.enabled).length;
          const nCom = (st.comercios||[]).filter(c => c.mundoId === m.id).length;
          const ac = m.acuerdo;
          // Un mundo cuyo dashboard nunca se entregó al sponsor no está
          // operativo de verdad, aunque su estado interno diga ACTIVO — sin
          // esto RedPontis no podía distinguir de un vistazo cuáles mundos
          // todavía no arrancan. No aplica a los mundos de plataforma (RP).
          const pendienteActivacion = !m.redpontis && !m.entrega?.entregado;
          return (
            <div key={m.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm hover:border-primary/40 transition-colors flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ background: m.color }}></div>
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white relative overflow-hidden" style={{ background: m.color }}>
                    {m.logoUrl ? (
                      <img src={m.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon n={m.type === "eventos_rp" ? "confirmation_number" : m.type === "promos_rp" ? "campaign" : m.type === "eventos" ? "confirmation_number" : "public"} />
                    )}
                    {m.redpontis && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary border-2 border-white flex items-center justify-center">
                        <span className="text-white font-black text-[7px]">RP</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.redpontis && <span className="font-mono text-[9px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded uppercase font-bold">REDPONTIS</span>}
                    {m.fixed && !m.redpontis && <span className="font-mono text-[9px] bg-surface-container px-1.5 py-0.5 rounded uppercase text-on-surface-variant">FIJO</span>}
                    {pendienteActivacion
                      ? <Pill color="bg-tertiary">PENDIENTE</Pill>
                      : <Pill color={m.estado === "ACTIVO" ? "bg-ok" : "bg-outline"}>{m.estado}</Pill>}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">{m.nombre}</h3>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-2">{m.codigo} · {m.vertical} · {m.moneda}</p>
                <p className="text-sm text-on-surface-variant line-clamp-2">{m.descripcion}</p>
                {/* Eventos config summary */}
                {m.eventosConfig && (
                  <div className="mt-3 px-2.5 py-2 bg-primary-fixed/30 border border-primary/20 rounded-lg text-[11px] space-y-1">
                    <p className="font-mono uppercase text-primary font-bold">Motor de Eventos</p>
                    <p className="text-on-surface-variant">✓ {modosDeMundo(m).map(k => ({b2b:"B2B", b2c:"B2C", embebido:"Embebido"}[k])).join(" + ")} activo</p>
                    <p className="text-on-surface-variant">✓ Comisión {m.eventosConfig.comisionEntrada||0}% por entrada</p>
                  </div>
                )}
                {ac && !m.eventosConfig && (
                  <div className="mt-3 px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded text-[11px] font-mono uppercase text-on-surface-variant">
                    Acuerdo: <b className="text-primary">{ac.tipo}</b> {ac.nota ? `· ${ac.nota}` : `${ac.revShare ? `· ${ac.revShare}%` : ""} ${ac.fijoMensual ? `+ S/${ac.fijoMensual}/mes` : ""}`}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-outline-variant/60 flex justify-between font-mono text-[11px] text-outline">
                  <span>{nMod} módulos</span>
                  <span>{nCom} comercios</span>
                </div>
              </div>
              <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex gap-3">
                <BtnOutline className="flex-1 !py-2" onClick={() => nav(`/mundo/${m.id}`)}>Ver frente</BtnOutline>
                <BtnPrimary className="flex-1 !py-2" onClick={() => nav(`/admin/mundos/${m.id}`)}>Configurar</BtnPrimary>
              </div>
            </div>
          );
        })}
      </div>

      <MundoWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

/* ============== WIZARD (6 pasos):
   1. Identidad/Contexto del Mundo (vertical, nombre, color, descripción)
   2. Entidad legal asociada (razón social, RUC, moneda)
   3. Módulos a contratar
   4. Acuerdo comercial (revenue / transaccional / mixto / fijo + vigencia)
   5. Estrategia de Eventos (si aplica)
   6. Resumen y habilitación
============== */
export function MundoWizard({ open, onClose }) {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [creando, setCreando] = useState(false);
  const blank = {
    // Paso 1: contexto
    nombre: "", vertical: "Educación", giro: GIROS_POR_VERTICAL["Educación"][0], color: COLORS[0], descripcion: "", codigo: "",
    pais: PAISES[0], logoUrl: "",
    // Paso 2: entidad legal (bancaria retirada — cuenta EDE JetCash se
    // aprovisiona automáticamente, ver comentario en Step2Entidad más abajo)
    entidadLegal: "", ruc: "", moneda: "PEN", direccionLegal: "",
    grupoId: null, compartesaldoGrupo: false,
    // Paso 3: representante, contacto y documentos
    apoderadoNombre: "", apoderadoDocumento: "", apoderadoCorreo: "",
    contactoNombre: "", contactoDocumento: "", contactoCorreo: "",
    docContrato: false, docFichaRuc: false, docContratoUrl: "", docContratoNombre: "",
    docFichaRucUrl: "", docFichaRucNombre: "",
    // Paso 4: servicios/módulos
    modulos: Object.fromEntries(MODULE_CATALOG.map(m => [m.id, m.tier === "CORE" || m.base])),
    flags: Object.fromEntries(MODULE_CATALOG.map(m => [m.id, { e: m.e, a: m.a }])),
    // Sub-config inicial por módulo, editable inline al togglear (doc: "cada
    // toggle activado despliega su propio sub-formulario de configuración
    // inicial"). Solo se usa si el admin ajusta algo — si no, habilitar()
    // sigue cayendo a cf.default como antes.
    moduleConfig: {},
    // Paso 5: acuerdo
    acuerdo: { tipo: "mixto", revShare: 5, fijoMensual: 1500, setup: 5000, vigencia: vigenciaPorDefecto(), frecuenciaLiquidacion: "mensual" },
    // Paso 6: eventos — B2B es automático para todo mundo regular (ver modosDeMundo);
    // acá solo se decide si además se activa Embebido.
    eventosEmbebido: false,
    confirm: false,
  };
  const [f, setF] = useState(blank);

  const close = () => { setStep(1); setF(blank); onClose(); };
  const set = (patch) => setF(prev => ({ ...prev, ...patch }));
  const selectedMods = MODULE_CATALOG.filter(m => f.modulos[m.id]);
  const eventosOn = f.modulos["eventos"];

  const canNext =
    step === 1 ? f.nombre && f.descripcion :
    step === 2 ? f.entidadLegal && f.ruc :
    step === 3 ? f.contactoNombre && f.contactoCorreo :
    step === 4 ? selectedMods.length > 0 :
    step === 5 ? true :
    step === 6 ? !!f.acuerdo.tipo : f.confirm;

  // Calcular costo estimado mensual del acuerdo
  const costoModulosFijo = selectedMods.reduce((sum, m) => sum + (m.pricing?.fijoMensual || 0), 0);
  const costoModulosSetup = selectedMods.reduce((sum, m) => sum + (m.pricing?.setup || 0), 0);

  const next = () => {
    // Saltar paso 5 (eventos) si no se eligió módulo de eventos
    if (step === 4 && !eventosOn) setStep(6);
    else setStep(step + 1);
  };
  const back = () => {
    if (step === 6 && !eventosOn) setStep(4);
    else setStep(step - 1);
  };

  // Sin guarda contra doble-click/doble-tap, dos clics rápidos en "Habilitar
  // Mundo" empujaban DOS mundos reales a Supabase (update() es síncrono, pero
  // el botón seguía habilitado hasta que React re-renderizara) — así apareció
  // un duplicado vacío de Colegio Raimondi en vivo (10-ago). Mismo patrón que
  // ya se corrigió en crear()/activar() de MundoDetail.jsx y OrganizadorFront.jsx.
  const habilitar = () => {
    if (creando) return;
    setCreando(true);
    const id = uid("mundo");
    update(st => {
      (st.mundos||(st.mundos=[])); st.mundos.push({
        id, fixed: false, type: "standard",
        nombre: f.nombre,
        codigo: f.codigo || `${f.vertical.slice(0, 2).toUpperCase()}-LIM-${String((st.mundos||[]).length + 1).padStart(3, "0")}`,
        vertical: f.vertical, giro: f.giro, pais: f.pais, logoUrl: f.logoUrl || null,
        entidadLegal: f.entidadLegal, ruc: f.ruc, moneda: f.moneda, direccionLegal: f.direccionLegal,
        grupoId: f.grupoId || null, compartesaldoGrupo: !!f.compartesaldoGrupo,
        apoderadoNombre: f.apoderadoNombre, apoderadoDocumento: f.apoderadoDocumento, apoderadoCorreo: f.apoderadoCorreo,
        contactoNombre: f.contactoNombre, contactoDocumento: f.contactoDocumento, contactoCorreo: f.contactoCorreo,
        docContrato: f.docContrato, docFichaRuc: f.docFichaRuc,
        contratoUrl: f.docContratoUrl || null, contratoNombre: f.docContratoNombre || null,
        fichaRucUrl: f.docFichaRucUrl || null, fichaRucNombre: f.docFichaRucNombre || null,
        estado: "ACTIVO", color: f.color, descripcion: f.descripcion,
        modulos: selectedMods.map(m => {
          const config = {};
          (m.configFields || []).forEach(cf => { config[cf.key] = f.moduleConfig[m.id]?.[cf.key] ?? cf.default; });
          const serviciosActivos = {};
          // Bug real: cuando servicios es un array de objetos {id,nombre,desc}
          // (wallet/comercios/consumos/control/eventos/inventario/perfil_ext),
          // usar sv directo como key coerciona el objeto a la cadena literal
          // "[object Object]" — nunca el id real. syncAllWorlds luego creaba
          // ese flag basura en vez de los flags reales del módulo.
          (m.servicios || []).forEach((sv, i) => { serviciosActivos[typeof sv === "string" ? sv : sv.id] = i < 3; });
          return {
            id: m.id, enabled: true,
            emision: m.e && f.flags[m.id].e,
            adquirencia: m.a && f.flags[m.id].a,
            config, serviciosActivos,
            acuerdo: { ...m.pricing, gratuito: true },
          };
        }),
        acuerdo: { ...f.acuerdo },
        entrega: { entregado: false, credenciales: null, fechaEntrega: null, emailEntrega: f.contactoCorreo },
        sponsorConfig: { bienvenida: `¡Hola, {nombre}! Bienvenido al ecosistema ${f.nombre}.`, bannerTitulo: "", bannerActivo: false, comerciosOcultos: [] },
        eventosConfig: eventosOn ? {
          embebidoActivo: f.eventosEmbebido, comisionEntrada: 5,
        } : null,
        createdAt: Date.now(),
      });
    });
    close();
    notify(`Mundo "${f.nombre}" habilitado. Usa "Entregar Dashboard" en su ficha para enviar el primer acceso a ${f.contactoNombre}.`);
    nav(`/admin/mundos/${id}`);
  };

  const stepTitle = ["", "Contexto del Mundo", "Entidad legal y bancaria", "Representante y contacto", "Servicios a contratar", "Estrategia de Eventos", "Acuerdo comercial", "Resumen y habilitación"][step];
  const totalSteps = eventosOn ? 7 : 6;
  const displayStep = step <= 4 ? step : (eventosOn ? step : step - 1);

  return (
    <Drawer open={open} onClose={close} icon="public" title={stepTitle} subtitle={`Crear nuevo mundo · Paso ${displayStep} de ${totalSteps}`} width="w-[560px]"
      footer={<>
        {step > 1 && <BtnOutline onClick={back}>Atrás</BtnOutline>}
        {step < 7
          ? <BtnPrimary disabled={!canNext} onClick={next}>Siguiente <Icon n="arrow_forward" className="text-[16px]" /></BtnPrimary>
          : <BtnPrimary disabled={!canNext || creando} loading={creando} loadingLabel="Habilitando…" onClick={habilitar}><Icon n="rocket_launch" className="text-[16px]" /> Habilitar Mundo</BtnPrimary>}
      </>}>

      <div className="flex items-center gap-1.5 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const n = i + 1;
          const realStep = displayStep;
          return (
            <React.Fragment key={n}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${n <= realStep ? "bg-primary text-white" : "bg-surface-container border border-outline-variant text-on-surface-variant"}`}>{n}</div>
              {n < totalSteps && <div className="h-px flex-1 bg-outline-variant"></div>}
            </React.Fragment>
          );
        })}
      </div>

      {step === 1 && <Step1Contexto f={f} set={set} />}
      {step === 2 && <Step2Entidad f={f} set={set} />}
      {step === 3 && <Step3Representantes f={f} set={set} />}
      {step === 4 && <Step4Servicios f={f} set={set} />}
      {step === 5 && eventosOn && <Step6Eventos f={f} set={set} />}
      {step === 6 && <Step5Acuerdo f={f} set={set} costoModulosFijo={costoModulosFijo} costoModulosSetup={costoModulosSetup} />}
      {step === 7 && <Step7Resumen f={f} set={set} selectedMods={selectedMods} eventosOn={eventosOn} costoModulosFijo={costoModulosFijo} costoModulosSetup={costoModulosSetup} />}
    </Drawer>
  );
}

function Step1Contexto({ f, set }) {
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  // Antes esto guardaba el logo como base64 en memoria local (FileReader.
  // readAsDataURL) y nunca se subía a ningún lado real ni se sincronizaba a
  // Supabase (worldRow() no mandaba logoUrl) — el mundo nunca tenía imagen
  // de verdad, ni en su card del admin ni en el card de comunidad del app.
  // Mismo patrón de Storage que ya usa "Mi catálogo" del comercio.
  const subirLogo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("El logo debe ser una imagen (PNG/JPG).", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { notify("El logo pesa más de 5 MB. Comprímelo antes de subirlo.", "error"); return; }
    setSubiendoLogo(true);
    try {
      const path = `mundos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      set({ logoUrl: url });
    } catch (e) {
      notify("No se pudo subir el logo: " + e.message, "error");
    } finally { setSubiendoLogo(false); }
  };
  return (
    <div className="space-y-5">
      <div className="bg-surface-container-low border border-primary/20 rounded-lg p-3 flex gap-2 text-xs text-on-surface-variant">
        <Icon n="info" className="text-primary text-[18px]" />
        <span><b>Contexto del mundo:</b> qué comunidad es, qué vertical, cómo se ve en el app. La entidad legal y el RUC se asocian en el paso siguiente.</span>
      </div>
      <Field label="Vertical">
        <div className="grid grid-cols-2 gap-2">
          {VERTICALS.filter(v => v !== "Especial RedPontis").map(v => (
            <button key={v} onClick={() => set({ vertical: v, giro: GIROS_POR_VERTICAL[v]?.[0] || null })} className={`px-4 py-2.5 rounded-lg border text-sm transition-colors ${f.vertical === v ? "border-primary bg-primary-fixed text-primary font-semibold" : "border-outline-variant hover:border-primary/40"}`}>{v}</button>
          ))}
        </div>
      </Field>
      <Field label="Giro" hint="Tipo de negocio específico dentro de la vertical">
        <select className={inputCls} value={f.giro || ""} onChange={e => set({ giro: e.target.value })}>
          {(GIROS_POR_VERTICAL[f.vertical] || []).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="Nombre del mundo"><input className={inputCls} value={f.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Ej. Jockey Plaza" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="País">
          <select className={inputCls} value={f.pais} onChange={e => set({ pais: e.target.value })}>
            {PAISES.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Código sistema" hint="Opcional, se autogenera">
          <input className={`${inputCls} font-mono`} value={f.codigo} onChange={e => set({ codigo: e.target.value })} placeholder="CC-LIM-002" />
        </Field>
      </div>
      <Field label="Descripción / propósito del mundo">
        <textarea className={`${inputCls} h-20 py-2`} value={f.descripcion} onChange={e => set({ descripcion: e.target.value })} placeholder="Qué verá el usuario en el app, qué problema resuelve…" />
      </Field>
      <Field label="Logo / banner" hint="Opcional — PNG/JPG, se usa como identidad visual del mundo en su dashboard y superapp (thumbnail del card de comunidad)">
        <div className="flex items-center gap-3">
          {f.logoUrl ? (
            <img src={f.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-outline-variant" />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-dashed border-outline-variant flex items-center justify-center text-outline">
              {subiendoLogo ? <Icon n="hourglass_empty" className="text-[20px]" /> : <Icon n="image" className="text-[20px]" />}
            </div>
          )}
          <input type="file" accept="image/*" disabled={subiendoLogo} className="text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container-low file:text-xs file:cursor-pointer disabled:opacity-50"
            onChange={e => subirLogo(e.target.files?.[0])} />
          {f.logoUrl && <button onClick={() => set({ logoUrl: "" })} className="text-xs text-error hover:underline">Quitar</button>}
        </div>
      </Field>
      <Field label="Color de marca">
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => set({ color: c })} className={`w-8 h-8 rounded-full border-2 ${f.color === c ? "ring-2 ring-offset-2 ring-primary border-transparent" : "border-outline-variant"}`} style={{ background: c }} />
          ))}
        </div>
      </Field>
    </div>
  );
}

function Step2Entidad({ f, set }) {
  const [grupos, setGrupos] = useState(null);
  useEffect(() => { fetchGruposRemote().then(r => setGrupos(r || [])).catch(() => setGrupos([])); }, []);
  const grupoSeleccionado = (grupos || []).find(g => g.id === f.grupoId);
  return (
    <div className="space-y-5">
      <div className="bg-surface-container-low border border-primary/20 rounded-lg p-3 flex gap-2 text-xs text-on-surface-variant">
        <Icon n="balance" className="text-primary text-[18px]" />
        <span>Asocia <b>{f.nombre || "este mundo"}</b> a una entidad legal. Es el sujeto de contratación, liquidación y a quien se le acreditan los pagos.</span>
      </div>
      <Field label="Razón social"><input className={inputCls} value={f.entidadLegal} onChange={e => set({ entidadLegal: e.target.value })} placeholder="Razón social completa" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="RUC"><input className={`${inputCls} font-mono`} value={f.ruc} onChange={e => set({ ruc: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="20XXXXXXXXX" /></Field>
        <Field label="Moneda base">
          <select className={inputCls} value={f.moneda} onChange={e => set({ moneda: e.target.value })}>
            {MONEDAS_CATALOG.map(c => <option key={c.id} value={c.id}>{c.id} — {c.nombre}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Dirección fiscal"><input className={inputCls} value={f.direccionLegal} onChange={e => set({ direccionLegal: e.target.value })} placeholder="Av. ..." /></Field>

      {/* Datos bancarios (Banco/CCI) retirados del wizard: al crear el mundo
          se le aprovisiona automáticamente una cuenta EDE de JetCash (mismo
          emisor que ya usan los Grupos/Sucursales, ver Grupos.jsx) — ya no
          hace falta que el sponsor tipee una cuenta bancaria propia para que
          RedPontis pueda liquidarle. */}

      <div className="pt-3 border-t border-outline-variant/50">
        <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
          <Icon n="account_tree" className="text-[16px] text-secondary"/> Grupo (opcional)
        </p>
        <p className="text-[11px] text-on-surface-variant mb-3">Si este mundo es una sucursal de un cliente con varias (ej. Jockey Plaza, Boulevard de Asia), ligarlo a su Grupo le hereda Emisor/Adquirente y tipo de wallet. Los grupos se crean en <Link to="/admin/grupos" target="_blank" className="text-primary hover:underline">Grupos y Sucursales</Link>.</p>
        <Field label="Pertenece al grupo">
          <select className={inputCls} value={f.grupoId || ""} onChange={e => set({ grupoId: e.target.value || null, compartesaldoGrupo: e.target.value ? f.compartesaldoGrupo : false })}>
            <option value="">Ninguno — mundo independiente</option>
            {(grupos || []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </Field>
        {f.grupoId && (
          <label className="mt-3 flex items-start gap-2 text-xs text-on-surface-variant cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={!!f.compartesaldoGrupo} onChange={e => set({ compartesaldoGrupo: e.target.checked })} />
            <span>
              Comparte saldo y bandita con las demás sucursales de <b>{grupoSeleccionado?.nombre || "este grupo"}</b> — una misma pulsera y un mismo saldo funcionan en todas.
              Si no lo marcas, esta sucursal tiene su propia wallet independiente aunque pertenezca al grupo.
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

function Step3Representantes({ f, set }) {
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoRuc, setSubiendoRuc] = useState(false);

  const subirContrato = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { notify("El contrato debe ser un archivo PDF.", "error"); return; }
    if (file.size > 15 * 1024 * 1024) { notify("El contrato pesa más de 15 MB. Comprímelo antes de subirlo.", "error"); return; }
    setSubiendo(true);
    try {
      const path = `contratos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      set({ docContratoUrl: url, docContratoNombre: file.name, docContrato: true });
      notify("Contrato PDF adjuntado.");
    } catch (e) {
      notify("No se pudo subir el contrato: " + e.message, "error");
    } finally {
      setSubiendo(false);
    }
  };

  const subirFichaRuc = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { notify("La ficha RUC debe ser un archivo PDF.", "error"); return; }
    // Gap real (hallado en vivo, 11-ago): sin este chequeo, un PDF que
    // superaba el límite del bucket de Supabase Storage tiraba el error crudo
    // del servidor (HTTP 413 "EntityTooLarge") directo a la usuaria en vez de
    // un mensaje entendible. 15 MB es holgado para una ficha RUC escaneada.
    if (file.size > 15 * 1024 * 1024) { notify("La ficha RUC pesa más de 15 MB. Comprímela antes de subirla.", "error"); return; }
    setSubiendoRuc(true);
    try {
      const path = `fichas-ruc/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      set({ docFichaRucUrl: url, docFichaRucNombre: file.name, docFichaRuc: true });
      notify("Ficha RUC PDF adjuntada.");
    } catch (e) {
      notify("No se pudo subir la ficha RUC: " + e.message, "error");
    } finally {
      setSubiendoRuc(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-surface-container-low border border-primary/20 rounded-lg p-3 flex gap-2 text-xs text-on-surface-variant">
        <Icon n="badge" className="text-primary text-[18px]" />
        <span>El <b>apoderado</b> firma el contrato. La <b>persona de contacto</b> recibe el primer acceso y opera el día a día — pueden ser la misma persona.</span>
      </div>

      <div>
        <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
          <Icon n="gavel" className="text-[16px] text-secondary"/> Apoderado (firma el contrato)
        </p>
        <div className="space-y-3">
          <Field label="Nombre completo"><input className={inputCls} value={f.apoderadoNombre} onChange={e => set({ apoderadoNombre: e.target.value })} placeholder="Nombre y apellidos" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Documento de identidad"><input className={`${inputCls} font-mono`} value={f.apoderadoDocumento} onChange={e => set({ apoderadoDocumento: e.target.value })} placeholder="DNI / CE" /></Field>
            <Field label="Correo"><input className={inputCls} type="email" value={f.apoderadoCorreo} onChange={e => set({ apoderadoCorreo: e.target.value })} placeholder="apoderado@empresa.com" /></Field>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-outline-variant/50">
        <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
          <Icon n="support_agent" className="text-[16px] text-secondary"/> Persona de contacto (recibe el primer acceso) <span className="text-error">*</span>
        </p>
        <div className="space-y-3">
          <Field label="Nombre completo"><input className={inputCls} value={f.contactoNombre} onChange={e => set({ contactoNombre: e.target.value })} placeholder="Nombre y apellidos" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Documento de identidad"><input className={`${inputCls} font-mono`} value={f.contactoDocumento} onChange={e => set({ contactoDocumento: e.target.value })} placeholder="DNI / CE" /></Field>
            <Field label="Correo"><input className={inputCls} type="email" value={f.contactoCorreo} onChange={e => set({ contactoCorreo: e.target.value })} placeholder="contacto@empresa.com" /></Field>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-outline-variant/50">
        <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
          <Icon n="description" className="text-[16px] text-secondary"/> Documentos legales
        </p>
        <div className="space-y-2">
          <div className={`p-3 rounded-lg border ${f.docContratoUrl ? "border-ok/50 bg-ok/5" : "border-outline-variant"}`}>
            <div className="flex items-center gap-3">
              <Icon n={f.docContratoUrl ? "task" : "picture_as_pdf"} className={`text-[18px] ${f.docContratoUrl ? "text-ok" : "text-outline"}`}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{f.docContratoUrl ? f.docContratoNombre : "Contrato firmado (PDF)"}</p>
                {!f.docContratoUrl && <span className="font-mono text-[9px] text-outline">pendiente</span>}
              </div>
              {f.docContratoUrl ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={f.docContratoUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">Ver</a>
                  <button onClick={() => set({ docContratoUrl: "", docContratoNombre: "", docContrato: false })} className="text-[11px] text-error hover:underline">Quitar</button>
                </div>
              ) : (
                <label className="flex-shrink-0 text-[11px] text-primary font-semibold cursor-pointer hover:underline">
                  {subiendo ? "Subiendo…" : "Adjuntar PDF"}
                  <input type="file" accept="application/pdf" className="hidden" disabled={subiendo}
                    onChange={e => subirContrato(e.target.files?.[0])} />
                </label>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-lg border ${f.docFichaRucUrl ? "border-ok/50 bg-ok/5" : "border-outline-variant"}`}>
            <div className="flex items-center gap-3">
              <Icon n={f.docFichaRucUrl ? "task" : "picture_as_pdf"} className={`text-[18px] ${f.docFichaRucUrl ? "text-ok" : "text-outline"}`}/>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{f.docFichaRucUrl ? f.docFichaRucNombre : "Ficha RUC (PDF)"}</p>
                {!f.docFichaRucUrl && <span className="font-mono text-[9px] text-outline">pendiente</span>}
              </div>
              {f.docFichaRucUrl ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={f.docFichaRucUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">Ver</a>
                  <button onClick={() => set({ docFichaRucUrl: "", docFichaRucNombre: "", docFichaRuc: false })} className="text-[11px] text-error hover:underline">Quitar</button>
                </div>
              ) : (
                <label className="flex-shrink-0 text-[11px] text-primary font-semibold cursor-pointer hover:underline">
                  {subiendoRuc ? "Subiendo…" : "Adjuntar PDF"}
                  <input type="file" accept="application/pdf" className="hidden" disabled={subiendoRuc}
                    onChange={e => subirFichaRuc(e.target.files?.[0])} />
                </label>
              )}
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant italic">El mundo puede habilitarse sin documentos cargados — quedan marcados como pendientes para seguimiento.</p>
        </div>
      </div>
    </div>
  );
}

// Los 5 servicios que el storytelling pide seleccionar explícitamente al crear
// un mundo. Wallet/Comercios/Compras y Transacciones quedan CORE (siempre
// activos); Reservas y Promociones son reales toggles aquí, no enterrados
// bajo "opcionales" como en el catálogo completo de abajo.
const SERVICIOS_INICIALES = ["wallet", "comercios", "consumos", "reservas", "promociones"];

// Mismo cálculo que ConfigFieldInput en MundoDetail.jsx: se guarda como meses
// (la vigencia real corre desde que CADA pulsera se vincula), pero se elige
// con un calendario — la fecha se traduce a "meses desde hoy" al guardar.
function MonthsAsDateInput({ value, onChange }) {
  const hoy = new Date();
  const fechaEquivalente = (() => {
    const d = new Date(hoy);
    d.setMonth(d.getMonth() + Number(value || 0));
    return d.toISOString().slice(0, 10);
  })();
  return (
    <div>
      <input className={`${inputCls} !h-8 !text-xs`} type="date" value={fechaEquivalente}
        onChange={e => {
          if (!e.target.value) return;
          const elegida = new Date(e.target.value + "T00:00:00");
          const meses = Math.max(0, Math.round((elegida - hoy) / (1000 * 60 * 60 * 24 * 30.44)));
          onChange(meses);
        }} />
      <p className="text-[9px] text-outline mt-0.5">≈ {value || 0} {Number(value) === 1 ? "mes" : "meses"} desde vinculación</p>
    </div>
  );
}

function Step4Servicios({ f, set }) {
  const [search, setSearch] = useState("");
  const [showOpcional, setShowOpcional] = useState(false);
  // MODULOS_PROXIMAMENTE nunca llega a sincronizarse a Supabase (ver
  // syncAllWorlds) — ofrecerlos como si fueran un módulo real elegible en el
  // wizard de creación solo genera falsa confianza de que quedaron activos.
  const filtered = (tier) => MODULE_CATALOG.filter(m =>
    m.tier === tier &&
    !MODULOS_PROXIMAMENTE.has(m.id) &&
    (!m.lock || m.lock === f.vertical) &&
    (search === "" || m.name.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()))
  );
  const tiers = [
    { t: "CORE", label: "Core (obligatorio en todos los mundos)", color: "text-primary", bg: "bg-primary-fixed" },
    { t: "MOTOR BASE", label: "Motor Base (incluido automáticamente)", color: "text-secondary", bg: "bg-secondary-fixed" },
    { t: "PREMIUM", label: "Premium", color: "text-tertiary", bg: "bg-tertiary-fixed" },
  ];
  const opcionalMods = filtered("OPCIONAL");
  const selectedOpcional = opcionalMods.filter(m => f.modulos[m.id]).length;
  const serviciosIniciales = MODULE_CATALOG.filter(m => SERVICIOS_INICIALES.includes(m.id));

  return (
    <div className="space-y-4">
      <div className="bg-primary-fixed/20 border border-primary/30 rounded-xl p-4">
        <p className="text-xs font-bold text-on-surface mb-1 flex items-center gap-1.5">
          <Icon n="checklist" className="text-[16px] text-primary"/> Servicios iniciales de este mundo
        </p>
        <p className="text-[11px] text-on-surface-variant mb-3">Wallet, Comercios y Compras y Transacciones son la base — siempre activos. Reservas y Promociones todavía están en desarrollo y no se pueden activar en un mundo nuevo.</p>
        <div className="space-y-2">
          {serviciosIniciales.map(mod => {
            const proximamente = MODULOS_PROXIMAMENTE.has(mod.id);
            const sel = !proximamente && !!f.modulos[mod.id];
            const locked = mod.tier === "CORE" || mod.base || proximamente;
            return (
              <div key={mod.id} className={`rounded-lg border transition-colors bg-surface overflow-hidden ${proximamente ? "opacity-60" : sel ? "border-primary/50" : "border-outline-variant hover:border-primary/30"}`}>
                <label className={`flex items-center gap-3 p-3 ${proximamente ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input type="checkbox" disabled={locked} checked={sel}
                    onChange={e => !proximamente && set({ modulos: { ...f.modulos, [mod.id]: e.target.checked } })}
                    className="rounded border-outline-variant text-primary" />
                  <Icon n={mod.icon} className="text-primary text-[18px]" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{mod.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{mod.desc}</p>
                  </div>
                  {proximamente ? <span className="font-mono text-[9px] bg-surface-container text-outline px-1.5 py-0.5 rounded">próximamente</span>
                    : locked ? <span className="font-mono text-[9px] bg-surface-container text-outline px-1.5 py-0.5 rounded">automático</span>
                    : <span className="font-mono text-[9px] bg-tertiary-fixed text-tertiary px-1.5 py-0.5 rounded">opcional</span>}
                </label>
                {sel && (mod.configFields || []).length > 0 && (
                  <div className="px-3 pb-3 pt-1 border-t border-outline-variant/50 bg-surface-container-low grid grid-cols-2 gap-3">
                    {mod.configFields.map(cf => {
                      // Explícitamente seteado a null (nullable="sin límite/vencimiento")
                      // se distingue de "todavía no tocado" — un ?? acá revertía el
                      // valor nulo de vuelta al default en el próximo render.
                      const cfg = f.moduleConfig[mod.id] || {};
                      const isSetNull = cf.key in cfg && cfg[cf.key] === null;
                      const val = cf.key in cfg ? cfg[cf.key] : cf.default;
                      const upd = v => set({ moduleConfig: { ...f.moduleConfig, [mod.id]: { ...f.moduleConfig[mod.id], [cf.key]: v } } });
                      return (
                        <div key={cf.key} onClick={e => e.stopPropagation()} className={cf.type === "timerange" ? "col-span-2" : ""}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-on-surface-variant">{cf.label}</label>
                            {cf.nullable && (
                              <button onClick={() => upd(isSetNull ? cf.default : null)} className="text-[9px] text-primary underline">
                                {isSetNull ? "Definir valor" : `Usar «${cf.nullLabel || "Sin límite"}»`}
                              </button>
                            )}
                          </div>
                          {isSetNull ? (
                            <div className="h-8 px-2 flex items-center bg-surface-container border border-outline-variant/50 rounded-lg text-[11px] text-outline italic">
                              {cf.nullLabel || "Sin límite"}
                            </div>
                          ) : cf.type === "switch" ? (
                            <Toggle checked={!!val} onChange={upd} />
                          ) : cf.type === "select" ? (
                            <select className={`${inputCls} !h-8 !text-xs`} value={val ?? ""} onChange={e => upd(e.target.value)}>
                              {(cf.options || []).map(o => <option key={o} value={o}>{cf.optionLabels?.[o] || o}</option>)}
                            </select>
                          ) : cf.type === "time" ? (
                            <input className={`${inputCls} !h-8 !text-xs`} type="time" value={val ?? ""} onChange={e => upd(e.target.value)} />
                          ) : cf.type === "timerange" ? (
                            <div className="grid grid-cols-2 gap-2">
                              <input className={`${inputCls} !h-8 !text-xs`} type="time" value={(val || "").split("-")[0]?.trim() || ""}
                                onChange={e => { const parts = (val || "08:00-20:00").split("-"); upd(`${e.target.value}-${parts[1]?.trim() || "20:00"}`); }} />
                              <input className={`${inputCls} !h-8 !text-xs`} type="time" value={(val || "").split("-")[1]?.trim() || ""}
                                onChange={e => { const parts = (val || "08:00-20:00").split("-"); upd(`${parts[0]?.trim() || "08:00"}-${e.target.value}`); }} />
                            </div>
                          ) : cf.type === "text" ? (
                            <input className={`${inputCls} !h-8 !text-xs`} value={val ?? ""} onChange={e => upd(e.target.value)} />
                          ) : cf.type === "monthsAsDate" ? (
                            <MonthsAsDateInput value={val} onChange={upd} />
                          ) : (
                            <div className="relative">
                              <NumInput allowNull={!!cf.nullable} className={`${inputCls} !h-8 !text-xs`} value={val} onChange={upd} />
                              {cf.type === "percent" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-outline">%</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <button onClick={() => setShowOpcional(s => !s)} className="w-full flex items-center justify-between px-1 py-2 text-xs text-on-surface-variant hover:text-primary transition-colors">
          <span className="flex items-center gap-1.5"><Icon n={showOpcional ? "expand_less" : "expand_more"} className="text-[18px]" /> Ver catálogo completo (todos los módulos disponibles)</span>
        </button>
      </div>

      {showOpcional && (<>
      <div className="relative">
        <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
        <input className={`${inputCls} pl-10`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar módulo..." />
      </div>

      {tiers.map(({ t, label, color, bg }) => {
        const mods = filtered(t);
        if (!mods.length) return null;
        return (
          <div key={t}>
            <p className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${color}`}>{label}</p>
            <div className="space-y-2">
              {mods.map(mod => {
                const sel = !!f.modulos[mod.id];
                const locked = mod.tier === "CORE" || mod.base;
                return (
                  <label key={mod.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sel ? `border-primary/40 ${bg}/30` : "border-outline-variant"} ${locked ? "opacity-90" : "hover:border-primary/30"}`}>
                    <input type="checkbox" disabled={locked} checked={sel}
                      onChange={e => set({ modulos: { ...f.modulos, [mod.id]: e.target.checked } })}
                      className="mt-1 rounded border-outline-variant text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon n={mod.icon} className="text-primary text-[18px]" />
                        <span className="text-sm font-semibold">{mod.name}</span>
                        <span className="font-mono text-[9px] text-outline">{mod.category}</span>
                        {locked && <span className="font-mono text-[9px] bg-surface-container text-outline px-1 rounded">automático</span>}
                        {mod.lock && mod.lock !== f.vertical && <span className="font-mono text-[9px] bg-error-container text-error px-1 rounded">requiere {mod.lock}</span>}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{mod.desc}</p>
                      {sel && mod.pricing && mod.pricing.modelo !== "incluido" && (
                        <p className="font-mono text-[10px] text-on-surface-variant mt-1">
                          Referencial de catálogo: {mod.pricing.fijoMensual ? `S/${mod.pricing.fijoMensual}/mes` : ""}{mod.pricing.porTx ? ` · ${mod.pricing.porTx}% por Tx` : ""}{mod.pricing.setup ? ` · Setup S/${mod.pricing.setup}` : ""}
                          <span className="text-ok"> · gratuito por el momento</span>
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="border border-outline-variant rounded-xl overflow-hidden">
        <button onClick={() => setShowOpcional(!showOpcional)} className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container transition-colors">
          <div className="flex items-center gap-2">
            <Icon n={showOpcional ? "expand_less" : "expand_more"} className="text-[20px]" />
            <span className="text-sm font-semibold">Módulos opcionales (verticales y funcionalidades)</span>
            {selectedOpcional > 0 && <span className="font-mono text-[10px] bg-primary-fixed text-primary px-2 py-0.5 rounded">{selectedOpcional} seleccionados</span>}
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant">{opcionalMods.length} módulos</span>
        </button>
        {showOpcional && (
          <div className="p-3 space-y-2 border-t border-outline-variant">
            {opcionalMods.map(mod => {
              const sel = !!f.modulos[mod.id];
              const verticalLock = mod.lock && mod.lock !== f.vertical;
              return (
                <label key={mod.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sel ? "border-primary/40 bg-primary-fixed/10" : "border-outline-variant"} ${verticalLock ? "opacity-40 cursor-not-allowed" : "hover:border-primary/30"}`}>
                  <input type="checkbox" disabled={verticalLock} checked={sel}
                    onChange={e => !verticalLock && set({ modulos: { ...f.modulos, [mod.id]: e.target.checked } })}
                    className="mt-1 rounded border-outline-variant text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon n={mod.icon} className="text-primary text-[18px]" />
                      <span className="text-sm font-semibold">{mod.name}</span>
                      <span className="font-mono text-[9px] text-outline">{mod.category}</span>
                      {verticalLock && <span className="font-mono text-[9px] bg-error-container text-error px-1 rounded">solo para {mod.lock}</span>}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">{mod.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}


function Step5Acuerdo({ f, set, costoModulosFijo, costoModulosSetup, mundoId }) {
  return (
    <div className="space-y-5">
      <div className="bg-surface-container-low border border-primary/20 rounded-lg p-3 flex gap-2 text-xs text-on-surface-variant">
        <Icon n="handshake" className="text-primary text-[18px]" />
        <span>Define cómo se le cobra al sponsor. Este acuerdo se usa en <b>Liquidación</b> con corte diario 19:00 PE.</span>
      </div>
      <Field label="Tipo de acuerdo">
        <div className="space-y-2">
          {ACUERDOS.map(a => (
            <label key={a.k} className={`block p-3 rounded-lg border-2 cursor-pointer transition-colors ${f.acuerdo.tipo === a.k ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
              <div className="flex items-start gap-3">
                <input type="radio" name="tipoAcuerdo" checked={f.acuerdo.tipo === a.k} onChange={() => set({ acuerdo: { ...f.acuerdo, tipo: a.k } })} className="mt-1 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{a.t}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{a.d}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        {(f.acuerdo.tipo === "transaccional" || f.acuerdo.tipo === "mixto") && (
          <Field label="Revenue share (%)" hint="% sobre volumen transaccional bruto — no sobre margen (el cálculo por margen requiere un modelo de costos que aún no existe; queda en backlog)">
            <NumInput className={inputCls} step="0.1" value={f.acuerdo.revShare} onChange={v => set({ acuerdo: { ...f.acuerdo, revShare: v } })} />
          </Field>
        )}
        {(f.acuerdo.tipo === "revenue" || f.acuerdo.tipo === "mixto" || f.acuerdo.tipo === "fijo") && (
          <Field label={`Fijo ${f.acuerdo.tipo === "fijo" ? "(monto cerrado)" : "mensual"} (S/)`}>
            <NumInput className={inputCls} value={f.acuerdo.fijoMensual} onChange={v => set({ acuerdo: { ...f.acuerdo, fijoMensual: v } })} />
          </Field>
        )}
        <Field label="Setup inicial (S/)" hint="One-shot al activar">
          <NumInput className={inputCls} value={f.acuerdo.setup} onChange={v => set({ acuerdo: { ...f.acuerdo, setup: v } })} />
        </Field>
        <Field label="Vigencia" hint="Fecha en la que vence el acuerdo comercial">
          <input className={inputCls} type="date" value={f.acuerdo.vigencia || ""} onChange={e => set({ acuerdo: { ...f.acuerdo, vigencia: e.target.value } })} />
        </Field>
        <Field label="Frecuencia de liquidación" hint="Cada cuánto se le paga al sponsor. El corte y cálculo interno sigue siendo diario 19:00 PE — esto solo define el ciclo de pago real">
          <select className={inputCls} value={f.acuerdo.frecuenciaLiquidacion} onChange={e => set({ acuerdo: { ...f.acuerdo, frecuenciaLiquidacion: e.target.value } })}>
            {[["diaria", "Diaria"], ["semanal", "Semanal"], ["quincenal", "Quincenal"], ["mensual", "Mensual"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
      </div>

      <div className="bg-primary-fixed border border-primary/20 rounded-lg p-3 flex gap-2 text-xs text-primary mt-2">
        <Icon n="picture_as_pdf" className="text-[18px]" />
        <span>Al finalizar la creación del mundo, podrás <b>descargar el contrato tentativo en PDF</b> desde el botón en el encabezado del mundo para revisión y firma.</span>
      </div>
    </div>
  );
}

function Step6Eventos({ f, set }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border-2 border-primary bg-primary-fixed/20">
        <div className="flex items-start gap-3">
          <Icon n="business_center" className="text-primary text-[20px] mt-0.5"/>
          <div>
            <p className="text-sm font-semibold">Modelo: B2B</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Condición ya cumplida por este mundo: es una entidad independiente propia (<b>{f.entidadLegal || "razón social del paso anterior"}</b>, RUC {f.ruc || "—"}), no un sub-organizador dentro de otro mundo.
              Por eso opera B2B automáticamente — se le entrega un Dashboard de Organizador dedicado para autogestionar sus eventos (siempre con aprobación final de RedPontis).
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs font-mono uppercase text-outline">Opcional — sumar Embebido</p>
      <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${f.eventosEmbebido ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
        <input type="checkbox" checked={f.eventosEmbebido} onChange={e => set({ eventosEmbebido: e.target.checked })} className="mt-1 rounded text-primary" />
        <div>
          <p className="text-sm font-semibold">Embebido</p>
          <p className="text-xs text-on-surface-variant mt-0.5">El propio panel del mundo también podrá cargar y publicar sus eventos directo, sin depender del organizador.</p>
        </div>
      </label>
    </div>
  );
}

function Step7Resumen({ f, set, selectedMods, eventosOn, costoModulosFijo, costoModulosSetup }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface-container-low border border-primary/20 rounded-lg p-4 flex gap-3">
        <Icon n="info" className="text-primary" />
        <p className="text-xs text-on-surface-variant"><b className="text-on-surface">Revisión.</b> Al habilitar, el mundo aparece en el ecosistema con su acuerdo activo y las liquidaciones empezarán a generarse en el corte diario 19:00 PE.</p>
      </div>

      <Section icon="public" title="Contexto">
        <Row k="Nombre" v={f.nombre} />
        <Row k="Vertical" v={`${f.vertical} · ${f.giro || "—"}`} />
        <Row k="Descripción" v={f.descripcion} />
      </Section>

      <Section icon="balance" title="Entidad legal">
        <Row k="Razón social" v={f.entidadLegal} />
        <Row k="RUC" v={f.ruc} />
        <Row k="Moneda" v={f.moneda} />
        <Row k="Cuenta de liquidación" v="Se aprovisiona automáticamente (EDE JetCash)" />
      </Section>

      <Section icon="badge" title="Representante y contacto">
        <Row k="Apoderado" v={f.apoderadoNombre || "—"} />
        <Row k="Contacto (primer acceso)" v={f.contactoNombre ? `${f.contactoNombre} · ${f.contactoCorreo}` : "—"} />
        <Row k="Documentos" v={[f.docContrato && "Contrato", f.docFichaRuc && "Ficha RUC"].filter(Boolean).join(", ") || "Pendientes"} />
      </Section>

      <Section icon="extension" title="Módulos contratados" badge={`${selectedMods.length}`}>
        <div className="flex flex-wrap gap-2">
          {selectedMods.map(m => (
            <span key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-outline-variant rounded-lg text-xs">
              <Icon n={m.icon} className="text-secondary text-[16px]" />{m.name}
              <span className="font-mono text-[9px] text-outline">{[m.e && f.flags[m.id].e ? "E" : null, m.a && f.flags[m.id].a ? "A" : null].filter(Boolean).join("·")}</span>
            </span>
          ))}
        </div>
      </Section>

      <Section icon="handshake" title="Acuerdo comercial">
        <Row k="Tipo" v={<b className="text-primary uppercase">{f.acuerdo.tipo}</b>} />
        {(f.acuerdo.tipo === "transaccional" || f.acuerdo.tipo === "mixto") && <Row k="Revenue share" v={`${f.acuerdo.revShare}%`} />}
        {(f.acuerdo.tipo === "revenue" || f.acuerdo.tipo === "mixto" || f.acuerdo.tipo === "fijo") && <Row k={f.acuerdo.tipo === "fijo" ? "Monto cerrado" : "Fijo mensual"} v={`S/ ${f.acuerdo.fijoMensual}`} />}
        <Row k="Setup" v={`S/ ${f.acuerdo.setup}`} />
        <Row k="Vigencia" v={f.acuerdo.vigencia} />
        <Row k="Frecuencia de liquidación" v={{ diaria: "Diaria", semanal: "Semanal", quincenal: "Quincenal", mensual: "Mensual" }[f.acuerdo.frecuenciaLiquidacion] || f.acuerdo.frecuenciaLiquidacion} />
        <Row k="Referencial catálogo" v={`Setup S/${costoModulosSetup} · Mensual S/${costoModulosFijo}`} mono />
      </Section>

      {eventosOn && (
        <Section icon="confirmation_number" title="Estrategia de eventos">
          <p className="text-sm">B2B Dashboard (por defecto){f.eventosEmbebido ? " + Embebido" : ""}</p>
        </Section>
      )}

      <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-outline-variant/50">
        <input type="checkbox" checked={f.confirm} onChange={e => set({ confirm: e.target.checked })} className="mt-0.5 rounded text-primary" />
        <span className="text-sm text-on-surface-variant">Confirmo la configuración arquitectónica, el acuerdo comercial y autorizo la creación de este mundo en el ecosistema.</span>
      </label>
    </div>
  );
}

function Section({ icon, title, badge, children }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 font-semibold border-b border-outline-variant/50 pb-2 mb-3">
        <Icon n={icon} className="text-outline text-[20px]" /> {title}
        {badge && <span className="ml-auto font-mono text-[10px] bg-surface-container px-2 py-0.5 rounded-full">{badge}</span>}
      </h4>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <p className="font-mono text-[10px] text-outline uppercase pt-0.5 flex-shrink-0">{k}</p>
      <p className={`text-right ${mono ? "font-mono text-xs text-on-surface-variant" : ""}`}>{v}</p>
    </div>
  );
}
