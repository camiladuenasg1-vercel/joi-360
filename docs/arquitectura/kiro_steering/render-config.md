# Render Config — contrato de renderizado (Mundo → Capacidad → Config → Vista)

*Marcar como always included en `.kiro/steering/`. Esto no se reinterpreta: se replica, en iOS y Android, con paridad total entre las dos.*

Fecha: 11-sep-2026. Fuente: código real de `joi360-admin/src/store.js` + `supabase.js` y `joi360-app/src/pages/Module.jsx` (no de memoria ni de docs viejos — verificado línea por línea el mismo día de este documento).

---

## 1. El problema que este contrato resuelve

Hoy el proyecto nativo (iOS `Joi360App` / Android `Joi360AppAndroid`) tiene render codes (`PROMOTIONS`, `PERFIL_EXT`, `SUBSIDY`…) resueltos por `normalizedCode()` en `WorldConfigHelper`, pero **no está clonando, capacidad por capacidad, las vistas que el prototipo genera según la configuración real de cada Mundo** — ni las variaciones internas de cada pantalla que dependen de flags/config, ni las dependencias entre capacidades. Esto ya se diagnosticó una vez en `cotejo_prototipo_vs_proyecto_real.md` §3: *"el catálogo/metadata de render se desincroniza del código real"*. Este documento es el fix concreto: un contrato de render que se puede cotejar, capacidad por capacidad, contra lo que Kiro construye.

**Regla base:** ninguna capacidad se da por "clonada" solo porque existe una pantalla nativa con ese nombre. Se clona cuando esa pantalla nativa reproduce **las mismas secciones condicionadas por config/flag** que el template del prototipo, ni una más ni una menos, gateadas igual.

---

## 2. Cómo resuelve la vista el prototipo (mecánica exacta, `joi360-app/src/pages/Module.jsx`)

```
ModulePage(moduleId):
  cfg = useModuleConfig(moduleId)          // config viva del mundo para esa capacidad
  if (!cfg) return EmptyState("Módulo no disponible")

  1. templateFn = TEMPLATE_MAP[moduleId]                     // 17 de 22 capacidades tienen template dedicado
  2. si no existe: templateFn = resolvePorUxComponent(cfg)   // matchea flags ACTIVOS contra UX_SURFACE_REGISTRY (regex)
  3. si tampoco: GenericTemplate(cfg, moduleId)               // fallback HONESTO, nunca maqueta

  return templateFn(cfg, u)
```

`TEMPLATE_MAP` (`Module.jsx:5316`) — 17 entradas, una por capacidad con pantalla propia: `wallet, loyalty, reservas, control, accesos, cashback, menu, comercios, eventos, subsidio, perfil_ext, estacionamiento, promociones, turnos, transporte, bnpl, consumos, suscripciones`.

`UX_SURFACE_REGISTRY` (`Module.jsx:4891`) — fallback por semántica de flag activo, para una capacidad nueva del catálogo que todavía no tiene template propio:
```js
[ /ticket|entrada|aforo|evento/i        → EventosTemplate,
  /paga después|cuota|cronograma|bnpl/i → BNPLTemplate,
  /billetera|saldo|herobalance|wallet/i → WalletTemplate ]
```

`GenericTemplate` — cubre hoy `facturacion` (0.0.0, planificada): lista flags activos + hasta 6 config fields crudos, con banner **"Vista resuelta por configuración… sin código dedicado"**. Nunca inventa una UI de negocio.

**Dentro de cada template**, las secciones se vuelven a gatear individualmente por el mismo mecanismo (`wc.flag(capacityId, flagId)`, `wc.activo(capacityId)`, o lectura directa de `cfg.config.<campo>`). Ejemplo real (`WalletTemplate`): la sección de saldo solo aparece si `balance` está activo, P2P solo si `p2pEnabled && p2p`, Bandita NFC solo si `bandita && usaPulseraNfc`. **El render config no es "una pantalla por capacidad" — es una pantalla por capacidad MÁS N secciones condicionadas dentro de ella.** El detalle capacidad por capacidad vive en `capacidades.md` (mismo folder).

**Dependencias** (`DEPENDENCY_MAP`, `joi360-admin/src/store.js:1062`): se chequean solo al ACTIVAR una capacidad en un Mundo (adminj), como advertencia — no bloquean el render en la app si igual quedó activa. Ejemplo: `menu` depende de `inventario` porque `MenuTemplate` lee `products`; si `inventario` nunca se activó, `menu` renderiza igual pero sin catálogo real detrás. Kiro debe replicar esto como **advertencia en tiempo de activación/config del tenant**, no como gate de runtime en la vista.

---

## 3. Traducción al proyecto nativo (iOS + Android, misma paridad)

### 3.1 Un id estable = un render code (fix directo de RC-01/RC-02)

El id de capacidad del prototipo (snake_case: `perfil_ext`, `subsidio`, `promociones`…) **es el render code nativo, textual, sin traducir**. Nunca una segunda forma (`PERFIL_EXT`/`PROFILE_EXTENDED`, `SUBSIDY`/`SUBSIDIES`). Si `WorldConfigHelper.normalizedCode()` hoy mapea variantes, el fix es unificar el ORIGEN (`catalog.js` / el backend que emite el código), no seguir agregando casos a `normalizedCode()`.

### 3.2 El registro nativo (equivalente a `TEMPLATE_MAP` + `UX_SURFACE_REGISTRY` + `GenericTemplate`)

Construir (o auditar si ya existe) un `CapabilityRenderRegistry` nativo con la misma cadena de resolución de 3 pasos:

1. **View dedicada** registrada por el render code exacto — una por cada capacidad marcada `construida` en `capacidades.md`.
2. **Fallback por superficie** — si una capacidad nueva del catálogo aún no tiene View dedicada pero su semántica de flags calza con una superficie ya construida (mismo criterio que `UX_SURFACE_REGISTRY`), reusarla.
3. **Fallback genérico honesto** — lista de flags activos + config cruda, banner "sin vista dedicada todavía". **Nunca** una pantalla de negocio inventada. Esto es la regla dura de `no-mock.md`.

### 3.3 Secciones condicionadas dentro de cada View

Cada View nativa lee la MISMA config viva del tenant (el equivalente nativo de `world_capacity_configs` + `world_feature_flags`) y gatea sus propias sub-secciones con la misma condición que el template web — documentada capacidad por capacidad en `capacidades.md`, columna "Secciones condicionadas". Si el prototipo muestra 4 variantes de una pantalla según config (ej. Wallet: balance / recarga / P2P / bandita NFC, cada una independiente), la View nativa debe tener las mismas 4 condiciones — ni fusionadas, ni con menos granularidad.

### 3.4 Dependencias

`DEPENDENCY_MAP` se replica como advertencia en el flujo de activación de capacidad por tenant (mismo lugar donde Salvador ya valida `devStatus`), no como bloqueo de runtime dentro de la View. Lista completa en `capacidades.md`.

### 3.5 Capacidades planificadas — nunca enrutadas

`facturacion`, `credito`, `asistencia` están en `0.0.0` — **ninguna View de negocio para estas tres, ni siquiera un placeholder con datos de ejemplo.** Si un tenant las activa por error, cae al fallback genérico honesto (§3.2 paso 3). Esta es la causa raíz #6 del anti-patrón ya documentado en `cotejo_prototipo_vs_proyecto_real.md` §6.4.

---

## 4. El ciclo de verificación por capacidad — extensión RENDER-CHECK

Se agrega un paso explícito al loop ya definido en `cotejo_prototipo_vs_proyecto_real.md` §6.1 (`AUDIT → DETECT → CROSS-CHECK → PLAN → BUILD → VERSION → REGRESSION → CLOSE`). El CROSS-CHECK de render, específicamente, se cierra solo si las 4 preguntas dan sí:

1. ¿Existe una View nativa registrada bajo el render code exacto de la capacidad (§3.1)?
2. ¿Esa View implementa CADA sección condicionada listada en `capacidades.md` para esa capacidad, con la misma condición de flag/config?
3. ¿Respeta las dependencias de `capacidades.md` como advertencia de activación, no como dato fantasma en la vista?
4. Si la capacidad está en `0.0.0` (planificada) — ¿NO tiene ninguna View de negocio enrutada, solo el fallback genérico?

Evidencia de cierre = un test que ejercita la capacidad activada + config real (no lectura de código — la R2-Audit de Salvador ya demostró que leer código produce falsos positivos en los dos sentidos).

---

## 5. Referencias

- `capacidades.md` (mismo folder) — las 22 capacidades con versión, dependencias, config fields y secciones condicionadas.
- `no-mock.md` (mismo folder) — regla dura de fallback honesto.
- `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` — directiva general de construcción en loop, qué SÍ y qué NO replicar del prototipo.
- `docs/arquitectura/mapeo_maestro/src/01_backbone.md` y `05_frente_superapp.md` — mecánica extendida (activación por mundo, sync, wizard) para quien necesite más profundidad que este contrato.
