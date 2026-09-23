# SPEC Funcional — Asistencia

*Capacidad **planificada** (`v0.0.0`) — sin código de negocio construido. Este documento NO es una especificación funcional completa como las del resto del catálogo (ver `spec_eventos.md` para el formato de referencia): es la declaración honesta de alcance y bloqueo. Ver `no-mock.md` en `kiro_steering/`.*

Fuente: `joi360-admin/src/store.js` (`MODULE_CATALOG`, entrada `asistencia`), `supabase.js` (`MODULOS_PROXIMAMENTE`). 23-sep-2026.

## Qué es (alcance objetivo, no construido)

Registro y consulta de presencia de usuarios en actividades, clases o instalaciones — marcaciones de entrada/salida, reporte automático a padres/tutores, justificaciones de inasistencia, reportería por mundo.

- **Tier:** OPCIONAL. **Depende de:** `accesos` (`DEPENDENCY_MAP`). **`lock: "Educación"`** — solo seleccionable si la vertical del Mundo es Educación, a diferencia de cualquier otra capacidad del catálogo.
- **Sin `configFields`** — ni siquiera tiene parámetros configurables definidos todavía, a diferencia de Facturación/Crédito que al menos tienen el esqueleto de config.
- **Servicios previstos** (texto libre, no flags reales): marcaciones de entrada y salida, reporte automático a padres/tutores, justificaciones de inasistencia, reportería de asistencia por mundo, identificación TAQ o QR.

## Por qué está bloqueada

Falta especificar el flujo completo — es la única de las 3 capacidades planificadas que no tiene ni siquiera un diseño de config fields esbozado (Facturación y Crédito sí tienen `configFields` reales en el catálogo). El caso de uso es cercano a Accesos (de hecho depende de ella) pero con semántica distinta: Accesos es "¿entró o salió?" puntual, Asistencia es "¿estuvo presente en este período/actividad, con qué justificación?" — un modelo de datos distinto (sesión/período, no solo eventos de paso).

## Qué NO construir (regla dura, ver `no-mock.md`)

- Ninguna pantalla de "Mi asistencia" ni "Reporte a padres" en la superapp.
- Ningún registro de presencia simulado.
- Si un Mundo de vertical Educación activara esta capacidad por error, debe caer en el fallback genérico honesto — nunca una vista de negocio.

## Cuándo se levanta el bloqueo

Cuando exista un documento de especificación del flujo completo (equivalente al brief original "Especificación de Flujos UX" que dio origen al resto del catálogo) — sin eso, cualquier construcción sería adivinar un modelo de negocio, no implementar uno ya decidido. En ese momento, este documento se reemplaza por una SPEC funcional completa siguiendo el formato de `spec_accesos.md` (la capacidad más cercana en naturaleza, de la que depende).
