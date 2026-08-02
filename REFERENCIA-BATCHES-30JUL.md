# JOI360 · Referencia de build — sesión 30 jul 2026 (Batches 1-6)
> Fuente única: Supabase `kobtxrhycaloyjkeyspv` · Producción: https://joi360-admin.vercel.app · https://joi360-app.vercel.app
> Complementa a `ESTRUCTURA-CATALOGOS-Y-MUNDOS.md` (17-jul) — no lo reemplaza, esta sesión construye sobre esa base.

## 0 · Disparador
Revisión del Admin Mundo y del panel RedPontis detectó que varias pantallas mostraban datos mock (KPIs por hash, catálogos locales sin sincronizar) o exponían al sponsor controles que debían ser exclusivos de RedPontis (tasas, comisiones). Se ejecutó un plan de 6 batches, cada uno construido → desplegado → verificado en vivo antes de pasar al siguiente.

## 1 · Batch 1 — Admin Mundo: KPIs reales, sin edición de tasas
- Se eliminó la pestaña única "Mis módulos" (agrupaba todo bajo una categoría y dejaba editar `mdrDefault`/`fijoTxDefault`, un rate que debe ser solo-RedPontis).
- Cada módulo activo tiene ahora su propia pestaña con datos reales (Wallet, Consumos, Inventario, Control, Menú, Perfil extendido, Promociones) — sin `mockKpi()` (hash determinístico), con estados vacíos honestos cuando no hay datos aún.
- **Liquidación dejó de ser de solo lectura**: `generarLiquidacionMundo(mundoId)` corre al abrir la pestaña, calcula el corte real (`fetchVolumenPeriodoMundo` × `m.acuerdo.tipo`: transaccional/mixto/revenue/fijo) y lo persiste en `liquidaciones`. Verificado con datos reales: S/63.00 volumen → mixto (5% + fijo/30) → S/53.15 comisión → S/9.85 neto.
- El sponsor nunca ve ni edita MDR/comisión/tasa en ningún punto del panel.

## 2 · Batch 2 — Cola de aprobación cross-mundo + alertas reales
- `Gobierno.jsx` ya tenía una cola real (eventos + solicitudes de comercio) pero vivía fuera del menú. Ahora está en el sidebar ("Aprobaciones"), con filtro por tipo.
- Rechazar exige un motivo (modal, textarea obligatorio) — se guarda en `events.motivo_rechazo` / `merchant_requests.motivo_rechazo` y dispara una alerta real al mundo (`world_alerts`), visible en la campanita del sponsor (antes decorativa, ahora con badge de no-leídas y detalle del motivo).
- "Resueltos recientes" lista lo aprobado/rechazado con ícono de ojo para ver el motivo.
- SQL: `supabase-aprobaciones-alertas-30jul.sql`.

## 3 · Batch 3 — Motor de Eventos: B2B / B2C / Embebido explícito
- Antes, B2B/B2C se derivaba de `m.type` (no era una elección) y Embebido podía coexistir con B2B.
- Ahora `m.eventosConfig.modoEventos` es explícito. Regla de negocio (`modosDeMundo()` en store.js):
  - **B2B** → mundo organizador dedicado. Embebido y B2C quedan deshabilitados. Se entrega el Dashboard B2B Organizador.
  - **B2C** → puede convivir con **Embebido** (el propio mundo publica sus eventos). Activar Embebido exige elegir un modelo de comisión de RedPontis (% por entrada / mixto / revenue fijo) antes de guardar.
- Migración transparente para mundos existentes (default B2B salvo `type === "eventos_rp"`) — Raimondi/Kermesse siguieron funcionando igual tras la migración.

## 4 · Batch 4 — Pricing "Gratuito" + Calculadora + contrato PDF
- **Catálogo global no cobra hoy** (ni mantenimiento, ni implementación, ni por módulo). Se agregó un toggle "Gratuito por el momento" en el pricing por-mundo-por-módulo (`ModuleConfigDrawer` → tab Pricing), default ON. Al activarlo se ocultan los campos de modelo/monto; al desactivarlo, RedPontis puede fijar un pricing real.
  - Importante: esto es **distinto** del acuerdo comercial del mundo (`m.acuerdo.tipo`, usado por Liquidación) — ese sigue siendo el revenue real entre RedPontis y el sponsor, no se tocó.
- Contrato (`ContratoView`) refleja "GRATUITO POR EL MOMENTO" en vez de un monto falso cuando aplica.
- **Calculadora Comercial**: pasos numerados (1-4), panel de resultado sticky con "Neto al sponsor" grande — mismo dato real de antes (mdr/fijoTx por merchant/mundo), solo más intuitivo.
- **Carga manual de contrato PDF**: en el wizard de creación de mundo y en la ficha del mundo (botón "Adjuntar contrato" / "Ver contrato"). El PDF subido es la fuente de verdad; el documento auto-generado queda como "Ver borrador" de referencia.
- SQL: `supabase-storage-media-bucket-30jul.sql`.

## 5 · Batch 5 — Fotos reales + compra asociada a un dependiente
- Nueva capacidad de Storage (`joi360-media`) usada por: foto de perfil de comercio (tab "Mi perfil" del merchant), imagen por producto ("Mi catálogo"), y contrato PDF (Batch 4).
- `useMerchantsLive` (joi360-app) ya no recorta el merchant a `{id, nombre}` — incluye `photo_url`. El carrusel de comercios en el Hub muestra la foto real cuando existe.
- Tocar un comercio en el Hub abre el Marketplace filtrado a ese comercio, con una cabecera de "detalle" (foto + nombre + conteo de productos) y un selector "Comprando para" (titular o cualquier dependiente).
- La compra usa `comprarProductosLive(beneficiario.id, ...)` — debita el saldo del dependiente elegido, no siempre el del titular. Verificado end-to-end (producto con imagen real → agregar → checkout con saldo real del dependiente mostrado).
- Fix de bug real encontrado en el camino: `upsertProductRemote` (supabase.js) hacía allowlist de columnas en el PATCH/POST y descartaba silenciosamente `image_url` — un merchant podía "subir" una foto de producto que nunca se guardaba. Corregido.
- SQL: `supabase-productos-merchants-fotos-30jul.sql` (usa el bucket de `supabase-storage-media-bucket-30jul.sql`).

## 6 · Batch 6 — Hardware: banditas NFC + fix de canales de adquirencia
- Confirmado que la asignación de POS/Tótem por modelo (`HardwarePOS.jsx` + `pos_devices` + `HARDWARE_CATALOG`) **ya era real**, no mock — no requirió cambios.
- Nueva pestaña "Banditas NFC" en Hardware: carga masiva por CSV (un código por línea, agrupado por el nombre de lote elegido antes de subir el archivo), conteo real disponible/asignada/total por lote, asignación a un mundo.
- **Fix del bug real** detrás de "canales en la config de un mundo muestra data mock": los toggles `adq_<canal>` (Canales de Adquirencia, dentro de Configurar Comercios → tab Canales) se guardaban en local pero se borraban en cada sync sin ningún destino remoto — nunca sobrevivían a una sesión nueva. Ahora persisten en `world_acquiring_channel_configs`. Verificado: apagar/prender Tap2Phone en Raimondi round-tripea correctamente a Supabase.
- POS "Cobrar" (merchant): el input de código ya soportaba lectores tipo teclado-USB (Enter dispara `identificar()`) y la cadena completa (identificar + cobrar) son 4 round-trips REST reales sin delay artificial — dentro del objetivo de <3s. Se agregó autofocus + un hint visible ("O escanea con el lector NFC/QR…") para que quede explícito al merchant.
- SQL: `supabase-nfc-bands-canales-adquirencia-30jul.sql`.

## 7 · Modelo de datos — tablas/columnas nuevas de esta sesión
| Tabla / columna | Para qué |
|---|---|
| `events.motivo_rechazo`, `merchant_requests.motivo_rechazo` | Motivo de rechazo capturado en la cola de aprobación |
| `world_alerts` | Alertas reales al mundo (ej. rechazo de aprobación) |
| Storage bucket `joi360-media` | Contratos PDF, foto de comercio, foto de producto |
| `products.image_url`, `merchants.photo_url` | Fotos reales mostradas en el super app |
| `nfc_bands` | Stock real de banditas NFC por lote |
| `world_acquiring_channel_configs` | Toggles reales de canales de adquirencia por mundo (fix del gap de sync) |

Ver también la Sección 5 de `ESTRUCTURA-CATALOGOS-Y-MUNDOS.md` para el modelo de datos previo a esta sesión.

## 8 · Snapshot de datos reales
La carpeta `supabase-data-reales/` contiene un export real (no mock) de las tablas estructurales del proyecto, tomado el 30-jul-2026 directo de Supabase vía REST — útil como referencia de qué hay realmente cargado en el ecosistema demo en este momento (mundos, comercios, productos, eventos, dependientes, wallets, transacciones, etc.).

## 9 · Pendiente conocido (fuera de alcance de esta sesión)
- El catálogo global de "canales" (`Adquirencia.jsx` / `CHANNELS_SEED` / `st.adqChannels`) sigue siendo local-only — distinto del fix del punto 6, que fue sobre los toggles **por mundo**. Si se necesita sincronizar ese catálogo global también, seguir el mismo patrón que `emission_channels` (`syncEmissionChannels`/`pruneStaleEmissionChannels` en supabase.js).
- Redención física de banditas NFC vía POS (reconocer + cargar el `dependent_user_id` desde una bandita física asociada) queda conceptualmente resuelta (el `dependent_user_id` ya es el mismo identificador usado en QR y en `buscarWalletPorCodigo`), pero no hay todavía un flujo que vincule un código de `nfc_bands` a un `dependent_user_id` específico — es la siguiente pieza natural si se retoma este frente.
