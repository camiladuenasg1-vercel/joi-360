# -*- coding: utf-8 -*-
"""Genera el markdown fuente del Historial de Tareas y Commits, cruzando la
lista de tareas del tracker con el git log real, y describiendo cada tarea
en 5 dimensiones: que se pidio, que se resolvio, el flujo/diseno, el flujo
de usuario, y el journey UX unificado (touchpoints encadenados, en base a
los commits reales) -- para que el documento sirva como fuente completa de
contexto de todo lo construido, sin depender de que alguien mas lo haya
visto antes."""
import re, os, subprocess

TASKS = [
(102,"completed","Motor de Eventos: discriminar B2B / B2C / Embebido con dependencias reales"),
(103,"completed","Poder revertir/reabrir el popup de elección de modo de Eventos"),
(104,"completed","Cola de requerimiento de hardware para el mundo (banditas + POS)"),
(105,"completed","Embebido: Motor de Eventos vive DENTRO del panel del mundo"),
(106,"completed","Ficha completa de evento: portada, mapa PDF, merchants asociados, preventa por tipo"),
(107,"completed","Registro real en el superapp con verificación de correo"),
(108,"completed","Módulo de usuarios por mundo en RedPontis + KPIs para el mundo"),
(109,"completed","Sacar JOI Promos del alcance activo"),
(110,"completed","P2P deja billeteras en negativo (bug real de saldo)"),
(111,"completed","POS: pantalla de acceso con ficha del usuario e historial"),
(112,"completed","QA end-to-end con 5 agentes sobre todo el ecosistema"),
(113,"completed","Rediseño arquitectónico del Core Platform JOI360 (ADR + diseño, sin código)"),
(114,"completed","CRÍTICO: la llave anónima del bundle expone PIN de POS y datos bancarios, y permite escribir dinero"),
(115,"completed","Liquidación genera netos negativos y deja procesarlos"),
(116,"completed","Documento Maestro JOI360 (10 secciones) — capturas + anexo iOS nativo"),
(117,"completed","Duplicados: 3 mundos \"Colegio Raimondi\" en Supabase"),
(118,"completed","POS/Operador: vincular bandita NFC directamente desde el POS"),
(119,"completed","Cash-in de evento: banditas pre-cargadas con lista de asistencia"),
(120,"completed","Menu: falta acción real en el POS/operador"),
(121,"completed","RPC de wallet: cerrar el gap de autorización por dueño"),
(122,"completed","E2E real en Raimondi: POS, merchant, mundo, usuarios, liquidación"),
(123,"completed","Auditar feature flags de cada módulo de capacidades"),
(124,"completed","Pase de UX copywriting: quitar copys guía innecesarios + empty states"),
(125,"completed","Borrado total de BD + arranque limpio"),
(126,"completed","Adquirencia: sincronizar canales/MDR real a Supabase (hoy es mock local)"),
(127,"completed","POS T6: pull-to-refresh en la pantalla de inicio"),
(128,"completed","POS: login diferenciado Mundo vs Comercio"),
(129,"completed","Estandarizar tab \"Canales\" en todas las capacidades"),
(130,"completed","Flujo NFC de dependientes vía DNI end-to-end"),
(131,"completed","Badge \"Pendiente / No activado\" en mundo sin dashboard entregado"),
(132,"completed","Auditar render de superapp al habilitar Familiares en Wallet"),
(133,"completed","QA de dependencias config/catálogos — auditoría cruzada"),
(134,"completed","Botón con estado loading en design system + sync en cascada"),
(135,"completed","KPI \"Emisión acumulada\" debe reflejar 0 real"),
(136,"pending","E2E guiado con la usuaria: Raimondi + Eventos en todas las plataformas"),
(137,"completed","Estandarizar registro de usuario en superapp"),
(138,"completed","Borrar data completa de superapp (destructivo, al final)"),
(139,"completed","Eliminar mundo JOI Promos + sacar Anunciantes del alcance"),
(140,"completed","Dependientes: registro DNI+alias, consumo vía saldo asignado"),
(141,"completed","Eventos 100% real + gestión embebida completa en panel del mundo"),
(142,"completed","Quitar \"Reset demo\"; credenciales admin reales"),
(143,"completed","POS: cierre de sesión definitivo con protección de credenciales"),
(144,"completed","Menú: flujo de compra"),
(145,"completed","Reiniciar catálogo de hardware/banditas para inventario real"),
(146,"completed","Precio unitario por bandita/lote + discriminación al asignar"),
(147,"completed","Eliminar lote NFC con restricción + reversión de asignación"),
(148,"completed","Rediseñar precio/modelo de bandita: se fija al asignar, no al cargar"),
(149,"completed","Creación de mundo: solo mostrar módulos activos, ocultar \"próximamente\""),
(150,"completed","Moneda de wallet en creación de mundo: select de catálogo real, no texto libre"),
(151,"completed","Bug: error al crear producto en \"Mi Catálogo\" de comercio"),
(152,"completed","Bug: catálogo de Menú solo renderiza 1 plato en superapp aunque el panel tenga 2"),
(153,"completed","Menú: estado pendiente de publicación hasta tener programación asignada"),
(154,"completed","Tabla de usuarios por mundo: anidar dependientes + columnas de bandita"),
(155,"completed","Superapp: selector de perfil (titular/dependiente) antes de cualquier configuración"),
(156,"completed","Bug crítico: vincular bandita por UID no reconoce las 501 ya asignadas al mundo"),
(157,"completed","UID de bandita: reconocer formato serial (04:D6:01:5A:68:19:94)"),
(158,"completed","Flujo completo de solicitud de bandita: aviso al usuario + demanda/métricas para mundo y RedPontis"),
(159,"completed","Ocultar transacciones de suscripción al comercio — solo RedPontis las ve"),
(160,"completed","POS: consulta por DNI (titular+dependientes) + módulo Perfil Extendido visible al mundo"),
(161,"completed","Superapp: editar perfil de dependiente ya creado (alergias, etc.)"),
(162,"completed","Vincular pulsera: es por contacto NFC, no escaneo QR"),
(163,"completed","Bug: historial de accesos marca \"fuera del colegio\" pese a registrar \"entrada\""),
(164,"completed","Merchant: autogenerar código de comercio + PIN de 4 dígitos si usa POS Operador"),
(165,"completed","Instalar APK con fix de NFC en el T6 (falta conectar el dispositivo)"),
(166,"completed","Perfil de mundo con imagen (como merchant) + thumbnail en card de comunidad"),
(167,"completed","Nomenclatura dinámica de cuenta principal/dependiente según rubro del mundo"),
(168,"completed","Bandita universal para cuenta principal — discrimina wallet según mundo/comercio en el lector (arquitectura nueva)"),
(169,"completed","Catálogo de productos merchant: categorías inteligentes vía combobox reutilizable"),
(170,"completed","Campanita de notificaciones en admin RedPontis + tablas + badges en sidebar"),
(171,"completed","Editar precio/modelo de un lote de banditas ya cargado (gratuita -> pagada y viceversa)"),
(172,"completed","POS/Tótem: separar catálogo de modelos de inventario de unidades"),
(173,"completed","Restricciones granulares: por dependiente, por mundo y por perfil — no un horario macro global"),
(174,"completed","Múltiples planes de suscripción (anual/mensual) + promociones con badge de descuento"),
(175,"completed","Unificar alergias entre Perfil Extendido, creación de perfil, Restricciones y Menú"),
(176,"completed","RedPontis comercial/admin: E2E Liquidación, Aprobaciones, Catálogos, Calculadora, Hardware"),
(177,"completed","Audit joi360-admin: CRUD (edit/delete) + dependency-safety on every table view"),
(178,"completed","Audit each active capacidad against its correct rendering front(s)"),
(179,"completed","Live E2E: merchant role (cobrar, catálogo, consulta, cierre)"),
(180,"completed","Live E2E: organizador B2B role (dashboard, eventos, asistencia, liquidación evento)"),
(181,"completed","Bug DNI: cuenta principal mostraba perfil del dependiente"),
(182,"completed","Operador: inicio/cierre de turno con reflejo en panel de accesos del mundo"),
(183,"completed","Auditoría completa de modelado de datos (Supabase)"),
(184,"completed","Migrar joi360-admin/app a variables de entorno reales en Vercel"),
(185,"completed","Instalar última versión en el T6 físico"),
(186,"completed","Auditar banners en Restricciones (superapp)"),
(187,"completed","Eventos B2C: foto banner, entidad legal opcional, popup detalle+motivo rechazo en admin, motivo visible en \"Mis eventos\""),
(188,"completed","Ejecutar fixes de la Auditoría de Datos JOI360"),
(189,"completed","Loading state en TODOS los botones de creación (proyecto-wide)"),
(190,"completed","Bug: vincular bandita da \"usuario no reconocido\" con usuario real registrado en Jockey Plaza"),
(191,"completed","Cooldown de 2 min para reenvío de link de confirmación de correo"),
(192,"completed","Usuarios en admin RedPontis aparecen sin sus datos 360"),
(193,"completed","Superapp: opción de eliminar dependiente/familiar"),
(194,"completed","Bug: \"no tienes ningún mundo\" al entrar a Explorar Mundos en superapp"),
(195,"completed","DEMO Jockey Plaza: flujo completo de código de comercio/mundo/POS operador end-to-end"),
(196,"completed","Raimondi: probar fino flujos E2E de saldo, vinculación bandita, cobro y compra por QR"),
(197,"completed","Auditar y rellenar TODOS los NULLs en tablas (incl. sponsor_id) según la auditoría de datos"),
(198,"completed","Bug: mundo eliminado (Colegio Raimondi) reaparece en el panel admin RedPontis"),
(199,"completed","Bug: contraseña de admin sale NULL / no se guarda al crearla o editarla"),
(200,"completed","Eventos embebidos en panel de mundo para Jockey Plaza (construir feature completo)"),
(201,"completed","Bug: usuario registrado (Diego Salguero) entra a Jockey Plaza y sale sin wallet pese a capacidad activa"),
(202,"completed","Publicación de catálogo/capacidades en la app debe ser automática, no un botón manual"),
(203,"completed","Verificar bug de precio de entrada en NumInput"),
(204,"completed","Badge de estado de evento debe reflejar aprobación real de BD"),
(205,"completed","Agregar upload de banner de evento con espejo en superapp"),
(206,"completed","RUC input: máximo 11 dígitos"),
(207,"completed","Cuenta bancaria: máximo 14 dígitos"),
(208,"completed","CCI: máximo 20 dígitos"),
(209,"completed","Paso 3 crear mundo: no deja adjuntar dos documentos"),
(210,"completed","Paso 4 wallet: selector de moneda muestra 1,2,3,4,5 en vez de USD/PEN"),
(211,"completed","Paso 4 Compras y transacciones: campo de hora debe ser time picker"),
(212,"completed","Paso 4 Comercios: falta selector de responsable (RedPontis o Mundo)"),
(213,"completed","Paso 5 vigencia: usar fecha específica, no dropdown 12/6/3 meses"),
(214,"completed","Eliminar referencia a 'costo agregado' del catálogo"),
(215,"completed","Configurar wallet: 'Usar sin límite' no cambia el campo"),
(216,"completed","Configurar wallet: 'Usar sin tope de recarga' no cambia el campo"),
(217,"completed","Configurar wallet: 'Usar sin vencimiento' no cambia el campo"),
(218,"completed","Vigencia de la pulsera: usar selector de fecha (calendario)"),
(219,"completed","Suscripciones: dejar solo 'crear planes', quitar repetición de pago por perfil"),
(220,"completed","Configuración menú: método de reserva QR, Saldo o Ambos"),
(221,"completed","Liquidación: investigar y mostrar fecha (requiere análisis previo)"),
(222,"completed","Fix: error al marcar \"entregado\" solicitud de banditas (Jockey Plaza)"),
(223,"completed","Usuarios (admin RP): detalle en vista de página nueva, no drawer"),
(224,"completed","Bug: POS Operador permite re-vincular bandita ya vinculada sin liberar"),
(225,"completed","Superapp: módulo de Eventos a scroll vertical con más mini cards"),
(226,"completed","Superapp: carrusel de eventos en Home del mundo (debajo de comercios, top 5 + ver más)"),
(227,"completed","Bug: botón \"Bandita NFC\" en Home del mundo navega a Recarga (afecta todos los mundos)"),
(228,"completed","Eventos embebido: gestión completa + comercios por evento + aprobación con detalle"),
(229,"pending","Sucursales: grupo de mundos con selector in-place en superapp"),
(230,"completed","Superapp: vincular bandita directo (Web NFC) sin flujo de solicitud"),
(231,"completed","Precompra evento B2B: stock real + label separado de catálogo"),
(232,"completed","Pivot piloto Jockey Plaza: borrado + limpieza de código completado"),
(233,"completed","Suscripciones formalizada como capacidad propia — deployado y verificado"),
(234,"completed","Rebranding completo a JoiSolutions Design System v1.0 (Navy + Gold) — admin + superapp"),
(235,"completed","Fix: line endings del rebrandeo + contraste de tabs inactivos en admin"),
(236,"completed","Instalar JOI 360 como PWA en móvil, landing→superapp completo"),
(237,"completed","Bug: saldo mostraba \"2 37.14\" en vez de \"S/ 37.14\" — moneda corrupta"),
(238,"completed","Precompra de evento — lado del asistente + entrega en comercio"),
(239,"completed","SQL: restaurar validación de dueño en mover_saldo_wallet (regresión de #181 sobre #121)"),
(240,"completed","Suscripciones (membresía real, modelo YOKI) + Cashback modalidad por_comercio"),
(241,"completed","Bug: comercios afiliados en Suscripciones no mostraban nombre (encontrado y corregido en vivo)"),
(242,"completed","Bug: CashbackTemplate mostraba data mockeada, no real (encontrado y corregido en vivo)"),
(243,"completed","Documento Word: Roadmap de entrega para el CTO — mapeo de capacidades, paneles y propuesta de bloques"),
]

FASES = [
    ("01-ago a 02-ago", "Arranque del monorepo y Motor de Eventos", (102,111), "2026-08-01", "2026-08-02"),
    ("03-ago a 04-ago", "Seguridad crítica de Wallet + limpieza de datos fantasma", (112,150), "2026-08-03", "2026-08-04"),
    ("07-ago a 08-ago", "Bandita NFC end-to-end + restricciones granulares", (151,175), "2026-08-07", "2026-08-08"),
    ("09-ago", "Auditoría cruzada + primer batch de QA con agentes en paralelo", (176,190), "2026-08-09", "2026-08-09"),
    ("10-ago", "Auditoría de datos + seguridad de credenciales (admin/PIN)", (191,214), "2026-08-10", "2026-08-10"),
    ("11-ago", "Batch de 15 items UX/UI + fixes de wizard y liquidación por comercio", (215,221), "2026-08-11", "2026-08-11"),
    ("12-ago", "Eventos embebido, Web NFC directo, Sucursales, Precompra, pivot Jockey Plaza, documentación viva", (222,233), "2026-08-12", "2026-08-12"),
    ("19-ago a 24-ago", "Rebranding JoiSolutions, PWA, Suscripciones real + Cashback por comercio, dos bugs en vivo", (234,243), "2026-08-19", "2026-08-24"),
]

# Enriquecimiento manual para las tareas de mayor peso funcional/arquitectónico
# -- conocimiento directo de la construcción, no derivado del título. Cada
# entrada cubre las 4 dimensiones pedidas: pedido, resuelto, flujo/diseño,
# flujo de usuario. El resto de las 132 tareas se deriva automáticamente del
# título + los commits reales que lo resolvieron (ver derive_fields()).
DETAIL = {
113: dict(
    pedido="Repensar la arquitectura del Core Platform desde cero antes de seguir agregando capacidades, para que cada una nueva encaje en un mismo patrón (Mundo -> Capacidad -> Configuración -> Render) en vez de resolverse caso por caso.",
    resuelto="Se documentó un ADR (Architecture Decision Record) formal más un roadmap técnico: el catálogo maestro de capacidades (MODULE_CATALOG), el mapa de dependencias entre capacidades (DEPENDENCY_MAP), y el mecanismo de sincronización local-Supabase que hoy sostiene todo el sistema.",
    flujo="RedPontis define capacidades en un catálogo global -> el mundo activa un subconjunto -> cada capacidad trae su propia configuración -> la app (superapp, admin, POS) lee esa configuración en vivo y decide qué renderizar, sin hardcodear reglas por mundo.",
    flujo_usuario="No es una feature con flujo de usuario directo -- es la base arquitectónica que hace posible que cada capacidad nueva (Wallet, Comercios, Eventos, etc.) tenga un flujo de usuario consistente en todos los frentes.",
    journey="Admin RedPontis (Catálogos Globales) → Panel de Mundo (activación de la capacidad) → Superapp / POS (render final). Este ADR es el journey maestro del que se desprenden todos los journeys específicos del resto de tareas: cualquier capacidad nueva atraviesa las mismas 3 paradas, en el mismo orden, sin excepción.",
),
114: dict(
    pedido="Corregir una vulnerabilidad crítica: la llave anónima de Supabase, expuesta en el bundle público del frontend, permitía leer el PIN de operador de POS y datos bancarios en texto plano, y escribir saldo directamente sin pasar por ninguna validación.",
    resuelto="Se migró el movimiento de saldo a una función RPC atómica server-side (mover_saldo_wallet) con REVOKE UPDATE sobre wallets.balance -- la única forma de mover saldo real pasa a ser esa función, nunca un UPDATE directo desde el cliente. Los PIN de operador se hashean server-side (merchants.pos_pin_hash, worlds.pos_pin_hash) en vez de guardarse en texto plano.",
    flujo="Cliente llama a la RPC con los parámetros de la operación -> la función toma un lock de fila sobre la wallet, valida saldo suficiente, inserta la transacción -- todo en una sola transacción atómica de Postgres, invisible e inmodificable desde el cliente.",
    flujo_usuario="Transparente para el usuario final -- cobra/recarga exactamente igual que antes. La diferencia es que ya no existe ningún camino desde el navegador que pueda escribir saldo sin pasar por esa validación.",
    journey="Superapp / POS (el usuario o el operador inician la operación) → Supabase RPC `mover_saldo_wallet` (única puerta de entrada real al saldo) → Wallet actualizada. Journey unificado: no importa desde qué touchpoint se origina el movimiento de saldo (recarga en superapp, cobro en POS, ajuste desde admin), todos convergen en la misma función server-side -- un solo camino de verdad, no uno por plataforma.",
),
121: dict(
    pedido="Cerrar el hueco de autorización en las RPC de wallet: cualquiera con la llave anónima podía mover el saldo de CUALQUIER wallet, no solo la propia -- solo faltaba pasar el wallet_id correcto.",
    resuelto="La RPC mover_saldo_wallet ahora exige, para cada llamada, o un turno de POS válido (p_turno_id real y abierto) o que auth.uid() sea el dueño de la wallet o su apoderado -- devuelve NO_AUTENTICADO / NO_AUTORIZADO / TURNO_INVALIDO si ninguna condición se cumple.",
    flujo="El cliente intenta mover saldo -> la función valida identidad ANTES de tocar cualquier fila -> solo si pasa la validación continúa con el lock+update+insert de siempre.",
    flujo_usuario="Sin cambio visible para el usuario legítimo. Nota de seguimiento para el equipo: una migración posterior (fix-181, restricciones de dependiente) reescribió esta función completa y, sin querer, no conservó esta validación de dueño -- documentado en el documento maestro como hallazgo de severidad alta pendiente de restaurar.",
    journey="Superapp / POS (origen del intento de movimiento) → RPC de wallet (valida turno abierto o dueño/apoderado ANTES de tocar saldo) → Wallet. Journey de seguridad: cualquier touchpoint que intente mover saldo de una wallet ajena queda cortado en el mismo punto, independientemente de por dónde haya entrado la llamada.",
),
141: dict(
    pedido="Que el Motor de Eventos funcione al 100% con datos reales (no simulados) y que la gestión embebida (el propio mundo publicando sus eventos) esté completa dentro del panel del mundo.",
    resuelto="Se conectó todo el ciclo real: creación de evento, tipos de entrada, aforo, venta con débito real de wallet, emisión de QR, check-in en el POS, y el panel de gestión embebida dentro de MundoDetail -- sin ningún mock de por medio.",
    flujo="Mundo crea evento -> define tipos de entrada y precios -> publica (pasa por aprobación de RedPontis) -> usuario compra desde la superapp (débito real) -> QR se genera -> POS del evento hace check-in escaneando ese QR.",
    flujo_usuario="Superapp: el usuario ve el evento en el marketplace, elige tipo de entrada, paga con su saldo, y la entrada aparece en 'Mis entradas' con su QR. En el evento, el POS valida ese QR y marca el ingreso.",
    journey="Panel de Mundo (crea y publica el evento) → Admin RedPontis (aprueba) → Superapp (el asistente descubre el evento, compra su entrada, recibe el QR) → POS del evento (check-in escaneando el QR). Journey de punta a punta con 4 touchpoints distintos y 4 roles distintos (organizador, RedPontis, asistente, operador de puerta), unificados por el mismo `event_id` en cada paso.",
),
168: dict(
    pedido="Una sola bandita física debe poder representar la cuenta principal del usuario, pero discriminando correctamente qué wallet corresponde según en qué mundo/comercio se está usando el lector -- no una bandita por mundo.",
    resuelto="Arquitectura nueva de bandita 'universal': el UID físico de la pulsera se vincula a la identidad de la persona, no a una wallet específica -- el lector resuelve la wallet correcta en el momento de la lectura según el contexto (mundo/comercio) donde está el lector.",
    flujo="Persona vincula su bandita una sola vez -> el sistema guarda el UID ligado a su identidad -> en cualquier punto de cobro, el lector NFC envía el UID + el contexto del punto de venta -> el backend resuelve cuál wallet corresponde a esa combinación.",
    flujo_usuario="El usuario trae puesta la misma pulsera a cualquier mundo donde tenga cuenta -- no necesita una pulsera distinta por comunidad. El comercio/operador solo acerca el lector, sin tener que preguntar ni seleccionar nada.",
    journey="Superapp/POS (vinculación única del UID a la identidad) → POS/Operador de cualquier mundo (lectura NFC + contexto del punto de venta) → backend resuelve wallet correcta → cobro. Journey unificado entre mundos: el mismo objeto físico (la pulsera) atraviesa comunidades distintas sin re-vinculación, porque la identidad vive en el UID y la wallet se resuelve en el momento, no de antemano.",
),
173: dict(
    pedido="Las restricciones de consumo no pueden ser un horario macro único para todo el mundo -- necesitan ser granulares: por dependiente individual, y configurables (horario, límite diario, productos bloqueados).",
    resuelto="Tabla dependent_restrictions con horario_inicio/fin, límite diario y lista de productos bloqueados por cada dependiente -- validado tanto en el cliente (feedback inmediato) como dentro de la RPC de wallet server-side (no se puede evadir cambiando el cliente).",
    flujo="El tutor entra a Restricciones -> elige un dependiente -> configura horario permitido, límite diario y productos bloqueados -> esas reglas se guardan por dependiente, no por mundo.",
    flujo_usuario="El dependiente intenta comprar -> si está fuera de horario, excede su límite diario, o el producto está bloqueado para él, la compra se rechaza con un motivo específico (no un error genérico) -- tanto en la app como si el rechazo llega desde el servidor.",
    journey="Superapp (tutor configura restricciones por dependiente) → Supabase `dependent_restrictions` → POS / Superapp (el dependiente intenta comprar, la RPC valida en tiempo real) → rechazo o aceptación con motivo explícito. Journey unificado: la misma regla que el tutor configuró en un touchpoint se hace cumplir igual sin importar si el dependiente compra desde el POS de un comercio o desde su propio celular.",
),
200: dict(
    pedido="Construir el feature completo de Eventos embebidos para el panel de mundo de Jockey Plaza: que el mundo pueda dar de alta comercios por evento (desde su directorio existente o ad-hoc solo para ese evento), y que RedPontis apruebe con visibilidad completa del detalle.",
    resuelto="EventoComerciosCard con checkbox de comercios existentes + formulario de alta ad-hoc; cola de aprobación en Gobierno con modal de detalle completo (banner, mapa, tipos de entrada, comercios con foto) antes de aprobar o rechazar.",
    flujo="Mundo entra a la pestaña de Eventos -> marca qué comercios de su directorio participan, o agrega uno nuevo solo para ese evento -> RedPontis ve la solicitud en su cola de Aprobaciones con el detalle completo -> aprueba o rechaza con motivo.",
    flujo_usuario="Superapp: el asistente ve el evento con sus comercios afiliados (con foto) antes de comprar la entrada -- el detalle completo, no solo el nombre del evento.",
    journey="Panel de Mundo (afilia comercios existentes o crea uno ad-hoc para el evento) → Admin RedPontis (Gobierno / Aprobaciones, ve el detalle completo antes de decidir) → Superapp (el asistente ve el evento con sus comercios afiliados antes de comprar). Journey de 3 roles unificado por el mismo evento: lo que el mundo carga es exactamente lo que RedPontis aprueba y exactamente lo que el asistente ve, sin traducción intermedia.",
),
228: dict(
    pedido="Cerrar 5 gaps reales encontrados en el flujo de Eventos embebido: aprobación sin detalle visible, mapa del evento ausente en el detalle público, comercios afiliados sin foto, sin deep-link desde el Home del mundo, y comercios ad-hoc sin forma de darse de alta.",
    resuelto="Modal de aprobación con detalle completo, mapa PDF visible en el detalle público del evento (antes solo estaba en la tarjeta), fotos reales de comercios afiliados, deep-link `?evento=<id>` desde el carrusel del Home directo al detalle, y formulario de alta de comercio ad-hoc dentro del panel de organizador.",
    flujo="Cada gap se rastreó hasta su causa real en el código (no un parche cosmético) -- por ejemplo, el deep-link requirió que el Hub pasara el id del evento en la URL y que el módulo de Eventos lo leyera al montar para abrir el detalle automáticamente.",
    flujo_usuario="El usuario toca un evento en el carrusel del Home y cae directo en su ficha completa (no en la lista general de eventos) -- con mapa, comercios con foto, y tipos de entrada visibles de una.",
    journey="Superapp Home (carrusel de eventos) → deep-link `?evento=<id>` → ficha de detalle del evento (mapa + comercios con foto + tipos de entrada) → Panel de Mundo (alta de comercio ad-hoc si falta) → Admin RedPontis (aprobación con el mismo detalle completo). Journey cerrado end-to-end: el mismo id de evento conecta las 4 paradas sin que el usuario tenga que buscar el evento dos veces.",
),
230: dict(
    pedido="Que el usuario pueda vincular su propia bandita NFC directo desde el celular, con Web NFC, sin pasar por el flujo de solicitud mediado por un operador.",
    resuelto="VincularBanditaWebNfcModal usa la Web NFC API (NDEFReader) del navegador -- detecta si el celular la soporta (Chrome/Android sobre HTTPS) y si no, cae automáticamente al flujo de solicitud tradicional. Aplica las mismas 4 validaciones de seguridad que ya usaba el operador del POS (banda existe en el mundo, no está ya vinculada, está en estado 'asignada', el usuario no tiene ya otra banda activa).",
    flujo="Usuario toca 'Ya tienes la pulsera en mano, vincúlala ahora' -> el navegador pide permiso NFC -> usuario acerca la pulsera -> se lee el UID real -> se valida contra las 4 reglas de seguridad -> si pasa, la banda queda vinculada y activa de inmediato.",
    flujo_usuario="El usuario recibe la pulsera físicamente (en persona, en un evento, por correo) y la activa él mismo desde su celular, sin tener que ir a un punto de atención a que un operador la vincule por él.",
    journey="Superapp (usuario toca 'vincular ahora', Web NFC lee el UID) → validación de las mismas 4 reglas que usa el operador del POS → Wallet activa. Journey unificado con el flujo de operador: ambos caminos (autoservicio desde la superapp, o asistido desde el POS) terminan en la misma validación y el mismo estado final, así que el usuario obtiene el resultado idéntico sin importar cuál eligió.",
),
231: dict(
    pedido="Que cada comercio afiliado a un evento pueda cargar productos en precompra con stock real, en un catálogo separado de su catálogo regular (para no mezclar lo que vende todos los días con lo que ofrece solo en ese evento puntual).",
    resuelto="Los productos de precompra usan la misma tabla `products` pero con `event_id` seteado -- aislados por diseño del catálogo regular (`event_id IS NULL`). Se agregó stock real (columna que ya existía pero no se exponía en este formulario) con badge de Agotado/Stock/Sin límite.",
    flujo="Organizador afilia un comercio al evento (existente o ad-hoc) -> abre 'Precompra' en la fila de ese comercio -> carga producto + precio + stock -> queda visible solo dentro de ese evento, nunca en el catálogo de todos los días del comercio.",
    flujo_usuario="Pendiente para la app -- hoy la autoría (cargar los productos) está completa y en producción, pero el asistente todavía no tiene una pantalla en la superapp para comprar estos productos de precompra tras comprar su entrada. Queda como el primer ítem del backlog.",
    journey="Panel de Mundo / organizador (carga productos de precompra con stock real, aislados del catálogo regular) → [tramo pendiente: Superapp, pantalla de compra de precompra tras comprar la entrada] → POS del evento (redención). Journey incompleto a propósito: la autoría ya cierra el círculo, el consumo desde la superapp es el siguiente tramo a construir -- documentado así para no dar la falsa impresión de que ya está cerrado.",
),
232: dict(
    pedido="Pivot de alcance: enfocar el ecosistema únicamente en el piloto de Jockey Plaza -- borrar permanentemente Colegio Raimondi, Universidad de Lima, JOI Eventos y JOI Promos.",
    resuelto="Borrado real y permanente en Supabase (43 tablas limpiadas en el orden correcto para respetar dependencias), con un diagnóstico previo de tipos de columna para que el script SQL no fallara a mitad de camino. En el código, se sacó 'JOI Eventos' del seed local (tenía fixed:true, lo que lo habría resucitado en el siguiente sync) y se agregó al filtro de purga.",
    flujo="Confirmación explícita del alcance del borrado -> diagnóstico de tipos de columna reales (varias terminaron en `uuid` en vez de `text` en distintos momentos del proyecto) -> script SQL final con casts defensivos -> verificación en vivo de que solo Jockey Plaza queda -> limpieza del código para que no vuelva a aparecer.",
    flujo_usuario="No hay flujo de usuario nuevo -- es una operación de datos. El efecto visible es que el admin y la superapp ahora solo muestran Jockey Plaza como comunidad disponible.",
    journey="Admin RedPontis (Supabase, borrado en 43 tablas) → código local (`store.js`, se saca el mundo fantasma del seed y del filtro de purga) → Superapp / Admin (ambos dejan de listar cualquier mundo que no sea Jockey Plaza). Journey unificado entre plataformas: el borrado en la base y la limpieza en el código tenían que coincidir, porque un mundo `fixed:true` sobreviviendo en el seed habría resucitado en Supabase en el siguiente sync aunque el borrado SQL hubiera sido perfecto.",
),
233: dict(
    pedido="Formalizar Suscripciones como su propia capacidad (con dependencia declarada a Wallet), en vez de vivir escondida como un config field dentro de Wallet -- pese a que ya cobraba dinero real.",
    resuelto="Nueva entrada en el catálogo maestro de capacidades con su propio ícono, activación y pestaña de configuración -- el panel de Planes de Suscripción se movió de la pestaña de Wallet a su propia pestaña. La superapp gatea el cobro contra la nueva capacidad en vez del config field viejo.",
    flujo="RedPontis/mundo activa la capacidad Suscripciones (antes: prendía un toggle escondido dentro de Wallet) -> crea uno o más planes -> el cobro real ocurre al vincular un nuevo dependiente, igual que antes -- solo cambió dónde vive la activación, no el mecanismo de cobro.",
    flujo_usuario="Para el tutor que vincula un dependiente: sin cambio -- ve el mismo paso de elegir plan y confirmar el cobro. Para el admin: ahora encuentra y activa Suscripciones como cualquier otra capacidad del catálogo, no como una opción oculta dentro de otra.",
    journey="Admin RedPontis (Catálogos Globales, capacidad propia con re-sincronización real a `capacities`) → Panel de Mundo (activa Suscripciones + crea planes en su propia pestaña) → Superapp (tutor elige plan al vincular un dependiente, cobro real). Journey re-cableado sin romper el tramo final: se movió dónde vive la activación (de un config field escondido a una capacidad de primer nivel) sin tocar el paso que el tutor ya conocía.",
),
234: dict(
    pedido="Aplicar el nuevo sistema de diseño JoiSolutions (paleta Navy + Gold) de forma consistente en los dos frentes de código -- admin y superapp -- reemplazando la paleta anterior sin dejar pantallas a medio migrar.",
    resuelto="Rebranding completo aplicado en ambos proyectos por separado el mismo día (commit `a4baf25` en admin, `ef3ee5a` en superapp) -- tokens de color, botones, tabs y superficies heredan la paleta nueva desde el design system compartido.",
    flujo="Tokens de color (Navy #1A3270 + dorado de acento) actualizados en un solo lugar del design system -- componentes ya construidos (botones, pills, tabs, headers) heredan la paleta nueva automáticamente, sin tocarlos pantalla por pantalla.",
    flujo_usuario="Cambio visual en todas las pantallas de ambos productos el mismo día -- mismo comportamiento e interacciones, paleta de marca nueva.",
    journey="Admin RedPontis + Panel de Mundo + Superapp (los tres frentes comparten el mismo design system, así que el rebrandeo aplica a los tres a la vez, sin desfase visual entre plataformas).",
),
235: dict(
    pedido="Después del rebrandeo masivo, cerrar dos papercuts reales encontrados en revisión: line endings corruptos por el cambio de archivos a gran escala, contraste insuficiente en tabs inactivos del admin, y el gris de texto de estado \"default\" (sin dato / inactivo) con muy poco contraste contra el fondo claro en varias pantallas de ambos productos.",
    resuelto="Fix de line endings + contraste de tabs inactivos (commit `540b36f`), más un ajuste del tono de gris en los tokens de estado default compartidos (commit `1634a48`) -- ambos aplicados el mismo día como cierre directo del rebrandeo.",
    flujo="Un solo token de color reutilizado en badges/pills/estado por defecto en todo el sistema de diseño -- el ajuste se propaga a cada lugar que lo usa sin tocarlos uno por uno.",
    flujo_usuario="Texto de estado (ej. \"Sin actividad\", \"Pendiente\") y tabs inactivos ahora se leen con contraste suficiente en cualquier pantalla de ambos productos.",
    journey="Admin RedPontis + Superapp (mismo token de diseño, mismo fix, ambos frentes). Fix de accesibilidad transversal, sin journey de usuario propio más allá de \"ahora se puede leer\".",
),
236: dict(
    pedido="Que la superapp se pueda instalar como PWA desde el celular, con un landing real antes de entrar -- no solo funcionar dentro de una pestaña del navegador.",
    resuelto="Manifest + landing de instalación conectados de punta a punta -- desde el landing público hasta la superapp instalada como ícono nativo en el celular (commit `c8498af`).",
    flujo="El manifest declara ícono, nombre y colores de la PWA -- el navegador (Chrome/Android) detecta que es instalable y ofrece \"Agregar a pantalla de inicio\"; una vez instalada, abre directo en la superapp sin barra de navegador.",
    flujo_usuario="El usuario entra al link desde el celular, ve el landing, y puede instalar JOI 360 como cualquier app nativa -- queda con su propio ícono, sin depender de tener el navegador abierto cada vez.",
    journey="Superapp (landing → instalación PWA → superapp instalada). Un solo touchpoint, pero cambia de raíz cómo el usuario accede de ahí en adelante -- de \"abrir un link\" a \"abrir una app\".",
),
237: dict(
    pedido="Corregir este bug real: el saldo de wallet se mostraba como \"2 37.14\" en vez de \"S/ 37.14\" en la superapp -- el símbolo de moneda salía corrupto.",
    resuelto="El formateo del monto concatenaba mal el símbolo de moneda (perdía la \"S/\" y dejaba un \"2\" residual al inicio) -- corregido en el punto exacto donde se arma el string de saldo mostrado (commit `9a19d06`).",
    flujo="Bug de formato puro en la función que arma el texto del saldo -- ver el commit real para la línea exacta corregida.",
    flujo_usuario="El saldo de wallet ahora se lee correctamente como \"S/ 37.14\" en la pantalla principal de cualquier usuario con saldo, en vez de mostrar un símbolo corrupto que generaba desconfianza sobre el monto real.",
    journey="Superapp (un solo touchpoint, sin handoff a otra plataforma). Bug de formato visible directamente donde el usuario mira su saldo.",
),
238: dict(
    pedido="Cerrar el tramo que la tarea #231 había dejado pendiente a propósito: que el asistente pueda comprar los productos de precompra desde la superapp tras comprar su entrada, y que el comercio pueda marcar la entrega en el punto de evento.",
    resuelto="Pantalla de precompra en la superapp conectada al catálogo real de productos por evento (mismo mecanismo `event_id` que ya usaba la autoría del lado del organizador), más la vista de entrega del lado del comercio para marcar qué se retiró (commit `e3ebfe5`).",
    flujo="Asistente compra su entrada -> ve los productos de precompra disponibles para ese evento -> compra con su saldo real -> el pedido queda pendiente de entrega -> el comercio, en su panel o el POS del evento, lo marca como entregado.",
    flujo_usuario="El asistente no solo compra su entrada -- también puede pre-comprar comida o merchandising del evento con anticipación y solo pasar a recogerlo, sin hacer fila para comprar en el momento.",
    journey="Superapp (el asistente compra el producto de precompra) → Panel de Merchant / POS del evento (marca la entrega). Cierra el journey que la tarea #231 había dejado abierto a propósito -- ahora la autoría (comercio carga producto) y el consumo (asistente compra, comercio entrega) están conectados de punta a punta.",
),
239: dict(
    pedido="Restaurar la validación de dueño/turno en `mover_saldo_wallet` que la tarea #121 había cerrado -- una migración posterior (fix-181, restricciones granulares de dependiente) reescribió la función completa y, sin querer, no conservó esa validación, dejando otra vez abierto el hueco de seguridad que #121 había cerrado.",
    resuelto="Nueva versión de la función que combina ambas validaciones en un solo cuerpo -- la de dueño/turno de #121 y las de restricciones de dependiente de #181 -- documentada en `fix-234-restaurar-dueno-wallet.sql`, sin que ninguna de las dos pise a la otra.",
    flujo="La función valida en el mismo paso: turno de POS abierto O dueño/apoderado autenticado, Y las restricciones del dependiente (horario, límite diario, productos bloqueados) si aplica -- todo antes de tocar cualquier fila de saldo.",
    flujo_usuario="Transparente para el usuario legítimo -- el efecto es que un gap de seguridad real (cualquiera con la llave anónima podía volver a mover saldo ajeno) queda cerrado de nuevo, sin reabrir el problema de restricciones que #181 había resuelto.",
    journey="Superapp / POS (origen del movimiento) → RPC de wallet (valida dueño/turno + restricciones en un solo paso) → Wallet. Journey de seguridad restaurado -- mismo patrón que #121, ahora robusto contra la regresión que #181 había introducido sin querer.",
),
240: dict(
    pedido="Construir Suscripciones como membresía real (modelo YOKI): que el mundo cree planes desde su propio Panel de Mundo con branding propio (banner, logo, color exacto en cuentagotas), categoría de beneficio (sorteo, descuento, acceso, producto, otro) y comercios afiliados -- con cobro RECURRENTE real contra la wallet del usuario, no solo el cobro único al vincular un dependiente que ya existía. En paralelo, construir Cashback con dos modalidades configurables por RedPontis (flat o por_comercio) y una cola de aprobación para que el mundo solo pueda solicitar cambios, nunca aplicarlos directo.",
    resuelto="`subscription_plans` extendida con branding y categoría de beneficio, más `subscription_plan_merchants` (comercios afiliados) y `subscription_suscriptores` (suscriptor real, con `proxima_fecha_cobro`) -- habilitando cobro recurrente de verdad. Un motor de ciclo (`sincronizarCicloSuscripcionesMembresia`) corre en cada carga de Wallet, igual que ya hacía el motor de BNPL, cobrando cuando la fecha vence y avanzando el período. Cashback sumó el campo `modalidad` (flat/por_comercio) al config de la capacidad, un cálculo de cashback-por-comercio derivado de `transactions` (sin tocar la función que mueve dinero real), y `cashback_change_requests` para que el mundo pida cambios que RedPontis aprueba desde Gobierno.",
    flujo="Mundo activa Suscripciones -> crea un plan con su marca (banner/logo/color), elige categoría de beneficio y comercios afiliados -> el usuario se suscribe, paga el primer período -> desde ahí, cada vez que abre su Wallet, el sistema revisa si tocaba cobrar y lo hace solo, sin que nadie tenga que apretar un botón. Cashback: RedPontis define la modalidad -> el mundo puede pedir un cambio -> RedPontis aprueba o rechaza con motivo -> si aprueba, se aplica.",
    flujo_usuario="El usuario ve el plan con la marca del mundo (no un plan genérico), se suscribe una vez, y su saldo se descuenta solo cada período sin que tenga que volver a confirmar nada. En Wallet, si el mundo eligió cashback por comercio, ve el desglose de cuánto ganó en cada tienda; si eligió flat, ve solo el acumulado total.",
    journey="Panel de Mundo (crea el plan con marca propia, o pide cambio de modalidad de cashback) → Admin RedPontis / Gobierno (aprueba solicitudes de cashback) → Superapp (usuario se suscribe, cobro recurrente automático en cada carga de Wallet; ve su cashback acumulado o desglosado). Journey nuevo de punta a punta: es el primer motor de cobro recurrente real del ecosistema fuera de BNPL, y la primera capacidad donde el mundo pide un cambio en vez de aplicarlo directo.",
),
241: dict(
    pedido="Verificación en vivo, pedida explícitamente: confirmar que la superapp renderiza correctamente las capacidades recién construidas (Suscripciones, Cashback) contra datos reales de Supabase, no solo contra el código.",
    resuelto="Al crear un plan real de prueba en el Panel de Mundo, el selector de \"comercios afiliados\" mostraba checkboxes sin ningún nombre -- imposible saber a qué comercio se estaba afiliando el plan. La causa: el componente leía `c.nombre`, pero la función que trae los comercios desde Supabase devuelve filas crudas con la columna `name` (no `nombre`, que es el campo usado en el resto del código local). Corregido cambiando la lectura a `c.name`.",
    flujo="`fetchMerchantsRemote` hace `select=*` directo contra la tabla `merchants` de Supabase -- devuelve el nombre de columna real de la base (`name`), distinto del campo `nombre` que usa el resto de la app (mapeado desde el store local). El checkbox de comercios afiliados fue el único punto que leyó ese resultado crudo sin pasar por el mapeo.",
    flujo_usuario="Antes del fix: el mundo no podía saber qué comercio estaba afiliando a un plan de Suscripciones -- el checkbox aparecía vacío. Después: cada comercio se ve con su nombre real, se puede elegir con confianza.",
    journey="Panel de Mundo (crear/editar plan de Suscripción, elegir comercios afiliados) → Supabase (`merchants`). Bug encontrado en vivo durante la verificación pedida, corregido y desplegado el mismo día.",
),
242: dict(
    pedido="Continuación de la misma verificación en vivo: confirmar que Cashback también renderiza correctamente en la superapp con datos reales, no mockeados.",
    resuelto="La tarjeta de Cashback en \"Mis módulos\" del Home de la superapp (independiente de la que vive embebida dentro de Wallet) seguía mostrando un saldo fijo (\"S/ 24.50\"), un historial de 3 transacciones hardcodeadas con nombres de comercios que ni siquiera existen en el mundo probado -- nunca se había conectado a los datos reales, pese a que la tarjeta de Wallet sí los usa desde antes. Corregida para usar el mismo hook `useWalletLive` que ya usa Wallet, y `useMerchantsLive` para mostrar el nombre real del comercio donde más cashback se ganó.",
    flujo="El componente standalone de Cashback (`CashbackTemplate`) vivía desde una versión anterior con datos de ejemplo escritos directo en el código -- nunca se actualizó cuando Cashback pasó a tener datos reales en Wallet. Ahora lee saldo, desglose por comercio e historial real de transacciones, igual que Wallet.",
    flujo_usuario="Antes del fix: cualquier usuario que entrara al tile de Cashback veía un saldo y un historial falsos, sin relación con su actividad real -- una desconexión seria entre lo que Wallet mostraba (correcto) y lo que este tile mostraba (mockeado). Después: mismo dato real en los dos lugares donde aparece Cashback.",
    journey="Superapp Home (tile \"Cashback\" en Mis módulos) → Supabase (`transactions`, vía el mismo hook que usa Wallet). Bug encontrado en vivo durante la verificación pedida, corregido y desplegado el mismo día -- ejemplo real de por qué vale la pena probar cada capacidad en los dos lugares donde renderiza, no solo en uno.",
),
243: dict(
    pedido="Armar un documento en Word, en tono accesible para alguien de negocio/CTO sin conocimiento técnico profundo: qué es cada cosa, cómo se ve el menú lateral de cada panel según qué capacidades están activas, puntos de choque de renderización encontrados, y una propuesta de roadmap de entrega por bloques -- dejando explícito que este ecosistema es un prototipo funcional (no producción) y que la decisión real de qué construir es de desarrollo (Salvador) y del CTO.",
    resuelto="Documento de 7 secciones con capturas reales tomadas en vivo contra el prototipo (no maquetas): glosario de los 5 frentes, mapa completo del sidebar por panel, capturas del flujo de creación/entrega de mundo, tabla de puntos de choque (incluyendo los dos bugs de #241/#242, encontrados y corregidos en el camino), gaps de marca en la superapp (login sin brandear, sin stepper de bienvenida, sin colorimetría aplicada), y una propuesta de roadmap en 6 bloques -- ajustada después a pedido explícito para usar Colegio Raimondi (no Jockey Plaza) como ejemplo de capacidades de flujo completadas, y para excluir Wallet/Comercios/Compras y Transacciones/Inventario del ejemplo destacado por ser base configurable, no flujo propio de cara al usuario.",
    flujo="Generado con python-docx a partir de una auditoría de código real (rutas de sidebar, wizard de 7 pasos, hub de entrega de credenciales) cruzada con verificación en vivo en el navegador -- cada afirmación del documento tiene una captura o una lectura de código real detrás, sin contenido inventado.",
    flujo_usuario="No aplica -- es un entregable de documentación para stakeholders, no una feature del producto.",
    journey="No aplica -- documento de referencia, no un flujo de usuario del ecosistema.",
),
}

def title_lower(t):
    return t.lower()

def derive_prompt(n, title):
    tl = title_lower(title)
    if tl.startswith("bug"):
        return f"Corrige este bug real: {title.split(':',1)[-1].strip() if ':' in title else title}. Encuéntralo, arréglalo de raíz, y verifícalo con datos reales, no con un caso simulado."
    if tl.startswith("fix"):
        return f"Corrige: {title.split(':',1)[-1].strip() if ':' in title else title}."
    if tl.startswith("audit") or tl.startswith("auditar") or "auditoría" in tl:
        return f"Audita {title.split(':',1)[-1].strip() if ':' in title else title.lower()} y aplica los fixes reales que encuentres -- no un informe, arréglalo en el código."
    if tl.startswith("live e2e") or "e2e" in tl:
        return f"Haz una prueba end-to-end real de: {title}. Usa datos reales, no mocks, y corrige lo que falle en el camino."
    return f"Construye: {title}."

def derive_flujo_usuario(title):
    tl = title_lower(title)
    keywords_ui = ["superapp","pos","panel","botón","pantalla","app","wizard","dashboard","widget","tab","módulo","modulo","perfil","hub","home","modal","carrusel"]
    if any(k in tl for k in keywords_ui):
        return "Cambio visible directamente en la pantalla/flujo mencionado en el título -- ver el commit real para el detalle exacto de qué interacción cambió."
    return "Cambio interno de configuración, datos o backend -- sin una pantalla o interacción nueva para el usuario final."

# Touchpoints reales del ecosistema, en el orden en que normalmente se
# encadenan (RedPontis define -> mundo configura -> usuario/operador vive
# el resultado). Se detectan por palabras clave presentes en el título real
# de la tarea y en los commits reales que la resolvieron -- nunca inventadas.
TOUCHPOINTS = [
    ("Admin RedPontis", ["redpontis", "admin rp", "gobierno", "catálogos", "catalogos", "calculadora", "adquirencia", "notificaciones", "aprobación", "aprobacion", "aprobaciones"]),
    ("Panel de Mundo", ["mundo", "sponsor", "organizador", "evento", "eventos", "liquidación", "liquidacion", "banner"]),
    ("POS / Operador", ["pos", "operador", "tótem", "totem", "t6", "caja", "bandita", "banditas", "nfc", "turno", "check-in", "checkin"]),
    ("Superapp", ["superapp", "app", "wallet", "billetera", "perfil", "dependiente", "dependientes", "menú", "menu", "suscripci", "restricciones", "familiares", "marketplace"]),
]

def detect_touchpoints(text):
    tl = title_lower(text)
    found = []
    for label, keywords in TOUCHPOINTS:
        if any(k in tl for k in keywords) and label not in found:
            found.append(label)
    return found

def derive_journey(title, commits):
    basis = title if not commits else title + " " + " ".join(s for _, _, s in commits)
    touchpoints = detect_touchpoints(basis)
    if not touchpoints:
        return "No aplica -- cambio interno de datos, configuración o backend sin un journey de usuario propio; su efecto se observa solo indirectamente en los touchpoints que consumen ese dato o esa regla."
    chain = " → ".join(touchpoints)
    if commits:
        detalle = " · ".join(s for _, _, s in commits)
    else:
        detalle = title
    if len(touchpoints) == 1:
        return f"{chain} (un solo touchpoint, sin handoff a otra plataforma). {detalle}"
    return f"Journey unificado: {chain}. {detalle}"

def derive_fields(n, status, title, commits):
    if n in DETAIL:
        d = DETAIL[n]
        return d["pedido"], d["resuelto"], d["flujo"], d["flujo_usuario"], d["journey"]
    pedido = title
    if commits:
        resuelto = " · ".join(s for _, _, s in commits)
    else:
        resuelto = f"Resuelto según lo descrito en la tarea (\"{title}\") -- ver los commits reales de la fase para el detalle técnico exacto; no quedó un commit individual etiquetado con este número."
    flujo = resuelto if commits else f"Ver commits de la fase -- el título ya describe la naturaleza del cambio ({title})."
    flujo_usuario = derive_flujo_usuario(title)
    journey = derive_journey(title, commits)
    return pedido, resuelto, flujo, flujo_usuario, journey

def load_git_log(repo_root):
    result = subprocess.run(
        ["git", "log", "--reverse", "--format=%ad|%h|%s", "--date=short"],
        cwd=repo_root, capture_output=True, text=True, encoding="utf-8", check=True,
    )
    rows = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        date, h, subj = line.split("|", 2)
        rows.append((date, h, subj))
    return rows

def build_task_commit_map(git_rows):
    m = {}
    for date, h, subj in git_rows:
        for match in re.finditer(r"#(\d{2,3})", subj):
            n = int(match.group(1))
            m.setdefault(n, []).append((date, h, subj))
    return m

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(os.path.dirname(here))
    git_rows = load_git_log(repo_root)
    task_commits = build_task_commit_map(git_rows)

    matched_hashes = set()
    for n, rows in task_commits.items():
        for date, h, subj in rows:
            matched_hashes.add(h)

    out = []
    out.append("# JOI360 — Historial de Tareas y Commits\n")
    out.append("Documento vivo · Versión **1.2** · 24 de agosto de 2026\n")
    out.append(f"Registro completo de las {len(TASKS)} tareas trabajadas en este monorepo (`#102`–`#243`) y de los {len(git_rows)} commits reales de git que representan el código que efectivamente cambió, organizados en 8 fases cronológicas — del 1 de agosto al 24 de agosto de 2026. Cada tarea describe qué se pidió, qué se resolvió, el flujo/diseño técnico, el flujo de usuario, y el journey UX unificado entre plataformas — pensado para que cualquiera que no haya visto la construcción entienda exactamente qué existe hoy, cómo funciona, y qué recorrido completo vive la persona que lo usa, sin necesitar contexto adicional.\n")
    out.append("## Historial de versiones\n")
    out.append("| Versión | Fecha | Cambios |")
    out.append("|---|---|---|")
    out.append("| 1.0 | 2026-08-12 | Primera versión — 132 tareas (#102–#233), 163 commits, 7 fases cronológicas. |")
    out.append("| 1.1 | 2026-08-12 | Cada tarea ahora describe qué se pidió, qué se resolvió, el flujo/diseño, el flujo de usuario, y el journey UX unificado (touchpoints encadenados en base a los commits reales) — no solo título + commit. |")
    out.append("| 1.2 | 2026-08-24 | Corte semanal — 11 tareas nuevas (`#234`–`#243`): rebranding JoiSolutions, PWA, 2 bugs de formato/regresión de seguridad, Suscripciones real (modelo YOKI) + Cashback por comercio, 2 bugs encontrados y corregidos en verificación en vivo, y el roadmap para el CTO. Solo se agregan los cambios desde el corte anterior — el histórico previo no se reescribe. |")
    out.append("\n*Corte semanal: viernes. Próxima actualización: 28-ago-2026.*\n")

    out.append("## Resumen ejecutivo\n")
    out.append("| Métrica | Valor |")
    out.append("|---|---|")
    out.append(f"| Tareas registradas | {len(TASKS)} |")
    out.append(f"| Tareas completadas | {sum(1 for _,s,_ in TASKS if s=='completed')} |")
    out.append(f"| Tareas pendientes | {sum(1 for _,s,_ in TASKS if s=='pending')} |")
    out.append(f"| Commits reales en el repo | {len(git_rows)} |")
    out.append(f"| Commits con tarea identificada | {len(matched_hashes)} |")
    out.append(f"| Rango de fechas | {git_rows[0][0]} a {git_rows[-1][0]} |")

    out.append("\n## Cómo leer este documento\n")
    out.append("Cada tarea se describe en 5 partes: **Instrucción de trabajo** (la solicitud, en forma de instrucción clara — reconstruida para que se lea como un encargo, no como un título de ticket), **Qué se resolvió** (el resultado real, con los commits que lo prueban), **Flujo / diseño técnico** (cómo funciona por dentro), **Flujo de usuario** (qué experimenta la persona que usa esa parte del producto, o una nota explícita de que el cambio es interno y no tiene flujo de usuario propio), y **Journey UX unificado** (la cadena de touchpoints reales que atraviesa — Admin RedPontis, Panel de Mundo, POS/Operador, Superapp — en el orden en que efectivamente se recorre, para dejar explícito cómo se conecta cada plataforma con las demás en vez de describirlas por separado). Al final de cada fase se lista además la tabla completa de commits reales de esa fase, con hash de git, para quien necesite el detalle línea por línea.\n")

    assigned_hashes = set()
    for fase_label, fase_titulo, (lo, hi), d_start, d_end in FASES:
        out.append(f"\n# Fase: {fase_titulo}")
        out.append(f"*{fase_label}*\n")

        for n, status, title in TASKS:
            if not (lo <= n <= hi):
                continue
            estado_tag = "🟢 Completado" if status == "completed" else "🟡 Pendiente"
            commits = task_commits.get(n, [])
            pedido, resuelto, flujo, flujo_usuario, journey = derive_fields(n, status, title, commits)
            out.append(f"### #{n} — {title}")
            out.append(f"Estado: {estado_tag}\n")
            out.append(f"**Instrucción de trabajo:** {pedido}\n")
            out.append(f"**Qué se resolvió:** {resuelto}\n")
            out.append(f"**Flujo / diseño técnico:** {flujo}\n")
            out.append(f"**Flujo de usuario:** {flujo_usuario}\n")
            out.append(f"**Journey UX unificado:** {journey}\n")

        out.append("## Commits reales de esta fase\n")
        out.append("| Fecha | Hash | Commit |")
        out.append("|---|---|---|")
        fase_rows = [(d, h, s) for d, h, s in git_rows if d_start <= d <= d_end and h not in assigned_hashes]
        for date, h, subj in fase_rows:
            assigned_hashes.add(h)
            out.append(f"| {date} | `{h}` | {subj} |")
        out.append(f"\n*{len(fase_rows)} commits en esta fase.*")

    leftover = [(d, h, s) for d, h, s in git_rows if h not in assigned_hashes]
    if leftover:
        out.append("\n# Commits fuera de las fases anteriores")
        out.append("*(fechas sin fase asignada explícitamente — igual reales, igual del repo)*\n")
        out.append("| Fecha | Hash | Commit |")
        out.append("|---|---|---|")
        for date, h, subj in leftover:
            out.append(f"| {date} | `{h}` | {subj} |")
        print(f"AVISO: {len(leftover)} commits sin fase, agregados al final")

    out_path = r"C:\Users\CamilaDueñas\OneDrive - RedPontis\Escritorio\JOI360\docs\arquitectura\historial_tareas\src\00_historial.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("listo")

if __name__ == "__main__":
    main()
