package com.redpontis.joi360.operador

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.*
import com.redpontis.joi360.operador.data.Api
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.data.Titular
import com.redpontis.joi360.operador.screens.*
import com.redpontis.joi360.operador.ui.Joi360Theme
import kotlinx.coroutines.launch

/** Para qué se está identificando a la persona. Decide el paso siguiente. */
enum class Proposito { Cobro, Acceso, Consulta, VincularBandita }

sealed interface Pantalla {
    data object ElegirTipo : Pantalla
    data object AbrirCaja : Pantalla
    data object AbrirMundo : Pantalla
    data object Inicio : Pantalla
    data object Cobrar : Pantalla
    data object CobrarQr : Pantalla
    data class Identificar(val proposito: Proposito, val monto: Double = 0.0) : Pantalla
    data class ResultadoCobro(val titular: Titular, val monto: Double) : Pantalla
    data class CobroQrEspera(val monto: Double) : Pantalla
    data class Ficha(val titular: Titular) : Pantalla
    data class VincularBandita(val titular: Titular) : Pantalla
    data object Acceso : Pantalla
    data object Entrada : Pantalla
    data object Cuadre : Pantalla
}

@Composable
fun App() {
    var config by remember { mutableStateOf<RenderConfig?>(null) }
    var turnoId by remember { mutableStateOf<String?>(null) }
    var pila by remember { mutableStateOf<List<Pantalla>>(listOf(Pantalla.ElegirTipo)) }
    var refrescandoInicio by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val actual = pila.last()
    fun ir(p: Pantalla) { pila = pila + p }
    fun volver() { if (pila.size > 1) pila = pila.dropLast(1) }
    fun inicio() { pila = listOf(Pantalla.Inicio) }

    BackHandler(enabled = pila.size > 1) { volver() }

    Joi360Theme {
        when (val p = actual) {
            is Pantalla.ElegirTipo -> ElegirTipoScreen(
                onSoyComercio = { ir(Pantalla.AbrirCaja) },
                onSoyMundo = { ir(Pantalla.AbrirMundo) },
            )

            is Pantalla.AbrirCaja -> AbrirCajaScreen(
                onBack = { volver() },
                onListo = { cfg, tid ->
                    config = cfg
                    turnoId = tid
                    pila = listOf(Pantalla.Inicio)
                },
            )

            is Pantalla.AbrirMundo -> AbrirMundoScreen(
                onBack = { volver() },
                onListo = { cfg ->
                    config = cfg
                    turnoId = null
                    pila = listOf(Pantalla.Inicio)
                },
            )

            is Pantalla.Inicio -> InicioScreen(
                config = config!!,
                onCobrar = { ir(Pantalla.Cobrar) },
                onCobrarQr = { ir(Pantalla.CobrarQr) },
                onAcceso = { ir(Pantalla.Acceso) },
                onEntrada = { ir(Pantalla.Entrada) },
                onConsulta = { ir(Pantalla.Identificar(Proposito.Consulta)) },
                onVincularBandita = { ir(Pantalla.Identificar(Proposito.VincularBandita)) },
                onCuadre = { ir(Pantalla.Cuadre) },
                onCerrarSesion = {
                    config = null
                    turnoId = null
                    pila = listOf(Pantalla.ElegirTipo)
                },
                isRefreshing = refrescandoInicio,
                onRefresh = {
                    val cfg = config
                    if (cfg?.isWorldSession == true) {
                        refrescandoInicio = true
                        scope.launch {
                            Api.refrescarMundo(cfg.worldId).onSuccess { config = it }
                            refrescandoInicio = false
                        }
                    } else cfg?.shopId?.let { shopId ->
                        refrescandoInicio = true
                        scope.launch {
                            Api.refrescarConfig(shopId).onSuccess { config = it }
                            refrescandoInicio = false
                        }
                    }
                },
            )

            is Pantalla.Cobrar -> CobrarMontoScreen(
                config = config!!,
                onBack = { volver() },
                onContinuar = { monto -> ir(Pantalla.Identificar(Proposito.Cobro, monto)) },
            )

            is Pantalla.CobrarQr -> CobrarMontoScreen(
                config = config!!,
                onBack = { volver() },
                onContinuar = { monto -> ir(Pantalla.CobroQrEspera(monto)) },
                titulo = "Cobrar con QR",
                botonLabel = "Generar QR",
            )

            is Pantalla.CobroQrEspera -> CobrarQrEsperaScreen(
                config = config!!,
                monto = p.monto,
                turnoId = turnoId,
                onBack = { volver() },
                onListo = { inicio() },
            )

            is Pantalla.Identificar -> IdentificarScreen(
                config = config!!,
                proposito = p.proposito,
                monto = p.monto,
                onBack = { volver() },
                onTitular = { titular ->
                    when (p.proposito) {
                        Proposito.Cobro -> ir(Pantalla.ResultadoCobro(titular, p.monto))
                        Proposito.Consulta -> ir(Pantalla.Ficha(titular))
                        Proposito.Acceso -> ir(Pantalla.Ficha(titular))
                        Proposito.VincularBandita -> ir(Pantalla.VincularBandita(titular))
                    }
                },
            )

            is Pantalla.ResultadoCobro -> ConfirmarCobroScreen(
                config = config!!,
                titular = p.titular,
                monto = p.monto,
                turnoId = turnoId,
                onBack = { volver() },
                onListo = { inicio() },
            )

            is Pantalla.Ficha -> FichaTitularScreen(
                titular = p.titular,
                onBack = { volver() },
                onListo = { inicio() },
            )

            is Pantalla.VincularBandita -> VincularBanditaScreen(
                config = config!!,
                titular = p.titular,
                onBack = { volver() },
                onListo = { inicio() },
            )

            is Pantalla.Acceso -> AccesoScreen(
                config = config!!,
                onBack = { volver() },
            )

            is Pantalla.Entrada -> EntradaScreen(
                config = config!!,
                onBack = { volver() },
            )

            is Pantalla.Cuadre -> CuadreScreen(
                config = config!!,
                onBack = { volver() },
                onCerrado = {
                    config = null
                    turnoId = null
                    pila = listOf(Pantalla.AbrirCaja)
                },
            )
        }
    }
}
