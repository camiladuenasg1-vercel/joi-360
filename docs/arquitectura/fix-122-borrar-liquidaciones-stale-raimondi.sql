-- Task #122: 3 lotes de liquidación de Colegio Raimondi (mundo-o6mufz)
-- generados ANTES de que el acuerdo comercial real (mixto, 3%, S/0 fijo)
-- quedara grabado hoy. Usaron el default silencioso de generarLiquidacionMundo
-- (5% transaccional + fijo). Uno ya quedaba PROCESADA con una comisión mal
-- calculada (S/53.15 en vez del ~S/1.89 real al 3%). Confirmado con la
-- usuaria: se borran los 3, no representan una liquidación real pactada.

delete from public.liquidaciones
where id in (
  'f6c49d5a-34a3-4f94-9723-4fdfb96b6dc5',  -- 2026-08-03, PENDIENTE, S/0
  '6d2c279a-552f-4cea-a91e-3286836d9f5f',  -- 2026-08-02, PENDIENTE, S/0
  '2d525298-5a6e-4de9-89a8-eef048f58f95'   -- 2026-07-30, PROCESADA, S/63 vol · comisión mal calculada
);

-- Verificación: debe devolver 0 filas.
select id, fecha, estado from public.liquidaciones where world_id = 'mundo-o6mufz';
