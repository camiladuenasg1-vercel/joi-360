-- Menú: hasta ahora una reserva pagada (menu_reservas.estado='CONFIRMADA')
-- se quedaba así para siempre — el cobro ya era real (mover_saldo_wallet)
-- pero no existía ninguna acción de POS/operador que cerrara el círculo
-- marcando la entrega física del plato. estado ya era texto libre (sin
-- check constraint), así que 'ENTREGADA' no necesita migración de datos,
-- solo falta la columna de auditoría del momento de entrega.

alter table public.menu_reservas add column if not exists entregado_at timestamptz;

notify pgrst, 'reload schema';
