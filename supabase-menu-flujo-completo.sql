-- Migración: Flujo de Menú completo (Gantt nuevo, Caso Raimondi + genérico)
-- Antes: "Menú" reusaba la tabla generica `products` (sin dia/recurrencia,
-- sin alergenos) y el checkout no cotejaba alergias del beneficiario ni
-- aplicaba el limite diario del dependiente (limiteDiarioPerfil vivia como
-- config muerta, nunca leida). Diseñado GENERICO a proposito -- cualquier
-- mundo con un caso de "menu del dia con recurrencia semanal" puede usarlo,
-- no es especifico a colegios.

-- Catálogo de platos del merchant (distinto de `products`, que sigue
-- sirviendo la vitrina general de compras puntuales).
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  merchant_id text not null,
  nombre text not null,
  descripcion text,
  precio numeric not null,
  categoria text,
  alergenos jsonb not null default '[]'::jsonb,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.menu_items enable row level security;
drop policy if exists "demo_anon_all" on public.menu_items;
create policy "demo_anon_all" on public.menu_items for all to anon, authenticated using (true) with check (true);

-- Programación: qué día(s) de la semana se ofrece cada plato (recurrencia).
-- dia_semana: 0=domingo .. 6=sábado (igual que Date.getDay() en JS).
create table if not exists public.menu_programacion (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  merchant_id text not null,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  cupos_max integer,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.menu_programacion enable row level security;
drop policy if exists "demo_anon_all" on public.menu_programacion;
create policy "demo_anon_all" on public.menu_programacion for all to anon, authenticated using (true) with check (true);

-- Reserva real: un beneficiario (titular o dependiente) reserva/compra
-- platos para un día futuro concreto. Distinto de una compra puntual.
create table if not exists public.menu_reservas (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  merchant_id text not null,
  merchant_nombre text,
  beneficiario_user_id text not null,
  beneficiario_nombre text,
  fecha date not null,
  items jsonb not null,
  monto numeric not null,
  estado text not null default 'CONFIRMADA',
  created_at timestamptz not null default now()
);
alter table public.menu_reservas enable row level security;
drop policy if exists "demo_anon_all" on public.menu_reservas;
create policy "demo_anon_all" on public.menu_reservas for all to anon, authenticated using (true) with check (true);

-- Alertas reales al padre/superusuario cuando se bloquea un intento de
-- reserva (límite diario excedido o alérgeno detectado) -- antes
-- notificacionConsumoRealTime era una config sin ningún efecto real.
create table if not exists public.consumo_alertas (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  guardian_user_id text not null,
  dependent_user_id text,
  dependent_nombre text,
  tipo text not null,
  mensaje text not null,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.consumo_alertas enable row level security;
drop policy if exists "demo_anon_all" on public.consumo_alertas;
create policy "demo_anon_all" on public.consumo_alertas for all to anon, authenticated using (true) with check (true);
