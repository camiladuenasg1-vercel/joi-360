-- ============================================================================
-- JOI360 · Fotos reales de comercio y producto (30-jul)
-- products.image_url y merchants.photo_url — suben al bucket joi360-media
-- (ver supabase-storage-media-bucket-30jul.sql) y se leen en vivo en el
-- carrusel de comercios y el marketplace de joi360-app.
-- Aplicado y verificado en producción (kobtxrhycaloyjkeyspv) el 30-jul-2026.
-- ============================================================================

alter table products add column if not exists image_url text;
alter table merchants add column if not exists photo_url text;
