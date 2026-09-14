# Kiro steering — instalación para el proyecto de Salvador

Estos 3 archivos son el contrato de render config listo para instalar tal cual en `.kiro/steering/` del proyecto nativo (`joi360mono`). Responden al problema puntual: Salvador no está clonando, capacidad por capacidad y config por config, las vistas que el prototipo genera — este paquete se lo da como contexto persistente para que Kiro lo cotidianamente respete.

## Cómo instalarlos

1. Copiar los 4 archivos tal cual a `.kiro/steering/` en el repo `joi360mono`:
   - `render-config.md` → **marcar como always included** (es la regla que no se negocia, debe estar en cada sesión de Kiro).
   - `no-mock.md` → **marcar como always included**.
   - `capacidades.md` → contexto de referencia (Kiro lo consulta al tocar cualquier capacidad).
   - `home-render-config.md` → contexto de referencia, específico de la pantalla Home y las 4 pantallas propias de la barra inferior (Pay/Activity/Profile + el grafo de navegación) — Kiro lo consulta al trabajar la superapp desde el punto de entrada hacia adelante. Incluye el checklist de cotejo contra el panel RedPontis (Admin) del propio proyecto de Salvador — él lo corre contra su código, este documento no tiene visibilidad de su repo.
2. No editarlos dentro del proyecto de Salvador — si algo queda desactualizado o falta una capacidad nueva, el fix se hace ACÁ (en el prototipo, que es la fuente de verdad) y se vuelve a copiar.

## Regeneración

`capacidades.md` es un snapshot del código real al 11-sep-2026. **Regenerar en cada corte semanal** (junto con el resto de documentos vivos, ver `feedback_documento_maestro_corte_dominical` / el corte de los viernes): releer `MODULE_CATALOG`, `DEPENDENCY_MAP` y `TEMPLATE_MAP` frescos, no cargar hacia adelante una entrada vieja. Este es el mismo criterio que ya se aplicó al Gantt y al Mapeo Maestro — un catálogo de estado escrito a mano y no actualizado es exactamente la causa raíz que ya se diagnosticó dos veces (ver `cotejo_prototipo_vs_proyecto_real.md` §3).

## Qué NO reemplazan

Esto es el contrato de RENDER (qué vista, qué secciones, qué dependencias). No reemplaza `cotejo_prototipo_vs_proyecto_real.md` (directiva general de qué construir/no construir y el loop completo de auditoría) ni los documentos de `mapeo_maestro/` (mecánica extendida: activación por mundo, sync, wizard, esquema Supabase completo). Son el nivel de detalle que faltaba específicamente para que la clonación de vistas por capacidad sea verificable, no solo declarada.
