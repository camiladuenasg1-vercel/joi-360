package com.redpontis.joi360.operador.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.redpontis.joi360.operador.data.*
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.launch

/** Teclado numérico propio: en un POS no se usa el teclado del sistema. */
@Composable
fun CobrarMontoScreen(
    config: RenderConfig,
    onBack: () -> Unit,
    onContinuar: (Double) -> Unit,
) {
    var raw by remember { mutableStateOf("") }
    val monto = (raw.toLongOrNull() ?: 0L) / 100.0

    fun tecla(t: String) {
        raw = when (t) {
            "⌫" -> raw.dropLast(1)
            else -> (raw + t).trimStart('0').take(8)
        }
    }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 16.dp),
    ) {
        ScreenHeader("Cobrar", config.shopName ?: "", onBack)

        Spacer(Modifier.weight(1f))

        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("MONTO A COBRAR", style = MaterialTheme.typography.labelMedium, color = Joi.InkMuted)
            Spacer(Modifier.height(12.dp))
            Text(
                "S/ ${"%.2f".format(monto)}",
                style = MaterialTheme.typography.displayLarge,
                color = if (monto > 0) Joi.Ink else Joi.InkFaint,
            )
        }

        Spacer(Modifier.weight(1f))

        listOf(
            listOf("1", "2", "3"),
            listOf("4", "5", "6"),
            listOf("7", "8", "9"),
            listOf("00", "0", "⌫"),
        ).forEach { fila ->
            Row(
                Modifier.fillMaxWidth().padding(bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                fila.forEach { t ->
                    Box(
                        Modifier
                            .weight(1f)
                            .height(68.dp)
                            .background(Joi.Surface, RoundedCornerShape(16.dp))
                            .clickable { tecla(t) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(t, fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = Joi.Ink)
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        BigButton("Continuar", enabled = monto > 0) { onContinuar(monto) }
    }
}

/**
 * Confirmación del cobro. Muestra a quién se le va a cobrar ANTES de mover
 * dinero, incluyendo alergias y si es un dependiente: en un colegio, cobrarle
 * al menor equivocado no es un error de sistema, es un problema real.
 */
@Composable
fun ConfirmarCobroScreen(
    config: RenderConfig,
    titular: Titular,
    monto: Double,
    turnoId: String?,
    onBack: () -> Unit,
    onListo: () -> Unit,
) {
    var cobrando by remember { mutableStateOf(false) }
    var resultado by remember { mutableStateOf<ChargeResult?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val saldoAlcanza = titular.balance == null || titular.balance >= monto

    fun cobrar() {
        if (cobrando) return
        cobrando = true
        error = null
        scope.launch {
            // Cobrar solo se llega con chargeWallet true — nunca en sesión de mundo.
            Api.cobrar(config.shopId!!, titular.userId, monto, turnoId)
                .onSuccess { cobrando = false; resultado = it }
                .onFailure { cobrando = false; error = it.message }
        }
    }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        val r = resultado
        if (r != null && r.ok) {
            Spacer(Modifier.height(40.dp))
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(96.dp).background(Joi.OkSoft, RoundedCornerShape(48.dp)),
                    contentAlignment = Alignment.Center,
                ) { Text("✓", fontSize = 46.sp, color = Joi.Ok, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.height(20.dp))
                Text("Cobro realizado", style = MaterialTheme.typography.headlineMedium, color = Joi.Ink)
                Spacer(Modifier.height(8.dp))
                Text(
                    "S/ ${"%.2f".format(monto)} · ${titular.nombre ?: "Cliente"}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Joi.InkMuted,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(28.dp))
            Panel {
                if (r.balance != null) DataRow("Saldo restante", "S/ ${"%.2f".format(r.balance)}", emphasis = true)
                if (r.saleCode != null) DataRow("Comprobante", r.saleCode)
            }
            Spacer(Modifier.height(28.dp))
            BigButton("Listo", onClick = onListo)
            return@Column
        }

        ScreenHeader("Confirmar cobro", null, onBack)
        Spacer(Modifier.height(24.dp))

        Panel {
            Text(
                titular.nombre ?: "Cliente sin nombre registrado",
                style = MaterialTheme.typography.titleLarge,
                color = Joi.Ink,
            )
            if (titular.esDependiente) {
                Spacer(Modifier.height(6.dp))
                Text("Perfil dependiente", style = MaterialTheme.typography.bodyMedium, color = Joi.InkMuted)
            }
            Spacer(Modifier.height(16.dp))
            DataRow("Saldo disponible", titular.balance?.let { "S/ ${"%.2f".format(it)}" } ?: "—")
            DataRow("A cobrar", "S/ ${"%.2f".format(monto)}", emphasis = true)
        }

        if (!titular.alergias.isNullOrBlank()) {
            Spacer(Modifier.height(16.dp))
            Notice("Alergias registradas: ${titular.alergias}", NoticeTone.Warn)
        }

        if (!saldoAlcanza) {
            Spacer(Modifier.height(16.dp))
            Notice(
                "El saldo no alcanza para este cobro. Pide una recarga antes de continuar.",
                NoticeTone.Danger,
            )
        }

        if (r != null && !r.ok) {
            Spacer(Modifier.height(16.dp))
            Notice(motivoLegible(r.motivoRechazo), NoticeTone.Danger)
        }
        if (error != null) {
            Spacer(Modifier.height(16.dp))
            Notice(error!!, NoticeTone.Danger)
        }

        Spacer(Modifier.height(28.dp))
        BigButton(
            label = "Cobrar S/ ${"%.2f".format(monto)}",
            enabled = saldoAlcanza,
            loading = cobrando,
            onClick = { cobrar() },
        )
        Spacer(Modifier.height(12.dp))
        GhostButton("Cancelar", onClick = onBack)
    }
}

/** Ficha de consulta: saldo, restricciones y datos de emergencia reales. */
@Composable
fun FichaTitularScreen(titular: Titular, onBack: () -> Unit, onListo: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        ScreenHeader("Ficha del cliente", null, onBack)
        Spacer(Modifier.height(24.dp))

        Panel {
            Text(
                titular.nombre ?: "Cliente sin nombre registrado",
                style = MaterialTheme.typography.titleLarge,
                color = Joi.Ink,
            )
            Spacer(Modifier.height(14.dp))
            DataRow("Saldo", titular.balance?.let { "S/ ${"%.2f".format(it)}" } ?: "Sin billetera", emphasis = true)
            DataRow("Tipo de perfil", if (titular.esDependiente) "Dependiente" else "Titular")
            if (!titular.tipoSangre.isNullOrBlank()) DataRow("Tipo de sangre", titular.tipoSangre)
            if (!titular.contactoEmergencia.isNullOrBlank())
                DataRow("Contacto de emergencia", titular.contactoEmergencia)
        }

        Spacer(Modifier.height(16.dp))
        if (!titular.alergias.isNullOrBlank()) {
            Notice("Alergias registradas: ${titular.alergias}", NoticeTone.Warn)
        } else {
            Notice("Sin alergias registradas.", NoticeTone.Info)
        }

        Spacer(Modifier.height(28.dp))
        BigButton("Listo", onClick = onListo)
    }
}
