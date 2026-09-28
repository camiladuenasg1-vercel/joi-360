# Gestor de Cobranzas — Requerimientos

Software de cobranza recurrente con **su propio frente y sus propias credenciales**, activable desde
el catálogo por mundo o por comercio. Caso de referencia: **YOKI**, comercio de suscripciones dentro
del mundo **Jockey Plaza**.

> **Los requerimientos REQ-COB-001 a 003 de la sección 1 están reemplazados** por REQ-COB-001 a 007
> de `frente-y-accesos.md`. El gestor no es una sección de Admin RP: es un frente independiente.
> Del REQ-COB-010 en adelante todo sigue vigente tal como está escrito.

---

## El loop que hay que resolver

Todo el frente existe para cerrar este ciclo. Cada requerimiento cuelga de un paso.

```
1. RP activa la capacidad al comercio        REQ-COB-001 … 003
2. El comercio crea sus planes               REQ-COB-010 … 013
3. Carga su cartera de suscriptores          REQ-COB-020 … 024
4. Define sus reglas de cobranza             REQ-COB-030 … 032
5. El sistema emite cargos y avisa           REQ-COB-040 … 044
6. El suscriptor paga                        REQ-COB-050 … 052
7. Si cambia de plan, se prorratea           REQ-COB-060 … 062
8. El comercio gestiona lo que falta cobrar  REQ-COB-070 … 075
```

Fuera de alcance en esta fase: cobro automático con tarjeta tokenizada, reintentos automáticos
y actualizador de tarjetas. El modelo de datos queda preparado (ver `design.md` §12) pero no se
construye.

---

## Glosario

| Término | Significado |
|---|---|
| **Mundo** | La comunidad. En el caso de referencia, Jockey Plaza. |
| **Comercio** (merchant) | El negocio dentro del mundo que cobra. En el caso de referencia, YOKI. |
| **Suscriptor** | La persona a la que el comercio le cobra. No necesita cuenta en la Super App. |
| **Plan** | Monto + frecuencia + día de cobro que define qué se le cobra a un suscriptor. |
| **Suscripción** | La unión de un suscriptor con un plan, con su fecha de alta y su ciclo. |
| **Cargo** | Lo que se le debe cobrar a un suscriptor en un período concreto. |
| **Ciclo** | La ventana de tiempo que cubre un cargo. |
| **Prorateo** | El ajuste cuando un suscriptor cambia de plan a mitad de ciclo. |

---

# 1. Activación de la capacidad — REEMPLAZADA

> Esta sección completa está reemplazada por la sección 8 de `frente-y-accesos.md`, que cubre lo
> mismo y además el alcance por mundo, las credenciales de Cognito, la entrega del producto y la caja
> del shell. Se conserva abajo únicamente como registro de la primera versión.

### REQ-COB-001 — Activar cobranzas a un comercio *(reemplazado)*

Como operador de Red Pontis,
quiero activar la capacidad de cobranzas a un comercio concreto dentro de un mundo,
para que ese comercio obtenga su panel de cobranzas sin habilitárselo a todo el mundo.

**Criterios de aceptación**

- Dado un mundo con comercios cargados, cuando abro el detalle del mundo y voy a sus comercios,
  entonces cada comercio muestra si tiene cobranzas activa o no.
- Cuando activo cobranzas en un comercio, entonces solo ese comercio queda habilitado y los demás
  del mismo mundo no cambian.
- Cuando desactivo la capacidad, entonces el panel deja de estar accesible pero **no se borra
  ningún dato**: cartera, cargos e historial quedan intactos.
- Dado un comercio sin cobranzas activa, cuando intento entrar a su panel por URL directa,
  entonces recibo un estado de "capacidad no contratada" y no datos vacíos.

**Reglas de negocio**

- La capacidad se activa por comercio, no por mundo. Esto **no existe hoy** en Admin RP: ver
  `design.md` §7, es la decisión bloqueante del frente.
- Un comercio puede tener cobranzas activa aunque su mundo no tenga la capacidad `suscripciones`
  activada. Son cosas distintas: `suscripciones` del mundo cobra por vincular un perfil familiar;
  cobranzas del comercio cobra una cartera propia.

**Casos borde**

- Comercio en estado `PENDING` o `INACTIVE`: se puede activar la capacidad pero el panel avisa que
  el comercio todavía no opera.
- Comercio que se mueve de mundo: la cartera viaja con el comercio, no con el mundo.

---

### REQ-COB-002 — Aislamiento por comercio

Como responsable de la plataforma,
quiero que todo dato de cobranzas esté atado a un comercio,
para que dos comercios nunca vean la cartera del otro.

**Criterios de aceptación**

- Toda consulta, KPI, listado, exportación y acción resuelve contra un `merchantId` explícito.
- Dado un usuario con acceso al comercio A, cuando pide datos del comercio B por id directo,
  entonces recibe 403 y no una lista vacía.
- Cuando cambio de comercio dentro del admin, entonces ningún dato del comercio anterior queda en
  pantalla ni en caché.

**Reglas de negocio**

- El servidor no confía en el `merchantId` del cliente: valida contra los accesos de la sesión.
- Ninguna tabla transaccional existe sin trazabilidad a `merchant_id`, directa o por su suscripción.

---

### REQ-COB-003 — Entrada al panel desde Admin RP

Como operador,
quiero llegar al panel de cobranzas de un comercio desde donde ya administro ese comercio,
para no aprender una navegación nueva.

**Criterios de aceptación**

- Dado el detalle de un mundo, en la tabla de comercios, cuando el comercio tiene cobranzas activa,
  entonces aparece una acción que abre su panel de cobranzas.
- El panel usa el mismo layout, sidebar, header, tipografía y componentes que el resto de Admin RP.
- El panel muestra en su encabezado a qué comercio y a qué mundo pertenece lo que estoy viendo.

**Dependencias**

- REQ-COB-001.
- Admin RP hoy no tiene contexto de comercio activo ni ruta con `:merchantId`: ver `design.md` §6.

---

# 2. Planes del comercio

### REQ-COB-010 — Crear un plan

Como operador del comercio,
quiero crear un plan con su monto y su frecuencia,
para poder asociarle suscriptores.

**Criterios de aceptación**

- Puedo crear un plan indicando: nombre, monto, moneda, frecuencia y día de cobro.
- Frecuencias soportadas: mensual, trimestral, semestral, anual.
- Día de cobro admite dos modos: **fijo del mes** (ej. día 5) o **relativo al alta** (cobra el mismo
  día del mes en que se dio de alta el suscriptor).
- Dado un monto menor o igual a cero, cuando intento guardar, entonces recibo un error de campo y
  el plan no se crea.
- Dado un día de cobro fijo entre 29 y 31, cuando el mes no tiene ese día, entonces el cargo se
  emite el último día del mes.
- Un plan recién creado queda activo y con cero suscriptores.

**Reglas de negocio**

- El nombre del plan es único dentro del comercio.
- La moneda la hereda del mundo del comercio y no se edita por plan.

---

### REQ-COB-011 — Editar un plan sin alterar la cartera vigente

Como operador del comercio,
quiero cambiar el precio de un plan,
para que los suscriptores nuevos paguen el precio nuevo sin que los actuales cambien solos.

**Criterios de aceptación**

- Cuando cambio el monto de un plan, entonces los suscriptores ya asociados **siguen con el monto
  que tenían**.
- Cuando cambio el monto, entonces el sistema me avisa cuántos suscriptores vigentes quedan con el
  precio anterior y me ofrece una acción explícita para migrarlos.
- Dado que elijo migrar la cartera al precio nuevo, cuando confirmo, entonces se registra en la
  bitacora quién lo hizo, cuándo, y a cuántos suscriptores afectó.
- Los cargos **ya emitidos** nunca cambian de monto al editar un plan.

**Reglas de negocio**

- Cada cambio de precio genera una **versión de plan**. La suscripción apunta a una versión, no al
  plan. Sin esto se pierde la trazabilidad de qué se cobró y por qué.
- Un plan con suscriptores activos no se puede eliminar: solo desactivar.

**Casos borde**

- Bajar el precio a un plan con cartera vigente: mismo flujo, la migración también es explícita.
- Desactivar un plan con suscriptores: los cargos ya programados se siguen emitiendo; no se pueden
  asociar suscriptores nuevos.

---

### REQ-COB-012 — Ver el rendimiento de cada plan

Como operador del comercio,
quiero ver cuántos suscriptores y cuánto ingreso tiene cada plan,
para saber qué plan sostiene el negocio.

**Criterios de aceptación**

- Por cada plan veo: suscriptores activos, suscriptores en mora, ingreso facturado del período e
  ingreso cobrado del período.
- Los números corresponden solo al comercio activo.

---

### REQ-COB-013 — Permanencia y vigencia

Como operador del comercio,
quiero definir permanencia mínima y vigencia del plan,
para poder sostener condiciones comerciales.

**Criterios de aceptación**

- Puedo definir permanencia mínima en meses, o dejarla sin permanencia.
- Puedo definir vigencia indefinida o con fecha de fin.
- Dado un suscriptor dentro de su permanencia mínima, cuando intento darlo de baja, entonces el
  sistema lo advierte y pide confirmación explícita.

---

# 3. Carga de la cartera

### REQ-COB-020 — Cargar suscriptores desde archivo

Como operador del comercio,
quiero cargar mi cartera desde un archivo,
para no tener que dar de alta a cada persona a mano.

**Criterios de aceptación**

- Acepto archivo CSV con estas columnas: `documento`, `nombre`, `correo`, `telefono`, `plan`,
  `monto`, `periodicidad`, `fecha_primer_cobro`.
- Puedo descargar una plantilla con los encabezados correctos antes de cargar.
- Cuando subo el archivo, entonces el sistema valida **fila por fila** y me muestra un resumen con
  cuántas filas son válidas y cuántas tienen error, **antes** de confirmar.
- El botón de confirmar está deshabilitado hasta que la validación termina.
- Cuando confirmo, entonces solo se importan las filas válidas. **Las filas con error no bloquean
  a las correctas.**
- Puedo descargar el detalle de errores, con el número de fila y el motivo de cada uno.
- Una carga nunca se aplica a medias: o se confirma el lote de filas válidas completo, o no se
  aplica nada.

**Reglas de validación por fila**

| Campo | Regla | Error |
|---|---|---|
| `documento` | Requerido. 8 dígitos (DNI), 11 (RUC) o 9–12 alfanumérico (CE) | `documento_invalido` |
| `nombre` | Requerido, mínimo 3 caracteres | `nombre_invalido` |
| `correo` | Requerido, formato de correo válido | `correo_invalido` |
| `telefono` | Opcional. Si viene, 9 dígitos | `telefono_invalido` |
| `plan` | Requerido. Debe coincidir con un plan existente del comercio | `plan_no_existe` |
| `monto` | Requerido, numérico y mayor que cero | `monto_invalido` |
| `periodicidad` | Opcional. `MENSUAL`, `TRIMESTRAL`, `SEMESTRAL` o `ANUAL`. Por defecto la del plan | `periodicidad_invalida` |
| `fecha_primer_cobro` | Requerido, formato `YYYY-MM-DD`, fecha real | `fecha_invalida` |
| — | `documento` repetido dentro del mismo archivo | `documento_duplicado_en_archivo` |

**Casos borde**

- Archivo vacío o sin encabezados: error de archivo, no de filas.
- Encabezados en otro orden: se resuelven por nombre, no por posición.
- Encabezado faltante: error de archivo con el nombre de la columna que falta.
- Archivo con más de 5.000 filas: se procesa por lotes y el progreso es visible.
- Celdas con espacios alrededor: se recortan antes de validar.
- `monto` con coma decimal (`45,00`): se acepta y se normaliza.

---

### REQ-COB-021 — Actualizar cartera existente con el mismo archivo

Como operador del comercio,
quiero volver a cargar mi archivo para actualizar datos,
para corregir correos o montos sin borrar y recrear la cartera.

**Criterios de aceptación**

- Cuando una fila trae un `documento` que ya existe en el comercio, entonces se trata como
  actualización, no como alta duplicada.
- Antes de confirmar veo una **vista previa de cambios**: por cada suscriptor afectado, qué campo
  cambia, de qué valor a qué valor.
- Los suscriptores que no aparecen en el archivo **no se tocan**: una carga parcial no da de baja
  a nadie.
- Cada campo modificado queda en la bitácora.

**Casos borde**

- Fila que cambia el plan de un suscriptor activo: no se aplica en la carga masiva. Cambiar de plan
  pasa por el flujo de prorateo (REQ-COB-060), porque tiene consecuencias de dinero.

---

### REQ-COB-022 — Listado de suscriptores

Como operador del comercio,
quiero ver mi cartera completa con búsqueda y filtros,
para encontrar a una persona rápido.

**Criterios de aceptación**

- Veo: documento, nombre, correo, plan, monto, frecuencia, próximo cobro, estado de la suscripción,
  estado de cobranza, deuda total y antigüedad de la deuda.
- Puedo buscar por documento, nombre o correo.
- Puedo filtrar por plan, estado de suscripción y estado de cobranza.
- El listado pagina en el servidor y los filtros se aplican en el servidor.
- Puedo exportar el resultado respetando los filtros aplicados.

---

### REQ-COB-023 — Ficha del suscriptor

Como operador del comercio,
quiero abrir a una persona y ver todo lo que pasó con ella,
para poder responder cualquier reclamo.

**Criterios de aceptación**

- La ficha muestra: datos de contacto, plan y versión de plan vigente, ciclo actual, próximo cobro,
  deuda pendiente y estado.
- Muestra el historial completo de cargos con su estado y su monto.
- Muestra el historial de pagos con fecha, monto, medio y referencia.
- Muestra los avisos enviados, con fecha, canal y si se entregó.
- Muestra los cambios hechos sobre la persona, con usuario y fecha.
- Muestra los cambios de plan con su prorateo asociado.

---

### REQ-COB-024 — Alta y baja individual

Como operador del comercio,
quiero dar de alta o de baja a una persona sin usar un archivo,
para resolver casos puntuales.

**Criterios de aceptación**

- Puedo dar de alta un suscriptor con los mismos campos y las mismas validaciones que la carga
  masiva.
- Puedo dar de baja una suscripción indicando la fecha efectiva.
- Cuando doy de baja, entonces los cargos pendientes ya emitidos siguen existiendo y el sistema me
  pregunta explícitamente si se anulan o se mantienen.
- Una baja dentro de la permanencia mínima pide confirmación (REQ-COB-013).

---

# 4. Reglas de cobranza

### REQ-COB-030 — Configurar las reglas del comercio

Como operador del comercio,
quiero definir cómo se cobra y qué pasa cuando no me pagan,
para que el sistema opere con mi política y no con una genérica.

**Criterios de aceptación**

- Puedo configurar:
  - días de anticipación con que se emite el cargo antes del vencimiento;
  - días de gracia después del vencimiento antes de considerar la deuda vencida;
  - mora: tipo (monto fijo o porcentaje), valor, si se suma al mismo cargo o va como concepto
    separado, y tope máximo acumulable;
  - suspensión: después de cuántos cargos vencidos se suspende la suscripción;
  - reactivación: automática al pagar, o manual;
  - cancelación: después de cuántos meses suspendido.
- Veo siempre los valores vigentes, no un formulario vacío.
- Dada una combinación inválida, cuando intento guardar, entonces recibo un error explicando cuál
  es el conflicto.
- Antes de guardar un cambio de alto impacto veo una confirmación que dice a cuántos cargos afecta.

**Reglas de negocio**

- Un cambio de reglas afecta **solo a cargos futuros**. Los cargos ya emitidos conservan las reglas
  con las que nacieron. Esto tiene que estar visible en la interfaz, no solo documentado.
- Combinaciones inválidas que hay que rechazar: gracia mayor que el plazo de suspensión; tope de
  mora menor que el valor de una sola aplicación; suspensión en cero cargos.

---

### REQ-COB-031 — Cálculo de mora

Como operador del comercio,
quiero que la mora se calcule sola según mi regla,
para no tener que hacerlo a mano.

**Criterios de aceptación**

- Dado un cargo vencido y pasados los días de gracia, entonces se aplica mora según la regla
  vigente al momento de emisión del cargo.
- La mora nunca supera el tope configurado.
- Cuando la mora está configurada como concepto separado, entonces se ve como línea aparte del
  monto base, no sumada dentro.
- Un operador con permiso puede remover o ajustar la mora de un cargo puntual, y queda en bitácora
  con el motivo.

**Casos borde**

- Pago parcial: la mora se recalcula sobre el saldo, no sobre el monto original.
- Cargo pagado dentro de la gracia: no genera mora.

---

### REQ-COB-032 — Estados del cargo

Como responsable de la plataforma,
quiero un vocabulario único de estados,
para que el panel, los KPIs y los reportes digan lo mismo.

**Criterios de aceptación**

- Estados: `SCHEDULED`, `ISSUED`, `PENDING`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `IN_ARREARS`,
  `CANCELLED`, `FAILED`.
- Por cada estado está documentado: qué evento lo produce, qué acciones se permiten, cómo se ve, y
  si cuenta para morosidad.
- Los estados viajan en inglés `UPPER_SNAKE_CASE` y se traducen solo al pintar.

**Transiciones**

| Desde | Evento | Hacia |
|---|---|---|
| — | se programa el ciclo | `SCHEDULED` |
| `SCHEDULED` | llega la fecha de emisión | `ISSUED` |
| `ISSUED` | se notifica al suscriptor | `PENDING` |
| `PENDING` | se acredita el pago total | `PAID` |
| `PENDING` | se acredita un pago parcial | `PARTIALLY_PAID` |
| `PENDING` / `PARTIALLY_PAID` | vence y pasa la gracia | `OVERDUE` |
| `OVERDUE` | supera el plazo de suspensión | `IN_ARREARS` |
| cualquiera menos `PAID` | se anula por decisión del comercio | `CANCELLED` |
| `PENDING` | falla el intento de cobro | `FAILED` |

Cuentan para morosidad: `OVERDUE` e `IN_ARREARS`.

---

# 5. Avisos

### REQ-COB-040 — Calendario de avisos configurable

Como operador del comercio,
quiero definir qué avisos se mandan y cuándo,
para que la gente se enteré antes de que le cobre y no después.

**Criterios de aceptación**

- Puedo configurar avisos relativos a la fecha de vencimiento, con desplazamiento en días.
- Casos base que tienen que existir: aviso previo, aviso el día del cobro, recordatorio posterior
  si sigue pendiente, aviso de fin de gracia, confirmación de pago.
- Cada aviso se puede activar o desactivar por separado.
- Veo cuántos avisos se van a mandar en los próximos días con la configuración actual.

**Regla obligatoria**

- **Si el cargo ya está pagado, los avisos pendientes de ese cargo no se envían.** Esto se verifica
  al momento de enviar, no al programar.

---

### REQ-COB-041 — Envío por correo

Como operador del comercio,
quiero que el aviso llegue por correo con el link de pago,
para que la persona pueda pagar desde el mismo mensaje.

**Criterios de aceptación**

- El aviso incluye: nombre del suscriptor, concepto, período, monto, fecha de vencimiento, link de
  pago y QR.
- El remitente y la marca del mensaje corresponden al comercio, no a Red Pontis.
- Cada envío queda registrado con fecha, canal, destinatario y resultado.
- Dado un correo que rebota, entonces el registro lo refleja y el suscriptor queda marcado como
  contacto no alcanzable.

**Dependencias**

- Proveedor de envío de correo. **Pendiente de definición**: hoy `joi360mono` no tiene
  infraestructura de correo transaccional. Ver `design.md` §11.

---

### REQ-COB-042 — Recordatorio manual

Como operador del comercio,
quiero mandar un recordatorio ahora mismo a alguien puntual,
para poder gestionar un caso sin esperar al calendario.

**Criterios de aceptación**

- Desde la fila de un cargo o desde la ficha del suscriptor puedo disparar un recordatorio.
- Puedo elegir qué mando: link de pago, QR, o ambos.
- El envío queda en la bitácora igual que uno automático, marcado como manual y con el usuario que
  lo disparó.
- Hay un límite de envíos manuales por suscriptor por día, configurable, para no convertirlo en spam.

**Nota de producto**

Este requerimiento es el corazón de la propuesta de valor de la fase 1. El valor que Red Pontis
entrega acá no es mover el dinero: es que el cobro no se olvide y que el comercio tenga el canal
listo para mandarlo en un clic.

---

### REQ-COB-043 — Recordatorio masivo por segmento

Como operador del comercio,
quiero mandar el recordatorio a todos los que están en un tramo de mora,
para gestionar la cartera y no de a una persona.

**Criterios de aceptación**

- Puedo seleccionar un segmento desde los filtros aplicados (por ejemplo, todos los de 31–60 días).
- Antes de enviar veo a cuántas personas va y confirmo.
- El envío se procesa en segundo plano y puedo ver su progreso y su resultado.
- Los suscriptores cuyo cargo se pagó entre la selección y el envío quedan excluidos
  automáticamente.

---

### REQ-COB-044 — Plantillas del comercio

Como operador del comercio,
quiero ajustar el texto de mis avisos,
para que suenen a mi marca.

**Criterios de aceptación**

- Cada tipo de aviso tiene una plantilla editable con variables disponibles documentadas.
- Veo una vista previa con datos de ejemplo antes de guardar.
- Una plantilla con una variable que no existe no se puede guardar.

---

# 6. Pago del suscriptor

### REQ-COB-050 — Pagar sin tener cuenta

Como suscriptor,
quiero pagar desde el link que me llegó,
sin tener que registrarme en nada.

**Criterios de aceptación**

- El link abre una página de pago con la marca y el contexto del comercio.
- La página muestra qué estoy pagando: concepto, período, monto base, mora si hay, y total.
- Puedo pagar con tarjeta o con QR.
- Al pagar veo una confirmación y recibo un comprobante por correo.
- El link es de un solo cargo y tiene vencimiento.
- Dado un cargo ya pagado, cuando abro el link otra vez, entonces veo que ya está pagado y no puedo
  pagar dos veces.

**Reglas de negocio**

- El link no expone datos de otros cargos ni de otros suscriptores.
- El identificador del link no es adivinable ni secuencial.

---

### REQ-COB-051 — Cobro por QR

Como suscriptor,
quiero pagar escaneando un QR,
para no tener que escribir datos de tarjeta.

**Criterios de aceptación**

- El QR resuelve al mismo cargo que el link de pago.
- El QR se puede mostrar en pantalla desde el panel del comercio, para cobrar presencialmente.
- Un QR de un cargo pagado ya no permite pagar.

---

### REQ-COB-052 — Reflejo del pago en el panel

Como operador del comercio,
quiero ver el pago en mi panel en cuanto ocurre,
para no tener que conciliar a mano.

**Criterios de aceptación**

- Cuando se acredita un pago, entonces el cargo cambia de estado y el KPI de cobrado se actualiza.
- Veo el medio de pago, la fecha, el monto y la referencia del proveedor.
- Veo los intentos fallidos con su motivo, no solo los exitosos.
- Un pago parcial deja el cargo en `PARTIALLY_PAID` con su saldo visible.

**Dependencias**

- Pasarela de pago. **Pendiente de definición**: hoy la recarga de wallet en `joi360mono` es
  deliberadamente simulada. Ver `design.md` §11.

---

# 7. Prorateo por cambio de plan

### REQ-COB-060 — Calcular el prorateo antes de aplicarlo

Como operador del comercio,
quiero ver exactamente cuánto se cobra o se acredita si alguien cambia de plan a mitad de ciclo,
para poder explicárselo antes de ejecutarlo.

**Criterios de aceptación**

- Dado un suscriptor con un ciclo en curso, cuando elijo un plan destino y una fecha efectiva,
  entonces veo el desglose completo **antes** de confirmar:
  - días totales del ciclo;
  - días ya consumidos;
  - días que quedan;
  - crédito por los días no usados del plan actual;
  - cargo por los días que quedan del plan nuevo;
  - diferencia neta a cobrar o a acreditar.
- Cuando el plan nuevo es más caro, entonces la diferencia es un cargo a cobrar.
- Cuando el plan nuevo es más barato, entonces la diferencia es un saldo a favor.
- Puedo cancelar sin que se aplique nada.

**Fórmula**

```
D   = días totales del ciclo actual
Dr  = días restantes desde la fecha efectiva hasta el fin del ciclo
cred  = montoPlanActual × Dr / D        crédito por lo no usado
cargo = montoPlanNuevo  × Dr / D        cargo por lo que queda
neto  = cargo − cred
```

- `neto > 0` → cargo inmediato por la diferencia.
- `neto < 0` → saldo a favor.
- `neto = 0` → solo cambia el plan, sin movimiento de dinero.

Redondeo: dos decimales, medio hacia arriba. El redondeo se aplica al final, sobre `neto`, no en
cada término, para que la suma no se desvíe.

---

### REQ-COB-061 — Aplicar el cambio de plan

Como operador del comercio,
quiero ejecutar el cambio con su ajuste,
para que la próxima facturación salga con el plan nuevo.

**Criterios de aceptación**

- Cuando confirmo, entonces:
  - la suscripción queda apuntando a la versión del plan nuevo;
  - se crea el movimiento de ajuste por el neto calculado;
  - el próximo cargo se emite con el monto del plan nuevo y el ciclo completo;
  - queda un registro del cambio con el desglose que se le mostró al operador.
- El desglose guardado es el que se mostró, no uno recalculado después. Si el precio del plan cambia
  mañana, el registro del prorateo de hoy sigue diciendo lo mismo.

**Casos borde**

- Cambio con fecha efectiva igual al inicio del ciclo: no hay prorateo, se reemplaza el cargo.
- Cambio con fecha efectiva igual al fin del ciclo: no hay prorateo, aplica desde el siguiente.
- Cambio con fecha efectiva retroactiva: permitido solo si el ciclo sigue abierto; si ya se pagó,
  el ajuste va al ciclo siguiente.
- Dos cambios en el mismo ciclo: el segundo prorratea contra el plan que dejó el primero.

---

### REQ-COB-062 — Saldo a favor

Como operador del comercio,
quiero que el saldo a favor de una baja de plan se use solo,
para no tener que llevarlo en una planilla.

**Criterios de aceptación**

- Un saldo a favor queda asociado al suscriptor y visible en su ficha.
- Cuando se emite el próximo cargo, entonces el saldo a favor se descuenta automáticamente hasta
  agotarse.
- Cuando el saldo cubre el cargo completo, entonces el cargo nace en `PAID` con medio
  `SALDO_A_FAVOR` y no se le manda aviso de cobro.
- El saldo a favor no se devuelve en efectivo en esta fase.

---

# 8. Gestión de lo que falta cobrar

### REQ-COB-070 — Resumen de cobranzas

Como operador del comercio,
quiero abrir el panel y entender mi situación de un vistazo,
para saber dónde tengo que meter la mano.

**Criterios de aceptación**

- Veo como mínimo: cartera activa, cobrado del período, pendiente, vencido, tasa de morosidad,
  próximos vencimientos y proyección del próximo período.
- Cada KPI corresponde solo al comercio activo.
- Los KPIs se calculan en el servidor. El cliente no descarga la cartera para sumarla.
- Veo evolución por período y distribución por estado.
- Cada KPIs lleva a su listado ya filtrado.

---

### REQ-COB-071 — Quién me debe y cuánto

Como operador del comercio,
quiero la respuesta directa a quién me debe, cuánto, y desde cuándo,
para poder llamarlos.

**Criterios de aceptación**

- Veo una lista de deudores ordenable por monto y por antigüedad.
- Por cada deudor: nombre, contacto, cuántos cargos pendientes, monto total, mora acumulada y
  antigüedad del cargo más viejo.
- Puedo agrupar por tramo de antigüedad: 1–30, 31–60, 61–90, 90+ días.
- Los tramos están definidos en un solo lugar, no repetidos en cada componente.
- Desde cualquier fila puedo disparar el recordatorio o generar el link.

---

### REQ-COB-072 — Listado de cobros

Como operador del comercio,
quiero ver todos los cargos con su estado,
para auditar qué se emitió y qué se cobró.

**Criterios de aceptación**

- Veo: id, suscriptor, plan, período, emisión, vencimiento, monto base, mora, total, pagado, saldo,
  estado, medio de pago, fecha de pago e intentos.
- Puedo filtrar por rango de fechas, estado, plan, suscriptor, medio de pago y con/sin mora.
- Puedo abrir el detalle de un cargo con su historial de intentos y avisos.

---

### REQ-COB-073 — Acciones sobre un cargo

Como operador del comercio,
quiero poder intervenir un cargo puntual,
para resolver excepciones sin salir del sistema.

**Criterios de aceptación**

- Según mi rol puedo: reenviar link, reenviar aviso, registrar un pago manual, anular el cargo,
  aplicar o remover mora, y marcar una excepción administrativa.
- Toda acción de estas queda en bitácora con usuario, fecha y motivo.
- Registrar un pago manual exige indicar medio, fecha, monto y referencia.
- Un cargo `PAID` no admite anulación; exige una nota de crédito.

---

### REQ-COB-074 — Exportar

Como operador del comercio,
quiero bajar mis listados,
para trabajarlos fuera y para rendir cuentas.

**Criterios de aceptación**

- Puedo exportar a CSV: cartera, cobros del período, pagos, pendientes, morosidad y proyección.
- La exportación respeta el comercio activo, los filtros aplicados y mis permisos.
- Las fechas salen en el formato y la zona horaria estándar de la plataforma.
- Los montos salen con dos decimales y sin separador de miles, para que abran bien en Excel.

---

### REQ-COB-075 — Bitácora

Como responsable de la plataforma,
quiero que todo cambio sensible quede registrado,
para poder reconstruir qué pasó.

**Criterios de aceptación**

- Cada cambio registra: entidad, id, campo, valor anterior, valor nuevo, usuario, fecha y comercio.
- Quedan registrados como mínimo: cambios de plan y de precio, cambios de reglas, cargas masivas,
  altas y bajas, ajustes de mora, pagos manuales, anulaciones y envíos de aviso.
- La bitácora es de solo lectura desde la interfaz. No se edita ni se borra.

---

# 9. Estados de interfaz

### REQ-COB-080 — Cada pantalla declara sus estados

Toda pantalla del frente tiene que resolver estos casos, y el spec de diseño indica cómo se ve
cada uno:

| Estado | Cuándo |
|---|---|
| Cargando | mientras resuelve la primera petición |
| Vacío por configurar | el comercio no tiene reglas de cobranza definidas |
| Vacío sin planes | el comercio no creó ningún plan todavía |
| Vacío sin cartera | tiene planes pero no cargó suscriptores |
| Vacío sin cargos | tiene cartera pero todavía no se emitió nada |
| Sin resultados | los filtros no devuelven nada |
| Error | la petición falló, con reintento |
| Sin permisos | el rol no alcanza para lo que se pide |
| Capacidad no contratada | el comercio no tiene cobranzas activa |
| Degradado | los datos llegan parciales y se avisa qué falta |

**Regla**: "sin resultados por filtros" y "vacío porque no hay nada" son estados distintos y se
tienen que ver distinto. Confundirlos hace que el operador crea que perdió su cartera.

---

# 10. No funcionales

### REQ-COB-090 — Seguridad

- Aislamiento estricto por comercio, validado en el servidor.
- Reutilizar el mecanismo de autenticación y autorización que ya tiene Admin RP.
- No exponer datos de otros comercios en ninguna respuesta.
- El link de pago no es adivinable y no expone más que su propio cargo.
- Datos de tarjeta nunca tocan la base de datos de la plataforma.

### REQ-COB-091 — Performance

- Paginación y filtros en el servidor para cualquier listado que pueda pasar de 500 filas.
- KPIs por endpoint agregado, no calculados en el cliente.
- La carga masiva no bloquea la interfaz.
- Una cartera de 10.000 suscriptores tiene que abrir el resumen en menos de 2 segundos.

### REQ-COB-092 — Observabilidad

- Errores trazables con `merchantId` y un identificador de correlación.
- Métrica de cada importación: filas recibidas, válidas, rechazadas, tiempo.
- Métrica de cada corrida de emisión y de avisos: cuántos, cuántos fallaron, por qué.

### REQ-COB-093 — Accesibilidad

- Mantener el estándar de Admin RP.
- Navegación por teclado en tablas y formularios.
- El estado de un cargo no se comunica solo por color: siempre lleva texto.
- Contraste suficiente en los badges de estado.

---

# 11. Trazabilidad

| Requerimiento | Diseño | Tareas |
|---|---|---|
| REQ-COB-001…003 | §7 activación por comercio, §6 contexto | T-01, T-02, T-03 |
| REQ-COB-010…013 | §8 modelo de datos, §9 contratos | T-10 … T-13 |
| REQ-COB-020…024 | §10 flujo de carga masiva | T-20 … T-24 |
| REQ-COB-030…032 | §8 reglas, §13 máquina de estados | T-30 … T-32 |
| REQ-COB-040…044 | §11 avisos y dependencias externas | T-40 … T-43 |
| REQ-COB-050…052 | §11 pago, §12 preparación fase 2 | T-50 … T-52 |
| REQ-COB-060…062 | §14 motor de prorateo | T-60 … T-62 |
| REQ-COB-070…075 | §5 pantallas, §15 exportación, §16 bitácora | T-70 … T-75 |
| REQ-COB-080 | §5 pantallas y estados | incluido en cada tarea de pantalla |
| REQ-COB-090…093 | §17 no funcionales | T-90 … T-93 |
