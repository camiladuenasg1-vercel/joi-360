# JOI360 — Backbone de Capacidades (Sección Fuente de Verdad)

**Alcance investigado:** `joi360-admin/src/store.js`, `supabase.js`, `Catalogo.jsx`, `ModulosMundo.jsx`, `MundoDetail.jsx`, `Grupos.jsx`, `Mundos.jsx`. Todas las citas son `archivo:línea` exactas al momento de esta investigación.

---

## 0. Arquitectura general (antes del detalle por capacidad)

### El Catálogo Maestro
`MODULE_CATALOG` vive en `joi360-admin/src/store.js:24-457`, un array de 21 capacidades. Cada entrada tiene esta forma (no todos los campos están en todas las entradas):

```
{ id, name, tier: "CORE"|"PREMIUM"|"OPCIONAL", category: "Emisión"|"Adquirencia"|"Mixto"|"Datos",
  e: bool, a: bool,      // Emisión (afecta wallet/app) / Adquirencia (afecta comercio/POS)
  icon, desc,
  servicios: [ {id,nombre,desc} | string, ... ],   // feature flags
  pricing: { modelo, fijoMensual?, porTx?, setup?, moneda },
  configFields: [ {key,label,type,default,nullable?,nullLabel?,hint?,options?,optionLabels?}, ... ],
  posiblesIngresos: [ ... ],
  microservicios?: [ {id,nombre,icon,desc,dependsOn,campos,efectos}, ... ],  // solo wallet, comercios, bnpl
  lock?: "Educación",   // restringe la capacidad a una vertical en el wizard (solo "asistencia")
}
```

**Importante — el campo `base` que la tarea pide documentar no existe realmente.** `Mundos.jsx:178` lo lee defensivamente (`m.tier === "CORE" || m.base`) para preseleccionar módulos en el wizard, pero **ninguna** entrada de `MODULE_CATALOG` define `base: true` (verificado con grep exhaustivo sobre `store.js`). Es una rama muerta / aspiracional — repórtenlo como tal en el documento, no como un flag real en uso.

`CORE_IDS = MODULE_CATALOG.filter(m => m.tier === "CORE").map(m => m.id)` — `store.js:482`.

Catálogo de monedas: `MONEDAS_CATALOG` — `store.js:18-21` (`PEN`, `USD`), fuente única para el selector del wizard y el configField `monedaPermitida` de Wallet.

Capacidades "Próximamente" (visibles pero no activables ni sincronizables — fuera del alcance de los 3 casos TEC Raimondi/Kermesse/BNPL): `MODULOS_PROXIMAMENTE` — definido en `supabase.js:182-186` (re-exportado desde `store.js:976` para evitar ciclo de imports): `facturacion, reservas, loyalty, credito, subsidio, estacionamiento, asistencia, cashback, turnos, transporte, promociones`.

### Verticales y giros
- `VERTICALS` — `store.js:462-466`: Educación, Evento, Retail, Hospitalidad, Salud, Club Deportivo, Entretenimiento, Empresa (legado), Comunidad (legado), Especial RedPontis (interno, excluido del selector de creación).
- `GIROS_POR_VERTICAL` — `store.js:470-481`: mapa de 2do nivel (ej. Educación → Colegio/Universidad/Instituto/Academia/Centro de idiomas), select dependiente en el wizard.

### Modelo B2B/B2C/Embebido del Motor de Eventos
`modosDeMundo(m)` — `store.js:513-517`:
```js
export function modosDeMundo(m) {
  const base = m.eventosConfig?.modoEventos || (m.type === "eventos_rp" ? "b2c" : "b2b");
  if (base === "b2b") return ["b2b"];
  return ["b2c", ...(m.eventosConfig?.embebidoActivo ? ["embebido"] : [])];
}
```
Reglas de negocio (no cosméticas, aplicadas en múltiples puntos): B2B es excluyente con B2C/Embebido (mundo "organizador", panel propio entregado a un tercero, aprobación final RedPontis). B2C sí puede convivir con Embebido (el propio mundo publica bajo comisión RedPontis). El mundo especial `mundo-eventos-rp` (JOI Eventos) es B2C por definición de `type==="eventos_rp"` y no se le ofrece B2B en la UI (`MundoDetail.jsx:1069`).

La UI real que decide esto es `SelectorModoEventos({m, compacto})` — `MundoDetail.jsx:1040-1150`, reutilizado en dos superficies: `EventosActivadoPopup` (`MundoDetail.jsx:1157-1177`, salta al activar la capacidad "eventos" por primera vez en un mundo ya existente) y la pestaña `TabEventos` (`MundoDetail.jsx:2853-2887`, botón "Volver a elegir el modelo"). Elegir "b2b" apaga `embebidoActivo` en el mismo gesto (`MundoDetail.jsx:1053-1057`). Activar Embebido exige fijar `modeloComisionEventos` (transaccional/mixto/revenue) — `MundoDetail.jsx:1059-1063, 1112-1138`.

### Mapeo mundo → Supabase (`worldRow`)
**Nota de precisión:** la función vive en `supabase.js:72-108` (no en `store.js`). Columnas exactas que escribe en la tabla `worlds`:

| columna Supabase | origen en el objeto mundo local | línea |
|---|---|---|
| `id` | `m.id` | supabase.js:74 |
| `code` | `m.codigo \|\| m.id` | supabase.js:75 |
| `name` | `m.nombre` | supabase.js:76 |
| `vertical` | `m.vertical \|\| "Educación"` | supabase.js:77 |
| `status` | `(m.estado \|\| "ACTIVO").toLowerCase()` | supabase.js:78 |
| `color_primary` | `m.color \|\| "#0035b9"` | supabase.js:79 |
| `currency` | `m.moneda \|\| "PEN"` | supabase.js:80 |
| `acuerdo` | `m.acuerdo?.tipo ? m.acuerdo : null` | supabase.js:91 |
| `pos_pin` | `m.posPin \|\| null` | supabase.js:95 |
| `logo_url` | `m.logoUrl \|\| null` | supabase.js:99 |
| `grupo_id` | `m.grupoId \|\| null` | supabase.js:104 |
| `comparte_saldo_grupo` | `!!m.compartesaldoGrupo` | supabase.js:105 |
| `updated_at` | `new Date().toISOString()` | supabase.js:106 |

### FLAG_DEV_MAP — estado de desarrollo por feature flag (2 niveles)
`store.js:1043-1108`. Nivel 1 (Catálogo Global, RedPontis): define `status: ready|in_progress|planned` y `api` por cada `capacidad:flag`. Nivel 2 (config por mundo): el admin del mundo solo puede activar flags con `status==="ready"`. Fallback: `FLAG_TIER_DEFAULT` — `store.js:1109` (`CORE→in_progress`, `PREMIUM/OPCIONAL→planned`). Lectura: `getFlagDev(modId,flagId)` — `store.js:1111-1118`. Escritura: `setFlagDev` — `store.js:1119-1125`.

`FLAG_UX_MAP` — `store.js:1132-1159` — declara qué superficie de la superapp renderiza cada flag.

### Dirección Supabase → local (`refreshMundosLive`)
`store.js:747-861`. Trae `fetchWorldsLive()` + `fetchAllCapacityConfigs()` + `fetchAllFeatureFlags()` en paralelo. Reconstruye `modulos[]`, `eventosConfig`, `entrega`. Solo agrega/actualiza mundos — nunca pisa ediciones locales no sincronizadas salvo que Supabase ya tenga algo real y lo local no. Poda mundos borrados de verdad en Supabase, excepto los `fixed`.

### Dirección local → Supabase (`syncAllWorlds` + `scheduleSync`)
`syncAllWorlds(mundos)` — `supabase.js:203-320`, 5 pasos secuenciales: (1) `worlds`, (2) `world_capacity_configs`, (3) `world_feature_flags`, (4) `world_channel_configs`, (5) `world_acquiring_channel_configs`. Disparo: `update(fn)` llama `scheduleSync` en cada mutación; debounce de 800ms.

---

## 1. Catalogo.jsx — Catálogo Global de Capacidades (Capa 1 Plataforma)

Pantalla `/admin/catalogos/capacidades`. Drawer de edición con 3 tabs: **Feature Flags** (Nivel 1 — RedPontis define qué flags existen, su `dev_status`, endpoint), **Config Fields** (solo lectura), **Vista en App** (preview). Guardar publica de inmediato a Supabase vía `syncCatalogRemote` — no requiere el botón manual de "Catálogos Globales". El pricing nunca se define aquí ("se configura por mundo al activar la capacidad").

## 2. ModulosMundo.jsx — Vista cruzada por capacidad

Pantalla `/admin/modulos`. Vista Cards y Matriz capacidad×mundo con toggles. Bloquea explícitamente los módulos `MODULOS_PROXIMAMENTE` (fix de un bug real: el toggle parecía funcionar pero nunca llegaba a Supabase).

## 3. MundoDetail.jsx — Detalle de un Mundo

### 3.1 TabModulos — activación de capacidades por mundo
Al activar, calcula `DEPENDENCY_MAP[modId]` faltantes y **solo muestra un toast de advertencia** — no bloquea la activación.

### 3.2 DEPENDENCY_MAP (advertencia, no bloqueo)
`store.js:978-998`:
```
loyalty→[wallet]  cashback→[wallet,comercios]  consumos→[wallet,comercios]
inventario→[comercios]  facturacion→[comercios,consumos]  menu→[inventario]
subsidio→[wallet]  credito→[wallet]  bnpl→[wallet,comercios]  eventos→[wallet,comercios]
estacionamiento→[accesos,wallet]  transporte→[wallet]  control→[wallet]
asistencia→[accesos]  reservas→[wallet]  turnos→[wallet]
```
`wallet`, `comercios`, `accesos`, `perfil_ext` no tienen entrada (fundacionales).

### 3.3 ModuleConfigDrawer — drawer genérico de configuración por capacidad
Mismo componente para las 21 capacidades, con hasta 6 tabs dinámicos: Microservicios, Canales (solo wallet/comercios), Pricing (acuerdo comercial por capacidad, toggle "Gratuito por el momento"), Feature Flags, Config Fields/Parámetros, Vista App.

### 3.4 TabAcuerdo — Acuerdo Comercial del Mundo
Distinto del pricing por-capacidad — es el acuerdo del mundo completo, read-only salvo contacto a Plataforma. La parte editable son las tarifas a merchants (MDR/fijo, modelo de recaudación, frecuencia, retención confidencial, vigencia) — guardadas dentro de `comerciosMod.config`.

## 4. Grupos.jsx (Sucursales)

Un Grupo es un cliente con varias sucursales (mundos) que comparten identidad financiera (Emisor, Adquirente, tipo de wallet) pero se ven como comunidades independientes en el superapp. `grupoId`/`compartesaldoGrupo` solo se setean en el wizard de creación — no hay UI de edición/desvinculación en `MundoDetail.jsx` todavía, pese a que `Grupos.jsx` le dice al admin que sí existe ese camino.

---

## 5. Bloques por capacidad (MODULE_CATALOG completo, 21 entradas)

### Wallet (`wallet`) — Tier CORE
Núcleo de identidad digital — saldo, perfiles, recargas, transferencias. Config fields: `monedaPermitida`, `maxRecargasDiarias`, `maxPorRecarga`, `p2pEnabled`, `usaPulseraNfc`, `vigenciaBanditasMeses`, `perfilesSuscripcion`. Microservicios: `modelo_perfil` (consumo vs. identificación), `transferencia` (límites P2P). Sin dependencias propias — es prerequisito de casi todo lo demás.

### Comercios (`comercios`) — Tier CORE
Administra puntos de venta — alta, POS, liquidación, reportes. Config fields: `mdrDefault`, `fijoTxDefault`, `tipoOnboarding`. Microservicios: `hardware`, `liquidacion` (obligatorio, siempre activo), `creacion`.

### Compras y Transacciones (`consumos`) — Tier CORE
Motor transaccional del backoffice. Config: `horarioOperativo`. Depende de `wallet, comercios`.

### Inventario (`inventario`) — Tier CORE
Catálogo, stock y disponibilidad de productos. Config: `skuMax`, `stockNegativo`, `categoriasMax`. Depende de `comercios`; es prerequisito de `menu`.

### Facturación (`facturacion`) — Tier PREMIUM — **Próximamente** (en `MODULOS_PROXIMAMENTE`)
Comprobantes electrónicos SUNAT. Config: `rucEmisor`, `serieBoleta`, `serieFactura`. Depende de `comercios, consumos`.

### Perfil extendido (`perfil_ext`) — Tier PREMIUM
Datos médicos/emergencia/identificación adicionales. Config: `camposMedicos`, `grupoFamiliar`. Todos los flags (`tipo_sangre/alergias/clinica/contacto_emergencia`) `ready` con destino real `user_profiles.*`.

### Accesos (`accesos`) — Tier PREMIUM
Control de ingreso/salida por TAQ/QR. Config: `zonas`, `validacionDoble`. Es prerequisito de `estacionamiento, asistencia`.

### Reservas (`reservas`) — Tier PREMIUM — **Próximamente**
Reserva de espacios/recursos con anticipo. Config: `anticipoMin`, `ventanaCancelacion`. Depende de `wallet`.

### Puntos Loyalty (`loyalty`) — Tier OPCIONAL — **Próximamente**
Acumulación/canje de puntos. Config: `equivalencia`, `caducidadMeses`. Depende de `wallet`.

### Motor de Eventos (`eventos`) — Tier OPCIONAL
Venta/gestión de entradas, con B2B/B2C/Embebido (ver §0). Config: `comisionEntrada`, `allowB2C`, `ventanaPickup`. Configuración adicional a nivel de mundo: `m.eventosConfig`. Depende de `wallet, comercios`.

### Crédito (`credito`) — Tier OPCIONAL — **Próximamente**
Config: `lineaMax`, `tasaInteres`. Depende de `wallet`. Quedó fuera del alcance del caso Mok; BNPL lo reemplazó operativamente.

### Subsidio (`subsidio`) — Tier OPCIONAL — **Próximamente**
Config: `categorias`, `vigenciaDias`. Depende de `wallet`.

### Estacionamiento (`estacionamiento`) — Tier OPCIONAL — **Próximamente**
Config: `tarifaHora`, `graciaMinutos`. Depende de `accesos, wallet`.

### Asistencia (`asistencia`) — Tier OPCIONAL — **Próximamente**, explícitamente "aún no construido en la app"
Sin config fields. `lock: "Educación"` — solo seleccionable si la vertical es Educación. Depende de `accesos`. (No está en la lista canónica del negocio.)

### Cashback (`cashback`) — Tier OPCIONAL — **Próximamente**
Config: `porcentajeDefault`, `topeMensual`. Depende de `wallet, comercios`.

### Restricciones (`control`) — Tier OPCIONAL — activa
Reglas de uso de saldo y control parental de dependientes. La lista más larga de config fields: `perfilesControladosActivo`, `maxPerfilesControlados`, `registroAlergias`, `limiteDiarioPerfil`, `montoAprobacionPadre`, `horarioConsumo`, `soloMercantesAfiliados`, `notificacionConsumoRealTime`, `limiteGlobalMundo`, `alertasAdminEmail`. Depende de `wallet`.

### Menú (`menu`) — Tier OPCIONAL — activa
Catálogo diario de menú con cupos, restricciones alimentarias, pre-orden. Config: `diasAnticipacion`, `cuposPorMenu`, `metodoReserva` (saldo/qr/ambos — el canje QR en punto de venta todavía no tiene canje real construido). Depende de `inventario`.

### Promociones (`promociones`) — Tier OPCIONAL — **Próximamente** (salió de alcance el 02-ago porque JOI Promos no está operativo)
Config: `maxCuponesUsuario`.

### Turnos (`turnos`) — Tier OPCIONAL — **Próximamente**
Config: `duracionDefault`. Depende de `wallet`.

### BNPL (`bnpl`) — Tier OPCIONAL — activa, la más elaborada de las opcionales
"Compra ahora, paga después" en marca blanca. Config (techo del Mundo, nivel 2): `cuotas3/6/12`, `diasGracia`, `scoreObligatorio`, `sinEvaluacion`, `montoMaxBNPL`, `moraMaxPct`. Microservicios: `elegibilidad`, `limites`, `programa`, `contratos`. Depende de `wallet, comercios` — explícitamente NO depende de Crédito.

### Transporte (`transporte`) — Tier OPCIONAL — **Próximamente**
Config: `tarifaPlana`. Depende de `wallet`.

---

## 6. Funciones de sincronización — resumen + inconsistencias detectadas

| Dirección | Función | Archivo:línea |
|---|---|---|
| local → Supabase (push completo) | `syncAllWorlds(mundos)` | `supabase.js:203-320` |
| local → Supabase (debounce trigger) | `scheduleSync(getMundos)` | `supabase.js:324-327` |
| Supabase → local | `refreshMundosLive()` | `store.js:747-861` |
| mapeo mundo→fila `worlds` | `worldRow(m)` | `supabase.js:72-108` |

### Inconsistencias encontradas (con evidencia)

**1. `retentionPercentage` se presenta como si se aplicara a cada liquidación, pero el motor real nunca lo lee.** `TabAcuerdo` lo etiqueta "Retención RedPontis — confidencial" y afirma que se descuenta del neto. Se lee en `Calculadora.jsx:48` (proyección) pero el motor real (`procesarLiquidacionMundo`, `store.js:1643-1708`) calcula `neto = volumen - comision - descuentoHardware` **sin restar `retentionPercentage` en ningún punto**. Hoy no tiene ningún efecto en los lotes de liquidación reales.

**2. Dos campos de "frecuencia de liquidación" paralelos y desincronizados.** `TabAcuerdo` expone `settlementFrequency` (guardado en `comercios.config.settlementFrequency`), mientras que el motor real lee `liquidacion_frecuencia` (seteado por el microservicio "Módulo de Liquidación"). `settlementFrequency` solo lo consume `Calculadora.jsx` (proyección) — nunca el corte real.

**3. `validFrom`/`validUntil` (vigencia de tarifa) — mismo patrón**: se guardan y se leen solo en `Calculadora.jsx` (proyección), sin ningún chequeo de vigencia en el flujo de venta real.

**4. `mdrDefault`/`fijoTxDefault` se editan en dos lugares con el mismo destino** (comparten key, no son inconsistentes entre sí) — pero su único consumidor confirmado en este repo es `Calculadora.jsx` (proyección).

**5. Funciones de sync muertas / no invocadas.** `syncWorldAcquiringChannels`/`fetchWorldAcquiringChannels` (`supabase.js:2002-2011`) no tienen ningún caller — duplican intención con el paso 5 de `syncAllWorlds`.

**6. `Grupos.jsx` le indica al admin un camino de edición que no existe en código.** El modal de bloqueo de borrado dice "Desvincúlalas primero (Editar mundo → Grupo → Ninguno)", pero no hay ningún control de `grupoId`/`compartesaldoGrupo` en `MundoDetail.jsx` — hoy no hay forma de desvincular una sucursal de su grupo desde la UI.

**7. `base` en MODULE_CATALOG.** `Mundos.jsx:178` lee `m.base` para preseleccionar módulos en el wizard, pero ningún módulo lo define — lógica muerta, se reduce siempre a `m.tier === "CORE"`.
