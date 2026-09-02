# Versiones de RPC de dinero — JOI 360

Las funciones Postgres que **mutan una wallet** son el punto de choque #1 del ecosistema: las comparten Comercio, Consumos, BNPL, Transporte, Estacionamiento, Suscripciones, Cashback, P2P. Cualquier reescritura impacta varias capacidades a la vez.

**Regla (Track J):** ninguna reescritura de un RPC de dinero sin (a) lista de capacidades afectadas, (b) QA de cada flujo, (c) bump de versión, (d) fila actualizada acá. Cada `.sql` de RPC lleva un header con: versión, fecha, qué cambió, capacidades afectadas.

## Estado en producción (verificado 2026-09-02 vía Management API)

| RPC | `pronargs` | Candado de identidad | Restricciones de dependiente | `.sql` en repo | Notas |
|---|---|---|---|---|---|
| `mover_saldo_wallet` | 8 | ✅ dueño/apoderado **o** turno POS válido (`NO_AUTENTICADO`) | ✅ horario / límite diario / productos bloqueados | ✅ `fix-234-restaurar-dueno-wallet.sql` (última reescritura) | Historia: `fix-121` (candado de dueño) → `fix-181` (restricciones, perdió el candado) → `fix-234` (ambos juntos). |
| `mover_cashback_wallet` | 7 | ✅ tiene candado de dueño/turno | — (no aplica) | ❌ **falta** | Débito de canje + crédito de cashback ganado, con reversión si el cobro principal falla. Usada por `CobrarPanel`. |
| `transferir_p2p_wallet` | 5 | ✅ dueño | — | ⚠️ referida en `08_discrepancias.md`, sin `.sql` propio confirmado | P2P usuario→usuario. |

## RPC de login (no mueven dinero, pero son credenciales)

| RPC | `pronargs` | `.sql` en repo | Notas |
|---|---|---|---|
| `verificar_admin_login` | 2 | ✅ `fix-admin-users-tabla-real.sql` | admin RedPontis, bcrypt server-side. |
| `verificar_pin_operador` | 2 | ✅ `fix-pos-pin-hash-y-codigo-comercio.sql` | PIN de POS de comercio/mundo. **Nota Track B:** el `pos_pin_hash` es legible con la anon key (bcrypt cost 6 sobre 4 dígitos → fuerza bruta offline). |
| `verificar_login_sponsor` | 3 | ❌ **falta** | login del Panel de Mundo. |
| `verificar_login_organizador` | 3 | ✅ `supabase-auth-organizador-merchant.sql` (aplicada 02-sep) | Track B. Trigger `hash_organizador_password` + RPC security definer. Cliente 100% server-side (fallback quitado). |
| `verificar_login_merchant` | 3 | ✅ `supabase-auth-organizador-merchant.sql` (aplicada 02-sep) | Track B. Columnas `merchants.panel_usuario`/`panel_password`/`panel_password_hash` + trigger + RPC. |
