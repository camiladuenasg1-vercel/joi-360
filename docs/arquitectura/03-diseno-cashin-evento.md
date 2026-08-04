# Diseño — Bandita de evento con saldo pre-cargado y lista de asistencia

**Task #119.** Escenario real descrito por la usuaria: un Mundo organiza un evento (ej. Kermesse), pide X banditas al almacén de RedPontis, precarga una lista de invitados por documento, cada bandita queda ligada al documento del invitado (y opcionalmente a su cuenta de app), se le puede precargar un saldo inicial, y el POS debe poder monitorear y hacer cash-in (recarga) adicional vía QR, con vigencia configurable desde el admin del organizador.

Esto es genuinamente distinto al flujo de vinculación que ya existe (#118): ese asume que la persona **ya tiene una cuenta registrada** en la app antes de tocar el POS. Acá el invitado puede no tener cuenta — la bandita necesita funcionar igual.

## Modelo de datos nuevo

**`event_guest_lists`** (una fila por evento con lista de invitados activada)
`id, event_id, world_id, nombre_archivo, importado_at, importado_por`

**`event_guests`** (una fila por invitado)
```
id, guest_list_id, event_id, world_id,
nombre, documento (DNI, único por evento),
guest_user_id  -- synthetic, generado como "guest-{event_id}-{documento}"
user_id_real   -- nullable: si el invitado reclama su bandita hacia su cuenta real después
bandita_codigo -- nullable hasta que se active en el POS
saldo_inicial  -- lo que se precargó al activar (0 si no aplica)
estado         -- invitado | bandita_asignada | activo | cerrado
vence_at       -- fin del evento + margen, no meses (a diferencia de la bandita normal)
created_at
```

**Wallet del invitado:** se reutiliza 100% la tabla `wallets` existente — una fila con `user_id = guest_user_id`, `world_id` del evento. Cero tablas nuevas para dinero: el saldo, las transacciones y el `mover_saldo_wallet` de hoy funcionan igual, sin distinguir "invitado" de "usuario registrado" a nivel de wallet. Es la misma razón por la que #118 fue rápido: reutilizar en vez de inventar un segundo sistema de dinero.

**`nfc_bands`** (ya existe): se vincula igual que en #118 (`linked_user_id = guest_user_id`), sin cambios de esquema.

## Flujo

1. **Importar lista** (admin del organizador, nueva pantalla): sube un CSV (nombre, documento) — mismo patrón que la carga masiva de `nfc_bands` por CSV que ya existe. Por cada fila: crea `event_guests` con `guest_user_id` sintético, crea la `wallets` row en `balance=0`.
2. **Activar bandita en el evento** (POS/operador, nueva pantalla "Activar bandita de evento", junto a "Vincular pulsera"): operador busca al invitado por documento (no por código JOI, porque no tiene uno), tapea la pulsera física nueva, opcionalmente ingresa un monto a precargar. Esto hace 2 cosas atómicas: (a) vincula la banda igual que `vincularNfcBandRemote`/`bands-link`, (b) si hay monto a precargar, llama `mover_saldo_wallet` con `p_tipo='recarga_evento'` — la precarga queda en el ledger como una recarga real, no un número inventado.
3. **Cash-in adicional durante el evento** (POS, nueva acción dentro de "Cobrar" o una pantalla propia "Recargar bandita de evento"): identifica la bandita (NFC/código), muestra saldo actual, cobra por QR (Yape/Plin — mismo mecanismo ya usado en recargas normales), llama `mover_saldo_wallet` tipo `recarga`.
4. **Consumo**: usa el `cobrarPOSRemote`/`mover_saldo_wallet` que YA existe, sin cambios — una bandita de evento cobra exactamente igual que una bandita normal, porque ambas son solo una `wallet` con un `user_id`.
5. **Vigencia**: a diferencia de `vigenciaBanditasMeses` (meses, pensado para un colegio todo el año), acá vence al terminar el evento + un margen configurable por el organizador (ej. "hasta 2 días después"). Se guarda en `event_guests.vence_at`, calculado desde la fecha del evento (`events.fecha`) al activar la bandita.
6. **Monitoreo** (admin del organizador, nueva pestaña "Banditas del evento"): tabla de invitados con estado, saldo actual (join contra `wallets`), consumo total (join contra `transactions`), exportable — para que el organizador sepa en tiempo real cuánta plata queda cargada y cuánto se consumió.
7. **Reclamar hacia cuenta real (opcional, fuera del MVP):** si el invitado quiere que su historial/saldo sobrante pase a su cuenta de la app, un flujo futuro de "vincular mi bandita de evento" — no se construye ahora, pero el campo `user_id_real` ya queda preparado para no tener que migrar el esquema después.

## Qué NO cambia (reuso deliberado)

- `wallets`, `transactions`, `nfc_bands`, `mover_saldo_wallet` — cero cambios de esquema, cero funciones nuevas.
- El cobro en el POS (`cobrarPOSRemote` / `shop-charge.js`) — no distingue invitado de usuario registrado, no necesita saberlo.

## Qué sí es nuevo

- 2 tablas (`event_guest_lists`, `event_guests`).
- Import de CSV de invitados (admin organizador).
- Pantalla "Activar bandita de evento" en el POS (web + nativo) — variante de #118 que busca por documento en vez de por código JOI, con campo opcional de precarga.
- Pantalla/acción "Recargar bandita de evento" en el POS (cash-in por QR).
- Pestaña "Banditas del evento" en el panel del organizador.

## Alcance sugerido para construir ahora

Dado el tamaño, sugiero dividir en 2 entregas en vez de una sola:
- **Entrega 1 (mínima, sirve para un evento ya mañana si hace falta):** las 2 tablas, importar CSV, activar bandita con precarga, cobro (ya funciona sin cambios). Sin cash-in adicional ni panel de monitoreo todavía — el organizador ve el consumo directo en Supabase o pidiéndolo a RedPontis.
- **Entrega 2:** cash-in por QR en el POS + panel de monitoreo del organizador + vigencia automática.

¿Construyo la Entrega 1 ahora, o el diseño completo de una sola vez?
