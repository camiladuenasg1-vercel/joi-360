-- Task nueva (ago-2026): Landing pública de JOI Solutions + gestión de "Mis
-- eventos" para el creador B2C dentro de la superapp.
--
-- Gap real encontrado: un evento B2C (crearEventoB2CRemote, joi360-app) no
-- guarda NINGÚN identificador de quién lo creó — organizador_id siempre es
-- null para B2C. Sin ese dato es estructuralmente imposible construir "mis
-- eventos" (no hay por dónde filtrar "los eventos que yo publiqué"). El
-- toggle "Publicar en el Landing público del mundo" del formulario de
-- organizador (OrganizadorFront.jsx) tampoco se guarda nunca — es un
-- adorno de UI; el filtro real que ya usa el marketplace de la app
-- (fetchEventosLive: estado=PUBLICADO AND privado=false) es suficiente y
-- ya es la fuente de verdad, así que no se agrega un flag redundante.

alter table public.events add column if not exists creado_por_user_id uuid;

notify pgrst, 'reload schema';
