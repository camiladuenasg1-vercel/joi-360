-- Limpieza de los 2 lotes de liquidación fantasma generados automáticamente
-- para los mundos demo "mundo-raimondi"/"mundo-jockey-plaza" (ya eliminados
-- de la tabla worlds — eran artefacto de una prueba en un deploy preview
-- que compartía el mismo Supabase que producción, no data real).

delete from public.liquidaciones where world_id in ('mundo-raimondi', 'mundo-jockey-plaza');
