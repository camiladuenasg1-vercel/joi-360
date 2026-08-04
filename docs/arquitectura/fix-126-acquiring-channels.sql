-- Task #126: Adquirencia.jsx (Catálogos Globales → Medios de aceptación) no
-- importaba supabase.js — CANALES_ADQUIRENCIA/REDES_PAGO son arrays
-- estáticos y los canales configurados ahí (st.adqChannels) solo vivían en
-- localStorage de quien los editó. Nadie más los veía nunca. Mismo patrón ya
-- probado con emission_channels (Emisión/Recargas): la tabla es el espejo
-- real de lo que el admin configura, para que cualquier consumidor futuro
-- (o el propio admin desde otra sesión) lea el dato real, no localStorage.

create table if not exists public.acquiring_channels (
  id               text primary key,
  name             text not null,
  icon             text,
  description      text,
  settlement_policy text,
  mdr              numeric(6,3) not null default 0,
  fijo_tx          numeric(10,2) not null default 0,
  networks         jsonb not null default '[]'::jsonb,
  global_active    boolean not null default true,
  updated_at       timestamptz not null default now()
);

alter table public.acquiring_channels enable row level security;
do $$ begin
  create policy demo_all_acquiring_channels on public.acquiring_channels
    for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
