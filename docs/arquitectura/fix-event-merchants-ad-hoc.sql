-- Comercio ad-hoc solo-para-un-evento (Task #228).
-- Hasta ahora "Comercios del evento" solo afiliaba merchants YA registrados
-- permanentemente en el mundo (checkbox). No había forma de sumar una marca
-- que solo participa en ESE evento puntual (ej. un food-truck invitado a la
-- kermesse) sin darla de alta como comercio permanente.
--
-- event_merchants.merchant_id nunca tuvo foreign key real hacia merchants(id)
-- (es un soft-link, mismo patrón que pos_devices.event_id) -- así que una
-- fila ad-hoc con un merchant_id sintético (generado en el cliente) no
-- rompe nada existente. Solo se necesita un lugar para guardar su logo,
-- porque no hay una fila real en `merchants` de la que copiarlo.

alter table public.event_merchants add column if not exists logo_url text;
alter table public.event_merchants add column if not exists es_ad_hoc boolean not null default false;
