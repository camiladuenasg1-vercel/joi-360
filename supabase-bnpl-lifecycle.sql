-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Ciclo de vida BNPL (Caso 1 Mok — Gantt #27-#30)
-- Estado "suspendido" en el financiamiento + bloqueo de cuotas vencidas +
-- notificación al comercio. Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

-- Snapshot de la política de mora del comercio al momento de firmar (evita un
-- join extra al evaluar el ciclo del contrato más adelante).
alter table public.bnpl_contratos
  add column if not exists gestion_mora text not null default 'sin_cargo_suspension';

-- estado ahora también puede valer 'suspendido' (texto libre, sin CHECK previo
-- que romper: evaluando|aprobado|rechazado|firmado|en_mora|suspendido|cerrado)
-- cronograma[].estado ahora también puede valer 'vencida' (pendiente|pagada|vencida)

create table if not exists public.bnpl_notificaciones (
  id           uuid primary key default gen_random_uuid(),
  world_id     text not null references public.worlds(id) on delete cascade,
  merchant_id  text not null,
  contrato_id  uuid references public.bnpl_contratos(id) on delete cascade,
  tipo         text not null default 'suspension',
  mensaje      text not null,
  leida        boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_bnpl_notif_merchant on public.bnpl_notificaciones(world_id, merchant_id, leida);

alter table public.bnpl_notificaciones enable row level security;

drop policy if exists "demo_anon_all" on public.bnpl_notificaciones;
create policy "demo_anon_all" on public.bnpl_notificaciones for all to anon, authenticated using (true) with check (true);
