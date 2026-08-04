-- Task #114 (segunda parte, la real): "permite escribir dinero".
--
-- Hoy wallets.balance se modifica con un PATCH directo desde el navegador
-- (cobro POS, recarga, pago, BNPL, transferencia P2P, compra marketplace) en
-- 3 frentes (joi360-admin, joi360-app, joi-pos-backend) — 8 puntos en total,
-- todos con la misma anon key. No se puede arreglar con RLS/REVOKE simple
-- porque joi-pos-backend (el backend "oficial" del POS nativo) usa la MISMA
-- anon key que el navegador — bloquear UPDATE le rompería el cobro real
-- también a él, no solo a los usuarios sin permiso.
--
-- La solución real: la columna balance deja de ser escribible directo desde
-- ningún cliente (browser o backend) — solo se puede mover a través de estas
-- 2 funciones, que SÍ validan saldo, lo hacen atómico (con lock de fila) y
-- dejan el registro de transacción en el mismo paso. anon puede EJECUTAR la
-- función (GRANT EXECUTE) aunque no pueda tocar la columna directamente
-- (REVOKE UPDATE) — es la diferencia entre "puede cobrar/recargar" y
-- "puede escribirle cualquier número a cualquier billetera".

revoke update (balance) on public.wallets from anon, authenticated;

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
as $$
declare
  v_saldo_actual numeric;
  v_nuevo_saldo numeric;
begin
  -- Lock de fila: dos cobros simultáneos contra la misma wallet no pueden
  -- leer el mismo saldo viejo y pisarse uno al otro.
  select balance into v_saldo_actual from wallets where id = p_wallet_id for update;

  if v_saldo_actual is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
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
$$;

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
as $$
declare
  v_saldo_origen numeric;
  v_saldo_destino numeric;
  v_ref text;
begin
  if p_monto <= 0 then
    return query select null::numeric, false, 'MONTO_INVALIDO';
    return;
  end if;

  -- Lock de las 2 filas en orden fijo por id (evita deadlock si dos
  -- transferencias cruzadas corren al mismo tiempo entre las mismas 2 wallets).
  if p_origen_wallet_id < p_destino_wallet_id then
    select balance into v_saldo_origen from wallets where id = p_origen_wallet_id for update;
    select balance into v_saldo_destino from wallets where id = p_destino_wallet_id for update;
  else
    select balance into v_saldo_destino from wallets where id = p_destino_wallet_id for update;
    select balance into v_saldo_origen from wallets where id = p_origen_wallet_id for update;
  end if;

  if v_saldo_origen is null or v_saldo_destino is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
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
$$;

grant execute on function public.mover_saldo_wallet(uuid, numeric, text, text, uuid, text, text, uuid) to anon, authenticated;
grant execute on function public.transferir_p2p_wallet(uuid, uuid, numeric, text, text) to anon, authenticated;
