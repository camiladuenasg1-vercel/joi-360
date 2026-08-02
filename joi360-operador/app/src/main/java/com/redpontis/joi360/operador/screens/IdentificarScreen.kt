package com.redpontis.joi360.operador.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.redpontis.joi360.operador.Proposito
import com.redpontis.joi360.operador.data.Api
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.data.Titular
import com.redpontis.joi360.operador.nfc.rememberNfcScanner
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.launch

/**
 * Identificar a la persona. Es el momento central del producto: convertir una
 * pulsera, un QR o un documento en alguien con saldo, alergias y permisos.
 *
 * Los tres caminos conviven en una sola pantalla en vez de esconderse en
 * pestañas: en mostrador el operador no sabe de antemano cuál traerá el
 * cliente, y cambiar de método no debe costar una navegación.
 */
@Composable
fun IdentificarScreen(
    config: RenderConfig,
    proposito: Proposito,
    monto: Double,
    onBack: () -> Unit,
    onTitular: (Titular) -> Unit,
) {
    var dni by remember { mutableStateOf("") }
    var buscando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun resolver(codigo: String, porDni: Boolean = false, origen: String = "manual") {
        if (buscando) return
        buscando = true
        error = null
        scope.launch {
            val r = if (porDni) Api.buscarPorDni(config.worldId, codigo)
            else Api.identificar(config.worldId, codigo, origen)
            buscando = false
            r.onSuccess { onTitular(it) }
             .onFailure { error = it.message }
        }
    }

    // Lector NFC activo solo mientras esta pantalla está al frente.
    val nfc = rememberNfcScanner(enabled = config.capabilities.banditaNfc && !buscando) { tag ->
        resolver(tag, origen = "nfc")
    }

    val escanearQr = rememberQrScanner(
        prompt = "Enfoca el QR del cliente",
        onError = { error = it },
    ) { resolver(it) }

    val titulo = when (proposito) {
        Proposito.Cobro -> "¿Quién paga?"
        Proposito.Acceso -> "¿Quién ingresa?"
        Proposito.Consulta -> "¿A quién consultamos?"
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Joi.Bg)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(top = 12.dp, bottom = 24.dp),
    ) {
        ScreenHeader(
            title = titulo,
            subtitle = if (proposito == Proposito.Cobro)
                "Cobro de S/ ${"%.2f".format(monto)}" else null,
            onBack = onBack,
        )

        Spacer(Modifier.height(28.dp))

        // ── Camino 1: pulsera NFC ─────────────────────────────────────────
        if (config.capabilities.banditaNfc) {
            Column(
                Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                NfcPulse(active = nfc?.encendido == true && !buscando)
                Spacer(Modifier.height(14.dp))
                Text(
                    when {
                        buscando -> "Leyendo…"
                        nfc == null || !nfc.disponible -> "Este equipo no tiene lector NFC"
                        !nfc.encendido -> "Activa el NFC del equipo para leer pulseras"
                        else -> "Acerca la pulsera al lector"
                    },
                    style = MaterialTheme.typography.titleMedium,
                    color = if (nfc?.encendido == true) Joi.Ink else Joi.InkMuted,
                )
            }
            Spacer(Modifier.height(30.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(1.dp).background(Joi.Border))
                Text(
                    "  o  ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Joi.InkFaint,
                )
                Box(Modifier.weight(1f).height(1.dp).background(Joi.Border))
            }
            Spacer(Modifier.height(24.dp))
        }

        // ── Camino 2: QR ──────────────────────────────────────────────────
        GhostButton("Escanear código QR", onClick = escanearQr)

        Spacer(Modifier.height(24.dp))

        // ── Camino 3: documento ───────────────────────────────────────────
        Field(
            label = "Documento (DNI)",
            value = dni,
            onValueChange = { dni = it.filter(Char::isDigit); error = null },
            placeholder = "Ingresar DNI",
            keyboardType = KeyboardType.Number,
            maxLength = 8,
        )
        Spacer(Modifier.height(16.dp))
        BigButton(
            label = "Buscar por documento",
            enabled = dni.length == 8,
            loading = buscando,
            onClick = { resolver(dni, porDni = true) },
        )

        if (error != null) {
            Spacer(Modifier.height(22.dp))
            Notice(error!!, NoticeTone.Danger)
        }
    }
}
