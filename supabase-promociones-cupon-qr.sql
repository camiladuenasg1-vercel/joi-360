-- Migración: Promociones — cupón QR (Gantt #38-#41, Backlog Capítulo 2)
-- Alcance mínimo viable confirmado por la usuaria 28-jul: solo cupón QR
-- (crear/gestionar cupones reales + activar/canjear en la app). Banners,
-- push segmentado y A/B testing quedan documentados como fase 2, no en este
-- alcance. Antes: TabPromos (admin) y PromocionesTemplate (app) eran 100%
-- mock local (st.promos en memoria/localStorage), sin ninguna tabla real —
-- 'promociones' seguía en MODULOS_PROXIMAMENTE por eso.

create table if not exists public.promociones (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  merchant_nombre text not null,
  titulo text not null,
  tipo text not null default 'Descuento %',
  valor numeric,
  vigencia_hasta date,
  usos_max integer,
  usos_actuales integer not null default 0,
  codigo_qr text not null unique,
  estado text not null default 'VIGENTE',
  created_at timestamptz not null default now()
);
alter table public.promociones enable row level security;
drop policy if exists "demo_anon_all" on public.promociones;
create policy "demo_anon_all" on public.promociones for all to anon, authenticated using (true) with check (true);

create table if not exists public.promociones_canjes (
  id uuid primary key default gen_random_uuid(),
  promocion_id uuid references public.promociones(id) on delete cascade,
  world_id text not null,
  user_id text not null,
  canjeado_at timestamptz not null default now()
);
alter table public.promociones_canjes enable row level security;
drop policy if exists "demo_anon_all" on public.promociones_canjes;
create policy "demo_anon_all" on public.promociones_canjes for all to anon, authenticated using (true) with check (true);
