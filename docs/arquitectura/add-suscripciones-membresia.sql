-- Suscripciones — modelo de membresía real, no solo el cargo por vincular
-- dependiente (Task #174, subscription_plans, que sigue intacto y sin
-- tocar). Pedido explícito de Camila (20-ago): que el MUNDO (no solo
-- RedPontis) pueda crear sus propios planes con marca propia (banner,
-- logo, color exacto), categoría de beneficio (empieza por "sorteo": qué
-- productos entran y cuándo es el sorteo), comercios afiliados al plan, y
-- que el cobro sea de verdad recurrente (mensual/anual), no una cuota
-- única. Referencia de producto: modelo YOKI.
--
-- metodo_pago hoy solo admite 'saldo_wallet' (el único real) — el campo
-- queda abierto a valores futuros (ej. 'yape_recurrente') a propósito,
-- pero esa integración NO se construye en este cambio.

-- 1) Branding + taxonomía de beneficio sobre el plan ya existente.
alter table public.subscription_plans add column if not exists banner_url text;
alter table public.subscription_plans add column if not exists logo_url text;
alter table public.subscription_plans add column if not exists color_hex text;
alter table public.subscription_plans add column if not exists categoria_beneficio text
  check (categoria_beneficio in ('sorteo','descuento','acceso','producto','otro'));
-- beneficio_detalle: {"productos": ["..."], "fecha_sorteo": "2026-09-01"} para
-- categoria_beneficio='sorteo'; {"texto": "..."} para el resto.
alter table public.subscription_plans add column if not exists beneficio_detalle jsonb;

-- 2) Comercios afiliados a un plan (qué comercios honran ese beneficio).
create table if not exists public.subscription_plan_merchants (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  merchant_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (plan_id, merchant_id)
);
alter table public.subscription_plan_merchants enable row level security;
create policy demo_all_subscription_plan_merchants on public.subscription_plan_merchants
  for all to anon, authenticated using (true) with check (true);

-- 3) Quién está suscrito de verdad, con cobro recurrente real (a diferencia
-- de subscription_plans, que hoy solo describe la OFERTA de plan, no
-- quién la tomó ni cuándo toca el próximo cobro).
create table if not exists public.subscription_suscriptores (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  plan_id uuid not null references public.subscription_plans(id),
  user_id text not null,
  estado text not null default 'activa' check (estado in ('activa','pausada','cancelada')),
  metodo_pago text not null default 'saldo_wallet',
  fecha_inicio date not null default current_date,
  proxima_fecha_cobro date not null default current_date,
  ultimo_cobro_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, user_id)
);
alter table public.subscription_suscriptores enable row level security;
create policy demo_all_subscription_suscriptores on public.subscription_suscriptores
  for all to anon, authenticated using (true) with check (true);

create index if not exists idx_subscription_suscriptores_cobro
  on public.subscription_suscriptores(proxima_fecha_cobro) where estado = 'activa';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

select table_name from information_schema.tables
where table_name in ('subscription_plan_merchants','subscription_suscriptores');
