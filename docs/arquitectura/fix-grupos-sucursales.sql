-- Grupos + Sucursales (Task #229) -- Etapa 1: schema + configuracion, SIN
-- tocar todavia ningun flujo de dinero real (wallets/RPC). Eso es la Etapa
-- 2, deliberadamente separada porque toca mover_saldo_wallet y companeros.
--
-- Un Grupo (ej. "Grupo Jockey Plaza") es una entidad liviana propia -- NO es
-- un mundo mas. Guarda la marca del grupo (logo) y la configuracion
-- financiera que sus sucursales heredan: quien EMITE el instrumento
-- (emisor, ej. JetCash), quien ADQUIERE/recauda el dinero de las
-- transacciones (adquirente: RedPontis o la cuenta EDE propia del cliente),
-- y el tipo de producto de wallet (regular o gift card / prepago, como el
-- caso real de Yoki en Jockey Plaza).
--
-- Cada sucursal (Jockey Plaza, Boulevard de Asia, El Outlet) sigue siendo un
-- mundo completo e independiente -- mismo wizard de creacion de siempre,
-- sus propios comercios y capacidades -- pero con grupo_id apuntando al
-- Grupo. comparte_saldo_grupo es una eleccion EXPLICITA por sucursal, no
-- automatica por pertenecer al grupo: el mismo Grupo podria tener una
-- sucursal con saldo compartido y otra completamente independiente, segun
-- lo que se acuerde con cada cliente.

create table if not exists public.grupos (
  id text primary key default ('grupo-' || substr(md5(random()::text), 1, 6)),
  nombre text not null,
  logo_url text,
  emisor text not null default 'JetCash',
  adquirente text not null default 'redpontis' check (adquirente in ('redpontis','cuenta_propia')),
  adquirente_banco text,
  adquirente_cuenta text,
  adquirente_cci text,
  adquirente_titular text,
  tipo_wallet text not null default 'regular' check (tipo_wallet in ('regular','gift_card')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.grupos enable row level security;
create policy if not exists demo_all_grupos on public.grupos for all to anon, authenticated using (true) with check (true);

alter table public.worlds add column if not exists grupo_id text references public.grupos(id);
alter table public.worlds add column if not exists comparte_saldo_grupo boolean not null default false;
