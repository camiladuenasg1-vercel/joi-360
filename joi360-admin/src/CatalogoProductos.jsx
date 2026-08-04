import React, { useState } from "react";
import { useStore } from "./hooks";
import { update, uid, HARDWARE_CATALOG } from "./store";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify, NumInput } from "./ui";

// Catálogo maestro inicial — se persiste y es fuente para todos los selects
const CATALOG_SEED = [
  // HARDWARE FÍSICO
  { id: "hw_ingenico_move5000", tipo: "Hardware", categoria: "POS Físico", nombre: "Ingenico MOVE 5000", sku: "POS-ING-5000", desc: "Terminal inalámbrica con NFC, chip y banda magnética. 4G + Wi-Fi.", precio: 1200, unidad: "unidad", stockDisponible: 15, stockReservado: 3, moneda: "PEN", activo: true },
  { id: "hw_verifone_v240", tipo: "Hardware", categoria: "POS Físico", nombre: "Verifone V240m", sku: "POS-VER-V240", desc: "Terminal de sobremesa con pantalla táctil, NFC y ticket. Ethernet + Wi-Fi.", precio: 980, unidad: "unidad", stockDisponible: 8, stockReservado: 1, moneda: "PEN", activo: true },
  { id: "hw_totem_t1", tipo: "Hardware", categoria: "Tótem Autoservicio", nombre: "JOI 360 Tótem T1", sku: "TOT-JOI-T1", desc: "Pantalla táctil 15 pulgadas con lector QR y cámara. Para autopago en mostrador.", precio: 4500, unidad: "unidad", stockDisponible: 3, stockReservado: 0, moneda: "PEN", activo: true },
  { id: "hw_qr_frame", tipo: "Hardware", categoria: "Display QR Adquirencia", nombre: "JOI 360 QR Frame Digital (Adquirencia)", sku: "QRF-JOI-01", desc: "Pantalla física en mostrador que muestra QR dinámico por cada cobro. El usuario escanea con su app. Lado adquirencia (merchant).", precio: 350, unidad: "unidad", stockDisponible: 20, stockReservado: 5, moneda: "PEN", activo: true },
  { id: "hw_qr_impreso", tipo: "Hardware", categoria: "QR Estático", nombre: "QR Estático Impreso (vinilo)", sku: "QRS-IMP-01", desc: "Código QR personalizado impreso en vinilo para pegar en el mostrador.", precio: 80, unidad: "unidad", stockDisponible: 200, stockReservado: 40, moneda: "PEN", activo: true },
  { id: "hw_bandita_reader", tipo: "Hardware", categoria: "Lector NFC", nombre: "JOI 360 Lector Bandita NFC B1", sku: "NFC-RDR-B1", desc: "Lector NFC dedicado para pulseras JOI 360. Conecta vía USB o BT al POS.", precio: 280, unidad: "unidad", stockDisponible: 30, stockReservado: 8, moneda: "PEN", activo: true },
  { id: "hw_bandita_nfc_lote10", tipo: "Hardware", categoria: "Bandita NFC", nombre: "Pulsera NFC JOI 360 (lote ×10)", sku: "NFC-BND-L10", desc: "Pulseras NFC premium con chip NTAG215. Resistente al agua. Por lote de 10 unidades.", precio: 320, unidad: "lote×10", stockDisponible: 50, stockReservado: 12, moneda: "PEN", activo: true },
  { id: "hw_bandita_nfc_lote50", tipo: "Hardware", categoria: "Bandita NFC", nombre: "Pulsera NFC JOI 360 (lote ×50)", sku: "NFC-BND-L50", desc: "Pulseras NFC premium NTAG215. Descuento por volumen. Por lote de 50 unidades.", precio: 1400, unidad: "lote×50", stockDisponible: 20, stockReservado: 4, moneda: "PEN", activo: true },
  // SOFTWARE / APPS
  { id: "sw_joi_app_ios", tipo: "Software", categoria: "App Móvil", nombre: "JOI 360 App — iOS (App Store)", sku: "APP-JOI-IOS", desc: "App nativa del ecosistema para usuarios finales. Wallet, QR, bandita, eventos y promos.", precio: 0, unidad: "licencia/mundo", stockDisponible: 999, stockReservado: 0, moneda: "PEN", activo: true },
  { id: "sw_joi_app_android", tipo: "Software", categoria: "App Móvil", nombre: "JOI 360 App — Android (Play Store)", sku: "APP-JOI-AND", desc: "App nativa del ecosistema para usuarios finales. Wallet, QR, bandita, eventos y promos.", precio: 0, unidad: "licencia/mundo", stockDisponible: 999, stockReservado: 0, moneda: "PEN", activo: true },
  { id: "sw_tap2phone", tipo: "Software", categoria: "App POS", nombre: "Tap2Phone App (Android)", sku: "APP-T2P-01", desc: "Convierte el Android del dependiente en POS con NFC. Sin hardware adicional.", precio: 0, unidad: "licencia/usuario", stockDisponible: 999, stockReservado: 0, moneda: "PEN", activo: true },
  { id: "sw_dashboard_sponsor", tipo: "Software", categoria: "Dashboard Web", nombre: "Dashboard del Mundo (Sponsor)", sku: "WEB-DSH-SP", desc: "Panel web entregable al sponsor del mundo. KPIs, comercios, publicidad y soporte.", precio: 0, unidad: "licencia/mundo", stockDisponible: 999, stockReservado: 0, moneda: "PEN", activo: true },
  // QR SOFTWARE — emisión y adquirencia
  { id: "sw_qr_emision", tipo: "Software", categoria: "QR Emisión", nombre: "JOI 360 QR Wallet (Emisión)", sku: "SW-QRE-01", desc: "Generación de QR dinámico desde la billetera del USUARIO. El usuario muestra su QR y el merchant/POS lo escanea para cobrar. Lado EMISIÓN.", precio: 0, unidad: "licencia/mundo", stockDisponible: 999, stockReservado: 0, moneda: "PEN", activo: true },
  { id: "sw_qr_adquirencia", tipo: "Software", categoria: "QR Adquirencia", nombre: "JOI 360 QR Cobro Dinámico (Adquirencia)", sku: "SW-QRA-01", desc: "API/servicio de generación de QR dinámico por transacción para el MERCHANT. El merchant muestra el QR y el usuario lo escanea con el app. Lado ADQUIRENCIA. Compatible con POS físico, Tap2Phone o QR Frame.", precio: 0, unidad: "licencia/mundo", stockDisponible: 999, stockReservado: 0, moneda: "PEN", activo: true },
];

const TIPOS = ["Hardware", "Software"];
const CATEGORIAS_HW = ["POS Físico", "Tótem Autoservicio", "Display QR Adquirencia", "QR Estático", "Lector NFC", "Bandita NFC", "Accesorio"];
const CATEGORIAS_SW = ["App Móvil", "App POS", "Dashboard Web", "QR Emisión", "QR Adquirencia", "Integración / API", "Otro Software"];
const UNIDADES = ["unidad", "lote×10", "lote×50", "licencia/mundo", "licencia/usuario", "mes/servicio"];

const BLANK = { tipo: "Hardware", categoria: "POS Físico", nombre: "", sku: "", desc: "", precio: 0, unidad: "unidad", stockDisponible: 0, stockReservado: 0, moneda: "PEN", activo: true };

export function CatalogoProductos() {
  const st = useStore();
  // Persist seed on first load so future edits save correctly
  React.useEffect(() => {
    if (!st.catalogoProductos) {
      update(s => { s.catalogoProductos = JSON.parse(JSON.stringify(CATALOG_SEED)); });
    }
  }, []);
  const catalog = st.catalogoProductos || CATALOG_SEED;
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterCat, setFilterCat] = useState("Todas");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [stockEditId, setStockEditId] = useState(null);
  const [stockDelta, setStockDelta] = useState(0);

  const cats = [...new Set(catalog.map(x => x.categoria))].sort();
  const filtered = catalog.filter(x =>
    (filterTipo === "Todos" || x.tipo === filterTipo) &&
    (filterCat === "Todas" || x.categoria === filterCat) &&
    (search === "" || x.nombre.toLowerCase().includes(search.toLowerCase()) || x.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const totalStock = catalog.filter(x => x.tipo === "Hardware").reduce((a, x) => a + (x.stockDisponible || 0), 0);
  const totalReservado = catalog.filter(x => x.tipo === "Hardware").reduce((a, x) => a + (x.stockReservado || 0), 0);
  const valorInventario = catalog.filter(x => x.tipo === "Hardware").reduce((a, x) => a + (x.stockDisponible || 0) * (x.precio || 0), 0);

  const save = (f) => {
    update(s => {
      if (!s.catalogoProductos) s.catalogoProductos = JSON.parse(JSON.stringify(CATALOG_SEED));
      if (editing) {
        const idx = s.catalogoProductos.findIndex(x => x.id === editing.id);
        s.catalogoProductos[idx] = { ...editing, ...f };
      } else {
        s.catalogoProductos.push({ id: uid("prod"), ...f });
      }
    });
    notify(`Producto "${f.nombre}" ${editing ? "actualizado" : "agregado al catálogo"}. Disponible en todos los selects del sistema.`);
    setEditing(null); setNewOpen(false);
  };

  const del = (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" del catálogo? Esto no afecta mundos ya configurados.`)) return;
    update(s => { s.catalogoProductos = s.catalogoProductos.filter(x => x.id !== item.id); });
    notify(`"${item.nombre}" eliminado del catálogo.`, "info");
  };

  const adjustStock = (item) => {
    update(s => {
      const p = s.catalogoProductos?.find(x => x.id === item.id);
      if (p) p.stockDisponible = Math.max(0, (p.stockDisponible || 0) + stockDelta);
    });
    notify(`Stock de "${item.nombre}" ajustado en ${stockDelta > 0 ? "+" : ""}${stockDelta} unidades.`, "info");
    setStockEditId(null); setStockDelta(0);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Configuración global</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Catálogo de Productos</span>
          </div>
          <h1 className="text-3xl font-bold">Catálogo de Productos y Servicios</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">Hardware físico (POS, tótems, banditas NFC) y software (apps, dashboards). Este catálogo es la <b>fuente maestra</b> de datos para todos los selects del sistema. Incluye inventario y precios.</p>
        </div>
        <BtnPrimary onClick={() => { setEditing(null); setNewOpen(true); }}><Icon n="add" className="text-[18px]" /> Nuevo producto</BtnPrimary>
      </div>

      {/* KPIs inventario */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { t: "Ítems en catálogo", v: catalog.filter(x => x.activo).length, i: "inventory_2" },
          { t: "Unidades hardware disponibles", v: totalStock.toLocaleString(), i: "warehouse" },
          { t: "Unidades reservadas", v: totalReservado.toLocaleString(), i: "bookmark" },
          { t: "Valor inventario HW", v: `S/ ${valorInventario.toLocaleString()}`, i: "payments" },
        ].map(({ t, v, i }) => (
          <div key={t} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 hover:border-primary transition-colors">
            <div className="flex justify-between mb-1"><span className="font-mono text-[9px] uppercase text-outline">{t}</span><Icon n={i} className="text-primary text-[18px]" /></div>
            <p className="text-xl font-black">{v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
          <input className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o SKU..." />
        </div>
        <div className="inline-flex bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
          {["Todos", "Hardware", "Software"].map(t => (
            <button key={t} onClick={() => { setFilterTipo(t); setFilterCat("Todas"); }} className={`px-3 py-1.5 rounded text-sm transition-colors ${filterTipo === t ? "bg-surface-container text-on-surface font-semibold shadow-sm" : "text-on-surface-variant hover:bg-surface-container/50"}`}>{t}</button>
          ))}
        </div>
        <select className="border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="Todas">Todas las categorías</option>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla catálogo */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-5 py-3">Producto</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Tipo / Categoría</th>
              <th className="px-5 py-3 text-right">Precio</th>
              <th className="px-5 py-3 text-center">Stock disponible</th>
              <th className="px-5 py-3 text-center">Reservado</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {filtered.length === 0 && <tr><td colSpan="8" className="p-10 text-center text-on-surface-variant">Sin productos para estos filtros.</td></tr>}
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                <td className="px-5 py-3">
                  <p className="font-semibold">{item.nombre}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1 max-w-[220px]">{item.desc}</p>
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-on-surface-variant">{item.sku}</td>
                <td className="px-5 py-3">
                  <Pill color={item.tipo === "Hardware" ? "bg-primary" : "bg-secondary"}>{item.tipo}</Pill>
                  <p className="font-mono text-[10px] text-outline mt-1">{item.categoria}</p>
                </td>
                <td className="px-5 py-3 text-right font-mono font-bold">{item.precio > 0 ? `S/ ${item.precio}` : "—"}<p className="font-mono text-[9px] text-outline font-normal">{item.unidad}</p></td>
                <td className="px-5 py-3 text-center">
                  {stockEditId === item.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <NumInput className="w-16 text-center px-1 py-0.5 border border-outline-variant rounded text-sm" value={stockDelta} onChange={v => setStockDelta(v)} />
                      <button onClick={() => adjustStock(item)} className="text-ok hover:underline text-xs">✓</button>
                      <button onClick={() => { setStockEditId(null); setStockDelta(0); }} className="text-outline hover:underline text-xs">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setStockEditId(item.id)} className={`font-bold text-sm ${item.stockDisponible <= 3 && item.tipo === "Hardware" ? "text-error" : "text-on-surface"} hover:text-primary`}>
                      {item.tipo === "Hardware" ? item.stockDisponible : "∞"}
                    </button>
                  )}
                </td>
                <td className="px-5 py-3 text-center font-mono text-sm text-on-surface-variant">{item.tipo === "Hardware" ? item.stockReservado : "—"}</td>
                <td className="px-5 py-3"><Pill color={item.activo ? "bg-ok" : "bg-outline"}>{item.activo ? "Activo" : "Inactivo"}</Pill></td>
                <td className="px-5 py-3 text-right">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditing(item); setNewOpen(true); }} className="p-1.5 rounded border border-outline-variant hover:bg-surface-container text-on-surface-variant"><Icon n="edit" className="text-[16px]" /></button>
                    <button onClick={() => del(item)} className="p-1.5 rounded border border-outline-variant hover:bg-error-container/20 text-error"><Icon n="delete" className="text-[16px]" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-primary-fixed border border-primary/20 rounded-lg p-3 flex gap-2 text-xs text-on-surface-variant">
        <Icon n="info" className="text-primary text-[18px]" />
        <span>Este catálogo es la <b>fuente maestra compartida</b>. Los items de Hardware aparecen en el selector de dispositivos al cargar un comercio. Los items de Bandita NFC permiten gestionar el inventario de pulseras por lote. Los de Software se asignan automáticamente al habilitar un mundo.</span>
      </div>

      <ProductoDrawer open={newOpen} onClose={() => { setNewOpen(false); setEditing(null); }} editing={editing} onSave={save} />
    </div>
  );
}

function ProductoDrawer({ open, onClose, editing, onSave }) {
  const [f, setF] = useState(BLANK);
  React.useEffect(() => { if (open) setF(editing || BLANK); }, [open, editing]);
  const cats = f.tipo === "Hardware" ? CATEGORIAS_HW : CATEGORIAS_SW;
  return (
    <Drawer open={open} onClose={onClose} icon="inventory_2"
      title={editing ? `Editar: ${editing.nombre}` : "Nuevo producto en catálogo"}
      subtitle="Catálogo maestro de productos"
      footer={<><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary disabled={!f.nombre || !f.sku} onClick={() => onSave(f)}><Icon n="save" className="text-[16px]" /> Guardar en catálogo</BtnPrimary></>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo de producto">
            <div className="flex gap-2">
              {TIPOS.map(t => (
                <button key={t} onClick={() => setF({ ...f, tipo: t, categoria: t === "Hardware" ? "POS Físico" : "App Móvil" })}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${f.tipo === t ? "border-primary bg-primary-fixed text-primary font-semibold" : "border-outline-variant"}`}>{t}</button>
              ))}
            </div>
          </Field>
          <Field label="Categoría">
            <select className={inputCls} value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nombre del producto *"><input className={inputCls} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Ingenico MOVE 5000" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU / Código interno *"><input className={`${inputCls} font-mono`} value={f.sku} onChange={e => setF({ ...f, sku: e.target.value.toUpperCase() })} placeholder="POS-XXX-001" /></Field>
          <Field label="Unidad de venta">
            <select className={inputCls} value={f.unidad} onChange={e => setF({ ...f, unidad: e.target.value })}>
              {UNIDADES.map(u => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Descripción"><textarea className={`${inputCls} h-20 py-2`} value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Precio (PEN)"><NumInput className={inputCls} min="0" value={f.precio} onChange={v => setF({ ...f, precio: v })} /></Field>
          {f.tipo === "Hardware" && <Field label="Stock disponible"><NumInput className={inputCls} min="0" value={f.stockDisponible} onChange={v => setF({ ...f, stockDisponible: v })} /></Field>}
        </div>
        {f.tipo === "Hardware" && (
          <Field label="Stock reservado (comprometido con mundos)"><NumInput className={inputCls} min="0" value={f.stockReservado} onChange={v => setF({ ...f, stockReservado: v })} /></Field>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={f.activo} onChange={e => setF({ ...f, activo: e.target.checked })} className="rounded text-primary" />
          <span className="text-sm">Producto activo y visible en selects del sistema</span>
        </label>
      </div>
    </Drawer>
  );
}
