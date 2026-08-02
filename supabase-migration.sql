-- ============================================================================
-- JOI360 · Migración Demo E2E (viernes 17 jul 2026)
-- Documento Maestro Build v2.0 — Casos: Raimondi, Kermesse, Mok/BNPL
-- Ejecutar UNA vez en Supabase (SQL Editor o Management API).
-- Idempotente: seguro re-ejecutar.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. MOTOR DE EVENTOS (Caso 3 — Kermesse)
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id            text primary key,
  world_id      text not null references public.worlds(id) on delete cascade,
  organizador   text,
  titulo        text not null,
  descripcion   text,
  tipo          text not null default 'kermesse',          -- catálogo completo de tipos: R2
  categoria     text,
  fecha         date,
  hora          text,
  lugar         text,
  aforo_total   integer not null default 0,
  aforo_tipo    text not null default 'general',           -- general | zonas
  privado       boolean not null default false,            -- Rules Engine: privado → oculto en marketplace
  estado        text not null default 'BORRADOR',          -- BORRADOR | PUBLICADO | FINALIZADO | CANCELADO
  moneda        text not null default 'PEN',
  -- Piloto Schema Registry / Render Engine (doc §1): qué secciones renderiza
  -- la app y en qué orden. La app resuelve cada entrada contra su registry.
  ux_components jsonb not null default '["hero","entradas","agenda","marketplace"]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.event_ticket_types (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references public.events(id) on delete cascade,
  nombre          text not null,
  descripcion     text,
  precio          numeric not null default 0,
  moneda          text not null default 'PEN',
  cupos           integer not null default 0,
  min_por_compra  integer not null default 1,
  max_por_compra  integer not null default 4,
  venta_desde     timestamptz,
  venta_hasta     timestamptz,
  validacion      text not null default 'QR',
  created_at      timestamptz not null default now()
);

create table if not exists public.event_tickets (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references public.events(id) on delete cascade,
  ticket_type_id  uuid not null references public.event_ticket_types(id) on delete cascade,
  world_id        text not null,
  user_id         text not null,
  qr_code         text not null,
  precio          numeric not null default 0,
  estado          text not null default 'emitido',          -- emitido | checkin | checkout | anulado
  checkin_at      timestamptz,
  checkout_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_event_tickets_event  on public.event_tickets(event_id);
create index if not exists idx_event_tickets_user   on public.event_tickets(user_id, world_id);
create index if not exists idx_events_world         on public.events(world_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. BNPL (Caso 1 — Mok / Hiraoka)
-- ────────────────────────────────────────────────────────────────────────────

-- Programa del Comercio (Nivel comercio, clamped al techo del Mundo)
create table if not exists public.bnpl_programa_comercio (
  id                      uuid primary key default gen_random_uuid(),
  world_id                text not null references public.worlds(id) on delete cascade,
  merchant_id             text not null,
  merchant_nombre         text,
  cuotas_activas          integer[] not null default '{3}',
  comision_pct            numeric not null default 5,       -- comisión sobre venta financiada
  revenue_share_pct       numeric not null default 30,      -- revenue share del margen para el mundo
  productos_financiables  jsonb not null default '[]'::jsonb, -- [{id,nombre,precio,categoria}]
  gestion_mora            text not null default 'sin_cargo_suspension', -- sin_cargo_suspension | con_cargo
  activo                  boolean not null default true,
  created_at              timestamptz not null default now(),
  unique (world_id, merchant_id)
);

-- Operación / Contratos (contrato digital + cronograma al momento de la venta)
create table if not exists public.bnpl_contratos (
  id               uuid primary key default gen_random_uuid(),
  world_id         text not null references public.worlds(id) on delete cascade,
  merchant_id      text,
  merchant_nombre  text,
  user_id          text not null,
  producto         text not null,
  monto            numeric not null,
  cuotas           integer not null,
  dias_gracia      integer not null default 0,
  interes_pct      numeric not null default 0,
  cronograma       jsonb not null default '[]'::jsonb,      -- [{n, fecha, monto, estado}]
  estado           text not null default 'firmado',         -- evaluando|aprobado|rechazado|firmado|en_mora|cerrado
  created_at       timestamptz not null default now()
);

create index if not exists idx_bnpl_contratos_user  on public.bnpl_contratos(user_id, world_id);
create index if not exists idx_bnpl_contratos_world on public.bnpl_contratos(world_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. CONSTRAINTS ÚNICOS para upserts (on_conflict) del panel admin
-- ────────────────────────────────────────────────────────────────────────────

create unique index if not exists uq_wcc_world_capacity on public.world_capacity_configs(world_id, capacity_id);
create unique index if not exists uq_wff_world_flag     on public.world_feature_flags(world_id, flag_id);
create unique index if not exists uq_wchc_world_channel on public.world_channel_configs(world_id, channel_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS — políticas de escritura para el panel admin (demo, clave anon)
--    Los frontends usan la clave anon; para la demo se permite escritura
--    en tablas de configuración de plataforma. Endurecer post-demo.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.events                 enable row level security;
alter table public.event_ticket_types    enable row level security;
alter table public.event_tickets         enable row level security;
alter table public.bnpl_programa_comercio enable row level security;
alter table public.bnpl_contratos        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'events','event_ticket_types','event_tickets',
    'bnpl_programa_comercio','bnpl_contratos',
    'worlds','world_capacity_configs','world_feature_flags',
    'world_channel_configs','merchants','capacity_feature_flags'
  ] loop
    execute format('drop policy if exists "demo_anon_all" on public.%I', t);
    execute format(
      'create policy "demo_anon_all" on public.%I for all to anon, authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. SEED mínimo del demo (idempotente)
-- ────────────────────────────────────────────────────────────────────────────

-- Kiosco de Raimondi (el doc pide cafetería + kiosco; cafetería ya existe)
insert into public.merchants (world_id, name, status, mdr_override, fixed_fee_override)
select 'mundo-raimondi', 'Kiosco Escolar', 'activo', 1.50, 0.10
where not exists (
  select 1 from public.merchants where world_id = 'mundo-raimondi' and name = 'Kiosco Escolar'
);

select 'migración JOI360 demo aplicada' as resultado;
