-- ════════════════════════════════════════════════════════════════════════════
-- RPC verificar_login_sponsor -- v1 (07-sep-2026)
--
-- Login del Panel de Mundo: compara contra worlds.sponsor_password_hash
-- server-side (bcrypt), nunca en el cliente. Devuelve id + usuario si matchea.
--
-- Definicion REAL en prod, reconstruida por introspeccion el 07-sep -- antes
-- no existia .sql versionado (deuda Track J). Idempotente. Ver rpc_versions.md.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verificar_login_sponsor(
  p_world_id text, p_usuario text, p_password text
)
RETURNS TABLE(world_id text, usuario text)
LANGUAGE sql SECURITY DEFINER
AS $function$
  select id, sponsor_usuario
  from worlds
  where id = p_world_id
    and sponsor_usuario = p_usuario
    and sponsor_password_hash is not null
    and sponsor_password_hash = crypt(p_password, sponsor_password_hash);
$function$;

grant execute on function public.verificar_login_sponsor(text, text, text) to anon, authenticated;
