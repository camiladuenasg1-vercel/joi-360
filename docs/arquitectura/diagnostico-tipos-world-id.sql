-- Diagnostico de solo lectura: no borra ni cambia nada. Lista el tipo real
-- de cada columna world_id/id/event_id/ticket_id relevante para el script
-- de borrado, asi el script final no falla mas por sorpresas de tipo.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    column_name in ('world_id', 'event_id', 'ticket_id')
    or (column_name = 'id' and table_name in ('worlds', 'events', 'event_tickets'))
  )
order by table_name, column_name;
