-- Migración: BNPL — % máximo de mora (Límites del Mundo) + Plan de Pagos configurable (Comercio)
-- Spec: Especificacion_Flujos_UX_RedPontis - NUEVA VERSIÓN A Implementar.docx
--   "Límites Máximos BNPL" (Mundo)          -> Porcentaje máximo de mora
--   "Configuración del Plan de Pagos" (Comercio) -> Frecuencia de cobro, Días de gracia
-- Aditiva e idempotente: solo agrega columnas nullable/con default, sin tocar filas existentes.

alter table public.bnpl_programa_comercio
  add column if not exists mora_pct numeric default 0,
  add column if not exists frecuencia text default 'mensual',
  add column if not exists dias_personalizados integer,
  add column if not exists dias_gracia integer;
