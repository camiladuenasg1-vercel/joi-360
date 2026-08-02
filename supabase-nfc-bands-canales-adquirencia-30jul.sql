-- ============================================================================
-- JOI360 · Stock real de banditas NFC + fix de canales de adquirencia (30-jul)
-- ============================================================================

-- 1) nfc_bands — stock real por lote de pulseras NFC. Carga masiva vía CSV
--    desde HardwarePOS.jsx (tab "Banditas NFC"): un código único por línea,
--    agrupado por el nombre de lote elegido antes de adjuntar el archivo.
create table if not exists nfc_bands (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  lote text not null,
  world_id text,
  estado text not null default 'disponible', -- disponible | asignada | bloqueada
  created_at timestamptz not null default now()
);
alter table nfc_bands enable row level security;
create policy demo_all_nfc_bands on public.nfc_bands for all to anon, authenticated using (true) with check (true);

-- 2) world_acquiring_channel_configs — arregla un gap real: los toggles
--    adq_<canal> que el admin guardaba en world_capacity_configs.config se
--    borraban en cada sync (ver el `delete config[k]` de adq_* en
--    syncAllWorlds, supabase.js) y nunca llegaban a ningún lado — por eso
--    "Canales" en la configuración de un mundo siempre mostraba el default
--    del catálogo (CANALES_ADQUIRENCIA en store.js), nunca lo que el admin
--    realmente había elegido. Mismo patrón que world_channel_configs
--    (canales de emisión), ahora simétrico para adquirencia.
create table if not exists world_acquiring_channel_configs (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  channel_id text not null,      -- pos_fisico | tap2phone | qr_estatico | qr_dinamico | bandita_nfc | totem
  channel_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(world_id, channel_id)
);
alter table world_acquiring_channel_configs enable row level security;
create policy demo_all_world_acq_channels on public.world_acquiring_channel_configs for all to anon, authenticated using (true) with check (true);
