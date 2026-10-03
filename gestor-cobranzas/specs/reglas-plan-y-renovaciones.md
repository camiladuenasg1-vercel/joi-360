# Requirements Document

**Cobranzas: reglas por plan y renovaciones**

## Introduction

Este es un spec **incremental** sobre el paquete de especificación del Gestor de Cobranzas que ya
existe en `joi-360-camila/gestor-cobranzas/specs/`. No lo reescribe: cierra tres huecos de
conceptualización que levantó el analista comercial y declara, requerimiento por requerimiento, qué
requerimiento previo extiende o reemplaza.

Los tres huecos:

1. **Las reglas de cobranza se afilian al plan, no a la cartera.** Hoy `REQ-COB-030` las define a
   nivel de comercio. El plan Básico y el plan Premium necesitan políticas distintas de corte,
   gracia, mora, suspensión y cadencia de recordatorios.
2. **Falta el flujo por el cual un mundo configura y habilita el panel de cobranzas de uno de sus
   comercios.** La arquitectura ya está decidida (`merchant_module` genérico + `scope` declarado en
   el catálogo, `frente-y-accesos.md` §3 y §4). Lo que falta es quién activa, qué fija el mundo, qué
   queda a discreción del comercio, cómo se entregan las credenciales y qué ve el mundo de la cartera
   ajena.
3. **Renovaciones, cobro en lote, entrega al adquirente y registro del pago.** Una suscripción anual
   tiene que renovarse; los cargos tienen que poder cobrarse agrupados; el lote tiene que poder
   entregarse a un adquirente y conciliarse de vuelta; y el pago tiene que poder registrarse por tres
   vías distintas sin duplicarse.

Frente afectado: **`joi360mono` únicamente**. `joi360-app-ios` y `joi360-pos-android` no participan de
este alcance. `joi-360-camila` es referencia documental, no recibe código.

---

## Documentos de referencia

| Documento | Estado | Qué aporta a este spec |
|---|---|---|
| `gestor-cobranzas/specs/frente-y-accesos.md` | **Autoritativo** | Cuarto frente, `scope` y `ownFront` en el catálogo, `merchant_module`, grupos `collections-*`, `portal_credential`, `requireCollections`, aislamiento por titular (REQ-COB-001…007) |
| `gestor-cobranzas/specs/requirements.md` | Vigente del 010 al 093; su §1 está reemplazada | Planes y versionado, carga masiva, reglas de cobranza, estados del cargo, avisos, pago, prorrateo, gestión, no funcionales |
| `gestor-cobranzas/specs/design.md` | Vigente §1 y §8…§19; §2, §3, §6 y §7 reemplazadas | Modelo de datos de 14 tablas, contratos API, máquina de estados del cargo, motor de prorrateo, bitácora |
| `gestor-cobranzas/specs/tasks.md` | Vigente de T-03 en adelante | Orden de construcción y verificación |

Hechos verificados en `joi360mono` que este spec toma como base y no vuelve a suponer:

- `periodicity` ya se usa como nombre de columna en `family_subscription_plan` y
  `family_subscription_charge` (`server/modules/admin/repository.js`,
  `server/modules/mobile-family/*`), con valores `MONTHLY` y `ANNUAL`. La deuda técnica
  `billing_cycle` vs `periodicity` se resuelve en este alcance a favor de **`periodicity`**.
- El patrón de dependencia de notificación degradada existe: `server/modules/turnos/whatsapp.js`
  devuelve `status: 'NOT_CONFIGURED'` cuando falta configuración, y `pickup_ticket` guarda
  `notification_status`. Este spec reutiliza ese patrón; no inventa uno nuevo.
- La aritmética de dinero ya existe en `server/money.js`: `decimal.js` con `precision: 28` y
  `rounding: ROUND_HALF_UP`, salida por `toFixed(2)` y constante `CERO = '0.00'`. Este spec no define
  una aritmética propia: usa esa.
- La escala decimal por moneda ya existe en `server/monedas.js`: 2 decimales para `PEN`, `USD` y la
  mayoría, **0 decimales para `CLP` y `PYG`**. Por eso este spec habla de "escala de la moneda" y no
  de "dos decimales" cuando el valor se entrega al cliente.
- La zona horaria de la plataforma es `America/Lima`, ya usada en
  `server/modules/capabilities/enforcement.js`, `attendance/service.js`, `cashback/repository.js` y
  `world-portal/repository.js`. Todo cálculo de calendario de este spec usa esa zona.
- Los niveles de acceso `ADMIN`, `OPERADOR`, `SOPORTE` y `LECTURA` ya los resuelve
  `server/auth/access.js` por el sufijo del grupo de Cognito. Son literales existentes de la
  plataforma y este spec los usa tal cual, sin traducirlos al inglés.
- `scope` y `ownFront` **todavía no existen** en `server/modules/capabilities/catalog.js`. Los
  introduce T-01 de `frente-y-accesos.md` §9, que es prerrequisito de este spec.
- No hay proveedor de correo transaccional ni pasarela de pago integrada en el monolito. Ambos quedan
  marcados PENDIENTE DE DEFINICIÓN, con comportamiento degradado especificado.

---

## Glossary

Términos de dominio nuevos o precisados por este spec. Los nombres de sistema en versalita son los
que aparecen como sujeto en los criterios EARS.

| Término | Definición |
|---|---|
| **Titular** | Dueño de una cartera de cobranza: un mundo o un comercio. Toda fila de este alcance pertenece a exactamente un titular. |
| **Periodicidad** (`periodicity`) | Largo del ciclo de facturación de una suscripción. Valores canónicos: `MONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`. Nombre único en base de datos, dominio y respuestas. `billing_cycle` queda prohibido en código nuevo. |
| **Ciclo** | Ventana cerrada `[cycle_start, cycle_end]` que cubre exactamente un cargo. Dos ciclos consecutivos de una misma suscripción no se solapan ni dejan días sin cubrir. Un ciclo de un solo día tiene `cycle_start` igual a `cycle_end`. |
| **Día de anclaje** | Día del mes con el que se calculan los vencimientos sucesivos de una suscripción. Se conserva entre ciclos aunque un mes corto obligue a vencer antes. |
| **Renovación** | Apertura del ciclo siguiente de una suscripción vigente y emisión de su cargo. No crea una suscripción nueva: avanza el ciclo de la existente. |
| **Renovación automática** (`auto_renew`) | Atributo de la suscripción que indica si el ciclo siguiente se abre sin intervención humana. Su valor inicial lo hereda del plan. |
| **Fin de vigencia** (`valid_until`) | Fecha a partir de la cual la suscripción deja de renovarse, aunque siga `ACTIVE` hasta cerrar su último ciclo. |
| **Regla de cartera** | Regla de cobranza de un titular. Actúa como valor por defecto de todos sus planes. Hay exactamente una vigente por titular. |
| **Regla de plan** | Regla de cobranza asociada a un plan, con los mismos grupos que la regla de cartera y cada grupo opcional. |
| **Regla de cobranza** | Conjunto de los nueve grupos que REQ-COB-100 enumera. Existe en dos niveles: cartera y plan. |
| **Regla efectiva** | Resultado de resolver la regla de plan sobre la regla de cartera. Es lo único que el motor de emisión consume, y viaja con la procedencia de cada grupo. |
| **Congelado de reglas** (`rules_snapshot_json`) | Copia de la regla efectiva guardada dentro del cargo en el momento de emitirlo. Es la fuente de verdad para ese cargo por el resto de su vida. |
| **Límite de rechazos consecutivos** | Grupo de la regla de cobranza: cuántos rechazos seguidos del adquirente mandan un cargo a gestión manual. Entero de 0 a 10; `0` significa sin límite. |
| **Política del mundo** | Conjunto de límites que un mundo fija a la cobranza de sus comercios. REQ-COB-111 enumera sus campos. |
| **Lote de cobro** (`collection_batch`) | Agrupación cerrada e inmutable de cargos que se presentan a cobro juntos, con su criterio de armado, sus totales y su estado. |
| **Adquirente** | Tercero que procesa el cobro de un lote. No hay proveedor definido: este spec fija el contrato, no el proveedor. |
| **Presentación** | Entrega del lote al adquirente, sea como archivo o como llamada de API. |
| **Retorno** | Respuesta del adquirente con el resultado por cargo del lote presentado. |
| **Conciliación** | Cuadre entre lo presentado y lo retornado: totales, cantidades y diferencias, con su registro. |
| **Rechazo parcial** | Retorno en el que algunos cargos del lote se acreditan y otros no. |
| **Motivo canónico de rechazo** | Vocabulario propio del frente para clasificar un rechazo del adquirente: `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, `EXPIRED_INSTRUMENT`, `REJECTED_BY_ISSUER`, `TECHNICAL_ERROR`, `UNKNOWN`. |
| **Origen del pago** (`source`) | Vía por la que entró un pago: `MANUAL`, `ACQUIRER_RETURN`, `RECONCILIATION` o `CREDIT_BALANCE`. |
| **Clave de idempotencia** | Cadena de 1 a 64 caracteres que el cliente envía en una escritura para que un reintento no la aplique dos veces. |
| **Clave de idempotencia del pago** | Terna `(charge_id, source, external_reference)` que impide registrar dos veces el mismo pago. |
| **Saldo a favor** | Monto acreditado a un suscriptor y no aplicado todavía a un cargo. Nunca es negativo. |
| **Corrida** | Ejecución agrupada de renovación, avisos, presentación o conciliación. Tiene identificador de correlación y estado `RUNNING`, `FINISHED` o `INTERRUPTED`. |
| **Contacto no alcanzable** | Suscriptor cuyo último envío de aviso resultó `BOUNCED`. Se muestra marcado en su ficha y en la cartera. |
| **Escala de la moneda** | Cantidad de decimales que `server/monedas.js` declara para el código de moneda del titular: 2 para `PEN` y `USD`, 0 para `CLP` y `PYG`. Toda entrega de monto usa la escala de la moneda del titular. |
| **Zona horaria de la plataforma** | `America/Lima`. Toda fecha de calendario de este alcance se calcula y se compara en esa zona. |
| **Nivel de acceso** | Literal que `server/auth/access.js` deriva del sufijo del grupo de Cognito: `ADMIN`, `OPERADOR`, `SOPORTE`, `LECTURA`. |

### Nombres de sistema usados en los criterios EARS

| Nombre | Qué es |
|---|---|
| **THE Gestor_de_Cobranzas** | El frente completo: portal en `/joi360app/cobranzas/:scope/:code` más su módulo de servidor `server/modules/collections/` |
| **THE Motor_de_Reglas** | Componente de servidor que resuelve la regla efectiva y la congela en el cargo |
| **THE Motor_de_Renovaciones** | Componente de servidor que abre ciclos y emite cargos de renovación |
| **THE Motor_de_Prorrateo** | Módulo puro ya especificado en `design.md` §14 |
| **THE Motor_de_Lotes** | Componente de servidor que arma, cierra, presenta y concilia lotes |
| **THE Adaptador_de_Adquirente** | Capa que traduce el lote canónico al formato del proveedor y el retorno del proveedor al formato canónico |
| **THE Registro_de_Pagos** | Componente de servidor que acredita pagos y actualiza cargo y suscripción |
| **THE Servicio_de_Avisos** | Componente de servidor que programa y envía avisos |
| **THE Portal_del_Mundo** | Frente `mundo.html`, servido en `/joi360app/mundo/:code` |
| **THE Consola_Admin_RP** | Frente `admin.html`, servido en `/joi360app/admin` |
| **THE Bitacora** | Registro `collection_audit_log` de `design.md` §8 |

---

## Decisiones abiertas y recomendación

Cada decisión queda cerrada por el requerimiento que se indica. La recomendación es la que este spec
adopta; si la usuaria decide lo contrario, cambia el requerimiento señalado y nada más.

| # | Decisión | Opciones | Recomendación adoptada | Cierra en |
|---|---|---|---|---|
| D1 | Herencia de reglas cartera → plan | (a) cada plan define todo; (b) cartera define defaults y el plan sobreescribe grupo por grupo | **(b)** Override parcial. Un grupo sin declarar en la regla del plan hereda de la cartera. Reduce el trabajo de alta de planes y evita que dos planes divergan por olvido | REQ-COB-101 |
| D2 | Efecto de un cambio de reglas sobre cargos ya emitidos | (a) recalcular; (b) solo futuros | **(b)** Solo ciclos futuros. Los emitidos conservan su `rules_snapshot_json`. Recalcular cargos ya notificados cambia dinero que el suscriptor ya vio | REQ-COB-103 |
| D3 | Reglas aplicables al cambio de plan a mitad de ciclo | (a) reglas del plan origen hasta fin de ciclo; (b) reglas del plan destino desde la fecha efectiva | **(a) para el cargo en curso, (b) para el cargo de ajuste y los ciclos siguientes** | REQ-COB-105 |
| D4 | Visibilidad del mundo sobre la cartera de su comercio | (a) agregado solamente; (b) detalle nominal completo; (c) agregado por defecto y detalle si el comercio lo autoriza | **(c)** Agregado siempre; detalle nominal solo con autorización explícita del comercio, revocable y registrada | REQ-COB-114 |
| D5 | Quién entrega las credenciales del comercio | (a) solo Red Pontis; (b) el mundo, si Red Pontis le delegó la facultad | **(b)** Delegación explícita por bandera en la activación, con bitácora. Sin delegación, entrega Red Pontis | REQ-COB-113 |
| D6 | Reintento de un lote con rechazos | (a) reabrir y reintentar el mismo lote; (b) crear un lote nuevo con los cargos rechazados | **(b)** Lote cerrado es inmutable. El reintento es un lote nuevo que referencia al anterior | REQ-COB-134 |
| D7 | Disparo de la renovación | (a) solo job programado; (b) solo acción manual; (c) job programado más acción manual, ambos sobre la misma función de dominio | **(c)** La corrida manual existe porque en fase 1 no hay garantía de scheduler y el operador necesita poder emitir hoy | REQ-COB-124 |

---

## Pendientes de definición externa

Estos dos puntos no se resuelven desde el frente. Este spec define el contrato y el comportamiento
degradado; **no nombra proveedor ni inventa integración**.

| Pendiente | Estado real hoy en `joi360mono` | Qué entrega la fase 1 igual |
|---|---|---|
| **Proveedor de correo transaccional** | No existe. Lo único comparable es WhatsApp Cloud API en `turnos`, tratado como opcional y asíncrono | El aviso se programa y se registra; el operador copia el link de pago desde el panel. Requerimientos REQ-COB-128 a 130 |
| **Adquirente / pasarela de pago** | No existe integración. La recarga de wallet es deliberadamente `SIMULADO-...` | El lote se arma, se cierra y se exporta en formato canónico; el pago se registra manualmente o por ingesta del retorno. Requerimientos REQ-COB-136 a 140 |

**Valores que son decisión de negocio y todavía no están tomados.** Ningún requerimiento los inventa:
cada uno declara el comportamiento cuando el valor no está definido.

| Valor pendiente | Comportamiento declarado mientras no se decida | Requerimiento |
|---|---|---|
| Monto máximo por cargo y monto máximo por lote | Campos nulos en la política del mundo; nulo significa sin límite | REQ-COB-111, REQ-COB-135 |
| Retención del archivo de presentación y del archivo de retorno | Se conservan sin borrado desde la interfaz, sin plazo declarado | REQ-COB-137, REQ-COB-138 |
| Retención de la bitácora y del registro de corridas | Se conservan sin borrado desde la interfaz, sin plazo declarado | REQ-COB-117, REQ-COB-147 |
| Caducidad del saldo a favor | Sin caducidad en fase 1 | REQ-COB-145 |
| Monedas habilitadas para cobranzas | Se opera la moneda del titular con su escala, incluidas las de 0 decimales | REQ-COB-144 |
| Si la comisión del mundo se cobra al comercio o solo se informa | Fase 1 solo la informa en el cargo; no genera movimiento de dinero | REQ-COB-111 |
| Cantidad de reintentos automáticos de envío de aviso | Cero: en fase 1 el reintento es siempre una acción del operador | REQ-COB-130 |

---

## Roles y permisos aplicables

Los grupos son los de `frente-y-accesos.md` §5 y no se agregan nuevos.

| Acción de este spec | `collections-admin` | `collections-operator` | `collections-readonly` |
|---|---|---|---|
| Editar reglas de cartera y de plan | Sí | No | No |
| Crear o versionar planes y precios | Sí | No | No |
| Activar o desactivar renovación automática de una suscripción | Sí | Sí | No |
| Ejecutar corrida de renovación | Sí | Sí | No |
| Armar y cerrar un lote | Sí | Sí | No |
| Anular un lote cerrado | Sí | No | No |
| Presentar lote al adquirente y exportar el archivo | Sí | Sí | No |
| Ingerir retorno y conciliar | Sí | Sí | No |
| Registrar pago manual | Sí | Sí | No |
| Aplicar un cambio de plan a una suscripción con deuda | Sí | No | No |
| Confirmar la revisión de reglas tras reactivar la capacidad | Sí | No | No |
| Ver y exportar | Sí | Sí | Sí |

El bloqueo de escritura del nivel `LECTURA` es transversal y ya existe en
`server/auth/require-portal-access.js`. Este frente lo hereda.

---

## Requirements

**Parte 1 — Reglas de cobranza afiliadas al plan**

### Requerimiento 1 — REQ-COB-100: Composición canónica de la regla de cobranza

**Extiende REQ-COB-030.** La regla deja de ser una lista informal de campos y pasa a ser una entidad
con composición fija, porque a partir de acá existe en dos niveles.

**Historia de usuario:** Como titular de la cartera, quiero que "regla de cobranza" signifique
siempre lo mismo y tenga los mismos grupos en los dos niveles, para poder comparar la política de un
plan con la de otro y con la de la cartera sin traducir nada.

#### Criterios de aceptación

1. THE Motor_de_Reglas SHALL entregar la regla de cobranza compuesta por exactamente estos nueve
   grupos: día de corte, anticipación de emisión, días de gracia, tramos de mora, recargo por mora,
   política de suspensión, cadencia de recordatorios, política de renovación con deuda y límite de
   rechazos consecutivos.
2. THE Motor_de_Reglas SHALL aceptar como modo de día de corte únicamente los literales
   `FIXED_MONTH_DAY` y `RELATIVE_TO_SIGNUP`.
3. WHERE el modo de día de corte es `FIXED_MONTH_DAY`, THE Motor_de_Reglas SHALL aceptar como día de
   corte un entero de 1 a 31.
4. IF el día de corte declarado queda fuera del rango de 1 a 31, THEN THE Motor_de_Reglas SHALL
   rechazar el guardado con el código `invalid_cutoff_day` y SHALL informar el rango admitido.
5. WHERE el modo de día de corte es `FIXED_MONTH_DAY` con un valor mayor que la cantidad de días del
   mes del ciclo, THE Motor_de_Reglas SHALL usar el último día de ese mes como fecha de vencimiento.
6. THE Motor_de_Reglas SHALL aceptar la anticipación de emisión como un entero de 0 a 60 días.
7. THE Motor_de_Reglas SHALL aceptar los días de gracia como un entero de 0 a 60 días.
8. IF un entero de la regla queda fuera del rango que este requerimiento declara para su campo,
   THEN THE Motor_de_Reglas SHALL rechazar el guardado con el código `invalid_rule_range` y SHALL
   nombrar el campo fuera de rango en snake_case.
9. THE Motor_de_Reglas SHALL expresar el recargo por mora con cuatro atributos: tipo (`NONE`,
   `FIXED`, `PERCENT`), valor, aplicación (`SAME_CHARGE` o `SEPARATE_CONCEPT`) y tope acumulable.
10. WHERE el tipo de recargo es `PERCENT`, THE Motor_de_Reglas SHALL aceptar como valor una cadena
    decimal entre `0.01` y `100.00`.
11. WHERE el tipo de recargo es `FIXED`, THE Motor_de_Reglas SHALL aceptar como valor una cadena
    decimal mayor que `0.00` en la moneda del titular.
12. THE Motor_de_Reglas SHALL interpretar el tope acumulable igual a `0.00` como ausencia de tope.
13. THE Motor_de_Reglas SHALL expresar la política de suspensión con dos atributos: cantidad de
    cargos vencidos que la dispara, como entero de 1 a 12, y modo de reactivación (`AUTO_ON_PAYMENT`
    o `MANUAL`).
14. THE Motor_de_Reglas SHALL expresar los tramos de mora como una lista ordenada de 1 a 10 rangos de
    días contiguos, donde el primer tramo empieza en el día 1 y el último declara día final abierto.
15. THE Motor_de_Reglas SHALL expresar la cadencia de recordatorios como una lista de hasta 10 avisos
    con tipo (`PRE_DUE`, `ON_DUE`, `POST_DUE_REMINDER`, `GRACE_END`, `PAYMENT_CONFIRMED`),
    desplazamiento entero en días respecto del vencimiento entre -60 y 180, y bandera de activación.
16. THE Motor_de_Reglas SHALL expresar la política de renovación con deuda con uno de los literales
    `ISSUE_ANYWAY`, `HOLD_UNTIL_PAID` o `SUSPEND`.
17. THE Motor_de_Reglas SHALL expresar el límite de rechazos consecutivos como un entero de 0 a 10,
    donde `0` significa sin límite.
18. THE Motor_de_Reglas SHALL entregar los montos de la regla como cadena decimal con la escala de la
    moneda del titular y punto como separador decimal.

**Casos borde**

- Tope acumulable `0.00` con recargo `PERCENT`: la mora crece sin cota y la validación de
  REQ-COB-102 no la rechaza, porque no hay tope que comparar.
- Cadencia con lista vacía: es válida y significa que los cargos de ese plan no generan avisos.
  REQ-COB-107 obliga a advertirlo en pantalla.

---

### Requerimiento 2 — REQ-COB-101: Herencia de la cartera al plan con sobreescritura parcial

**Extiende REQ-COB-030.** Cierra la decisión D1.

**Historia de usuario:** Como titular de la cartera, quiero definir una política por defecto una sola
vez y que cada plan solo declare en qué se diferencia, para no repetir la misma configuración en cada
plan que creo ni arrastrar diferencias que no decidí.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL mantener exactamente una regla de cartera vigente por titular, que
   actúa como valor por defecto de todos sus planes.
2. THE Gestor_de_Cobranzas SHALL permitir que cada plan declare una regla de plan en la que cada uno
   de los nueve grupos de REQ-COB-100 es opcional.
3. WHEN un grupo de la regla de plan está sin declarar, THE Motor_de_Reglas SHALL tomar ese grupo de
   la regla de cartera.
4. WHEN un grupo de la regla de plan está declarado, THE Motor_de_Reglas SHALL usar el valor del plan
   y SHALL descartar el de la cartera para ese grupo.
5. THE Motor_de_Reglas SHALL entregar, junto a cada grupo de la regla efectiva, la procedencia del
   valor con los literales `PLAN` o `PORTFOLIO`.
6. WHEN el operador abre la configuración de un plan, THE Gestor_de_Cobranzas SHALL mostrar los nueve
   grupos de la regla efectiva con su procedencia visible por grupo.
7. WHERE un grupo de la regla de plan está declarado, THE Gestor_de_Cobranzas SHALL ofrecer una
   acción que devuelve ese grupo a herencia de la cartera y SHALL dejar su procedencia en
   `PORTFOLIO`.
8. THE Motor_de_Reglas SHALL resolver la regla efectiva en el servidor.
9. THE Gestor_de_Cobranzas SHALL consumir en el cliente la regla efectiva ya resuelta, sin recomponer
   la herencia en el navegador.
10. IF no existe regla de cartera para el titular, THEN THE Gestor_de_Cobranzas SHALL mostrar el
    estado "vacío por configurar" de REQ-COB-080 con la acción que lleva a definirla.
11. IF no existe regla de cartera para el titular, THEN THE Motor_de_Renovaciones SHALL rechazar la
    emisión de cargos con el código `portfolio_rule_missing`.
12. IF la regla de cartera o la regla de plan no pueden leerse porque la base de datos no responde,
    THEN THE Gestor_de_Cobranzas SHALL responder 500 con el código `internal`, SHALL registrar el
    fallo con el identificador del titular y SHALL mostrar el estado de error con reintento.

**Casos borde**

- Plan creado antes de que existiera la regla de cartera: queda íntegramente en herencia y muestra la
  regla de cartera en cuanto esta se define.
- Regla de plan con los nueve grupos declarados: es válida y su regla efectiva no depende de la
  cartera.

---

### Requerimiento 3 — REQ-COB-102: Validación de combinaciones inválidas en los dos niveles

**Extiende REQ-COB-030.**

**Historia de usuario:** Como titular de la cartera, quiero que el sistema rechace una configuración
contradictoria en el momento de guardarla, para no descubrir el conflicto cuando ya emitió cargos y
avisó al suscriptor.

#### Criterios de aceptación

1. WHEN el usuario guarda una regla de cartera o una regla de plan, THE Motor_de_Reglas SHALL validar
   la **regla efectiva resultante**, no solo los grupos declarados.
2. IF los días de gracia de la regla efectiva son mayores o iguales que los días que disparan la
   suspensión, THEN THE Motor_de_Reglas SHALL rechazar el guardado con el código
   `invalid_rule_combination` y SHALL devolver en el campo `fields` del error los dos nombres de
   columna en conflicto.
3. IF el tope acumulable de mora es mayor que `0.00` y menor que el valor de una sola aplicación del
   recargo, THEN THE Motor_de_Reglas SHALL rechazar el guardado con el código
   `invalid_rule_combination`.
4. IF la cantidad de cargos vencidos que dispara la suspensión es 0, THEN THE Motor_de_Reglas SHALL
   rechazar el guardado con el código `invalid_rule_combination`.
5. IF los tramos de mora dejan un día sin cubrir entre el día 1 y el último tramo, THEN THE
   Motor_de_Reglas SHALL rechazar el guardado con el código `invalid_delinquency_buckets`.
6. IF dos tramos de mora se solapan en al menos un día, THEN THE Motor_de_Reglas SHALL rechazar el
   guardado con el código `invalid_delinquency_buckets`.
7. IF la anticipación de emisión es mayor que la cantidad de días del ciclo más corto de los planes
   que usan la regla, contando 28 días para `MONTHLY`, 90 para `QUARTERLY`, 181 para `SEMIANNUAL` y
   365 para `ANNUAL`, THEN THE Motor_de_Reglas SHALL rechazar el guardado con el código
   `invalid_rule_combination`.
8. IF dos avisos de la cadencia tienen el mismo tipo y el mismo desplazamiento en días, THEN THE
   Motor_de_Reglas SHALL rechazar el guardado con el código `invalid_reminder_cadence`.
9. WHEN el guardado se rechaza, THE Gestor_de_Cobranzas SHALL conservar en pantalla los valores que
   el usuario escribió.
10. IF la escritura de la regla falla después de validar, THEN THE Motor_de_Reglas SHALL revertir la
    transacción completa y SHALL dejar vigente la regla anterior sin modificación.

---

### Requerimiento 4 — REQ-COB-103: Los cargos emitidos conservan la regla con la que nacieron

**Extiende REQ-COB-030 y REQ-COB-031.** Cierra la decisión D2.

**Historia de usuario:** Como titular de la cartera, quiero que cambiar una regla no altere dinero ya
notificado, para poder sostener ante el suscriptor exactamente lo que le informé.

#### Criterios de aceptación

1. WHEN el Motor_de_Renovaciones emite un cargo, THE Motor_de_Reglas SHALL guardar los nueve grupos
   de la regla efectiva dentro del cargo en `rules_snapshot_json`.
2. WHEN se calcula mora, gracia, suspensión o cadencia de avisos de un cargo, THE Motor_de_Reglas
   SHALL usar el `rules_snapshot_json` de ese cargo.
3. WHEN una regla de cartera o de plan cambia, THE Gestor_de_Cobranzas SHALL aplicar el cambio solo a
   los cargos emitidos después del cambio.
4. WHEN una regla cambia, THE Gestor_de_Cobranzas SHALL dejar el monto, la fecha de vencimiento y el
   recargo por mora de los cargos ya emitidos sin modificación.
5. WHEN el usuario solicita guardar un cambio de regla, THE Gestor_de_Cobranzas SHALL mostrar cuántas
   suscripciones vigentes y cuántos cargos futuros programados quedan afectados.
6. WHEN el usuario solicita guardar un cambio de regla, THE Gestor_de_Cobranzas SHALL requerir una
   confirmación explícita antes de escribir.
7. WHEN el usuario cancela la confirmación, THE Gestor_de_Cobranzas SHALL dejar la regla anterior
   vigente y SHALL no escribir nada.
8. WHEN un cambio de regla se confirma, THE Bitacora SHALL registrar el campo, el valor anterior, el
   valor nuevo, el nivel (cartera o plan), el correo del actor y la fecha.
9. IF un usuario intenta cambiar el monto o la fecha de vencimiento de un cargo ya emitido desde la
   pantalla de reglas, THEN THE Gestor_de_Cobranzas SHALL rechazar la operación con el código
   `charge_not_editable_from_rules` y SHALL indicar que corresponde una acción sobre el cargo de
   REQ-COB-073.
10. WHEN un usuario ejecuta una acción sobre un cargo de REQ-COB-073, THE Gestor_de_Cobranzas SHALL
    exigir un motivo de texto no vacío y THE Bitacora SHALL registrarlo.

---

### Requerimiento 5 — REQ-COB-104: Vigencia de la regla de plan

**Extiende REQ-COB-030.**

**Historia de usuario:** Como titular de la cartera, quiero programar que una regla nueva empiece a
regir desde una fecha, para anunciar el cambio al suscriptor antes de que le llegue el cargo nuevo.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL aceptar al guardar una regla de plan o de cartera una fecha de
   inicio de vigencia en formato `AAAA-MM-DD` interpretada en la zona horaria de la plataforma.
2. WHEN el usuario guarda una regla sin fecha de inicio de vigencia, THE Motor_de_Reglas SHALL usar
   la fecha actual de la zona horaria de la plataforma.
3. WHERE la fecha de inicio de vigencia es futura, THE Motor_de_Reglas SHALL seguir usando la regla
   anterior para los cargos que se emitan antes de esa fecha.
4. WHEN la fecha de inicio de vigencia llega, THE Motor_de_Reglas SHALL usar la regla nueva para todo
   cargo emitido desde las 00:00 de esa fecha en la zona horaria de la plataforma, inclusive.
5. WHEN existe una regla con vigencia futura, THE Gestor_de_Cobranzas SHALL mostrar en la pantalla de
   reglas cuál rige hoy y cuál empieza a regir, cada una con su fecha.
6. IF la fecha de inicio de vigencia es anterior a la fecha actual, THEN THE Motor_de_Reglas SHALL
   rechazar el guardado con el código `rule_effective_date_in_past`.
7. WHEN el usuario guarda una regla con la misma fecha de inicio de vigencia que una regla programada
   y todavía no vigente, THE Motor_de_Reglas SHALL reemplazar la programada y THE Bitacora SHALL
   registrar el reemplazo.
8. THE Motor_de_Reglas SHALL conservar el historial de reglas con la fecha de inicio y la fecha de
   fin de vigencia de cada una.
9. THE Gestor_de_Cobranzas SHALL permitir consultar ese historial desde la pantalla de reglas.

---

### Requerimiento 6 — REQ-COB-105: Reglas aplicables cuando el suscriptor cambia de plan a mitad de ciclo

**Extiende REQ-COB-060 y REQ-COB-061.** Cierra la decisión D3.

**Historia de usuario:** Como operador, quiero saber con certeza qué reglas rigen cuando alguien
cambia de plan en medio de su ciclo, para poder explicarle qué se le cobra, con qué gracia y desde
cuándo.

#### Criterios de aceptación

1. WHEN una suscripción cambia de plan con fecha efectiva dentro de un ciclo con cargo ya emitido,
   THE Motor_de_Reglas SHALL mantener el `rules_snapshot_json` de ese cargo sin modificación.
2. WHEN el Motor_de_Prorrateo produce un neto mayor que `0.00`, THE Motor_de_Reglas SHALL emitir el
   cargo de ajuste con la regla efectiva del **plan destino** vigente a la fecha efectiva del cambio.
3. WHEN el Motor_de_Prorrateo produce un neto menor que `0.00`, THE Registro_de_Pagos SHALL acreditar
   el saldo a favor según REQ-COB-062.
4. WHEN el Motor_de_Prorrateo produce un neto menor que `0.00`, THE Motor_de_Reglas SHALL no generar
   cargo de ajuste.
5. WHEN el Motor_de_Prorrateo produce un neto igual a `0.00`, THE Gestor_de_Cobranzas SHALL aplicar
   el cambio de plan sin emitir cargo de ajuste y sin acreditar saldo a favor.
6. WHEN el cambio de plan se aplica, THE Motor_de_Renovaciones SHALL emitir los ciclos siguientes con
   la regla efectiva del plan destino.
7. WHERE el día de corte del plan destino difiere del plan origen, THE Motor_de_Renovaciones SHALL
   calcular el primer ciclo posterior al cambio con el día de corte del plan destino.
8. WHEN el usuario abre la previsualización del cambio de plan, THE Gestor_de_Cobranzas SHALL mostrar
   la fecha de vencimiento del primer ciclo posterior al cambio antes de confirmarlo.
9. WHEN el cambio de plan se aplica, THE Bitacora SHALL registrar la regla efectiva del plan origen,
   la del plan destino y el desglose del prorrateo que se le mostró al operador.
10. WHERE la suscripción tiene un cargo en estado `OVERDUE` o `IN_ARREARS`, THE Gestor_de_Cobranzas
    SHALL mostrar antes de confirmar la cantidad de cargos vencidos y el monto pendiente.
11. IF la sesión no tiene nivel `ADMIN` y la suscripción tiene un cargo en estado `OVERDUE` o
    `IN_ARREARS`, THEN THE Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden` y SHALL
    no aplicar el cambio de plan.

**Casos borde**

- Dos cambios de plan en el mismo ciclo: el segundo prorratea contra el plan que dejó el primero, y
  su cargo de ajuste toma la regla del segundo plan destino.
- Cambio con fecha efectiva igual al inicio del ciclo: no hay prorrateo, el cargo del ciclo se
  reemplaza y nace con la regla del plan destino.
- Cambio entre dos planes del mismo precio: el neto es `0.00` y el criterio 5 aplica.

---

### Requerimiento 7 — REQ-COB-106: Permisos sobre las reglas

**Extiende REQ-COB-004 y REQ-COB-090.**

**Historia de usuario:** Como titular de la cartera, quiero que solo el administrador cambie reglas y
precios, para que el operador del día a día no altere la política comercial sin que yo lo sepa.

#### Criterios de aceptación

1. WHILE la sesión tiene nivel `LECTURA`, THE Gestor_de_Cobranzas SHALL mostrar las reglas en modo
   consulta y SHALL deshabilitar toda acción de escritura con el motivo visible.
2. WHILE la sesión tiene nivel `OPERADOR`, THE Gestor_de_Cobranzas SHALL deshabilitar la edición de
   reglas de cartera, reglas de plan, precios y versiones de plan, con el motivo visible.
3. IF una sesión de nivel `OPERADOR` o `LECTURA` envía una escritura de regla, THEN THE
   Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden` y SHALL no aplicar cambio
   alguno.
4. THE Gestor_de_Cobranzas SHALL entregar por cada pantalla de reglas la lista de acciones permitidas
   para la sesión.
5. THE Gestor_de_Cobranzas SHALL habilitar en pantalla únicamente las acciones presentes en esa
   lista.
6. IF la sesión no presenta un token válido, THEN THE Gestor_de_Cobranzas SHALL responder 401 con el
   código `unauthorized` y SHALL redirigir al login del shell.
7. IF el proveedor de identidad no responde al verificar el token, THEN THE Gestor_de_Cobranzas SHALL
   responder 500 con el código `internal`, SHALL registrar el fallo como
   `identity_provider_unavailable` y SHALL mostrar el estado de error con reintento.

---

### Requerimiento 8 — REQ-COB-107: Cadencia de recordatorios por plan

**Extiende REQ-COB-040.**

**Historia de usuario:** Como titular de la cartera, quiero que el plan Premium avise distinto que el
plan Básico, para tratar cada segmento como corresponde sin duplicar la configuración de la cartera.

#### Criterios de aceptación

1. THE Servicio_de_Avisos SHALL programar los avisos de un cargo con la cadencia contenida en el
   `rules_snapshot_json` de ese cargo.
2. WHERE un plan declara su propia cadencia, THE Servicio_de_Avisos SHALL usar la del plan para los
   cargos de ese plan.
3. WHEN el usuario abre la pantalla de reglas de un plan, THE Gestor_de_Cobranzas SHALL mostrar
   cuántos avisos se enviarán en los próximos 30 días con la cadencia efectiva de ese plan.
4. WHERE la cadencia efectiva de un plan no tiene ningún aviso activo, THE Gestor_de_Cobranzas SHALL
   advertir en la pantalla de reglas que los cargos de ese plan no generarán avisos.
5. WHEN llega el momento de enviar un aviso, IF el cargo asociado está en estado `PAID`, THEN THE
   Servicio_de_Avisos SHALL registrar el aviso con estado `SKIPPED_ALREADY_PAID` y SHALL no
   enviarlo.
6. IF dos avisos del mismo cargo coinciden en la misma fecha, THEN THE Servicio_de_Avisos SHALL
   enviar únicamente el de mayor urgencia según el orden `GRACE_END`, `POST_DUE_REMINDER`, `ON_DUE`,
   `PRE_DUE` y SHALL registrar el otro con estado `SKIPPED_DUPLICATE_DAY`.

---

### Requerimiento 9 — REQ-COB-108: Tramos de mora definidos una sola vez

**Extiende REQ-COB-031 y REQ-COB-071.**

**Historia de usuario:** Como titular de la cartera, quiero que los tramos de mora que veo en el
resumen, en la lista de deudores y en la exportación sean los mismos, para no tener tres verdades
sobre la misma deuda.

#### Criterios de aceptación

1. THE Motor_de_Reglas SHALL entregar los tramos de mora como una única lista con nombre, día inicial
   y día final por tramo.
2. THE Gestor_de_Cobranzas SHALL calcular el tramo de mora de un cargo en el servidor.
3. THE Gestor_de_Cobranzas SHALL entregar el tramo calculado en el campo `delinquencyBucket` de la
   respuesta del cargo.
4. WHERE un plan declara tramos propios, THE Gestor_de_Cobranzas SHALL agrupar los cargos de ese plan
   por esos tramos y SHALL identificar en la pantalla de morosidad a qué plan corresponde cada
   agrupación.
5. WHERE la vista de morosidad muestra planes con tramos distintos, THE Gestor_de_Cobranzas SHALL
   ofrecer además la agrupación por los tramos de la regla de cartera.
6. THE Motor_de_Reglas SHALL calcular el recargo por mora con la aritmética decimal de precisión fija
   de `server/money.js` y SHALL redondear a la escala de la moneda del titular con modo medio hacia
   arriba una sola vez, sobre el resultado final.
7. WHEN un cargo recibe un pago parcial, THE Motor_de_Reglas SHALL recalcular el recargo por mora
   sobre el saldo pendiente.
8. WHERE el saldo pendiente de un cargo es `0.00`, THE Motor_de_Reglas SHALL fijar su recargo por
   mora en `0.00`.
9. WHILE el recargo acumulado de un cargo alcanza el tope configurado, THE Motor_de_Reglas SHALL
   mantener ese recargo sin incrementarlo.

---

**Parte 2 — El mundo configura y habilita el panel de su comercio**

Base de arquitectura ya decidida y no revisable acá: `merchant_module` genérico más `scope` declarado
en el catálogo de capacidades (`frente-y-accesos.md` §3 y §4). Lo que sigue define el flujo y las
fronteras de decisión entre mundo y comercio.

### Requerimiento 10 — REQ-COB-110: El mundo habilita cobranzas a un comercio desde su portal

**Extiende REQ-COB-002.** REQ-COB-002 define que la activación por mundo y por comercio son
independientes, y que la hace Red Pontis desde Admin RP. Este requerimiento agrega el camino por el
cual el propio mundo la habilita a sus comercios.

**Historia de usuario:** Como titular de un mundo con cobranzas contratado, quiero habilitar el panel
de cobranzas a uno de mis comercios desde mi portal, para cerrar la habilitación el mismo día y no
esperar un pedido a Red Pontis por cada comercio.

#### Criterios de aceptación

1. WHERE el mundo tiene la capacidad `cobranzas` activa y tiene la facultad de habilitación delegada,
   THE Portal_del_Mundo SHALL mostrar en la ficha de cada comercio del mundo el estado de la capacidad
   `cobranzas` de ese comercio.
2. WHEN el titular del mundo habilita cobranzas a un comercio, THE Gestor_de_Cobranzas SHALL escribir
   en `merchant_module` la fila de ese comercio con `enabled` en verdadero y SHALL dejar sin cambios
   las filas de los demás comercios del mundo.
3. WHEN el titular del mundo habilita cobranzas a un comercio que ya la tiene activa, THE
   Gestor_de_Cobranzas SHALL responder el estado vigente sin crear una fila adicional en
   `merchant_module`.
4. IF el mundo no tiene la facultad de habilitación delegada, THEN THE Portal_del_Mundo SHALL mostrar
   el estado de la capacidad en modo consulta y SHALL indicar que la habilitación la realiza Red
   Pontis.
5. IF el mundo intenta habilitar cobranzas a un comercio que no pertenece a ese mundo, THEN THE
   Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden`.
6. IF el comercio indicado no existe, THEN THE Gestor_de_Cobranzas SHALL responder 404 con el código
   `merchant_not_found`.
7. WHILE la sesión del portal del mundo tiene nivel `LECTURA`, THE Portal_del_Mundo SHALL deshabilitar
   la acción de habilitación con el motivo visible.
8. WHEN una habilitación se aplica, THE Bitacora SHALL registrar el comercio, el mundo, el correo del
   actor, la fecha y la política del mundo vigente en ese momento.
9. IF la escritura de la habilitación falla en cualquier paso, THEN THE Gestor_de_Cobranzas SHALL
   revertir la transacción completa y SHALL dejar la capacidad del comercio en su estado anterior.
10. THE Consola_Admin_RP SHALL mostrar las habilitaciones realizadas por el mundo con el mismo detalle
    que las realizadas por Red Pontis.

---

### Requerimiento 11 — REQ-COB-111: Política del mundo sobre la cobranza de sus comercios

**Nuevo.** No tiene equivalente en el paquete previo.

**Historia de usuario:** Como titular de un mundo, quiero fijar los límites dentro de los cuales mis
comercios cobran, para que mi comunidad reciba el mismo trato en todos los comercios y yo no tenga que
auditar la configuración de cada uno.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL mantener una política de cobranza por mundo con exactamente estos
   campos: métodos de pago habilitados como subconjunto de `CARD`, `QR`, `CASH` y `TRANSFER`; monto
   máximo por cargo; monto máximo por lote; recargo por mora máximo permitido; días de gracia máximos
   permitidos como entero de 0 a 60; cantidad máxima de recordatorios manuales por suscriptor por día
   como entero de 0 a 20; comisión del mundo sobre el cobro como cadena decimal entre `0.00` y
   `100.00`; lista de tipos de aviso obligatorios; y bandera de visibilidad de detalle de cartera.
2. THE Gestor_de_Cobranzas SHALL interpretar un monto máximo nulo como ausencia de límite.
3. WHERE el mundo definió métodos de pago habilitados, THE Gestor_de_Cobranzas SHALL ofrecer al
   comercio únicamente ese subconjunto de métodos.
4. WHERE el mundo definió un tope de recargo por mora, THE Motor_de_Reglas SHALL rechazar una regla de
   cartera del comercio cuyo recargo exceda ese tope, con el código `policy_limit_exceeded`, y SHALL
   devolver el tope del mundo en el cuerpo del error.
5. WHERE el mundo definió días de gracia máximos, THE Motor_de_Reglas SHALL rechazar una regla de
   cartera del comercio cuyos días de gracia excedan ese máximo, con el código
   `policy_limit_exceeded`.
6. WHERE el mundo marcó un tipo de aviso como obligatorio, THE Gestor_de_Cobranzas SHALL impedir que
   el comercio lo desactive y SHALL mostrar el motivo.
7. WHERE el mundo marcó un tipo de aviso como obligatorio, THE Gestor_de_Cobranzas SHALL permitir al
   comercio editar únicamente los campos de la plantilla que la política declara editables.
8. WHERE el mundo definió comisión sobre el cobro, THE Gestor_de_Cobranzas SHALL mostrar al comercio
   la comisión aplicable y SHALL registrarla en cada cargo emitido como monto informado, sin generar
   movimiento de dinero en este alcance.
9. THE Gestor_de_Cobranzas SHALL dejar a discreción del comercio los planes y sus precios, la cartera
   de suscriptores, el día de corte, la cadencia de recordatorios dentro de los máximos del mundo y el
   texto de las plantillas no obligatorias.
10. WHEN el mundo cambia su política, THE Gestor_de_Cobranzas SHALL aplicar el cambio a las reglas y
    los cargos que se creen después del cambio.
11. WHEN el mundo cambia su política, THE Gestor_de_Cobranzas SHALL dejar sin modificación los cargos
    ya emitidos.
12. WHEN el mundo cambia su política, THE Gestor_de_Cobranzas SHALL mostrar cuántos comercios y
    cuántas reglas de cartera de comercio quedan fuera del límite nuevo, y SHALL requerir confirmación
    explícita.
13. WHILE una regla de cartera de un comercio queda fuera del límite vigente de la política, THE
    Gestor_de_Cobranzas SHALL mostrar al comercio el campo en conflicto y el límite del mundo.
14. WHILE una regla de cartera de un comercio queda fuera del límite vigente de la política, THE
    Motor_de_Renovaciones SHALL omitir la emisión de los cargos de ese comercio con el motivo
    `POLICY_VIOLATION`.
15. IF no existe política del mundo, THEN THE Gestor_de_Cobranzas SHALL operar con estos valores por
    defecto: los cuatro métodos de pago habilitados, montos máximos nulos, recargo por mora sin tope,
    60 días de gracia máximos, 3 recordatorios manuales por suscriptor por día, comisión `0.00`, sin
    tipos de aviso obligatorios y visibilidad de detalle desactivada.
16. WHERE no existe política del mundo, THE Gestor_de_Cobranzas SHALL indicar en la pantalla de
    política que están rigiendo los valores por defecto de la plataforma.

---

### Requerimiento 12 — REQ-COB-112: La política se hace cumplir en el servidor

**Extiende REQ-COB-090.**

**Historia de usuario:** Como responsable de la plataforma, quiero que el límite del mundo se valide
en el servidor, para que manipular el cliente no alcance para saltarlo.

#### Criterios de aceptación

1. WHEN el Gestor_de_Cobranzas recibe una escritura de regla, de plan, de aviso o de cobro de un
   comercio, THE Gestor_de_Cobranzas SHALL validar la operación contra la política del mundo de ese
   comercio antes de escribir.
2. IF una operación excede un límite de la política, THEN THE Gestor_de_Cobranzas SHALL responder 400
   con el código `policy_limit_exceeded` y SHALL no escribir nada.
3. THE Gestor_de_Cobranzas SHALL resolver el mundo del comercio a partir de los accesos de la sesión.
4. WHEN la solicitud incluye un identificador de mundo, THE Gestor_de_Cobranzas SHALL ignorarlo y
   SHALL usar el mundo resuelto desde la sesión.
5. IF el comercio de la sesión no tiene mundo asociado, THEN THE Gestor_de_Cobranzas SHALL responder
   404 con el código `merchant_not_found`.
6. IF la política del mundo no puede leerse porque la base de datos no responde, THEN THE
   Gestor_de_Cobranzas SHALL responder 500 con el código `internal` y SHALL no escribir nada.
7. WHEN el Gestor_de_Cobranzas rechaza una operación por política, THE Bitacora SHALL registrar el
   intento con el campo en conflicto, el límite y el correo del actor.

---

### Requerimiento 13 — REQ-COB-113: Entrega de credenciales del comercio, con delegación explícita

**Extiende REQ-COB-005.** Cierra la decisión D5.

**Historia de usuario:** Como titular de un mundo con la facultad delegada, quiero entregar al
comercio su usuario de cobranzas, para que empiece a operar el mismo día sin intermediarios.

#### Criterios de aceptación

1. THE Consola_Admin_RP SHALL permitir marcar, al activar cobranzas en un mundo, si ese mundo puede
   entregar credenciales de cobranzas a sus comercios.
2. WHERE la facultad está delegada y el comercio tiene la capacidad activa, THE Portal_del_Mundo SHALL
   ofrecer la entrega de credenciales pidiendo el correo del responsable del comercio y el rol entre
   `collections-admin`, `collections-operator` y `collections-readonly`.
3. IF el correo indicado no tiene formato de dirección de correo válida, THEN THE Gestor_de_Cobranzas
   SHALL rechazar la entrega con el código `invalid_email`.
4. WHEN la entrega se ejecuta, THE Gestor_de_Cobranzas SHALL crear el usuario en Cognito con ese
   correo, o localizarlo si ya existe.
5. WHEN la entrega se ejecuta, THE Gestor_de_Cobranzas SHALL agregar ese usuario al grupo del rol
   elegido.
6. WHEN la entrega se ejecuta, THE Gestor_de_Cobranzas SHALL emitir la credencial en
   `portal_credential` con `scope_type` igual a `COLLECTIONS_MERCHANT`.
7. IF la entrega falla después de crear el usuario y antes de emitir la credencial, THEN THE
   Gestor_de_Cobranzas SHALL revertir la transacción de credencial y SHALL dejar la entrega como no
   completada.
8. IF el comercio no tiene la capacidad activa, THEN THE Gestor_de_Cobranzas SHALL rechazar la entrega
   con el código `merchant_capability_not_enabled`.
9. WHERE la facultad no está delegada, THE Portal_del_Mundo SHALL mostrar la entrega como no
   disponible y SHALL indicar que la realiza Red Pontis.
10. WHEN una credencial se reemite, THE Gestor_de_Cobranzas SHALL invalidar la credencial anterior del
    mismo correo y del mismo alcance.
11. WHERE el correo ya tiene credencial de cobranzas en otro titular, THE Gestor_de_Cobranzas SHALL
    emitir la credencial de este alcance y SHALL dejar las de los otros titulares sin modificación.
12. IF el mundo intenta emitir para un usuario del comercio una credencial con `scope_type` igual a
    `COLLECTIONS_WORLD`, THEN THE Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden`.
13. WHEN una entrega se ejecuta, THE Bitacora SHALL registrar correo, rol, alcance, correo del actor y
    fecha, con `entity` igual a `delivery`.
14. IF el proveedor de identidad no responde dentro de 10 segundos, THEN THE Gestor_de_Cobranzas SHALL
    no emitir la credencial, SHALL informar que la entrega no se completó con el motivo
    `identity_provider_unavailable` y SHALL permitir reintentar.
15. WHEN una entrega se reintenta con el mismo correo después de un fallo del proveedor de identidad,
    THE Gestor_de_Cobranzas SHALL localizar el usuario existente y SHALL no crear un usuario
    duplicado.

---

### Requerimiento 14 — REQ-COB-114: Qué ve el mundo de la cartera de su comercio

**Extiende REQ-COB-007.** Cierra la decisión D4. Es una decisión de privacidad, no de interfaz.

**Historia de usuario:** Como comercio dentro de un mundo, quiero que mi mundo vea el desempeño de mi
cobranza sin acceder a los datos personales de mis suscriptores, salvo que yo lo autorice y pueda
revocarlo cuando quiera.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL entregar al titular de un mundo, por cada comercio suyo con cobranzas
   activa y para el rango de fechas seleccionado, el agregado compuesto por: cantidad de suscriptores
   activos, monto facturado, monto cobrado, monto vencido, tasa de morosidad y distribución por tramo
   de mora.
2. WHEN el titular del mundo abre el agregado sin elegir rango, THE Gestor_de_Cobranzas SHALL usar el
   mes calendario en curso en la zona horaria de la plataforma.
3. THE Gestor_de_Cobranzas SHALL calcular la tasa de morosidad como el monto vencido dividido por el
   monto facturado del rango, expresada como cadena decimal con dos decimales.
4. WHILE la bandera de visibilidad de detalle está desactivada, THE Gestor_de_Cobranzas SHALL omitir
   de toda respuesta al mundo el nombre, el documento, el correo y el teléfono de los suscriptores del
   comercio.
5. IF el titular del mundo solicita el detalle nominal de la cartera de un comercio con la bandera
   desactivada, THEN THE Gestor_de_Cobranzas SHALL responder 403 con el código
   `merchant_detail_not_authorized`.
6. WHERE el comercio activó la autorización de detalle, THE Gestor_de_Cobranzas SHALL entregar al
   mundo el detalle nominal en modo consulta.
7. WHERE el comercio activó la autorización de detalle, THE Bitacora SHALL registrar cada consulta del
   mundo al detalle nominal con el correo del actor, el comercio y la fecha.
8. THE Gestor_de_Cobranzas SHALL permitir al comercio revocar la autorización de detalle en cualquier
   momento.
9. WHEN la autorización de detalle se revoca, THE Gestor_de_Cobranzas SHALL responder 403 con el
   código `merchant_detail_not_authorized` a toda solicitud de detalle posterior a la revocación.
10. THE Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden` a toda escritura del titular
    del mundo sobre la cartera, los planes, los cargos y los pagos de un comercio.
11. THE Gestor_de_Cobranzas SHALL entregar el total de la cartera del mundo y el total de la cartera de
    cada comercio como cifras separadas, cada una identificada con su titular.
12. WHEN el comercio activa o revoca la autorización de detalle, THE Bitacora SHALL registrar el
    cambio con el correo del actor y la fecha.

---

### Requerimiento 15 — REQ-COB-115: Desactivación y revocación por el mundo

**Extiende REQ-COB-002.**

**Historia de usuario:** Como titular de un mundo, quiero poder quitarle el panel a un comercio sin
perder su historial, para cortar el servicio y seguir pudiendo auditar lo que ya pasó.

#### Criterios de aceptación

1. WHERE el comercio tiene cargos pendientes al momento de la desactivación, THE Gestor_de_Cobranzas
   SHALL informar la cantidad y el monto pendiente y SHALL requerir confirmación explícita.
2. WHEN el titular del mundo desactiva cobranzas en un comercio, THE Gestor_de_Cobranzas SHALL
   bloquear el acceso al panel de ese comercio.
3. WHEN el titular del mundo desactiva cobranzas en un comercio, THE Gestor_de_Cobranzas SHALL
   conservar planes, cartera, cargos, pagos, lotes y bitácora de ese comercio.
4. WHEN un usuario del comercio con capacidad desactivada entra al panel, THE Gestor_de_Cobranzas
   SHALL mostrar el estado "capacidad no contratada" de REQ-COB-080.
5. WHEN la capacidad se desactiva, THE Motor_de_Renovaciones SHALL detener la emisión de cargos nuevos
   de ese comercio.
6. WHEN la capacidad se desactiva, THE Servicio_de_Avisos SHALL detener el envío de los avisos
   programados de ese comercio.
7. WHEN la capacidad se desactiva, THE Gestor_de_Cobranzas SHALL conservar el usuario de Cognito del
   comercio y SHALL invalidar su credencial de acceso al panel.
8. IF la desactivación falla en cualquier paso, THEN THE Gestor_de_Cobranzas SHALL revertir la
   transacción completa y SHALL dejar la capacidad y las credenciales en su estado anterior.
9. WHEN la capacidad se reactiva, THE Gestor_de_Cobranzas SHALL restituir el acceso con los datos
   previos sin modificación.
10. WHILE la revisión de reglas posterior a una reactivación está sin confirmar, THE
    Motor_de_Renovaciones SHALL mantener detenida la emisión de ese comercio con el motivo
    `RULES_REVIEW_PENDING`.
11. WHILE la revisión de reglas posterior a una reactivación está sin confirmar, THE
    Gestor_de_Cobranzas SHALL mostrar ese pendiente en el panel del comercio con la acción que lleva a
    las reglas.
12. WHEN un usuario con nivel `ADMIN` confirma la revisión de reglas, THE Motor_de_Renovaciones SHALL
    reanudar la emisión de ese comercio.

---

### Requerimiento 16 — REQ-COB-116: Alcance de la capacidad respetado en la habilitación

**Extiende REQ-COB-001.**

**Historia de usuario:** Como responsable de la plataforma, quiero que ninguna capacidad se active en
un nivel que su catálogo no declara, para que el mecanismo genérico no abra puertas que nadie
contrató.

#### Criterios de aceptación

1. WHEN el Gestor_de_Cobranzas recibe una habilitación por comercio, THE Gestor_de_Cobranzas SHALL
   verificar que el catálogo declara `MERCHANT` dentro del `scope` de esa capacidad.
2. IF el `scope` de la capacidad no incluye `MERCHANT`, THEN THE Gestor_de_Cobranzas SHALL responder
   400 con el código `capability_scope_not_allowed`.
3. WHERE el catálogo no declara `scope` para una capacidad, THE Gestor_de_Cobranzas SHALL tratarla
   como `['WORLD']` y SHALL rechazar su habilitación por comercio.
4. THE Gestor_de_Cobranzas SHALL tratar la activación por mundo y la activación por comercio como
   independientes, y SHALL no derivar una de la otra.
5. THE Consola_Admin_RP SHALL mostrar en el catálogo el alcance declarado de cada capacidad.

---

### Requerimiento 17 — REQ-COB-117: Trazabilidad de las decisiones del mundo

**Extiende REQ-COB-075.**

**Historia de usuario:** Como responsable de la plataforma, quiero reconstruir qué decidió el mundo y
cuándo, para resolver una discusión entre mundo y comercio con datos y no con versiones.

#### Criterios de aceptación

1. THE Bitacora SHALL registrar la habilitación y la desactivación de cobranzas por comercio, los
   cambios de política del mundo, las entregas y reemisiones de credenciales, los cambios de la
   autorización de detalle y las consultas al detalle nominal.
2. THE Bitacora SHALL registrar por cada evento: entidad, identificador, campo, valor anterior, valor
   nuevo, acción, motivo cuando exista, correo del actor, mundo, comercio y fecha.
3. THE Gestor_de_Cobranzas SHALL escribir el registro de bitácora dentro de la misma transacción que
   el cambio que registra.
4. IF la escritura del registro de bitácora falla, THEN THE Gestor_de_Cobranzas SHALL revertir la
   transacción del cambio y SHALL responder 500 con el código `internal`.
5. THE Gestor_de_Cobranzas SHALL exponer la bitácora en modo consulta, sin acción de edición ni de
   borrado en ninguna interfaz.

**Nota de decisión pendiente:** el plazo de retención de la bitácora es decisión de negocio y no está
tomado. Mientras no se defina, los registros se conservan sin borrado.

---

**Parte 3 — Renovaciones, cobro en lote, adquirente y registro del pago**

## 3.1 Periodicidad y ciclo

### Requerimiento 18 — REQ-COB-120: Modelo canónico de periodicidad y ciclo

**Extiende REQ-COB-010.** Resuelve la deuda técnica `billing_cycle` vs `periodicity` a favor de
`periodicity`.

**Historia de usuario:** Como titular de la cartera, quiero que cada suscripción tenga su
periodicidad, su ciclo actual y su próxima renovación explícitos, para saber a quién le toca cobrar,
cuándo, y sin recalcularlo a mano.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL usar el nombre de columna `periodicity` en la base de datos y el
   nombre de campo `periodicity` en las respuestas de API.
2. THE Gestor_de_Cobranzas SHALL aceptar como periodicidad únicamente los valores `MONTHLY`,
   `QUARTERLY`, `SEMIANNUAL` y `ANNUAL`.
3. IF una solicitud declara una periodicidad fuera de esos cuatro valores, THEN THE
   Gestor_de_Cobranzas SHALL responder 400 con el código `invalid_periodicity`.
4. THE Gestor_de_Cobranzas SHALL mantener por cada suscripción: fecha de inicio, periodicidad, inicio
   y fin del ciclo actual, fecha de próxima renovación, fin de vigencia cuando exista, bandera de
   renovación automática y estado.
5. THE Motor_de_Renovaciones SHALL abrir el ciclo siguiente de una suscripción el día posterior al
   fin del ciclo actual.
6. WHERE el fin de vigencia de una suscripción cae en la misma fecha en que se abre su ciclo
   siguiente, THE Motor_de_Renovaciones SHALL emitir un ciclo de un día con `cycle_start` igual a
   `cycle_end`.
7. IF una suscripción presenta ciclos solapados o un hueco entre ciclos, THEN THE
   Motor_de_Renovaciones SHALL rechazar la apertura del ciclo con el código `cycle_integrity_error` y
   SHALL registrar el caso con el identificador de la suscripción.
8. THE Gestor_de_Cobranzas SHALL entregar los montos de la suscripción y de sus cargos como cadena
   decimal con la escala de la moneda del titular.
9. THE Gestor_de_Cobranzas SHALL realizar toda operación aritmética sobre montos con la aritmética
   decimal de precisión fija de `server/money.js`.
10. THE Gestor_de_Cobranzas SHALL expresar los estados de suscripción con los literales `ACTIVE`,
    `SUSPENDED`, `CANCELLED` y `EXPIRED`.

**Nota de nomenclatura:** `billing_cycle` queda prohibido en código nuevo de este alcance, en base de
datos, dominio y respuestas.

---

### Requerimiento 19 — REQ-COB-121: Cálculo de la fecha de próxima renovación

**Nuevo.** Complementa REQ-COB-010 en el tratamiento de bordes de calendario.

**Historia de usuario:** Como operador, quiero que la fecha de la próxima renovación sea predecible en
meses cortos, en febrero y en el cambio de año, para no corregir vencimientos a mano cada mes.

#### Criterios de aceptación

1. WHEN el Motor_de_Renovaciones abre un ciclo, THE Motor_de_Renovaciones SHALL calcular la fecha de
   próxima renovación sumando a la fecha de inicio del ciclo 1 mes para `MONTHLY`, 3 meses para
   `QUARTERLY`, 6 meses para `SEMIANNUAL` y 12 meses para `ANNUAL`.
2. WHEN el mes resultante de esa suma pertenece al año siguiente, THE Motor_de_Renovaciones SHALL
   avanzar el año y SHALL conservar el día de anclaje.
3. IF el día de anclaje no existe en el mes resultante, THEN THE Motor_de_Renovaciones SHALL usar el
   último día de ese mes como fecha de renovación.
4. WHEN el Motor_de_Renovaciones usa el último día de un mes corto, THE Motor_de_Renovaciones SHALL
   conservar el día de anclaje original para los ciclos posteriores.
5. WHERE el modo de día de corte es `RELATIVE_TO_SIGNUP`, THE Motor_de_Renovaciones SHALL usar como
   día de anclaje el día del mes de la fecha de alta de la suscripción.
6. WHERE el modo de día de corte es `FIXED_MONTH_DAY`, THE Motor_de_Renovaciones SHALL usar como día
   de anclaje el día configurado en la regla efectiva.
7. THE Motor_de_Renovaciones SHALL calcular las fechas de ciclo como fechas de calendario sin
   componente horario, en la zona horaria de la plataforma.
8. WHERE la suscripción tiene fin de vigencia anterior a la fecha de próxima renovación calculada, THE
   Motor_de_Renovaciones SHALL fijar el fin del ciclo actual en el fin de vigencia y SHALL no
   programar renovación.
9. IF la fecha de próxima renovación calculada es anterior o igual al inicio del ciclo actual, THEN
   THE Motor_de_Renovaciones SHALL rechazar la apertura del ciclo con el código
   `cycle_integrity_error`.

**Casos borde**

- Anclaje 31 en un ciclo mensual: febrero vence el 28 o el 29, marzo vuelve al 31.
- Anclaje 29 de febrero con periodicidad anual: en años no bisiestos vence el 28 de febrero, y en el
  siguiente bisiesto vuelve al 29.
- Ciclo mensual que arranca el 31 de diciembre: el siguiente vence el 31 de enero del año siguiente.

---

### Requerimiento 20 — REQ-COB-122: Fin de vigencia y permanencia mínima

**Extiende REQ-COB-013.**

**Historia de usuario:** Como titular de la cartera, quiero que una suscripción con fecha de fin deje
de renovarse sola, para no emitir cargos que después tengo que anular.

#### Criterios de aceptación

1. IF la fecha de fin de vigencia que el usuario declara es anterior al fin del ciclo actual, THEN THE
   Gestor_de_Cobranzas SHALL rechazar el guardado con el código `invalid_valid_until`.
2. WHILE la fecha actual es posterior al fin de vigencia de una suscripción, THE
   Motor_de_Renovaciones SHALL no abrir ciclos nuevos para esa suscripción.
3. WHEN el último ciclo de una suscripción con fin de vigencia se cierra y su cargo no tiene saldo
   pendiente, THE Gestor_de_Cobranzas SHALL pasar la suscripción a estado `EXPIRED`.
4. WHERE una suscripción con fin de vigencia tiene saldo pendiente al vencer, THE Gestor_de_Cobranzas
   SHALL pasarla a estado `EXPIRED` y SHALL mantener sus cargos pendientes visibles y cobrables en la
   cartera.
5. IF el usuario intenta dar de baja una suscripción dentro de su permanencia mínima, THEN THE
   Gestor_de_Cobranzas SHALL mostrar la cantidad de meses de permanencia que restan y SHALL requerir
   confirmación explícita.
6. WHEN una suscripción llega a `EXPIRED`, THE Servicio_de_Avisos SHALL no programar avisos de cobro
   nuevos para ella.
7. WHILE una suscripción `EXPIRED` conserva cargos pendientes, THE Servicio_de_Avisos SHALL seguir
   enviando los avisos ya programados de esos cargos.

---

## 3.2 Renovación

### Requerimiento 21 — REQ-COB-123: Emisión del cargo de renovación

**Extiende REQ-COB-030 y REQ-COB-032.**

**Historia de usuario:** Como operador, quiero que el cargo de la renovación se emita con la
anticipación que configuré, para que el suscriptor se entere antes de que venza y no después del
recargo.

#### Criterios de aceptación

1. WHEN la fecha actual alcanza la fecha de próxima renovación menos los días de anticipación de la
   regla efectiva, THE Motor_de_Renovaciones SHALL emitir el cargo del ciclo siguiente en estado
   `ISSUED`.
2. THE Motor_de_Renovaciones SHALL emitir un único cargo por la combinación de suscripción y etiqueta
   de período.
3. IF ya existe un cargo para la misma combinación de suscripción y etiqueta de período, THEN THE
   Motor_de_Renovaciones SHALL rechazar la emisión con el código `charge_already_issued`.
4. WHEN el Motor_de_Renovaciones emite un cargo, THE Motor_de_Renovaciones SHALL fijar en el cargo el
   inicio y fin de ciclo, la fecha de vencimiento, el monto base, el `rules_snapshot_json` y la
   referencia a la versión de plan vigente.
5. WHERE el suscriptor tiene saldo a favor, THE Motor_de_Renovaciones SHALL descontarlo del cargo
   emitido hasta agotarlo.
6. WHERE el saldo a favor cubre el total del cargo, THE Motor_de_Renovaciones SHALL emitirlo en estado
   `PAID` con medio `CREDIT_BALANCE`.
7. WHERE el cargo nace en estado `PAID`, THE Servicio_de_Avisos SHALL programar únicamente el aviso
   `PAYMENT_CONFIRMED`.
8. WHERE el monto base del ciclo es `0.00`, THE Motor_de_Renovaciones SHALL emitir el cargo en estado
   `PAID` con total `0.00`.
9. IF el monto base del ciclo es menor que `0.00`, THEN THE Motor_de_Renovaciones SHALL rechazar la
   emisión con el código `invalid_charge_amount` y SHALL registrar la suscripción entre los errores de
   la corrida.
10. WHEN el Motor_de_Renovaciones emite un cargo, THE Motor_de_Renovaciones SHALL avanzar el ciclo
    actual y la fecha de próxima renovación de la suscripción dentro de la misma transacción.
11. IF la emisión falla después de crear el cargo y antes de avanzar el ciclo, THEN THE
    Gestor_de_Cobranzas SHALL revertir la transacción completa y SHALL dejar la suscripción en su
    estado anterior.
12. WHERE el monto pactado en la suscripción difiere del monto de la versión de plan, THE
    Motor_de_Renovaciones SHALL usar el monto pactado en la suscripción.
13. WHEN el Motor_de_Renovaciones emite un cargo, THE Motor_de_Renovaciones SHALL registrar en el
    cargo si el monto aplicado provino de la suscripción o de la versión de plan.

---

### Requerimiento 22 — REQ-COB-124: Disparo de la renovación por corrida programada y por acción manual

**Nuevo.** Cierra la decisión D7.

**Historia de usuario:** Como operador, quiero poder ejecutar hoy la emisión de las renovaciones que
corresponden, para cobrar a tiempo sin depender de un proceso automático que todavía no está
garantizado.

#### Criterios de aceptación

1. THE Motor_de_Renovaciones SHALL exponer una única función de dominio de emisión.
2. THE Gestor_de_Cobranzas SHALL invocar esa función tanto desde la corrida programada como desde la
   acción manual.
3. WHEN el operador ejecuta la corrida manual, THE Gestor_de_Cobranzas SHALL mostrar antes de
   confirmar cuántas suscripciones entran, el monto total a emitir y el rango de fechas de
   vencimiento.
4. WHEN una corrida de renovación se ejecuta, THE Gestor_de_Cobranzas SHALL registrar la corrida con
   su origen (`SCHEDULED` o `MANUAL`), el correo del actor cuando es manual, la cantidad de cargos
   emitidos, la cantidad de casos omitidos, la cantidad de errores y la duración en milisegundos.
5. WHEN una corrida se ejecuta dos veces sobre el mismo período, THE Motor_de_Renovaciones SHALL
   emitir cero cargos nuevos en la segunda ejecución.
6. IF la emisión de una suscripción falla, THEN THE Motor_de_Renovaciones SHALL registrar el error con
   el identificador de esa suscripción y SHALL continuar con las suscripciones restantes.
7. IF la corrida se interrumpe, THEN THE Motor_de_Renovaciones SHALL conservar los cargos ya emitidos
   y SHALL permitir reanudarla sin duplicar ninguno.
8. WHILE una corrida de renovación del mismo titular está en estado `RUNNING`, THE
   Gestor_de_Cobranzas SHALL rechazar una corrida nueva con el código `renewal_run_in_progress`.
9. WHEN una suscripción queda omitida en la corrida, THE Gestor_de_Cobranzas SHALL registrar el motivo
   con uno de los literales `NOT_DUE_YET`, `AUTO_RENEW_OFF`, `SUSPENDED`, `EXPIRED`,
   `ALREADY_ISSUED`, `CAPABILITY_DISABLED`, `MISSING_RULE`, `HELD_BY_DEBT`, `POLICY_VIOLATION`,
   `RULES_REVIEW_PENDING`.
10. THE Gestor_de_Cobranzas SHALL mostrar el resultado de la última corrida en la pantalla de
    renovaciones, con acceso al detalle de omitidos y de errores.

---

### Requerimiento 23 — REQ-COB-125: Renovación automática y su baja

**Nuevo.**

**Historia de usuario:** Como operador, quiero registrar que un suscriptor dejó de renovar sin borrar
su historial, para que la cartera refleje su decisión y siga siendo auditable.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL mantener por suscripción una bandera de renovación automática cuyo
   valor inicial se toma del plan.
2. WHILE la renovación automática de una suscripción está desactivada, THE Motor_de_Renovaciones SHALL
   no emitir el cargo del ciclo siguiente de esa suscripción.
3. WHEN la renovación automática se desactiva, THE Gestor_de_Cobranzas SHALL mantener vigente el ciclo
   actual con su cargo.
4. WHEN la renovación automática se desactiva, THE Gestor_de_Cobranzas SHALL mostrar la fecha en la
   que la suscripción deja de estar vigente.
5. WHEN la renovación automática se desactiva, THE Bitacora SHALL registrar el correo del actor, la
   fecha, el origen de la solicitud y el motivo.
6. WHERE la suscripción está dentro de su permanencia mínima, THE Gestor_de_Cobranzas SHALL mostrar
   los meses que restan y SHALL requerir confirmación explícita para desactivar la renovación
   automática.
7. WHEN la renovación automática se reactiva antes del fin del ciclo actual, THE
   Motor_de_Renovaciones SHALL reprogramar la renovación en la fecha que corresponde al ciclo en
   curso, sin crear ciclos intermedios.
8. WHEN la renovación automática se reactiva después del fin del ciclo actual, THE
   Motor_de_Renovaciones SHALL abrir el ciclo siguiente a partir de la fecha de reactivación y SHALL
   no emitir cargos por los períodos no cubiertos.
9. IF la suscripción está en estado `CANCELLED` o `EXPIRED`, THEN THE Gestor_de_Cobranzas SHALL
   rechazar el cambio de la bandera con el código `subscription_not_active`.
10. WHILE la sesión tiene nivel `LECTURA`, THE Gestor_de_Cobranzas SHALL deshabilitar el cambio de la
    bandera de renovación automática con el motivo visible.

---

### Requerimiento 24 — REQ-COB-126: Precio aplicable a la renovación

**Extiende REQ-COB-011.**

**Historia de usuario:** Como titular de la cartera, quiero saber con qué precio se renueva cada
suscripción, para que un cambio de lista no altere sin aviso a quien ya está adentro.

#### Criterios de aceptación

1. WHEN el Motor_de_Renovaciones emite un cargo de renovación, THE Motor_de_Renovaciones SHALL usar el
   monto de la versión de plan a la que apunta la suscripción.
2. WHERE la cartera fue migrada explícitamente a una versión de plan nueva según REQ-COB-011, THE
   Motor_de_Renovaciones SHALL usar el monto de la versión nueva desde el primer ciclo emitido después
   de la migración.
3. WHEN una versión de plan nueva se crea sin migrar la cartera, THE Motor_de_Renovaciones SHALL
   seguir renovando las suscripciones existentes con su versión anterior.
4. THE Gestor_de_Cobranzas SHALL mostrar en la ficha del suscriptor la versión de plan vigente, su
   monto y el monto con el que se emitirá la próxima renovación.
5. WHERE el monto pactado de la suscripción difiere del monto de su versión de plan, THE
   Gestor_de_Cobranzas SHALL mostrar los dos montos en la ficha del suscriptor e indicar cuál se
   aplicará.
6. WHERE el mundo definió un monto máximo por cargo, THE Motor_de_Renovaciones SHALL rechazar la
   emisión de un cargo que lo exceda con el código `policy_limit_exceeded` y SHALL registrar la
   suscripción entre los errores de la corrida.
7. IF la versión de plan a la que apunta la suscripción no existe, THEN THE Motor_de_Renovaciones SHALL
   omitir la emisión con el código `plan_version_not_found` y SHALL registrar la suscripción entre los
   errores de la corrida.

---

### Requerimiento 25 — REQ-COB-127: Renovación de una suscripción con deuda

**Nuevo.**

**Historia de usuario:** Como titular de la cartera, quiero decidir si a quien me debe se le sigue
emitiendo, para no inflar una deuda que no voy a cobrar ni cortar a quien se atrasó una vez.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL ofrecer en la regla de cobranza la política de renovación con deuda
   declarada en REQ-COB-100, con los valores `ISSUE_ANYWAY`, `HOLD_UNTIL_PAID` y `SUSPEND`.
2. THE Gestor_de_Cobranzas SHALL contar como cargos vencidos de una suscripción los que están en
   estado `OVERDUE` o `IN_ARREARS`.
3. WHERE la política es `HOLD_UNTIL_PAID` y la suscripción tiene al menos un cargo vencido, THE
   Motor_de_Renovaciones SHALL omitir la emisión con el motivo `HELD_BY_DEBT`.
4. WHERE la política es `SUSPEND` y la cantidad de cargos vencidos alcanza el umbral de la regla
   efectiva, THE Gestor_de_Cobranzas SHALL pasar la suscripción a `SUSPENDED`.
5. WHILE una suscripción está `SUSPENDED`, THE Motor_de_Renovaciones SHALL no emitir cargos nuevos de
   esa suscripción.
6. WHILE una suscripción está `SUSPENDED`, THE Gestor_de_Cobranzas SHALL mantener sus cargos
   pendientes visibles y cobrables.
7. WHERE el modo de reactivación de la regla efectiva es `AUTO_ON_PAYMENT`, WHEN se acredita el pago
   que deja la suscripción sin cargos vencidos, THE Gestor_de_Cobranzas SHALL devolverla a `ACTIVE` y
   SHALL reprogramar su próxima renovación.
8. WHERE el modo de reactivación es `MANUAL`, THE Gestor_de_Cobranzas SHALL mantener la suscripción
   `SUSPENDED` hasta que un usuario con nivel `ADMIN` u `OPERADOR` la reactive.
9. IF una sesión con nivel `LECTURA` solicita reactivar una suscripción, THEN THE Gestor_de_Cobranzas
   SHALL responder 403 con el código `forbidden`.
10. WHEN una suscripción se suspende o se reactiva, THE Bitacora SHALL registrar el estado anterior, el
    estado nuevo, el motivo y el correo del actor.

---

## 3.3 Notificaciones del ciclo

### Requerimiento 26 — REQ-COB-128: Avisos del ciclo de renovación

**Extiende REQ-COB-040.**

**Historia de usuario:** Como suscriptor, quiero recibir aviso antes de que me cobren y confirmación
cuando pagué, para no enterarme del vencimiento por el recargo.

#### Criterios de aceptación

1. WHEN el Motor_de_Renovaciones emite un cargo, THE Servicio_de_Avisos SHALL programar los avisos
   activos de la cadencia contenida en el `rules_snapshot_json` de ese cargo.
2. THE Servicio_de_Avisos SHALL soportar los tipos `PRE_DUE`, `ON_DUE`, `POST_DUE_REMINDER`,
   `GRACE_END` y `PAYMENT_CONFIRMED`.
3. WHEN un pago deja un cargo en `PAID`, THE Servicio_de_Avisos SHALL enviar el aviso
   `PAYMENT_CONFIRMED`.
4. WHEN un pago deja un cargo en `PAID`, THE Servicio_de_Avisos SHALL cancelar los avisos de cobro
   pendientes de ese cargo.
5. WHEN llega el momento de enviar un aviso, THE Servicio_de_Avisos SHALL leer el estado del cargo en
   ese momento y SHALL registrar `SKIPPED_ALREADY_PAID` cuando el cargo ya está en `PAID`.
6. IF el suscriptor está marcado como contacto no alcanzable, THEN THE Servicio_de_Avisos SHALL
   registrar el aviso con estado `SKIPPED_UNREACHABLE` y SHALL no intentar el envío.
7. THE Servicio_de_Avisos SHALL registrar cada aviso con tipo, canal, destinatario, disparo
   (`SCHEDULED` o `MANUAL`), estado y fecha.
8. WHERE la política del mundo fija un máximo de recordatorios manuales por suscriptor por día, THE
   Servicio_de_Avisos SHALL rechazar el envío que lo exceda con el código `reminder_rate_limited`.
9. THE Servicio_de_Avisos SHALL incluir en el aviso de cobro el concepto, el período, el monto base,
   el recargo cuando exista, el total, la fecha de vencimiento y el enlace de pago.

---

### Requerimiento 27 — REQ-COB-129: Comportamiento sin proveedor de notificación

**Extiende REQ-COB-041.** PENDIENTE DE DEFINICIÓN: el monolito no tiene proveedor de correo
transaccional. Este requerimiento define el comportamiento con y sin proveedor; no nombra proveedor.

**Historia de usuario:** Como operador, quiero que la falta de un proveedor de envío no me deje sin
herramienta, para poder cobrar igual copiando el enlace, que es lo que hago hoy fuera del sistema.

#### Criterios de aceptación

1. WHERE no hay proveedor de notificación configurado, THE Servicio_de_Avisos SHALL registrar el
   evento de aviso con estado `NOT_CONFIGURED`.
2. WHERE no hay proveedor de notificación configurado, THE Gestor_de_Cobranzas SHALL mostrar el aviso
   con la etiqueta "listo para enviar".
3. WHERE no hay proveedor de notificación configurado, THE Gestor_de_Cobranzas SHALL ofrecer copiar el
   enlace de pago del cargo.
4. WHERE no hay proveedor de notificación configurado, THE Gestor_de_Cobranzas SHALL mostrar el código
   QR del cargo en pantalla.
5. WHEN el operador copia el enlace de pago, THE Bitacora SHALL registrar la acción con el correo del
   actor, el cargo y la fecha.
6. WHERE hay proveedor configurado, THE Servicio_de_Avisos SHALL registrar el resultado del envío con
   uno de los estados `SENT`, `FAILED` o `BOUNCED`.
7. WHEN un envío resulta `BOUNCED`, THE Gestor_de_Cobranzas SHALL marcar al suscriptor como contacto
   no alcanzable y SHALL mostrar esa marca en su ficha y en el listado de cartera.
8. THE Gestor_de_Cobranzas SHALL mostrar en la pantalla de reglas si hay proveedor de notificación
   configurado.
9. WHERE no hay proveedor de notificación configurado, THE Gestor_de_Cobranzas SHALL mostrar la
   cantidad de avisos en estado `NOT_CONFIGURED` del titular.
10. THE Servicio_de_Avisos SHALL registrar los avisos con el mismo conjunto de campos con proveedor y
    sin proveedor, de forma que los pendientes queden identificables por su estado.

---

### Requerimiento 28 — REQ-COB-130: Falla de la dependencia de notificación

**Extiende REQ-COB-041 y REQ-COB-092.**

**Historia de usuario:** Como operador, quiero que un fallo del canal de aviso no detenga la emisión ni
me deje sin saber qué pasó, para poder retomar solo los casos afectados.

#### Criterios de aceptación

1. IF el proveedor de notificación responde con error, THEN THE Servicio_de_Avisos SHALL registrar el
   evento con estado `FAILED` y el motivo devuelto, y SHALL continuar con los avisos restantes.
2. THE Servicio_de_Avisos SHALL ejecutar el envío de avisos de forma asíncrona respecto de la emisión
   de cargos.
3. THE Motor_de_Renovaciones SHALL completar la emisión de un cargo con independencia del resultado
   del envío de sus avisos.
4. IF el proveedor de notificación no responde dentro de 10 segundos, THEN THE Servicio_de_Avisos SHALL
   registrar el evento con estado `FAILED` y motivo `provider_timeout`.
5. THE Servicio_de_Avisos SHALL dejar todo aviso en estado `FAILED` disponible para reintento manual.
6. THE Gestor_de_Cobranzas SHALL ofrecer reintentar los avisos en estado `FAILED` de un rango de
   fechas.
7. WHEN un reintento se ejecuta, THE Servicio_de_Avisos SHALL omitir los avisos que ya están en estado
   `SENT`.
8. THE Servicio_de_Avisos SHALL ejecutar cero reintentos automáticos en este alcance, y SHALL dejar el
   reintento como acción del operador.
9. WHEN una corrida de avisos termina, THE Gestor_de_Cobranzas SHALL registrar cuántos se enviaron,
   cuántos fallaron y cuántos se omitieron con su motivo.
10. THE Gestor_de_Cobranzas SHALL incluir en cada registro de error el identificador del titular y el
    identificador de correlación de la corrida.

---

## 3.4 Cobro en lote

### Requerimiento 29 — REQ-COB-131: Qué es un lote y cómo se arma

**Nuevo.**

**Historia de usuario:** Como operador, quiero agrupar los cargos que voy a presentar a cobro juntos,
para trabajar por tanda y poder reclamar por el conjunto, no cargo por cargo.

#### Criterios de aceptación

1. THE Motor_de_Lotes SHALL representar un lote con: titular, criterio de armado, moneda, método de
   cobro, cantidad de cargos, monto total, estado, fechas de creación, cierre y presentación, y correo
   del usuario que lo creó.
2. THE Motor_de_Lotes SHALL aceptar como criterio de armado la combinación de fecha de vencimiento
   desde y hasta, plan, método de pago, tramo de mora y estado del cargo.
3. WHEN el operador arma un lote, THE Motor_de_Lotes SHALL incluir únicamente cargos del titular de la
   sesión.
4. THE Motor_de_Lotes SHALL incluir en un lote únicamente cargos en estado `ISSUED`, `PENDING`,
   `PARTIALLY_PAID`, `OVERDUE`, `IN_ARREARS` o `FAILED`.
5. THE Motor_de_Lotes SHALL excluir del armado los cargos en estado `SCHEDULED`, `PAID` o `CANCELLED`.
6. THE Motor_de_Lotes SHALL excluir del armado los cargos que ya pertenecen a otro lote vigente según
   REQ-COB-133.
7. THE Motor_de_Lotes SHALL excluir del armado automático los cargos marcados para gestión manual
   según REQ-COB-134.
8. THE Motor_de_Lotes SHALL armar cada lote con una sola moneda.
9. IF el criterio de armado alcanza cargos de monedas distintas, THEN THE Motor_de_Lotes SHALL rechazar
   el armado con el código `batch_mixed_currency`.
10. WHERE el criterio de armado alcanza exactamente un cargo, THE Motor_de_Lotes SHALL crear el lote
    con ese único cargo.
11. IF el criterio de armado alcanza más de 5000 cargos, THEN THE Motor_de_Lotes SHALL rechazar el
    armado con el código `batch_size_exceeded` y SHALL indicar la cantidad alcanzada.
12. WHEN el operador solicita la previsualización del lote, THE Motor_de_Lotes SHALL mostrar la
    cantidad de cargos, el monto total, el desglose por plan y por método, y los cargos excluidos con
    su motivo, sin escribir nada.
13. THE Motor_de_Lotes SHALL calcular el monto total del lote como la suma de los saldos pendientes de
    sus cargos, con la aritmética decimal de `server/money.js` y redondeo a la escala de la moneda una
    sola vez sobre el total.
14. IF el criterio de armado no alcanza ningún cargo, THEN THE Gestor_de_Cobranzas SHALL mostrar el
    estado "sin resultados" de REQ-COB-080 y SHALL no crear el lote.

---

### Requerimiento 30 — REQ-COB-132: Estados del lote

**Nuevo.** Vocabulario análogo al de REQ-COB-032 para cargos.

**Historia de usuario:** Como responsable de la plataforma, quiero un vocabulario único de estados de
lote, para que el panel, los reportes y la conciliación digan lo mismo del mismo lote.

#### Criterios de aceptación

1. THE Motor_de_Lotes SHALL usar los estados `OPEN`, `CLOSED`, `SUBMITTED`, `PARTIALLY_SETTLED`,
   `SETTLED`, `REJECTED` y `CANCELLED`.
2. WHEN un lote se crea, THE Motor_de_Lotes SHALL dejarlo en estado `OPEN`.
3. WHILE un lote está `OPEN`, THE Motor_de_Lotes SHALL permitir agregar y quitar cargos.
4. WHEN el operador cierra un lote, THE Motor_de_Lotes SHALL pasarlo a `CLOSED` y SHALL congelar su
   composición, su cantidad de cargos y su monto total.
5. IF el operador intenta cerrar un lote sin cargos, THEN THE Motor_de_Lotes SHALL rechazar el cierre
   con el código `batch_empty`.
6. WHEN un lote se presenta al adquirente, THE Motor_de_Lotes SHALL pasarlo a `SUBMITTED` y SHALL
   registrar la fecha y el correo del usuario de la presentación.
7. WHEN el retorno acredita todos los cargos del lote, THE Motor_de_Lotes SHALL pasarlo a `SETTLED`.
8. WHEN el retorno acredita algunos cargos y rechaza otros, THE Motor_de_Lotes SHALL pasarlo a
   `PARTIALLY_SETTLED`.
9. WHEN el retorno rechaza todos los cargos del lote, THE Motor_de_Lotes SHALL pasarlo a `REJECTED`.
10. WHEN los cargos pendientes de un lote `PARTIALLY_SETTLED` quedan acreditados por otra vía, THE
    Motor_de_Lotes SHALL pasarlo a `SETTLED`.
11. WHILE un lote está `OPEN` o `CLOSED`, THE Motor_de_Lotes SHALL permitir anularlo y pasarlo a
    `CANCELLED`.
12. IF un usuario solicita anular un lote en estado `SUBMITTED`, `PARTIALLY_SETTLED` o `SETTLED`, THEN
    THE Motor_de_Lotes SHALL rechazar la anulación con el código `batch_not_cancellable`.
13. THE Motor_de_Lotes SHALL entregar por cada lote la lista de acciones permitidas para la sesión.
14. THE Gestor_de_Cobranzas SHALL habilitar en el detalle del lote únicamente las acciones presentes en
    esa lista.

**Transiciones**

| Desde | Evento | Hacia |
|---|---|---|
| — | el operador arma el lote | `OPEN` |
| `OPEN` | el operador cierra el lote | `CLOSED` |
| `CLOSED` | se presenta al adquirente | `SUBMITTED` |
| `SUBMITTED` | retorno con todos acreditados | `SETTLED` |
| `SUBMITTED` | retorno con acreditados y rechazados | `PARTIALLY_SETTLED` |
| `SUBMITTED` | retorno con todos rechazados | `REJECTED` |
| `PARTIALLY_SETTLED` | se acreditan los faltantes por otra vía | `SETTLED` |
| `OPEN` o `CLOSED` | el usuario lo anula | `CANCELLED` |

---

### Requerimiento 31 — REQ-COB-133: Un cargo pertenece a un solo lote vigente

**Nuevo.**

**Historia de usuario:** Como titular de la cartera, quiero que un cargo no se presente dos veces al
mismo tiempo, para no cobrarle dos veces al suscriptor ni tener que devolverle plata después.

#### Criterios de aceptación

1. THE Motor_de_Lotes SHALL permitir que un cargo pertenezca a lo sumo a un lote en estado `OPEN`,
   `CLOSED`, `SUBMITTED` o `PARTIALLY_SETTLED`.
2. IF el operador intenta agregar a un lote un cargo que ya pertenece a otro lote vigente, THEN THE
   Motor_de_Lotes SHALL rechazar la operación con el código `charge_already_batched` y SHALL indicar el
   identificador del lote que lo contiene.
3. WHEN un lote pasa a `CANCELLED` o `REJECTED`, THE Motor_de_Lotes SHALL liberar sus cargos para que
   puedan integrarse a un lote nuevo.
4. WHEN un lote pasa a `SETTLED`, THE Motor_de_Lotes SHALL mantener sus cargos asociados a ese lote y
   SHALL no liberarlos.
5. WHEN un cargo de un lote `CLOSED` o `SUBMITTED` recibe un pago por otra vía, THE Motor_de_Lotes
   SHALL marcar ese cargo dentro del lote como `PAID_OUTSIDE_BATCH`.
6. WHEN un cargo queda marcado como `PAID_OUTSIDE_BATCH`, THE Motor_de_Lotes SHALL excluirlo de la
   presentación pendiente del lote.
7. WHEN un cargo se anula, THE Motor_de_Lotes SHALL quitarlo de todo lote en estado `OPEN`.
8. WHEN un cargo se anula, THE Motor_de_Lotes SHALL marcarlo como `CANCELLED_OUTSIDE_BATCH` en los
   lotes `CLOSED` o `SUBMITTED` que lo contienen.
9. THE Motor_de_Lotes SHALL conservar la composición histórica de todo lote cerrado, incluidos los
   cargos marcados por pago o anulación externa.

---

### Requerimiento 32 — REQ-COB-134: Rechazos parciales y reintento

**Nuevo.** Cierra la decisión D6.

**Historia de usuario:** Como operador, quiero volver a presentar solo lo que se rechazó, para no
reprocesar lo que ya se cobró ni arriesgar un cobro doble.

#### Criterios de aceptación

1. WHEN el retorno de un lote contiene cargos acreditados y cargos rechazados, THE Motor_de_Lotes
   SHALL registrar por cada cargo su resultado y su motivo.
2. WHEN el retorno de un lote contiene cargos acreditados y cargos rechazados, THE Motor_de_Lotes
   SHALL dejar el lote en `PARTIALLY_SETTLED`.
3. THE Motor_de_Lotes SHALL conservar inmutable la composición de un lote presentado.
4. IF un usuario solicita reabrir un lote presentado, THEN THE Motor_de_Lotes SHALL rechazar la
   operación con el código `batch_not_reopenable`.
5. WHEN el operador solicita reintentar los rechazos de un lote, THE Motor_de_Lotes SHALL crear un lote
   nuevo en estado `OPEN` con los cargos rechazados y SHALL registrar en él la referencia al lote de
   origen.
6. IF el lote no tiene cargos rechazados, THEN THE Motor_de_Lotes SHALL rechazar la creación del lote
   de reintento con el código `batch_has_no_rejections`.
7. THE Motor_de_Lotes SHALL excluir del lote de reintento los cargos que se acreditaron por otra vía
   entre el retorno y el reintento.
8. THE Gestor_de_Cobranzas SHALL mostrar en el detalle de un lote la cantidad de acreditados, la de
   rechazados agrupada por motivo canónico, y el enlace al lote de reintento cuando exista.
9. THE Motor_de_Lotes SHALL clasificar cada rechazo con uno de los motivos canónicos
   `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, `EXPIRED_INSTRUMENT`, `REJECTED_BY_ISSUER`,
   `TECHNICAL_ERROR` o `UNKNOWN`.
10. THE Motor_de_Lotes SHALL conservar además el motivo original que devolvió el adquirente, sin
    alterar su texto.
11. WHEN un cargo acumula la cantidad de rechazos consecutivos que la regla efectiva declara como
    límite, THE Gestor_de_Cobranzas SHALL marcarlo para gestión manual.
12. WHILE un cargo está marcado para gestión manual, THE Motor_de_Lotes SHALL excluirlo del armado
    automático de lotes y THE Gestor_de_Cobranzas SHALL permitir incluirlo en un lote solo por acción
    explícita del operador.

---

### Requerimiento 33 — REQ-COB-135: Permisos y límites sobre el lote

**Extiende REQ-COB-090.**

**Historia de usuario:** Como titular de la cartera, quiero que anular un lote requiera nivel
administrador, para que una tanda cerrada no se deshaga por un clic del día a día.

#### Criterios de aceptación

1. WHILE la sesión tiene nivel `LECTURA`, THE Gestor_de_Cobranzas SHALL permitir ver y exportar lotes
   y SHALL deshabilitar armar, cerrar, presentar, ingerir retorno, conciliar y anular.
2. WHILE la sesión tiene nivel `OPERADOR`, THE Gestor_de_Cobranzas SHALL permitir armar, cerrar,
   presentar, ingerir retorno y conciliar.
3. WHILE la sesión tiene nivel `OPERADOR`, THE Gestor_de_Cobranzas SHALL deshabilitar la anulación de
   un lote cerrado con el motivo visible.
4. IF una sesión con nivel `LECTURA` envía una acción de escritura sobre un lote, THEN THE
   Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden` y SHALL no modificar el lote.
5. IF una sesión con nivel `OPERADOR` envía la anulación de un lote en estado `CLOSED`, THEN THE
   Gestor_de_Cobranzas SHALL responder 403 con el código `forbidden` y SHALL no modificar el lote.
6. WHERE la política del mundo define un monto máximo por lote, THE Motor_de_Lotes SHALL rechazar el
   cierre de un lote que lo exceda con el código `policy_limit_exceeded` y SHALL devolver el tope del
   mundo en el cuerpo del error.
7. WHEN una acción sobre un lote se ejecuta, THE Bitacora SHALL registrar la acción, el lote, el correo
   del actor, la cantidad de cargos, el monto total y la fecha.

---

## 3.5 Entrega al adquirente

### Requerimiento 34 — REQ-COB-136: Contrato de salida agnóstico del proveedor

**Nuevo.** PENDIENTE DE DEFINICIÓN: no hay adquirente integrado. Este requerimiento fija el contrato
canónico y el punto de extensión; no define proveedor.

**Historia de usuario:** Como responsable de la plataforma, quiero que la entrega del lote no dependa
del proveedor que se contrate, para no rehacer el módulo cuando la integración se defina.

#### Criterios de aceptación

1. THE Motor_de_Lotes SHALL producir por cada lote una representación canónica con: identificador del
   lote, titular, moneda, fecha de presentación, cantidad de cargos, monto total, y por cada cargo su
   identificador, referencia externa, documento y nombre del suscriptor, concepto, período, fecha de
   vencimiento, monto base, recargo y total a cobrar.
2. THE Adaptador_de_Adquirente SHALL traducir la representación canónica al formato del proveedor
   configurado.
3. THE Motor_de_Lotes SHALL producir la representación canónica sin conocer el formato del proveedor.
4. WHERE no hay adquirente configurado, THE Gestor_de_Cobranzas SHALL entregar la representación
   canónica como archivo descargable delimitado por comas, codificado en UTF-8 con marca de orden de
   bytes, con comilla doble como delimitador de texto, comillas internas escapadas duplicándolas, fin
   de línea CRLF y una primera fila de encabezados.
5. THE Gestor_de_Cobranzas SHALL nombrar ese archivo con el patrón
   `lote-<identificador>-<AAAAMMDD>.csv`.
6. THE Adaptador_de_Adquirente SHALL exponer una función de serialización y una función de lectura del
   mismo formato.
7. FOR ALL lotes válidos, THE Adaptador_de_Adquirente SHALL producir, al leer la salida de su propia
   serialización, el mismo conjunto de cargos, los mismos montos por cargo y el mismo monto total.
8. THE Adaptador_de_Adquirente SHALL incluir en la salida una fila de resumen con la cantidad de cargos
   y el monto total.
9. WHEN el Adaptador_de_Adquirente lee un archivo de presentación, THE Adaptador_de_Adquirente SHALL
   validar el resumen contra el detalle.
10. IF el resumen no coincide con el detalle, THEN THE Adaptador_de_Adquirente SHALL rechazar el archivo
    con el código `batch_file_checksum_error` y SHALL indicar la diferencia de cantidad y de monto.
11. THE Adaptador_de_Adquirente SHALL escribir los montos con la escala de la moneda del lote, punto
    como separador decimal y sin separador de miles.
12. THE Adaptador_de_Adquirente SHALL incluir en la salida únicamente los campos que el criterio 1
    enumera, y SHALL excluir número de tarjeta, código de verificación de tarjeta y clave de acceso al
    portal.

---

### Requerimiento 35 — REQ-COB-137: Presentación del lote y su trazabilidad

**Nuevo.**

**Historia de usuario:** Como operador, quiero registrar que presenté el lote y con qué contenido, para
poder reclamar con evidencia cuando el retorno no cuadra.

#### Criterios de aceptación

1. WHERE el lote está en estado `CLOSED`, THE Motor_de_Lotes SHALL permitir su presentación.
2. IF el lote no está en estado `CLOSED`, THEN THE Motor_de_Lotes SHALL rechazar la presentación con el
   código `batch_not_closed`.
3. WHEN un lote se presenta, THE Motor_de_Lotes SHALL guardar la representación canónica presentada, su
   resumen y la fecha de presentación.
4. WHEN un lote se presenta, THE Motor_de_Lotes SHALL pasar el lote a `SUBMITTED`.
5. WHERE el adquirente está configurado como integración por interfaz de programación, THE
   Adaptador_de_Adquirente SHALL enviar el lote y SHALL registrar el identificador que devuelve el
   proveedor.
6. WHERE el adquirente está configurado como intercambio por archivo, THE Gestor_de_Cobranzas SHALL
   ofrecer la descarga del archivo y SHALL registrar la descarga con el correo del actor y la fecha.
7. IF el adquirente no responde dentro de 30 segundos, THEN THE Motor_de_Lotes SHALL mantener el lote
   en `CLOSED`, SHALL registrar el intento fallido con motivo `acquirer_timeout` y SHALL permitir
   reintentar la presentación.
8. IF el adquirente responde con error, THEN THE Motor_de_Lotes SHALL mantener el lote en `CLOSED`,
   SHALL registrar el intento fallido con el motivo devuelto y SHALL permitir reintentar la
   presentación.
9. WHEN una presentación se reintenta con éxito después de un fallo, THE Motor_de_Lotes SHALL conservar
   un único registro de presentación vigente y SHALL conservar el historial de intentos.
10. THE Gestor_de_Cobranzas SHALL permitir descargar la representación canónica guardada de un lote
    presentado en cualquier momento posterior, sin recalcularla.

---

### Requerimiento 36 — REQ-COB-138: Ingesta del retorno del adquirente

**Nuevo.**

**Historia de usuario:** Como operador, quiero cargar el resultado que me devuelve el adquirente, para
que los pagos se acrediten sin tipearlos uno por uno y sin equivocarme en los montos.

#### Criterios de aceptación

1. THE Adaptador_de_Adquirente SHALL leer el retorno y SHALL producir por cada línea: identificador del
   cargo, resultado (`APPROVED` o `REJECTED`), monto acreditado, fecha de acreditación, referencia
   externa y motivo cuando el resultado es `REJECTED`.
2. WHEN el operador carga un retorno, THE Gestor_de_Cobranzas SHALL mostrar el resultado de la lectura
   antes de aplicarlo, con la cantidad de líneas válidas, la cantidad con error y el motivo de cada
   error.
3. THE Gestor_de_Cobranzas SHALL aplicar el retorno únicamente después de una confirmación explícita
   del usuario.
4. WHEN el retorno se aplica, THE Registro_de_Pagos SHALL acreditar los cargos aprobados dentro de una
   única transacción por lote.
5. WHEN el retorno se aplica, THE Motor_de_Lotes SHALL registrar los rechazos con su motivo canónico.
6. IF una línea del retorno referencia un cargo que no pertenece al lote, THEN THE
   Adaptador_de_Adquirente SHALL rechazar esa línea con el código `charge_not_in_batch` y SHALL
   continuar con las líneas restantes.
7. IF una línea del retorno declara un monto acreditado menor o igual a `0.00` con resultado
   `APPROVED`, THEN THE Adaptador_de_Adquirente SHALL rechazar esa línea con el código
   `invalid_payment_amount` y SHALL continuar con las líneas restantes.
8. WHERE una línea del retorno declara un monto acreditado mayor que el saldo pendiente del cargo, THE
   Registro_de_Pagos SHALL pasar el cargo a `PAID` y SHALL acreditar la diferencia como saldo a favor
   según REQ-COB-145.
9. IF una línea del retorno referencia un cargo ya acreditado con la misma referencia externa, THEN THE
   Registro_de_Pagos SHALL omitir la línea y SHALL registrarla como duplicada, sin crear un pago nuevo.
10. IF el mismo retorno se carga dos veces, THEN THE Registro_de_Pagos SHALL acreditar cero pagos nuevos
    en la segunda carga.
11. THE Gestor_de_Cobranzas SHALL conservar el archivo o la respuesta de retorno original asociada al
    lote.
12. IF el archivo de retorno tiene un formato que el adaptador no reconoce, THEN THE
    Adaptador_de_Adquirente SHALL rechazarlo completo con el código `return_file_unreadable` y SHALL no
    aplicar ninguna línea.
13. IF la transacción de aplicación del retorno falla en cualquier línea, THEN THE Registro_de_Pagos
    SHALL revertirla completa y SHALL dejar el lote y sus cargos en su estado anterior.

---

### Requerimiento 37 — REQ-COB-139: Conciliación del lote

**Nuevo.**

**Historia de usuario:** Como titular de la cartera, quiero que el sistema me diga si lo presentado y
lo retornado cuadran, para detectar la diferencia antes de cerrar el mes y no después.

#### Criterios de aceptación

1. WHEN un retorno se aplica, THE Motor_de_Lotes SHALL comparar la cantidad de cargos y el monto
   presentado contra la cantidad de cargos y el monto retornado, y SHALL registrar el resultado de la
   comparación.
2. IF un usuario solicita conciliar un lote sin retorno aplicado, THEN THE Motor_de_Lotes SHALL rechazar
   la operación con el código `batch_without_return`.
3. WHERE la comparación no presenta diferencias, THE Motor_de_Lotes SHALL marcar el lote como
   conciliado con su fecha y el correo del usuario que lo concilió.
4. WHERE la comparación presenta diferencias, THE Motor_de_Lotes SHALL registrar cada diferencia con su
   tipo entre `MISSING_IN_RETURN`, `NOT_PRESENTED`, `AMOUNT_MISMATCH` y `DUPLICATE_IN_RETURN`.
5. WHERE la comparación presenta diferencias, THE Motor_de_Lotes SHALL mantener el lote como no
   conciliado.
6. WHILE un lote tiene diferencias sin resolver, THE Gestor_de_Cobranzas SHALL mostrarlas en el detalle
   del lote con el monto involucrado en cada una.
7. WHEN el usuario resuelve una diferencia, THE Gestor_de_Cobranzas SHALL exigir un motivo de texto no
   vacío y THE Bitacora SHALL registrarlo con el correo del actor y la fecha.
8. THE Gestor_de_Cobranzas SHALL exportar la conciliación de un lote con el detalle por cargo de lo
   presentado, lo retornado y la diferencia.
9. THE Motor_de_Lotes SHALL calcular las diferencias con la aritmética decimal de `server/money.js`, y
   SHALL considerar que no hay diferencia cuando el desvío es exactamente `0.00`.

---

### Requerimiento 38 — REQ-COB-140: Operación sin adquirente configurado

**Extiende REQ-COB-052.** PENDIENTE DE DEFINICIÓN: no hay pasarela integrada.

**Historia de usuario:** Como operador, quiero poder trabajar por lote incluso sin adquirente
integrado, para ordenar la cobranza con las herramientas que ya tengo hoy.

#### Criterios de aceptación

1. WHERE no hay adquirente configurado, THE Gestor_de_Cobranzas SHALL permitir armar, cerrar y exportar
   lotes.
2. WHERE no hay adquirente configurado, THE Gestor_de_Cobranzas SHALL indicar en el panel de lotes que
   la presentación automática no está disponible y qué alternativa manual existe.
3. WHERE no hay adquirente configurado, THE Motor_de_Lotes SHALL aceptar la carga de un retorno en el
   formato canónico de REQ-COB-136 y THE Registro_de_Pagos SHALL acreditar esos pagos con origen
   `RECONCILIATION`.
4. WHERE no hay adquirente configurado, THE Gestor_de_Cobranzas SHALL permitir registrar pagos manuales
   sobre los cargos del lote y THE Motor_de_Lotes SHALL reflejarlos en el estado del lote según
   REQ-COB-132.
5. THE Gestor_de_Cobranzas SHALL mostrar el origen de cada pago en la pantalla del cargo y en la
   exportación, con los literales `MANUAL`, `ACQUIRER_RETURN`, `RECONCILIATION` y `CREDIT_BALANCE`.
6. THE Gestor_de_Cobranzas SHALL identificar en pantalla todo pago con origen `MANUAL` o
   `RECONCILIATION` como registro del operador y no como cobro del adquirente.
7. WHEN un adquirente se configure, THE Motor_de_Lotes SHALL conservar los lotes históricos con su
   representación canónica y SHALL no requerir migración de los lotes ya cerrados.

---

## 3.6 Registro del pago

### Requerimiento 39 — REQ-COB-141: Registro del pago por sus tres orígenes

**Extiende REQ-COB-052 y REQ-COB-073.**

**Historia de usuario:** Como operador, quiero registrar un pago cualquiera sea la vía por la que
llegó, con los mismos datos mínimos, para que la cartera refleje la realidad sin planillas paralelas.

#### Criterios de aceptación

1. THE Registro_de_Pagos SHALL aceptar pagos con origen `MANUAL`, `ACQUIRER_RETURN`, `RECONCILIATION` y
   `CREDIT_BALANCE`.
2. WHEN se registra un pago, THE Registro_de_Pagos SHALL exigir monto, medio, fecha de acreditación y
   origen.
3. THE Registro_de_Pagos SHALL aceptar como medio únicamente los literales `CARD`, `QR`, `CASH`,
   `TRANSFER`, `CREDIT_BALANCE` y `MANUAL`.
4. WHERE el origen es `MANUAL`, THE Registro_de_Pagos SHALL exigir además la referencia del comprobante
   y SHALL registrar el correo del usuario que lo ingresó.
5. WHERE el origen es `ACQUIRER_RETURN`, THE Registro_de_Pagos SHALL exigir la referencia externa
   provista por el adquirente y el identificador del lote.
6. IF el cargo indicado no existe, THEN THE Registro_de_Pagos SHALL responder 404 con el código
   `charge_not_found`.
7. IF el monto del pago es menor o igual a `0.00`, THEN THE Registro_de_Pagos SHALL rechazar el registro
   con el código `invalid_payment_amount`.
8. IF la fecha de acreditación es posterior a la fecha actual en la zona horaria de la plataforma, THEN
   THE Registro_de_Pagos SHALL rechazar el registro con el código `invalid_payment_date`.
9. IF la fecha de acreditación es anterior a la fecha de emisión del cargo, THEN THE Registro_de_Pagos
   SHALL rechazar el registro con el código `invalid_payment_date`.
10. IF el cargo está en estado `CANCELLED`, THEN THE Registro_de_Pagos SHALL rechazar el registro con el
    código `charge_cancelled`.
11. WHEN un pago se registra, THE Bitacora SHALL registrar el cargo, el monto, el medio, el origen, la
    referencia, el correo del actor y la fecha, dentro de la misma transacción que el pago.
12. THE Registro_de_Pagos SHALL registrar todo intento de cobro con su resultado, incluidos los
    fallidos.
13. THE Gestor_de_Cobranzas SHALL mostrar los intentos de cobro, exitosos y fallidos, en el detalle del
    cargo.

---

### Requerimiento 40 — REQ-COB-142: Idempotencia del registro del pago

**Nuevo.**

**Historia de usuario:** Como titular de la cartera, quiero que un pago no se acredite dos veces aunque
el retorno se cargue de nuevo o el operador haga doble clic, para que lo cobrado sea lo cobrado.

#### Criterios de aceptación

1. THE Registro_de_Pagos SHALL tratar como identidad del pago la terna compuesta por cargo, origen y
   referencia externa.
2. IF un pago con la misma terna ya existe, THEN THE Registro_de_Pagos SHALL no crear un pago nuevo y
   SHALL responder con el pago existente.
3. WHERE el origen es `MANUAL` y la solicitud no trae referencia externa, THE Registro_de_Pagos SHALL
   exigir una clave de idempotencia de 1 a 64 caracteres provista por el cliente.
4. IF la solicitud no trae ni referencia externa ni clave de idempotencia, THEN THE Registro_de_Pagos
   SHALL rechazar el registro con el código `idempotency_key_required`.
5. WHEN la misma solicitud de pago se recibe dos veces con la misma clave de idempotencia, THE
   Registro_de_Pagos SHALL aplicar el pago una sola vez.
6. THE Registro_de_Pagos SHALL aplicar el pago, la actualización del cargo, la actualización de la
   suscripción y el registro de bitácora dentro de una única transacción.
7. IF la transacción de registro falla en cualquier paso, THEN THE Registro_de_Pagos SHALL revertirla
   completa y SHALL dejar el cargo con su saldo previo.
8. WHEN el cliente reintenta con la misma clave de idempotencia después de perder la conexión, THE
   Registro_de_Pagos SHALL devolver el resultado del registro original.
9. THE Registro_de_Pagos SHALL conservar la clave de idempotencia de un pago durante al menos 30 días
   contados desde su primera aplicación.

---

### Requerimiento 41 — REQ-COB-143: Efecto del pago en el cargo y en la suscripción

**Extiende REQ-COB-032 y REQ-COB-052.**

**Historia de usuario:** Como operador, quiero que al registrar el pago se actualice todo lo que
depende de él, para no tener que tocar estados a mano ni revisar el lote después.

#### Criterios de aceptación

1. WHEN el monto acreditado de un cargo iguala su total, THE Registro_de_Pagos SHALL pasar el cargo a
   `PAID` y SHALL fijar su saldo pendiente en `0.00`.
2. WHEN el monto acreditado de un cargo supera su total, THE Registro_de_Pagos SHALL pasar el cargo a
   `PAID`, SHALL fijar su saldo pendiente en `0.00` y SHALL derivar la diferencia a saldo a favor según
   REQ-COB-145.
3. WHEN el monto acreditado de un cargo es mayor que `0.00` y menor que su total, THE Registro_de_Pagos
   SHALL pasar el cargo a `PARTIALLY_PAID` y SHALL dejar su saldo pendiente visible.
4. WHEN un cargo pasa a `PAID`, THE Servicio_de_Avisos SHALL cancelar sus avisos de cobro pendientes.
5. WHERE el modo de reactivación de la regla efectiva es `AUTO_ON_PAYMENT`, WHEN el pago deja la
   suscripción sin cargos vencidos, THE Gestor_de_Cobranzas SHALL devolver la suscripción a `ACTIVE`.
6. WHEN un pago se acredita sobre un cargo de un lote presentado, THE Motor_de_Lotes SHALL actualizar el
   estado del lote según REQ-COB-132.
7. WHEN un pago se acredita, THE Gestor_de_Cobranzas SHALL actualizar los indicadores de cobrado,
   pendiente y vencido del período del cargo.
8. WHERE el recargo por mora está registrado como concepto separado, THE Registro_de_Pagos SHALL
   imputar el pago primero al recargo y luego al monto base.
9. THE Gestor_de_Cobranzas SHALL mostrar la imputación entre recargo y monto base en el detalle del
   cargo.
10. IF un usuario solicita anular un cargo en estado `PAID`, THEN THE Gestor_de_Cobranzas SHALL rechazar
    la anulación con el código `charge_already_paid` y SHALL indicar que corresponde una nota de
    crédito.

---

### Requerimiento 42 — REQ-COB-144: Aritmética y representación del dinero

**Extiende REQ-COB-090 y la deuda técnica de saldo como cadena.**

**Historia de usuario:** Como responsable de la plataforma, quiero que el dinero no pierda centavos en
ninguna capa, para que la conciliación del lote cierre contra el retorno del adquirente.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL declarar todo monto en las respuestas de API como cadena decimal con
   la escala de la moneda del titular y punto como separador decimal.
2. THE Gestor_de_Cobranzas SHALL realizar toda suma, resta, multiplicación y división de montos con la
   aritmética decimal de precisión fija de `server/money.js`.
3. THE Gestor_de_Cobranzas SHALL aplicar el redondeo con modo medio hacia arriba una sola vez, sobre el
   resultado final de cada cálculo.
4. THE Gestor_de_Cobranzas SHALL garantizar que la suma de los montos por cargo de un lote iguala
   exactamente el monto total del lote.
5. THE Gestor_de_Cobranzas SHALL garantizar que para todo cargo el saldo pendiente iguala el total menos
   el monto acreditado.
6. THE Gestor_de_Cobranzas SHALL exportar los montos con la escala de la moneda, punto decimal y sin
   separador de miles.
7. THE Gestor_de_Cobranzas SHALL operar un lote y todos sus cargos en una única moneda.
8. THE Gestor_de_Cobranzas SHALL expresar la moneda con su código ISO de tres letras y SHALL tomarla de
   la moneda del titular.

---

### Requerimiento 43 — REQ-COB-145: Sobrepago y saldo a favor

**Extiende REQ-COB-062.**

**Historia de usuario:** Como operador, quiero que lo que se pagó de más quede a favor del suscriptor,
para no devolver efectivo ni llevar ese resto en una planilla aparte.

#### Criterios de aceptación

1. WHEN el monto acreditado de un cargo supera su total, THE Registro_de_Pagos SHALL acreditar la
   diferencia como saldo a favor del suscriptor.
2. THE Registro_de_Pagos SHALL mantener el saldo a favor de un suscriptor mayor o igual a `0.00`.
3. THE Registro_de_Pagos SHALL aplicar el saldo a favor de un suscriptor únicamente a cargos de ese
   mismo suscriptor.
4. WHEN se emite el cargo siguiente de un suscriptor con saldo a favor, THE Motor_de_Renovaciones SHALL
   descontar el saldo hasta agotarlo.
5. WHERE el saldo a favor cubre el total del cargo, THE Motor_de_Renovaciones SHALL emitir el cargo en
   `PAID` con medio `CREDIT_BALANCE`.
6. THE Gestor_de_Cobranzas SHALL mostrar el saldo a favor en la ficha del suscriptor con su historial de
   acreditación y de aplicación.
7. THE Gestor_de_Cobranzas SHALL no ofrecer devolución de saldo a favor en efectivo dentro de este
   alcance.
8. WHEN se acredita o se aplica saldo a favor, THE Bitacora SHALL registrar el movimiento con su origen,
   su monto y la fecha.

**Nota de decisión pendiente:** la caducidad del saldo a favor es decisión de negocio y no está tomada.
Mientras no se defina, el saldo a favor no caduca.

---

## 3.7 Interfaz, observabilidad y recuperación

### Requerimiento 44 — REQ-COB-146: Estados de interfaz de las pantallas nuevas

**Extiende REQ-COB-080.**

**Historia de usuario:** Como operador, quiero que las pantallas nuevas me digan qué falta hacer en
lugar de mostrarme una tabla vacía, para no creer que perdí mi cartera.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL resolver en las pantallas de reglas de plan, renovaciones, lotes y
   conciliación los estados de carga, vacío por configurar, sin resultados por filtros, error con
   reintento, sin permisos, capacidad no contratada y degradado.
2. THE Gestor_de_Cobranzas SHALL diferenciar visualmente el estado "sin resultados por filtros" del
   estado "todavía no hay nada".
3. WHILE la pantalla está en estado "sin resultados por filtros", THE Gestor_de_Cobranzas SHALL ofrecer
   la acción de limpiar filtros.
4. WHERE el titular no tiene regla de cartera, THE Gestor_de_Cobranzas SHALL mostrar en la pantalla de
   renovaciones el estado vacío por configurar con la acción que lleva a definir la regla.
5. WHERE no hay proveedor de notificación configurado o no hay adquirente configurado, THE
   Gestor_de_Cobranzas SHALL mostrar un aviso persistente con la función que queda no disponible y la
   alternativa manual que existe.
6. THE Gestor_de_Cobranzas SHALL comunicar el estado de un lote y de un cargo con texto además de
   color.
7. THE Gestor_de_Cobranzas SHALL permitir operar las tablas de lotes y de conciliación con teclado.
8. THE Gestor_de_Cobranzas SHALL paginar en el servidor las tablas de lotes, de cargos y de
   conciliación, con 50 filas por página.
9. WHILE una corrida de renovación, de avisos o de conciliación está en estado `RUNNING`, THE
   Gestor_de_Cobranzas SHALL mostrar su progreso y SHALL mantener operables el resto de los controles
   de la pantalla.

---

### Requerimiento 45 — REQ-COB-147: Observabilidad de las corridas

**Extiende REQ-COB-092.**

**Historia de usuario:** Como responsable de la plataforma, quiero diagnosticar una corrida que salió
mal desde el propio panel, para no depender de capturas de pantalla del operador.

#### Criterios de aceptación

1. THE Gestor_de_Cobranzas SHALL registrar por cada corrida de renovación, de avisos, de presentación y
   de conciliación: identificador de correlación, titular, origen, inicio, fin, duración en
   milisegundos, cantidad procesada, cantidad exitosa, cantidad omitida con motivo y cantidad con error
   con motivo.
2. THE Gestor_de_Cobranzas SHALL incluir el identificador del titular y el identificador de correlación
   en cada registro de error.
3. THE Gestor_de_Cobranzas SHALL exponer el historial de corridas en el panel, filtrable por tipo y por
   rango de fechas.
4. THE Gestor_de_Cobranzas SHALL exponer el registro de corridas en modo consulta, sin acción de borrado
   en ninguna interfaz.
5. THE Gestor_de_Cobranzas SHALL identificar al suscriptor en los registros de corrida únicamente por
   su identificador interno.

**Nota de decisión pendiente:** el plazo de retención del registro de corridas es decisión de negocio y
no está tomado. Mientras no se defina, los registros se conservan sin borrado.

---

### Requerimiento 46 — REQ-COB-148: Recuperación ante interrupción

**Nuevo.**

**Historia de usuario:** Como operador, quiero que una corrida cortada a mitad de camino se pueda
retomar sin duplicar nada, para no revisar cargo por cargo qué alcanzó a emitirse.

#### Criterios de aceptación

1. IF una corrida de renovación se interrumpe, THEN THE Motor_de_Renovaciones SHALL dejarla en estado
   `INTERRUPTED` con la cantidad procesada hasta ese punto.
2. WHILE una corrida está en estado `INTERRUPTED`, THE Gestor_de_Cobranzas SHALL ofrecer la acción de
   reanudarla.
3. WHEN una corrida `INTERRUPTED` se reanuda, THE Motor_de_Renovaciones SHALL procesar únicamente las
   suscripciones que quedaron sin procesar.
4. IF una corrida en estado `RUNNING` no actualiza su marca de actividad durante más de 15 minutos,
   THEN THE Gestor_de_Cobranzas SHALL pasarla a `INTERRUPTED` y SHALL liberar el bloqueo que impide
   iniciar una corrida nueva del mismo titular.
5. IF la ingesta de un retorno se interrumpe, THEN THE Registro_de_Pagos SHALL revertir la transacción
   del lote y SHALL permitir volver a cargar el mismo retorno sin duplicar pagos.
6. IF la base de datos no está disponible durante una corrida, THEN THE Gestor_de_Cobranzas SHALL
   detener la corrida, SHALL registrar el error con el identificador de correlación y SHALL dejar la
   corrida sin cargos ni pagos parcialmente escritos.
7. IF el cliente pierde la conexión durante el cierre o la presentación de un lote, THEN THE
   Motor_de_Lotes SHALL aplicar la operación una sola vez cuando el cliente reintente con la misma
   clave de idempotencia.
8. WHEN una operación de escritura de este alcance se reintenta con la misma clave de idempotencia, THE
   Gestor_de_Cobranzas SHALL devolver el resultado de la primera ejecución.

---

# Cobertura de la taxonomía funcional

| Camino | Dónde se cubre |
|---|---|
| Happy path | REQ-COB-101, 110, 123, 131, 137, 138, 141 |
| Camino alternativo | REQ-COB-104 (vigencia futura), 124 (corrida manual), 134 (lote de reintento), 140 (sin adquirente) |
| Caso borde | REQ-COB-100.5 (día de corte 31), 120.6 (ciclo de un día), 121 (meses cortos, febrero y cambio de año), 105.5 (prorrateo neto cero), 123.8 y 123.9 (monto cero y monto negativo), 131.10 (lote de un solo cargo), 132.5 (lote vacío), 133.5 (pago fuera del lote), 138.8 (pago mayor que el saldo), 138.9 (retorno duplicado), 145 (sobrepago) |
| Camino de error | REQ-COB-100.4, 100.8, 102, 112.2, 131.9, 131.11, 132.5, 134.6, 136.10, 138.6, 138.7, 138.12, 139.2, 141.6 a 141.10 |
| Permisos por rol | REQ-COB-105.11, 106, 113.12, 114.10, 125.10, 127.9, 135 |
| Configuración | REQ-COB-100, 101, 104, 111, 127, 129, 140 |
| Falla de dependencia | REQ-COB-101.12 y 112.6 (base de datos en lectura), 106.7 y 113.14 (proveedor de identidad), 129 y 130 (proveedor de notificación), 137.7 y 137.8 (adquirente), 148.6 (base de datos en corrida) |
| Falla de red | REQ-COB-142.8, 148.7, 148.8 |
| Recuperación | REQ-COB-124.7, 130.6, 134.5, 137.9, 148 |
| Aislamiento y privacidad | REQ-COB-112.3, 112.4, 114, 117, 147.5 |

---

# Propiedades de corrección candidatas

Insumo para la fase de diseño. No son requerimientos: son las propiedades que conviene verificar con
prueba basada en propiedades, más las que corresponde verificar con ejemplos.

| Propiedad | Tipo | Requerimiento origen |
|---|---|---|
| Serializar un lote y volver a leerlo devuelve el mismo conjunto de cargos y el mismo total | Round trip | REQ-COB-136.7 |
| Aplicar el mismo retorno dos veces acredita los mismos pagos que aplicarlo una vez | Idempotencia | REQ-COB-138.10, REQ-COB-142 |
| Ejecutar dos veces la corrida de renovación del mismo período emite los mismos cargos que ejecutarla una vez | Idempotencia | REQ-COB-124.5 |
| Resolver la regla efectiva es idempotente y no depende del orden de los grupos declarados | Idempotencia | REQ-COB-101 |
| La suma de los montos por cargo de un lote iguala el total del lote | Invariante | REQ-COB-144.4 |
| Para todo cargo, saldo pendiente igual a total menos acreditado | Invariante | REQ-COB-144.5 |
| El saldo a favor de un suscriptor nunca es negativo | Invariante | REQ-COB-145.2 |
| Los ciclos consecutivos de una suscripción no se solapan ni dejan huecos | Invariante | REQ-COB-120.5, REQ-COB-120.7 |
| Los tramos de mora cubren todos los días desde el 1 sin solaparse | Invariante | REQ-COB-100.14 |
| La cantidad de cargos y el monto total de un lote no cambian después de cerrarlo | Invariante | REQ-COB-132.4 |
| Un cargo pertenece a lo sumo a un lote vigente | Invariante | REQ-COB-133.1 |
| Un plan con los nueve grupos declarados produce la misma regla efectiva con cualquier regla de cartera | Metamórfica | REQ-COB-101.4 |
| La cantidad de cargos de un lote nunca supera la cantidad de cargos que cumplen el criterio | Metamórfica | REQ-COB-131 |
| Redondear una sola vez al final nunca se desvía más que redondear por término | Metamórfica | REQ-COB-108.6, REQ-COB-144.3 |
| Fecha de próxima renovación con anclaje 31 cae en el último día del mes en meses cortos | Ejemplo | REQ-COB-121.3 |
| Anclaje 29 de febrero con periodicidad anual vence el 28 en años no bisiestos | Ejemplo | REQ-COB-121.3 |
| Retorno con formato desconocido no aplica ninguna línea | Condición de error | REQ-COB-138.12 |
| Línea de retorno con monto menor o igual a cero se rechaza y las demás se aplican | Condición de error | REQ-COB-138.7 |
| Presentar un lote sin adquirente configurado ofrece el archivo canónico y no falla | Integración con ejemplos | REQ-COB-140.1 |
| Entrega de credenciales cuando el proveedor de identidad no responde no crea usuarios duplicados | Integración con ejemplos | REQ-COB-113.14, REQ-COB-113.15 |
| Pedir la cartera de otro titular responde 403 y no una lista vacía | Integración con ejemplos | REQ-COB-112.3, REQ-COB-114.5 |

Lo que **no** conviene verificar con prueba basada en propiedades: la disponibilidad del proveedor de
identidad, el envío real de una notificación y la respuesta de un adquirente. Esos casos van con uno o
dos ejemplos de integración, con dobles de prueba.

---

# Trazabilidad

| Requerimiento nuevo | Relación | Requerimiento previo |
|---|---|---|
| REQ-COB-100, 101, 102, 104 | Extiende | REQ-COB-030 |
| REQ-COB-103 | Extiende | REQ-COB-030, REQ-COB-031 |
| REQ-COB-105 | Extiende | REQ-COB-060, REQ-COB-061 |
| REQ-COB-106 | Extiende | REQ-COB-004, REQ-COB-090 |
| REQ-COB-107 | Extiende | REQ-COB-040 |
| REQ-COB-108 | Extiende | REQ-COB-031, REQ-COB-071 |
| REQ-COB-110, 111, 112, 115 | Extiende | REQ-COB-002, REQ-COB-090 |
| REQ-COB-113 | Extiende | REQ-COB-005 |
| REQ-COB-114 | Extiende | REQ-COB-007 |
| REQ-COB-116 | Extiende | REQ-COB-001 |
| REQ-COB-117 | Extiende | REQ-COB-075 |
| REQ-COB-120, 126 | Extiende | REQ-COB-010, REQ-COB-011 |
| REQ-COB-121, 124, 125, 127 | Nuevo | — |
| REQ-COB-122 | Extiende | REQ-COB-013 |
| REQ-COB-123 | Extiende | REQ-COB-030, REQ-COB-032 |
| REQ-COB-128 | Extiende | REQ-COB-040 |
| REQ-COB-129, 130 | Extiende | REQ-COB-041 |
| REQ-COB-131 a 134 | Nuevo | — |
| REQ-COB-135 | Extiende | REQ-COB-090 |
| REQ-COB-136 a 139 | Nuevo | — |
| REQ-COB-140 | Extiende | REQ-COB-052 |
| REQ-COB-141 | Extiende | REQ-COB-052, REQ-COB-073 |
| REQ-COB-142 | Nuevo | — |
| REQ-COB-143 | Extiende | REQ-COB-032, REQ-COB-052 |
| REQ-COB-144 | Extiende | REQ-COB-090 |
| REQ-COB-145 | Extiende | REQ-COB-062 |
| REQ-COB-146 | Extiende | REQ-COB-080 |
| REQ-COB-147 | Extiende | REQ-COB-092 |
| REQ-COB-148 | Nuevo | — |

Ningún requerimiento de este spec reemplaza a uno previo. Los siete requerimientos de
`frente-y-accesos.md` (REQ-COB-001 a 007) siguen siendo la base de arquitectura y accesos.

---

# Fuera de alcance

- Cobro automático con tarjeta tokenizada, reintentos automáticos y actualizador de tarjetas. Siguen
  siendo fase 2, como ya establece `requirements.md`.
- Integración con un proveedor de correo transaccional concreto y con un adquirente concreto. Este spec
  define contrato y degradación; la integración entra cuando haya proveedor definido.
- Devolución de saldo a favor en efectivo.
- Impersonación de soporte de Red Pontis sobre el panel de un cliente. Sigue pendiente de decisión en
  `frente-y-accesos.md` §7.
- Cambios en `joi360-app-ios` y `joi360-pos-android`. Este alcance no los toca.

---

## Huecos detectados en el refinamiento

Estos huecos aparecieron al precisar los 46 requerimientos. No se agregaron como requerimientos porque
el alcance de este spec está cerrado: quedan anotados con el identificador que les correspondería.

| ID propuesto | Hueco | Por qué apareció | Requerimiento que lo deja abierto |
|---|---|---|---|
| REQ-COB-149 | Quién dispara la corrida programada, con qué frecuencia y qué pasa cuando el entorno no tiene planificador | REQ-COB-124 define el origen `SCHEDULED` y su idempotencia, pero ningún requerimiento define el planificador. En `joi360mono` no hay planificador verificado, así que hoy la única vía garantizada es la corrida manual | REQ-COB-124 |
| REQ-COB-150 | Nota de crédito y reverso de un pago ya acreditado, incluido el reverso que informa el adquirente después de acreditar | REQ-COB-143.10 rechaza anular un cargo `PAID` e indica que corresponde una nota de crédito, pero la nota de crédito no está especificada en ningún requerimiento. Tampoco está el camino del retorno que revierte un cobro previamente aprobado | REQ-COB-143, REQ-COB-138 |
| REQ-COB-151 | Migración de los consumidores y de los datos existentes de `billing_cycle` a `periodicity`, con soporte simultáneo de los dos nombres durante el corte | REQ-COB-120 fija `periodicity` como nombre único, pero no define la secuencia expandir, migrar, conmutar y contraer que exige no dejar consumidores rotos durante el despliegue | REQ-COB-120 |
| REQ-COB-152 | Alerta operativa proactiva cuando una corrida termina con errores o cuando un lote queda sin conciliar más de un plazo declarado | REQ-COB-147 deja el diagnóstico disponible en el panel, pero nadie se enteraría de un fallo sin abrirlo. El plazo sería, además, una decisión de negocio | REQ-COB-147, REQ-COB-139 |
| REQ-COB-153 | Qué resuelve el enlace de pago mientras no haya pasarela integrada | REQ-COB-128.9 exige el enlace de pago en el aviso y REQ-COB-129.3 ofrece copiarlo, pero el enlace de REQ-COB-050 fue especificado suponiendo pasarela. Sin pasarela hace falta definir qué muestra ese enlace al suscriptor | REQ-COB-128, REQ-COB-129 |
