-- ═══════════════════════════════════════════════════════════════════════
-- Usuarios reales del superapp + avisos al apoderado
-- ═══════════════════════════════════════════════════════════════════════
--
-- Dos piezas que se apoyan en la misma decisión: los datos sensibles no
-- viven en una tabla que la llave anónima pueda leer.
--
--   · El correo y el número de documento quedan en auth.users, que Supabase
--     ya protege: nadie los lee con la anon key, ni desde el panel ni desde
--     el navegador de un curioso. Ahí siguen estando para soporte, con la
--     llave de servicio, el día que haya que asistir a alguien.
--   · app_profiles guarda solo lo que RedPontis necesita ver de corrido:
--     nombre, apellidos, tipo de documento y las versiones enmascaradas.
--
-- Enmascarar en la columna y no en el front es a propósito: si el dato
-- completo nunca sale de la base, no hay pantalla, log ni export que lo
-- pueda filtrar por descuido.

-- ── 1) Avisos dirigidos a una persona ──────────────────────────────────
-- world_alerts ya existe pero le habla al mundo. Un ingreso al colegio le
-- habla al apoderado, que es alguien concreto.
create table if not exists public.user_notifications (
  id            uuid primary key default gen_random_uuid(),
  world_id      text not null,
  user_id       text not null,          -- destinatario: el apoderado
  sujeto_id     text,                   -- de quién habla el aviso
  tipo          text not null,          -- acceso_ingreso | acceso_salida | ...
  titulo        text not null,
  mensaje       text not null,
  referencia_id text,
  leida         boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists user_notifications_destinatario_idx
  on public.user_notifications (user_id, world_id, created_at desc);

alter table public.user_notifications enable row level security;
drop policy if exists demo_all_user_notifications on public.user_notifications;
create policy demo_all_user_notifications on public.user_notifications
  for all to anon, authenticated using (true) with check (true);

-- ── 2) Perfil visible del usuario del superapp ─────────────────────────
create table if not exists public.app_profiles (
  id          uuid primary key,          -- mismo id que auth.users
  nombres     text not null,
  apellidos   text not null,
  doc_tipo    text not null,             -- DNI | PASAPORTE | CARNET_EXT
  doc_mask    text not null,             -- ••••5678
  email_mask  text not null,             -- ma•••@gmail.com
  created_at  timestamptz not null default now()
);

alter table public.app_profiles enable row level security;
drop policy if exists demo_all_app_profiles on public.app_profiles;
create policy demo_all_app_profiles on public.app_profiles
  for all to anon, authenticated using (true) with check (true);

-- La pertenencia a un mundo no necesita tabla nueva: wallets(user_id,
-- world_id) ya la describe, y es la misma fila que sostiene el saldo. Un
-- índice para que el listado por mundo no recorra la tabla entera.
create index if not exists wallets_world_user_idx
  on public.wallets (world_id, user_id);

-- ── 3) La zona deja de ser obligatoria en accesos ──────────────────────
-- El alcance hoy es entrar y salir del recinto: no hay áreas internas.
alter table public.access_log alter column zona drop not null;
