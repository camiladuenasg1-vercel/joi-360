-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Estacionamiento v1.0.0 (26-ago) — sesión real de ingreso/salida
-- con cobro por permanencia al salir (tarifaHora x horas, con minutos de
-- gracia). El cobro en sí reutiliza mover_saldo_wallet vía pagarSupabase, ya
-- probado -- esta tabla solo trackea la sesión (cuándo entró, cuándo salió,
-- cuánto se cobró). Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.estacionamiento_sesiones (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null,
  user_id     uuid not null,
  placa       text,
  entrada_at  timestamptz not null default now(),
  salida_at   timestamptz,
  monto       numeric,
  created_at  timestamptz not null default now()
);
alter table public.estacionamiento_sesiones enable row level security;
drop policy if exists "demo_anon_all" on public.estacionamiento_sesiones;
create policy "demo_anon_all" on public.estacionamiento_sesiones for all to anon, authenticated using (true) with check (true);

create index if not exists estacionamiento_user_idx on public.estacionamiento_sesiones (user_id, world_id);

notify pgrst, 'reload schema';
