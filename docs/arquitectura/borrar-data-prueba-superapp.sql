-- BORRADO de datos de prueba, alcance: solo lo que genera la SUPERAPP
-- (usuarios finales) -- pedido explícito de Camila. NO toca la estructura
-- de negocio: mundos, comercios, catálogos, planes, eventos definidos,
-- capacidades activadas, admin_users -- eso lo configura el admin y debe
-- sobrevivir para que la superapp siga funcionando después del borrado.
--
-- IRREVERSIBLE. Corre esto solo cuando estés lista -- no hay vuelta atrás.
-- Orden pensado para respetar cascadas (hijo antes que padre).

-- 1) Actividad transaccional del usuario
delete from public.transactions;
delete from public.charge_requests;

-- 2) Wallets -- se limpia el saldo, no se borra la fila (getOrCreateWallet
-- las regenera solas en 0 si se borran del todo; poner balance=0 es más
-- simple y no rompe ningún select que asuma que la wallet ya existe).
update public.wallets set balance = 0, cashback_balance = 0;

-- 3) Cashback -- historial de solicitudes de cambio del mundo (si hay)
delete from public.cashback_change_requests;

-- 4) Suscripciones/membresías del usuario (no los planes que armó el mundo)
delete from public.subscription_suscriptores;

-- 5) Familiares / dependientes y sus restricciones
delete from public.dependent_restrictions;
delete from public.consumo_alertas;
delete from public.dependents;

-- 6) Bandita NFC -- se desvincula, no se borra (es inventario físico real)
update public.nfc_bands set linked_user_id = null, estado = 'disponible', activada_at = null, vence_at = null;
delete from public.nfc_requests;

-- 7) Eventos -- entradas y check-ins del usuario (no se tocan los eventos
-- ni los tipos de entrada que definió el organizador/mundo)
delete from public.event_checkin_log;
delete from public.event_tickets;
delete from public.event_product_orders;

-- 8) Menú -- reservas del usuario (no se toca el catálogo de platos)
delete from public.menu_reservas;

-- 9) Promociones -- canjes del usuario (no se tocan las promos definidas)
delete from public.promociones_canjes;

-- 10) BNPL -- contratos y notificaciones del usuario (no se toca el
-- programa que armó cada comercio)
delete from public.bnpl_notificaciones;
delete from public.bnpl_contratos;

-- 11) Accesos -- historial de entradas/salidas del usuario
delete from public.access_log;

-- 12) Perfil del usuario -- ficha médica extendida y el perfil/código
delete from public.user_profiles;
delete from public.app_profiles;

-- 13) Tickets de soporte abiertos por usuarios de la superapp
delete from public.support_tickets where origen = 'app';

notify pgrst, 'reload schema';

-- Verificación rápida: todas estas deben devolver 0 al final.
select
  (select count(*) from public.transactions) as transactions,
  (select count(*) from public.dependents) as dependents,
  (select count(*) from public.event_tickets) as event_tickets,
  (select count(*) from public.subscription_suscriptores) as suscriptores,
  (select count(*) from public.app_profiles) as app_profiles;
