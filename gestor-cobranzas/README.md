# Gestor de Cobranzas — especificación y prototipo

**Cuarto frente del ecosistema JOI 360**: un software de cobranza recurrente con su propio panel,
su propio login y sus propias credenciales de Cognito. Se activa desde el catálogo y se contrata
por mundo o por comercio, discriminadamente. Caso de referencia: YOKI, comercio de suscripciones
dentro del mundo Jockey Plaza.

No es una sección de Admin RP. Admin RP solo **activa** la capacidad y **entrega** las credenciales;
el titular gestiona su cobranza en su propio portal.

Este directorio **no es código de producción**. Es el paquete que Salvador ancla e implementa
dentro de `joi360mono`: especificación, contratos y un prototipo navegable que fija el
comportamiento esperado antes de escribir la feature.

---

## Qué hay acá

```
gestor-cobranzas/
  README.md                        este archivo
  specs/
    frente-y-accesos.md            LEER PRIMERO — arquitectura del frente, catálogo con alcance,
                                   grupos de Cognito, entrega del producto, REQ-COB-001 a 007
    requirements.md                los requerimientos del dominio, REQ-COB-010 a 093
    reglas-plan-y-renovaciones.md  reglas por plan, gobierno del mundo sobre sus comercios,
                                   renovaciones, lotes, adquirente y pago. REQ-COB-100 a 148
    design.md                      modelo de datos, contratos API, prorateo, riesgos
    tasks.md                       tareas ordenadas por dependencia, trazadas a requerimientos
  preview/
    index.html                     prototipo navegable, sin build
    app.js                         lógica real: reglas, renovaciones, lotes, pagos, prorateo
    ejemplo-cartera-yoki.csv       archivo de carga con filas válidas y con error
```

**Orden de lectura:** `frente-y-accesos.md`, después `requirements.md`, después
`reglas-plan-y-renovaciones.md`, y `design.md` como referencia de modelo de datos y contratos.

`frente-y-accesos.md` corrige la primera versión del spec, que ubicaba el panel dentro de Admin RP.
Las secciones reemplazadas de `requirements.md`, `design.md` y `tasks.md` están marcadas como tales
en su propio encabezado.

`reglas-plan-y-renovaciones.md` es incremental sobre lo anterior: no lo reescribe. Cada
requerimiento declara explícitamente si extiende a uno previo o si es nuevo, y cierra siete
decisiones de negocio que el analista comercial dejó planteadas. Al final lleva cinco huecos
anotados que necesitan decisión y no se inventaron.

---

## Cómo ver el prototipo

No necesita build ni dependencias. Dos opciones:

**Abrirlo directo**

```
Doble clic en preview/index.html
```

**Servirlo (recomendado, para que la carga de CSV funcione igual que en el navegador real)**

```bash
cd gestor-cobranzas/preview
python -m http.server 4173
# abrir http://localhost:4173
```

Con Node:

```bash
npx --yes serve gestor-cobranzas/preview -l 4173
```

### Qué probar

1. **Resumen** — los KPIs salen de la cartera cargada, no están escritos a mano.
2. **Cargar cartera** — arrastrá `ejemplo-cartera-yoki.csv`. El archivo trae 14 filas: 10 válidas
   y 4 con error a propósito (correo inválido, monto no numérico, documento duplicado, fecha mal
   formada). El prototipo valida fila por fila, separa válidas de inválidas y solo deja confirmar
   después de validar. Las filas con error no bloquean a las correctas.
3. **Suscriptores** — buscá, filtrá por estado y plan, abrí la ficha de alguien.
4. **Morosidad** — la pregunta central: quién debe, cuánto debe, desde cuándo, en qué tramo de
   antigüedad.
5. **Prorateo** — elegí un suscriptor, cambiale el plan y mirá el cálculo: crédito por los días no
   usados del plan viejo, cargo por los días que quedan del nuevo, y la diferencia a cobrar o a
   acreditar.
6. **Cobrar** — desde cualquier fila: generar QR, copiar link de pago, o mandar recordatorio. El
   prototipo registra el intento en la bitácora del suscriptor.
7. **Exportar** — cualquier listado baja a CSV respetando los filtros aplicados.
8. **Reglas y avisos** — elegí el nivel: Cartera, o un plan. Cada uno de los nueve grupos de la
   regla muestra de dónde sale su valor, heredado de la cartera o propio del plan, con la acción
   para declararlo propio o devolverlo a herencia. Cambiá algo y mirá la confirmación: dice cuántas
   suscripciones y cuántos cargos futuros quedan afectados, y cuántos emitidos **no** se tocan,
   porque cada cargo guarda congelada la regla con la que nació.
9. **Renovaciones** — qué renueva en 30, 60 y 90 días. Previsualizá la corrida: muestra cuántas
   emitiría y cuántas omitiría, con el motivo de cada omisión. Confirmala y después correla otra
   vez: los mismos períodos salen como `ALREADY_ISSUED`, que es la idempotencia a la vista.
10. **Lotes y cobro** — armá un lote, cerralo (queda inmutable), presentalo y bajá el archivo
    canónico. Después ingerí un retorno: hay tres simulaciones, todo aprobado, rechazo parcial y
    todo rechazado. Con rechazo parcial mirá la conciliación y reintentá: el reintento es un lote
    **nuevo** que referencia al anterior.
11. **Entrar como Jockey Plaza** — la caja de mundo tiene dos pestañas que no existen en la de
    comercio: Comercios y Política del mundo. Habilitá cobranzas a un comercio, emitile
    credenciales, y probá los dos simuladores: sin facultad delegada y con el proveedor de
    identidad caído. En Política, bajá el tope de mora y después intentá guardar una regla del
    comercio que lo pase.
12. **Cambiar de rol** — salí y volvé a entrar como operador y como solo lectura. Las acciones que
    no corresponden quedan deshabilitadas **con el motivo visible**, no escondidas.

---

## Por qué existe este frente

YOKI hoy lleva su cartera de suscriptores por fuera y cobra a mano. El valor que se le puede
entregar en la primera fase no es automatizar el cobro: es **ordenar la gestión previa**.

Que cargue su archivo y el sistema le responda tres preguntas que hoy le toma horas contestar:

- **¿Quién me debe?**
- **¿Cuánto me debe?**
- **¿Cuánto es el prorateo si cambia de plan?**

Y que desde ahí pueda disparar la cobranza: mandar el recordatorio, el QR, el link. Ese
recordatorio es donde está el valor de Red Pontis en esta fase — no en mover el dinero, sino en
que el cobro no se olvide.

El cobro automático con tarjeta tokenizada es la fase 2. El modelo de datos de la fase 1 queda
preparado para eso, pero no se construye todavía.

---

## Cómo se entrega el producto

```
Red Pontis activa la capacidad en el mundo o en el comercio
   └─ aparece la tarjeta de entrega en Admin RP
        └─ se indica el correo del titular y su rol
             └─ se crea el usuario en Cognito, se lo suma al grupo collections-*
                y se emite la credencial en portal_credential
                  └─ el titular entra por el shell, que le ofrece su caja de Cobranzas
                       └─ gestiona: crea planes, carga cartera, define reglas, cobra
```

Grupos de Cognito nuevos, resueltos por el mismo mecanismo de sufijo que los actuales:

| Grupo | Puede |
|---|---|
| `collections-admin` | todo: planes, reglas, cartera, prorateo, anulaciones |
| `collections-operator` | cargar cartera, cobrar, recordar, registrar pagos. No cambia reglas ni precios |
| `collections-readonly` | ver y exportar. Ninguna escritura |

Un mundo y uno de sus comercios pueden tener el producto a la vez, y cada uno ve **solo su
cartera**. Son carteras distintas, no una jerarquía.

---

## Lo que ya está decidido

**Activación por comercio**: tabla `merchant_module`, con el alcance declarado en el catálogo
(`scope: ['WORLD'] | ['MERCHANT'] | ambos`). Las capacidades existentes se declaran `['WORLD']` y el
resolver de capacidades **no cambia de comportamiento para ninguna**, que es lo que protege a los
cinco frentes que dependen de él.

**Credenciales**: no hace falta tabla nueva. `portal_credential` ya existe y ya tiene `scope_type`;
se le suman `COLLECTIONS_WORLD` y `COLLECTIONS_MERCHANT`.

---

## Lo que queda pendiente de definición

- **Proveedor de correo transaccional.** No existe en el monolito. Sin él, el aviso automático no
  sale; el recordatorio manual sí funciona, copiando el link.
- **Pasarela de pago.** La recarga de wallet es deliberadamente simulada. Sin pasarela, el pago se
  registra por la vía manual, que es lo que YOKI hace hoy.
- **Impersonación de soporte.** Si Red Pontis necesita entrar al panel de un cliente para
  diagnosticar, va como impersonación explícita y registrada. Sin decidir.

Ninguna de las tres bloquea la fase 1: el valor está en saber a quién cobrar, cuánto, y tener el
canal de recordatorio listo.

El incremento de `reglas-plan-y-renovaciones.md` suma cinco huecos más, anotados al final de ese
documento con el ID que les correspondería:

- **Quién dispara la corrida programada**, con qué frecuencia, y qué pasa si no hay planificador.
  En `joi360mono` no se verificó que exista uno, así que el prototipo ofrece la corrida manual y
  dice que la programada está simulada.
- **Nota de crédito y reverso de un pago ya acreditado**, incluido el reverso que el adquirente
  informa después de haber aprobado.
- **Migración de `billing_cycle` a `periodicity`** sin romper consumidores. El código nuevo usa
  siempre `periodicity`; falta el expandir, migrar, conmutar y contraer del campo viejo.
- **Alerta proactiva** cuando una corrida termina con errores o un lote queda sin conciliar.
- **Qué resuelve el enlace de pago** mientras no haya pasarela integrada.

---

## Estado

- Especificación: completa y revisable, en dos capas. La base del dominio, y el incremento de
  reglas por plan, gobierno del mundo y ciclo de cobro.
- Prototipo: funcional, con datos de ejemplo y cálculos reales en el navegador. Cubre las cuatro
  áreas del incremento: reglas afiliadas al plan, el mundo habilitando y acotando a sus comercios,
  renovaciones con corrida idempotente, y lotes con entrega al adquirente y registro de pago.
- Implementación: **no empezada**. Es lo que sigue, y va en `joi360mono`.

### Lo que el prototipo demuestra y lo que no

Demuestra comportamiento: las reglas se resuelven de verdad, el prorrateo calcula, los ciclos no se
solapan, la corrida no duplica cargos, el lote cerrado no se reabre y un pago con la misma clave no
entra dos veces. Todo eso está verificado con un arnés que ejercita el código sin navegador.

No demuestra integración: no hay base de datos, no hay Cognito real, no hay proveedor de correo y
no hay adquirente. Donde hace falta uno, el prototipo lo simula y lo dice en pantalla, en lugar de
fingir una integración que no existe.
