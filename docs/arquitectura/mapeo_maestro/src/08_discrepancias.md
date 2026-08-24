# Discrepancias y Deuda Técnica Consolidada

Todo lo encontrado durante la construcción de este documento, ordenado por severidad. "Severidad" acá mide impacto si nadie lo toca: Alta = riesgo de dinero/seguridad real, Media = confunde al admin o rompe la confianza en un número, Baja = código muerto o inconsistencia cosmética sin impacto operativo.

## 🔴 Severidad Alta

### 1. ✅ RESUELTO (19-ago-2026) — La RPC `mover_saldo_wallet` había perdido su validación de dueño de wallet
La función que mueve saldo real (cobros, recargas, P2P) fue reemplazada 3 veces (`CREATE OR REPLACE`, cada una sustituye el cuerpo completo de la anterior). La versión #2 (`fix-121-rpc-dueno-wallet.sql`) agregó una validación real: solo se puede mover el saldo de una wallet si viene de un turno de POS válido, o si `auth.uid()` es el dueño/apoderado de esa wallet. La versión #3 (`fix-181-restricciones-servidor-pos.sql`) agregó el chequeo de restricciones por dependiente pero **reescribió la función sin conservar esa validación de dueño**. **Cerrado con `fix-234-restaurar-dueno-wallet.sql`**: nueva versión de la función que combina ambas validaciones en un solo cuerpo — turno/dueño (de #121) Y restricciones de dependiente (de #181) — sin que ninguna pise a la otra. Verificado: `pronargs=8` sobre `mover_saldo_wallet` tras aplicar el fix.

### 2. RLS abierto en casi toda la base
El patrón dominante en las migraciones es `for all to anon, authenticated using (true) with check (true)` — cualquiera con la llave pública anónima puede leer y escribir cualquier fila de cualquier mundo. El aislamiento entre mundos hoy es 100% lógico (filtros `world_id=` en el cliente), no está garantizado por la base de datos. Es un patrón consciente de "modo demo" documentado en varias migraciones, pero vale la pena decidir explícitamente hasta cuándo se mantiene así, dado que ya hay dinero real moviéndose.

### 3. Contraseña de Organizador guardada en texto plano
`organizadores.password` se inserta sin hash — a diferencia de `admin_users`, `merchants.pos_pin` y `worlds.pos_pin`, que sí pasan por `crypt()`/`gen_salt('bf')`. Inconsistente con el patrón de seguridad ya establecido en el resto del proyecto para credenciales equivalentes.

### 4. [Reportado por Camila, 12-ago] — Panel de Mundo: no se puede establecer contraseña en la entrega; campos NULL en tablas
Reporte textual: *"actualmente no puedo establecer una contraseña para el panel de mundo, esto no debe pasar para ninguna de las entregas, me siguen saliendo campos en blanco... debe autogenerar una contraseña con capacidad de visualización, y los campos en tablas no pueden salir NULL"*. **Explícitamente diferido por Camila a la siguiente tanda de trabajo y al próximo documento de actualización** — no se investigó ni se corrigió en esta versión del documento. Requisito para la próxima tanda: (a) el flujo de entrega del Panel de Mundo debe autogenerar una contraseña real (no dejar el campo vacío), con un botón de "mostrar/ocultar" para poder visualizarla antes de compartirla; (b) auditar de nuevo — como ya se hizo una vez en la Task #197 — que ninguna columna de las tablas que alimentan vistas de admin quede en `NULL` quedando en blanco visualmente.

## 🟠 Severidad Media

### 5. `retentionPercentage` no tiene ningún efecto real en la liquidación
Se presenta al admin como el % confidencial que RedPontis retiene de cada liquidación ("el sponsor nunca ve este porcentaje, solo el neto"), pero el motor real de corte (`procesarLiquidacionMundo`) nunca lo resta del cálculo — solo lo usa la Calculadora Comercial, que es una herramienta de proyección, no el corte real. Riesgo: alguien asume que ese % ya se está aplicando cuando no es así.

### 6. Dos campos de "frecuencia de liquidación" desincronizados
`TabAcuerdo` expone `settlementFrequency` (solo lo lee la Calculadora); el corte real lee `liquidacion_frecuencia` (seteado en un tab distinto, "Microservicios"). Cambiar uno no mueve el otro — un admin puede creer que cambió la cadencia de pago real y no lo hizo.

### 7. Vigencia de tarifa (`validFrom`/`validUntil`) sin enforcement
Se guarda y se muestra, pero ningún flujo de venta ni de liquidación la valida — es puramente informativa hoy.

### 8. `Grupos.jsx` ofrece un camino de edición que no existe en código
El modal de bloqueo de borrado le dice al admin "Desvincúlalas primero (Editar mundo → Grupo → Ninguno)" — pero no hay ningún control de `grupoId`/`comparte_saldo_grupo` en `MundoDetail.jsx` todavía. Hoy, una sucursal ya ligada a un grupo no se puede desvincular desde la UI.

### 9. Colisión de nombre: "Turnos" (capacidad de negocio) vs. "turno" (sesión operativa)
La capacidad de negocio "Turnos" (agendar citas) está planificada y sin construir. Pero la palabra "turno" ya es infraestructura real y activa (`pos_turnos`, apertura/cierre de caja del POS; `access_shifts`, turno de portería) — dos conceptos distintos con el mismo nombre. Vale la pena renombrar uno de los dos antes de construir la capacidad real, para evitar confusión entre equipo de producto y de desarrollo.

### 10. Promociones: backend y UI reales, pero inalcanzables en la práctica
El CRUD de promociones (`TabPromos`) es 100% real, pero solo se renderiza si el mundo es de un `type` especial (`promos`/`promos_rp`) — y el único mundo de ese tipo fue retirado del alcance y se purga activamente del store en cada carga. Al mismo tiempo, en el catálogo general de capacidades, Promociones está marcada "Planificada" (no sincroniza a Supabase por el flujo estándar). Dos caminos reales, ninguno conectado al flujo normal de activar-una-capacidad.

### 11. ✅ RESUELTO (13-ago-2026) — Suscripciones ya cobraba dinero real, pero no era una capacidad visible en el catálogo
`perfilesSuscripcion` (dentro de Wallet) + `subscription_plans` cobraban una cuota real cada vez que se vinculaba un dependiente nuevo, si el mundo lo tenía configurado — funcionalmente completo pero invisible como capacidad propia. Suscripciones se graduó a capacidad de primer nivel en el catálogo (icono, activación y pestaña propia). El 20-ago se sumó además un segundo mecanismo real, de membresía con cobro recurrente (modelo YOKI) — ver capacidad #22 en el registro.

### 12. Divergencia de tokens de marca entre Admin y Superapp
Mismo vocabulario de tokens (Material 3: `primary`/`surface-container`/etc.) pero valores hex distintos y definidos por separado en cada `tailwind.config.js`, sin paquete de tokens compartido. Ver detalle en la sección de Sistema de Diseño.

### 13. [Nuevo, 24-ago-2026] Panel admin no refresca capacidades de un mundo ya cacheado en la sesión
`refreshMundosLive()` (`store.js`) trae `world_capacity_configs` frescos de Supabase, pero solo los aplica a mundos que **no** existen todavía en el store local (`byId.get(w.id)` vacío) — un mundo ya cargado en esa pestaña/sesión conserva su `modulos[]` viejo a propósito, para no pisar ediciones locales aún sin sincronizar. Efecto real: activar una capacidad nueva en un mundo (ej. Cashback) no aparece en el Panel de Mundo de esa misma sesión de navegador hasta limpiar el caché local o recargar sin ese mundo pre-cacheado — aunque Supabase ya tiene el dato correcto. No es un bug de integridad de datos, es una demora de sincronización que puede confundir a un admin en medio de una demo o configuración en vivo. Encontrado hoy verificando en vivo la activación de Cashback.

### 14. [Nuevo, 24-ago-2026] POS/Operador de Mundo: clave sin flujo de activación formal
A diferencia de Wallet/Comercios, que ya tienen su tab de "Canales" estandarizado (Task #129) para activar/desactivar medios de cobro o emisión, la clave del POS/Operador de Mundo (`TarjetaOperadorMundo`, dentro del hub de "Entrega de panel") es un campo de texto libre con botón "Generar" — no está atada a ninguna tabla de canales ni a un paso de "activación" formal. Funciona bien como está (genera, guarda, hashea server-side), pero es inconsistente con el patrón que el resto del ecosistema ya usa para prender/apagar medios de acceso. Encontrado durante la verificación en vivo del hub de entrega de credenciales, pedido explícitamente por Camila para revisar.

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
