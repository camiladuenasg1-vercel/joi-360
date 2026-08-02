# JOI 360 · Operador

App Android nativa (Kotlin + Jetpack Compose) para el terminal POS y el celular
del operador dentro del ecosistema JOI 360.

Un mismo binario sirve a dos actores, porque en la práctica es el mismo trabajo:
identificar a una persona y resolver una operación con ella.

- **Comercio**: cobrar con saldo, consultar saldo y restricciones, cuadre de caja.
- **Operador de evento**: validar entradas (check-in) y control de accesos por zona.

## Lo que se ve NO está cableado en la app

Al abrir caja, el terminal pide su **RenderConfig** al backend, que lo arma
leyendo las capacidades reales que RedPontis activó para ese mundo
(`world_capacity_configs` + `world_feature_flags`, las mismas tablas que
gobiernan la super app y el panel del mundo).

Si un mundo no tiene eventos activos, el botón de entradas no existe en ese
terminal. Sin recompilar, sin tocar el equipo, sin banderas locales.

## Identificación

Tres caminos conviven en una sola pantalla, porque en mostrador el operador no
sabe de antemano cuál traerá el cliente:

1. **Pulsera NFC** — `NfcAdapter` en ReaderMode (no requiere SDK propietario del
   fabricante). El UID del tag en hexadecimal es el mismo código con el que
   RedPontis carga el lote a `nfc_bands`.
2. **QR** — lector embebido (ZXing).
3. **Documento (DNI)** — busca primero entre dependientes y luego entre titulares.

## Diseño

Tokens portados del sistema real de JOI 360 (`joi360-app/src/index.css`):
violeta de marca `#3525CD`, tinta `#1B1B24`, fondo `#FCF8FF`.

Dos desviaciones deliberadas, ambas por el contexto físico del terminal:

- Texto secundario oscurecido de `#777587` a `#56546B`. La pantalla del POS se
  ve lavada bajo luz cálida de local y el gris original no alcanzaba 4.5:1.
- Altura mínima de acción primaria 64dp y campos de 62dp. Se opera de pie, con
  prisa y a veces con una mano ocupada.

## Compilar

Requiere JDK 17 y Android SDK (compileSdk 36).

```bash
gradle :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Compilar desde una ruta corta y sin espacios ni acentos (`C:\joi360op`): AGP
falla de formas poco obvias dentro de carpetas sincronizadas por OneDrive.

## Backend

https://joi-pos-backend.vercel.app — repo:
https://github.com/camiladuenasg1-vercel/joi-pos-backend

El servidor es configurable en la pantalla de login ("Cambiar servidor") para
poder apuntar a otro entorno sin recompilar.
