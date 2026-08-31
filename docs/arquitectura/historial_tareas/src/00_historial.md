# JOI360 — Historial de Tareas y Commits

Documento vivo · Versión **1.3** · 28 de agosto de 2026

Registro completo de las 150 tareas trabajadas en este monorepo (`#102`–`#251`) y de los 194 commits reales de git que representan el código que efectivamente cambió, organizados en 9 fases cronológicas — del 1 de agosto al 28 de agosto de 2026. Cada tarea describe qué se pidió, qué se resolvió, el flujo/diseño técnico, el flujo de usuario, y el journey UX unificado entre plataformas — pensado para que cualquiera que no haya visto la construcción entienda exactamente qué existe hoy, cómo funciona, y qué recorrido completo vive la persona que lo usa, sin necesitar contexto adicional.

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-08-12 | Primera versión — 132 tareas (#102–#233), 163 commits, 7 fases cronológicas. |
| 1.1 | 2026-08-12 | Cada tarea ahora describe qué se pidió, qué se resolvió, el flujo/diseño, el flujo de usuario, y el journey UX unificado (touchpoints encadenados en base a los commits reales) — no solo título + commit. |
| 1.2 | 2026-08-24 | Corte semanal — 11 tareas nuevas (`#234`–`#243`): rebranding JoiSolutions, PWA, 2 bugs de formato/regresión de seguridad, Suscripciones real (modelo YOKI) + Cashback por comercio, 2 bugs encontrados y corregidos en verificación en vivo, y el roadmap para el CTO. Solo se agregan los cambios desde el corte anterior — el histórico previo no se reescribe. |
| 1.3 | 2026-08-28 | Corte semanal — 8 tareas nuevas (`#244`–`#251`): versionado semver por capacidad; 6 capacidades planificadas construidas a `v1.0.0` (Loyalty, Turnos food court, Transporte, Reservas, Estacionamiento, Subsidio) con sus 4 migraciones corridas y verificadas en vivo de punta a punta el 28-ago; Promociones al flujo estándar de capacidades; saldo compartido entre sucursales (Etapa B); 2 fixes de admin (refresco de capacidades por sesión, catálogo global de canales) que cierran las Discrepancias #13/#14/#15; 1 bug de timezone en `ReservasTemplate` corregido en la verificación. Solo lo nuevo desde el corte anterior. |

*Corte semanal: viernes. Próxima actualización: 04-sep-2026.*

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Tareas registradas | 150 |
| Tareas completadas | 148 |
| Tareas pendientes | 2 |
| Commits reales en el repo | 194 |
| Commits con tarea identificada | 54 |
| Rango de fechas | 2026-08-01 a 2026-08-28 |

## Cómo leer este documento

Cada tarea se describe en 5 partes: **Instrucción de trabajo** (la solicitud, en forma de instrucción clara — reconstruida para que se lea como un encargo, no como un título de ticket), **Qué se resolvió** (el resultado real, con los commits que lo prueban), **Flujo / diseño técnico** (cómo funciona por dentro), **Flujo de usuario** (qué experimenta la persona que usa esa parte del producto, o una nota explícita de que el cambio es interno y no tiene flujo de usuario propio), y **Journey UX unificado** (la cadena de touchpoints reales que atraviesa — Admin RedPontis, Panel de Mundo, POS/Operador, Superapp — en el orden en que efectivamente se recorre, para dejar explícito cómo se conecta cada plataforma con las demás en vez de describirlas por separado). Al final de cada fase se lista además la tabla completa de commits reales de esa fase, con hash de git, para quien necesite el detalle línea por línea.


# Fase: Arranque del monorepo y Motor de Eventos
*01-ago a 02-ago*

### #102 — Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales
Estado: 🟢 Completado

**Instrucción de trabajo:** Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales

### #103 — Poder revertir/reabrir el popup de elección de modo de Eventos
Estado: 🟢 Completado

**Instrucción de trabajo:** Poder revertir/reabrir el popup de elección de modo de Eventos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Poder revertir/reabrir el popup de elección de modo de Eventos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Poder revertir/reabrir el popup de elección de modo de Eventos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Poder revertir/reabrir el popup de elección de modo de Eventos

### #104 — Cola de requerimiento de hardware para el mundo (banditas + POS)
Estado: 🟢 Completado

**Instrucción de trabajo:** Cola de requerimiento de hardware para el mundo (banditas + POS)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Cola de requerimiento de hardware para el mundo (banditas + POS)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Cola de requerimiento de hardware para el mundo (banditas + POS)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. Cola de requerimiento de hardware para el mundo (banditas + POS)

### #105 — Embebido: Motor de Eventos vive DENTRO del panel del mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** Embebido: Motor de Eventos vive DENTRO del panel del mundo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Embebido: Motor de Eventos vive DENTRO del panel del mundo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Embebido: Motor de Eventos vive DENTRO del panel del mundo).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Embebido: Motor de Eventos vive DENTRO del panel del mundo

### #106 — Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo
Estado: 🟢 Completado

**Instrucción de trabajo:** Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo

### #107 — Registro real en el superapp con verificación de correo
Estado: 🟢 Completado

**Instrucción de trabajo:** Registro real en el superapp con verificación de correo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Registro real en el superapp con verificación de correo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Registro real en el superapp con verificación de correo).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Registro real en el superapp con verificación de correo

### #108 — Módulo de usuarios por mundo en RedPontis + KPIs para el mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** Módulo de usuarios por mundo en RedPontis + KPIs para el mundo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Módulo de usuarios por mundo en RedPontis + KPIs para el mundo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Módulo de usuarios por mundo en RedPontis + KPIs para el mundo).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Panel de Mundo. Módulo de usuarios por mundo en RedPontis + KPIs para el mundo

### #109 — Sacar JOI Promos del alcance activo
Estado: 🟢 Completado

**Instrucción de trabajo:** Sacar JOI Promos del alcance activo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Sacar JOI Promos del alcance activo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Sacar JOI Promos del alcance activo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #110 — P2P deja billeteras en negativo (bug real de saldo)
Estado: 🟢 Completado

**Instrucción de trabajo:** P2P deja billeteras en negativo (bug real de saldo)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("P2P deja billeteras en negativo (bug real de saldo)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (P2P deja billeteras en negativo (bug real de saldo)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). P2P deja billeteras en negativo (bug real de saldo)

### #111 — POS: pantalla de acceso con ficha del usuario e historial
Estado: 🟢 Completado

**Instrucción de trabajo:** POS: pantalla de acceso con ficha del usuario e historial

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("POS: pantalla de acceso con ficha del usuario e historial") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (POS: pantalla de acceso con ficha del usuario e historial).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). POS: pantalla de acceso con ficha del usuario e historial

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-01 | `8149523` | JOI 360 - monorepo del ecosistema (admin + super app + migraciones SQL) |
| 2026-08-02 | `4c04624` | POS T6: viewport seguro, escáner con permiso, accesos sin zonas y aviso al apoderado |
| 2026-08-02 | `5e7604e` | Cuentas reales en el superapp y módulo de usuarios por mundo |
| 2026-08-02 | `7b0023c` | P2P: rechazar montos no positivos antes de mover saldo |
| 2026-08-02 | `ebf4cf8` | Acceso en el POS: quién pasó, no solo que pasó. Y búsqueda por documento otra vez viva |
| 2026-08-02 | `c76fe51` | JOI Promos vuelve a Próximamente y se revierten los +120 fantasma |
| 2026-08-02 | `30d3a9c` | Eventos: un solo selector de modelo, reversible, y plano del recinto |
| 2026-08-02 | `70034f1` | El modelo de eventos deja de vivir solo en el navegador, y el mundo tiene su carrusel |
| 2026-08-02 | `5b1316b` | Una entrada usada deja de parecer usable en el superapp |
| 2026-08-02 | `d7f61f0` | Cola de hardware: el mundo pide, RedPontis ve la demanda y responde |
| 2026-08-02 | `eed1b6e` | Diagnóstico de la arquitectura actual (paso 1 del rediseño) |

*11 commits en esta fase.*

# Fase: Seguridad crítica de Wallet + limpieza de datos fantasma
*03-ago a 04-ago*

### #112 — QA end-to-end con 5 agentes sobre todo el ecosistema
Estado: 🟢 Completado

**Instrucción de trabajo:** QA end-to-end con 5 agentes sobre todo el ecosistema

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("QA end-to-end con 5 agentes sobre todo el ecosistema") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (QA end-to-end con 5 agentes sobre todo el ecosistema).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #113 — Rediseño arquitectónico del Core Platform JOI360 (ADR + diseño, sin código)
Estado: 🟢 Completado

**Instrucción de trabajo:** Repensar la arquitectura del Core Platform desde cero antes de seguir agregando capacidades, para que cada una nueva encaje en un mismo patrón (Mundo -> Capacidad -> Configuración -> Render) en vez de resolverse caso por caso.

**Qué se resolvió:** Se documentó un ADR (Architecture Decision Record) formal más un roadmap técnico: el catálogo maestro de capacidades (MODULE_CATALOG), el mapa de dependencias entre capacidades (DEPENDENCY_MAP), y el mecanismo de sincronización local-Supabase que hoy sostiene todo el sistema.

**Flujo / diseño técnico:** RedPontis define capacidades en un catálogo global -> el mundo activa un subconjunto -> cada capacidad trae su propia configuración -> la app (superapp, admin, POS) lee esa configuración en vivo y decide qué renderizar, sin hardcodear reglas por mundo.

**Flujo de usuario:** No es una feature con flujo de usuario directo -- es la base arquitectónica que hace posible que cada capacidad nueva (Wallet, Comercios, Eventos, etc.) tenga un flujo de usuario consistente en todos los frentes.

**Journey UX unificado:** Admin RedPontis (Catálogos Globales) → Panel de Mundo (activación de la capacidad) → Superapp / POS (render final). Este ADR es el journey maestro del que se desprenden todos los journeys específicos del resto de tareas: cualquier capacidad nueva atraviesa las mismas 3 paradas, en el mismo orden, sin excepción.

### #114 — CRÍTICO: la llave anónima del bundle expone PIN de POS y datos bancarios, y permite escribir dinero
Estado: 🟢 Completado

**Instrucción de trabajo:** Corregir una vulnerabilidad crítica: la llave anónima de Supabase, expuesta en el bundle público del frontend, permitía leer el PIN de operador de POS y datos bancarios en texto plano, y escribir saldo directamente sin pasar por ninguna validación.

**Qué se resolvió:** Se migró el movimiento de saldo a una función RPC atómica server-side (mover_saldo_wallet) con REVOKE UPDATE sobre wallets.balance -- la única forma de mover saldo real pasa a ser esa función, nunca un UPDATE directo desde el cliente. Los PIN de operador se hashean server-side (merchants.pos_pin_hash, worlds.pos_pin_hash) en vez de guardarse en texto plano.

**Flujo / diseño técnico:** Cliente llama a la RPC con los parámetros de la operación -> la función toma un lock de fila sobre la wallet, valida saldo suficiente, inserta la transacción -- todo en una sola transacción atómica de Postgres, invisible e inmodificable desde el cliente.

**Flujo de usuario:** Transparente para el usuario final -- cobra/recarga exactamente igual que antes. La diferencia es que ya no existe ningún camino desde el navegador que pueda escribir saldo sin pasar por esa validación.

**Journey UX unificado:** Superapp / POS (el usuario o el operador inician la operación) → Supabase RPC `mover_saldo_wallet` (única puerta de entrada real al saldo) → Wallet actualizada. Journey unificado: no importa desde qué touchpoint se origina el movimiento de saldo (recarga en superapp, cobro en POS, ajuste desde admin), todos convergen en la misma función server-side -- un solo camino de verdad, no uno por plataforma.

### #115 — Liquidación genera netos negativos y deja procesarlos
Estado: 🟢 Completado

**Instrucción de trabajo:** Liquidación genera netos negativos y deja procesarlos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Liquidación genera netos negativos y deja procesarlos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Liquidación genera netos negativos y deja procesarlos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Liquidación genera netos negativos y deja procesarlos

### #116 — Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo
Estado: 🟢 Completado

**Instrucción de trabajo:** Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #117 — Duplicados: 3 mundos "Colegio Raimondi" en Supabase
Estado: 🟢 Completado

**Instrucción de trabajo:** Duplicados: 3 mundos "Colegio Raimondi" en Supabase

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Duplicados: 3 mundos "Colegio Raimondi" en Supabase") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Duplicados: 3 mundos "Colegio Raimondi" en Supabase).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Duplicados: 3 mundos "Colegio Raimondi" en Supabase

### #118 — POS/Operador: vincular bandita NFC directamente desde el POS
Estado: 🟢 Completado

**Instrucción de trabajo:** POS/Operador: vincular bandita NFC directamente desde el POS

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("POS/Operador: vincular bandita NFC directamente desde el POS") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (POS/Operador: vincular bandita NFC directamente desde el POS).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). POS/Operador: vincular bandita NFC directamente desde el POS

### #119 — Cash-in de evento: banditas pre-cargadas con lista de asistencia
Estado: 🟢 Completado

**Instrucción de trabajo:** Cash-in de evento: banditas pre-cargadas con lista de asistencia

**Qué se resolvió:** docs: diseño de bandita de evento con saldo pre-cargado (#119) · feat(admin): banditas de evento con saldo pre-cargado y lista de asistencia (Task #119)

**Flujo / diseño técnico:** docs: diseño de bandita de evento con saldo pre-cargado (#119) · feat(admin): banditas de evento con saldo pre-cargado y lista de asistencia (Task #119)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. docs: diseño de bandita de evento con saldo pre-cargado (#119) · feat(admin): banditas de evento con saldo pre-cargado y lista de asistencia (Task #119)

### #120 — Menu: falta acción real en el POS/operador
Estado: 🟢 Completado

**Instrucción de trabajo:** Menu: falta acción real en el POS/operador

**Qué se resolvió:** feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega

**Flujo / diseño técnico:** feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: POS / Operador → Superapp. feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega

### #121 — RPC de wallet: cerrar el gap de autorización por dueño
Estado: 🟢 Completado

**Instrucción de trabajo:** Cerrar el hueco de autorización en las RPC de wallet: cualquiera con la llave anónima podía mover el saldo de CUALQUIER wallet, no solo la propia -- solo faltaba pasar el wallet_id correcto.

**Qué se resolvió:** La RPC mover_saldo_wallet ahora exige, para cada llamada, o un turno de POS válido (p_turno_id real y abierto) o que auth.uid() sea el dueño de la wallet o su apoderado -- devuelve NO_AUTENTICADO / NO_AUTORIZADO / TURNO_INVALIDO si ninguna condición se cumple.

**Flujo / diseño técnico:** El cliente intenta mover saldo -> la función valida identidad ANTES de tocar cualquier fila -> solo si pasa la validación continúa con el lock+update+insert de siempre.

**Flujo de usuario:** Sin cambio visible para el usuario legítimo. Nota de seguimiento para el equipo: una migración posterior (fix-181, restricciones de dependiente) reescribió esta función completa y, sin querer, no conservó esta validación de dueño -- documentado en el documento maestro como hallazgo de severidad alta pendiente de restaurar.

**Journey UX unificado:** Superapp / POS (origen del intento de movimiento) → RPC de wallet (valida turno abierto o dueño/apoderado ANTES de tocar saldo) → Wallet. Journey de seguridad: cualquier touchpoint que intente mover saldo de una wallet ajena queda cortado en el mismo punto, independientemente de por dónde haya entrado la llamada.

### #122 — E2E real en Raimondi: POS, merchant, mundo, usuarios, liquidación
Estado: 🟢 Completado

**Instrucción de trabajo:** E2E real en Raimondi: POS, merchant, mundo, usuarios, liquidación

**Qué se resolvió:** fix(#122): el acuerdo comercial del mundo ahora se sincroniza a Supabase · fix(#122): la reconciliación de acuerdo no sanaba acuerdo:{} (vacío pero truthy) · fix(#122): worldRow() ya no reescribe acuerdo:{} corrupto por encima del real

**Flujo / diseño técnico:** fix(#122): el acuerdo comercial del mundo ahora se sincroniza a Supabase · fix(#122): la reconciliación de acuerdo no sanaba acuerdo:{} (vacío pero truthy) · fix(#122): worldRow() ya no reescribe acuerdo:{} corrupto por encima del real

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. fix(#122): el acuerdo comercial del mundo ahora se sincroniza a Supabase · fix(#122): la reconciliación de acuerdo no sanaba acuerdo:{} (vacío pero truthy) · fix(#122): worldRow() ya no reescribe acuerdo:{} corrupto por encima del real

### #123 — Auditar feature flags de cada módulo de capacidades
Estado: 🟢 Completado

**Instrucción de trabajo:** Auditar feature flags de cada módulo de capacidades

**Qué se resolvió:** fix(#123): mapear como "listo" feature flags reales que se mostraban próximamente

**Flujo / diseño técnico:** fix(#123): mapear como "listo" feature flags reales que se mostraban próximamente

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #124 — Pase de UX copywriting: quitar copys guía innecesarios + empty states
Estado: 🟢 Completado

**Instrucción de trabajo:** Pase de UX copywriting: quitar copys guía innecesarios + empty states

**Qué se resolvió:** fix(#124): pase de copywriting — quitar guías redundantes, empty state en Landing

**Flujo / diseño técnico:** fix(#124): pase de copywriting — quitar guías redundantes, empty state en Landing

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #125 — Borrado total de BD + arranque limpio
Estado: 🟢 Completado

**Instrucción de trabajo:** Borrado total de BD + arranque limpio

**Qué se resolvió:** docs: script SQL del borrado total de BD (#125)

**Flujo / diseño técnico:** docs: script SQL del borrado total de BD (#125)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #126 — Adquirencia: sincronizar canales/MDR real a Supabase (hoy es mock local)
Estado: 🟢 Completado

**Instrucción de trabajo:** Adquirencia: sincronizar canales/MDR real a Supabase (hoy es mock local)

**Qué se resolvió:** fix(#126): Adquirencia Global ahora sincroniza a Supabase de verdad

**Flujo / diseño técnico:** fix(#126): Adquirencia Global ahora sincroniza a Supabase de verdad

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Admin RedPontis (un solo touchpoint, sin handoff a otra plataforma). fix(#126): Adquirencia Global ahora sincroniza a Supabase de verdad

### #127 — POS T6: pull-to-refresh en la pantalla de inicio
Estado: 🟢 Completado

**Instrucción de trabajo:** POS T6: pull-to-refresh en la pantalla de inicio

**Qué se resolvió:** feat(operador-nativo #127): pull-to-refresh en Inicio del POS

**Flujo / diseño técnico:** feat(operador-nativo #127): pull-to-refresh en Inicio del POS

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). feat(operador-nativo #127): pull-to-refresh en Inicio del POS

### #128 — POS: login diferenciado Mundo vs Comercio
Estado: 🟢 Completado

**Instrucción de trabajo:** POS: login diferenciado Mundo vs Comercio

**Qué se resolvió:** feat(operador-nativo #128): login diferenciado Soy Mundo / Soy Comercio · feat(#128): login diferenciado Soy Mundo / Soy Comercio en el panel admin

**Flujo / diseño técnico:** feat(operador-nativo #128): login diferenciado Soy Mundo / Soy Comercio · feat(#128): login diferenciado Soy Mundo / Soy Comercio en el panel admin

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. feat(operador-nativo #128): login diferenciado Soy Mundo / Soy Comercio · feat(#128): login diferenciado Soy Mundo / Soy Comercio en el panel admin

### #129 — Estandarizar tab "Canales" en todas las capacidades
Estado: 🟢 Completado

**Instrucción de trabajo:** Estandarizar tab "Canales" en todas las capacidades

**Qué se resolvió:** fix(#129): estandariza el tab "Canales" — solo Wallet y Comercios

**Flujo / diseño técnico:** fix(#129): estandariza el tab "Canales" — solo Wallet y Comercios

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). fix(#129): estandariza el tab "Canales" — solo Wallet y Comercios

### #130 — Flujo NFC de dependientes vía DNI end-to-end
Estado: 🟢 Completado

**Instrucción de trabajo:** Flujo NFC de dependientes vía DNI end-to-end

**Qué se resolvió:** feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · fix(#130): panel de solicitudes NFC identifica titular vs dependiente · feat(#130): resuelve nombre real del titular en solicitudes NFC · feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

**Flujo / diseño técnico:** feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · fix(#130): panel de solicitudes NFC identifica titular vs dependiente · feat(#130): resuelve nombre real del titular en solicitudes NFC · feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: POS / Operador → Superapp. feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · fix(#130): panel de solicitudes NFC identifica titular vs dependiente · feat(#130): resuelve nombre real del titular en solicitudes NFC · feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

### #131 — Badge "Pendiente / No activado" en mundo sin dashboard entregado
Estado: 🟢 Completado

**Instrucción de trabajo:** Badge "Pendiente / No activado" en mundo sin dashboard entregado

**Qué se resolvió:** feat(#131): badge "Pendiente" en mundos sin dashboard entregado

**Flujo / diseño técnico:** feat(#131): badge "Pendiente" en mundos sin dashboard entregado

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). feat(#131): badge "Pendiente" en mundos sin dashboard entregado

### #132 — Auditar render de superapp al habilitar Familiares en Wallet
Estado: 🟢 Completado

**Instrucción de trabajo:** Auditar render de superapp al habilitar Familiares en Wallet

**Qué se resolvió:** feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · fix(admin): retirar toggle muerto "Familiares" de Wallet (Task #132)

**Flujo / diseño técnico:** feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · fix(admin): retirar toggle muerto "Familiares" de Wallet (Task #132)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · fix(admin): retirar toggle muerto "Familiares" de Wallet (Task #132)

### #133 — QA de dependencias config/catálogos — auditoría cruzada
Estado: 🟢 Completado

**Instrucción de trabajo:** QA de dependencias config/catálogos — auditoría cruzada

**Qué se resolvió:** fix: auditoría cruzada config/catálogos — retirar toggles muertos, aplicar límites P2P reales (Task #133)

**Flujo / diseño técnico:** fix: auditoría cruzada config/catálogos — retirar toggles muertos, aplicar límites P2P reales (Task #133)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Admin RedPontis (un solo touchpoint, sin handoff a otra plataforma). fix: auditoría cruzada config/catálogos — retirar toggles muertos, aplicar límites P2P reales (Task #133)

### #134 — Botón con estado loading en design system + sync en cascada
Estado: 🟢 Completado

**Instrucción de trabajo:** Botón con estado loading en design system + sync en cascada

**Qué se resolvió:** feat(admin): estado loading real en BtnPrimary/BtnOutline del design system (Task #134)

**Flujo / diseño técnico:** feat(admin): estado loading real en BtnPrimary/BtnOutline del design system (Task #134)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #135 — KPI "Emisión acumulada" debe reflejar 0 real
Estado: 🟢 Completado

**Instrucción de trabajo:** KPI "Emisión acumulada" debe reflejar 0 real

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("KPI "Emisión acumulada" debe reflejar 0 real") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (KPI "Emisión acumulada" debe reflejar 0 real).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #136 — E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas
Estado: 🟡 Pendiente

**Instrucción de trabajo:** E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas

### #137 — Estandarizar registro de usuario en superapp
Estado: 🟢 Completado

**Instrucción de trabajo:** Estandarizar registro de usuario en superapp

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Estandarizar registro de usuario en superapp") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Estandarizar registro de usuario en superapp).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Estandarizar registro de usuario en superapp

### #138 — Borrar data completa de superapp (destructivo, al final)
Estado: 🟢 Completado

**Instrucción de trabajo:** Borrar data completa de superapp (destructivo, al final)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Borrar data completa de superapp (destructivo, al final)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Borrar data completa de superapp (destructivo, al final)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Borrar data completa de superapp (destructivo, al final)

### #139 — Eliminar mundo JOI Promos + sacar Anunciantes del alcance
Estado: 🟢 Completado

**Instrucción de trabajo:** Eliminar mundo JOI Promos + sacar Anunciantes del alcance

**Qué se resolvió:** feat(#139): saca JOI Promos y Anunciantes/Promos del alcance activo

**Flujo / diseño técnico:** feat(#139): saca JOI Promos y Anunciantes/Promos del alcance activo

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). feat(#139): saca JOI Promos y Anunciantes/Promos del alcance activo

### #140 — Dependientes: registro DNI+alias, consumo vía saldo asignado
Estado: 🟢 Completado

**Instrucción de trabajo:** Dependientes: registro DNI+alias, consumo vía saldo asignado

**Qué se resolvió:** feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · feat(app): alias/apodo del dependiente (Task #140)

**Flujo / diseño técnico:** feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · feat(app): alias/apodo del dependiente (Task #140)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción · feat(app): alias/apodo del dependiente (Task #140)

### #141 — Eventos 100% real + gestión embebida completa en panel del mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** Que el Motor de Eventos funcione al 100% con datos reales (no simulados) y que la gestión embebida (el propio mundo publicando sus eventos) esté completa dentro del panel del mundo.

**Qué se resolvió:** Se conectó todo el ciclo real: creación de evento, tipos de entrada, aforo, venta con débito real de wallet, emisión de QR, check-in en el POS, y el panel de gestión embebida dentro de MundoDetail -- sin ningún mock de por medio.

**Flujo / diseño técnico:** Mundo crea evento -> define tipos de entrada y precios -> publica (pasa por aprobación de RedPontis) -> usuario compra desde la superapp (débito real) -> QR se genera -> POS del evento hace check-in escaneando ese QR.

**Flujo de usuario:** Superapp: el usuario ve el evento en el marketplace, elige tipo de entrada, paga con su saldo, y la entrada aparece en 'Mis entradas' con su QR. En el evento, el POS valida ese QR y marca el ingreso.

**Journey UX unificado:** Panel de Mundo (crea y publica el evento) → Admin RedPontis (aprueba) → Superapp (el asistente descubre el evento, compra su entrada, recibe el QR) → POS del evento (check-in escaneando el QR). Journey de punta a punta con 4 touchpoints distintos y 4 roles distintos (organizador, RedPontis, asistente, operador de puerta), unificados por el mismo `event_id` en cada paso.

### #142 — Quitar "Reset demo"; credenciales admin reales
Estado: 🟢 Completado

**Instrucción de trabajo:** Quitar "Reset demo"; credenciales admin reales

**Qué se resolvió:** feat(#142): credenciales admin reales, quita signup y "Reset demo"

**Flujo / diseño técnico:** feat(#142): credenciales admin reales, quita signup y "Reset demo"

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #143 — POS: cierre de sesión definitivo con protección de credenciales
Estado: 🟢 Completado

**Instrucción de trabajo:** POS: cierre de sesión definitivo con protección de credenciales

**Qué se resolvió:** fix(admin): cierre de sesión definitivo por inactividad en el POS (Task #143)

**Flujo / diseño técnico:** fix(admin): cierre de sesión definitivo por inactividad en el POS (Task #143)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). fix(admin): cierre de sesión definitivo por inactividad en el POS (Task #143)

### #144 — Menú: flujo de compra
Estado: 🟢 Completado

**Instrucción de trabajo:** Menú: flujo de compra

**Qué se resolvió:** feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega

**Flujo / diseño técnico:** feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: POS / Operador → Superapp. feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega

### #145 — Reiniciar catálogo de hardware/banditas para inventario real
Estado: 🟢 Completado

**Instrucción de trabajo:** Reiniciar catálogo de hardware/banditas para inventario real

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Reiniciar catálogo de hardware/banditas para inventario real") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Reiniciar catálogo de hardware/banditas para inventario real).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Reiniciar catálogo de hardware/banditas para inventario real

### #146 — Precio unitario por bandita/lote + discriminación al asignar
Estado: 🟢 Completado

**Instrucción de trabajo:** Precio unitario por bandita/lote + discriminación al asignar

**Qué se resolvió:** feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

**Flujo / diseño técnico:** feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: POS / Operador → Superapp. feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

### #147 — Eliminar lote NFC con restricción + reversión de asignación
Estado: 🟢 Completado

**Instrucción de trabajo:** Eliminar lote NFC con restricción + reversión de asignación

**Qué se resolvió:** feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

**Flujo / diseño técnico:** feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: POS / Operador → Superapp. feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin

### #148 — Rediseñar precio/modelo de bandita: se fija al asignar, no al cargar
Estado: 🟢 Completado

**Instrucción de trabajo:** Rediseñar precio/modelo de bandita: se fija al asignar, no al cargar

**Qué se resolvió:** feat(#148): precio/modelo de bandita se fija al asignar, no al cargar el lote

**Flujo / diseño técnico:** feat(#148): precio/modelo de bandita se fija al asignar, no al cargar el lote

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). feat(#148): precio/modelo de bandita se fija al asignar, no al cargar el lote

### #149 — Creación de mundo: solo mostrar módulos activos, ocultar "próximamente"
Estado: 🟢 Completado

**Instrucción de trabajo:** Creación de mundo: solo mostrar módulos activos, ocultar "próximamente"

**Qué se resolvió:** feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150)

**Flujo / diseño técnico:** feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150)

### #150 — Moneda de wallet en creación de mundo: select de catálogo real, no texto libre
Estado: 🟢 Completado

**Instrucción de trabajo:** Moneda de wallet en creación de mundo: select de catálogo real, no texto libre

**Qué se resolvió:** feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150)

**Flujo / diseño técnico:** feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150)

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-03 | `79c485a` | La config de eventos se lee de la base, y el acuerdo vacío deja de anular comisiones |
| 2026-08-03 | `9b0e0ff` | fix(liquidacion): bloquear procesar lotes con neto negativo |
| 2026-08-03 | `25d1538` | chore: ignorar docs/maestro (capturas y scripts del Documento Maestro) |
| 2026-08-03 | `77446b6` | feat(operador-nativo): vincular pulsera NFC desde el POS T6 fisico |
| 2026-08-03 | `650a488` | fix: ocultar "Cambiar servidor" en Abrir caja del POS nativo |
| 2026-08-03 | `3884dfa` | feat(admin+operador-web): toggle real "usaPulseraNfc" en config de Wallet |
| 2026-08-03 | `a7e2eab` | fix(critico): migrar movimientos de saldo a RPC atomico server-side |
| 2026-08-04 | `021ac93` | docs: ADR + documento tecnico + roadmap del Core Platform (#113) |
| 2026-08-04 | `d9c5d96` | docs: diseño de bandita de evento con saldo pre-cargado (#119) |
| 2026-08-04 | `30d599f` | fix: 5 bugs reales encontrados por QA de hoy (3 agentes en paralelo) |
| 2026-08-04 | `ff2cb54` | Rediseñar TabAcuerdo: modelo comercial real + contrato, sin calculadora |
| 2026-08-04 | `d2a78e1` | docs: endurecer script SQL del fix RPC (delimitadores + verificación) |
| 2026-08-04 | `615b2f6` | fix(critico #121): cerrar el gap de dueño en las RPC de wallet |
| 2026-08-04 | `000ec8a` | fix(#126): Adquirencia Global ahora sincroniza a Supabase de verdad |
| 2026-08-04 | `e7f1b2a` | feat(operador-nativo #127): pull-to-refresh en Inicio del POS |
| 2026-08-04 | `7572ed0` | fix(#123): mapear como "listo" feature flags reales que se mostraban próximamente |
| 2026-08-04 | `60426bb` | fix(#122): el acuerdo comercial del mundo ahora se sincroniza a Supabase |
| 2026-08-04 | `b6257ee` | fix(#122): la reconciliación de acuerdo no sanaba acuerdo:{} (vacío pero truthy) |
| 2026-08-04 | `f526511` | fix(#122): worldRow() ya no reescribe acuerdo:{} corrupto por encima del real |
| 2026-08-04 | `202ec18` | fix(#124): pase de copywriting — quitar guías redundantes, empty state en Landing |
| 2026-08-04 | `8b0bd3b` | fix: re-sembrar capacities tras el borrado total + KPI de capacidades reales |
| 2026-08-04 | `2b6b33c` | feat(superapp): pedir bandita NFC a nombre de un familiar, no solo del titular |
| 2026-08-04 | `4d3ed8a` | feat(operador-nativo #128): login diferenciado Soy Mundo / Soy Comercio |
| 2026-08-04 | `cbcdccb` | feat(#128): login diferenciado Soy Mundo / Soy Comercio en el panel admin |
| 2026-08-04 | `3193756` | docs: script SQL del borrado total de BD (#125) |
| 2026-08-04 | `d2bb3f9` | fix: KPIs del Dashboard reflejan data real, no mock horneado |
| 2026-08-04 | `1f83220` | fix(crítico): mundos demo horneados en seed() se filtraban a Supabase real |
| 2026-08-04 | `ee44d6f` | feat(#142): credenciales admin reales, quita signup y "Reset demo" |
| 2026-08-04 | `a5cf121` | docs: SQL de limpieza de lotes de liquidación fantasma (mundo-raimondi/jockey-plaza) |
| 2026-08-04 | `fa80c01` | fix: refreshMundosLive poda mundos borrados de verdad en Supabase |
| 2026-08-04 | `cf50e76` | fix: botón de volver en "Soy Comercio" (AbrirCajaScreen) — sync monorepo |
| 2026-08-04 | `2b0d410` | fix: carga masiva de banditas/hardware acepta Excel real (.xlsx) |
| 2026-08-04 | `9802ca8` | feat(#130,#132,#140): DNI en dependientes + confirmación real de suscripción |
| 2026-08-04 | `9d5f7c0` | feat(#139): saca JOI Promos y Anunciantes/Promos del alcance activo |
| 2026-08-04 | `a1f7555` | fix(#129): estandariza el tab "Canales" — solo Wallet y Comercios |
| 2026-08-04 | `ad206be` | fix: POS T6 registra zona real en Accesos — sync monorepo (commit 77119f3) |
| 2026-08-04 | `027543c` | fix(#130): panel de solicitudes NFC identifica titular vs dependiente |
| 2026-08-04 | `20f7507` | feat(#130): resuelve nombre real del titular en solicitudes NFC |
| 2026-08-04 | `00a6b1d` | feat(#131): badge "Pendiente" en mundos sin dashboard entregado |
| 2026-08-04 | `ee9b575` | fix: purga definitiva de mundo-promos-rp (regresó tras el borrado) |
| 2026-08-04 | `187af6e` | feat: asignación parcial de lote NFC + rename + auto-entrega al vincular |
| 2026-08-04 | `0731fca` | fix: publicar catálogo ya no falla en bloque por tier/name/category null |
| 2026-08-04 | `c386400` | fix: causa real del "Publicar catálogo" fallando — category inválida |
| 2026-08-04 | `01bc8a1` | fix: quita copys de funcionalidades no construidas |
| 2026-08-04 | `e64dbdd` | fix: "Requerir equipos" del mundo solo muestra hardware físico real |
| 2026-08-04 | `a2dadd7` | feat(#130,#146,#147): vigencia/reposición de bandita en superapp + precio y gestión de lote en admin |
| 2026-08-04 | `dc6b2d6` | feat(#120,#144): acción real de Menú en el POS/operador — marcar entrega |
| 2026-08-04 | `c284695` | fix: 3 gaps reales encontrados en auditoría de render de superapp |
| 2026-08-04 | `ab467d0` | fix: quitar auto-afiliación a mundo-eventos-rp/mundo-promos-rp en login |
| 2026-08-04 | `84f6090` | feat(#148): precio/modelo de bandita se fija al asignar, no al cargar el lote |
| 2026-08-04 | `89143f9` | fix: Menú siempre exige elegir para quién antes de mostrar los platos |
| 2026-08-04 | `f3359be` | feat: normalizar UID sin dos puntos + vincular por DNI con familia + fix de error genérico |

*52 commits en esta fase.*

# Fase: Bandita NFC end-to-end + restricciones granulares
*07-ago a 08-ago*

### #151 — Bug: error al crear producto en "Mi Catálogo" de comercio
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: error al crear producto en "Mi Catálogo" de comercio

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: error al crear producto en "Mi Catálogo" de comercio") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: error al crear producto en "Mi Catálogo" de comercio).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #152 — Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2

### #153 — Menú: estado pendiente de publicación hasta tener programación asignada
Estado: 🟢 Completado

**Instrucción de trabajo:** Menú: estado pendiente de publicación hasta tener programación asignada

**Qué se resolvió:** fix(admin): Menú muestra "pendiente de programar" en vez de "activo" falso (Task #153)

**Flujo / diseño técnico:** fix(admin): Menú muestra "pendiente de programar" en vez de "activo" falso (Task #153)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). fix(admin): Menú muestra "pendiente de programar" en vez de "activo" falso (Task #153)

### #154 — Tabla de usuarios por mundo: anidar dependientes + columnas de bandita
Estado: 🟢 Completado

**Instrucción de trabajo:** Tabla de usuarios por mundo: anidar dependientes + columnas de bandita

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Tabla de usuarios por mundo: anidar dependientes + columnas de bandita") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Tabla de usuarios por mundo: anidar dependientes + columnas de bandita).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador → Superapp. Tabla de usuarios por mundo: anidar dependientes + columnas de bandita

### #155 — Superapp: selector de perfil (titular/dependiente) antes de cualquier configuración
Estado: 🟢 Completado

**Instrucción de trabajo:** Superapp: selector de perfil (titular/dependiente) antes de cualquier configuración

**Qué se resolvió:** feat(app): selector de perfil en Perfil Extendido — titular/dependiente (Task #155)

**Flujo / diseño técnico:** feat(app): selector de perfil en Perfil Extendido — titular/dependiente (Task #155)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). feat(app): selector de perfil en Perfil Extendido — titular/dependiente (Task #155)

### #156 — Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo

### #157 — UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)
Estado: 🟢 Completado

**Instrucción de trabajo:** UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)

### #158 — Flujo completo de solicitud de bandita: aviso al usuario + demanda/métricas para mundo y RedPontis
Estado: 🟢 Completado

**Instrucción de trabajo:** Flujo completo de solicitud de bandita: aviso al usuario + demanda/métricas para mundo y RedPontis

**Qué se resolvió:** feat: flujo completo de solicitud de bandita — aviso correcto + métricas para el mundo (Task #158)

**Flujo / diseño técnico:** feat: flujo completo de solicitud de bandita — aviso correcto + métricas para el mundo (Task #158)

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Panel de Mundo → POS / Operador. feat: flujo completo de solicitud de bandita — aviso correcto + métricas para el mundo (Task #158)

### #159 — Ocultar transacciones de suscripción al comercio — solo RedPontis las ve
Estado: 🟢 Completado

**Instrucción de trabajo:** Ocultar transacciones de suscripción al comercio — solo RedPontis las ve

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Ocultar transacciones de suscripción al comercio — solo RedPontis las ve") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Ocultar transacciones de suscripción al comercio — solo RedPontis las ve).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Superapp. Ocultar transacciones de suscripción al comercio — solo RedPontis las ve

### #160 — POS: consulta por DNI (titular+dependientes) + módulo Perfil Extendido visible al mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** POS: consulta por DNI (titular+dependientes) + módulo Perfil Extendido visible al mundo

**Qué se resolvió:** feat(admin): módulo "Consultar Ficha" en el POS Operador (Task #160)

**Flujo / diseño técnico:** feat(admin): módulo "Consultar Ficha" en el POS Operador (Task #160)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador → Superapp. feat(admin): módulo "Consultar Ficha" en el POS Operador (Task #160)

### #161 — Superapp: editar perfil de dependiente ya creado (alergias, etc.)
Estado: 🟢 Completado

**Instrucción de trabajo:** Superapp: editar perfil de dependiente ya creado (alergias, etc.)

**Qué se resolvió:** feat(app): editar nombre y DNI de un dependiente ya creado (Task #161)

**Flujo / diseño técnico:** feat(app): editar nombre y DNI de un dependiente ya creado (Task #161)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). feat(app): editar nombre y DNI de un dependiente ya creado (Task #161)

### #162 — Vincular pulsera: es por contacto NFC, no escaneo QR
Estado: 🟢 Completado

**Instrucción de trabajo:** Vincular pulsera: es por contacto NFC, no escaneo QR

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Vincular pulsera: es por contacto NFC, no escaneo QR") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Vincular pulsera: es por contacto NFC, no escaneo QR).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Vincular pulsera: es por contacto NFC, no escaneo QR

### #163 — Bug: historial de accesos marca "fuera del colegio" pese a registrar "entrada"
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: historial de accesos marca "fuera del colegio" pese a registrar "entrada"

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: historial de accesos marca "fuera del colegio" pese a registrar "entrada"") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: historial de accesos marca "fuera del colegio" pese a registrar "entrada").

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #164 — Merchant: autogenerar código de comercio + PIN de 4 dígitos si usa POS Operador
Estado: 🟢 Completado

**Instrucción de trabajo:** Merchant: autogenerar código de comercio + PIN de 4 dígitos si usa POS Operador

**Qué se resolvió:** feat(admin): autogenerar código de comercio + PIN de POS Operador (Task #164)

**Flujo / diseño técnico:** feat(admin): autogenerar código de comercio + PIN de POS Operador (Task #164)

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). feat(admin): autogenerar código de comercio + PIN de POS Operador (Task #164)

### #165 — Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)
Estado: 🟢 Completado

**Instrucción de trabajo:** Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)

### #166 — Perfil de mundo con imagen (como merchant) + thumbnail en card de comunidad
Estado: 🟢 Completado

**Instrucción de trabajo:** Perfil de mundo con imagen (como merchant) + thumbnail en card de comunidad

**Qué se resolvió:** feat(#166): perfil de mundo con imagen real, igual al panel de merchant

**Flujo / diseño técnico:** feat(#166): perfil de mundo con imagen real, igual al panel de merchant

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. feat(#166): perfil de mundo con imagen real, igual al panel de merchant

### #167 — Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo

### #168 — Bandita universal para cuenta principal — discrimina wallet según mundo/comercio en el lector (arquitectura nueva)
Estado: 🟢 Completado

**Instrucción de trabajo:** Una sola bandita física debe poder representar la cuenta principal del usuario, pero discriminando correctamente qué wallet corresponde según en qué mundo/comercio se está usando el lector -- no una bandita por mundo.

**Qué se resolvió:** Arquitectura nueva de bandita 'universal': el UID físico de la pulsera se vincula a la identidad de la persona, no a una wallet específica -- el lector resuelve la wallet correcta en el momento de la lectura según el contexto (mundo/comercio) donde está el lector.

**Flujo / diseño técnico:** Persona vincula su bandita una sola vez -> el sistema guarda el UID ligado a su identidad -> en cualquier punto de cobro, el lector NFC envía el UID + el contexto del punto de venta -> el backend resuelve cuál wallet corresponde a esa combinación.

**Flujo de usuario:** El usuario trae puesta la misma pulsera a cualquier mundo donde tenga cuenta -- no necesita una pulsera distinta por comunidad. El comercio/operador solo acerca el lector, sin tener que preguntar ni seleccionar nada.

**Journey UX unificado:** Superapp/POS (vinculación única del UID a la identidad) → POS/Operador de cualquier mundo (lectura NFC + contexto del punto de venta) → backend resuelve wallet correcta → cobro. Journey unificado entre mundos: el mismo objeto físico (la pulsera) atraviesa comunidades distintas sin re-vinculación, porque la identidad vive en el UID y la wallet se resuelve en el momento, no de antemano.

### #169 — Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable
Estado: 🟢 Completado

**Instrucción de trabajo:** Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #170 — Campanita de notificaciones en admin RedPontis + tablas + badges en sidebar
Estado: 🟢 Completado

**Instrucción de trabajo:** Campanita de notificaciones en admin RedPontis + tablas + badges en sidebar

**Qué se resolvió:** feat(#170): campanita de notificaciones en admin RedPontis

**Flujo / diseño técnico:** feat(#170): campanita de notificaciones en admin RedPontis

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Admin RedPontis (un solo touchpoint, sin handoff a otra plataforma). feat(#170): campanita de notificaciones en admin RedPontis

### #171 — Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)
Estado: 🟢 Completado

**Instrucción de trabajo:** Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)

### #172 — POS/Tótem: separar catálogo de modelos de inventario de unidades
Estado: 🟢 Completado

**Instrucción de trabajo:** POS/Tótem: separar catálogo de modelos de inventario de unidades

**Qué se resolvió:** feat(#172): catálogo de modelos de hardware editable, separado del registro de unidades

**Flujo / diseño técnico:** feat(#172): catálogo de modelos de hardware editable, separado del registro de unidades

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). feat(#172): catálogo de modelos de hardware editable, separado del registro de unidades

### #173 — Restricciones granulares: por dependiente, por mundo y por perfil — no un horario macro global
Estado: 🟢 Completado

**Instrucción de trabajo:** Las restricciones de consumo no pueden ser un horario macro único para todo el mundo -- necesitan ser granulares: por dependiente individual, y configurables (horario, límite diario, productos bloqueados).

**Qué se resolvió:** Tabla dependent_restrictions con horario_inicio/fin, límite diario y lista de productos bloqueados por cada dependiente -- validado tanto en el cliente (feedback inmediato) como dentro de la RPC de wallet server-side (no se puede evadir cambiando el cliente).

**Flujo / diseño técnico:** El tutor entra a Restricciones -> elige un dependiente -> configura horario permitido, límite diario y productos bloqueados -> esas reglas se guardan por dependiente, no por mundo.

**Flujo de usuario:** El dependiente intenta comprar -> si está fuera de horario, excede su límite diario, o el producto está bloqueado para él, la compra se rechaza con un motivo específico (no un error genérico) -- tanto en la app como si el rechazo llega desde el servidor.

**Journey UX unificado:** Superapp (tutor configura restricciones por dependiente) → Supabase `dependent_restrictions` → POS / Superapp (el dependiente intenta comprar, la RPC valida en tiempo real) → rechazo o aceptación con motivo explícito. Journey unificado: la misma regla que el tutor configuró en un touchpoint se hace cumplir igual sin importar si el dependiente compra desde el POS de un comercio o desde su propio celular.

### #174 — Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento
Estado: 🟢 Completado

**Instrucción de trabajo:** Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento

### #175 — Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú
Estado: 🟢 Completado

**Instrucción de trabajo:** Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-07 | `31544e6` | fix: bug raíz del "código de banda no reconocido" en el T6 — UID sin separador |
| 2026-08-08 | `241f51a` | fix(superapp): sesión nunca se refrescaba — cualquier operación de dinero fallaba pasada 1 hora |
| 2026-08-08 | `95716db` | feat(#166): perfil de mundo con imagen real, igual al panel de merchant |
| 2026-08-08 | `8f2a867` | feat(#170): campanita de notificaciones en admin RedPontis |
| 2026-08-08 | `3f454e5` | feat(#172): catálogo de modelos de hardware editable, separado del registro de unidades |
| 2026-08-08 | `bb88afa` | feat(admin): permitir editar precio/modelo de una asignación de banditas ya creada |
| 2026-08-08 | `3a8813e` | feat(app): unificar alergias entre Restricciones, Perfil Extendido y Menú |
| 2026-08-08 | `55359bd` | feat(app): restricciones granulares por dependiente (horario, límite, productos) |
| 2026-08-08 | `36f6819` | feat: múltiples planes de suscripción (mensual/anual) con descuento promocional |
| 2026-08-08 | `235a59d` | fix(app): "sin restricción de horario" explícito + alergia libre ("+ Otra") |
| 2026-08-08 | `42966c0` | feat: bandita universal para la cuenta principal (Task #168) |
| 2026-08-08 | `e78e9be` | feat: flujo completo de solicitud de bandita — aviso correcto + métricas para el mundo (Task #158) |
| 2026-08-08 | `a528123` | feat(admin): módulo "Consultar Ficha" en el POS Operador (Task #160) |
| 2026-08-08 | `b27bb0e` | feat(app): editar nombre y DNI de un dependiente ya creado (Task #161) |

*14 commits en esta fase.*

# Fase: Auditoría cruzada + primer batch de QA con agentes en paralelo
*09-ago*

### #176 — RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware
Estado: 🟢 Completado

**Instrucción de trabajo:** RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Panel de Mundo. RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware

### #177 — Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view
Estado: 🟢 Completado

**Instrucción de trabajo:** Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #178 — Audit each active capacidad against its correct rendering front(s)
Estado: 🟢 Completado

**Instrucción de trabajo:** Audit each active capacidad against its correct rendering front(s)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Audit each active capacidad against its correct rendering front(s)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Audit each active capacidad against its correct rendering front(s)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #179 — Live E2E: merchant role (cobrar, catálogo, consulta, cierre)
Estado: 🟢 Completado

**Instrucción de trabajo:** Live E2E: merchant role (cobrar, catálogo, consulta, cierre)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Live E2E: merchant role (cobrar, catálogo, consulta, cierre)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Live E2E: merchant role (cobrar, catálogo, consulta, cierre)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #180 — Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)
Estado: 🟢 Completado

**Instrucción de trabajo:** Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)

### #181 — Bug DNI: cuenta principal mostraba perfil del dependiente
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug DNI: cuenta principal mostraba perfil del dependiente

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug DNI: cuenta principal mostraba perfil del dependiente") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug DNI: cuenta principal mostraba perfil del dependiente).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Bug DNI: cuenta principal mostraba perfil del dependiente

### #182 — Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo
Estado: 🟢 Completado

**Instrucción de trabajo:** Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo

### #183 — Auditoría completa de modelado de datos (Supabase)
Estado: 🟢 Completado

**Instrucción de trabajo:** Auditoría completa de modelado de datos (Supabase)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Auditoría completa de modelado de datos (Supabase)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Auditoría completa de modelado de datos (Supabase)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #184 — Migrar joi360-admin/app a variables de entorno reales en Vercel
Estado: 🟢 Completado

**Instrucción de trabajo:** Migrar joi360-admin/app a variables de entorno reales en Vercel

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Migrar joi360-admin/app a variables de entorno reales en Vercel") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Migrar joi360-admin/app a variables de entorno reales en Vercel).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Migrar joi360-admin/app a variables de entorno reales en Vercel

### #185 — Instalar última versión en el T6 físico
Estado: 🟢 Completado

**Instrucción de trabajo:** Instalar última versión en el T6 físico

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Instalar última versión en el T6 físico") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Instalar última versión en el T6 físico).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Instalar última versión en el T6 físico

### #186 — Auditar banners en Restricciones (superapp)
Estado: 🟢 Completado

**Instrucción de trabajo:** Auditar banners en Restricciones (superapp)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Auditar banners en Restricciones (superapp)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Auditar banners en Restricciones (superapp)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Auditar banners en Restricciones (superapp)

### #187 — Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en "Mis eventos"
Estado: 🟢 Completado

**Instrucción de trabajo:** Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en "Mis eventos"

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en "Mis eventos"") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en "Mis eventos").

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en "Mis eventos"

### #188 — Ejecutar fixes de la Auditoría de Datos JOI360
Estado: 🟢 Completado

**Instrucción de trabajo:** Ejecutar fixes de la Auditoría de Datos JOI360

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Ejecutar fixes de la Auditoría de Datos JOI360") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Ejecutar fixes de la Auditoría de Datos JOI360).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #189 — Loading state en TODOS los botones de creación (proyecto-wide)
Estado: 🟢 Completado

**Instrucción de trabajo:** Loading state en TODOS los botones de creación (proyecto-wide)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Loading state en TODOS los botones de creación (proyecto-wide)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Loading state en TODOS los botones de creación (proyecto-wide)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #190 — Bug: vincular bandita da "usuario no reconocido" con usuario real registrado en Jockey Plaza
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: vincular bandita da "usuario no reconocido" con usuario real registrado en Jockey Plaza

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: vincular bandita da "usuario no reconocido" con usuario real registrado en Jockey Plaza") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: vincular bandita da "usuario no reconocido" con usuario real registrado en Jockey Plaza).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Bug: vincular bandita da "usuario no reconocido" con usuario real registrado en Jockey Plaza

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-09 | `6b0d6fa` | feat(admin): autogenerar código de comercio + PIN de POS Operador (Task #164) |
| 2026-08-09 | `a9fe9ab` | feat(admin): wizard de mundo — ocultar módulos próximamente + catálogo real de monedas (Tasks #149, #150) |
| 2026-08-09 | `adc6473` | fix(admin): Menú muestra "pendiente de programar" en vez de "activo" falso (Task #153) |
| 2026-08-09 | `0fbf511` | fix(admin): cierre de sesión definitivo por inactividad en el POS (Task #143) |
| 2026-08-09 | `ecbb654` | feat(admin): estado loading real en BtnPrimary/BtnOutline del design system (Task #134) |
| 2026-08-09 | `5175f2c` | feat(app): alias/apodo del dependiente (Task #140) |
| 2026-08-09 | `ff56735` | feat(app): selector de perfil en Perfil Extendido — titular/dependiente (Task #155) |
| 2026-08-09 | `680dbcd` | feat(admin): banditas de evento con saldo pre-cargado y lista de asistencia (Task #119) |
| 2026-08-09 | `d454577` | feat(admin): gestión embebida completa de Eventos en el panel del mundo (Task #141) |
| 2026-08-09 | `f239b62` | fix(admin): retirar toggle muerto "Familiares" de Wallet (Task #132) |
| 2026-08-09 | `e115236` | fix: auditoría cruzada config/catálogos — retirar toggles muertos, aplicar límites P2P reales (Task #133) |
| 2026-08-09 | `064d7bd` | fix(admin): explicar en vez de ignorar el click en módulos sin tab propio |
| 2026-08-09 | `92a8721` | fix(admin): edición real en Mi Catálogo y Catálogo de Menú del comercio |
| 2026-08-09 | `f0639d2` | fix(CRÍTICO): restricciones de dependiente (horario/límite diario) ahora se validan server-side |
| 2026-08-09 | `341e299` | fix(CRÍTICO): eliminar un mundo ahora verifica dependencias reales antes de dejar borrar |
| 2026-08-09 | `b2b77e1` | fix(admin): edición real en Planes de Suscripción |
| 2026-08-09 | `b086db3` | fix(admin): Organizadores — editar datos y reactivar uno desactivado |
| 2026-08-09 | `d3ee0db` | fix(admin): Hardware POS — editar serie, dar de baja/reparación, eliminar unidad |

*18 commits en esta fase.*

# Fase: Auditoría de datos + seguridad de credenciales (admin/PIN)
*10-ago*

### #191 — Cooldown de 2 min para reenvío de link de confirmación de correo
Estado: 🟢 Completado

**Instrucción de trabajo:** Cooldown de 2 min para reenvío de link de confirmación de correo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Cooldown de 2 min para reenvío de link de confirmación de correo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Cooldown de 2 min para reenvío de link de confirmación de correo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #192 — Usuarios en admin RedPontis aparecen sin sus datos 360
Estado: 🟢 Completado

**Instrucción de trabajo:** Usuarios en admin RedPontis aparecen sin sus datos 360

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Usuarios en admin RedPontis aparecen sin sus datos 360") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Usuarios en admin RedPontis aparecen sin sus datos 360).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Admin RedPontis (un solo touchpoint, sin handoff a otra plataforma). Usuarios en admin RedPontis aparecen sin sus datos 360

### #193 — Superapp: opción de eliminar dependiente/familiar
Estado: 🟢 Completado

**Instrucción de trabajo:** Superapp: opción de eliminar dependiente/familiar

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Superapp: opción de eliminar dependiente/familiar") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Superapp: opción de eliminar dependiente/familiar).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Superapp: opción de eliminar dependiente/familiar

### #194 — Bug: "no tienes ningún mundo" al entrar a Explorar Mundos en superapp
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: "no tienes ningún mundo" al entrar a Explorar Mundos en superapp

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: "no tienes ningún mundo" al entrar a Explorar Mundos en superapp") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: "no tienes ningún mundo" al entrar a Explorar Mundos en superapp).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Bug: "no tienes ningún mundo" al entrar a Explorar Mundos en superapp

### #195 — DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end
Estado: 🟢 Completado

**Instrucción de trabajo:** DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end

### #196 — Raimondi: probar fino flujos E2E de saldo, vinculación bandita, cobro y compra por QR
Estado: 🟢 Completado

**Instrucción de trabajo:** Raimondi: probar fino flujos E2E de saldo, vinculación bandita, cobro y compra por QR

**Qué se resolvió:** fix(#196): cobro/recarga fallaba con 409 por reference duplicado

**Flujo / diseño técnico:** fix(#196): cobro/recarga fallaba con 409 por reference duplicado

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). fix(#196): cobro/recarga fallaba con 409 por reference duplicado

### #197 — Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos
Estado: 🟢 Completado

**Instrucción de trabajo:** Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos

### #198 — Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Panel de Mundo. Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis

### #199 — Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #200 — Eventos embebidos en panel de mundo para Jockey Plaza (construir feature completo)
Estado: 🟢 Completado

**Instrucción de trabajo:** Construir el feature completo de Eventos embebidos para el panel de mundo de Jockey Plaza: que el mundo pueda dar de alta comercios por evento (desde su directorio existente o ad-hoc solo para ese evento), y que RedPontis apruebe con visibilidad completa del detalle.

**Qué se resolvió:** EventoComerciosCard con checkbox de comercios existentes + formulario de alta ad-hoc; cola de aprobación en Gobierno con modal de detalle completo (banner, mapa, tipos de entrada, comercios con foto) antes de aprobar o rechazar.

**Flujo / diseño técnico:** Mundo entra a la pestaña de Eventos -> marca qué comercios de su directorio participan, o agrega uno nuevo solo para ese evento -> RedPontis ve la solicitud en su cola de Aprobaciones con el detalle completo -> aprueba o rechaza con motivo.

**Flujo de usuario:** Superapp: el asistente ve el evento con sus comercios afiliados (con foto) antes de comprar la entrada -- el detalle completo, no solo el nombre del evento.

**Journey UX unificado:** Panel de Mundo (afilia comercios existentes o crea uno ad-hoc para el evento) → Admin RedPontis (Gobierno / Aprobaciones, ve el detalle completo antes de decidir) → Superapp (el asistente ve el evento con sus comercios afiliados antes de comprar). Journey de 3 roles unificado por el mismo evento: lo que el mundo carga es exactamente lo que RedPontis aprueba y exactamente lo que el asistente ve, sin traducción intermedia.

### #201 — Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa

### #202 — Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual
Estado: 🟢 Completado

**Instrucción de trabajo:** Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual

### #203 — Verificar bug de precio de entrada en NumInput
Estado: 🟢 Completado

**Instrucción de trabajo:** Verificar bug de precio de entrada en NumInput

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Verificar bug de precio de entrada en NumInput") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Verificar bug de precio de entrada en NumInput).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #204 — Badge de estado de evento debe reflejar aprobación real de BD
Estado: 🟢 Completado

**Instrucción de trabajo:** Badge de estado de evento debe reflejar aprobación real de BD

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Badge de estado de evento debe reflejar aprobación real de BD") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Badge de estado de evento debe reflejar aprobación real de BD).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Panel de Mundo. Badge de estado de evento debe reflejar aprobación real de BD

### #205 — Agregar upload de banner de evento con espejo en superapp
Estado: 🟢 Completado

**Instrucción de trabajo:** Agregar upload de banner de evento con espejo en superapp

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Agregar upload de banner de evento con espejo en superapp") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Agregar upload de banner de evento con espejo en superapp).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Agregar upload de banner de evento con espejo en superapp

### #206 — RUC input: máximo 11 dígitos
Estado: 🟢 Completado

**Instrucción de trabajo:** RUC input: máximo 11 dígitos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("RUC input: máximo 11 dígitos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (RUC input: máximo 11 dígitos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #207 — Cuenta bancaria: máximo 14 dígitos
Estado: 🟢 Completado

**Instrucción de trabajo:** Cuenta bancaria: máximo 14 dígitos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Cuenta bancaria: máximo 14 dígitos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Cuenta bancaria: máximo 14 dígitos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #208 — CCI: máximo 20 dígitos
Estado: 🟢 Completado

**Instrucción de trabajo:** CCI: máximo 20 dígitos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("CCI: máximo 20 dígitos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (CCI: máximo 20 dígitos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #209 — Paso 3 crear mundo: no deja adjuntar dos documentos
Estado: 🟢 Completado

**Instrucción de trabajo:** Paso 3 crear mundo: no deja adjuntar dos documentos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Paso 3 crear mundo: no deja adjuntar dos documentos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Paso 3 crear mundo: no deja adjuntar dos documentos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). Paso 3 crear mundo: no deja adjuntar dos documentos

### #210 — Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN
Estado: 🟢 Completado

**Instrucción de trabajo:** Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN

### #211 — Paso 4 Compras y transacciones: campo de hora debe ser time picker
Estado: 🟢 Completado

**Instrucción de trabajo:** Paso 4 Compras y transacciones: campo de hora debe ser time picker

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Paso 4 Compras y transacciones: campo de hora debe ser time picker") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Paso 4 Compras y transacciones: campo de hora debe ser time picker).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #212 — Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)
Estado: 🟢 Completado

**Instrucción de trabajo:** Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Journey unificado: Admin RedPontis → Panel de Mundo. Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)

### #213 — Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses
Estado: 🟢 Completado

**Instrucción de trabajo:** Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #214 — Eliminar referencia a 'costo agregado' del catálogo
Estado: 🟢 Completado

**Instrucción de trabajo:** Eliminar referencia a 'costo agregado' del catálogo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Eliminar referencia a 'costo agregado' del catálogo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Eliminar referencia a 'costo agregado' del catálogo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-10 | `7a3ab3a` | fix(app): la card de bandita de la cuenta principal muestra tu nombre, no el del mundo |
| 2026-08-10 | `50ce06e` | fix(admin): Consultar Ficha disponible también en el operador de mundo |
| 2026-08-10 | `ea879bd` | fix(admin): editar datos de un Merchant ya creado (RUC, cuenta bancaria, tarifa, etc.) |
| 2026-08-10 | `e55aebb` | fix(admin): un merchant en 0% de tarifa/fijo ya no se guarda como null |
| 2026-08-10 | `eac3bb4` | fix(admin): Promociones — editar y eliminar (sin canjes) un cupón del mundo |
| 2026-08-10 | `660aa1e` | fix(admin): eliminar un evento del organizador sin entradas vendidas |
| 2026-08-10 | `6d7b243` | fix(admin): desvincular bandita desde el detalle de Usuario (soporte) |
| 2026-08-10 | `c49c0b4` | feat(app): rediseño de unión a comunidad + limpieza de banners en Hub |
| 2026-08-10 | `1adc974` | feat: Landing Page pública, código de comercio sin guión, turnos de portería |
| 2026-08-10 | `aa776ee` | feat: Mis Eventos Creados (B2C) + enlace de invitación correcto |
| 2026-08-10 | `65a954b` | fix: Perfil Pro mostraba el QR del titular aunque vieras a un dependiente |
| 2026-08-10 | `ff761e1` | fix(security): PIN de operador expuesto en texto plano vía llave anónima |
| 2026-08-10 | `acba297` | feat: Menú sin gating de membresía + programación visible + saldo insuficiente guiado |
| 2026-08-10 | `068a52a` | feat: código JOI corto para P2P, transferencia por DNI, confirmación irreversible |
| 2026-08-10 | `c85a636` | fix: registrar bandita suelta exigía un lote que no debía ser obligatorio |
| 2026-08-10 | `68ef579` | feat: rediseño de vinculación de bandita — pantalla dedicada + cancelar + errores controlados |
| 2026-08-10 | `17e177e` | feat: validar menú reservado por DNI en Entregar Menú (POS operador) |
| 2026-08-10 | `aa8bc7c` | feat: pago por QR generado por el comercio |
| 2026-08-10 | `7db35ad` | feat: detalle real de Perfil Extendido en el panel del mundo |
| 2026-08-10 | `c348b9e` | fix(sql): pgcrypto vive en el schema extensions en Supabase, no en public |
| 2026-08-10 | `6067697` | fix(sql): faltaba el backfill de merchants.pos_pin en el fix de hasheo |
| 2026-08-10 | `8c67f09` | feat(security): credenciales de admin RP en tabla real, hasheadas |
| 2026-08-10 | `be84acf` | feat: rediseño del home del Operador + variables de entorno + widgets de Hub |
| 2026-08-10 | `3040cce` | superapp: consolidar banners estaticos de Restricciones en un resumen colapsable |
| 2026-08-10 | `733568e` | fix(admin): dependency-safety y confirmación en deletes de catálogo, campañas BNPL, tipos de entrada y eventos |
| 2026-08-10 | `5abe1b1` | fix(admin): registrar 1 bandita crasheaba por import faltante de inputCls |
| 2026-08-10 | `5eea16e` | feat(T6): sincroniza el terminal nativo con los flujos nuevos de esta sesión |
| 2026-08-10 | `bc3f2f1` | feat(POS): Consultar Ficha muestra si el titular/dependiente tiene Menú de hoy pagado |
| 2026-08-10 | `d7d1664` | fix(admin): crear/editar admin_users real; superapp crea la wallet al unirse a un mundo |
| 2026-08-10 | `cdd141c` | fix(admin): borrado de mundo limpia dependientes + guarda contra doble-click al crear mundo |
| 2026-08-10 | `842083a` | fix: reconciliar membresías reales al loguear — evita "no tienes ningún mundo" con cuentas reales |
| 2026-08-10 | `0970767` | fix: cooldown de 2 min para reenviar el correo de confirmación |
| 2026-08-10 | `6313afa` | feat: eliminar dependiente en la superapp |
| 2026-08-10 | `a4d644f` | fix: auto-sanar app_profiles faltante al abrir sesión ya logueada |
| 2026-08-10 | `02e2758` | fix(admin): buscarWalletPorCodigo comparaba el código corto contra la columna uuid |

*35 commits en esta fase.*

# Fase: Batch de 15 items UX/UI + fixes de wizard y liquidación por comercio
*11-ago*

### #215 — Configurar wallet: 'Usar sin límite' no cambia el campo
Estado: 🟢 Completado

**Instrucción de trabajo:** Configurar wallet: 'Usar sin límite' no cambia el campo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Configurar wallet: 'Usar sin límite' no cambia el campo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Configurar wallet: 'Usar sin límite' no cambia el campo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Configurar wallet: 'Usar sin límite' no cambia el campo

### #216 — Configurar wallet: 'Usar sin tope de recarga' no cambia el campo
Estado: 🟢 Completado

**Instrucción de trabajo:** Configurar wallet: 'Usar sin tope de recarga' no cambia el campo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Configurar wallet: 'Usar sin tope de recarga' no cambia el campo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Configurar wallet: 'Usar sin tope de recarga' no cambia el campo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Configurar wallet: 'Usar sin tope de recarga' no cambia el campo

### #217 — Configurar wallet: 'Usar sin vencimiento' no cambia el campo
Estado: 🟢 Completado

**Instrucción de trabajo:** Configurar wallet: 'Usar sin vencimiento' no cambia el campo

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Configurar wallet: 'Usar sin vencimiento' no cambia el campo") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Configurar wallet: 'Usar sin vencimiento' no cambia el campo).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Configurar wallet: 'Usar sin vencimiento' no cambia el campo

### #218 — Vigencia de la pulsera: usar selector de fecha (calendario)
Estado: 🟢 Completado

**Instrucción de trabajo:** Vigencia de la pulsera: usar selector de fecha (calendario)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Vigencia de la pulsera: usar selector de fecha (calendario)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Vigencia de la pulsera: usar selector de fecha (calendario)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla.

### #219 — Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil
Estado: 🟢 Completado

**Instrucción de trabajo:** Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil

### #220 — Configuración menú: método de reserva QR, Saldo o Ambos
Estado: 🟢 Completado

**Instrucción de trabajo:** Configuración menú: método de reserva QR, Saldo o Ambos

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Configuración menú: método de reserva QR, Saldo o Ambos") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Configuración menú: método de reserva QR, Saldo o Ambos).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Configuración menú: método de reserva QR, Saldo o Ambos

### #221 — Liquidación: investigar y mostrar fecha (requiere análisis previo)
Estado: 🟢 Completado

**Instrucción de trabajo:** Liquidación: investigar y mostrar fecha (requiere análisis previo)

**Qué se resolvió:** feat(#221): historial por dia en Mi liquidacion del comercio

**Flujo / diseño técnico:** feat(#221): historial por dia en Mi liquidacion del comercio

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Panel de Mundo (un solo touchpoint, sin handoff a otra plataforma). feat(#221): historial por dia en Mi liquidacion del comercio

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-11 | `82a7c70` | feat(admin): unificar entrega de panel (mundo/merchant/organizador/POS) en un solo botón |
| 2026-08-11 | `63d651c` | fix(admin): persistir login del sponsor en Supabase en vez de solo localStorage |
| 2026-08-11 | `c263f62` | refactor(admin): "Entrega de panel" pasa de dropdown a modal con tarjetas |
| 2026-08-11 | `a4a20cc` | fix(admin): reconciliación de comercios no traía el código, tumbando PIN rápido |
| 2026-08-11 | `160fe86` | fix: sincronizar estado real de eventos (aprobado/rechazado) en dashboards |
| 2026-08-11 | `ec2ca7e` | feat: upload real de imagen de portada en eventos (antes URL de texto) |
| 2026-08-11 | `0895614` | feat: entidad legal opcional en eventos B2C + publicación de catálogo automática |
| 2026-08-11 | `913410b` | fix: loading state en botones de creación que no lo tenían |
| 2026-08-11 | `29acaa5` | fix: reconciliación de comercios/eventos duplicaba filas ante dos pestañas |
| 2026-08-11 | `40f537a` | fix: codigo de comercio nunca se sincronizaba en comercios ya conocidos |
| 2026-08-11 | `094f166` | fix: "identificar al alumno" fijo en Cobrar, aunque el mundo no sea colegio |
| 2026-08-11 | `fa2a886` | fix: concordancia de género en el texto de nomenclatura de Cobrar |
| 2026-08-11 | `ead9e77` | fix: KPIs de "Resumen del día" y "Liquidación" del merchant quedaban en cero |
| 2026-08-11 | `5a8be89` | fix: subida de ficha RUC/contrato/logo tiraba el error crudo de Supabase |
| 2026-08-11 | `359533f` | fix: descripcion de mundo quedaba obsoleta tras renombrar en admin |
| 2026-08-11 | `ce145bf` | fix: la clave de operador del mundo (POS/Operador) nunca se guardaba |
| 2026-08-11 | `b92269c` | fix: wizard de crear mundo + config de wallet/menu (batch de 15 items reportados) |
| 2026-08-11 | `1ac1de5` | feat(#221): historial por dia en Mi liquidacion del comercio |

*18 commits en esta fase.*

# Fase: Eventos embebido, Web NFC directo, Sucursales, Precompra, pivot Jockey Plaza, documentación viva
*12-ago*

### #222 — Fix: error al marcar "entregado" solicitud de banditas (Jockey Plaza)
Estado: 🟢 Completado

**Instrucción de trabajo:** Fix: error al marcar "entregado" solicitud de banditas (Jockey Plaza)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Fix: error al marcar "entregado" solicitud de banditas (Jockey Plaza)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Fix: error al marcar "entregado" solicitud de banditas (Jockey Plaza)).

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Fix: error al marcar "entregado" solicitud de banditas (Jockey Plaza)

### #223 — Usuarios (admin RP): detalle en vista de página nueva, no drawer
Estado: 🟢 Completado

**Instrucción de trabajo:** Usuarios (admin RP): detalle en vista de página nueva, no drawer

**Qué se resolvió:** feat(#223): detalle de usuario en pagina completa, no drawer

**Flujo / diseño técnico:** feat(#223): detalle de usuario en pagina completa, no drawer

**Flujo de usuario:** Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final.

**Journey UX unificado:** Admin RedPontis (un solo touchpoint, sin handoff a otra plataforma). feat(#223): detalle de usuario en pagina completa, no drawer

### #224 — Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** POS / Operador (un solo touchpoint, sin handoff a otra plataforma). Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar

### #225 — Superapp: módulo de Eventos a scroll vertical con más mini cards
Estado: 🟢 Completado

**Instrucción de trabajo:** Superapp: módulo de Eventos a scroll vertical con más mini cards

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Superapp: módulo de Eventos a scroll vertical con más mini cards") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Superapp: módulo de Eventos a scroll vertical con más mini cards).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Superapp: módulo de Eventos a scroll vertical con más mini cards

### #226 — Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)
Estado: 🟢 Completado

**Instrucción de trabajo:** Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)

### #227 — Bug: botón "Bandita NFC" en Home del mundo navega a Recarga (afecta todos los mundos)
Estado: 🟢 Completado

**Instrucción de trabajo:** Bug: botón "Bandita NFC" en Home del mundo navega a Recarga (afecta todos los mundos)

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Bug: botón "Bandita NFC" en Home del mundo navega a Recarga (afecta todos los mundos)") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Bug: botón "Bandita NFC" en Home del mundo navega a Recarga (afecta todos los mundos)).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → POS / Operador. Bug: botón "Bandita NFC" en Home del mundo navega a Recarga (afecta todos los mundos)

### #228 — Eventos embebido: gestión completa + comercios por evento + aprobación con detalle
Estado: 🟢 Completado

**Instrucción de trabajo:** Cerrar 5 gaps reales encontrados en el flujo de Eventos embebido: aprobación sin detalle visible, mapa del evento ausente en el detalle público, comercios afiliados sin foto, sin deep-link desde el Home del mundo, y comercios ad-hoc sin forma de darse de alta.

**Qué se resolvió:** Modal de aprobación con detalle completo, mapa PDF visible en el detalle público del evento (antes solo estaba en la tarjeta), fotos reales de comercios afiliados, deep-link `?evento=<id>` desde el carrusel del Home directo al detalle, y formulario de alta de comercio ad-hoc dentro del panel de organizador.

**Flujo / diseño técnico:** Cada gap se rastreó hasta su causa real en el código (no un parche cosmético) -- por ejemplo, el deep-link requirió que el Hub pasara el id del evento en la URL y que el módulo de Eventos lo leyera al montar para abrir el detalle automáticamente.

**Flujo de usuario:** El usuario toca un evento en el carrusel del Home y cae directo en su ficha completa (no en la lista general de eventos) -- con mapa, comercios con foto, y tipos de entrada visibles de una.

**Journey UX unificado:** Superapp Home (carrusel de eventos) → deep-link `?evento=<id>` → ficha de detalle del evento (mapa + comercios con foto + tipos de entrada) → Panel de Mundo (alta de comercio ad-hoc si falta) → Admin RedPontis (aprobación con el mismo detalle completo). Journey cerrado end-to-end: el mismo id de evento conecta las 4 paradas sin que el usuario tenga que buscar el evento dos veces.

### #229 — Sucursales: grupo de mundos con selector in-place en superapp
Estado: 🟡 Pendiente

**Instrucción de trabajo:** Sucursales: grupo de mundos con selector in-place en superapp

**Qué se resolvió:** Resuelto según lo descrito en la tarea ("Sucursales: grupo de mundos con selector in-place en superapp") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número.

**Flujo / diseño técnico:** Ver commits de la fase -- el título ya describe la naturaleza del cambio (Sucursales: grupo de mundos con selector in-place en superapp).

**Flujo de usuario:** Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió.

**Journey UX unificado:** Journey unificado: Panel de Mundo → Superapp. Sucursales: grupo de mundos con selector in-place en superapp

### #230 — Superapp: vincular bandita directo (Web NFC) sin flujo de solicitud
Estado: 🟢 Completado

**Instrucción de trabajo:** Que el usuario pueda vincular su propia bandita NFC directo desde el celular, con Web NFC, sin pasar por el flujo de solicitud mediado por un operador.

**Qué se resolvió:** VincularBanditaWebNfcModal usa la Web NFC API (NDEFReader) del navegador -- detecta si el celular la soporta (Chrome/Android sobre HTTPS) y si no, cae automáticamente al flujo de solicitud tradicional. Aplica las mismas 4 validaciones de seguridad que ya usaba el operador del POS (banda existe en el mundo, no está ya vinculada, está en estado 'asignada', el usuario no tiene ya otra banda activa).

**Flujo / diseño técnico:** Usuario toca 'Ya tienes la pulsera en mano, vincúlala ahora' -> el navegador pide permiso NFC -> usuario acerca la pulsera -> se lee el UID real -> se valida contra las 4 reglas de seguridad -> si pasa, la banda queda vinculada y activa de inmediato.

**Flujo de usuario:** El usuario recibe la pulsera físicamente (en persona, en un evento, por correo) y la activa él mismo desde su celular, sin tener que ir a un punto de atención a que un operador la vincule por él.

**Journey UX unificado:** Superapp (usuario toca 'vincular ahora', Web NFC lee el UID) → validación de las mismas 4 reglas que usa el operador del POS → Wallet activa. Journey unificado con el flujo de operador: ambos caminos (autoservicio desde la superapp, o asistido desde el POS) terminan en la misma validación y el mismo estado final, así que el usuario obtiene el resultado idéntico sin importar cuál eligió.

### #231 — Precompra evento B2B: stock real + label separado de catálogo
Estado: 🟢 Completado

**Instrucción de trabajo:** Que cada comercio afiliado a un evento pueda cargar productos en precompra con stock real, en un catálogo separado de su catálogo regular (para no mezclar lo que vende todos los días con lo que ofrece solo en ese evento puntual).

**Qué se resolvió:** Los productos de precompra usan la misma tabla `products` pero con `event_id` seteado -- aislados por diseño del catálogo regular (`event_id IS NULL`). Se agregó stock real (columna que ya existía pero no se exponía en este formulario) con badge de Agotado/Stock/Sin límite.

**Flujo / diseño técnico:** Organizador afilia un comercio al evento (existente o ad-hoc) -> abre 'Precompra' en la fila de ese comercio -> carga producto + precio + stock -> queda visible solo dentro de ese evento, nunca en el catálogo de todos los días del comercio.

**Flujo de usuario:** Pendiente para la app -- hoy la autoría (cargar los productos) está completa y en producción, pero el asistente todavía no tiene una pantalla en la superapp para comprar estos productos de precompra tras comprar su entrada. Queda como el primer ítem del backlog.

**Journey UX unificado:** Panel de Mundo / organizador (carga productos de precompra con stock real, aislados del catálogo regular) → [tramo pendiente: Superapp, pantalla de compra de precompra tras comprar la entrada] → POS del evento (redención). Journey incompleto a propósito: la autoría ya cierra el círculo, el consumo desde la superapp es el siguiente tramo a construir -- documentado así para no dar la falsa impresión de que ya está cerrado.

### #232 — Pivot piloto Jockey Plaza: borrado + limpieza de código completado
Estado: 🟢 Completado

**Instrucción de trabajo:** Pivot de alcance: enfocar el ecosistema únicamente en el piloto de Jockey Plaza -- borrar permanentemente Colegio Raimondi, Universidad de Lima, JOI Eventos y JOI Promos.

**Qué se resolvió:** Borrado real y permanente en Supabase (43 tablas limpiadas en el orden correcto para respetar dependencias), con un diagnóstico previo de tipos de columna para que el script SQL no fallara a mitad de camino. En el código, se sacó 'JOI Eventos' del seed local (tenía fixed:true, lo que lo habría resucitado en el siguiente sync) y se agregó al filtro de purga.

**Flujo / diseño técnico:** Confirmación explícita del alcance del borrado -> diagnóstico de tipos de columna reales (varias terminaron en `uuid` en vez de `text` en distintos momentos del proyecto) -> script SQL final con casts defensivos -> verificación en vivo de que solo Jockey Plaza queda -> limpieza del código para que no vuelva a aparecer.

**Flujo de usuario:** No hay flujo de usuario nuevo -- es una operación de datos. El efecto visible es que el admin y la superapp ahora solo muestran Jockey Plaza como comunidad disponible.

**Journey UX unificado:** Admin RedPontis (Supabase, borrado en 43 tablas) → código local (`store.js`, se saca el mundo fantasma del seed y del filtro de purga) → Superapp / Admin (ambos dejan de listar cualquier mundo que no sea Jockey Plaza). Journey unificado entre plataformas: el borrado en la base y la limpieza en el código tenían que coincidir, porque un mundo `fixed:true` sobreviviendo en el seed habría resucitado en Supabase en el siguiente sync aunque el borrado SQL hubiera sido perfecto.

### #233 — Suscripciones formalizada como capacidad propia — deployado y verificado
Estado: 🟢 Completado

**Instrucción de trabajo:** Formalizar Suscripciones como su propia capacidad (con dependencia declarada a Wallet), en vez de vivir escondida como un config field dentro de Wallet -- pese a que ya cobraba dinero real.

**Qué se resolvió:** Nueva entrada en el catálogo maestro de capacidades con su propio ícono, activación y pestaña de configuración -- el panel de Planes de Suscripción se movió de la pestaña de Wallet a su propia pestaña. La superapp gatea el cobro contra la nueva capacidad en vez del config field viejo.

**Flujo / diseño técnico:** RedPontis/mundo activa la capacidad Suscripciones (antes: prendía un toggle escondido dentro de Wallet) -> crea uno o más planes -> el cobro real ocurre al vincular un nuevo dependiente, igual que antes -- solo cambió dónde vive la activación, no el mecanismo de cobro.

**Flujo de usuario:** Para el tutor que vincula un dependiente: sin cambio -- ve el mismo paso de elegir plan y confirmar el cobro. Para el admin: ahora encuentra y activa Suscripciones como cualquier otra capacidad del catálogo, no como una opción oculta dentro de otra.

**Journey UX unificado:** Admin RedPontis (Catálogos Globales, capacidad propia con re-sincronización real a `capacities`) → Panel de Mundo (activa Suscripciones + crea planes en su propia pestaña) → Superapp (tutor elige plan al vincular un dependiente, cobro real). Journey re-cableado sin romper el tramo final: se movió dónde vive la activación (de un config field escondido a una capacidad de primer nivel) sin tocar el paso que el tutor ya conocía.

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-12 | `962ed3a` | fix(#196): cobro/recarga fallaba con 409 por reference duplicado |
| 2026-08-12 | `f5a108a` | fix: monto de Cobrar con QR nunca se guardaba (NumInput mal conectado) |
| 2026-08-12 | `c6ca811` | fix: nombre de lote autogenerado + vincular bandita valida doble-vinculo |
| 2026-08-12 | `be4a6f9` | feat(#223): detalle de usuario en pagina completa, no drawer |
| 2026-08-12 | `4946032` | feat: eventos vertical en modulo + vitrina en Home, fix bandita->recarga |
| 2026-08-12 | `e63622f` | feat(#228): 5 gaps de Eventos embebido -- aprobacion con detalle, mapa en detalle, fotos de comercios, deep-link desde Home, comercio ad-hoc |
| 2026-08-12 | `5901536` | fix: NumInput no importado rompia todo el tab Motor de Eventos |
| 2026-08-12 | `89d0535` | feat(#230): vincular bandita directo desde el celular via Web NFC |
| 2026-08-12 | `098b62a` | feat(admin): Sucursales — Grupo de mundos con saldo/bandita compartidos (Stage A) |
| 2026-08-12 | `da590aa` | feat(admin): Precompra de evento con inventario real, separada del catálogo |
| 2026-08-12 | `3537f31` | docs: documento maestro de mapeo de capacidades, dependencias y render (v1.0) |
| 2026-08-12 | `0079eee` | feat(admin): pivot a piloto Jockey Plaza — retira mundos especiales del seed local |
| 2026-08-12 | `8bb5178` | feat: formalizar Suscripciones como capacidad propia (dependencia: Wallet) |
| 2026-08-12 | `306cae0` | fix(admin): contraseña del sponsor quedaba en blanco al reabrir la entrega |
| 2026-08-12 | `1fbed89` | fix(admin): mensaje honesto sobre la contraseña del sponsor — no es recuperable por diseño |
| 2026-08-12 | `fa184a7` | docs: historial de tareas y commits (v1.0) — segundo documento vivo |
| 2026-08-12 | `ed7d564` | docs: enriquecer Historial de Tareas y Commits (v1.1) con flujo, UX y journeys unificados |
| 2026-08-12 | `1665143` | fix(admin): repetir el filtro de mundos retirados en syncAllWorlds, no solo en load() |
| 2026-08-12 | `f39912c` | feat(admin): edicion de ficha de mundo (RUC/Entidad legal/Pais/Descripcion) con autoguardado |
| 2026-08-12 | `85d448e` | fix(admin): quitar Banco/CCI del wizard de creacion de mundo |
| 2026-08-12 | `2c30b48` | feat: Cashback MACRO cerrado a comercios habilitados (POS + superapp) |
| 2026-08-12 | `0410c8f` | polish(admin): reflejar Cashback como capacidad real en Ficha/Capacidades |
| 2026-08-12 | `dbbe419` | docs: actualizar Cashback (construido) y conceptualizar Loyalty en el maestro |
| 2026-08-12 | `3480603` | feat: Centro de Ayuda real en superapp (canal de soporte al usuario) |
| 2026-08-12 | `be1ecc4` | feat(admin): procesar devoluciones reales desde un ticket (step-up de password) |

*25 commits en esta fase.*

# Fase: Rebranding JoiSolutions, PWA, Suscripciones real + Cashback por comercio, dos bugs en vivo
*19-ago a 24-ago*

### #234 — Rebranding completo a JoiSolutions Design System v1.0 (Navy + Gold) — admin + superapp
Estado: 🟢 Completado

**Instrucción de trabajo:** Aplicar el nuevo sistema de diseño JoiSolutions (paleta Navy + Gold) de forma consistente en los dos frentes de código -- admin y superapp -- reemplazando la paleta anterior sin dejar pantallas a medio migrar.

**Qué se resolvió:** Rebranding completo aplicado en ambos proyectos por separado el mismo día (commit `a4baf25` en admin, `ef3ee5a` en superapp) -- tokens de color, botones, tabs y superficies heredan la paleta nueva desde el design system compartido.

**Flujo / diseño técnico:** Tokens de color (Navy #1A3270 + dorado de acento) actualizados en un solo lugar del design system -- componentes ya construidos (botones, pills, tabs, headers) heredan la paleta nueva automáticamente, sin tocarlos pantalla por pantalla.

**Flujo de usuario:** Cambio visual en todas las pantallas de ambos productos el mismo día -- mismo comportamiento e interacciones, paleta de marca nueva.

**Journey UX unificado:** Admin RedPontis + Panel de Mundo + Superapp (los tres frentes comparten el mismo design system, así que el rebrandeo aplica a los tres a la vez, sin desfase visual entre plataformas).

### #235 — Fix: line endings del rebrandeo + contraste de tabs inactivos en admin
Estado: 🟢 Completado

**Instrucción de trabajo:** Después del rebrandeo masivo, cerrar dos papercuts reales encontrados en revisión: line endings corruptos por el cambio de archivos a gran escala, contraste insuficiente en tabs inactivos del admin, y el gris de texto de estado "default" (sin dato / inactivo) con muy poco contraste contra el fondo claro en varias pantallas de ambos productos.

**Qué se resolvió:** Fix de line endings + contraste de tabs inactivos (commit `540b36f`), más un ajuste del tono de gris en los tokens de estado default compartidos (commit `1634a48`) -- ambos aplicados el mismo día como cierre directo del rebrandeo.

**Flujo / diseño técnico:** Un solo token de color reutilizado en badges/pills/estado por defecto en todo el sistema de diseño -- el ajuste se propaga a cada lugar que lo usa sin tocarlos uno por uno.

**Flujo de usuario:** Texto de estado (ej. "Sin actividad", "Pendiente") y tabs inactivos ahora se leen con contraste suficiente en cualquier pantalla de ambos productos.

**Journey UX unificado:** Admin RedPontis + Superapp (mismo token de diseño, mismo fix, ambos frentes). Fix de accesibilidad transversal, sin journey de usuario propio más allá de "ahora se puede leer".

### #236 — Instalar JOI 360 como PWA en móvil, landing→superapp completo
Estado: 🟢 Completado

**Instrucción de trabajo:** Que la superapp se pueda instalar como PWA desde el celular, con un landing real antes de entrar -- no solo funcionar dentro de una pestaña del navegador.

**Qué se resolvió:** Manifest + landing de instalación conectados de punta a punta -- desde el landing público hasta la superapp instalada como ícono nativo en el celular (commit `c8498af`).

**Flujo / diseño técnico:** El manifest declara ícono, nombre y colores de la PWA -- el navegador (Chrome/Android) detecta que es instalable y ofrece "Agregar a pantalla de inicio"; una vez instalada, abre directo en la superapp sin barra de navegador.

**Flujo de usuario:** El usuario entra al link desde el celular, ve el landing, y puede instalar JOI 360 como cualquier app nativa -- queda con su propio ícono, sin depender de tener el navegador abierto cada vez.

**Journey UX unificado:** Superapp (landing → instalación PWA → superapp instalada). Un solo touchpoint, pero cambia de raíz cómo el usuario accede de ahí en adelante -- de "abrir un link" a "abrir una app".

### #237 — Bug: saldo mostraba "2 37.14" en vez de "S/ 37.14" — moneda corrupta
Estado: 🟢 Completado

**Instrucción de trabajo:** Corregir este bug real: el saldo de wallet se mostraba como "2 37.14" en vez de "S/ 37.14" en la superapp -- el símbolo de moneda salía corrupto.

**Qué se resolvió:** El formateo del monto concatenaba mal el símbolo de moneda (perdía la "S/" y dejaba un "2" residual al inicio) -- corregido en el punto exacto donde se arma el string de saldo mostrado (commit `9a19d06`).

**Flujo / diseño técnico:** Bug de formato puro en la función que arma el texto del saldo -- ver el commit real para la línea exacta corregida.

**Flujo de usuario:** El saldo de wallet ahora se lee correctamente como "S/ 37.14" en la pantalla principal de cualquier usuario con saldo, en vez de mostrar un símbolo corrupto que generaba desconfianza sobre el monto real.

**Journey UX unificado:** Superapp (un solo touchpoint, sin handoff a otra plataforma). Bug de formato visible directamente donde el usuario mira su saldo.

### #238 — Precompra de evento — lado del asistente + entrega en comercio
Estado: 🟢 Completado

**Instrucción de trabajo:** Cerrar el tramo que la tarea #231 había dejado pendiente a propósito: que el asistente pueda comprar los productos de precompra desde la superapp tras comprar su entrada, y que el comercio pueda marcar la entrega en el punto de evento.

**Qué se resolvió:** Pantalla de precompra en la superapp conectada al catálogo real de productos por evento (mismo mecanismo `event_id` que ya usaba la autoría del lado del organizador), más la vista de entrega del lado del comercio para marcar qué se retiró (commit `e3ebfe5`).

**Flujo / diseño técnico:** Asistente compra su entrada -> ve los productos de precompra disponibles para ese evento -> compra con su saldo real -> el pedido queda pendiente de entrega -> el comercio, en su panel o el POS del evento, lo marca como entregado.

**Flujo de usuario:** El asistente no solo compra su entrada -- también puede pre-comprar comida o merchandising del evento con anticipación y solo pasar a recogerlo, sin hacer fila para comprar en el momento.

**Journey UX unificado:** Superapp (el asistente compra el producto de precompra) → Panel de Merchant / POS del evento (marca la entrega). Cierra el journey que la tarea #231 había dejado abierto a propósito -- ahora la autoría (comercio carga producto) y el consumo (asistente compra, comercio entrega) están conectados de punta a punta.

### #239 — SQL: restaurar validación de dueño en mover_saldo_wallet (regresión de #181 sobre #121)
Estado: 🟢 Completado

**Instrucción de trabajo:** Restaurar la validación de dueño/turno en `mover_saldo_wallet` que la tarea #121 había cerrado -- una migración posterior (fix-181, restricciones granulares de dependiente) reescribió la función completa y, sin querer, no conservó esa validación, dejando otra vez abierto el hueco de seguridad que #121 había cerrado.

**Qué se resolvió:** Nueva versión de la función que combina ambas validaciones en un solo cuerpo -- la de dueño/turno de #121 y las de restricciones de dependiente de #181 -- documentada en `fix-234-restaurar-dueno-wallet.sql`, sin que ninguna de las dos pise a la otra.

**Flujo / diseño técnico:** La función valida en el mismo paso: turno de POS abierto O dueño/apoderado autenticado, Y las restricciones del dependiente (horario, límite diario, productos bloqueados) si aplica -- todo antes de tocar cualquier fila de saldo.

**Flujo de usuario:** Transparente para el usuario legítimo -- el efecto es que un gap de seguridad real (cualquiera con la llave anónima podía volver a mover saldo ajeno) queda cerrado de nuevo, sin reabrir el problema de restricciones que #181 había resuelto.

**Journey UX unificado:** Superapp / POS (origen del movimiento) → RPC de wallet (valida dueño/turno + restricciones en un solo paso) → Wallet. Journey de seguridad restaurado -- mismo patrón que #121, ahora robusto contra la regresión que #181 había introducido sin querer.

### #240 — Suscripciones (membresía real, modelo YOKI) + Cashback modalidad por_comercio
Estado: 🟢 Completado

**Instrucción de trabajo:** Construir Suscripciones como membresía real (modelo YOKI): que el mundo cree planes desde su propio Panel de Mundo con branding propio (banner, logo, color exacto en cuentagotas), categoría de beneficio (sorteo, descuento, acceso, producto, otro) y comercios afiliados -- con cobro RECURRENTE real contra la wallet del usuario, no solo el cobro único al vincular un dependiente que ya existía. En paralelo, construir Cashback con dos modalidades configurables por RedPontis (flat o por_comercio) y una cola de aprobación para que el mundo solo pueda solicitar cambios, nunca aplicarlos directo.

**Qué se resolvió:** `subscription_plans` extendida con branding y categoría de beneficio, más `subscription_plan_merchants` (comercios afiliados) y `subscription_suscriptores` (suscriptor real, con `proxima_fecha_cobro`) -- habilitando cobro recurrente de verdad. Un motor de ciclo (`sincronizarCicloSuscripcionesMembresia`) corre en cada carga de Wallet, igual que ya hacía el motor de BNPL, cobrando cuando la fecha vence y avanzando el período. Cashback sumó el campo `modalidad` (flat/por_comercio) al config de la capacidad, un cálculo de cashback-por-comercio derivado de `transactions` (sin tocar la función que mueve dinero real), y `cashback_change_requests` para que el mundo pida cambios que RedPontis aprueba desde Gobierno.

**Flujo / diseño técnico:** Mundo activa Suscripciones -> crea un plan con su marca (banner/logo/color), elige categoría de beneficio y comercios afiliados -> el usuario se suscribe, paga el primer período -> desde ahí, cada vez que abre su Wallet, el sistema revisa si tocaba cobrar y lo hace solo, sin que nadie tenga que apretar un botón. Cashback: RedPontis define la modalidad -> el mundo puede pedir un cambio -> RedPontis aprueba o rechaza con motivo -> si aprueba, se aplica.

**Flujo de usuario:** El usuario ve el plan con la marca del mundo (no un plan genérico), se suscribe una vez, y su saldo se descuenta solo cada período sin que tenga que volver a confirmar nada. En Wallet, si el mundo eligió cashback por comercio, ve el desglose de cuánto ganó en cada tienda; si eligió flat, ve solo el acumulado total.

**Journey UX unificado:** Panel de Mundo (crea el plan con marca propia, o pide cambio de modalidad de cashback) → Admin RedPontis / Gobierno (aprueba solicitudes de cashback) → Superapp (usuario se suscribe, cobro recurrente automático en cada carga de Wallet; ve su cashback acumulado o desglosado). Journey nuevo de punta a punta: es el primer motor de cobro recurrente real del ecosistema fuera de BNPL, y la primera capacidad donde el mundo pide un cambio en vez de aplicarlo directo.

### #241 — Bug: comercios afiliados en Suscripciones no mostraban nombre (encontrado y corregido en vivo)
Estado: 🟢 Completado

**Instrucción de trabajo:** Verificación en vivo, pedida explícitamente: confirmar que la superapp renderiza correctamente las capacidades recién construidas (Suscripciones, Cashback) contra datos reales de Supabase, no solo contra el código.

**Qué se resolvió:** Al crear un plan real de prueba en el Panel de Mundo, el selector de "comercios afiliados" mostraba checkboxes sin ningún nombre -- imposible saber a qué comercio se estaba afiliando el plan. La causa: el componente leía `c.nombre`, pero la función que trae los comercios desde Supabase devuelve filas crudas con la columna `name` (no `nombre`, que es el campo usado en el resto del código local). Corregido cambiando la lectura a `c.name`.

**Flujo / diseño técnico:** `fetchMerchantsRemote` hace `select=*` directo contra la tabla `merchants` de Supabase -- devuelve el nombre de columna real de la base (`name`), distinto del campo `nombre` que usa el resto de la app (mapeado desde el store local). El checkbox de comercios afiliados fue el único punto que leyó ese resultado crudo sin pasar por el mapeo.

**Flujo de usuario:** Antes del fix: el mundo no podía saber qué comercio estaba afiliando a un plan de Suscripciones -- el checkbox aparecía vacío. Después: cada comercio se ve con su nombre real, se puede elegir con confianza.

**Journey UX unificado:** Panel de Mundo (crear/editar plan de Suscripción, elegir comercios afiliados) → Supabase (`merchants`). Bug encontrado en vivo durante la verificación pedida, corregido y desplegado el mismo día.

### #242 — Bug: CashbackTemplate mostraba data mockeada, no real (encontrado y corregido en vivo)
Estado: 🟢 Completado

**Instrucción de trabajo:** Continuación de la misma verificación en vivo: confirmar que Cashback también renderiza correctamente en la superapp con datos reales, no mockeados.

**Qué se resolvió:** La tarjeta de Cashback en "Mis módulos" del Home de la superapp (independiente de la que vive embebida dentro de Wallet) seguía mostrando un saldo fijo ("S/ 24.50"), un historial de 3 transacciones hardcodeadas con nombres de comercios que ni siquiera existen en el mundo probado -- nunca se había conectado a los datos reales, pese a que la tarjeta de Wallet sí los usa desde antes. Corregida para usar el mismo hook `useWalletLive` que ya usa Wallet, y `useMerchantsLive` para mostrar el nombre real del comercio donde más cashback se ganó.

**Flujo / diseño técnico:** El componente standalone de Cashback (`CashbackTemplate`) vivía desde una versión anterior con datos de ejemplo escritos directo en el código -- nunca se actualizó cuando Cashback pasó a tener datos reales en Wallet. Ahora lee saldo, desglose por comercio e historial real de transacciones, igual que Wallet.

**Flujo de usuario:** Antes del fix: cualquier usuario que entrara al tile de Cashback veía un saldo y un historial falsos, sin relación con su actividad real -- una desconexión seria entre lo que Wallet mostraba (correcto) y lo que este tile mostraba (mockeado). Después: mismo dato real en los dos lugares donde aparece Cashback.

**Journey UX unificado:** Superapp Home (tile "Cashback" en Mis módulos) → Supabase (`transactions`, vía el mismo hook que usa Wallet). Bug encontrado en vivo durante la verificación pedida, corregido y desplegado el mismo día -- ejemplo real de por qué vale la pena probar cada capacidad en los dos lugares donde renderiza, no solo en uno.

### #243 — Documento Word: Roadmap de entrega para el CTO — mapeo de capacidades, paneles y propuesta de bloques
Estado: 🟢 Completado

**Instrucción de trabajo:** Armar un documento en Word, en tono accesible para alguien de negocio/CTO sin conocimiento técnico profundo: qué es cada cosa, cómo se ve el menú lateral de cada panel según qué capacidades están activas, puntos de choque de renderización encontrados, y una propuesta de roadmap de entrega por bloques -- dejando explícito que este ecosistema es un prototipo funcional (no producción) y que la decisión real de qué construir es de desarrollo (Salvador) y del CTO.

**Qué se resolvió:** Documento de 7 secciones con capturas reales tomadas en vivo contra el prototipo (no maquetas): glosario de los 5 frentes, mapa completo del sidebar por panel, capturas del flujo de creación/entrega de mundo, tabla de puntos de choque (incluyendo los dos bugs de #241/#242, encontrados y corregidos en el camino), gaps de marca en la superapp (login sin brandear, sin stepper de bienvenida, sin colorimetría aplicada), y una propuesta de roadmap en 6 bloques -- ajustada después a pedido explícito para usar Colegio Raimondi (no Jockey Plaza) como ejemplo de capacidades de flujo completadas, y para excluir Wallet/Comercios/Compras y Transacciones/Inventario del ejemplo destacado por ser base configurable, no flujo propio de cara al usuario.

**Flujo / diseño técnico:** Generado con python-docx a partir de una auditoría de código real (rutas de sidebar, wizard de 7 pasos, hub de entrega de credenciales) cruzada con verificación en vivo en el navegador -- cada afirmación del documento tiene una captura o una lectura de código real detrás, sin contenido inventado.

**Flujo de usuario:** No aplica -- es un entregable de documentación para stakeholders, no una feature del producto.

**Journey UX unificado:** No aplica -- documento de referencia, no un flujo de usuario del ecosistema.

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-19 | `ef3ee5a` | feat(app): rebrandeo completo a JoiSolutions Design System v1.0 (Navy + Gold) |
| 2026-08-19 | `9a19d06` | fix(app): saldo mostraba "2 37.14" en vez de "S/ 37.14" -- moneda corrupta |
| 2026-08-19 | `c8498af` | feat: instalar JOI 360 como PWA en móvil, landing->superapp completo |
| 2026-08-19 | `a4baf25` | feat(admin): rebrandeo a JoiSolutions Design System v1.0 (Navy + Gold) |
| 2026-08-19 | `540b36f` | fix: line endings del rebrandeo + contraste de tabs inactivos en admin |
| 2026-08-19 | `1634a48` | Oscurece el gris de estado default en admin y superapp |
| 2026-08-19 | `98d3290` | docs: SQL para restaurar validación de dueño en mover_saldo_wallet |
| 2026-08-19 | `e3ebfe5` | feat: Precompra de evento -- lado del asistente + entrega en comercio |
| 2026-08-20 | `06a24bd` | feat: Suscripciones (membresia real, modelo YOKI) + Cashback modalidad por_comercio |
| 2026-08-24 | `94abf3c` | fix(admin): comercios afiliados en Suscripciones no mostraban nombre |
| 2026-08-24 | `18e0606` | fix(app): CashbackTemplate mostraba data mockeada, no real |

# Fase: Versionado de capacidades + 6 planificadas a v1.0.0
*24-ago a 28-ago*

Esta fase cierra el "plan de construcción por capacidad" que Camila pidió el 26-ago: darle una versión propia a cada capacidad del catálogo y construir, una por una, las que se podían hacer con software puro. Las 6 capacidades verdes del plan (Loyalty, Turnos, Transporte, Reservas, Estacionamiento, Subsidio) pasaron de `0.0.0` a `1.0.0`; sus 4 migraciones de Supabase se corrieron y se verificó cada capacidad en vivo, de punta a punta, el 28-ago. Quedan 3 planificadas (`0.0.0`): Facturación, Crédito y Asistencia, bloqueadas por convenio externo o por una decisión de producto.

### #244 — Promociones al flujo estándar de capacidades + techo global de MDR + marca del login + stepper de bienvenida
Estado: 🟢 Completado

**Instrucción de trabajo:** Sacar Promociones del limbo (backend y UI reales pero inalcanzables porque dependían de un `type` de mundo retirado) e integrarla al flujo estándar de capacidades, como cualquier otra. En paralelo: poner un techo global a la tarifa (MDR) que un mundo puede cobrar a sus merchants, brandear el login de la superapp y agregar un stepper de bienvenida la primera vez que alguien entra sin comunidades.

**Qué se resolvió:** Promociones salió de `MODULOS_PROXIMAMENTE` — la pestaña se activa igual que Eventos (capacidad activada, no `mundo.type`) y sincroniza a `world_capacity_configs`; el catálogo de `servicios` se recortó al cupón QR real (banner/push/A-B testing quedaron como fase 2). El MDR/fijo por Tx que un mundo define para sus merchants ya no puede superar la "Tasa base" del canal correspondiente en Adquirencia Global (techo visible + guardado bloqueado si se excede), mismo patrón que ya regía para Emisión. El fondo del login/signup pasó al token real Surface Hero del design system con "JOI Solutions" como eyebrow; `WelcomeStepper` de 3 pasos se muestra una sola vez a un usuario sin ninguna comunidad (commit `e68db55`).

**Flujo / diseño técnico:** Activación de Promociones por el mismo camino que cualquier capacidad OPCIONAL (Catálogo de Capacidades del mundo → `world_capacity_configs`). El techo de MDR se valida en `Emision.jsx`/`Adquirencia.jsx` contra la tarifa base del canal antes de permitir guardar. El stepper persiste su "ya visto" en `localStorage`.

**Flujo de usuario:** Un mundo puede activar Promociones desde su pestaña de capacidades y el cupón QR aparece de verdad en la superapp de sus usuarios. Un admin que intenta ponerle a un merchant un MDR por encima del techo global ve el bloqueo y el valor máximo permitido. El usuario nuevo ve un login con la marca JOI Solutions y, si todavía no pertenece a ninguna comunidad, un recorrido de bienvenida de 3 pasos antes de la lista de comunidades.

**Journey UX unificado:** Panel de Mundo (activa Promociones / configura MDR con el techo visible) → Admin RedPontis / Adquirencia Global (define la tasa base que actúa de techo) → Superapp (login brandeado → stepper de bienvenida → cupón QR de Promociones en Mis módulos).

### #245 — Versionado semver por capacidad + limpieza de Catálogos Globales + Loyalty v1.0.0
Estado: 🟢 Completado

**Instrucción de trabajo:** Ponerle un número de versión propio a cada capacidad del `MODULE_CATALOG` (independiente entre sí, no una versión global del producto), que se actualice siempre después de cada cambio y se refleje en el corte semanal. Aprovechar para limpiar Catálogos Globales (canales de Emisión que se mostraban "disponibles" sin gateway real detrás) y construir Loyalty real.

**Qué se resolvió:** Cada entrada de `MODULE_CATALOG` lleva ahora `version` (semver), visible en el Catálogo de Capacidades del admin junto al nombre — baseline `1.0.0` para las 13 ya construidas, `0.0.0` para las 9 planificadas. Los canales `QR` (Ligo) y `Tarjeta` (Culqi) de Emisión pasaron a `disponible:false` en código y en la fila real de Supabase (`emission_channels`), mismo criterio que `tap2phone` en Adquirencia. Loyalty se construyó a `v1.0.0`: puntos 100% reales derivados de `transactions` (type=compra) con la equivalencia del mundo, sin columna de saldo nueva ni tocar `mover_saldo_wallet`; hook compartido `useLoyaltyPuntos`/`useLoyaltyPuntosBatch` conecta Hub, Profile y el módulo Lealtad al mismo dato; niveles Bronce/Plata/Oro en vivo. El canje de puntos quedó como "Próximamente" a propósito, en vez de un catálogo de vouchers inventado (commit `21d24bc`).

**Flujo / diseño técnico:** `version` es un campo más de cada objeto del catálogo; sube manualmente como parte del cambio que lo amerita. Loyalty no tiene tabla propia — `fetchLoyaltyPuntos` suma `transactions` reales y aplica la equivalencia; deliberado para no agregar lógica al RPC crítico de saldo sin testeo dedicado.

**Flujo de usuario:** En el admin, cada tarjeta de capacidad muestra su versión (`v1.0.0` / `v0.0.0`). En la superapp, el usuario ve sus puntos reales acumulados por sus compras en el mundo, su nivel calculado en vivo, y un aviso honesto de que el canje llega en una versión próxima.

**Journey UX unificado:** Admin RedPontis / Catálogo de Capacidades (versión visible por capacidad) → Panel de Mundo (activa Loyalty, define la equivalencia) → Superapp (Hub + módulo Lealtad + Profile leen el mismo saldo real de puntos).

### #246 — Precompra de eventos alcanzable + Turnos, Transporte, Reservas y Estacionamiento construidas
Estado: 🟢 Completado

**Instrucción de trabajo:** Hacer la precompra de eventos realmente alcanzable en el flujo, y construir a `v1.0.0` las 4 capacidades planificadas que se podían hacer con software puro sin dependencia externa: Turnos (food court), Transporte, Reservas y Estacionamiento.

**Qué se resolvió:** **Turnos** — tabla `turno_pedidos` (estado `recibido → preparando → listo → entregado`); el pedido se crea solo al pagar en un comercio del mundo (`crearSeguimientoTurno`, no bloquea el pago si falla), con panel de cocina real en el Operador del comercio. **Transporte** — pasaje contra la wallet con el mismo `pagarSupabase` ya probado, sin tabla nueva; el historial de viajes se deriva de `transactions` por referencia. **Reservas** — tabla `reservas` (recurso/fecha/hora), cancelación real, ocupación informativa; recursos reservables definidos por config del mundo; sin cobro obligatorio todavía. **Estacionamiento** — tabla `estacionamiento_sesiones` (ingreso/salida real); el cobro se calcula sobre el tiempo real transcurrido y se cobra al salir con el RPC de pago ya probado, nunca por adelantado (commit `27069f1`). Las 4 se verificaron en vivo el 28-ago tras correr sus migraciones (`4c9851b` marcó sus feature flags como `ready`).

**Flujo / diseño técnico:** Patrón común: capacidad activable con `configFields` propios + tabla Supabase propia con RLS `demo_anon_all` + template real en la superapp. Ninguna toca `mover_saldo_wallet`: Turnos/Reservas solo trackean estado, Transporte/Estacionamiento cobran con el `pagarSupabase` existente.

**Flujo de usuario:** El asistente a un evento puede pre-comprar productos y solo pasar a recogerlos. En un food court, el cliente ve el estado real de su pedido en vivo mientras el operador lo avanza desde su cocina. El usuario reserva un recurso del mundo por fecha y hora, y puede cancelar. Paga su pasaje de transporte contra su saldo. Registra su entrada al estacionamiento, ve el costo correr en tiempo real, y paga al salir.

**Journey UX unificado:** Panel de Mundo (activa cada capacidad, define config: recursos reservables, tarifa por hora, tarifa de pasaje) → Superapp (módulo dedicado por capacidad con datos reales) → POS/Operador del comercio (cola de cocina de Turnos). Migración SQL corrida vía Management API + verificación en vivo de punta a punta.

### #247 — Fix: el tablero de capacidades marcaba features reales como "Planificado"
Estado: 🟢 Completado

**Instrucción de trabajo:** Camila reportó que "hay algunas que están hechas pero siguen marcadas como planificadas" en el Catálogo de Capacidades. Auditar y corregir.

**Qué se resolvió:** `FLAG_DEV_MAP` (la pestaña "Feature Flags" de cada capacidad) es un rastreador granular por servicio, separado del `version` a nivel de capacidad — cuando un servicio no tiene entrada ahí, cae al default de su tier (`PREMIUM`/`OPCIONAL` → "Planificado"), sin importar si ya está construido, y eso bloquea el botón "Activar todos" para ese flag. Verificado contra el código real y corregido: `wallet:qr_fijo` (su desc ya decía "siempre activo en la práctica"), `suscripciones:planes`/`suscripciones:cobro` (Suscripciones cobra dinero real hace semanas — pasó de mostrar 0/2 a 2/2 listos), `control:reglas_mundo`, `menu:restricciones_alimentarias`, y `loyalty:*`/`transporte:*` marcados `ready` (commit `bc49712`). Los flags de `accesos:registro_zonas`/`registro_horarios` y `control:reglas_sponsor`/`aprobaciones` NO se tocaron — se confirmó que siguen siendo banners informativos que no hacen cumplir nada todavía.

**Flujo / diseño técnico:** Cada corrección es una entrada nueva en `FLAG_DEV_MAP` con `status: "ready"` y una nota del endpoint/mecanismo real.

**Flujo de usuario:** Cambio interno del panel de administración — el admin ahora ve el estado de desarrollo correcto de cada servicio y puede usar "Activar todos" donde antes estaba bloqueado sin motivo.

**Journey UX unificado:** Admin RedPontis / Catálogo de Capacidades → pestaña Feature Flags de cada capacidad. Sin journey de usuario final.

### #248 — Subsidio v1.0.0 — cierra el checklist de capacidades planificadas construibles
Estado: 🟢 Completado

**Instrucción de trabajo:** Construir Subsidio a `v1.0.0` — saldo dirigido real, acreditado por RedPontis a un usuario a la vez, con categorías de gasto permitidas y vigencia. Con esto se cierra el checklist de las 6 capacidades planificadas que se podían construir con software puro.

**Qué se resolvió:** Ledger propio `subsidios` — NO toca `wallets.balance` ni `mover_saldo_wallet`. Solo RedPontis acredita (decisión de Camila), uno a la vez, desde Usuarios → detalle de la persona (`SubsidioPanel`, visible solo si el mundo tiene la capacidad activa), con monto/categorías/vigencia y rastro de auditoría (`acreditado_por`). La superapp muestra el saldo dirigido real, las categorías permitidas y el vencimiento. Gastar el subsidio en una compra queda para una v1.1 que amerite integrarse con el RPC crítico de pagos con cuidado dedicado (commit `9eaeeeb`). Verificado en vivo el 28-ago.

**Flujo / diseño técnico:** `acreditarSubsidioRemote` inserta en `subsidios` con `acreditado_por = session().email`. `SubsidioTemplate` lee `fetchMisSubsidios` y consolida el saldo disponible (monto − monto_usado) de las acreditaciones vigentes.

**Flujo de usuario:** RedPontis entra a la ficha de una persona en un mundo con Subsidio activo, le acredita un monto con sus categorías y vigencia. Esa persona ve en su superapp "Saldo subsidiado", en qué categorías puede usarlo y cuándo vence, más el historial de acreditaciones.

**Journey UX unificado:** Admin RedPontis / Usuarios → detalle de la persona → SubsidioPanel (acredita) → Superapp / módulo Subsidio (saldo dirigido visible). Ledger propio, sin tocar la wallet.

### #249 — Sucursales Etapa B: saldo y bandita compartidos entre sucursales de un grupo
Estado: 🟢 Completado

**Instrucción de trabajo:** Cerrar la Etapa B de Sucursales: que un grupo de mundos que comparte saldo (`comparte_saldo_grupo`) resuelva todas las lecturas y escrituras de wallet a la sucursal principal del grupo — alta/baja de dependiente, cobro/recarga en POS, identificación por código, devoluciones.

**Qué se resolvió:** Todas las operaciones de wallet resuelven a la sucursal principal del grupo cuando `comparte_saldo_grupo` está activo, mismo mecanismo ya deployado en `joi-pos-backend`. Verificado en vivo con datos de prueba reales (commit `7f58caf`).

**Flujo / diseño técnico:** Una función de resolución de "mundo efectivo de wallet" se aplica antes de cada acceso a `wallets` — si el mundo pertenece a un grupo con saldo compartido, se usa el `world_id` de la sucursal principal.

**Flujo de usuario:** Un usuario con saldo cargado en una sucursal de un grupo puede consumir y recargar en cualquier otra sucursal del mismo grupo, con el mismo saldo y la misma bandita — no hay saldos separados por local.

**Journey UX unificado:** Panel de Mundo (define el grupo y marca la sucursal principal) → POS/Operador de cualquier sucursal del grupo (cobra/recarga contra el saldo compartido) → Superapp (el usuario ve un solo saldo para todo el grupo).

### #250 — Fix: refresco de capacidades por sesión + POS/Operador de Mundo como canal formal
Estado: 🟢 Completado

**Instrucción de trabajo:** Cerrar las Discrepancias #13 y #14 del documento maestro: el admin no refrescaba las capacidades de un mundo ya cacheado en la sesión, y la clave del POS/Operador de Mundo era un campo de texto libre sin flujo de activación formal.

**Qué se resolvió:** `refreshMundosLive()` (corre una sola vez por sesión de pestaña) ahora siempre toma lo que dice Supabase para `world_capacity_configs`, no solo para mundos que no existían en el store local — un mundo ya cargado ya no conserva su `modulos[]` viejo. El POS/Operador de Mundo pasa a canal formal con pill de Activo/Inactivo y botón explícito de Desactivar, mismo patrón que Wallet/Comercios (commit `6f04934`).

**Flujo / diseño técnico:** Como `refreshMundosLive()` tiene deps vacías en `App.jsx`, no hay edición local a medio hacer que pueda pisar — es seguro sobrescribir siempre con lo remoto.

**Flujo de usuario:** Un admin que abre un mundo en una pestaña nueva ve sus capacidades reales al instante, sin tener que limpiar caché. La clave del Operador de Mundo se activa/desactiva con un paso formal, no editando un campo suelto.

**Journey UX unificado:** Admin RedPontis / ficha de mundo → pestaña Capacidades (estado fresco desde Supabase) y tarjeta del Operador de Mundo (canal con estado Activo/Inactivo).

### #251 — Fix: el catálogo global de canales no releía de Supabase + ids desalineados
Estado: 🟢 Completado

**Instrucción de trabajo:** Cerrar la Discrepancia #15: `Emision.jsx` y `Adquirencia.jsx` empujaban cada guardado a Supabase pero nunca volvían a leer al montar (dos sesiones de RedPontis editando el mismo catálogo se pisaban en silencio), y el catálogo comercial de Adquirencia Global tenía un set de ids distinto al que un mundo realmente puede activar.

**Qué se resolvió:** Ambas pantallas jalan el catálogo real al montar. El catálogo de Adquirencia Global se deriva ahora 1:1 de `CANALES_ADQUIRENCIA` (los ids que un mundo sí puede activar en Módulos → Comercios); se retiró "Nuevo canal", que creaba ids que ningún mundo podía activar (commit `2988dd2`).

**Flujo / diseño técnico:** `fetch` del catálogo en el `useEffect` de montaje de cada pantalla, mismo patrón que ya se aplicó a las capacidades de mundo en la Discrepancia #13.

**Flujo de usuario:** Cambio interno del panel de RedPontis — dos personas editando el catálogo global de canales ya no se pisan, y configurar MDR/liquidación en Adquirencia Global siempre corresponde a un canal que un mundo puede activar de verdad.

**Journey UX unificado:** Admin RedPontis / Catálogos Globales → Emisión / Adquirencia. Sin journey de usuario final.

## Commits reales de esta fase

| Fecha | Hash | Commit |
|---|---|---|
| 2026-08-24 | `2988dd2` | fix(admin): catalogo global de canales no releia de Supabase + ids desalineados |
| 2026-08-24 | `7f58caf` | feat: saldo compartido entre sucursales de un grupo (Etapa B) en admin + superapp |
| 2026-08-24 | `6f04934` | fix(admin): refresco de capacidades por sesion + POS/Operador como canal real |
| 2026-08-26 | `e68db55` | feat: Promociones al flujo estandar, techo global de MDR, marca del login y stepper de bienvenida |
| 2026-08-26 | `21d24bc` | feat: versionado de capacidades, limpieza de Catalogos Globales, Loyalty v1.0.0 real |
| 2026-08-26 | `27069f1` | feat: Precompra de eventos alcanzable + 4 capacidades planificadas construidas (Turnos, Transporte, Reservas, Estacionamiento) |
| 2026-08-26 | `bc49712` | fix(admin): tablero de capacidades marcaba features reales como "Planificado" |
| 2026-08-26 | `9eaeeeb` | feat: Subsidio v1.0.0 -- cierra el checklist de capacidades planificadas construibles |
| 2026-08-28 | `4c9851b` | fix: capacidades v1.0.0 a "ready" (SQL corrido 28-ago) + timezone en ReservasTemplate |

*9 commits en esta fase.*

*11 commits en esta fase.*