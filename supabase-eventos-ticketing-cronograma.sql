-- Migración: Eventos — campos faltantes de Ticketing y Cronograma
-- Spec: Portal Organizador Ticketing (condición de reingreso, vigencia,
-- preventa/precompra/prereserva) y Cronograma (lugar, expositor, imagen).

alter table public.event_ticket_types
  add column if not exists permite_reingreso boolean default true,
  add column if not exists vigencia_hasta date,
  add column if not exists preventa boolean default false,
  add column if not exists precompra boolean default false,
  add column if not exists prereserva boolean default false;

alter table public.event_agenda_items
  add column if not exists lugar text,
  add column if not exists expositor text,
  add column if not exists imagen_url text;
