-- Migración: BNPL Productos Financiables — alcance, campañas temporales, cuota inicial
-- Spec: alcance (todo el catálogo / categorías específicas / productos
-- puntuales), campañas temporales (fecha inicio/fin, productos incluidos).

alter table public.bnpl_programa_comercio
  add column if not exists alcance text default 'puntuales',
  add column if not exists categorias jsonb default '[]'::jsonb,
  add column if not exists cuota_inicial numeric default 0;

create table if not exists public.bnpl_campanas (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  merchant_id text not null,
  nombre text not null,
  fecha_inicio date,
  fecha_fin date,
  productos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.bnpl_campanas enable row level security;
drop policy if exists "demo_anon_all" on public.bnpl_campanas;
create policy "demo_anon_all" on public.bnpl_campanas for all to anon, authenticated using (true) with check (true);
