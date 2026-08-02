-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Caso Raimondi: Menú con checkout tipo carrito + asignación de
-- membresía (reservar el módulo Menú a un perfil de familiar específico).
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

-- No existía ningún concepto de "a quién pertenece el Menú" — MenuTemplate
-- compraba siempre a nombre del titular, sin selector de perfil (dependiente)
-- ni forma de reservar el servicio a un familiar puntual. beneficiario_user_id
-- es el titular (guardian_user_id) o un dependent_user_id real de la tabla
-- dependents — no hay FK porque dependents.dependent_user_id tampoco es FK a
-- ninguna tabla de usuarios real (mismo patrón "synthetic user id" del resto
-- del proyecto).
create table if not exists public.menu_membresias (
  id                   uuid primary key default gen_random_uuid(),
  world_id             text not null,
  guardian_user_id     uuid not null,
  beneficiario_user_id uuid not null,
  beneficiario_nombre  text not null,
  activo               boolean not null default true,
  created_at           timestamptz not null default now()
);
alter table public.menu_membresias enable row level security;
drop policy if exists "demo_anon_all" on public.menu_membresias;
create policy "demo_anon_all" on public.menu_membresias for all to anon, authenticated using (true) with check (true);
