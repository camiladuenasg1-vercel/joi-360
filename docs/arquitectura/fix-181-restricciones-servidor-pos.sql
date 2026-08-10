-- Task #181 (hallado en auditoría E2E multi-rol, ago-2026): las restricciones
-- por dependiente (Task #173 — horario, límite diario) solo se validaban en
-- el cliente (joi360-app/src/pages/Module.jsx, bloqueadoPorRestriccion). Todo
-- cobro real en un comercio pasa por mover_saldo_wallet() vía el POS físico
-- (joi-pos-backend/routes/shop-charge.js) o el panel Cobrar del comercio
-- (joi360-admin cobrarPOSRemote) — NINGUNO de esos dos caminos pasa por la
-- superapp, así que una pulsera NFC de un dependiente, tocada en cualquier
-- lector, saltaba por completo el horario y el límite diario configurados
-- por su tutor. Esta función es el único camino real para mover saldo (ver
-- fix-114-rpc-wallet-balance.sql) — es el lugar correcto para el candado,
-- porque cualquier cliente presente o futuro queda cubierto automáticamente.
--
-- Alcance: solo horario_inicio/horario_fin y limite_diario (ambos son checks
-- puramente numéricos/de tiempo, no necesitan saber qué se está comprando).
-- productos_bloqueados NO se agrega acá — el RPC solo recibe wallet/monto,
-- no los items del carrito, así que bloquear por producto server-side
-- requeriría propagar el product_id hasta acá desde los 3 frentes que cobran
-- (cambio más grande, fuera de este fix puntual). Sigue enforced solo en la
-- superapp por ahora — gap conocido, no resuelto por esta migración.
--
-- Solo aplica a p_tipo = 'compra' (débito por compra real). Recargas y
-- transferencias P2P nunca se restringen por este mecanismo.

create or replace function public.mover_saldo_wallet(
  p_wallet_id uuid,
  p_delta numeric,
  p_tipo text,
  p_world_id text,
  p_merchant_id uuid default null,
  p_channel_id text default null,
  p_reference text default null,
  p_turno_id uuid default null
)
returns table (nuevo_saldo numeric, ok boolean, motivo text)
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_saldo_actual numeric;
  v_nuevo_saldo numeric;
  v_user_id uuid;
  v_restriccion record;
  v_hora_lima time;
  v_hoy_lima date;
  v_gastado_hoy numeric;
begin
  -- Lock de fila: dos cobros simultáneos contra la misma wallet no pueden
  -- leer el mismo saldo viejo y pisarse uno al otro.
  select balance, user_id into v_saldo_actual, v_user_id from wallets where id = p_wallet_id for update;

  if v_saldo_actual is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
  end if;

  -- Restricciones por dependiente — solo para compras (débitos reales de
  -- consumo), nunca para recargas o transferencias.
  if p_tipo = 'compra' and p_delta < 0 then
    select * into v_restriccion from dependent_restrictions
      where dependent_user_id = v_user_id and world_id = p_world_id
      limit 1;

    if found then
      v_hora_lima := (now() at time zone 'America/Lima')::time;
      v_hoy_lima := (now() at time zone 'America/Lima')::date;

      if v_restriccion.horario_inicio is not null and v_restriccion.horario_fin is not null then
        if v_restriccion.horario_inicio::time <= v_restriccion.horario_fin::time then
          if not (v_hora_lima between v_restriccion.horario_inicio::time and v_restriccion.horario_fin::time) then
            return query select v_saldo_actual, false, 'FUERA_DE_HORARIO';
            return;
          end if;
        else
          -- rango que cruza medianoche (ej. 22:00-06:00)
          if not (v_hora_lima >= v_restriccion.horario_inicio::time or v_hora_lima <= v_restriccion.horario_fin::time) then
            return query select v_saldo_actual, false, 'FUERA_DE_HORARIO';
            return;
          end if;
        end if;
      end if;

      if v_restriccion.limite_diario is not null then
        select coalesce(sum(amount), 0) into v_gastado_hoy
          from transactions
          where wallet_id = p_wallet_id and type = 'compra' and status = 'completada'
            and (created_at at time zone 'America/Lima')::date = v_hoy_lima;

        if v_gastado_hoy + abs(p_delta) > v_restriccion.limite_diario then
          return query select v_saldo_actual, false, 'LIMITE_DIARIO_EXCEDIDO';
          return;
        end if;
      end if;
    end if;
  end if;

  v_nuevo_saldo := v_saldo_actual + p_delta;

  if v_nuevo_saldo < 0 then
    return query select v_saldo_actual, false, 'SALDO_INSUFICIENTE';
    return;
  end if;

  update wallets set balance = v_nuevo_saldo where id = p_wallet_id;

  insert into transactions (wallet_id, world_id, merchant_id, channel_id, amount, type, status, reference, turno_id)
  values (p_wallet_id, p_world_id, p_merchant_id, p_channel_id, abs(p_delta), p_tipo, 'completada', p_reference, p_turno_id);

  return query select v_nuevo_saldo, true, null::text;
end;
$func$;

grant execute on function public.mover_saldo_wallet(uuid, numeric, text, text, uuid, text, text, uuid) to anon, authenticated;

-- Mensajes claros para los 2 nuevos motivos de rechazo, mismo catálogo que ya
-- usa el resto de errores controlados (errorControlado() en ambos frontends).
insert into public.error_catalog (code, titulo, mensaje, accion, severidad)
values
  ('restriccion_horario', 'Fuera del horario permitido', 'Este dependiente solo puede consumir dentro del horario que fijó su tutor.', 'Vuelve a intentarlo dentro del horario habilitado, o pide al tutor que lo ajuste desde Restricciones en la app.', 'warning'),
  ('restriccion_limite_diario', 'Límite diario alcanzado', 'Este dependiente ya alcanzó el límite de consumo diario que fijó su tutor.', 'El límite se reinicia mañana, o el tutor puede ajustarlo desde Restricciones en la app.', 'warning')
on conflict (code) do update set titulo = excluded.titulo, mensaje = excluded.mensaje, accion = excluded.accion, severidad = excluded.severidad;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Verificación: debe devolver 1 fila.
select proname, pronargs from pg_proc where proname = 'mover_saldo_wallet';
