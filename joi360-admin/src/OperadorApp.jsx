/**
 * App Operador — shell móvil dentro de joi360-admin (Gantt #42-#45).
 * Decisión de arquitectura confirmada 27-jul: no es un deploy separado, es una
 * ruta /operador/:comercioId mobile-first que reusa la sesión de merchant y el
 * backend ya existentes. Selector de modo: Venta QR / Confirmar Reserva /
 * Solicitud BNPL / Control de Accesos.
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStore } from "./hooks";
import { merchantLogout, rubroNombre, update } from "./store";
import { Icon, BtnPrimary, BtnOutline, notify, inputCls } from "./ui";
import { MerchantGate, CobrarPanel, bnplLimitesDelMundo } from "./Fronts.jsx";
import {
  fetchAccesosMundo, registrarAccesoRemote, buscarWalletPorCodigo,
  errorControlado, logErrorControlado, fetchProgramaBNPL, fetchProductsRemote,
  crearSolicitudBNPLDesdeOperador, updateContratoBNPL,
  buscarNfcBandPorCodigo, vincularNfcBandRemote,
  fetchReservasMenuMerchant, marcarMenuReservaEntregadaRemote,
  fetchTurnoAbiertoRemote, iniciarTurnoRemote, cerrarTurnoRemote,
  verificarPinOperadorRemote,
} from "./supabase.js";

// Puerta de entrada genérica al POS (ruta /pos, sin id en la URL) — hasta
// ahora el operador de un comercio o de un mundo solo podía entrar con un
// link /operador/:comercioId o /operador-mundo/:worldId ya conocido; no
// había forma de "entrar desde cero" tipeando el código del comercio o del
// mundo, que es justo lo que un mostrador físico necesita. Usa la misma RPC
// verificar_pin_operador que MerchantGate/WorldGate — nunca compara el PIN
// en el cliente — y detecta sola si el código es de un comercio o de un mundo.
export function PosEntryGate() {
  const nav = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await verificarPinOperadorRemote(codigo.trim().toUpperCase(), pin);
      if (!r) { setErr("Código o PIN incorrecto."); return; }
      if (r.tipo === "comercio") {
        update(st => { st.merchantSession = { comercioId: r.id, usuario: null }; });
        nav(`/operador/${r.id}`);
      } else {
        update(st => { st.worldOperatorSession = { worldId: r.id }; });
        nav(`/operador-mundo/${r.id}`);
      }
    } catch {
      setErr("No se pudo verificar. Intenta de nuevo.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#0035b9 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xl"><Icon n="storefront" /></div>
          <div>
            <h1 className="text-lg font-black">Entrar al POS</h1>
            <p className="font-mono text-[10px] text-on-surface-variant uppercase">Con el código del comercio o del mundo</p>
          </div>
        </div>
        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Código</label>
            <input className={`${inputCls} font-mono uppercase`} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej. NONSOL385" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">PIN (4 dígitos)</label>
            <input className={`${inputCls} font-mono text-center text-2xl tracking-[0.5em]`} type="password" inputMode="numeric" maxLength={4}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
          {err && <p className="text-xs text-error">{err}</p>}
          <BtnPrimary type="submit" disabled={!codigo.trim() || pin.length !== 4 || busy} className="w-full">
            <Icon n="login" className="text-[18px]" /> {busy ? "Verificando…" : "Entrar"}
          </BtnPrimary>
        </form>
        <p className="text-center text-xs text-on-surface-variant mt-4">Pídele el código y el PIN al administrador de tu mundo o comercio.</p>
      </div>
    </div>
  );
}

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

// Agrupado por lo que el operador va a buscar, no por orden de cuándo se
// construyó cada flujo — "Cobrar" ya no es solo "identificar por código":
// desde ahí también se recarga billetera y se genera un QR de cobro que el
// cliente paga desde su propio teléfono, sin que el mostrador le pida nada.
const GRUPOS_MODOS = [
  { titulo: "Cobros", items: [
    { id: "qr", nombre: "Cobrar / Recargar", icon: "point_of_sale", desc: "Por código o pulsera, o genera un QR para que el cliente pague desde su celular." },
    { id: "bnpl", nombre: "Solicitud BNPL", icon: "calendar_clock", desc: "Financiar una compra en el punto de venta." },
    { id: "reserva", nombre: "Confirmar Reserva", icon: "event_available", desc: "Cerrar el cobro del saldo de una reserva." },
  ]},
  { titulo: "Identificación y accesos", items: [
    { id: "accesos", nombre: "Control de Accesos", icon: "door_open", desc: "Registrar entrada o salida por código." },
    { id: "bandita", nombre: "Vincular Pulsera NFC", icon: "sensors", desc: "DNI o código JOI para identificar, luego acercar la bandita." },
    { id: "ficha", nombre: "Consultar Ficha", icon: "medical_information", desc: "Alergias, tipo de sangre y contacto de emergencia por DNI o bandita." },
  ]},
  { titulo: "Menú", items: [
    { id: "menu", nombre: "Entregar Menú", icon: "restaurant", desc: "Validar por DNI o ver todas las reservas de hoy, ya pagadas." },
  ]},
];
const MODOS = GRUPOS_MODOS.flatMap(g => g.items);

function OperadorShell({ comercio, m }) {
  const [modo, setModo] = useState(null);
  const bnplOn = !!bnplLimitesDelMundo(m);
  const accesosOn = (m?.modulos || []).some(x => x.id === "accesos" && x.enabled);
  const menuOn = (m?.modulos || []).some(x => x.id === "menu" && x.enabled);
  const walletMod = (m?.modulos || []).find(x => x.id === "wallet" && x.enabled);
  // usaPulseraNfc por defecto true: mundos configurados antes de este campo
  // siguen viendo el tile, igual que ya asumía el backend del POS nativo.
  const banditaOn = !!walletMod && walletMod.config?.usaPulseraNfc !== false;
  const fichaOn = (m?.modulos || []).some(x => x.id === "perfil_ext" && x.enabled);

  // Cierre de sesión definitivo por inactividad (Task #143) — el POS es un
  // dispositivo compartido en el mostrador: si el operador se aleja sin
  // cerrar sesión a propósito, cualquiera que llegue después queda con
  // acceso a cobros y a las credenciales de este comercio hasta que alguien
  // note el error. A los 5 minutos sin interacción real, la sesión se cierra
  // sola y vuelve a pedir PIN/usuario.
  useEffect(() => {
    const INACTIVITY_MS = 5 * 60 * 1000;
    const cerrarPorInactividad = () => {
      merchantLogout();
      notify("Sesión cerrada por inactividad.", "info");
    };
    let timer = setTimeout(cerrarPorInactividad, INACTIVITY_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(cerrarPorInactividad, INACTIVITY_MS); };
    const eventos = ["pointerdown", "keydown", "touchstart"];
    eventos.forEach(e => document.addEventListener(e, reset));
    return () => { clearTimeout(timer); eventos.forEach(e => document.removeEventListener(e, reset)); };
  }, []);

  const disponibles = MODOS.filter(md => {
    if (md.id === "bnpl") return bnplOn;
    if (md.id === "accesos") return accesosOn;
    if (md.id === "menu") return menuOn;
    if (md.id === "bandita") return banditaOn;
    if (md.id === "ficha") return fichaOn;
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
          <div className="space-y-6">
            {GRUPOS_MODOS.map(grupo => {
              const items = grupo.items.filter(md => disponibles.some(d => d.id === md.id));
              if (!items.length) return null;
              return (
                <div key={grupo.titulo}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-outline mb-2 px-1">{grupo.titulo}</p>
                  <div className="space-y-3">
                    {items.map(md => (
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
                </div>
              );
            })}
          </div>
        )}
        {modo === "qr" && <CobrarPanel comercio={comercio} m={m} />}
        {modo === "bnpl" && <SolicitudBNPLOperador comercio={comercio} m={m} />}
        {modo === "accesos" && <AccesosOperador comercio={comercio} m={m} />}
        {modo === "bandita" && <VincularBanditaOperador comercio={comercio} m={m} />}
        {modo === "menu" && <EntregarMenuOperador comercio={comercio} m={m} />}
        {modo === "ficha" && <ConsultarFichaOperador comercio={comercio} m={m} />}
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

  const [turno, setTurno] = useState(undefined); // undefined = cargando, null = sin turno abierto
  const [nombreOperador, setNombreOperador] = useState("");
  const [turnoBusy, setTurnoBusy] = useState(false);

  const cargarTurno = () => fetchTurnoAbiertoRemote(m.id, zona).then(setTurno).catch(() => setTurno(null));
  React.useEffect(() => { setTurno(undefined); cargarTurno(); }, [m.id, zona]);

  const iniciarTurno = async () => {
    setTurnoBusy(true);
    try {
      const t = await iniciarTurnoRemote(m.id, zona, nombreOperador);
      setTurno(t);
      notify("Turno iniciado.");
    } catch {
      notify("No se pudo iniciar el turno. Intenta de nuevo.", "error");
    } finally { setTurnoBusy(false); }
  };
  const cerrarTurno = async () => {
    if (!turno) return;
    setTurnoBusy(true);
    try {
      await cerrarTurnoRemote(turno.id);
      setTurno(null);
      notify("Turno cerrado.");
    } catch {
      notify("No se pudo cerrar el turno. Intenta de nuevo.", "error");
    } finally { setTurnoBusy(false); }
  };

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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
        {turno === undefined ? (
          <p className="text-xs text-on-surface-variant">Verificando turno…</p>
        ) : turno ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold flex items-center gap-1.5"><Icon n="schedule" className="text-[16px] text-ok" /> Turno en curso{turno.operador_nombre ? ` · ${turno.operador_nombre}` : ""}</p>
              <p className="text-xs text-on-surface-variant">Desde las {new Date(turno.inicio_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} en {zona}</p>
            </div>
            <BtnOutline onClick={cerrarTurno} disabled={turnoBusy} className="flex-shrink-0">{turnoBusy ? "…" : "Cerrar turno"}</BtnOutline>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input className={`${inputCls} flex-1`} placeholder="Tu nombre (opcional)" value={nombreOperador} onChange={e => setNombreOperador(e.target.value)} />
            <BtnPrimary onClick={iniciarTurno} disabled={turnoBusy} className="flex-shrink-0">{turnoBusy ? "…" : "Iniciar turno"}</BtnPrimary>
          </div>
        )}
      </div>
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
// Base del backend nativo (bands-link, titular-dni, etc.) — el mismo dominio
// estable que usa el POS T6 (Api.kt: baseUrl). El panel web nunca lo había
// llamado antes; la búsqueda por DNI necesita el pepper del servidor (el
// número de documento no se guarda legible en ninguna tabla que la llave
// anónima pueda leer), así que no hay forma de resolverlo desde el navegador.
const POS_BACKEND_URL = "https://joi-pos-backend.vercel.app";

export function VincularBanditaOperador({ comercio, m }) {
  const vigenciaMeses = (m?.modulos || []).find(x => x.id === "wallet")?.config?.vigenciaBanditasMeses ?? null;
  const [modoIdent, setModoIdent] = useState("codigo"); // "codigo" | "dni" — "codigo" también acepta el QR del superapp escaneado con el lector del POS (llega como texto, igual que tipearlo)
  const [codigoUsuario, setCodigoUsuario] = useState("");
  const [dniInput, setDniInput] = useState("");
  const [wallet, setWallet] = useState(null);
  const [candidatos, setCandidatos] = useState(null); // familia completa cuando el DNI trae más de 1 cuenta
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
      if (!w) {
        const err = await errorControlado("wallet_no_encontrada");
        logErrorControlado("wallet_no_encontrada", `vincular-bandita:${m.id}`, m.id);
        setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
        return;
      }
      setWallet(w);
    } catch {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `vincular-bandita-identificar:${m.id}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setBuscando(false); }
  };

  // Un DNI puede ser el del titular o el de un dependiente — cualquiera de
  // los dos casos debe mostrar a TODA la familia (titular + hermanos) para
  // elegir a propósito a quién se está vinculando, en vez de asumir que el
  // documento tecleado identifica a una sola persona.
  const identificarPorDni = async () => {
    const dni = dniInput.trim();
    if (!dni) return;
    setBuscando(true); setResultado(null); setCandidatos(null);
    try {
      const res = await fetch(`${POS_BACKEND_URL}/api/pos/v1/titular-dni/${encodeURIComponent(dni)}?world_id=${encodeURIComponent(m.id)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setResultado({ ok: false, mensaje: "No encontramos a nadie con ese DNI en este mundo." });
        } else {
          const err = await errorControlado("operacion_admin_fallida");
          logErrorControlado("operacion_admin_fallida", `vincular-bandita-dni:${m.id}`, m.id);
          setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
        }
        return;
      }
      const data = await res.json();
      const principal = { userId: data.userId, nombre: data.nombre, esDependiente: data.esDependiente, balance: data.balance, alergias: data.restricciones?.alergias };
      const relacionados = (data.relacionados || []).map(r => ({ userId: r.userId, nombre: r.nombre, esDependiente: r.esDependiente, balance: r.balance, alergias: r.restricciones?.alergias }));
      const todos = [principal, ...relacionados];
      if (todos.length === 1) {
        setWallet({ user_id: principal.userId });
      } else {
        setCandidatos(todos);
      }
    } catch {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `vincular-bandita-dni:${m.id}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setBuscando(false); }
  };

  const elegirCandidato = (c) => {
    setWallet({ user_id: c.userId });
    setCandidatos(null);
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
    } catch {
      const err = await errorControlado("operacion_admin_fallida");
      logErrorControlado("operacion_admin_fallida", `vincular-bandita-vincular:${m.id}`, m.id);
      setResultado({ ok: false, mensaje: [err.mensaje, err.accion].filter(Boolean).join(" ") });
    } finally { setBusy(false); }
  };

  const reiniciar = () => { setWallet(null); setCodigoUsuario(""); setDniInput(""); setCandidatos(null); setCodigoBandita(""); setResultado(null); };
  // "Cancelar" ≠ "reintentar": después de un éxito, reiniciar() vuelve al
  // inicio para vincular a otra persona; en cualquier otro momento, aborta
  // el intento en curso. Un solo botón rojo cubre ambos casos sin flecha.
  const cancelarVinculacion = reiniciar;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-4">
      {!wallet && !resultado?.ok && (
        <div>
          <p className="font-mono text-[10px] uppercase text-outline mb-2">Paso 1 · Identificar a la persona</p>
          {!candidatos && (
            <div className="flex gap-1.5 mb-2">
              <button onClick={() => setModoIdent("codigo")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${modoIdent === "codigo" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>Código JOI o QR</button>
              <button onClick={() => setModoIdent("dni")} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${modoIdent === "dni" ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"}`}>DNI</button>
            </div>
          )}
          {!candidatos && modoIdent === "codigo" && (
            <div>
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono`} placeholder="Código JOI del usuario" value={codigoUsuario} onChange={e => setCodigoUsuario(e.target.value)} onKeyDown={e => e.key === "Enter" && identificar()} autoFocus />
                <BtnPrimary disabled={!codigoUsuario.trim() || buscando} onClick={identificar}><Icon n="search" className="text-[16px]" /></BtnPrimary>
              </div>
              <p className="text-[10px] text-outline mt-1.5">Escanea el QR de su app JOI con el lector del POS — el código se completa solo.</p>
            </div>
          )}
          {!candidatos && modoIdent === "dni" && (
            <div>
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono`} placeholder="DNI del titular o del dependiente" value={dniInput} onChange={e => setDniInput(e.target.value)} onKeyDown={e => e.key === "Enter" && identificarPorDni()} autoFocus />
                <BtnPrimary disabled={!dniInput.trim() || buscando} onClick={identificarPorDni}><Icon n="search" className="text-[16px]" /></BtnPrimary>
              </div>
              <p className="text-[10px] text-outline mt-1.5">Cualquier DNI de la familia funciona — si hay más de una cuenta asociada, se puede elegir cuál.</p>
            </div>
          )}
          {candidatos && (
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant">Este DNI trae {candidatos.length} cuentas asociadas — elige a quién identificas:</p>
              {candidatos.map(c => (
                <button key={c.userId} onClick={() => elegirCandidato(c)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface hover:bg-surface-container text-left tap-active">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{c.nombre || "Sin nombre"} {c.esDependiente ? <span className="font-mono text-[9px] uppercase text-tertiary ml-1">dependiente</span> : <span className="font-mono text-[9px] uppercase text-primary ml-1">titular</span>}</p>
                    {c.alergias && <p className="text-[10px] text-amber-700">Alergias: {c.alergias}</p>}
                  </div>
                  {c.balance != null && <span className="font-mono text-xs font-bold flex-shrink-0">S/ {Number(c.balance).toFixed(2)}</span>}
                </button>
              ))}
            </div>
          )}
          {resultado && !resultado.ok && (
            <p className="text-sm text-error flex items-center gap-1.5 mt-3"><Icon n="error" className="text-[16px]" />{resultado.mensaje}</p>
          )}
        </div>
      )}

      {/* Paso 2 · Acerca la bandita — pantalla dedicada de espera, no un input
          suelto: en el T6 real el NFC tarda un momento en leer, y el operador
          necesita saber que el sistema está escuchando, no que se colgó. */}
      {wallet && !resultado?.ok && (
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Icon n="sensors" className="text-[36px] text-primary" />
          </div>
          <p className="font-bold text-base">Acerca la bandita al lector</p>
          <p className="text-xs text-on-surface-variant mt-1">Vinculando para {wallet.user_id ? "la persona identificada" : "este usuario"}.</p>
          <input className={`${inputCls} font-mono text-center mt-4`} placeholder="Código de la pulsera" value={codigoBandita} onChange={e => setCodigoBandita(e.target.value)} onKeyDown={e => e.key === "Enter" && vincular()} autoFocus />
          {resultado && !resultado.ok && (
            <p className="text-sm text-error flex items-center justify-center gap-1.5 mt-3"><Icon n="error" className="text-[16px]" />{resultado.mensaje}</p>
          )}
          <BtnPrimary onClick={vincular} disabled={!codigoBandita.trim() || busy} className="w-full mt-4">
            <Icon n="sensors" className="text-[18px]" /> {busy ? "Vinculando…" : "Vincular pulsera"}
          </BtnPrimary>
          <button onClick={cancelarVinculacion} className="w-full mt-2 py-2.5 rounded-xl bg-error text-white font-bold text-sm tap-active">
            Cancelar vinculación
          </button>
        </div>
      )}

      {resultado?.ok && (
        <div className="text-center py-6">
          <Icon n="check_circle" className="text-[48px] text-ok" />
          <p className="font-bold text-base mt-2">{resultado.mensaje}</p>
          <BtnPrimary onClick={reiniciar} className="w-full mt-4">Vincular otra bandita</BtnPrimary>
        </div>
      )}
    </div>
  );
}

// ── Consultar Ficha (Task #160) — módulo Perfil Extendido visible en el POS:
// buscar por DNI (titular o dependiente, muestra a toda la familia para
// elegir) o por código/bandita, y ver la ficha médica completa (alergias,
// tipo de sangre, clínica, contacto de emergencia). El backend ya la traía
// completa desde antes (titular-dni.js / titular.js, vía lib/ficha.js) —
// VincularBanditaOperador solo usaba el campo alergias de esa misma
// respuesta; acá se muestra entera, con el titular/apoderado siempre visible
// cuando la persona es un dependiente.
// Exportado (antes no lo estaba) para que WorldOperadorApp.jsx también
// pueda ofrecerlo — el cuerpo entero ya opera solo sobre `m` (el mundo), el
// prop `comercio` nunca se usa acá, así que reusarlo tal cual desde el
// operador de mundo (mesa de ayuda / portero) es seguro sin duplicar nada.
// Antes solo el comercio tenía este modo: mesa de ayuda de un colegio no
// podía consultar alergias/contacto de emergencia de un alumno.
export function ConsultarFichaOperador({ comercio, m }) {
  const [modoIdent, setModoIdent] = useState("codigo"); // "codigo" | "dni"
  const [codigoUsuario, setCodigoUsuario] = useState("");
  const [dniInput, setDniInput] = useState("");
  const [ficha, setFicha] = useState(null);
  const [candidatos, setCandidatos] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);

  const buscarPorCodigo = async () => {
    const code = codigoUsuario.trim();
    if (!code) return;
    setBuscando(true); setError(null); setFicha(null); setCandidatos(null);
    try {
      const res = await fetch(`${POS_BACKEND_URL}/api/pos/v1/titular/${encodeURIComponent(code)}?world_id=${encodeURIComponent(m.id)}`);
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || "No se encontró a nadie con ese código o bandita."); return; }
      setFicha(data);
    } catch {
      setError("No se pudo buscar. Intenta de nuevo.");
    } finally { setBuscando(false); }
  };

  const buscarPorDni = async () => {
    const dni = dniInput.trim();
    if (!dni) return;
    setBuscando(true); setError(null); setFicha(null); setCandidatos(null);
    try {
      const res = await fetch(`${POS_BACKEND_URL}/api/pos/v1/titular-dni/${encodeURIComponent(dni)}?world_id=${encodeURIComponent(m.id)}`);
      const data = await res.json();
      if (!res.ok) { setError(res.status === 404 ? "No encontramos a nadie con ese DNI en este mundo." : "No se pudo buscar el documento."); return; }
      const todos = [data, ...(data.relacionados || [])];
      if (todos.length === 1) setFicha(todos[0]);
      else setCandidatos(todos);
    } catch {
      setError("No se pudo buscar el documento. Intenta de nuevo.");
    } finally { setBuscando(false); }
  };

  const reiniciar = () => { setFicha(null); setCandidatos(null); setCodigoUsuario(""); setDniInput(""); setError(null); };

  if (ficha) {
    const r = ficha.restricciones || {};
    const CAMPOS = [
      { icon: "no_food", label: "Alergias", valor: r.alergias, bg: "bg-amber-50", c: "text-amber-600" },
      { icon: "water_drop", label: "Tipo de sangre", valor: r.tipoSangre, bg: "bg-red-50", c: "text-red-600" },
      { icon: "local_hospital", label: "Clínica de atención", valor: r.clinica, bg: "bg-blue-50", c: "text-blue-600" },
      { icon: "phone_in_talk", label: "Contacto de emergencia", valor: r.contactoEmergencia?.nombre ? `${r.contactoEmergencia.nombre}${r.contactoEmergencia.telefono ? " · " + r.contactoEmergencia.telefono : ""}` : null, bg: "bg-green-50", c: "text-green-600" },
    ].filter(c => c.valor);
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">{ficha.nombre || "Sin nombre registrado"}</p>
            <p className="text-[10px] font-mono uppercase text-outline">
              {ficha.esDependiente ? "Dependiente" : "Titular"}{ficha.apoderado ? ` · Titular: ${ficha.apoderado}` : ""}
            </p>
          </div>
          <BtnOutline onClick={reiniciar}><Icon n="close" className="text-[16px]" /></BtnOutline>
        </div>
        {ficha.balance != null && (
          <div className="bg-surface rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Saldo en este mundo</span>
            <span className="font-mono text-sm font-bold">S/ {Number(ficha.balance).toFixed(2)}</span>
          </div>
        )}
        {CAMPOS.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-outline-variant rounded-xl">
            <Icon n="medical_information" className="text-[36px] text-outline mb-2 block mx-auto" />
            <p className="text-sm text-on-surface-variant">Sin datos médicos registrados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {CAMPOS.map(c => (
              <div key={c.label} className="flex items-start gap-3 bg-surface rounded-xl px-3 py-2.5">
                <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon n={c.icon} className={`text-[16px] ${c.c}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase text-outline">{c.label}</p>
                  <p className="text-sm font-medium truncate">{c.valor}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-4">
      {!candidatos && (
        <div className="flex gap-1.5">
          <button onClick={() => setModoIdent("codigo")} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${modoIdent === "codigo" ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant"}`}>Código o bandita</button>
          <button onClick={() => setModoIdent("dni")} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${modoIdent === "dni" ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant"}`}>DNI</button>
        </div>
      )}
      {!candidatos && modoIdent === "codigo" && (
        <div className="flex gap-2">
          <input className={`${inputCls} font-mono`} placeholder="Código JOI o UID de bandita" value={codigoUsuario} onChange={e => setCodigoUsuario(e.target.value)} onKeyDown={e => e.key === "Enter" && buscarPorCodigo()} autoFocus />
          <BtnPrimary disabled={!codigoUsuario.trim() || buscando} onClick={buscarPorCodigo}><Icon n="search" className="text-[16px]" /></BtnPrimary>
        </div>
      )}
      {!candidatos && modoIdent === "dni" && (
        <div>
          <div className="flex gap-2">
            <input className={`${inputCls} font-mono`} placeholder="DNI del titular o del dependiente" value={dniInput} onChange={e => setDniInput(e.target.value)} onKeyDown={e => e.key === "Enter" && buscarPorDni()} />
            <BtnPrimary disabled={!dniInput.trim() || buscando} onClick={buscarPorDni}><Icon n="search" className="text-[16px]" /></BtnPrimary>
          </div>
          <p className="text-[10px] text-outline mt-1.5">Cualquier DNI de la familia funciona — si hay más de una cuenta asociada, se puede elegir cuál.</p>
        </div>
      )}
      {candidatos && (
        <div className="space-y-2">
          <p className="text-xs text-on-surface-variant">Este DNI trae {candidatos.length} cuentas asociadas — elige a quién consultas:</p>
          {candidatos.map(c => (
            <button key={c.userId} onClick={() => setFicha(c)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-outline-variant hover:border-primary/50 bg-surface text-left tap-active">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{c.nombre || "Sin nombre"} {c.esDependiente ? <span className="font-mono text-[9px] uppercase text-tertiary ml-1">dependiente</span> : <span className="font-mono text-[9px] uppercase text-primary ml-1">titular</span>}</p>
                {c.restricciones?.alergias && <p className="text-[10px] text-amber-700">Alergias: {c.restricciones.alergias}</p>}
              </div>
              {c.balance != null && <span className="font-mono text-xs font-bold flex-shrink-0">S/ {Number(c.balance).toFixed(2)}</span>}
            </button>
          ))}
          <button onClick={reiniciar} className="text-xs text-on-surface-variant">Cancelar</button>
        </div>
      )}
      {error && (
        <p className="text-sm text-error flex items-center gap-1.5"><Icon n="error" className="text-[16px]" />{error}</p>
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
  // Validar por DNI — en una fila de comedor nadie quiere buscar a mano entre
  // todas las reservas del día; el que está haciendo fila sí sabe su DNI (o
  // el del apoderado). Reusa titular-dni.js: cualquier DNI de la familia
  // resuelve a todos sus user_id, y se filtra contra las reservas ya cargadas.
  const [dniInput, setDniInput] = useState("");
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [dniError, setDniError] = useState(null);
  const [dniFiltroIds, setDniFiltroIds] = useState(null); // Set<userId> o null = sin filtro

  const cargar = () => fetchReservasMenuMerchant(merchantId, hoy).then(setReservas).catch(() => setReservas([]));
  React.useEffect(() => { cargar(); }, [merchantId]);

  const buscarPorDni = async () => {
    const dni = dniInput.trim();
    if (!dni) return;
    setBuscandoDni(true); setDniError(null); setDniFiltroIds(null);
    try {
      const res = await fetch(`${POS_BACKEND_URL}/api/pos/v1/titular-dni/${encodeURIComponent(dni)}?world_id=${encodeURIComponent(m.id)}`);
      if (!res.ok) {
        setDniError(res.status === 404 ? "No encontramos a nadie con ese DNI en este mundo." : "No se pudo buscar el documento. Intenta de nuevo.");
        return;
      }
      const data = await res.json();
      const ids = new Set([data.userId, ...(data.relacionados || []).map(r => r.userId)]);
      setDniFiltroIds(ids);
    } catch {
      setDniError("No se pudo buscar el documento. Intenta de nuevo.");
    } finally { setBuscandoDni(false); }
  };
  const quitarFiltroDni = () => { setDniInput(""); setDniFiltroIds(null); setDniError(null); };

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

  const base = dniFiltroIds ? reservas.filter(r => dniFiltroIds.has(r.beneficiario_user_id)) : reservas;
  const pendientes = base.filter(r => r.estado === "CONFIRMADA");
  const entregadas = base.filter(r => r.estado === "ENTREGADA");

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
        {!dniFiltroIds ? (
          <>
            <div className="flex gap-2">
              <input className={`${inputCls} font-mono`} placeholder="DNI para validar su reserva" value={dniInput} onChange={e => setDniInput(e.target.value)} onKeyDown={e => e.key === "Enter" && buscarPorDni()} />
              <BtnPrimary disabled={!dniInput.trim() || buscandoDni} onClick={buscarPorDni}><Icon n="search" className="text-[16px]" /></BtnPrimary>
            </div>
            {dniError && <p className="text-xs text-error mt-1.5">{dniError}</p>}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Mostrando solo la reserva de este DNI.</p>
            <button onClick={quitarFiltroDni} className="text-xs font-bold text-primary">Ver todas</button>
          </div>
        )}
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase text-outline mb-2">Por entregar hoy ({pendientes.length})</p>
        {pendientes.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-outline-variant rounded-xl">
            <Icon n="restaurant" className="text-[36px] text-outline mb-2 block mx-auto" />
            <p className="text-sm text-on-surface-variant">{dniFiltroIds ? "Esta persona no tiene ningún menú reservado hoy." : "Sin reservas pendientes de entrega hoy."}</p>
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
