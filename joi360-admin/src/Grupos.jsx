import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "./hooks";
import { Icon, Pill, Drawer, BtnPrimary, BtnOutline, Field, inputCls, notify } from "./ui";
import { fetchGruposRemote, crearGrupoRemote, actualizarGrupoRemote, verificarBloqueoEliminarGrupo, eliminarGrupoRemote, uploadArchivo } from "./supabase.js";

const BANCOS_PE = ["BCP", "BBVA", "Interbank", "Scotiabank", "Banco de la Nación", "Otro"];

const blank = {
  nombre: "", logoUrl: "", emisor: "JetCash", adquirente: "redpontis",
  adquirenteBanco: BANCOS_PE[0], adquirenteCuenta: "", adquirenteCci: "", adquirenteTitular: "",
  tipoWallet: "regular",
};

/**
 * Grupos y Sucursales (Task #229).
 *
 * Un Grupo es un cliente con varias sucursales que comparten identidad
 * financiera pero se ven como comunidades independientes en el superapp
 * (ej. Grupo Jockey Plaza → Jockey Plaza, Boulevard de Asia, El Outlet).
 * Acá se crea/edita el Grupo (marca + Emisor/Adquirente + tipo de wallet);
 * las sucursales mismas se crean con el wizard normal de Mundos, eligiendo
 * a qué Grupo pertenecen.
 */
export function Grupos() {
  const st = useStore();
  const [grupos, setGrupos] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // grupo id, o null = creando
  const [f, setF] = useState(blank);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [eliminando, setEliminando] = useState(null); // grupo | null
  const [bloqueoEliminar, setBloqueoEliminar] = useState(null);

  const cargar = () => fetchGruposRemote().then(r => setGrupos(r || [])).catch(() => setGrupos([]));
  useEffect(() => { cargar(); }, []);

  const sucursalesDe = grupoId => (st.mundos || []).filter(m => m.grupoId === grupoId);

  const abrirNuevo = () => { setF(blank); setEditando(null); setAbierto(true); };
  const abrirEditar = g => {
    setF({
      nombre: g.nombre, logoUrl: g.logo_url || "", emisor: g.emisor || "JetCash", adquirente: g.adquirente || "redpontis",
      adquirenteBanco: g.adquirente_banco || BANCOS_PE[0], adquirenteCuenta: g.adquirente_cuenta || "",
      adquirenteCci: g.adquirente_cci || "", adquirenteTitular: g.adquirente_titular || "",
      tipoWallet: g.tipo_wallet || "regular",
    });
    setEditando(g.id); setAbierto(true);
  };

  const subirLogo = async (file) => {
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const path = `grupos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      setF(prev => ({ ...prev, logoUrl: null })); // evita mostrar el logo viejo mientras sube
      const url = await uploadArchivo("joi360-media", path, file);
      setF(prev => ({ ...prev, logoUrl: url }));
    } catch (e) {
      notify("No se pudo subir el logo: " + e.message, "error");
    } finally { setSubiendoLogo(false); }
  };

  const guardar = async () => {
    if (!f.nombre.trim()) return;
    setGuardando(true);
    try {
      if (editando) { await actualizarGrupoRemote(editando, f); notify(`Grupo "${f.nombre}" actualizado.`); }
      else { await crearGrupoRemote(f); notify(`Grupo "${f.nombre}" creado — ya puedes ligarle sucursales desde Crear Mundo.`); }
      setAbierto(false);
      await cargar();
    } catch (e) {
      notify("No se pudo guardar el grupo: " + e.message, "error");
    } finally { setGuardando(false); }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    try {
      await eliminarGrupoRemote(eliminando.id);
      notify(`Grupo "${eliminando.nombre}" eliminado.`);
      setEliminando(null);
      await cargar();
    } catch (e) {
      notify("No se pudo eliminar: " + e.message, "error");
    }
  };

  const pedirEliminar = async (g) => {
    const check = await verificarBloqueoEliminarGrupo(g.id);
    if (check.sucursales.length > 0) { setBloqueoEliminar({ grupo: g, sucursales: check.sucursales }); return; }
    setEliminando(g);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
            <span>Comunidades</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Grupos y Sucursales</span>
          </div>
          <h1 className="text-3xl font-bold">Grupos y Sucursales</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">
            Un cliente con varias sucursales (ej. Jockey Plaza, Boulevard de Asia) que comparten Emisor/Adquirente y tipo de wallet,
            pero se ven como comunidades independientes en el superapp. Las sucursales se crean desde <b>Crear Mundo</b>, eligiendo el grupo.
          </p>
        </div>
        <BtnPrimary onClick={abrirNuevo}><Icon n="add" className="text-[18px]" /> Nuevo grupo</BtnPrimary>
      </div>

      {grupos === null ? (
        <p className="text-on-surface-variant py-8 text-center">Cargando…</p>
      ) : grupos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
          <Icon n="account_tree" className="text-[48px] text-outline mb-3 block mx-auto" />
          Sin grupos todavía. Créalos para clientes con más de una sucursal.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {grupos.map(g => {
            const sucursales = sucursalesDe(g.id);
            return (
              <div key={g.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-outline-variant flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center overflow-hidden flex-shrink-0">
                    {g.logo_url ? <img src={g.logo_url} alt="" className="w-full h-full object-cover" /> : <Icon n="account_tree" className="text-primary text-[22px]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{g.nombre}</p>
                    <p className="font-mono text-[10px] text-outline uppercase">{sucursales.length} sucursal{sucursales.length === 1 ? "" : "es"}</p>
                  </div>
                  <Pill color={g.tipo_wallet === "gift_card" ? "bg-tertiary-container" : "bg-primary-fixed text-primary"}>{g.tipo_wallet === "gift_card" ? "Gift card" : "Wallet regular"}</Pill>
                </div>
                <div className="px-5 py-3 border-b border-outline-variant/60 text-xs text-on-surface-variant space-y-1">
                  <p><b>Emisor:</b> {g.emisor}</p>
                  <p><b>Adquirente:</b> {g.adquirente === "cuenta_propia" ? `Cuenta propia del cliente${g.adquirente_banco ? ` — ${g.adquirente_banco}` : ""}` : "RedPontis"}</p>
                </div>
                <div className="px-5 py-3 border-b border-outline-variant/60">
                  {sucursales.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">Sin sucursales ligadas — créalas desde Crear Mundo.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {sucursales.map(m => (
                        <Link key={m.id} to={`/admin/mundos/${m.id}`} className="text-[11px] px-2 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary font-medium flex items-center gap-1">
                          {m.nombre}
                          {m.compartesaldoGrupo && <Icon n="account_balance_wallet" className="text-[12px] text-ok" />}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <button onClick={() => pedirEliminar(g)} className="text-error text-xs font-medium hover:underline">Eliminar</button>
                  <button onClick={() => abrirEditar(g)} className="text-primary text-xs font-medium hover:underline">Editar →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={abierto} onClose={() => setAbierto(false)} icon="account_tree"
        title={editando ? "Editar grupo" : "Nuevo grupo"} subtitle="Marca + configuración financiera compartida"
        footer={<>
          <BtnOutline onClick={() => setAbierto(false)} disabled={guardando}>Cancelar</BtnOutline>
          <BtnPrimary onClick={guardar} disabled={!f.nombre.trim() || guardando} loading={guardando} loadingLabel="Guardando…">
            {editando ? "Guardar cambios" : "Crear grupo"}
          </BtnPrimary>
        </>}>
        <div className="space-y-4">
          <Field label="Nombre del grupo"><input className={inputCls} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Grupo Jockey Plaza" /></Field>
          <div>
            <label className="text-[10px] font-mono uppercase text-outline block mb-1.5">Logo del grupo</label>
            {f.logoUrl ? (
              <div className="flex items-center gap-2">
                <img src={f.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <button onClick={() => setF({ ...f, logoUrl: "" })} className="text-[11px] text-error hover:underline">Quitar</button>
              </div>
            ) : (
              <label className="text-[11px] text-primary font-semibold cursor-pointer hover:underline">
                {subiendoLogo ? "Subiendo…" : "Adjuntar logo"}
                <input type="file" accept="image/*" className="hidden" disabled={subiendoLogo} onChange={e => subirLogo(e.target.files?.[0])} />
              </label>
            )}
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <Icon n="account_balance" className="text-[16px] text-secondary" /> Emisor y Adquirente
            </p>
            <Field label="Emisor (quién emite la wallet)"><input className={inputCls} value={f.emisor} onChange={e => setF({ ...f, emisor: e.target.value })} placeholder="Ej. JetCash" /></Field>
            <div className="mt-3">
              <label className="text-[10px] font-mono uppercase text-outline block mb-1.5">Adquirente (quién recauda)</label>
              <div className="flex gap-2">
                {[["redpontis", "RedPontis"], ["cuenta_propia", "Cuenta propia del cliente"]].map(([v, l]) => (
                  <button key={v} onClick={() => setF({ ...f, adquirente: v })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border ${f.adquirente === v ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-on-surface-variant italic mt-1.5">
                {f.adquirente === "cuenta_propia"
                  ? "RedPontis calcula la dispersión por comercio; la cuenta EDE del cliente ejecuta las transferencias."
                  : "RedPontis recauda y liquida directamente a cada mundo, como hoy."}
              </p>
            </div>
            {f.adquirente === "cuenta_propia" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Banco">
                  <select className={inputCls} value={f.adquirenteBanco} onChange={e => setF({ ...f, adquirenteBanco: e.target.value })}>
                    {BANCOS_PE.map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Titular de la cuenta"><input className={inputCls} value={f.adquirenteTitular} onChange={e => setF({ ...f, adquirenteTitular: e.target.value })} /></Field>
                <Field label="Número de cuenta"><input className={`${inputCls} font-mono`} value={f.adquirenteCuenta} onChange={e => setF({ ...f, adquirenteCuenta: e.target.value.replace(/\D/g, "").slice(0, 14) })} /></Field>
                <Field label="CCI"><input className={`${inputCls} font-mono`} value={f.adquirenteCci} onChange={e => setF({ ...f, adquirenteCci: e.target.value.replace(/\D/g, "").slice(0, 20) })} /></Field>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-outline-variant/50">
            <label className="text-[10px] font-mono uppercase text-outline block mb-1.5">Tipo de producto de wallet</label>
            <div className="flex gap-2">
              {[["regular", "Wallet regular"], ["gift_card", "Gift card / prepago"]].map(([v, l]) => (
                <button key={v} onClick={() => setF({ ...f, tipoWallet: v })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border ${f.tipoWallet === v ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {bloqueoEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setBloqueoEliminar(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><Icon n="error" className="text-error text-[20px]" /> No se puede eliminar</h3>
            <p className="text-sm text-on-surface-variant mb-3">
              "{bloqueoEliminar.grupo.nombre}" todavía tiene sucursales ligadas. Desvincúlalas primero (Editar mundo → Grupo → Ninguno) antes de eliminar el grupo.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {bloqueoEliminar.sucursales.map(s => <span key={s.id} className="text-[11px] px-2 py-1 rounded-full bg-surface-container-low">{s.name}</span>)}
            </div>
            <BtnOutline className="w-full" onClick={() => setBloqueoEliminar(null)}>Cerrar</BtnOutline>
          </div>
        </div>
      )}

      {eliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setEliminando(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><Icon n="delete" className="text-error text-[20px]" /> ¿Eliminar "{eliminando.nombre}"?</h3>
            <p className="text-sm text-on-surface-variant mb-4">No tiene sucursales ligadas, así que es seguro. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <BtnOutline className="flex-1" onClick={() => setEliminando(null)}>Cancelar</BtnOutline>
              <BtnPrimary className="flex-1 !bg-error" onClick={confirmarEliminar}>Eliminar</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
