-- Catálogo de modelos de hardware POS/Tótem editable por RedPontis (Task
-- #172). Antes "Registrar unidad" solo dejaba elegir entre los modelos
-- fijos de HARDWARE_CATALOG (hardcodeado en el código, requiere un deploy
-- para agregar un modelo nuevo) — separado a propósito del registro de
-- modelos "de fábrica" (Ingenico/Verifone/PAX/etc.), que sí tienen
-- integración de backend real (api_integration) y no deben poder
-- inventarse desde la UI. Este catálogo es para modelos que RedPontis suma
-- ad-hoc, sin integración especial todavía (pos_type físico genérico).

create table if not exists public.hardware_modelos_custom (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  tipo text not null default 'POS Físico',
  icon text not null default 'point_of_sale',
  descripcion text,
  conexion text,
  nfc boolean not null default false,
  precio numeric,
  moneda text not null default 'PEN',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.hardware_modelos_custom enable row level security;
drop policy if exists "demo_anon_all" on public.hardware_modelos_custom;
create policy "demo_anon_all" on public.hardware_modelos_custom for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
