-- Migración: canales de recarga presencial (efectivo / tarjeta presente en POS)
-- Gap: la recarga de billetera solo tenía canales self-service de la app
-- (QR/tarjeta online/transferencia). Ahora el operador de un comercio puede
-- recargar la billetera de un cliente ya identificado con efectivo o tarjeta
-- física en su propio POS (CobrarPanel, modo "Recargar billetera").
-- global_active=false a propósito: estas 2 filas existen solo para satisfacer
-- la FK transactions.channel_id -> emission_channels; no deben aparecer en el
-- catálogo self-service que la app renderiza en el tab "Recargar" (esa lista
-- ya filtra por channel_enabled en world_channel_configs, que estos canales
-- nunca reciben).

insert into public.emission_channels (id, name, channel_type, global_active)
values
  ('efectivo', 'Efectivo (POS)', 'presencial', false),
  ('tarjeta_presente', 'Tarjeta presente (POS)', 'presencial', false)
on conflict (id) do nothing;
