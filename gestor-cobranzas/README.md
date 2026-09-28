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
  README.md                      este archivo
  specs/
    frente-y-accesos.md          LEER PRIMERO — arquitectura del frente, catálogo con alcance,
                                 grupos de Cognito, entrega del producto, REQ-COB-001 a 007
    requirements.md              los requerimientos del dominio, REQ-COB-010 a 093
    design.md                    modelo de datos, contratos API, prorateo, riesgos
    tasks.md                     tareas ordenadas por dependencia, trazadas a requerimientos
  preview/
    index.html                   prototipo navegable, sin build
    app.js                       lógica real: validación de CSV, prorateo, morosidad
    ejemplo-cartera-yoki.csv     archivo de carga con filas válidas y con error
```

`frente-y-accesos.md` corrige la primera versión del spec, que ubicaba el panel dentro de Admin RP.
Las secciones reemplazadas de `requirements.md`, `design.md` y `tasks.md` están marcadas como tales
en su propio encabezado.

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

---

## Estado

- Especificación: completa y revisable.
- Prototipo: funcional, con datos de ejemplo y cálculos reales en el navegador.
- Implementación: **no empezada**. Es lo que sigue, y va en `joi360mono`.
