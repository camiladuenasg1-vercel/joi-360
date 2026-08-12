-- Pivot a piloto Jockey Plaza (12-ago-2026) -- Camila confirmo explicitamente
-- el borrado PERMANENTE E IRREVERSIBLE de: Colegio Raimondi, Universidad de
-- Lima y JOI Eventos. Se incluye tambien JOI Promos (mundo-promos-rp), que
-- ya estaba retirado del alcance activo desde antes de esta sesion (se purga
-- del store en cada carga) y calza con "todos los demas mundos se borran".
--
-- Jockey Plaza (mundo-3ox15t) es el UNICO mundo que sobrevive.
--
-- Que NO se toca (a proposito): app_profiles / auth.users (identidad global
-- de personas -- alguien pudo haber usado la misma cuenta en Jockey Plaza),
-- admin_users, grupos, capacities/capacity_feature_flags,
-- emission_channels/acquiring_channels, hardware_modelos_custom,
-- pos_devices (el hardware fisico no se borra, solo se desvincula del mundo
-- via world_id=null si tenia FK real -- sigue siendo inventario real de
-- RedPontis reasignable).
--
-- Orden: hijos antes que padres. Ejecutar el bloque completo de una vez.

-- Nota: varias tablas terminaron con world_id tipado uuid en vez de text en
-- distintos momentos del proyecto (worlds.id es texto tipo "mundo-3ox15t",
-- nunca un uuid real) -- se castea ::text en cada comparacion para que el
-- script funcione sin importar el tipo real de columna en cada tabla.
--
-- Reescrito en SQL plano (sin bloque do $$...$$ / plpgsql): el bloque con
-- variable v_worlds se rompio al copiar/pegar por el SQL Editor (el "$$" se
-- perdio en el trayecto, "unterminated dollar-quoted string") -- se repite
-- la lista de ids literal en cada WHERE en vez de una variable, sin ningun
-- caracter especial que un copy/paste pueda corromper.

-- Eventos / Ticketing
delete from public.event_checkin_log where ticket_id::text in (
  select id::text from public.event_tickets where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp')
);
delete from public.event_tickets where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.event_ticket_types where event_id::text in (
  select id::text from public.events where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp')
);
delete from public.event_guests where event_id::text in (
  select id::text from public.events where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp')
);
delete from public.event_guest_lists where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.event_merchants where event_id::text in (
  select id::text from public.events where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp')
);
delete from public.event_agenda_items where event_id::text in (
  select id::text from public.events where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp')
);
delete from public.events where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Menu
delete from public.menu_reservas where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.menu_programacion where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.menu_items where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.menu_membresias where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.consumo_alertas where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- BNPL
delete from public.bnpl_notificaciones where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.bnpl_contratos where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.bnpl_campanas where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.bnpl_programa_comercio where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.bnpl_limites_mundo where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Promociones
delete from public.promociones_canjes where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.promociones where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- NFC / Bandita
delete from public.nfc_bands where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.nfc_requests where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.nfc_band_requests where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.nfc_asignaciones where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Accesos
delete from public.access_log where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.access_shifts where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Comercio / catalogo
delete from public.products where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.merchant_requests where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.hardware_requests where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
update public.pos_devices set world_id = null, merchant_id = null, event_id = null
  where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.merchants where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Wallet / transacciones
delete from public.charge_requests where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.transactions where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.pos_turnos where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.wallets where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Usuarios / dependientes (NO se toca app_profiles/auth.users -- identidad global)
delete from public.dependent_restrictions where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.dependents where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.user_profiles where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.user_notifications where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Suscripciones / organizadores / liquidacion / acuerdos / config de plataforma
delete from public.subscription_plans where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.organizadores where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.liquidaciones where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_commercial_agreements where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_commercial_agreements_sponsor where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_alerts where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_capacity_configs where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_feature_flags where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_channel_configs where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.world_acquiring_channel_configs where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Monitoreo / soporte (historial, se limpia por prolijidad -- no critico)
delete from public.error_log where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');
delete from public.support_tickets where world_id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- El mundo mismo, al final
delete from public.worlds where id::text in ('mundo-raimondi','mundo-rbufxr','mundo-eventos-rp','mundo-promos-rp');

-- Verificacion post-borrado: debe quedar SOLO Jockey Plaza
select id, name, status from public.worlds order by name;
