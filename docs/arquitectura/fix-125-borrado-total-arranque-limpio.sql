-- Task #125: Borrado total de BD — arranque limpio del ecosistema JOI360.
--
-- Vacía TODAS las tablas operativas del schema public (mundos, wallets,
-- transacciones, comercios, dependientes, eventos, liquidaciones, POS,
-- banditas NFC, accesos, BNPL, promociones, tickets de soporte, etc.) y
-- borra las cuentas reales de Supabase Auth (auth.users) — confirmado con
-- la usuaria: arranque 100% limpio, incluida la cuenta de prueba "QA Test".
--
-- Se deja SIN tocar: error_catalog (catálogo de mensajes de error del
-- sistema — es configuración, no dato de uso; confirmado con la usuaria).
--
-- Es dinámico (recorre pg_tables) en vez de listar cada tabla a mano —
-- con más de 25 tablas reales en este proyecto, listarlas una por una
-- arriesga olvidar alguna o escribir mal un nombre. Orden: primero se
-- vacía public completo (así ninguna fila queda con una referencia rota
-- hacia auth.users), auth.users se borra al final.
--
-- ESTO ES IRREVERSIBLE. No hay respaldo — si algo de esto tenía que
-- conservarse, deténte antes de correrlo.

do $$
declare
  r record;
  keep text[] := array['error_catalog'];
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

-- Verificación: todo debe salir en 0.
select
  (select count(*) from public.worlds)       as worlds,
  (select count(*) from public.wallets)      as wallets,
  (select count(*) from public.transactions) as transactions,
  (select count(*) from public.merchants)    as merchants,
  (select count(*) from auth.users)          as auth_users;
