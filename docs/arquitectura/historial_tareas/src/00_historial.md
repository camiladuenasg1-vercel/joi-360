# JOI360 — Historial de Tareas y Commits

Documento vivo · Versión **1.0** · 12 de agosto de 2026

Registro completo de las 132 tareas trabajadas en este monorepo (`#102`–`#233`) y de los 163 commits reales de git que representan el código que efectivamente cambió, organizados en 7 fases cronológicas — del 1 al 12 de agosto de 2026. Cuando un commit menciona explícitamente el número de tarea, queda cruzado como referencia directa.

## Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-08-12 | Primera versión — 132 tareas (#102–#233), 163 commits, 7 fases de desarrollo narradas cronológicamente. |

*Corte semanal: domingo. Próxima actualización: 16-ago-2026.*

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Tareas registradas | 132 |
| Tareas completadas | 130 |
| Tareas pendientes | 2 |
| Commits reales en el repo | 163 |
| Commits con tarea identificada | 46 |
| Rango de fechas | 2026-08-01 a 2026-08-12 |

## Cómo leer este documento

Dos vistas complementarias del mismo trabajo, por fase cronológica: **(A) Registro de tareas** — qué se pidió o encontró y su estado, en el lenguaje en que se reportó; **(B) Commits reales** — exactamente qué cambió en el código, con hash real de git, en el mismo rango de fechas. Donde un commit menciona explícitamente el número de tarea (`#NNN`), queda cruzado en la tarea correspondiente como referencia directa — el resto de los commits de la fase completan el detalle técnico aunque no hayan quedado etiquetados con un número.


# Fase: Arranque del monorepo y Motor de Eventos
*01-ago a 02-ago*

## A. Tareas de esta fase

- **#102** — Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales — 🟢 Completado
- **#103** — Poder revertir/reabrir el popup de elección de modo de Eventos — 🟢 Completado
- **#104** — Cola de requerimiento de hardware para el mundo (banditas + POS) — 🟢 Completado
- **#105** — Embebido: Motor de Eventos vive DENTRO del panel del mundo — 🟢 Completado
- **#106** — Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo — 🟢 Completado
- **#107** — Registro real en el superapp con verificación de correo — 🟢 Completado
- **#108** — Módulo de usuarios por mundo en RedPontis + KPIs para el mundo — 🟢 Completado
- **#109** — Sacar JOI Promos del alcance activo — 🟢 Completado
- **#110** — P2P deja billeteras en negativo (bug real de saldo) — 🟢 Completado
- **#111** — POS: pantalla de acceso con ficha del usuario e historial — 🟢 Completado

## B. Commits reales de esta fase

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

## A. Tareas de esta fase

- **#112** — QA end-to-end con 5 agentes sobre todo el ecosistema — 🟢 Completado
- **#113** — Rediseño arquitectónico del Core Platform JOI360 (ADR + diseño, sin código) — 🟢 Completado *(commit `021ac93`, 2026-08-04)*
- **#114** — CRÍTICO: la llave anónima del bundle expone PIN de POS y datos bancarios, y permite escribir dinero — 🟢 Completado
- **#115** — Liquidación genera netos negativos y deja procesarlos — 🟢 Completado
- **#116** — Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo — 🟢 Completado
- **#117** — Duplicados: 3 mundos "Colegio Raimondi" en Supabase — 🟢 Completado
- **#118** — POS/Operador: vincular bandita NFC directamente desde el POS — 🟢 Completado
- **#119** — Cash-in de evento: banditas pre-cargadas con lista de asistencia — 🟢 Completado *(commit `d9c5d96`, 2026-08-04)*
- **#120** — Menu: falta acción real en el POS/operador — 🟢 Completado *(commit `dc6b2d6`, 2026-08-04)*
- **#121** — RPC de wallet: cerrar el gap de autorización por dueño — 🟢 Completado *(commit `615b2f6`, 2026-08-04)*
- **#122** — E2E real en Raimondi: POS, merchant, mundo, usuarios, liquidación — 🟢 Completado *(commit `60426bb`, 2026-08-04)*
- **#123** — Auditar feature flags de cada módulo de capacidades — 🟢 Completado *(commit `7572ed0`, 2026-08-04)*
- **#124** — Pase de UX copywriting: quitar copys guía innecesarios + empty states — 🟢 Completado *(commit `202ec18`, 2026-08-04)*
- **#125** — Borrado total de BD + arranque limpio — 🟢 Completado *(commit `3193756`, 2026-08-04)*
- **#126** — Adquirencia: sincronizar canales/MDR real a Supabase (hoy es mock local) — 🟢 Completado *(commit `000ec8a`, 2026-08-04)*
- **#127** — POS T6: pull-to-refresh en la pantalla de inicio — 🟢 Completado *(commit `e7f1b2a`, 2026-08-04)*
- **#128** — POS: login diferenciado Mundo vs Comercio — 🟢 Completado *(commit `4d3ed8a`, 2026-08-04)*
- **#129** — Estandarizar tab "Canales" en todas las capacidades — 🟢 Completado *(commit `a1f7555`, 2026-08-04)*
- **#130** — Flujo NFC de dependientes vía DNI end-to-end — 🟢 Completado *(commit `9802ca8`, 2026-08-04)*
- **#131** — Badge "Pendiente / No activado" en mundo sin dashboard entregado — 🟢 Completado *(commit `00a6b1d`, 2026-08-04)*
- **#132** — Auditar render de superapp al habilitar Familiares en Wallet — 🟢 Completado *(commit `9802ca8`, 2026-08-04)*
- **#133** — QA de dependencias config/catálogos — auditoría cruzada — 🟢 Completado *(commit `e115236`, 2026-08-09)*
- **#134** — Botón con estado loading en design system + sync en cascada — 🟢 Completado *(commit `ecbb654`, 2026-08-09)*
- **#135** — KPI "Emisión acumulada" debe reflejar 0 real — 🟢 Completado
- **#136** — E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas — 🟡 Pendiente
- **#137** — Estandarizar registro de usuario en superapp — 🟢 Completado
- **#138** — Borrar data completa de superapp (destructivo, al final) — 🟢 Completado
- **#139** — Eliminar mundo JOI Promos + sacar Anunciantes del alcance — 🟢 Completado *(commit `9d5f7c0`, 2026-08-04)*
- **#140** — Dependientes: registro DNI+alias, consumo vía saldo asignado — 🟢 Completado *(commit `9802ca8`, 2026-08-04)*
- **#141** — Eventos 100% real + gestión embebida completa en panel del mundo — 🟢 Completado *(commit `d454577`, 2026-08-09)*
- **#142** — Quitar "Reset demo"; credenciales admin reales — 🟢 Completado *(commit `ee44d6f`, 2026-08-04)*
- **#143** — POS: cierre de sesión definitivo con protección de credenciales — 🟢 Completado *(commit `0fbf511`, 2026-08-09)*
- **#144** — Menú: flujo de compra — 🟢 Completado *(commit `dc6b2d6`, 2026-08-04)*
- **#145** — Reiniciar catálogo de hardware/banditas para inventario real — 🟢 Completado
- **#146** — Precio unitario por bandita/lote + discriminación al asignar — 🟢 Completado *(commit `a2dadd7`, 2026-08-04)*
- **#147** — Eliminar lote NFC con restricción + reversión de asignación — 🟢 Completado *(commit `a2dadd7`, 2026-08-04)*
- **#148** — Rediseñar precio/modelo de bandita: se fija al asignar, no al cargar — 🟢 Completado *(commit `84f6090`, 2026-08-04)*
- **#149** — Creación de mundo: solo mostrar módulos activos, ocultar "próximamente" — 🟢 Completado *(commit `a9fe9ab`, 2026-08-09)*
- **#150** — Moneda de wallet en creación de mundo: select de catálogo real, no texto libre — 🟢 Completado *(commit `a9fe9ab`, 2026-08-09)*

## B. Commits reales de esta fase

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

## A. Tareas de esta fase

- **#151** — Bug: error al crear producto en "Mi Catálogo" de comercio — 🟢 Completado
- **#152** — Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2 — 🟢 Completado
- **#153** — Menú: estado pendiente de publicación hasta tener programación asignada — 🟢 Completado *(commit `adc6473`, 2026-08-09)*
- **#154** — Tabla de usuarios por mundo: anidar dependientes + columnas de bandita — 🟢 Completado
- **#155** — Superapp: selector de perfil (titular/dependiente) antes de cualquier configuración — 🟢 Completado *(commit `ff56735`, 2026-08-09)*
- **#156** — Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo — 🟢 Completado
- **#157** — UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94) — 🟢 Completado
- **#158** — Flujo completo de solicitud de bandita: aviso al usuario + demanda/métricas para mundo y RedPontis — 🟢 Completado *(commit `e78e9be`, 2026-08-08)*
- **#159** — Ocultar transacciones de suscripción al comercio — solo RedPontis las ve — 🟢 Completado
- **#160** — POS: consulta por DNI (titular+dependientes) + módulo Perfil Extendido visible al mundo — 🟢 Completado *(commit `a528123`, 2026-08-08)*
- **#161** — Superapp: editar perfil de dependiente ya creado (alergias, etc.) — 🟢 Completado *(commit `b27bb0e`, 2026-08-08)*
- **#162** — Vincular pulsera: es por contacto NFC, no escaneo QR — 🟢 Completado
- **#163** — Bug: historial de accesos marca "fuera del colegio" pese a registrar "entrada" — 🟢 Completado
- **#164** — Merchant: autogenerar código de comercio + PIN de 4 dígitos si usa POS Operador — 🟢 Completado *(commit `6b0d6fa`, 2026-08-09)*
- **#165** — Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo) — 🟢 Completado
- **#166** — Perfil de mundo con imagen (como merchant) + thumbnail en card de comunidad — 🟢 Completado *(commit `95716db`, 2026-08-08)*
- **#167** — Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo — 🟢 Completado
- **#168** — Bandita universal para cuenta principal — discrimina wallet según mundo/comercio en el lector (arquitectura nueva) — 🟢 Completado *(commit `42966c0`, 2026-08-08)*
- **#169** — Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable — 🟢 Completado
- **#170** — Campanita de notificaciones en admin RedPontis + tablas + badges en sidebar — 🟢 Completado *(commit `8f2a867`, 2026-08-08)*
- **#171** — Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa) — 🟢 Completado
- **#172** — POS/Tótem: separar catálogo de modelos de inventario de unidades — 🟢 Completado *(commit `3f454e5`, 2026-08-08)*
- **#173** — Restricciones granulares: por dependiente, por mundo y por perfil — no un horario macro global — 🟢 Completado
- **#174** — Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento — 🟢 Completado
- **#175** — Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú — 🟢 Completado

## B. Commits reales de esta fase

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

## A. Tareas de esta fase

- **#176** — RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware — 🟢 Completado
- **#177** — Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view — 🟢 Completado
- **#178** — Audit each active capacidad against its correct rendering front(s) — 🟢 Completado
- **#179** — Live E2E: merchant role (cobrar, catálogo, consulta, cierre) — 🟢 Completado
- **#180** — Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento) — 🟢 Completado
- **#181** — Bug DNI: cuenta principal mostraba perfil del dependiente — 🟢 Completado
- **#182** — Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo — 🟢 Completado
- **#183** — Auditoría completa de modelado de datos (Supabase) — 🟢 Completado
- **#184** — Migrar joi360-admin/app a variables de entorno reales en Vercel — 🟢 Completado
- **#185** — Instalar última versión en el T6 físico — 🟢 Completado
- **#186** — Auditar banners en Restricciones (superapp) — 🟢 Completado
- **#187** — Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en "Mis eventos" — 🟢 Completado
- **#188** — Ejecutar fixes de la Auditoría de Datos JOI360 — 🟢 Completado
- **#189** — Loading state en TODOS los botones de creación (proyecto-wide) — 🟢 Completado
- **#190** — Bug: vincular bandita da "usuario no reconocido" con usuario real registrado en Jockey Plaza — 🟢 Completado

## B. Commits reales de esta fase

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

## A. Tareas de esta fase

- **#191** — Cooldown de 2 min para reenvío de link de confirmación de correo — 🟢 Completado
- **#192** — Usuarios en admin RedPontis aparecen sin sus datos 360 — 🟢 Completado
- **#193** — Superapp: opción de eliminar dependiente/familiar — 🟢 Completado
- **#194** — Bug: "no tienes ningún mundo" al entrar a Explorar Mundos en superapp — 🟢 Completado
- **#195** — DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end — 🟢 Completado
- **#196** — Raimondi: probar fino flujos E2E de saldo, vinculación bandita, cobro y compra por QR — 🟢 Completado *(commit `962ed3a`, 2026-08-12)*
- **#197** — Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos — 🟢 Completado
- **#198** — Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis — 🟢 Completado
- **#199** — Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla — 🟢 Completado
- **#200** — Eventos embebidos en panel de mundo para Jockey Plaza (construir feature completo) — 🟢 Completado
- **#201** — Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa — 🟢 Completado
- **#202** — Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual — 🟢 Completado
- **#203** — Verificar bug de precio de entrada en NumInput — 🟢 Completado
- **#204** — Badge de estado de evento debe reflejar aprobación real de BD — 🟢 Completado
- **#205** — Agregar upload de banner de evento con espejo en superapp — 🟢 Completado
- **#206** — RUC input: máximo 11 dígitos — 🟢 Completado
- **#207** — Cuenta bancaria: máximo 14 dígitos — 🟢 Completado
- **#208** — CCI: máximo 20 dígitos — 🟢 Completado
- **#209** — Paso 3 crear mundo: no deja adjuntar dos documentos — 🟢 Completado
- **#210** — Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN — 🟢 Completado
- **#211** — Paso 4 Compras y transacciones: campo de hora debe ser time picker — 🟢 Completado
- **#212** — Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo) — 🟢 Completado
- **#213** — Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses — 🟢 Completado
- **#214** — Eliminar referencia a 'costo agregado' del catálogo — 🟢 Completado

## B. Commits reales de esta fase

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

## A. Tareas de esta fase

- **#215** — Configurar wallet: 'Usar sin límite' no cambia el campo — 🟢 Completado
- **#216** — Configurar wallet: 'Usar sin tope de recarga' no cambia el campo — 🟢 Completado
- **#217** — Configurar wallet: 'Usar sin vencimiento' no cambia el campo — 🟢 Completado
- **#218** — Vigencia de la pulsera: usar selector de fecha (calendario) — 🟢 Completado
- **#219** — Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil — 🟢 Completado
- **#220** — Configuración menú: método de reserva QR, Saldo o Ambos — 🟢 Completado
- **#221** — Liquidación: investigar y mostrar fecha (requiere análisis previo) — 🟢 Completado *(commit `1ac1de5`, 2026-08-11)*

## B. Commits reales de esta fase

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

## A. Tareas de esta fase

- **#222** — Fix: error al marcar "entregado" solicitud de banditas (Jockey Plaza) — 🟢 Completado
- **#223** — Usuarios (admin RP): detalle en vista de página nueva, no drawer — 🟢 Completado *(commit `be4a6f9`, 2026-08-12)*
- **#224** — Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar — 🟢 Completado
- **#225** — Superapp: módulo de Eventos a scroll vertical con más mini cards — 🟢 Completado
- **#226** — Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más) — 🟢 Completado
- **#227** — Bug: botón "Bandita NFC" en Home del mundo navega a Recarga (afecta todos los mundos) — 🟢 Completado
- **#228** — Eventos embebido: gestión completa + comercios por evento + aprobación con detalle — 🟢 Completado *(commit `e63622f`, 2026-08-12)*
- **#229** — Sucursales: grupo de mundos con selector in-place en superapp — 🟡 Pendiente
- **#230** — Superapp: vincular bandita directo (Web NFC) sin flujo de solicitud — 🟢 Completado *(commit `89d0535`, 2026-08-12)*
- **#231** — Precompra evento B2B: stock real + label separado de catálogo — 🟢 Completado
- **#232** — Pivot piloto Jockey Plaza: borrado + limpieza de código completado — 🟢 Completado
- **#233** — Suscripciones formalizada como capacidad propia — deployado y verificado — 🟢 Completado

## B. Commits reales de esta fase

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

*15 commits en esta fase.*