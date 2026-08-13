# Registro de Capacidades

Orden y nomenclatura: la lista de negocio confirmada por Camila (22 ítems). Para cada una: qué es, cómo se activa, de qué depende, dónde renderiza en cada frente, y su **estado real verificado en código** — que en varios casos difiere de lo que el plan de negocio asume. Esas diferencias están marcadas explícitamente como **discrepancia**.

Convención de estado:
- 🟢 **Construido** — activable, sincroniza a Supabase, tiene render real en al menos un frente con datos reales.
- 🟡 **Construido parcial** — una parte es real (backend y/o un frente) y otra es maqueta/simulada/inalcanzable.
- 🔵 **Planificado** — existe en el catálogo de código como referencia (`MODULOS_PROXIMAMENTE`) pero no es activable ni sincroniza a Supabase; en superapp, si tiene template, ese template es una maqueta con datos hardcodeados.
- ⚪ **No existe en código todavía** — ni como capacidad del catálogo ni como template.

---

## 1. Wallet — 🟢 Construido
**Qué es**: el núcleo de identidad digital del usuario dentro de un mundo — saldo, perfiles, recargas, transferencias entre personas, y la bandita NFC física que representa esa identidad en el mundo real.
**Cómo se activa**: Tier CORE, preseleccionada al crear un mundo (`Mundos.jsx` wizard paso 4) o desde `TabModulos` en la ficha del mundo.
**Config clave**: moneda permitida, tope de recargas/día, monto máximo por recarga, si permite P2P, si el mundo usa pulsera física NFC, vigencia de la pulsera (desde que se vincula, no desde hoy), si cobra cuota de suscripción por dependiente.
**Depende de**: nada — es fundacional. Es prerequisito directo o indirecto de casi todo lo demás (Comercios, Consumos, Restricciones, Eventos, BNPL, etc.).
**Render por frente**: Admin (`TabModulos`/`ModuleConfigDrawer`) · Panel de Mundo (widget de recargas/familiares) · Merchant/POS (Cobrar, Recargar, vincular bandita) · Superapp (`WalletTemplate`, hub de saldo/recarga/P2P/bandita) · POS Operador (identificación por código/DNI/NFC en cada flujo).
**Datos**: `wallets`, `transactions`, `nfc_bands`, `nfc_requests`, RPC `mover_saldo_wallet`/`transferir_p2p_wallet`.

## 2. Comercio — 🟢 Construido
**Qué es**: administración de los puntos de venta del ecosistema — alta de comercios, su tarifa, su hardware, su liquidación.
**Cómo se activa**: Tier CORE, preseleccionada por defecto.
**Config clave**: MDR y fijo por transacción por defecto, quién da de alta comercios (automático/RedPontis/sponsor); microservicio de Liquidación (obligatorio, siempre activo) con modelo de recaudación, frecuencia, hora de corte.
**Depende de**: nada propio. Es prerequisito de Consumos, Inventario, Cashback, BNPL, Eventos.
**Render por frente**: Admin (Actores → Merchants, alta/edición/baja con flujo guiado de bloqueo) · Panel de Mundo (solicitar alta, visibilidad) · Merchant (todo el panel del comercio) · Superapp (`MarketplaceTemplate`, directorio + catálogo) · POS Operador (Cobrar).
**Datos**: `merchants`, `merchant_requests`, `pos_devices`.

## 3. Compras y transacciones — 🟢 Construido
**Qué es**: el motor transaccional del backoffice — historial de ventas, pagos, conciliación diaria.
**Cómo se activa**: Tier CORE. Config: horario operativo del POS.
**Depende de**: Wallet, Comercio.
**Render por frente**: Admin (reportes de volumen) · Merchant (Cierre/consulta) · Superapp (`ConsumosTemplate`, recorte del historial de Wallet — sin tabla propia) · POS Operador (cada cobro).
**Datos**: `transactions` (sin tabla propia — reusa Wallet).

## 4. Promociones — 🟡 Construido, inconsistente (ver discrepancia)
**Qué es**: cupones QR con vigencia, descuento/cashback/2x1, canjeables en el POS de un comercio.
**Cómo se activa**: hoy convive en dos capas distintas que no están alineadas entre sí (ver discrepancia abajo).
**Depende de**: nada declarada en el mapa de dependencias.
**Render por frente**: Admin (`TabPromos`, CRUD real completo) · Superapp (`PromocionesTemplate`, real, lee y muestra QR de canje).
**Datos**: `promociones`, `promociones_canjes`.
**⚠️ Discrepancia**: en el catálogo general de capacidades (`MODULE_CATALOG`/`MODULOS_PROXIMAMENTE`), Promociones está marcada **Planificada** — no es activable/sincronizable desde el flujo estándar de capacidades. Pero por otro lado existe un `TabPromos` con CRUD 100% real contra Supabase, que solo se renderiza si el mundo es de `type === "promos"/"promos_rp"` — y el único mundo de ese tipo (`mundo-promos-rp`, "JOI Promos") fue retirado activamente del alcance y se purga en cada carga del store. Es decir: **hay backend y UI reales, pero hoy no hay ningún mundo real donde esa UI sea alcanzable**. Para la próxima tanda: decidir si Promociones se integra al flujo estándar de capacidades (como cualquier otra) en vez de depender de un `type` de mundo especial.

## 5. Perfil extendido — 🟢 Construido
**Qué es**: ficha médica y de emergencia — tipo de sangre, alergias, clínica, contacto de emergencia — del titular o de cada dependiente.
**Cómo se activa**: Tier PREMIUM. Config: qué campos médicos mostrar, si habilita gestión de grupo familiar.
**Depende de**: nada declarada; se integra por convención de datos con Restricciones (alergias) y Menú (restricciones alimentarias).
**Render por frente**: Admin (ficha del comercio/mundo no aplica directo, pero alimenta Consultar Ficha del POS) · Superapp (`PerfilExtTemplate`) · POS/Operador (Consultar Ficha, mesa de ayuda médica).
**Datos**: `user_profiles`, `dependents.alergias`.

## 6. Menú — 🟢 Construido (salvo canje QR)
**Qué es**: calendario de menú diario por comercio, con cupos, restricciones alimentarias y reserva anticipada — el caso real hoy es Colegio Raimondi.
**Cómo se activa**: Tier OPCIONAL. Config: días de anticipación, cupos por menú, método de reserva (saldo / QR / ambos).
**Depende de**: Inventario.
**Render por frente**: Admin (config de programación) · Merchant (Entregar Menú en POS) · Superapp (`MenuTemplate`, flujo completo de reserva) · POS Operador (Entregar Menú).
**Datos**: `menu_items`, `menu_programacion`, `menu_reservas`, `menu_membresias`, `consumo_alertas`.
**Nota**: si el mundo elige método de reserva "QR" o "Ambos", la propia app avisa honestamente que el canje en punto de venta todavía no está construido — no hay una simulación disimulada.

## 7. Inventario — 🟢 Construido (sin template propio, por diseño)
**Qué es**: control de stock y disponibilidad de productos que sostiene a Comercio y Menú.
**Cómo se activa**: Tier CORE. Config: tope de SKUs, si permite stock negativo, tope de categorías.
**Depende de**: Comercio. Es prerequisito de Menú.
**Render por frente**: no tiene pantalla propia en la superapp (`surface:"system"`) — se materializa dentro de `MarketplaceTemplate` (control real de `stock` al comprar) y dentro de Menú (cupos).
**Datos**: `products.stock`.

## 8. Acceso — 🟡 Construido, parcial
**Qué es**: control de ingreso/salida por QR/NFC, con registro de zona y horario.
**Cómo se activa**: Tier PREMIUM. Config: lista de zonas, si exige doble validación (NFC+PIN) en zonas sensibles.
**Depende de**: nada propia. Es prerequisito de Estacionamiento y Asistencia (ambas planificadas).
**Render por frente**: Superapp (`AccesosTemplate`, QR + historial real) · POS Operador (Control de Accesos, con turno por zona) · Panel de Mundo (Operador de Mundo).
**Datos**: `access_log`, `access_shifts`.
**Nota**: el estado "Activa" de cada zona en la app es hoy decorativo/fijo, no refleja disponibilidad real en tiempo real.

## 9. Motor de evento (crear eventos, crear entradas) — 🟢 Construido
**Qué es**: venta y gestión de entradas para eventos, con 3 modelos de gobierno: **B2B** (organizador externo con panel propio), **B2C** (el usuario final crea el evento) y **Embebido** (el propio mundo publica bajo comisión de RedPontis — solo combinable con B2C, nunca con B2B).
**Cómo se activa**: Tier OPCIONAL. Al activarla por primera vez, un popup obligatorio hace elegir el modelo. Config: comisión por entrada, si permite creación B2C, ventana de recojo de preventa.
**Depende de**: Wallet, Comercio.
**Render por frente**: Admin (Gobierno/Aprobaciones, MundoDetail → Motor de Eventos) · Panel de Organizador (creación de evento, comercios afiliados, asistencia/check-in, agenda, tipos de entrada) · Superapp (`EventosTemplate`, marketplace + compra + "Mis entradas" + creación B2C) · POS/Operador (check-in, hardware asignado por evento).
**Datos**: `events`, `event_ticket_types`, `event_tickets`, `event_merchants`, `event_agenda_items`, `event_checkin_log`, `event_guest_lists`/`event_guests` (cash-in de evento).

## 10. Precompra — 🟡 Construido parcial (autoría lista, consumo pendiente)
**Qué es**: productos que un comercio afiliado a un evento carga con stock real, para que el asistente los reserve/pague antes o durante el evento y los retire en el stand — independiente del catálogo regular del comercio.
**Cómo se activa**: **no es una capacidad propia del catálogo** — es una funcionalidad dentro de Motor de Eventos. Recién construida esta semana en el lado de autoría: dentro del panel de Organizador, cada comercio afiliado a un evento (por checkbox del directorio o dado de alta ad-hoc solo para ese evento) tiene un botón "Precompra" que abre un mini-catálogo con nombre/precio/stock, con badge Agotado/Stock/Sin límite.
**Depende de**: Motor de evento, Comercio, Inventario (el mismo concepto de stock).
**Render por frente**: Panel de Organizador — 🟢 construido y deployado. Superapp — ⚪ no existe todavía ningún flujo para que el usuario vea/compre estos productos tras comprar su entrada.
**Datos**: `products` (con `event_id` seteado — mismo esquema que el catálogo regular, aislado por evento), `event_merchants`.
**Para la próxima tanda**: el flujo de compra/redención del lado del asistente (superapp) es explícitamente el siguiente paso, ya identificado y priorizado por Camila.

## 11. Crédito — 🔵 Planificado
**Qué es**: línea de crédito propia del ecosistema (distinta de BNPL).
**Estado en código**: en `MODULOS_PROXIMAMENTE`, no activable. En superapp, `CreditoTemplate` existe pero con saldo/cuotas 100% hardcodeados — es una maqueta visual, no una función.
**Depende de (cuando se construya)**: Wallet.
**Nota de negocio**: quedó fuera del alcance cuando se decidió construir BNPL — hoy el financiamiento real del ecosistema es BNPL, no Crédito.

## 12. BNPL — 🟡 Construido, parcial (checkout simulado)
**Qué es**: "compra ahora, paga después" en marca blanca — el Mundo define el techo (cuotas, monto máximo, si exige evaluación), el Comercio activa su propio programa dentro de ese techo.
**Cómo se activa**: Tier OPCIONAL. La capacidad opcional más desarrollada del catálogo, con 4 microservicios: elegibilidad, límites, programa (revenue share), contratos.
**Depende de**: Wallet, Comercio — explícitamente NO depende de Crédito.
**Render por frente**: Admin (Calculadora, config de mundo) · Merchant (originar solicitud desde el POS) · Superapp (`BNPLTemplate`, descubrir → evaluar → firmar → pagar cuotas → historial).
**Datos**: `bnpl_programa_comercio`, `bnpl_contratos`, `bnpl_notificaciones`, `bnpl_campanas`.
**Discrepancia técnica**: el checkout de la primera cuota es un simulador visual tipo Culqi, explícitamente marcado en el código como "simulado para demo" — no hay integración real con ningún PSP todavía. El cálculo de cronograma/interés además vive **duplicado** en dos archivos distintos del cliente en vez de una única fuente de verdad server-side.

## 13. Turnos — 🔵 Planificado como capacidad de negocio · 🟢 ya construido como mecanismo operativo (ver discrepancia)
**Qué es (como capacidad de negocio)**: agendar y gestionar citas/turnos de atención.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp, `TurnosTemplate` con citas hardcodeadas, botón "Agendar" sin acción.
**⚠️ Discrepancia importante — colisión de nombre**: la palabra "turno" ya es infraestructura real y activa en otra parte del sistema: `pos_turnos` (apertura/cierre de caja del comercio) y `access_shifts` (turno de portería en Accesos) son tablas reales, en uso constante, que sostienen operaciones de dinero y de control de acceso — pero son un concepto distinto (sesión de trabajo de un operador), no la capacidad de negocio "Turnos" (citas de atención) que el plan de negocio tiene en mente. Vale la pena que el equipo use un nombre distinto para uno de los dos conceptos antes de construir la capacidad real, para no generar confusión entre "turno de caja" y "turno de cita".

## 14. Loyalty — 🔵 Planificado (conceptualizado 13-ago, no construido)
**Qué es**: acumulación y canje de puntos por consumo — a diferencia de Cashback (macro, un solo % del mundo, ya construido), Loyalty vive **por comercio**: cada comercio puede tener su propio programa de puntos, con su propia tasa de conversión y sus propias reglas de canje, siempre dentro de un marco que el mundo define y aprueba.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp, `LoyaltyTemplate` con puntos que solo viven en `localStorage` del dispositivo — nunca sincronizados con Supabase; recompensas e historial hardcodeados. No se toca en esta tanda.
**Depende de (cuando se construya)**: Wallet, Comercios.

**Diseño conceptual (Camila, 13-ago-2026) — para aterrizar antes de construir, no construir ahora:**

- **Quién define la regla de negocio.** Dos niveles, no uno: el **mundo** (Jockey Plaza) define el marco general — qué comercios pueden tener programa de Loyalty, y opcionalmente un programa "genérico" del mundo sin comercio asociado (ej. puntos por visitar el mall, no por comprar en un comercio puntual). Cada **comercio habilitado** define su propio programa dentro de ese marco: tasa de conversión (S/ gastados → puntos), y sus propias recompensas/reglas de canje. Es la misma relación mundo↔comercio que ya usa Cashback (`merchants.cashback_habilitado`) pero con una diferencia clave: en Cashback el % es uno solo, del mundo, igual para todos los comercios habilitados; en Loyalty cada comercio habilitado puede tener SU PROPIA tasa y SUS PROPIAS reglas — el mundo no impone un único % para todos.
- **Dónde vive la configuración.** Panel de Mundo (Jockey Plaza): pantalla de "Programas de Loyalty" — activa/desactiva el módulo por comercio, ve un resumen de los programas activos. Panel del Merchant: cada comercio habilitado entra a su propio "Loyalty" y define su tasa de conversión y sus recompensas — mismo patrón de autonomía delegada que ya existe para el catálogo de productos de Menú (el mundo habilita el módulo, el comercio carga su propio contenido).
- **Consumo: cerrado a la bandita física.** A diferencia de Cashback (que puede aplicarse identificando al cliente por código/DNI/bandita indistintamente, igual que un cobro normal), la ganancia y el canje de puntos Loyalty solo deben poder ocurrir mediante la bandita NFC física vinculada — no por código tipeado ni por búsqueda por DNI. Refuerza que Loyalty es un programa físico de fidelización del punto de venta, no una operación remota.
- **Render en el POS/Operador**: un botón "Consultar Loyalty" (scan de bandita), simétrico al botón "Consultar cashback" ya construido — muestra los puntos acumulados del cliente en ESE comercio específico (no un total del mundo, porque cada comercio tiene su propio programa). Antes de confirmar el cobro, el operador puede elegir aplicar una recompensa de Loyalty (canjear puntos) igual que hoy puede aplicar cashback como descuento — ambas opciones conviven en la misma pantalla de cobro, cada una independiente (se puede aplicar cashback, Loyalty, ninguna, o en teoría ambas si el mundo lo permite — a decidir al construir).
- **Superapp**: el saldo de puntos no es uno solo — es por comercio (o "puntos Jockey Plaza" para el programa genérico del mundo, si existe). El subtítulo bajo el saldo de wallet (mismo lugar donde hoy vive el subtítulo de cashback) tendría que discriminar: si el usuario tiene puntos en varios comercios, no cabe un solo número — probablemente un resumen tipo "Loyalty en 2 comercios" que lleva al detalle, en vez de una cifra directa como cashback (que sí es un solo número porque es del mundo entero).
- **Por qué no sale en esta tanda**: la complejidad real está en que Cashback tiene UN dueño de la regla (el mundo) y Loyalty tiene un dueño de la regla POR CADA comercio participante — eso multiplica la superficie de configuración (N programas en vez de 1) y la superficie de consulta en el POS (el operador tiene que saber en qué comercio está parado para mostrar los puntos correctos). Cashback macro cerraba con una sola RPC y un solo % configurable; Loyalty necesita, como mínimo, una tabla de programas por comercio (`loyalty_programas`: merchant_id, tasa_conversion, activo) antes de poder construir nada — quedó mapeado para la siguiente iteración, no para salir junto con Cashback.

## 15. Reserva — 🔵 Planificado
**Qué es**: reserva de espacios/recursos (canchas, salas, laboratorios) con anticipo y ventana de cancelación.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp, `ReservasTemplate` con espacios y próximas reservas hardcodeados, sin persistencia real.
**Nota**: el único flujo de "reservar" que sí es 100% real en el ecosistema hoy vive dentro de la capacidad **Menú** (`menu_reservas`) — es un caso particular (reservar un plato de comida), no el motor genérico de reserva de espacios que el plan de negocio contempla.

## 16. Facturación — 🔵 Planificado
**Qué es**: comprobantes electrónicos (boleta/factura/nota de crédito) vía integración SUNAT.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp cae en `GenericTemplate` (sin template dedicado).
**Depende de (cuando se construya)**: Comercio, Compras y transacciones.

## 17. Cashback — 🟢 Construido (13-ago-2026) — MACRO cerrado a comercios habilitados
**Qué es**: retorno de un % de cada compra como saldo utilizable después. **Macro**: un único % lo define el mundo (no cada comercio); **cerrado**: solo se acredita en comercios marcados como `cashback_habilitado`.
**Cómo se activa**: Tier OPCIONAL, ya fuera de `MODULOS_PROXIMAMENTE`. Config (`ModuleConfigDrawer`, ya genérico): `porcentajeDefault`, `topeMensual` (declarado, sin enforcement todavía — ver discrepancia).
**Depende de**: Wallet, Comercios.
**Render por frente**: Panel de Mundo/Admin (`ActoresMerchants`, toggle "Cashback habilitado" por comercio, visible solo si la capacidad está activa) · POS/Operador (`CobrarPanel`, compartido entre Operador web y T6 vía `OperadorApp.jsx` — muestra el cashback disponible al identificar al cliente, permite aplicarlo como descuento antes de cobrar, acredita cashback nuevo tras el cobro) · Superapp (subtítulo "+ S/ X.XX en cashback disponible" bajo el saldo de wallet, `WalletTemplate`).
**Datos**: `wallets.cashback_balance` (saldo separado del principal, a propósito — no se mezcla con dinero recargado real para no repetir los bugs de netos negativos que tuvo Liquidación cuando se mezclaron conceptos), `merchants.cashback_habilitado`, RPC `mover_cashback_wallet` (mismo patrón de seguridad que `mover_saldo_wallet`: lock de fila, validación de dueño/turno, atómico).
**Discrepancia abierta**: `topeMensual` es un config field real y visible, pero el backend todavía no lo hace cumplir — un mundo puede configurar un tope y el cashback seguirlo acreditando sin límite. Pendiente de una siguiente iteración (requiere sumar el cashback ganado del mes en curso antes de acreditar, dentro de la misma RPC).
**Nota**: `CashbackTemplate` (superapp, template de referencia con saldo/historial hardcodeados) sigue sin conectarse a los datos reales — lo real hoy vive en el subtítulo del `WalletTemplate`, no en ese template dedicado. Conectar `CashbackTemplate` a `wallets.cashback_balance` + historial real de transacciones `cashback_ganado`/`cashback_canjeado` queda en el backlog.

## 18. Restricciones — 🟢 Construido
**Qué es**: control parental real — límites de consumo por dependiente, alergias, horarios permitidos, productos bloqueados, aprobación del padre sobre umbral, alertas en tiempo real.
**Cómo se activa**: Tier OPCIONAL. Tiene la lista de config fields más larga del catálogo.
**Depende de**: Wallet.
**Render por frente**: Superapp (`RestriccionesTemplate`, CRUD completo de dependientes — crear, editar, eliminar, recargar, restricciones granulares) · esta es también donde vive toda la gestión de dependientes/familiares del ecosistema.
**Datos**: `dependents`, `dependent_restrictions` (única tabla de config con enforcement real dentro de la RPC de wallet), `consumo_alertas`.

## 19. Subsidio — 🔵 Planificado
**Qué es**: saldo subsidiado utilizable solo en categorías específicas, con vigencia propia.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp, `SubsidioTemplate` con saldo `85.00` marcado literalmente `// demo` en el código, historial hardcodeado.
**Depende de (cuando se construya)**: Wallet.

## 20. Transporte — 🔵 Planificado
**Qué es**: pago de tarifa de transporte, rutas, viajes recientes.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp, `TransporteTemplate` con tarifa y saldo REALES (lee config y wallet de verdad) pero sin flujo de pago funcional — botones sin acción; rutas/viajes hardcodeados.
**Depende de (cuando se construya)**: Wallet.

## 21. Estacionamiento — 🔵 Planificado
**Qué es**: registro de entrada/salida de vehículo con cronómetro de costo.
**Estado en código**: en `MODULOS_PROXIMAMENTE`. En superapp, `EstacionamientoTemplate` con cronómetro solo en memoria (se pierde al salir de la pantalla), historial hardcodeado.
**Depende de (cuando se construya)**: Acceso, Wallet.

## 22. Suscripciones — 🟡 Ya construido y funcionando, pero NO como capacidad independiente (ver discrepancia importante)
**Qué es (según el plan de negocio)**: cobro recurrente por una suscripción del usuario a un servicio del mundo.
**⚠️ Discrepancia importante para priorizar la próxima tanda**: la funcionalidad de fondo YA EXISTE y está en uso real hoy — `perfilesSuscripcion` es un config field de **Wallet** que, al activarse, exige crear al menos un plan real (`subscription_plans`, CRUD real vía `PlanesSuscripcionPanel` en el admin) y cobra esa cuota automáticamente cada vez que un titular vincula un nuevo dependiente (`crearDependienteRemote`, pago real vía `pagarSupabase` con `tipo:"suscripcion"`, contabilizado aparte del volumen de compras normal). Es decir: **el negocio ya está cobrando suscripciones reales hoy**, solo que la funcionalidad vive escondida dentro de Wallet/Restricciones en vez de ser su propia capacidad visible en el catálogo. Para la próxima tanda: decidir si esto se "gradúa" a capacidad propia (con su propio ícono, activación y pantalla en el catálogo) o si se documenta y se deja como está.

---

## Nota: capacidad en código sin lugar en la lista de negocio

**Asistencia** (`asistencia`) existe en `MODULE_CATALOG` — planificada, bloqueada exclusivamente a mundos de vertical Educación, y su propia descripción en el código dice literalmente "aún no construido en la app, sin parámetros configurables todavía". No aparece en la lista de 22 capacidades de negocio de Camila — se deja registrada acá por transparencia, sin acción requerida salvo decidir si entra o no al plan formal.
