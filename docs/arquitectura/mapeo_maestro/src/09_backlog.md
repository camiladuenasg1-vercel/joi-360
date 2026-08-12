# Backlog / Próximos Pasos para la Siguiente Tanda

Ordenado por lo que Camila ya priorizó explícitamente, seguido de lo que este mapeo reveló como pendiente.

## Ya priorizado explícitamente

1. **Bug: Panel de Mundo no genera contraseña en la entrega, campos NULL en tablas.** Ver Discrepancia #4. Reportado 12-ago, diferido a esta tanda por instrucción directa.
2. **Precompra — flujo de compra/redención en la superapp.** La autoría (organizador carga productos + stock por evento) ya está construida y deployada. Falta: que el asistente, tras comprar su entrada, pueda ver y pre-comprar estos productos, y que el comercio los redima en el evento.
3. **Sucursales — Etapa B (saldo/bandita compartidos entre sucursales de un mismo grupo).** La Etapa A (esquema `grupos`, CRUD admin, selector en el wizard de creación de mundo) está construida y verificada en vivo. Falta: la lógica real de que, cuando una sucursal tiene `comparte_saldo_grupo=true`, todos los puntos de contacto con saldo (recarga, pago, P2P, vincular/cobrar bandita) resuelvan el `world_id` del GRUPO en vez del de la sucursal individual — es la fase de mayor riesgo (toca dinero real) y se dejó pendiente de confirmación explícita antes de empezar.

## Revelado por este mapeo — recomendado para priorizar

4. **Cerrar el hallazgo de seguridad de `mover_saldo_wallet`** (Discrepancia #1) — restaurar la validación de dueño de wallet sin perder el chequeo de restricciones que sí se agregó después.
5. **Decidir el destino de Promociones** (Discrepancia #10) — ¿se integra al flujo estándar de capacidades, o se construye un mundo real de tipo "promos" para que el CRUD ya construido deje de estar huérfano?
6. **Formalizar Suscripciones como capacidad propia** (Discrepancia #11) — ya está cobrando dinero real escondida dentro de Wallet; darle visibilidad propia en el catálogo facilitaría reportarla y configurarla sin tener que "saber" que vive ahí.
7. **Resolver la colisión de nombre "Turnos"** (Discrepancia #9) antes de empezar a construir la capacidad de negocio de citas/agendamiento.
8. **Extraer un paquete de tokens de diseño compartido** entre `joi360-admin` y `joi360-app` (Discrepancia #12) — mismo vocabulario, valores hex hoy definidos por separado; esto es justamente lo que hace que "el render config funcione igual en todos los frentes" no sea automático todavía.

## Capacidades planificadas, listas para especificar cuando toque (ver Registro de Capacidades para el detalle de cada una)

Crédito, Turnos (de negocio), Loyalty, Reserva, Facturación, Cashback, Subsidio, Transporte, Estacionamiento — las 9 capacidades marcadas 🔵 Planificado. Todas ya tienen: (a) una entrada reservada en el catálogo de código con sus config fields propuestos, y (b) en varios casos, un template visual de referencia en la superapp (hoy con datos de ejemplo) que puede servir de punto de partida de diseño, aunque su lógica de negocio esté sin construir.

---

*Este backlog se actualiza junto con el documento en cada nueva versión — al cerrar un ítem, se mueve a un changelog de "resuelto en v1.x" en la Portada, en vez de borrarse, para mantener trazabilidad de qué se decidió y cuándo.*
