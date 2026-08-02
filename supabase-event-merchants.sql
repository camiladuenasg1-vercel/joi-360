-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Comercios afiliados a un evento (Caso 3 Kermesse — Gantt #63/#67/#70)
-- Antes: la "vitrina de comercios" de un evento en la app mostraba TODOS los
-- comercios activos del mundo (sin afiliación real) — ver EventoMarketplaceSection.
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.event_merchants (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references public.events(id) on delete cascade,
  merchant_id     text not null,
  merchant_nombre text,
  ubicacion       text,
  created_at      timestamptz not null default now(),
  unique (event_id, merchant_id)
);

create index if not exists idx_event_merchants_event on public.event_merchants(event_id);

alter table public.event_merchants enable row level security;

drop policy if exists "demo_anon_all" on public.event_merchants;
create policy "demo_anon_all" on public.event_merchants for all to anon, authenticated using (true) with check (true);

-- Catálogo específico del evento (#70): null = catálogo regular del comercio,
-- seteado = productos/precios exclusivos de ese evento (ej. menú de kermesse).
alter table public.products
  add column if not exists event_id text references public.events(id) on delete cascade;

create index if not exists idx_products_event on public.products(event_id);
