-- Turnos de Control de Accesos. Hoy el operador solo registra entradas/
-- salidas sueltas (access_log) — no hay forma de saber cuándo alguien tomó
-- el puesto de portería ni cuándo lo dejó. Esta tabla agrega esa ventana de
-- turno, por mundo y por zona (misma zona ya usada en access_log), visible
-- en el panel de monitoreo del mundo.

create table if not exists public.access_shifts (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  zona text,
  operador_nombre text,
  inicio_at timestamptz not null default now(),
  fin_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.access_shifts enable row level security;
drop policy if exists "demo_anon_all" on public.access_shifts;
create policy "demo_anon_all" on public.access_shifts for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
