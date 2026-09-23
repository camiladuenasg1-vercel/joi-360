# SPEC Funcional — Motor de Eventos (Casos TEC V2 · Caso 3 — Kermesse)

*Documento de especificación funcional, no un registro de iteraciones. Describe el Motor de Eventos tal como existe construido y verificado en el prototipo JOI 360 al 23-sep-2026, con la misma estructura de jerarquía de microservicios que ya usan Wallet, Comercios y BNPL en `MODULE_CATALOG` (`joi360-admin/src/store.js`) — Eventos es la capacidad más madura del catálogo y no tenía todavía su desglose formal en microservicios; este documento lo establece.*

Fuente: código real (`joi360-admin/src/OrganizadorFront.jsx`, `Gobierno.jsx`, `MundoDetail.jsx`, `supabase.js`; `joi360-app/src/pages/Module.jsx`, `supabaseClient.js`), leído línea por línea el mismo día de este documento — no de memoria de sesiones anteriores. Complementa (no reemplaza) `docs/arquitectura/mapeo_maestro/` y `docs/arquitectura/kiro_steering/capacidades.md`.

---

## 1. Propósito y alcance

El Motor de Eventos es la capacidad `eventos` de `MODULE_CATALOG` — venta y gestión de entradas, control de aforo y de acceso, para eventos que un Mundo publica dentro de su propio ecosistema (kermesse escolar, feria, festival). Es, hoy, **la capacidad más completa del prototipo**: cubre desde la creación del evento hasta la liquidación de sus ingresos, pasando por comercios afiliados con catálogo de precompra y un sistema completo de pulseras cashless para invitados sin cuenta en la app.

**Caso TEC de origen:** Caso 3 — Kermesse (Colegio Raimondi), el tercero de los tres casos técnicos fundacionales del proyecto (Caso 1 = Mok/BNPL, Caso 2 = Raimondi/Wallet-Comercios, Caso 3 = Kermesse/Eventos). Construido y cerrado en la sesión del 22 al 27-jul-2026; extendido con precompra (12/19/26-ago) y pulseras cashless (Task #119).

**Fuera de alcance de este documento:** BNPL, Menú, Wallet genérico — se mencionan solo donde Eventos los reutiliza (pago con saldo, restricciones de dependiente).

---

## 2. Modelo de negocio — B2B / B2C / Embebido

Cada evento elige **un** modo, dentro del **techo** que permite su Mundo. El criterio NO se elige a mano en un checkbox libre — se deriva de `modosDeMundo(m)` (`store.js:608`):

```js
function modosDeMundo(m) {
  const base = m.eventosConfig?.modoEventos || (m.type === "eventos_rp" ? "b2c" : "b2b");
  if (base === "b2b") return ["b2b"];
  return ["b2c", ...(m.eventosConfig?.embebidoActivo ? ["embebido"] : [])];
}
```

| Modo | Quién publica | Techo del Mundo | Aprobación |
|---|---|---|---|
| **B2B** | Un Organizador dedicado (entidad legal propia, `organizadores`, login server-side propio) — panel entregado a un tercero | Un Mundo "organizador" (no es el mundo especial `mundo-eventos-rp`) opera SOLO en B2B — excluyente con B2C/Embebido | Sí, cola RedPontis |
| **B2C** | Un usuario final de la superapp publica su propio evento | Cualquier Mundo (`m.type !== "eventos_rp"` → B2B por defecto salvo que el mundo cambie `modoEventos`); el mundo especial `mundo-eventos-rp` ("JOI Eventos") es B2C por definición de tipo | Sí, cola RedPontis |
| **Embebido** | El propio Mundo (su admin/sponsor) publica directo bajo su marca | Toggle `eventosConfig.embebidoActivo`, solo disponible si el mundo ya está en B2C | Sí, cola RedPontis (mismo gate que los otros 2) |

**Regla dura:** todo evento nuevo, o un rechazado que se reenvía, entra en `estado="PENDIENTE_APROBACION"` (`OrganizadorFront.jsx:1450`) — no hay ningún camino de publicación directa sin pasar por la cola de RedPontis (`Gobierno.jsx`), sin importar el modo.

**Config a nivel Mundo** (`m.eventosConfig`, fuera de `configFields` de la capacidad): `modoEventos` (b2b|b2c, techo base), `embebidoActivo` (switch), `modeloComisionEventos` (exigido al activar Embebido), `monetizacion` (switch — si `false`, el usuario NO paga por sus entradas, ver `EventosTemplate`).

**UI que resuelve esto:** `SelectorModoEventos({m, compacto})` (`MundoDetail.jsx`), reutilizado en `EventosActivadoPopup` (salta al activar la capacidad por primera vez) y en el tab `TabEventos` ("Volver a elegir el modelo"). Elegir B2B apaga `embebidoActivo` en el mismo gesto.

---

## 3. Jerarquía de microservicios

Siguiendo el mismo patrón que BNPL (`elegibilidad → límites → programa → contratos`), el Motor de Eventos se descompone en 9 microservicios reales, cada uno con su propio componente, tabla(s) y regla de negocio:

### 3.1 Configuración y Gobernanza del Mundo
**Dónde:** `MundoDetail.jsx` → `TabEventos`. **Depende de:** `wallet, comercios` (`DEPENDENCY_MAP.eventos`).
Define el techo del Mundo (§2) y los `configFields` de la capacidad: `comisionEntrada` (percent, def. 5 — % RedPontis sobre cada entrada), `allowB2C` (switch, def. false — habilita que usuarios finales creen sus propios eventos), `ventanaPickup` (number minutos, def. 30 — para entradas con recojo físico). RedPontis, del lado Admin RP, **solo ve la cola de aprobación** — no administra eventos ajenos directamente (regla de negocio explícita, no un recorte de UI).

### 3.2 Creación y Publicación de Eventos
**Dónde:** `OrganizadorFront.jsx` → `EventoDrawer` (componente único reutilizado en 2 superficies: el panel del Organizador B2B y `SponsorEventosTab` del Mundo para Embebido). **Tabla:** `events`.

Formulario completo: `nombre, descripcion, fecha, hora, lugar, imagenUrl, mapaUrl/mapaNombre (PDF), tipo ("presencial"), metodoAcceso ("qr"), tipoEvento ("kermesse"), privado (switch — oculta del marketplace/landing pública), modo, organizadorId (obligatorio si modo=b2b sin organizador fijo), tiposEntrada[] (ver §3.3), politicaReembolso, instrucciones, publicarEnLanding, publicarEnApp`.

Publicación: `upsertEventoRemote` (upsert por `id`) + `syncTicketTypesRemote` (reemplazo completo del set de tipos de entrada, con protección: un tipo con entradas ya vendidas nunca se borra, queda conservado y se avisa al organizador cuáles quedaron "bloqueados"). Eliminación (`deleteEventoRemote`) solo permitida si `event_tickets` del evento está vacío — si tiene ventas, se rechaza con mensaje explícito; al borrar limpia en cascada `event_ticket_types`, `event_merchants`, `event_agenda_items`, productos exclusivos, y libera el hardware POS prestado (`pos_devices.event_id → null`).

**Cronograma / Agenda** (sub-componente, mismo drawer, paso adicional): `event_agenda_items` — `hora, titulo, descripcion, orden, lugar, expositor, imagen_url`. Solo editable con el evento ya guardado (necesita `event_id` real). Render en la app: `EventoAgendaSection`.

### 3.3 Ticketing y Control de Aforo
**Dónde:** admin — `EventoDrawer` (definición de tipos); app — `EventoEntradasSection` (`Module.jsx`). **Tablas:** `event_ticket_types`, `event_tickets`.

Cada evento tiene 1+ tipos de entrada (`event_ticket_types`): `nombre, descripcion, precio, moneda, cupos, min_por_compra (def. 1), max_por_compra (def. 4), venta_desde, venta_hasta, validacion="QR", permite_reingreso (def. true), vigencia_hasta, preventa/precompra/prereserva (switches independientes)`.

**Regla de negocio crítica — doble bloqueo de venta** (`comprarTicketsLive`, `supabaseClient.js:255`):
```
1. aforo_total del EVENTO (suma de todos los tipos) — si vendidas + cantidad > aforo_total → bloquea ("aforo")
2. cupos del TIPO específico — si vendidas_de_ese_tipo + cantidad > tipo.cupos → bloquea ("cupos")
3. Ventana de venta: fecha "hoy" en LOCAL (no UTC — bug histórico ya corregido) contra venta_desde/venta_hasta
4. Si precio > 0: pagarSupabase (débito real de wallet) — si falla, "saldo"
5. Solo entonces: INSERT en event_tickets con qr_code generado, estado="emitido"
```
La UI (`EventoEntradasSection`) deshabilita el tipo agotado/fuera de ventana/con aforo lleno ANTES de intentar comprar — el backend repite el chequeo igual (doble validación cliente+servidor).

`event_tickets`: `event_id, ticket_type_id, world_id, user_id, qr_code, precio, estado (emitido|checkin|checkout|anulado), checkin_at, checkout_at, transfer_token, transfer_created_at, created_at`.

### 3.4 Control de Acceso (Check-in / Check-out)
**Dónde:** `EventoAsistenciaCard` (`OrganizadorFront.jsx:890`). **Tabla adicional:** `event_checkin_log`.

El operador escanea/pega el `qr_code` — la validación busca el ticket por código exacto entre los ya vendidos del evento (sin roundtrip nuevo) y **alterna** ingreso/salida según el estado actual (`checkin↔checkout`), no rechaza un ticket ya usado salvo la regla de reingreso:

**Regla de reingreso:** un tipo de entrada con `permite_reingreso=false` solo deja hacer el PRIMER ingreso — un ticket que ya hizo `checkout` con ese tipo no puede volver a entrar (`rechazar("reingreso_no_permitido")`).

**Seguridad — rotación de QR:** cada `checkin` genera un `qr_code` NUEVO sobre el mismo ticket (`setTicketEstado`, `supabase.js:1052`) — invalida el código anterior en cada ingreso, evita que un QR compartido/capturado sirva para reingresar sin límite. Esto es una corrección de seguridad real (Gantt #64), no cosmética.

**Historial real de reingresos:** `event_checkin_log` (`event_id, ticket_id, tipo: ingreso|salida, created_at`) — separado de `event_tickets.checkin_at/checkout_at` (que son columnas únicas, se sobrescriben) para poder contar cuántos ingresos tuvo un ticket a lo largo del evento y mostrar "Últimos ingresos" en vivo.

### 3.5 Comercios Afiliados y Precompra
**Dónde:** `EventoComerciosCard` (`OrganizadorFront.jsx`, autoría) + `EventoMarketplaceSection`/`PrecompraEventoDrawer` (`Module.jsx`, consumo). **Tablas:** `event_merchants`, `products` (con `event_id`), `event_product_orders`.

**Afiliación:** el organizador afilia comercios del Mundo (`afiliarComercioEvento`, upsert por `event_id+merchant_id`) o crea uno **ad-hoc** solo para ese evento (`crearComercioAdHocEvento` — `merchant_id` sintético vía `crypto.randomUUID()`, `es_ad_hoc=true`, no es un merchant permanente del Mundo). `updateUbicacionEventoComercio` fija el "Stand N" de cada uno. La vitrina de la app (`EventoMarketplaceSection`) muestra SOLO los afiliados reales — no todos los comercios del mundo (gap corregido, era un bug real: antes mostraba el directorio completo sin afiliación de por medio).

**Precompra (autoría, lado comercio):** el comercio carga productos exclusivos del evento en un catálogo **aislado** del regular — misma tabla `products` pero con `event_id` seteado (`event_id IS NULL` = catálogo de todos los días). Incluye stock real con badge Agotado/Stock/Sin límite.

**Precompra (consumo, lado asistente):** `PrecompraEventoDrawer` — el asistente que ya compró su entrada ve los productos del evento (`fetchProductosEventoLive`), paga con su saldo real (`comprarProductosLive`, la MISMA RPC atómica de cobro+decremento de stock que usa Marketplace, sin duplicar lógica), y queda un `event_product_orders` (`CONFIRMADA`) pendiente de retiro. El comercio lo marca `ENTREGADA` en su panel al momento de la entrega física en el stand.

**Manejo de error (fix reciente, commit `5957f22`):** si el cobro se ejecuta pero el `INSERT` del pedido pendiente falla, `crearPedidoEvento` reintenta una vez; si aun así falla, devuelve `{ok:false, motivo:"orden_no_registrada", cobrado:true}` explícito — la UI nunca debe decir "no se pudo pagar" cuando el dinero sí se movió, debe avisar que el retiro quedó sin registrar formalmente.

### 3.6 Banditas Cashless de Evento
**Dónde:** `TabBanditasEventoOrganizador` / `EventoBanditasCard` (`OrganizadorFront.jsx:1062`). **Tablas nuevas:** `event_guest_lists`, `event_guests`. Diseño completo: `docs/arquitectura/03-diseno-cashin-evento.md` (Task #119).

Resuelve un caso distinto al de la wallet normal: **el invitado puede no tener cuenta en la app.** Flujo:
1. **Importar lista** (CSV `nombre,documento`) → crea `event_guests` con `guest_user_id` sintético (`guest-{event_id}-{documento}`) + una fila `wallets` real en `balance=0` (reuso total de la tabla de wallet existente — cero sistema de dinero paralelo).
2. **Activar pulsera** — el operador busca al invitado por documento (no por código JOI, no lo tiene), tapea la banda física, opcionalmente precarga un monto real (vía `mover_saldo_wallet`, tipo `recarga_evento` — queda en el ledger real, no es un número inventado).
3. **Cash-in** — recarga adicional durante el evento contra la misma wallet.
4. **Consumo** — usa el `mover_saldo_wallet`/POS de cobro YA existente sin ningún cambio; una bandita de evento cobra exactamente igual que una bandita normal porque ambas son solo una `wallet` con un `user_id`.
5. **Vigencia distinta a la bandita normal:** no son meses (`vigenciaBanditasMeses`) — vence a la fecha del evento + un margen en días configurado al activar (`event_guests.vence_at`).
6. **Monitoreo** — tabla en vivo por invitado: precargado, saldo vivo, consumido (join contra `wallets`/`transactions`).

`event_guests`: `id, guest_list_id, event_id, world_id, nombre, documento (único por evento), guest_user_id, user_id_real (nullable — reclamo futuro hacia cuenta real, fuera de MVP), bandita_codigo, saldo_inicial, estado (invitado|bandita_asignada|activo|cerrado), vence_at, created_at`.

### 3.7 Liquidación por Evento
**Dónde:** `TabLiqOrganizador` (`OrganizadorFront.jsx:1286`).

Cada evento genera una **instancia de liquidación propia e independiente** del corte diario de la operación regular del Mundo (cafetería/kiosco, que sigue su propio `Módulo de Liquidación` a las 19:00 PE). Cálculo real: `ingresos = Σ(precio × vendidas)` por tipo de entrada del ticket real vendido (no simulado) → `comisión = ingresos × comisionPct/100` (el `comisionEntrada` de §3.1) → `neto = ingresos - comisión`. Corte: **T+1 tras el cierre del evento**. El neto se acredita a la cuenta bancaria del acuerdo comercial del Mundo.

### 3.8 Transferencia de Entradas
**Dónde:** `MisEntradasList` (`Module.jsx`). Solo entradas en estado `"emitido"` (no usadas) son transferibles.

Dos mecanismos, ambos reales:
- **Por código JOI** (`transferirEntradaRemote`): el emisor teclea el código del destinatario — requiere conocerlo de antemano.
- **Por enlace** (`crearEnlaceTransferenciaEntrada` / `reclamarEntradaPorToken`, Gantt #65): genera un `transfer_token` de un solo uso, comparte el link (`navigator.share` o copiar), el destinatario lo abre en `/reclamar/:token` (`ClaimTicket.jsx`) y reclama sin conocer ningún código. Requiere sesión — si no está logueado, el `Guard` preserva la ruta vía `?next=` para volver al claim después del login.

Ambos rechazan si el ticket ya no está `"emitido"` o si el destino es el mismo usuario.

### 3.9 Reportería y Gobernanza Cross-Mundo
**Dónde:** `Gobierno.jsx` (Admin RP). Dos piezas:

**Cola de aprobación** (`fetchEventosPendientesGlobal`/`setEventoEstadoRemote`) — cross-mundo, mezclada en la misma cola que "Solicitud de Alta de Comercio". `DetalleEventoPendienteModal` muestra TODO lo que el mundo cargó (mapa, imagen, tipos de entrada) antes de aprobar/rechazar. Rechazo con motivo obligatorio → dispara `crearAlertaMundo` (notificación real al mundo). Historial de resueltos (aprobados + rechazados) queda visible, no desaparece tras resolver.

**Reportes** (`ReportesEventosRP`): eventos totales, por estado, por mundo, entradas vendidas, recaudación, comisión RedPontis (`m?.eventosConfig?.comisionEntrada`) — cross-mundo.

**Gap documentado explícitamente en la propia UI, no simulado:** "Consumos dentro de eventos" (venta de productos de comercio en el stand) no es atribuible a un evento en este reporte — `transactions` no guarda `event_id`. Mismo gap señalado en `EventoAsistenciaCard`: "productos más vendidos", "actividades más concurridas" y "consumo promedio" no son calculables con el modelo actual. Estado de pulseras NFC no se lleva por evento, solo por mundo (excepto las banditas cashless de §3.6, que sí son por evento).

---

## 4. Modelo de datos completo

```
events
  id, world_id, organizador, titulo, descripcion, tipo, categoria,
  fecha, hora, lugar, aforo_total, aforo_tipo, privado,
  estado (PENDIENTE_APROBACION | PUBLICADO | RECHAZADO),
  moneda, modo (b2b | b2c | embebido), organizador_id,
  imagen_url, mapa_url, mapa_nombre, ux_components (jsonb array),
  creado_por_user_id, created_at, updated_at

event_ticket_types
  id, event_id, nombre, descripcion, precio, moneda, cupos,
  min_por_compra, max_por_compra, venta_desde, venta_hasta,
  validacion, permite_reingreso, vigencia_hasta,
  preventa, precompra, prereserva

event_tickets
  id, event_id, ticket_type_id, world_id, user_id, qr_code, precio,
  estado (emitido | checkin | checkout | anulado),
  checkin_at, checkout_at, transfer_token, transfer_created_at, created_at

event_checkin_log
  id, event_id, ticket_id, tipo (ingreso | salida), created_at

event_agenda_items
  id, event_id, hora, titulo, descripcion, orden, lugar, expositor, imagen_url

event_merchants
  id, event_id, merchant_id, merchant_nombre, ubicacion,
  logo_url, es_ad_hoc, created_at

products (compartida con Comercios/Menú; event_id NULL = catálogo regular)
  id, world_id, merchant_id, event_id, name, price, category,
  stock, active, image_url, created_at

event_product_orders
  id, world_id, event_id, merchant_id, beneficiario_user_id,
  beneficiario_nombre, items (jsonb), monto,
  estado (CONFIRMADA | ENTREGADA), entregado_at, created_at

event_guest_lists
  id, event_id, world_id, nombre_archivo, importado_at, importado_por

event_guests
  id, guest_list_id, event_id, world_id, nombre, documento,
  guest_user_id, user_id_real, bandita_codigo, saldo_inicial,
  estado (invitado | bandita_asignada | activo | cerrado),
  vence_at, created_at
```

Tablas reutilizadas sin cambio de esquema: `wallets`, `transactions`, `nfc_bands`, `pos_devices` (columna `event_id` nullable, para hardware asignado a un evento específico), `merchants`, `error_catalog`/`error_log`.

---

## 5. Render config del motor

Eventos fue la capacidad **piloto** del Render Engine general (documentado en `kiro_steering/render-config.md`) — el mecanismo se probó primero acá antes de generalizarse:

```js
// joi360-app/src/pages/Module.jsx
const EVENT_SECTION_REGISTRY = {
  hero:        (p) => <EventoHeroSection {...p}/>,
  entradas:    (p) => <EventoEntradasSection {...p}/>,
  agenda:      (p) => <EventoAgendaSection {...p}/>,
  marketplace: (p) => <EventoMarketplaceSection {...p}/>,
};
```

Cada evento trae su propio `events.ux_components` (array, default `["hero","entradas","agenda","marketplace"]`) — el detalle del evento en la app renderiza SOLO esas secciones, en ese orden, resolviendo cada string contra el registry. Es un render config DENTRO de la capacidad `eventos`, un nivel más granular que el `TEMPLATE_MAP` general (que resuelve `moduleId → EventosTemplate` completo).

`EventosTemplate` (el template dedicado de `TEMPLATE_MAP.eventos`) separa el marketplace en 2 grupos — `eventosDelMundo` (`modo==="embebido"`) vs `otrosEventos` (b2b/b2c) — para no mezclar visualmente un evento publicado por el propio Mundo con uno de un organizador externo o de otro usuario.

---

## 6. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **Admin RP** | `Gobierno.jsx` — cola de aprobación + reportes cross-mundo | Único punto de aprobación; solo ve la cola, no administra eventos ajenos |
| **BackOffice Mundo / Organizador** | `OrganizadorFront.jsx` — `OrganizadorGate`, `TabEventosOrganizador`, `EventoDrawer`, `TabAsistenciaOrganizador`, `TabBanditasEventoOrganizador`, `TabLiqOrganizador` | Creación, ticketing, check-in, cashless, liquidación por evento |
| **BackOffice Mundo (Embebido)** | `SponsorEventosTab` (`Fronts.jsx`) | Mismo `EventoDrawer`, gateado por `eventosConfig.embebidoActivo` |
| **BackOffice Comercio** | `EventoCatalogoComercio` (autoría precompra) + entrega de `event_product_orders` | Carga productos exclusivos del evento, marca entregas |
| **App Operador** | Hardware POS asignable por evento (`pos_devices.event_id`) | Sin shell propio de eventos — el check-in real vive en `EventoAsistenciaCard` (web, dentro del panel del Organizador) |
| **App Usuario** | `Module.jsx` → `EventosTemplate` (marketplace, wizard B2C) + `EVENT_SECTION_REGISTRY` (hero/entradas/agenda/marketplace) + `MisEntradasList` (QR, transferencia) + `PrecompraEventoDrawer` | Compra, check-in propio (mostrar QR), transferencia, precompra |
| **Deep-link** | `?evento=<id>` desde el carrusel de Eventos en Home (`Hub.jsx`) | Abre el detalle directo, sin pasar por el listado genérico |

---

## 7. Reglas de negocio críticas (resumen ejecutable)

1. Ningún evento se publica sin pasar por la cola de aprobación de RedPontis — sin excepción por modo.
2. Venta de entradas: doble bloqueo (aforo del evento Y cupos del tipo específico), ventana de venta en fecha local, débito real antes de emitir el ticket.
3. QR de entrada se **rota** en cada check-in — nunca el mismo código sirve dos veces para reingresar.
4. Reingreso solo permitido si `permite_reingreso=true` en el tipo de entrada comprado.
5. Solo entradas `"emitido"` son transferibles; toda transferencia (código o enlace) es de un solo uso y verifica que no sea al mismo usuario.
6. Eliminar un evento exige cero entradas vendidas — si tiene ventas, se rechaza explícitamente.
7. Precompra: el cobro y el registro de retiro son pasos separados — si el registro falla tras un cobro exitoso, se declara explícitamente "cobrado, retiro sin registrar", nunca "no se pudo pagar".
8. Las pulseras cashless de evento reutilizan 100% el sistema de wallet existente — cero lógica de dinero paralela, cero tabla de saldo nueva.
9. La liquidación de un evento es una instancia propia, separada del corte diario de comercios del Mundo.
10. Ningún dato no-calculable con el modelo actual (consumos por evento, productos más vendidos, pulseras NFC regulares por evento) se simula — se documenta el gap explícitamente en la propia UI.

---

## 8. Estado y versionado

Capacidad `eventos` — **v1.0.0**, `tier: OPCIONAL`, depende de `wallet, comercios` (`DEPENDENCY_MAP`). Construida y verificada end-to-end en producción contra datos reales del Caso Kermesse (Colegio Raimondi) — no es una maqueta. Los 9 microservicios de §3 están TODOS construidos y en producción; el único tramo parcial documentado es el canje de "método de acceso QR" a nivel POS-de-punto-de-venta para la precompra de Menú (capacidad distinta, no de Eventos).

**Componentes que este documento agrega formalmente al catálogo** (no existían como `microservicios[]` declarados en `MODULE_CATALOG.eventos` hasta ahora): la jerarquía de 9 piezas de §3. Si se decide reflejarlo en código (mismo patrón que `wallet`/`comercios`/`bnpl`), este documento es la fuente para ese `microservicios: [...]`.

---

## 9. Referencias

- `docs/arquitectura/03-diseno-cashin-evento.md` — diseño original de banditas cashless de evento (Task #119).
- `docs/arquitectura/kiro_steering/render-config.md` / `capacidades.md` — contrato general de render config, incluye la entrada resumida de `eventos` en el catálogo de 22 capacidades.
- `docs/arquitectura/mapeo_maestro/src/01_backbone.md` — mecánica general de activación/dependencias por capacidad.
- `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` — directiva de qué debe replicar el proyecto nativo de Salvador, incluida Eventos como una de las 19 capacidades `v1.0.0`.
