-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Registro de accesos (Gantt #92 — Caso Raimondi, capacidad Accesos)
-- Antes: AccesosTemplate mostraba un historial de entradas/salidas 100%
-- hardcodeado — no existía ninguna tabla ni mecanismo de registro real.
-- Mismo patrón sin hardware real que el resto del demo (código/QR mostrado
-- por el usuario, un operador lo escanea/tipea para registrar el evento).
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.access_log (
  id         uuid primary key default gen_random_uuid(),
  world_id   text not null references public.worlds(id) on delete cascade,
  user_id    text not null,
  tipo       text not null default 'entrada',  -- entrada | salida
  zona       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_access_log_world on public.access_log(world_id, created_at);
create index if not exists idx_access_log_user  on public.access_log(user_id, world_id, created_at);

alter table public.access_log enable row level security;

drop policy if exists "demo_anon_all" on public.access_log;
create policy "demo_anon_all" on public.access_log for all to anon, authenticated using (true) with check (true);
