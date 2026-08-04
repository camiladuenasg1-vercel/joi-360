/**
 * Hardware / POS — Inventario de dispositivos de RedPontis
 * Lista unidades físicas por modelo, con estado y asignación a merchant/mundo.
 * Tabla pos_devices en Supabase — asignación real (Caso 2 Raimondi).
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useStore } from "./hooks";
import { Icon, BtnPrimary, BtnOutline, notify, NumInput } from "./ui";
import { HARDWARE_CATALOG, hardwareModelById } from "./store";

// Carga masiva de hardware/banditas: antes solo leía .csv/.txt como texto
// plano (readAsText), así que un .xlsx real (formato binario zip, no texto)
// se leía como basura y la carga "no funcionaba" sin ningún error visible —
// bug real reportado por la usuaria. Ahora detecta el formato y, si es
// Excel, lo parsea con SheetJS; el resultado son las mismas "líneas"
// separadas por coma que el parser de cada carga ya esperaba, así que el
// resto de la lógica (columnas, validación) no cambia.
function leerLineasDeArchivo(file, cb) {
  if (/\.xlsx?$/i.test(file.name)) {
    const reader = new FileReader();
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: "array" });
      const hoja = wb.Sheets[wb.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, blankrows: false });
      const lineas = filas
        .map(fila => fila.map(c => String(c ?? "").trim()).join(","))
        .filter(l => l.replace(/,/g, "").trim());
      cb(lineas);
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      cb(String(reader.result).split(/\r?\n/).map(l => l.trim()).filter(Boolean));
    };
    reader.readAsText(file);
  }
}
import { fetchPosDevicesRemote, registerPosDeviceRemote, registerPosDevicesBulkRemote, assignPosDeviceRemote, releasePosDeviceRemote, fetchNfcBandsRemote, registerNfcBandsBulkRemote, liberarNfcBandRemote, renombrarLoteNfcRemote, eliminarLoteNfcRemote, revertirAsignacionesLoteRemote, crearAsignacionNfcRemote, marcarAsignacionPagadaRemote, fetchAsignacionesPendientesCobro, fetchHistorialAsignacionesNfc, uploadArchivo, fetchSolicitudesNfcTodas, resolverSolicitudNfcRemote, fetchSolicitudesLoteNfcTodas, fetchStockAlmacenNfc, entregarLoteNfcRemote, errorControlado, logErrorControlado, fetchRequerimientosHardwareTodos, resolverRequerimientoHardware } from "./supabase.js";

const fmtSoles = n => (n === null || n === undefined || n === "" || isNaN(n)) ? null : `S/ ${Number(n).toFixed(2)}`;

const ESTADO_STYLE = {
  disponible:    "bg-green-100  text-green-700  border-green-200",
  asignado:      "bg-blue-100   text-blue-700   border-blue-200",
  en_reparacion: "bg-amber-100  text-amber-700  border-amber-200",
  baja:          "bg-red-100    text-red-700    border-red-200",
};
const TIPO_INGRESO_LABEL = { gratis: "Gratis", alquiler: "Alquiler", venta: "Venta" };

export function HardwarePOS() {
  const nav = useNavigate();
  const [tab, setTab] = useState("pos");

  return (
    <div className="max-w-6xl">
      <button onClick={()=>nav("/admin/catalogos")}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-xs font-semibold mb-4 transition-colors">
        <Icon n="arrow_back" className="text-[14px]"/> Catálogos Globales
      </button>

      <div className="mb-6">
        <p className="font-mono text-[10px] text-outline uppercase tracking-widest mb-1">Plataforma › Catálogos › Hardware</p>
        <h1 className="text-3xl font-bold mb-2">Inventario de Hardware</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-outline-variant">
        {[{k:"pos",l:"POS / Tótem",i:"point_of_sale"},{k:"nfc",l:"Banditas NFC",i:"contactless"},{k:"demanda",l:"Demanda de mundos",i:"inbox"}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)}
            className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${tab===t.k?"text-primary border-primary font-semibold":"text-on-surface-variant border-transparent hover:text-primary"}`}>
            <Icon n={t.i} className="text-[18px]"/>{t.l}
          </button>
        ))}
      </div>

      {tab === "pos" && <PosDevicesTab/>}
      {tab === "nfc" && <BanditasNfcTab/>}
      {tab === "demanda" && <DemandaMundosTab/>}
    </div>
  );
}

/**
 * Demanda de los mundos.
 *
 * RedPontis tenía el stock (las otras dos pestañas) pero no la otra mitad:
 * cuánto le están pidiendo y desde dónde. Sin eso, decidir cuántos terminales
 * comprar era adivinar, y un mundo podía quedarse semanas esperando sin que
 * nadie tuviera el pedido a la vista.
 *
 * Junta los dos caminos de pedido —lotes de pulseras y equipos— porque la
 * pregunta que resuelven es la misma: qué hay que conseguir y para quién.
 */
function DemandaMundosTab() {
  const st = useStore();
  const [equipos, setEquipos] = useState(null);
  const [lotes, setLotes] = useState(null);
  const [nota, setNota] = useState({});
  const [guardando, setGuardando] = useState(null);

  const cargar = () => {
    fetchRequerimientosHardwareTodos().then(setEquipos).catch(() => setEquipos([]));
    fetchSolicitudesLoteNfcTodas().then(setLotes).catch(() => setLotes([]));
  };
  useEffect(cargar, []);

  const nombreMundo = id => (st.mundos || []).find(m => m.id === id)?.nombre || id;

  const resolver = async (r, estado) => {
    setGuardando(r.id);
    try {
      await resolverRequerimientoHardware(r.id, estado, nota[r.id]);
      notify(`Requerimiento marcado como ${estado}.`);
      setNota(n => ({ ...n, [r.id]: "" }));
      cargar();
    } catch (e) {
      notify("No se pudo actualizar: " + e.message, "error");
    } finally { setGuardando(null); }
  };

  if (equipos === null || lotes === null) {
    return <p className="text-sm text-on-surface-variant">Cargando demanda…</p>;
  }

  const equiposPend = equipos.filter(r => r.estado === "pendiente");
  const lotesPend = (lotes || []).filter(r => r.estado === "pendiente");

  // Cuántas unidades hay que conseguir por modelo, sumando todos los mundos:
  // es el número con el que se compra, no el conteo de solicitudes.
  const porModelo = {};
  equiposPend.forEach(r => {
    const k = r.modelo_nombre || r.modelo_id;
    porModelo[k] = (porModelo[k] || 0) + (r.cantidad || 0);
  });
  const banditasPend = lotesPend.reduce((a, r) => a + (r.cantidad || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaDemanda icono="pending_actions" titulo="Pedidos abiertos" valor={equiposPend.length + lotesPend.length} />
        <TarjetaDemanda icono="point_of_sale" titulo="Equipos por entregar" valor={equiposPend.reduce((a, r) => a + (r.cantidad || 0), 0)} />
        <TarjetaDemanda icono="contactless" titulo="Pulseras por entregar" valor={banditasPend} />
        <TarjetaDemanda icono="public" titulo="Mundos esperando" valor={new Set([...equiposPend, ...lotesPend].map(r => r.world_id)).size} />
      </div>

      {Object.keys(porModelo).length > 0 && (
        <section>
          <h3 className="font-semibold mb-3">Qué hay que conseguir</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(porModelo).map(([modelo, cant]) => (
              <span key={modelo} className="px-3 py-2 rounded-lg bg-primary-fixed/30 border border-primary/20 text-sm">
                <b className="font-mono">{cant}</b> × {modelo}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-semibold mb-3">Requerimientos de equipo</h3>
        {equipos.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Ningún mundo ha pedido equipos todavía.</p>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant/60">
            {equipos.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {r.cantidad} × {r.modelo_nombre || r.modelo_id}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {nombreMundo(r.world_id)} · {new Date(r.created_at).toLocaleDateString("es-PE")}
                    </p>
                    {r.motivo && <p className="text-xs text-on-surface-variant mt-1">{r.motivo}</p>}
                    {r.nota_redpontis && <p className="text-xs text-primary mt-1">Nota: {r.nota_redpontis}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    r.estado === "entregado" ? "bg-green-100 text-green-700 border-green-200"
                      : r.estado === "rechazado" ? "bg-red-100 text-red-700 border-red-200"
                        : r.estado === "aprobado" ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}>
                    {r.estado.toUpperCase()}
                  </span>
                </div>

                {r.estado === "pendiente" && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <input
                      className="flex-1 min-w-[200px] h-9 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm"
                      placeholder="Nota para el mundo (opcional) — ej. llega el viernes"
                      value={nota[r.id] || ""}
                      onChange={e => setNota(n => ({ ...n, [r.id]: e.target.value }))}
                    />
                    <BtnOutline disabled={guardando === r.id} onClick={() => resolver(r, "aprobado")}>
                      <Icon n="check" className="text-[16px]" /> Aprobar
                    </BtnOutline>
                    <BtnPrimary disabled={guardando === r.id} onClick={() => resolver(r, "entregado")}>
                      <Icon n="local_shipping" className="text-[16px]" /> Entregado
                    </BtnPrimary>
                    <BtnOutline disabled={guardando === r.id} onClick={() => resolver(r, "rechazado")}>
                      Rechazar
                    </BtnOutline>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-3">Lotes de pulseras pedidos por los mundos</h3>
        {lotes.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Ningún mundo ha pedido lotes todavía.</p>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant/60">
            {lotes.map(r => (
              <div key={r.id} className="p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold">{r.cantidad} pulseras</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {nombreMundo(r.world_id)} · {new Date(r.created_at).toLocaleDateString("es-PE")}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  r.estado === "entregado"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }`}>
                  {String(r.estado).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-on-surface-variant mt-2">
          La entrega de lotes se hace desde la pestaña <b>Banditas NFC</b>, que es donde está el stock.
        </p>
      </section>
    </div>
  );
}

function TarjetaDemanda({ icono, titulo, valor }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <div className="flex items-center gap-2 text-on-surface-variant mb-2">
        <Icon n={icono} className="text-[18px]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{titulo}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{valor}</div>
    </div>
  );
}

function PosDevicesTab() {
  const st  = useStore();
  const [filterModelo, setFilterModelo] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [showAddUnit,  setShowAddUnit]  = useState(false);
  const [newUnit, setNewUnit] = useState({ modelo_id:"pos_ingenico", serial:"", tipoIngreso:"venta" });
  const [stock, setStock] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignForm, setAssignForm] = useState({ worldId:"", merchantId:"", eventId:"" });
  const [showBulk, setShowBulk] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const mundos  = st.mundos || [];
  const comercios = st.comercios || [];
  const eventos = st.eventos || [];

  const load = () => fetchPosDevicesRemote()
    .then(rows => setStock((rows || []).map(r => ({ id:r.id, modelo_id:r.modelo, serial:r.serial, estado:r.estado, world_id:r.world_id, merchant_id:r.merchant_id, event_id:r.event_id, tipo_ingreso:r.tipo_ingreso || "venta" }))))
    .catch(() => setStock([]));
  useEffect(() => { load(); }, []);

  const filtered = (stock || []).filter(d=>
    (filterModelo==="all" || d.modelo_id===filterModelo) &&
    (filterEstado==="all" || d.estado===filterEstado)
  );

  const addUnit = async () => {
    if(!newUnit.serial.trim()) return;
    try {
      await registerPosDeviceRemote(newUnit.modelo_id, newUnit.serial.trim(), newUnit.tipoIngreso);
      notify(`Unidad "${newUnit.serial}" registrada en stock.`);
      setNewUnit({ modelo_id:"pos_ingenico", serial:"", tipoIngreso:"venta" });
      setShowAddUnit(false);
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "hardware-registrar", null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };

  // Carga masiva vía archivo (Gantt #53): CSV/Excel con una unidad por línea
  // — modelo_id,serial,tipo_ingreso.
  const parseBulkFile = (file) => {
    setBulkFileName(file.name);
    leerLineasDeArchivo(file, lines => {
      const modeloIds = new Set(HARDWARE_CATALOG.map(m => m.id));
      const rows = lines.map(line => {
        const [modelo, serial, tipo] = line.split(",").map(s => (s || "").trim());
        return {
          modelo: modeloIds.has(modelo) ? modelo : HARDWARE_CATALOG[0].id,
          serial: (serial || "").toUpperCase(),
          tipoIngreso: ["gratis", "alquiler", "venta"].includes(tipo) ? tipo : "venta",
          valido: modeloIds.has(modelo) && !!serial,
        };
      });
      setBulkRows(rows);
    });
  };

  const confirmarBulk = async () => {
    const validas = bulkRows.filter(r => r.valido);
    if (!validas.length) return;
    setBulkBusy(true);
    try {
      await registerPosDevicesBulkRemote(validas);
      notify(`${validas.length} unidades registradas en stock.`);
      setShowBulk(false); setBulkRows([]); setBulkFileName("");
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "hardware-carga-masiva", null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBulkBusy(false); }
  };

  const releaseDevice = async (d) => {
    await releasePosDeviceRemote(d.id);
    notify(`${d.serial} liberado — estado: disponible.`);
    load();
  };

  const comerciosDelMundo = (worldId) => comercios.filter(c => c.mundoId === worldId);
  // Eventos publicados del mundo (Gantt #64/#73) — un POS puede prestarse
  // temporalmente a un evento puntual, además de su asignación a merchant.
  const eventosDelMundo = (worldId) => eventos.filter(e => e.mundoId === worldId && e.estado === "PUBLICADO");

  const confirmAssign = async (d) => {
    if (!assignForm.worldId || !assignForm.merchantId) return;
    try {
      await assignPosDeviceRemote(d.id, assignForm.worldId, assignForm.merchantId, assignForm.eventId || null);
      const merchant = comercios.find(c => (c.supabaseId || c.id) === assignForm.merchantId);
      notify(`${d.serial} asignado a ${merchant?.nombre || "comercio"}.`);
      setAssigningId(null);
      setAssignForm({ worldId:"", merchantId:"", eventId:"" });
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "hardware-asignar", assignForm.worldId || null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };

  // Stats por modelo
  const byModelo = HARDWARE_CATALOG.map(m=>({
    ...m,
    total:     (stock||[]).filter(d=>d.modelo_id===m.id).length,
    disponible:(stock||[]).filter(d=>d.modelo_id===m.id&&d.estado==="disponible").length,
    asignado:  (stock||[]).filter(d=>d.modelo_id===m.id&&d.estado==="asignado").length,
  })).filter(m=>m.total>0);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <p className="text-sm text-on-surface-variant max-w-3xl">
          Unidades físicas en stock de RedPontis (tabla <code>pos_devices</code> en vivo). Cada dispositivo tiene número de serie único,
          modelo e historial de asignación real a un mundo y comercio.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <BtnOutline onClick={()=>setShowBulk(true)}>
            <Icon n="upload_file" className="text-[16px]"/> Carga masiva
          </BtnOutline>
          <BtnPrimary onClick={()=>setShowAddUnit(true)}>
            <Icon n="add" className="text-[16px]"/> Registrar unidad
          </BtnPrimary>
        </div>
      </div>

      {/* Model summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {byModelo.map(m=>(
          <button key={m.id} onClick={()=>setFilterModelo(filterModelo===m.id?"all":m.id)}
            className={`p-3 rounded-xl border text-left transition-all ${filterModelo===m.id?"border-primary bg-primary-fixed/20":"border-outline-variant hover:border-primary/40"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon n={m.icon} className="text-[16px] text-primary"/>
              <span className="text-xs font-bold leading-tight">{m.modelo}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-700 font-mono">{m.disponible} disp.</span>
              <span className="text-blue-700 font-mono">{m.asignado} asig.</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all","disponible","asignado","en_reparacion","baja"].map(e=>(
          <button key={e} onClick={()=>setFilterEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterEstado===e?"bg-primary text-white border-primary":"border-outline-variant text-on-surface-variant hover:border-primary/40"}`}>
            {e==="all"?"Todos":e.replace("_"," ")}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-outline self-center">{stock===null?"cargando…":`${filtered.length} unidades`}</span>
      </div>

      {/* Device table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-4 py-3 text-left font-medium">Número de serie</th>
              <th className="px-4 py-3 text-left font-medium">Modelo</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Ingreso</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Mundo asignado</th>
              <th className="px-4 py-3 text-left font-medium">Merchant asignado</th>
              <th className="px-4 py-3 text-left font-medium">Evento</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {stock !== null && filtered.length===0 && (
              <tr><td colSpan="9" className="p-10 text-center text-on-surface-variant">
                <Icon n="devices" className="text-[36px] text-outline mb-2 block mx-auto"/>
                Sin unidades con estos filtros.
              </td></tr>
            )}
            {filtered.map(d=>{
              const modelo   = hardwareModelById(d.modelo_id);
              const mundo    = mundos.find(m=>m.id===d.world_id);
              const merchant = comercios.find(c=>(c.supabaseId||c.id)===d.merchant_id);
              const evento   = eventos.find(e=>e.id===d.event_id);
              const assigning = assigningId === d.id;
              return (
                <React.Fragment key={d.id}>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{d.serial}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon n={modelo?.icon||"devices"} className="text-[16px] text-outline"/>
                        <div>
                          <p className="text-xs font-medium">{modelo?.modelo||d.modelo_id}</p>
                          <p className="font-mono text-[9px] text-outline">{modelo?.marca}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{modelo?.tipo}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{TIPO_INGRESO_LABEL[d.tipo_ingreso] || "Venta"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[8px] uppercase px-2 py-0.5 rounded border font-bold ${ESTADO_STYLE[d.estado]||""}`}>
                        {d.estado.replace("_"," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{mundo?.nombre||<span className="text-outline">—</span>}</td>
                    <td className="px-4 py-3 text-xs">{merchant?.nombre||<span className="text-outline">—</span>}</td>
                    <td className="px-4 py-3 text-xs">{evento?.nombre||<span className="text-outline">—</span>}</td>
                    <td className="px-4 py-3 text-right">
                      {d.estado==="disponible" && !assigning && (
                        <button onClick={()=>{ setAssigningId(d.id); setAssignForm({ worldId:"", merchantId:"", eventId:"" }); }}
                          className="text-xs text-primary hover:underline font-medium">Asignar</button>
                      )}
                      {d.estado==="asignado" && (
                        <button onClick={()=>releaseDevice(d)}
                          className="text-xs text-on-surface-variant hover:text-primary font-medium">Liberar</button>
                      )}
                    </td>
                  </tr>
                  {assigning && (
                    <tr className="bg-primary-fixed/10">
                      <td colSpan="9" className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select className="h-9 px-2 bg-surface border border-outline-variant rounded-lg text-xs"
                            value={assignForm.worldId}
                            onChange={e=>setAssignForm({ worldId:e.target.value, merchantId:"", eventId:"" })}>
                            <option value="">Elegir mundo…</option>
                            {mundos.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                          </select>
                          <select className="h-9 px-2 bg-surface border border-outline-variant rounded-lg text-xs" disabled={!assignForm.worldId}
                            value={assignForm.merchantId}
                            onChange={e=>setAssignForm({...assignForm, merchantId:e.target.value})}>
                            <option value="">Elegir comercio…</option>
                            {comerciosDelMundo(assignForm.worldId).map(c=><option key={c.id} value={c.supabaseId || c.id}>{c.nombre}</option>)}
                          </select>
                          <select className="h-9 px-2 bg-surface border border-outline-variant rounded-lg text-xs" disabled={!assignForm.worldId || eventosDelMundo(assignForm.worldId).length === 0}
                            value={assignForm.eventId}
                            onChange={e=>setAssignForm({...assignForm, eventId:e.target.value})}>
                            <option value="">Sin evento (asignación permanente)</option>
                            {eventosDelMundo(assignForm.worldId).map(ev=><option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                          </select>
                          <BtnPrimary className="!py-1.5 !px-3 !text-xs" disabled={!assignForm.merchantId} onClick={()=>confirmAssign(d)}>
                            Confirmar asignación
                          </BtnPrimary>
                          <button onClick={()=>setAssigningId(null)} className="text-xs text-on-surface-variant">Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add unit modal */}
      {showAddUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e=>e.target===e.currentTarget&&setShowAddUnit(false)}>
          <div className="absolute inset-0 bg-black/20" onClick={()=>setShowAddUnit(false)}/>
          <div className="relative bg-surface rounded-2xl shadow-2xl border border-outline-variant p-6 w-full max-w-md z-10">
            <h2 className="font-semibold text-lg mb-4">Registrar nueva unidad</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-outline mb-1.5">Modelo</label>
                <select className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm"
                  value={newUnit.modelo_id} onChange={e=>setNewUnit({...newUnit,modelo_id:e.target.value})}>
                  {HARDWARE_CATALOG.map(m=><option key={m.id} value={m.id}>{m.marca} {m.modelo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-outline mb-1.5">Número de serie</label>
                <input className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-mono"
                  placeholder="Ej: ING-MV5K-003" value={newUnit.serial}
                  onChange={e=>setNewUnit({...newUnit,serial:e.target.value.toUpperCase()})}/>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-outline mb-1.5">Tipo de ingreso</label>
                <select className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm"
                  value={newUnit.tipoIngreso} onChange={e=>setNewUnit({...newUnit,tipoIngreso:e.target.value})}>
                  <option value="venta">Venta</option>
                  <option value="alquiler">Alquiler</option>
                  <option value="gratis">Gratis</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <BtnOutline className="flex-1" onClick={()=>setShowAddUnit(false)}>Cancelar</BtnOutline>
              <BtnPrimary className="flex-1" onClick={addUnit} disabled={!newUnit.serial.trim()}>
                <Icon n="add" className="text-[16px]"/> Registrar
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* Bulk upload modal (Gantt #53) */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e=>e.target===e.currentTarget&&setShowBulk(false)}>
          <div className="absolute inset-0 bg-black/20" onClick={()=>setShowBulk(false)}/>
          <div className="relative bg-surface rounded-2xl shadow-2xl border border-outline-variant p-6 w-full max-w-lg z-10">
            <h2 className="font-semibold text-lg mb-1">Carga masiva de unidades</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Archivo .csv, .txt o .xlsx, una unidad por línea/fila: <code className="font-mono bg-surface-container-low px-1 rounded">modelo_id,serial,tipo_ingreso</code>.
              Modelos válidos: {HARDWARE_CATALOG.map(m=>m.id).join(", ")}. Tipo de ingreso: gratis / alquiler / venta (default venta).
            </p>
            <input type="file" accept=".csv,.txt,.xlsx,.xls" className="text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container-low file:text-xs file:cursor-pointer w-full"
              onChange={e => e.target.files?.[0] && parseBulkFile(e.target.files[0])}/>
            {bulkRows.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto border border-outline-variant rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-surface-container-low font-mono text-[9px] uppercase text-outline">
                    <th className="px-3 py-2 text-left">Modelo</th><th className="px-3 py-2 text-left">Serie</th><th className="px-3 py-2 text-left">Ingreso</th><th className="px-3 py-2 text-left">Válido</th>
                  </tr></thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {bulkRows.map((r, i) => (
                      <tr key={i} className={r.valido ? "" : "bg-error-container/20"}>
                        <td className="px-3 py-1.5 font-mono">{r.modelo}</td>
                        <td className="px-3 py-1.5 font-mono">{r.serial || "—"}</td>
                        <td className="px-3 py-1.5">{TIPO_INGRESO_LABEL[r.tipoIngreso]}</td>
                        <td className="px-3 py-1.5">{r.valido ? <Icon n="check_circle" className="text-ok text-[14px]"/> : <Icon n="error" className="text-error text-[14px]"/>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[10px] text-on-surface-variant font-mono">{bulkFileName} · {bulkRows.filter(r=>r.valido).length} de {bulkRows.length} válidas</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <BtnOutline className="flex-1" onClick={()=>{setShowBulk(false); setBulkRows([]); setBulkFileName("");}}>Cancelar</BtnOutline>
              <BtnPrimary className="flex-1" onClick={confirmarBulk} disabled={!bulkRows.some(r=>r.valido) || bulkBusy}>
                <Icon n="upload_file" className="text-[16px]"/> {bulkBusy ? "Registrando…" : `Registrar ${bulkRows.filter(r=>r.valido).length} unidades`}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Banditas NFC — stock real por lote, carga masiva vía CSV ────────────── */
const ESTADO_STYLE_NFC = {
  disponible: "bg-green-100  text-green-700  border-green-200",
  asignada:   "bg-blue-100   text-blue-700   border-blue-200",
  activa:     "bg-purple-100 text-purple-700 border-purple-200",
  bloqueada:  "bg-red-100    text-red-700    border-red-200",
};
const FORMA_COBRO_LABEL = {
  contraentrega: "Contraentrega",
  anticipado: "Pago anticipado",
  descuento_ventas: "Descuento de ventas",
};

function BanditasNfcTab() {
  const st = useStore();
  const mundos = st.mundos || [];
  const [bandas, setBandas] = useState(null);
  const [solicitudes, setSolicitudes] = useState(null);
  const [expandedWorldId, setExpandedWorldId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [solicitudesLote, setSolicitudesLote] = useState(null);
  const [stockAlmacen, setStockAlmacen] = useState(null);
  const [entregandoLoteId, setEntregandoLoteId] = useState(null);
  const [filterLote, setFilterLote] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkLote, setBulkLote] = useState("");
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [renombrandoLote, setRenombrandoLote] = useState(null); // nombre viejo del lote en edición
  const [nombreLoteNuevo, setNombreLoteNuevo] = useState("");
  const [eliminandoLote, setEliminandoLote] = useState(null); // nombre del lote con confirmación de borrado abierta
  const [eliminandoLoteBusy, setEliminandoLoteBusy] = useState(false);
  const [eliminarLoteError, setEliminarLoteError] = useState(null); // { lote, mensaje } cuando el borrado se bloqueó
  const [revirtiendoLoteBusy, setRevirtiendoLoteBusy] = useState(false);

  // Asignación: el precio/modelo se estipula ACÁ, no al cargar el lote — cada
  // asignación es su propio lote comercial. Selección multi-banda vía
  // checkbox (no solo un número): tipear una cantidad premarca las N más
  // antiguas disponibles, pero se puede ajustar código por código.
  const [asignandoLote, setAsignandoLote] = useState(null);
  const [asignarLoteWorldId, setAsignarLoteWorldId] = useState("");
  const [seleccionLote, setSeleccionLote] = useState(new Set());
  const [asignarModelo, setAsignarModelo] = useState("gratuita");
  const [asignarPrecio, setAsignarPrecio] = useState("");
  const [asignarFormaCobro, setAsignarFormaCobro] = useState("contraentrega");
  const [asignandoLoteBusy, setAsignandoLoteBusy] = useState(false);

  // Cobro pendiente (contraentrega/anticipado) + historial de acciones.
  const [pendientesCobro, setPendientesCobro] = useState(null);
  const [pagandoAsignacionId, setPagandoAsignacionId] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [comprobanteNombre, setComprobanteNombre] = useState("");
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [descripcionPago, setDescripcionPago] = useState("");
  const [pagandoBusy, setPagandoBusy] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historial, setHistorial] = useState(null);

  const load = () => fetchNfcBandsRemote()
    .then(rows => setBandas((rows || []).map(r => ({ id: r.id, codigo: r.codigo, lote: r.lote, estado: r.estado, world_id: r.world_id, precio_unitario: r.precio_unitario, created_at: r.created_at }))))
    .catch(() => setBandas([]));
  const loadSolicitudes = () => fetchSolicitudesNfcTodas().then(setSolicitudes).catch(() => setSolicitudes([]));
  const loadSolicitudesLote = () => fetchSolicitudesLoteNfcTodas().then(setSolicitudesLote).catch(() => setSolicitudesLote([]));
  const loadStockAlmacen = () => fetchStockAlmacenNfc().then(setStockAlmacen).catch(() => setStockAlmacen(0));
  const loadPendientesCobro = () => fetchAsignacionesPendientesCobro().then(setPendientesCobro).catch(() => setPendientesCobro([]));
  useEffect(() => { load(); loadSolicitudes(); loadSolicitudesLote(); loadStockAlmacen(); loadPendientesCobro(); }, []);

  const abrirHistorial = () => {
    setMostrarHistorial(true);
    if (historial === null) fetchHistorialAsignacionesNfc().then(setHistorial).catch(() => setHistorial([]));
  };

  const entregarLote = async (req) => {
    setEntregandoLoteId(req.id);
    try {
      await entregarLoteNfcRemote(req.id, req.world_id, req.cantidad);
      notify(`${req.cantidad} banditas entregadas.`);
      loadSolicitudesLote(); loadStockAlmacen(); load();
    } catch (e) {
      notify(e.message, "error");
    } finally { setEntregandoLoteId(null); }
  };

  const resolverSolicitud = async (id, status) => {
    setResolvingId(id);
    try {
      await resolverSolicitudNfcRemote(id, status);
      loadSolicitudes();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "nfc-solicitud-resolver", null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setResolvingId(null); }
  };

  // Demanda por mundo: cuántas banditas necesita cada mundo (solicitudes
  // pendientes reales de usuarios, tabla nfc_requests) vs. cuántas ya tiene
  // asignadas en stock (nfc_bands) — la señal que RedPontis usa para decidir
  // cuánto stock físico enviar/asignar a cada mundo.
  const demandaPorMundo = mundos.map(m => {
    const reqs = (solicitudes || []).filter(r => r.world_id === m.id);
    const pendientes = reqs.filter(r => r.status === "pendiente");
    const asignadasStock = (bandas || []).filter(b => b.world_id === m.id).length;
    return { mundo: m, pendientes, entregadas: reqs.filter(r => r.status === "entregada").length, rechazadas: reqs.filter(r => r.status === "rechazada").length, asignadasStock, totalSolicitudes: reqs.length };
  }).filter(d => d.totalSolicitudes > 0 || d.asignadasStock > 0);

  const filtered = (bandas || []).filter(b =>
    (filterLote === "all" || b.lote === filterLote) &&
    (filterEstado === "all" || b.estado === filterEstado)
  );

  // El UID real de una bandita SIEMPRE viene en formato de bytes hex separados
  // por dos puntos (ej. 04:D6:01:5A:68:19:94 — 7 bytes, típico de tags NFC
  // como MIFARE Ultralight). Bug real encontrado: exports reales traen una
  // columna "No." de numeración (1, 2, 3…) antes de la columna del UID: si se
  // asume "primera columna = código" o solo se detecta por NOMBRE de
  // encabezado, se termina guardando el número de fila como si fuera el
  // código de la bandita — nunca vuelve a coincidir con el UID real que lee
  // el lector NFC al vincular. Por eso la columna del UID se detecta por su
  // FORMATO real (probando cada columna contra el patrón), no por nombre de
  // encabezado ni por posición — funciona sin importar cómo se llame la
  // columna o en qué orden venga.
  const UID_PATTERN = /^([0-9A-Fa-f]{2}:){2,9}[0-9A-Fa-f]{2}$/;
  // El UID no siempre llega ya separado por dos puntos — el mismo dato puede
  // venir como hex corrido (04D6015A681994) o con otro separador (guiones,
  // espacios) según cómo lo haya exportado el lector/proveedor. Se normaliza
  // siempre al formato canónico en vez de exigir que el archivo ya venga así.
  const normalizarUid = (raw) => {
    const limpio = String(raw || "").trim().toUpperCase();
    if (UID_PATTERN.test(limpio)) return limpio;
    const soloHex = limpio.replace(/[:\-\s.]/g, "");
    if (!/^[0-9A-F]+$/.test(soloHex) || soloHex.length < 8 || soloHex.length % 2 !== 0) return null;
    return soloHex.match(/.{2}/g).join(":");
  };
  const parseBulkFile = (file) => {
    if (!bulkLote.trim()) { notify("Elige el nombre del lote antes de adjuntar el archivo.", "error"); return; }
    setBulkFileName(file.name);
    leerLineasDeArchivo(file, lines => {
      if (!lines.length) { setBulkRows([]); return; }
      const primeraFila = lines[0].split(",").map(c => c.trim());
      const esEncabezado = !primeraFila.some(c => normalizarUid(c));
      const filas = esEncabezado ? lines.slice(1) : lines;
      const muestra = filas.slice(0, 20).map(l => l.split(",").map(s => s.trim()));
      const numCols = Math.max(0, ...muestra.map(r => r.length));
      let idxUid = 0;
      for (let c = 0; c < numCols; c++) {
        const valores = muestra.map(r => r[c]).filter(Boolean);
        if (valores.length && valores.every(v => normalizarUid(v))) { idxUid = c; break; }
      }
      const rows = filas.map(line => {
        const cols = line.split(",").map(s => s.trim());
        const normalizado = normalizarUid(cols[idxUid]);
        return { codigo: normalizado || (cols[idxUid] || "").toUpperCase(), lote: bulkLote.trim(), valido: !!normalizado };
      });
      setBulkRows(rows);
    });
  };

  const confirmarBulk = async () => {
    const validas = bulkRows.filter(r => r.valido);
    if (!validas.length) return;
    setBulkBusy(true);
    try {
      await registerNfcBandsBulkRemote(validas);
      notify(`${validas.length} banditas del lote "${bulkLote}" registradas en stock.`);
      setShowBulk(false); setBulkRows([]); setBulkFileName(""); setBulkLote("");
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "nfc-carga-masiva", null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBulkBusy(false); }
  };

  const liberar = async (b) => {
    await liberarNfcBandRemote(b.id);
    notify(`${b.codigo} liberada — estado: disponible.`);
    load();
  };

  // Disponibles de un lote, ordenadas de más antigua a más nueva — el orden
  // que usa el premarcado por cantidad (FIFO: se sugiere primero lo que
  // lleva más tiempo en almacén).
  const disponiblesDelLote = (lote) => (bandas || [])
    .filter(b => b.lote === lote && b.estado === "disponible")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const abrirAsignarLote = (lote) => {
    if (asignandoLote === lote) { setAsignandoLote(null); return; }
    setAsignandoLote(lote);
    setAsignarLoteWorldId(""); setAsignarModelo("gratuita"); setAsignarPrecio(""); setAsignarFormaCobro("contraentrega");
    setSeleccionLote(new Set(disponiblesDelLote(lote).map(b => b.id))); // por defecto: todo el lote premarcado
  };

  const premarcarCantidad = (lote, n) => {
    const ids = disponiblesDelLote(lote).slice(0, Math.max(0, n)).map(b => b.id);
    setSeleccionLote(new Set(ids));
  };

  const toggleBanda = (id) => {
    setSeleccionLote(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmarAsignarLote = async (lote) => {
    if (!asignarLoteWorldId || seleccionLote.size === 0) return;
    if (asignarModelo === "pagada" && (!asignarPrecio || Number(asignarPrecio) <= 0)) {
      notify("Ingresa un precio unitario válido.", "error"); return;
    }
    setAsignandoLoteBusy(true);
    try {
      const asig = await crearAsignacionNfcRemote({
        lote, worldId: asignarLoteWorldId, bandIds: [...seleccionLote],
        modelo: asignarModelo,
        precioUnitario: asignarModelo === "pagada" ? asignarPrecio : null,
        formaCobro: asignarModelo === "pagada" ? asignarFormaCobro : null,
      });
      const mundo = mundos.find(m => m.id === asignarLoteWorldId);
      const montoTxt = asig.monto_total ? ` · ${fmtSoles(asig.monto_total)} (${FORMA_COBRO_LABEL[asig.forma_cobro]})` : " · gratuita";
      notify(`${seleccionLote.size} banditas del lote "${lote}" asignadas a ${mundo?.nombre || "mundo"}${montoTxt}.`);
      setAsignandoLote(null); setAsignarLoteWorldId(""); setSeleccionLote(new Set());
      load(); loadPendientesCobro();
    } catch (e) {
      notify(e.message, "error");
    } finally { setAsignandoLoteBusy(false); }
  };

  // Marcar pagada: sirve tanto para "anticipado" (se paga antes de entregar)
  // como "contraentrega" (entregar y pagar es la misma acción en la UI,
  // aunque el PATCH es idéntico). Siempre con comprobante + descripción
  // opcional para trazabilidad comercial.
  const subirComprobantePago = async (file) => {
    if (!file) return;
    setSubiendoComprobante(true);
    try {
      const path = `nfc-asignaciones/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      setComprobanteUrl(url); setComprobanteNombre(file.name);
    } catch (e) {
      notify("No se pudo subir el comprobante: " + e.message, "error");
    } finally { setSubiendoComprobante(false); }
  };

  const confirmarPagoAsignacion = async (asig) => {
    setPagandoBusy(true);
    try {
      await marcarAsignacionPagadaRemote(asig.id, { comprobanteUrl, comprobanteNombre, descripcion: descripcionPago.trim() || null });
      notify(`Asignación de ${asig.cantidad} banditas (${mundos.find(m => m.id === asig.world_id)?.nombre || asig.world_id}) marcada como pagada.`);
      setPagandoAsignacionId(null); setComprobanteUrl(""); setComprobanteNombre(""); setDescripcionPago("");
      loadPendientesCobro(); load();
    } catch (e) {
      notify("No se pudo marcar como pagada: " + e.message, "error");
    } finally { setPagandoBusy(false); }
  };

  const confirmarRenombrarLote = async (loteViejo) => {
    const nuevo = nombreLoteNuevo.trim();
    if (!nuevo || nuevo === loteViejo) { setRenombrandoLote(null); return; }
    try {
      await renombrarLoteNfcRemote(loteViejo, nuevo);
      notify(`Lote renombrado a "${nuevo}".`);
      if (filterLote === loteViejo) setFilterLote(nuevo);
      setRenombrandoLote(null); setNombreLoteNuevo("");
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "nfc-lote-renombrar", null);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };

  // Borrar un lote es para deshacer una carga mala. Si tiene banditas ya
  // asignadas/activas, el backend lo rechaza — acá se ofrece "revertir" como
  // salida (deja las asignadas-sin-usuario de vuelta en almacén) en vez de
  // dejar a la usuaria sin ninguna acción posible.
  const confirmarEliminarLote = async (lote) => {
    setEliminandoLoteBusy(true);
    setEliminarLoteError(null);
    try {
      await eliminarLoteNfcRemote(lote);
      notify(`Lote "${lote}" eliminado.`);
      setEliminandoLote(null);
      if (filterLote === lote) setFilterLote("all");
      load();
    } catch (e) {
      setEliminarLoteError({ lote, mensaje: e.message });
    } finally { setEliminandoLoteBusy(false); }
  };

  const revertirYReintentar = async (lote) => {
    setRevirtiendoLoteBusy(true);
    try {
      const n = await revertirAsignacionesLoteRemote(lote);
      if (n > 0) notify(`${n} bandita(s) revertidas a almacén.`);
      load();
      setEliminarLoteError(null);
    } catch (e) {
      notify(e.message, "error");
    } finally { setRevirtiendoLoteBusy(false); }
  };

  const lotes = [...new Set((bandas || []).map(b => b.lote))];
  const byLote = lotes.map(lote => {
    const bandasLote = (bandas || []).filter(b => b.lote === lote);
    return {
      lote,
      total: bandasLote.length,
      disponible: bandasLote.filter(b => b.estado === "disponible").length,
      asignada: bandasLote.filter(b => b.estado === "asignada").length,
      activa: bandasLote.filter(b => b.estado === "activa").length,
      enUso: bandasLote.filter(b => b.world_id).length,
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <p className="text-sm text-on-surface-variant max-w-3xl">
          Stock real de pulseras NFC (tabla <code>nfc_bands</code> en vivo). Cada bandita tiene un código único (UID), agrupada por lote de carga.
          El precio y la forma de cobro se estipulan al asignar el lote a un mundo, no al cargarlo.
          {stockAlmacen !== null && <span className="block mt-1 font-mono text-xs text-primary">{stockAlmacen} sin asignar en almacén</span>}
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <BtnOutline onClick={abrirHistorial}>
            <Icon n="history" className="text-[16px]"/> Historial
          </BtnOutline>
          <BtnPrimary onClick={()=>setShowBulk(true)}>
            <Icon n="upload_file" className="text-[16px]"/> Cargar lote (CSV)
          </BtnPrimary>
        </div>
      </div>

      {/* Cobro pendiente — asignaciones "pagada" (anticipado/contraentrega)
          que todavía no se marcaron pagadas. Descuento de ventas NO aparece
          acá: se resuelve solo, restándose del neto de la liquidación. */}
      {pendientesCobro !== null && pendientesCobro.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-amber-300 flex items-center gap-2">
            <Icon n="payments" className="text-amber-700 text-[20px]"/>
            <h3 className="font-semibold text-amber-900">Cobro pendiente antes de entregar ({pendientesCobro.length})</h3>
          </div>
          <div className="divide-y divide-amber-200">
            {pendientesCobro.map(asig => {
              const mundo = mundos.find(m => m.id === asig.world_id);
              const esContraentrega = asig.forma_cobro === "contraentrega";
              return (
                <div key={asig.id} className="p-4">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold">{asig.cantidad} banditas · {mundo?.nombre || asig.world_id}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Lote {asig.lote} · {fmtSoles(asig.monto_total)} · {FORMA_COBRO_LABEL[asig.forma_cobro]} · {new Date(asig.created_at).toLocaleDateString("es-PE")}
                      </p>
                    </div>
                    {pagandoAsignacionId !== asig.id && (
                      <BtnPrimary className="!py-1.5 !px-3 !text-xs" onClick={()=>{ setPagandoAsignacionId(asig.id); setComprobanteUrl(""); setComprobanteNombre(""); setDescripcionPago(""); }}>
                        {esContraentrega ? "Entregar y marcar pagado" : "Marcar banditas pagadas"}
                      </BtnPrimary>
                    )}
                  </div>
                  {pagandoAsignacionId === asig.id && (
                    <div className="mt-3 p-3 bg-surface rounded-lg border border-outline-variant space-y-3">
                      <div>
                        <label className="block text-xs font-mono uppercase text-outline mb-1.5">Comprobante de pago (boleta/voucher del mundo)</label>
                        <input type="file" accept="image/*,.pdf" disabled={subiendoComprobante}
                          className="text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container-low file:text-xs file:cursor-pointer"
                          onChange={e => e.target.files?.[0] && subirComprobantePago(e.target.files[0])}/>
                        {subiendoComprobante && <p className="text-[10px] text-on-surface-variant mt-1">Subiendo…</p>}
                        {comprobanteNombre && <p className="text-[10px] text-ok mt-1 flex items-center gap-1"><Icon n="check_circle" className="text-[12px]"/> {comprobanteNombre}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase text-outline mb-1.5">Detalle comercial (opcional)</label>
                        <input className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm"
                          placeholder="Ej: transferencia BCP, referencia #123" value={descripcionPago} onChange={e=>setDescripcionPago(e.target.value)}/>
                      </div>
                      <div className="flex gap-2">
                        <BtnPrimary className="!py-1.5 !px-3 !text-xs" disabled={pagandoBusy} onClick={()=>confirmarPagoAsignacion(asig)}>
                          {pagandoBusy ? "Guardando…" : esContraentrega ? "Confirmar entrega y pago" : "Confirmar pago"}
                        </BtnPrimary>
                        <button onClick={()=>setPagandoAsignacionId(null)} className="text-xs text-on-surface-variant">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Solicitudes de LOTE — el mundo pidió más stock (nfc_band_requests),
          distinto de las solicitudes individuales de usuarios de abajo. Entregar
          consume del almacén (world_id IS NULL) y lo asigna al mundo. */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2"><Icon n="local_shipping" className="text-primary text-[20px]"/> Solicitudes de lote de mundos</h3>
          <button onClick={loadSolicitudesLote} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="refresh" className="text-[16px]"/></button>
        </div>
        {solicitudesLote === null ? (
          <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
        ) : solicitudesLote.length === 0 ? (
          <p className="px-5 py-4 text-sm text-on-surface-variant">Ningún mundo ha pedido más banditas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
                <th className="px-5 py-3 text-left font-medium">Mundo</th>
                <th className="px-5 py-3 text-right font-medium">Cantidad</th>
                <th className="px-5 py-3 text-left font-medium">Fecha</th>
                <th className="px-5 py-3 text-center font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {solicitudesLote.map(r => {
                const mundo = mundos.find(m => m.id === r.world_id);
                return (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 font-medium">{mundo?.nombre || r.world_id}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold">{r.cantidad}</td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant">{new Date(r.created_at).toLocaleDateString("es-PE")}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-mono text-[8px] uppercase px-2 py-0.5 rounded border font-bold ${r.estado === "entregado" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>{r.estado}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.estado === "pendiente" && (
                        <button disabled={entregandoLoteId === r.id} onClick={() => entregarLote(r)}
                          className="text-xs text-primary hover:underline font-medium disabled:opacity-50">
                          {entregandoLoteId === r.id ? "Entregando…" : "Marcar entregado"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Demanda por mundo — solicitudes reales de usuarios (nfc_requests), la
          cantidad que RedPontis necesita medir para saber cuánto stock asignar. */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2"><Icon n="query_stats" className="text-primary text-[20px]"/> Demanda por mundo</h3>
          <button onClick={loadSolicitudes} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="refresh" className="text-[16px]"/></button>
        </div>
        {solicitudes === null ? (
          <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
        ) : demandaPorMundo.length === 0 ? (
          <p className="px-5 py-4 text-sm text-on-surface-variant">Sin solicitudes de pulsera todavía en ningún mundo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
                <th className="px-5 py-3 text-left font-medium">Mundo</th>
                <th className="px-5 py-3 text-right font-medium">Pendientes</th>
                <th className="px-5 py-3 text-right font-medium">Entregadas</th>
                <th className="px-5 py-3 text-right font-medium">Rechazadas</th>
                <th className="px-5 py-3 text-right font-medium">Banditas ya asignadas</th>
                <th className="px-5 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {demandaPorMundo.map(d => (
                <React.Fragment key={d.mundo.id}>
                  <tr className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 font-medium">{d.mundo.nombre}</td>
                    <td className="px-5 py-3 text-right">
                      {d.pendientes.length > 0
                        ? <span className="font-mono font-black text-tertiary">{d.pendientes.length}</span>
                        : <span className="font-mono text-outline">0</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-on-surface-variant">{d.entregadas}</td>
                    <td className="px-5 py-3 text-right font-mono text-on-surface-variant">{d.rechazadas}</td>
                    <td className="px-5 py-3 text-right font-mono text-on-surface-variant">{d.asignadasStock}</td>
                    <td className="px-5 py-3 text-right">
                      {d.pendientes.length > 0 && (
                        <button onClick={() => setExpandedWorldId(expandedWorldId === d.mundo.id ? null : d.mundo.id)}
                          className="text-xs text-primary hover:underline font-medium">
                          {expandedWorldId === d.mundo.id ? "Ocultar" : "Ver solicitudes"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedWorldId === d.mundo.id && (
                    <tr className="bg-primary-fixed/10">
                      <td colSpan="6" className="px-5 py-3">
                        <div className="space-y-2">
                          {d.pendientes.map(r => (
                            <div key={r.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 border border-outline-variant/60">
                              <div>
                                <p className="text-xs font-medium flex items-center gap-1.5">
                                  {r.nombre || <span className="font-mono text-outline">{r.user_id.slice(0, 20)}…</span>}
                                  {r.motivo === "perdida_robo" && <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border font-bold bg-amber-100 text-amber-700 border-amber-200">Reposición</span>}
                                </p>
                                <p className="font-mono text-[10px] text-outline">{new Date(r.created_at).toLocaleDateString("es-PE")}</p>
                              </div>
                              <div className="flex gap-2">
                                <button disabled={resolvingId === r.id} onClick={() => resolverSolicitud(r.id, "entregada")}
                                  className="px-2.5 py-1 rounded bg-ok/10 text-ok text-xs font-bold">Entregar</button>
                                <button disabled={resolvingId === r.id} onClick={() => resolverSolicitud(r.id, "rechazada")}
                                  className="px-2.5 py-1 rounded bg-error-container text-error text-xs font-bold">Rechazar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {byLote.length === 0 ? (
        bandas !== null && (
          <div className="p-10 text-center text-on-surface-variant border border-dashed border-outline-variant rounded-xl mb-6">
            <Icon n="contactless" className="text-[36px] text-outline mb-2 block mx-auto"/>
            Sin banditas cargadas todavía. Usa "Cargar lote (CSV)" para el primero.
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {byLote.map(l => (
            <div key={l.lote}
              className={`p-3 rounded-xl border transition-all ${filterLote===l.lote?"border-primary bg-primary-fixed/20":"border-outline-variant hover:border-primary/40"}`}>
              <div onClick={()=>setFilterLote(filterLote===l.lote?"all":l.lote)} className="cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Icon n="contactless" className="text-[16px] text-primary"/>
                  <span className="text-xs font-bold leading-tight">Lote {l.lote}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-700 font-mono">{l.disponible} disp.</span>
                  <span className="text-blue-700 font-mono">{l.asignada} asig.</span>
                </div>
                <p className="font-mono text-[9px] text-outline mt-1">{l.total} total</p>
              </div>
              <div className="flex gap-2 mt-2 pt-2 border-t border-outline-variant/60 flex-wrap">
                <button
                  onClick={(e)=>{ e.stopPropagation(); abrirAsignarLote(l.lote); }}
                  disabled={l.disponible===0}
                  className="text-[10px] text-primary hover:underline font-medium disabled:opacity-30 disabled:no-underline">Asignar</button>
                <button
                  onClick={(e)=>{ e.stopPropagation(); setRenombrandoLote(renombrandoLote===l.lote?null:l.lote); setNombreLoteNuevo(l.lote); }}
                  className="text-[10px] text-on-surface-variant hover:text-primary font-medium">Renombrar</button>
                <button
                  onClick={(e)=>{ e.stopPropagation(); setEliminandoLote(eliminandoLote===l.lote?null:l.lote); setEliminarLoteError(null); }}
                  className="text-[10px] text-error hover:underline font-medium">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Renombrar lote — inline, un lote a la vez */}
      {renombrandoLote && (
        <div className="mb-4 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center gap-2 flex-wrap">
          <span className="text-xs text-on-surface-variant">Renombrar lote "{renombrandoLote}" a</span>
          <input className="h-8 px-2 bg-surface border border-outline-variant rounded-lg text-xs flex-1 min-w-[140px]"
            value={nombreLoteNuevo} onChange={e=>setNombreLoteNuevo(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && confirmarRenombrarLote(renombrandoLote)} autoFocus/>
          <BtnPrimary className="!py-1.5 !px-3 !text-xs" onClick={()=>confirmarRenombrarLote(renombrandoLote)}>Guardar</BtnPrimary>
          <button onClick={()=>setRenombrandoLote(null)} className="text-xs text-on-surface-variant">Cancelar</button>
        </div>
      )}

      {/* Eliminar lote — solo posible si ninguna bandita salió del almacén.
          Si el backend lo bloquea, se ofrece revertir las asignaciones que
          todavía no llegaron a un usuario real y reintentar. */}
      {eliminandoLote && (
        <div className="mb-8 p-4 bg-error-container/10 border border-error/30 rounded-xl">
          {!eliminarLoteError ? (
            <>
              <p className="text-xs font-bold mb-1">¿Eliminar el lote "{eliminandoLote}"?</p>
              <p className="text-xs text-on-surface-variant mb-3">Borra sus {byLote.find(l=>l.lote===eliminandoLote)?.total || 0} código(s) del stock. No se puede deshacer.</p>
              <div className="flex items-center gap-2">
                <BtnPrimary className="!py-1.5 !px-3 !text-xs !bg-error" disabled={eliminandoLoteBusy} onClick={()=>confirmarEliminarLote(eliminandoLote)}>
                  {eliminandoLoteBusy ? "Eliminando…" : "Sí, eliminar"}
                </BtnPrimary>
                <button onClick={()=>setEliminandoLote(null)} className="text-xs text-on-surface-variant">Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-error mb-1">No se pudo eliminar</p>
              <p className="text-xs text-on-surface-variant mb-3">{eliminarLoteError.mensaje}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {byLote.find(l=>l.lote===eliminandoLote)?.activa > 0 && (
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-100 border border-purple-200 rounded px-2 py-1">
                    {byLote.find(l=>l.lote===eliminandoLote)?.activa} activa(s) en manos de un usuario — esas nunca se borran ni revierten.
                  </span>
                )}
                <BtnOutline className="!py-1.5 !px-3 !text-xs" disabled={revirtiendoLoteBusy} onClick={()=>revertirYReintentar(eliminandoLote)}>
                  {revirtiendoLoteBusy ? "Revirtiendo…" : "Revertir asignaciones sin usuario y reintentar"}
                </BtnOutline>
                <button onClick={()=>{ setEliminandoLote(null); setEliminarLoteError(null); }} className="text-xs text-on-surface-variant">Cerrar</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Asignar banditas de un lote específico a un mundo — selección
          múltiple por checkbox (no solo un número): tipear una cantidad
          premarca las N más antiguas disponibles, pero se puede ajustar
          código por código. Precio/modelo/forma de cobro se deciden ACÁ. */}
      {asignandoLote && (() => {
        const disp = disponiblesDelLote(asignandoLote);
        const n = seleccionLote.size;
        const montoTotal = asignarModelo === "pagada" && asignarPrecio ? Number(asignarPrecio) * n : 0;
        return (
          <div className="mb-8 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <p className="text-xs font-bold mb-3">Asignar del lote "{asignandoLote}" ({disp.length} disponibles)</p>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <select className="h-9 px-2 bg-surface border border-outline-variant rounded-lg text-xs"
                value={asignarLoteWorldId} onChange={e=>setAsignarLoteWorldId(e.target.value)}>
                <option value="">Elegir mundo…</option>
                {mundos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <span className="text-xs text-on-surface-variant">Cantidad</span>
              <NumInput className="h-9 w-20 px-2 bg-surface border border-outline-variant rounded-lg text-xs"
                min="0" max={disp.length}
                value={n} onChange={v=>premarcarCantidad(asignandoLote, v)}/>
              <button onClick={()=>premarcarCantidad(asignandoLote, disp.length)}
                className="text-[10px] text-primary hover:underline">Todo el lote</button>
              <button onClick={()=>setSeleccionLote(new Set())}
                className="text-[10px] text-on-surface-variant hover:underline">Ninguna</button>
            </div>

            {/* Lista de códigos — checkbox individual, premarcados por la cantidad de arriba */}
            <div className="max-h-40 overflow-y-auto border border-outline-variant rounded-lg mb-3 bg-surface">
              {disp.map(b => (
                <label key={b.id} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/40 last:border-0">
                  <input type="checkbox" checked={seleccionLote.has(b.id)} onChange={()=>toggleBanda(b.id)} className="accent-primary"/>
                  {b.codigo}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-xs text-on-surface-variant">Modelo</span>
              <button onClick={()=>setAsignarModelo("gratuita")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${asignarModelo==="gratuita"?"bg-primary text-white border-primary":"border-outline-variant text-on-surface-variant"}`}>Gratuita</button>
              <button onClick={()=>setAsignarModelo("pagada")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${asignarModelo==="pagada"?"bg-primary text-white border-primary":"border-outline-variant text-on-surface-variant"}`}>Pagada</button>
            </div>

            {asignarModelo === "pagada" && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-xs text-on-surface-variant">Precio unitario S/</span>
                <input type="number" step="0.01" min="0" className="h-9 w-24 px-2 bg-surface border border-outline-variant rounded-lg text-xs"
                  value={asignarPrecio} onChange={e=>setAsignarPrecio(e.target.value)}/>
                <span className="text-xs text-on-surface-variant ml-2">Forma de cobro</span>
                {Object.entries(FORMA_COBRO_LABEL).map(([k, label]) => (
                  <button key={k} onClick={()=>setAsignarFormaCobro(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${asignarFormaCobro===k?"bg-primary text-white border-primary":"border-outline-variant text-on-surface-variant"}`}>{label}</button>
                ))}
                {montoTotal > 0 && (
                  <span className="text-[10px] font-mono text-primary bg-primary-fixed/20 rounded px-2 py-1">
                    Total: {fmtSoles(montoTotal)}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <BtnPrimary className="!py-1.5 !px-3 !text-xs" disabled={!asignarLoteWorldId || n===0 || asignandoLoteBusy} onClick={()=>confirmarAsignarLote(asignandoLote)}>
                {asignandoLoteBusy ? "Asignando…" : `Asignar (${n} banditas seleccionadas)`}
              </BtnPrimary>
              <button onClick={()=>setAsignandoLote(null)} className="text-xs text-on-surface-variant">Cancelar</button>
            </div>
          </div>
        );
      })()}

      {byLote.length > 0 && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "disponible", "asignada", "bloqueada"].map(e => (
              <button key={e} onClick={()=>setFilterEstado(e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterEstado===e?"bg-primary text-white border-primary":"border-outline-variant text-on-surface-variant hover:border-primary/40"}`}>
                {e==="all"?"Todos":e}
              </button>
            ))}
            <span className="ml-auto font-mono text-[10px] text-outline self-center">{bandas===null?"cargando…":`${filtered.length} banditas`}</span>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
                  <th className="px-4 py-3 text-left font-medium">Código</th>
                  <th className="px-4 py-3 text-left font-medium">Lote</th>
                  <th className="px-4 py-3 text-left font-medium">Precio</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Mundo asignado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {filtered.length === 0 && (
                  <tr><td colSpan="6" className="p-10 text-center text-on-surface-variant">Sin banditas con estos filtros.</td></tr>
                )}
                {filtered.map(b => {
                  const mundo = mundos.find(m => m.id === b.world_id);
                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold">{b.codigo}</td>
                      <td className="px-4 py-3 text-xs">{b.lote}</td>
                      <td className="px-4 py-3 text-xs font-mono">{fmtSoles(b.precio_unitario) || <span className="text-outline">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[8px] uppercase px-2 py-0.5 rounded border font-bold ${ESTADO_STYLE_NFC[b.estado]||""}`}>{b.estado}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">{mundo?.nombre || <span className="text-outline">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        {b.estado==="disponible" && (
                          <button onClick={()=>abrirAsignarLote(b.lote)} className="text-xs text-primary hover:underline font-medium">Asignar lote</button>
                        )}
                        {b.estado==="asignada" && (
                          <button onClick={()=>liberar(b)} className="text-xs text-on-surface-variant hover:text-primary font-medium">Liberar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e=>e.target===e.currentTarget&&setShowBulk(false)}>
          <div className="absolute inset-0 bg-black/20" onClick={()=>setShowBulk(false)}/>
          <div className="relative bg-surface rounded-2xl shadow-2xl border border-outline-variant p-6 w-full max-w-lg z-10">
            <h2 className="font-semibold text-lg mb-1">Cargar lote de banditas NFC</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Elige el nombre del lote y adjunta un archivo .csv, .txt o .xlsx con el UID de cada bandita (formato tipo 04:D6:01:5A:68:19:94).
              La columna se detecta por ese formato, sin importar en qué posición venga ni cómo se llame su encabezado. Si la celda trae el UID sin los dos puntos (ej. 04D6015A681994) se convierte solo. El precio se estipula al asignar el lote a un mundo, no acá.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-mono uppercase text-outline mb-1.5">Nombre del lote</label>
              <input className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm"
                placeholder="Ej: Lote 1" value={bulkLote} onChange={e=>setBulkLote(e.target.value)}/>
            </div>
            <input type="file" accept=".csv,.txt,.xlsx,.xls" disabled={!bulkLote.trim()}
              className="text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container-low file:text-xs file:cursor-pointer w-full disabled:opacity-50"
              onChange={e => e.target.files?.[0] && parseBulkFile(e.target.files[0])}/>
            {bulkRows.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto border border-outline-variant rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-surface-container-low font-mono text-[9px] uppercase text-outline">
                    <th className="px-3 py-2 text-left">UID</th><th className="px-3 py-2 text-left">Lote</th><th className="px-3 py-2 text-left">Válido</th>
                  </tr></thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {bulkRows.map((r, i) => (
                      <tr key={i} className={r.valido ? "" : "bg-error-container/20"}>
                        <td className="px-3 py-1.5 font-mono">{r.codigo || "—"}</td>
                        <td className="px-3 py-1.5">{r.lote}</td>
                        <td className="px-3 py-1.5">{r.valido ? <Icon n="check_circle" className="text-ok text-[14px]"/> : <Icon n="error" className="text-error text-[14px]"/>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[10px] text-on-surface-variant font-mono">{bulkFileName} · {bulkRows.filter(r=>r.valido).length} de {bulkRows.length} válidas</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <BtnOutline className="flex-1" onClick={()=>{setShowBulk(false); setBulkRows([]); setBulkFileName(""); setBulkLote("");}}>Cancelar</BtnOutline>
              <BtnPrimary className="flex-1" onClick={confirmarBulk} disabled={!bulkRows.some(r=>r.valido) || bulkBusy}>
                <Icon n="upload_file" className="text-[16px]"/> {bulkBusy ? "Registrando…" : `Registrar ${bulkRows.filter(r=>r.valido).length} banditas`}
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* Historial de acciones — todas las asignaciones (precio, modelo, forma
          de cobro, estado de pago, comprobante) para trazabilidad comercial. */}
      {mostrarHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e=>e.target===e.currentTarget&&setMostrarHistorial(false)}>
          <div className="absolute inset-0 bg-black/20" onClick={()=>setMostrarHistorial(false)}/>
          <div className="relative bg-surface rounded-2xl shadow-2xl border border-outline-variant p-6 w-full max-w-3xl z-10 max-h-[80vh] flex flex-col">
            <h2 className="font-semibold text-lg mb-4 flex-shrink-0">Historial de asignaciones de banditas NFC</h2>
            <div className="overflow-y-auto flex-1">
              {historial === null ? (
                <p className="text-sm text-on-surface-variant py-8 text-center">Cargando…</p>
              ) : historial.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-8 text-center">Sin asignaciones todavía.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-container-low font-mono text-[9px] uppercase text-outline sticky top-0">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Mundo</th>
                      <th className="px-3 py-2 text-left">Lote</th>
                      <th className="px-3 py-2 text-right">Cant.</th>
                      <th className="px-3 py-2 text-left">Modelo</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                      <th className="px-3 py-2 text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {historial.map(h => {
                      const mundo = mundos.find(m => m.id === h.world_id);
                      return (
                        <tr key={h.id} className="hover:bg-surface-container-low">
                          <td className="px-3 py-2 whitespace-nowrap">{new Date(h.created_at).toLocaleDateString("es-PE")}</td>
                          <td className="px-3 py-2">{mundo?.nombre || h.world_id}</td>
                          <td className="px-3 py-2">{h.lote}</td>
                          <td className="px-3 py-2 text-right font-bold">{h.cantidad}</td>
                          <td className="px-3 py-2">{h.modelo === "gratuita" ? "Gratuita" : FORMA_COBRO_LABEL[h.forma_cobro] || "Pagada"}</td>
                          <td className="px-3 py-2 text-right">{fmtSoles(h.monto_total) || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border font-bold ${
                              h.estado_pago === "pagado" || h.estado_pago === "gratuita" || h.estado_pago === "descontado" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}>{h.estado_pago}</span>
                          </td>
                          <td className="px-3 py-2 max-w-[200px]">
                            {h.comprobante_url && <a href={h.comprobante_url} target="_blank" rel="noreferrer" className="text-primary hover:underline block">Ver comprobante</a>}
                            {h.descripcion && <span className="text-on-surface-variant block truncate" title={h.descripcion}>{h.descripcion}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex-shrink-0 pt-4">
              <BtnOutline onClick={()=>setMostrarHistorial(false)}>Cerrar</BtnOutline>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
