-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Turnos v1.0.0 (26-ago) — estado de preparación de pedidos para
-- comercios de food court/restaurantes: "recibido" -> "preparando" ->
-- "listo" -> "entregado". El COBRO real ya existe (mover_saldo_wallet via
-- comprarProductosLive) -- esta tabla NO mueve dinero, solo trackea el
-- estado del pedido ya pagado. Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.turno_pedidos (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null,
  merchant_id uuid not null,
  user_id     uuid not null,
  items       jsonb not null default '[]',
  monto       numeric not null default 0,
  estado      text not null default 'recibido' check (estado in ('recibido','preparando','listo','entregado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.turno_pedidos enable row level security;
drop policy if exists "demo_anon_all" on public.turno_pedidos;
create policy "demo_anon_all" on public.turno_pedidos for all to anon, authenticated using (true) with check (true);

create index if not exists turno_pedidos_merchant_idx on public.turno_pedidos (merchant_id, estado);
create index if not exists turno_pedidos_user_idx on public.turno_pedidos (user_id, world_id);

notify pgrst, 'reload schema';
