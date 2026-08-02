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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.redpontis.joi360.operador.data.*
import com.redpontis.joi360.operador.nfc.rememberNfcScanner
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Control de accesos. Pensado para una puerta con cola detrás: el veredicto
 * ocupa la pantalla completa en verde o rojo, legible a un brazo de distancia,
 * y se limpia solo a los pocos segundos para atender al siguiente.
 */
@Composable
fun AccesoScreen(config: RenderConfig, onBack: () -> Unit) {
    // Accesos hoy es entrar y salir del recinto: no hay zonas ni áreas
    // internas, así que no se le pide al operador una zona que el sistema no
    // sabe interpretar. Lo único que decide es la dirección del movimiento.
    var tipo by remember { mutableStateOf("ingreso") }
    var veredicto by remember { mutableStateOf<AccesoResult?>(null) }
    var procesando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun validar(codigo: String, origen: String = "nfc") {
        if (procesando) return
        procesando = true
        error = null
        scope.launch {
            Api.validarAcceso(config.worldId, codigo, tipo, origen)
                .onSuccess { procesando = false; veredicto = it }
                .onFailure { procesando = false; error = it.message }
        }
    }

    val nfc = rememberNfcScanner(
        enabled = config.capabilities.banditaNfc && veredicto == null && !procesando,
    ) { validar(it) }

    val escanearQr = rememberQrScanner(
        prompt = "Enfoca el QR del usuario",
        onError = { error = it },
    ) { validar(it, origen = "manual") }

    // El veredicto se autolimpia: en una puerta nadie tiene una mano libre.
    LaunchedEffect(veredicto) {
        if (veredicto != null) { delay(3500); veredicto = null }
    }

    val v = veredicto
    if (v != null) {
        val ok = v.ok
        Column(
            Modifier
                .fillMaxSize()
                .background(if (ok) Joi.Ok else Joi.Danger)
                .clickable { veredicto = null }
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(if (ok) "✓" else "✕", fontSize = 96.sp, color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(20.dp))
            Text(
                if (ok) "Acceso permitido" else "Acceso denegado",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                if (ok) (if (tipo == "ingreso") "Ingreso registrado" else "Salida registrada")
                else motivoLegible(v.motivo),
                fontSize = 18.sp,
                color = Color.White.copy(alpha = 0.9f),
                textAlign = TextAlign.Center,
            )
            // Cerrar el círculo en la puerta: el operador ve que el apoderado ya
            // se enteró, sin tener que preguntarlo ni prometerlo de palabra.
            if (ok && v.avisoApoderado != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    "Se avisó al apoderado de ${v.avisoApoderado}",
                    fontSize = 16.sp,
                    color = Color.White.copy(alpha = 0.85f),
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(36.dp))
            Text("Toca para continuar", fontSize = 15.sp, color = Color.White.copy(alpha = 0.75f))
        }
        return
    }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        ScreenHeader("Validar acceso", config.worldName, onBack)
        Spacer(Modifier.height(24.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("ingreso" to "Ingreso", "salida" to "Salida").forEach { (k, label) ->
                val sel = tipo == k
                Box(
                    Modifier
                        .weight(1f)
                        .height(56.dp)
                        .background(if (sel) Joi.Primary else Joi.Surface, RoundedCornerShape(16.dp))
                        .clickable { tipo = k },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        color = if (sel) Color.White else Joi.InkMuted,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 17.sp,
                    )
                }
            }
        }

        Spacer(Modifier.height(28.dp))
        if (config.capabilities.banditaNfc) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                NfcPulse(active = nfc?.encendido == true && !procesando)
                Spacer(Modifier.height(12.dp))
                Text(
                    if (procesando) "Validando…" else "Acerca la pulsera al lector",
                    style = MaterialTheme.typography.titleMedium,
                    color = Joi.Ink,
                )
            }
            Spacer(Modifier.height(24.dp))
        }

        GhostButton("Escanear QR del usuario", onClick = escanearQr)

        if (error != null) {
            Spacer(Modifier.height(20.dp))
            Notice(error!!, NoticeTone.Danger)
        }
    }
}

/** Check-in de entradas de evento. Mismo patrón de veredicto a pantalla completa. */
@Composable
fun EntradaScreen(config: RenderConfig, onBack: () -> Unit) {
    var veredicto by remember { mutableStateOf<TicketResult?>(null) }
    var procesando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun validar(qr: String) {
        if (procesando) return
        procesando = true
        error = null
        scope.launch {
            Api.validarEntrada(config.worldId, qr)
                .onSuccess { procesando = false; veredicto = it }
                .onFailure { procesando = false; error = it.message }
        }
    }

    val escanearQr = rememberQrScanner(
        prompt = "Enfoca el QR de la entrada",
        onError = { error = it },
    ) { validar(it) }

    LaunchedEffect(veredicto) {
        if (veredicto != null) { delay(4000); veredicto = null }
    }

    val v = veredicto
    if (v != null) {
        Column(
            Modifier
                .fillMaxSize()
                .background(if (v.ok) Joi.Ok else Joi.Danger)
                .clickable { veredicto = null }
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(if (v.ok) "✓" else "✕", fontSize = 96.sp, color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(20.dp))
            Text(
                if (v.ok) "Entrada válida" else "Entrada rechazada",
                fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                if (v.ok) listOfNotNull(v.titular, v.tipo).joinToString(" · ").ifBlank { "Ingreso registrado" }
                else motivoLegible(v.motivo),
                fontSize = 18.sp, color = Color.White.copy(alpha = 0.92f), textAlign = TextAlign.Center,
            )
            if (v.ok && v.evento != null) {
                Spacer(Modifier.height(6.dp))
                Text(v.evento, fontSize = 16.sp, color = Color.White.copy(alpha = 0.8f))
            }
            Spacer(Modifier.height(36.dp))
            Text("Toca para escanear la siguiente", fontSize = 15.sp, color = Color.White.copy(alpha = 0.75f))
        }
        return
    }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding()
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        ScreenHeader("Validar entrada", "Check-in del evento", onBack)
        Spacer(Modifier.weight(1f))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Escanea el QR de la entrada", style = MaterialTheme.typography.titleLarge, color = Joi.Ink)
            Spacer(Modifier.height(8.dp))
            Text(
                "Cada entrada se marca como usada al validarla.",
                style = MaterialTheme.typography.bodyMedium,
                color = Joi.InkMuted,
                textAlign = TextAlign.Center,
            )
        }
        Spacer(Modifier.weight(1f))
        if (error != null) {
            Notice(error!!, NoticeTone.Danger)
            Spacer(Modifier.height(16.dp))
        }
        BigButton("Escanear entrada", loading = procesando, onClick = escanearQr)
    }
}

/** Cuadre de caja: lo cobrado en el turno contra lo que el operador cuenta. */
@Composable
fun CuadreScreen(config: RenderConfig, onBack: () -> Unit, onCerrado: () -> Unit) {
    var turno by remember { mutableStateOf<Turno?>(null) }
    var cargando by remember { mutableStateOf(true) }
    var declarado by remember { mutableStateOf("") }
    var cerrando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmando by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        Api.turnoActual(config.shopId)
            .onSuccess { turno = it; cargando = false }
            .onFailure { error = it.message; cargando = false }
    }

    val esperado = turno?.montoEsperado ?: 0.0
    val contado = declarado.replace(",", ".").toDoubleOrNull()
    val diferencia = contado?.let { it - esperado }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        ScreenHeader("Cuadre de caja", config.shopName, onBack)
        Spacer(Modifier.height(24.dp))

        when {
            cargando -> EmptyState("Cargando turno", "Buscando las ventas de este turno.")
            turno == null -> EmptyState(
                "Sin turno abierto",
                "No hay un turno activo para este comercio. Vuelve a abrir caja para empezar.",
            )
            else -> {
                Panel {
                    DataRow("Ventas del turno", "${turno!!.ventas}")
                    DataRow("Total cobrado", "S/ ${"%.2f".format(esperado)}", emphasis = true)
                }
                Spacer(Modifier.height(20.dp))
                Field(
                    label = "Efectivo contado",
                    value = declarado,
                    onValueChange = { declarado = it.filter { c -> c.isDigit() || c == '.' || c == ',' } },
                    placeholder = "0.00",
                    keyboardType = KeyboardType.Decimal,
                )
                if (diferencia != null && kotlin.math.abs(diferencia) >= 0.01) {
                    Spacer(Modifier.height(16.dp))
                    Notice(
                        if (diferencia > 0)
                            "Sobran S/ ${"%.2f".format(diferencia)} respecto a lo cobrado en el sistema."
                        else
                            "Faltan S/ ${"%.2f".format(-diferencia)} respecto a lo cobrado en el sistema.",
                        NoticeTone.Warn,
                    )
                }
                if (error != null) {
                    Spacer(Modifier.height(16.dp))
                    Notice(error!!, NoticeTone.Danger)
                }
                Spacer(Modifier.height(28.dp))

                if (!confirmando) {
                    BigButton("Cerrar caja", enabled = contado != null) { confirmando = true }
                } else {
                    Notice(
                        "Vas a cerrar el turno con S/ ${"%.2f".format(contado ?: 0.0)} contados. " +
                            "Después de cerrar no se pueden registrar más cobros en este turno.",
                        NoticeTone.Warn,
                    )
                    Spacer(Modifier.height(16.dp))
                    BigButton("Sí, cerrar caja", loading = cerrando, tone = Joi.Danger) {
                        cerrando = true
                        scope.launch {
                            Api.cerrarTurno(turno!!.id, contado ?: 0.0)
                                .onSuccess { cerrando = false; onCerrado() }
                                .onFailure { cerrando = false; error = it.message; confirmando = false }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    GhostButton("Volver") { confirmando = false }
                }
            }
        }
    }
}
