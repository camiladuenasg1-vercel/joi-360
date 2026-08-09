-- Restricciones granulares por dependiente (Task #173). Antes horario de
-- consumo, límite diario y aprobación eran un único valor macro que
-- RedPontis fijaba para TODO el mundo (control.horarioConsumo /
-- limiteDiarioPerfil en el catálogo de capacidades) — el mismo horario y
-- límite para cada dependiente, sin poder diferenciar por perfil ni elegir
-- qué productos del catálogo del comercio bloquear para cada uno. Esta
-- tabla mueve esa configuración a donde corresponde: el tutor, por
-- dependiente, dentro de Restricciones en la superapp.

create table if not exists public.dependent_restrictions (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  dependent_user_id uuid not null,
  guardian_user_id uuid not null,
  horario_inicio text,
  horario_fin text,
  limite_diario numeric,
  productos_bloqueados jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (world_id, dependent_user_id)
);
alter table public.dependent_restrictions enable row level security;
drop policy if exists "demo_anon_all" on public.dependent_restrictions;
create policy "demo_anon_all" on public.dependent_restrictions for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
