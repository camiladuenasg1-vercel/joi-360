-- Bandita universal para la cuenta principal (Task #168). Antes cada
-- bandita quedaba vinculada a un único mundo (nfc_bands.world_id): un
-- titular con varias comunidades activas necesitaba una pulsera por mundo.
-- El backend de cobro (shop-charge.js) YA discrimina la wallet correcta
-- usando el world_id del lector físico que hizo la lectura, así que una
-- banda con world_id = null (universal) ya resuelve cross-mundo sin cambios
-- ahí — solo faltaba la señal de intención en la solicitud, para que quien
-- vincula la pulsera física sepa que debe dejarla sin mundo fijo.

alter table public.nfc_requests add column if not exists universal boolean not null default false;

notify pgrst, 'reload schema';
