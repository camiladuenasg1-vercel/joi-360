# Guión de demo — BCS Corp / ONG Rana Dorada (2026-10-23)

Rama: `feature/bcs-corp-rana-dorada` (commits `bc50e18`, `4740af8`, `8880df9`, `32cb287`, `98a272f`)
Sistema real: **joi360-admin** + **joi360-app** (React + Supabase, repo `camiladuenasg1-vercel/joi-360`). NO es `prototype-separated` (prototipo anterior, retirado).

## Qué está verificado en vivo vs. solo revisado en código

**Verificado en navegador real (login real, datos reales en Supabase):**
- Login de admin, mundo "ONG Rana Dorada" visible en Mundos, las 5 capacidades (Wallet/Eventos/Comercios/Donaciones/Consumos) correctamente activas, catálogo de Emisión con Yappy y Wompi visibles y con montos en `$` (no `S/`).

**Revisado a fondo en código, NO verificado todavía en navegador como usuario final** (bloqueado por confirmación de correo real de Supabase Auth — pendiente login de prueba confirmado):
- Pantalla Donaciones en la SuperApp, flujo de donar, tile en el Hub, wallet cash-in vía Yappy/Wompi, compra de entrada al evento, compra en el comercio.

No recorras el lado de SuperApp del guión de abajo sin haber verificado tú misma en navegador antes del 23, aunque el código esté revisado.

## 0. Entrar (admin)
`joi360-admin.vercel.app` → Mundos → ONG Rana Dorada. Mostrar las 5 capacidades activas y el checklist 4/5 (falta "Dashboard entregado al sponsor" — no se necesita para la demo).

## 1. Wallet · Cash-in con Yappy/Wompi
SuperApp → mundo Rana Dorada → Recargar. Deberían aparecer Yappy y Wompi como únicos métodos (reloadMethods de este mundo), montos en `$`, checkout corre y acredita saldo simulado.

## 2. Eventos · Ticketing
Evento "Jornada de Conservación" (23-oct, $8) — motor de Eventos ya real, reutilizado tal cual.

## 3. Consumos
Comercio "Tienda Rana Dorada" — 2 productos (peluche $12, botella $8).

## 4. Donaciones — lo único genuinamente nuevo
Tile "Donaciones" en el Hub → pantalla con montos sugeridos, selector Yappy/Wompi, confirmar. El saldo de Wallet no debe moverse — la donación queda en su propio registro (tabla `donations`, aparte).

**Pendiente antes del demo: la tabla `donations` todavía no existe en Supabase** (`supabase-donaciones-bcs-corp.sql` en la raíz del repo, lista para correr) — sin ella, el botón "Donar" va a fallar al confirmar. Correrla en el SQL Editor de Supabase o darme el Personal Access Token para correrla yo.

## Qué decir si preguntan "¿esto ya cobra de verdad?"
No. Yappy/Wompi están marcados `demo_mock`/`api_ready:false` en el catálogo — el checkout corre de punta a punta pero no llama ninguna pasarela real. La documentación real de Yappy que tenemos (Commerce API v1.1.0) es solo de consulta, no de cobro; de Wompi no se recibió documentación técnica.

## Bugs reales encontrados y corregidos durante esta verificación (ya en la rama)
1. El catálogo de Emisión mostraba "S/" en vez de "$" para canales en USD (cosmético, Emision.jsx).
2. `monedaDeMundo()` consultaba una columna `worlds.moneda` que no existe — toda wallet nueva caía a "PEN" sin importar la moneda real del mundo. Nunca se notó porque hasta ahora todos los mundos reales eran PEN.
3. Barrido completo de "S/" hardcodeado en la SuperApp, en toda pantalla alcanzable con las capacidades reales de este mundo (Wallet/recarga, QR de pago, compra de entradas, Mis Compras, Marketplace de comercios) — todas mostraban soles aunque el mundo sea USD. Se corrigió usando la moneda real del mundo en cada pantalla (`Pay.jsx`, `PagarQR.jsx`, `Module.jsx`). También se unificó el símbolo de dólar: `WalletTemplate` mostraba "US$" mientras el resto de la app ya mostraba "$" — ahora todo dice "$" de forma consistente.
   - Quedan sin corregir, a propósito, dos rutas que no son alcanzables en este mundo (verificado contra su configuración real en Supabase): la transferencia P2P (`p2pEnabled:false`) y la creación de eventos por el propio usuario (`allowB2C:false`). Si alguna de las dos se activa más adelante para otro mundo USD, van a necesitar el mismo arreglo.
