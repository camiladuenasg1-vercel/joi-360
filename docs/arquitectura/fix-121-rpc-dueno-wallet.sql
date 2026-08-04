-- Task #121: mover_saldo_wallet / transferir_p2p_wallet (fix #114) validan
-- saldo y son atómicas, pero NO validan quién puede mover CADA wallet — la
-- llave anónima es pública (va en el bundle del navegador), así que hoy
-- cualquiera puede llamar estas 2 funciones con el p_wallet_id de otra
-- persona y mover su dinero. Esto cierra ese hueco sin romper los 2 caminos
-- reales que existen hoy:
--
--   1) Self-service (recarga/pago/cuota BNPL/P2P desde el superapp): el
--      dueño de la wallet está logueado ahí mismo. joi360-app ahora manda su
--      JWT real de sesión (antes se descartaba después del login) — auth.uid()
--      tiene que ser, de verdad, el dueño de la wallet, o el apoderado si es
--      la wallet de un dependiente (dependents.guardian_user_id).
--
--   2) Cobro/recarga iniciado por un operador de comercio (POS web o el T6
--      físico): el TITULAR de la wallet no está logueado ahí — es el
--      operador quien cobra, físicamente, con el código/pulsera del cliente
--      delante. Ahí la legitimidad no puede venir de auth.uid() (nunca va a
--      ser el cliente); viene de un turno de caja real y abierto
--      (pos_turnos) de ESE merchant. El POS nativo T6 ya manda turno_id
--      (joi-pos-backend/routes/shop-charge.js ya lo valida en la app, esto lo
--      valida también dentro de la función). El Operador web de joi360-admin
--      no tenía turno — se agregó (abrirTurnoRemote) junto con este fix.
--
-- Distinción dentro de la función: si p_turno_id viene, es el camino (2) y se
-- valida el turno. Si no viene, es el camino (1) y se exige auth.uid().

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
begin
  select balance, user_id::text into v_saldo_actual, v_wallet_owner
  from wallets where id = p_wallet_id for update;

  if v_saldo_actual is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
  end if;

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

create or replace function public.transferir_p2p_wallet(
  p_origen_wallet_id uuid,
  p_destino_wallet_id uuid,
  p_monto numeric,
  p_world_id text,
  p_reference text default null
)
returns table (nuevo_saldo_origen numeric, ok boolean, motivo text)
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_saldo_origen numeric;
  v_saldo_destino numeric;
  v_origen_owner text;
  v_guardian text;
  v_auth_uid uuid := auth.uid();
  v_ref text;
begin
  if p_monto <= 0 then
    return query select null::numeric, false, 'MONTO_INVALIDO';
    return;
  end if;

  if p_origen_wallet_id < p_destino_wallet_id then
    select balance, user_id::text into v_saldo_origen, v_origen_owner from wallets where id = p_origen_wallet_id for update;
    select balance into v_saldo_destino from wallets where id = p_destino_wallet_id for update;
  else
    select balance into v_saldo_destino from wallets where id = p_destino_wallet_id for update;
    select balance, user_id::text into v_saldo_origen, v_origen_owner from wallets where id = p_origen_wallet_id for update;
  end if;

  if v_saldo_origen is null or v_saldo_destino is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
  end if;

  -- P2P es siempre self-service — nunca lo llama un merchant/POS. Quien
  -- ENVÍA tiene que ser, de verdad, el dueño de la wallet de origen (o su
  -- apoderado). Quien RECIBE no necesita probar nada, igual que en
  -- cualquier billetera real: nadie autoriza que le depositen dinero.
  if v_auth_uid is null then
    return query select v_saldo_origen, false, 'NO_AUTENTICADO';
    return;
  end if;
  if v_auth_uid::text != v_origen_owner then
    select guardian_user_id into v_guardian from dependents where dependent_user_id = v_origen_owner;
    if v_guardian is null or v_guardian != v_auth_uid::text then
      return query select v_saldo_origen, false, 'NO_AUTORIZADO';
      return;
    end if;
  end if;

  if v_saldo_origen < p_monto then
    return query select v_saldo_origen, false, 'SALDO_INSUFICIENTE';
    return;
  end if;

  update wallets set balance = balance - p_monto where id = p_origen_wallet_id;
  update wallets set balance = balance + p_monto where id = p_destino_wallet_id;

  v_ref := coalesce(p_reference, 'transferencia-' || extract(epoch from now())::text);

  insert into transactions (wallet_id, world_id, amount, type, status, reference)
  values (p_origen_wallet_id, p_world_id, p_monto, 'transferencia_p2p', 'completada', v_ref || '-envio');
  insert into transactions (wallet_id, world_id, amount, type, status, reference)
  values (p_destino_wallet_id, p_world_id, p_monto, 'transferencia_p2p', 'completada', v_ref || '-recibo');

  return query select v_saldo_origen - p_monto, true, null::text;
end;
$func$;

-- Los GRANT ya existen del fix anterior (CREATE OR REPLACE no los toca), pero
-- se repiten por si acaso — son idempotentes.
grant execute on function public.mover_saldo_wallet(uuid, numeric, text, text, uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.transferir_p2p_wallet(uuid, uuid, numeric, text, text) to anon, authenticated;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Verificación: debe devolver 2 filas. Si además quieres confirmar que el
-- chequeo de dueño quedó activo, corre por separado (con la anon key, no
-- aquí) una llamada a mover_saldo_wallet sin turno contra una wallet real —
-- debe volver NO_AUTENTICADO, no SIN_WALLET.
select proname, pronargs
from pg_proc
where proname in ('mover_saldo_wallet', 'transferir_p2p_wallet');
