-- Reporte de pérdida/robo de bandita: crea una nueva solicitud de bandita
-- (mismo flujo que una solicitud normal, para reusar toda la resolución ya
-- construida) pero necesita distinguirse de un primer pedido — RedPontis y
-- el operador de mundo deben ver claro que es una REPOSICIÓN, no un alta.

alter table public.nfc_requests add column if not exists motivo text;

notify pgrst, 'reload schema';
