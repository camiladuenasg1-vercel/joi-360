package com.redpontis.joi360.operador.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.ui.*

/**
 * Inicio del turno. Las acciones NO están cableadas en la app: se derivan del
 * RenderConfig que el backend arma leyendo las capacidades reales que RedPontis
 * activó para este mundo. Si el mundo no tiene eventos, aquí no hay botón de
 * entradas — sin recompilar ni tocar el terminal.
 */
@Composable
fun InicioScreen(
    config: RenderConfig,
    onCobrar: () -> Unit,
    onAcceso: () -> Unit,
    onEntrada: () -> Unit,
    onConsulta: () -> Unit,
    onCuadre: () -> Unit,
    onCerrarSesion: () -> Unit,
) {
    val c = config.capabilities

    Column(
        Modifier
            .fillMaxSize()
            .background(Joi.Bg)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(top = 16.dp, bottom = 24.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    config.shopName.ifBlank { "Comercio" },
                    style = MaterialTheme.typography.headlineLarge,
                    color = Joi.Ink,
                )
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).background(Joi.Ok, RoundedCornerShape(4.dp)))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "Caja abierta · ${config.worldName}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Joi.InkMuted,
                    )
                }
            }
            Text(
                "Cerrar",
                color = Joi.InkMuted,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clickable(onClick = onCerrarSesion)
                    .padding(8.dp),
            )
        }

        Spacer(Modifier.height(28.dp))

        // Cada acción declara además si está utilizable ahora mismo. Validar
        // entrada existe si el mundo tiene eventos, pero solo se habilita
        // cuando hay al menos un evento aprobado por RedPontis.
        data class Accion(
            val titulo: String,
            val sub: String,
            val habilitada: Boolean,
            val accion: () -> Unit,
        )
        val hayEventos = config.eventosValidables > 0
        val tiles = buildList {
            if (c.chargeWallet) add(Accion("Cobrar", "Con saldo del cliente", true, onCobrar))
            if (c.accesos) add(Accion("Validar acceso", "Ingreso y salida con pulsera", true, onAcceso))
            if (c.eventos) add(
                Accion(
                    "Validar entrada",
                    if (hayEventos) "Check-in de evento" else "Sin eventos aprobados",
                    hayEventos,
                    onEntrada,
                )
            )
            if (c.wallet) add(Accion("Consultar", "Saldo, alergias y perfil", true, onConsulta))
        }
        val icons = mapOf(
            "Cobrar" to Icons.Default.PointOfSale,
            "Validar acceso" to Icons.Default.MeetingRoom,
            "Validar entrada" to Icons.Default.ConfirmationNumber,
            "Consultar" to Icons.Default.Badge,
        )

        if (tiles.isEmpty()) {
            EmptyState(
                title = "Sin operaciones habilitadas",
                detail = "RedPontis todavía no activó ninguna capacidad para este comercio en ${config.worldName}.",
            )
        } else {
            // Rejilla de 2 columnas construida a mano: son pocas celdas y así se
            // evita anidar scroll dentro de scroll.
            tiles.chunked(2).forEach { fila ->
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    fila.forEach { t ->
                        ActionTile(
                            title = t.titulo,
                            subtitle = t.sub,
                            icon = icons[t.titulo] ?: Icons.Default.Circle,
                            enabled = t.habilitada,
                            onClick = t.accion,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (fila.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }

        Spacer(Modifier.height(14.dp))

        if (c.chargeWallet) {
            Panel {
                Text("Cuadre de caja", style = MaterialTheme.typography.titleLarge, color = Joi.Ink)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Revisa lo cobrado en este turno y cierra la caja al terminar.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Joi.InkMuted,
                )
                Spacer(Modifier.height(18.dp))
                GhostButton("Ver cuadre", onClick = onCuadre)
            }
        }

        if (!c.banditaNfc) {
            Spacer(Modifier.height(16.dp))
            Notice(
                "Este mundo no tiene pulseras NFC activas. Identifica al cliente por QR o documento.",
                NoticeTone.Info,
            )
        }
    }
}
