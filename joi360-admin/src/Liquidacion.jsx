import React, { useState } from "react";
import { useStore } from "./hooks";
import { generarLiquidaciones, marcarLiquidacion } from "./store";
import { uploadArchivo } from "./supabase.js";
import { Icon, Pill, BtnPrimary, BtnOutline, notify } from "./ui";

export function Liquidacion() {
  const st = useStore();
  const [tab, setTab] = useState("hoy");
  const [corriendo, setCorriendo] = useState(false);
  const [procesando, setProcesando] = useState(null); // lote seleccionado para el popup de procesamiento
  const today = new Date().toISOString().slice(0, 10);

  const todas = st.liquidaciones || [];
  const hoy = todas.filter(l => l.fecha === today);
  const pendientes = todas.filter(l => l.estado === "PENDIENTE");
  const historial = todas.filter(l => l.fecha !== today);

  const correrCorte = async () => {
    setCorriendo(true);
    try {
      const antes = todas.filter(l => l.fecha === today).length;
      const items = await generarLiquidaciones();
      notify(`Corte ejecutado · ${items.length} lote(s) con volumen real de transacciones · ${antes === 0 ? "lotes generados" : "lotes ya existían"}`);
    } catch (e) {
      notify(`No se pudo ejecutar el corte: ${e.message}`, "error");
    } finally { setCorriendo(false); }
  };

  const totalDia = hoy.reduce((a, l) => a + (l.comision||0), 0);
  const totalVolumenDia = hoy.reduce((a, l) => a + (l.volumen||0), 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Operación</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Liquidación</span>
          </div>
          <h1 className="text-3xl font-bold">Liquidación</h1>
        </div>
        <div className="flex gap-3">
          <BtnOutline onClick={correrCorte} disabled={corriendo}><Icon n="schedule" className="text-[18px]" /> {corriendo ? "Procesando…" : "Forzar corte ahora"}</BtnOutline>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <KPI label="Lotes generados (hoy)" value={hoy.length} icon="receipt_long" />
        <KPI label="Volumen procesado (hoy)" value={`S/ ${totalVolumenDia.toLocaleString()}`} icon="payments" />
        <KPI label="Comisión RedPontis (hoy)" value={`S/ ${totalDia.toLocaleString()}`} icon="account_balance" />
        <KPI label="Lotes pendientes" value={pendientes.length} icon="pending_actions" error={pendientes.length > 0} />
      </div>

      <div className="bg-secondary-fixed border border-secondary/30 rounded-xl p-5 mb-8 flex items-start gap-3">
        <Icon n="schedule" className="text-secondary text-[24px]" />
        <div>
          <p className="font-semibold text-sm">Corte por política de cada mundo</p>
          <p className="text-xs text-on-surface-variant mt-1">"Forzar corte ahora" solo genera lote para los mundos cuya <b>frecuencia</b> corresponde hoy (diaria = siempre, semanal = lunes, quincenal = días 1 y 16, mensual = día 1) — configurable por mundo en Mundos → Comercios → Acuerdo/Microservicios. Cada lote se calcula según el acuerdo: transaccional aplica % sobre volumen, mixto suma fijo prorrateado, revenue/fijo prorratea el fijo entre 30 días. Un lote bajo el <b>monto mínimo</b> configurado se genera pero queda RETENIDO en vez de liberarse.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-outline-variant">
        {[
          { k: "hoy", l: `Hoy (${hoy.length})` },
          { k: "pendientes", l: `Pendientes (${pendientes.length})` },
          { k: "historial", l: `Historial (${historial.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab === t.k ? "text-primary border-primary font-semibold" : "text-on-surface-variant border-transparent hover:text-primary"}`}>{t.l}</button>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-6 py-3 font-medium">Lote / Fecha</th>
              <th className="px-6 py-3 font-medium">Mundo / Entidad legal</th>
              <th className="px-6 py-3 font-medium">Acuerdo</th>
              <th className="px-6 py-3 font-medium text-right">Volumen</th>
              <th className="px-6 py-3 font-medium text-right">Comisión RP</th>
              <th className="px-6 py-3 font-medium text-right">Neto al sponsor</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {(tab === "hoy" ? hoy : tab === "pendientes" ? pendientes : historial).length === 0 && (
              <tr><td colSpan="8" className="p-10 text-center text-on-surface-variant">
                <Icon n="inbox" className="text-[36px] text-outline mb-2 block mx-auto" />
Sin lotes aún para este período. {tab === "hoy" && "Para generar los lotes del día haz clic en 'Forzar corte ahora' arriba a la derecha."}
              </td></tr>
            )}
            {(tab === "hoy" ? hoy : tab === "pendientes" ? pendientes : historial).map(l => (
              <tr key={l.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-4">
                  <p className="font-mono text-xs font-medium">#{l.id.slice(0, 10)}</p>
                  <p className="font-mono text-[10px] text-outline">{l.fecha} · {l.cortes}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-sm">{l.mundoNombre}</p>
                  <p className="text-[11px] text-on-surface-variant">{l.entidadLegal}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] uppercase bg-primary-fixed text-primary">{l.tipoAcuerdo}</span>
                  <p className="text-[10px] text-outline mt-1">
                    {l.tipoAcuerdo === "transaccional" && `${l.revShare}% × S/${Number(l.volumen||0).toLocaleString()} = S/${l.comision}`}
                    {l.tipoAcuerdo === "mixto" && `${l.revShare}% vol + fijo/30 = S/${l.comision}`}
                    {(l.tipoAcuerdo === "revenue" || l.tipoAcuerdo === "fijo") && `Fijo prorrateado = S/${l.comision}`}
                    {" · "}{l.txCount} transacciones
                  </p>
                  <p className="text-[10px] text-outline mt-0.5">
                    {l.modeloRecaudacion === "mundo" ? "El Mundo recauda" : "RedPontis recauda"} · {l.frecuencia || "diaria"}
                    {l.montoMinimo != null && ` · mín S/${l.montoMinimo}`}
                  </p>
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm">{l.moneda} {Number(l.volumen||0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono text-sm font-bold text-primary">{l.moneda} {Number(l.comision||0).toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono text-sm text-on-surface-variant">{l.moneda} {Number(l.neto||0).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <Pill color={l.estado === "PROCESADA" ? "bg-ok" : l.estado === "PENDIENTE" ? "bg-tertiary-container" : l.estado === "RETENIDO" ? "bg-error-container" : "bg-outline"}>{l.estado}</Pill>
                  {l.voucherUrl && (
                    <a href={l.voucherUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1 text-[10px] text-primary hover:underline">
                      <Icon n="receipt" className="text-[12px]" /> Voucher
                    </a>
                  )}
                  {l.observacion && <p className="text-[10px] text-on-surface-variant mt-1 max-w-[160px]" title={l.observacion}>{l.observacion}</p>}
                </td>
                <td className="px-6 py-4 text-right">
                  {l.estado === "PENDIENTE" && Number(l.neto) >= 0 && <button onClick={() => setProcesando(l)} className="text-primary text-xs font-medium hover:underline">Procesar</button>}
                  {l.estado === "PENDIENTE" && Number(l.neto) < 0 && <span className="text-[10px] text-error" title="Neto negativo: no se puede procesar hasta que el volumen del período cubra la comisión">neto negativo</span>}
                  {l.estado === "RETENIDO" && <span className="text-[10px] text-outline">{Number(l.neto) < 0 ? "neto negativo" : "bajo el mínimo"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {procesando && <ProcesarLiquidacionModal lote={procesando} onClose={() => setProcesando(null)} />}
    </div>
  );
}

function ProcesarLiquidacionModal({ lote, onClose }) {
  const [voucherUrl, setVoucherUrl] = useState("");
  const [voucherNombre, setVoucherNombre] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const subirVoucher = async (file) => {
    if (!file) return;
    setSubiendo(true);
    try {
      const path = `liquidaciones/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const url = await uploadArchivo("joi360-media", path, file);
      setVoucherUrl(url); setVoucherNombre(file.name);
    } catch (e) {
      notify("No se pudo subir el voucher: " + e.message, "error");
    } finally { setSubiendo(false); }
  };

  const confirmar = async () => {
    setGuardando(true);
    try {
      await marcarLiquidacion(lote.id, "PROCESADA", { voucherUrl: voucherUrl || null, voucherNombre: voucherNombre || null, observacion: observacion.trim() || null });
      notify(`Lote ${lote.id.slice(0, 10)} marcado como procesado. ${lote.mundoNombre} · S/ ${lote.comision}`);
      onClose();
    } catch (e) {
      notify(`No se pudo marcar el lote: ${e.message}`, "error");
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        {!confirmando ? (
          <>
            <h3 className="text-lg font-bold mb-1">Procesar liquidación</h3>
            <p className="text-xs text-on-surface-variant mb-4">{lote.mundoNombre} · Neto a depositar {lote.moneda} {Number(lote.neto||0).toLocaleString()}</p>

            <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">Voucher / comprobante de depósito</label>
            {voucherUrl ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-ok/50 bg-ok/5 mb-4">
                <Icon n="task" className="text-ok text-[18px]" />
                <span className="text-sm flex-1 truncate">{voucherNombre}</span>
                <a href={voucherUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">Ver</a>
                <button onClick={() => { setVoucherUrl(""); setVoucherNombre(""); }} className="text-[11px] text-error hover:underline">Quitar</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-outline-variant cursor-pointer hover:border-primary/40 mb-4">
                <Icon n="upload_file" className="text-[18px] text-outline" />
                <span className="text-sm text-on-surface-variant flex-1">{subiendo ? "Subiendo…" : "Adjuntar foto del voucher"}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={subiendo} onChange={e => subirVoucher(e.target.files?.[0])} />
              </label>
            )}

            <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mb-1.5">Observación (opcional)</label>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={3}
              placeholder='Ej. "Se depositó S/ 45.00 en vez de S/ 45.05 — el céntimo no es depositable, queda como diferencia registrada."'
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
            <p className="text-[10px] text-on-surface-variant italic mb-5">Úsalo para registrar cualquier diferencia entre el monto calculado y el realmente depositado, para que el mundo la vea en su Liquidación.</p>

            <div className="flex justify-end gap-3">
              <BtnOutline onClick={onClose}>Cancelar</BtnOutline>
              <BtnPrimary onClick={() => setConfirmando(true)}>Continuar</BtnPrimary>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Icon n="warning" className="text-tertiary text-[22px]" />
              <h3 className="text-lg font-bold">¿Confirmar procesamiento?</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Estás a punto de registrar esta liquidación como <b>procesada</b> para <b>{lote.mundoNombre}</b> por un neto de <b>{lote.moneda} {Number(lote.neto||0).toLocaleString()}</b>.
              {voucherUrl ? " Con voucher adjunto" : " Sin voucher adjunto"}{observacion ? " y con una observación registrada." : "."} Verifica que toda la información sea correcta — esta acción no se puede deshacer desde aquí.
            </p>
            <div className="flex justify-end gap-3">
              <BtnOutline onClick={() => setConfirmando(false)} disabled={guardando}>Volver</BtnOutline>
              <BtnPrimary onClick={confirmar} disabled={guardando}>{guardando ? "Registrando…" : "Sí, registrar liquidación"}</BtnPrimary>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, icon, error }) {
  return (
    <div className={`bg-surface-container-lowest border ${error ? "border-error/40" : "border-outline-variant"} p-5 rounded-xl hover:border-primary transition-colors`}>
      <div className="flex justify-between mb-2">
        <span className="font-mono text-[10px] uppercase text-outline">{label}</span>
        <Icon n={icon} className={`text-[20px] ${error ? "text-error" : "text-primary"}`} />
      </div>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}
