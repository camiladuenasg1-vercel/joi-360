# Discrepancias y Deuda Técnica Consolidada

Todo lo encontrado durante la construcción de este documento, ordenado por severidad. "Severidad" acá mide impacto si nadie lo toca: Alta = riesgo de dinero/seguridad real, Media = confunde al admin o rompe la confianza en un número, Baja = código muerto o inconsistencia cosmética sin impacto operativo.

## 🔴 Severidad Alta

### 1. ✅ RESUELTO (19-ago-2026) — La RPC `mover_saldo_wallet` había perdido su validación de dueño de wallet
La función que mueve saldo real (cobros, recargas, P2P) fue reemplazada 3 veces (`CREATE OR REPLACE`, cada una sustituye el cuerpo completo de la anterior). La versión #2 (`fix-121-rpc-dueno-wallet.sql`) agregó una validación real: solo se puede mover el saldo de una wallet si viene de un turno de POS válido, o si `auth.uid()` es el dueño/apoderado de esa wallet. La versión #3 (`fix-181-restricciones-servidor-pos.sql`) agregó el chequeo de restricciones por dependiente pero **reescribió la función sin conservar esa validación de dueño**. **Cerrado con `fix-234-restaurar-dueno-wallet.sql`**: nueva versión de la función que combina ambas validaciones en un solo cuerpo — turno/dueño (de #121) Y restricciones de dependiente (de #181) — sin que ninguna pise a la otra. Verificado: `pronargs=8` sobre `mover_saldo_wallet` tras aplicar el fix.

### 2. RLS abierto en casi toda la base
El patrón dominante en las migraciones es `for all to anon, authenticated using (true) with check (true)` — cualquiera con la llave pública anónima puede leer y escribir cualquier fila de cualquier mundo. El aislamiento entre mundos hoy es 100% lógico (filtros `world_id=` en el cliente), no está garantizado por la base de datos. Es un patrón consciente de "modo demo" documentado en varias migraciones, pero vale la pena decidir explícitamente hasta cuándo se mantiene así, dado que ya hay dinero real moviéndose.

### 3. 🟡 EN PROGRESO (02-sep-2026, Track B) — Contraseña de Organizador (y credenciales de Merchant) en texto plano
`organizadores.password` se insertaba sin hash, y las credenciales del Panel de Merchant ni siquiera llegaban a Supabase. **Track B — SQL aplicada + cliente 100% server-side (02-sep):** `supabase-auth-organizador-merchant.sql` corrida — triggers `hash_organizador_password` / `hash_merchant_panel_password` (bcrypt), RPCs `verificar_login_organizador` / `verificar_login_merchant` (security definer), columnas `merchants.panel_*`, `REVOKE SELECT` de `password`/`*_hash`/`pos_pin*`/`sponsor_password` para `anon`. `organizadorLogin`/`merchantLogin` verifican contra la RPC — la contraseña ya no se compara en el cliente; el fallback local se quitó. **Falta:** la pasada de la **app nativa + `joi-pos-backend`** (B4: el nativo manda el PIN de comercio como campo `operador`, lo persiste `pos_turnos.operador` — latente, el APK apunta al backend viejo).

### 4. [Reportado por Camila, 12-ago] — Panel de Mundo: no se puede establecer contraseña en la entrega; campos NULL en tablas
Reporte textual: *"actualmente no puedo establecer una contraseña para el panel de mundo, esto no debe pasar para ninguna de las entregas, me siguen saliendo campos en blanco... debe autogenerar una contraseña con capacidad de visualización, y los campos en tablas no pueden salir NULL"*. **Explícitamente diferido por Camila a la siguiente tanda de trabajo y al próximo documento de actualización** — no se investigó ni se corrigió en esta versión del documento. Requisito para la próxima tanda: (a) el flujo de entrega del Panel de Mundo debe autogenerar una contraseña real (no dejar el campo vacío), con un botón de "mostrar/ocultar" para poder visualizarla antes de compartirla; (b) auditar de nuevo — como ya se hizo una vez en la Task #197 — que ninguna columna de las tablas que alimentan vistas de admin quede en `NULL` quedando en blanco visualmente.

## 🟠 Severidad Media

### 5. ✅ RESUELTO (02-sep-2026) — `retentionPercentage` no tenía ningún efecto real en la liquidación
Se presentaba al admin como el % confidencial que RedPontis retiene ("el sponsor solo ve el neto") pero `procesarLiquidacionMundo` nunca lo restaba — solo lo usaba la Calculadora. **Cerrado (Track A):** `liquidacionConfigDe` ahora expone `retencionPct` (de `comercios.config.retentionPercentage`) y `procesarLiquidacionMundo` calcula `retencion = (volumen − comisión − descuentoHardware) × retencionPct/100` y la resta del neto antes de persistir el lote, con rastro en `observacion`. Default 0 = sin cambio para mundos existentes (Jockey Plaza tenía 0). El motor y la Calculadora dejaron de discrepar.

### 6. ✅ RESUELTO (02-sep-2026) — Frecuencia de liquidación desincronizada (eran 3 campos, no 2)
El wizard escribía `acuerdo.frecuenciaLiquidacion`, `TabAcuerdo` escribía `settlementFrequency` (solo lo leía la Calculadora), y el corte real solo leía `liquidacion_frecuencia` (que solo seteaba el drawer de Liquidación) → **todo mundo se liquidaba diario**. **Cerrado (Track A):** `liquidacionConfigDe.frecuencia` resuelve por precedencia `liquidacion_frecuencia || settlementFrequency || acuerdo.frecuenciaLiquidacion || "diaria"`; el wizard (`habilitar()`) y `TabAcuerdo` ahora **también** escriben `liquidacion_frecuencia`; la Calculadora y el Contrato leen la frecuencia resuelta, no la clave suelta.

### 7. Vigencia de tarifa (`validFrom`/`validUntil`) sin enforcement — SIGUE ABIERTA
Se guarda y se muestra, pero ningún flujo de venta ni de liquidación la valida — es puramente informativa hoy. (Mitad menor de Track A, no cerrada en la pasada del 02-sep — el enforcement en el camino de venta es un cambio más grande.)

### 8. `Grupos.jsx` ofrece un camino de edición que no existe en código
El modal de bloqueo de borrado le dice al admin "Desvincúlalas primero (Editar mundo → Grupo → Ninguno)" — pero no hay ningún control de `grupoId`/`comparte_saldo_grupo` en `MundoDetail.jsx` todavía. Hoy, una sucursal ya ligada a un grupo no se puede desvincular desde la UI.

### 9. Colisión de nombre: "Turnos" (capacidad de negocio) vs. "turno" (sesión operativa)
La capacidad de negocio "Turnos" está planificada y sin construir. Pero la palabra "turno" ya es infraestructura real y activa (`pos_turnos`, apertura/cierre de caja del POS; `access_shifts`, turno de portería) — dos conceptos distintos con el mismo nombre. **Decisión de Camila (25-ago-2026): no renombrar por ahora, ni tocar código.** De paso, aclaró el enfoque real de la capacidad de negocio (más específico que "agendar citas"): pensada sobre todo para comercios de **restaurantes/fast food en food courts**, para avisar al cliente que su pedido está listo para recojo — un "turno de preparación de pedido", no una cita agendada de antemano. Mapeado para cuando se especifique y construya; la colisión de nombre sigue pendiente de resolver en ese momento.

### 10. ✅ RESUELTO (25-ago-2026) — Promociones: backend y UI reales, pero inalcanzables en la práctica
El CRUD de promociones (`TabPromos`) era 100% real pero solo se renderizaba si el mundo era de un `type` especial (`promos`/`promos_rp`), y ese mundo estaba retirado del alcance y se purgaba del store en cada carga; a la vez, en el catálogo general Promociones estaba "Planificada". Dos caminos reales, ninguno conectado al flujo normal. **Cerrado por decisión de Camila**: Promociones salió de `MODULOS_PROXIMAMENTE` y pasó al flujo estándar — se activa igual que Eventos (capacidad activada, no `mundo.type`), sincroniza a `world_capacity_configs`. El catálogo de `servicios` se recortó al cupón QR real; banner/push/A-B testing quedaron documentados como fase 2 en el Backlog. Capacidad #4 del registro pasó a 🟢 Construido · v1.0.0.

### 11. ✅ RESUELTO (13-ago-2026) — Suscripciones ya cobraba dinero real, pero no era una capacidad visible en el catálogo
`perfilesSuscripcion` (dentro de Wallet) + `subscription_plans` cobraban una cuota real cada vez que se vinculaba un dependiente nuevo, si el mundo lo tenía configurado — funcionalmente completo pero invisible como capacidad propia. Suscripciones se graduó a capacidad de primer nivel en el catálogo (icono, activación y pestaña propia). El 20-ago se sumó además un segundo mecanismo real, de membresía con cobro recurrente (modelo YOKI) — ver capacidad #22 en el registro.

### 12. Divergencia de tokens de marca entre Admin y Superapp
Mismo vocabulario de tokens (Material 3: `primary`/`surface-container`/etc.) pero valores hex distintos y definidos por separado en cada `tailwind.config.js`, sin paquete de tokens compartido. Ver detalle en la sección de Sistema de Diseño.

### 13. ✅ RESUELTO (24-ago-2026) — Panel admin no refrescaba capacidades de un mundo ya cacheado en la sesión
`refreshMundosLive()` (`store.js`) traía `world_capacity_configs` frescos de Supabase, pero solo los aplicaba a mundos que **no** existían todavía en el store local — un mundo ya cargado en esa pestaña/sesión conservaba su `modulos[]` viejo hasta limpiar caché, aunque Supabase ya tuviera el dato correcto. **Cerrado con `6f04934`**: dado que `refreshMundosLive()` corre una sola vez por sesión de pestaña (deps vacías en `App.jsx`), no hay edición local a medio hacer que pueda pisar — ahora siempre toma lo que dice Supabase.

### 14. ✅ RESUELTO (24-ago-2026) — POS/Operador de Mundo: clave sin flujo de activación formal
A diferencia de Wallet/Comercios, que ya tienen su tab de "Canales" estandarizado (Task #129), la clave del POS/Operador de Mundo (`TarjetaOperadorMundo`) era un campo de texto libre con botón "Generar", sin atarse a ninguna tabla de canales ni paso de activación formal. **Cerrado con `6f04934`**: pasa a canal formal con pill de Activo/Inactivo y botón explícito de Desactivar, mismo patrón que el resto del ecosistema.

### 15. ✅ RESUELTO (24-ago-2026) — Catálogo global de canales (Emisión/Adquirencia) no releía de Supabase + ids desalineados con lo activable por mundo
`Emision.jsx` y `Adquirencia.jsx` empujaban cada guardado a Supabase pero nunca volvían a leer al montar — dos sesiones de RedPontis editando el mismo catálogo se pisaban en silencio (mismo patrón de la Discrepancia #13, ya corregido para capacidades de mundo). Además, el catálogo comercial de Adquirencia Global (`pos/qr/online/tap2phone`) tenía un set de ids completamente distinto al que un mundo realmente puede activar en Módulos → Comercios (`CANALES_ADQUIRENCIA`: `pos_fisico/app_operador/qr_estatico/tap2phone`) — configurar MDR/liquidación ahí nunca podía corresponder a un canal real activable. **Cerrado con `2988dd2`**: ambas pantallas jalan el catálogo real al montar, y el catálogo de Adquirencia Global se deriva ahora 1:1 de `CANALES_ADQUIRENCIA` (se retiró "Nuevo canal", que creaba ids que ningún mundo podía activar). Encontrado en el camino de resolver la Discrepancia #13, mismo día.

## 🟡 Severidad Baja (código muerto / cosmético, sin impacto operativo hoy)

- **`base` en `MODULE_CATALOG`**: `Mundos.jsx` lee un campo `m.base` que ninguna capacidad define — la condición se reduce siempre a `tier === "CORE"`. No rompe nada, solo es lógica muerta que puede confundir a quien la lea esperando encontrar módulos "base" no-CORE.
- **Funciones de sync sin ningún caller**: `syncWorldAcquiringChannels`/`fetchWorldAcquiringChannels` están completamente implementadas pero nadie las invoca — duplican intención con un paso ya resuelto dentro de `syncAllWorlds`.
- **`CobrarPanel` (POS de comercio) no tiene botón de "cerrar turno"** — a diferencia del panel de Accesos, que sí lo tiene. El turno de caja de ventas queda técnicamente abierto indefinidamente salvo cierre manual desde otro lugar.
- **Cronograma/interés de BNPL duplicado**: la misma lógica de cálculo de cuotas vive copiada en dos archivos distintos del cliente, sin una función server-side única de origen de verdad.
- **`CatalogoProductos.jsx` no persiste a Supabase** — vive solo en `localStorage`, cada sesión/navegador del admin ve su propia copia; además esta ruta no tiene ningún punto de entrada en el resto de la app (solo por URL directa).
- **`Anunciantes.jsx` es efectivamente una pantalla muerta** — su botón principal apunta a un mundo (`mundo-promos-rp`) que el propio store purga activamente en cada carga.
- **Gobierno → tab Auditoría es un placeholder honesto** — no existe infraestructura de audit-log de acciones de admin en el proyecto; el propio código lo aclara y redirige a Monitoreo de Errores como alternativa real.
- **`verificar_login_sponsor` (RPC del login del Panel de Mundo) no tiene definición SQL versionada en el repo** — fue creada directo en el editor SQL de Supabase, así que no queda registro de su lógica en control de versiones.
- **Rutas sin ningún punto de entrada en la app** (solo alcanzables tecleando la URL): `/admin/catalogo-productos`, `/admin/anunciantes`.
