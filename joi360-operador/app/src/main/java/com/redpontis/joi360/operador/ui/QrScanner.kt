package com.redpontis.joi360.operador.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

/**
 * Escáner de QR con permiso resuelto en tiempo de ejecución.
 *
 * Declarar CAMERA en el manifiesto no alcanza desde Android 6: hay que pedirlo
 * al usuario. Sin ese permiso el lector arranca igual y falla con el mensaje
 * genérico de Android ("the android camera encountered a problem, you may need
 * to restart the device"), que hace pensar que el equipo está roto cuando en
 * realidad solo faltaba autorizar.
 *
 * Además, un terminal POS puede no tener cámara: en ese caso se avisa y se
 * deja seguir por pulsera o documento, en vez de abrir un lector imposible.
 */
@Composable
fun rememberQrScanner(
    prompt: String,
    onError: (String) -> Unit = {},
    onResult: (String) -> Unit,
): () -> Unit {
    val context = LocalContext.current

    val scanLauncher = rememberLauncherForActivityResult(ScanContract()) { r ->
        r.contents?.let(onResult)
    }

    fun abrirLector() {
        scanLauncher.launch(
            ScanOptions()
                .setPrompt(prompt)
                .setBeepEnabled(false)
                .setOrientationLocked(true)
                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        )
    }

    val permisoLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { concedido ->
        if (concedido) abrirLector()
        else onError("Sin permiso de cámara no se puede escanear. Actívalo en los ajustes del equipo.")
    }

    return {
        val hayCamara = context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)
        val concedido = ContextCompat.checkSelfPermission(
            context, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        when {
            !hayCamara -> onError("Este equipo no tiene cámara. Identifica con la pulsera o el documento.")
            concedido -> abrirLector()
            else -> permisoLauncher.launch(Manifest.permission.CAMERA)
        }
    }
}
