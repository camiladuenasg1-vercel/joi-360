package com.redpontis.joi360.operador.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.redpontis.joi360.operador.data.Api
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.data.Titular
import com.redpontis.joi360.operador.nfc.rememberNfcScanner
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.launch

/**
 * Último paso de vincular una pulsera: la persona ya está identificada (por
 * DNI o QR — nunca por NFC, porque si tuviera una pulsera propia vinculada no
 * estaría aquí). Ahora se le entrega una pulsera física nueva y el operador
 * la tapea contra el lector para atarla a esa cuenta.
 *
 * Reusa el mismo bands/link del backend que ya vinculaba pulseras desde el
 * panel web — la columna linked_user_id de nfc_bands existía desde antes,
 * lo que no existía era ningún camino del terminal físico para escribirla.
 */
@Composable
fun VincularBanditaScreen(
    config: RenderConfig,
    titular: Titular,
    onBack: () -> Unit,
    onListo: () -> Unit,
) {
    var vinculando by remember { mutableStateOf(false) }
    var listo by remember { mutableStateOf(false) }
    var codigoVinculado by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun vincular(bandCode: String) {
        if (vinculando || listo) return
        vinculando = true
        error = null
        scope.launch {
            Api.vincularBandita(config.worldId, bandCode, titular.userId)
                .onSuccess { vinculando = false; listo = true; codigoVinculado = bandCode }
                .onFailure { vinculando = false; error = it.message }
        }
    }

    val nfc = rememberNfcScanner(enabled = !vinculando && !listo) { vincular(it) }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        if (listo) {
            Spacer(Modifier.height(40.dp))
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(96.dp).background(Joi.OkSoft, RoundedCornerShape(48.dp)),
                    contentAlignment = Alignment.Center,
                ) { Text("✓", fontSize = 46.sp, color = Joi.Ok, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.height(20.dp))
                Text("Pulsera vinculada", style = MaterialTheme.typography.headlineMedium, color = Joi.Ink)
                Spacer(Modifier.height(8.dp))
                Text(
                    "${titular.nombre ?: "Cliente"} ya puede usarla para identificarse.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Joi.InkMuted,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(28.dp))
            Panel { DataRow("Código de la pulsera", codigoVinculado ?: "—") }
            Spacer(Modifier.height(28.dp))
            BigButton("Listo", onClick = onListo)
            return@Column
        }

        ScreenHeader("Vincular pulsera", titular.nombre ?: "Cliente sin nombre registrado", onBack)
        Spacer(Modifier.height(28.dp))

        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            NfcPulse(active = nfc?.encendido == true && !vinculando)
            Spacer(Modifier.height(14.dp))
            Text(
                when {
                    vinculando -> "Vinculando…"
                    nfc == null || !nfc.disponible -> "Este equipo no tiene lector NFC"
                    !nfc.encendido -> "Activa el NFC del equipo para leer pulseras"
                    else -> "Entrégale la pulsera y acércala al lector"
                },
                style = MaterialTheme.typography.titleMedium,
                color = if (nfc?.encendido == true) Joi.Ink else Joi.InkMuted,
                textAlign = TextAlign.Center,
            )
        }

        if (error != null) {
            Spacer(Modifier.height(22.dp))
            Notice(error!!, NoticeTone.Danger)
        }

        Spacer(Modifier.height(28.dp))
        BigButton(
            label = "Cancelar vinculación",
            tone = Joi.Danger,
            enabled = !vinculando,
            onClick = onBack,
        )
    }
}
