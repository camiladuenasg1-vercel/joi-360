# SPEC Funcional — BNPL / Paga Después (Casos TEC V2 · Caso 1 — Mok)

*Documento de especificación funcional, no un registro de iteraciones. Describe BNPL tal como existe construido y verificado en el prototipo JOI 360 al 23-sep-2026. Sigue el mismo formato y profundidad que `spec_eventos.md` (documento de referencia del catálogo). BNPL ya declaraba sus 4 microservicios en `MODULE_CATALOG` (`elegibilidad`, `limites`, `programa`, `contratos`) — este documento profundiza cada uno con la lógica de negocio real.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `BNPLTemplate`; `joi360-admin/src/supabase.js`, `joi360-app/src/supabaseClient.js`, `joi360-admin/src/Fronts.jsx`, `joi360-admin/src/OperadorApp.jsx`), leído línea por línea el mismo día de este documento. Complementa `docs/arquitectura/kiro_steering/capacidades.md`.

---

## 1. Propósito y alcance

BNPL ("Buy Now, Pay Later" / "Paga después") es la capacidad `bnpl` de `MODULE_CATALOG` — financiamiento de compras en cuotas, en marca blanca, dentro del ecosistema de un Mundo. Es la capacidad opcional más elaborada del catálogo después de Eventos: cubre desde la elegibilidad del usuario, pasando por la configuración del programa a nivel Mundo y Comercio, hasta el ciclo de vida completo de un contrato — firma, cronograma, mora, y 9 acciones administrativas de gestión.

**Caso TEC de origen:** Caso 1 — Mok (comercio real: Hiraoka), el primero de los tres casos técnicos fundacionales (Caso 1 = Mok/BNPL, Caso 2 = Raimondi/Wallet-Comercios, Caso 3 = Kermesse/Eventos). Motor backend construido el 21-jul-2026 (Gantt #27-#31); las 9 acciones administrativas de gestión del financiamiento se cerraron el mismo mes; productos financiables por alcance (catálogo/categorías/puntuales) + campañas temporales se agregaron el 28-jul (Gantt #61).

**Fuera de alcance de este documento:** Wallet (se reutiliza para el cobro real), Comercios (Programa del Comercio vive dentro de su panel), Crédito (capacidad hermana, `v0.0.0` planificada — ver `spec_credito.md`, explícitamente NO reemplazada por BNPL pero sí el único mecanismo real de financiamiento hoy).

---

## 2. Modelo de negocio — techo de 2 niveles con clamping

BNPL tiene una jerarquía de configuración de 2 niveles, donde el nivel inferior **solo puede restringir, nunca ampliar**, lo que define el nivel superior (mismo patrón de "clamping" que los canales de emisión):

```
Nivel 1 — Mundo (techo, configFields de la capacidad)
  cuotas3 / cuotas6 / cuotas12 (switches) → cuotasTecho
  diasGracia (número, máx. 10)
  scoreObligatorio (switch)
  sinEvaluacion (switch, def. true — modalidad "marca blanca")
  montoMaxBNPL (currency, def. 3000)
  moraMaxPct (número, def. 5 — % máximo que un comercio puede cobrar por mora)
        │
        ▼ el Comercio HEREDA este techo — solo puede reducirlo
Nivel 2 — Programa del Comercio (bnpl_programa_comercio, por world_id+merchant_id)
  cuotas_activas[] ⊆ cuotasTecho (intersección real al momento de comprar, no solo validación de UI)
  dias_gracia (puede ser más estricto que el del mundo, nunca más laxo)
  gestion_mora: "sin_cargo_suspension" | "con_cargo"
  mora_pct ≤ moraMaxPct del mundo
  alcance: "catalogo" | "categorias" | "puntuales"
  frecuencia: "mensual" | "quincenal" | "semanal" | "personalizada" (+ dias_personalizados)
  revenue_share_pct, comision_pct, cuota_inicial
```

**Cálculo real en el checkout** (`BNPLTemplate.cuotasDisponibles`): `cuotasTecho.filter(n => sel.prog.cuotas_activas.includes(n))` — intersección explícita en cada compra, no un valor cacheado. Si el comercio ofrece 12 cuotas pero el mundo bajó su techo a 6, el usuario solo ve 6 como máximo, sin importar lo que el comercio configuró.

**Elegibilidad** (`microservicio elegibilidad`): 3 modalidades — `sin_evaluacion` (marca blanca, aprobación inmediata), `score_interno` (RedPontis), `integracion_personalizada` (score externo del mundo). Hoy solo `sin_evaluacion` tiene lógica real construida — las otras 2 son opciones de catálogo sin motor de scoring detrás (documentado, no simulado con un score falso).

---

## 3. Jerarquía de microservicios

### 3.1 Elegibilidad / Evaluación
**Dónde:** `BNPLTemplate.evaluar()` (`Module.jsx`). **Config:** `sinEvaluacion` (Mundo).

Si `sinEvaluacion=true` (default), `evaluar()` salta directo a `fase="aprobado"` sin crear ninguna solicitud pendiente — es una aprobación inmediata client-side. Si el mundo exige evaluación (`sinEvaluacion=false`), se crea un `bnpl_contratos` real en `estado="pendiente_aprobacion"` (`crearContratoBNPLLive`) — la solicitud queda visible en el panel del comercio con el **historial real del usuario** (otros contratos, mora) antes de decidir. El usuario ve `fase="pendiente_aprobacion"` con un botón "Verificar estado" de refresh manual (sin polling automático — mismo patrón de refresh manual del resto del proyecto).

**Regla de negocio real, no cosmética:** una solicitud `pendiente_aprobacion`/`rechazado` está explícitamente excluida del ciclo automático de mora (`evaluarCicloContrato` retorna temprano para esos 2 estados) — evita que una solicitud aún sin aprobar se marque "vencida" por fecha antes de existir como financiamiento real.

### 3.2 Límites del Mundo
**Dónde:** `configFields` de la capacidad (`MundoDetail.jsx`, drawer genérico). Sin componente propio — es puro dato de config, el techo descrito en §2. No tiene tabla propia; vive en `world_capacity_configs.config`.

### 3.3 Programa del Comercio
**Dónde:** panel del Comercio en `Fronts.jsx` (`ProgramaBNPLPanel` + `CampanasBNPLPanel`). **Tabla:** `bnpl_programa_comercio` (unique `world_id+merchant_id`), `bnpl_campanas`.

Cada comercio activa su propio programa dentro del techo del mundo: `cuotas_activas[]`, `comision_pct` (def. 5), `revenue_share_pct` (def. 30), `gestion_mora` (sin_cargo_suspension | con_cargo), `mora_pct`, `frecuencia` (+ `dias_personalizados` si es "personalizada"), `dias_gracia` (override opcional del mundo), `cuota_inicial`, `activo`.

**Productos financiables — 3 alcances** (Gantt #61, resuelto en `productosFinanciablesDe()` del lado app):
- `puntuales` — lista manual (`productos_financiables[]`), el comportamiento original.
- `catalogo` — TODO el catálogo real del comercio (`products` filtrado por `merchant_id`).
- `categorias` — filtrado por `categorias[]` del programa contra `products.category`.

**Campañas temporales** (`bnpl_campanas`: `nombre, fecha_inicio, fecha_fin, productos[]`) amplían la elegibilidad mientras están vigentes por fecha — se suman siempre al alcance base, sin duplicar productos ya incluidos. Chequeo de vigencia en **fecha local**, no `toISOString()` (bug histórico ya corregido: una campaña vigente podía leerse como vencida horas antes en horario de tarde/noche en Lima).

**Suspensión por mora** (`comercioSuspendido`, regla de negocio real): si `gestion_mora==="sin_cargo_suspension"` y el usuario tiene CUALQUIER contrato `en_mora`/`suspendido` con ESE comercio específico, se bloquean nuevas compras BNPL ahí (no en otros comercios) — banner explícito "Compras BNPL suspendidas en este comercio por mora pendiente".

**Solicitud iniciada por el Operador** (`crearSolicitudBNPLDesdeOperador`, `OperadorApp.jsx` → `SolicitudBNPLOperador`): mismo esquema que el flujo self-service de la app, pero disparado por el operador físico del comercio (identifica al cliente por código, elige producto/cuotas, crea la solicitud) — para el caso de un cliente que compra en el mostrador, no desde su celular.

### 3.4 Operación / Contratos
**Dónde:** `BNPLTemplate` (checkout + gestión propia), `bnpl_contratos`. El microservicio más grande — 4 piezas reales:

**a) Checkout y firma** — flujo de fases: `idle → evaluando → (pendiente_aprobacion | aprobado) → pago → firmado | rechazado`. El cobro de la 1ra cuota es un checkout **simulado tipo Culqi** (tarjeta dummy `4111 1111 1111 1111`, `12/28`, `123`, badge explícito "Checkout embebido · contrato Culqi (simulado para demo)") — **sin integración PSP real**. El contrato solo se confirma (`estado="firmado"`) si el cobro simulado "se confirma"; la cuota 1 del cronograma nace `estado:"pagada"` desde el inicio, nunca `"pendiente"`.

**b) Cronograma** (`cronogramaDe`, función compartida cliente): genera `{n, fecha, monto, estado}[]` según cuotas/interés/`dias_gracia`/`frecuencia`/`dias_personalizados`. Interés por N de cuotas (`INTERES_POR_CUOTAS`) — 3 cuotas sin interés, 6/12 con interés anual aplicado sobre el monto total antes de dividir.

**c) Ciclo de vida automático** (`evaluarCicloContrato`/`sincronizarCicloBNPL`, DUPLICADO a propósito en admin y app — cada front evalúa los contratos que ve, el admin los de todo el mundo, la app los del usuario): al cargar los contratos, cada cuota `pendiente` cuya fecha + `dias_gracia` ya pasó se marca `vencida`; si hay al menos una vencida, el contrato entero pasa a `suspendido` (si `gestion_mora="sin_cargo_suspension"`) o `en_mora` (si `"con_cargo"`). Una transición NUEVA a `suspendido` dispara `crearNotificacionBNPL` real. Sin cron/Edge Function — evaluación "on-load", mismo patrón que el resto del proyecto (SPA + PostgREST puro, sin backend de scheduler).

**d) 9 acciones administrativas** (panel del comercio, sobre un contrato ya firmado — `supabase.js:1383-1470`): `reprogramarCuotasBNPL`, `modificarFechaCuotaBNPL`, `refinanciarBNPL`, `condonarInteresesBNPL`, `eliminarMoraBNPL`, `aplicarDescuentoBNPL`, `registrarPagoManualBNPL`, `cancelarAnticipadoBNPL`, `declararIncobrableBNPL`. Todas siguen el mismo patrón: recalculan `cronograma`/`estado` vía `updateContratoBNPL()` + registran una notificación en `bnpl_notificaciones` (mecanismo de "avisar a RedPontis"). **Gap documentado a propósito, no un olvido:** ninguna de las 9 dispara una re-aceptación interactiva del usuario en la app cuando la acción altera condiciones ya aceptadas (el brief original lo pedía) — construir ese flujo es una superficie nueva completa en `joi360-app`, no incluida todavía.

**Pago de cuota (usuario, self-service):** `pagarCuotaBNPLUsuario` — débito real contra la wallet del usuario en ese mundo, mismo mecanismo de pago del resto del ecosistema.

---

## 4. Modelo de datos completo

```
bnpl_programa_comercio
  id, world_id, merchant_id, merchant_nombre,
  cuotas_activas (int[]), comision_pct, revenue_share_pct,
  productos_financiables (jsonb — modo puntuales),
  gestion_mora (sin_cargo_suspension | con_cargo), mora_pct,
  frecuencia (mensual | quincenal | semanal | personalizada), dias_personalizados,
  dias_gracia, alcance (catalogo | categorias | puntuales), categorias (text[]),
  cuota_inicial, activo
  -- unique (world_id, merchant_id)

bnpl_campanas
  id, world_id, merchant_id, nombre,
  fecha_inicio, fecha_fin, productos (jsonb — ids del catálogo del comercio)

bnpl_contratos
  id, world_id, merchant_id, merchant_nombre, user_id,
  producto, monto, cuotas, dias_gracia, interes_pct,
  gestion_mora, frecuencia, primer_venc,
  cronograma (jsonb: [{n, fecha, monto, estado}]),
  estado (pendiente_aprobacion | rechazado | rechazo_motivo |
          aprobado | firmado | en_mora | suspendido |
          cerrado | incobrable),
  created_at

bnpl_notificaciones
  id, world_id, merchant_id, contrato_id, tipo, mensaje,
  leida (bool), created_at
```

Tabla reutilizada sin cambio de esquema: `wallets`/`transactions` (cobro real de cuotas vía el mismo mecanismo de pago del ecosistema), `products` (base del alcance `catalogo`/`categorias`).

---

## 5. Render config

`BNPLTemplate` es el template dedicado de `TEMPLATE_MAP.bnpl` — 3 vistas internas por tab (`vista`: `comercios | activos | historial`), sin usar el mecanismo de `ux_components`/registry de Eventos (esa granularidad no se generalizó a BNPL). La UI condicional real:

- **Hero**: techo de cuotas del mundo (`cuotasTecho`), siempre visible.
- **Tab "Comercios con BNPL"**: descubrimiento — un `SectionCard` por comercio con programa activo, productos financiables resueltos por alcance, banner de suspensión si aplica, bloqueo si el producto supera `montoMaxBNPL`.
- **Tab "Mis Planes"**: contratos activos (`estado !== cerrado/incobrable/rechazado`), expandible por contrato — cronograma con botón "Pagar cuota" por línea pendiente, banners de estado (suspendido/pendiente_aprobación).
- **Tab "Historial"**: contratos terminales (`cerrado | incobrable | rechazado`), componente `HistorialContratoBNPL`.
- **Flujo de financiamiento** (`if (sel)` — reemplaza toda la vista principal): selector de cuotas → fase de evaluación → contrato digital con cronograma completo → checkout simulado → confirmación.

---

## 6. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **Admin RP** | Sin panel propio — BNPL es config de Mundo/Comercio, no cross-mundo como Eventos | — |
| **BackOffice Mundo** | `configFields` de la capacidad (`MundoDetail.jsx`) + `ConsolidadoBNPLMundo`/`BNPLChartMundo` (`Fronts.jsx`) | Techo del mundo, vista consolidada de cartera/mora por comercio |
| **BackOffice Comercio** | `ProgramaBNPLPanel`, `CampanasBNPLPanel`, `ReportesBNPLComercio` (bandeja de solicitudes + 7 métricas), `BnplContratoDrawer` (las 9 acciones), `BNPLNotificacionesBanner` (`Fronts.jsx`) | Configurar programa, aprobar/rechazar solicitudes, gestionar contratos activos |
| **App Operador** | `SolicitudBNPLOperador` (`OperadorApp.jsx`) | Iniciar una solicitud BNPL desde el mostrador físico |
| **App Usuario** | `Module.jsx` → `BNPLTemplate` | Descubrir, evaluar, firmar, pagar cuotas, ver historial |

---

## 7. Reglas de negocio críticas (resumen ejecutable)

1. Las cuotas ofrecidas al usuario son SIEMPRE la intersección mundo∩comercio, recalculada en cada compra — nunca un valor cacheado ni solo validado en la UI.
2. `montoMaxBNPL` del mundo bloquea un producto específico aunque el comercio lo tenga listado como financiable.
3. Suspensión por mora es por comercio, no global — un usuario en mora con el Comercio A puede seguir comprando BNPL en el Comercio B.
4. Solicitudes `pendiente_aprobacion`/`rechazado` quedan explícitamente fuera del ciclo automático de mora (no se marcan "vencidas" antes de existir como financiamiento real).
5. El checkout de la 1ra cuota es un simulacro explícito (Culqi, tarjeta dummy) — marcado como tal en la propia UI, nunca presentado como cobro real a un PSP.
6. Las campañas de productos financiables se evalúan en fecha LOCAL, no UTC.
7. Las 9 acciones administrativas sobre un contrato firmado registran notificación real, pero NINGUNA dispara re-aceptación del usuario — gap documentado, no construido.
8. BNPL explícitamente NO depende de Crédito ni lo reemplaza como concepto de producto — son capacidades hermanas independientes (`DEPENDENCY_MAP.bnpl = [wallet, comercios]`).
9. El pago de una cuota (self-service o vía las 9 acciones administrativas) reutiliza el mecanismo de pago real de Wallet — cero lógica de dinero paralela.

---

## 8. Estado y versionado

Capacidad `bnpl` — **v1.0.0**, `tier: OPCIONAL`, depende de `wallet, comercios`. Los 4 microservicios de §3 están construidos y verificados end-to-end contra datos reales del Caso Mok (comercio Hiraoka) — la lógica de negocio (elegibilidad, cronograma, mora, clamping) es real y completa. **Parcial, documentado, no simulado:** el checkout de PSP es un simulacro explícito (no hay integración Culqi/Qubit real), y la re-aceptación interactiva del usuario ante una modificación administrativa del contrato no está construida.

**Hallazgo al escribir este documento:** no se encontró ninguna inconsistencia nueva entre el código y lo ya documentado en memoria de sesiones anteriores — el motor de BNPL descrito acá coincide con el histórico de construcción (Gantt #27-#31, #61). El único dato no verificado de forma exhaustiva en esta pasada es el contenido completo de `ReportesBNPLComercio` (las "7 métricas" exactas) — no se leyó línea por línea por alcance de tiempo; quien lo necesite con precisión debe releer ese componente directo en `Fronts.jsx`.

---

## 9. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` — entrada resumida de `bnpl` en el catálogo de 22 capacidades.
- `docs/arquitectura/spec_capacidades/spec_eventos.md` — formato de referencia de este documento.
- `docs/arquitectura/spec_capacidades/spec_credito.md` — capacidad hermana planificada, no reemplazada por BNPL.
- `docs/arquitectura/cotejo_prototipo_vs_proyecto_real.md` — directiva de qué debe replicar el proyecto nativo de Salvador; BNPL es una de las 19 capacidades `v1.0.0` (parcial, checkout simulado documentado ahí también).
