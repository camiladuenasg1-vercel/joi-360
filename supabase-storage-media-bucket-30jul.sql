-- ============================================================================
-- JOI360 · Bucket de Storage "joi360-media" (30-jul)
-- Primer uso real de Supabase Storage en el proyecto: contratos PDF, foto de
-- perfil de comercio, imágenes de producto. Antes, logoUrl de un mundo era un
-- data-URI local, nunca un archivo real subido.
-- Aplicado y verificado en producción (kobtxrhycaloyjkeyspv) el 30-jul-2026.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('joi360-media', 'joi360-media', true)
on conflict (id) do nothing;

drop policy if exists demo_read_joi360_media on storage.objects;
create policy demo_read_joi360_media on storage.objects
  for select to anon, authenticated using (bucket_id = 'joi360-media');

drop policy if exists demo_write_joi360_media on storage.objects;
create policy demo_write_joi360_media on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'joi360-media');

drop policy if exists demo_update_joi360_media on storage.objects;
create policy demo_update_joi360_media on storage.objects
  for update to anon, authenticated using (bucket_id = 'joi360-media');

-- Convención de paths usada por uploadArchivo() en supabase.js:
--   contratos/<timestamp>-<nombre-archivo>.pdf
--   comercios/<merchant_id>-<timestamp>.<ext>       (foto de perfil del comercio)
--   productos/<merchant_id>-<timestamp>-<nombre>.<ext>  (foto de producto)
