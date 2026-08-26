-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Subsidio v1.0.0 (26-ago) — saldo dirigido real, acreditado por
-- RedPontis a un usuario a la vez (decisión de Camila). Ledger propio, NO
-- toca wallets.balance ni mover_saldo_wallet -- el consumo real del
-- subsidio (gastarlo en una compra) queda para una v1.1 que sí amerite
-- integrarse con el RPC crítico de pagos, con cuidado dedicado.
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.subsidios (
  id             uuid primary key default gen_random_uuid(),
  world_id       text not null,
  user_id        uuid not null,
  monto          numeric not null,
  monto_usado    numeric not null default 0,
  categorias     text,
  vigente_hasta  date,
  acreditado_por text,
  created_at     timestamptz not null default now()
);
alter table public.subsidios enable row level security;
drop policy if exists "demo_anon_all" on public.subsidios;
create policy "demo_anon_all" on public.subsidios for all to anon, authenticated using (true) with check (true);

create index if not exists subsidios_user_idx on public.subsidios (user_id, world_id);
