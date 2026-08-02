import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { promoVigente } from "./store";
import { Icon, Pill, BtnOutline, BtnPrimary, notify } from "./ui";

export function Anunciantes() {
  const st = useStore();
  const nav = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const filas = (st.anunciantes||[]).map(a => {
    const promos = (st.promos||[]).filter(p => p.anuncianteId === a.id);
    const vigentes = promos.filter(p => promoVigente(p) && p.estado !== "FINALIZADA" && p.estado !== "PAUSADA");
    const finalizadas = promos.filter(p => p.estado === "FINALIZADA" || p.hasta < today);
    return { a, promos, vigentes, finalizadas, activo: vigentes.length > 0 };
  });

  const copiar = (txt, label) => { navigator.clipboard?.writeText(txt); notify(`${label} copiado.`, "info"); };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Plataforma</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Anunciantes</span>
          </div>
          <h1 className="text-3xl font-bold">Anunciantes</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">Entidades legales que publican promociones puntuales en <b>Promos Redpontis</b> (no son mundos). Su panel dedicado vive durante la vigencia de su promo.</p>
        </div>
        <Link to="/admin/mundos/mundo-promos-rp" className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 flex items-center gap-2">
          <Icon n="add" className="text-[18px]" /> Crear promo (alta de anunciante en flujo)
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          ["Anunciantes registrados", (st.anunciantes||[]).length, "domain"],
          ["Con panel activo (vigencia)", filas.filter(f => f.activo).length, "verified"],
          ["Promos finalizadas (histórico)", filas.reduce((a, f) => a + f.finalizadas.length, 0), "history"],
        ].map(([t, v, ic]) => (
          <div key={t} className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl">
            <div className="flex justify-between mb-2"><span className="font-mono text-[10px] uppercase text-outline">{t}</span><Icon n={ic} className="text-primary text-[20px]" /></div>
            <p className="text-3xl font-black">{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-outline">
              <th className="px-6 py-3 font-medium">Anunciante</th>
              <th className="px-6 py-3 font-medium">Contacto</th>
              <th className="px-6 py-3 font-medium">Credenciales panel</th>
              <th className="px-6 py-3 font-medium">Promos</th>
              <th className="px-6 py-3 font-medium">Estado panel</th>
              <th className="px-6 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {filas.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-on-surface-variant">No hay anunciantes. Se crean al publicar promos sueltas.</td></tr>}
            {filas.map(({ a, promos, vigentes, finalizadas, activo }) => (
              <tr key={a.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-tertiary-container text-white flex items-center justify-center font-bold text-xs">{a.razonSocial.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="font-bold">{a.razonSocial}</p>
                      <p className="font-mono text-[10px] text-outline">RUC {a.ruc}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-on-surface-variant">
                  <p className="text-xs">{a.contacto}</p>
                  <p className="text-[10px] text-outline">{a.telefono}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant">
                      <button onClick={() => copiar(a.credenciales.usuario, "Usuario")} className="hover:text-primary truncate max-w-[180px]" title={a.credenciales.usuario}>{a.credenciales.usuario}</button>
                      <Icon n="content_copy" className="text-[12px] cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant">
                      <button onClick={() => copiar(a.credenciales.password, "Password")} className="hover:text-primary">{a.credenciales.password}</button>
                      <Icon n="content_copy" className="text-[12px] cursor-pointer" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs"><b>{vigentes.length}</b> vigentes · <span className="text-outline">{finalizadas.length} finalizadas</span></p>
                </td>
                <td className="px-6 py-4"><Pill color={activo ? "bg-ok" : "bg-outline"}>{activo ? "ACTIVO" : "INACTIVO"}</Pill></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/anunciante/${a.id}`, "_blank")} className="text-primary text-xs font-medium hover:underline">Abrir panel →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 bg-surface-container-low border border-outline-variant rounded-xl p-5 flex items-start gap-3">
        <Icon n="mark_email_read" className="text-secondary text-[24px]" />
        <div>
          <p className="font-semibold text-sm mb-1">Política de cierre (MVP)</p>
          <p className="text-xs text-on-surface-variant">Al finalizar la última promo vigente del anunciante, su panel se desactiva automáticamente y se envía un correo de conformidad con resumen de rendimiento. Si contrata otra promo, RedPontis la habilita y el panel vuelve a estar accesible.</p>
        </div>
      </div>
    </div>
  );
}
