-- ============================================================================
-- JOI360 · Migración Caso 2 Raimondi — cierre de brechas reales (20 jul 2026)
-- 100% aditivo: solo CREATE TABLE / ALTER TABLE ADD COLUMN. Sin RLS ni políticas
-- nuevas — mismo patrón abierto que wallets/transactions (que ya funcionan sin
-- policy explícita: RLS off por defecto en tablas nuevas de Postgres).
-- Idempotente: seguro re-ejecutar.
-- ============================================================================

-- Inventario real de hardware POS (reemplaza el localStorage de HardwarePOS.jsx)
create table if not exists public.pos_devices (
  id           uuid primary key default gen_random_uuid(),
  model        text not null,
  serial       text unique not null,
  status       text not null default 'disponible', -- disponible | asignado | mantenimiento
  world_id     text references public.worlds(id) on delete set null,
  merchant_id  text,
  assigned_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pos_devices_world on public.pos_devices(world_id);

-- Catálogo de productos por comercio (Cafetería, Kiosco...)
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null references public.worlds(id) on delete cascade,
  merchant_id text not null,
  name        text not null,
  price       numeric not null default 0,
  category    text,
  stock       integer,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_products_merchant on public.products(merchant_id);

-- Familiares / dependientes vinculados a un tutor (padre/madre)
-- El dependiente tiene su PROPIA fila en wallets (dependent_user_id), así
-- reutiliza toda la infraestructura de saldo/transacciones ya construida.
create table if not exists public.dependents (
  id                 uuid primary key default gen_random_uuid(),
  world_id           text not null references public.worlds(id) on delete cascade,
  guardian_user_id   text not null,
  dependent_user_id  text not null unique,
  nombre             text not null,
  alergias           text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_dependents_guardian on public.dependents(guardian_user_id, world_id);
create index if not exists idx_dependents_world on public.dependents(world_id);

-- Solicitudes de pulsera NFC (antes: botones decorativos sin backend)
create table if not exists public.nfc_requests (
  id          uuid primary key default gen_random_uuid(),
  world_id    text not null references public.worlds(id) on delete cascade,
  user_id     text not null,
  status      text not null default 'pendiente', -- pendiente | entregada | rechazada
  created_at  timestamptz not null default now()
);
create index if not exists idx_nfc_requests_world on public.nfc_requests(world_id, status);

-- Atribución de una venta a un comercio concreto (antes: transactions no
-- distinguía qué merchant procesó la compra — imposible aislar "mis ventas").
alter table public.transactions add column if not exists merchant_id text;
create index if not exists idx_transactions_merchant on public.transactions(merchant_id);

select 'migración Raimondi (pos_devices, products, dependents, nfc_requests, transactions.merchant_id) aplicada' as resultado;
