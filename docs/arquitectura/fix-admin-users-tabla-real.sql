-- Las credenciales de acceso al admin RedPontis vivían SOLO en el código
-- (store.js: users: [{ email, password, name }]) — nunca en Supabase, sin
-- visibilidad ni forma de gestionarlas fuera de editar el JS a mano. Mismo
-- patrón de hasheo + RPC ya establecido para PINs de operador
-- (fix-pos-pin-hash-y-codigo-comercio.sql): la contraseña nunca se guarda ni
-- se compara en texto plano.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text,       -- solo de paso: el trigger lo hashea y anula en el mismo insert/update
  password_hash text,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
drop policy if exists "demo_anon_all" on public.admin_users;
create policy "demo_anon_all" on public.admin_users for all to anon, authenticated using (true) with check (true);

create or replace function public.hash_admin_password() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.password is not null and new.password <> '' then
    new.password_hash := crypt(new.password, gen_salt('bf'));
  end if;
  new.password := null;
  return new;
end;
$$;

drop trigger if exists trg_hash_admin_password on public.admin_users;
create trigger trg_hash_admin_password before insert or update on public.admin_users
for each row execute function public.hash_admin_password();

create or replace function public.verificar_admin_login(p_email text, p_password text)
returns table(id uuid, email text, name text)
language sql security definer set search_path = public, extensions as $$
  select a.id, a.email, a.name
  from public.admin_users a
  where lower(a.email) = lower(p_email)
    and a.password_hash is not null and a.password_hash = crypt(p_password, a.password_hash)
  limit 1;
$$;
grant execute on function public.verificar_admin_login(text, text) to anon, authenticated;

-- Cuenta actual, para no perder el acceso al migrar.
insert into public.admin_users (email, password, name)
values ('camila.duenas@redpontis.com', 'RedpontisAdmin2026', 'Camila Dueñas')
on conflict (email) do nothing;

notify pgrst, 'reload schema';
