import React from "react";
import { useParams } from "react-router-dom";
import { useStore } from "./hooks";
import { MODULE_CATALOG } from "./store";

export function ContratoView() {
  const { id } = useParams();
  const st = useStore();
  const m = (st.mundos||[]).find(x => x.id === id);
  if (!m) return <div className="p-8">Mundo no encontrado.</div>;

  const ac = m.acuerdo || {};
  const mods = (m.modulos||[]).filter(x => x.enabled);
  const costoMensual = mods.reduce((a, mm) => a + (mm.acuerdo?.gratuito === false ? (mm.acuerdo?.fijoMensual || 0) : 0), 0);
  const setup = mods.reduce((a, mm) => a + (mm.acuerdo?.gratuito === false ? (mm.acuerdo?.setup || 0) : 0), 0);

  const today = new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 800, margin: "0 auto", padding: "40px 60px", lineHeight: 1.7, color: "#1C1C1E" }}>
      <style>{`@media print { body { margin: 0; } .no-print { display: none; } }`}</style>
      <div className="no-print" style={{ position: "fixed", top: 16, right: 16, display: "flex", gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: "8px 16px", background: "#1A3270", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          Imprimir / Guardar PDF
        </button>
        <button onClick={() => window.close()} style={{ padding: "8px 16px", background: "#F2F2F7", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          Cerrar
        </button>
      </div>

      <div style={{ textAlign: "center", marginBottom: 40, borderBottom: "3px solid #1A3270", paddingBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#8A8FA8", marginBottom: 8, fontFamily: "monospace" }}>REDPONTIS S.A.C. · CONTRATO DE SERVICIO JOI 360</div>
        <h1 style={{ fontSize: 22, fontWeight: "bold", margin: "8px 0", fontFamily: "Inter, sans-serif" }}>Propuesta de Acuerdo Comercial</h1>
        <div style={{ fontSize: 11, color: "#8A8FA8", fontFamily: "monospace" }}>VERSIÓN TENTATIVA · DOCUMENTO GENERADO EL {today.toUpperCase()}</div>
      </div>

      <table style={{ width: "100%", marginBottom: 32, borderCollapse: "collapse" }}>
        <tbody>
          {[
            ["Nombre del Mundo", m.nombre],
            ["Código del sistema", m.codigo],
            ["Vertical / sector", m.vertical],
            ["Entidad legal contratante", m.entidadLegal],
            ["RUC", m.ruc],
            ["Dirección fiscal", m.direccionLegal],
            ["Representante legal", m.apoderadoNombre || m.representanteLegal],
            ["Moneda de operación", m.moneda],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "6px 12px 6px 0", width: "40%", fontWeight: "bold", fontSize: 13, verticalAlign: "top", fontFamily: "Inter, sans-serif" }}>{k}</td>
              <td style={{ padding: "6px 0", fontSize: 13, borderBottom: "1px solid #EEF2FD" }}>{v || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, borderLeft: "4px solid #1A3270", paddingLeft: 12, marginBottom: 16, fontFamily: "Inter, sans-serif" }}>Tipo de acuerdo comercial</h2>
      <div style={{ background: "#F2F2F7", padding: "16px 20px", borderRadius: 8, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: "bold", textTransform: "uppercase", color: "#1A3270", letterSpacing: 1, fontFamily: "monospace", marginBottom: 8 }}>{ac.tipo || "Por definir"}</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {(ac.tipo === "transaccional" || ac.tipo === "mixto") && (
              <tr><td style={{ padding: "4px 0", fontSize: 13, width: "50%", fontFamily: "Inter, sans-serif" }}>Revenue share sobre volumen transaccional</td><td style={{ padding: "4px 0", fontSize: 13, fontWeight: "bold" }}>{ac.revShare || 0}%</td></tr>
            )}
            {(ac.tipo === "revenue" || ac.tipo === "mixto" || ac.tipo === "fijo") && (
              <tr><td style={{ padding: "4px 0", fontSize: 13, width: "50%", fontFamily: "Inter, sans-serif" }}>Cuota fija mensual</td><td style={{ padding: "4px 0", fontSize: 13, fontWeight: "bold" }}>S/ {ac.fijoMensual || 0}</td></tr>
            )}
            <tr><td style={{ padding: "4px 0", fontSize: 13 }}>Pago único de alta (setup)</td><td style={{ padding: "4px 0", fontSize: 13, fontWeight: "bold" }}>S/ {ac.setup || 0}</td></tr>
            <tr><td style={{ padding: "4px 0", fontSize: 13 }}>Vigencia del acuerdo</td><td style={{ padding: "4px 0", fontSize: 13, fontWeight: "bold" }}>{ac.vigencia || "Por definir"}</td></tr>
            <tr><td style={{ padding: "4px 0", fontSize: 13 }}>Corte de liquidación</td><td style={{ padding: "4px 0", fontSize: 13, fontWeight: "bold" }}>Diario a las 19:00 PE</td></tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 15, borderLeft: "4px solid #1A3270", paddingLeft: 12, marginBottom: 16, fontFamily: "Inter, sans-serif" }}>Módulos contratados ({mods.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#EEF2FD" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontFamily: "monospace", fontWeight: "bold" }}>MÓDULO</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontFamily: "monospace", fontWeight: "bold" }}>CATEGORÍA</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>CUOTA/MES</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>% TX</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>SETUP</th>
          </tr>
        </thead>
        <tbody>
          {mods.map(mm => {
            const cat = MODULE_CATALOG.find(c => c.id === mm.id);
            const ac2 = mm.acuerdo || {};
            const gratuito = ac2.gratuito !== false;
            return (
              <tr key={mm.id} style={{ borderBottom: "1px solid #EEF2FD" }}>
                <td style={{ padding: "7px 10px", fontFamily: "Inter, sans-serif" }}>{cat?.name || mm.id}</td>
                <td style={{ padding: "7px 10px", color: "#8A8FA8", fontFamily: "monospace", fontSize: 11 }}>{cat?.category}</td>
                {gratuito ? (
                  <td colSpan={3} style={{ padding: "7px 10px", textAlign: "right", color: "#0BA878", fontWeight: "bold", fontSize: 11 }}>GRATUITO POR EL MOMENTO</td>
                ) : (<>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>{ac2.fijoMensual ? `S/ ${ac2.fijoMensual}` : "—"}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>{ac2.porTx ? `${ac2.porTx}%` : "—"}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>{ac2.setup ? `S/ ${ac2.setup}` : "—"}</td>
                </>)}
              </tr>
            );
          })}
          <tr style={{ background: "#F2F2F7", fontWeight: "bold" }}>
            <td colSpan={2} style={{ padding: "8px 10px" }}>TOTAL CON PRICING ACTIVO (ajustable por negociación)</td>
            <td style={{ padding: "8px 10px", textAlign: "right" }}>S/ {costoMensual}</td>
            <td></td>
            <td style={{ padding: "8px 10px", textAlign: "right" }}>S/ {setup}</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, borderLeft: "4px solid #1A3270", paddingLeft: 12, marginBottom: 16, fontFamily: "Inter, sans-serif" }}>Términos y condiciones</h2>
      <div style={{ fontSize: 12, lineHeight: 1.8, color: "#404255" }}>
        {[
          "RedPontis S.A.C. (en adelante el Proveedor) se compromete a habilitar y mantener operativo el ecosistema JOI 360 para el Mundo descrito en este documento, bajo los parámetros técnicos y comerciales acordados.",
          "El Sponsor se compromete a brindar la información legal y operativa necesaria para la configuración del mundo, y a cumplir con los pagos establecidos en el acuerdo comercial dentro de los plazos definidos.",
          "Las liquidaciones se generarán automáticamente con corte diario a las 19:00 horas (hora Lima, PE). El Proveedor acreditará los montos netos según la frecuencia pactada.",
          "El Proveedor podrá suspender el servicio ante incumplimiento de pago con un aviso previo de 5 días hábiles. La reactivación estará sujeta a la regularización de la deuda más un cargo de reconexión.",
          "Cualquier modificación al acuerdo comercial deberá ser solicitada por escrito y aprobada por ambas partes con al menos 30 días de anticipación.",
          "Este documento es una propuesta tentativa. El contrato definitivo requerirá la firma de ambas partes y tendrá validez legal a partir de esa fecha.",
        ].map((t, i) => <p key={i} style={{ marginBottom: 10 }}><strong>{i + 1}.</strong> {t}</p>)}
      </div>

      <div style={{ marginTop: 60, display: "flex", justifyContent: "space-between", gap: 60 }}>
        <div style={{ flex: 1, textAlign: "center", borderTop: "1px solid #1C1C1E", paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: 1 }}>REDPONTIS S.A.C.</div>
          <div style={{ fontSize: 11, color: "#8A8FA8", marginTop: 4 }}>RUC 20999888777</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", borderTop: "1px solid #1C1C1E", paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: 1 }}>{m.entidadLegal?.toUpperCase() || "SPONSOR"}</div>
          <div style={{ fontSize: 11, color: "#8A8FA8", marginTop: 4 }}>RUC {m.ruc || "—"} · {m.apoderadoNombre || m.representanteLegal || "Representante Legal"}</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 40, fontSize: 10, color: "#CDD1E4", fontFamily: "monospace" }}>
        JOI 360 ECOSYSTEM · REDPONTIS S.A.C. · www.redpontis.com · DOCUMENTO TENTATIVO — NO TIENE VALIDEZ LEGAL HASTA SER FIRMADO
      </div>
    </div>
  );
}
