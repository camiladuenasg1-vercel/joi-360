-- Migración: Administración de Solicitudes BNPL (Gantt #31)
-- Gap: la evaluación de elegibilidad era 100% self-service en la app (un
-- timeout falso que siempre terminaba en "aprobado"), sin que el comercio
-- viera la solicitud ni tuviera contexto (historial de compras/pagos) antes
-- de aprobar/rechazar. bnpl_contratos.estado es texto libre sin CHECK previo
-- (ver supabase-bnpl-lifecycle.sql) — los nuevos valores "pendiente_aprobacion"
-- y "rechazado" no requieren alterar ningún constraint. Solo se agrega el
-- campo para registrar el motivo cuando el comercio rechaza.

alter table public.bnpl_contratos
  add column if not exists rechazo_motivo text;
