-- Bug real confirmado (curl directo): la tabla `products` bloquea el INSERT
-- por RLS ("new row violates row-level security policy") aunque el SELECT
-- sí funciona — por eso "Mi catálogo" nunca lograba agregar un producto en
-- ningún comercio, no era un bug de código sino de policy faltante/rota.
-- Mismo patrón demo_anon_all que ya usan las demás tablas del proyecto.

alter table public.products enable row level security;
drop policy if exists "demo_anon_all" on public.products;
create policy "demo_anon_all" on public.products for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
