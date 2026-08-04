package com.redpontis.joi360.operador.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.redpontis.joi360.operador.ui.Joi

/**
 * Puerta de entrada del terminal (Task #128): las capacidades se tratan
 * distinto según quién opera — un comercio cobra y abre caja; un mundo
 * vincula pulseras y valida accesos/entradas sin cobrar nada. Se elige acá,
 * antes de pedir código y clave, para no mezclar los dos flujos.
 */
@Composable
fun ElegirTipoScreen(onSoyComercio: () -> Unit, onSoyMundo: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Joi.Bg)
            .safeDrawingPadding()
            .padding(horizontal = 24.dp)
            .padding(top = 40.dp, bottom = 24.dp),
    ) {
        Text("JOI 360", style = MaterialTheme.typography.headlineLarge, color = Joi.Ink)
        Text("Operador", style = MaterialTheme.typography.bodyLarge, color = Joi.InkMuted)

        Spacer(Modifier.height(8.dp))
        Text(
            "¿Cómo vas a entrar?",
            style = MaterialTheme.typography.headlineMedium,
            color = Joi.Ink,
        )

        Spacer(Modifier.height(28.dp))

        TipoTile(
            icon = Icons.Default.Storefront,
            titulo = "Soy Comercio",
            detalle = "Cobrar, recargar billetera, confirmar reserva. Abre turno de caja.",
            onClick = onSoyComercio,
        )
        Spacer(Modifier.height(14.dp))
        TipoTile(
            icon = Icons.Default.Public,
            titulo = "Soy Mundo",
            detalle = "Vincular pulsera NFC, validar acceso o entrada, consultar. No cobra saldo.",
            onClick = onSoyMundo,
        )

        Spacer(Modifier.weight(1f))
        Text(
            "JOI 360 · Operador",
            style = MaterialTheme.typography.bodyMedium,
            color = Joi.InkFaint,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
    }
}

@Composable
private fun TipoTile(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    titulo: String,
    detalle: String,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Joi.Surface)
            .border(1.dp, Joi.Border, RoundedCornerShape(20.dp))
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onClick)
            .padding(20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(Joi.SurfaceTint),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = Joi.Primary) }
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Text(titulo, style = MaterialTheme.typography.titleLarge, color = Joi.Ink)
            Spacer(Modifier.height(2.dp))
            Text(detalle, style = MaterialTheme.typography.bodyMedium, color = Joi.InkMuted)
        }
        Icon(Icons.Default.ChevronRight, null, tint = Joi.InkFaint)
    }
}
