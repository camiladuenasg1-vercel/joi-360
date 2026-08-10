-- Pago por QR generado por el comercio: el operador tipea el monto, el
-- sistema genera una "solicitud de cobro" y la muestra como QR — el cliente
-- la escanea con su cámara (abre el superapp en /pagar/:id), confirma y
-- paga desde su propia sesión. El operador ve el estado en vivo por polling
-- (mismo patrón sin websockets que usa el resto del proyecto) hasta que
-- pasa a "pagado" o lo cancela.

create table if not exists public.charge_requests (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  merchant_id uuid not null,
  merchant_nombre text,
  monto numeric not null check (monto > 0),
  referencia text,
  turno_id uuid,
  estado text not null default 'pendiente', -- pendiente | pagado | cancelado
  pagador_user_id uuid,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_charge_requests_merchant on public.charge_requests (merchant_id, created_at desc);

alter table public.charge_requests enable row level security;
drop policy if exists "demo_anon_all" on public.charge_requests;
create policy "demo_anon_all" on public.charge_requests for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
