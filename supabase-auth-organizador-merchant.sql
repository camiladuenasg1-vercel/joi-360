-- ════════════════════════════════════════════════════════════════════════════
-- JOI360 · Track B — Auth server-side para Organizador y Panel de Merchant
-- (Discrepancia #3 del maestro + hallazgos B1/B3 del plan de incongruencias)
--
-- Antes: organizadores.password se guardaba en TEXTO PLANO, legible con la
-- anon key, y el login se comparaba en el cliente contra el store local
-- (nunca re-leído de Supabase) -> un organizador solo podía entrar desde el
-- navegador que lo creó. Las credenciales del Panel de Merchant ni siquiera
-- llegaban a Supabase.
--
-- Este script: (1) hashea las contraseñas server-side vía trigger (bcrypt,
-- mismo patrón que admin_users / pos_pin), (2) crea RPCs de verificación
-- security-definer (mismo patrón que verificar_login_sponsor), (3) quita el
-- SELECT de las columnas de secreto para el rol anon.
--
-- Idempotente. Correr en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── 1. ORGANIZADORES ────────────────────────────────────────────────────────

alter table public.organizadores add column if not exists password_hash text;

create or replace function public.hash_organizador_password() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.password is not null and new.password <> '' then
    new.password_hash := crypt(new.password, gen_salt('bf'));
  end if;
  new.password := null;               -- el texto plano nunca se persiste
  return new;
end;
$$;

drop trigger if exists trg_hash_organizador_password on public.organizadores;
create trigger trg_hash_organizador_password
  before insert or update on public.organizadores
  for each row execute function public.hash_organizador_password();

-- hashea cualquier fila que hoy tenga la contraseña en texto plano
update public.organizadores
  set password_hash = crypt(password, gen_salt('bf'))
  where password is not null and password <> '' and password_hash is null;
update public.organizadores set password = null where password is not null;

create or replace function public.verificar_login_organizador(
  p_world_id text, p_usuario text, p_password text
) returns table(id uuid, world_id text, nombre text, usuario text)
language sql security definer set search_path = public, extensions as $$
  select o.id, o.world_id, o.nombre, o.usuario
  from public.organizadores o
  where o.world_id = p_world_id
    and o.usuario = p_usuario
    and lower(coalesce(o.estado, 'activo')) <> 'inactivo'
    and o.password_hash is not null
    and o.password_hash = crypt(p_password, o.password_hash)
  limit 1;
$$;
grant execute on function public.verificar_login_organizador(text, text, text) to anon, authenticated;

-- ── 2. PANEL DE MERCHANT (usuario/contraseña, distinto del PIN de POS) ──────

alter table public.merchants add column if not exists panel_usuario text;
alter table public.merchants add column if not exists panel_password text;       -- transitorio: el trigger lo hashea y anula
alter table public.merchants add column if not exists panel_password_hash text;

create or replace function public.hash_merchant_panel_password() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.panel_password is not null and new.panel_password <> '' then
    new.panel_password_hash := crypt(new.panel_password, gen_salt('bf'));
  end if;
  new.panel_password := null;
  return new;
end;
$$;

drop trigger if exists trg_hash_merchant_panel_password on public.merchants;
create trigger trg_hash_merchant_panel_password
  before insert or update on public.merchants
  for each row execute function public.hash_merchant_panel_password();

create or replace function public.verificar_login_merchant(
  p_world_id text, p_usuario text, p_password text
) returns table(id uuid, world_id text, name text, panel_usuario text)
language sql security definer set search_path = public, extensions as $$
  select m.id, m.world_id, m.name, m.panel_usuario
  from public.merchants m
  where m.world_id = p_world_id
    and m.panel_usuario = p_usuario
    and lower(coalesce(m.status, 'activo')) not in ('suspendido', 'inactivo')
    and m.panel_password_hash is not null
    and m.panel_password_hash = crypt(p_password, m.panel_password_hash)
  limit 1;
$$;
grant execute on function public.verificar_login_merchant(text, text, text) to anon, authenticated;

-- ── 3. Sacar los secretos del alcance del rol anon ─────────────────────────
-- La anon key es pública (va en el bundle). Ninguna de estas columnas debe
-- ser legible con ella. Las RPCs de arriba (security definer) sí las leen.
-- PostgREST con privilegios de columna filtra las columnas no permitidas de
-- un select=* en vez de fallar, así que esto no rompe las lecturas normales.

revoke select (password, password_hash) on public.organizadores from anon;
revoke select (panel_password, panel_password_hash) on public.merchants from anon;
revoke select (pos_pin, pos_pin_hash) on public.merchants from anon;
revoke select (pos_pin, pos_pin_hash) on public.worlds from anon;
revoke select (sponsor_password) on public.worlds from anon;

notify pgrst, 'reload schema';
