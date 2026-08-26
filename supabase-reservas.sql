-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Reservas v1.0.0 (26-ago) — reserva real de un recurso del mundo
-- (comedor, gym, laboratorio, cancha, etc.) por fecha y hora. Sin cobro
-- obligatorio en esta version (anticipoMin queda como config para una v1.1
-- que sí cobre) -- v1.0.0 es la reserva en sí, real y persistida, con
-- cancelación real. Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.reservas (
  id         uuid primary key default gen_random_uuid(),
  world_id   text not null,
  user_id    uuid not null,
  recurso    text not null,
  fecha      date not null,
  hora       text not null,
  estado     text not null default 'confirmada' check (estado in ('confirmada','cancelada')),
  created_at timestamptz not null default now()
);
alter table public.reservas enable row level security;
drop policy if exists "demo_anon_all" on public.reservas;
create policy "demo_anon_all" on public.reservas for all to anon, authenticated using (true) with check (true);

create index if not exists reservas_recurso_fecha_idx on public.reservas (world_id, recurso, fecha);
create index if not exists reservas_user_idx on public.reservas (user_id, world_id);
