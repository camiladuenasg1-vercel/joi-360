-- CRÍTICO (hallazgo en vivo, ago-2026): worlds.pos_pin se guardaba y leía en
-- texto plano. Cualquiera con la llave anónima (va empaquetada en el JS
-- público del admin) podía hacer `worlds?select=pos_pin` y obtener el PIN de
-- operador de CADA mundo — confirmado en producción, no es teórico. El mismo
-- patrón estaba a punto de repetirse en merchants.pos_pin al agregar el
-- código único de comercio (Task nueva: "necesito un código único de
-- comercio... con su código POS pin").
--
-- Fix: el PIN nunca se guarda en texto plano. Un trigger lo hashea (pgcrypto)
-- al escribir y anula la columna de texto plano en el mismo movimiento — el
-- código de la app sigue escribiendo pos_pin normal (cero cambios en los
-- upserts existentes), pero jamás queda un valor legible en la fila. La
-- verificación pasa a una función RPC (security definer) que compara el hash
-- server-side y devuelve solo id/tipo/nombre — nunca el PIN ni el hash.
--
-- De paso: merchants.codigo (único, sin guión) + merchants.pos_pin_hash, para
-- el alta real del código de comercio que hoy solo vive en localStorage.

-- pgcrypto en Supabase suele instalarse en el schema "extensions", no en
-- "public" — si el search_path de la sesión no lo incluye, crypt()/gen_salt()
-- fallan con "function does not exist" aunque la extensión sí esté instalada.
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

alter table public.worlds add column if not exists pos_pin_hash text;
alter table public.merchants add column if not exists codigo text;
alter table public.merchants add column if not exists pos_pin_hash text;
create unique index if not exists merchants_codigo_key on public.merchants (codigo) where codigo is not null;

-- Migra lo que ya está expuesto en texto plano, luego lo borra.
update public.worlds set pos_pin_hash = crypt(pos_pin, gen_salt('bf')), pos_pin = null
  where pos_pin is not null and pos_pin_hash is null;
update public.merchants set pos_pin_hash = crypt(pos_pin, gen_salt('bf')), pos_pin = null
  where pos_pin is not null and pos_pin_hash is null;

create or replace function public.hash_pos_pin() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.pos_pin is not null and new.pos_pin <> '' then
    new.pos_pin_hash := crypt(new.pos_pin, gen_salt('bf'));
  end if;
  new.pos_pin := null;
  return new;
end;
$$;

drop trigger if exists trg_hash_pos_pin_worlds on public.worlds;
create trigger trg_hash_pos_pin_worlds before insert or update on public.worlds
for each row execute function public.hash_pos_pin();

drop trigger if exists trg_hash_pos_pin_merchants on public.merchants;
create trigger trg_hash_pos_pin_merchants before insert or update on public.merchants
for each row execute function public.hash_pos_pin();

-- Única forma real de validar un PIN de acá en adelante: comercio o mundo,
-- por su código corto — nunca por id interno, y nunca devuelve el secreto.
create or replace function public.verificar_pin_operador(p_codigo text, p_pin text)
returns table(tipo text, id text, world_id text, nombre text)
language sql security definer set search_path = public, extensions as $$
  select 'comercio'::text, m.id::text, m.world_id::text, m.name
  from public.merchants m
  where m.codigo = p_codigo and m.status = 'activo'
    and m.pos_pin_hash is not null and m.pos_pin_hash = crypt(p_pin, m.pos_pin_hash)
  union all
  select 'mundo'::text, w.id::text, w.id::text, w.name
  from public.worlds w
  where w.code = p_codigo
    and w.pos_pin_hash is not null and w.pos_pin_hash = crypt(p_pin, w.pos_pin_hash)
  limit 1;
$$;
grant execute on function public.verificar_pin_operador(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
