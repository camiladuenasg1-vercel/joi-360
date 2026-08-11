import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "./hooks";
import { moduleCat, promoVigente, update, uid, session, sponsorLogin, sponsorLogout, anuncianteLogin, anuncianteLogout, getAnunciante, merchantLogin, merchantPinLogin, merchantLogout, generarPassword, rubroNombre, rubrosDeVertical, modosDeMundo, liquidacionConfigDe, generarLiquidacionMundo, HARDWARE_CATALOG, nomenclaturaFamiliar } from "./store";
import { Icon, Pill, Toggle, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify, NumInput } from "./ui";
import { upsertProgramaBNPL, fetchProgramaBNPL, fetchContratosBNPL, sincronizarCicloBNPL, resolverSolicitudBNPL, fetchNotificacionesBNPL, marcarNotificacionBNPLLeida, fetchConsumosMundo, fetchVentasPorComercioMundo, fetchHistorialVentasMundo, fetchProductsRemote, upsertProductRemote, deleteProductRemote, buscarWalletPorCodigo, cobrarPOSRemote, recargarPOSRemote, abrirTurnoRemote, fetchVentasComercio, fetchVentasComercioHoy, fetchTransaccionesMundo, fetchDependientesMundo, fetchSolicitudesNfcMundo, resolverSolicitudNfcRemote, fetchTicketsDeEvento, errorControlado, logErrorControlado, saldoPendienteBNPL, reprogramarCuotasBNPL, modificarFechaCuotaBNPL, refinanciarBNPL, condonarInteresesBNPL, eliminarMoraBNPL, aplicarDescuentoBNPL, registrarPagoManualBNPL, cancelarAnticipadoBNPL, declararIncobrableBNPL, crearSolicitudComercio, fetchSolicitudesComercioMundo, fetchCampanasBNPL, crearCampanaBNPL, eliminarCampanaBNPL, canjearCuponRemote, fetchMenuItemsMerchant, crearMenuItemRemote, actualizarMenuItemRemote, eliminarMenuItemRemote, fetchReservasFuturasDePlato, fetchProgramacionMerchant, guardarProgramacionItem, fetchAccesosMundo, registrarAccesoRemote, actualizarVisibilidadMerchantRemote, crearTicketSoporteRemote, fetchProductosMundo, fetchMenuReservasMundo, fetchAlertasConsumoMundo, fetchPerfilesExtendidosMundo, fetchLiquidacionesMundoRemote, fetchPromocionesMundo, fetchAlertasMundo, marcarAlertaMundoLeida, uploadArchivo, actualizarFotoMerchantRemote, crearSolicitudLoteNfcRemote, fetchSolicitudesLoteNfcMundo, fetchUsuariosDeMundo, crearRequerimientoHardware, fetchRequerimientosHardwareMundo, fetchNfcBandsRemote, fetchTurnosMundo, crearChargeRequestRemote, fetchChargeRequestRemote, cancelarChargeRequestRemote } from "./supabase.js";
import { EventoDrawer, TabComerciosOrganizador, TabAsistenciaOrganizador, TabBanditasEventoOrganizador, TabLiqOrganizador } from "./OrganizadorFront.jsx";

/* ── Recargas recientes del mundo (Panel Mundo — "Ver recargas de padres") ── */
function RecargasMundoWidget({ worldId }) {
  const [txs, setTxs] = useState(null);
  const [filtroCanal, setFiltroCanal] = useState("todos");
  useEffect(() => { fetchTransaccionesMundo(worldId, "recarga", 100).then(setTxs).catch(() => setTxs([])); }, [worldId]);
  const canales = [...new Set((txs || []).map(t => t.channel_id).filter(Boolean))];
  const filtrados = (txs || []).filter(t => filtroCanal === "todos" || t.channel_id === filtroCanal);
  const total = filtrados.reduce((a, t) => a + (+t.amount || 0), 0);

  const exportar = () => {
    const header = "usuario,canal,monto,estado,fecha\n";
    const filas = filtrados.map(t => [t.wallets?.user_id || "", t.channel_id || "", t.amount, t.status, t.created_at].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recargas-${worldId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center gap-2 flex-wrap">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="add_card" className="text-primary text-[20px]" /> Recargas recientes</h3>
        <div className="flex items-center gap-2">
          {canales.length > 1 && (
            <select className="h-7 px-2 bg-surface border border-outline-variant rounded-lg text-[10px]" value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}>
              <option value="todos">Todos los canales</option>
              {canales.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <span className="font-mono text-[11px] text-on-surface-variant">S/ {total.toFixed(2)} · {filtrados.length}</span>
          <button onClick={exportar} disabled={!filtrados.length} className="text-outline hover:text-primary disabled:opacity-30" title="Exportar CSV"><Icon n="download" className="text-[16px]" /></button>
        </div>
      </div>
      {txs === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Sin recargas todavía. Cuando un padre recargue saldo desde la app, aparecerá aquí.</p>
      ) : (
        <div className="divide-y divide-outline-variant/60 max-h-72 overflow-y-auto">
          {filtrados.slice(0, 15).map((t, i) => (
            <div key={i} className="px-5 py-2.5 flex justify-between items-center text-sm">
              <div className="min-w-0">
                <p className="font-mono text-xs text-on-surface-variant truncate">{(t.reference || "recarga").slice(0, 34)}</p>
                <p className="font-mono text-[9px] text-outline">usuario {(t.wallets?.user_id || "—").slice(0, 8)}… · {t.channel_id || "—"}</p>
              </div>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="font-mono text-[10px] text-outline">{new Date(t.created_at).toLocaleString("es-PE")}</span>
                <span className="font-mono font-bold text-ok">+S/ {Number(t.amount).toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Familiares vinculados en el mundo (Panel Mundo) ────────────────────── */
function FamiliaresMundoWidget({ worldId, vertical }) {
  const [deps, setDeps] = useState(null);
  useEffect(() => { fetchDependientesMundo(worldId).then(setDeps).catch(() => setDeps([])); }, [worldId]);
  const nom = nomenclaturaFamiliar(vertical);

  const exportar = () => {
    const header = `nombre,${nom.principal.toLowerCase()},fecha_vinculacion\n`;
    const filas = (deps || []).map(d => [d.nombre, d.guardian_user_id, d.created_at].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${nom.dependiente.toLowerCase()}s-${worldId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="family_restroom" className="text-primary text-[20px]" /> {nom.tituloSeccion}</h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-on-surface-variant">{deps === null ? "…" : deps.length}</span>
          <button onClick={exportar} disabled={!deps?.length} className="text-outline hover:text-primary disabled:opacity-30" title="Exportar CSV"><Icon n="download" className="text-[16px]" /></button>
        </div>
      </div>
      {deps === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : deps.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Sin {nom.dependiente.toLowerCase()}s vinculados todavía.</p>
      ) : (
        <div className="divide-y divide-outline-variant/60 max-h-72 overflow-y-auto">
          {deps.map(d => (
            <div key={d.id} className="px-5 py-2.5 flex justify-between items-center text-sm">
              <span className="font-medium">{d.nombre}</span>
              <span className="text-right">
                <p className="font-mono text-[10px] text-on-surface-variant">{nom.principal.toLowerCase()}: {d.guardian_user_id.slice(0, 10)}…</p>
                <p className="font-mono text-[9px] text-outline">vinculado {new Date(d.created_at).toLocaleDateString("es-PE")}</p>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Solicitudes de pulsera NFC (Panel Mundo) ───────────────────────────── */
function SolicitudesNfcWidget({ worldId, vertical }) {
  const nom = nomenclaturaFamiliar(vertical);
  const [reqs, setReqs] = useState(null);
  const [bandas, setBandas] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = () => {
    fetchSolicitudesNfcMundo(worldId).then(setReqs).catch(() => setReqs([]));
    fetchNfcBandsRemote(worldId).then(setBandas).catch(() => setBandas([]));
  };
  useEffect(() => { load(); }, [worldId]);
  const resolver = async (id, status) => {
    setBusy(id);
    try {
      await resolverSolicitudNfcRemote(id, status);
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `nfc-resolver:${worldId}`, worldId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBusy(null); }
  };
  const pendientes = (reqs || []).filter(r => r.status === "pendiente");
  const entregadas = (reqs || []).filter(r => r.status === "entregada").length;
  const disponibles = (bandas || []).filter(b => b.estado === "disponible").length;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="contactless" className="text-primary text-[20px]" /> Solicitudes de pulsera NFC</h3>
        {pendientes.length > 0 && <span className="w-6 h-6 rounded-full bg-tertiary text-white text-xs font-black flex items-center justify-center">{pendientes.length}</span>}
      </div>
      {reqs !== null && bandas !== null && (
        <div className="grid grid-cols-3 divide-x divide-outline-variant/60 border-b border-outline-variant bg-surface">
          <div className="px-4 py-3 text-center">
            <p className="font-mono text-[9px] uppercase text-outline">Demanda actual</p>
            <p className={`font-black text-xl mt-0.5 ${pendientes.length > 0 ? "text-tertiary" : "text-on-surface"}`}>{pendientes.length}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="font-mono text-[9px] uppercase text-outline">Entregadas</p>
            <p className="font-black text-xl mt-0.5 text-ok">{entregadas}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="font-mono text-[9px] uppercase text-outline">En stock</p>
            <p className={`font-black text-xl mt-0.5 ${disponibles < pendientes.length ? "text-error" : "text-on-surface"}`}>{disponibles}</p>
          </div>
        </div>
      )}
      {reqs !== null && bandas !== null && disponibles < pendientes.length && (
        <p className="px-5 py-2 text-[11px] text-error bg-error-container/30 border-b border-outline-variant">
          Stock insuficiente para cubrir la demanda pendiente — pide más banditas a RedPontis desde Hardware.
        </p>
      )}
      {reqs === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : reqs.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Sin solicitudes todavía.</p>
      ) : (
        <div className="divide-y divide-outline-variant/60">
          {reqs.map(r => (
            <div key={r.id} className="px-5 py-3 flex justify-between items-center text-sm">
              <div>
                <p className="text-xs font-medium">
                  {r.nombre || (r.esDependiente ? nom.dependiente : nom.principal)}
                  {r.esDependiente && <span className="ml-1.5 font-mono text-[9px] uppercase text-tertiary">{nom.dependiente.toLowerCase()}</span>}
                  {r.motivo === "perdida_robo" && <span className="ml-1.5 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border font-bold bg-amber-100 text-amber-700 border-amber-200">reposición</span>}
                </p>
                <p className="font-mono text-[10px] text-outline">{r.user_id.slice(0, 12)}… · {new Date(r.created_at).toLocaleDateString("es-PE")}</p>
              </div>
              {r.status === "pendiente" ? (
                <div className="flex gap-2">
                  <button disabled={busy === r.id} onClick={() => resolver(r.id, "entregada")} className="px-2.5 py-1 rounded bg-ok/10 text-ok text-xs font-bold">Entregar</button>
                  <button disabled={busy === r.id} onClick={() => resolver(r.id, "rechazada")} className="px-2.5 py-1 rounded bg-error-container text-error text-xs font-bold">Rechazar</button>
                </div>
              ) : (
                <Pill color={r.status === "entregada" ? "bg-ok" : "bg-error"}>{r.status.toUpperCase()}</Pill>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Historial de ventas por comercio (Panel Mundo, Gantt #53) ─────────────
   ConsumosLiveWidget de arriba es un feed cronológico plano — no distingue
   comercio. Acá se agrupa/suma por merchant_id (join con la lista local de
   comercios para el nombre real) para ver quién vende más dentro del mundo. */
function VentasPorComercioWidget({ worldId, comercios }) {
  const [txs, setTxs] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let vivo = true;
    fetchVentasPorComercioMundo(worldId).then(r => { if (vivo) setTxs(r || []); }).catch(() => { if (vivo) setTxs([]); });
    return () => { vivo = false; };
  }, [worldId, reload]);

  const porComercio = React.useMemo(() => {
    const map = new Map();
    for (const t of txs || []) {
      const key = t.merchant_id || "sin_asignar";
      const acc = map.get(key) || { merchantId: key, total: 0, ops: 0 };
      acc.total += +t.amount || 0;
      acc.ops += 1;
      map.set(key, acc);
    }
    return [...map.values()]
      .map(r => ({ ...r, nombre: (comercios || []).find(c => (c.supabaseId || c.id) === r.merchantId)?.nombre || (r.merchantId === "sin_asignar" ? "Sin comercio asignado" : `Comercio ${r.merchantId.slice(0, 8)}…`) }))
      .sort((a, b) => b.total - a.total);
  }, [txs, comercios]);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="leaderboard" className="text-secondary text-[20px]" /> Ventas y consumo por comercio</h3>
        <button onClick={() => setReload(k => k + 1)} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="refresh" className="text-[16px]" /></button>
      </div>
      {txs === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : porComercio.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Aún no hay ventas registradas en ningún comercio de este mundo.</p>
      ) : (
        <div className="divide-y divide-outline-variant/60">
          {porComercio.map(r => (
            <div key={r.merchantId} className="px-5 py-3 flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <Icon n="storefront" className="text-[16px] text-on-surface-variant" />
                <span className="font-medium">{r.nombre}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-on-surface-variant">{r.ops} venta{r.ops === 1 ? "" : "s"}</span>
                <span className="font-mono font-bold">S/ {r.total.toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Mi catálogo — productos del propio comercio (Caso 2 Raimondi) ─────────
   Antes: catálogo global de HARDWARE, solo-admin, solo-localStorage.
   Ahora: cada comercio (Cafetería, Kiosco) registra su propio menú real. */
function MiCatalogoPanel({ comercio }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const [productos, setProductos] = useState(null);
  const BLANK_FORM = { name: "", price: "", category: "", stock: "", imageUrl: "" };
  const [form, setForm] = useState(BLANK_FORM);
  const [catNueva, setCatNueva] = useState(false); // true = mostrar input de categoría nueva en vez del select
  const [savingId, setSavingId] = useState(null);
  const [subiendoImg, setSubiendoImg] = useState(null); // "new" | product.id | null
  const [editingId, setEditingId] = useState(null); // id del producto en edición, null = formulario de alta

  const load = () => fetchProductsRemote(merchantId).then(setProductos).catch(() => setProductos([]));
  useEffect(() => { load(); }, [merchantId]);

  const editar = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, price: String(p.price), category: p.category || "", stock: p.stock != null ? String(p.stock) : "", imageUrl: p.image_url || "" });
    setCatNueva(true); // el select de categorías existentes no tiene por qué contener la actual si se limpió — texto libre es más simple al editar
  };
  const cancelarEdicion = () => { setEditingId(null); setForm(BLANK_FORM); setCatNueva(false); };

  const subirImagen = async (file) => {
    if (!file) return null;
    if (!file.type.startsWith("image/")) { notify("La imagen debe ser un archivo de imagen (PNG/JPG).", "error"); return null; }
    try {
      const path = `productos/${merchantId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      return await uploadArchivo("joi360-media", path, file);
    } catch (e) {
      notify("No se pudo subir la imagen: " + e.message, "error");
      return null;
    }
  };
  const seleccionarImagenNueva = async (file) => {
    setSubiendoImg("new");
    const url = await subirImagen(file);
    if (url) setForm(f => ({ ...f, imageUrl: url }));
    setSubiendoImg(null);
  };

  const agregar = async () => {
    if (!form.name.trim() || !form.price) return;
    setSavingId(editingId || "new");
    try {
      await upsertProductRemote({ id: editingId || undefined, world_id: comercio.mundoId, merchant_id: merchantId, name: form.name, price: +form.price, category: form.category || null, stock: form.stock ? +form.stock : null, image_url: form.imageUrl || null });
      setForm(BLANK_FORM);
      setCatNueva(false);
      notify(editingId ? "Producto actualizado." : "Producto agregado a tu catálogo.");
      setEditingId(null);
      load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `catalogo-agregar:${merchantId}`, comercio.mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setSavingId(null); }
  };
  const toggleActivo = async (p) => {
    try { await upsertProductRemote({ ...p, active: !p.active }); load(); }
    catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `catalogo-toggle:${merchantId}`, comercio.mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };
  const cambiarImagen = async (p, file) => {
    setSubiendoImg(p.id);
    const url = await subirImagen(file);
    if (url) {
      try { await upsertProductRemote({ ...p, image_url: url }); load(); }
      catch (e) { notify("No se pudo guardar la imagen: " + e.message, "error"); }
    }
    setSubiendoImg(null);
  };
  const eliminar = async (p) => {
    try {
      const campanas = await fetchCampanasBNPL(comercio.mundoId, merchantId).catch(() => []);
      const hoy = new Date().toISOString().slice(0, 10);
      const vigente = c => (!c.fecha_inicio || c.fecha_inicio <= hoy) && (!c.fecha_fin || c.fecha_fin >= hoy);
      const enCampana = (campanas || []).find(c => vigente(c) && (c.productos || []).includes(p.id));
      if (enCampana) {
        notify(`No se puede eliminar "${p.name}": está incluido en la campaña BNPL vigente "${enCampana.nombre}". Quítalo de la campaña primero.`, "error");
        return;
      }
      if (!window.confirm(`¿Eliminar "${p.name}" del catálogo? Esta acción no se puede deshacer.`)) return;
      await deleteProductRemote(p.id); notify("Producto eliminado."); load();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `catalogo-eliminar:${merchantId}`, comercio.mundoId);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-2">Mi catálogo</h2>
      <p className="text-on-surface-variant mb-6">Aparecen al cobrar en el POS y en tu reportería.</p>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
        <p className="font-semibold text-sm mb-3">{editingId ? "Editar producto" : "Nuevo producto"}</p>
        <div className="flex gap-3">
          <label className="flex-shrink-0 w-16 h-16 rounded-lg border border-dashed border-outline-variant flex items-center justify-center text-outline cursor-pointer overflow-hidden hover:border-primary/50">
            {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" /> : (subiendoImg === "new" ? <Icon n="hourglass_empty" className="text-[20px]" /> : <Icon n="add_a_photo" className="text-[20px]" />)}
            <input type="file" accept="image/*" className="hidden" onChange={e => seleccionarImagenNueva(e.target.files?.[0])} />
          </label>
          <div className="grid md:grid-cols-4 gap-3 flex-1">
            <input className={inputCls} placeholder="Nombre (ej. Sandwich mixto)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <NumInput className={inputCls} step="0.10" placeholder="Precio S/" value={form.price} onChange={v => setForm({ ...form, price: v })} />
            {(() => {
              const categoriasExistentes = [...new Set((productos || []).map(p => p.category).filter(Boolean))].sort();
              if (catNueva || categoriasExistentes.length === 0) {
                return (
                  <div className="flex gap-1">
                    <input className={inputCls} placeholder="Categoría nueva" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} autoFocus={catNueva} />
                    {categoriasExistentes.length > 0 && (
                      <button type="button" onClick={() => { setCatNueva(false); setForm({ ...form, category: "" }); }}
                        className="flex-shrink-0 px-2 rounded-lg border border-outline-variant text-outline hover:text-primary" title="Elegir de las existentes">
                        <Icon n="list" className="text-[16px]" />
                      </button>
                    )}
                  </div>
                );
              }
              return (
                <select className={inputCls} value={form.category}
                  onChange={e => { if (e.target.value === "__nueva__") { setCatNueva(true); setForm({ ...form, category: "" }); } else { setForm({ ...form, category: e.target.value }); } }}>
                  <option value="">Categoría (opcional)</option>
                  {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__nueva__">+ Otra categoría…</option>
                </select>
              );
            })()}
            <NumInput className={inputCls} placeholder="Stock (opcional)" value={form.stock} onChange={v => setForm({ ...form, stock: v })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          {editingId && <BtnOutline onClick={cancelarEdicion}>Cancelar</BtnOutline>}
          <BtnPrimary disabled={!form.name.trim() || !form.price || savingId === (editingId || "new")} onClick={agregar}>
            <Icon n={editingId ? "save" : "add"} className="text-[18px]" /> {editingId ? "Guardar cambios" : "Agregar producto"}
          </BtnPrimary>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        {productos === null ? (
          <p className="p-6 text-sm text-on-surface-variant">Cargando…</p>
        ) : productos.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            <Icon n="restaurant_menu" className="text-[40px] text-outline mb-2 block mx-auto" />
            Sin productos todavía. Agrega el primero arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-5 py-3 text-left"></th>
              <th className="px-5 py-3 text-left">Producto</th>
              <th className="px-5 py-3 text-left">Categoría</th>
              <th className="px-5 py-3 text-right">Precio</th>
              <th className="px-5 py-3 text-right">Stock</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant/60">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-surface-container-low">
                  <td className="px-5 py-3">
                    <label className="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-outline cursor-pointer overflow-hidden hover:border-primary/50 block">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : (subiendoImg === p.id ? <Icon n="hourglass_empty" className="text-[16px]" /> : <Icon n="add_a_photo" className="text-[16px]" />)}
                      <input type="file" accept="image/*" className="hidden" onChange={e => cambiarImagen(p, e.target.files?.[0])} />
                    </label>
                  </td>
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{p.category || "—"}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold">S/ {Number(p.price).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-on-surface-variant">{p.stock ?? "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleActivo(p)}>
                      <Pill color={p.active ? "bg-ok" : "bg-outline"}>{p.active ? "ACTIVO" : "PAUSADO"}</Pill>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => editar(p)} className="text-on-surface-variant hover:bg-surface-container p-1 rounded" title="Editar"><Icon n="edit" className="text-[16px]" /></button>
                      <button onClick={() => eliminar(p)} className="text-error hover:bg-error-container/20 p-1 rounded" title="Eliminar"><Icon n="delete" className="text-[16px]" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// Mismo checklist de alérgenos que ALERGIAS en joi360-app (RestriccionesTemplate)
// — duplicado a propósito, mismo patrón que otras constantes pequeñas
// compartidas entre ambas apps en este proyecto (no hay paquete común).
const ALERGENOS_MENU = ["Gluten", "Lactosa", "Mariscos", "Nueces", "Huevo", "Soya", "Frutos rojos", "Maní"];
const DIAS_SEMANA = [{ v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mié" }, { v: 4, l: "Jue" }, { v: 5, l: "Vie" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" }];

/* ── Catálogo de Menú del comercio: platos + programación semanal ─────────
   Distinto de "Mi catálogo" (products, vitrina de compras puntuales): un
   plato tiene alérgenos y se programa por día de la semana con recurrencia,
   consumido por el strip calendar de MenuTemplate en la app. ──────────── */
function MenuCatalogoPanel({ comercio }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const [items, setItems] = useState(null);
  const [programacion, setProgramacion] = useState({}); // { menuItemId: [row,...] }
  const BLANK_FORM = { nombre: "", descripcion: "", precio: "", categoria: "", alergenos: [], imagen_url: "" };
  const [form, setForm] = useState(BLANK_FORM);
  const [catNueva, setCatNueva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandido, setExpandido] = useState(null); // menuItemId
  const [progDraft, setProgDraft] = useState({ dias: [], cupos: "" });
  const [savingProg, setSavingProg] = useState(false);
  const [editingId, setEditingId] = useState(null); // id del plato en edición, null = alta

  const load = () => {
    fetchMenuItemsMerchant(merchantId).then(setItems).catch(() => setItems([]));
    fetchProgramacionMerchant(merchantId).then(rows => {
      const grouped = {};
      (rows || []).forEach(r => { (grouped[r.menu_item_id] = grouped[r.menu_item_id] || []).push(r); });
      setProgramacion(grouped);
    }).catch(() => setProgramacion({}));
  };
  useEffect(() => { load(); }, [merchantId]);

  const toggleAlergeno = a => setForm(f => ({ ...f, alergenos: f.alergenos.includes(a) ? f.alergenos.filter(x => x !== a) : [...f.alergenos, a] }));

  const editar = (item) => {
    setEditingId(item.id);
    setForm({ nombre: item.nombre, descripcion: item.descripcion || "", precio: String(item.precio), categoria: item.categoria || "", alergenos: item.alergenos || [], imagen_url: item.imagen_url || "" });
    setCatNueva(true);
  };
  const cancelarEdicion = () => { setEditingId(null); setForm(BLANK_FORM); setCatNueva(false); };

  const agregar = async () => {
    if (!form.nombre.trim() || !form.precio) return;
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre, descripcion: form.descripcion || null,
        precio: +form.precio, categoria: form.categoria || null, alergenos: form.alergenos, imagen_url: form.imagen_url || null,
      };
      if (editingId) {
        await actualizarMenuItemRemote(editingId, payload);
        notify(`"${form.nombre}" actualizado.`);
      } else {
        await crearMenuItemRemote({ world_id: comercio.mundoId, merchant_id: merchantId, ...payload });
        notify("Plato agregado. Prográmalo en la fila para que aparezca en el calendario del app.");
      }
      setForm(BLANK_FORM);
      setCatNueva(false);
      setEditingId(null);
      load();
    } catch (e) {
      notify(editingId ? "No se pudo guardar el cambio." : "No se pudo agregar el plato.", "error");
    } finally { setSaving(false); }
  };

  const toggleActivo = async p => { await actualizarMenuItemRemote(p.id, { activo: !p.activo }); load(); };
  const eliminar = async p => {
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    let futuras = [];
    try { futuras = await fetchReservasFuturasDePlato(merchantId, p.id, hoyISO); } catch (e) { /* si falla la consulta, no bloquear el borrado por eso */ }
    if (futuras?.length > 0) {
      const nombres = [...new Set(futuras.map(r => r.beneficiario_nombre))].slice(0, 3).join(", ");
      notify(`No se puede eliminar "${p.nombre}": tiene ${futuras.length} reserva(s) confirmada(s) a futuro (${nombres}${futuras.length > 3 ? "…" : ""}). Pausa el plato en vez de eliminarlo.`, "error");
      return;
    }
    if (!window.confirm(`¿Eliminar "${p.nombre}" del catálogo de Menú? Esto no afecta el histórico de reservas ya hechas.`)) return;
    await eliminarMenuItemRemote(p.id); notify("Plato eliminado."); load();
  };

  const abrirProgramacion = item => {
    const actuales = programacion[item.id] || [];
    setProgDraft({ dias: actuales.map(r => r.dia_semana), cupos: actuales[0]?.cupos_max || "" });
    setExpandido(expandido === item.id ? null : item.id);
  };
  const toggleDia = d => setProgDraft(pd => ({ ...pd, dias: pd.dias.includes(d) ? pd.dias.filter(x => x !== d) : [...pd.dias, d] }));
  const guardarProgramacion = async item => {
    setSavingProg(true);
    try {
      await guardarProgramacionItem(comercio.mundoId, merchantId, item.id, progDraft.dias, progDraft.cupos ? +progDraft.cupos : null);
      notify(`Programación de "${item.nombre}" guardada.`);
      setExpandido(null); load();
    } finally { setSavingProg(false); }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-2">Catálogo de Menú</h2>
      <p className="text-on-surface-variant mb-6">Los platos que programes aquí aparecen en el calendario de Menú de la app, filtrados automáticamente por las alergias de cada usuario.</p>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
        <p className="font-semibold text-sm mb-3">{editingId ? "Editar plato" : "Nuevo plato"}</p>
        <div className="grid md:grid-cols-4 gap-3 mb-3">
          <input className={inputCls} placeholder="Nombre (ej. Milanesa con puré)" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          <NumInput className={inputCls} step="0.10" placeholder="Precio S/" value={form.precio} onChange={v => setForm({ ...form, precio: v })} />
          {(() => {
            const categoriasExistentes = [...new Set((items || []).map(p => p.categoria).filter(Boolean))].sort();
            if (catNueva || categoriasExistentes.length === 0) {
              return (
                <div className="flex gap-1">
                  <input className={inputCls} placeholder="Categoría nueva" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} autoFocus={catNueva} />
                  {categoriasExistentes.length > 0 && (
                    <button type="button" onClick={() => { setCatNueva(false); setForm({ ...form, categoria: "" }); }}
                      className="flex-shrink-0 px-2 rounded-lg border border-outline-variant text-outline hover:text-primary" title="Elegir de las existentes">
                      <Icon n="list" className="text-[16px]" />
                    </button>
                  )}
                </div>
              );
            }
            return (
              <select className={inputCls} value={form.categoria}
                onChange={e => { if (e.target.value === "__nueva__") { setCatNueva(true); setForm({ ...form, categoria: "" }); } else { setForm({ ...form, categoria: e.target.value }); } }}>
                <option value="">Categoría (opcional)</option>
                {categoriasExistentes.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__nueva__">+ Otra categoría…</option>
              </select>
            );
          })()}
          <input className={inputCls} placeholder="URL de imagen (opcional)" value={form.imagen_url} onChange={e => setForm({ ...form, imagen_url: e.target.value })} />
        </div>
        <input className={`${inputCls} mb-3`} placeholder="Descripción breve (opcional)" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
        <div className="mb-3">
          <p className="font-mono text-[10px] uppercase text-outline mb-1.5">Alérgenos que contiene</p>
          <div className="flex flex-wrap gap-1.5">
            {ALERGENOS_MENU.map(a => (
              <button key={a} type="button" onClick={() => toggleAlergeno(a)}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${form.alergenos.includes(a) ? "border-error bg-error-container text-error" : "border-outline-variant text-on-surface-variant"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && <BtnOutline onClick={cancelarEdicion}>Cancelar</BtnOutline>}
          <BtnPrimary disabled={!form.nombre.trim() || !form.precio || saving} onClick={agregar}>
            <Icon n={editingId ? "save" : "add"} className="text-[18px]" /> {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar plato"}
          </BtnPrimary>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant/60">
        {items === null ? (
          <p className="p-6 text-sm text-on-surface-variant">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            <Icon n="restaurant_menu" className="text-[40px] text-outline mb-2 block mx-auto" />
            Sin platos todavía. Agrega el primero arriba.
          </div>
        ) : items.map(item => {
          const prog = programacion[item.id] || [];
          return (
            <div key={item.id}>
              <div className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-container-low gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.nombre} <span className="font-mono text-xs text-on-surface-variant">S/ {Number(item.precio).toFixed(2)}</span></p>
                  <p className="text-[11px] text-on-surface-variant">
                    {item.categoria || "Sin categoría"}
                    {item.alergenos?.length > 0 && <span className="text-error"> · Contiene: {item.alergenos.join(", ")}</span>}
                    {" · "}{prog.length > 0 ? `Programado: ${prog.map(r => DIAS_SEMANA.find(d => d.v === r.dia_semana)?.l).join(", ")}` : "Sin programar"}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => abrirProgramacion(item)} className="px-3 py-1.5 rounded border border-outline-variant font-mono text-[10px] uppercase hover:bg-surface-container flex items-center gap-1">
                    <Icon n="calendar_month" className="text-[14px]" /> Programar
                  </button>
                  {/* "ACTIVO" antes solo miraba item.activo — un plato recién
                      creado (activo=true por defecto) se veía publicado aunque
                      no tuviera programación, y sin programación real nunca
                      aparece en el calendario del app (fetchMenuDelDia exige un
                      join contra menu_programacion). El pill ahora refleja eso. */}
                  <button onClick={() => toggleActivo(item)}>
                    <Pill color={!item.activo ? "bg-outline" : prog.length > 0 ? "bg-ok" : "bg-tertiary"}>
                      {!item.activo ? "PAUSADO" : prog.length > 0 ? "ACTIVO" : "PENDIENTE DE PROGRAMAR"}
                    </Pill>
                  </button>
                  <button onClick={() => editar(item)} className="text-on-surface-variant hover:bg-surface-container p-1 rounded" title="Editar"><Icon n="edit" className="text-[16px]" /></button>
                  <button onClick={() => eliminar(item)} className="text-error hover:bg-error-container/20 p-1 rounded" title="Eliminar"><Icon n="delete" className="text-[16px]" /></button>
                </div>
              </div>
              {expandido === item.id && (
                <div className="px-5 pb-4 pt-1 bg-surface-container-low">
                  <p className="font-mono text-[10px] uppercase text-outline mb-2">Días en que se ofrece</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {DIAS_SEMANA.map(d => (
                      <button key={d.v} onClick={() => toggleDia(d.v)}
                        className={`w-11 py-1.5 rounded-lg text-xs font-bold border ${progDraft.dias.includes(d.v) ? "border-primary bg-primary-fixed text-primary" : "border-outline-variant text-on-surface-variant"}`}>
                        {d.l}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end gap-3">
                    <Field label="Cupos por día (vacío = ilimitado)">
                      <NumInput className={`${inputCls} !w-40`} min="0" value={progDraft.cupos} onChange={v => setProgDraft({ ...progDraft, cupos: v })} />
                    </Field>
                    <BtnPrimary disabled={savingProg} onClick={() => guardarProgramacion(item)}>{savingProg ? "Guardando…" : "Guardar programación"}</BtnPrimary>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Venta en vivo del propio comercio (filtrada por merchant_id real) ───── */
function VentasComercioWidget({ merchantId }) {
  const [txs, setTxs] = useState(null);
  const [reload, setReload] = useState(0);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  useEffect(() => { fetchVentasComercio(merchantId).then(setTxs).catch(() => setTxs([])); }, [merchantId, reload]);

  const filtrados = (txs || []).filter(t => {
    const fecha = t.created_at.slice(0, 10);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    if (busqueda && !(t.reference || "").toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });
  const total = filtrados.reduce((a, t) => a + (+t.amount || 0), 0);

  const exportar = () => {
    const header = "fecha,producto_referencia,monto,estado\n";
    const filas = filtrados.map(t => [t.created_at, t.reference, t.amount, t.status].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mis-ventas-${merchantId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="bolt" className="text-ok text-[20px]" /> Mis ventas</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-on-surface-variant">S/ {total.toFixed(2)} · {filtrados.length} ventas</span>
          <BtnOutline onClick={exportar} className="!py-1.5 !px-3 !text-xs" disabled={!filtrados.length}><Icon n="download" className="text-[14px]" /> Exportar</BtnOutline>
          <button onClick={() => setReload(k => k + 1)} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="refresh" className="text-[16px]" /></button>
        </div>
      </div>
      <div className="px-5 py-3 border-b border-outline-variant flex flex-wrap gap-2 bg-surface-container-low">
        <input type="date" className={`${inputCls} !h-8 !w-36 !text-xs`} value={desde} onChange={e => setDesde(e.target.value)} title="Desde"/>
        <input type="date" className={`${inputCls} !h-8 !w-36 !text-xs`} value={hasta} onChange={e => setHasta(e.target.value)} title="Hasta"/>
        <input className={`${inputCls} !h-8 !w-48 !text-xs`} placeholder="Buscar por producto/referencia…" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
      </div>
      {txs === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">{(txs || []).length === 0 ? 'Aún no registras ventas propias. Cuando cobres desde la pestaña "Cobrar", aparecerán aquí al instante.' : "Sin ventas para estos filtros."}</p>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/60">
          {filtrados.map((t, i) => (
            <div key={t.id || i} className="px-5 py-2.5 flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <Icon n="shopping_bag" className="text-[16px] text-secondary" />
                <span className="font-mono text-xs">{(t.reference || "venta").slice(0, 40)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-outline">{new Date(t.created_at).toLocaleString("es-PE")}</span>
                <span className="font-mono font-bold">S/ {Number(t.amount).toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Cobrar con identificación previa del pagador (Caso 2 Raimondi) ───────
   Antes: QR decorativo sin identificar a quién se cobra.
   Ahora: 1) identificar por código JOI  2) elegir producto o monto libre  3) cobrar real. */
// Cuotas BNPL disponibles para un monto — mismas tasas que BNPLTemplate (app)
const POS_INTERES_POR_CUOTAS = { 3: 0, 6: 0.18, 12: 0.24 };
// Recarga presencial: el cliente entrega efectivo o desliza su tarjeta en el
// POS físico del comercio y el operador acredita el monto a su billetera —
// distinto de los canales de recarga self-service de la app (QR/tarjeta online).
const CANALES_RECARGA_PRESENCIAL = [
  { id: "efectivo", nombre: "Efectivo", icon: "payments" },
  { id: "tarjeta_presente", nombre: "Tarjeta presente (POS)", icon: "credit_card" },
];

export function CobrarPanel({ comercio, m }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const [modo, setModo] = useState("cobrar"); // "cobrar" | "recargar" | "qr"
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState(null); // {id, user_id, balance}
  const [notFound, setNotFound] = useState(false);
  const [productos, setProductos] = useState([]);
  const [productoSel, setProductoSel] = useState(null);
  const [monto, setMonto] = useState("");
  const [canalRecarga, setCanalRecarga] = useState(null);
  const [cobrando, setCobrando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [bnplProg, setBnplProg] = useState(null); // programa BNPL del comercio (null = sin programa activo)
  // La RPC de wallet ahora exige un turno real y abierto en pos_turnos para
  // cualquier cobro/recarga con merchant_id (gap real cerrado post-#114) —
  // sin esto, cobrar()/recargar() de abajo se rechazan con TURNO_INVALIDO.
  const [turnoId, setTurnoId] = useState(null);

  // Cobrar con QR — el operador tipea el monto, genera una solicitud de
  // cobro, y el cliente la paga escaneando con su propia cámara desde su
  // sesión del superapp. No hay "identificar al cliente" en este modo: quien
  // paga se identifica solo, del otro lado.
  const [qrMonto, setQrMonto] = useState("");
  const [qrRequest, setQrRequest] = useState(null); // charge_request creada
  const [qrGenerando, setQrGenerando] = useState(false);
  const QR_EXPIRA_MIN = 10;
  useEffect(() => {
    if (!qrRequest || qrRequest.estado !== "pendiente") return;
    const t = setInterval(async () => {
      const r = await fetchChargeRequestRemote(qrRequest.id).catch(() => null);
      if (r) setQrRequest(r);
    }, 2000);
    return () => clearInterval(t);
  }, [qrRequest?.id, qrRequest?.estado]);
  const qrExpirado = qrRequest && qrRequest.estado === "pendiente"
    && (Date.now() - new Date(qrRequest.created_at).getTime()) > QR_EXPIRA_MIN * 60 * 1000;
  const generarQr = async () => {
    const m2 = +qrMonto;
    if (!m2) return;
    setQrGenerando(true);
    try {
      const r = await crearChargeRequestRemote(m.id, merchantId, comercio.nombre, m2, comercio.nombre, turnoId);
      if (!r) throw new Error("sin respuesta");
      setQrRequest(r);
    } catch {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `pos-cobrar-qr:${merchantId}`, m.id);
      notify([err.mensaje, err.accion].filter(Boolean).join(" "), "error");
    } finally { setQrGenerando(false); }
  };
  const cancelarQr = async () => {
    if (qrRequest) await cancelarChargeRequestRemote(qrRequest.id).catch(() => {});
    setQrRequest(null); setQrMonto("");
  };

  useEffect(() => { fetchProductsRemote(merchantId).then(rows => setProductos((rows || []).filter(p => p.active))).catch(() => {}); }, [merchantId]);
  useEffect(() => { abrirTurnoRemote(merchantId, m.id).then(setTurnoId).catch(() => setTurnoId(null)); }, [merchantId, m.id]);

  // Identificar SKU financiable + mostrar cuotas en el POS (Gantt #33)
  const bnplHabilitado = !!bnplLimitesDelMundo(m);
  useEffect(() => {
    if (!bnplHabilitado) { setBnplProg(null); return; }
    fetchProgramaBNPL(m.id, merchantId)
      .then(rows => { const r = rows?.[0]; setBnplProg(r?.activo ? r : null); })
      .catch(() => setBnplProg(null));
  }, [bnplHabilitado, m.id, merchantId]);

  const financiable = p => (bnplProg?.productos_financiables || [])
    .find(pf => pf.nombre.trim().toLowerCase() === p.name.trim().toLowerCase());

  const identificar = async () => {
    if (!codigo.trim()) return;
    setBuscando(true); setNotFound(false); setCliente(null);
    try {
      const w = await buscarWalletPorCodigo(codigo, m.id);
      if (w) setCliente(w);
      else {
        const err = await errorControlado("wallet_no_encontrada");
        logErrorControlado("wallet_no_encontrada", `pos-cobrar:${merchantId}`, m.id);
        setNotFound([err.mensaje, err.accion].filter(Boolean).join(" "));
      }
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `pos-cobrar:${merchantId}`, m.id);
      setNotFound([err.mensaje, err.accion].filter(Boolean).join(" "));
    } finally { setBuscando(false); }
  };
  const elegirProducto = (p) => { setProductoSel(p); setMonto(String(p.price)); };
  const reset = () => { setCodigo(""); setCliente(null); setNotFound(false); setProductoSel(null); setMonto(""); setCanalRecarga(null); setResultado(null); };
  const cambiarModo = (nuevo) => { setModo(nuevo); setProductoSel(null); setMonto(""); setCanalRecarga(null); setResultado(null); };

  const cobrar = async () => {
    const m2 = +monto;
    if (!m2 || !cliente) return;
    setCobrando(true);
    try {
      const referencia = `${comercio.nombre}${productoSel ? " · " + productoSel.name : ""}`;
      const r = await cobrarPOSRemote(cliente.user_id, m.id, merchantId, m2, referencia, turnoId);
      if (!r.ok) {
        // Task #181: el RPC ahora también puede rechazar por restricciones
        // del dependiente (horario/límite diario) — antes cualquier motivo
        // que no fuera "saldo" caía en "wallet_no_encontrada", un mensaje
        // engañoso ("no se encontró la billetera") para un rechazo que en
        // realidad sí encontró la wallet y la bloqueó a propósito.
        const code = r.motivo === "saldo" ? "saldo_insuficiente"
          : r.motivo === "FUERA_DE_HORARIO" ? "restriccion_horario"
          : r.motivo === "LIMITE_DIARIO_EXCEDIDO" ? "restriccion_limite_diario"
          : "wallet_no_encontrada";
        const err = await errorControlado(code);
        logErrorControlado(code, `pos-cobrar:${merchantId}`, m.id);
        r.mensaje = [err.mensaje, err.accion].filter(Boolean).join(" ");
      }
      setResultado(r);
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `pos-cobrar:${merchantId}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setCobrando(false); }
  };

  const recargar = async () => {
    const m2 = +monto;
    if (!m2 || !cliente || !canalRecarga) return;
    setCobrando(true);
    try {
      const referencia = `Recarga presencial · ${canalRecarga.nombre} · ${comercio.nombre}`;
      const r = await recargarPOSRemote(cliente.user_id, m.id, merchantId, m2, canalRecarga.id, referencia, turnoId);
      if (!r.ok) {
        const err = await errorControlado("wallet_no_encontrada");
        logErrorControlado("wallet_no_encontrada", `pos-recargar:${merchantId}`, m.id);
        r.mensaje = [err.mensaje, err.accion].filter(Boolean).join(" ");
      }
      setResultado(r);
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `pos-recargar:${merchantId}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setCobrando(false); }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">{modo === "cobrar" ? "Cobrar" : modo === "recargar" ? "Recargar billetera" : "Cobrar con QR"}</h2>
      <div className="flex gap-2 mb-6">
        <button onClick={() => cambiarModo("cobrar")} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${modo === "cobrar" ? "bg-secondary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}>
          <Icon n="point_of_sale" className="text-[16px]" /> Cobrar
        </button>
        <button onClick={() => cambiarModo("recargar")} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${modo === "recargar" ? "bg-secondary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}>
          <Icon n="add_card" className="text-[16px]" /> Recargar billetera
        </button>
        <button onClick={() => cambiarModo("qr")} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors ${modo === "qr" ? "bg-secondary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}>
          <Icon n="qr_code_2" className="text-[16px]" /> Cobrar con QR
        </button>
      </div>

      {modo === "qr" ? (
        <div className="max-w-xl bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          {!qrRequest ? (
            <div>
              <p className="font-mono text-[10px] uppercase text-outline mb-2">Monto a cobrar</p>
              <div className="flex gap-2">
                <NumInput className={`${inputCls} font-mono`} placeholder="0.00" value={qrMonto} onChange={e => setQrMonto(e.target.value)} onKeyDown={e => e.key === "Enter" && generarQr()} autoFocus />
                <BtnPrimary disabled={!(+qrMonto > 0) || qrGenerando} onClick={generarQr}>
                  <Icon n="qr_code_2" className="text-[18px]" /> {qrGenerando ? "Generando…" : "Generar QR"}
                </BtnPrimary>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">El cliente escanea el QR con la cámara de su celular, confirma el pago en su app y el saldo se descuenta de su billetera. No necesitas identificarlo antes.</p>
            </div>
          ) : qrRequest.estado === "pagado" ? (
            <div className="text-center py-6">
              <Icon n="check_circle" className="text-[48px] text-ok" />
              <p className="font-bold text-lg mt-2">Pago recibido</p>
              <p className="text-sm text-on-surface-variant mt-1">S/ {Number(qrRequest.monto).toFixed(2)}</p>
              <BtnPrimary onClick={() => { setQrRequest(null); setQrMonto(""); }} className="w-full mt-4">Cobrar otro</BtnPrimary>
            </div>
          ) : qrRequest.estado === "cancelado" || qrExpirado ? (
            <div className="text-center py-6">
              <Icon n="error" className="text-[48px] text-error" />
              <p className="font-bold text-lg mt-2">{qrExpirado ? "El QR expiró" : "Cobro cancelado"}</p>
              <p className="text-sm text-on-surface-variant mt-1">{qrExpirado ? "Pasaron más de 10 minutos sin que se confirmara el pago." : "Se canceló antes de que el cliente pagara."}</p>
              <BtnPrimary onClick={() => { setQrRequest(null); setQrMonto(""); }} className="w-full mt-4">Generar otro QR</BtnPrimary>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase text-outline mb-3">S/ {Number(qrRequest.monto).toFixed(2)} · Esperando pago</p>
              <div className="w-52 h-52 mx-auto rounded-2xl bg-white border-2 border-outline-variant mb-4 flex items-center justify-center overflow-hidden">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data=${encodeURIComponent(`https://joi360-app.vercel.app/#/pagar/${qrRequest.id}`)}`}
                  alt="QR de cobro" className="w-full h-full object-contain p-2" />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant mb-4">
                <span className="w-4 h-4 border-2 border-outline-variant border-t-secondary rounded-full animate-spin" />
                Esperando que el cliente confirme…
              </div>
              <button onClick={cancelarQr} className="w-full py-3 rounded-xl bg-error text-white font-bold text-sm tap-active">
                Cancelar cobro
              </button>
            </div>
          )}
        </div>
      ) : (
      <div className="max-w-xl bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-5">
        {/* Paso 1: identificar */}
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 1 · Identificar al alumno</p>
          <div className="flex gap-2">
            <input className={`${inputCls} font-mono`} placeholder="Código JOI (del QR o pulsera del alumno)"
              value={codigo} onChange={e => setCodigo(e.target.value)} disabled={!!cliente}
              onKeyDown={e => e.key === "Enter" && identificar()} autoFocus />
            {!cliente ? (
              <BtnPrimary disabled={!codigo.trim() || buscando} onClick={identificar}>
                <Icon n="qr_code_scanner" className="text-[18px]" /> {buscando ? "Buscando…" : "Identificar"}
              </BtnPrimary>
            ) : (
              <BtnOutline onClick={reset}><Icon n="close" className="text-[18px]" /></BtnOutline>
            )}
          </div>
          {!cliente && (
            <p className="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1">
              <Icon n="contactless" className="text-[14px] text-outline" /> O escanea con el lector NFC/QR del POS — el código se completa solo y se identifica automáticamente.
            </p>
          )}
          {notFound && <p className="text-xs text-error mt-2">{notFound}</p>}
          {cliente && (
            <div className="mt-3 p-3 bg-secondary-fixed/20 border border-secondary/30 rounded-lg flex items-center justify-between">
              <span className="text-sm flex items-center gap-2"><Icon n="verified" className="text-secondary text-[18px]" /> Identificado</span>
              <span className="font-mono text-sm font-bold">Saldo: S/ {Number(cliente.balance).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Paso 2: producto/monto (cobrar) o canal presencial/monto (recargar) */}
        {cliente && !resultado && modo === "cobrar" && (
          <div>
            <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 2 · Producto o monto</p>
            {productos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {productos.map(p => {
                  const pf = financiable(p);
                  return (
                    <button key={p.id} onClick={() => elegirProducto(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1.5 ${productoSel?.id === p.id ? "border-secondary bg-secondary-fixed text-secondary font-bold" : "border-outline-variant hover:border-secondary/40"}`}>
                      {p.name} · S/ {Number(p.price).toFixed(2)}
                      {pf && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">BNPL · hasta {Math.max(...(bnplProg.cuotas_activas || [3]))}x</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-on-surface-variant">S/</span>
              <NumInput className="text-2xl font-black w-full border-b-2 border-outline-variant focus:border-secondary outline-none bg-transparent" step="0.10"
                value={monto} onChange={v => { setMonto(v); setProductoSel(null); }} placeholder="0.00" />
            </div>
            {productoSel && financiable(productoSel) && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-[11px] font-bold text-purple-700 mb-1.5 flex items-center gap-1.5"><Icon n="calendar_clock" className="text-[14px]" /> SKU financiable · Paga después</p>
                <div className="flex flex-wrap gap-2 mb-1.5">
                  {(bnplProg.cuotas_activas || []).map(n => (
                    <span key={n} className="font-mono text-[10px] px-2 py-1 rounded bg-white border border-purple-200 text-purple-700">
                      {n}x S/ {(Number(productoSel.price) * (1 + (POS_INTERES_POR_CUOTAS[n] ?? 0.24)) / n).toFixed(2)}{POS_INTERES_POR_CUOTAS[n] === 0 ? " · 0% interés" : ""}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-purple-600">El cliente puede pagarlo en cuotas desde "Paga después" en su app JOI 360 — este cobro en POS sigue siendo al contado.</p>
              </div>
            )}
          </div>
        )}
        {cliente && !resultado && modo === "recargar" && (
          <div>
            <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 2 · Canal y monto recibido</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {CANALES_RECARGA_PRESENCIAL.map(ch => (
                <button key={ch.id} onClick={() => setCanalRecarga(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1.5 ${canalRecarga?.id === ch.id ? "border-secondary bg-secondary-fixed text-secondary font-bold" : "border-outline-variant hover:border-secondary/40"}`}>
                  <Icon n={ch.icon} className="text-[16px]" /> {ch.nombre}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-on-surface-variant">S/</span>
              <NumInput className="text-2xl font-black w-full border-b-2 border-outline-variant focus:border-secondary outline-none bg-transparent" step="0.10"
                value={monto} onChange={v => setMonto(v)} placeholder="0.00" disabled={!canalRecarga} />
            </div>
            {canalRecarga && <p className="text-[10px] text-on-surface-variant mt-2">Recarga presencial — confirma solo después de recibir el {canalRecarga.nombre.toLowerCase()} del alumno. Se acredita a su billetera al instante.</p>}
          </div>
        )}

        {/* Paso 3: confirmar */}
        {cliente && !resultado && modo === "cobrar" && (
          <BtnPrimary className="w-full !bg-secondary hover:!bg-secondary/90" disabled={!monto || +monto <= 0 || cobrando} onClick={cobrar}>
            <Icon n="point_of_sale" className="text-[20px]" /> {cobrando ? "Cobrando…" : `Cobrar S/ ${(+monto || 0).toFixed(2)}`}
          </BtnPrimary>
        )}
        {cliente && !resultado && modo === "recargar" && (
          <BtnPrimary className="w-full !bg-secondary hover:!bg-secondary/90" disabled={!monto || +monto <= 0 || !canalRecarga || cobrando} onClick={recargar}>
            <Icon n="add_card" className="text-[20px]" /> {cobrando ? "Recargando…" : `Recargar S/ ${(+monto || 0).toFixed(2)}`}
          </BtnPrimary>
        )}

        {/* Resultado */}
        {resultado?.ok && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <Icon n="check_circle" fill className="text-green-600 text-[32px] block mx-auto mb-1" />
            <p className="font-bold text-green-800">{modo === "cobrar" ? "Cobro aprobado" : "Recarga aprobada"}</p>
            <p className="text-xs text-green-700">Nuevo saldo del alumno: S/ {resultado.balance.toFixed(2)}</p>
            <BtnOutline className="mt-3" onClick={reset}>{modo === "cobrar" ? "Nueva venta" : "Nueva recarga"}</BtnOutline>
          </div>
        )}
        {resultado && !resultado.ok && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <Icon n="cancel" fill className="text-red-500 text-[32px] block mx-auto mb-1" />
            <p className="font-bold text-red-700">
              {resultado.mensaje || "No se pudo cobrar"}{resultado.motivo === "saldo" && resultado.balance != null ? ` (saldo: S/ ${resultado.balance.toFixed(2)})` : ""}
            </p>
            <BtnOutline className="mt-3" onClick={() => setResultado(null)}>Reintentar</BtnOutline>
          </div>
        )}
      </div>
      )}
    </>
  );
}

// Canjear cupón de Promociones en el POS (Gantt #38-#41) — el operador
// teclea/escanea el código que el usuario muestra en la app; se valida
// vigencia/estado/cupos y recién ahí se incrementa el uso.
export function CanjearCuponWidget({ m }) {
  const [codigo, setCodigo] = useState("");
  const [canjeando, setCanjeando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const canjear = async () => {
    if (!codigo.trim()) return;
    setCanjeando(true); setResultado(null);
    try {
      const r = await canjearCuponRemote(codigo, m.id);
      if (r.ok) {
        setResultado({ ok: true, mensaje: `Cupón "${r.promo.titulo}" canjeado.` });
        setCodigo("");
      } else {
        const MOTIVOS = { no_encontrado: "Código no encontrado en este mundo.", pausada: "Esta promoción está pausada.", vencida: "Esta promoción ya venció.", agotada: "Este cupón ya alcanzó su límite de canjes." };
        setResultado({ ok: false, mensaje: MOTIVOS[r.motivo] || "No se pudo canjear el cupón." });
      }
    } catch (e) {
      setResultado({ ok: false, mensaje: "No se pudo canjear el cupón." });
    } finally { setCanjeando(false); }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Icon n="confirmation_number" className="text-primary text-[20px]" /> Canjear cupón de promoción</h3>
      <div className="flex gap-2">
        <input className={`${inputCls} font-mono uppercase`} placeholder="Código del cupón (de la app del cliente)"
          value={codigo} onChange={e => { setCodigo(e.target.value); setResultado(null); }} onKeyDown={e => e.key === "Enter" && canjear()} />
        <BtnPrimary disabled={!codigo.trim() || canjeando} onClick={canjear}>
          <Icon n="qr_code_scanner" className="text-[18px]" /> {canjeando ? "Canjeando…" : "Canjear"}
        </BtnPrimary>
      </div>
      {resultado && (
        <p className={`text-xs mt-2 flex items-center gap-1.5 ${resultado.ok ? "text-ok" : "text-error"}`}>
          <Icon n={resultado.ok ? "check_circle" : "error"} className="text-[16px]" />{resultado.mensaje}
        </p>
      )}
    </div>
  );
}

/* Consumos reales del mundo desde la superapp (tabla transactions) */
function ConsumosLiveWidget({ worldId, titulo = "Ventas desde la superapp (en vivo)" }) {
  const [txs, setTxs] = useState(null);
  const [reload, setReload] = useState(0);
  React.useEffect(() => {
    let vivo = true;
    fetchConsumosMundo(worldId).then(r => { if (vivo) setTxs(r || []); }).catch(() => { if (vivo) setTxs([]); });
    return () => { vivo = false; };
  }, [worldId, reload]);
  const total = (txs || []).reduce((a, t) => a + (+t.amount || 0), 0);
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="bolt" className="text-ok text-[20px]" /> {titulo}</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-on-surface-variant">S/ {total.toFixed(2)} · {(txs || []).length} ops</span>
          <button onClick={() => setReload(k => k + 1)} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="refresh" className="text-[16px]" /></button>
        </div>
      </div>
      {txs === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : txs.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Aún no hay consumos desde la app en este mundo. Cuando un usuario pague con su saldo, aparecerá aquí al instante.</p>
      ) : (
        <div className="divide-y divide-outline-variant/60">
          {txs.slice(0, 8).map((t, i) => (
            <div key={i} className="px-5 py-2.5 flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <Icon n="shopping_bag" className="text-[16px] text-secondary" />
                <span className="font-mono text-xs">{(t.reference || "consumo").slice(0, 40)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-outline">{new Date(t.created_at).toLocaleTimeString("es-PE")}</span>
                <span className="font-mono font-bold">S/ {Number(t.amount).toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════ BNPL (Caso Mok) — Programa del Comercio + widgets ══════════ */

// Límites del Mundo para BNPL (techo que hereda el comercio — clamping)
export function bnplLimitesDelMundo(m) {
  const mod = (m?.modulos || []).find(x => x.id === "bnpl" && x.enabled);
  if (!mod) return null;
  const c = mod.config || {};
  const cuotas = [c.cuotas3 !== false && 3, c.cuotas6 !== false && 6, c.cuotas12 === true && 12].filter(Boolean);
  return { cuotas, diasGracia: Math.min(+c.diasGracia || 5, 10), scoreObligatorio: c.scoreObligatorio === true, sinEvaluacion: c.sinEvaluacion !== false, montoMax: +c.montoMaxBNPL || 3000, moraMaxPct: +c.moraMaxPct || 5 };
}

// Notificaciones al comercio ante pérdida de servicio de un cliente (Gantt #29)
function BNPLNotificacionesBanner({ worldId, merchantId }) {
  const [notifs, setNotifs] = useState(null);
  const [reload, setReload] = useState(0);
  React.useEffect(() => {
    let vivo = true;
    fetchNotificacionesBNPL(worldId, merchantId)
      .then(rows => { if (vivo) setNotifs(rows || []); })
      .catch(() => { if (vivo) setNotifs([]); });
    return () => { vivo = false; };
  }, [worldId, merchantId, reload]);

  const marcarLeida = async id => { await marcarNotificacionBNPLLeida(id); setReload(k => k + 1); };

  if (!notifs || notifs.length === 0) return null;
  return (
    <div className="mb-6 space-y-2">
      {notifs.map(n => (
        <div key={n.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-error/30 bg-error-container/40">
          <Icon n="report" className="text-error text-[20px] mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-on-surface">{n.mensaje}</p>
            <p className="font-mono text-[10px] text-outline uppercase mt-0.5">{new Date(n.created_at).toLocaleString("es-PE")}</p>
          </div>
          <button onClick={() => marcarLeida(n.id)} className="text-xs font-bold text-error hover:underline flex-shrink-0">Marcar leída</button>
        </div>
      ))}
    </div>
  );
}

// Programa del Comercio — cuotas clamped al techo del Mundo (doc §3.2 #3)
function ProgramaBNPLPanel({ comercio, m }) {
  const limites = bnplLimitesDelMundo(m);
  const merchantId = comercio.supabaseId || comercio.id;
  const [prog, setProg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prodDraft, setProdDraft] = useState({ nombre: "", precio: "" });
  const [catalogo, setCatalogo] = useState(null);
  const [campanas, setCampanas] = useState(null);
  const [campDraft, setCampDraft] = useState({ nombre: "", fechaInicio: "", fechaFin: "", productoIds: [] });

  const BNPL_BLANK = { cuotas: [3], comision: 5, revShare: 30, productos: [], mora: "sin_cargo_suspension", moraPct: 0, frecuencia: "mensual", diasPersonalizados: 7, diasGracia: limites.diasGracia, alcance: "puntuales", categorias: [], cuotaInicial: 0, activo: true };

  React.useEffect(() => {
    let vivo = true;
    fetchProgramaBNPL(m.id, merchantId)
      .then(rows => { if (!vivo) return;
        const r = rows?.[0];
        setProg(r ? { cuotas: r.cuotas_activas || [3], comision: +r.comision_pct, revShare: +r.revenue_share_pct, productos: r.productos_financiables || [], mora: r.gestion_mora, moraPct: +r.mora_pct || 0, frecuencia: r.frecuencia || "mensual", diasPersonalizados: r.dias_personalizados || 7, diasGracia: r.dias_gracia != null ? r.dias_gracia : limites.diasGracia, alcance: r.alcance || "puntuales", categorias: r.categorias || [], cuotaInicial: +r.cuota_inicial || 0, activo: r.activo }
                  : BNPL_BLANK);
      })
      .catch(() => { if (vivo) setProg({ ...BNPL_BLANK, offline: true }); });
    fetchProductsRemote(merchantId).then(setCatalogo).catch(() => setCatalogo([]));
    fetchCampanasBNPL(m.id, merchantId).then(setCampanas).catch(() => setCampanas([]));
    return () => { vivo = false; };
  }, [m.id, merchantId]);

  if (!limites) return (
    <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
      <Icon n="calendar_clock" className="text-[48px] text-outline mb-3 block mx-auto" />
      El mundo <b>{m.nombre}</b> aún no habilita BNPL. El administrador debe activar la capacidad y definir los límites.
    </div>
  );
  if (!prog) return <p className="text-on-surface-variant py-8">Cargando programa…</p>;

  const toggleCuota = n => {
    if (!limites.cuotas.includes(n)) return; // clamping: fuera del techo del mundo
    setProg(p => ({ ...p, cuotas: p.cuotas.includes(n) ? p.cuotas.filter(x => x !== n) : [...p.cuotas, n].sort((a, b) => a - b) }));
  };
  const addProducto = () => {
    if (!prodDraft.nombre || !+prodDraft.precio) return;
    setProg(p => ({ ...p, productos: [...p.productos, { id: uid("pf"), nombre: prodDraft.nombre, precio: +prodDraft.precio }] }));
    setProdDraft({ nombre: "", precio: "" });
  };
  const guardar = async () => {
    setSaving(true);
    try {
      await upsertProgramaBNPL(m.id, merchantId, {
        merchantNombre: comercio.nombre, cuotasActivas: prog.cuotas, comisionPct: prog.comision,
        revenueSharePct: prog.revShare, productosFinanciables: prog.productos, gestionMora: prog.mora, moraPct: prog.moraPct,
        frecuencia: prog.frecuencia, diasPersonalizados: prog.diasPersonalizados, diasGracia: prog.diasGracia,
        alcance: prog.alcance, categorias: prog.categorias, cuotaInicial: prog.cuotaInicial, activo: prog.activo,
      });
      notify("Programa BNPL publicado — visible en la superapp del mundo.");
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "publicar-bnpl", m.id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    }
    finally { setSaving(false); }
  };

  return (
    <>
      <BNPLNotificacionesBanner worldId={m.id} merchantId={merchantId} />
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Programa BNPL del comercio</h2>
          <p className="text-on-surface-variant mt-1 text-sm">El Mundo habilita; el Comercio activa y configura. Todo dentro del techo del mundo.</p>
        </div>
        <BtnPrimary onClick={guardar} disabled={saving}><Icon n="rocket_launch" className="text-[18px]" /> {saving ? "Publicando…" : "Publicar programa"}</BtnPrimary>
      </div>

      {/* Techo del mundo — solo lectura */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-on-surface-variant">
        <span className="uppercase text-outline">Techo del mundo {m.nombre}:</span>
        <span>cuotas <b className="text-on-surface">{limites.cuotas.join(" / ")}</b></span>
        <span>gracia máx <b className="text-on-surface">{limites.diasGracia} días</b></span>
        <span>monto máx <b className="text-on-surface">S/ {limites.montoMax}</b></span>
        <span>mora máx <b className="text-on-surface">{limites.moraMaxPct}%</b></span>
        <span>evaluación <b className="text-on-surface">{limites.sinEvaluacion ? "sin evaluación permitida" : "score requerido"}</b></span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-5">
          <Field label="Cuotas activas (dentro del límite del mundo)">
            <div className="flex gap-2">
              {[3, 6, 12].map(n => {
                const permitida = limites.cuotas.includes(n);
                const activa = prog.cuotas.includes(n);
                return (
                  <button key={n} disabled={!permitida} onClick={() => toggleCuota(n)}
                    title={permitida ? "" : "Fuera del techo del mundo (clamping)"}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-bold transition-colors ${activa ? "border-secondary bg-secondary-fixed text-secondary" : "border-outline-variant"} ${!permitida ? "opacity-35 cursor-not-allowed line-through" : ""}`}>
                    {n} cuotas{n === 3 ? " · 0%" : ""}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-outline mt-1.5">Las cuotas tachadas exceden el techo del mundo: el comercio solo puede restringir, nunca ampliar.</p>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Comisión sobre venta financiada (%)">
              <NumInput className={inputCls} step="0.5" value={prog.comision} onChange={v => setProg(p => ({ ...p, comision: v }))} />
            </Field>
            <Field label="Revenue share al mundo (%)">
              <NumInput className={inputCls} step="1" value={prog.revShare} onChange={v => setProg(p => ({ ...p, revShare: v }))} />
            </Field>
          </div>
          <Field label="Gestión de mora">
            <div className="space-y-2">
              {[["sin_cargo_suspension", "Sin cargo — suspensión de nuevas compras BNPL"], ["con_cargo", "Con cargo por mora"]].map(([v, l]) => (
                <label key={v} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer text-sm ${prog.mora === v ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant"}`}>
                  <input type="radio" checked={prog.mora === v} onChange={() => setProg(p => ({ ...p, mora: v }))} /> {l}
                </label>
              ))}
              {prog.mora === "con_cargo" && (
                <div className="pl-3">
                  <Field label={`% de mora aplicado (techo del mundo: ${limites.moraMaxPct}%)`}>
                    <NumInput className={inputCls} step="0.5" min="0" max={limites.moraMaxPct}
                      value={prog.moraPct} onChange={v => setProg(p => ({ ...p, moraPct: Math.min(v, limites.moraMaxPct) }))} />
                  </Field>
                </div>
              )}
            </div>
          </Field>
          <Field label="Plan de pagos">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-on-surface-variant block mb-1">Frecuencia de cobro</label>
                <select className={inputCls} value={prog.frecuencia} onChange={e => setProg(p => ({ ...p, frecuencia: e.target.value }))}>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                  <option value="personalizada">Personalizada</option>
                </select>
              </div>
              {prog.frecuencia === "personalizada" ? (
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Días entre cuotas</label>
                  <NumInput className={inputCls} min="1" value={prog.diasPersonalizados} onChange={v => setProg(p => ({ ...p, diasPersonalizados: v }))} />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Días de gracia (techo: {limites.diasGracia})</label>
                  <NumInput className={inputCls} min="0" max={limites.diasGracia} value={prog.diasGracia} onChange={v => setProg(p => ({ ...p, diasGracia: Math.min(v, limites.diasGracia) }))} />
                </div>
              )}
            </div>
            {prog.frecuencia === "personalizada" && (
              <div className="mt-2">
                <label className="text-xs text-on-surface-variant block mb-1">Días de gracia (techo: {limites.diasGracia})</label>
                <NumInput className={inputCls} min="0" max={limites.diasGracia} value={prog.diasGracia} onChange={v => setProg(p => ({ ...p, diasGracia: Math.min(v, limites.diasGracia) }))} />
              </div>
            )}
            <p className="text-xs text-outline mt-1.5">Define cómo se espacia el cronograma de cuotas de las próximas ventas financiadas de este comercio.</p>
          </Field>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
          <div className="flex justify-between items-center mb-1">
            <h4 className="font-semibold">Productos financiables</h4>
            <span className="font-mono text-[10px] text-outline uppercase">catálogo restringible</span>
          </div>
          <p className="text-xs text-on-surface-variant mb-4">Define sobre qué productos aplica BNPL.</p>

          <Field label="Alcance">
            <div className="space-y-1.5 mb-3">
              {[
                ["catalogo", "Todo el catálogo", `${(catalogo || []).length} producto(s) de tu catálogo real`],
                ["categorias", "Categorías específicas", "elige qué categorías de tu catálogo son financiables"],
                ["puntuales", "Productos puntuales", "lista manual, no depende de tu catálogo (ej. equipos grandes con nombre libre)"],
              ].map(([v, l, hint]) => (
                <label key={v} className={`flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer text-sm ${prog.alcance === v ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant"}`}>
                  <input type="radio" checked={prog.alcance === v} onChange={() => setProg(p => ({ ...p, alcance: v }))} />
                  <span className="flex-1"><b>{l}</b><span className="block text-[10px] text-outline font-normal">{hint}</span></span>
                </label>
              ))}
            </div>
          </Field>

          {prog.alcance === "catalogo" && (
            <p className="text-xs text-on-surface-variant py-3 px-3 bg-surface-container-low rounded-lg">
              Los {(catalogo || []).length} productos activos de tu catálogo (Mi catálogo) serán financiables automáticamente — no necesitas listarlos acá.
            </p>
          )}

          {prog.alcance === "categorias" && (
            <div className="space-y-2 mb-2">
              {[...new Set((catalogo || []).map(p => p.category).filter(Boolean))].length === 0 ? (
                <p className="text-xs text-outline py-3">Tu catálogo aún no tiene productos con categoría asignada.</p>
              ) : [...new Set((catalogo || []).map(p => p.category).filter(Boolean))].map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={prog.categorias.includes(cat)}
                    onChange={e => setProg(p => ({ ...p, categorias: e.target.checked ? [...p.categorias, cat] : p.categorias.filter(c => c !== cat) }))} />
                  {cat}
                </label>
              ))}
            </div>
          )}

          {prog.alcance === "puntuales" && (
            <>
              <div className="space-y-2 mb-4">
                {prog.productos.length === 0 && <p className="text-sm text-outline py-4 text-center border border-dashed border-outline-variant rounded-lg">Sin productos financiables aún.</p>}
                {prog.productos.map((p, i) => (
                  <div key={p.id || i} className="flex items-center justify-between px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm">
                    <span className="font-medium flex items-center gap-2"><Icon n="sell" className="text-secondary text-[16px]" />{p.nombre}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono">S/ {Number(p.precio).toFixed(2)}</span>
                      <button onClick={() => setProg(pr => ({ ...pr, productos: pr.productos.filter((_, j) => j !== i) }))} className="text-error"><Icon n="close" className="text-[16px]" /></button>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={inputCls} placeholder="Ej. Garantía extendida TV 55''" value={prodDraft.nombre} onChange={e => setProdDraft(d => ({ ...d, nombre: e.target.value }))} />
                <NumInput className={`${inputCls} !w-28`} placeholder="S/" value={prodDraft.precio} onChange={v => setProdDraft(d => ({ ...d, precio: v }))} />
                <BtnOutline onClick={addProducto}><Icon n="add" className="text-[18px]" /></BtnOutline>
              </div>
              {prog.productos.some(p => p.precio > limites.montoMax) && (
                <p className="text-xs text-error mt-2 flex items-center gap-1"><Icon n="warning" className="text-[14px]" /> Hay productos sobre el monto máximo financiable del mundo (S/ {limites.montoMax}) — el Rules Engine bloqueará su financiamiento.</p>
              )}
            </>
          )}

          <div className="mt-4 pt-4 border-t border-outline-variant/50">
            <Field label="Cuota inicial (opcional)" hint="Monto que el cliente paga al firmar, antes del cronograma de cuotas restantes.">
              <NumInput className={`${inputCls} !w-32`} min="0" step="0.5" value={prog.cuotaInicial} onChange={v => setProg(p => ({ ...p, cuotaInicial: v }))} />
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-6"><CampanasBNPLPanel worldId={m.id} merchantId={merchantId} catalogo={catalogo} productosPuntuales={prog.productos} campanas={campanas} setCampanas={setCampanas} campDraft={campDraft} setCampDraft={setCampDraft} /></div>
      <div className="mt-6"><ReportesBNPLComercio worldId={m.id} merchantId={merchantId} sinEvaluacion={limites.sinEvaluacion} /></div>
      <div className="mt-6"><CronogramaBNPLWidget worldId={m.id} merchantId={merchantId} titulo="Cronogramas BNPL de mis ventas" /></div>
    </>
  );
}

// Campañas temporales de Productos Financiables (Gantt #61): fecha inicio/fin
// + productos incluidos, adicionan elegibilidad BNPL sobre el alcance base
// mientras estén vigentes.
function CampanasBNPLPanel({ worldId, merchantId, catalogo, productosPuntuales, campanas, setCampanas, campDraft, setCampDraft }) {
  const opcionesProducto = (catalogo && catalogo.length ? catalogo.map(p => ({ id: p.id, nombre: p.name })) : (productosPuntuales || []).map(p => ({ id: p.id, nombre: p.nombre })));

  const crear = async () => {
    if (!campDraft.nombre.trim()) return;
    try {
      const saved = await crearCampanaBNPL(worldId, merchantId, { ...campDraft, productos: campDraft.productoIds });
      setCampanas(c => [saved, ...(c || [])]);
      setCampDraft({ nombre: "", fechaInicio: "", fechaFin: "", productoIds: [] });
      notify(`Campaña "${saved.nombre}" creada.`);
    } catch { notify("No se pudo crear la campaña.", "error"); }
  };
  const eliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar la campaña "${nombre}"? Los productos vuelven a su financiamiento base.`)) return;
    try { await eliminarCampanaBNPL(id); setCampanas(c => c.filter(x => x.id !== id)); }
    catch { notify("No se pudo eliminar la campaña.", "error"); }
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const vigente = c => (!c.fecha_inicio || c.fecha_inicio <= hoy) && (!c.fecha_fin || c.fecha_fin >= hoy);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
      <h4 className="font-semibold mb-1">Campañas temporales</h4>
      <p className="text-xs text-on-surface-variant mb-4">Amplían qué productos son financiables solo durante un rango de fechas (ej. Black Friday).</p>
      <div className="space-y-2 mb-4">
        {campanas === null ? (
          <p className="text-sm text-outline py-2">Cargando…</p>
        ) : campanas.length === 0 ? (
          <p className="text-sm text-outline py-4 text-center border border-dashed border-outline-variant rounded-lg">Sin campañas creadas.</p>
        ) : campanas.map(c => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm">
            <span>
              <span className="font-medium">{c.nombre}</span>
              {vigente(c) && <span className="ml-2 font-mono text-[9px] uppercase bg-ok/20 text-ok px-1.5 py-0.5 rounded">vigente</span>}
              <span className="block text-[10px] text-outline">{c.fecha_inicio || "sin inicio"} → {c.fecha_fin || "sin fin"} · {(c.productos || []).length} producto(s)</span>
            </span>
            <button onClick={() => eliminar(c.id, c.nombre)} className="text-error"><Icon n="close" className="text-[16px]" /></button>
          </div>
        ))}
      </div>
      <div className="border border-dashed border-outline-variant rounded-lg p-3 space-y-2">
        <input className={inputCls} placeholder="Nombre de la campaña" value={campDraft.nombre} onChange={e => setCampDraft(d => ({ ...d, nombre: e.target.value }))} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} type="date" value={campDraft.fechaInicio} onChange={e => setCampDraft(d => ({ ...d, fechaInicio: e.target.value }))} />
          <input className={inputCls} type="date" value={campDraft.fechaFin} onChange={e => setCampDraft(d => ({ ...d, fechaFin: e.target.value }))} />
        </div>
        {opcionesProducto.length > 0 && (
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {opcionesProducto.map(p => (
              <label key={p.id} className="flex items-center gap-1.5 text-xs bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant cursor-pointer">
                <input type="checkbox" checked={campDraft.productoIds.includes(p.id)}
                  onChange={e => setCampDraft(d => ({ ...d, productoIds: e.target.checked ? [...d.productoIds, p.id] : d.productoIds.filter(x => x !== p.id) }))} />
                {p.nombre}
              </label>
            ))}
          </div>
        )}
        <BtnOutline className="!py-1.5 !px-3 !text-xs" disabled={!campDraft.nombre.trim()} onClick={crear}>
          <Icon n="add" className="text-[16px]" /> Crear campaña
        </BtnOutline>
      </div>
    </div>
  );
}

// Reportes BNPL del comercio (BackOffice Comercio → BNPL → "Reportes").
// Spec doc, 7 métricas: solicitudes pendientes, financiamientos activos,
// próximos vencimientos, pagos realizados, cartera vigente y vencida,
// historial por usuario, indicadores de recuperación.
function ReportesBNPLComercio({ worldId, merchantId, sinEvaluacion }) {
  const [contratos, setContratos] = useState(null);
  const [reload, setReload] = useState(0);
  const [resolviendo, setResolviendo] = useState(null); // id en curso
  const [motivoDraft, setMotivoDraft] = useState({}); // {id: texto de rechazo}
  React.useEffect(() => {
    let vivo = true;
    fetchContratosBNPL(worldId, merchantId).then(rows => sincronizarCicloBNPL(rows || [])).then(rows => { if (vivo) setContratos(rows); }).catch(() => { if (vivo) setContratos([]); });
    return () => { vivo = false; };
  }, [worldId, merchantId, reload]);

  if (contratos === null) return <p className="text-sm text-on-surface-variant py-4">Cargando reportes…</p>;

  const pendientes = contratos.filter(c => c.estado === "pendiente_aprobacion");
  // Historial real de financiamiento (excluye solicitudes aún no resueltas) —
  // es el contexto que la Administración de Solicitudes necesita para no
  // aprobar/rechazar a ciegas (Gantt #31).
  const conHistorial = contratos.filter(c => c.estado !== "pendiente_aprobacion");
  const financiamientosActivos = conHistorial.filter(c => c.estado === "firmado" || c.estado === "suspendido" || c.estado === "en_mora").length;
  let carteraVigente = 0, carteraVencida = 0, cuotasPagadas = 0, cuotasTotal = 0, pagosRealizados = 0;
  const proximos = [];
  const porUsuario = {};
  for (const c of conHistorial) {
    porUsuario[c.user_id] = porUsuario[c.user_id] || { n: 0, monto: 0, enMora: 0 };
    porUsuario[c.user_id].n += 1; porUsuario[c.user_id].monto += +c.monto || 0;
    if (c.estado === "en_mora" || c.estado === "suspendido") porUsuario[c.user_id].enMora += 1;
    for (const q of c.cronograma || []) {
      cuotasTotal++;
      if (q.estado === "pagada") { cuotasPagadas++; pagosRealizados++; continue; }
      if (q.estado === "vencida") carteraVencida += +q.monto || 0;
      else if (q.estado === "pendiente") { carteraVigente += +q.monto || 0; proximos.push({ ...q, producto: c.producto, contratoId: c.id }); }
    }
  }
  proximos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const indicadorRecuperacion = cuotasTotal > 0 ? Math.round((cuotasPagadas / cuotasTotal) * 100) : 0;
  const historialUsuarios = Object.entries(porUsuario).sort((a, b) => b[1].monto - a[1].monto);
  const historialDe = userId => porUsuario[userId] || { n: 0, monto: 0, enMora: 0 };

  const resolver = async (id, estado) => {
    setResolviendo(id);
    try {
      await resolverSolicitudBNPL(id, estado, estado === "rechazado" ? (motivoDraft[id] || "") : null);
      setReload(k => k + 1);
    } finally { setResolviendo(null); }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-4"><Icon n="query_stats" className="text-primary text-[20px]" /> Reportes BNPL</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          ["Solicitudes pendientes", sinEvaluacion ? "0" : pendientes.length, sinEvaluacion ? "sin evaluación: aprobación instantánea" : ""],
          ["Financiamientos activos", financiamientosActivos, ""],
          ["Pagos realizados", pagosRealizados, ""],
          ["Recuperación", `${indicadorRecuperacion}%`, `${cuotasPagadas}/${cuotasTotal} cuotas`],
          ["Cartera vigente", `S/ ${carteraVigente.toFixed(2)}`, ""],
          ["Cartera vencida", `S/ ${carteraVencida.toFixed(2)}`, ""],
        ].map(([l, v, sub]) => (
          <div key={l} className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
            <p className="text-lg font-black">{v}</p>
            <p className="font-mono text-[9px] uppercase text-outline mt-1">{l}</p>
            {sub && <p className="text-[10px] text-outline mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {!sinEvaluacion && (
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase text-outline mb-2 flex items-center gap-1.5"><Icon n="inbox" className="text-[14px]"/> Administración de Solicitudes</p>
          {pendientes.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-2">Sin solicitudes pendientes de evaluación.</p>
          ) : (
            <div className="space-y-2">
              {pendientes.map(c => {
                const h = historialDe(c.user_id);
                return (
                  <div key={c.id} className="border border-outline-variant rounded-lg p-3.5 bg-surface-container-low">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold">{c.producto} <span className="font-mono text-outline">· S/ {Number(c.monto).toFixed(2)} en {c.cuotas}x</span></p>
                        <p className="font-mono text-[10px] text-outline mt-0.5">usuario {c.user_id.slice(0, 8)}… · solicitado {new Date(c.created_at).toLocaleDateString("es-PE")}</p>
                      </div>
                      <Pill color={h.enMora > 0 ? "bg-error-container" : h.n > 0 ? "bg-ok" : "bg-surface-container"}>
                        {h.n === 0 ? "Sin historial previo" : `${h.n} contrato${h.n !== 1 ? "s" : ""} · ${h.enMora > 0 ? `${h.enMora} en mora` : "al día"}`}
                      </Pill>
                    </div>
                    <div className="flex gap-2 items-center">
                      <BtnPrimary disabled={resolviendo === c.id} onClick={() => resolver(c.id, "aprobado")} className="!py-1.5 !px-3 !text-xs">
                        <Icon n="check_circle" className="text-[14px]"/> Aprobar
                      </BtnPrimary>
                      <input className={`${inputCls} !h-8 !text-xs flex-1`} placeholder="Motivo de rechazo (opcional)"
                        value={motivoDraft[c.id] || ""} onChange={e => setMotivoDraft({ ...motivoDraft, [c.id]: e.target.value })}/>
                      <BtnOutline disabled={resolviendo === c.id} onClick={() => resolver(c.id, "rechazado")} className="!py-1.5 !px-3 !text-xs !border-error !text-error">
                        <Icon n="cancel" className="text-[14px]"/> Rechazar
                      </BtnOutline>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Próximos vencimientos</p>
          {proximos.length === 0 ? <p className="text-xs text-on-surface-variant py-2">Sin cuotas pendientes.</p> : (
            <div className="space-y-1.5">
              {proximos.slice(0, 5).map((q, i) => (
                <div key={i} className="flex justify-between text-xs px-3 py-2 bg-surface-container-low rounded-lg">
                  <span className="text-on-surface-variant">{q.fecha} · {q.producto} (cuota {q.n})</span>
                  <span className="font-bold">S/ {Number(q.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Historial por usuario</p>
          {historialUsuarios.length === 0 ? <p className="text-xs text-on-surface-variant py-2">Sin financiamientos aún.</p> : (
            <div className="space-y-1.5">
              {historialUsuarios.slice(0, 5).map(([uid_, v]) => (
                <div key={uid_} className="flex justify-between text-xs px-3 py-2 bg-surface-container-low rounded-lg">
                  <span className="text-on-surface-variant font-mono">{uid_.slice(0, 8)}… · {v.n} contrato{v.n !== 1 ? "s" : ""}</span>
                  <span className="font-bold">S/ {v.monto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Widget "Cronograma BNPL" (doc §3.3 — widget nuevo en Dashboard MV-01)
// Filas clicables: abren BnplContratoDrawer con la Gestión del Financiamiento
// (Gantt Caso BNPL — 9 acciones de ciclo de vida sobre un contrato activo).
function CronogramaBNPLWidget({ worldId, merchantId = null, titulo = "Cronograma BNPL" }) {
  const [contratos, setContratos] = useState(null);
  const [abierto, setAbierto] = useState(null);
  React.useEffect(() => {
    let vivo = true;
    fetchContratosBNPL(worldId, merchantId)
      .then(rows => sincronizarCicloBNPL(rows || []))
      .then(rows => { if (vivo) setContratos(rows); })
      .catch(() => { if (vivo) setContratos([]); });
    return () => { vivo = false; };
  }, [worldId, merchantId]);

  const recargar = () => fetchContratosBNPL(worldId, merchantId)
    .then(rows => sincronizarCicloBNPL(rows || []))
    .then(setContratos)
    .catch(() => {});

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="calendar_clock" className="text-secondary text-[20px]" /> {titulo}</h3>
        <span className="font-mono text-[10px] text-outline uppercase">{contratos?.length ?? "…"} contratos</span>
      </div>
      {contratos === null ? (
        <p className="px-5 py-6 text-sm text-on-surface-variant">Cargando…</p>
      ) : contratos.length === 0 ? (
        <p className="px-5 py-6 text-sm text-on-surface-variant">Sin contratos BNPL todavía. Cuando un usuario financie una compra en la superapp, su contrato y cronograma aparecerán aquí.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3 text-right">Monto</th>
              <th className="px-5 py-3 text-center">Cuotas</th>
              <th className="px-5 py-3">Próximo vencimiento</th>
              <th className="px-5 py-3 text-center">Estado</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {contratos.map(c => {
              const prox = (c.cronograma || []).find(q => q.estado !== "pagada");
              return (
                <tr key={c.id} className="hover:bg-surface-container-low cursor-pointer" onClick={() => setAbierto(c)}>
                  <td className="px-5 py-3 font-medium">{c.producto}</td>
                  <td className="px-5 py-3 text-right font-mono">S/ {Number(c.monto).toFixed(2)}</td>
                  <td className="px-5 py-3 text-center font-mono">{c.cuotas}x</td>
                  <td className={`px-5 py-3 font-mono text-xs ${prox?.estado === "vencida" ? "text-error font-bold" : ""}`}>
                    {prox ? `${prox.fecha} · S/ ${Number(prox.monto).toFixed(2)}${prox.estado === "vencida" ? " · vencida" : ""}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Pill color={c.estado === "suspendido" ? "bg-error" : c.estado === "en_mora" ? "bg-error" : c.estado === "incobrable" ? "bg-error" : c.estado === "cerrado" ? "bg-outline" : "bg-ok"}>{(c.estado || "firmado").replace("_", " ").toUpperCase()}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right"><Icon n="chevron_right" className="text-outline text-[18px]" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {abierto && <BnplContratoDrawer contrato={abierto} onClose={() => setAbierto(null)} onChanged={() => { recargar(); setAbierto(null); }} />}
    </div>
  );
}

/* ── Gestión del Financiamiento — drawer con las 9 acciones de ciclo de vida
   sobre un contrato BNPL ya firmado (Gantt Caso BNPL). Toda acción recalcula
   cronograma/estado y notifica a RedPontis vía bnpl_notificaciones — no hay
   re-aceptación interactiva del usuario todavía (gap documentado a propósito
   en el Gantt, construir eso es una superficie nueva en joi360-app). ── */
function BnplContratoDrawer({ contrato, onClose, onChanged }) {
  const [c, setC] = useState(contrato);
  const [accion, setAccion] = useState(null); // qué mini-formulario está abierto
  const [busy, setBusy] = useState(false);
  const [nCuotas, setNCuotas] = useState(3);
  const [primerVenc, setPrimerVenc] = useState(new Date().toISOString().slice(0, 10));
  const [interesNuevo, setInteresNuevo] = useState(0);
  const [montoDescuento, setMontoDescuento] = useState(0);

  const ejecutar = async (fn, ...args) => {
    setBusy(true);
    try {
      await fn(c, ...args);
      notify("Acción aplicada — el cronograma se actualizó y RedPontis fue notificado.");
      setAccion(null);
      onChanged();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `bnpl-accion:${c.id}`, c.world_id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setBusy(false); }
  };

  const saldo = saldoPendienteBNPL(c);
  const ACCIONES = [
    { k: "reprogramar", icon: "event_repeat", label: "Reprogramar cuotas", desc: "Redistribuir el saldo pendiente en un nuevo número de cuotas." },
    { k: "refinanciar", icon: "currency_exchange", label: "Refinanciar saldo", desc: "Nuevo plan de cuotas, opcionalmente con otra tasa." },
    { k: "condonar", icon: "money_off", label: "Condonar intereses", desc: "Quita el % de interés de las cuotas pendientes.", disabled: !(+c.interes_pct) },
    { k: "mora", icon: "healing", label: "Eliminar mora", desc: "Limpia cuotas vencidas y reactiva el contrato.", disabled: !(c.cronograma || []).some(q => q.estado === "vencida") },
    { k: "descuento", icon: "sell", label: "Descuento extraordinario", desc: "Reduce el saldo pendiente en un monto fijo." },
    { k: "cancelar", icon: "task_alt", label: "Cancelar anticipadamente", desc: "Cierra el contrato; cuotas pendientes quedan canceladas.", disabled: c.estado === "cerrado" || c.estado === "incobrable" },
    { k: "incobrable", icon: "report", label: "Declarar incobrable", desc: "Marca el contrato como pérdida — sale de cobranza activa.", disabled: c.estado === "incobrable" },
  ];

  return (
    <Drawer open onClose={onClose} icon="calendar_clock" title="Gestión del Financiamiento" subtitle={`${c.producto} · ${c.merchant_nombre || ""}`} width="w-[600px]"
      footer={<BtnOutline onClick={onClose}>Cerrar</BtnOutline>}>
      <div className="mb-6 p-4 bg-surface-container-low border border-outline-variant rounded-xl flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[11px] text-on-surface-variant">
        <span>Monto <b className="text-on-surface">S/ {Number(c.monto).toFixed(2)}</b></span>
        <span>Saldo pendiente <b className="text-on-surface">S/ {saldo.toFixed(2)}</b></span>
        <span>Interés <b className="text-on-surface">{c.interes_pct || 0}%</b></span>
        <span>Estado <Pill color={c.estado === "suspendido" || c.estado === "en_mora" || c.estado === "incobrable" ? "bg-error" : c.estado === "cerrado" ? "bg-outline" : "bg-ok"}>{(c.estado || "firmado").toUpperCase()}</Pill></span>
      </div>

      <h4 className="font-semibold text-sm mb-2">Cronograma</h4>
      <div className="border border-outline-variant rounded-xl overflow-hidden mb-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-4 py-2">#</th><th className="px-4 py-2">Fecha</th><th className="px-4 py-2 text-right">Monto</th><th className="px-4 py-2 text-center">Estado</th><th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {(c.cronograma || []).map(q => (
              <tr key={q.n}>
                <td className="px-4 py-2 font-mono">{q.n}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {q.estado === "pendiente" || q.estado === "vencida" ? (
                    <input type="date" className={`${inputCls} !py-1 !text-xs`} defaultValue={q.fecha}
                      onBlur={e => e.target.value !== q.fecha && ejecutar(modificarFechaCuotaBNPL, q.n, e.target.value)} />
                  ) : q.fecha}
                </td>
                <td className="px-4 py-2 text-right font-mono">S/ {Number(q.monto).toFixed(2)}</td>
                <td className="px-4 py-2 text-center">
                  <Pill color={q.estado === "pagada" ? "bg-ok" : q.estado === "vencida" ? "bg-error" : q.estado === "cancelada" || q.estado === "incobrable" ? "bg-outline" : "bg-tertiary"}>{q.estado.toUpperCase()}</Pill>
                </td>
                <td className="px-4 py-2 text-right">
                  {(q.estado === "pendiente" || q.estado === "vencida") && (
                    <button disabled={busy} onClick={() => ejecutar(registrarPagoManualBNPL, q.n)}
                      className="text-[10px] font-bold text-primary hover:underline disabled:opacity-50">Registrar pago manual</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="font-semibold text-sm mb-2">Acciones sobre el financiamiento</h4>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {ACCIONES.map(a => (
          <button key={a.k} disabled={a.disabled} onClick={() => setAccion(o => o === a.k ? null : a.k)}
            className={`text-left p-3 rounded-lg border-2 transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${accion === a.k ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
            <div className="flex items-center gap-1.5 mb-0.5"><Icon n={a.icon} className="text-primary text-[16px]" /><span className="text-xs font-semibold">{a.label}</span></div>
            <p className="text-[10px] text-on-surface-variant">{a.desc}</p>
          </button>
        ))}
      </div>

      {accion === "reprogramar" && (
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-4 space-y-3">
          <Field label="Nuevas cuotas"><NumInput className={inputCls} min="1" value={nCuotas} onChange={v => setNCuotas(v)} /></Field>
          <Field label="Primer vencimiento"><input className={inputCls} type="date" value={primerVenc} onChange={e => setPrimerVenc(e.target.value)} /></Field>
          <BtnPrimary disabled={busy} onClick={() => ejecutar(reprogramarCuotasBNPL, nCuotas, primerVenc)}>{busy ? "Aplicando…" : "Reprogramar"}</BtnPrimary>
        </div>
      )}
      {accion === "refinanciar" && (
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-4 space-y-3">
          <Field label="Nuevas cuotas"><NumInput className={inputCls} min="1" value={nCuotas} onChange={v => setNCuotas(v)} /></Field>
          <Field label="Primer vencimiento"><input className={inputCls} type="date" value={primerVenc} onChange={e => setPrimerVenc(e.target.value)} /></Field>
          <Field label="Nueva tasa de interés (%, opcional)"><NumInput className={inputCls} step="0.5" value={interesNuevo} onChange={v => setInteresNuevo(v)} /></Field>
          <BtnPrimary disabled={busy} onClick={() => ejecutar(refinanciarBNPL, nCuotas, primerVenc, interesNuevo)}>{busy ? "Aplicando…" : "Refinanciar"}</BtnPrimary>
        </div>
      )}
      {accion === "condonar" && (
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-4 space-y-3">
          <p className="text-xs text-on-surface-variant">Quita el {c.interes_pct}% de interés de todas las cuotas pendientes de "{c.producto}".</p>
          <BtnPrimary disabled={busy} onClick={() => ejecutar(condonarInteresesBNPL)}>{busy ? "Aplicando…" : "Condonar intereses"}</BtnPrimary>
        </div>
      )}
      {accion === "mora" && (
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-4 space-y-3">
          <p className="text-xs text-on-surface-variant">Reactiva el contrato y limpia las cuotas marcadas como vencidas.</p>
          <BtnPrimary disabled={busy} onClick={() => ejecutar(eliminarMoraBNPL)}>{busy ? "Aplicando…" : "Eliminar mora"}</BtnPrimary>
        </div>
      )}
      {accion === "descuento" && (
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-4 space-y-3">
          <Field label={`Monto del descuento (saldo actual: S/ ${saldo.toFixed(2)})`}><NumInput className={inputCls} step="0.5" value={montoDescuento} onChange={v => setMontoDescuento(v)} /></Field>
          <BtnPrimary disabled={busy || montoDescuento <= 0} onClick={() => ejecutar(aplicarDescuentoBNPL, montoDescuento)}>{busy ? "Aplicando…" : "Aplicar descuento"}</BtnPrimary>
        </div>
      )}
      {accion === "cancelar" && (
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl mb-4 space-y-3">
          <p className="text-xs text-on-surface-variant">Cierra el contrato ahora mismo; las cuotas pendientes quedan marcadas como canceladas (no se cobran).</p>
          <BtnPrimary disabled={busy} onClick={() => ejecutar(cancelarAnticipadoBNPL)}>{busy ? "Aplicando…" : "Confirmar cancelación anticipada"}</BtnPrimary>
        </div>
      )}
      {accion === "incobrable" && (
        <div className="p-4 bg-error-container/20 border border-error/40 rounded-xl mb-4 space-y-3">
          <p className="text-xs text-error">Marca el saldo de S/ {saldo.toFixed(2)} como pérdida y saca el contrato de cobranza activa. Úsalo solo cuando ya no hay expectativa real de cobro.</p>
          <BtnPrimary disabled={busy} onClick={() => ejecutar(declararIncobrableBNPL)} className="!bg-error">{busy ? "Aplicando…" : "Declarar incobrable"}</BtnPrimary>
        </div>
      )}
    </Drawer>
  );
}

/* ── KPIs reales por módulo del Sponsor (reemplaza "Mis módulos") ──────────
   Antes: un solo tab "Mis módulos y condiciones" agrupaba todos los módulos
   y dejaba al mundo editar sus configFields — entre ellos mdrDefault/
   fijoTxDefault (Comercios), una tasa/comisión que solo define RedPontis.
   Ahora: el mundo solo VE lo que le corresponde de cada módulo (KPIs reales,
   nunca inventados) y cada módulo activo es su propia sección — sin
   agruparlos bajo una sola pestaña. */
function ModuloVacio({ icon, texto }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
      <Icon n={icon} className="text-[40px] text-outline mb-3 block mx-auto" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}
function KpiCard({ label, value, icon }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-[9px] uppercase text-outline">{label}</span>
        <Icon n={icon} className="text-primary text-[16px]" />
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

/* ── Solicitar más banditas NFC a RedPontis (Panel Mundo) — distinto de
   SolicitudesNfcWidget (eso es un usuario final pidiendo SU pulsera; esto es
   el mundo pidiendo stock nuevo cuando se está quedando sin banditas). ── */
function SolicitarLoteNfcWidget({ worldId }) {
  const [reqs, setReqs] = useState(null);
  const [cantidad, setCantidad] = useState("");
  const [enviando, setEnviando] = useState(false);
  const load = () => fetchSolicitudesLoteNfcMundo(worldId).then(setReqs).catch(() => setReqs([]));
  useEffect(() => { load(); }, [worldId]);

  const solicitar = async () => {
    const n = +cantidad;
    if (!n || n <= 0) return;
    setEnviando(true);
    try {
      await crearSolicitudLoteNfcRemote(worldId, n);
      setCantidad("");
      notify(`Solicitud de ${n} banditas enviada a RedPontis.`);
      load();
    } catch (e) {
      notify("No se pudo enviar la solicitud: " + e.message, "error");
    } finally { setEnviando(false); }
  };

  const pendientes = (reqs || []).filter(r => r.estado === "pendiente");

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="local_shipping" className="text-primary text-[20px]" /> Solicitar más banditas NFC</h3>
        {pendientes.length > 0 && <span className="w-6 h-6 rounded-full bg-tertiary text-white text-xs font-black flex items-center justify-center">{pendientes.length}</span>}
      </div>
      <div className="p-5">
        <p className="text-xs text-on-surface-variant mb-3">Cuando se estén acabando las banditas disponibles para tus usuarios, pide más aquí — RedPontis las asigna desde su stock.</p>
        <div className="flex gap-2">
          <NumInput className={`${inputCls} font-mono`} min="1" placeholder="Cantidad" value={cantidad} onChange={v => setCantidad(v)} />
          <BtnPrimary disabled={!cantidad || +cantidad <= 0 || enviando} onClick={solicitar}>
            {enviando ? "Enviando…" : "Solicitar"}
          </BtnPrimary>
        </div>
        {reqs === null ? (
          <p className="text-sm text-on-surface-variant mt-4">Cargando…</p>
        ) : reqs.length === 0 ? (
          <p className="text-sm text-on-surface-variant mt-4">Sin solicitudes todavía.</p>
        ) : (
          <div className="mt-4 divide-y divide-outline-variant/60 border-t border-outline-variant">
            {reqs.map(r => (
              <div key={r.id} className="py-2.5 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{r.cantidad} banditas</p>
                  <p className="font-mono text-[10px] text-outline">{new Date(r.created_at).toLocaleDateString("es-PE")}</p>
                </div>
                <Pill color={r.estado === "entregado" ? "bg-ok" : "bg-tertiary"}>{r.estado.toUpperCase()}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Requerimiento de equipos (Panel Mundo) ─────────────────────────────
   Las banditas ya tenían su cola; los equipos no. El mundo pedía un POS por
   WhatsApp y RedPontis se enteraba cuando podía, así que ninguno de los dos
   sabía en qué iba el pedido. Es la misma necesidad que la de banditas —
   "necesito equipo, ¿en qué va lo que pedí?"— y sigue el mismo camino: el
   mundo pide, RedPontis lo ve junto al resto de la demanda y responde. */
// Un mundo pide unidades físicas que RedPontis despacha desde su stock —
// "Tap2Phone App" (pos_type "tap2phone") no es un equipo que se envíe, es
// habilitar el celular que el comercio ya tiene (canal de software, hoy sin
// integración real, ver CANALES_ADQUIRENCIA). Mezclarlo acá invitaba a
// "requerir" algo que RedPontis nunca podría despachar.
const HARDWARE_FISICO = HARDWARE_CATALOG.filter(h => h.pos_type !== "tap2phone");

function RequerirHardwareWidget({ worldId }) {
  const [reqs, setReqs] = useState(null);
  const [modeloId, setModeloId] = useState(HARDWARE_FISICO[0]?.id || "");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const load = () => fetchRequerimientosHardwareMundo(worldId).then(setReqs).catch(() => setReqs([]));
  useEffect(() => { load(); }, [worldId]);

  const modelo = HARDWARE_FISICO.find(h => h.id === modeloId);

  const pedir = async () => {
    const n = +cantidad;
    if (!n || n <= 0 || !modelo) return;
    setEnviando(true);
    try {
      await crearRequerimientoHardware(
        worldId, modelo.id, `${modelo.marca} ${modelo.modelo}`, n, motivo.trim() || null
      );
      setCantidad(""); setMotivo("");
      notify(`Requerimiento de ${n} × ${modelo.marca} ${modelo.modelo} enviado a RedPontis.`);
      load();
    } catch (e) {
      notify("No se pudo enviar el requerimiento: " + e.message, "error");
    } finally { setEnviando(false); }
  };

  const pendientes = (reqs || []).filter(r => r.estado === "pendiente");

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon n="point_of_sale" className="text-primary text-[20px]" /> Requerir equipos
        </h3>
        {pendientes.length > 0 && (
          <span className="w-6 h-6 rounded-full bg-tertiary text-white text-xs font-black flex items-center justify-center">
            {pendientes.length}
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs text-on-surface-variant mb-3">
          Pide terminales, tótems o lectores para tus comercios. RedPontis los asigna desde su stock
          y acá ves en qué va cada pedido.
        </p>

        <div className="space-y-2">
          <select className={inputCls} value={modeloId} onChange={e => setModeloId(e.target.value)}>
            {HARDWARE_FISICO.map(h => (
              <option key={h.id} value={h.id}>{h.marca} {h.modelo} · {h.tipo}</option>
            ))}
          </select>
          {modelo && <p className="text-[11px] text-on-surface-variant px-1">{modelo.desc}</p>}
          <div className="flex gap-2">
            <NumInput className={`${inputCls} font-mono`} min="1" placeholder="Cantidad"
              value={cantidad} onChange={v => setCantidad(v)} />
            <BtnPrimary disabled={!cantidad || +cantidad <= 0 || enviando} onClick={pedir}>
              {enviando ? "Enviando…" : "Requerir"}
            </BtnPrimary>
          </div>
          {/* El motivo no es burocracia: es lo que le permite a RedPontis
              priorizar entre "abro una sede nueva" y "se me malogró uno". */}
          <input className={inputCls} placeholder="Motivo (opcional) — ej. apertura de segunda cafetería"
            value={motivo} onChange={e => setMotivo(e.target.value)} />
        </div>

        {reqs === null ? (
          <p className="text-sm text-on-surface-variant mt-4">Cargando…</p>
        ) : reqs.length === 0 ? (
          <p className="text-sm text-on-surface-variant mt-4">Sin requerimientos todavía.</p>
        ) : (
          <div className="mt-4 divide-y divide-outline-variant/60 border-t border-outline-variant">
            {reqs.map(r => (
              <div key={r.id} className="py-2.5 flex justify-between items-start gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{r.cantidad} × {r.modelo_nombre || r.modelo_id}</p>
                  <p className="font-mono text-[10px] text-outline">
                    {new Date(r.created_at).toLocaleDateString("es-PE")}
                  </p>
                  {r.motivo && <p className="text-xs text-on-surface-variant mt-0.5">{r.motivo}</p>}
                  {r.nota_redpontis && (
                    <p className="text-xs text-primary mt-1">RedPontis: {r.nota_redpontis}</p>
                  )}
                </div>
                <Pill color={
                  r.estado === "entregado" ? "bg-ok"
                    : r.estado === "rechazado" ? "bg-error"
                      : r.estado === "aprobado" ? "bg-primary"
                        : "bg-tertiary"
                }>
                  {r.estado.toUpperCase()}
                </Pill>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hardware del mundo: lo que pidió y en qué va.
 *
 * Las banditas y los equipos se piden por caminos distintos pero se preguntan
 * juntos —"¿llegaron las pulseras?", "¿y el POS de la cafetería nueva?"— así
 * que viven en la misma pantalla. Antes las banditas estaban escondidas dentro
 * de Wallet y los equipos no existían como pedido: se resolvían por WhatsApp.
 */
function HardwareMundoTab({ m }) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Hardware de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1">
          Pulseras NFC y equipos. Acá pides lo que necesitas y ves en qué va cada pedido,
          sin tener que preguntar por fuera.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <SolicitarLoteNfcWidget worldId={m.id} />
        <RequerirHardwareWidget worldId={m.id} />
        <SolicitudesNfcWidget worldId={m.id} vertical={m.vertical} />
      </div>
    </>
  );
}

function WalletMundoTab({ m }) {
  const nom = nomenclaturaFamiliar(m.vertical);
  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Wallet de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Recargas, {nom.tituloSeccion.toLowerCase()} y solicitudes de pulsera NFC — datos reales.</p></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <RecargasMundoWidget worldId={m.id} />
        <FamiliaresMundoWidget worldId={m.id} vertical={m.vertical} />
        <SolicitudesNfcWidget worldId={m.id} vertical={m.vertical} />
        <SolicitarLoteNfcWidget worldId={m.id} />
      </div>
    </>
  );
}
function ConsumosMundoTab({ m }) {
  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Compras y Transacciones de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Ventas reales desde la superapp, en vivo.</p></div>
      <ConsumosLiveWidget worldId={m.id} />
    </>
  );
}
function InventarioMundoTab({ m }) {
  const [prods, setProds] = useState(null);
  useEffect(() => { fetchProductosMundo(m.id).then(setProds).catch(() => setProds([])); }, [m.id]);
  if (prods === null) return <p className="text-on-surface-variant py-8">Cargando…</p>;
  const stockTotal = prods.reduce((a, p) => a + (+p.stock || 0), 0);
  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Inventario de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Catálogo real cargado por tus comercios.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Productos en catálogo" value={prods.length} icon="inventory_2" />
        <KpiCard label="Stock total" value={stockTotal} icon="stacks" />
      </div>
      {prods.length === 0 ? <ModuloVacio icon="inventory_2" texto="Sin productos cargados todavía." /> : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          {prods.slice(0, 30).map(p => (
            <div key={p.id} className="px-5 py-2.5 flex justify-between items-center text-sm border-b border-outline-variant/40 last:border-0">
              <span className="font-medium">{p.name}</span>
              <span className="font-mono text-xs text-on-surface-variant">stock {p.stock ?? "—"} · S/ {(+p.price || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function ControlMundoTab({ m }) {
  const [deps, setDeps] = useState(null);
  const [alertas, setAlertas] = useState(null);
  useEffect(() => {
    fetchDependientesMundo(m.id).then(setDeps).catch(() => setDeps([]));
    fetchAlertasConsumoMundo(m.id).then(setAlertas).catch(() => setAlertas([]));
  }, [m.id]);
  if (deps === null || alertas === null) return <p className="text-on-surface-variant py-8">Cargando…</p>;
  const conRestricciones = deps.filter(d => d.alergias).length;
  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Restricciones de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Alergias registradas y alertas reales de bloqueo por límite/alergia.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Dependientes con alergias" value={conRestricciones} icon="shield_lock" />
        <KpiCard label="Alertas registradas" value={alertas.length} icon="warning" />
      </div>
      {alertas.length === 0 ? <ModuloVacio icon="shield_lock" texto="Sin alertas de bloqueo todavía." /> : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          {alertas.slice(0, 20).map(a => (
            <div key={a.id} className="px-5 py-3 border-b border-outline-variant/40 last:border-0">
              <p className="text-sm">{a.mensaje}</p>
              <p className="font-mono text-[10px] text-outline mt-1">{new Date(a.created_at).toLocaleString("es-PE")}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function MenuMundoTab({ m }) {
  const [reservas, setReservas] = useState(null);
  useEffect(() => { fetchMenuReservasMundo(m.id).then(setReservas).catch(() => setReservas([])); }, [m.id]);
  if (reservas === null) return <p className="text-on-surface-variant py-8">Cargando…</p>;
  const monto = reservas.reduce((a, r) => a + (+r.monto || 0), 0);
  const pendientes = reservas.filter(r => r.estado !== "ENTREGADA").length;
  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Menú de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Reservas reales confirmadas en el módulo Menú. La entrega la marca el concesionario desde su POS Operador.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Reservas confirmadas" value={reservas.length} icon="restaurant_menu" />
        <KpiCard label="Pendientes de entrega" value={pendientes} icon="pending_actions" />
        <KpiCard label="Monto total" value={`S/ ${monto.toFixed(2)}`} icon="payments" />
      </div>
      {reservas.length === 0 ? <ModuloVacio icon="restaurant_menu" texto="Sin reservas de Menú todavía." /> : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          {reservas.slice(0, 20).map(r => (
            <div key={r.id} className="px-5 py-2.5 flex justify-between items-center text-sm border-b border-outline-variant/40 last:border-0">
              <span className="flex items-center gap-1.5">
                {r.beneficiario_nombre} · {r.merchant_nombre}
                <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border font-bold ${r.estado === "ENTREGADA" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>{r.estado === "ENTREGADA" ? "entregado" : "pendiente"}</span>
              </span>
              <span className="font-mono text-xs text-on-surface-variant">{r.fecha} · S/ {(+r.monto || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function PerfilExtMundoTab({ m }) {
  const [perfiles, setPerfiles] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos | titular | dependiente
  const [filtroAlergias, setFiltroAlergias] = useState(false);
  useEffect(() => { fetchPerfilesExtendidosMundo(m.id).then(setPerfiles).catch(() => setPerfiles([])); }, [m.id]);
  if (perfiles === null) return <p className="text-on-surface-variant py-8">Cargando…</p>;

  const q = busqueda.trim().toLowerCase();
  const visibles = perfiles.filter(p => {
    if (q && !(p.nombre || "").toLowerCase().includes(q)) return false;
    if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
    if (filtroAlergias && !p.alergias) return false;
    return true;
  });
  const conAlergias = perfiles.filter(p => p.alergias).length;

  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Perfil extendido en {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Usuarios con datos médicos/emergencia reales completados.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Perfiles completados" value={perfiles.length} icon="badge" />
        <KpiCard label="Con alergias registradas" value={conAlergias} icon="warning" />
      </div>
      {perfiles.length === 0 ? (
        <ModuloVacio icon="badge" texto="Nadie ha completado su perfil extendido todavía." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input className={`${inputCls} max-w-xs`} placeholder="Buscar por nombre…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <select className={inputCls} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="titular">Solo titulares</option>
              <option value="dependiente">Solo dependientes</option>
            </select>
            <label className="flex items-center gap-2 px-3 rounded-lg border border-outline-variant text-sm cursor-pointer">
              <input type="checkbox" checked={filtroAlergias} onChange={e => setFiltroAlergias(e.target.checked)} />
              Con alergias
            </label>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Tipo de sangre</th>
                  <th className="px-4 py-3">Alergias</th>
                  <th className="px-4 py-3">Clínica</th>
                  <th className="px-4 py-3">Contacto de emergencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {visibles.map(p => (
                  <tr key={p.user_id} className="hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-medium">{p.nombre || <span className="font-mono text-xs text-outline">{p.user_id.slice(0, 10)}…</span>}</td>
                    <td className="px-4 py-3"><Pill color={p.tipo === "titular" ? "bg-primary-fixed" : "bg-tertiary-container"}>{p.tipo}</Pill></td>
                    <td className="px-4 py-3">{p.tipo_sangre || "—"}</td>
                    <td className="px-4 py-3">{p.alergias ? <span className="text-amber-700 font-medium">{p.alergias}</span> : "—"}</td>
                    <td className="px-4 py-3">{p.clinica || "—"}</td>
                    <td className="px-4 py-3">{p.contacto_emergencia_nombre ? `${p.contacto_emergencia_nombre}${p.contacto_emergencia_telefono ? " · " + p.contacto_emergencia_telefono : ""}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibles.length === 0 && <p className="px-4 py-6 text-sm text-on-surface-variant text-center">Ningún perfil coincide con el filtro.</p>}
          </div>
        </>
      )}
    </>
  );
}
function PromocionesMundoTab({ m }) {
  const [promos, setPromos] = useState(null);
  useEffect(() => { fetchPromocionesMundo(m.id).then(setPromos).catch(() => setPromos([])); }, [m.id]);
  if (promos === null) return <p className="text-on-surface-variant py-8">Cargando…</p>;
  const vigentes = promos.filter(p => p.estado === "VIGENTE").length;
  return (
    <>
      <div className="mb-6"><h2 className="text-2xl font-bold">Promociones de {m.nombre}</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Cupones reales publicados y su vigencia.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Promociones vigentes" value={vigentes} icon="campaign" />
        <KpiCard label="Total publicadas" value={promos.length} icon="local_offer" />
      </div>
      {promos.length === 0 && <ModuloVacio icon="campaign" texto="Sin promociones publicadas todavía." />}
    </>
  );
}

// Liquidación real del mundo — antes no existía ninguna vista para el
// sponsor; al entrar se calcula el corte vigente con transacciones reales
// (mismo motor que ya usaba el corte global de RedPontis, ver
// generarLiquidacionMundo en store.js) en vez de quedar "solo lectura" de
// algo que nunca se generó.
/**
 * Usuarios, vistos desde el mundo.
 *
 * A este lado le toca lo agregado: cuántos son, cuántos usan la billetera, qué
 * saldo circula. El colegio administra un programa, no un padrón — no necesita
 * el documento ni el correo de nadie para operar, así que acá no están. Ese
 * detalle vive en el panel de RedPontis, y aun ahí llega enmascarado.
 */
function UsuariosMundoTab({ m }) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    fetchUsuariosDeMundo(m.id)
      .then(r => { if (vivo) setFilas(r); })
      .catch(e => { if (vivo) { setError(e.message); setFilas([]); } });
    return () => { vivo = false; };
  }, [m.id]);

  if (filas === null) {
    return <p className="text-on-surface-variant text-sm">Cargando usuarios…</p>;
  }

  const titulares = filas.filter(f => f.tipo === "titular").length;
  const dependientes = filas.filter(f => f.tipo === "dependiente").length;
  const conSaldo = filas.filter(f => f.balance > 0).length;
  const saldo = filas.reduce((a, f) => a + f.balance, 0);
  const familias = filas.filter(f => f.dependientesACargo > 0).length;

  const kpis = [
    { i: "group", l: "Personas en el mundo", v: filas.length },
    { i: "person", l: "Titulares", v: titulares },
    { i: "family_restroom", l: "Dependientes", v: dependientes },
    { i: "diversity_3", l: "Familias con dependientes", v: familias },
    { i: "account_balance_wallet", l: "Con saldo disponible", v: conSaldo },
    { i: "payments", l: "Saldo en circulación", v: `S/ ${saldo.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usuarios</h2>
        <p className="text-on-surface-variant mt-1 max-w-2xl">
          El pulso de {m.nombre} en números. Los datos personales de cada persona no se
          muestran acá: el mundo administra un programa, no un padrón.
        </p>
      </div>

      {error && (
        <div className="text-sm text-error bg-error-container/40 border border-error/30 rounded-lg px-3 py-2">
          No se pudieron cargar los usuarios: {error}
        </div>
      )}

      {filas.length === 0 && !error ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl py-14 text-center">
          <Icon n="person_off" className="text-[32px] text-on-surface-variant/50" />
          <p className="font-semibold mt-3">Todavía no hay usuarios</p>
          <p className="text-on-surface-variant text-sm mt-1 max-w-md mx-auto">
            Aparecerán acá en cuanto se registren desde el superapp y se sumen a {m.nombre}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(k => (
            <div key={k.l} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
              <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                <Icon n={k.i} className="text-[18px]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{k.l}</span>
              </div>
              <div className="text-3xl font-bold tabular-nums">{k.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiquidacionMundoTab({ m }) {
  const [lotes, setLotes] = useState(null);
  const [generando, setGenerando] = useState(false);
  const cargar = () => fetchLiquidacionesMundoRemote(m.id).then(rows => setLotes((rows || []).sort((a, b) => b.fecha.localeCompare(a.fecha)))).catch(() => setLotes([]));
  useEffect(() => {
    let vivo = true;
    setGenerando(true);
    generarLiquidacionMundo(m.id).finally(() => { if (vivo) { setGenerando(false); cargar(); } });
    return () => { vivo = false; };
  }, [m.id]);
  const acuerdo = m.acuerdo || {};
  return (
    <>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Liquidación de {m.nombre}</h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            Modelo comercial: <b>{acuerdo.tipo || "—"}</b>{acuerdo.revShare != null && ` · ${acuerdo.revShare}%`} — definido por RedPontis en el Acuerdo Comercial.
          </p>
        </div>
        {generando && <span className="font-mono text-[10px] text-outline uppercase flex items-center gap-1.5"><Icon n="sync" className="text-[14px] animate-spin" /> Calculando corte vigente…</span>}
      </div>
      {lotes === null ? <p className="text-on-surface-variant py-8">Cargando…</p> : lotes.length === 0 ? (
        <ModuloVacio icon="account_balance" texto="Aún no hay transacciones que liquidar en este período." />
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-5 py-2.5 bg-surface-container-low border-b border-outline-variant font-mono text-[9px] uppercase text-outline">
            <span>Fecha</span><span>Volumen</span><span>Comisión</span><span>Neto</span><span>Estado</span>
          </div>
          {lotes.map(l => (
            <div key={l.id} className="px-5 py-3 text-sm border-b border-outline-variant/40 last:border-0">
              <div className="grid grid-cols-5 gap-2">
                <span className="font-mono text-xs">{l.fecha}</span>
                <span className="font-mono">S/ {l.volumen.toFixed(2)}</span>
                <span className="font-mono text-on-surface-variant">S/ {l.comision.toFixed(2)}</span>
                <span className="font-mono font-bold">S/ {l.neto.toFixed(2)}</span>
                <Pill color={l.estado === "PAGADO" || l.estado === "PROCESADA" ? "bg-ok" : l.estado === "RETENIDO" ? "bg-error" : "bg-amber-100 text-amber-700"}>{l.estado}</Pill>
              </div>
              {(l.voucher_url || l.observacion) && (
                <div className="mt-2 flex items-start gap-2 flex-wrap">
                  {l.voucher_url && (
                    <a href={l.voucher_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                      <Icon n="receipt" className="text-[13px]" /> Ver voucher
                    </a>
                  )}
                  {l.observacion && (
                    <p className="text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-1 rounded flex-1 min-w-[200px]">
                      <Icon n="info" className="text-[12px] align-middle mr-1" />{l.observacion}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Consolidado de Financiamientos (BackOffice Mundo → BNPL → "Consolidado").
// Spec doc: comercios con BNPL activo, financiamientos generados, cartera
// vigente y vencida, usuarios morosos del Mundo, indicadores de recuperación.
function ConsolidadoBNPLMundo({ m }) {
  const [contratos, setContratos] = useState(null);
  const [programas, setProgramas] = useState(null);
  const [filtroComercio, setFiltroComercio] = useState("todos");
  React.useEffect(() => {
    let vivo = true;
    fetchContratosBNPL(m.id).then(rows => sincronizarCicloBNPL(rows || [])).then(rows => { if (vivo) setContratos(rows); }).catch(() => { if (vivo) setContratos([]); });
    fetchProgramaBNPL(m.id).then(rows => { if (vivo) setProgramas(rows || []); }).catch(() => { if (vivo) setProgramas([]); });
    return () => { vivo = false; };
  }, [m.id]);
  if (!bnplLimitesDelMundo(m)) return null;
  if (contratos === null || programas === null) return <p className="text-sm text-on-surface-variant py-4">Cargando consolidado…</p>;

  const comerciosNombres = [...new Set(contratos.map(c => c.merchant_nombre).filter(Boolean))].sort();
  const filtrados = filtroComercio === "todos" ? contratos : contratos.filter(c => c.merchant_nombre === filtroComercio);

  const comerciosConBnpl = programas.filter(p => p.activo).length;
  const financiamientosGenerados = filtrados.length;
  let carteraVigente = 0, carteraVencida = 0, cuotasPagadas = 0, cuotasTotal = 0;
  const usuariosMorosos = new Set();
  for (const c of filtrados) {
    for (const q of c.cronograma || []) {
      cuotasTotal++;
      if (q.estado === "pagada") { cuotasPagadas++; continue; }
      if (q.estado === "vencida") { carteraVencida += +q.monto || 0; usuariosMorosos.add(c.user_id); }
      else if (q.estado === "pendiente") carteraVigente += +q.monto || 0;
    }
  }
  const indicadorRecuperacion = cuotasTotal > 0 ? Math.round((cuotasPagadas / cuotasTotal) * 100) : 0;

  const exportarCsv = () => {
    const header = "contrato_id,comercio,usuario,producto,monto,cuotas,estado,creado\n";
    const filas = filtrados.map(c => [c.id, c.merchant_nombre, c.user_id, c.producto, c.monto, c.cuotas, c.estado, c.created_at].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `consolidado-bnpl-${m.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="account_balance" className="text-primary text-[20px]" /> Consolidado de Financiamientos</h3>
        <div className="flex items-center gap-2">
          <select className={`${inputCls} !h-9 !w-44`} value={filtroComercio} onChange={e => setFiltroComercio(e.target.value)}>
            <option value="todos">Todos los comercios</option>
            {comerciosNombres.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <BtnOutline onClick={exportarCsv}><Icon n="download" className="text-[16px]" /> Exportar</BtnOutline>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ["Comercios con BNPL activo", comerciosConBnpl, "storefront"],
          ["Financiamientos generados", financiamientosGenerados, "receipt_long"],
          ["Cartera vigente", `S/ ${carteraVigente.toFixed(2)}`, "trending_up"],
          ["Cartera vencida", `S/ ${carteraVencida.toFixed(2)}`, "warning"],
          ["Usuarios morosos", usuariosMorosos.size, "person_off"],
        ].map(([l, v, ic]) => (
          <div key={l} className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
            <div className="flex justify-between items-start mb-1"><Icon n={ic} className="text-primary text-[16px]" /></div>
            <p className="text-xl font-black">{v}</p>
            <p className="font-mono text-[9px] uppercase text-outline mt-1">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-ok" style={{ width: `${indicadorRecuperacion}%` }} /></div>
        <span className="font-mono text-[11px] text-on-surface-variant whitespace-nowrap">{indicadorRecuperacion}% de recuperación ({cuotasPagadas}/{cuotasTotal} cuotas)</span>
      </div>
    </div>
  );
}

// Chart "Desempeño BNPL por comercio" (BackOffice del Mundo — doc §3.3).
// Además del volumen financiado, muestra morosidad (suspendido/en_mora) por
// comercio — el techo del mundo importa tanto por riesgo como por volumen.
function BNPLChartMundo({ m }) {
  const [contratos, setContratos] = useState(null);
  React.useEffect(() => {
    let vivo = true;
    fetchContratosBNPL(m.id)
      .then(rows => sincronizarCicloBNPL(rows || []))
      .then(rows => { if (vivo) setContratos(rows); })
      .catch(() => { if (vivo) setContratos([]); });
    return () => { vivo = false; };
  }, [m.id]);
  if (!bnplLimitesDelMundo(m)) return null;

  const porComercio = {};
  for (const c of contratos || []) {
    const k = c.merchant_nombre || "Comercio";
    porComercio[k] = porComercio[k] || { n: 0, monto: 0, enRiesgo: 0 };
    porComercio[k].n += 1; porComercio[k].monto += +c.monto;
    if (c.estado === "suspendido" || c.estado === "en_mora") porComercio[k].enRiesgo += 1;
  }
  const rows = Object.entries(porComercio).sort((a, b) => b[1].monto - a[1].monto);
  const maxMonto = Math.max(1, ...rows.map(([, v]) => v.monto));
  const total = rows.reduce((a, [, v]) => a + v.monto, 0);
  const totalRiesgo = rows.reduce((a, [, v]) => a + v.enRiesgo, 0);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="monitoring" className="text-primary text-[20px]" /> Desempeño BNPL por comercio</h3>
        <span className="font-mono text-[10px] text-outline uppercase flex items-center gap-2">
          S/ {total.toFixed(2)} financiado
          {totalRiesgo > 0 && <span className="text-error flex items-center gap-0.5"><Icon n="warning" className="text-[12px]" />{totalRiesgo} en riesgo</span>}
        </span>
      </div>
      {contratos === null ? (
        <p className="text-sm text-on-surface-variant">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4">Aún no hay ventas financiadas. Cuando los usuarios usen "Paga después" en la superapp, el desempeño por comercio aparecerá aquí.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(([nombre, v]) => (
            <div key={nombre}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium flex items-center gap-1.5">
                  {nombre}
                  {v.enRiesgo > 0 && <Pill color="bg-error">{v.enRiesgo} en mora</Pill>}
                </span>
                <span className="font-mono text-on-surface-variant">{v.n} contratos · S/ {v.monto.toFixed(2)}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((v.monto / maxMonto) * 100)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====== Frente: Dashboard del Mundo (entregable al sponsor) ====== */
export function MundoFront() {
  const { id } = useParams();
  const st = useStore();
  const m = (st.mundos||[]).find(x => x.id === id);
  if (!m) return <div className="min-h-screen flex items-center justify-center"><p>Mundo no encontrado.</p></div>;

  const adminSess = session();
  const sponsorOk = st.sponsorSession?.mundoId === id;
  const preview = !!adminSess && !sponsorOk;

  if (!adminSess && !sponsorOk) return <SponsorGate m={m} />;
  return <SponsorDashboard m={m} st={st} preview={preview} />;
}

function SponsorGate({ m }) {
  const [f, setF] = useState({ usuario: "", password: "" });
  const [err, setErr] = useState("");
  const [entrando, setEntrando] = useState(false);
  const entregado = m.entrega?.entregado;

  const submit = async (e) => {
    e.preventDefault();
    if (!entregado) { setErr("Este dashboard aún no ha sido entregado por RedPontis."); return; }
    if (entrando) return;
    setEntrando(true);
    try {
      if (await sponsorLogin(m.id, f.usuario, f.password)) notify(`Bienvenido al Dashboard del Mundo ${m.nombre}.`);
      else setErr("Credenciales inválidas. Solicítalas a RedPontis.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0035b9 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ background: m.color }}><Icon n="public" /></div>
          <div>
            <h1 className="text-lg font-black text-on-surface">Dashboard del Mundo</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">{m.nombre} · powered by RedPontis</p>
          </div>
        </div>
        {!entregado ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 text-sm text-on-surface-variant flex gap-2">
            <Icon n="lock_clock" className="text-primary" /> Este dashboard está en preparación. RedPontis aún no ejecuta la entrega ni emite credenciales.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Usuario sponsor"><input className={`${inputCls} font-mono text-xs`} value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} placeholder="sponsor@..." /></Field>
            <Field label="Password"><input className={inputCls} type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
            {err && <p className="text-xs text-error">{err}</p>}
            <BtnPrimary type="submit" disabled={entrando} loading={entrando} loadingLabel="Ingresando…" className="w-full"><Icon n="login" className="text-[18px]" /> Ingresar al mundo</BtnPrimary>
          </form>
        )}
        {err && !entregado && <p className="text-xs text-error mt-3">{err}</p>}
        <Link to="/login" className="block text-center text-xs text-primary hover:underline mt-5">¿Eres RedPontis? Ingresa al Admin</Link>
      </div>
    </div>
  );
}

// Campanita de notificaciones del sponsor — antes decorativa (sin onClick),
// ahora real: lee las alertas que RedPontis genera al rechazar una
// aprobación (con el motivo como referencia).
function NotificacionesMundoBell({ worldId }) {
  const [alertas, setAlertas] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const cargar = () => fetchAlertasMundo(worldId).then(setAlertas).catch(() => setAlertas([]));
  useEffect(() => { cargar(); }, [worldId]);
  useEffect(() => {
    if (!open) return;
    const onDocClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);
  const noLeidas = (alertas || []).filter(a => !a.leida);
  const abrir = () => {
    setOpen(o => !o);
    if (!open && noLeidas.length) Promise.all(noLeidas.map(a => marcarAlertaMundoLeida(a.id))).then(cargar);
  };
  return (
    <span className="relative inline-flex" ref={ref}>
      <button onClick={abrir} className="relative p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant">
        <Icon n="notifications" />
        {noLeidas.length > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-white text-[9px] font-black flex items-center justify-center">{noLeidas.length}</span>}
      </button>
      {open && (
        <div className="absolute z-40 top-11 right-0 w-80 max-h-96 overflow-y-auto bg-surface border border-outline-variant rounded-xl shadow-lg">
          <div className="px-4 py-3 border-b border-outline-variant font-semibold text-sm">Notificaciones</div>
          {alertas === null ? (
            <p className="p-4 text-sm text-on-surface-variant">Cargando…</p>
          ) : alertas.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Sin notificaciones todavía.</p>
          ) : alertas.map(a => (
            <div key={a.id} className="px-4 py-3 border-b border-outline-variant/40 last:border-0">
              <p className="text-sm font-medium">{a.titulo}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{a.mensaje}</p>
              <p className="font-mono text-[9px] text-outline mt-1">{new Date(a.created_at).toLocaleString("es-PE")}</p>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

function SponsorDashboard({ m, st, preview }) {
  const [tab, setTab] = useState("resumen");
  const comercios = (st.comercios||[]).filter(c => c.mundoId === m.id);
  const activos = (m.modulos||[]).filter(x => x.enabled);
  const eventos = (st.eventos||[]).filter(e => e.mundoId === m.id);
  const tickets = (st.tickets || []).filter(t => t.mundoId === m.id);
  const cfg = m.sponsorConfig || { bienvenida: "", bannerTitulo: "", bannerActivo: false, comerciosOcultos: [] };
  const posSolicitados = comercios.reduce((a, c) => a + (c.posSolicitados || 0), 0);

  const moduloActivo = id => (m.modulos || []).some(x => x.id === id && x.enabled);
  const comerciosActivo = moduloActivo("comercios");
  const bnplActivo = moduloActivo("bnpl");
  const eventosEmbebidoOn = moduloActivo("eventos") && modosDeMundo(m).includes("embebido");
  const accesosActivo = moduloActivo("accesos");
  // Cada módulo activo es su propia sección — nada se agrupa bajo un "Mis
  // módulos" genérico. comercios/bnpl/eventos/accesos ya tenían su propia
  // pestaña rica; el resto usa un tab de KPIs reales (sin edición de
  // tasas/comisiones, eso lo define únicamente RedPontis).
  const MODULOS_KPI = [
    { id: "wallet",     l: "Wallet",              i: "account_balance_wallet" },
    { id: "consumos",   l: "Compras y Transacciones", i: "point_of_sale" },
    { id: "inventario", l: "Inventario",           i: "inventory_2" },
    { id: "control",    l: "Restricciones",        i: "shield_lock" },
    { id: "menu",       l: "Menú",                 i: "restaurant_menu" },
    { id: "perfil_ext", l: "Perfil extendido",     i: "badge" },
    { id: "promociones",l: "Promociones",          i: "campaign" },
  ];
  const tabs = [
    { k: "resumen", l: "Resumen", i: "dashboard" },
    ...MODULOS_KPI.filter(mk => moduloActivo(mk.id)).map(mk => ({ k: mk.id, l: mk.l, i: mk.i })),
    ...(comerciosActivo ? [{ k: "comercios", l: "Comercios", i: "storefront" }] : []),
    ...(bnplActivo ? [{ k: "bnpl", l: "BNPL / SNPL", i: "calendar_clock" }] : []),
    ...(eventosEmbebidoOn ? [{ k: "eventos", l: "Eventos", i: "confirmation_number" }] : []),
    ...(accesosActivo ? [{ k: "accesos", l: "Control de Accesos", i: "door_open" }] : []),
    { k: "usuarios", l: "Usuarios", i: "group" },
    { k: "hardware", l: "Hardware", i: "devices" },
    { k: "liquidacion", l: "Liquidación", i: "account_balance" },
    { k: "soporte", l: "Soporte", i: "support_agent" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bright">
      {/* SideNav del sponsor — mismo diseño que admin */}
      <aside className="w-[280px] bg-surface-container-lowest border-r border-outline-variant flex flex-col h-full py-10 flex-shrink-0">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ background: m.color }}>{m.nombre[0]}</div>
            <div>
              <h1 className="font-black text-xl leading-tight text-primary tracking-tight">{m.nombre}</h1>
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Panel de Mundo</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">
          <p className="px-4 pb-1 pt-2 font-mono text-[9px] uppercase tracking-widest text-outline">Mi mundo</p>
          <ul className="space-y-0.5 mb-4">
            {tabs.map(t => (
              <li key={t.k}>
                <button onClick={() => setTab(t.k)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${tab === t.k ? "text-primary font-bold bg-primary-fixed border-r-4 border-primary" : "text-on-surface-variant hover:text-primary hover:bg-surface-container"}`}>
                  <Icon n={t.i} fill={tab === t.k} className="text-[20px]" />{t.l}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-outline-variant pt-4 mt-4">
            <p className="px-4 pb-2 font-mono text-[9px] uppercase tracking-widest text-outline">Gobernanza</p>
            <div className="mx-3 bg-surface-container-low border border-outline-variant rounded-lg p-3 text-[11px] text-on-surface-variant">
              Los módulos y reglas activos los define <b>RedPontis</b>. Este panel te permite gestionar los aspectos operativos de tu mundo.
            </div>
          </div>
        </nav>
        <div className="mt-auto px-4 pt-4 border-t border-outline-variant">
          {!preview && (
            <button onClick={() => { sponsorLogout(); notify("Sesión de sponsor cerrada.", "info"); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors">
              <Icon n="logout" className="text-[18px]" /> Cerrar sesión
            </button>
          )}
          <p className="text-center font-mono text-[9px] text-outline uppercase mt-3">© JOI 360 · RedPontis</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {preview && (
          <div className="bg-tertiary text-white px-8 py-2 flex items-center justify-between flex-shrink-0">
            <span className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-2"><Icon n="visibility" className="text-[16px]" /> Vista previa RedPontis — así verá el sponsor su dashboard</span>
            <span className="font-mono text-[10px] uppercase">{m.entrega?.entregado ? "ENTREGADO" : "PENDIENTE DE ENTREGA"}</span>
          </div>
        )}
        <header className="bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center px-8 h-16 z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-6">
            <span className="font-black text-xl text-on-surface">JOI 360 Ecosystem</span>
            <div className="hidden lg:flex items-center gap-5 ml-4">
              <span className="text-primary border-b-2 border-primary pb-0.5 text-sm font-medium">Mi Mundo</span>
              <span className="text-on-surface-variant text-sm hover:text-primary cursor-pointer">Soporte</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden md:block">
              <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
              <input className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Buscar..." />
            </div>
            <NotificacionesMundoBell worldId={m.id} />
            <div className="h-7 w-px bg-outline-variant mx-1"></div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{m.entidadLegal || m.nombre}</p>
              <p className="text-[10px] text-outline uppercase font-bold leading-none">Sponsor · {m.vertical}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: m.color }}>{m.nombre[0]}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {tab === "resumen" && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Resumen del Mundo</h2>
                <p className="text-on-surface-variant mt-1">KPIs en tiempo real de los módulos habilitados por RedPontis para tu comunidad.</p>
              </div>
              <div className="grid grid-cols-12 gap-6 mb-8">
                {[["Comercios cargados", comercios.length, "storefront", "por RedPontis"], ["POS solicitados", posSolicitados, "point_of_sale", "consolidado R0"], ["Módulos activos", activos.length, "grid_view", "gobernados por RedPontis"], ["Eventos publicados", eventos.filter(e => e.estado === "PUBLICADO").length, "confirmation_number", "visibles en app"]].map(([t, v, ic, sub]) => (
                  <div key={t} className="col-span-6 lg:col-span-3 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl hover:border-primary transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-mono text-[10px] text-outline uppercase">{t}</p>
                      <Icon n={ic} className="text-primary text-[20px]" />
                    </div>
                    <h3 className="text-4xl font-black">{v}</h3>
                    <p className="text-[10px] text-outline font-bold mt-2 uppercase">{sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <ConsumosLiveWidget worldId={m.id} titulo="Ventas del mundo (en vivo)" />
                <VentasPorComercioWidget worldId={m.id} comercios={comercios} />
              </div>

              <h3 className="font-semibold mb-4">Módulos activos</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activos.map(x => {
                  const c = moduleCat(x.id);
                  // Eventos en modo B2B queda activo pero se gestiona desde el
                  // Dashboard del Organizador (otro actor, otras credenciales),
                  // no desde este panel — la card no tiene tab propia. Antes el
                  // click no hacía nada y no lo explicaba (papercut real detectado
                  // en smoke-test).
                  const navegable = tabs.some(t => t.k === x.id);
                  return (
                    <button key={x.id} onClick={() => navegable && setTab(x.id)}
                      disabled={!navegable}
                      title={!navegable ? "Este módulo se gestiona fuera de este dashboard" : ""}
                      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-3 text-left transition-colors ${navegable ? "hover:border-primary/50" : "opacity-70 cursor-default"}`}>
                      <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
                        <Icon n={c?.icon || "extension"} className="text-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold block">{c?.name || x.id}</span>
                        {!navegable && (
                          <span className="text-[11px] text-on-surface-variant">
                            {x.id === "eventos" ? "Gestionado por el Organizador del evento" : "Sin panel propio en este dashboard"}
                          </span>
                        )}
                      </div>
                      {navegable && <Icon n="arrow_forward" className="text-outline text-[16px]" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab === "wallet" && <WalletMundoTab m={m} />}
          {tab === "consumos" && <ConsumosMundoTab m={m} />}
          {tab === "inventario" && <InventarioMundoTab m={m} />}
          {tab === "control" && <ControlMundoTab m={m} />}
          {tab === "menu" && <MenuMundoTab m={m} />}
          {tab === "perfil_ext" && <PerfilExtMundoTab m={m} />}
          {tab === "promociones" && <PromocionesMundoTab m={m} />}
          {tab === "comercios" && <SponsorComercios m={m} comercios={comercios} cfg={cfg} />}
          {tab === "bnpl" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">BNPL en {m.nombre}</h2>
                <p className="text-on-surface-variant mt-1 text-sm">Servicios financieros en marca blanca a través de tus comercios, con revenue share sobre el margen.</p>
              </div>
              <div className="space-y-6">
                <ConsolidadoBNPLMundo m={m} />
                <BNPLChartMundo m={m} />
                <CronogramaBNPLWidget worldId={m.id} titulo="Contratos BNPL del mundo" />
              </div>
            </>
          )}
          {tab === "eventos" && <SponsorEventosTab m={m} eventos={eventos} />}
          {tab === "accesos" && <SponsorAccesos m={m} />}
          {tab === "usuarios" && <UsuariosMundoTab m={m} />}
          {tab === "hardware" && <HardwareMundoTab m={m} />}
          {tab === "liquidacion" && <LiquidacionMundoTab m={m} />}
          {tab === "soporte" && <SponsorSoporte m={m} tickets={tickets} preview={preview} />}
        </div>

        <footer className="bg-surface-container border-t border-outline-variant flex justify-between items-center px-8 py-4 flex-shrink-0">
          <p className="font-mono text-[10px] text-on-surface-variant">© 2026 Joi-Ecosistema 360 · Dashboard entregado por RedPontis</p>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase">{m.codigo}</p>
        </footer>
      </main>
    </div>
  );
}

/* ── SponsorEventosTab — visible solo si RedPontis activó "Embebido" para
   este mundo (ver TabEventos en el admin). El sponsor crea directo, sin
   organizador externo; igual que cualquier evento, queda PENDIENTE_APROBACION
   hasta que RedPontis lo revise en su Cola de aprobación. */
// Aforo/asistentes en vivo (Gantt #82) — antes esta tab solo leía st.eventos
// local (vendidas/aforo podían quedar desactualizados); ahora trae tickets
// reales por evento, mismo mecanismo que ya usa el dashboard del Organizador.
function useAforoLive(eventos, refreshKey = 0) {
  const [map, setMap] = useState({});
  const idsKey = eventos.map(e => e.id).join(",");
  React.useEffect(() => {
    let vivo = true;
    Promise.all(eventos.map(async ev => {
      try { return [ev.id, (await fetchTicketsDeEvento(ev.id)) || []]; }
      catch { return [ev.id, null]; }
    })).then(pairs => { if (vivo) setMap(Object.fromEntries(pairs)); });
    return () => { vivo = false; };
  }, [idsKey, refreshKey]);
  return map;
}

// Sub-tabs de gestión por evento (Task #141) — antes el modo Embebido solo
// tenía crear evento + aforo; Comercios/Asistencia/Banditas/Liquidación por
// evento ya existían construidos para el organizador B2B
// (OrganizadorFront.jsx) pero nunca se conectaron acá. Los 4 componentes no
// dependen de sesión de organizador (solo de m/eventos/ticketsMap), así que
// se reusan tal cual — nada duplicado.
const EVENTOS_SUBTABS = [
  { k: "eventos", l: "Eventos", i: "confirmation_number" },
  { k: "comercios", l: "Comercios", i: "storefront" },
  { k: "asistencia", l: "Asistencia", i: "people" },
  { k: "banditas", l: "Banditas del evento", i: "sensors" },
  { k: "liquidacion", l: "Liquidación por evento", i: "account_balance" },
];

function SponsorEventosTab({ m, eventos }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [subtab, setSubtab] = useState("eventos");
  const [refreshKey, setRefreshKey] = useState(0);
  const ticketsMap = useAforoLive(eventos, refreshKey);

  return (
    <>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Eventos de {m.nombre}</h2>
          <p className="text-on-surface-variant mt-1">Publica directo desde tu panel. RedPontis revisa y aprueba antes de que se vea en el app.</p>
        </div>
        {subtab === "eventos" && <BtnPrimary onClick={() => { setEditing(null); setOpen(true); }}><Icon n="add" className="text-[18px]"/> Nuevo evento</BtnPrimary>}
      </div>

      <div className="flex gap-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-1 mb-6 w-fit">
        {EVENTOS_SUBTABS.map(t => (
          <button key={t.k} onClick={() => setSubtab(t.k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${subtab===t.k?"bg-surface-container text-on-surface shadow-sm":"text-on-surface-variant hover:bg-surface-container/40"}`}>
            <Icon n={t.i} className="text-[16px]"/>{t.l}
          </button>
        ))}
      </div>

      {subtab === "eventos" && (
        <div className="grid md:grid-cols-2 gap-5">
          {eventos.length === 0 && <p className="text-sm text-on-surface-variant">Sin eventos todavía.</p>}
          {eventos.map(ev => {
            const tk = ticketsMap[ev.id];
            const vendidas = Array.isArray(tk) ? tk.filter(t => t.estado !== "anulado").length : (ev.vendidas || 0);
            const dentro = Array.isArray(tk) ? tk.filter(t => t.estado === "checkin").length : null;
            const aforo = ev.aforo || 0;
            return (
            <div key={ev.id} onClick={() => { setEditing(ev); setOpen(true); }}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm cursor-pointer hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{ev.titulo||ev.nombre}</h4>
                  <p className="font-mono text-[10px] text-on-surface-variant uppercase">{ev.fecha} · {ev.lugar}</p>
                </div>
                <Pill color={ev.estado==="PUBLICADO"?"bg-ok":ev.estado==="PENDIENTE_APROBACION"?"bg-tertiary":ev.estado==="RECHAZADO"?"bg-error":"bg-outline"}>{ev.estado==="PENDIENTE_APROBACION"?"EN REVISIÓN":ev.estado}</Pill>
              </div>
              <div className="flex gap-4 text-xs mb-3">
                <span className="font-mono">{m.moneda} {ev.precio||0}</span>
                <span className="text-on-surface-variant">{vendidas}/{aforo} entradas</span>
                {dentro !== null && <span className="text-tertiary font-semibold">{dentro} dentro ahora</span>}
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{width:`${Math.min(100,(vendidas/(aforo||1))*100)}%`}}/>
              </div>
            </div>
            );
          })}
        </div>
      )}
      {subtab === "comercios" && <TabComerciosOrganizador m={m} eventos={eventos} />}
      {subtab === "asistencia" && <TabAsistenciaOrganizador m={m} eventos={eventos} ticketsMap={ticketsMap} onRefresh={() => setRefreshKey(k => k + 1)} />}
      {subtab === "banditas" && <TabBanditasEventoOrganizador m={m} eventos={eventos} />}
      {subtab === "liquidacion" && <TabLiqOrganizador m={m} eventos={eventos} ticketsMap={ticketsMap} />}

      <EventoDrawer
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        mundoId={m.id}
        editing={editing}
        modosPermitidos={["embebido"]}
      />
    </>
  );
}

const BANCOS_PE_MUNDO = ["BCP", "BBVA", "Interbank", "Scotiabank", "BanBif", "Banco de la Nación", "Otro"];

// Solicitar Alta de Comercio (Gantt #57 — spec: "El Mundo no puede habilitar
// comercios de forma autónoma; toda alta requiere confirmación desde Admin RP").
// Mismos campos que Alta de Comercio en Admin RP, pero escriben a
// merchant_requests en vez de merchants directamente — Admin RP la aprueba en
// Gobierno.jsx > Aprobaciones (misma cola cross-mundo que eventos B2B/B2C).
function SolicitarAltaComercio({ m }) {
  const [open, setOpen] = useState(false);
  const [solicitudes, setSolicitudes] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const blank = {
    nombre:"", rubro: rubrosDeVertical(m.vertical)[0]?.id || "otro", tarifa:1.5, fijoTx:0.10, pos:1,
    ruc:"", razonSocial:"", direccionFiscal:"",
    apoderadoNombre:"", apoderadoDocumento:"", apoderadoCorreo:"",
    contactoNombre:"", contactoDocumento:"", contactoCorreo:"",
    banco: BANCOS_PE_MUNDO[0], cuentaBancaria:"", cci:"",
  };
  const [f, setF] = useState(blank);

  const cargar = () => fetchSolicitudesComercioMundo(m.id).then(setSolicitudes).catch(() => setSolicitudes([]));
  React.useEffect(() => { cargar(); }, [m.id]);

  const enviar = async () => {
    setEnviando(true);
    try {
      await crearSolicitudComercio(m.id, m.nombre, f);
      notify(`Solicitud de alta para "${f.nombre}" enviada a RedPontis para aprobación.`);
      setF(blank); setOpen(false); cargar();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", "solicitar-alta-comercio", m.id);
      notify(`${err.mensaje} ${err.accion}`, "error");
    } finally { setEnviando(false); }
  };

  const pendientes = (solicitudes || []).filter(s => s.estado === "PENDIENTE");
  const resueltas = (solicitudes || []).filter(s => s.estado !== "PENDIENTE").slice(0, 5);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <BtnPrimary onClick={() => setOpen(true)}><Icon n="add_business" className="text-[18px]"/> Solicitar Alta de Comercio</BtnPrimary>
      </div>
      {(pendientes.length > 0 || resueltas.length > 0) && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low"><h4 className="font-semibold text-sm">Mis solicitudes</h4></div>
          {[...pendientes, ...resueltas].map(s => (
            <div key={s.id} className="px-5 py-3 flex items-center justify-between border-b border-outline-variant/40 last:border-0">
              <div>
                <p className="text-sm font-medium">{s.nombre}</p>
                <p className="text-xs text-on-surface-variant">{new Date(s.created_at).toLocaleDateString("es-PE")}</p>
              </div>
              <Pill color={s.estado === "PENDIENTE" ? "bg-amber-100 text-amber-700" : s.estado === "APROBADO" ? "bg-ok" : "bg-error-container text-error"}>{s.estado}</Pill>
            </div>
          ))}
        </div>
      )}
      <Drawer open={open} onClose={() => setOpen(false)} icon="add_business" title="Solicitar Alta de Comercio" subtitle={`Mundo: ${m.nombre} · Requiere aprobación de RedPontis`} width="w-[560px]"
        footer={<><BtnOutline onClick={() => setOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!f.nombre || !f.ruc || !f.razonSocial || enviando} onClick={enviar}>{enviando ? "Enviando…" : "Enviar solicitud"}</BtnPrimary></>}>
        <div className="space-y-5">
          <Field label="Nombre comercial"><input className={inputCls} value={f.nombre} onChange={e => setF({...f, nombre:e.target.value})} placeholder="Ej. Cafetería Norte"/></Field>
          <Field label="Rubro" hint={`Filtrado por vertical del mundo: ${m.vertical}`}>
            <select className={inputCls} value={f.rubro} onChange={e => setF({...f, rubro:e.target.value})}>
              {rubrosDeVertical(m.vertical).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tarifa MDR sugerida (%)"><NumInput className={inputCls} step="0.1" value={f.tarifa} onChange={v => setF({...f, tarifa:v})}/></Field>
            <Field label="POS solicitados"><NumInput className={inputCls} min="0" value={f.pos} onChange={v => setF({...f, pos:v})}/></Field>
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="balance" className="text-[16px] text-secondary"/> Datos legales <span className="text-error">*</span>
            </p>
            <div className="space-y-3">
              <Field label="Razón social"><input className={inputCls} value={f.razonSocial} onChange={e => setF({...f, razonSocial:e.target.value})} placeholder="Razón social completa"/></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RUC"><input className={`${inputCls} font-mono`} value={f.ruc} onChange={e => setF({...f, ruc:e.target.value})} placeholder="20XXXXXXXXX"/></Field>
                <Field label="Dirección fiscal"><input className={inputCls} value={f.direccionFiscal} onChange={e => setF({...f, direccionFiscal:e.target.value})} placeholder="Av. ..."/></Field>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="support_agent" className="text-[16px] text-secondary"/> Contacto comercial
            </p>
            <div className="space-y-3">
              <Field label="Nombre completo"><input className={inputCls} value={f.contactoNombre} onChange={e => setF({...f, contactoNombre:e.target.value})} placeholder="Nombre y apellidos"/></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Documento"><input className={`${inputCls} font-mono`} value={f.contactoDocumento} onChange={e => setF({...f, contactoDocumento:e.target.value})} placeholder="DNI / CE"/></Field>
                <Field label="Correo"><input className={inputCls} type="email" value={f.contactoCorreo} onChange={e => setF({...f, contactoCorreo:e.target.value})} placeholder="contacto@empresa.com"/></Field>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="account_balance" className="text-[16px] text-secondary"/> Datos bancarios
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Banco">
                <select className={inputCls} value={f.banco} onChange={e => setF({...f, banco:e.target.value})}>
                  {BANCOS_PE_MUNDO.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="N° de cuenta"><input className={`${inputCls} font-mono`} value={f.cuentaBancaria} onChange={e => setF({...f, cuentaBancaria:e.target.value})} placeholder="000-000000-0-00"/></Field>
              <Field label="CCI"><input className={`${inputCls} font-mono`} value={f.cci} onChange={e => setF({...f, cci:e.target.value})} placeholder="00200000000000000000"/></Field>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}

// Historial de Ventas del Mundo (Gantt #58) — tabla real por transacción con
// filtros de comercio/fecha/usuario/producto, no un ranking agregado.
function HistorialVentasMundo({ worldId, comercios }) {
  const [txs, setTxs] = useState(null);
  const [filtroComercio, setFiltroComercio] = useState("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => { fetchHistorialVentasMundo(worldId).then(setTxs).catch(() => setTxs([])); }, [worldId]);

  const nombreComercio = mid => (comercios || []).find(c => (c.supabaseId || c.id) === mid)?.nombre || (mid ? `Comercio ${mid.slice(0, 8)}…` : "Sin comercio");

  const filtrados = (txs || []).filter(t => {
    if (filtroComercio !== "todos" && t.merchant_id !== filtroComercio) return false;
    const fecha = t.created_at.slice(0, 10);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    if (busqueda && !(t.reference || "").toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const exportar = () => {
    const header = "fecha,comercio,usuario,producto_referencia,monto,estado\n";
    const filas = filtrados.map(t => [t.created_at, nombreComercio(t.merchant_id), t.wallets?.user_id || "", t.reference, t.amount, t.status].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + filas], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `historial-ventas-${worldId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Icon n="receipt_long" className="text-secondary text-[20px]" /> Historial de Ventas</h3>
        <BtnOutline onClick={exportar} className="!py-1.5 !px-3 !text-xs" disabled={!filtrados.length}><Icon n="download" className="text-[14px]" /> Exportar</BtnOutline>
      </div>
      <div className="px-5 py-3 border-b border-outline-variant flex flex-wrap gap-2 bg-surface-container-low">
        <select className={`${inputCls} !h-8 !w-44 !text-xs`} value={filtroComercio} onChange={e => setFiltroComercio(e.target.value)}>
          <option value="todos">Todos los comercios</option>
          {(comercios || []).map(c => <option key={c.id} value={c.supabaseId || c.id}>{c.nombre}</option>)}
        </select>
        <input type="date" className={`${inputCls} !h-8 !w-36 !text-xs`} value={desde} onChange={e => setDesde(e.target.value)} title="Desde"/>
        <input type="date" className={`${inputCls} !h-8 !w-36 !text-xs`} value={hasta} onChange={e => setHasta(e.target.value)} title="Hasta"/>
        <input className={`${inputCls} !h-8 !w-48 !text-xs`} placeholder="Buscar por producto/referencia…" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
        <span className="ml-auto font-mono text-[10px] text-outline self-center">{txs === null ? "cargando…" : `${filtrados.length} de ${txs.length}`}</span>
      </div>
      {txs === null ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="px-5 py-4 text-sm text-on-surface-variant">Sin ventas para estos filtros.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-container-low">
              <tr className="font-mono text-[9px] uppercase text-outline">
                <th className="px-5 py-2 font-medium">Fecha</th>
                <th className="px-5 py-2 font-medium">Comercio</th>
                <th className="px-5 py-2 font-medium">Usuario</th>
                <th className="px-5 py-2 font-medium">Producto / referencia</th>
                <th className="px-5 py-2 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {filtrados.map(t => (
                <tr key={t.id} className="hover:bg-surface-container-low">
                  <td className="px-5 py-2 font-mono text-outline">{new Date(t.created_at).toLocaleString("es-PE")}</td>
                  <td className="px-5 py-2">{nombreComercio(t.merchant_id)}</td>
                  <td className="px-5 py-2 font-mono text-outline">{(t.wallets?.user_id || "—").slice(0, 8)}…</td>
                  <td className="px-5 py-2 text-on-surface-variant truncate max-w-[220px]">{t.reference}</td>
                  <td className="px-5 py-2 text-right font-mono font-bold">S/ {Number(t.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SponsorComercios({ m, comercios, cfg }) {
  const toggleVisible = async (c) => {
    const merchantId = c.supabaseId || c.id;
    const nuevaVisibilidad = c.visibleEnApp === false; // toggle: pasa a visible si estaba oculto
    try {
      await actualizarVisibilidadMerchantRemote(merchantId, nuevaVisibilidad);
      update(s => {
        const co = (s.comercios || []).find(x => x.id === c.id);
        if (co) co.visibleEnApp = nuevaVisibilidad;
      });
      notify(`"${c.nombre}" ahora ${nuevaVisibilidad ? "visible" : "oculto"} en el app user.`, "info");
    } catch (e) {
      notify(`No se pudo actualizar la visibilidad: ${e.message}`, "error");
    }
  };
  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Comercios del mundo</h2>
        <p className="text-on-surface-variant mt-1">La carga y habilitación la realiza RedPontis. Tú decides cuáles se muestran en el app de tu comunidad.</p>
      </div>
      <SolicitarAltaComercio m={m} />
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-6 py-3 font-medium">Comercio</th><th className="px-6 py-3 font-medium">Rubro</th><th className="px-6 py-3 font-medium">POS</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3 font-medium text-right">Visible en app</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {comercios.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-on-surface-variant">RedPontis aún no carga comercios en este mundo.</td></tr>}
            {comercios.map(c => {
              const visible = c.visibleEnApp !== false;
              return (
                <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">{c.nombre.slice(0, 2).toUpperCase()}</div>
                      <p className="font-bold">{c.nombre}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{rubroNombre(c.rubro)}</td>
                  <td className="px-6 py-4">{c.pos} activos</td>
                  <td className="px-6 py-4"><Pill color="bg-ok">{c.estado}</Pill></td>
                  <td className="px-6 py-4"><div className="flex justify-end"><Toggle checked={visible} onChange={() => toggleVisible(c)} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><HistorialVentasMundo worldId={m.id} comercios={comercios} /></div>
    </>
  );
}

/* ── Control de Accesos (movido 29-jul del panel de RedPontis a este panel del
   propio Mundo, pedido explícito de la usuaria: a RedPontis solo le importa
   activar el módulo, es el admin del Mundo — ej. Colegio Raimondi — quien
   monitorea y cotejaentrada/salida de sus dependientes). Mismo componente que
   antes vivía en MundoDetail.jsx (Admin RP), solo trasladado. ── */
function SponsorAccesos({ m }) {
  const zonas = (m.modulos||[]).find(x => x.id === "accesos")?.config?.zonas?.split(",").map(z=>z.trim()).filter(Boolean) || ["Principal"];
  const [log, setLog] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [zona, setZona] = useState(zonas[0]);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [turnos, setTurnos] = useState(null);

  const cargar = () => fetchAccesosMundo(m.id).then(r => setLog(r || [])).catch(() => setLog([]));
  useEffect(() => { cargar(); }, [m.id]);
  useEffect(() => { fetchTurnosMundo(m.id).then(r => setTurnos(r || [])).catch(() => setTurnos([])); }, [m.id]);

  const registrar = async (e) => {
    e.preventDefault();
    const code = codigo.trim();
    if (!code) return;
    setBusy(true); setResultado(null);
    try {
      const w = await buscarWalletPorCodigo(code, m.id);
      if (!w) {
        const err = await errorControlado("wallet_no_encontrada");
        logErrorControlado("wallet_no_encontrada", `accesos:${m.id}`, m.id);
        setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
        return;
      }
      await registrarAccesoRemote(m.id, w.user_id, tipo, zona);
      setResultado({ ok: true, mensaje: `${tipo === "entrada" ? "Entrada" : "Salida"} registrada en ${zona}.` });
      setCodigo("");
      cargar();
    } catch (e2) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `accesos:${m.id}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Control de Accesos</h2>
        <p className="text-on-surface-variant mt-1 text-sm">Registra entradas y salidas por código del usuario o del dependiente (bandita NFC). Sin hardware de lectura real — el código se escanea o tipea igual que en Asistencia de eventos. Los padres ven este movimiento en tiempo real en su app.</p>
      </div>

      <form onSubmit={registrar} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block font-mono text-[10px] uppercase text-outline mb-1.5">Código del usuario</label>
          <input className={`${inputCls} font-mono`} placeholder="Código JOI (QR o pulsera)" value={codigo} onChange={e => setCodigo(e.target.value)} />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase text-outline mb-1.5">Tipo</label>
          <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase text-outline mb-1.5">Zona</label>
          <select className={inputCls} value={zona} onChange={e => setZona(e.target.value)}>
            {zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <BtnPrimary type="submit" disabled={!codigo.trim() || busy}><Icon n="door_open" className="text-[18px]" /> {busy ? "Registrando…" : "Registrar"}</BtnPrimary>
      </form>
      {resultado && (
        <p className={`text-sm mb-4 flex items-center gap-1.5 ${resultado.ok ? "text-ok" : "text-error"}`}>
          <Icon n={resultado.ok ? "check_circle" : "error"} className="text-[16px]" />{resultado.mensaje}
        </p>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-semibold">Turnos de portería</h3>
          <span className="font-mono text-[10px] text-outline uppercase">{turnos?.length ?? "…"} registrados</span>
        </div>
        {turnos === null ? (
          <p className="px-5 py-6 text-sm text-on-surface-variant">Cargando…</p>
        ) : turnos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-on-surface-variant">Ningún operador ha iniciado turno todavía.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
                <th className="px-5 py-3">Operador</th>
                <th className="px-5 py-3">Zona</th>
                <th className="px-5 py-3">Inicio</th>
                <th className="px-5 py-3">Cierre</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {turnos.map(t => (
                <tr key={t.id} className="hover:bg-surface-container-low">
                  <td className="px-5 py-3">{t.operador_nombre || "—"}</td>
                  <td className="px-5 py-3 text-xs">{t.zona || "—"}</td>
                  <td className="px-5 py-3 text-xs text-on-surface-variant">{new Date(t.inicio_at).toLocaleString("es-PE")}</td>
                  <td className="px-5 py-3 text-xs text-on-surface-variant">{t.fin_at ? new Date(t.fin_at).toLocaleString("es-PE") : "—"}</td>
                  <td className="px-5 py-3">{t.fin_at ? <Pill color="bg-outline">Cerrado</Pill> : <Pill color="bg-ok">En curso</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-semibold">Registros recientes</h3>
          <span className="font-mono text-[10px] text-outline uppercase">{log?.length ?? "…"} registros</span>
        </div>
        {log === null ? (
          <p className="px-5 py-6 text-sm text-on-surface-variant">Cargando…</p>
        ) : log.length === 0 ? (
          <p className="px-5 py-6 text-sm text-on-surface-variant">Sin registros todavía.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Zona</th>
                <th className="px-5 py-3">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {log.map(l => (
                <tr key={l.id} className="hover:bg-surface-container-low">
                  <td className="px-5 py-3 font-mono text-xs">{l.user_id.slice(0, 12)}</td>
                  <td className="px-5 py-3"><Pill color={l.tipo === "entrada" ? "bg-ok" : "bg-outline"}>{l.tipo.toUpperCase()}</Pill></td>
                  <td className="px-5 py-3 text-xs">{l.zona || "—"}</td>
                  <td className="px-5 py-3 text-xs text-on-surface-variant">{new Date(l.created_at).toLocaleString("es-PE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function SponsorSoporte({ m, tickets, preview }) {
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const blank = { tipo: "Operativo", asunto: "", detalle: "" };
  const [f, setF] = useState(blank);
  const save = async () => {
    setEnviando(true);
    const localId = uid("tk");
    update(s => { if(!s.tickets)s.tickets=[]; s.tickets.push({ id: localId, mundoId: m.id, origen: "sponsor", ...f, estado: "ABIERTO", createdAt: Date.now() }); });
    try {
      const saved = await crearTicketSoporteRemote({ world_id: m.id, origen: "sponsor", tipo: f.tipo, asunto: f.asunto, detalle: f.detalle || null, estado: "ABIERTO" });
      if (saved) update(s => { const t = (s.tickets||[]).find(x => x.id === localId); if (t) t.id = saved.id; });
      notify("Solicitud enviada a RedPontis. La verás actualizada aquí cuando sea atendida.");
      setF(blank); setOpen(false);
    } catch (e) {
      notify(`No se pudo enviar la solicitud: ${e.message}`, "error");
    } finally { setEnviando(false); }
  };
  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Soporte</h2>
          <p className="text-on-surface-variant mt-1">Solicitudes hacia RedPontis: POS adicionales, cambios de módulos, incidencias. Caen directo al Admin central.</p>
        </div>
        <BtnPrimary onClick={() => setOpen(true)}><Icon n="add" className="text-[18px]" /> Nueva solicitud</BtnPrimary>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm divide-y divide-outline-variant/60">
        {tickets.length === 0 && <p className="p-8 text-center text-sm text-on-surface-variant">Sin solicitudes registradas.</p>}
        {tickets.map(t => (
          <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary"><Icon n="support_agent" className="text-[20px]" /></div>
              <div>
                <p className="font-semibold text-sm">{t.asunto}</p>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase">{t.tipo} · {new Date(t.createdAt).toLocaleDateString("es-PE")}</p>
                {t.detalle && <p className="text-xs text-on-surface-variant mt-0.5">{t.detalle}</p>}
              </div>
            </div>
            <Pill color={t.estado === "ABIERTO" ? "bg-tertiary-container" : "bg-ok"}>{t.estado}</Pill>
          </div>
        ))}
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} icon="support_agent" title="Nueva solicitud a RedPontis" subtitle={m.nombre}
        footer={<><BtnOutline onClick={() => setOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!f.asunto || enviando} onClick={save}>{enviando ? "Enviando…" : "Enviar solicitud"}</BtnPrimary></>}>
        <div className="space-y-5">
          <Field label="Tipo">
            <select className={inputCls} value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>
              {["Operativo", "POS / Hardware", "Módulos", "Comercios", "Incidencia", "Otro"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Asunto"><input className={inputCls} value={f.asunto} onChange={e => setF({ ...f, asunto: e.target.value })} placeholder="Ej. Solicitud de POS adicional" /></Field>
          <Field label="Detalle"><textarea className={`${inputCls} h-24 py-2`} value={f.detalle} onChange={e => setF({ ...f, detalle: e.target.value })} /></Field>
        </div>
      </Drawer>
    </>
  );
}

/* ====== Frente: Dashboard del Merchant ====== */
export function ComercioFront() {
  const { id } = useParams();
  const st = useStore();
  const comercio = (st.comercios||[]).find(x => x.id === id);
  if (!comercio) return <div className="min-h-screen flex items-center justify-center"><p className="text-on-surface-variant">Comercio no encontrado.</p></div>;
  const m = (st.mundos||[]).find(x => x.id === comercio.mundoId);
  const sess = st.merchantSession?.comercioId === id;
  if (!sess) return <MerchantGate comercio={comercio} m={m} />;
  return <MerchantDashboard comercio={comercio} m={m} st={st} />;
}

export function MerchantGate({ comercio, m }) {
  const [f, setF] = useState({ usuario: "", password: "" });
  const [pin, setPin] = useState("");
  // "Tiene código" es la señal de que este comercio pasó por entrega (Task
  // #164) — comercio.posPin ya NO viaja en texto plano desde Supabase (se
  // hashea server-side), así que no sirve como señal en un dispositivo
  // distinto al que hizo la entrega. El código sí es público y estable.
  const [modo, setModo] = useState(comercio.codigo ? "pin" : "credenciales");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const handleLogin = (e) => {
    e.preventDefault();
    if (!comercio.credenciales) { setErr("Sin credenciales asignadas. Contacta a RedPontis."); return; }
    const ok = merchantLogin(comercio.id, f.usuario, f.password);
    if (!ok) setErr("Credenciales inválidas. Solicítalas al administrador del mundo.");
  };
  const handlePin = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const ok = await merchantPinLogin(comercio.id, pin);
      if (!ok) setErr("PIN incorrecto.");
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#006688 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-secondary text-white flex items-center justify-center font-bold text-xl">{comercio.nombre?.[0]}</div>
          <div>
            <h1 className="text-lg font-black">{comercio.nombre}</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase">{rubroNombre(comercio.rubro)} · {m?.nombre || "JOI 360"}</p>
          </div>
        </div>
        {comercio.codigo && (
          <div className="flex gap-1.5 mb-4">
            <button onClick={() => { setModo("pin"); setErr(""); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${modo === "pin" ? "bg-secondary text-white border-secondary" : "border-outline-variant text-on-surface-variant"}`}>PIN rápido</button>
            <button onClick={() => { setModo("credenciales"); setErr(""); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${modo === "credenciales" ? "bg-secondary text-white border-secondary" : "border-outline-variant text-on-surface-variant"}`}>Usuario y contraseña</button>
          </div>
        )}
        {modo === "pin" && comercio.codigo ? (
          <form onSubmit={handlePin} className="space-y-4">
            <Field label="PIN del POS (4 dígitos)">
              <input type="password" className={`${inputCls} font-mono text-center text-2xl tracking-[0.5em]`} inputMode="numeric" maxLength={4}
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} autoFocus />
            </Field>
            {err && <p className="text-xs text-error">{err}</p>}
            <BtnPrimary type="submit" disabled={pin.length !== 4 || busy} className="w-full !bg-secondary hover:!bg-secondary/90"><Icon n="dialpad" className="text-[18px]" /> {busy ? "Verificando…" : "Entrar al POS"}</BtnPrimary>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Usuario"><input className={`${inputCls} font-mono text-xs`} value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} placeholder="...@comercios.joi360.pe" /></Field>
            <Field label="Contraseña"><input className={inputCls} type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
            {err && <p className="text-xs text-error">{err}</p>}
            <BtnPrimary type="submit" className="w-full !bg-secondary hover:!bg-secondary/90"><Icon n="login" className="text-[18px]" /> Ingresar al panel</BtnPrimary>
          </form>
        )}
        <p className="text-center text-xs text-on-surface-variant mt-4">Panel exclusivo para el operador del comercio. ¿Sin acceso? Contacta al administrador del mundo <b>{m?.nombre}</b>.</p>
      </div>
    </div>
  );
}

/* ── Perfil del comercio — la foto que se ve en el carrusel del super app ── */
function PerfilComercioPanel({ comercio, m }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const [subiendo, setSubiendo] = useState(false);

  const subirFoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("La foto debe ser un archivo de imagen (PNG/JPG).", "error"); return; }
    setSubiendo(true);
    try {
      const path = `comercios/${merchantId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      await actualizarFotoMerchantRemote(merchantId, url);
      update(s => { const c = (s.comercios || []).find(x => x.id === comercio.id); if (c) c.fotoUrl = url; });
      notify("Foto de perfil actualizada — ya se verá en el carrusel del app.");
    } catch (e) {
      notify("No se pudo subir la foto: " + e.message, "error");
    } finally { setSubiendo(false); }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-2">Mi perfil</h2>
      <p className="text-on-surface-variant mb-6">La foto que elijas aquí es la que distingue a tu comercio en el carrusel de la Super App.</p>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 max-w-lg">
        <div className="flex items-center gap-5">
          <label className="w-24 h-24 rounded-2xl border border-dashed border-outline-variant flex items-center justify-center text-outline cursor-pointer overflow-hidden hover:border-primary/50 flex-shrink-0">
            {comercio.fotoUrl ? (
              <img src={comercio.fotoUrl} alt="" className="w-full h-full object-cover" />
            ) : subiendo ? (
              <Icon n="hourglass_empty" className="text-[28px]" />
            ) : (
              <div className="text-center">
                <Icon n="add_a_photo" className="text-[24px] block mx-auto" />
                <span className="text-[9px] font-mono uppercase">Subir foto</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" disabled={subiendo} onChange={e => subirFoto(e.target.files?.[0])} />
          </label>
          <div className="flex-1">
            <p className="font-semibold">{comercio.nombre}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{rubroNombre(comercio.rubro)} · {m?.nombre}</p>
            <label className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary cursor-pointer hover:underline">
              <Icon n="upload_file" className="text-[14px]" /> {comercio.fotoUrl ? (subiendo ? "Subiendo…" : "Cambiar foto") : (subiendo ? "Subiendo…" : "Elegir foto")}
              <input type="file" accept="image/*" className="hidden" disabled={subiendo} onChange={e => subirFoto(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

function MerchantDashboard({ comercio, m, st }) {
  const [tab, setTab] = useState("hoy");
  const merchantId = comercio.supabaseId || comercio.id;
  const [txsHoy, setTxsHoy] = useState(null);
  useEffect(() => { fetchVentasComercioHoy(merchantId).then(setTxsHoy).catch(() => setTxsHoy([])); }, [merchantId]);
  const aprobadas = (txsHoy || []).filter(t => t.status === "completada");
  const totalHoy = aprobadas.reduce((a, t) => a + (+t.amount || 0), 0);
  const mdrEfectivo = comercio.mdrOverride ? comercio.tarifa : ((st.adqChannels || [])[0]?.mdr || 1.5);
  const comisionHoy = totalHoy * (mdrEfectivo / 100);
  const netoHoy = totalHoy - comisionHoy;
  const tickets = (st.tickets || []).filter(t => t.mundoId === m?.id && t.origen === "merchant" && t.comercioId === comercio.id);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [tf, setTf] = useState({ asunto: "", detalle: "", tipo: "Operativo" });
  const modulosActivos = m?.modulos?.filter(x => x.enabled).map(x => x.id) || [];

  // Programa BNPL / Menú: la pestaña aparece solo si el Mundo habilitó la
  // capacidad — RedPontis activa "Menú" al Mundo, y cada comercio decide si
  // publica su carta o no (no es obligatorio solo por estar activo).
  const bnplHabilitado = (m?.modulos || []).some(x => x.id === "bnpl" && x.enabled);
  const menuHabilitado = (m?.modulos || []).some(x => x.id === "menu" && x.enabled);
  const tabs = [
    { k: "hoy", l: "Resumen del día", i: "today" },
    { k: "catalogo", l: "Mi catálogo", i: "restaurant_menu" },
    ...(menuHabilitado ? [{ k: "menu", l: "Catálogo de Menú", i: "calendar_month" }] : []),
    { k: "cobrar", l: "Cobrar", i: "qr_code_scanner" },
    ...(bnplHabilitado ? [{ k: "bnpl", l: "BNPL · Paga después", i: "calendar_clock" }] : []),
    { k: "liquidacion", l: "Liquidación", i: "account_balance" },
    { k: "perfil", l: "Mi perfil", i: "storefront" },
    { k: "soporte", l: "Soporte", i: "support_agent" },
  ];

  const sendTicket = async () => {
    const localId = uid("tk");
    update(s => { if(!s.tickets)s.tickets=[]; s.tickets.push({ id: localId, mundoId: m?.id, comercioId: comercio.id, origen: "merchant", tipo: tf.tipo, asunto: tf.asunto, detalle: tf.detalle, prioridad: "Media", estado: "ABIERTO", asignado: null, createdAt: Date.now() }); });
    try {
      const saved = await crearTicketSoporteRemote({ world_id: m?.id || null, comercio_id: comercio.id, origen: "merchant", tipo: tf.tipo, asunto: tf.asunto, detalle: tf.detalle || null, prioridad: "Media", estado: "ABIERTO" });
      if (saved) update(s => { const t = (s.tickets||[]).find(x => x.id === localId); if (t) t.id = saved.id; });
      notify("Solicitud enviada. El administrador del mundo y RedPontis la verán en el Centro de Soporte.");
      setTf({ asunto: "", detalle: "", tipo: "Operativo" }); setTicketOpen(false);
    } catch (e) {
      notify(`No se pudo enviar la solicitud: ${e.message}`, "error");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bright">
      <aside className="w-[260px] bg-surface-container-lowest border-r border-outline-variant flex flex-col py-8 flex-shrink-0">
        <div className="px-6 mb-8">
          <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center font-bold mb-3 overflow-hidden">
            {comercio.fotoUrl ? <img src={comercio.fotoUrl} alt="" className="w-full h-full object-cover" /> : comercio.nombre?.[0]}
          </div>
          <h1 className="text-lg font-black leading-tight text-secondary">{comercio.nombre}</h1>
          <p className="font-mono text-[10px] text-on-surface-variant uppercase mt-1">{rubroNombre(comercio.rubro)} · {m?.nombre}</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${tab === t.k ? "text-secondary font-bold bg-secondary-fixed border-r-4 border-secondary" : "text-on-surface-variant hover:bg-surface-container-low"}`}>
              <Icon n={t.i} className="text-[20px]" fill={tab === t.k} />{t.l}
            </button>
          ))}
        </nav>
        <div className="px-6 pt-4 border-t border-outline-variant">
          {comercio.canalesHabilitados?.length > 0 && (
            <div className="bg-secondary-fixed border border-secondary/20 rounded-lg p-3 text-[11px] text-on-surface-variant mb-3">
              <p className="font-semibold text-secondary mb-1">Canales de cobro</p>
              {comercio.canalesHabilitados.map(ch => <p key={ch} className="flex items-center gap-1"><Icon n="check_circle" className="text-[12px] text-secondary" />{ch}</p>)}
            </div>
          )}
          <Link to={`/operador/${comercio.id}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-sm text-secondary hover:underline mb-3">
            <Icon n="smartphone" className="text-[18px]" /> Abrir App Operador (móvil)
          </Link>
          <button onClick={() => { merchantLogout(); notify("Sesión cerrada.", "info"); }} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-error">
            <Icon n="logout" className="text-[18px]" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center px-8 h-14 flex-shrink-0 shadow-sm">
          <span className="font-black text-xl text-on-surface">JOI 360 · Comercios</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-ok/10 border border-ok/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-ok"></div>
              <span className="font-mono text-[10px] uppercase text-ok font-bold">Activo</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{comercio.nombre}</p>
              <p className="text-[10px] text-outline uppercase">Merchant · {rubroNombre(comercio.rubro)}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {tab === "hoy" && (
            <>
              <h2 className="text-2xl font-bold mb-6">Resumen del día</h2>
              <div className="grid grid-cols-4 gap-5 mb-8">
                {[
                  { l: "Transacciones aprobadas", v: aprobadas.length, color: "text-ok" },
                  { l: "Volumen bruto", v: `S/ ${Number(totalHoy||0).toFixed(2)}`, color: "text-secondary" },
                  { l: `Tasa de descuento (${mdrEfectivo}%)`, v: `S/ ${Number(comisionHoy||0).toFixed(2)}`, color: "text-outline" },
                  { l: "Neto estimado del día", v: `S/ ${Number(netoHoy||0).toFixed(2)}`, color: "text-primary" },
                ].map(({ l, v, color }) => (
                  <div key={l} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-secondary transition-colors">
                    <p className="font-mono text-[9px] uppercase text-outline mb-2">{l}</p>
                    <p className={`text-xl font-black ${color}`}>{v}</p>
                  </div>
                ))}
              </div>
              <VentasComercioWidget merchantId={merchantId} />
            </>
          )}
          {tab === "catalogo" && <MiCatalogoPanel comercio={comercio} />}
          {tab === "menu" && <MenuCatalogoPanel comercio={comercio} />}
          {tab === "cobrar" && (<><CanjearCuponWidget m={m} /><CobrarPanel comercio={comercio} m={m} /></>)}
          {tab === "bnpl" && <ProgramaBNPLPanel comercio={comercio} m={m} />}
          {tab === "perfil" && <PerfilComercioPanel comercio={comercio} m={m} />}
          {tab === "liquidacion" && (
            <>
              <h2 className="text-2xl font-bold mb-2">Mi liquidación</h2>
              <p className="text-on-surface-variant mb-6">Corte {liquidacionConfigDe(m || {}).frecuencia || "diario"} a las <b>{liquidacionConfigDe(m || {}).horaCorte || "19:00"} PE</b>. Los montos netos los gestiona RedPontis automáticamente.</p>
              <div className="grid grid-cols-3 gap-5 mb-6">
                {[
                  { l: "Volumen bruto hoy", v: `S/ ${Number(totalHoy||0).toFixed(2)}` },
                  { l: `Tasa de descuento al comercio (MDR ${mdrEfectivo}%)`, v: `S/ ${Number(comisionHoy||0).toFixed(2)}` },
                  { l: "Neto a acreditar hoy", v: `S/ ${Number(netoHoy||0).toFixed(2)}`, accent: true },
                ].map(({ l, v, accent }) => (
                  <div key={l} className={`border rounded-xl p-5 ${accent ? "border-secondary/40 bg-secondary-fixed/30" : "border-outline-variant bg-surface-container-lowest"}`}>
                    <p className="font-mono text-[9px] uppercase text-outline mb-2">{l}</p>
                    <p className={`text-xl font-black ${accent ? "text-secondary" : ""}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 text-xs text-on-surface-variant flex gap-2">
                <Icon n="info" className="text-secondary text-[18px]" />
                <span>La tasa de descuento al comercio (MDR) que aplica a tu comercio es del <b>{mdrEfectivo}%</b>{comercio.fijoTx ? ` + S/ ${comercio.fijoTx} por transacción` : ""}. La acreditación la gestiona RedPontis automáticamente. ¿Dudas? Abre un ticket de soporte.</span>
              </div>
            </>
          )}
          {tab === "soporte" && (
            <>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold">Soporte</h2>
                <BtnPrimary onClick={() => setTicketOpen(true)}><Icon n="add" className="text-[18px]" /> Nueva solicitud</BtnPrimary>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant/60">
                {tickets.length === 0 && <p className="p-8 text-center text-sm text-on-surface-variant">Sin solicitudes. Usa el botón para crear una nueva.</p>}
                {tickets.map(t => (
                  <div key={t.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{t.asunto}</p>
                      <p className="font-mono text-[10px] text-on-surface-variant uppercase">{t.tipo} · {new Date(t.createdAt).toLocaleDateString("es-PE")}</p>
                    </div>
                    <Pill color={t.estado === "ABIERTO" ? "bg-tertiary-container" : "bg-ok"}>{t.estado}</Pill>
                  </div>
                ))}
              </div>
              <Drawer open={ticketOpen} onClose={() => setTicketOpen(false)} icon="support_agent" title="Nueva solicitud de soporte" subtitle={comercio.nombre}
                footer={<><BtnOutline onClick={() => setTicketOpen(false)}>Cancelar</BtnOutline><BtnPrimary disabled={!tf.asunto} onClick={sendTicket}>Enviar solicitud</BtnPrimary></>}>
                <div className="space-y-4">
                  <Field label="Tipo"><select className={inputCls} value={tf.tipo} onChange={e => setTf({ ...tf, tipo: e.target.value })}>
                    {["Operativo", "POS / Hardware", "Incidencia de cobro", "Inventario", "Otro"].map(t => <option key={t}>{t}</option>)}
                  </select></Field>
                  <Field label="Asunto"><input className={inputCls} value={tf.asunto} onChange={e => setTf({ ...tf, asunto: e.target.value })} placeholder="Resumen breve del problema" /></Field>
                  <Field label="Detalle"><textarea className={`${inputCls} h-24 py-2`} value={tf.detalle} onChange={e => setTf({ ...tf, detalle: e.target.value })} /></Field>
                </div>
              </Drawer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}


/* ====== Frente: Anunciante (panel dedicado durante vigencia de promo) ====== */
export function AnuncianteFront() {
  const { id } = useParams();
  const st = useStore();
  const a = (st.anunciantes||[]).find(x => x.id === id) || null;
  if (!a) return <div className="min-h-screen flex items-center justify-center bg-background"><p>Anunciante no encontrado.</p></div>;

  const adminSess = session();
  const sess = st.anuncianteSession?.anuncianteId === id;
  if (!adminSess && !sess) return <AnuncianteGate a={a} />;

  const preview = !!adminSess && !sess;
  const promos = (st.promos||[]).filter(p => p.anuncianteId === id);
  const today = new Date().toISOString().slice(0, 10);
  const vigentes = promos.filter(p => p.desde <= today && today <= p.hasta && p.estado !== "FINALIZADA");
  const historico = promos.filter(p => p.estado === "FINALIZADA" || p.hasta < today);
  const activa = vigentes.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-tertiary text-white flex items-center justify-center font-bold">{a.razonSocial[0]}</div>
          <div>
            <p className="font-semibold text-sm">{a.razonSocial}</p>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase">Panel anunciante · JOI 360 · Promos Redpontis</p>
          </div>
        </div>
        {preview && <span className="px-3 py-1 bg-tertiary text-white text-xs font-mono uppercase rounded">Vista previa RedPontis</span>}
        {!preview && sess && <button onClick={() => { anuncianteLogout(); notify("Sesión cerrada.", "info"); }} className="text-sm text-primary hover:underline flex items-center gap-1"><Icon n="logout" className="text-[16px]" /> Salir</button>}
      </header>

      <main className="max-w-5xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">¡Hola, {a.razonSocial}!</h1>
          <p className="text-on-surface-variant">{activa ? `Tienes ${vigentes.length} promo(s) vigente(s) en el ecosistema JOI 360.` : "No tienes promociones activas. Contáctanos para habilitar una nueva."}</p>
        </div>

        {!activa && (
          <div className="bg-secondary-fixed border border-secondary/30 rounded-xl p-6 mb-8 flex items-start gap-3">
            <Icon n="mark_email_read" className="text-secondary text-[28px]" />
            <div>
              <p className="font-semibold">Tu panel se desactivará al cierre del día</p>
              <p className="text-sm text-on-surface-variant mt-1">Sin promos vigentes el acceso se desactiva. Recibirás un correo de conformidad con el rendimiento histórico. Para contratar otra promoción, contáctanos.</p>
            </div>
          </div>
        )}

        {vigentes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icon n="campaign" className="text-tertiary" /> Promos vigentes</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {vigentes.map(p => {
                let h = 0; for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
                const impresiones = 800 + (h % 12000);
                const clics = Math.floor(impresiones * (0.05 + (h % 20) / 100));
                const ctr = ((clics / impresiones) * 100).toFixed(1);
                return (
                  <div key={p.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold">{p.titulo}</h3>
                      <Pill color="bg-ok">VIGENTE</Pill>
                    </div>
                    <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-4">{p.tipo} · {p.desde} → {p.hasta}</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <KPISimple label="Impresiones" value={impresiones.toLocaleString()} />
                      <KPISimple label="Clics" value={clics.toLocaleString()} />
                      <KPISimple label="CTR" value={`${ctr}%`} accent />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase text-outline mb-1">Redenciones</p>
                      <p className="text-2xl font-bold">{p.redenciones || 0}{p.cupos > 0 && <span className="text-base text-on-surface-variant"> / {p.cupos}</span>}</p>
                      {p.cupos > 0 && (
                        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-tertiary rounded-full" style={{ width: `${Math.min(100, ((p.redenciones || 0) / p.cupos) * 100)}%` }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {historico.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icon n="history" className="text-outline" /> Histórico</h2>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant/60">
              {historico.map(p => (
                <div key={p.id} className="px-5 py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{p.titulo}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant">{p.desde} → {p.hasta} · {p.redenciones || 0} redenciones</p>
                  </div>
                  <Pill color="bg-outline">FINALIZADA</Pill>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function KPISimple({ label, value, accent }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
      <p className="font-mono text-[9px] uppercase text-outline">{label}</p>
      <p className={`text-lg font-bold ${accent ? "text-tertiary" : ""}`}>{value}</p>
    </div>
  );
}

function AnuncianteGate({ a }) {
  const [f, setF] = useState({ usuario: "", password: "" });
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const r = anuncianteLogin(f.usuario, f.password);
    if (r === true) notify(`Bienvenido al panel de anunciante de ${a.razonSocial}.`);
    else if (r === "EXPIRADO") setErr("Tu panel está desactivado: no tienes promos vigentes. Contáctanos para contratar una nueva.");
    else setErr("Credenciales inválidas.");
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#5800c3 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-tertiary text-white flex items-center justify-center"><Icon n="domain" /></div>
          <div>
            <h1 className="text-lg font-black">Panel Anunciante</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">{a.razonSocial} · powered by JOI 360</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Usuario"><input className={`${inputCls} font-mono text-xs`} value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} placeholder="...@promos.joi360.pe" /></Field>
          <Field label="Password"><input className={inputCls} type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
          {err && <p className="text-xs text-error">{err}</p>}
          <BtnPrimary type="submit" className="w-full"><Icon n="login" className="text-[18px]" /> Ingresar</BtnPrimary>
        </form>
      </div>
    </div>
  );
}

/* Frente: Landing pública — movido a LandingPublica.jsx (header + nav +
   rutaje real: Inicio / Eventos / detalle, en vez de una sola pantalla
   plana). */
