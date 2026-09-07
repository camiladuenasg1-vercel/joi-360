-- ════════════════════════════════════════════════════════════════════════════
-- JOI360 · Track E — limpieza de flags fantasma en capacity_feature_flags
--
-- `ensureGlobalFlag` / `syncCatalogRemote` hoy solo hacen INSERT, nunca DELETE.
-- Una version vieja del sync guardo el NOMBRE legible del servicio como
-- flag_code (ademas del id estable), dejando ~28 filas basura: p.ej.
-- accesos tiene `consulta_pos` Y `Consulta en POS`. El admin renderiza los
-- flags desde MODULE_CATALOG local (ids estables), no desde Supabase, asi que
-- no rompe nada — pero el contrato que dev toma "tal cual" esta sucio.
--
-- Este script borra SOLO las filas cuyo flag_code parece un nombre legible
-- (tiene espacio o mayuscula, nunca un id snake_case) Y que ningun
-- world_feature_flags referencia. Verificado 07-sep: 28 filas, las 28
-- borrables. Idempotente.
-- ════════════════════════════════════════════════════════════════════════════

-- diagnostico (opcional, correr antes)
-- select capacity_id, flag_code from capacity_feature_flags
--   where flag_code ~ '[ A-Z]' order by 1;

delete from public.capacity_feature_flags
where flag_code ~ '[ A-Z]'                                    -- parece nombre, no id
  and id not in (select flag_id from public.world_feature_flags);  -- nadie lo usa

-- verificacion: deberia bajar de 96 a 68 filas
select count(*) as flags_restantes from public.capacity_feature_flags;

notify pgrst, 'reload schema';
