# JOI360 — POS/Operador web front + Registro de esquema backend

## PART 1 — POS/Operador web front

`OperadorApp.jsx`/`WorldOperadorApp.jsx` no son deploys separados: son rutas mobile-first dentro de `joi360-admin` (`/operador/:comercioId`, `/operador-mundo/:worldId`) que reusan la sesión de merchant/mundo y el mismo backend. `PosEntryGate` (`/pos`) es la puerta genérica.

### PosEntryGate — **Construido completo**
Resuelve si un código corto es de comercio o de mundo y redirige. PIN nunca se compara en el cliente — RPC `verificar_pin_operador`. Mensaje de error unificado ("Código o PIN incorrecto") por diseño anti-enumeración. `OperadorApp.jsx:31-86`.

### MerchantGate — **Construido completo**
Login de comercio: PIN rápido (RPC) o usuario/contraseña legacy en paralelo. `Fronts.jsx:3502-3564`.

### OperadorShell — Cobrar / Recargar / QR (`CobrarPanel`) — **Construido completo (cobrar/recargar/QR); cierre de turno parcial**
1. Cobrar/Recargar: identificar cliente (código/QR/NFC) → ver saldo → producto o monto libre → confirmar → resultado.
2. Cobrar con QR: `crearChargeRequestRemote` genera QR apuntando a `joi360-app/#/pagar/:id`, polling cada 2s hasta pago/expiración (10 min)/cancelación.
Turno de caja se abre automáticamente al entrar — **no hay botón de cierre en este panel** (gap real, sí existe en Accesos). Nonce anti-colisión en `reference` (hallado en vivo). Motivos de rechazo diferenciados (`saldo_insuficiente`/`restriccion_horario`/`restriccion_limite_diario`). `Fronts.jsx:748-1084`.

### Solicitud BNPL (Punto de Venta) — **Construido completo**
Identificar cliente → elegir producto financiable → elegir cuotas (filtradas contra el techo del mundo) → aprobación automática o pendiente. Nota: el cálculo de cronograma/intereses vive **duplicado** en cliente (mismo patrón que `SolicitudBNPLOperador` de `Fronts.jsx`), sin función server-side única de origen de verdad. `OperadorApp.jsx:234-417`.

### Confirmar Reserva — **Solo UI (placeholder)**
Pantalla "Próximamente" explícita — el micro-reserva de Menú sí es real, este motor grande de Reservas no existe. `OperadorApp.jsx:221-231`.

### Control de Accesos — **Construido completo**
Turno por zona (dos porterías pueden operar simultáneo), identificar → tipo (entrada/salida) → registrar → lista de últimos registros. Botón "Cerrar turno" explícito. `OperadorApp.jsx:421-544`.

### Vincular Pulsera NFC (bandita) — **Construido completo**
Identificar por código JOI/QR o DNI (con selector si hay familia) → pantalla dedicada de lectura → `vincular()` con 4 safety guards antes de escribir: banda no encontrada / ya vinculada (distingue mismo usuario vs. otro) / estado ≠ "asignada" / usuario ya tiene otra banda activa en este mundo. `OperadorApp.jsx:558-742`.

### Consultar Ficha — **Construido completo**
Mesa de ayuda: alergias/sangre/clínica/contacto, por código o DNI (familia completa). Cada campo médico solo se renderiza si tiene valor. `OperadorApp.jsx:758-909`.

### Entregar Menú — **Construido completo**
Cierra el círculo físico de Menú (el cobro ya ocurrió en la app) — lista "Por entregar hoy" → marcar entregado. No valida turno de caja ("acá no se mueve dinero"). `OperadorApp.jsx:917-1029`.

### WorldOperadorApp — WorldGate + WorldOperadorShell — **Construido completo**
Operador "Soy Mundo" (portero/entrega de banditas/mesa de ayuda) — **no cobra saldo**. Login con `worlds.pos_pin`. 3 modos, todos reutilizados tal cual de `OperadorApp.jsx` (`comercio={null}`): Vincular Pulsera, Validar Acceso, Consultar Ficha. `WorldOperadorApp.jsx:1-151`.

**Corrección a una premisa común**: el "cash-in de evento" (bandita con saldo pre-cargado para invitados sin cuenta) **no vive acá** — vive en el portal Organizador (`TabBanditasEventoOrganizador`, `OrganizadorFront.jsx:1098-1202`), sobre `event_guest_lists`/`event_guests`.

### joi360-operador (Android/Kotlin nativo) — resumen breve
Proyecto separado. Pantallas nativas: `InicioScreen` (menú derivado dinámicamente de un `RenderConfig` que el backend arma según capacidades reales del mundo — **no hardcodeado**, a diferencia del array `MODOS` fijo del front web), apertura de turno/caja física, cobro por lector NFC real y por QR, bandita, identificación, operaciones. Usa hardware real (`NfcReader.kt`, `QrScanner.kt`) que el front web solo simula con inputs de texto. Apunta al mismo backend `joi-pos-backend` que usa `OperadorApp.jsx`. Mirroriza el operador web en espíritu (cobrar, QR, bandita, accesos, consulta) pero con hardware real y una capa de configuración dinámica que el front web no tiene.

---

## PART 2 — Registro de esquema backend (consolidado admin + app)

### Patrón de RLS dominante
Casi todas las tablas de negocio siguen el mismo patrón permisivo de demo:
```sql
alter table public.<tabla> enable row level security;
create policy "demo_anon_all" on public.<tabla> for all to anon, authenticated using (true) with check (true);
```
**Cualquiera con la anon key pública puede leer y escribir cualquier fila de cualquier mundo/comercio** — no hay aislamiento multi-tenant a nivel de base de datos, todo el aislamiento es lógico (filtros `world_id=eq.` en el cliente). Excepciones reales de seguridad server-side: `wallets.balance` con `REVOKE UPDATE` + 2 RPCs; PIN/password hasheados verificados solo vía RPC `security definer`. `wallets`/`transactions` corren con **RLS deshabilitado por completo** (no por policy — nunca se habilitó).

### 1. Wallet / Transacciones — núcleo transversal

| Tabla | Capacidad(es) | Columnas clave | FK / soft-link | RLS |
|---|---|---|---|---|
| `wallets` | Wallet (transversal) | `id`,`user_id`,`world_id`,`balance`,`status` | `(user_id,world_id)` unique; sin FK real a usuarios | **RLS deshabilitado**; `balance` con `REVOKE UPDATE` |
| `transactions` | Wallet, Comercio, BNPL, Eventos, Promociones | `id`,`wallet_id`,`world_id`,`merchant_id`,`channel_id`,`amount`,`type`,`status`,`reference`,`turno_id` | `merchant_id` soft-link | Sin RLS rastreado (abierto) |
| `pos_turnos` | Turnos | `id`,`world_id`,`merchant_id`,`estado`,`device_serial`,`abierto_at` | `merchant_id` soft-link | No hay `CREATE TABLE` versionado en repo |
| `charge_requests` | Wallet, Comercio (QR) | `id`,`world_id`,`merchant_id`,`monto`,`referencia`,`turno_id`,`estado`,`pagador_user_id`,`paid_at` | `merchant_id` sin FK | `demo_anon_all` |

### 2. Comercio / Catálogo

| Tabla | Capacidad(es) | Columnas clave | FK / soft-link | RLS |
|---|---|---|---|---|
| `merchants` | Comercio (transversal) | `id`,`world_id`,`name`,`status`,`mdr_override`,`fixed_fee_override`,`codigo`,`pos_pin_hash`,`photo_url`,+ bloque legal | `world_id` lógica | `demo_anon_all` |
| `products` | Comercio, Menú (vía `event_id`) | `id`,`world_id`,`merchant_id`,`name`,`price`,`category`,`stock`,`active`,`image_url`,`event_id` | `world_id` **FK real**; `event_id` **FK real**; `merchant_id` soft-link | `demo_anon_all` (agregada tarde por bug real de INSERT bloqueado) |
| `merchant_requests` | Comercio (alta con aprobación) | `id`,`world_id`,`nombre`,`ruc`,bloque legal,`tarifa`,`fijo_tx`,`pos_solicitados`,`estado`,`motivo_rechazo` | Ninguna FK | `demo_anon_all` |
| `pos_devices` | Comercio, Motor de evento | `id`,`model`,`serial`(unique),`status`,`world_id`,`merchant_id`,`event_id`,`tipo_ingreso` | `world_id` FK real (`on delete set null`); resto soft-link | Sin RLS explícito |
| `hardware_modelos_custom` | Comercio | `id`,`marca`,`modelo`,`tipo`,`nfc`,`precio`,`activo` | Ninguna | `demo_anon_all` |
| `hardware_requests` | Comercio | `id`,`world_id`,`modelo_id`,`cantidad`,`motivo`,`estado` | soft-link | No rastreado |

### 3. Plataforma / Configuración de Mundo

| Tabla | Capacidad(es) | Columnas clave | FK / soft-link | RLS |
|---|---|---|---|---|
| `worlds` | Todas (raíz del tenant) | `id`,`code`,`name`,`vertical`,`status`,`color_primary`,`currency`,`pos_pin_hash`,`grupo_id`,`comparte_saldo_grupo`,`acuerdo`(jsonb),`logo_url` | `grupo_id` **FK real** a `grupos(id)` | `demo_anon_all` |
| `grupos` | Grupos/Sucursales | `id`(`grupo-xxxxxx`),`nombre`,`logo_url`,`emisor`,`adquirente`(check),`tipo_wallet`(check) | Padre de `worlds.grupo_id` | `demo_all_grupos` |
| `capacities` | Todas (catálogo global) | `id`,`name`,`icon`,`category`(check),`tier` | Ninguna | `demo_all_capacities` |
| `capacity_feature_flags` | Todas | `id`,`capacity_id`,`flag_code`,`name`,`default_value`,`affects`,`ux_component` | `capacity_id` soft-link | `demo_anon_all` |
| `world_capacity_configs` | Todas | `world_id`,`capacity_id`,`enabled`,`config`(jsonb) | unique `(world_id,capacity_id)` | `demo_anon_all` |
| `world_feature_flags` | Todas | `world_id`,`flag_id`,`enabled` | unique `(world_id,flag_id)` | `demo_anon_all` |
| `world_channel_configs` | Emisión/Recargas | `world_id`,`channel_id`,config | unique | `demo_anon_all` |
| `world_acquiring_channel_configs` | Adquirencia | `world_id`,`channel_id`,`channel_enabled` | unique | `demo_all_world_acq_channels` |
| `emission_channels` | Emisión | `id`,`name`,`channel_type`,`global_active` | catálogo global | No visto explícito |
| `acquiring_channels` | Adquirencia | `id`,`name`,`mdr`,`fijo_tx`,`networks`(jsonb),`global_active` | catálogo global | `demo_all_acquiring_channels` |
| `world_alerts` | Todas | `world_id`,`tipo`,`titulo`,`mensaje`,`referencia_id`,`leida` | Ninguna | `demo_all_world_alerts` |
| `admin_users` | Acceso | `id`,`email`(unique),`password_hash`,`name` | Ninguna | `demo_anon_all` |
| `error_catalog`/`error_log` | Todas (mensajería de error) | `code`(PK)+meta / `id`,`code`,`contexto`,`world_id`,`origen` | Ninguna FK real | `demo_anon_all` |

### 4. Usuarios / Perfil / Dependientes

| Tabla | Capacidad(es) | Columnas clave | FK / soft-link | RLS |
|---|---|---|---|---|
| `app_profiles` | Perfil extendido, Wallet | `id`(=`auth.users.id`),`nombres`,`apellidos`,`doc_tipo`,`doc_mask`,`email_mask`,`codigo`(único, trigger) | Sin FK declarada | `demo_all_app_profiles` |
| `user_profiles` | Perfil extendido (ficha médica) | `world_id`,`user_id`,`tipo_sangre`,`alergias`,`clinica`,`contacto_emergencia_*` | `world_id` FK real; unique `(world_id,user_id)` | `demo_anon_all` |
| `dependents` | Perfil extendido, Wallet | `id`,`world_id`,`guardian_user_id`,`dependent_user_id`(unique),`nombre`,`alias`,`alergias`,`dni` | `world_id` FK real; resto soft-link ("synthetic user id") | `demo_anon_all` |
| `dependent_restrictions` | Restricciones | `world_id`,`dependent_user_id`,`guardian_user_id`,`horario_inicio/fin`,`limite_diario`,`productos_bloqueados`(jsonb) | unique `(world_id,dependent_user_id)`; **única tabla de config con enforcement server-side real dentro de `mover_saldo_wallet`** | `demo_anon_all` |
| `user_notifications` | Todas | `world_id`,`user_id`,`sujeto_id`,`tipo`,`titulo`,`mensaje`,`referencia_id`,`leida` | Ninguna | `demo_all_user_notifications` |

### 5. NFC / Bandita

| Tabla | Capacidad(es) | Columnas clave | FK / soft-link | RLS |
|---|---|---|---|---|
| `nfc_bands` | Wallet, Acceso | `id`,`codigo`(unique),`lote`,`world_id`,`estado`(`disponible`/`asignada`/`bloqueada`/`activa`),`linked_user_id`,`vence_at`,`activada_at`,`asignacion_id`,`precio_unitario` | `asignacion_id` soft-link | `demo_all_nfc_bands` |
| `nfc_requests` | Wallet | `id`,`world_id`,`user_id`,`status`,`universal`,`motivo` | `world_id` FK real | Sin RLS explícito rastreado |
| `nfc_band_requests` | Wallet (lote, por mundo) | `id`,`world_id`,`cantidad`,`estado`,`resolved_at` | soft-link | No rastreado |
| `nfc_asignaciones` | Wallet (comercial) | `world_id`,`lote`,`cantidad`,`modelo`,`precio_unitario`,`monto_total`,`forma_cobro`,`estado_pago`,`comprobante_url` | Ninguna FK | `demo_anon_all` |

### 6. Accesos

| Tabla | Capacidad(es) | Columnas clave | FK | RLS |
|---|---|---|---|---|
| `access_log` | Acceso | `world_id`,`user_id`,`tipo`,`zona`(nullable) | `world_id` FK real | `demo_anon_all` |
| `access_shifts` | Turnos, Acceso | `world_id`,`zona`,`operador_nombre`,`inicio_at`,`fin_at` | Ninguna | `demo_anon_all` |

### 7. BNPL

| Tabla | Capacidad(es) | Columnas clave | FK | RLS |
|---|---|---|---|---|
| `bnpl_programa_comercio` | BNPL | `world_id`,`merchant_id`,`cuotas_activas[]`,`comision_pct`,`revenue_share_pct`,`productos_financiables`(jsonb),`gestion_mora`,`alcance`,`categorias`,`cuota_inicial`,`mora_pct`,`frecuencia`,`dias_gracia` | `world_id` FK real; unique `(world_id,merchant_id)` | `demo_anon_all` |
| `bnpl_contratos` | BNPL | `world_id`,`merchant_id`,`user_id`,`producto`,`monto`,`cuotas`,`dias_gracia`,`interes_pct`,`cronograma`(jsonb),`estado`,`gestion_mora`,`rechazo_motivo` | `world_id` FK real; resto soft-link | `demo_anon_all` |
| `bnpl_notificaciones` | BNPL | `world_id`,`merchant_id`,`contrato_id`,`tipo`,`mensaje`,`leida` | `world_id`,`contrato_id` FK real | `demo_anon_all` |
| `bnpl_campanas` | BNPL | `world_id`,`merchant_id`,`nombre`,`fecha_inicio/fin`,`productos`(jsonb) | Ninguna FK | `demo_anon_all` |

### 8. Motor de Eventos / Ticketing

| Tabla | Capacidad(es) | Columnas clave | FK | RLS |
|---|---|---|---|---|
| `events` | Motor de evento | `id`,`world_id`,`titulo`,`tipo`,`aforo_total`,`aforo_tipo`,`privado`,`estado`,`ux_components`(jsonb),`imagen_url`,`motivo_rechazo`,`creado_por_user_id` | `world_id` FK real | `demo_anon_all` |
| `event_ticket_types` | Motor de evento, Precompra | `event_id`,`nombre`,`precio`,`cupos`,`min/max_por_compra`,`validacion`,`permite_reingreso`,`vigencia_hasta`,`preventa`/`precompra`/`prereserva` | `event_id` FK real (cascade) | Heredada de `events` |
| `event_tickets` | Motor de evento | `event_id`,`ticket_type_id`,`world_id`,`user_id`,`qr_code`,`estado`,`checkin_at`,`checkout_at`,`transfer_token`(unique) | `event_id`,`ticket_type_id` FK real (cascade) | `demo_anon_all` |
| `event_merchants` | Motor de evento, Comercio, **Precompra** | `event_id`,`merchant_id`,`merchant_nombre`,`ubicacion`,`logo_url`,`es_ad_hoc` | `event_id` FK real; `merchant_id` **sin FK a propósito** (permite comercios ad-hoc solo-de-evento) | `demo_anon_all` |
| `products` (con `event_id`) | **Precompra** (productos con stock, scoped a un evento) | ver tabla `products` arriba | `event_id` FK real | `demo_anon_all` |
| `event_agenda_items` | Motor de evento | `event_id`,`hora`,`titulo`,`orden`,`lugar`,`expositor`,`imagen_url` | `event_id` sin FK declarada | `demo_anon_all` |
| `event_checkin_log` | Motor de evento | `event_id`,`ticket_id`,`tipo`(`ingreso`/`salida`) | Ninguna FK (permite reingreso) | `demo_anon_all` |
| `event_guest_lists` | Motor de evento, Wallet (cash-in) | `event_id`,`world_id`,`nombre_archivo`,`importado_por` | Ninguna FK | `demo_anon_all` |
| `event_guests` | Motor de evento, Wallet | `guest_list_id`,`event_id`,`world_id`,`nombre`,`documento`,`guest_user_id`,`user_id_real`,`bandita_codigo`,`saldo_inicial`,`estado`,`vence_at` | `guest_list_id` FK real (cascade); `guest_user_id` wallet sintética | `demo_anon_all` |

### 9. Menú

| Tabla | Capacidad(es) | Columnas clave | FK | RLS |
|---|---|---|---|---|
| `menu_items` | Menú | `world_id`,`merchant_id`,`nombre`,`precio`,`categoria`,`alergenos`(jsonb),`imagen_url`,`activo` | Ninguna FK declarada | `demo_anon_all` |
| `menu_programacion` | Menú | `world_id`,`merchant_id`,`menu_item_id`,`dia_semana`(check),`cupos_max`,`activo` | `menu_item_id` FK real (cascade) | `demo_anon_all` |
| `menu_reservas` | Menú | `world_id`,`merchant_id`,`beneficiario_user_id`,`beneficiario_nombre`,`fecha`,`items`(jsonb),`monto`,`estado` | Ninguna FK declarada | `demo_anon_all` |
| `menu_membresias` | Menú | `world_id`,`guardian_user_id`,`beneficiario_user_id`,`beneficiario_nombre`,`activo` | Sin FK (mismo patrón "synthetic user id" que `dependents`) | `demo_anon_all` |
| `consumo_alertas` | Menú, Restricciones | `world_id`,`guardian_user_id`,`dependent_user_id`,`tipo`,`mensaje`,`leida` | Ninguna | `demo_anon_all` |

### 10. Promociones / Liquidación / Suscripciones / Soporte / Organizador

| Tabla | Capacidad(es) | Columnas clave | FK | RLS |
|---|---|---|---|---|
| `promociones` | Promociones | `world_id`,`merchant_nombre`,`titulo`,`tipo`,`valor`,`vigencia_hasta`,`usos_max/actuales`,`codigo_qr`(unique),`estado` | Ninguna FK | `demo_anon_all` |
| `promociones_canjes` | Promociones | `promocion_id`,`world_id`,`user_id`,`canjeado_at` | `promocion_id` FK real (cascade) | `demo_anon_all` |
| `liquidaciones` | Facturación (liquidación) | `world_id`,`fecha`,`volumen`,`tx_count`,`tipo_acuerdo`,`rev_share`,`comision`,`neto`,`estado`,`descuento_hardware` | unique `(world_id,fecha)` | `demo_anon_all` |
| `subscription_plans` | **Suscripciones** | `world_id`,`nombre`,`precio`,`periodo`(`mensual`/`anual`),`descuento_pct`,`activo` | Ninguna | `demo_anon_all` |
| `support_tickets` | Todas (transversal) | payload libre | Ninguna | Patrón consistente asumido |
| `organizadores` | Motor de evento (actor B2B) | `world_id`,`nombre`,`entidad_legal`,`ruc`,`usuario`,`password`(⚠️ **texto plano**),`estado` | Ninguna | No confirmado explícito |

**Nota de seguridad puntual**: `organizadores.password` se inserta en **texto plano** vía la anon key — a diferencia de `admin_users` y `merchants`/`worlds` (PIN), que sí pasan por trigger `crypt()`/`gen_salt('bf')`. Inconsistente con el patrón de hasheo ya establecido en el resto del proyecto.

---

### RPC / Funciones Postgres

| Función | Qué hace | Tablas que toca atómicamente | Uso |
|---|---|---|---|
| `mover_saldo_wallet(p_wallet_id, p_delta, p_tipo, p_world_id, p_merchant_id, p_channel_id, p_reference, p_turno_id)` | Mueve saldo de UNA wallet (cobro/recarga/consumo) con lock de fila, valida saldo suficiente, inserta la transacción — único camino real para escribir `wallets.balance` | `wallets`(lock+update), `transactions`(insert) | admin + app, todos los cobros/recargas |
| `transferir_p2p_wallet(p_origen_wallet_id, p_destino_wallet_id, p_monto, p_world_id, p_reference)` | Transferencia P2P entre 2 wallets, lock ordenado por id, valida saldo, inserta 2 transacciones | `wallets`(2 filas), `transactions`(2 inserts) | app (self-service P2P) |
| `verificar_pin_operador(p_codigo, p_pin)` | Compara PIN contra hash server-side de `merchants`/`worlds`; nunca devuelve el PIN | Solo lectura | admin (PosEntryGate, MerchantGate, WorldGate) |
| `verificar_admin_login(p_email, p_password)` | Compara password contra `admin_users.password_hash` server-side | Solo lectura | admin |
| `verificar_login_sponsor` | Referenciada en `supabase.js:586` **sin definición SQL versionada en el repo** — creada directo en el editor SQL de Supabase | Desconocido | admin (login Panel de Mundo) |

### Hallazgo de dependencia crítico entre migraciones — `mover_saldo_wallet`

Esta función fue reemplazada 3 veces con `CREATE OR REPLACE FUNCTION` (cada reemplazo sustituye el cuerpo COMPLETO anterior):
1. **`fix-114-rpc-wallet-balance.sql`** — versión base: lock + validación de saldo, sin control de identidad.
2. **`fix-121-rpc-dueno-wallet.sql`** — agrega verificación de dueño: exige `p_turno_id` válido (camino operador) **o** `auth.uid()` = dueño de la wallet/apoderado (camino self-service). Devuelve `NO_AUTENTICADO`/`NO_AUTORIZADO`/`TURNO_INVALIDO`.
3. **`fix-181-restricciones-servidor-pos.sql`** (la vigente hoy) — agrega el chequeo de `dependent_restrictions`, pero su `CREATE OR REPLACE` **reescribe la función completa sin la lógica de `auth.uid()`/`pos_turnos` de la versión #2**.

**⚠️ Hallazgo de seguridad, severidad alta**: la versión actualmente activa de `mover_saldo_wallet` **no valida quién puede mover cada wallet** — el candado que la Task #121 documentaba haber cerrado ("cualquiera puede llamar esta función con el `p_wallet_id` de otra persona") quedó reabierto al reemplazar la función completa en la Task #181 en vez de extenderla. Sí conserva la validación de saldo/lock y ahora también la de restricciones por dependiente. El orden de aplicación de `fix-*.sql` importa y no hay test de regresión que detecte la pérdida de esas ramas de rechazo — recomendado para la próxima tanda de trabajo.
