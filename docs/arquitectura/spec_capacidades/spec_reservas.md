# SPEC Funcional — Reservas

*Capacidad de un solo servicio (sin jerarquía de microservicios — a diferencia de Eventos/BNPL, ver `spec_eventos.md` para el formato de referencia completo). Construida y verificada en producción al 23-sep-2026.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `ReservasTemplate`, `supabaseClient.js`), `supabase-reservas.sql` — leído directamente el mismo día de este documento.

---

## 1. Propósito y alcance

Reserva real de un recurso del Mundo (comedor, gimnasio, laboratorio, cancha — cualquier espacio físico configurable por texto libre) para una fecha y hora específicas, con cancelación real. **No es** el motor de reservas grande que estuvo en el Backlog desde julio (ese quedó explícitamente declinado por decisión de la usuaria) — es una versión mínima viable construida el 26-ago junto con otras 3 capacidades planificadas (Turnos, Transporte, Estacionamiento).

- **Tier:** PREMIUM. **Versión:** v1.0.0 (26-ago). **Depende de:** `wallet` únicamente (`DEPENDENCY_MAP`).
- **Template:** `ReservasTemplate` (`TEMPLATE_MAP.reservas`).

## 2. Modelo de negocio y reglas críticas

1. **Recursos** son texto libre configurado por el Mundo (`configFields.recursos`, CSV — default `"Comedor,Gimnasio,Laboratorio"`), no una entidad con capacidad/aforo propia. No hay bloqueo de cupo: dos usuarios pueden reservar el mismo recurso/fecha/hora sin que el sistema lo impida.
2. **Ocupación es informativa, no un bloqueo.** `fetchOcupacionRecurso` cuenta cuántas reservas `confirmada` ya existen para ese recurso+fecha+hora exactos y se lo muestra al usuario ("Ya hay N reservas para este mismo horario") antes de confirmar — pero no lo bloquea. Esto es una decisión de alcance explícita del v1.0.0, no un bug.
3. **Sin cobro obligatorio.** `configFields.anticipoMin` (percent, def. 30) existe en el catálogo pero **no se aplica** — la UI muestra un banner honesto ("Este mundo pide un anticipo del N% — el cobro llega en una próxima versión") en vez de simular un cargo. Reservar hoy es gratis sin importar el config.
4. **Cancelación real, sin penalidad aplicada.** `configFields.ventanaCancelacion` (horas, def. 24) se MUESTRA como texto informativo ("Cancela sin costo hasta Nh antes") pero tampoco se aplica como regla dura — cualquier reserva `confirmada` se puede cancelar en cualquier momento vía `cancelarReservaRemote`.
5. Fechas siempre en **hora local** (helpers `hoyLocalISO`/`fmtFechaLocal` de `dates.js`) — nunca `toISOString()`, mismo criterio anti-bug que el resto del proyecto.

## 3. Flujo real

Usuario abre "Nueva Reserva" → elige un recurso (chips) → elige fecha (mínimo hoy) → elige hora → ve la ocupación informativa del slot elegido → confirma (`crearReservaRemote`, INSERT directo, sin RPC de pago de por medio) → la reserva aparece en "Próximas", ordenadas por fecha/hora ascendente. Reservas con `fecha < hoy` pasan a "Historial" (últimas 10). Cancelar mueve la fila a `estado="cancelada"` — no se borra, no vuelve a contar para la ocupación de nadie (el fetch de "mis reservas" y de "ocupación" filtran siempre por `estado=confirmada`).

## 4. Modelo de datos

```sql
reservas (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null,
  user_id     uuid not null,
  recurso     text not null,
  fecha       date not null,
  hora        text not null,
  estado      text not null default 'confirmada' check (estado in ('confirmada','cancelada')),
  created_at  timestamptz not null default now()
)
-- índices: (world_id, recurso, fecha) y (user_id, world_id) · RLS demo_anon_all
```

## 5. Componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **App Usuario** | `ReservasTemplate` (`Module.jsx`) | Único punto de creación, listado y cancelación — 100% self-service |
| **Admin RP / BackOffice Mundo** | Solo el `ModuleConfigDrawer` genérico (activación + `configFields.recursos/anticipoMin/ventanaCancelacion`) | **No existe ningún panel de administración de reservas** — ni un calendario de ocupación del mundo, ni una vista de "quién reservó qué". Esto es un gap real, no verificado como pendiente en ningún tracker — el mundo no tiene forma de ver sus propias reservas fuera de Supabase directo. |

## 6. Estado y versionado

`v1.0.0`, funcional end-to-end, verificado con datos reales. **Gaps conocidos, no simulados:** (a) sin cobro de anticipo aplicado, (b) sin bloqueo de cupo/aforo por recurso, (c) sin panel admin de monitoreo de reservas del mundo. Los 3 son candidatos naturales para una v1.1 si el caso de negocio lo justifica — ninguno bloquea el uso real de la v1.0.0 tal como está.
