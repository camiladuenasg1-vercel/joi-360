-- Task #122 (auditoría E2E de Raimondi): el acuerdo comercial de un mundo
-- (m.acuerdo — tipo, revenue share, fijo mensual, vigencia, frecuencia de
-- liquidación) vivía SOLO en el localStorage de la sesión de admin que creó
-- el mundo. Otra pestaña, otro navegador, u otro admin nunca lo veían — y
-- Liquidación caía en su default silencioso (5% transaccional) sin que
-- nadie lo hubiera pactado. Esta columna es donde ahora vive de verdad.

alter table public.worlds add column if not exists acuerdo jsonb;

notify pgrst, 'reload schema';
