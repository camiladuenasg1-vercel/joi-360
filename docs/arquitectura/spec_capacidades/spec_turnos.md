# SPEC Funcional — Turnos

*Capacidad de un solo servicio (sin jerarquía de microservicios — ver `spec_eventos.md` para el formato de referencia completo). Construida y verificada en producción al 23-sep-2026.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `TurnosTemplate`, `supabaseClient.js`; `joi360-admin/src/OperadorApp.jsx` función `EntregarTurnosOperador`), `supabase-turnos-food-court.sql` — leído directamente el mismo día de este documento.

---

## 1. Propósito y alcance

Estado real de preparación de un pedido para comercios de food court / restaurantes: `recibido → preparando → listo → entregado`. **No es un motor de citas** — el nombre "Turnos" es una colisión de vocabulario ya documentada y a propósito no resuelta (decisión explícita de Camila de no renombrar todavía): existe un concepto TOTALMENTE distinto también llamado "turno" en el mismo proyecto — el turno de caja del POS (`pos_turnos` / `iniciarTurnoRemote`/`cerrarTurnoRemote`, abrir/cerrar caja de un operador) — y un tercero, `access_shifts`. Los 3 no tienen relación entre sí. Este documento cubre exclusivamente la capacidad de catálogo `turnos` (cola de cocina).

- **Tier:** OPCIONAL. **Versión:** v1.0.0 (26-ago). **Depende de:** `wallet, comercios` (`DEPENDENCY_MAP`) — a diferencia de lo que dice `mapeo_maestro/01_backbone.md` (desactualizado en este punto), sí depende de `comercios` además de `wallet`.
- **Template:** `TurnosTemplate` (`TEMPLATE_MAP.turnos`). **Sin `configFields`** — nada configurable, el flujo es fijo.
- **El cobro NO es parte de esta capacidad** — ya ocurre en `consumos`/`comercios` vía `comprarProductosLive` (la RPC atómica normal de checkout). Turnos solo trackea el estado de un pedido YA pagado.

## 2. Cómo se crea un pedido de Turnos (hallazgo importante de código)

**No hay ninguna pantalla explícita de "hacer un pedido de food court".** El registro se crea de forma automática y transparente dentro de la función genérica de compra:

```js
// supabaseClient.js — comprarProductosLive(): al final de cualquier compra exitosa
crearSeguimientoTurno(worldId, merchantId, userId, items, total).catch(() => {});
```

`crearSeguimientoTurno` primero verifica `fetchWorldConfigLive(worldId).activo("turnos")` — **si la capacidad no está activa en el mundo, no hace nada** (fire-and-forget, con `.catch()` silencioso — si falla, la compra en sí ya se cobró bien y no se revierte por esto).

**Implicación real, no documentada hasta ahora:** esto significa que Turnos NO está limitado a comercios "de food court" específicos — es a nivel de **Mundo completo**. Si un Mundo activa `turnos`, **CUALQUIER compra en CUALQUIER comercio del mundo** (vía `comprarProductosLive` — Marketplace, Menú, Precompra de evento, etc.) genera automáticamente un `turno_pedidos` con estado inicial `recibido`. No hay ningún filtro por categoría de comercio ("solo restaurantes") en el código — es responsabilidad del Mundo activar esta capacidad únicamente si de verdad todos sus comercios son de tipo food court, o aceptar que cualquier compra (ej. un producto de una tienda de merchandising) entrará también a la cola de cocina.

## 3. Flujo real

1. **Cliente compra** cualquier producto en cualquier comercio del mundo (Marketplace/Menú/Precompra) → si `turnos` está activo, se crea el registro `recibido` automáticamente, sin acción extra del usuario.
2. **App Usuario** (`TurnosTemplate`): lista "Pedidos en curso" (todo `estado !== "entregado"`) y "Entregados hoy" (últimos 5) — poll cada 8 segundos mientras la pantalla está abierta (sin push en tiempo real; el estado lo cambia el comercio desde su propio panel).
3. **App Operador** (`EntregarTurnosOperador`, dentro de `OperadorApp.jsx`, modo "Turnos · Cola de pedidos", gateado por `turnosOn = m.modulos.some(x => x.id==="turnos" && x.enabled)`): el operador del comercio ve su cola de pedidos activos y **avanza un estado a la vez** (`TURNO_SIGUIENTE`, sin saltos: recibido→preparando→listo→entregado) vía `avanzarEstadoPedidoTurnoRemote`. No hay forma de retroceder un estado ni de cancelar un pedido desde esta UI.

## 4. Modelo de datos

```sql
turno_pedidos (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null,
  merchant_id uuid not null,
  user_id     uuid not null,
  items       jsonb not null default '[]',   -- [{nombre, cantidad, precio}]
  monto       numeric not null default 0,
  estado      text not null default 'recibido' check (estado in ('recibido','preparando','listo','entregado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)
-- índices: (merchant_id, estado) y (user_id, world_id) · RLS demo_anon_all
```

## 5. Componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **App Usuario** | `TurnosTemplate` (`Module.jsx`) | Solo lectura del estado en vivo — sin ninguna acción del usuario más allá de comprar (en otra capacidad) |
| **App Operador** | `EntregarTurnosOperador` (`OperadorApp.jsx`) | Único punto de escritura — avanza el estado del pedido, un paso a la vez |
| **Admin RP / BackOffice Mundo** | Solo el `ModuleConfigDrawer` genérico (activación, sin `configFields` propios) | Sin panel de reportería/monitoreo de la cola a nivel Mundo |

## 6. Estado y versionado

`v1.0.0`, funcional end-to-end. **Gap real encontrado durante esta investigación, no documentado antes:** la ausencia de filtro por tipo de comercio en `crearSeguimientoTurno` — si se decide en el futuro limitar Turnos a comercios marcados explícitamente como "food court" (en vez de "todo el mundo"), es un cambio de lógica en esa función, no solo de UI. Hasta entonces, la regla real de producto es "todo o nada por mundo".
