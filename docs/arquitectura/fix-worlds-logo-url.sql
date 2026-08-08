-- Perfil de mundo (Task #166): el logo se guardaba antes como base64 en
-- memoria local del navegador y nunca viajaba a Supabase — el thumbnail no
-- tenía de dónde salir ni en el card del admin ni en el card de comunidad
-- del superapp.

alter table public.worlds add column if not exists logo_url text;

notify pgrst, 'reload schema';
