# JOI360 · Estructura de catálogos globales y configuración de mundos
> Actualizado 17 jul 2026 · Fuente única: Supabase `kobtxrhycaloyjkeyspv` · Versión web: https://claude.ai/code/artifact/3fabd920-abf3-477b-9126-ca1fdcf8ca22
> Para pegar/adjuntar en el chat del proyecto "Estructura de catálogos globales y configuración de mundos".

## 1 · Arquitectura en capas
1. **Nivel 1 — Catálogo Global (RedPontis):** 21 capacidades + feature flags con dev_status. Botón "Publicar catálogo en la app" → tabla `capacities`. Los flags nacen aquí; un flag no-Listo no es activable por ningún mundo.
2. **Nivel 2 — Mundo:** RedPontis asigna capacidades; el Sponsor configura sus **condiciones** en la pestaña "Mis módulos" de su Dashboard. Solo puede restringir, nunca ampliar (clamping).
3. **Nivel 3 — Comercio:** cada merchant activa su programa dentro del techo del mundo (ej. BNPL de Hiraoka: cuotas activas, productos financiables, gestión de mora).
4. **Nivel 4 — Superapp:** lee todo en vivo de Supabase. Una capacidad nueva del catálogo renderiza en el Hub (icono+nombre del catálogo) sin tocar el código de la app; los user flows dedicados (wallet, eventos, BNPL…) usan sus templates propios. La pantalla de evento se compone según `events.ux_components` (piloto Render Engine).

## 2 · Configuración de condiciones por el Mundo (ejemplo BNPL/SNPL en Mok)
Al entregar el Dashboard, el sponsor ve en su menú la categoría **BNPL / SNPL** con sus inputs de microcréditos:
cuotas 3/6/12 (switches) · días de gracia (máx 10) · score obligatorio (switch) · modalidad "sin evaluación" (switch) · monto máximo financiable (currency).
Guardar publica a `world_capacity_configs` → la app renderiza las nuevas condiciones al refrescar. Mismo patrón para todas las capacidades.

## 3 · Flujo de eventos con cola de aprobación
Organizador B2B crea/publica (inputs completos + tipos de entrada) → estado **PENDIENTE_APROBACION** (no visible en app) → RedPontis entra al mundo → pestaña **"Cola de aprobación"** (específica por mundo) → **Aprobar y publicar** (release inmediato en marketplace + landing) o **Rechazar** (el organizador edita y reenvía).

## 4 · Paneles B2B
| Panel | Quién | Gestiona |
|---|---|---|
| Admin RedPontis | RedPontis | Catálogo global, mundos, medios de pago api_ready, colas de aprobación, entrega de dashboards |
| Dashboard del Mundo | Sponsor (Mok, Raimondi) | Mis módulos y condiciones · comercios · BNPL (desempeño+contratos) · publicidad · soporte |
| Organizador B2B | Organizador de eventos | Eventos y entradas · aforo en tiempo real · check-in QR · liquidación por instancia de evento |
| Merchant | Comercio (Hiraoka) | Ventas en vivo desde la app · cobrar · programa BNPL con clamping · liquidación |

## 5 · Modelo de datos (Supabase)
- `capacities` · `capacity_feature_flags` — Catálogo Nivel 1 (con ux_component)
- `worlds` · `world_capacity_configs` · `world_feature_flags` · `world_channel_configs` — configuración por mundo
- `merchants` · `bnpl_programa_comercio` · `bnpl_contratos` — nivel comercio
- `events` · `event_ticket_types` · `event_tickets` — motor de eventos (QR, check-in, aforo)
- `wallets` · `transactions` · `emission_channels` — saldo, recargas, consumos, PSPs (Culqi/Qubit api_ready)

Pendiente post-demo: endurecer políticas RLS `demo_anon_all`.

## 6 · Producción
- Admin + paneles B2B: https://joi360-admin.vercel.app
- Superapp: https://joi360-app.vercel.app
- Código: `Escritorio\JOI360\` · scripts: `supabase-migration.sql`, `supabase-fix.sql`, `preparar-demo.ps1`
