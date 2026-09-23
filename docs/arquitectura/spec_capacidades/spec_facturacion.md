# SPEC Funcional — Facturación

*Capacidad **planificada** (`v0.0.0`) — sin código de negocio construido. Este documento NO es una especificación funcional completa como las del resto del catálogo (ver `spec_eventos.md` para el formato de referencia): es la declaración honesta de alcance y bloqueo, para que Kiro sepa exactamente qué NO debe construir todavía y por qué. Ver `no-mock.md` en `kiro_steering/`.*

Fuente: `joi360-admin/src/store.js` (`MODULE_CATALOG`, entrada `facturacion`), `supabase.js` (`MODULOS_PROXIMAMENTE`). 23-sep-2026.

## Qué es (alcance objetivo, no construido)

Comprobantes electrónicos (boletas/facturas/notas de crédito) asociados a transacciones reales del ecosistema — recargas, compras a comercios, suscripciones. Requiere integración con un proveedor PSE (facturación electrónica) y con SUNAT (autoridad tributaria peruana).

- **Tier:** PREMIUM. **Depende de:** `comercios, consumos` (`DEPENDENCY_MAP`).
- **Config fields declarados en el catálogo** (sin flujo real detrás todavía): `rucEmisor` (RUC de la entidad emisora), `serieBoleta` (def. "B001"), `serieFactura` (def. "F001").
- **Servicios previstos** (texto libre en el catálogo, no flags reales): integración con proveedor PSE, emisión de boletas/facturas para suscripciones, emisión de boletas/facturas para compras a comercios, nota de crédito, integración SUNAT.

## Por qué está bloqueada

Necesita: (1) selección y contrato con un proveedor PSE real, (2) certificación SUNAT (RUC del emisor, series autorizadas), (3) un servicio backend que emita y timbre el comprobante — nada de esto existe en el proyecto (SPAs + PostgREST + funciones cliente, sin backend propio con firma digital). No es una decisión de producto pendiente como Crédito — es una dependencia de infraestructura externa real.

## Qué NO construir (regla dura, ver `no-mock.md`)

- Ninguna pantalla de "Mis comprobantes" en la superapp.
- Ningún botón "Emitir boleta" en ningún panel admin.
- Ningún PDF de boleta simulado.
- Si un Mundo activara esta capacidad por error, debe caer en el fallback genérico honesto (`GenericTemplate` / render code no enrutado) — nunca una vista de negocio.

## Cuándo se levanta el bloqueo

Cuando exista una decisión de producto sobre el proveedor PSE a integrar. En ese momento, este documento se reemplaza por una SPEC funcional completa siguiendo el formato de `spec_eventos.md`.
