-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Donaciones v0.1.0 (demo BCS Corp / ONG Rana Dorada, 2026-10-23)
-- Tabla propia, independiente de wallets/transactions -- una donacion NUNCA
-- acredita wallets.balance ni se mezcla con el historial de consumos/recargas,
-- por diseno. Mismo patron que `reservas`/`subsidios`. Idempotente.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.donations (
  id               uuid primary key default gen_random_uuid(),
  world_id         text not null,
  user_id          uuid not null,
  amount           numeric(12,2) not null check (amount > 0),
  currency         text not null default 'USD',
  channel_id       text,
  channel_nombre   text,
  causa            text,
  comprobante_code text,
  created_at       timestamptz not null default now()
);
alter table public.donations enable row level security;
drop policy if exists "demo_anon_all" on public.donations;
create policy "demo_anon_all" on public.donations for all to anon, authenticated using (true) with check (true);

create index if not exists donations_world_id_idx on public.donations (world_id);
create index if not exists donations_user_id_idx on public.donations (user_id, world_id);

notify pgrst, 'reload schema';
