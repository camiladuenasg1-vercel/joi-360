import React, { useState, useEffect } from "react";
import { useStore } from "./hooks";
import { update, HARDWARE_CATALOG, REDES_PAGO, CANALES_ADQUIRENCIA } from "./store";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, Toggle, notify, NumInput } from "./ui";
import { syncAcquiringChannels, pruneStaleAcquiringChannels, fetchAcquiringChannelsAdmin } from "./supabase";

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

// Discrepancia real (24-ago): este catálogo comercial (MDR/liquidación) tenía
// su propio set de ids (pos/qr/online/tap2phone) totalmente distinto del que
// un mundo realmente puede activar en Módulos → Comercios
// (CANALES_ADQUIRENCIA: pos_fisico/app_operador/qr_estatico/tap2phone, ver
// store.js). Resultado: configurar MDR/liquidación acá nunca podía
// corresponder a lo que el mundo activaba — eran dos catálogos que sonaban
// parecido pero no se tocaban. Se deriva directo de CANALES_ADQUIRENCIA (id/
// nombre/desc/icono canónicos) y se le agregan encima los parámetros
// comerciales. "Gateway en línea" salía del set anterior porque no
// corresponde a ningún canal que un mundo pueda activar hoy.
const COMERCIAL_DEFAULTS = {
  pos_fisico:    { liquidacion: "Al día siguiente hábil",   mdr: 1.5, fijoTx: 0.10, redIds: ["visa", "mc", "joi_wallet", "joi_bandita", "yape", "plin", "qr_bim"] },
  app_operador:  { liquidacion: "Acreditación inmediata",   mdr: 0.8, fijoTx: 0,    redIds: ["joi_wallet", "joi_bandita", "yape", "plin", "qr_bim"] },
  qr_estatico:   { liquidacion: "Acreditación inmediata",   mdr: 0.8, fijoTx: 0,    redIds: ["joi_wallet", "joi_bandita", "yape", "plin", "qr_bim"] },
  tap2phone:     { liquidacion: "Acreditación inmediata",   mdr: 1.2, fijoTx: 0,    redIds: ["joi_bandita", "joi_wallet"] },
};
// Exportado: TabAcuerdo (MundoDetail.jsx) lo usa como fallback para calcular
// el techo global de MDR cuando st.adqChannels todavía no fue tocado por
// nadie (nunca se seedea hasta el primer guardado real en esta pantalla).
export const CHANNELS_SEED = CANALES_ADQUIRENCIA.map(ch => ({
  id: ch.id, icon: ch.icon, nombre: ch.nombre, desc: ch.desc,
  habilitado: ch.disponible,
  ...(COMERCIAL_DEFAULTS[ch.id] || { liquidacion: "Al día siguiente hábil", mdr: 1.5, fijoTx: 0, redIds: ["joi_wallet", "joi_bandita"] }),
}));

// Igual que en Emision.jsx: solo se pisan los campos que Supabase de verdad
// rastrea (comercial + on/off global) — id/nombre/desc/icono quedan del
// catálogo canónico (CANALES_ADQUIRENCIA), que es la fuente real de verdad
// de qué canales existen.
function mergeRemoteAcquiringChannels(local, remoteRows) {
  const remoteById = new Map((remoteRows || []).map(r => [r.id, r]));
  return local.map(ch => {
    const r = remoteById.get(ch.id);
    if (!r) return ch;
    return {
      ...ch,
      habilitado: r.global_active,
      liquidacion: r.settlement_policy || ch.liquidacion,
      mdr: r.mdr ?? ch.mdr,
      fijoTx: r.fijo_tx ?? ch.fijoTx,
      redIds: r.networks && r.networks.length ? r.networks : ch.redIds,
    };
  });
}

const LIQUIDACIONES = [
  { v: "Acreditación inmediata", d: "El monto se refleja en la cuenta virtual del comercio en el momento que se confirma la transacción." },
  { v: "Al día siguiente hábil", d: "Corte a las 19:00 PE. El saldo se acredita al día hábil siguiente. Para transacciones de lunes a viernes." },
  { v: "A los 2 días hábiles", d: "Corte a las 19:00 PE. El saldo se acredita 2 días hábiles después del corte." },
];

export function Adquirencia() {
  const st = useStore();
  const channels = st.adqChannels || CHANNELS_SEED;
  const [editing, setEditing] = useState(null);
  const [hwTab, setHwTab] = useState(false);

  useEffect(() => {
    fetchAcquiringChannelsAdmin().then(rows => {
      if (!rows || !rows.length) return;
      const merged = mergeRemoteAcquiringChannels(st.adqChannels || CHANNELS_SEED, rows);
      update(s => { s.adqChannels = merged; });
    }).catch(e => console.warn("[acquiring_channels fetch]", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                <NumInput step="0.1" min="0" value={f.mdr} onChange={v => setF({ ...f, mdr: v })} className="w-16 text-right px-2 py-1.5 text-sm border border-outline-variant rounded focus:ring-2 focus:ring-primary/20 bg-surface outline-none" />
                <span className="text-xs text-on-surface-variant font-bold">%</span>
              </div>
            </div>
            <div className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
              <div><p className="text-sm font-medium">Cargo fijo por transacción (PEN)</p><p className="text-xs text-on-surface-variant">Opcional. Monto fijo adicional por cada operación exitosa.</p></div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-on-surface-variant font-bold">S/</span>
                <NumInput step="0.01" min="0" value={f.fijoTx} onChange={v => setF({ ...f, fijoTx: v })} className="w-16 text-right px-2 py-1.5 text-sm border border-outline-variant rounded focus:ring-2 focus:ring-primary/20 bg-surface outline-none" />
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

// "Nuevo canal" (creación libre con id arbitrario) se retiró: un canal
// custom nunca podía activarse por mundo, porque MundoDetail.jsx itera un
// set fijo (CANALES_ADQUIRENCIA) — crear uno acá era una pantalla que
// prometía algo que el resto del sistema no podía cumplir. El catálogo
// ahora se deriva 1:1 de CANALES_ADQUIRENCIA (ver arriba).
