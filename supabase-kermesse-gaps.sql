-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Cierre Caso Kermesse: hardware por evento (#64/#73), cronograma real
-- (#66/#78), foto del evento (#75), reingresos reales (#79).
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

-- #64/#73 — pos_devices no tenía forma de vincularse a un evento (solo a
-- world_id + merchant_id, sin concepto temporal). Soft-link sin FK, mismo
-- patrón que event_merchants/dependents.
alter table public.pos_devices add column if not exists event_id text;

-- #75 — EventoDrawer ya recolectaba imagenUrl en el formulario, pero
-- adminEvToRemote() lo descartaba en silencio porque la columna no existía.
alter table public.events add column if not exists imagen_url text;

-- #66/#78 — no existía NINGÚN cronograma real por evento; EventoAgendaSection
-- en la app renderizaba 3 items hardcodeados idénticos para todo evento.
create table if not exists public.event_agenda_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null,
  hora        text,
  titulo      text not null,
  descripcion text,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.event_agenda_items enable row level security;
drop policy if exists "demo_anon_all" on public.event_agenda_items;
create policy "demo_anon_all" on public.event_agenda_items for all to anon, authenticated using (true) with check (true);

-- #79 — checkin_at/checkout_at en event_tickets son valores únicos: un ticket
-- que hace checkout queda congelado para siempre, sin poder reingresar. Log
-- de eventos de escaneo aparte, en vez de repensar el schema de event_tickets.
create table if not exists public.event_checkin_log (
  id         uuid primary key default gen_random_uuid(),
  event_id   text not null,
  ticket_id  text not null,
  tipo       text not null check (tipo in ('ingreso', 'salida')),
  created_at timestamptz not null default now()
);
alter table public.event_checkin_log enable row level security;
drop policy if exists "demo_anon_all" on public.event_checkin_log;
create policy "demo_anon_all" on public.event_checkin_log for all to anon, authenticated using (true) with check (true);
