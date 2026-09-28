# Gestor de Cobranzas — especificación y prototipo

Frente nuevo para **Admin RP**: un motor de cobranzas activable por comercio, pensado para el
caso YOKI dentro del mundo Jockey Plaza.

Este directorio **no es código de producción**. Es el paquete que Salvador ancla e implementa
dentro de `joi360mono`: especificación, contratos y un prototipo navegable que fija el
comportamiento esperado antes de escribir la feature.

---

## Qué hay acá

```
gestor-cobranzas/
  README.md                      este archivo
  specs/
    requirements.md              22 requerimientos verificables con criterios de aceptación
    design.md                    arquitectura, modelo de datos, contratos API, reuso de Admin RP
    tasks.md                     tareas ordenadas por dependencia, trazadas a requerimientos
  preview/
    index.html                   prototipo navegable, un solo archivo, sin build
    ejemplo-cartera-yoki.csv     archivo de carga de ejemplo, con filas válidas y con error
```

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

## Decisión de arquitectura que hay que tomar antes de construir

Hoy en Admin RP las capacidades se activan **por mundo** (`world_module`). Para este caso la
capacidad tiene que activarse **por comercio**: Jockey Plaza es el mundo, YOKI es un comercio
dentro de él, y el gestor de cobranzas se le entrega a YOKI, no a todo Jockey Plaza.

Eso no existe hoy. `design.md` lo detalla en la sección 7 y `tasks.md` lo pone como primera
tarea bloqueante, porque el resto del frente depende de esa decisión.

---

## Estado

- Especificación: completa y revisable.
- Prototipo: funcional, con datos de ejemplo y cálculos reales en el navegador.
- Implementación: **no empezada**. Es lo que sigue, y va en `joi360mono`.
