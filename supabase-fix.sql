-- JOI360 · Fix de columnas faltantes (aditivo, sin cambios de seguridad)
-- La versión ejecutada de la migración omitió estas columnas. Idempotente.

alter table public.event_tickets  add column if not exists world_id text;
alter table public.event_tickets  add column if not exists precio numeric not null default 0;

alter table public.bnpl_contratos add column if not exists merchant_nombre text;
alter table public.bnpl_contratos add column if not exists monto numeric not null default 0;
alter table public.bnpl_contratos add column if not exists dias_gracia integer not null default 0;
alter table public.bnpl_contratos add column if not exists interes_pct numeric not null default 0;

create index if not exists idx_event_tickets_user on public.event_tickets(user_id, world_id);

select 'fix de columnas aplicado' as resultado;
