-- "Mi código JOI" hoy es el UUID crudo de getSyntheticUserId() — nada corto
-- ni digerible para compartir de palabra o por WhatsApp al recibir una
-- transferencia. Este código es información pública (como un alias de
-- transferencia bancaria, no un secreto), así que se resuelve directo con la
-- llave anónima — a diferencia del PIN de operador, acá no aplica el mismo
-- fix de hasheo.

alter table public.app_profiles add column if not exists codigo text;
create unique index if not exists app_profiles_codigo_key on public.app_profiles (codigo) where codigo is not null;

create or replace function public.generar_codigo_usuario() returns trigger
language plpgsql as $$
declare
  base text;
  candidato text;
  intentos int := 0;
begin
  if new.codigo is not null then return new; end if;
  base := upper(left(regexp_replace(coalesce(new.nombres, 'USR'), '[^a-zA-Z]', '', 'g'), 6));
  if base = '' then base := 'USR'; end if;
  loop
    candidato := base || lpad(floor(random() * 900 + 100)::text, 3, '0');
    exit when not exists (select 1 from public.app_profiles where codigo = candidato);
    intentos := intentos + 1;
    exit when intentos > 20;
  end loop;
  new.codigo := candidato;
  return new;
end;
$$;

drop trigger if exists trg_generar_codigo_usuario on public.app_profiles;
create trigger trg_generar_codigo_usuario before insert on public.app_profiles
for each row execute function public.generar_codigo_usuario();

-- Backfill de cuentas ya existentes, con el mismo criterio de unicidad
-- pieza por pieza (una sola sentencia con random() podía chocar entre sí).
do $$
declare r record; base text; candidato text; intentos int;
begin
  for r in select id, nombres from public.app_profiles where codigo is null loop
    base := upper(left(regexp_replace(coalesce(r.nombres, 'USR'), '[^a-zA-Z]', '', 'g'), 6));
    if base = '' then base := 'USR'; end if;
    intentos := 0;
    loop
      candidato := base || lpad(floor(random() * 900 + 100)::text, 3, '0');
      exit when not exists (select 1 from public.app_profiles where codigo = candidato);
      intentos := intentos + 1;
      exit when intentos > 20;
    end loop;
    update public.app_profiles set codigo = candidato where id = r.id;
  end loop;
end $$;

notify pgrst, 'reload schema';
