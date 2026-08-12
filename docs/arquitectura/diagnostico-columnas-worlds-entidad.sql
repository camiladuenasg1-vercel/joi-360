-- Diagnostico de solo lectura: confirma los nombres reales de columna en
-- worlds para entidad legal/RUC/pais/direccion/descripcion, y el valor
-- actual de Jockey Plaza para esas columnas.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'worlds'
order by column_name;
