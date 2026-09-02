# Anexo Anclado — Activos del Proyecto y Guía de Construcción para Desarrollo

*Esta sección va al pie de cada corte semanal y de cada entrega a desarrollo. Se actualiza, nunca se elimina.*

## Contexto

El ecosistema JOI 360 que vive en este repo (`joi360-admin` + `joi360-app` + `joi360-operador` + `joi-pos-backend`) es un **prototipo funcional** — no el sistema de producción. El equipo de desarrollo (Salvador) toma **todo lo de este prototipo tal cual** — el render config, los flujos, los templates, el esquema de datos, los documentos vivos — como fuente de verdad, y lo **incorpora a su propio proyecto** para construir la primera versión de release. No es "adaptamos lo del prototipo a lo suyo": es que su proyecto absorbe lo nuestro completo, respetando además las vistas que su propio *steering* ya define.

Salvador construye con **Kiro** (IDE agéntico de AWS: `.kiro/specs/` con requirements/design/tasks + `.kiro/steering/` para contexto persistente del proyecto).

## Activos del proyecto

### Documentos (fuente de verdad — se toman TODOS tal cual)

| Documento | Qué es | Dónde vive |
|---|---|---|
| Mapeo de Capacidades, Dependencias y Render | Este documento — render config canónico, 22 capacidades, 6 frentes, esquema Supabase, discrepancias | `docs/arquitectura/mapeo_maestro/` |
| Historial de Tareas y Commits | Registro tarea por tarea (#102–…) con flujo técnico, flujo de usuario y journey UX unificado, más la tabla de commits reales por fase | `docs/arquitectura/historial_tareas/` |
| Roadmap de Releases | Alcance por release — qué entra en la primera versión y qué queda para después | `Escritorio/Joi360_Roadmap_Releases.docx` |
| Roadmap de Entrega DEV | Bloques de entrega para desarrollo | `Escritorio/Joi360_Roadmap_Entrega_DEV.docx` |
| Roadmap de Entrega CTO | Mapa de capacidades/paneles y propuesta de bloques, en tono de negocio | `Escritorio/Joi360_Roadmap_Entrega_CTO.docx` |
| ESTRUCTURA-CATALOGOS-Y-MUNDOS | Estructura de catálogos globales y configuración de mundos | raíz del repo (`.md`) + artefacto |
| Discrepancias / deuda técnica consolidada | §6 de este documento — hallazgos por severidad | `mapeo_maestro/src/08_discrepancias.md` |
| Incongruencias y Plan de Arreglo (auditoría 5 agentes) | Inventario por severidad, matriz de choque capacidad↔capacidad, esquema de versionado, plan de tareas por tracks independientes | `docs/arquitectura/incongruencias_y_plan_28ago.md` |
| Cotejo Prototipo ↔ Proyecto Real (Salvador / Kiro) | Cruce del corte semanal + auditoría del prototipo + auditoría R2 del proyecto real; directiva tajante de construcción en loop (qué construir y versionar hasta el corte, qué NO replicar) | `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` + `Escritorio/JOI360_Cotejo_Prototipo_vs_ProyectoReal.docx` |
| Estado verificado de BD / RPC | Qué migraciones y RPCs están aplicados en prod | `docs/arquitectura/migraciones_aplicadas.md` + `rpc_versions.md` |
| Brief vs Realidad | Análisis de brecha entre lo que el brief asume y lo que el código hace | `Escritorio/Joi360_Brief_vs_Realidad.docx` |

### Artefactos (Claude)

- ESTRUCTURA-CATALOGOS-Y-MUNDOS (documento vivo) — `claude.ai/code/artifact/3fabd920-abf3-477b-9126-ca1fdcf8ca22`
- Guión de demo E2E (3 actos: Raimondi → Kermesse → BNPL) — `claude.ai/code/artifact/f06ecd00-1432-4f24-ba6b-0d438e021a32`

### Agentes desplegados del proyecto (5)

*(Pendiente de completar por Camila — nombre + rol de cada uno, o el link del proyecto de Claude donde están. Este bloque queda anclado y se llena en el próximo corte.)*

1. ⟨pendiente⟩
2. ⟨pendiente⟩
3. ⟨pendiente⟩
4. ⟨pendiente⟩
5. ⟨pendiente⟩

## Guía de construcción para el equipo de desarrollo (Kiro)

### Regla marco

1. **Construir todo exactamente con nuestro render config.** El contrato Mundo → Capacidad → Configuración → Render (abajo) no se reinterpreta: se replica. Cada capacidad conserva sus `configFields`, su(s) tabla(s) propia(s), su template y su versión semver.
2. **Adaptar lo bueno del desarrollo actual de Salvador** — su base, su tooling, sus componentes — **pero respetando las vistas necesarias que su *steering* ya define**. Lo nuestro manda en el modelo (capacidades, activación, render dinámico, dependencias); lo suyo puede mandar en la implementación.
3. **Una capacidad a la vez, iterativo**: configurar → modificar → iterar → generar las dependencias en las tablas correspondientes → generar los scripts SQL → desplegar. Nada de automatizar las 22 de golpe.
4. **Anclar todo al documento de Release.** Release 1 = el alcance de la primera versión según `Joi360_Roadmap_Releases.docx`. Cada capacidad que entra a Release 1 se construye hasta un despliegue 100% funcional (schema corrido, capacidad activable, config por mundo, template real con datos reales, verificado en vivo).

### El contrato de render (lo que NO se cambia)

**Mundo → Capacidad → Configuración → Render dinámico:**

1. **El Catálogo de Capacidades** (`MODULE_CATALOG` en `joi360-admin/src/store.js`) define QUÉ existe: cada capacidad con su `tier` (CORE/PREMIUM/OPCIONAL), sus `servicios` (feature flags — cada uno controla qué ve y qué puede hacer el usuario en la superapp), sus `configFields`, sus dependencias, su `version` semver, y su `pricing` (negociado por Plataforma, no autoservicio).
2. **El Mundo ACTIVA y CONFIGURA** cada capacidad desde su pestaña Capacidades. Eso escribe a `world_capacity_configs` (activación + config), `world_feature_flags` (servicios ON/OFF) y `world_channel_configs` (canales de Emisión/Adquirencia). Un mundo solo puede activar servicios cuyo `dev_status` sea `ready` (nivel 1 lo define RedPontis en el Catálogo Global).
3. **La superapp RENDERIZA dinámicamente**: `useCatalogLive` / `useWorldConfig` leen `world_capacity_configs` en vivo; `TEMPLATE_MAP` resuelve cada `capacity_id` a su template dedicado; si no hay template dedicado, `GenericTemplate` arma la vista desde la config viva. El usuario ve exactamente los módulos que su mundo activó, con la config que su mundo puso.
4. **Por capacidad**: `configFields` propios (aparecen solos en la UI genérica de configuración) + tabla(s) Supabase propia(s) con RLS + template real en la superapp con datos reales (nunca mock) + su `version` que sube de `0.0.0` a `1.0.0` cuando tiene su primera versión funcional real, y ese salto queda registrado en el corte semanal.

### Steering de Kiro — archivos sugeridos para `.kiro/steering/`

- **`render-config.md`** — el contrato de arriba, literal, marcado como *always included*. Es la regla que no se negocia.
- **`capacidades.md`** — las 22 capacidades con su estado, `version`, `configFields`, tablas y dependencias (derivado de §3 de este documento).
- **`esquema-datos.md`** — el modelo de datos consolidado (derivado de §4/§6) + el patrón: RLS `demo_anon_all` en modo prototipo, `world_id` text, ids de merchant/user UUID.
- **`no-mock.md`** — regla dura: ninguna pantalla renderiza datos hardcodeados; si una parte no está construida, se dice explícitamente ("Próximamente"), no se simula. Es el criterio que ya rige todo el prototipo.

### Loop de construcción por capacidad (Kiro spec por capacidad)

Para CADA capacidad de Release 1, en orden de menor a mayor riesgo (lo que mueve dinero real, al final):

1. **requirements** — qué hace la capacidad, sus `servicios`/feature flags, sus `configFields` exactos, sus dependencias, criterios de aceptación (incluye "verificable en vivo, con datos reales").
2. **design** — tabla(s) Supabase + índices + RLS; funciones cliente (fetch/create/update); superficie donde renderiza (`TEMPLATE_MAP` o `GenericTemplate`); cómo se integra con el pago real (`mover_saldo_wallet` vía `pagarSupabase`) SIN reescribir ese RPC.
3. **tasks** — schema → activación en Catálogo → config por mundo → template → verificación en vivo.
4. **script SQL** — idempotente (`create table if not exists`, `drop policy` + `create policy`, `create index if not exists`), con `notify pgrst, 'reload schema'` al final. Se entrega el `.sql` además de aplicarlo.
5. **verificar en vivo** — activar en un mundo real, recorrer el flujo de punta a punta, confirmar la fila en Supabase.
6. **subir `version`** de `0.0.0` a `1.0.0` en el catálogo y registrar el salto (de → a) en el corte semanal.

### Estado hoy para Release 1

- **13 capacidades construidas antes de este corte** + **6 construidas esta semana** (Loyalty, Turnos, Transporte, Reservas, Estacionamiento, Subsidio) están en `v1.0.0` y verificadas en vivo.
- **3 siguen en `v0.0.0`**, bloqueadas: **Facturación** (necesita proveedor PSE + integración SUNAT), **Crédito** (alto control regulatorio + se solapa con BNPL — decisión de producto pendiente), **Asistencia** (falta especificar el flujo; bloqueada a vertical Educación).
- El alcance exacto de Release 1 (qué de lo anterior entra en la primera versión) lo fija `Joi360_Roadmap_Releases.docx`.
