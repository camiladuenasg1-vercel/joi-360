# JOI360 — Mapeo de Capacidades, Dependencias y Render

Documento base de arquitectura · Versión **1.2** · 28 de agosto de 2026

Este es el documento vivo que centraliza todo lo construido en JOI360 hasta la fecha: qué capacidad hace qué, cómo se activa, de qué depende, qué renderiza en cada frente (Admin RedPontis, Panel de Mundo, Panel de Merchant, Panel de Organizador, Superapp, POS/Operador), qué tablas de Supabase la sostienen, y qué discrepancias/deuda técnica existen hoy entre lo que el negocio asume y lo que el código realmente hace.

## Cómo usar este documento

Este documento es la **base**. A partir de acá se van a generar documentos de actualización cada vez que se cierre un bloque de construcción sustancial (una nueva capacidad, un cambio de arquitectura, un fix de una discrepancia listada acá) — cada actualización va a reflejar exactamente qué cambió respecto a la versión anterior, con su propio número de versión.

Este documento se le entrega al equipo de desarrollo (incluyendo al desarrollador que está construyendo en paralelo bajo su propio esquema de migración) como fuente de verdad de: qué existe, cómo está conectado, y qué patrón de diseño/render seguir para que las nuevas construcciones sean consistentes con lo que ya funciona en producción — mismas convenciones de datos, mismo lenguaje de componentes, mismas reglas de dependencia entre capacidades.

**Estructura del documento:**
1. Modelo mental — cómo encajan Mundo, Capacidad, Configuración y Render entre sí, y quién es cada uno de los 6 "frentes" del ecosistema.
2. Backbone técnico — el mecanismo real de activación/sincronización de capacidades (para quien va a tocar código).
3. Registro de Capacidades — las 22 capacidades del plan de negocio, una por una: qué es, cómo se activa, de qué depende, su estado real (construida / parcial / planificada) y su **versión de capacidad** (semver por capacidad, desde el 26-ago).
4. Flujos de usuario, experiencia y modelo de datos, por cada frente — Admin RedPontis, Panel de Mundo/Merchant/Organizador, Superapp, POS/Operador.
5. Sistema de diseño y render config compartido.
6. Discrepancias y deuda técnica consolidada — con severidad.
7. Backlog / próximos pasos para la siguiente tanda.
8. Anexo anclado — activos del proyecto (documentos, artefactos, agentes) y guía de construcción para el equipo de desarrollo (Kiro). Va al pie de cada corte y de cada entrega a dev.

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-08-12 | Primera versión del documento base. Cubre las 22 capacidades del plan de negocio (16 construidas total o parcialmente, 6 aún planificadas), los 6 frentes del ecosistema completos con flujos de usuario/experiencia/modelo de datos, el registro de esquema Supabase consolidado (más de 45 tablas), el sistema de diseño de los 2 frentes web (admin + superapp), y 12 discrepancias/hallazgos de deuda técnica priorizados por severidad — incluyendo un hallazgo de seguridad de severidad alta en la RPC de movimiento de saldo (`mover_saldo_wallet`). |
| 1.1 | 2026-08-24 | Corte semanal. Cerrado el hallazgo de seguridad #1 (`mover_saldo_wallet`, `fix-234`) y el flujo de precompra del lado del asistente. Suscripciones ganó un segundo mecanismo real — membresía recurrente con marca propia (modelo YOKI). Cashback ganó modalidad configurable (flat/por_comercio) y cola de aprobación de cambios. Dos bugs encontrados y corregidos en verificación en vivo (comercios afiliados sin nombre en Suscripciones; tile de Cashback con data mockeada). Dos discrepancias nuevas documentadas (#13 caché de capacidades en el admin, #14 activación informal del POS/Operador de Mundo). Rebranding JoiSolutions (Navy + Gold) e instalación como PWA en ambos frentes. Se entregó además un roadmap de bloques de entrega para el CTO (documento aparte, `Joi360_Roadmap_Entrega_CTO.docx`), dejando explícito que este ecosistema es un prototipo funcional — la decisión de qué construir en el sistema real es de desarrollo (Salvador) y del CTO. |
| 1.2 | 2026-08-28 | Corte semanal. **Versionado de capacidades** — cada entrada de `MODULE_CATALOG` lleva ahora su propio `version` semver, visible en el Catálogo de Capacidades; nueva sección "Versión de capacidad — de → a" en el Registro (§3). **6 capacidades planificadas construidas a v1.0.0**: Loyalty, Turnos (food court), Transporte, Reservas, Estacionamiento, Subsidio — sus 4 migraciones (`turno_pedidos`, `reservas`, `estacionamiento_sesiones`, `subsidios`) se corrieron y se verificaron en vivo de punta a punta el 28-ago. Promociones pasó al flujo estándar de capacidades (Discrepancia #10 cerrada). Discrepancias #13/#14/#15 cerradas (refresco de capacidades por sesión, POS/Operador como canal formal, catálogo global de canales que no releía de Supabase). Un bug de timezone encontrado y corregido en la verificación en vivo (`ReservasTemplate`, fecha un día antes). Nuevo **Anexo anclado** (§8): activos del proyecto — documentos, artefactos y agentes — que acompaña cada corte y cada entrega a desarrollo. |

*Corte semanal: viernes. Próxima actualización: 04-sep-2026.*
