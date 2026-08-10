package com.redpontis.joi360.operador.screens

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.redpontis.joi360.operador.data.Api
import com.redpontis.joi360.operador.data.ChargeRequest
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Cobrar con QR: el cliente paga desde su propio celular (superapp, escanea
 * este código) en vez de que el operador identifique su wallet y cobre.
 * Mismo flujo real que CobrarPanel modo "qr" del panel web — acá lo que
 * cambia es que el terminal solo GENERA el cobro y espera, nunca mueve saldo
 * él mismo.
 */
private const val URL_PAGO_BASE = "https://joi360-app.vercel.app/#/pagar/"
private const val EXPIRA_MINUTOS = 10L

fun generarQrBitmap(texto: String, size: Int = 640): Bitmap {
    val matrix = QRCodeWriter().encode(texto, BarcodeFormat.QR_CODE, size, size)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) {
        for (y in 0 until size) {
            bmp.setPixel(x, y, if (matrix[x, y]) AndroidColor.BLACK else AndroidColor.WHITE)
        }
    }
    return bmp
}

@Composable
fun CobrarQrEsperaScreen(
    config: RenderConfig,
    monto: Double,
    turnoId: String?,
    onBack: () -> Unit,
    onListo: () -> Unit,
) {
    var request by remember { mutableStateOf<ChargeRequest?>(null) }
    var creando by remember { mutableStateOf(true) }
    var cancelando by remember { mutableStateOf(false) }
    var expirado by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        Api.crearChargeRequest(config.shopId!!, monto, turnoId)
            .onSuccess { request = it; creando = false }
            .onFailure { error = it.message; creando = false }
    }

    // Poll cada 2s mientras siga pendiente — mismo intervalo que el panel web.
    LaunchedEffect(request?.id) {
        val id = request?.id ?: return@LaunchedEffect
        while (true) {
            delay(2000)
            val r = request ?: break
            if (r.estado != "pendiente") break
            val creado = r.createdAt?.let { runCatching { Instant.parse(it) }.getOrNull() }
            if (creado != null && ChronoUnit.MINUTES.between(creado, Instant.now()) >= EXPIRA_MINUTOS) {
                expirado = true
                break
            }
            Api.consultarChargeRequest(id).onSuccess { request = it }
        }
    }

    fun cancelar() {
        val id = request?.id ?: return
        if (cancelando) return
        cancelando = true
        scope.launch {
            Api.cancelarChargeRequest(id)
            cancelando = false
            onBack()
        }
    }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        val r = request

        if (r?.estado == "pagado") {
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
                    "S/ ${"%.2f".format(monto)} · pagado desde el celular del cliente",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Joi.InkMuted,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(28.dp))
            BigButton("Listo", onClick = onListo)
            return@Column
        }

        if (r?.estado == "cancelado" || expirado) {
            Spacer(Modifier.height(40.dp))
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(96.dp).background(Joi.DangerSoft, RoundedCornerShape(48.dp)),
                    contentAlignment = Alignment.Center,
                ) { Text("✕", fontSize = 42.sp, color = Joi.Danger, fontWeight = FontWeight.Bold) }
                Spacer(Modifier.height(20.dp))
                Text(
                    if (expirado) "El cobro expiró" else "Cobro cancelado",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Joi.Ink,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    if (expirado) "Pasaron ${EXPIRA_MINUTOS} minutos sin que el cliente pagara. Genera el QR de nuevo."
                    else "El cliente no llegó a pagar.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Joi.InkMuted,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(28.dp))
            BigButton("Volver", onClick = onBack)
            return@Column
        }

        ScreenHeader("Cobrar con QR", config.shopName ?: "", onBack)
        Spacer(Modifier.height(24.dp))

        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("MONTO", style = MaterialTheme.typography.labelMedium, color = Joi.InkMuted)
            Spacer(Modifier.height(6.dp))
            Text("S/ ${"%.2f".format(monto)}", style = MaterialTheme.typography.headlineLarge, color = Joi.Ink)
        }

        Spacer(Modifier.height(24.dp))

        when {
            creando -> {
                Box(Modifier.fillMaxWidth().padding(vertical = 60.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Joi.Primary)
                }
            }
            error != null -> {
                Notice(error!!, NoticeTone.Danger)
                Spacer(Modifier.height(16.dp))
                BigButton("Volver", onClick = onBack)
            }
            r != null -> {
                Panel {
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        val bmp = remember(r.id) { generarQrBitmap("$URL_PAGO_BASE${r.id}") }
                        Image(
                            bitmap = bmp.asImageBitmap(),
                            contentDescription = "Código QR de cobro",
                            modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                        )
                    }
                }
                Spacer(Modifier.height(20.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(
                        color = Joi.Primary,
                        strokeWidth = 2.5.dp,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Esperando que el cliente pague desde su celular…",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Joi.InkMuted,
                    )
                }
                Spacer(Modifier.height(28.dp))
                BigButton(
                    label = "Cancelar cobro",
                    tone = Joi.Danger,
                    loading = cancelando,
                    onClick = { cancelar() },
                )
            }
        }
    }
}
