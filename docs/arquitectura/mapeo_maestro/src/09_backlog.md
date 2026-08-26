# Backlog / Próximos Pasos para la Siguiente Tanda

Ordenado por lo que Camila ya priorizó explícitamente, seguido de lo que este mapeo reveló como pendiente.

## Resueltos desde la v1.0 (trazabilidad, no se borran)

- ~~Bug: Panel de Mundo no genera contraseña en la entrega, campos NULL en tablas.~~ (Discrepancia #4 — sigue diferido explícitamente, no tocado esta tanda; se mantiene en priorizado explícito abajo.)
- ~~Precompra — flujo de compra/redención en la superapp.~~ **Resuelto 19-ago** — el asistente ya puede pre-comprar productos del evento desde la superapp tras comprar su entrada, y el comercio marca la entrega.
- ~~Cerrar el hallazgo de seguridad de `mover_saldo_wallet`.~~ **Resuelto 19-ago** (Discrepancia #1) — validación de dueño/turno restaurada sin perder el chequeo de restricciones de dependiente.
- ~~Formalizar Suscripciones como capacidad propia.~~ **Resuelto 13-ago**, y ampliado 20-ago con un segundo mecanismo real de membresía recurrente (modelo YOKI) — ver capacidad #22.
- ~~Sucursales — Etapa B (saldo/bandita compartidos entre sucursales de un mismo grupo).~~ **Resuelto 24-ago** — todas las lecturas/escrituras de wallet (alta/baja dependiente, cobro/recarga POS, identificación por código, devoluciones) resuelven ahora a la sucursal principal del grupo cuando `comparte_saldo_grupo` está activo, mismo mecanismo ya deployado en `joi-pos-backend`. Verificado en vivo con datos de prueba reales.
- ~~Refrescar capacidades de un mundo ya cacheado en el admin.~~ **Resuelto 24-ago** (Discrepancia #13).
- ~~Formalizar la activación del POS/Operador de Mundo como un canal más.~~ **Resuelto 24-ago** (Discrepancia #14).
- ~~Decidir el destino de Promociones.~~ **Resuelto 25-ago** — se integró al flujo estándar de capacidades (decisión de Camila): salió de `MODULOS_PROXIMAMENTE`, la pestaña se activa igual que Eventos (capacidad activada, no `mundo.type`). Catálogo recortado a lo real (cupón QR) — banner/push/A-B testing quedaron fuera del `servicios` para no prometer algo sin construir.
- ~~Catálogos Globales ↔ Adquirencia — MDR de merchants sin techo global.~~ **Resuelto 25-ago** — mismo patrón que Emisión: el MDR/fijo por Tx que un mundo define para sus merchants (Acuerdo Comercial) ya no puede superar la "Tasa base" del canal correspondiente en Adquirencia Global (`Emision.jsx`/`Adquirencia.jsx`, techo visible + guardado bloqueado si se excede). **Hallazgo en la verificación en vivo, sin tocar:** Jockey Plaza (mundo real) tenía `fijoTxDefault = S/ 0.20`, por encima del techo global actual (S/ 0.10) — quedó así, sin forzar el cambio; queda para que Camila decida si se ajusta el dato o el techo. Sigue abierta la otra mitad de Discrepancia #8 (ver abajo, ítem 4).
- ~~Login sin brandear.~~ **Resuelto 25-ago** — fondo del login/signup de la superapp pasó del hex inventado al token real Surface Hero (#0D1A45, ver `JoiSolutions_Design_System_Import_SwiftUI_v1.0.docx`); se agregó "JOI Solutions" como eyebrow, mismo patrón ya usado en `LandingPublica.jsx` del admin.
- ~~Sin stepper de bienvenida en la primera apertura.~~ **Resuelto 25-ago** — `WelcomeStepper.jsx`, 3 pasos, se muestra una sola vez (localStorage) a un usuario sin ninguna comunidad, antes de la lista de comunidades.

## Ya priorizado explícitamente

1. **Bug: Panel de Mundo no genera contraseña en la entrega, campos NULL en tablas.** Ver Discrepancia #4. Reportado 12-ago, sigue diferido por instrucción directa — no se tocó esta tanda tampoco.

## Revelado por este mapeo — recomendado para priorizar

2. **Resolver la colisión de nombre "Turnos"** (Discrepancia #9) antes de empezar a construir la capacidad de negocio — Camila aclaró el 25-ago que el enfoque real es food court/restaurantes ("pedido listo para recojo"), no agendar citas. Decisión explícita: no renombrar todavía.
3. **Extraer un paquete de tokens de diseño compartido** entre `joi360-admin` y `joi360-app` (Discrepancia #12) — mismo vocabulario, valores hex hoy definidos por separado; esto es justamente lo que hace que "el render config funcione igual en todos los frentes" no sea automático todavía.
4. **Catálogos Globales ↔ Emisión — canales sin proveedor real conectado.** Mitad de la Discrepancia #8 que sigue abierta: QR interoperable y Tarjeta (Culqi) están catalogados y con techo global de tarifa, pero ninguno tiene una integración real de pasarela de pago detrás (cobro real no procesa, es config sin backend). Es la pieza grande: requiere convenio + credenciales + integración certificada, no es un fix de UI. **Nota del 25-ago:** el pricing que RedPontis cobra al sponsor por cada capacidad (`MODULE_CATALOG.pricing`, ej. Wallet S/1200/mes) es intencionalmente manual/negociado por Plataforma (`TabAcuerdo`: "no es autoservicio... contacta a Plataforma") — no es un gap, es el proceso comercial real hoy. No confundir con este ítem.
5. **Gaps de marca en la superapp — colorimetría fuera de lo ya rebrandeado.** Login y stepper de bienvenida ya resueltos (25-ago, ver arriba); queda revisar el resto de pantallas no tocadas por el rebrandeo del 19-ago para colorimetría consistente.

## Capacidades planificadas, listas para especificar cuando toque (ver Registro de Capacidades para el detalle de cada una)

Crédito, Turnos (de negocio), Loyalty, Reserva, Facturación, Subsidio, Transporte, Estacionamiento — las 8 capacidades marcadas 🔵 Planificado (Cashback y Suscripciones se sacaron de esta lista: ambas ya son 🟢 Construido). Todas ya tienen: (a) una entrada reservada en el catálogo de código con sus config fields propuestos, y (b) en varios casos, un template visual de referencia en la superapp (hoy con datos de ejemplo) que puede servir de punto de partida de diseño, aunque su lógica de negocio esté sin construir.

---

*Este backlog se actualiza junto con el documento en cada nueva versión — al cerrar un ítem, se mueve a un changelog de "resuelto en v1.x" en la Portada, en vez de borrarse, para mantener trazabilidad de qué se decidió y cuándo.*
