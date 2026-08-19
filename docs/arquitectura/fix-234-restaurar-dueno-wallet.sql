-- Task #234 (hallado en la auditoría del Documento Maestro, Discrepancia #1
-- de Severidad Alta): fix-181-restricciones-servidor-pos.sql reescribió
-- mover_saldo_wallet() para agregar el candado de horario/límite diario por
-- dependiente, pero al reescribir el cuerpo completo de la función se
-- olvidó de conservar la validación de dueño que fix-121-rpc-dueno-wallet.sql
-- había agregado antes. Resultado, vigente hasta correr esto: la llave
-- anónima (pública, va en el bundle del navegador) le basta a cualquiera
-- para llamar mover_saldo_wallet con el p_wallet_id de otra persona y mover
-- su saldo real — sin turno de POS abierto ni sesión de esa persona.
--
-- Este fix junta las dos cosas en un solo cuerpo, sin volver a perder
-- ninguna:
--   1) La validación de dueño/turno de fix-121 (self-service: auth.uid()
--      tiene que ser el dueño o el apoderado; POS: turno_id abierto de ESE
--      merchant), aplicada primero.
--   2) El candado de horario/límite diario de fix-181 (solo compras),
--      exactamente igual que antes.
--
-- Mismo nombre/firma que las 2 versiones previas — ningún caller (superapp,
-- admin, POS T6, joi-pos-backend) necesita cambiar nada.

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
  v_wallet_owner text;
  v_guardian text;
  v_auth_uid uuid := auth.uid();
  v_restriccion record;
  v_hora_lima time;
  v_hoy_lima date;
  v_gastado_hoy numeric;
begin
  -- Lock de fila: dos cobros simultáneos contra la misma wallet no pueden
  -- leer el mismo saldo viejo y pisarse uno al otro.
  select balance, user_id::text into v_saldo_actual, v_wallet_owner
  from wallets where id = p_wallet_id for update;

  if v_saldo_actual is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
  end if;

  -- (1) Dueño/turno — restaurado de fix-121.
  if p_turno_id is not null then
    if not exists (
      select 1 from pos_turnos
      where id = p_turno_id and merchant_id = p_merchant_id and estado = 'abierto'
    ) then
      return query select v_saldo_actual, false, 'TURNO_INVALIDO';
      return;
    end if;
  else
    if v_auth_uid is null then
      return query select v_saldo_actual, false, 'NO_AUTENTICADO';
      return;
    end if;
    if v_auth_uid::text != v_wallet_owner then
      select guardian_user_id into v_guardian from dependents where dependent_user_id = v_wallet_owner;
      if v_guardian is null or v_guardian != v_auth_uid::text then
        return query select v_saldo_actual, false, 'NO_AUTORIZADO';
        return;
      end if;
    end if;
  end if;

  -- (2) Restricciones por dependiente — de fix-181, sin cambios. Solo para
  -- compras (débitos reales de consumo), nunca para recargas o P2P.
  if p_tipo = 'compra' and p_delta < 0 then
    select * into v_restriccion from dependent_restrictions
      where dependent_user_id = v_wallet_owner and world_id = p_world_id
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

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Verificación 1: debe devolver 1 fila.
select proname, pronargs from pg_proc where proname = 'mover_saldo_wallet';

-- Verificación 2 (opcional, hazla aparte con la anon key, no acá): llamar
-- mover_saldo_wallet sin turno_id y sin sesión iniciada contra una wallet
-- real debe volver 'NO_AUTENTICADO', no 'SIN_WALLET' ni mover saldo de
-- verdad.
