# SPEC Funcional — Crédito

*Capacidad **planificada** (`v0.0.0`) — sin código de negocio construido. Este documento NO es una especificación funcional completa como las del resto del catálogo (ver `spec_eventos.md` para el formato de referencia): es la declaración honesta de alcance y bloqueo. Ver `no-mock.md` en `kiro_steering/`.*

Fuente: `joi360-admin/src/store.js` (`MODULE_CATALOG`, entrada `credito`), `supabase.js` (`MODULOS_PROXIMAMENTE`). 23-sep-2026.

## Qué es (alcance objetivo, no construido)

Líneas de crédito o saldo financiado a usuarios para consumos dentro del ecosistema, con scoring de riesgo, cuotas fijas y cobranza. Alto control regulatorio (es, en la práctica, un producto financiero real).

- **Tier:** OPCIONAL. **Depende de:** `wallet` (`DEPENDENCY_MAP`).
- **Config fields declarados en el catálogo** (sin flujo real detrás): `lineaMax` (currency, def. 1000 — monto máximo de línea asignable), `tasaInteres` (percent, def. 24 — TEA aplicada al saldo en cuotas).
- **Servicios previstos** (texto libre, no flags reales): scoring básico de riesgo, línea revolvente, cuotas fijas, recordatorios de cobranza, historial crediticio.

## Por qué está bloqueada

**Decisión de producto, no de infraestructura** (a diferencia de Facturación): `bnpl` (Compra Ahora Paga Después) ya cubre operativamente el caso de uso de "financiar una compra en cuotas" para el catálogo actual de casos técnicos — Crédito como línea revolvente independiente se solaparía con BNPL sin un caso de negocio distinto claro todavía. Además, una línea de crédito real trae obligaciones regulatorias (reporte a centrales de riesgo, tasas reguladas) que BNPL en marca blanca no asume de la misma forma.

## Qué NO construir (regla dura, ver `no-mock.md`)

- Ninguna pantalla de "Mi línea de crédito" en la superapp.
- Ningún scoring simulado ni cronograma de cuotas fuera de BNPL.
- Si un Mundo activara esta capacidad por error, debe caer en el fallback genérico honesto — nunca una vista de negocio ni datos financieros inventados.

## Cuándo se levanta el bloqueo

Cuando exista una decisión de producto explícita de que Crédito (línea revolvente) es un caso de uso distinto y necesario más allá de lo que BNPL ya resuelve. En ese momento, este documento se reemplaza por una SPEC funcional completa siguiendo el formato de `spec_bnpl.md` (la capacidad más cercana en naturaleza).
