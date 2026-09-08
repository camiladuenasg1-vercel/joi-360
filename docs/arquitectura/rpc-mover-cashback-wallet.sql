-- ════════════════════════════════════════════════════════════════════════════
-- RPC mover_cashback_wallet -- v1 (07-sep-2026)
--
-- Mueve wallets.cashback_balance en el camino de cobro del POS (debito de
-- canje + credito de cashback ganado). 2a RPC de dinero del ecosistema, junto
-- con mover_saldo_wallet. Tiene el mismo candado de identidad: turno POS
-- valido (TURNO_INVALIDO) O dueño/apoderado autenticado (NO_AUTENTICADO /
-- NO_AUTORIZADO).
--
-- Este archivo es la definicion REAL en prod, reconstruida por introspeccion
-- (pg_get_functiondef) el 07-sep -- antes no existia .sql versionado (deuda
-- Track J del plan de incongruencias). Idempotente (CREATE OR REPLACE).
-- Ver rpc_versions.md.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mover_cashback_wallet(
  p_wallet_id uuid, p_delta numeric, p_tipo text, p_world_id text,
  p_merchant_id uuid DEFAULT NULL::uuid, p_reference text DEFAULT NULL::text,
  p_turno_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(nuevo_saldo numeric, ok boolean, motivo text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_saldo_actual numeric;
  v_nuevo_saldo numeric;
  v_wallet_owner text;
  v_guardian text;
  v_auth_uid uuid := auth.uid();
begin
  select cashback_balance, user_id::text into v_saldo_actual, v_wallet_owner
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

  update wallets set cashback_balance = v_nuevo_saldo where id = p_wallet_id;

  insert into transactions (wallet_id, world_id, merchant_id, amount, type, status, reference, turno_id)
  values (p_wallet_id, p_world_id, p_merchant_id, abs(p_delta), p_tipo, 'completada', p_reference, p_turno_id);

  return query select v_nuevo_saldo, true, null::text;
end;
$function$;
