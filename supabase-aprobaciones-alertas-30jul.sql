-- ============================================================================
-- JOI360 · Cola de aprobación cross-mundo + alertas reales al mundo (30-jul)
-- Contexto: Gobierno.jsx ya tenía la cola de aprobación (eventos + solicitudes
-- de comercio) pero no estaba en el menú, y rechazar no dejaba motivo ni
-- avisaba al mundo. Este script agrega ambas cosas.
-- Aplicado y verificado en producción (kobtxrhycaloyjkeyspv) el 30-jul-2026.
-- ============================================================================

alter table events add column if not exists motivo_rechazo text;
alter table merchant_requests add column if not exists motivo_rechazo text;

create table if not exists world_alerts (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  referencia_id text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);
alter table world_alerts enable row level security;
create policy demo_all_world_alerts on public.world_alerts for all to anon, authenticated using (true) with check (true);
