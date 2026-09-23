# SPEC Funcional — Subsidio

*Capacidad de un solo servicio (sin jerarquía de microservicios — ver `spec_eventos.md` para el formato de referencia completo). Construida y verificada en producción al 23-sep-2026.*

Fuente: código real (`joi360-app/src/pages/Module.jsx` función `SubsidioTemplate`, `supabaseClient.js`; `joi360-admin/src/Usuarios.jsx` función `SubsidioPanel`), `supabase-subsidio.sql` — leído directamente el mismo día de este documento.

---

## 1. Propósito y alcance

Saldo dirigido (subsidiado) real, acreditado por RedPontis a un usuario específico — con categorías de comercio permitidas y vigencia. Caso de uso: un tercero (empresa, gobierno, programa social) financia consumo dentro del ecosistema para personas puntuales, sin pasar por su wallet regular.

- **Tier:** OPCIONAL. **Versión:** v1.0.0 (26-ago). **Depende de:** `wallet` únicamente (`DEPENDENCY_MAP`).
- **Template:** `SubsidioTemplate` (`TEMPLATE_MAP.subsidio`).
- **Config:** `categorias` (text CSV, def. `"F&B,Educación"` — categorías de comercio donde se puede usar) · `vigenciaDias` (number, def. 30, nullable — días de vigencia de cada carga).

## 2. Modelo de negocio y reglas críticas

1. **Solo RedPontis acredita — sin autoservicio del Mundo.** No hay ningún botón de "acreditar subsidio" en ningún panel de administrador de Mundo/Sponsor/Comercio — la única superficie de escritura es `SubsidioPanel`, dentro del panel **Admin RP**, en la ficha de detalle de una persona (`Usuarios.jsx`, ruta de usuarios del mundo). Decisión explícita de Camila (26-ago): control centralizado, no delegado.
2. **Uno a la vez, sin carga masiva.** `acreditarSubsidioRemote(worldId, userId, monto, categorias, vigenteHasta, acreditadoPor)` opera sobre un único usuario por llamada — no existe importación CSV como sí la tiene el sistema de banditas cashless de Eventos (`event_guests`, ver `spec_eventos.md` §3.6). `acreditadoPor` queda registrado (el email de la sesión admin que acreditó) — es un ledger auditable, no un ajuste anónimo.
3. **Ledger propio, aislado de la wallet.** El saldo subsidiado **NO toca `wallets.balance` ni pasa por `mover_saldo_wallet`** — es intencional (ver comentario en la migración): mezclar esto con el RPC crítico de dinero real requiere cuidado dedicado, se dejó fuera de v1.0.0 a propósito.
4. **El consumo real del subsidio (gastarlo en una compra) NO está construido.** `SubsidioTemplate` lo dice explícitamente en la UI: "Próximamente podrás pagar directamente con este saldo en los comercios habilitados." Hoy el subsidio es **saldo visible y auditable, no gastable** — es el gap más importante de esta capacidad, documentado honestamente en el propio código, no simulado.
5. **Categorías son informativas, no un filtro real de compra** (consecuencia directa del punto 4 — sin flujo de gasto, no hay checkout que las aplique). Se muestran como referencia de dónde se podrá usar cuando exista el flujo de consumo.
6. **Vigencia por acreditación individual**, no global — cada fila de `subsidios` tiene su propio `vigente_hasta`; un subsidio vencido deja de sumar al "saldo disponible" mostrado (aunque la fila queda visible en el historial, marcada "Vencido").

## 3. Flujo real

**Lado RedPontis (autoría):** Admin RP → Usuarios del Mundo → detalle de una persona → `SubsidioPanel` → ingresa monto, categorías (opcional), vigencia → `acreditarSubsidioRemote` → INSERT real en `subsidios`.

**Lado usuario (consulta):** `SubsidioTemplate` muestra un hero con el saldo disponible agregado (suma de `monto - monto_usado` de todas las acreditaciones vigentes — `monto_usado` existe en el esquema para cuando el consumo se construya, hoy siempre en `0`), próximo vencimiento, categorías válidas, e historial de acreditaciones (con badge "Vencido" cuando corresponde).

## 4. Modelo de datos

```sql
subsidios (
  id             uuid primary key default gen_random_uuid(),
  world_id       text not null,
  user_id        uuid not null,
  monto          numeric not null,
  monto_usado    numeric not null default 0,   -- preparado para el consumo futuro, sin lógica que lo escriba aún
  categorias     text,
  vigente_hasta  date,
  acreditado_por text,                          -- email del admin RP que acreditó
  created_at     timestamptz not null default now()
)
-- índice: (user_id, world_id) · RLS demo_anon_all
```

## 5. Componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **Admin RP** | `SubsidioPanel` (`Usuarios.jsx`, dentro del detalle de una persona) | Único punto de escritura — acreditación uno a uno |
| **App Usuario** | `SubsidioTemplate` (`Module.jsx`) | Solo lectura — saldo, categorías, historial. Sin ninguna acción de gasto todavía |
| **BackOffice Mundo / Comercio** | Ninguno | El Mundo no tiene visibilidad ni control sobre subsidios acreditados a sus usuarios — vive enteramente del lado RedPontis |

## 6. Estado y versionado

`v1.0.0`, funcional end-to-end para acreditación y consulta. **El consumo (gastar el subsidio en una compra real) es el gap central, documentado explícitamente como v1.1 futura** — construirlo requiere decidir cómo interactúa con `mover_saldo_wallet` (¿un RPC paralelo que descuenta de `subsidios.monto_usado` en vez de `wallets.balance`? ¿prioridad subsidio-primero vs. saldo-primero en un checkout mixto?) — es una decisión de diseño no trivial, no solo una pantalla más.
