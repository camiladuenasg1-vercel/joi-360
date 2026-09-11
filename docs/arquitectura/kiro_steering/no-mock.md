# No-Mock — regla dura de fallback honesto

*Marcar como always included en `.kiro/steering/`.*

**Ninguna pantalla nativa renderiza datos inventados.** Si una parte de una capacidad no está construida, se dice explícitamente ("Próximamente" / "Aún no disponible"), nunca se simula con datos de muestra que parezcan reales. Es el criterio que ya rige todo el prototipo — confirmado en código, no en intención: `LoyaltyTemplate` (v1.0.0 real) muestra la sección "Canje de puntos" con el texto honesto *"Próximamente podrás usar tus puntos como descuento o vouchers"* en vez de un catálogo de recompensas falso, pese a que canje todavía no existe. Ese es el patrón a replicar, no una excepción.

## Reglas concretas

1. **Capacidad planificada (`0.0.0`: `facturacion`, `credito`, `asistencia`) → cero View de negocio.** Cae al fallback genérico (flags + config cruda + banner "sin vista dedicada todavía"). Nunca una pantalla que parezca terminada.
2. **Sección de una capacidad construida pero con una parte pendiente → banner explícito en esa sección, no un simulacro.** Ejemplo real: `MenuTemplate` con `metodoReserva=qr` avisa que el canje en POS no está construido, en vez de fingir un cobro exitoso. Mismo criterio para cualquier View nativa: si el backend nativo aún no resuelve una parte de una capacidad ya activa, decirlo en la UI, no simularlo.
3. **Ningún KPI/contador con aritmética inventada.** Si no hay una fuente de datos real detrás de un número, no se muestra ese número — se omite el widget o se deja un estado vacío honesto.
4. **Ningún catálogo de metadata (`devStatus`, `version`, `status` de una capacidad) escrito a mano y dejado desactualizado.** Se deriva del código real o de un test de aceptación — nunca se asume que un valor viejo sigue siendo cierto. Esto ya causó 6 de 10 falsos positivos en la R2-Audit de Salvador (`catalog.js` marcaba `in_progress` capacidades ya construidas) — la causa raíz documentada en `cotejo_prototipo_vs_proyecto_real.md` §3.
5. **Ninguna credencial, PIN o hash se compara o se expone en el cliente.** Verificación siempre server-side (ver deuda del prototipo en `cotejo_prototipo_vs_proyecto_real.md` §5.4 — esto es exactamente lo que el prototipo NO debe enseñarle a copiar).

## Por qué esto importa más en nativo que en el prototipo

El prototipo es una demo funcional donde un dato "casi real" es tolerable temporalmente si está documentado como gap. El proyecto nativo de Salvador es la base de la primera versión de producción — una pantalla que simula datos ahí no es deuda técnica documentada, es un bug de cara al usuario real. Cuando haya duda entre "construir la vista completa" o "mostrar un estado honesto de que falta", siempre la segunda.
