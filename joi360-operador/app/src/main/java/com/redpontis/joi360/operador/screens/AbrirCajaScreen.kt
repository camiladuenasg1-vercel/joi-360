package com.redpontis.joi360.operador.screens

import android.os.Build
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.redpontis.joi360.operador.data.Api
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.launch

/**
 * Abrir caja — puerta de entrada del terminal.
 *
 * Mantiene la estructura que el operador ya conoce del equipo en uso (código
 * de comercio, clave) pero con alturas de POS: campos de 62dp y acción de
 * 64dp, porque se opera de pie y con prisa.
 */
@Composable
fun AbrirCajaScreen(onBack: () -> Unit, onListo: (RenderConfig, String?) -> Unit) {
    var comercio by remember { mutableStateOf("") }
    var clave by remember { mutableStateOf("") }
    var verClave by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun abrir() {
        if (comercio.isBlank() || clave.isBlank() || cargando) return
        error = null
        cargando = true
        scope.launch {
            val serial = runCatching { Build.SERIAL }.getOrNull()
            Api.abrirCaja(comercio.trim(), clave.trim(), serial)
                .onSuccess { (cfg, turnoId) -> cargando = false; onListo(cfg, turnoId) }
                .onFailure { e -> cargando = false; error = e.message }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Joi.Bg)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 20.dp, bottom = 24.dp),
    ) {
        ScreenHeader(
            title = "Soy Comercio",
            subtitle = "Escribe el código del comercio y su clave para empezar el turno.",
            onBack = onBack,
        )

        Spacer(Modifier.height(36.dp))

        Field(
            label = "Comercio",
            value = comercio,
            onValueChange = { comercio = it; error = null },
            placeholder = "cafeteria-2814",
        )

        Spacer(Modifier.height(24.dp))

        Column {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    "CLAVE DEL COMERCIO",
                    style = MaterialTheme.typography.labelMedium,
                    color = Joi.InkMuted,
                )
                Text(
                    if (verClave) "Ocultar" else "Mostrar",
                    color = Joi.Primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier
                        .clickable { verClave = !verClave }
                        .padding(start = 12.dp, bottom = 2.dp),
                )
            }
            Spacer(Modifier.height(8.dp))
            Field(
                label = "",
                value = clave,
                onValueChange = { clave = it; error = null },
                placeholder = "••••••",
                isPassword = !verClave,
                keyboardType = KeyboardType.NumberPassword,
            )
        }

        if (error != null) {
            Spacer(Modifier.height(22.dp))
            Notice(error!!, NoticeTone.Danger)
        }

        Spacer(Modifier.height(32.dp))

        BigButton(
            label = "Abrir caja",
            enabled = comercio.isNotBlank() && clave.isNotBlank(),
            loading = cargando,
            onClick = { abrir() },
        )

        Spacer(Modifier.height(28.dp))
        Text(
            "JOI 360 · Operador",
            style = MaterialTheme.typography.bodyMedium,
            color = Joi.InkFaint,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
    }
}
