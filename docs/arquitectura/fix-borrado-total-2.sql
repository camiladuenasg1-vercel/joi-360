-- Segundo borrado total de BD (admin + superapp comparten el mismo
-- Supabase, así que es un solo script) — arranque limpio para que el
-- equipo comercial empiece a probar desde cero, después de acumular data
-- de prueba de hoy (registros con DNI, mundos fantasma, etc).
--
-- Mejora sobre el primer borrado (fix-125): esa vez se vació TODO el
-- schema public sin excepción salvo error_catalog, lo que incluyó de
-- paso las tablas de CATÁLOGO/REFERENCIA (capacities, emission_channels)
-- — no son datos de uso, son el catálogo maestro que el propio código del
-- admin necesita para funcionar, y su ausencia causó cascadas de "Error
-- de sync" que hubo que reparar a mano. Esta vez se excluyen también.
--
-- Se deja SIN tocar: error_catalog, capacities, emission_channels.
-- Se borran las cuentas reales de auth.users (arranque 100% limpio).
--
-- ESTO ES IRREVERSIBLE. No hay respaldo.

do $$
declare
  r record;
  keep text[] := array['error_catalog', 'capacities', 'emission_channels'];
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> all(keep)
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;

delete from auth.users;

notify pgrst, 'reload schema';

-- Verificación: todo debe salir en 0, salvo capacities/emission_channels.
select
  (select count(*) from public.worlds)             as worlds,
  (select count(*) from public.wallets)             as wallets,
  (select count(*) from public.transactions)        as transactions,
  (select count(*) from public.merchants)           as merchants,
  (select count(*) from public.dependents)          as dependents,
  (select count(*) from auth.users)                 as auth_users,
  (select count(*) from public.capacities)          as capacities_ok,
  (select count(*) from public.emission_channels)   as emission_channels_ok;
