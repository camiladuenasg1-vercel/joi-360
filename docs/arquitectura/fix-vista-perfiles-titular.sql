-- Vista de solo lectura sobre auth.users para que el admin pueda resolver
-- el nombre real del TITULAR (no solo de sus dependientes, que ya viven en
-- public.dependents) sin exponer la tabla completa de Auth — solo las
-- columnas de perfil que ya se capturan al registrarse (nombres, apellidos,
-- documento), nunca password_hash ni el resto de auth.users.

create or replace view public.usuarios_perfil as
select
  id as user_id,
  email,
  raw_user_meta_data ->> 'nombres'    as nombres,
  raw_user_meta_data ->> 'apellidos'  as apellidos,
  raw_user_meta_data ->> 'doc_tipo'   as doc_tipo,
  raw_user_meta_data ->> 'doc_numero' as doc_numero,
  created_at
from auth.users;

grant select on public.usuarios_perfil to anon, authenticated;

notify pgrst, 'reload schema';
