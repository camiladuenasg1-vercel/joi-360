# Gestor de Cobranzas — Tareas

Implementación en `joi360mono`. Ordenadas por dependencia: una tarea no arranca hasta que sus
dependencias están cerradas.

Formato: **objetivo** · **archivos probables** · **depende de** · **terminado cuando** · **cubre**.

Convención de verificación del repo: `node --check` sobre los archivos de servidor tocados y
`npm run build` desde `app-source`. Pruebas contra `https://apidev.ecoregateway.com/joi360app/api`.

---

## Fase 0 — REEMPLAZADA

> La Fase 0 y la tarea T-02 están reemplazadas por la sección 9 de `frente-y-accesos.md`, que define
> T-01 (alcance en el catálogo), T-01b (`merchant_module`), T-01c (grupos de Cognito y accesos),
> T-01d (`portal_credential`), T-01e (entrega del producto) y T-02 (frente nuevo con su entrada de
> build y su login).
>
> **De T-03 en adelante todo sigue vigente**, con un solo cambio: las pantallas se construyen en
> `client/src/cobranzas/` y los componentes base en `client/src/shared/`, no en `client/src/admin/`.

### T-01 — Decidir el mecanismo de activación por comercio *(reemplazada — la decisión es Opción A)*
**Objetivo**: elegir entre `merchant_module` genérico (Opción A) o `collection_settings` propia
(Opción B), y dejar la decisión escrita.
**Archivos**: `docs/` nuevo ADR; si es A, también `server/modules/capabilities/catalog.js` para
declarar el alcance de cada capacidad.
**Depende de**: nada.
**Terminado cuando**: hay un ADR con la opción elegida, el motivo, y qué pasa si una capacidad está
activa en el mundo y apagada en el comercio.
**Cubre**: REQ-COB-001.

> Bloquea todo el resto del frente. `design.md` §7 recomienda la Opción A con alcance declarado,
> porque deja el mecanismo general disponible sin cambiar el comportamiento del resolver para
> ninguna capacidad existente.

---

## Fase 1 — Componentes base de Admin RP

Se construyen primero porque los usan todas las pantallas y porque hoy no existen. Le sirven al
admin completo, más allá de este frente.

### T-02 — `DataTable`
**Objetivo**: tabla con paginación y orden server-side, y los estados cargando / vacío / error /
sin-resultados diferenciados.
**Archivos**: `client/src/admin/components/DataTable.jsx` (nuevo).
**Depende de**: nada.
**Terminado cuando**: reemplaza sin pérdida visual a la tabla de merchants de `MundoDetail.jsx`, y
distingue "vacío porque no hay nada" de "vacío porque los filtros no matchearon".
**Cubre**: REQ-COB-022, 072, 080.

### T-03 — `KpiCard`, `FilterBar`, `Money`, `EstadoBadge`
**Objetivo**: los primitivos que hoy se copian y pegan.
**Archivos**: `client/src/admin/components/` (nuevos).
**Depende de**: nada.
**Terminado cuando**: `KpiCard` reproduce las tarjetas de `PagesCore.jsx` sin cambio visual;
`EstadoBadge` muestra texto además de color; `Money` formatea con la moneda del mundo.
**Cubre**: REQ-COB-070, 093.

### T-04 — Utilidad de exportación CSV
**Objetivo**: traer `descargarCsv` al admin.
**Archivos**: copiar de `client/src/comercio/ui.tsx` a `client/src/admin/csv.js` (nuevo).
**Depende de**: nada.
**Terminado cuando**: un CSV exportado con tildes y comas abre correcto en Excel en español.
**Cubre**: REQ-COB-074.

### T-05 — Montar el runner de tests
**Objetivo**: que el repo pueda ejecutar pruebas. Hoy no tiene ninguna.
**Archivos**: `app-source/package.json` (script `test`), `app-source/vitest.config.js` (nuevo).
**Depende de**: nada.
**Terminado cuando**: `npm test` corre y pasa con una prueba trivial.
**Cubre**: REQ-COB-092 y habilita T-60.

> No toca `bitbucket-pipelines.yml`. Si hace falta correrlo en el pipeline, se documenta en
> `docs/INFRA_NOTES.md` y lo decide el equipo de infra.

---

## Fase 2 — Contexto de comercio y activación

### T-06 — Endpoint de detalle de comercio
**Objetivo**: `GET /admin/v2/merchants/:merchantId` con su mundo y sus capacidades. Hoy solo existe
el listado.
**Archivos**: `server/modules/admin/routes.js`, `repository.js`, `service.js`.
**Depende de**: T-01.
**Terminado cuando**: devuelve el comercio con `worldId`, `worldName`, `currency` y sus capacidades,
y responde 403 si la sesión no tiene acceso a ese comercio.
**Cubre**: REQ-COB-002, 003.

### T-07 — Ruta y contexto de comercio en el cliente
**Objetivo**: `/admin/comercios/:merchantId` con hidratación desde el store.
**Archivos**: `client/src/admin/App.jsx`, `store.js` (`hydrateMerchantDetail`),
`ComercioDetail.jsx` (nuevo), `api.js`.
**Depende de**: T-06.
**Terminado cuando**: entrando por URL directa con recarga completa, la pantalla carga el comercio
sin depender de que otra pantalla le haya pasado el id.
**Cubre**: REQ-COB-003.

### T-08 — Esquema de activación por comercio
**Objetivo**: crear la tabla decidida en T-01 con su migración.
**Archivos**: `docs/sql/AAAA-MM-DD-merchant-module.sql` (nuevo), `server/modules/admin/repository.js`.
**Depende de**: T-01.
**Terminado cuando**: la migración corre en dev, y activar la capacidad en un comercio no altera a
los demás comercios del mismo mundo.
**Cubre**: REQ-COB-001.

### T-09 — Activación desde el detalle del mundo
**Objetivo**: toggle de cobranzas por comercio y acceso a su panel.
**Archivos**: `client/src/admin/MundoDetail.jsx` (`ActoresMerchants`), `api.js`.
**Depende de**: T-08, T-07.
**Terminado cuando**: la fila del comercio muestra el estado de la capacidad y, si está activa, una
acción que abre el panel; si no lo está, el panel por URL directa muestra "capacidad no contratada".
**Cubre**: REQ-COB-001, 003, 080.

---

## Fase 3 — Esquema de datos

### T-10 — Migración del esquema completo
**Objetivo**: crear las 14 tablas de `design.md` §8 con sus índices.
**Archivos**: `docs/sql/AAAA-MM-DD-gestor-cobranzas.sql` (nuevo).
**Depende de**: T-08.
**Terminado cuando**: la migración corre en dev sin errores, los índices existen, y toda tabla
transaccional tiene `merchant_id`.
**Cubre**: REQ-COB-002, 091.

### T-11 — Módulo del servidor
**Objetivo**: estructura `routes.js` / `service.js` / `repository.js` del dominio.
**Archivos**: `server/modules/collections/` (nuevo), montado en `server/modules/admin/routes.js`.
**Depende de**: T-10.
**Terminado cuando**: el módulo responde un endpoint de salud del dominio con aislamiento por
comercio validado, y no hay una línea de SQL fuera de `repository.js`.
**Cubre**: REQ-COB-002.

---

## Fase 4 — Planes

### T-12 — Planes con versionado de precio
**Objetivo**: CRUD de planes y versiones.
**Archivos**: `server/modules/collections/*`, `client/src/admin/cobranzas/TabPlanes.jsx` (nuevo),
`api.js`.
**Depende de**: T-11, T-02, T-03.
**Terminado cuando**: cambiar el precio crea una versión nueva y **los suscriptores vigentes
mantienen su monto**; un plan con suscriptores no se puede eliminar, solo desactivar.
**Cubre**: REQ-COB-010, 011.

### T-13 — Migración explícita de cartera al precio nuevo
**Objetivo**: la acción deliberada que sí cambia el monto de los vigentes.
**Archivos**: `server/modules/collections/service.js`, `TabPlanes.jsx`.
**Depende de**: T-12, T-30.
**Terminado cuando**: antes de confirmar se ve a cuántos suscriptores afecta; al confirmar queda en
bitácora con usuario, fecha y cantidad; los cargos ya emitidos no cambian.
**Cubre**: REQ-COB-011, 075.

### T-14 — Permanencia y vigencia
**Objetivo**: permanencia mínima y vigencia del plan.
**Archivos**: `server/modules/collections/*`, `TabPlanes.jsx`.
**Depende de**: T-12.
**Terminado cuando**: dar de baja dentro de la permanencia pide confirmación explícita.
**Cubre**: REQ-COB-013.

### T-15 — Rendimiento por plan
**Objetivo**: suscriptores e ingreso por plan.
**Archivos**: `server/modules/collections/repository.js`, `TabPlanes.jsx`.
**Depende de**: T-12, T-20.
**Terminado cuando**: los números son SQL agregado, no conteo en el cliente.
**Cubre**: REQ-COB-012.

---

## Fase 5 — Carga masiva

### T-20 — Validador de filas
**Objetivo**: función pura que valida una fila y devuelve sus códigos de error.
**Archivos**: `server/modules/collections/importValidator.js` (nuevo),
`importValidator.test.js` (nuevo).
**Depende de**: T-11, T-12, T-05.
**Terminado cuando**: hay un caso de prueba por cada código de error de REQ-COB-020, incluido
`documento_duplicado_en_archivo`, monto con coma decimal y celdas con espacios.
**Cubre**: REQ-COB-020.

### T-21 — Endpoints de importación en dos pasos
**Objetivo**: `POST imports` valida, `apply` escribe.
**Archivos**: `server/modules/collections/*`.
**Depende de**: T-20.
**Terminado cuando**: `apply` es idempotente por `importJobId`, un job ya aplicado responde 409, y
la aplicación ocurre en una transacción con `db.transaction()`.
**Cubre**: REQ-COB-020, 021.

### T-22 — `CsvDropzone` y pantalla de carga
**Objetivo**: subida, parseo, resumen de validación y vista previa de cambios.
**Archivos**: `client/src/admin/components/CsvDropzone.jsx` (nuevo),
`client/src/admin/cobranzas/CargaCartera.jsx` (nuevo).
**Depende de**: T-21, T-04.
**Terminado cuando**: el confirmar está deshabilitado hasta validar, las filas con error no bloquean
a las válidas, se puede bajar el CSV de errores, y hay plantilla descargable.
**Cubre**: REQ-COB-020, 021, 080.

### T-23 — Listado de suscriptores
**Objetivo**: cartera con búsqueda, filtros y paginación server-side.
**Archivos**: `server/modules/collections/*`,
`client/src/admin/cobranzas/TabSuscriptores.jsx` (nuevo).
**Depende de**: T-21, T-02.
**Terminado cuando**: filtros y paginación son server-side y la exportación respeta los filtros.
**Cubre**: REQ-COB-022, 074.

### T-24 — Ficha del suscriptor
**Objetivo**: todo lo que pasó con una persona.
**Archivos**: `client/src/admin/cobranzas/FichaSuscriptor.jsx` (nuevo).
**Depende de**: T-23, T-40, T-70.
**Terminado cuando**: muestra cargos, pagos, avisos, cambios y prorateos, cada uno con su fecha.
**Cubre**: REQ-COB-023.

### T-25 — Alta y baja individual
**Objetivo**: los mismos campos y validaciones que la carga masiva, de a uno.
**Archivos**: `server/modules/collections/*`, `TabSuscriptores.jsx`.
**Depende de**: T-20, T-23.
**Terminado cuando**: la baja pregunta explícitamente qué hacer con los cargos pendientes.
**Cubre**: REQ-COB-024.

---

## Fase 6 — Reglas y emisión

### T-30 — Reglas de cobranza
**Objetivo**: configuración por comercio con validación de combinaciones.
**Archivos**: `server/modules/collections/*`,
`client/src/admin/cobranzas/TabReglas.jsx` (nuevo).
**Depende de**: T-11.
**Terminado cuando**: rechaza las combinaciones inválidas de REQ-COB-030 con mensaje explicando el
conflicto, y la interfaz dice que el cambio afecta solo a cargos futuros.
**Cubre**: REQ-COB-030.

### T-31 — Emisión de cargos
**Objetivo**: generar el cargo del ciclo con las reglas congeladas.
**Archivos**: `server/modules/collections/service.js`, `repository.js`.
**Depende de**: T-30, T-12.
**Terminado cuando**: cada cargo guarda su `rules_snapshot_json`, la emisión es idempotente por
`(subscription_id, period_label)`, y un día de cobro 31 en un mes de 30 emite el último día.
**Cubre**: REQ-COB-010, 030, 032.

### T-32 — Mora y máquina de estados
**Objetivo**: función pura de transición y cálculo de mora.
**Archivos**: `server/modules/collections/chargeState.js` (nuevo), `chargeState.test.js` (nuevo).
**Depende de**: T-31, T-05.
**Terminado cuando**: la mora respeta el tope, un pago dentro de la gracia no genera mora, un pago
parcial recalcula sobre el saldo, y el servidor devuelve `allowedActions` por cargo.
**Cubre**: REQ-COB-031, 032.

---

## Fase 7 — Avisos

### T-40 — Calendario de avisos
**Objetivo**: reglas de aviso por comercio con activación individual.
**Archivos**: `server/modules/collections/*`, `TabReglas.jsx`.
**Depende de**: T-30.
**Terminado cuando**: se ve cuántos avisos se enviarán en los próximos días, y **un cargo pagado no
dispara sus avisos pendientes**, verificado al momento de enviar y registrado como
`SKIPPED_ALREADY_PAID`.
**Cubre**: REQ-COB-040.

### T-41 — Link de pago y QR
**Objetivo**: generar el token del cargo, su link y su QR.
**Archivos**: `server/modules/collections/*`. `qrcode` ya es dependencia del proyecto.
**Depende de**: T-31.
**Terminado cuando**: el token es UUID v4 con vencimiento, no expone otros cargos, y un cargo pagado
no permite pagar de nuevo.
**Cubre**: REQ-COB-050, 051, 090.

### T-42 — Recordatorio manual
**Objetivo**: disparar el aviso desde la fila o la ficha. **Es el núcleo de valor de la fase 1.**
**Archivos**: `server/modules/collections/*`, `TabCobros.jsx`, `FichaSuscriptor.jsx`.
**Depende de**: T-40, T-41.
**Terminado cuando**: queda en bitácora marcado como manual con el usuario, respeta el límite diario
por suscriptor, y el operador puede elegir si manda link, QR o ambos.
**Cubre**: REQ-COB-042.

### T-43 — Recordatorio masivo por segmento
**Objetivo**: enviar al tramo de mora seleccionado.
**Archivos**: `server/modules/collections/*`, `TabMorosidad.jsx`.
**Depende de**: T-42, T-71.
**Terminado cuando**: se confirma la cantidad antes de enviar, corre en segundo plano con progreso
consultable, y excluye en el momento del envío a quien ya pagó.
**Cubre**: REQ-COB-043.

### T-44 — Plantillas del comercio
**Objetivo**: texto editable con variables y vista previa.
**Archivos**: `server/modules/collections/*`, `TabReglas.jsx`.
**Depende de**: T-40.
**Terminado cuando**: una plantilla con una variable inexistente no se puede guardar.
**Cubre**: REQ-COB-044.

### T-45 — Integración de correo — BLOQUEADA
**Objetivo**: enviar el aviso de verdad.
**Depende de**: definición de proveedor de correo transaccional. **No existe en `joi360mono`.**
**Terminado cuando**: hay proveedor definido y `notification_event` pasa de `PENDING_PROVIDER` a
`SENT` con resultado real.
**Cubre**: REQ-COB-041.

> Mientras esté bloqueada, la fase 1 entrega valor igual: el operador copia el link desde el panel,
> que es exactamente lo que YOKI hace hoy a mano, pero sabiendo a quién y por cuánto.

---

## Fase 8 — Pago

### T-50 — Página pública de pago
**Objetivo**: el suscriptor ve su cargo y paga sin cuenta.
**Archivos**: `server/modules/collections/public-routes.js` (nuevo), vista pública nueva.
**Depende de**: T-41.
**Terminado cuando**: muestra concepto, período, monto, mora y total con la marca del comercio; un
cargo pagado muestra que ya está pagado.
**Cubre**: REQ-COB-050, 051.

### T-51 — Pago manual y conciliación en el panel
**Objetivo**: registrar el pago que llegó por fuera.
**Archivos**: `server/modules/collections/*`, `TabCobros.jsx`.
**Depende de**: T-32.
**Terminado cuando**: exige medio, fecha, monto y referencia; un pago parcial deja
`PARTIALLY_PAID` con saldo visible; queda en bitácora.
**Cubre**: REQ-COB-052, 073.

### T-52 — Integración de pasarela — BLOQUEADA
**Objetivo**: cobro real con tarjeta y QR.
**Depende de**: definición de pasarela. La recarga de wallet hoy es deliberadamente simulada.
**Cubre**: REQ-COB-052.

---

## Fase 9 — Prorateo

### T-60 — Motor de prorateo
**Objetivo**: módulo puro, la única fuente del cálculo.
**Archivos**: `server/modules/collections/proration.js` (nuevo), `proration.test.js` (nuevo).
**Depende de**: T-05, T-12.
**Terminado cuando**: pasan estos casos, con `decimal.js` y redondeo único sobre el neto:

| Caso | Entrada | Esperado |
|---|---|---|
| Upgrade a mitad de ciclo | ciclo 30d, efectivo día 15, 50 → 80 | `remainingDays 16`, neto `+16.00`, `CHARGE` |
| Downgrade a mitad de ciclo | ciclo 30d, efectivo día 15, 80 → 50 | neto `−16.00`, `CREDIT` |
| Mismo monto | ciclo 30d, efectivo día 10, 50 → 50 | neto `0.00`, `NONE` |
| Efectivo = inicio de ciclo | ciclo 30d, efectivo día 1 | `remainingDays 30`, prorateo completo |
| Efectivo = fin de ciclo | ciclo 30d, efectivo día 30 | `remainingDays 1`, no cero |
| Ciclo anual | ciclo 365d, efectivo día 100, 600 → 900 | neto `+218.63` |
| Febrero | ciclo 28d, efectivo día 14 | `remainingDays 15` |
| Efectivo fuera del ciclo | efectivo posterior a `cycleEnd` | error de entrada, no cálculo |
| No desviación por redondeo | 3 cambios consecutivos | la suma de netos cierra al centavo |

**Cubre**: REQ-COB-060.

### T-61 — Preview y aplicación del cambio de plan
**Objetivo**: ver el desglose y ejecutarlo.
**Archivos**: `server/modules/collections/*`,
`client/src/admin/cobranzas/TabProrateo.jsx` (nuevo).
**Depende de**: T-60.
**Terminado cuando**: `preview` no escribe nada; `apply` guarda el desglose **tal como se mostró**;
`breakdownHash` distinto responde 409; el próximo cargo sale con el plan nuevo y ciclo completo.
**Cubre**: REQ-COB-060, 061.

### T-62 — Saldo a favor
**Objetivo**: que el crédito se aplique solo.
**Archivos**: `server/modules/collections/service.js`, `FichaSuscriptor.jsx`.
**Depende de**: T-61, T-31.
**Terminado cuando**: se descuenta del próximo cargo hasta agotarse; si lo cubre completo el cargo
nace `PAID` con medio `CREDIT_BALANCE` y **sin aviso de cobro**.
**Cubre**: REQ-COB-062.

---

## Fase 10 — Gestión

### T-70 — Resumen con KPIs
**Objetivo**: un endpoint agregado y la pantalla.
**Archivos**: `server/modules/collections/repository.js`,
`client/src/admin/cobranzas/TabResumen.jsx` (nuevo).
**Depende de**: T-31, T-03.
**Terminado cuando**: los KPIs salen de SQL agregado, el cliente no descarga la cartera, y cada KPI
lleva a su listado ya filtrado.
**Cubre**: REQ-COB-070, 091.

### T-71 — Morosidad por tramo
**Objetivo**: quién debe, cuánto, desde cuándo.
**Archivos**: `server/modules/collections/*`,
`client/src/admin/cobranzas/TabMorosidad.jsx` (nuevo).
**Depende de**: T-32, T-02.
**Terminado cuando**: los tramos 1-30/31-60/61-90/90+ están definidos en **un solo lugar**, se puede
ordenar por monto y por antigüedad, y desde cada fila se dispara el recordatorio.
**Cubre**: REQ-COB-071.

### T-72 — Listado de cobros y detalle
**Objetivo**: todos los cargos con sus filtros.
**Archivos**: `client/src/admin/cobranzas/TabCobros.jsx` (nuevo).
**Depende de**: T-31, T-02.
**Terminado cuando**: filtra por fecha, estado, plan, suscriptor, medio y con/sin mora, y el detalle
muestra intentos y avisos.
**Cubre**: REQ-COB-072.

### T-73 — Acciones sobre el cargo
**Objetivo**: intervenir un cargo puntual según rol.
**Archivos**: `server/modules/collections/*`, `TabCobros.jsx`.
**Depende de**: T-72, T-32, T-51.
**Terminado cuando**: cada acción exige motivo y queda en bitácora; un cargo `PAID` no admite
anulación; los botones se deshabilitan con `title` según `allowedActions`, no se esconden.
**Cubre**: REQ-COB-073.

### T-74 — Exportación de los seis reportes
**Objetivo**: cartera, cobros, pagos, pendientes, morosidad y proyección.
**Archivos**: `server/modules/collections/*`, `client/src/admin/csv.js`.
**Depende de**: T-04, T-70, T-71, T-72.
**Terminado cuando**: respeta comercio, filtros y permisos; hasta 1.000 filas exporta del cliente y
más de eso por el servidor; montos con dos decimales sin separador de miles.
**Cubre**: REQ-COB-074, 091.

### T-75 — Bitácora
**Objetivo**: registrar todo cambio sensible.
**Archivos**: `server/modules/collections/service.js`, vista de bitácora en la ficha.
**Depende de**: T-11.
**Terminado cuando**: se escribe **dentro de la misma transacción** que el cambio, es de solo lectura
desde la interfaz, y cubre los diez eventos de REQ-COB-075.
**Cubre**: REQ-COB-075.

---

## Fase 11 — Hardening

### T-90 — Aislamiento verificado
**Objetivo**: probar que un comercio no ve al otro.
**Archivos**: `server/modules/collections/*.test.js`.
**Depende de**: T-11, T-05.
**Terminado cuando**: pedir datos del comercio B con sesión del A devuelve **403, no una lista
vacía**, en todos los endpoints del módulo.
**Cubre**: REQ-COB-002, 090.

### T-91 — Permisos en el cliente
**Objetivo**: dejar de mostrar botones que el servidor rechaza.
**Archivos**: `client/src/admin/App.jsx`, componentes del frente.
**Depende de**: T-73.
**Terminado cuando**: un rol de solo lectura ve las acciones deshabilitadas con el motivo, y no
recibe un 403 al intentar guardar.
**Cubre**: REQ-COB-090.

> Arregla un problema que Admin RP ya tiene hoy en todas sus pantallas, no solo en este frente.

### T-92 — Observabilidad
**Objetivo**: poder diagnosticar una carga o una corrida que salió mal.
**Archivos**: `server/modules/collections/*`.
**Depende de**: T-21, T-31, T-40.
**Terminado cuando**: cada log lleva `merchantId` y correlación; cada importación y cada corrida de
emisión y de avisos registra cuántos, cuántos fallaron y por qué.
**Cubre**: REQ-COB-092.

### T-93 — Accesibilidad y estados
**Objetivo**: cerrar los diez estados de interfaz y el estándar de accesibilidad.
**Archivos**: componentes del frente.
**Depende de**: todas las pantallas.
**Terminado cuando**: cada pantalla resuelve sus diez estados, ningún estado se comunica solo por
color, y las tablas se navegan por teclado.
**Cubre**: REQ-COB-080, 093.

---

## Resumen del alcance

**Fase 1 entrega** (sin pasarela ni correo): activación por comercio, planes con versionado, carga
masiva validada, reglas de cobranza, emisión de cargos, quién debe / cuánto debe / desde cuándo,
motor de prorateo, link y QR generables, recordatorio manual y masivo, pago manual, exportación y
bitácora.

**Fase 1 no entrega**: envío automático de correo (T-45) y cobro con tarjeta (T-52). Ambas bloqueadas
por definiciones externas, no por esfuerzo.

**Fase 2** (no se construye ahora): tarjeta tokenizada, cargo automático, reintentos automáticos y
actualizador de tarjetas. El modelo de datos ya la habilita sin migración destructiva.

**Le sirve a todo Admin RP más allá de este frente**: `DataTable` con paginación, `KpiCard`,
`FilterBar`, exportación CSV, runner de tests y gating de permisos en el cliente. Son seis carencias
que el admin tiene hoy en todas sus pantallas.
