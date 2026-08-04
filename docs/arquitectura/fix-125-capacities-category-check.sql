-- Encontrado al re-sembrar `capacities` después del borrado total: la
-- restricción capacities_category_check no incluía "Datos" (usada por
-- Perfil extendido y Menú en MODULE_CATALOG) — desactualizada desde antes
-- del borrado, no algo que rompió el borrado. Sin esto, "Publicar catálogo"
-- siempre iba a fallar para esos 2 módulos.

alter table public.capacities drop constraint if exists capacities_category_check;
alter table public.capacities add constraint capacities_category_check
  check (category in ('Emisión', 'Adquirencia', 'Mixto', 'Datos'));

notify pgrst, 'reload schema';
