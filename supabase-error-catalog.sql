-- ────────────────────────────────────────────────────────────────────────────
-- JOI360 · Errores controlados en tabla (no mensajes genéricos)
-- error_catalog: cada error conocido tiene código, título, mensaje claro y
-- acción sugerida — los frontends los leen de aquí en vez de hardcodear.
-- error_log: ocurrencias reales para monitoreo (qué error, dónde, cuándo).
-- Idempotente — seguro de re-ejecutar.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.error_catalog (
  code       text primary key,
  titulo     text not null,
  mensaje    text not null,
  accion     text,
  severidad  text not null default 'warning',   -- info | warning | error
  updated_at timestamptz not null default now()
);

create table if not exists public.error_log (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  contexto   text,
  world_id   text,
  origen     text,          -- app | admin
  created_at timestamptz not null default now()
);

create index if not exists idx_error_log_code on public.error_log(code, created_at);

alter table public.error_catalog enable row level security;
alter table public.error_log     enable row level security;

drop policy if exists "demo_anon_all" on public.error_catalog;
create policy "demo_anon_all" on public.error_catalog for all to anon, authenticated using (true) with check (true);
drop policy if exists "demo_anon_all" on public.error_log;
create policy "demo_anon_all" on public.error_log for all to anon, authenticated using (true) with check (true);

insert into public.error_catalog (code, titulo, mensaje, accion, severidad) values
  ('saldo_insuficiente',     'Saldo insuficiente',        'Tu saldo en este mundo no alcanza para completar la operación.',                'Recarga saldo desde el Centro de Pagos e inténtalo de nuevo.',            'warning'),
  ('aforo_lleno',            'Aforo completo',            'El evento alcanzó su aforo máximo y no quedan entradas disponibles.',           'Revisa otros eventos publicados del mundo.',                              'error'),
  ('cupos_agotados',         'Cupos agotados',            'No quedan cupos para este tipo de entrada.',                                    'Elige otro tipo de entrada disponible.',                                  'warning'),
  ('codigo_no_encontrado',   'Código no encontrado',      'El código escaneado no corresponde a una entrada de este evento.',              'Verifica el código o busca la entrada en la lista.',                      'error'),
  ('entrada_ya_usada',       'Entrada ya utilizada',      'Esta entrada ya registró su ingreso al evento.',                                'Si el asistente salió y quiere volver a entrar, regístralo en la lista.', 'warning'),
  ('entrada_completada',     'Visita completada',         'Esta entrada ya completó su visita (registró salida).',                         'El modelo actual no soporta reingresos — emite una entrada nueva.',       'warning'),
  ('entrada_no_transferible','Entrada no transferible',   'Solo puedes transferir entradas emitidas que aún no se usaron.',                null,                                                                      'warning'),
  ('mismo_usuario',          'Código propio',             'El código de destino es el tuyo.',                                              'Ingresa el código JOI de otra persona.',                                  'info'),
  ('transferencia_no_valida','Transferencia no válida',   'No se pudo transferir la entrada con ese código.',                              'Verifica el código JOI del destinatario e inténtalo de nuevo.',           'error'),
  ('wallet_no_encontrada',   'Billetera no encontrada',   'No se encontró una billetera activa con ese código en este mundo.',             'Verifica el código JOI del cliente e inténtalo de nuevo.',                'error'),
  ('comercio_suspendido',    'Compras BNPL suspendidas',  'Este comercio tiene compras BNPL suspendidas por una mora pendiente.',          'Regulariza la cuota vencida para reactivar el servicio.',                 'error')
on conflict (code) do update
  set titulo = excluded.titulo, mensaje = excluded.mensaje,
      accion = excluded.accion, severidad = excluded.severidad, updated_at = now();
