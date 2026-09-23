# SPEC Funcional — Comercios

*Documento de especificación funcional, no un registro de iteraciones. Describe la capacidad `comercios` tal como existe construida y verificada en el prototipo JOI 360 al 23-sep-2026. Formato de referencia: `spec_eventos.md`.*

Fuente: código real (`joi360-admin/src/Fronts.jsx`, `Liquidacion.jsx`, `HardwarePOS.jsx`, `supabase.js`; `joi360-app/src/pages/Module.jsx`, `supabaseClient.js`), leído línea por línea el mismo día de este documento.

---

## 1. Propósito y alcance

`comercios` (tier CORE) administra los puntos de venta del Mundo — alta, hardware POS, liquidación, catálogo y reportería. Es, junto con `wallet`, una capacidad **fundacional**: no tiene dependencias propias y es prerequisito declarado de `consumos`, `inventario`, `bnpl`, `eventos`, `cashback`, `turnos`.

Del lado del usuario final, `comercios` se materializa como el **Marketplace** de la superapp (`TEMPLATE_MAP.comercios → MarketplaceTemplate`) — el directorio de comercios del mundo es también donde `inventario` se hace visible (ver `spec_inventario.md`).

---

## 2. Jerarquía de microservicios (declarados en `MODULE_CATALOG.comercios`)

### 2.1 Registro (alta de comercio)
**Dónde (admin):** `MundoDetail.jsx` → `ActoresMerchants` (alta guiada con datos legales completos: RUC, razón social, dirección fiscal, apoderado, contacto, banco/cuenta/CCI). **Tabla:** `merchants`.

**Alta remota vs. solicitud:** un Mundo puede dar de alta un comercio directamente, o el BackOffice Mundo puede enviar una **solicitud** (`crearSolicitudComercio` → tabla `merchant_requests`, estado `PENDIENTE`) que entra a la MISMA cola cross-mundo de aprobación de `Gobierno.jsx` que usa Eventos (`resolverSolicitudComercio` → aprobar crea el merchant real, rechazar solo cambia estado con `motivo_rechazo`).

**Eliminación segura (3 pasos):** deshabilitar (`status → "suspendido"`, NUNCA `"inactivo"` — viola el check constraint real de la tabla) → verificar bloqueos (`verificarBloqueosEliminacionMundo`-equivalente a nivel comercio: BNPL no-terminal, ventas desde el corte teórico, reservas de Menú a futuro, hardware asignado como aviso no bloqueante) → eliminar definitivo con confirmación por nombre.

**Reconciliación:** `reconciliarComerciosMundo` — un comercio creado/editado directo en Supabase (otro browser/sesión) se mergea al store local del admin usando el UUID remoto como id, trayendo también `codigo` (identificador público del comercio, usado en el login del panel de comercio — distinto del PIN, que nunca sale de Supabase) y `visible_en_app`.

### 2.2 Compras y Pagos (Plataforma)
El usuario paga en el comercio desde la superapp — vía Marketplace (QR/saldo) o POS. Ver §4 (Marketplace) y `spec_wallet.md` (mecanismo de pago).

### 2.3 Hardware (POS)
**Dónde:** `HardwarePOS.jsx`. **Tabla:** `pos_devices` (columnas en **español**: `modelo`, `estado` — no `model`/`status`, decisión ya tomada, no un bug). Inventario de equipos físicos (tótems, POS, ticketeras) — RedPontis registra el stock, el Mundo asigna a comercios específicos. Carga masiva real por archivo (.csv/.txt, con preview de validación antes de confirmar) — antes era un toggle decorativo. `tipo_ingreso` (gratis/alquiler/venta) por unidad. `pos_devices.event_id` (nullable) permite prestar hardware a un evento específico (ver `spec_eventos.md`), liberado automáticamente si el evento se borra.

### 2.4 Módulo de Liquidación (obligatorio, siempre activo)
**Dónde:** `Liquidacion.jsx` (vista del corte) + microservicio `liquidacion` en `MODULE_CATALOG.comercios` (config por mundo). **Tabla:** `liquidaciones`.

Config real por Mundo: `modeloRecaudacion` (redpontis|mundo — decisión comercial, no técnica), `frecuencia` (diaria|semanal|quincenal|mensual), `horaCorte`, `montoMinimo` (nullable — bajo ese monto, el lote se genera pero queda `RETENIDO`, nunca se libera solo).

**Motor real** (`generarLiquidaciones`): "Forzar corte ahora" solo genera lote para los mundos cuya frecuencia corresponde HOY (semanal=lunes, quincenal=días 1 y 16, mensual=día 1). Cálculo por tipo de acuerdo: `transaccional` aplica % sobre volumen real de transacciones del período; `mixto` suma un fijo prorrateado; `revenue`/`fijo` prorratea el fijo entre 30 días. `descuentoHardware` se resta aparte cuando aplica. Estados de lote: `PENDIENTE → PROCESADA` (requiere neto ≥ 0) o `RETENIDO` (bajo mínimo o neto negativo — no procesable). Procesar un lote exige adjuntar un voucher/comprobante de depósito (subida real de archivo) + confirmación explícita de 2 pasos (no reversible desde la UI), con campo de observación para registrar cualquier diferencia entre el monto calculado y el realmente depositado.

**Gap histórico ya CERRADO (verificar contra `01_backbone.md`, que lo reportaba como abierto el 12-ago):** el documento `mapeo_maestro/01_backbone.md` §6 documentaba `retentionPercentage` nunca aplicado por el motor real y 2 claves paralelas de "frecuencia de liquidación" desincronizadas (`TabAcuerdo.settlementFrequency` vs. `liquidacion_frecuencia` real). El código actual de `Liquidacion.jsx`/`generarLiquidaciones` ya lee `frecuencia`/`modeloRecaudacion`/`montoMinimo` reales y calcula el neto real por tipo de acuerdo — commit `b01d197` ("Track A -- motor de liquidacion (frecuencia + retencion + MDR real)") cerró explícitamente este gap. **`01_backbone.md` sigue desactualizado en este punto** — no confiar en esa sección sin cruzar contra el código.

### 2.5 Creación de Comercios (reglas comerciales)
Config: `cantidadEsperada` (nullable), `tarifaEsPiso` (switch — si la tarifa mínima actúa como piso que el mundo puede subir pero nunca bajar; depende del plan negociado).

### 2.6 Reportería
**Dónde:** `MerchantDashboard` (panel del comercio, "Resumen del día"/"Mis ventas en vivo") + `HistorialVentasMundo` (panel del Mundo, tabla real por transacción con filtros comercio/fecha/texto-libre, exportable a CSV).

---

## 3. Config fields de la capacidad (`MODULE_CATALOG.comercios`, `configFields`)

| Campo | Tipo | Default |
|---|---|---|
| `mdrDefault` | percent | 1.5 |
| `fijoTxDefault` | currency | 0.10 |
| `tipoOnboarding` | select (Automático app / Manual RedPontis / Manual sponsor) | Manual RedPontis |

`merchants.mdr_override`/`fixed_fee_override` permiten una tarifa específica por comercio, distinta del default del mundo — usado en `Calculadora.jsx` (simulador de negociación) y en el cálculo real de comisión del POS.

---

## 4. Componente del lado usuario — Marketplace (`MarketplaceTemplate`, `Module.jsx`)

Directorio de comercios (`useMerchantsLive` — solo `status="activo" AND visible_en_app=true`) + catálogo (`products`, `event_id IS NULL`) filtrable por comercio. **Carrito de UN comercio a la vez** — agregar un producto de otro comercio dispara un aviso (`avisoMixto`), no un error duro; hay que vaciar el carrito para cambiar de comercio.

**Checkout con selector de beneficiario:** titular o cualquier dependiente real (mismo patrón que Menú) — el saldo mostrado y debitado es el del beneficiario elegido, no siempre el del titular.

**Validaciones, cliente Y servidor (doble capa, mismo patrón que Menú):**
- Productos bloqueados para el dependiente (`dependent_restrictions.productos_bloqueados`).
- Horario permitido del dependiente (`horario_inicio`/`horario_fin`) — chequeado en cliente (`fueraDeHorario()`) y repetido server-side por el RPC (`restriccion_horario`/`restriccion_limite_diario`) para el caso de que la config cambie a mitad de sesión.
- **Stock real:** `comprarProductosLive` decrementa `products.stock` de forma atómica — si no alcanza, devuelve `motivo:"stock"` con la cantidad disponible real, sin fingir la venta.

Éxito → popup estructurado (no simulado): monto, comercio, beneficiario, "el detalle está en Actividad".

---

## 5. Modelo de datos

```
merchants
  id (uuid), world_id, name, status (activo|suspendido),
  mdr_override, fixed_fee_override, visible_en_app, codigo,
  rubro, ruc, razon_social, direccion_fiscal,
  apoderado_nombre/documento/correo, contacto_nombre/documento/correo,
  banco, cuenta_bancaria, cci, created_at

merchant_requests
  id, world_id, world_nombre, nombre, rubro_id, ruc, razon_social,
  direccion_fiscal, apoderado_*, contacto_*, banco, cuenta_bancaria, cci,
  tarifa, fijo_tx, pos_solicitados, estado (PENDIENTE|APROBADO|RECHAZADO),
  motivo_rechazo, created_at

pos_devices
  id, world_id, merchant_id, event_id (nullable),
  modelo, estado, tipo_ingreso (gratis|alquiler|venta), assigned_at

liquidaciones
  id, world_id, mundoNombre, entidadLegal, fecha, cortes,
  tipoAcuerdo, revShare, volumen, comision, neto, txCount,
  modeloRecaudacion, frecuencia, montoMinimo, descuentoHardware,
  estado (PENDIENTE|PROCESADA|RETENIDO), voucherUrl, voucherNombre, observacion

products (compartida con Eventos/Menú)
  id, world_id, merchant_id, event_id (null=catálogo regular),
  name, price, category, stock, active, image_url, created_at
```

Reutilizadas sin cambio: `transactions` (con `merchant_id` real — antes no distinguía qué comercio cobró).

---

## 6. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **Admin RP** | `MundoDetail.jsx` → `ActoresMerchants`; `Gobierno.jsx` (cola de solicitudes) | Alta directa o vía cola de aprobación |
| **BackOffice Mundo** | `HardwarePOS.jsx`, `Liquidacion.jsx`, `HistorialVentasMundo` | Hardware, cortes, reportería cross-comercio |
| **BackOffice Comercio** | `MerchantDashboard`, `MiCatalogoPanel` (catálogo regular), `CobrarPanel` (identificado por código JOI) | Operación diaria del comercio |
| **App Operador** | Mismo `CobrarPanel` reusado dentro de `OperadorApp.jsx` | Venta QR desde el shell móvil |
| **App Usuario** | `Module.jsx` → `MarketplaceTemplate` | Directorio + compra |

---

## 7. Reglas de negocio críticas

1. Ningún comercio pasa de `"suspendido"` a `"inactivo"` — ese valor viola el check constraint real de `merchants.status`.
2. Un lote de liquidación bajo el monto mínimo se genera pero NUNCA se libera solo — queda `RETENIDO`.
3. Un lote con neto negativo no es procesable, sin importar el monto mínimo.
4. Procesar un lote es una acción de 2 pasos con confirmación explícita — no reversible desde la propia UI.
5. Eliminar un comercio exige pasar por deshabilitación + verificación de bloqueos (BNPL activo, ventas recientes, reservas futuras) antes del DELETE definitivo.
6. El carrito del Marketplace es de un solo comercio a la vez — cambiar de comercio exige vaciar el carrito primero.
7. Todo checkout revalida server-side lo que el cliente ya validó (horario, restricciones, stock) — nunca confía solo en el estado local.

---

## 8. Estado y versionado

Capacidad `comercios` — **v1.0.0**, `tier: CORE`, sin dependencias (fundacional). Construida y verificada en producción. El motor de liquidación real (frecuencia/retención/MDR) fue reforzado en el commit `b01d197` (Track A, ~09-sep) — cualquier doc anterior a esa fecha que describa el motor como "simulado" está desactualizado.

## 9. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` — entrada resumida de `comercios` en el catálogo de 22.
- `docs/arquitectura/mapeo_maestro/src/01_backbone.md` §6 — gaps históricos, algunos ya cerrados (ver nota en §2.4).
- `spec_eventos.md` — reutiliza `products`/`merchants`/`pos_devices` para su propio catálogo de precompra y hardware por evento.
