import React, { useState } from "react";
import { update, generarPassword, rubroNombre } from "./store";
import { Drawer, BtnPrimary, BtnOutline, Field, inputCls, Icon, notify } from "./ui";

export function EntregaMerchantDrawer({ comercio, m, open, onClose }) {
  const [cred, setCred] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [emailEntrega, setEmailEntrega] = useState("");

  React.useEffect(() => {
    if (open) {
      setConfirm(false);
      setEmailEntrega(comercio.contactoCorreo || comercio.contactoEmail || "");
      setCred(comercio.credenciales || {
        usuario: `${(comercio.nombre||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,12)}@comercios.${((m.codigo||m.id)||"").toLowerCase().replace(/[^a-z0-9]/g,"")}.joi360.pe`,
        password: generarPassword(),
      });
    }
  }, [open, comercio.id]);

  if (!cred) return null;

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

🔗 URL del panel (dashboard completo): ${url}
📱 URL del POS Operador (App Operador / Tap2Phone, cobro día a día): ${urlOperador}
👤 Usuario: ${cred.usuario}
🔑 Contraseña: ${cred.password}

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

  const entregar = () => {
    update(s => {
      const c = s.comercios.find(x => x.id === comercio.id);
      if (c) {
        c.credenciales = cred;
        c.entregado = true;
        c.fechaEntrega = Date.now();
        c.emailEntrega = emailEntrega;
      }
    });
    notify(`Panel de "${comercio.nombre}" entregado.${emailEntrega ? ` Copia el mensaje para enviar a ${emailEntrega}.` : ""}`);
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
             <BtnPrimary disabled={!confirm} onClick={entregar}>
               <Icon n="rocket_launch" className="text-[16px]" /> Ejecutar entrega
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