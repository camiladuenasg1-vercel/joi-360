-- Cashback MACRO cerrado a comercios habilitados (Camila, 12/13-ago-2026):
-- % unico definido por el mundo, se acredita solo en compras dentro de
-- comercios marcados como habilitados, y se acumula en un saldo separado del
-- saldo principal de la wallet (no se mezcla con dinero recargado real --
-- misma razon por la que Liquidacion tuvo bugs de netos negativos cuando se
-- mezclaron conceptos). Se aplica como descuento opcional al cobrar, elegido
-- por el operador antes de confirmar el pago.
--
-- Reusa exactamente el mismo patron de seguridad que mover_saldo_wallet
-- (Task #114/#121): lock de fila, validacion de dueno/turno, atomico, sin
-- que el cliente pueda tocar el balance directo.

alter table public.wallets add column if not exists cashback_balance numeric not null default 0;
alter table public.merchants add column if not exists cashback_habilitado boolean not null default false;

create or replace function public.mover_cashback_wallet(
  p_wallet_id uuid,
  p_delta numeric,
  p_tipo text,
  p_world_id text,
  p_merchant_id uuid default null,
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
$func$;

grant execute on function public.mover_cashback_wallet(uuid, numeric, text, text, uuid, text, uuid) to anon, authenticated;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Verificacion: debe devolver 1 fila
select proname, pronargs from pg_proc where proname = 'mover_cashback_wallet';
