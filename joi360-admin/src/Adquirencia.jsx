import React, { useState } from "react";
import { useStore } from "./hooks";
import { update, uid, HARDWARE_CATALOG, REDES_PAGO } from "./store";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, Toggle, notify } from "./ui";
import { syncAcquiringChannels, pruneStaleAcquiringChannels } from "./supabase";

// Mismo patrón que Emision.jsx/emission_channels: empuja el catálogo a
// Supabase en cada guardado — antes esto solo vivía en localStorage de quien
// lo editó, así que nadie más (ni el propio admin desde otra sesión) lo veía.
function pushChannelsToSupabase(channels) {
  const rows = channels.map(ch => ({
    id: ch.id, name: ch.nombre, icon: ch.icon, description: ch.desc,
    settlement_policy: ch.liquidacion, mdr: ch.mdr, fijo_tx: ch.fijoTx,
    networks: ch.redIds || [], global_active: ch.habilitado,
  }));
  syncAcquiringChannels(rows).catch(e => console.warn("[acquiring_channels sync]", e));
  pruneStaleAcquiringChannels(channels.map(ch => ch.id)).catch(e => console.warn("[acquiring_channels prune]", e));
}

const CHANNELS_SEED = [
  { id: "pos", icon: "point_of_sale", nombre: "POS Físico", desc: "Terminales físicas de cobro en los comercios del ecosistema", liquidacion: "Al día siguiente hábil", mdr: 1.5, fijoTx: 0.10, habilitado: true, redIds: ["visa", "mc", "joi_wallet", "joi_bandita", "yape", "plin", "qr_bim"] },
  { id: "qr", icon: "qr_code_scanner", nombre: "Pagos con QR", desc: "Billeteras y QR interoperable", liquidacion: "Acreditación inmediata", mdr: 0.8, fijoTx: 0, habilitado: true, redIds: ["joi_wallet", "joi_bandita", "yape", "plin", "qr_bim"] },
  { id: "online", icon: "language", nombre: "Gateway en línea", desc: "Pagos desde e-commerce y links de pago generados en el app", liquidacion: "A los 2 días hábiles", mdr: 2.0, fijoTx: 0.20, habilitado: true, redIds: ["visa", "mc", "amex"] },
  { id: "tap2phone", icon: "tap_and_play", nombre: "Tap2Phone (App POS)", desc: "NFC en el celular del dependiente. Sin hardware adicional.", liquidacion: "Acreditación inmediata", mdr: 1.2, fijoTx: 0, habilitado: false, redIds: ["joi_bandita", "joi_wallet"] },
];

const LIQUIDACIONES = [
  { v: "Acreditación inmediata", d: "El monto se refleja en la cuenta virtual del comercio en el momento que se confirma la transacción." },
  { v: "Al día siguiente hábil", d: "Corte a las 19:00 PE. El saldo se acredita al día hábil siguiente. Para transacciones de lunes a viernes." },
  { v: "A los 2 días hábiles", d: "Corte a las 19:00 PE. El saldo se acredita 2 días hábiles después del corte." },
];

const CANAL_BLANK = {
  id: "", icon: "point_of_sale", nombre: "", desc: "", liquidacion: "Al día siguiente hábil",
  mdr: 1.5, fijoTx: 0, habilitado: true, redIds: ["joi_wallet", "joi_bandita"],
};

export function Adquirencia() {
  const st = useStore();
  const channels = st.adqChannels || CHANNELS_SEED;
  const [editing, setEditing] = useState(null);
  const [newCanalOpen, setNewCanalOpen] = useState(false);
  const [hwTab, setHwTab] = useState(false);

  const totalCom = (st.comercios||[]).length;
  const totalMundos = (st.mundos||[]).filter(m => (m.modulos||[]).some(x => x.id === "comercios" && x.enabled)).length;
  const totalPOS = (st.comercios||[]).reduce((a, c) => a + (c.pos || 0), 0);

  const toggleChannel = (ch) => {
    let next = channels;
    update(s => {
      if (!s.adqChannels) s.adqChannels = JSON.parse(JSON.stringify(CHANNELS_SEED));
      ((s.adqChannels||[]).find(x => x.id === ch.id)||{}).habilitado = !ch.habilitado;
      next = s.adqChannels;
    });
    pushChannelsToSupabase(next);
    notify(`Canal "${ch.nombre}" ${!ch.habilitado ? "activado" : "desactivado"}. Los mundos que lo usen reflejarán el cambio.`, "info");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => window.history.length > 1 ? window.history.back() : null}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary text-xs font-semibold mb-4 transition-colors">
        <Icon n="arrow_back" className="text-[14px]" /> Catálogos Globales
      </button>
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Operación</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Adquirencia</span>
          </div>
          <h1 className="text-3xl font-bold">Adquirencia Global</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">La configuración por mundo vive en <b>Módulos → Comercios</b> de cada mundo.</p>
        </div>
        <div className="flex gap-3">
          <BtnOutline onClick={() => setHwTab(!hwTab)}>
            <Icon n="devices" className="text-[18px]" /> {hwTab ? "Ver canales" : "Ver hardware"}
          </BtnOutline>
          <BtnPrimary onClick={() => { setEditing(null); setNewCanalOpen(true); }}>
            <Icon n="add" className="text-[18px]" /> Nuevo canal
          </BtnPrimary>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { t: "Terminales POS activas", v: totalPOS || "—", ic: "point_of_sale", sub: `${totalCom} comercios en ${totalMundos} mundos` },
          { t: "Canales habilitados", v: channels.filter(c => c.habilitado).length, ic: "hub", sub: `${channels.length} canales configurados` },
          { t: "Redes de pago activas", v: REDES_PAGO.filter(r => r.activo).length, ic: "payments", sub: `${REDES_PAGO.length} redes en catálogo` },
        ].map(({ t, v, ic, sub }) => (
          <div key={t} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:border-primary transition-colors">
            <div className="flex justify-between mb-2"><span className="font-mono text-[10px] uppercase text-outline">{t}</span><Icon n={ic} className="text-primary text-[20px]" /></div>
            <p className="text-3xl font-black mb-1">{v}</p>
            <p className="text-xs text-on-surface-variant">{sub}</p>
          </div>
        ))}
      </div>

      {!hwTab ? (
        /* ---- Canales ---- */
        <>
          <h3 className="text-lg font-bold mb-4">Canales de cobro</h3>
          <div className="grid md:grid-cols-2 gap-5">
            {channels.map(ch => {
              const redes = REDES_PAGO.filter(r => (ch.redIds || []).includes(r.id));
              return (
                <div key={ch.id} className={`bg-surface-container-lowest border-2 rounded-xl p-6 shadow-sm flex flex-col transition-colors ${ch.habilitado ? "border-primary/20 hover:border-primary" : "border-outline-variant/40 opacity-70"}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${ch.habilitado ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                        <Icon n={ch.icon} />
                      </div>
                      <div>
                        <h4 className="font-bold">{ch.nombre}</h4>
                        <p className="text-xs text-on-surface-variant">{ch.desc}</p>
                      </div>
                    </div>
                    <Pill color={ch.habilitado ? "bg-ok" : "bg-outline"}>{ch.habilitado ? "ACTIVO" : "INACTIVO"}</Pill>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-surface-container p-3 rounded-lg">
                      <p className="font-mono text-[9px] uppercase text-outline mb-1">Liquidación</p>
                      <p className="text-xs font-medium">{ch.liquidacion}</p>
                    </div>
                    <div className="bg-surface-container p-3 rounded-lg">
                      <p className="font-mono text-[9px] uppercase text-outline mb-1">Tasa base (MDR)</p>
                      <p className="text-xs font-medium">{ch.mdr}%{ch.fijoTx ? ` + S/ ${ch.fijoTx}` : ""} por transacción</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="font-mono text-[9px] uppercase text-outline mb-2">Redes habilitadas en este canal</p>
                    <div className="flex flex-wrap gap-1.5">
                      {redes.map(r => <span key={r.id} className="px-2 py-0.5 bg-primary-fixed text-primary rounded-full font-mono text-[9px]">{r.nombre}</span>)}
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-outline-variant pt-4 mt-auto">
                    <BtnOutline className="flex-1 !py-2" onClick={() => toggleChannel(ch)}>{ch.habilitado ? "Desactivar" : "Activar"}</BtnOutline>
                    <BtnPrimary className="flex-1 !py-2" onClick={() => setEditing(ch)}>Configurar</BtnPrimary>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ---- Catálogo Hardware ---- */
        <>
          <h3 className="text-lg font-bold mb-2">Catálogo de hardware y dispositivos</h3>
          <p className="text-sm text-on-surface-variant mb-5">Dispositivos disponibles en el ecosistema JOI 360. Al configurar el módulo Comercios en un mundo, el sponsor puede solicitar equipos de este catálogo.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {HARDWARE_CATALOG.map(hw => (
              <div key={hw.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                    <Icon n={hw.icon} className="text-[22px]" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{hw.marca} {hw.modelo}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant uppercase">{hw.tipo}</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mb-3">{hw.desc}</p>
                <div className="flex justify-between items-center pt-3 border-t border-outline-variant/60">
                  <p className="font-mono text-sm font-bold">{hw.precio > 0 ? `S/ ${hw.precio}` : "Sin costo de hardware"}</p>
                  <span className="font-mono text-[9px] text-outline uppercase">{hw.moneda}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ChannelDrawer ch={editing} onClose={() => setEditing(null)} channels={channels} />
      <NuevoCanalDrawer open={newCanalOpen} onClose={() => setNewCanalOpen(false)} channels={channels} />
    </div>
  );
}

/* ---- Drawer: Configurar canal existente ---- */
function ChannelDrawer({ ch, onClose, channels }) {
  const [f, setF] = useState(null);
  React.useEffect(() => {
    if (ch) setF({ mdr: ch.mdr, fijoTx: ch.fijoTx, liquidacion: ch.liquidacion, redIds: [...(ch.redIds || [])] });
  }, [ch]);
  if (!ch || !f) return null;

  const save = () => {
    let next = channels;
    update(s => {
      if (!s.adqChannels) s.adqChannels = JSON.parse(JSON.stringify(CHANNELS_SEED));
      Object.assign((s.adqChannels||[]).find(x => x.id === ch.id) || {}, { mdr: f.mdr, fijoTx: f.fijoTx, liquidacion: f.liquidacion, redIds: f.redIds });
      next = s.adqChannels;
    });
    pushChannelsToSupabase(next);
    notify(`Canal "${ch.nombre}" configurado. Los cambios aplican a todos los mundos que lo utilizan.`);
    onClose();
  };
  const toggleRed = (rid) => setF({ ...f, redIds: f.redIds.includes(rid) ? f.redIds.filter(x => x !== rid) : [...f.redIds, rid] });

  const cats = [...new Set(REDES_PAGO.map(r => r.categoria))];

  return (
    <Drawer open={!!ch} onClose={onClose} icon={ch.icon} title={`Configurar canal: ${ch.nombre}`} subtitle="Adquirencia Global" width="w-[520px]"
      footer={<><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary onClick={save}><Icon n="save" className="text-[16px]" /> Guardar</BtnPrimary></>}>
      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-4"><div className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-xs font-bold">1</div><h3 className="font-semibold">Política de liquidación</h3></div>
          <div className="space-y-2 pl-9">
            {LIQUIDACIONES.map(l => (
              <label key={l.v} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${f.liquidacion === l.v ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
                <input type="radio" checked={f.liquidacion === l.v} onChange={() => setF({ ...f, liquidacion: l.v })} className="mt-0.5 text-primary" />
                <div><p className="text-sm font-medium">{l.v}</p><p className="text-xs text-on-surface-variant">{l.d}</p></div>
              </label>
            ))}
          </div>
        </section>
        <div className="h-px bg-outline-variant/40"></div>
        <section>
          <div className="flex items-center gap-3 mb-4"><div className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-xs font-bold">2</div><h3 className="font-semibold">Tasas de descuento al comercio (MDR)</h3></div>
          <div className="pl-9 space-y-3">
            <div className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
              <div><p className="text-sm font-medium">Porcentaje sobre el monto de la transacción (%)</p><p className="text-xs text-on-surface-variant">MDR — Merchant Discount Rate. Se descuenta del monto que recibe el comercio.</p></div>
              <div className="flex items-center gap-1">
                <input type="number" step="0.1" min="0" value={f.mdr} onChange={e => setF({ ...f, mdr: +e.target.value })} className="w-16 text-right px-2 py-1.5 text-sm border border-outline-variant rounded focus:ring-2 focus:ring-primary/20 bg-surface outline-none" />
                <span className="text-xs text-on-surface-variant font-bold">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
              <div><p className="text-sm font-medium">Cargo fijo por transacción (PEN)</p><p className="text-xs text-on-surface-variant">Opcional. Monto fijo adicional por cada operación exitosa.</p></div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-on-surface-variant font-bold">S/</span>
                <input type="number" step="0.01" min="0" value={f.fijoTx} onChange={e => setF({ ...f, fijoTx: +e.target.value })} className="w-16 text-right px-2 py-1.5 text-sm border border-outline-variant rounded focus:ring-2 focus:ring-primary/20 bg-surface outline-none" />
              </div>
            </div>
          </div>
        </section>
        <div className="h-px bg-outline-variant/40"></div>
        <section>
          <div className="flex items-center gap-3 mb-4"><div className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-xs font-bold">3</div><h3 className="font-semibold">Redes de pago habilitadas en este canal</h3></div>
          <div className="pl-9 space-y-4">
            {cats.map(cat => (
              <div key={cat}>
                <p className="font-mono text-[10px] uppercase text-outline mb-2">{cat}</p>
                <div className="space-y-2">
                  {REDES_PAGO.filter(r => r.categoria === cat).map(r => (
                    <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors ${f.redIds.includes(r.id) ? "border-primary/40 bg-primary-fixed/10" : "border-outline-variant"}`}>
                      <input type="checkbox" checked={f.redIds.includes(r.id)} onChange={() => toggleRed(r.id)} className="w-4 h-4 rounded text-primary" />
                      <span className="text-sm font-medium">{r.nombre}</span>
                      {!r.activo && <span className="ml-auto font-mono text-[9px] text-outline">requiere activación</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  );
}

/* ---- Drawer: Nuevo canal ---- */
function NuevoCanalDrawer({ open, onClose, channels }) {
  const [f, setF] = useState({ ...CANAL_BLANK, redIds: ["joi_wallet"] });
  const cats = [...new Set(REDES_PAGO.map(r => r.categoria))];
  const toggleRed = (rid) => setF({ ...f, redIds: f.redIds.includes(rid) ? f.redIds.filter(x => x !== rid) : [...f.redIds, rid] });

  const save = () => {
    if (!f.nombre) { notify("El nombre del canal es obligatorio.", "error"); return; }
    let next = channels;
    update(s => {
      if (!s.adqChannels) s.adqChannels = JSON.parse(JSON.stringify(CHANNELS_SEED));
      s.adqChannels.push({ ...f, id: uid("canal"), habilitado: true });
      next = s.adqChannels;
    });
    pushChannelsToSupabase(next);
    notify(`Canal "${f.nombre}" creado y habilitado.`);
    setF({ ...CANAL_BLANK, redIds: ["joi_wallet"] });
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} icon="add_circle" title="Crear nuevo canal de cobro" subtitle="Adquirencia Global" width="w-[520px]"
      footer={<><BtnOutline onClick={onClose}>Cancelar</BtnOutline><BtnPrimary disabled={!f.nombre} onClick={save}><Icon n="add" className="text-[16px]" /> Crear canal</BtnPrimary></>}>
      <div className="space-y-6">
        <Field label="Nombre del canal *"><input className={inputCls} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Cobro en evento, NFC Wearable…" /></Field>
        <Field label="Descripción"><input className={inputCls} value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} placeholder="Breve descripción del canal" /></Field>

        <Field label="Política de liquidación">
          <div className="space-y-2">
            {LIQUIDACIONES.map(l => (
              <label key={l.v} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${f.liquidacion === l.v ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:border-primary/40"}`}>
                <input type="radio" checked={f.liquidacion === l.v} onChange={() => setF({ ...f, liquidacion: l.v })} className="mt-0.5 text-primary" />
                <div><p className="text-sm font-medium">{l.v}</p><p className="text-xs text-on-surface-variant">{l.d}</p></div>
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="MDR (%) — tasa sobre el monto"><input className={inputCls} type="number" step="0.1" value={f.mdr} onChange={e => setF({ ...f, mdr: +e.target.value })} /></Field>
          <Field label="Cargo fijo por transacción (PEN)"><input className={inputCls} type="number" step="0.01" value={f.fijoTx} onChange={e => setF({ ...f, fijoTx: +e.target.value })} /></Field>
        </div>

        <section>
          <h4 className="font-semibold text-sm mb-3">Redes de pago disponibles</h4>
          {cats.map(cat => (
            <div key={cat} className="mb-3">
              <p className="font-mono text-[10px] uppercase text-outline mb-2">{cat}</p>
              <div className="space-y-1.5">
                {REDES_PAGO.filter(r => r.categoria === cat).map(r => (
                  <label key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${f.redIds.includes(r.id) ? "border-primary/40 bg-primary-fixed/10" : "border-outline-variant hover:border-primary/30"}`}>
                    <input type="checkbox" checked={f.redIds.includes(r.id)} onChange={() => toggleRed(r.id)} className="w-4 h-4 rounded text-primary" />
                    <span className="text-sm">{r.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </Drawer>
  );
}
