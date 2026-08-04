/**
 * App Operador — shell móvil dentro de joi360-admin (Gantt #42-#45).
 * Decisión de arquitectura confirmada 27-jul: no es un deploy separado, es una
 * ruta /operador/:comercioId mobile-first que reusa la sesión de merchant y el
 * backend ya existentes. Selector de modo: Venta QR / Confirmar Reserva /
 * Solicitud BNPL / Control de Accesos.
 */
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "./hooks";
import { merchantLogout, rubroNombre } from "./store";
import { Icon, BtnPrimary, BtnOutline, notify, inputCls } from "./ui";
import { MerchantGate, CobrarPanel, bnplLimitesDelMundo } from "./Fronts.jsx";
import {
  fetchAccesosMundo, registrarAccesoRemote, buscarWalletPorCodigo,
  errorControlado, logErrorControlado, fetchProgramaBNPL, fetchProductsRemote,
  crearSolicitudBNPLDesdeOperador, updateContratoBNPL,
  buscarNfcBandPorCodigo, vincularNfcBandRemote,
  fetchReservasMenuMerchant, marcarMenuReservaEntregadaRemote,
} from "./supabase.js";

export function OperadorApp() {
  const { comercioId } = useParams();
  const st = useStore();
  const comercio = (st.comercios || []).find(x => x.id === comercioId);
  if (!comercio) return <div className="min-h-screen flex items-center justify-center bg-surface-bright"><p className="text-on-surface-variant">Comercio no encontrado.</p></div>;
  const m = (st.mundos || []).find(x => x.id === comercio.mundoId);
  const sess = st.merchantSession?.comercioId === comercioId;
  if (!sess) return <MerchantGate comercio={comercio} m={m} />;
  return <OperadorShell comercio={comercio} m={m} />;
}

const MODOS = [
  { id: "qr", nombre: "Venta QR", icon: "qr_code_scanner", desc: "Cobrar identificando al cliente por su código JOI." },
  { id: "bnpl", nombre: "Solicitud BNPL", icon: "calendar_clock", desc: "Financiar una compra en el punto de venta." },
  { id: "accesos", nombre: "Control de Accesos", icon: "door_open", desc: "Registrar entrada o salida por código." },
  { id: "reserva", nombre: "Confirmar Reserva", icon: "event_available", desc: "Cerrar el cobro del saldo de una reserva." },
  { id: "menu", nombre: "Entregar Menú", icon: "restaurant", desc: "Marcar como entregadas las reservas de menú de hoy, ya pagadas." },
  { id: "bandita", nombre: "Vincular Pulsera NFC", icon: "sensors", desc: "Asociar una pulsera física a la cuenta de un usuario." },
];

function OperadorShell({ comercio, m }) {
  const [modo, setModo] = useState(null);
  const bnplOn = !!bnplLimitesDelMundo(m);
  const accesosOn = (m?.modulos || []).some(x => x.id === "accesos" && x.enabled);
  const menuOn = (m?.modulos || []).some(x => x.id === "menu" && x.enabled);
  const walletMod = (m?.modulos || []).find(x => x.id === "wallet" && x.enabled);
  // usaPulseraNfc por defecto true: mundos configurados antes de este campo
  // siguen viendo el tile, igual que ya asumía el backend del POS nativo.
  const banditaOn = !!walletMod && walletMod.config?.usaPulseraNfc !== false;

  const disponibles = MODOS.filter(md => {
    if (md.id === "bnpl") return bnplOn;
    if (md.id === "accesos") return accesosOn;
    if (md.id === "menu") return menuOn;
    if (md.id === "bandita") return banditaOn;
    return true;
  });

  return (
    <div className="min-h-screen bg-surface-bright">
      <header className="bg-surface-container-lowest border-b border-outline-variant px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          {modo && (
            <button onClick={() => setModo(null)} className="p-1 -ml-1 rounded hover:bg-surface-container flex-shrink-0">
              <Icon n="arrow_back" className="text-[20px]" />
            </button>
          )}
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{modo ? MODOS.find(md => md.id === modo)?.nombre : comercio.nombre}</p>
            <p className="font-mono text-[9px] text-on-surface-variant uppercase truncate">{modo ? comercio.nombre : rubroNombre(comercio.rubro)}</p>
          </div>
        </div>
        <button onClick={() => { merchantLogout(); notify("Sesión cerrada.", "info"); }} className="p-1.5 rounded hover:bg-surface-container flex-shrink-0">
          <Icon n="logout" className="text-[18px] text-on-surface-variant" />
        </button>
      </header>

      <div className="max-w-md mx-auto p-4">
        {!modo && (
          <div className="space-y-3">
            {disponibles.map(md => (
              <button key={md.id} onClick={() => setModo(md.id)}
                className="w-full flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl text-left hover:border-primary/40 tap-active transition-colors">
                <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center flex-shrink-0">
                  <Icon n={md.icon} className="text-primary text-[22px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{md.nombre}</p>
                  <p className="text-xs text-on-surface-variant">{md.desc}</p>
                </div>
                <Icon n="chevron_right" className="text-outline text-[20px] flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        {modo === "qr" && <CobrarPanel comercio={comercio} m={m} />}
        {modo === "bnpl" && <SolicitudBNPLOperador comercio={comercio} m={m} />}
        {modo === "accesos" && <AccesosOperador comercio={comercio} m={m} />}
        {modo === "bandita" && <VincularBanditaOperador comercio={comercio} m={m} />}
        {modo === "menu" && <EntregarMenuOperador comercio={comercio} m={m} />}
        {modo === "reserva" && <ReservaProximamente />}
      </div>
    </div>
  );
}

// ── Confirmar Reserva: honesto, no simulado — el motor de Reservas grande
// (zonas/canchas/espacios) sigue en MODULOS_PROXIMAMENTE, sin código real. ──
function ReservaProximamente() {
  return (
    <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
      <Icon n="event_busy" className="text-[48px] text-outline mb-3 block mx-auto" />
      <p className="font-bold text-on-surface mb-1">Próximamente</p>
      <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
        El motor de Reservas de zonas/canchas/espacios todavía no existe — es un capítulo del Backlog, distinto del micro-reserva de Menú del Caso Raimondi (ese sí es real). No hay ninguna reserva que confirmar aquí todavía.
      </p>
    </div>
  );
}

// ── Solicitud BNPL en Punto de Venta ────────────────────────────────────
function SolicitudBNPLOperador({ comercio, m }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const limites = bnplLimitesDelMundo(m);
  const [prog, setProg] = useState(null); // null=cargando, undefined=sin programa
  const [productos, setProductos] = useState([]);
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [cuotasSel, setCuotasSel] = useState(null);
  const [solicitud, setSolicitud] = useState(null); // {id, estado}
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    fetchProgramaBNPL(m.id, merchantId).then(rows => {
      const r = rows?.[0];
      setProg(r?.activo ? r : undefined);
    }).catch(() => setProg(undefined));
    fetchProductsRemote(merchantId).then(rows => setProductos((rows || []).filter(p => p.active))).catch(() => {});
  }, [m.id, merchantId]);

  const productosFinanciables = () => {
    if (!prog) return [];
    if (prog.alcance === "catalogo") return productos.map(p => ({ id: p.id, nombre: p.name, precio: +p.price }));
    if (prog.alcance === "categorias") return productos.filter(p => (prog.categorias || []).includes(p.category)).map(p => ({ id: p.id, nombre: p.name, precio: +p.price }));
    return prog.productos_financiables || [];
  };

  const identificar = async () => {
    if (!codigo.trim()) return;
    setBuscando(true); setNotFound(false); setCliente(null);
    try {
      const w = await buscarWalletPorCodigo(codigo, m.id);
      if (w) setCliente(w);
      else {
        const err = await errorControlado("wallet_no_encontrada");
        logErrorControlado("wallet_no_encontrada", `operador-bnpl:${merchantId}`, m.id);
        setNotFound([err.mensaje, err.accion].filter(Boolean).join(" "));
      }
    } finally { setBuscando(false); }
  };

  const cuotasDisponibles = (prog?.cuotas_activas || []).filter(n => (limites?.cuotas || []).includes(n));
  const INTERES = { 3: 0, 6: 0.18, 12: 0.24 };

  const cronogramaDe = (monto, cuotas, diasGracia, frecuencia) => {
    const interes = INTERES[cuotas] ?? 0.24;
    const cuotaMonto = +((monto * (1 + interes)) / cuotas).toFixed(2);
    const base = new Date();
    base.setDate(base.getDate() + (diasGracia || 0));
    const pasoDias = frecuencia === "semanal" ? 7 : frecuencia === "quincenal" ? 15 : null;
    return Array.from({ length: cuotas }, (_, i) => {
      const f = new Date(base);
      if (pasoDias) f.setDate(f.getDate() + pasoDias * (i + 1)); else f.setMonth(f.getMonth() + i + 1);
      return { n: i + 1, fecha: f.toISOString().slice(0, 10), monto: cuotaMonto, estado: "pendiente" };
    });
  };

  const solicitar = async () => {
    if (!productoSel || !cuotasSel || !cliente) return;
    setBusy(true);
    try {
      const diasGracia = prog.dias_gracia != null ? prog.dias_gracia : (limites?.diasGracia || 5);
      const frecuencia = prog.frecuencia || "mensual";
      const cron = cronogramaDe(productoSel.precio, cuotasSel, diasGracia, frecuencia);
      const estadoInicial = limites?.sinEvaluacion ? "aprobado" : "pendiente_aprobacion";
      const row = await crearSolicitudBNPLDesdeOperador({
        world_id: m.id, merchant_id: merchantId, merchant_nombre: comercio.nombre,
        user_id: cliente.user_id, producto: productoSel.nombre, monto: productoSel.precio,
        cuotas: cuotasSel, dias_gracia: diasGracia, interes_pct: (INTERES[cuotasSel] ?? 0.24) * 100,
        gestion_mora: prog.gestion_mora || "sin_cargo_suspension", frecuencia,
        primer_venc: (cron[1] || cron[0]).fecha, cronograma: cron, estado: estadoInicial,
      });
      setSolicitud({ id: row?.id, estado: estadoInicial, cron });
      notify(estadoInicial === "aprobado" ? "Solicitud aprobada — cobra la 1ra cuota para firmar." : "Solicitud enviada — quedó en tu bandeja de Solicitudes BNPL para aprobar.");
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `operador-bnpl:${merchantId}`, m.id);
      notify(err.mensaje, "error");
    } finally { setBusy(false); }
  };

  const cobrarPrimeraCuota = async () => {
    setBusy(true);
    try {
      const cron = solicitud.cron.map((q, i) => i === 0 ? { ...q, estado: "pagada" } : q);
      await updateContratoBNPL(solicitud.id, { cronograma: cron, estado: "firmado" });
      setSolicitud({ ...solicitud, estado: "firmado" });
      notify("Cuota 1 cobrada — contrato firmado.");
    } finally { setBusy(false); }
  };

  if (!limites) return (
    <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
      <Icon n="calendar_clock" className="text-[48px] text-outline mb-3 block mx-auto" />
      <p className="text-sm text-on-surface-variant">El mundo {m?.nombre} no habilita BNPL.</p>
    </div>
  );
  if (prog === null) return <p className="text-sm text-on-surface-variant py-8 text-center">Cargando programa…</p>;
  if (!prog) return (
    <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
      <Icon n="block" className="text-[48px] text-outline mb-3 block mx-auto" />
      <p className="text-sm text-on-surface-variant">Este comercio no tiene un programa BNPL activo.</p>
    </div>
  );

  if (solicitud) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 text-center">
        <Icon n={solicitud.estado === "firmado" ? "verified" : solicitud.estado === "aprobado" ? "task_alt" : "hourglass_top"} className="text-[40px] text-primary mb-2 block mx-auto" />
        <p className="font-bold mb-1">
          {solicitud.estado === "firmado" ? "Contrato firmado" : solicitud.estado === "aprobado" ? "Aprobada — falta cobrar la 1ra cuota" : "Pendiente de aprobación"}
        </p>
        <p className="text-xs text-on-surface-variant mb-4">{productoSel?.nombre} · {cuotasSel}x</p>
        {solicitud.estado === "aprobado" && (
          <BtnPrimary onClick={cobrarPrimeraCuota} disabled={busy} className="w-full">
            <Icon n="point_of_sale" className="text-[18px]" /> {busy ? "Cobrando…" : `Cobrar 1ra cuota y firmar`}
          </BtnPrimary>
        )}
        {solicitud.estado !== "firmado" && solicitud.estado !== "aprobado" && (
          <BtnOutline onClick={() => { setSolicitud(null); setCliente(null); setCodigo(""); setProductoSel(null); setCuotasSel(null); }} className="w-full">
            Nueva solicitud
          </BtnOutline>
        )}
        {solicitud.estado === "firmado" && (
          <BtnOutline onClick={() => { setSolicitud(null); setCliente(null); setCodigo(""); setProductoSel(null); setCuotasSel(null); }} className="w-full">
            Nueva solicitud
          </BtnOutline>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 1 · Identificar al cliente</p>
        <div className="flex gap-2">
          <input className={`${inputCls} font-mono`} placeholder="Código JOI" value={codigo} onChange={e => setCodigo(e.target.value)} disabled={!!cliente} onKeyDown={e => e.key === "Enter" && identificar()} />
          {!cliente ? (
            <BtnPrimary disabled={!codigo.trim() || buscando} onClick={identificar}><Icon n="search" className="text-[16px]" /></BtnPrimary>
          ) : (
            <BtnOutline onClick={() => { setCliente(null); setCodigo(""); }}><Icon n="close" className="text-[16px]" /></BtnOutline>
          )}
        </div>
        {notFound && <p className="text-xs text-error mt-2">{notFound}</p>}
      </div>
      {cliente && (
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 2 · Producto</p>
          <div className="flex flex-wrap gap-2">
            {productosFinanciables().length === 0 && <p className="text-xs text-on-surface-variant">Sin productos financiables definidos.</p>}
            {productosFinanciables().map((p, i) => (
              <button key={p.id || i} onClick={() => { setProductoSel(p); setCuotasSel(null); }}
                className={`px-3 py-2 rounded-xl border text-xs text-left ${productoSel?.id === p.id ? "border-primary bg-primary-fixed" : "border-outline-variant"}`}>
                <p className="font-bold">{p.nombre}</p>
                <p className="text-outline">S/ {Number(p.precio).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {productoSel && (
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 3 · Cuotas</p>
          <div className="flex gap-2">
            {cuotasDisponibles.map(n => (
              <button key={n} onClick={() => setCuotasSel(n)}
                className={`flex-1 py-2 rounded-xl border text-center ${cuotasSel === n ? "border-primary bg-primary-fixed" : "border-outline-variant"}`}>
                <p className="font-bold text-sm">{n}x</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {cuotasSel && (
        <BtnPrimary onClick={solicitar} disabled={busy} className="w-full">
          <Icon n="send" className="text-[16px]" /> {busy ? "Enviando…" : "Iniciar solicitud"}
        </BtnPrimary>
      )}
    </div>
  );
}

// ── Control de Accesos, mobile — mismo mecanismo que TabAccesos
// (MundoDetail.jsx), scoped al mundo de este comercio. ──────────────────
export function AccesosOperador({ comercio, m }) {
  const zonas = (m?.modulos || []).find(x => x.id === "accesos")?.config?.zonas?.split(",").map(z => z.trim()).filter(Boolean) || ["Principal"];
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState("entrada");
  const [zona, setZona] = useState(zonas[0]);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [log, setLog] = useState(null);

  const cargar = () => fetchAccesosMundo(m.id).then(r => setLog((r || []).slice(0, 8))).catch(() => setLog([]));
  React.useEffect(() => { cargar(); }, [m.id]);

  const registrar = async () => {
    const code = codigo.trim();
    if (!code) return;
    setBusy(true); setResultado(null);
    try {
      const w = await buscarWalletPorCodigo(code, m.id);
      if (!w) {
        const err = await errorControlado("wallet_no_encontrada");
        logErrorControlado("wallet_no_encontrada", `operador-accesos:${m.id}`, m.id);
        setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
        return;
      }
      await registrarAccesoRemote(m.id, w.user_id, tipo, zona);
      setResultado({ ok: true, mensaje: `${tipo === "entrada" ? "Entrada" : "Salida"} registrada.` });
      setCodigo(""); cargar();
    } catch (e) {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `operador-accesos:${m.id}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-3">
        <input className={`${inputCls} font-mono`} placeholder="Código JOI (QR o pulsera)" value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => e.key === "Enter" && registrar()} />
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
          <select className={inputCls} value={zona} onChange={e => setZona(e.target.value)}>
            {zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <BtnPrimary onClick={registrar} disabled={!codigo.trim() || busy} className="w-full">
          <Icon n="door_open" className="text-[18px]" /> {busy ? "Registrando…" : "Registrar"}
        </BtnPrimary>
        {resultado && (
          <p className={`text-sm flex items-center gap-1.5 ${resultado.ok ? "text-ok" : "text-error"}`}>
            <Icon n={resultado.ok ? "check_circle" : "error"} className="text-[16px]" />{resultado.mensaje}
          </p>
        )}
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
        <p className="px-4 py-3 border-b border-outline-variant font-mono text-[10px] uppercase text-outline">Últimos registros</p>
        {log === null ? (
          <p className="px-4 py-4 text-xs text-on-surface-variant">Cargando…</p>
        ) : log.length === 0 ? (
          <p className="px-4 py-4 text-xs text-on-surface-variant">Sin registros todavía.</p>
        ) : (
          <div className="divide-y divide-outline-variant/60">
            {log.map(l => (
              <div key={l.id} className="px-4 py-2.5 flex justify-between items-center text-xs">
                <span className="font-mono text-outline">{l.user_id.slice(0, 10)}…</span>
                <span className={l.tipo === "entrada" ? "text-ok font-bold" : "text-outline font-bold"}>{l.tipo.toUpperCase()}</span>
                <span className="text-on-surface-variant">{new Date(l.created_at).toLocaleTimeString("es-PE")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vincular Pulsera NFC (Task #118) — hasta ahora la única forma de atar
// una bandita física a un usuario era editando Supabase a mano; esto le da
// al operador del POS (que es quien tiene la pulsera y al usuario en frente)
// un flujo real de 2 pasos: identificar al usuario por su código JOI, leer
// el código de la pulsera física, confirmar. ────────────────────────────────
export function VincularBanditaOperador({ comercio, m }) {
  const vigenciaMeses = (m?.modulos || []).find(x => x.id === "wallet")?.config?.vigenciaBanditasMeses ?? null;
  const [codigoUsuario, setCodigoUsuario] = useState("");
  const [wallet, setWallet] = useState(null);
  const [codigoBandita, setCodigoBandita] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState(null);

  const identificar = async () => {
    const code = codigoUsuario.trim();
    if (!code) return;
    setBuscando(true); setResultado(null);
    try {
      const w = await buscarWalletPorCodigo(code, m.id);
      if (!w) { setResultado({ ok: false, mensaje: "No se encontró ningún usuario con ese código JOI en este mundo." }); return; }
      setWallet(w);
    } catch {
      setResultado({ ok: false, mensaje: "No se pudo buscar el código. Intenta de nuevo." });
    } finally { setBuscando(false); }
  };

  const vincular = async () => {
    const code = codigoBandita.trim();
    if (!code || !wallet) return;
    setBusy(true); setResultado(null);
    try {
      const band = await buscarNfcBandPorCodigo(code, m.id);
      if (!band) { setResultado({ ok: false, mensaje: `No se encontró la pulsera con UID "${code.toUpperCase()}" asignada a este mundo. Verifica que ese UID exista en el inventario de Banditas NFC.` }); return; }
      if (band.linked_user_id) {
        setResultado({ ok: false, mensaje: band.linked_user_id === wallet.user_id ? "Esta pulsera ya está vinculada a este mismo usuario." : "Esta pulsera ya está vinculada a otro usuario." });
        return;
      }
      if (band.estado !== "asignada") { setResultado({ ok: false, mensaje: `Esta pulsera está en estado "${band.estado}", no está lista para vincular.` }); return; }
      await vincularNfcBandRemote(band.id, wallet.user_id, vigenciaMeses, m.id);
      setResultado({ ok: true, mensaje: `Pulsera ${band.codigo} vinculada correctamente.` });
      setCodigoBandita("");
    } catch {
      setResultado({ ok: false, mensaje: "No se pudo vincular la pulsera. Intenta de nuevo." });
    } finally { setBusy(false); }
  };

  const reiniciar = () => { setWallet(null); setCodigoUsuario(""); setCodigoBandita(""); setResultado(null); };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 1 · Identificar al usuario</p>
        <div className="flex gap-2">
          <input className={`${inputCls} font-mono`} placeholder="Código JOI del usuario" value={codigoUsuario} onChange={e => setCodigoUsuario(e.target.value)} disabled={!!wallet} onKeyDown={e => e.key === "Enter" && identificar()} />
          {!wallet ? (
            <BtnPrimary disabled={!codigoUsuario.trim() || buscando} onClick={identificar}><Icon n="search" className="text-[16px]" /></BtnPrimary>
          ) : (
            <BtnOutline onClick={reiniciar}><Icon n="close" className="text-[16px]" /></BtnOutline>
          )}
        </div>
      </div>
      {wallet && (
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 2 · Código de la pulsera</p>
          <div className="flex gap-2">
            <input className={`${inputCls} font-mono`} placeholder="Código impreso o escaneado (NFC-...)" value={codigoBandita} onChange={e => setCodigoBandita(e.target.value)} onKeyDown={e => e.key === "Enter" && vincular()} autoFocus />
          </div>
          <p className="text-[10px] text-outline mt-1.5">O escanea con el lector NFC del POS — el código se completa solo.</p>
          <BtnPrimary onClick={vincular} disabled={!codigoBandita.trim() || busy} className="w-full mt-3">
            <Icon n="sensors" className="text-[18px]" /> {busy ? "Vinculando…" : "Vincular pulsera"}
          </BtnPrimary>
        </div>
      )}
      {resultado && (
        <p className={`text-sm flex items-center gap-1.5 ${resultado.ok ? "text-ok" : "text-error"}`}>
          <Icon n={resultado.ok ? "check_circle" : "error"} className="text-[16px]" />{resultado.mensaje}
        </p>
      )}
    </div>
  );
}

// ── Entregar Menú — el cobro de una reserva de menú YA ocurre en la app
// (crearReservaMenu debita la wallet al confirmar), lo que faltaba era la
// acción física en el POS que cierra el círculo: el concesionario marca la
// reserva pagada como entregada al momento de dar el plato, mismo patrón que
// "Validar entrada" en Eventos (algo ya pagado se consume, no se vuelve a
// cobrar). No valida turno de caja porque acá no se mueve dinero.
export function EntregarMenuOperador({ comercio, m }) {
  const merchantId = comercio.supabaseId || comercio.id;
  const hoy = new Date().toISOString().slice(0, 10);
  const [reservas, setReservas] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const cargar = () => fetchReservasMenuMerchant(merchantId, hoy).then(setReservas).catch(() => setReservas([]));
  React.useEffect(() => { cargar(); }, [merchantId]);

  const entregar = async (r) => {
    setBusyId(r.id);
    try {
      await marcarMenuReservaEntregadaRemote(r.id);
      notify(`Reserva de ${r.beneficiario_nombre || "usuario"} marcada como entregada.`);
      cargar();
    } catch {
      notify("No se pudo marcar como entregada. Intenta de nuevo.", "error");
    } finally { setBusyId(null); }
  };

  if (reservas === null) return <p className="text-sm text-on-surface-variant py-8 text-center">Cargando reservas de hoy…</p>;

  const pendientes = reservas.filter(r => r.estado === "CONFIRMADA");
  const entregadas = reservas.filter(r => r.estado === "ENTREGADA");

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase text-outline mb-2">Por entregar hoy ({pendientes.length})</p>
        {pendientes.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-outline-variant rounded-xl">
            <Icon n="restaurant" className="text-[36px] text-outline mb-2 block mx-auto" />
            <p className="text-sm text-on-surface-variant">Sin reservas pendientes de entrega hoy.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map(r => (
              <div key={r.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{r.beneficiario_nombre || "Usuario"}</p>
                    <p className="text-xs text-on-surface-variant">{(r.items || []).map(it => `${it.cantidad}× ${it.nombre}`).join(", ")}</p>
                  </div>
                  <p className="font-mono text-xs font-bold flex-shrink-0">S/ {Number(r.monto).toFixed(2)}</p>
                </div>
                <BtnPrimary onClick={() => entregar(r)} disabled={busyId === r.id} className="w-full mt-2 !py-1.5 !text-xs">
                  <Icon n="check_circle" className="text-[16px]" /> {busyId === r.id ? "Marcando…" : "Marcar entregado"}
                </BtnPrimary>
              </div>
            ))}
          </div>
        )}
      </div>
      {entregadas.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Ya entregadas hoy ({entregadas.length})</p>
          <div className="space-y-1.5">
            {entregadas.map(r => (
              <div key={r.id} className="flex justify-between items-center px-3 py-2 bg-surface-container-lowest/60 rounded-lg text-xs">
                <span className="truncate">{r.beneficiario_nombre || "Usuario"}</span>
                <span className="text-ok font-bold flex items-center gap-1"><Icon n="check_circle" className="text-[14px]" /> Entregado</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
