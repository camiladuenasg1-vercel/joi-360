-- Migración: Alta de Comercio con campos legales completos + cola de aprobación
-- Spec: "Alta de Comercio" (Admin RP) exige RUC/razón social/apoderado/contacto/
-- banco siempre requerido; "Solicitar Alta de Comercio" (BackOffice Mundo) los
-- envía a una cola de aprobación de RedPontis.
-- Aditiva e idempotente.

alter table public.merchants
  add column if not exists ruc text,
  add column if not exists razon_social text,
  add column if not exists direccion_fiscal text,
  add column if not exists apoderado_nombre text,
  add column if not exists apoderado_documento text,
  add column if not exists apoderado_correo text,
  add column if not exists contacto_nombre text,
  add column if not exists contacto_documento text,
  add column if not exists contacto_correo text,
  add column if not exists banco text,
  add column if not exists cuenta_bancaria text,
  add column if not exists cci text;

create table if not exists public.merchant_requests (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  world_nombre text,
  nombre text not null,
  rubro_id text,
  ruc text,
  razon_social text,
  direccion_fiscal text,
  apoderado_nombre text,
  apoderado_documento text,
  apoderado_correo text,
  contacto_nombre text,
  contacto_documento text,
  contacto_correo text,
  banco text,
  cuenta_bancaria text,
  cci text,
  tarifa numeric,
  fijo_tx numeric,
  pos_solicitados integer default 0,
  estado text not null default 'PENDIENTE',
  created_at timestamptz not null default now()
);
alter table public.merchant_requests enable row level security;
drop policy if exists "demo_anon_all" on public.merchant_requests;
create policy "demo_anon_all" on public.merchant_requests for all to anon, authenticated using (true) with check (true);
