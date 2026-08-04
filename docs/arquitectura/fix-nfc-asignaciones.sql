-- Corrección de modelo: el precio/forma de cobro de una bandita NFC no se
-- fija al cargar el lote al almacén (ahí todavía no se sabe a qué mundo va
-- ni bajo qué condición comercial) — se fija al ASIGNARLA a un mundo. Cada
-- asignación es su propio lote comercial: mismo lote físico puede asignarse
-- a mundos distintos, cada uno con su propio precio/modelo/forma de cobro.

create table if not exists public.nfc_asignaciones (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  lote text not null,
  cantidad integer not null,
  modelo text not null default 'gratuita', -- 'gratuita' | 'pagada'
  precio_unitario numeric,
  monto_total numeric,
  forma_cobro text, -- 'contraentrega' | 'anticipado' | 'descuento_ventas' (null si gratuita)
  estado_pago text not null default 'gratuita', -- 'gratuita' | 'pendiente' | 'pagado' | 'pendiente_descuento' | 'descontado'
  comprobante_url text,
  comprobante_nombre text,
  descripcion text,
  created_at timestamptz not null default now(),
  pagado_at timestamptz
);
alter table public.nfc_asignaciones enable row level security;
drop policy if exists "demo_anon_all" on public.nfc_asignaciones;
create policy "demo_anon_all" on public.nfc_asignaciones for all to anon, authenticated using (true) with check (true);

-- Cada bandita queda trazada a la asignación comercial bajo la que salió del
-- almacén, para poder ver su precio/modelo real sin adivinar por lote físico.
alter table public.nfc_bands add column if not exists asignacion_id uuid;

-- Descuento por hardware: cuando la forma de cobro es "descuento de ventas",
-- el monto se resta del neto de la liquidación en vez de cobrarse aparte.
alter table public.liquidaciones add column if not exists descuento_hardware numeric not null default 0;

notify pgrst, 'reload schema';
