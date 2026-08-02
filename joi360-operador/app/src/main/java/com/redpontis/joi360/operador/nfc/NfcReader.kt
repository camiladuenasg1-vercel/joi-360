package com.redpontis.joi360.operador.nfc

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner

/**
 * Lectura de pulseras NFC con el NfcAdapter estándar de Android en modo lector
 * (ReaderMode), el mismo camino que ya usaba la app instalada de fábrica en el
 * terminal — no requiere SDK propietario de Topwise.
 *
 * ReaderMode y no foreground dispatch: evita que el sistema lance intents y
 * relance la Activity en cada tap, que en un mostrador se traduce en lecturas
 * perdidas y parpadeo de pantalla.
 */
class NfcController(private val activity: Activity) {
    private val adapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(activity)

    val disponible: Boolean get() = adapter != null
    val encendido: Boolean get() = adapter?.isEnabled == true

    fun start(onTag: (String) -> Unit) {
        val a = adapter ?: return
        val flags = NfcAdapter.FLAG_READER_NFC_A or
            NfcAdapter.FLAG_READER_NFC_B or
            NfcAdapter.FLAG_READER_NFC_F or
            NfcAdapter.FLAG_READER_NFC_V or
            NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK
        a.enableReaderMode(activity, { tag: Tag -> onTag(codigoDeTag(tag)) }, flags, null)
    }

    fun stop() {
        adapter?.disableReaderMode(activity)
    }

    /**
     * El código impreso/registrado de la pulsera es el UID del tag en
     * hexadecimal mayúsculas — mismo formato con el que RedPontis carga el
     * lote por CSV a nfc_bands.codigo.
     */
    private fun codigoDeTag(tag: Tag): String =
        tag.id.joinToString("") { "%02X".format(it) }
}

/**
 * Activa la lectura NFC solo mientras la pantalla que la necesita está en
 * primer plano, y la apaga al salir. Sin esto el lector queda tomado por una
 * pantalla que ya nadie ve.
 */
@Composable
fun rememberNfcScanner(enabled: Boolean, onTag: (String) -> Unit): NfcController? {
    val context = LocalContext.current
    val activity = context as? Activity ?: return null
    val controller = remember(activity) { NfcController(activity) }
    val current by rememberUpdatedState(onTag)
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(enabled, lifecycleOwner) {
        if (!enabled) {
            onDispose { }
        } else {
            val observer = LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_RESUME -> controller.start { current(it) }
                    Lifecycle.Event.ON_PAUSE -> controller.stop()
                    else -> Unit
                }
            }
            lifecycleOwner.lifecycle.addObserver(observer)
            controller.start { current(it) }
            onDispose {
                lifecycleOwner.lifecycle.removeObserver(observer)
                controller.stop()
            }
        }
    }
    return controller
}
