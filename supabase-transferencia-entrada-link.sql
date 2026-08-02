-- Migración: transferir entrada por enlace/invitación (Gantt #65)
-- Gap: transferirEntradaRemote ya existía pero solo por "código JOI" tecleado
-- a mano (el emisor debía conocer de antemano el código exacto del
-- destinatario). Se agrega un mecanismo de enlace: el emisor genera un token
-- de un solo uso, lo comparte (WhatsApp/copiar enlace), y quien lo abre
-- reclama la entrada en su propia cuenta sin necesitar el código de nadie.

alter table public.event_tickets
  add column if not exists transfer_token text unique,
  add column if not exists transfer_created_at timestamptz;
