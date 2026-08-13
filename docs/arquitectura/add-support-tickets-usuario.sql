-- Canal de soporte para atencion al usuario (13-ago-2026): support_tickets
-- no tenia forma de atribuir un ticket a la persona real que lo genero desde
-- la superapp -- sin esto, una solicitud de devolucion no tiene a que wallet
-- acreditarsela sin leer el texto libre a mano. user_id es el mismo codigo
-- sintetico (getSyntheticUserId) que ya identifica al usuario en wallets/
-- transactions/dependents -- mismo patron, ninguna tabla nueva.
alter table public.support_tickets add column if not exists user_id text;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'support_tickets'
order by column_name;
