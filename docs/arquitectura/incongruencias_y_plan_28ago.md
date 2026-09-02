# JOI 360 — Incongruencias, Puntos de Choque y Plan de Arreglo

Corte 28-ago-2026 · insumo para el corte del 04-sep y para la entrega a desarrollo (Salvador / Kiro).

## 1. Método

5 agentes de auditoría en paralelo, uno por frente, cada uno cruzando **documento vivo ↔ render config ↔ código real ↔ esquema de Supabase**:

| Agente | Frente | Alcance |
|---|---|---|
| 1 | Admin RedPontis | Catálogo Global, Capacidades, Mundos, Usuarios, Liquidación, Gobierno, Soporte, Contrato, Calculadora, Hardware |
| 2 | Panel Mundo / Merchant / Organizador | `Fronts.jsx`, `OrganizadorFront.jsx`, `MundoDetail.jsx` (tabs), `EntregaMerchant.jsx` |
| 3 | Superapp | `Module.jsx` (`TEMPLATE_MAP` + 22 templates), Hub, Activity, Pay, Profile, hooks, stores |
| 4 | POS / Operador | web `/operador`, nativo `joi360-operador`, `joi-pos-backend`, `CobrarPanel`, `HardwarePOS` |
| 5 | Render config + Esquema + Docs | `MODULE_CATALOG` / `FLAG_DEV_MAP` / `MODULOS_PROXIMAMENTE` / `TEMPLATE_MAP` / sync, `capacities` + `capacity_feature_flags` + `world_*` en Supabase, todos los `.md` del maestro |

~60 hallazgos. Consolidados en **10 tracks de arreglo con desarrollo independiente**.

Verificado contra la base viva (Management API): `fix-234` está aplicado — `mover_saldo_wallet` tiene `pronargs=8` con el candado de dueño/turno + restricciones. `mover_cashback_wallet` también tiene el candado de identidad. Las 4 tablas nuevas (`turno_pedidos`, `reservas`, `estacionamiento_sesiones`, `subsidios`) existen con las columnas exactas de sus `.sql`.

---

## 2. Inventario de incongruencias por severidad

**Severidad**: 🔴 Alta = riesgo de dinero / seguridad / dato falso que alguien ve · 🟠 Media = confunde al operador o rompe confianza en un número o el doc miente · ⚪ Baja = código muerto / cosmético / riesgo latente sin impacto hoy.

### 🔴 Alta

| ID | Hallazgo | Dónde | Track |
|---|---|---|---|
| A1 | La "frecuencia de liquidación" elegida al crear un Mundo **nunca llega al motor de corte**. Hay 3 claves paralelas (`acuerdo.frecuenciaLiquidacion` wizard/ficha · `settlementFrequency` TabAcuerdo/Calculadora · `liquidacion_frecuencia` microservicio) y el corte real (`procesarLiquidacionMundo`) solo lee la última, que el wizard jamás setea → **todo mundo se liquida diario**. Confirmado en prod: `mundo-3ox15t` = "semanal" en la ficha, "quincenal" en TabAcuerdo, corta diario. | `Mundos.jsx:838-842`, `store.js:1707-1727`, `MundoDetail.jsx:2878` | A |
| A2 | La Calculadora Comercial **descuenta una "Retención RP %"** (y muestra frecuencia/vigencia) que ningún motor aplica. El motor: `neto = volumen − comision − descuentoHardware`. El "documento de negociación" que el admin copia y le manda a un sponsor declara un neto y unos términos que la liquidación real ignora. | `Calculadora.jsx:48,145-148` vs `store.js:1794-1810` | A |
| A3 | La **MDR y el "neto a acreditar" que ve el Merchant** se calculan con `comercio.mdrOverride ? comercio.tarifa : (adqChannels[0]?.mdr ?? 1.5)`. `comercio.mdrOverride` **no se escribe en ningún lado del repo** → la condición es siempre falsa → siempre cae a un canal global o al literal `1.5%`. La tarifa real del comercio (`comercio.tarifa`, que sí trae el override desde `merchants.mdr_override`) nunca se usa. Cada comisión/neto que el comercio ve en su panel está mal para MDR ≠ 1.5%. | `Fronts.jsx:4139,4234,4254-4271` | A |
| B1 | `organizadores.password` se inserta **en texto plano** (sin `crypt()`), es legible con la anon key pública (`GET organizadores?select=password` → 200), y `organizadorLogin` compara en el cliente contra el store local — que solo se escribe al crear, nunca se re-lee de Supabase → **un organizador real solo puede entrar desde el navegador que lo creó**. Además el filtro de estado compara `"INACTIVO"` contra el valor real `"inactivo"` → desactivar un organizador no bloquea su login. | `supabase.js:2588`, `store.js:1339-1340`, `OrganizadorFront.jsx:203-233` | B |
| B2 | `merchants.pos_pin_hash` / `worlds.pos_pin_hash` son **legibles con la anon key** y es bcrypt cost 6 sobre un PIN de 4 dígitos → 10 000 candidatos, fuerza bruta offline en segundos. La protección "solo vía RPC `security definer`" se evita por completo. Con el PIN recuperado se entra al POS y, con turno abierto, se cobra. | `merchants.pos_pin_hash` / `worlds.pos_pin_hash` | B |
| B3 | Las **credenciales usuario/contraseña del Panel de Merchant nunca llegan a Supabase** — `EntregaMerchant.entregar()` no tiene columna ni envía el par; `c.credenciales`/`c.entregado` se setean solo en el store local; `reconciliarComerciosMundo` reconstruye el comercio sin ellas. → login cross-device imposible; el drawer de entrega entrega un usuario/contraseña que no sirve para el destinatario. El PIN sería la vía alterna pero `reconciliarComerciosMundo` fuerza `pos:0` y `EntregaMerchant` solo genera PIN si `pos>0` → para comercios reconciliados (el caso normal) **ninguna de las dos vías funciona fuera del navegador que hizo la entrega**. | `EntregaMerchant.jsx:94-120`, `supabase.js:700-716,834-859`, `store.js:1974` | B |
| B4 | La app nativa envía el **PIN del comercio como campo `operador`** y `joi-pos-backend` lo persiste en `pos_turnos.operador` (tabla legible con anon key) → cada "abrir caja" desde el T6 escribiría el PIN de 4 dígitos en cleartext, anulando el hasheo. **Latente**: el APK todavía apunta al backend viejo, nunca abrió turno en prod. | `joi360-operador/.../Api.kt:104-111`, `joi-pos-backend/routes/turnos.js:36,57` | B |
| C1 | `SubsidioTemplate` calcula `hoy = new Date().toISOString().slice(0,10)` (UTC). En Perú (UTC−5), después de ~19:00 local ya es mañana → un subsidio con `vigente_hasta` = hoy se excluye de `activos` → **el saldo grande del hero baja por ese monto** y la acreditación se marca **"Vencido" ~5 h antes** de su vencimiento real, cada tarde/noche. Datos en la base correctos; es render. Mismo patrón que se arregló en `ReservasTemplate` (`4c9851b`). | `Module.jsx:3741-3743,3786` | C |
| D1 (proceso) | **9 tablas / RPCs de dinero se aplican a mano** en el SQL Editor sin registro de qué versión está en prod. Verificado ahora que `fix-234` y las 4 nuevas SÍ están aplicadas — pero no había forma de saberlo sin introspección directa. `mover_cashback_wallet` y `verificar_login_sponsor` **no tienen `.sql` en el repo** (solo el caller JS). | `docs/arquitectura/*.sql` (varios), `supabase.js:2384` | J |
| E1 | Dos mundos **"Jockey Plaza" vivos** en `worlds`: `mundo-3ox15t` (CR-01, piloto real, entregado, 19 caps, 3 merchants) y `mundo-x1g98k` (RE-LIM-002, **creado 28-ago 01:09 PE**, no entregado, 4 caps base, 0 merchants, 0 txs — data de QA sin limpiar). Ambos `status=activo` → el selector de comunidades de la superapp lista "Jockey Plaza" **dos veces**, una casi sin configurar, al lado del piloto entregado a un sponsor real. | tabla `worlds` | Fase 0 |
| E2 | `syncCatalogRemote` hace `version: "1.0"` **hardcodeado** en el upsert a `capacities` → las 22 filas en Supabase tienen `version:"1.0"` (formato distinto a `"1.0.0"`), **incluidas `facturacion`/`credito`/`asistencia`** (que en código son `0.0.0` = no construidas). El semver por capacidad — que dev toma "tal cual" — no llega al contrato compartido. Hoy acotado (la superapp no lee `capacities.version`), pero cualquier consumidor futuro del contrato vería Facturación/Crédito/Asistencia como released. | `supabase.js:1448` | E |

### 🟠 Media (resumen — detalle en la sección por track)

- **Liquidación**: `retentionPercentage`, `settlementFrequency`, `validFrom/validUntil` — todos solo-proyección, la venta y el corte real los ignoran (Discrepancias #5/#6/#7 del maestro, siguen abiertas).
- **Docs de frente stale**: `01_backbone.md` (21 vs 22 capacidades, `MODULOS_PROXIMAMENTE` 11 vs 3, color pre-rebrand, sin `suscripciones`), `03/04/05/06` (12-ago — describen UI eliminada, listan 11 "Próximamente", omiten flujos enteros: aprobación de Cashback, devoluciones con step-up, `SubsidioPanel`, precompra en superapp, 2 modos del Operador), `06` **contradice** al `08` sobre `fix-234`, `07_design_system.md` §12 muestra la paleta pre-rebrand que ya no existe.
- **`09_backlog.md` no se actualizó para el corte v1.2** — sigue diciendo que las 4 migraciones SQL están pendientes de correr (ya se corrieron).
- **`capacity_feature_flags` contaminado**: 96 filas para lo que deberían ser ~50 — id estable + nombre legible como dos filas, y flags para servicios que el catálogo quitó explícitamente (`loyalty:canje_app/pos`, `promociones:Banner/Push/A-B`). `ensureGlobalFlag` solo hace INSERT, nunca DELETE. La promesa "no prometer lo no construido" solo se cumplió en el array local.
- **Estado de dev por flag solo en `localStorage`**: cambiar `dev_status`/`api` de un feature flag en el Catálogo dice "publicado en la app" pero `syncCatalogRemote` nunca lo escribe → dos admins ven cosas distintas; el gate Nivel-2 del admin de mundo diverge por sesión.
- **Suscripciones — dos panes se contradicen**: `SponsorSuscripcionesTab` promete "se cobran solos cada mes"; `PlanesSuscripcionPanel` comenta "no existe mecanismo de recobro recurrente". (El motor recurrente `sincronizarCicloSuscripcionesMembresia` **sí existe** y corre en `useWalletLive` — el comentario del segundo panel es de antes del modelo YOKI.)
- **`Activity.jsx` pestaña "Pagos" siempre vacía** — filtra por `t.tipo === "PAGO"` pero el tipo real es `"COMPRA"`; las compras caen en "Otros" con ícono genérico. Resto del mock viejo (`userStore.js:94` todavía escribe `tipo:"PAGO"`).
- **Divergencias Operador web ↔ nativo**: la web de accesos no avisa al apoderado (`user_notifications`) ni valida estado de pulsera (`nfc_bands`: bloqueada/vencida/otro-mundo); el nativo sí. Vincular pulsera con reglas de negocio distintas (web: exige `"asignada"` + "una activa por usuario"; backend: solo bloquea `"bloqueada"`). BNPL: literal de interés `{3:0,6:0.18,12:0.24}` triplicado en 3 archivos, y la versión del Operador ignora `frecuencia`/`dias_personalizados` → un programa "personalizada" produce fechas de cuota distintas según el contrato se abra desde la app o desde el POS.
- **Cierre de turno de caja**: solo existe en el nativo (cuadre con `monto_esperado`/`declarado`/`diferencia`); la web `CobrarPanel` no tiene botón. 5 `pos_turnos` llevan `abierto` desde el 04-ago, todos `web-operador`, sin conciliación.
- **`mover_cashback_wallet` sin doc ni SQL versionado** — 2ª RPC que mueve `wallets.cashback_balance` en el camino de cobro del POS.
- **Flujos con impacto económico ausentes de los docs**: aprobación de cambios de Cashback (`Gobierno.jsx`, tabla `cashback_change_requests`), acreditación de Subsidio (`Usuarios.jsx → SubsidioPanel`), devoluciones/reembolsos con re-autenticación (`Soporte.jsx → DevolucionDrawer`).
- **Wizard de Mundo paso 4**: el texto dice "Reservas y Promociones están en desarrollo y no se pueden activar" mientras los toggles funcionan.
- **`Grupos.jsx`** manda a "Editar mundo → Grupo → Ninguno" — ruta que no existe (`MundoDetail.jsx` no tiene control de `grupoId`). Una sucursal ligada a un grupo no se puede desvincular desde la UI (Discrepancia #8).
- **`CatalogoProductos.jsx`** afirma ser "la fuente maestra para todos los selects del sistema" — nada lo consume, sin tabla (404), vive solo en `localStorage`.
- **Mundos con capacidad activa y CERO feature flags sincronizados**: `mundo-3ox15t` tiene loyalty/reservas/estacionamiento/subsidio/turnos/transporte/cashback/bnpl/eventos/promociones/suscripciones `enabled=true` en `world_capacity_configs` pero **ninguna fila** en `world_feature_flags` → `wc.flag(cap,code)` devuelve `false` para todos sus servicios. Inocuo hoy (los templates nuevos no gatean por flag); latente para cualquier template futuro que sí lo haga, y el tab "Feature Flags" del admin arranca todo en OFF.

### ⚪ Baja (resumen)

- `AsistenciaTemplate` + `CreditoTemplate` — maquetas 100% falsas enrutadas en `TEMPLATE_MAP`; hoy inalcanzables (en `MODULOS_PROXIMAMENTE`), pero si un mundo activa la capacidad muestran asistencia/crédito inventados (viola la regla "no-mock" del anexo §10).
- Controles sin `onClick`: campana de notificaciones y "Soporte" del header del Organizador; "Buscar…" de ambos dashboards; "Refrescar QR" y "Compartir" en `AccesosTemplate`; paginación de la tabla de errores en `Resumen.jsx`.
- `MODULE_CATALOG.base` — ningún módulo lo define, siempre se reduce a `tier === "CORE"`. Tier "MOTOR BASE" del wizard — ningún módulo lo tiene, esa sección nunca renderiza.
- `syncWorldAcquiringChannels` / `fetchWorldAcquiringChannels` — implementadas, cero invocaciones.
- "Mundos activos" se cuenta `estado === "ACTIVO"` en Dashboard/Resumen y `estado !== "INACTIVO"` en Gobierno → el mismo KPI da números distintos entre pantallas.
- `Contrato.jsx` — "Corte de liquidación: Diario a las 19:00 PE" hardcodeado, ignora la frecuencia del mundo.
- Badge del tab "Organizadores" (`MundoDetail.jsx:2217`) hardcodeado a `0` aunque lista organizadores reales.
- `ModulosMundo.jsx:66` — activar un módulo desde la matriz no crea su `acuerdo: {...cat.pricing}` (a diferencia del wizard) → sale sin pricing en Contrato/Calculadora.
- Seed local de `joi360-app/src/store.js` (`mkMod`) desincronizado con `MODULE_CATALOG`: `consumos.anulacionHasta:24` (campo retirado), `turnos.duracionDefault:30` (catálogo: `configFields:[]`), `bnpl.cuotasMax:6`, sin `suscripciones`, `cashback` sin `modalidad`. Solo afecta el fallback offline, y ese seed reintroduce mundos retirados si el fetch de `worlds` falla.
- Los 4 `.sql` nuevos no terminan con `notify pgrst, 'reload schema'` (regla del anexo §10 — el reload se hizo por otra vía).
- `eventos:ticketing` en `FLAG_DEV_MAP`/`FLAG_UX_MAP` — no corresponde a ningún servicio del catálogo (ids reales: `crear/entradas/aforo/monitoreo/taq_qr/preventa`).
- `ReservasTemplate` — el "Historial" muestra `${r.fecha}` en ISO crudo mientras "Próximas" usa `fmtFechaCorta()` (el fix de fecha del 28-ago solo tocó "Próximas").
- `CashbackTemplate` — "Cashback canjeado" (un gasto) se pinta con "+"; `CASHBACK_REVERTIDO` fuera del filtro de historial.
- `WorldGate` (`WorldOperadorApp.jsx:56`) — el input de PIN no se restringe a 4 dígitos (los otros gates sí).
- QR del nativo sin `referencia` en `charge_requests` (la web sí manda `${nombre} · ${Date.now()}`).

---

## 3. Puntos de choque entre capacidades

| Capacidad(es) | Comparten | Punto de choque | Acción |
|---|---|---|---|
| Wallet ↔ Comercio, Consumos, BNPL, Transporte, Estacionamiento, Suscripciones, Cashback | RPC `mover_saldo_wallet` (+ `mover_cashback_wallet`, `transferir_p2p_wallet`) | Un cambio en el RPC impacta 7+ capacidades. Ya tuvo 3 reescrituras de seguridad. | **Versión propia por RPC + contrato de cambios documentado. Ningún cambio sin lista de capacidades afectadas + QA de cada una.** |
| Liquidación ↔ Comercio ↔ Acuerdo Comercial ↔ Adquirencia | 3 claves de frecuencia · `retentionPercentage` · `mdrEfectivo` · `validFrom/Until` | Todo el cluster "cuánto se le paga al merchant" está roto o desconectado del motor. | **Track A lo arregla junto — una sola clave de frecuencia, retención aplicada o re-etiquetada, MDR real, enforcement de vigencia.** |
| Turnos ↔ `pos_turnos` (caja) ↔ `access_shifts` (portería) | La palabra "turno" | 3 conceptos distintos con el mismo nombre. | Construido con tabla propia `turno_pedidos` (no choca). Renombre conceptual pendiente por decisión (Discrepancia #9). |
| Loyalty ↔ Cashback | "% de recompensa por consumo" | Cashback es macro (un % del mundo); Loyalty es por comercio. Se solapan en el modelo mental. | Al construir el canje de Loyalty (v1.1), definir la frontera explícita: ¿un comercio puede tener los dos?, ¿el usuario ve un solo "beneficio" consolidado o dos? |
| Crédito ↔ BNPL | Financiamiento de consumo | BNPL ya es crédito real (cuotas, línea, mora). | **Decisión de producto pendiente**: ¿Crédito es un producto distinto (línea revolvente, reporte a centrales) o es una duplicación que no se construye? |
| Subsidio ↔ Wallet ↔ Restricciones | El consumo (v1.1) tocará `mover_saldo_wallet`; las categorías permitidas se parecen a las reglas de Restricciones | v1.0.0 usa ledger propio y no toca el RPC — bien. El consumo v1.1 entra al RPC crítico. | Tratar el consumo de subsidio con el mismo cuidado que se dio a Cashback: rama nueva en `mover_saldo_wallet` con QA dedicado, no lógica en el cliente. |
| Estacionamiento ↔ Accesos ↔ Reservas | Su propia descripción dice "reutiliza Accesos + Reservas + Consumos" | Se construyó con tabla propia (`estacionamiento_sesiones`), sin usar ni Accesos ni Reservas. | Revisar si de verdad debe compartir la lógica de slot/sesión (para una futura gestión de plazas con cupo) o quedarse aparte. Hoy funciona aparte. |
| Menú ↔ Inventario ↔ Perfil extendido ↔ Restricciones | Cupos (`menu_programacion` ~ Inventario), alergias (`user_profiles`/`dependents.alergias`), límite diario (Restricciones) | Es la cadena de dependencia más entrelazada y **sí está activa**. | Cualquier cambio en alergias (Perfil ext) o en límites (Restricciones) tiene que probarse contra el flujo de reserva de Menú. |
| Precompra ↔ Motor de Eventos ↔ Inventario ↔ Comercio | No es capacidad propia — vive dentro de Eventos; usa `products.event_id` y el `stock` de Inventario | Los docs dicen que el consumo en superapp no existe. **Sí existe** (`PrecompraEventoDrawer`), mueve dinero real, sin QA. | Documentar (Track D) + QA E2E dedicado (Track I). |
| Accesos ↔ Estacionamiento, Asistencia | Prerequisito declarado de ambas | Asistencia sigue planificada; Estacionamiento se construyó sin usarlo. | Al especificar Asistencia, decidir si de verdad se apoya en Accesos o es independiente. |

---

## 4. Esquema de versionado (capacidad + RPC + config + esquema)

Hoy el "estado" de una capacidad vive desperdigado en **4 sitios que no están sincronizados**: `MODULE_CATALOG.version` (local), `MODULOS_PROXIMAMENTE` (Set local), `FLAG_DEV_MAP` (por servicio, local + `localStorage`), y `capacities.version` en Supabase (hardcodeado a `"1.0"`). Propuesta:

### 4.1 Versión de capacidad
- `MODULE_CATALOG.version` (semver `X.Y.Z`) es **la única fuente**.
- `syncCatalogRemote` propaga `c.version`, `c.status` (construida/parcial/planificada, derivado de `MODULOS_PROXIMAMENTE`) y `c.tier` **reales** a `capacities` — hoy hardcodea `"1.0"` (**E2**).
- Regla: un cambio a los `configFields` de una capacidad sube su **minor**; un fix de comportamiento sube su **patch**; la primera versión funcional real es `1.0.0`.
- El admin, la superapp y el proyecto de dev leen la versión de `capacities` (o de `MODULE_CATALOG` si se decide que vive solo ahí — pero **entonces `capacities.version` debe borrarse o marcarse "no usar"**, no quedar mintiendo).

### 4.2 Versión de RPC de dinero
- Cada RPC que muta wallet (`mover_saldo_wallet`, `mover_cashback_wallet`, `transferir_p2p_wallet`) lleva su `.sql` **versionado en el repo** con nombre `NNN-<rpc>-vX.sql` y un header con: versión, fecha, qué cambió, capacidades afectadas.
- `docs/arquitectura/rpc_versions.md` — tabla de qué versión de cada RPC está aplicada en prod (verificado o por verificar).
- Ninguna reescritura de un RPC de dinero sin: (a) lista de capacidades afectadas, (b) QA de cada flujo, (c) bump de versión, (d) fila en `rpc_versions.md`.
- **HOY**: `mover_cashback_wallet` y `verificar_login_sponsor` no tienen `.sql` en el repo (**D1**).

### 4.3 Versión de esquema / migraciones
- Cada `.sql` de migración termina con `notify pgrst, 'reload schema';` (regla del anexo §10 — los 4 nuevos no lo tienen, **Baja**).
- `docs/arquitectura/migraciones_aplicadas.md` — registro de qué `.sql` se corrió contra prod y cuándo (hoy se corren a mano sin rastro). Verificado ahora: `fix-234` + las 4 nuevas están aplicadas.

### 4.4 Feature flags
- Un `id` estable por servicio; el nombre legible es un campo aparte, **no una segunda fila**.
- `ensureGlobalFlag` con sync bidireccional (INSERT + DELETE) — hoy solo INSERT, por eso `capacity_feature_flags` acumuló 96 filas con fantasmas y duplicados.
- Ningún flag para un servicio que el catálogo quitó (`loyalty:canje_*`, `promociones:Banner/Push/A-B`).

---

## 5. Revisión de configuraciones — Mundo / Merchant / Operador

### Mundo
| Config | Estado | Acción |
|---|---|---|
| Frecuencia de liquidación (wizard) | Escrita a `acuerdo.frecuenciaLiquidacion`, el motor no la lee → todo diario | **A1** — cablear al `liquidacion_frecuencia` real, unificar las 3 claves |
| `retentionPercentage` / `validFrom` / `validUntil` (TabAcuerdo) | Solo proyección (Calculadora) | **A2/A5** — aplicar en el motor o re-etiquetar como estimación |
| Capacidades activas sin feature flags sincronizados | 11 capacidades `enabled` sin filas en `world_feature_flags` | **E** — que la activación de capacidad siembre sus flags por default; que "Activar todos" del admin tenga de dónde partir |
| Desvincular una sucursal de su grupo | No existe control (`grupoId` solo en el wizard) | **H** — agregar a `MundoDetail.jsx` o corregir el texto del modal de `Grupos.jsx` |
| `dev_status`/`api` de feature flags | Solo `localStorage` | **E** — persistir a `capacity_feature_flags` |
| `mundo-x1g98k` duplicado | Data de QA sin limpiar, `activo`, visible en la superapp | **Fase 0** — confirmar y borrar |

### Merchant
| Config | Estado | Acción |
|---|---|---|
| MDR / tarifa | `mdrOverride` nunca escrito → el panel del comercio muestra 1.5% o canal global, nunca la tarifa real | **A3** — gate por `comercio.tarifa`; que la reconciliación traiga `mdr_override` + `fixed_fee_override` |
| Credenciales del Panel de Merchant | Nunca llegan a Supabase → login cross-device imposible | **B3** — persistir con hash + RPC de verificación |
| PIN de POS | Se genera solo si `pos>0`, pero `reconciliarComerciosMundo` fuerza `pos:0` → comercios reconciliados no obtienen PIN | **B3/H** — no forzar `pos:0` en la reconciliación, o generar PIN independiente de `pos` |
| `visible_en_app` | Round-trip a Supabase OK | ninguna — funciona |

### Operador (web `/operador` ↔ nativo `joi360-operador` ↔ `joi-pos-backend`)
| Config / flujo | web | nativo | Acción |
|---|---|---|---|
| Aviso al apoderado en un acceso | no | sí (`user_notifications`) | **G** — la web debe llamar al backend o replicar |
| Validación de estado de pulsera | no (`buscarWalletPorCodigo`, nunca mira `nfc_bands`) | sí (`bandResolver`, rechaza bloqueada/vencida/otro-mundo) | **G** — unificar contra `nfc_bands` vía backend |
| Vincular pulsera — reglas | exige `"asignada"` + "una activa por usuario" + `vigenciaMeses` del cliente | solo bloquea `"bloqueada"`, `vence_at` server-side | **G** — portar los 2 guards faltantes al backend |
| Cierre / cuadre de turno de caja | no existe botón | cuadre completo (`monto_esperado`/`declarado`/`diferencia`) | **G** — agregar cierre a `CobrarPanel`; 5 `pos_turnos` abiertos desde el 04-ago |
| Cronograma BNPL (frecuencia personalizada) | honra `dias_personalizados` | la ignora → cae a mensual → **fechas de cuota distintas app vs POS** | **G** — RPC/módulo único de cronograma+interés |
| Sesión de merchant | `{ comercioId }` en localStorage, sin validación server-side después | igual | **B** — sesión verificable server-side |
| `mover_saldo_wallet` / group shared-balance | lógica de resolución de wallet byte-idéntica web↔backend ✅ | ídem | ninguna — funciona |
| Camino de cobro / QR / turno por zona | consistentes ✅ | ídem | ninguna — funciona |

---

## 6. Mejora de visualización / configuración / parametrización por capacidad (para escalar sobre esta base)

1. **Un solo tablero de estado.** Consolidar los 4 sitios de "estado de capacidad" en uno: `MODULE_CATALOG` es la fuente, `syncCatalogRemote` propaga TODO (version, status, tier, dev_status por flag) a Supabase, y todo lo demás (seed local, docs de frente) es derivado o se regenera.
2. **`configFields` como contrato de parametrización.** Cada capacidad declara sus parámetros en un solo lugar, con tipo / default / rango / `nullable`. Auditar, para cada `configField` de las 22 capacidades: (a) ¿la UI lo expone?, (b) ¿el código lo lee?, (c) ¿tiene efecto real? — una matriz de 3 columnas revela los `retentionPercentage`/frecuencia (expuestos, sin efecto) y los `dev_status`/`api` (leídos, no expuestos donde toca).
3. **Feature flags limpios y con sync bidireccional** (§4.4) — pre-requisito para que el admin de mundo pueda parametrizar servicio por servicio de forma confiable.
4. **Docs de frente vivos.** `03/04/05/06/01/07` se regeneran desde el código en cada corte (como `00_historial.md`) o encabezan con "autoridad de estado: `02_registro_capacidades.md`". Un doc de frente que miente es peor que no tenerlo.
5. **El paquete que dev toma "tal cual"** = `MODULE_CATALOG` + `configFields` + `TEMPLATE_MAP` + esquema Supabase + los `.sql` versionados. Formalizarlo en el anexo §10 y marcarlo explícitamente vs. lo derivado.
6. **Placeholders honestos por default.** Ninguna capacidad `0.0.0` con template maqueta enrutado — `GenericTemplate` (banner honesto) o tarjeta "Próximamente". Regla: un template solo entra a `TEMPLATE_MAP` cuando lee datos reales.

---

## 7. Plan de tareas en secuencia — tracks de desarrollo independiente

### Fase 0 — Base limpia (bloquea A / B / E / J · 1 persona · ~1 día)
- **0.1** Confirmar con Camila y borrar `mundo-x1g98k` + dependientes (`world_capacity_configs` ×4, `world_feature_flags` ×21, `world_acquiring_channel_configs` ×3, `wallets` ×2). *(destructivo — requiere OK explícito)*
- **0.2** Crear `docs/arquitectura/migraciones_aplicadas.md` y `rpc_versions.md` con el estado verificado (`fix-234` ✅, 4 nuevas ✅, `mover_cashback_wallet`/`verificar_login_sponsor` sin `.sql`).
- **0.3** Actualizar `09_backlog.md` al estado post-v1.2 (las 4 migraciones ya corrieron) — miss del corte.

### Tracks paralelos (independientes entre sí una vez pasada la Fase 0)

| Track | Objetivo | Archivos principales | Depende de | Esfuerzo | Arranca |
|---|---|---|---|---|---|
| **A · Liquidación** | 1 sola clave de frecuencia · cablear wizard → `liquidacion_frecuencia` · aplicar `retentionPercentage` en `procesarLiquidacionMundo` **o** re-etiquetar Calculadora + Contrato · `mdrEfectivo` gate por `comercio.tarifa` · enforcement de `validFrom/Until` | `Mundos.jsx`, `store.js` (`liquidacionConfigDe`, `procesarLiquidacionMundo`), `Calculadora.jsx`, `Contrato.jsx`, `MundoDetail.jsx` (TabAcuerdo), `Fronts.jsx` (MerchantDashboard), `supabase.js` (reconciliar) | Fase 0 | Alto | tras F0 |
| **B · Auth server-side** | RPC `verificar_login_organizador` + `verificar_login_merchant` (patrón `verificar_login_sponsor`) · hash al insertar (`crearOrganizadorRemote`, entrega de merchant) · no exponer `pos_pin_hash`/`password` a `anon` (vista/columna/RLS) · PIN 6 dígitos o cost mayor · nativo: enviar etiqueta de operador, no el PIN · sesión de merchant verificable | `supabase.js`, `store.js`, `EntregaMerchant.jsx`, nuevos `.sql`, `joi360-operador/.../Api.kt`, `joi-pos-backend/routes/turnos.js` | Fase 0 | Alto | tras F0 |
| **C · Fecha local** | Helper `fechaLocalHoy()`/`fmtFechaLocal()` compartido en `joi360-app`; reemplazar todos los `toISOString().slice(0,10)` de "hoy"/display en `SubsidioTemplate`, `Hub.jsx` (widget "Hoy te toca"), `PromocionesTemplate`, `supabaseClient.js:600` (motor de membresías), `ReservasTemplate` (historial) | `joi360-app/src/pages/Module.jsx`, `Hub.jsx`, `supabaseClient.js` | ninguna | Bajo | ya |
| **D · Docs de frente** | Regenerar / apuntar `03/04/05/06/01`; sincronizar `06` con `08` (fix-234); reescribir `07_design_system.md` §12 (tabla de tokens real: `secondary`, `surface`, `ok`↔`success`); documentar flujos ausentes (aprobación Cashback, devoluciones, `SubsidioPanel`, precompra, 2 modos de Operador) | `docs/arquitectura/mapeo_maestro/src/*` | ninguna | Medio | ya |
| **E · Sync de config** | `syncCatalogRemote` propaga `version`/`status`/`tier` reales a `capacities` · `dev_status`/`api` de flags a `capacity_feature_flags` · `ensureGlobalFlag` con DELETE · limpiar los ~46 flags fantasma/duplicados · que la activación de capacidad siembre sus feature flags por default · decidir destino de `CatalogoProductos` | `supabase.js` (`syncCatalogRemote`, `ensureGlobalFlag`), `store.js` (`getFlagDev`), `Catalogo.jsx`, `CatalogoProductos.jsx` | Fase 0 | Medio | tras F0 |
| **F · Placeholders** | Quitar `asistencia`/`credito` de `TEMPLATE_MAP` (→ `GenericTemplate`) o reducir a tarjeta "Próximamente" | `joi360-app/src/pages/Module.jsx` | ninguna | Bajo | ya |
| **G · Paridad Operador + BNPL RPC** | Web accesos → llamar `joi-pos-backend` (aviso apoderado + validación de pulsera) · vincular pulsera con reglas iguales · botón de cierre de turno en `CobrarPanel` · RPC/módulo único para cronograma+interés BNPL (hoy triplicado) · versionar `mover_cashback_wallet` + `verificar_login_sponsor` en `.sql` | `OperadorApp.jsx`, `Fronts.jsx` (CobrarPanel), `joi-pos-backend/routes/*`, `supabase.js`, `Module.jsx` (`cronogramaDe`), nuevos `.sql` | parcial de B | Alto | tras B (parcial) |
| **H · Limpieza transversal** | Botones sin `onClick` (×6) · `MODULE_CATALOG.base` + tier "MOTOR BASE" · helper único "Mundos activos" · `Contrato.jsx` "Diario 19:00" · badge Organizadores · `ModulosMundo` crea `acuerdo` · seed `joi360-app/store.js` regenerado desde el catálogo · `notify pgrst` retroactivo en los 4 `.sql` · `eventos:ticketing` muerto · `CashbackTemplate` signo · `WorldGate` PIN a 4 dígitos · QR nativo con `referencia` | varios (batch) | ninguna | Bajo | ya |
| **I · QA E2E** | Precompra de evento (mueve dinero real, sin cobertura) · las 6 capacidades v1.0.0 con carrito/cobro real · flujo de devolución con step-up | — (verificación en vivo) | A, C | Medio | tras A+C |
| **J · Versionado formal** | Convención de §4 aplicada: `rpc_versions.md`, `migraciones_aplicadas.md`, regla de bump por `configFields`, header versionado en cada `.sql` de RPC | docs + convención | Fase 0 | Bajo | tras F0 |

### Secuencia recomendada

```
Fase 0  ──┬─→ A (Liquidación)        ─┐
          ├─→ B (Auth) ──→ G (Operador)│
          ├─→ E (Sync config)         ├─→ I (QA E2E)
          └─→ J (Versionado formal)   │
                                      │
C (Fecha local)  ─────────────────────┤   } arrancan ya, sin esperar Fase 0
D (Docs de frente) ───────────────────┤
F (Placeholders) ─────────────────────┤
H (Limpieza) ─────────────────────────┘
```

**Reparto sugerido**: C+F+H son un solo lote rápido para una persona (1-2 días). D es de una persona con contexto de producto. A y B son los dos tracks pesados, uno cada uno, en paralelo. E y J los toma quien tenga contexto del render config. G espera a que B tenga los RPCs de auth.

---

## 8. Después de estos arreglos — lo que viene

- **Las 3 capacidades `0.0.0`**: Facturación (necesita proveedor PSE + integración SUNAT), Crédito (decisión de producto: ¿distinto de BNPL?), Asistencia (falta spec de flujo; bloqueada a vertical Educación).
- **Las v1.1**: canje de Loyalty (app + POS), consumo de Subsidio (entra a `mover_saldo_wallet` con cuidado), cobro de anticipo en Reservas.
- **Pasarela de pago real** para los canales de Emisión/Adquirencia (`Culqi`/`QR interoperable` están catalogados con techo de tarifa pero sin gateway real detrás — la pieza grande, requiere convenio + credenciales + integración certificada).
- **Paquete de tokens de diseño compartido** admin ↔ superapp (Discrepancia #12 — el fix real, no la tabla del doc).
- **Endurecer RLS** (`demo_anon_all` en toda la base — Discrepancia #2) cuando se decida salir del modo prototipo.
