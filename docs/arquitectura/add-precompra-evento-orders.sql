-- Backlog #2 (Documento Maestro, 09_backlog.md): la autoría de Precompra de
-- evento ya estaba construida (Task #231 -- el comercio carga productos con
-- event_id real y stock propio, ver EventoCatalogoComercio en
-- OrganizadorFront.jsx). Faltaban las dos puntas: que el asistente, ya con
-- su entrada comprada, pueda ver y pagar esos productos desde la app, y que
-- el comercio los entregue en el evento -- mismo patrón ya probado con
-- Menú (menu_reservas / marcarMenuReservaEntregadaRemote): el cobro real
-- ocurre al confirmar (mover_saldo_wallet vía comprarProductosLive), esta
-- tabla es solo el pendiente de retiro físico.

create table if not exists public.event_product_orders (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  event_id uuid not null,
  merchant_id uuid not null,
  beneficiario_user_id text not null,
  beneficiario_nombre text,
  items jsonb not null,
  monto numeric not null,
  estado text not null default 'CONFIRMADA' check (estado in ('CONFIRMADA', 'ENTREGADA')),
  entregado_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.event_product_orders enable row level security;

create policy demo_all_event_product_orders on public.event_product_orders
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_event_product_orders_merchant on public.event_product_orders(merchant_id);
create index if not exists idx_event_product_orders_beneficiario on public.event_product_orders(beneficiario_user_id, event_id);

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

select table_name from information_schema.tables where table_name = 'event_product_orders';
