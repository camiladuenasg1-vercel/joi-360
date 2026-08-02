package com.redpontis.joi360.operador.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Cliente del backend real de operación (joi-pos-backend). Sin Retrofit ni
 * OkHttp: HttpURLConnection y org.json vienen en Android, y menos dependencias
 * significa menos superficie que pueda romperse en un terminal de campo.
 *
 * Toda operación devuelve Result para que la UI muestre el fallo real
 * (conexión caída, mundo equivocado, saldo corto) en vez de un error genérico.
 */
object Api {

    /** Editable desde "Cambiar servidor" para operar contra otro entorno. */
    @Volatile
    var baseUrl: String = "https://joi-pos-backend.vercel.app"

    private const val TIMEOUT_MS = 20_000

    // ── HTTP ──────────────────────────────────────────────────────────────
    private suspend fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
    ): Result<JSONObject> = withContext(Dispatchers.IO) {
        try {
            val conn = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
                if (body != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                }
            }
            if (body != null) {
                conn.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            conn.disconnect()

            if (text.isBlank()) return@withContext Result.success(JSONObject())

            // El backend puede devolver un array (listas) o un objeto.
            val json = if (text.trimStart().startsWith("[")) {
                JSONObject().put("items", org.json.JSONArray(text))
            } else {
                JSONObject(text)
            }

            if (code !in 200..299) {
                val msg = json.optJSONObject("error")?.optString("message")
                    ?: "El servidor respondió $code."
                return@withContext Result.failure(ApiException(msg, code))
            }
            Result.success(json)
        } catch (e: Exception) {
            Result.failure(
                ApiException(
                    "No se encuentra el servidor. Revisa la conexión del equipo y reintenta.",
                    0,
                    e,
                )
            )
        }
    }

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

    // ── Sesión / configuración ────────────────────────────────────────────

    /**
     * Abrir caja: valida el código de comercio y trae el RenderConfig real del
     * mundo. La "clave" identifica al operador del turno; el backend decide si
     * el comercio existe y qué puede hacer.
     */
    suspend fun abrirCaja(
        shopId: String,
        clave: String,
        deviceSerial: String?,
    ): Result<Pair<RenderConfig, String?>> {
        // El código corto (hanzo-4587) resuelve al comercio y la clave se
        // valida en el servidor: el PIN nunca se guarda ni se compara en el
        // terminal, que es un equipo que puede quedar en un mostrador.
        val cfg = request("GET", "/api/pos/v1/shops/${enc(shopId)}?pin=${enc(clave)}")
            .getOrElse { return Result.failure(it) }

        val shop = cfg.optJSONObject("shop")
        val world = cfg.optJSONObject("world")
        val caps = cfg.optJSONObject("capabilities")
        val restrictions = cfg.optJSONObject("restrictions")
        val disp = cfg.optJSONObject("disponibilidad")

        if (shop == null || world == null) {
            return Result.failure(ApiException("Ese código de comercio no existe.", 404))
        }

        // Abre (o reutiliza) el turno real de este comercio y se queda con su
        // id: toda venta del turno se etiqueta con él para que el cuadre de
        // caja cuadre contra transacciones reales, no contra un contador local.
        val turnoId = request(
            "POST",
            "/api/pos/v1/turnos",
            JSONObject()
                .put("shopId", shopId)
                .put("operador", clave)
                .put("deviceSerial", deviceSerial ?: JSONObject.NULL),
        ).getOrNull()?.optJSONObject("turno")?.optString("id")?.takeIf { it.isNotBlank() }

        return Result.success(
            RenderConfig(
                shopId = shop.optString("id"),
                shopName = shop.optString("name"),
                worldId = world.optString("id"),
                worldName = world.optString("name").ifBlank { "Mundo" },
                capabilities = Capabilities(
                    wallet = caps?.optBoolean("wallet") ?: false,
                    chargeWallet = caps?.optBoolean("chargeWallet") ?: false,
                    banditaNfc = caps?.optBoolean("banditaNfc") ?: false,
                    restrictions = caps?.optBoolean("restrictions") ?: false,
                    accesos = caps?.optBoolean("accesos") ?: false,
                    eventos = caps?.optBoolean("eventos") ?: false,
                    menu = caps?.optBoolean("menu") ?: false,
                ),
                worldDailyLimit = restrictions?.optDouble("worldDailyLimit")
                    ?.takeIf { !it.isNaN() },
                eventosValidables = disp?.optInt("eventosValidables") ?: 0,
                eventosMotivo = disp?.optString("eventosMotivo")
                    ?.takeIf { it.isNotBlank() && it != "null" },
            ) to turnoId
        )
    }

    // ── Identificación ────────────────────────────────────────────────────

    /**
     * Resuelve una persona por bandita NFC, código QR o DNI.
     *
     * `origen` importa: una lectura NFC se valida en modo estricto contra el
     * inventario real de pulseras. Sin eso, cualquier tarjeta contactless
     * (una tarjeta bancaria en el celular, un carnet ajeno) se leería y se
     * tomaría como identidad válida.
     */
    suspend fun identificar(
        worldId: String,
        codigo: String,
        origen: String = "manual",
    ): Result<Titular> {
        val j = request(
            "GET",
            "/api/pos/v1/titular/${enc(codigo)}?world_id=${enc(worldId)}&origen=${enc(origen)}",
        ).getOrElse { return Result.failure(it) }
        val r = j.optJSONObject("restricciones")
        return Result.success(
            Titular(
                userId = j.optString("userId"),
                nombre = j.optString("nombre").takeIf { it.isNotBlank() && it != "null" },
                esDependiente = j.optBoolean("esDependiente"),
                balance = j.optDouble("balance").takeIf { !it.isNaN() },
                alergias = r?.optString("alergias")?.takeIf { it.isNotBlank() && it != "null" },
                tipoSangre = r?.optString("tipoSangre")?.takeIf { it.isNotBlank() && it != "null" },
                contactoEmergencia = r?.optJSONObject("contactoEmergencia")
                    ?.let { c ->
                        val n = c.optString("nombre")
                        val t = c.optString("telefono")
                        listOf(n, t).filter { it.isNotBlank() && it != "null" }
                            .joinToString(" · ").takeIf { it.isNotBlank() }
                    },
            )
        )
    }

    /** Búsqueda por documento de identidad. */
    suspend fun buscarPorDni(worldId: String, dni: String): Result<Titular> =
        request("GET", "/api/pos/v1/titular-dni/${enc(dni)}?world_id=${enc(worldId)}")
            .mapCatching { j ->
                val r = j.optJSONObject("restricciones")
                Titular(
                    userId = j.optString("userId"),
                    nombre = j.optString("nombre").takeIf { it.isNotBlank() && it != "null" },
                    esDependiente = j.optBoolean("esDependiente"),
                    balance = j.optDouble("balance").takeIf { !it.isNaN() },
                    alergias = r?.optString("alergias")?.takeIf { it.isNotBlank() && it != "null" },
                    tipoSangre = r?.optString("tipoSangre")?.takeIf { it.isNotBlank() && it != "null" },
                    contactoEmergencia = null,
                )
            }

    // ── Cobro ─────────────────────────────────────────────────────────────

    suspend fun cobrar(
        shopId: String,
        codigo: String,
        monto: Double,
        turnoId: String?,
    ): Result<ChargeResult> =
        request(
            "POST",
            "/api/pos/v1/shops/${enc(shopId)}/charge",
            JSONObject()
                .put("bandCode", codigo)
                .put("amount", monto)
                .put("turnoId", turnoId ?: JSONObject.NULL),
        ).mapCatching { j ->
            ChargeResult(
                ok = j.optBoolean("ok"),
                motivoRechazo = j.optString("motivoRechazo").takeIf { it.isNotBlank() && it != "null" },
                saleCode = j.optString("saleCode").takeIf { it.isNotBlank() && it != "null" },
                balance = j.optDouble("balance").takeIf { !it.isNaN() },
            )
        }

    // ── Accesos ───────────────────────────────────────────────────────────

    // El alcance es entrar y salir del recinto: no hay zonas ni áreas internas,
    // así que no se envía ninguna. Lo que vuelve, cuando la persona es un
    // dependiente, es a quién se le avisó.
    suspend fun validarAcceso(
        worldId: String,
        codigo: String,
        tipo: String,
        origen: String = "nfc",
    ): Result<AccesoResult> =
        request(
            "POST",
            "/api/pos/v1/accesos/validar",
            JSONObject()
                .put("worldId", worldId)
                .put("bandCode", codigo)
                .put("tipo", tipo)
                .put("origen", origen),
        ).mapCatching { j ->
            AccesoResult(
                ok = j.optBoolean("ok"),
                motivo = j.optString("motivo").takeIf { it.isNotBlank() && it != "null" },
                userId = j.optString("userId").takeIf { it.isNotBlank() && it != "null" },
                avisoApoderado = j.optString("avisoApoderado").takeIf { it.isNotBlank() && it != "null" },
                persona = j.optJSONObject("persona")?.let { p ->
                    val r = p.optJSONObject("restricciones")
                    Titular(
                        userId = p.optString("userId"),
                        nombre = p.optString("nombre").takeIf { it.isNotBlank() && it != "null" },
                        esDependiente = p.optBoolean("esDependiente"),
                        balance = p.optDouble("balance").takeIf { b -> !b.isNaN() },
                        alergias = r?.optString("alergias")?.takeIf { it.isNotBlank() && it != "null" },
                        tipoSangre = r?.optString("tipoSangre")?.takeIf { it.isNotBlank() && it != "null" },
                        contactoEmergencia = null,
                    )
                },
            )
        }

    /**
     * Lo que pasó por la puerta. Sin día, los últimos [limite]; con día, esa
     * jornada completa — que es como se revisa un día ya cerrado.
     */
    suspend fun accesosRecientes(
        worldId: String,
        limite: Int = 20,
        dia: String? = null,
    ): Result<List<AccesoRegistro>> =
        request(
            "GET",
            "/api/pos/v1/accesos/recientes?world_id=${enc(worldId)}&limit=$limite" +
                (dia?.let { "&dia=$it" } ?: ""),
        ).mapCatching { j ->
            val arr = j.optJSONArray("accesos") ?: return@mapCatching emptyList()
            (0 until arr.length()).map { i ->
                val a = arr.getJSONObject(i)
                AccesoRegistro(
                    id = a.optString("id"),
                    userId = a.optString("userId"),
                    tipo = a.optString("tipo"),
                    fechaIso = a.optString("fecha"),
                    nombre = a.optString("nombre").takeIf { it.isNotBlank() && it != "null" },
                    esDependiente = a.optBoolean("esDependiente"),
                )
            }
        }

    // ── Entradas de evento ────────────────────────────────────────────────

    suspend fun validarEntrada(worldId: String, qr: String): Result<TicketResult> =
        request(
            "POST",
            "/api/pos/v1/entradas/validar",
            JSONObject().put("worldId", worldId).put("qr", qr),
        ).mapCatching { j ->
            TicketResult(
                ok = j.optBoolean("ok"),
                motivo = j.optString("motivo").takeIf { it.isNotBlank() && it != "null" },
                evento = j.optString("evento").takeIf { it.isNotBlank() && it != "null" },
                tipo = j.optString("tipo").takeIf { it.isNotBlank() && it != "null" },
                titular = j.optString("titular").takeIf { it.isNotBlank() && it != "null" },
            )
        }

    // ── Cuadre de caja ────────────────────────────────────────────────────

    suspend fun turnoActual(shopId: String): Result<Turno?> =
        request("GET", "/api/pos/v1/turnos?shop_id=${enc(shopId)}").mapCatching { j ->
            val t = j.optJSONObject("turno") ?: return@mapCatching null
            Turno(
                id = t.optString("id"),
                estado = t.optString("estado"),
                abiertoAt = t.optString("abierto_at").takeIf { it.isNotBlank() && it != "null" },
                montoEsperado = t.optDouble("monto_esperado", 0.0),
                ventas = t.optInt("ventas", 0),
            )
        }

    suspend fun cerrarTurno(turnoId: String, montoDeclarado: Double): Result<JSONObject> =
        request(
            "POST",
            "/api/pos/v1/turnos/${enc(turnoId)}/cerrar",
            JSONObject().put("montoDeclarado", montoDeclarado),
        )
}

class ApiException(
    override val message: String,
    val status: Int,
    cause: Throwable? = null,
) : Exception(message, cause)
