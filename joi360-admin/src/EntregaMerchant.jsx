import React, { useState } from "react";
import { update, generarPassword, generarPin4, generarCodigoComercio, rubroNombre } from "./store";
import { existeCodigoComercioRemote, actualizarMerchantRemote } from "./supabase.js";
import { Drawer, BtnPrimary, BtnOutline, Field, inputCls, Icon, notify } from "./ui";

// generarCodigoComercio solo tiene ~900 combinaciones por slug de nombre —
// dos comercios con nombres parecidos ("Non Solo Pasta 1", "Non Solo Pasta 2")
// podían chocar. Se verifica contra Supabase (única fuente real: el código
// tiene que ser único en TODO el ecosistema, no solo en este mundo) antes de
// aceptarlo.
async function generarCodigoComercioUnico(nombre) {
  for (let i = 0; i < 8; i++) {
    const candidato = generarCodigoComercio(nombre);
    const existe = await existeCodigoComercioRemote(candidato).catch(() => false);
    if (!existe) return candidato;
  }
  // Casi imposible de alcanzar (8 intentos sobre ~900 combinaciones), pero
  // nunca debe bloquear una entrega — el sufijo de timestamp garantiza unicidad.
  return `${generarCodigoComercio(nombre)}${Date.now().toString().slice(-3)}`;
}

// usaPosOperador: el PIN de 4 dígitos solo tiene sentido si el comercio de
// verdad va a operar un mostrador (pidió unidades de POS) — un comercio sin
// POS no necesita una entrada rápida de caja.
export function EntregaMerchantDrawer({ comercio, m, open, onClose }) {
  const [cred, setCred] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [emailEntrega, setEmailEntrega] = useState("");
  const [entregando, setEntregando] = useState(false);
  const usaPosOperador = +comercio.pos > 0;

  React.useEffect(() => {
    if (!open) return;
    setConfirm(false);
    setEmailEntrega(comercio.contactoCorreo || comercio.contactoEmail || "");
    if (comercio.credenciales) {
      setCred({ ...comercio.credenciales, codigo: comercio.codigo, posPin: comercio.posPin });
      return;
    }
    setCred(null);
    (async () => {
      const codigo = await generarCodigoComercioUnico(comercio.nombre);
      setCred({
        usuario: `${(comercio.nombre||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12)}@comercios.${((m.codigo||m.id)||"").toLowerCase().replace(/[^a-z0-9]/g,"")}.joi360.pe`,
        password: generarPassword(),
        codigo,
        posPin: usaPosOperador ? generarPin4() : null,
      });
    })();
  }, [open, comercio.id]);

  if (!cred) return (
    <Drawer open={open} onClose={onClose} icon="local_shipping" title="Entregar Panel al Merchant" subtitle={`${comercio.nombre} · ${m.nombre}`}>
      <p className="text-sm text-on-surface-variant py-8 text-center">Generando código único de comercio…</p>
    </Drawer>
  );

  const url = `${window.location.origin}${window.location.pathname}#/comercio/${comercio.id}`;
  // App Operador (=Tap2Phone: el celular del comercio como POS) reusa la
  // misma sesión de merchant, no es un usuario aparte — pero es la ruta que
  // de verdad usa el operador de caja día a día, así que se entrega también
  // como link propio, no solo el dashboard completo.
  const urlOperador = `${window.location.origin}${window.location.pathname}#/operador/${comercio.id}`;
  const yaEntregado = !!comercio.entregado;

  const mensajeEntrega = `Hola ${comercio.contactoNombre || comercio.nombre},

Tu panel de operaciones JOI 360 ya está listo para ${comercio.nombre} en el mundo ${m.nombre}.

Accede con las siguientes credenciales:

🏷️ Código de comercio: ${cred.codigo}
🔗 URL del panel (dashboard completo): ${url}
📱 URL del POS Operador (App Operador / Tap2Phone, cobro día a día): ${urlOperador}
👤 Usuario: ${cred.usuario}
🔑 Contraseña: ${cred.password}
${cred.posPin ? `🔢 PIN rápido del POS Operador (para el mostrador, sin escribir usuario/contraseña cada turno): ${cred.posPin}\n` : ""}
Desde tu panel podrás:
• Ver el resumen de ventas del día por canal de cobro
• Generar QR de cobro dinámico o activar el lector Bandita NFC
• Consultar tu liquidación y la tasa MDR aplicada
• Enviar solicitudes de soporte

Si tienes dudas, contacta al administrador del mundo o a RedPontis.

Saludos,
Equipo RedPontis · JOI 360`;

  const copiarMensaje = () => {
    navigator.clipboard?.writeText(mensajeEntrega);
    notify("Mensaje de entrega copiado. Pégalo en el correo o WhatsApp al merchant.", "info");
  };

  const entregar = async () => {
    setEntregando(true);
    try {
      // El código y el PIN tienen que llegar a Supabase — son lo único que
      // le permite a un operador en OTRO dispositivo (el mostrador real, no
      // este navegador) entrar sin conocer la URL exacta del comercio.
      await actualizarMerchantRemote(comercio.supabaseId || comercio.id, { ...comercio, codigo: cred.codigo, posPin: cred.posPin });
    } catch (e) {
      notify(`No se pudo guardar el código en Supabase: ${e.message}`, "error");
      setEntregando(false);
      return;
    }
    update(s => {
      const c = s.comercios.find(x => x.id === comercio.id);
      if (c) {
        c.credenciales = { usuario: cred.usuario, password: cred.password };
        c.codigo = cred.codigo;
        c.posPin = cred.posPin;
        c.entregado = true;
        c.fechaEntrega = Date.now();
        c.emailEntrega = emailEntrega;
      }
    });
    notify(`Panel de "${comercio.nombre}" entregado.${emailEntrega ? ` Copia el mensaje para enviar a ${emailEntrega}.` : ""}`);
    setEntregando(false);
    onClose();
  };

  const copiar = (txt, label) => {
    navigator.clipboard?.writeText(txt);
    notify(`${label} copiado al portapapeles.`, "info");
  };

  return (
    <Drawer open={open} onClose={onClose} icon="local_shipping"
      title={yaEntregado ? "Credenciales del Merchant" : "Entregar Panel al Merchant"}
      subtitle={`${comercio.nombre} · ${m.nombre}`}
      footer={
        yaEntregado
          ? <div className="flex gap-2 w-full">
              <BtnOutline onClick={copiarMensaje} className="flex-1"><Icon n="content_copy" className="text-[16px]" /> Copiar mensaje de entrega</BtnOutline>
              <BtnPrimary onClick={onClose}>Cerrar</BtnPrimary>
            </div>
          : <><BtnOutline onClick={onClose}>Cancelar</BtnOutline>
             <BtnPrimary disabled={!confirm || entregando} onClick={entregar}>
               <Icon n="rocket_launch" className="text-[16px]" /> {entregando ? "Entregando…" : "Ejecutar entrega"}
             </BtnPrimary></>
      }>
      <div className="space-y-6">

        {/* Banner estado */}
        <div className={`border rounded-lg p-4 flex gap-3 text-xs ${yaEntregado ? "bg-secondary-fixed border-secondary/30" : "bg-surface-container-low border-primary/20 text-on-surface-variant"}`}>
          <Icon n={yaEntregado ? "verified" : "info"} className={`text-[20px] ${yaEntregado ? "text-secondary" : "text-primary"}`} />
          {yaEntregado
            ? <p><b>Panel entregado</b> el {new Date(comercio.fechaEntrega).toLocaleDateString("es-PE")}. Usa "Copiar mensaje de entrega" para reenviar las credenciales por email o WhatsApp.</p>
            : <p>Al ejecutar la entrega, el <b>Panel del Merchant</b> quedará activo. El merchant puede ver sus ventas, generar QR de cobro, ver liquidación y enviar solicitudes de soporte.</p>}
        </div>

        {/* Datos del comercio */}
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
          <p className="font-mono text-[10px] uppercase text-outline mb-3">Datos del comercio</p>
          <div className="space-y-1.5 text-sm">
            {[
              ["Comercio", comercio.nombre],
              ["Rubro", rubroNombre(comercio.rubro)],
              comercio.ruc && ["RUC", comercio.ruc],
              comercio.contactoNombre && ["Encargado", comercio.contactoNombre],
              comercio.contactoTelefono && ["Teléfono", comercio.contactoTelefono],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-on-surface-variant flex-shrink-0">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email de entrega */}
        <section>
          <h4 className="font-semibold text-sm mb-3 pb-2 border-b border-outline-variant/50 flex items-center gap-2">
            <Icon n="email" className="text-primary text-[18px]" /> Email para la entrega de credenciales
          </h4>
          <Field label="Email del encargado del comercio" hint="Las credenciales se deberán enviar a este correo. Copia el mensaje con el botón de abajo.">
            <div className="flex gap-2">
              <input
                className={inputCls}
                type="email"
                value={emailEntrega}
                onChange={e => setEmailEntrega(e.target.value)}
                placeholder="encargado@comercio.com"
              />
              {emailEntrega && (
                <a href={`mailto:${emailEntrega}?subject=Tu panel JOI 360 - ${comercio.nombre}&body=${encodeURIComponent(mensajeEntrega)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary-fixed flex-shrink-0 transition-colors">
                  <Icon n="send" className="text-[14px]" /> Abrir correo
                </a>
              )}
            </div>
          </Field>
          <button onClick={copiarMensaje} className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 border border-outline-variant rounded-lg text-sm text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
            <Icon n="content_copy" className="text-[16px]" /> Copiar mensaje completo de entrega (para email o WhatsApp)
          </button>
        </section>

        {/* Credenciales */}
        <section>
          <h4 className="font-semibold text-sm mb-4 pb-2 border-b border-outline-variant/50 flex items-center gap-2">
            <Icon n="key" className="text-primary text-[18px]" /> Credenciales de acceso al panel
          </h4>
          <div className="space-y-4">
            <Field label="Código de comercio" hint="Identificador legible del comercio — no cambia, sirve como referencia rápida.">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} readOnly value={cred.codigo} />
                <BtnOutline className="!px-3 flex-shrink-0" onClick={() => copiar(cred.codigo, "Código de comercio")}>
                  <Icon n="content_copy" className="text-[16px]" />
                </BtnOutline>
              </div>
            </Field>
            <Field label="URL del Panel (link externo)">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} readOnly value={url} />
                <BtnOutline className="!px-3 flex-shrink-0" onClick={() => copiar(url, "Link del panel")}>
                  <Icon n="content_copy" className="text-[16px]" />
                </BtnOutline>
              </div>
            </Field>
            <Field label="Usuario de acceso">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} value={cred.usuario}
                  readOnly={yaEntregado}
                  onChange={e => !yaEntregado && setCred({ ...cred, usuario: e.target.value })} />
                <BtnOutline className="!px-3 flex-shrink-0" onClick={() => copiar(cred.usuario, "Usuario")}>
                  <Icon n="content_copy" className="text-[16px]" />
                </BtnOutline>
              </div>
            </Field>
            <Field label="Contraseña de acceso">
              <div className="flex gap-2">
                <input className={`${inputCls} font-mono text-xs`} value={cred.password}
                  readOnly={yaEntregado}
                  onChange={e => !yaEntregado && setCred({ ...cred, password: e.target.value })} />
                {!yaEntregado && (
                  <BtnOutline className="!px-3 flex-shrink-0" title="Regenerar contraseña"
                    onClick={() => { setCred({ ...cred, password: generarPassword() }); notify("Contraseña regenerada.", "info"); }}>
                    <Icon n="autorenew" className="text-[16px]" />
                  </BtnOutline>
                )}
                <BtnOutline className="!px-3 flex-shrink-0" onClick={() => copiar(cred.password, "Contraseña")}>
                  <Icon n="content_copy" className="text-[16px]" />
                </BtnOutline>
              </div>
            </Field>
            {usaPosOperador && (
              <Field label="PIN rápido del POS Operador" hint="Para entrar al POS Operador con solo 4 dígitos en el mostrador, sin escribir usuario/contraseña en cada turno.">
                <div className="flex gap-2">
                  <input className={`${inputCls} font-mono text-xs`} value={cred.posPin}
                    readOnly={yaEntregado}
                    onChange={e => !yaEntregado && setCred({ ...cred, posPin: e.target.value.replace(/\D/g,"").slice(0,4) })} />
                  {!yaEntregado && (
                    <BtnOutline className="!px-3 flex-shrink-0" title="Regenerar PIN"
                      onClick={() => { setCred({ ...cred, posPin: generarPin4() }); notify("PIN regenerado.", "info"); }}>
                      <Icon n="autorenew" className="text-[16px]" />
                    </BtnOutline>
                  )}
                  <BtnOutline className="!px-3 flex-shrink-0" onClick={() => copiar(cred.posPin, "PIN")}>
                    <Icon n="content_copy" className="text-[16px]" />
                  </BtnOutline>
                </div>
              </Field>
            )}
          </div>
        </section>

        {/* Qué verá el merchant */}
        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
          <p className="font-mono text-[10px] uppercase text-outline mb-3">El merchant verá en su panel</p>
          <div className="space-y-2">
            {[
              ["today", "Resumen del día — volumen, transacciones aprobadas y neto estimado"],
              ["qr_code_scanner", "Generar QR de cobro dinámico o activar lector de Bandita NFC"],
              ["account_balance", "Liquidación — tasa MDR aplicada al comercio y monto a acreditar"],
              ["support_agent", "Soporte — solicitudes al administrador del mundo en cascada a RedPontis"],
            ].map(([ic, txt]) => (
              <div key={ic} className="flex items-center gap-2 text-xs text-on-surface-variant">
                <Icon n={ic} className="text-primary text-[16px]" /> {txt}
              </div>
            ))}
          </div>
        </div>

        {/* Confirmación */}
        {!yaEntregado && (
          <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-outline-variant/50">
            <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-0.5 rounded text-primary" />
            <span className="text-sm text-on-surface-variant">
              Confirmo que los datos son correctos y autorizo la entrega al encargado de <b>{comercio.nombre}</b>.
              {emailEntrega && <span className="text-primary"> Se notificará a <b>{emailEntrega}</b>.</span>}
            </span>
          </label>
        )}
      </div>
    </Drawer>
  );
}