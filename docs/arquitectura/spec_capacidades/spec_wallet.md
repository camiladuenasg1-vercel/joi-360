# SPEC Funcional — Wallet

*Especificación funcional, no un registro de iteraciones. Verificada contra el código real de `WalletTemplate` (`joi360-app/src/pages/Module.jsx:101-720`) y el admin (`joi360-admin/src/store.js`, `Fronts.jsx`, `supabase.js`) el 23-sep-2026. Formato de referencia: `spec_eventos.md`.*

---

## 1. Propósito y alcance

Wallet es la capacidad **CORE** de `MODULE_CATALOG` — núcleo de identidad digital del ecosistema. Todo lo demás del catálogo (Comercios, Menú, Eventos, BNPL, Control...) asume que existe una wallet real detrás de cada usuario, titular o dependiente. Es prerequisito implícito de casi todo el resto (no tiene dependencias propias en `DEPENDENCY_MAP`, pero casi todas las demás capacidades dependen de ella).

`v1.1.0` — el salto de versión más reciente del catálogo entero (09-sep-2026: límite de CANTIDAD de transferencias P2P por día, no solo de monto).

---

## 2. Modelo de negocio

Dos decisiones base, tomadas por microservicio, que determinan cómo se comporta todo lo demás:

### 2.1 Modelo de perfil (`microservicio modelo_perfil`)
`consumo` (con saldo, default) vs. `identificacion` (solo identifica al usuario, sin saldo ni montos en ningún lugar de la app — bifurcación real de UI, no un texto que cambia: en modo identificación, Home muestra "Mi identidad" en vez de "Saldo disponible", y `cfg.has("balance")` es `false`). Esta es la decisión que determina TODO lo demás de Wallet.

### 2.2 Identidad para transferencias — 3 formas del mismo `user_id`
1. **UUID interno** (`getSyntheticUserId()`) — la identidad real de la que cuelgan `wallets`/`transactions`/todo.
2. **Código JOI corto** (`app_profiles.codigo`) — lo que un humano de verdad comparte/tipea (ej. `CAMIL385`); se resuelve al UUID antes de cualquier operación. Si aún no se generó, cae al UUID como fallback — nunca deja al usuario sin nada que compartir.
3. **DNI** — segunda vía de búsqueda para P2P (`buscarPorDniRemote`), alternativa al código JOI.

---

## 3. Componentes (microservicios)

### 3.1 Saldo y Balance
**Gate:** `cfg.has("balance")`. Muestra saldo real (`useWalletLive`), botón ocultar/mostrar, cashback disponible si `cashback > 0` (suma del total o desglosado por comercio según la `modalidad` de la capacidad `cashback` — `flat` muestra un total único, `por_comercio` lista cada comercio con lo ganado ahí). Tope de recarga (`configFields.maxPorRecarga`) se muestra como dato informativo bajo el saldo.

### 3.2 Recarga
**Gate:** `cfg.has("recarga")`. Navega a `/pay?tab=recargar` (documentado en `kiro_steering/home-render-config.md` §3) — canales reales de Emisión (catálogo global + activación por mundo), límites `maxPorRecarga`/`maxRecargasDiarias` validados antes del checkout.

### 3.3 Transferencia P2P
**Gate:** `cfg.config.p2pEnabled && cfg.has("p2p")`. Flujo completo real:
1. Buscar destino por **código JOI** o **DNI** (`buscarPorCodigoJoiRemote`/`buscarPorDniRemote`) — resuelve a `{userId, nombre}` real antes de mostrar a quién se transfiere (antes un bug real: el input se mandaba tal cual como `user_id` destino, funcionaba solo porque el código ERA el UUID).
2. Rechaza transferirse a sí mismo.
3. **3 límites independientes, todos opcionales, del microservicio `transferencia`:** `maxPorTx` (monto máximo por transacción), `maxPorDia` (monto acumulado del día, vía `fetchP2PEnviadoHoy`), `maxTransferenciasPorDia` (**cantidad** de transferencias del día, v1.1.0 09-sep — el más nuevo). Los 3 se validan client-side antes de intentar, y el backend (`transferirP2PRemote`) puede rechazar igual por saldo.
4. Checkbox obligatorio de confirmación ("no se puede revertir") antes de habilitar el botón de envío.
5. Tras enviar, botón directo "¿Algo salió mal? Contactar soporte" (crea un `support_ticket` real con el contexto de la transferencia).

### 3.4 Sub-wallets / Familia
**Gate:** flag `subwallet` — no tiene template propio en Wallet; conecta con la capacidad `control` (ver `spec_control.md`). Wallet solo expone el botón "Agregar familiar para pedirle su bandita" cuando ya se muestra la sección de banditas, que navega a `/module/control?agregar=1`.

### 3.5 Bandita NFC — el componente más elaborado de Wallet
**Gate:** `cfg.has("bandita") && cfg.config?.usaPulseraNfc !== false` (**doble gate obligatorio**, mismo criterio replicado en `/pay` — ver `home-render-config.md`).

Una fila **por beneficiario** (titular + cada dependiente real, no solo el titular — un padre puede pedir la pulsera de un hijo sin que reemplace la suya). Por beneficiario:
- **Estados reales** (`nfc_requests.status`): sin solicitud → `pendiente` → `entregada` | `rechazada`. Con vigencia real cuando está entregada (`vence_at` de la banda) — 3 sub-estados visuales: vigente / por vencer (≤30 días, ámbar) / vencida (rojo).
- **Solicitar** (flujo legado, admin-mediado): crea `nfc_requests`, un operador del mundo la entrega físicamente.
- **Vincular directo por Web NFC** (Task #230, self-service): si `"NDEFReader" in window` (Chrome/Android sobre HTTPS — **no existe en iOS/desktop**, el botón ni se muestra ahí, cae automáticamente al flujo legado), el usuario tapea la pulsera con su propio celular y queda vinculada al instante (`vincularBanditaDirectoRemote`), sin esperar a un operador.
- **Bandita universal** (Task #168, solo para el titular): checkbox "usarla en todos los mundos a los que pertenezco" — el backend (`bands-link`) discrimina la wallet correcta según el mundo del lector físico que la lee.
- **Reportar pérdida/robo**: la pulsera vinculada se **bloquea** (no queda disponible para que cualquiera la reactive) y abre una solicitud de reposición nueva — mismo camino que una solicitud normal pero con `motivo="perdida_robo"`, resuelta por el operador del mundo re-vinculando una unidad nueva.

**Admin (RedPontis/Mundo):** `SolicitudesNfcWidget` (entregar/rechazar pedidos), `SolicitarLoteNfcWidget` (carga masiva de inventario de banditas físicas por lote/CSV), `FamiliaresMundoWidget` (ver familiares vinculados en el panel del Mundo).

### 3.6 Notificaciones
**Gate:** flag `notifs`. Push en cada movimiento de saldo — mencionado en el catálogo, sin componente propio verificado en esta pasada (no confundir con la campana decorativa de Home, que es un centro de notificaciones distinto y sin backend real).

### 3.7 QR fijo
**Gate:** flag `qr_fijo` — código QR de pago del usuario, generado apenas Wallet se activa. En la práctica siempre activo (el toggle solo lo confirma explícitamente). Es el mismo "Mi código" que aparece en Home, Wallet y Perfil — un solo identificador (`getSyntheticUserId()`/código JOI corto), reusado, nunca 3 QRs distintos.

---

## 4. Modelo de datos

```
wallets
  id, user_id, world_id, balance, cashback_balance, ...

transactions
  id, wallet_id/user_id, world_id, amount, type, reference,
  merchant_id, channel_id, created_at

nfc_bands
  id, codigo (unique), lote, world_id, estado (disponible|asignada|bloqueada),
  linked_user_id, created_at
  -- columnas de vigencia/activación (vence_at, etc.) confirmadas en uso
  -- desde el código de eventos (activarBanditaEventoRemote) pero no
  -- re-verificadas contra un ALTER TABLE específico en esta pasada.

nfc_requests
  id, world_id, user_id, status (pendiente|entregada|rechazada),
  created_at
  -- motivo ('perdida_robo'), universal, vence_at: confirmados en uso desde
  -- Module.jsx/supabase.js, no re-verificados contra su ALTER TABLE exacto.
```

Config del mundo: `monedaPermitida, maxRecargasDiarias, maxPorRecarga, p2pEnabled, usaPulseraNfc, vigenciaBanditasMeses` (`configFields`) + `microservicios.transferencia.{maxPorTx,maxPorDia,maxTransferenciasPorDia}`.

---

## 5. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| Admin RP / Catálogo Global | `Catalogo.jsx` (feature flags, dev status) | Define qué flags de Wallet existen y su estado |
| BackOffice Mundo | `SolicitudesNfcWidget`, `SolicitarLoteNfcWidget`, `FamiliaresMundoWidget` (`Fronts.jsx`) | Entrega/rechazo de pulseras, inventario, vista de familiares |
| BackOffice Comercio / POS | Recarga presencial (efectivo/tarjeta física), identificación por bandita/código en el cobro | Ver `spec_comercios.md` |
| App Usuario | `WalletTemplate` + `VincularBanditaWebNfcModal` (`Module.jsx`) | Saldo, recarga (delega a Pay), P2P, banditas por beneficiario |
| Home | Balance hero, tile Recargar, tile Bandita NFC | Ver `kiro_steering/home-render-config.md` §2 |

---

## 6. Reglas de negocio críticas

1. Modo identificación (`modelo_perfil=identificacion`) apaga saldo/montos en TODA la app, no solo en Wallet — es una bifurcación completa, no un caso raro.
2. P2P valida 3 límites independientes (monto/tx, monto/día, cantidad/día) antes de intentar — cualquiera puede estar activo sin los otros.
3. El código corto JOI es una conveniencia de UX sobre el UUID real — nunca reemplaza al UUID como identidad de `wallets`/`transactions`.
4. La tile/tab de Bandita NFC exige el flag Y el config `usaPulseraNfc` simultáneamente, en los 3 lugares donde aparece (Home, Wallet, Pay) — una sola regla, no 3 implementaciones que puedan divergir.
5. Web NFC directo es feature-detect puro — nunca se ofrece en un navegador que no lo soporta; el flujo legado (solicitar + entrega física) siempre es el fallback universal.
6. Reportar pérdida/robo bloquea la banda vieja (no permite que un tercero la siga usando) antes de abrir la reposición.
7. Ninguna transferencia P2P se completa sin el checkbox explícito de "no se puede revertir".

---

## 7. Estado y versionado

`wallet` — **v1.1.0**, `tier: CORE`, sin dependencias declaradas (es la base de casi todo). Todos los componentes de §3 están construidos y en producción. Gap conocido: notificaciones push (flag `notifs`) no tiene componente propio verificado en esta pasada — posible brecha entre catálogo y código, a confirmar en un corte futuro.

## 8. Referencias

- `docs/arquitectura/kiro_steering/capacidades.md` / `home-render-config.md`.
- `docs/arquitectura/spec_capacidades/spec_control.md` — sub-wallets/dependientes.
- `docs/arquitectura/spec_capacidades/spec_comercios.md` — recarga/identificación en POS.
