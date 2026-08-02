-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Perfil extendido: datos médicos/emergencia reales (Gantt #93)
-- Antes: PerfilExtTemplate mostraba una persona y datos médicos 100% fake
-- (nombre "María García", "Clínica San Pablo") sin ninguna tabla detrás.
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_profiles (
  id                      uuid primary key default gen_random_uuid(),
  world_id                text not null references public.worlds(id) on delete cascade,
  user_id                 text not null,
  tipo_sangre             text,
  alergias                text,
  clinica                 text,
  contacto_emergencia_nombre    text,
  contacto_emergencia_telefono  text,
  updated_at              timestamptz not null default now(),
  unique (world_id, user_id)
);

alter table public.user_profiles enable row level security;

drop policy if exists "demo_anon_all" on public.user_profiles;
create policy "demo_anon_all" on public.user_profiles for all to anon, authenticated using (true) with check (true);
