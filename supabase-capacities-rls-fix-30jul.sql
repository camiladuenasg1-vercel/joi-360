-- ============================================================================
-- JOI360 · Fix: RLS de escritura en `capacities` (30-jul)
-- Síntoma reportado: "hay un error de sync al publicar catálogo en app".
-- Causa: `capacities` tenía RLS habilitado sin policy de escritura para
-- anon/authenticated — el botón "Publicar catálogo en la app" (Catalogo.jsx)
-- podía leer pero no podía hacer upsert.
-- Aplicado y verificado en producción (kobtxrhycaloyjkeyspv) el 30-jul-2026.
-- ============================================================================

create policy demo_all_capacities on public.capacities for all to anon, authenticated using (true) with check (true);
