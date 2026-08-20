-- Cashback -- dos cosas pedidas por Camila (20-ago):
-- 1) Modalidad configurable por RedPontis (flat | por_comercio) -- ya se
--    agregó como configField "modalidad" en MODULE_CATALOG (store.js), no
--    necesita columna nueva: vive en world_capacity_configs.config, igual
--    que porcentajeDefault/topeMensual.
-- 2) El mundo ve su config de cashback en su propio panel pero NO la edita
--    directo -- pide un cambio, que cae en la cola de Aprobaciones de
--    RedPontis (mismo lugar que eventos/altas de comercio), quien ajusta y
--    aprueba. Esta tabla es esa cola.

create table if not exists public.cashback_change_requests (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  config_actual jsonb not null,
  config_solicitada jsonb not null,
  comentario_mundo text,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','APROBADA','RECHAZADA')),
  motivo_rechazo text,
  resuelto_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.cashback_change_requests enable row level security;
create policy demo_all_cashback_change_requests on public.cashback_change_requests
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_cashback_change_requests_pendientes
  on public.cashback_change_requests(estado) where estado = 'PENDIENTE';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

select table_name from information_schema.tables where table_name = 'cashback_change_requests';
