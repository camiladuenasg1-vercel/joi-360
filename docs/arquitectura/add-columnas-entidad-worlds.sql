-- Agrega a `worlds` las columnas que el wizard de creación de mundo (Mundos.jsx)
-- ya capturaba y validaba como obligatorias (RUC + Entidad legal, paso 2),
-- pero que worldRow() nunca incluia en el upsert a Supabase -- vivian solo
-- en el localStorage de la pestaña que creo el mundo. Ver joi360-admin/src/
-- supabase.js#worldRow y MundoDetail.jsx#FichaMundoCard.
alter table public.worlds add column if not exists entidad_legal text;
alter table public.worlds add column if not exists ruc text;
alter table public.worlds add column if not exists pais text;
alter table public.worlds add column if not exists direccion_legal text;
alter table public.worlds add column if not exists descripcion text;
alter table public.worlds add column if not exists banco text;
alter table public.worlds add column if not exists cci text;

-- Verificacion: deben aparecer las 7 columnas nuevas
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'worlds'
  and column_name in ('entidad_legal','ruc','pais','direccion_legal','descripcion','banco','cci')
order by column_name;
