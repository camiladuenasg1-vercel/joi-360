package com.redpontis.joi360.operador.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.redpontis.joi360.operador.data.*
import com.redpontis.joi360.operador.nfc.rememberNfcScanner
import com.redpontis.joi360.operador.ui.*
import java.time.OffsetDateTime
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Control de accesos.
 *
 * Pensado para una puerta con cola detrás: el veredicto ocupa la pantalla en
 * verde o rojo, legible a un brazo de distancia. Pero un "acceso permitido"
 * anónimo no le sirve a quien está en la puerta, así que el veredicto muestra
 * a quién dejó pasar: nombre, si es un dependiente, y sus alergias si las
 * tiene registradas. Debajo queda lo que ya pasó, para responder "¿ya entró
 * fulano?" sin ir a buscar a ningún lado.
 */
@Composable
fun AccesoScreen(config: RenderConfig, onBack: () -> Unit) {
    // Zonas reales configuradas por el admin (RenderConfig.accesosZonas) —
    // antes esta pantalla asumía que no existían y nunca las mandaba, aunque
    // el panel web y la superapp sí las usan para el mismo mundo. Con una
    // sola zona configurada no hay elección real que mostrar.
    val zonas = config.accesosZonas
    var tipo by remember { mutableStateOf("ingreso") }
    var zona by remember { mutableStateOf(zonas.firstOrNull() ?: "Principal") }
    var veredicto by remember { mutableStateOf<AccesoResult?>(null) }
    var procesando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var recientes by remember { mutableStateOf<List<AccesoRegistro>>(emptyList()) }
    var verHistorial by remember { mutableStateOf(false) }
    var version by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(version) {
        Api.accesosRecientes(config.worldId).onSuccess { recientes = it }
    }

    fun validar(codigo: String, origen: String = "nfc") {
        if (procesando) return
        procesando = true
        error = null
        scope.launch {
            Api.validarAcceso(config.worldId, codigo, tipo, origen, zona)
                .onSuccess { procesando = false; veredicto = it; version++ }
                .onFailure { procesando = false; error = it.message }
        }
    }

    val nfc = rememberNfcScanner(
        enabled = config.capabilities.banditaNfc && veredicto == null && !procesando && !verHistorial,
    ) { validar(it) }

    val escanearQr = rememberQrScanner(
        prompt = "Enfoca el QR del usuario",
        onError = { error = it },
    ) { validar(it, origen = "manual") }

    if (verHistorial) {
        HistorialAccesosScreen(config = config, onBack = { verHistorial = false })
        return
    }

    val v = veredicto
    if (v != null) {
        VeredictoAcceso(
            resultado = v,
            tipo = tipo,
            recientes = recientes,
            onVerHistorial = { veredicto = null; verHistorial = true },
            onCerrar = { veredicto = null },
        )
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

        if (zonas.size > 1) {
            Spacer(Modifier.height(16.dp))
            Text(
                "ZONA",
                style = MaterialTheme.typography.labelMedium,
                color = Joi.InkMuted,
            )
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                zonas.forEach { z ->
                    val sel = zona == z
                    Box(
                        Modifier
                            .height(40.dp)
                            .background(if (sel) Joi.Primary else Joi.Surface, RoundedCornerShape(20.dp))
                            .clickable { zona = z }
                            .padding(horizontal = 16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(z, color = if (sel) Color.White else Joi.InkMuted, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                    }
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

        Spacer(Modifier.height(28.dp))
        ListaAccesos(
            accesos = recientes,
            titulo = "Últimos accesos",
            onVerHistorial = { verHistorial = true },
        )
    }
}

/** Veredicto a pantalla completa, con la ficha de quien acaba de pasar. */
@Composable
private fun VeredictoAcceso(
    resultado: AccesoResult,
    tipo: String,
    recientes: List<AccesoRegistro>,
    onVerHistorial: () -> Unit,
    onCerrar: () -> Unit,
) {
    val ok = resultado.ok
    val tono = if (ok) Joi.Ok else Joi.Danger
    val persona = resultado.persona

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        Spacer(Modifier.height(12.dp))
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Sello(
                icon = if (ok) Icons.Default.HowToReg else Icons.Default.Block,
                tint = tono,
            )
            Spacer(Modifier.height(18.dp))
            Text(
                if (ok) "Acceso permitido" else "Acceso denegado",
                style = MaterialTheme.typography.headlineMedium,
                color = Joi.Ink,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                if (ok) (if (tipo == "ingreso") "Ingreso registrado" else "Salida registrada")
                else motivoLegible(resultado.motivo),
                style = MaterialTheme.typography.bodyLarge,
                color = Joi.InkMuted,
                textAlign = TextAlign.Center,
            )
        }

        if (ok && persona != null) {
            Spacer(Modifier.height(24.dp))
            Panel {
                Text(
                    persona.nombre ?: "Sin nombre registrado",
                    style = MaterialTheme.typography.titleLarge,
                    color = Joi.Ink,
                )
                Spacer(Modifier.height(12.dp))
                DataRow("Tipo de perfil", if (persona.esDependiente) "Dependiente" else "Titular")
                if (persona.balance != null) {
                    DataRow("Saldo", "S/ " + "%.2f".format(persona.balance))
                }
                if (!persona.tipoSangre.isNullOrBlank()) {
                    DataRow("Tipo de sangre", persona.tipoSangre)
                }
            }
            // Las alergias no van escondidas en una fila más: si esta persona
            // va a consumir algo adentro, es lo que hay que ver primero.
            if (!persona.alergias.isNullOrBlank()) {
                Spacer(Modifier.height(14.dp))
                Notice("Alergias registradas: " + persona.alergias, NoticeTone.Warn)
            }
            if (resultado.avisoApoderado != null) {
                Spacer(Modifier.height(14.dp))
                Notice(
                    "Se avisó al apoderado de " + resultado.avisoApoderado + ".",
                    NoticeTone.Info,
                )
            }
        }

        Spacer(Modifier.height(24.dp))
        BigButton("Siguiente persona", onClick = onCerrar)

        Spacer(Modifier.height(28.dp))
        ListaAccesos(
            accesos = recientes,
            titulo = "Últimos accesos",
            onVerHistorial = onVerHistorial,
        )
    }
}

/** Historial completo, una jornada por vez. */
@Composable
private fun HistorialAccesosScreen(config: RenderConfig, onBack: () -> Unit) {
    // Se navega por días y no por "cargar más": revisar una puerta es preguntar
    // qué pasó tal día, no recorrer una lista infinita hacia atrás.
    var offsetDias by remember { mutableIntStateOf(0) }
    var accesos by remember { mutableStateOf<List<AccesoRegistro>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    val dia = remember(offsetDias) { LocalDate.now().minusDays(offsetDias.toLong()) }
    val diaIso = dia.format(DateTimeFormatter.ISO_LOCAL_DATE)

    LaunchedEffect(diaIso) {
        accesos = null
        error = null
        Api.accesosRecientes(config.worldId, limite = 500, dia = diaIso)
            .onSuccess { accesos = it }
            .onFailure { error = it.message; accesos = emptyList() }
    }

    val etiquetaDia = when (offsetDias) {
        0 -> "Hoy"
        1 -> "Ayer"
        else -> dia.format(DateTimeFormatter.ofPattern("d 'de' MMMM", Locale("es", "PE")))
    }

    Column(
        Modifier.fillMaxSize().background(Joi.Bg)
            .safeDrawingPadding()
            .padding(horizontal = 20.dp).padding(top = 12.dp, bottom = 24.dp),
    ) {
        ScreenHeader("Historial de accesos", config.worldName, onBack)
        Spacer(Modifier.height(20.dp))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FlechaDia(
                icono = Icons.Default.ChevronLeft,
                descripcion = "Día anterior",
                habilitada = true,
                onClick = { offsetDias++ },
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(etiquetaDia, style = MaterialTheme.typography.titleLarge, color = Joi.Ink)
                Text(
                    dia.format(DateTimeFormatter.ofPattern("EEEE d MMM yyyy", Locale("es", "PE"))),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Joi.InkMuted,
                )
            }
            FlechaDia(
                icono = Icons.Default.ChevronRight,
                descripcion = "Día siguiente",
                // No hay accesos del futuro: hoy es el tope.
                habilitada = offsetDias > 0,
                onClick = { if (offsetDias > 0) offsetDias-- },
            )
        }

        Spacer(Modifier.height(20.dp))

        val filas = accesos
        when {
            filas == null -> EmptyState("Cargando", "Buscando los accesos de " + etiquetaDia + ".")
            error != null -> Notice(error!!, NoticeTone.Danger)
            filas.isEmpty() -> EmptyState(
                "Sin accesos",
                "Nadie pasó por la puerta " + (if (offsetDias == 0) "todavía hoy" else "ese día") + ".",
            )
            else -> {
                Text(
                    filas.size.toString() + " " + (if (filas.size == 1) "acceso" else "accesos"),
                    style = MaterialTheme.typography.labelMedium,
                    color = Joi.InkMuted,
                )
                Spacer(Modifier.height(10.dp))
                LazyColumn(Modifier.weight(1f)) {
                    items(filas, key = { it.id }) { FilaAcceso(it) }
                }
            }
        }
    }
}

@Composable
private fun FlechaDia(
    icono: ImageVector,
    descripcion: String,
    habilitada: Boolean,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .size(52.dp)
            .background(if (habilitada) Joi.Surface else Joi.SurfaceTint, RoundedCornerShape(14.dp))
            .clickable(enabled = habilitada, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icono,
            contentDescription = descripcion,
            tint = if (habilitada) Joi.Ink else Joi.InkFaint,
        )
    }
}

/** Los últimos accesos, con salida al historial completo. */
@Composable
private fun ListaAccesos(
    accesos: List<AccesoRegistro>,
    titulo: String,
    onVerHistorial: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(titulo, style = MaterialTheme.typography.titleMedium, color = Joi.Ink)
        Text(
            "Ver historial",
            color = Joi.Primary,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.clickable(onClick = onVerHistorial).padding(8.dp),
        )
    }
    Spacer(Modifier.height(10.dp))
    if (accesos.isEmpty()) {
        Text(
            "Todavía no pasó nadie por la puerta.",
            style = MaterialTheme.typography.bodyMedium,
            color = Joi.InkMuted,
        )
    } else {
        accesos.forEach { FilaAcceso(it) }
    }
}

@Composable
private fun FilaAcceso(a: AccesoRegistro) {
    val entra = a.tipo != "salida"
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(36.dp).background(
                if (entra) Joi.OkSoft else Joi.SurfaceTint,
                RoundedCornerShape(10.dp),
            ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                if (entra) Icons.Default.Login else Icons.Default.Logout,
                contentDescription = null,
                tint = if (entra) Joi.Ok else Joi.InkMuted,
                modifier = Modifier.size(18.dp),
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                a.nombre ?: "Sin nombre registrado",
                style = MaterialTheme.typography.bodyLarge,
                color = if (a.nombre != null) Joi.Ink else Joi.InkMuted,
            )
            Text(
                if (entra) "Ingreso" else "Salida",
                style = MaterialTheme.typography.bodyMedium,
                color = Joi.InkMuted,
            )
        }
        Text(
            horaDe(a.fechaIso),
            style = MaterialTheme.typography.bodyMedium,
            color = Joi.InkMuted,
        )
    }
}

/**
 * La hora local, que es lo único que se lee de un vistazo en una lista.
 *
 * Se parsea con OffsetDateTime y no con Instant: Postgres devuelve el desfase
 * como "+00:00" y Instant.parse solo acepta la forma con "Z", así que toda la
 * columna de horas salía en "--:--".
 */
private fun horaDe(iso: String): String = runCatching {
    OffsetDateTime.parse(iso)
        .atZoneSameInstant(ZoneId.systemDefault())
        .format(DateTimeFormatter.ofPattern("HH:mm"))
}.getOrDefault("--:--")

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
        // Cuadre solo se renderiza cuando chargeWallet es true (ver InicioScreen),
        // y eso nunca ocurre en una sesión "Soy Mundo" — shopId siempre viene.
        Api.turnoActual(config.shopId!!)
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
        ScreenHeader("Cuadre de caja", config.shopName ?: "", onBack)
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
