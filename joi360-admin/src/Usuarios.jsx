import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "./hooks";
import { fetchUsuariosDeMundo, fetchDetalleUsuario, liberarNfcBandRemote } from "./supabase.js";
import { Icon, Pill, Drawer, BtnOutline, inputCls, notify } from "./ui";
import { nomenclaturaFamiliar } from "./store";

const soles = n => `S/ ${(Number(n) || 0).toFixed(2)}`;
const fecha = s => (s ? new Date(s).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Nomenclatura por tipo respeta el rubro del mundo (Tutor/Alumno en colegios,
// Cuenta principal/dependiente en el resto) — ver nomenclaturaFamiliar en store.js.
const etiquetaTipo = (tipo, nom) => ({
  titular: { texto: nom.principal, color: "bg-primary" },
  dependiente: { texto: nom.dependiente, color: "bg-tertiary" },
  sin_perfil: { texto: "Sin perfil", color: "bg-outline" },
}[tipo]);

/**
 * Usuarios por mundo.
 *
 * Muestra a las personas, no sus datos sensibles: el número de documento y el
 * correo llegan ya enmascarados desde la base, porque el valor completo vive en
 * auth.users y esta pantalla nunca lo pide. No es una decisión de presentación
 * — es que el dato no está del lado que este panel puede leer, así que ninguna
 * captura, log o export lo puede filtrar por descuido.
 */
export function Usuarios() {
  const st = useStore();
  // El store del admin nombra los mundos en español (nombre/estado), no como
  // la tabla de Supabase (name/status). Mezclarlos deja el selector en blanco.
  const mundos = useMemo(
    () => (st.mundos || []).filter(m => m.estado !== "ARCHIVADO"),
    [st.mundos]
  );

  const [mundoId, setMundoId] = useState("");
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    if (!mundoId && mundos.length) setMundoId(mundos[0].id);
  }, [mundos, mundoId]);

  useEffect(() => {
    if (!mundoId) return;
    let vivo = true;
    setCargando(true);
    setError("");
    fetchUsuariosDeMundo(mundoId)
      .then(r => { if (vivo) setFilas(r); })
      .catch(e => { if (vivo) setError(e.message); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [mundoId]);

  const mundo = mundos.find(m => m.id === mundoId);
  const nom = nomenclaturaFamiliar(mundo?.vertical);

  // Filas macro = titulares (o sin_perfil); cada dependiente cuelga de su
  // titular por guardianUserId, en vez de vivir como fila plana al mismo
  // nivel — la jerarquía real de la cuenta se ve de un vistazo.
  const grupos = useMemo(() => {
    const titularesFilas = filas.filter(f => f.tipo !== "dependiente");
    const porGuardian = {};
    filas.filter(f => f.tipo === "dependiente").forEach(d => {
      (porGuardian[d.guardianUserId] = porGuardian[d.guardianUserId] || []).push(d);
    });
    return titularesFilas.map(t => ({ titular: t, dependientes: porGuardian[t.userId] || [] }));
  }, [filas]);

  const coincide = (f, q) =>
    (f.nombre || "").toLowerCase().includes(q) ||
    (f.emailMask || "").toLowerCase().includes(q) ||
    (f.docMask || "").includes(q);

  const gruposVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return grupos;
    return grupos
      .map(g => ({ titular: g.titular, titularCoincide: coincide(g.titular, q), dependientes: g.dependientes.filter(d => coincide(d, q)) }))
      .filter(g => g.titularCoincide || g.dependientes.length > 0);
  }, [grupos, busqueda]);

  const titulares = filas.filter(f => f.tipo === "titular").length;
  const dependientes = filas.filter(f => f.tipo === "dependiente").length;
  const conSaldo = filas.filter(f => f.balance > 0).length;
  const saldoTotal = filas.reduce((a, f) => a + f.balance, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
          <span>Operación</span><Icon n="chevron_right" className="text-[14px]" /><span className="text-primary">Usuarios</span>
        </div>
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <p className="text-on-surface-variant mt-1 max-w-3xl">
          Las personas registradas en cada mundo, con el documento y el correo enmascarados.
          El valor completo no se guarda en esta tabla sino en el registro de cuentas, al que
          este panel no tiene acceso: para asistir a alguien en soporte hace falta una llave de
          servicio, no una pantalla.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-6">
        <select value={mundoId} onChange={e => setMundoId(e.target.value)} className={`${inputCls} w-auto min-w-[220px]`}>
          {mundos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o documento"
            className={`${inputCls} pl-10`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icono="person" titulo={`${nom.principal}es`} valor={titulares} />
        <Kpi icono="family_restroom" titulo={`${nom.dependiente}s`} valor={dependientes} />
        <Kpi icono="account_balance_wallet" titulo="Con saldo" valor={conSaldo} />
        <Kpi icono="payments" titulo="Saldo en circulación" valor={soles(saldoTotal)} />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        {cargando ? (
          <Vacio icono="hourglass_empty" titulo="Cargando usuarios" detalle="Leyendo las billeteras del mundo." />
        ) : error ? (
          <Vacio icono="error" titulo="No se pudieron cargar" detalle={error} />
        ) : gruposVisibles.length === 0 ? (
          <Vacio
            icono="person_off"
            titulo={filas.length === 0 ? "Todavía no hay usuarios" : "Nada coincide con la búsqueda"}
            detalle={filas.length === 0
              ? `Nadie se ha registrado en ${mundo?.nombre || "este mundo"} todavía. Aparecerán acá en cuanto creen su cuenta desde el superapp.`
              : "Prueba con otro nombre, correo o documento."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant">
                  <Th>Persona</Th>
                  <Th>Documento</Th>
                  <Th>Correo</Th>
                  <Th className="text-right">Saldo</Th>
                  <Th>Bandita NFC</Th>
                  <Th>Alta</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {gruposVisibles.map(g => (
                  <React.Fragment key={g.titular.userId}>
                    <FilaUsuario f={g.titular} nom={nom} onVer={setDetalle} />
                    {g.dependientes.map(d => (
                      <FilaUsuario key={d.userId} f={d} nom={nom} onVer={setDetalle} esSubfila />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DetalleUsuario usuario={detalle} mundos={mundos} nom={nom} onClose={() => setDetalle(null)} />
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`text-left font-semibold text-[11px] uppercase tracking-wider px-4 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

// Una fila macro (titular/tutor) o una sub-fila indentada (dependiente,
// colgando visualmente de su titular) — mismo set de columnas para ambas.
function FilaUsuario({ f, nom, onVer, esSubfila }) {
  const et = etiquetaTipo(f.tipo, nom);
  return (
    <tr className={`border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low/60 transition-colors ${esSubfila ? "bg-surface-container-low/30" : ""}`}>
      <Td>
        <div className={`font-semibold text-on-surface flex items-center gap-1.5 ${esSubfila ? "pl-6" : ""}`}>
          {esSubfila && <Icon n="subdirectory_arrow_right" className="text-[14px] text-outline flex-shrink-0" />}
          {f.nombre || "Sin nombre registrado"}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${esSubfila ? "pl-6" : ""}`}>
          <Pill color={et.color}>{et.texto}</Pill>
          {!esSubfila && f.dependientesACargo > 0 && (
            <span className="text-[11px] text-on-surface-variant">
              {f.dependientesACargo} {nom.dependiente.toLowerCase()}{f.dependientesACargo === 1 ? "" : "s"} a cargo
            </span>
          )}
        </div>
      </Td>
      <Td>
        {f.docMask
          ? <span className="font-mono text-xs">{f.docTipo} · {f.docMask}</span>
          : <span className="text-on-surface-variant text-xs">—</span>}
      </Td>
      <Td>
        {f.emailMask
          ? <span className="font-mono text-xs">{f.emailMask}</span>
          : <span className="text-on-surface-variant text-xs">—</span>}
      </Td>
      <Td className="text-right font-semibold tabular-nums">{soles(f.balance)}</Td>
      <Td>
        {f.bandita?.estado === "activa" ? (
          <div>
            <Pill color="bg-ok">Activa</Pill>
            {f.bandita.venceAt && <div className="text-[10px] text-on-surface-variant mt-1">vence {fecha(f.bandita.venceAt)}</div>}
          </div>
        ) : f.bandita?.estado === "solicitada" ? (
          <Pill color="bg-tertiary">Solicitada</Pill>
        ) : (
          <span className="text-on-surface-variant text-xs">—</span>
        )}
      </Td>
      <Td className="text-on-surface-variant text-xs">{fecha(f.creado)}</Td>
      <Td>
        <button
          onClick={() => onVer(f)}
          title="Ver detalle"
          className="w-8 h-8 rounded-lg grid place-items-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors">
          <Icon n="visibility" className="text-[18px]" />
        </button>
      </Td>
    </tr>
  );
}

function Kpi({ icono, titulo, valor }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <div className="flex items-center gap-2 text-on-surface-variant mb-2">
        <Icon n={icono} className="text-[18px]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{titulo}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{valor}</div>
    </div>
  );
}

function Vacio({ icono, titulo, detalle }) {
  return (
    <div className="py-16 px-6 text-center">
      <Icon n={icono} className="text-[32px] text-on-surface-variant/50" />
      <p className="font-semibold mt-3">{titulo}</p>
      <p className="text-on-surface-variant text-sm mt-1 max-w-md mx-auto">{detalle}</p>
    </div>
  );
}

function DetalleUsuario({ usuario, mundos, nom, onClose }) {
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [desvinculando, setDesvinculando] = useState(false);
  const [banditaDesvinculada, setBanditaDesvinculada] = useState(false);

  useEffect(() => {
    if (!usuario) { setD(null); return; }
    let vivo = true;
    setCargando(true);
    setBanditaDesvinculada(false);
    fetchDetalleUsuario(usuario.userId)
      .then(r => { if (vivo) setD(r); })
      .catch(() => { if (vivo) setD(null); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [usuario]);

  const nombreMundo = id => mundos.find(m => m.id === id)?.nombre || id;

  // Único caso real de soporte que este panel de solo-lectura puede resolver
  // sin tocar PII: liberar una bandita atascada (perdida, mal escaneada) para
  // que se pueda volver a vincular. No borra ni edita ningún dato personal.
  const desvincularBandita = async () => {
    if (!usuario?.bandita?.id) return;
    if (!window.confirm(`¿Desvincular la bandita de ${usuario.nombre || "este usuario"}? Podrá vincular una nueva desde la app.`)) return;
    setDesvinculando(true);
    try {
      await liberarNfcBandRemote(usuario.bandita.id);
      setBanditaDesvinculada(true);
      notify("Bandita desvinculada.");
    } catch (e) {
      notify("No se pudo desvincular la bandita.", "error");
    } finally { setDesvinculando(false); }
  };

  return (
    <Drawer
      open={!!usuario}
      onClose={onClose}
      title={usuario?.nombre || "Usuario"}
      subtitle={usuario ? `${etiquetaTipo(usuario.tipo, nom).texto} · alta ${fecha(usuario.creado)}` : ""}
      icon="person"
      width="w-[560px]">
      {usuario && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Dato etiqueta="Documento" valor={usuario.docMask ? `${usuario.docTipo} · ${usuario.docMask}` : "—"} mono />
            <Dato etiqueta="Correo" valor={usuario.emailMask || "—"} mono />
          </div>

          {usuario.bandita?.estado === "activa" && usuario.bandita?.id && !banditaDesvinculada && (
            <div className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase text-outline">Bandita NFC vinculada</p>
                <p className="text-sm font-mono truncate">{usuario.bandita.codigo}</p>
              </div>
              <button onClick={desvincularBandita} disabled={desvinculando}
                className="flex-shrink-0 text-xs font-medium text-error hover:underline disabled:opacity-50">
                {desvinculando ? "Desvinculando…" : "Desvincular"}
              </button>
            </div>
          )}
          {banditaDesvinculada && (
            <p className="text-xs text-ok flex items-center gap-1.5"><Icon n="check_circle" className="text-[14px]" /> Bandita desvinculada — puede vincular una nueva desde la app.</p>
          )}

          <div className="text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2.5 flex gap-2">
            <Icon n="lock" className="text-[16px] shrink-0 mt-px" />
            <span>
              El documento y el correo completos no se guardan acá. Están en el registro de
              cuentas, fuera del alcance de este panel; para verlos en un caso de soporte hace
              falta acceso con llave de servicio, que queda auditado.
            </span>
          </div>

          {cargando ? (
            <p className="text-sm text-on-surface-variant">Cargando movimientos…</p>
          ) : d ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Dato etiqueta="Consumido" valor={soles(d.consumo)} />
                <Dato etiqueta="Recargado" valor={soles(d.recargado)} />
                <Dato etiqueta="Saldo total" valor={soles(d.saldoTotal)} />
              </div>

              <Seccion titulo={`Mundos activos (${d.mundos.length})`}>
                {d.mundos.length === 0
                  ? <p className="text-sm text-on-surface-variant">Sin billeteras.</p>
                  : d.mundos.map(w => (
                      <div key={w.id} className="flex justify-between items-center py-2 border-b border-outline-variant/60 last:border-0">
                        <span className="text-sm">{nombreMundo(w.world_id)}</span>
                        <span className="text-sm font-semibold tabular-nums">{soles(w.balance)}</span>
                      </div>
                    ))}
              </Seccion>

              <Seccion titulo={`Últimos movimientos (${d.movimientos.length})`}>
                {d.movimientos.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    Todavía no hay transacciones de esta persona.
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {d.movimientos.map(t => (
                      <div key={t.id} className="flex justify-between items-start py-2 border-b border-outline-variant/60 last:border-0">
                        <div>
                          <div className="text-sm capitalize">{t.type}</div>
                          <div className="text-[11px] text-on-surface-variant">
                            {new Date(t.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            {t.status && t.status !== "aprobada" && ` · ${t.status}`}
                          </div>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${t.type === "recarga" ? "text-ok" : ""}`}>
                          {t.type === "recarga" ? "+" : "−"}{soles(Math.abs(t.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Seccion>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">No se pudieron cargar los movimientos.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Dato({ etiqueta, valor, mono }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">{etiqueta}</div>
      <div className={`mt-1 font-semibold ${mono ? "font-mono text-xs" : "text-sm tabular-nums"}`}>{valor}</div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant mb-2">{titulo}</h3>
      {children}
    </div>
  );
}
