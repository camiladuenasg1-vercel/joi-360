-- Migración: Motor de Liquidación real (29-jul)
-- Antes: generarLiquidaciones() (store.js) simulaba el volumen del día con un
-- hash determinista de world_id+fecha, y el lote resultante solo vivía en
-- memoria local (st.liquidaciones) -- nunca en Supabase, se perdía al
-- refrescar el navegador y no reflejaba ninguna transacción real. Pedido
-- explícito de la usuaria: reemplazar por lectura real de `transactions` y
-- persistencia real del lote. La lógica de negocio (tipo de acuerdo,
-- retención bajo monto mínimo, corte por frecuencia configurada por mundo)
-- se mantiene igual -- solo el volumen deja de ser fabricado.

create table if not exists public.liquidaciones (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  fecha date not null,
  entidad_legal text,
  volumen numeric not null default 0,
  tx_count integer not null default 0,
  tipo_acuerdo text,
  rev_share numeric,
  comision numeric not null default 0,
  neto numeric not null default 0,
  estado text not null default 'PENDIENTE',
  moneda text default 'PEN',
  hora_corte text,
  modelo_recaudacion text,
  frecuencia text,
  monto_minimo numeric,
  periodo_desde timestamptz,
  periodo_hasta timestamptz,
  created_at timestamptz not null default now(),
  unique (world_id, fecha)
);
alter table public.liquidaciones enable row level security;
drop policy if exists "demo_anon_all" on public.liquidaciones;
create policy "demo_anon_all" on public.liquidaciones for all to anon, authenticated using (true) with check (true);
