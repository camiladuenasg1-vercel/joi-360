# JOI 360 — Ecosistema RedPontis

Plataforma multi-tenant de pagos, identidad y operación para "mundos"
(colegios, retail, eventos, clínicas). Un mundo activa capacidades desde el
panel de RedPontis y esas capacidades gobiernan, en vivo, qué renderiza cada
frente: la super app del usuario, el panel del mundo y el terminal del operador.

## Frentes

| Carpeta / repo | Qué es | Producción |
|---|---|---|
| `joi360-admin/` | Panel interno de RedPontis + BackOffice del Mundo + panel del comercio | https://joi360-admin.vercel.app |
| `joi360-app/` | Super app del usuario final (wallet, comercios, eventos, menú, accesos) | https://joi360-app.vercel.app |
| [`joi-pos-backend`](https://github.com/camiladuenasg1-vercel/joi-pos-backend) | API de operación para el terminal físico (repo propio, desplegado aparte) | https://joi-pos-backend.vercel.app |
| `joi360-operador/` | App Android nativa (Kotlin/Compose) para POS T6 y celular del operador | APK |

`joi-pos-backend` vive en su propio repositorio porque Vercel lo despliega
directo desde ahí; no se duplica aquí para que no haya dos fuentes de verdad.

## Base de datos

Un solo proyecto de Supabase (`kobtxrhycaloyjkeyspv`) compartido por todos los
frentes. No hay backend propio para admin/app: ambos hablan PostgREST directo
con la anon key. Las migraciones reales están en los `supabase-*.sql` de la
raíz, en orden cronológico de aplicación.

Tablas núcleo: `worlds`, `capacities`, `world_capacity_configs`,
`world_feature_flags`, `wallets`, `transactions`, `merchants`, `products`,
`events`, `event_tickets`, `nfc_bands`, `liquidaciones`.

## Cómo se decide qué se ve

`world_capacity_configs` (módulo activo + su config) y `world_feature_flags`
(cada feature dentro del módulo) son la única fuente de verdad. Un flag solo
cuenta como activo si está explícitamente en `true` **y** su capacidad padre
está encendida. Ningún frente hardcodea su propio menú.

## Documentación

- `ESTRUCTURA-CATALOGOS-Y-MUNDOS.md` — modelo de catálogo y mundos
- `REFERENCIA-BATCHES-30JUL.md` — bitácora de cambios por lote
- API Reference (OpenAPI de la capa de servicios): ver artifact del proyecto

## Desarrollo

```bash
cd joi360-admin && npm install && npm run dev
cd joi360-app   && npm install && npm run dev
```
