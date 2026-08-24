# Backlog / Próximos Pasos para la Siguiente Tanda

Ordenado por lo que Camila ya priorizó explícitamente, seguido de lo que este mapeo reveló como pendiente.

## Resueltos desde la v1.0 (trazabilidad, no se borran)

- ~~Bug: Panel de Mundo no genera contraseña en la entrega, campos NULL en tablas.~~ (Discrepancia #4 — sigue diferido explícitamente, no tocado esta tanda; se mantiene en priorizado explícito abajo.)
- ~~Precompra — flujo de compra/redención en la superapp.~~ **Resuelto 19-ago** — el asistente ya puede pre-comprar productos del evento desde la superapp tras comprar su entrada, y el comercio marca la entrega.
- ~~Cerrar el hallazgo de seguridad de `mover_saldo_wallet`.~~ **Resuelto 19-ago** (Discrepancia #1) — validación de dueño/turno restaurada sin perder el chequeo de restricciones de dependiente.
- ~~Formalizar Suscripciones como capacidad propia.~~ **Resuelto 13-ago**, y ampliado 20-ago con un segundo mecanismo real de membresía recurrente (modelo YOKI) — ver capacidad #22.

## Ya priorizado explícitamente

1. **Bug: Panel de Mundo no genera contraseña en la entrega, campos NULL en tablas.** Ver Discrepancia #4. Reportado 12-ago, sigue diferido por instrucción directa — no se tocó esta tanda tampoco.
2. **Sucursales — Etapa B (saldo/bandita compartidos entre sucursales de un mismo grupo).** La Etapa A (esquema `grupos`, CRUD admin, selector en el wizard de creación de mundo) está construida y verificada en vivo. Falta: la lógica real de que, cuando una sucursal tiene `comparte_saldo_grupo=true`, todos los puntos de contacto con saldo (recarga, pago, P2P, vincular/cobrar bandita) resuelvan el `world_id` del GRUPO en vez del de la sucursal individual — es la fase de mayor riesgo (toca dinero real) y se dejó pendiente de confirmación explícita antes de empezar.

## Revelado por este mapeo — recomendado para priorizar

3. **Decidir el destino de Promociones** (Discrepancia #10) — ¿se integra al flujo estándar de capacidades, o se construye un mundo real de tipo "promos" para que el CRUD ya construido deje de estar huérfano?
4. **Resolver la colisión de nombre "Turnos"** (Discrepancia #9) antes de empezar a construir la capacidad de negocio de citas/agendamiento.
5. **Extraer un paquete de tokens de diseño compartido** entre `joi360-admin` y `joi360-app` (Discrepancia #12) — mismo vocabulario, valores hex hoy definidos por separado; esto es justamente lo que hace que "el render config funcione igual en todos los frentes" no sea automático todavía.
6. **[Nuevo] Refrescar capacidades de un mundo ya cacheado en el admin** (Discrepancia #13) — hoy solo un mundo nuevo en el store local recibe `modulos[]` frescos de Supabase; uno ya cargado en la sesión se queda con la lista vieja hasta limpiar caché.
7. **[Nuevo] Formalizar la activación del POS/Operador de Mundo como un canal más** (Discrepancia #14) — hoy es un campo de texto libre sin flujo de activación, inconsistente con el patrón de "Canales" que ya usan Wallet/Comercios.
8. **[Nuevo] Catálogos Globales ↔ Adquirencia/Emisión** — el pricing de cada capacidad vive por mundo (Acuerdo Comercial), sin tarifario global; los canales de Emisión (QR, Tarjeta Culqi) siguen "Pendiente de integración" en el catálogo, configurados pero sin proveedor real conectado. Es el primer bloque a definir con desarrollo real, porque condiciona el modelo de cobro de todo lo que sigue — ver el roadmap propuesto para CTO (`Joi360_Roadmap_Entrega_CTO.docx`).
9. **[Nuevo] Gaps de marca en la superapp** — login sin brandear (no toma logo/color del mundo, pese a que `worlds.logo_url`/`color_primary` ya existen), sin stepper de bienvenida en la primera apertura, colorimetría de marca sin aplicar de forma consistente fuera de las pantallas ya rebrandeadas.

## Capacidades planificadas, listas para especificar cuando toque (ver Registro de Capacidades para el detalle de cada una)

Crédito, Turnos (de negocio), Loyalty, Reserva, Facturación, Subsidio, Transporte, Estacionamiento — las 8 capacidades marcadas 🔵 Planificado (Cashback y Suscripciones se sacaron de esta lista: ambas ya son 🟢 Construido). Todas ya tienen: (a) una entrada reservada en el catálogo de código con sus config fields propuestos, y (b) en varios casos, un template visual de referencia en la superapp (hoy con datos de ejemplo) que puede servir de punto de partida de diseño, aunque su lógica de negocio esté sin construir.

---

*Este backlog se actualiza junto con el documento en cada nueva versión — al cerrar un ítem, se mueve a un changelog de "resuelto en v1.x" en la Portada, en vez de borrarse, para mantener trazabilidad de qué se decidió y cuándo.*
