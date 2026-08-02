-- Migración: Hardware — tipo de ingreso (gratis/alquiler/venta) por unidad
-- Spec: "Asignación de Hardware" (Admin RP) exige "Tipo de ingreso: gratis –
-- alquiler – venta" por equipo registrado.
alter table public.pos_devices add column if not exists tipo_ingreso text default 'venta';
