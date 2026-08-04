package com.redpontis.joi360.operador.data

/** Capacidades reales del mundo, tal como las configuró RedPontis en el admin. */
data class Capabilities(
    val wallet: Boolean = false,
    val chargeWallet: Boolean = false,
    val banditaNfc: Boolean = false,
    val restrictions: Boolean = false,
    val accesos: Boolean = false,
    val eventos: Boolean = false,
    val menu: Boolean = false,
)

/**
 * RenderConfig: lo que este terminal puede hacer en este mundo. La app no
 * decide su propio menú — lo recibe. Si RedPontis apaga "accesos" para un
 * mundo, el botón desaparece del POS sin recompilar nada.
 */
data class RenderConfig(
    // Null en una sesión "Soy Mundo" (Task #128): un operador de mundo no
    // representa a ningún comercio — por diseño, ahí chargeWallet siempre
    // viene false, así que nada intenta cobrar contra un shopId inexistente.
    val shopId: String?,
    val shopName: String?,
    val worldId: String,
    val worldName: String,
    val capabilities: Capabilities,
    val worldDailyLimit: Double?,
    val isWorldSession: Boolean = false,
    /**
     * Una capacidad encendida no garantiza que haya algo real detrás. Esto
     * separa "el mundo tiene eventos activados" de "hay un evento aprobado
     * que se pueda validar hoy", para poder mostrar la acción en gris con su
     * motivo en vez de ofrecer algo que va a fallar.
     */
    val eventosValidables: Int = 0,
    val eventosMotivo: String? = null,
    // Zonas reales configuradas por el admin para Accesos (configField
    // "zonas", ej. "Principal,Cafetería,Auditorio") — antes el terminal
    // asumía que no existían y nunca las ofrecía, aunque el panel web y la
    // superapp sí las usan para el mismo mundo.
    val accesosZonas: List<String> = listOf("Principal"),
)

/** Persona resuelta a partir de una bandita, un QR o un DNI. */
data class Titular(
    val userId: String,
    val nombre: String?,
    val esDependiente: Boolean,
    val balance: Double?,
    val alergias: String?,
    val tipoSangre: String?,
    val contactoEmergencia: String?,
)

data class ChargeResult(
    val ok: Boolean,
    val motivoRechazo: String?,
    val saleCode: String?,
    val balance: Double?,
)

data class AccesoResult(
    val ok: Boolean,
    val motivo: String?,
    val userId: String?,
    // Nombre del dependiente cuyo apoderado fue avisado. Null cuando quien pasó
    // es un adulto por su cuenta: ahí no hay a quién notificar.
    val avisoApoderado: String? = null,
    // Quién acaba de pasar. Un "acceso permitido" sin nombre no le sirve a
    // nadie parado en la puerta tratando de saber a quién dejó entrar.
    val persona: Titular? = null,
)

/** Una marca en la puerta, ya con nombre. */
data class AccesoRegistro(
    val id: String,
    val userId: String,
    val tipo: String,
    val fechaIso: String,
    val nombre: String?,
    val esDependiente: Boolean,
)

data class TicketResult(
    val ok: Boolean,
    val motivo: String?,
    val evento: String?,
    val tipo: String?,
    val titular: String?,
)

data class Venta(
    val saleCode: String?,
    val amount: Double,
    val createdAt: String?,
)

data class Turno(
    val id: String,
    val estado: String,
    val abiertoAt: String?,
    val montoEsperado: Double,
    val ventas: Int,
)

/** Motivos de rechazo traducidos a lenguaje de mostrador, no de sistema. */
fun motivoLegible(code: String?): String = when (code) {
    "SALDO_INSUFICIENTE" -> "Saldo insuficiente para este cobro."
    "SIN_WALLET" -> "Esta persona todavía no tiene billetera en este mundo."
    "BANDA_NO_VINCULADA" -> "Esta pulsera no está vinculada a ninguna persona."
    "BANDA_NO_RECONOCIDA" -> "Ese dispositivo no es una pulsera de este ecosistema."
    "BANDA_VENCIDA" -> "Esta pulsera está vencida. Renuévala con el mundo."
    "BANDA_BLOQUEADA" -> "Esta pulsera está bloqueada."
    "OTRO_MUNDO" -> "Esta pulsera pertenece a otro mundo."
    "NO_ENCONTRADO" -> "No encontramos a nadie con ese dato."
    "ENTRADA_USADA" -> "Esta entrada ya fue usada."
    "ENTRADA_INVALIDA" -> "Esta entrada no es válida para este evento."
    null -> "No se pudo completar la operación."
    else -> code
}
