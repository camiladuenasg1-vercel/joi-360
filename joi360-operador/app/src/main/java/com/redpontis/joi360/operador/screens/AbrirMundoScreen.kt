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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.redpontis.joi360.operador.data.Api
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.ui.*
import kotlinx.coroutines.launch

/**
 * Abrir sesión de Mundo — puerta de entrada para "Soy Mundo" (Task #128).
 * Mismo diseño que Abrir Caja, pero sin turno: un operador de mundo vincula
 * pulseras y valida accesos/entradas, no cobra saldo, así que no hay caja
 * que abrir ni clave de comercio que pedir — es la clave propia del mundo.
 */
@Composable
fun AbrirMundoScreen(onBack: () -> Unit, onListo: (RenderConfig) -> Unit) {
    var mundo by remember { mutableStateOf("") }
    var clave by remember { mutableStateOf("") }
    var verClave by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun abrir() {
        if (mundo.isBlank() || clave.isBlank() || cargando) return
        error = null
        cargando = true
        scope.launch {
            Api.abrirMundo(mundo.trim(), clave.trim())
                .onSuccess { cfg -> cargando = false; onListo(cfg) }
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
            title = "Soy Mundo",
            subtitle = "Escribe el código del mundo y su clave de operador — vincular pulseras, validar accesos y entradas.",
            onBack = onBack,
        )

        Spacer(Modifier.height(36.dp))

        Field(
            label = "Mundo",
            value = mundo,
            onValueChange = { mundo = it; error = null },
            placeholder = "ED-LIM-006",
        )

        Spacer(Modifier.height(24.dp))

        Column {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(
                    "CLAVE DEL MUNDO",
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
            label = "Entrar como Mundo",
            enabled = mundo.isNotBlank() && clave.isNotBlank(),
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
