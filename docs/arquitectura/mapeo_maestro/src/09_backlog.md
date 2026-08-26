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
- ~~Catálogos Globales — canales de Emisión mostraban "disponible" sin gateway real detrás.~~ **Resuelto 26-ago** — `QR` (Ligo) y `Tarjeta (Culqi)` pasaron a `disponible:false` en el catálogo (código Y fila real en Supabase `emission_channels`, corregidas ambas) — mismo criterio que `tap2phone` en Adquirencia. La pantalla de mundo ya sabía deshabilitar el toggle y mostrar "Próximamente" cuando `disponible:false`; solo faltaba que el dato reflejara la realidad. Sigue sin existir la integración real (ver ítem 4) — esto solo evita que se vea activable sin estarlo.
- ~~Versionado de capacidades.~~ **Resuelto 26-ago** — cada entrada de `MODULE_CATALOG` lleva ahora `version` (semver), visible en el Catálogo de Capacidades (`v1.0.0`/`v0.0.0` junto al nombre). Baseline: `1.0.0` para las 13 ya construidas, `0.0.0` para las 9 planificadas — no se reconstruyó el historial previo a hoy, el versionado empieza a contar desde este corte. Ver [[feedback_capacidad_versionado]] para la regla completa (actualizar siempre tras cambios, reflejar en corte semanal + documento de release).

## Ya priorizado explícitamente

1. **Bug: Panel de Mundo no genera contraseña en la entrega, campos NULL en tablas.** Ver Discrepancia #4. Reportado 12-ago, sigue diferido por instrucción directa — no se tocó esta tanda tampoco.

## Revelado por este mapeo — recomendado para priorizar

2. **Resolver la colisión de nombre "Turnos"** (Discrepancia #9) antes de empezar a construir la capacidad de negocio — Camila aclaró el 25-ago que el enfoque real es food court/restaurantes ("pedido listo para recojo"), no agendar citas. Decisión explícita: no renombrar todavía.
3. **Extraer un paquete de tokens de diseño compartido** entre `joi360-admin` y `joi360-app` (Discrepancia #12) — mismo vocabulario, valores hex hoy definidos por separado; esto es justamente lo que hace que "el render config funcione igual en todos los frentes" no sea automático todavía.
4. **Catálogos Globales ↔ Emisión — canales sin proveedor real conectado.** Mitad de la Discrepancia #8 que sigue abierta: QR interoperable y Tarjeta (Culqi) están catalogados y con techo global de tarifa, pero ninguno tiene una integración real de pasarela de pago detrás (cobro real no procesa, es config sin backend). Es la pieza grande: requiere convenio + credenciales + integración certificada, no es un fix de UI. **Nota del 25-ago:** el pricing que RedPontis cobra al sponsor por cada capacidad (`MODULE_CATALOG.pricing`, ej. Wallet S/1200/mes) es intencionalmente manual/negociado por Plataforma (`TabAcuerdo`: "no es autoservicio... contacta a Plataforma") — no es un gap, es el proceso comercial real hoy. No confundir con este ítem.
5. **Gaps de marca en la superapp — colorimetría fuera de lo ya rebrandeado.** Login y stepper de bienvenida ya resueltos (25-ago, ver arriba); queda revisar el resto de pantallas no tocadas por el rebrandeo del 19-ago para colorimetría consistente.

## Plan de construcción por capacidad (26-ago) — pedido explícito de Camila

Instrucción textual: *"sigue construyendo las capacidades... todo lo que esté planificado en el tablero de capacidades en catálogo global, empieza a construir planeando en lista de tareas todo lo que esté planificado POR CAPACIDAD... no podemos automatizar todo de una."* Las 9 capacidades `version: "0.0.0"` (planificadas, `MODULOS_PROXIMAMENTE`), clasificadas por si se pueden construir ya con lo que tenemos o si necesitan una decisión/dependencia externa primero — mismo criterio que ya se aplicó a Emisión (no mostrar como disponible algo que no tiene nada real detrás).

### 🟢 Construibles ya — software puro, sin gateway ni dependencia externa

Reutilizan patrones ya probados (ledger de saldo tipo Wallet/Cashback, capacidad activable con `configFields` + tabla Supabase propia + template real en la superapp). Orden sugerido por menor dependencia entre sí:

1. ~~**Loyalty (Puntos)**~~ — **Construida 26-ago, `v1.0.0`.** Acumulación y saldo de puntos 100% reales, derivados de compras reales (`fetchLoyaltyPuntos`/`transactions` type=compra) — sin columna de saldo nueva ni cambios al RPC crítico `mover_saldo_wallet` (deliberado: ya tuvo 3 reescrituras por seguridad, no se le agrega lógica sin testeo dedicado). Hook compartido `useLoyaltyPuntos`/`useLoyaltyPuntosBatch` conecta Hub, Profile y el módulo Lealtad al mismo dato real — antes cada uno leía el mock local `u.puntos` por separado (mismo riesgo de "real en un lado, mock en otro" ya visto en Cashback, Task #242). **Queda fuera de v1.0.0, a propósito:** canje de puntos (app/POS) — mostrado como "Próximamente" en vez de un catálogo de vouchers inventado; niveles/Bronce-Plata-Oro sí quedaron reales (cálculo puro sobre el saldo real). Verificado en vivo end-to-end (Hub, módulo completo, Profile) antes de cerrar.
2. **Subsidio** — saldo dirigido con categorías de gasto permitidas y vigencia; mismo mecanismo que un sub-wallet de Wallet pero con reglas propias. Sin dependencia externa.
3. **Turnos** (food court / "pedido listo para recojo", según aclaración de Camila del 25-ago) — sin dependencia externa. Ojo: colisión de nombre con `pos_turnos`/`access_shifts` sigue sin resolver (Discrepancia #9) — construir con nombres de tabla/función propios que no choquen, sin renombrar lo existente.
4. **Reservas** — capacidad, horario y cupo; anticipo y cancelación configurables. Sin dependencia externa.
5. **Transporte** — reutiliza Accesos + Wallet (tap NFC / QR de abordaje + tarifa fija o por zona), igual que Estacionamiento reutiliza otras capacidades. Sin dependencia externa.
6. **Estacionamiento** — reutiliza Accesos + Reservas + Consumos según su propia descripción — construir *después* de Reservas para no duplicar la lógica de slot/horario.

### 🟡 Necesita definición de producto antes de construir código

7. **Asistencia** — la única de las 9 sin ningún parámetro configurable definido todavía (a diferencia del resto, que ya traen `configFields` propuestos). Bloqueada por vertical (`lock: "Educación"`). No es un tema de dependencia externa, es que falta especificar el flujo antes de tocar código.

### 🔴 Bloqueadas — necesitan convenio/integración externa o una decisión de Camila primero

8. **Facturación** — requiere un proveedor PSE real + integración SUNAT. No es construible como "software puro": sin ese convenio, cualquier cosa que se construya sería una simulación, igual que Culqi/Ligo en Emisión (ver ítem 4 de arriba). Recomendado: no construir hasta tener el proveedor.
9. **Crédito** — su propia descripción ya lo marca como "alto control regulatorio". Además, **se solapa con BNPL**, que ya está construido y es, en la práctica, una forma de crédito de consumo real dentro del ecosistema (cuotas, línea, mora). Antes de construir "Crédito" como capacidad aparte, vale la pena que Camila decida: ¿es un producto distinto de BNPL (ej. línea revolvente real con reporte a centrales de riesgo) o es una duplicación que no debería construirse por separado?

**Cómo se va a trabajar:** una capacidad a la vez (no en paralelo) — schema en Supabase, activación en Catálogo de Capacidades, config por mundo, template real en la superapp con datos reales (no mock). Cada una sube su `version` de `0.0.0` a `1.0.0` cuando tiene su primera versión funcional real, y ese salto de versión queda registrado en el corte semanal correspondiente.

**Checklist de ejecución (26-ago, orden de menor a mayor riesgo — lo que mueve dinero real va al final, con más cuidado):**
- [x] **Loyalty** — v1.0.0, cerrada. Verificada en vivo end-to-end (Hub, módulo, Profile).
- [x] **Turnos** (food court) — v1.0.0, código completo. Nueva tabla `turno_pedidos` (estado recibido/preparando/listo/entregado), sin RPC de dinero nueva — se crea sola al pagar en Comercios/Consumos (`crearSeguimientoTurno`, no bloquea el pago si falla). Panel de cocina real en el Operador del comercio. **Bloqueado hasta correr `supabase-turnos-food-court.sql`** — sin la tabla, la creación del pedido falla silenciosamente (try/catch a propósito) y el panel del operador queda vacío.
- [x] **Transporte** — v1.0.0, código completo y verificado contra el RPC real (mismo `pagarSupabase`/`useWalletLive.pagar` que usa el resto del ecosistema, sin tabla ni lógica de cobro nueva — el historial de viajes se deriva de `transactions` filtrando por referencia). Ya funciona hoy, sin SQL pendiente.
- [x] **Reservas** — v1.0.0, código completo. Nueva tabla `reservas` (recurso/fecha/hora, cancelación real), sin cobro obligatorio (anticipoMin queda definido pero sin aplicar). Recursos reservables vienen de un config nuevo (`recursos`, separados por coma) en vez de una lista inventada. **Bloqueado hasta correr `supabase-reservas.sql`.**
- [x] **Estacionamiento** — v1.0.0, código completo. Nueva tabla `estacionamiento_sesiones` (ingreso/salida real); el cobro se calcula al salir según el tiempo real transcurrido y se cobra con el mismo RPC de pago ya probado — nunca por adelantado. **Bloqueado hasta correr `supabase-estacionamiento.sql`.**
- [ ] **Subsidio** — la única que de verdad necesita acreditar saldo real segmentado a un usuario (no es solo lectura derivada, ni un cobro por algo ya ganado) — pendiente de una definición rápida con Camila antes de construir: ¿quién acredita (RedPontis, el mundo, o ambos), y cómo (acción manual por usuario, o carga masiva)?
- [ ] Asistencia y Facturación/Crédito quedan fuera de este checklist (ver clasificación 🟡/🔴 arriba).

**Pendiente operativo — 3 archivos SQL escritos, todavía sin correr:** `supabase-turnos-food-court.sql`, `supabase-reservas.sql`, `supabase-estacionamiento.sql` (en la raíz de `JOI360/`). El código admin+superapp de las 3 capacidades ya está desplegado y activable desde el Catálogo de Capacidades, pero no funcionará de verdad hasta correr cada script en el SQL Editor de Supabase — son idempotentes, se pueden correr en cualquier orden y las veces que haga falta.

---

*Este backlog se actualiza junto con el documento en cada nueva versión — al cerrar un ítem, se mueve a un changelog de "resuelto en v1.x" en la Portada, en vez de borrarse, para mantener trazabilidad de qué se decidió y cuándo.*
