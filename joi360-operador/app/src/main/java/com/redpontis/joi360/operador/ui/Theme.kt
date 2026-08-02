package com.redpontis.joi360.operador.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ── Tokens ────────────────────────────────────────────────────────────────
// Portados 1:1 del sistema real de JOI 360 (joi360-app/src/index.css) para que
// el operador vea la misma identidad que el usuario final y el panel del mundo.
// Única desviación deliberada: el gris de texto secundario se oscurece de
// #777587 a #56546B. Motivo real, no estético: la foto del terminal en uso
// muestra la pantalla lavada bajo luz cálida de local; #777587 sobre #FCF8FF
// no alcanza 4.5:1 y en ese contexto se vuelve ilegible.
object Joi {
    val Primary      = Color(0xFF3525CD)
    val PrimaryDark  = Color(0xFF2A1DA6)
    val PrimarySoft  = Color(0xFFE2DFFF)

    val Ink          = Color(0xFF1B1B24)
    val InkMuted     = Color(0xFF56546B)
    val InkFaint     = Color(0xFF8B8899)

    val Bg           = Color(0xFFFCF8FF)
    val Surface      = Color(0xFFFFFFFF)
    val SurfaceTint  = Color(0xFFF0ECF9)
    val Border       = Color(0xFFE4E1EE)

    val Ok           = Color(0xFF0F8A4F)
    val OkSoft       = Color(0xFFE6F5ED)
    val Danger       = Color(0xFFC42525)
    val DangerSoft   = Color(0xFFFDECEC)
    val Warn         = Color(0xFFB45309)
    val WarnSoft     = Color(0xFFFEF3C7)
}

private val Scheme = lightColorScheme(
    primary = Joi.Primary,
    onPrimary = Color.White,
    primaryContainer = Joi.PrimarySoft,
    onPrimaryContainer = Joi.PrimaryDark,
    background = Joi.Bg,
    onBackground = Joi.Ink,
    surface = Joi.Surface,
    onSurface = Joi.Ink,
    surfaceVariant = Joi.SurfaceTint,
    onSurfaceVariant = Joi.InkMuted,
    outline = Joi.Border,
    error = Joi.Danger,
    onError = Color.White,
)

// Escala de tipo pensada para un terminal que se opera de pie, rápido y a
// distancia de brazo: cuerpo 17sp (no 14) y cifras de cobro enormes.
private val Type = Typography(
    displayLarge = TextStyle(fontSize = 56.sp, lineHeight = 60.sp, fontWeight = FontWeight.Bold, letterSpacing = (-1).sp),
    headlineLarge = TextStyle(fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold),
    titleLarge = TextStyle(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 17.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 25.sp, fontWeight = FontWeight.Normal),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 22.sp, fontWeight = FontWeight.Normal),
    labelLarge = TextStyle(fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold),
    labelMedium = TextStyle(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium, letterSpacing = 1.2.sp),
)

@Composable
fun Joi360Theme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, typography = Type, content = content)
}
