-- Alias/apodo del dependiente (Task #140). El registro ya tenía nombre
-- completo y DNI (fix-dependents-dni.sql, sesión previa); el consumo ya
-- corre 100% real vía la wallet propia del dependiente (recargada por P2P
-- desde el tutor) — lo único que faltaba de este ítem era el alias: un
-- apodo corto y amigable, distinto del nombre legal completo, para
-- identificar rápido a un dependiente en las tarjetas y en la ficha del POS.

alter table public.dependents add column if not exists alias text;

notify pgrst, 'reload schema';
