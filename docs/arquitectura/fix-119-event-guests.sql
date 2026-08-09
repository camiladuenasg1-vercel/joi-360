-- Bandita de evento con saldo pre-cargado y lista de asistencia (Task #119).
-- Distinto del flujo de vinculación que ya existe (#118): ese asume que la
-- persona ya tiene cuenta registrada en la app antes de tocar el POS. Acá el
-- invitado puede no tener cuenta — la bandita necesita funcionar igual.
-- Diseño completo en docs/arquitectura/03-diseno-cashin-evento.md.
--
-- Reuso deliberado: cero cambios a wallets/transactions/nfc_bands/
-- mover_saldo_wallet. El invitado es una wallet más (user_id sintético,
-- igual patrón que un dependiente), así que cobro/consumo ya funcionan sin
-- tocar nada — solo hace falta el registro de la lista y el vínculo.

create table if not exists public.event_guest_lists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  world_id text not null,
  nombre_archivo text,
  importado_at timestamptz not null default now(),
  importado_por text
);

create table if not exists public.event_guests (
  id uuid primary key default gen_random_uuid(),
  guest_list_id uuid not null references public.event_guest_lists(id) on delete cascade,
  event_id uuid not null,
  world_id text not null,
  nombre text not null,
  documento text not null,
  guest_user_id uuid not null,
  user_id_real uuid,
  bandita_codigo text,
  saldo_inicial numeric not null default 0,
  estado text not null default 'invitado', -- invitado | bandita_asignada | activo | cerrado
  vence_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, documento)
);

alter table public.event_guest_lists enable row level security;
alter table public.event_guests enable row level security;
drop policy if exists "demo_anon_all" on public.event_guest_lists;
drop policy if exists "demo_anon_all" on public.event_guests;
create policy "demo_anon_all" on public.event_guest_lists for all to anon, authenticated using (true) with check (true);
create policy "demo_anon_all" on public.event_guests for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
