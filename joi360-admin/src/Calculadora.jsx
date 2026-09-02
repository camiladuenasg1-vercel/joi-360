/**
 * Calculadora Comercial (Gantt #100) — documento de negociación unificado.
 * Antes: el simulador de tarifas vivía solo dentro de Acuerdo Comercial
 * (TabAcuerdo en MundoDetail), atado a UN monto fijo (venta de 100) y a los
 * defaults del mundo — sin ver el override real de un merchant específico,
 * y sin cruzar con BNPL/Eventos (cada término comercial vivía en su propia
 * pestaña, sin una vista consolidada). Esta pantalla junta las 3 fuentes
 * reales (comercios, bnpl_programa_comercio, eventosConfig) por mundo +
 * merchant, con un monto de venta editable.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "./hooks";
import { fetchMerchantsRemote, fetchProgramaBNPL } from "./supabase";
import { liquidacionConfigDe } from "./store";
import { Icon, Field, inputCls, notify } from "./ui";

export function Calculadora() {
  const st = useStore();
  const mundos = st.mundos || [];
  const [mundoId, setMundoId] = useState(mundos[0]?.id || "");
  const [merchants, setMerchants] = useState([]);
  const [merchantId, setMerchantId] = useState("");
  const [bnplPrograma, setBnplPrograma] = useState(null);
  const [monto, setMonto] = useState(100);
  const [loading, setLoading] = useState(false);

  const mundo = mundos.find(m => m.id === mundoId);
  const comerciosMod = (mundo?.modulos || []).find(x => x.id === "comercios");
  const bnplMod = (mundo?.modulos || []).find(x => x.id === "bnpl");
  const cfg = comerciosMod?.config || {};

  useEffect(() => {
    if (!mundoId) return;
    setMerchantId(""); setMerchants([]); setBnplPrograma(null);
    setLoading(true);
    fetchMerchantsRemote(mundoId).then(rows => setMerchants(rows || [])).finally(() => setLoading(false));
  }, [mundoId]);

  useEffect(() => {
    if (!mundoId || !merchantId) { setBnplPrograma(null); return; }
    if (!bnplMod?.enabled) return;
    fetchProgramaBNPL(mundoId, merchantId).then(rows => setBnplPrograma(rows?.[0] || null));
  }, [mundoId, merchantId, bnplMod?.enabled]);

  const merchant = merchants.find(x => x.id === merchantId);

  const mdr = merchant?.mdr_override ?? cfg.mdrDefault ?? 0;
  const fijo = merchant?.fixed_fee_override ?? cfg.fijoTxDefault ?? 0;
  const retencion = +cfg.retentionPercentage || 0;
  // Track A: la frecuencia que muestra este documento es la MISMA que aplica
  // el motor de corte (resuelta por precedencia), no la clave suelta que solo
  // leía la Calculadora. Y la retención de arriba ahora sí la descuenta el
  // corte real — este documento dejó de proyectar un neto que no ocurría.
  const frecuenciaReal = mundo ? liquidacionConfigDe(mundo).frecuencia : "—";
  const m = +monto || 0;

  const calc = useMemo(() => {
    const mdrMonto = m * mdr / 100;
    const liquidadoBruto = m - mdrMonto - fijo;
    const retencionMonto = liquidadoBruto * retencion / 100;
    const netoSponsor = liquidadoBruto - retencionMonto;
    return { mdrMonto, liquidadoBruto, retencionMonto, netoSponsor };
  }, [m, mdr, fijo, retencion]);

  const copiarResumen = () => {
    const lineas = [
      `DOCUMENTO DE NEGOCIACIÓN — ${mundo?.nombre || "—"}${merchant ? ` · ${merchant.name}` : " · (default del mundo)"}`,
      `Moneda: ${mundo?.moneda || "PEN"}`,
      ``,
      `— Comercios —`,
      `MDR: ${mdr}%  ·  Fijo por Tx: ${mundo?.moneda} ${(+fijo).toFixed(2)}${merchant ? " (override del merchant)" : " (default del mundo)"}`,
      `Modelo de recaudación: ${cfg.liquidacion_modeloRecaudacion === "mundo" ? "El Mundo recauda" : "RedPontis recauda"}`,
      `Frecuencia de liquidación: ${frecuenciaReal}`,
      `Retención RedPontis: ${retencion}%`,
      `Vigencia: ${cfg.validFrom || "—"} a ${cfg.validUntil || "indefinido"}`,
    ];
    if (bnplMod?.enabled && bnplPrograma) {
      lineas.push(``, `— BNPL —`,
        `Revenue share: ${bnplPrograma.revenue_share_pct}%  ·  Comisión: ${bnplPrograma.comision_pct}%`,
        `Cuotas activas: ${(bnplPrograma.cuotas_activas || []).join(", ")}x`,
        `Gestión de mora: ${bnplPrograma.gestion_mora || "—"}`,
        `Estado: ${bnplPrograma.activo ? "Activo" : "Inactivo"}`);
    }
    if (mundo?.eventosConfig?.embebidoActivo || (mundo?.modulos || []).some(x => x.id === "eventos" && x.enabled)) {
      lineas.push(``, `— Eventos —`, `Comisión por entrada: ${mundo?.eventosConfig?.comisionEntrada ?? 5}%`);
    }
    lineas.push(``, `— Simulación (venta ${mundo?.moneda} ${m.toFixed(2)}) —`,
      `Liquidado bruto al sponsor: ${mundo?.moneda} ${calc.liquidadoBruto.toFixed(2)}`,
      `Neto al sponsor: ${mundo?.moneda} ${calc.netoSponsor.toFixed(2)}`);
    navigator.clipboard?.writeText(lineas.join("\n"));
    notify("Resumen copiado al portapapeles.");
  };

  const eventosActivo = (mundo?.modulos || []).some(x => x.id === "eventos" && x.enabled) || mundo?.eventosConfig?.embebidoActivo;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
          <span className="text-primary">Ecosistema RedPontis</span>
          <span className="text-outline-variant">·</span>
          <span>Operaciones</span>
        </div>
        <h1 className="text-3xl font-bold">Calculadora Comercial</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl">
          Documento de negociación unificado por mundo y merchant — cruza Comercios, BNPL y Eventos en una sola vista,
          con simulador de liquidación a monto libre.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <div className="grid grid-cols-2 gap-4">
              <Field label={<StepLabel n={1} l="Elige el mundo" />}>
                <select className={inputCls} value={mundoId} onChange={e => setMundoId(e.target.value)}>
                  {mundos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </Field>
              <Field label={<StepLabel n={2} l="Merchant (opcional)" />} hint={loading ? "Cargando…" : undefined}>
                <select className={inputCls} value={merchantId} onChange={e => setMerchantId(e.target.value)} disabled={loading}>
                  <option value="">— Default del mundo —</option>
                  {merchants.map(mm => <option key={mm.id} value={mm.id}>{mm.name}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {!comerciosMod && (
            <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant text-center">
              <Icon n="handshake" className="text-[32px] text-on-surface-variant mb-2"/>
              <p className="text-sm text-on-surface-variant">Este mundo no tiene la capacidad Comercios activa — no hay acuerdo comercial que calcular.</p>
            </div>
          )}

          {comerciosMod && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-outline-variant text-on-surface flex items-center justify-center text-[9px] font-bold">3</span>
                Términos aplicados a esta simulación
              </p>
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                  <Icon n="storefront" className="text-[16px] text-primary"/> Comercios
                  {merchant && <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-primary-container text-primary">override de {merchant.name}</span>}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Param label="MDR" val={`${mdr}%`}/>
                  <Param label="Fijo por Tx" val={`${mundo?.moneda} ${(+fijo).toFixed(2)}`}/>
                  <Param label="Modelo recaudación" val={cfg.liquidacion_modeloRecaudacion === "mundo" ? "El Mundo" : "RedPontis"}/>
                  <Param label="Frecuencia" val={frecuenciaReal} capitalize/>
                  <Param label="Retención RP" val={`${retencion}%`}/>
                  <Param label="Vigente desde" val={cfg.validFrom || "—"}/>
                  <Param label="Vigente hasta" val={cfg.validUntil || "Indefinido"}/>
                </div>
              </div>

              {bnplMod?.enabled && (
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                    <Icon n="calendar_month" className="text-[16px] text-secondary"/> BNPL
                  </p>
                  {!merchantId && <p className="text-xs text-on-surface-variant">Elige un merchant para ver su programa BNPL.</p>}
                  {merchantId && !bnplPrograma && <p className="text-xs text-on-surface-variant">Este merchant no tiene programa BNPL activo.</p>}
                  {bnplPrograma && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <Param label="Revenue share" val={`${bnplPrograma.revenue_share_pct}%`}/>
                      <Param label="Comisión" val={`${bnplPrograma.comision_pct}%`}/>
                      <Param label="Cuotas activas" val={(bnplPrograma.cuotas_activas || []).join(", ") + "x"}/>
                      <Param label="Gestión de mora" val={bnplPrograma.gestion_mora === "sin_cargo_suspension" ? "Sin cargo · suspensión" : (bnplPrograma.gestion_mora || "—")}/>
                    </div>
                  )}
                </div>
              )}

              {eventosActivo && (
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                    <Icon n="confirmation_number" className="text-[16px] text-tertiary"/> Eventos
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Param label="Comisión por entrada" val={`${mundo?.eventosConfig?.comisionEntrada ?? 5}%`}/>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className="p-4 bg-primary-fixed/10 border border-primary/20 rounded-xl">
            <Field label={<StepLabel n={4} l={`Monto de venta a simular (${mundo?.moneda || "PEN"})`} />}>
              <input className={inputCls} type="number" min="0" step="1" value={monto} onChange={e => setMonto(e.target.value)}/>
            </Field>
            <div className="space-y-2 text-sm mt-4">
              <div className="flex justify-between"><span className="text-on-surface-variant">Venta bruta</span><span className="font-mono">{mundo?.moneda} {m.toFixed(2)}</span></div>
              <div className="flex justify-between text-error"><span className="text-on-surface-variant">− MDR ({mdr}%)</span><span className="font-mono">− {mundo?.moneda} {calc.mdrMonto.toFixed(2)}</span></div>
              <div className="flex justify-between text-error"><span className="text-on-surface-variant">− Fijo por Tx</span><span className="font-mono">− {mundo?.moneda} {(+fijo).toFixed(2)}</span></div>
              <div className="h-px bg-outline-variant my-2"/>
              <div className="flex justify-between font-semibold"><span>= Liquidado bruto</span><span className="font-mono">{mundo?.moneda} {calc.liquidadoBruto.toFixed(2)}</span></div>
              <div className="flex justify-between text-error"><span className="text-on-surface-variant">− Retención RP ({retencion}%)</span><span className="font-mono">− {mundo?.moneda} {calc.retencionMonto.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="p-5 bg-primary rounded-xl text-white shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/70 mb-1">Neto al sponsor</p>
            <p className="text-3xl font-bold tabular-nums">{mundo?.moneda} {calc.netoSponsor.toFixed(2)}</p>
          </div>
          <button onClick={copiarResumen} disabled={!comerciosMod}
            className="w-full py-2.5 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            <Icon n="content_copy" className="text-[16px]"/> Copiar documento de negociación
          </button>
        </div>
      </div>
    </div>
  );
}

function StepLabel({ n, l }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{n}</span>
      {l}
    </span>
  );
}

function Param({ label, val, capitalize }) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-2.5 border border-outline-variant/60">
      <p className="font-mono text-[9px] uppercase text-outline mb-0.5">{label}</p>
      <p className={`font-semibold text-on-surface ${capitalize ? "capitalize" : ""}`}>{val}</p>
    </div>
  );
}
