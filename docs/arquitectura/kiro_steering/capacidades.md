# Capacidades — catálogo completo con versión, dependencias, config y flags

*Derivado del código real (`joi360-admin/src/store.js` MODULE_CATALOG + DEPENDENCY_MAP, `joi360-app/src/pages/Module.jsx` TEMPLATE_MAP), no de memoria. Snapshot: 11-sep-2026. **Regenerar en cada corte semanal — no cargar hacia adelante una entrada de un corte viejo.** Si algo de este documento contradice el código actual, gana el código.*

Formato por capacidad: **id (render code)** · tier · versión · dependencias · template web (`TEMPLATE_MAP`, o "genérico" si no tiene) · `servicios` (= flags que controlan qué ve/hace el usuario — cada uno es candidato a una condición de render, verificar granularidad exacta en `Module.jsx` al construir esa capacidad, no asumirla de este doc) · `configFields` (key: tipo, default).

Las 3 con versión `0.0.0` son **planificadas — sin View de negocio, nunca enrutar una pantalla real ni maqueta** (ver `no-mock.md`).

---

## CORE (fundacionales — sin dependencias propias)

### `wallet` — Wallet · CORE · **v1.1.0** · sin dependencias · template: `WalletTemplate`
Núcleo de identidad digital: saldo, perfiles, recargas, P2P, bandita NFC.
- Flags: `balance` (saldo en tiempo real, siempre visible si Wallet activo) · `recarga` (botón + modal, canales del catálogo de Emisión) · `p2p` (transferencia P2P, requiere `configFields.p2pEnabled`) · `subwallet` (sub-wallets/familia, conecta con `control`) · `bandita` (vincular NFC, requiere `configFields.usaPulseraNfc`) · `notifs` (push en cada movimiento) · `qr_fijo` (QR de pago, siempre activo en la práctica).
- Config: `monedaPermitida` (select PEN/USD) · `maxRecargasDiarias` (number, def 3, nullable="sin límite") · `maxPorRecarga` (currency, def 500, nullable) · `p2pEnabled` (switch, def true) · `usaPulseraNfc` (switch, def true) · `vigenciaBanditasMeses` (monthsAsDate, def 12, nullable).
- Microservicios: `modelo_perfil` (consumo|identificación — decisión base, todo lo demás depende de esta) · `transferencia` (maxPorTx, maxPorDia, maxTransferenciasPorDia — límites reales aplicados en el P2P).
- **Verificado en código:** las secciones de `WalletTemplate` están gateadas exactamente así: `balance`, `recarga`, `p2pEnabled&&p2p`, `bandita&&usaPulseraNfc` — replicar esta granularidad exacta, no fusionar en una sola vista de "saldo".

### `comercios` — Comercios · CORE · **v1.0.0** · sin dependencias · template: `MarketplaceTemplate` (del lado usuario; también materializa `inventario` para el consumidor final)
- Flags: `registro` (alta merchant, directorio) · `plataforma` (pago en el comercio desde la app) · `pos` (terminales/canales de Adquirencia) · `liquidacion` (corte y pago al merchant) · `reportes` (panel merchant: ventas/liquidaciones).
- Config: `mdrDefault` (percent, def 1.5) · `fijoTxDefault` (currency, def 0.10) · `tipoOnboarding` (select: Automático/Manual RP/Manual sponsor).
- Microservicios: `hardware` (inventario POS/tótems/ticketeras) · `liquidacion` (**obligatorio, siempre activo** — modeloRecaudacion redpontis|mundo, frecuencia, horaCorte, montoMinimo) · `creacion` (reglas de alta de comercio).

### `consumos` — Compras y Transacciones · CORE · **v1.0.0** · depende de `wallet, comercios` · template: `ConsumosTemplate` (recorte del historial de Wallet, sin tabla propia)
- Flags: `venta_pos` · `compra_app` · `historial` · `conciliacion`.
- Config: `horarioOperativo` (timerange, nullable="24/7").

### `inventario` — Inventario · CORE · **v1.0.0** · depende de `comercios` · **sin template propio** (`surface:"system"` — se materializa dentro de `MarketplaceTemplate`)
Soporta `consumos`, `menu` y `eventos`.
- Flags: `subir_productos` · `subir_stock` · `venta_pos` · `detalle_ventas` · `detalle_consumos`.
- Config: `skuMax` (number, def 500, nullable) · `stockNegativo` (switch, def false) · `categoriasMax` (number, def 20, nullable).

---

## PREMIUM

### `facturacion` — Facturación · PREMIUM · **v0.0.0 — PLANIFICADA** · depende de `comercios, consumos` · **sin View — cae en `GenericTemplate`**
Necesita proveedor PSE + integración SUNAT. Config existente (`rucEmisor`, `serieBoleta`, `serieFactura`) es solo catálogo, sin flujo real detrás — no construir nada de negocio para esta hasta que se levante el bloqueo de producto.

### `perfil_ext` — Perfil extendido · PREMIUM · **v1.0.0** · sin dependencias · template: `PerfilExtTemplate`
- Flags: `tipo_sangre` · `alergias` (visible también en `control`) · `clinica` · `contacto_emergencia`.
- Config: `camposMedicos` (switch, def true) · `grupoFamiliar` (switch, def true).

### `accesos` — Accesos · PREMIUM · **v1.0.2** · sin dependencias · template: `AccesosTemplate` — es prerequisito conceptual de `asistencia` (no de `estacionamiento`, ver nota de dependencias abajo)
- Flags: `identificacion` (TAQ/QR/DNI en POS) · `consulta_pos` (ficha del usuario al identificar) · `registro_tipo` · `registro_zonas` (el operador elige zona, pero **hoy no restringe el paso — solo queda como dato**) · `registro_horarios`.
- Config: `zonas` (text CSV, def "Principal,Cafetería,Auditorio") · `validacionDoble` (switch, def false).

### `reservas` — Reservas · PREMIUM · **v1.0.0** (26-ago) · depende de `wallet` · template: `ReservasTemplate`
Reserva real de un recurso del mundo por fecha/hora, con cancelación real. **Sin cobro obligatorio todavía** (`anticipoMin` definido pero no aplicado — v1.1 futura).
- Flags: `reservar` · `cancelar` · `ocupacion` (informativa, sin bloqueo de cupo todavía).
- Config: `recursos` (text CSV, def "Comedor,Gimnasio,Laboratorio") · `anticipoMin` (percent, def 30, nullable, **sin aplicar**) · `ventanaCancelacion` (number horas, def 24, nullable).

---

## OPCIONAL

### `suscripciones` — Suscripciones · OPCIONAL · **v1.1.0** · depende SOLO de `wallet` · template: `SuscripcionesTemplate`
Membresía recurrente del mundo (modelo YOKI) — marca propia por plan, cobro recurrente automático desde el motor de ciclo de Wallet. **Independiente de familiares/perfiles controlados** — no confundir con el cobro de suscripción al vincular un dependiente (eso vive en `control`, reusa `subscription_plans` solo como catálogo de montos).
- Flags: `planes` · `cobro`.
- Config: ninguno propio (`configFields: []`).

### `loyalty` — Puntos Loyalty · OPCIONAL · **v1.0.0** (26-ago) · depende de `wallet` · template: `LoyaltyTemplate`
**Verificado en código:** acumulación 100% real, derivada de `transactions` reales vía `fetchLoyaltyPuntos` — no localStorage, no hardcode. Canje **no construido** — sección "Canje de puntos" muestra honestamente "Próximamente", no simula catálogo de vouchers.
- Flags: `acumulacion` · `saldo_pts` · `niveles` (Bronce/Plata/Oro, calculado en vivo).
- Config: `equivalencia` (currency, def 0.10 — valor de 1 punto en PEN) · `caducidadMeses` (number, def 12, nullable).

### `eventos` — Motor de Eventos · OPCIONAL · **v1.0.0** · depende de `wallet, comercios` · template: `EventosTemplate`
El más maduro y completo del catálogo — B2B/B2C/Embebido (criterio `modosDeMundo()`, no elegible a mano salvo el toggle Embebido), ticketing, aforo, check-in con reingresos reales, transferencia de entrada por link.
- Flags: `crear` · `entradas` · `aforo` (barra + bloqueo "Agotado") · `monitoreo` (dashboard organizador) · `taq_qr` (validación) · `preventa`.
- Config: `comisionEntrada` (percent, def 5) · `allowB2C` (switch, def false) · `ventanaPickup` (number minutos, def 30).
- Config adicional a nivel Mundo (`m.eventosConfig`): `modoEventos`, `embebidoActivo`, `modeloComisionEventos`.

### `credito` — Crédito · OPCIONAL · **v0.0.0 — PLANIFICADA** · depende de `wallet` · **sin View — cae en `GenericTemplate`**
Alto control regulatorio, se solapa con BNPL (que ya cubre "compra ahora paga después" operativamente). Decisión de producto pendiente — no construir.

### `subsidio` — Subsidio · OPCIONAL · **v1.0.0** (26-ago) · depende de `wallet` · template: `SubsidioTemplate`
Saldo dirigido real acreditado por RedPontis a UN usuario a la vez (sin autoservicio del mundo, sin carga masiva). **El consumo del subsidio (gastarlo) es v1.1 — hoy es saldo visible/auditable que no toca `wallets.balance`.**
- Flags: `acreditacion` (por RedPontis, desde la ficha del usuario) · `saldo_visible`.
- Config: `categorias` (text CSV, def "F&B,Educación") · `vigenciaDias` (number, def 30, nullable).

### `estacionamiento` — Estacionamiento · OPCIONAL · **v1.0.0** (26-ago) · depende SOLO de `wallet` (la dependencia conceptual con `accesos` se retiró explícitamente del código — no está bloqueada por Accesos) · template: `EstacionamientoTemplate`
Sesión real de ingreso/salida, cobro real por permanencia calculado **al salir**, nunca por adelantado; si el pago falla, la sesión no se cierra.
- Flags: `sesion` · `cobro_permanencia`.
- Config: `tarifaHora` (currency, def 5) · `graciaMinutos` (number, def 15, nullable).

### `asistencia` — Asistencia · OPCIONAL · **v0.0.0 — PLANIFICADA** · depende de `accesos` · `lock: "Educación"` (solo elegible en esa vertical) · **sin View — cae en `GenericTemplate`**
Falta especificar el flujo completo. Sin `configFields` todavía. No construir.

### `cashback` — Cashback · OPCIONAL · **v1.0.1** · depende de `wallet, comercios` · template: `CashbackTemplate`
- Flags (lista descriptiva, sin `id` corto en este catálogo — servicios como texto libre): % de retorno sobre venta, tope mensual, categorías con cashback diferenciado, vigencia, historial.
- Config: `modalidad` (select flat|por_comercio) · `porcentajeDefault` (percent, def 3) · `topeMensual` (currency, def 50, nullable).

### `control` — Restricciones · OPCIONAL · **v1.0.0** · depende de `wallet` · template: `RestriccionesTemplate`
CRUD completo de dependientes (crear con cobro de suscripción opcional, editar perfil/alergias, eliminar con bloqueo si `saldo>0`, recargar, restricciones granulares). El módulo con más `configFields` del catálogo.
- Flags: `reglas_mundo` · `reglas_sponsor` · `perfiles_ctrl` · `aprobaciones` (**hoy solo banner informativo — sin enforcement real de un estado "pendiente"**, ver nota de paridad abajo) · `alertas`.
- Config: `perfilesControladosActivo` (switch, def true) · `maxPerfilesControlados` (number, def 2, nullable) · `registroAlergias` (switch, def true, se propaga a `menu`) · `limiteDiarioPerfil` (currency, def 30, nullable) · `montoAprobacionPadre` (currency, def 50, nullable) · `horarioConsumo` (text rango, def "07:00-17:00", nullable) · `soloMercantesAfiliados` (switch, def true) · `notificacionConsumoRealTime` (switch, def true) · `limiteGlobalMundo` (currency, def 200, nullable) · `alertasAdminEmail` (switch, def true).
- **Nota de paridad (ver `cotejo_prototipo_vs_proyecto_real.md` CT-01): en esto Salvador va ADELANTE del prototipo** — si su backend ya implementa `PENDING_APPROVAL` real con notificación al apoderado, ese es el modelo objetivo a nivel nativo, no el banner informativo del prototipo.

### `menu` — Menú · OPCIONAL · **v1.0.0** · depende de `inventario` · template: `MenuTemplate`
Calendario diario, "Reservar para" (titular/dependiente), carrito bloqueado por alergia/restricción, checkout con saldo.
- Flags: `calendario` · `cupos` · `restricciones_alimentarias` (integra con `perfil_ext`/`control`) · `preorden` · `validacion_pos` (**canje QR en el POS del comercio — NO construido**; con `metodoReserva=qr|ambos` la app avisa honestamente que aún no puede confirmarse, no simula el cobro).
- Config: `diasAnticipacion` (number, def 7) · `cuposPorMenu` (number, def 100) · `metodoReserva` (select saldo|qr|ambos, def saldo).
- **Gap compartido con Salvador (MN-01 en el cotejo):** construir el canje QR real en el POS es trabajo pendiente en LOS DOS proyectos — no asumir que uno de los dos ya lo resolvió.

### `promociones` — Promociones · OPCIONAL · **v1.0.0** (25-ago, alcance recortado) · sin dependencias declaradas · template: `PromocionesTemplate`
**Solo lo que existe de verdad:** cupón QR + canje en el POS del comercio + vigencia/cupo. Banner segmentado, push, A/B testing **NO están construidos y no deben listarse como servicios disponibles** — se sacaron a propósito de `servicios` para no prometer algo que la capacidad no hace.
- Flags: `Cupón QR` · `Canje en el POS del comercio` · `Vigencia y cupo de usos`.
- Config: `maxCuponesUsuario` (number, def 5).

### `turnos` — Turnos · OPCIONAL · **v1.0.0** (26-ago) · depende de `wallet, comercios` · template: `TurnosTemplate`
**No es un motor de citas** (el nombre "turnos" colisiona con `pos_turnos`/`access_shifts` — colisión conocida, no renombrar sin decisión explícita). Es seguimiento de estado de pedido para food court/restaurantes: recibido→preparando→listo→entregado. El cobro ya ocurre en `consumos` — esta capacidad no mueve dinero.
- Flags: `seguimiento` (estado visible al usuario en vivo) · `cola_comercio` (el operador avanza el estado desde su panel).
- Config: ninguno (`configFields: []`).

### `bnpl` — BNPL · OPCIONAL · **v1.0.0** · depende de `wallet, comercios` — **explícitamente NO depende de `credito`** · template: `BNPLTemplate`
"Compra ahora, paga después" en marca blanca — el más elaborado de los opcionales, jerarquía de 4 microservicios.
- Flags: `elegibilidad` · `limites` · `programa` · `contratos`.
- Config (techo del Mundo — nivel 2, el Comercio hereda por clamping, solo puede restringir): `cuotas3`/`cuotas6`/`cuotas12` (switch) · `diasGracia` (number, def 5, máx 10) · `scoreObligatorio` (switch, def false) · `sinEvaluacion` (switch, def true) · `montoMaxBNPL` (currency, def 3000) · `moraMaxPct` (number, def 5).
- Microservicios: `elegibilidad` (sin_evaluacion|score_interno|integracion_personalizada) · `limites` (sin campos propios, es el techo) · `programa` (revenueShareActivo, revenueShareMecanismo: comision|interes|ambos) · `contratos` (contrato digital + cronograma, checkout simulado tipo Culqi — **sin integración PSP real**).

### `transporte` — Transporte · OPCIONAL · **v1.0.0** (26-ago) · depende de `wallet` · template: `TransporteTemplate`
Tarifa plana real, cobrada con el mismo mecanismo de pago del resto del ecosistema. **Sin catálogo de rutas todavía** (solo una tarifa única por mundo) — no construir rutas/zonas hasta que exista esa decisión de producto.
- Flags: `pasaje` · `historial` (derivado de transacciones reales, sin tabla propia).
- Config: `tarifaPlana` (currency, def 2.5).

---

## Tabla de dependencias completa (`DEPENDENCY_MAP`, `joi360-admin/src/store.js:1062`)

```
loyalty         → [wallet]
cashback        → [wallet, comercios]
consumos        → [wallet, comercios]
inventario      → [comercios]
facturacion     → [comercios, consumos]
menu            → [inventario]
subsidio        → [wallet]
credito         → [wallet]
bnpl            → [wallet, comercios]
eventos         → [wallet, comercios]
estacionamiento → [wallet]              ← NO depende de accesos (se retiró del código; era conceptual)
transporte      → [wallet]
control         → [wallet]
asistencia      → [accesos]
reservas        → [wallet]
turnos          → [wallet, comercios]
suscripciones   → [wallet]              (v1.1.0, independiente de control/dependientes)
```
`wallet`, `comercios`, `accesos`, `perfil_ext` no tienen entrada — son fundacionales.

**Nota:** esta lista se leyó del código el 11-sep-2026 y difiere en 2 puntos de `docs/arquitectura/mapeo_maestro/src/01_backbone.md` (escrito 12-ago, ya desactualizado ahí): `turnos` sí depende de `comercios` además de `wallet`, y `estacionamiento` NO depende de `accesos`. Este documento (y el código) mandan sobre el backbone doc en este punto.

## Capacidades planificadas (0.0.0) — no construir View de negocio

`facturacion`, `credito`, `asistencia` — únicas 3 en `MODULOS_PROXIMAMENTE` (`joi360-admin/src/supabase.js:223`). Cualquier otra de las 22 está construida y versionada `1.0.x`/`1.1.0`.
