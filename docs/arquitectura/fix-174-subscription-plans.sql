-- Planes de suscripción por mundo (Task #174). Antes "Cobrar suscripción
-- por perfil vinculado" (wallet.perfilesSuscripcion) era un único monto fijo
-- (wallet.montoSuscripcion) sin período ni nombre — el usuario final no
-- elegía nada, solo pagaba la cuota que RedPontis fijó. Ahora el mundo (o
-- RedPontis) puede crear varios planes con nombre, precio, período
-- (mensual/anual) y un % de descuento promocional opcional; el usuario
-- elige entre ellos al vincular un dependiente.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  periodo text not null default 'mensual', -- 'mensual' | 'anual'
  descuento_pct numeric,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
drop policy if exists "demo_anon_all" on public.subscription_plans;
create policy "demo_anon_all" on public.subscription_plans for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
