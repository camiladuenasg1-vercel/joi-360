# Migraciones aplicadas a producción — JOI 360

Project ref Supabase: **`kobtxrhycaloyjkeyspv`** · `https://kobtxrhycaloyjkeyspv.supabase.co`

Los `.sql` de `JOI360/` y `docs/arquitectura/` se corren a mano en el SQL Editor (o vía Management API con un Personal Access Token). Este archivo registra qué se aplicó y cuándo, para no tener que introspeccionar la base cada vez. **Al correr una migración nueva, agregar su fila acá en el mismo momento.**

Regla: todo `.sql` de migración debe terminar con `notify pgrst, 'reload schema';` para que PostgREST sirva los cambios de inmediato (anexo §10 del maestro).

## Registro

| Fecha aplicada | Archivo | Qué hace | Verificado |
|---|---|---|---|
| 2026-08-19 | `docs/arquitectura/fix-234-restaurar-dueno-wallet.sql` | Reescribe `mover_saldo_wallet` combinando el candado de dueño/turno (de `fix-121`) + las restricciones de dependiente (de `fix-181`) en un solo cuerpo. | ✅ 2026-09-02 vía Management API: `pronargs=8`, el cuerpo contiene `NO_AUTENTICADO` + `LIMITE_DIARIO` + menciona `turno`. |
| 2026-08-28 | `supabase-turnos-food-court.sql` | Tabla `turno_pedidos` (estado recibido→preparando→listo→entregado) + RLS `demo_anon_all` + índices. | ✅ 2026-08-28 en vivo (crear pedido al pagar, cola de cocina en Operador) + 2026-09-02 vía Management API (tabla existe, 9 columnas, 1 policy). |
| 2026-08-28 | `supabase-reservas.sql` | Tabla `reservas` (recurso/fecha/hora, cancelación) + RLS + índices. | ✅ 2026-08-28 end-to-end (se creó y borró una reserva real) + Management API (8 columnas, 1 policy). |
| 2026-08-28 | `supabase-estacionamiento.sql` | Tabla `estacionamiento_sesiones` (ingreso/salida, cobro al salir) + RLS + índices. | ✅ 2026-08-28 en vivo + Management API (8 columnas, 1 policy). |
| 2026-08-28 | `supabase-subsidio.sql` | Ledger `subsidios` (monto/categorías/vigencia/acreditado_por) + RLS + índices. | ✅ 2026-08-28 en vivo + Management API (9 columnas, 1 policy). |
| 2026-09-02 | `supabase-auth-organizador-merchant.sql` (raíz `JOI360/`) | Track B — triggers de hash bcrypt para `organizadores.password` y `merchants.panel_password`; RPCs `verificar_login_organizador` / `verificar_login_merchant` (security definer); columnas `merchants.panel_*`; `REVOKE SELECT` de columnas de secreto (`password`, `*_hash`, `pos_pin`, `sponsor_password`) para `anon`. | ✅ 2026-09-02 vía Management API: ambas RPCs existen, columnas de merchant agregadas, 0 contraseñas de organizador en texto plano. El fallback local transitorio del cliente ya se quitó. |

## Sin `.sql` versionado en el repo (deuda — Track J)

| Objeto en prod | Qué es | Estado |
|---|---|---|
| RPC `mover_cashback_wallet` | Mueve `wallets.cashback_balance` en el cobro del POS, con reversión ante fallo del cobro principal. `pronargs=7`, tiene candado de dueño/turno (verificado 2026-09-02). | **Falta escribir su `.sql` en el repo.** |
| RPC `verificar_login_sponsor` | Login del Panel de Mundo — compara contra el hash server-side. Creada directo en el SQL Editor. | **Falta escribir su `.sql` en el repo.** |
| Trigger `crypt()` de `organizadores` / credenciales de merchant | No existe — `organizadores.password` se guarda en texto plano (Discrepancia #3 / Track B). | Pendiente de construir (Track B). |
