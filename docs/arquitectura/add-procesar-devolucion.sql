-- Reglas de devolucion (Camila, 13-ago-2026): decidio que solo un admin
-- RedPontis autenticado puede ejecutar una devolucion real (acreditar de
-- vuelta a la wallet del usuario) desde un ticket de soporte.
--
-- Por que hacia falta una funcion nueva: mover_saldo_wallet ya tiene dos
-- caminos de autorizacion (dueno logueado via auth.uid(), u operador con
-- turno de POS abierto) -- ninguno cubre "RedPontis revisa un ticket y
-- acredita dinero sin que el usuario este logueado ahi". El login de admin
-- de este panel (verificar_admin_login) hoy solo guarda {email,name} en el
-- estado LOCAL del navegador -- no genera ninguna sesion verificable del
-- lado del servidor (auth.uid() seria null igual que para cualquier
-- anonimo). En vez de construir un sistema de sesiones nuevo, esta funcion
-- re-valida el email+password del admin EN EL MOMENTO de la devolucion,
-- reusando exactamente verificar_admin_login (la misma verificacion que ya
-- protege el login) -- password re-entry como confirmacion de un paso
-- sensible, mismo nivel de exposicion que el login normal (la contraseña ya
-- viaja en texto plano sobre HTTPS a ese RPC hoy).
create or replace function public.procesar_devolucion(
  p_admin_email text,
  p_admin_password text,
  p_wallet_id uuid,
  p_monto numeric,
  p_world_id text,
  p_ticket_id uuid default null,
  p_reference text default null
)
returns table (nuevo_saldo numeric, ok boolean, motivo text)
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_admin_valido boolean;
  v_saldo_actual numeric;
  v_nuevo_saldo numeric;
begin
  select exists(select 1 from verificar_admin_login(p_admin_email, p_admin_password)) into v_admin_valido;
  if not v_admin_valido then
    return query select null::numeric, false, 'ADMIN_NO_AUTENTICADO';
    return;
  end if;

  if p_monto <= 0 then
    return query select null::numeric, false, 'MONTO_INVALIDO';
    return;
  end if;

  select balance into v_saldo_actual from wallets where id = p_wallet_id for update;
  if v_saldo_actual is null then
    return query select null::numeric, false, 'SIN_WALLET';
    return;
  end if;

  v_nuevo_saldo := v_saldo_actual + p_monto;
  update wallets set balance = v_nuevo_saldo where id = p_wallet_id;

  insert into transactions (wallet_id, world_id, amount, type, status, reference)
  values (p_wallet_id, p_world_id, p_monto, 'devolucion', 'completada',
    coalesce(p_reference, 'Devolución' || case when p_ticket_id is not null then ' · ticket ' || p_ticket_id::text else '' end));

  if p_ticket_id is not null then
    update support_tickets set estado = 'RESUELTO' where id = p_ticket_id;
  end if;

  return query select v_nuevo_saldo, true, null::text;
end;
$func$;

grant execute on function public.procesar_devolucion(text, text, uuid, numeric, text, uuid, text) to anon, authenticated;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

-- Verificacion: debe devolver 1 fila
select proname, pronargs from pg_proc where proname = 'procesar_devolucion';
