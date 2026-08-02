package com.redpontis.joi360.operador

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.*
import com.redpontis.joi360.operador.data.RenderConfig
import com.redpontis.joi360.operador.data.Titular
import com.redpontis.joi360.operador.screens.*
import com.redpontis.joi360.operador.ui.Joi360Theme

/** Para qué se está identificando a la persona. Decide el paso siguiente. */
enum class Proposito { Cobro, Acceso, Consulta }

sealed interface Pantalla {
    data object AbrirCaja : Pantalla
    data object Inicio : Pantalla
    data object Cobrar : Pantalla
    data class Identificar(val proposito: Proposito, val monto: Double = 0.0) : Pantalla
    data class ResultadoCobro(val titular: Titular, val monto: Double) : Pantalla
    data class Ficha(val titular: Titular) : Pantalla
    data object Acceso : Pantalla
    data object Entrada : Pantalla
    data object Cuadre : Pantalla
}

@Composable
fun App() {
    var config by remember { mutableStateOf<RenderConfig?>(null) }
    var turnoId by remember { mutableStateOf<String?>(null) }
    var pila by remember { mutableStateOf<List<Pantalla>>(listOf(Pantalla.AbrirCaja)) }

    val actual = pila.last()
    fun ir(p: Pantalla) { pila = pila + p }
    fun volver() { if (pila.size > 1) pila = pila.dropLast(1) }
    fun inicio() { pila = listOf(Pantalla.Inicio) }

    BackHandler(enabled = pila.size > 1) { volver() }

    Joi360Theme {
        when (val p = actual) {
            is Pantalla.AbrirCaja -> AbrirCajaScreen(
                onListo = { cfg, tid ->
                    config = cfg
                    turnoId = tid
                    pila = listOf(Pantalla.Inicio)
                },
            )

            is Pantalla.Inicio -> InicioScreen(
                config = config!!,
                onCobrar = { ir(Pantalla.Cobrar) },
                onAcceso = { ir(Pantalla.Acceso) },
                onEntrada = { ir(Pantalla.Entrada) },
                onConsulta = { ir(Pantalla.Identificar(Proposito.Consulta)) },
                onCuadre = { ir(Pantalla.Cuadre) },
                onCerrarSesion = {
                    config = null
                    turnoId = null
                    pila = listOf(Pantalla.AbrirCaja)
                },
            )

            is Pantalla.Cobrar -> CobrarMontoScreen(
                config = config!!,
                onBack = { volver() },
                onContinuar = { monto -> ir(Pantalla.Identificar(Proposito.Cobro, monto)) },
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
