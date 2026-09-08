-- ════════════════════════════════════════════════════════════════════════════
-- JOI360 · Seed de world_feature_flags para mundo-3ox15t (Jockey Plaza CR-01)
--
-- Las 6 capacidades v1.0.0 (loyalty/turnos/reservas/estacionamiento/subsidio/
-- transporte) se agregaron a este mundo ANTES del fix de Track E que siembra
-- serviciosActivos al agregar del catálogo global -> quedaron activas pero
-- SIN ninguna fila en world_feature_flags (wc.flag(cap,code) = false para
-- todos sus servicios). Los templates nuevos no gatean por flag, así que
-- funcionan igual — pero el tab "Feature Flags" del admin arranca todo en OFF
-- y cualquier lógica futura gateada por flag renderizaría vacío.
--
-- Este script enciende todos los servicios de esas 6 capacidades para este
-- mundo. Idempotente (on conflict do nothing). Solo aplica a mundo-3ox15t.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.world_feature_flags (world_id, flag_id, enabled)
select 'mundo-3ox15t', c.id, true
from public.capacity_feature_flags c
where c.capacity_id in ('loyalty','turnos','reservas','estacionamiento','subsidio','transporte')
  and c.flag_code !~ '[ A-Z]'   -- solo ids estables, ignora los flags fantasma
on conflict (world_id, flag_id) do nothing;

select capacity_id, count(*) as flags_encendidos
from public.world_feature_flags f
join public.capacity_feature_flags c on c.id = f.flag_id
where f.world_id = 'mundo-3ox15t' and f.enabled = true
  and c.capacity_id in ('loyalty','turnos','reservas','estacionamiento','subsidio','transporte')
group by capacity_id order by capacity_id;

notify pgrst, 'reload schema';
