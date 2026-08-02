package com.redpontis.joi360.operador.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Altura mínima de acción primaria. Un POS se opera de pie, a veces con la
// mano ocupada; 64dp es el piso por debajo del cual se falla el toque.
private val ACTION_H = 64.dp

/** Acción primaria. Una sola por pantalla: la que cierra la tarea. */
@Composable
fun BigButton(
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    tone: Color = Joi.Primary,
    onClick: () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = tween(110, easing = FastOutSlowInEasing),
        label = "press",
    )
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        interactionSource = interaction,
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = tone,
            contentColor = Color.White,
            disabledContainerColor = Joi.Border,
            disabledContentColor = Joi.InkFaint,
        ),
        contentPadding = PaddingValues(horizontal = 20.dp),
        modifier = modifier.fillMaxWidth().height(ACTION_H).scale(scale),
    ) {
        if (loading) {
            CircularProgressIndicator(
                strokeWidth = 2.5.dp,
                color = Color.White,
                modifier = Modifier.size(22.dp),
            )
        } else {
            Text(label, fontSize = 19.sp, fontWeight = FontWeight.Bold)
        }
    }
}

/** Acción secundaria: nunca compite visualmente con la primaria. */
@Composable
fun GhostButton(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.5.dp, Joi.Border),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Joi.Ink),
        modifier = modifier.fillMaxWidth().height(56.dp),
    ) {
        Text(label, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
    }
}

/** Campo de texto con etiqueta propia: alto real de 60dp, sin label flotante. */
@Composable
fun Field(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    trailing: (@Composable () -> Unit)? = null,
    enabled: Boolean = true,
    maxLength: Int? = null,
) {
    Column(modifier) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = Joi.InkMuted,
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            // El tope de caracteres vive en el campo, no en cada pantalla:
            // un DNI peruano son 8 digitos, un CCI 20, y dejar escribir de mas
            // solo produce busquedas que nunca van a encontrar nada.
            onValueChange = { nuevo ->
                onValueChange(if (maxLength != null) nuevo.take(maxLength) else nuevo)
            },
            enabled = enabled,
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium),
            placeholder = { Text(placeholder, color = Joi.InkFaint, fontSize = 17.sp) },
            trailingIcon = trailing,
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Joi.Primary,
                unfocusedBorderColor = Joi.Border,
                focusedContainerColor = Joi.Surface,
                unfocusedContainerColor = Joi.Surface,
                cursorColor = Joi.Primary,
                focusedTextColor = Joi.Ink,
                unfocusedTextColor = Joi.Ink,
            ),
            modifier = Modifier.fillMaxWidth().heightIn(min = 62.dp),
        )
    }
}

/** Tarjeta base. Sin anidar tarjetas: una tarjeta dentro de otra es ruido. */
@Composable
fun Panel(
    modifier: Modifier = Modifier,
    tone: Color = Joi.Surface,
    border: Color = Joi.Border,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .background(tone, RoundedCornerShape(20.dp))
            .border(1.dp, border, RoundedCornerShape(20.dp))
            .padding(20.dp),
        content = content,
    )
}

/** Tile del hub. Cuadrado grande: destino de dedo, no de cursor. */
@Composable
fun ActionTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed && enabled) 0.97f else 1f,
        animationSpec = tween(110, easing = FastOutSlowInEasing),
        label = "tile",
    )
    // Deshabilitado ≠ oculto. Si la capacidad está activa pero todavía no hay
    // nada real detrás (p. ej. ningún evento aprobado), la acción se muestra
    // en gris con su motivo: el operador entiende que existe y qué falta,
    // en vez de buscar un botón que desapareció.
    Column(
        modifier
            .scale(scale)
            .background(if (enabled) Joi.Surface else Joi.SurfaceTint, RoundedCornerShape(20.dp))
            .border(1.dp, Joi.Border, RoundedCornerShape(20.dp))
            .clickable(interaction, null, enabled = enabled, onClick = onClick)
            .padding(20.dp)
            .heightIn(min = 132.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier.size(46.dp).background(
                if (enabled) Joi.PrimarySoft else Joi.Border,
                RoundedCornerShape(14.dp),
            ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon,
                null,
                tint = if (enabled) Joi.Primary else Joi.InkFaint,
                modifier = Modifier.size(26.dp),
            )
        }
        Spacer(Modifier.weight(1f))
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            color = if (enabled) Joi.Ink else Joi.InkFaint,
        )
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = if (enabled) Joi.InkMuted else Joi.InkFaint,
        )
    }
}

/** Encabezado de pantalla con retroceso. */
@Composable
fun ScreenHeader(title: String, subtitle: String? = null, onBack: (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth()) {
        if (onBack != null) {
            Box(
                Modifier
                    .size(48.dp)
                    .background(Joi.Surface, CircleShape)
                    .border(1.dp, Joi.Border, CircleShape)
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Default.ArrowBack, "Volver", tint = Joi.Ink) }
            Spacer(Modifier.height(16.dp))
        }
        Text(title, style = MaterialTheme.typography.headlineLarge, color = Joi.Ink)
        if (subtitle != null) {
            Spacer(Modifier.height(6.dp))
            Text(subtitle, style = MaterialTheme.typography.bodyLarge, color = Joi.InkMuted)
        }
    }
}

/** Aviso inline. Un solo tono por estado, sin barras laterales de color. */
@Composable
fun Notice(text: String, tone: NoticeTone = NoticeTone.Info, modifier: Modifier = Modifier) {
    val (bg, fg) = when (tone) {
        NoticeTone.Info -> Joi.SurfaceTint to Joi.InkMuted
        NoticeTone.Ok -> Joi.OkSoft to Joi.Ok
        NoticeTone.Warn -> Joi.WarnSoft to Joi.Warn
        NoticeTone.Danger -> Joi.DangerSoft to Joi.Danger
    }
    Box(
        modifier
            .fillMaxWidth()
            .background(bg, RoundedCornerShape(16.dp))
            .padding(horizontal = 18.dp, vertical = 16.dp),
    ) { Text(text, style = MaterialTheme.typography.bodyMedium, color = fg) }
}

enum class NoticeTone { Info, Ok, Warn, Danger }

/** Fila etiqueta/valor para resúmenes (cuadre, ficha de titular). */
@Composable
fun DataRow(label: String, value: String, emphasis: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = Joi.InkMuted)
        Text(
            value,
            style = if (emphasis) MaterialTheme.typography.titleLarge else MaterialTheme.typography.bodyLarge,
            fontWeight = if (emphasis) FontWeight.Bold else FontWeight.SemiBold,
            color = Joi.Ink,
            textAlign = TextAlign.End,
        )
    }
}

/** Estado vacío honesto: dice qué falta y qué hacer, no decora. */
@Composable
fun EmptyState(title: String, detail: String, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = Joi.Ink)
        Text(
            detail,
            style = MaterialTheme.typography.bodyMedium,
            color = Joi.InkMuted,
            textAlign = TextAlign.Center,
        )
    }
}

/**
 * Pulso de lectura NFC. Es el momento característico de este producto: el
 * instante en que una pulsera se convierte en una persona con saldo, alergias
 * y permisos. Se le da peso visual propio en vez de un spinner genérico.
 */
@Composable
fun NfcPulse(active: Boolean, modifier: Modifier = Modifier) {
    val t = rememberInfiniteTransition(label = "nfc")
    val p by t.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1800, easing = LinearEasing)),
        label = "pulse",
    )
    Box(modifier.size(190.dp), contentAlignment = Alignment.Center) {
        if (active) {
            listOf(0f, 0.33f, 0.66f).forEach { offset ->
                val local = (p + offset) % 1f
                Box(
                    Modifier
                        .size((110 + 80 * local).dp)
                        .background(
                            Joi.Primary.copy(alpha = (1f - local) * 0.16f),
                            CircleShape,
                        )
                )
            }
        }
        Box(
            Modifier.size(104.dp).background(Joi.Primary, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text("NFC", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
    }
}
