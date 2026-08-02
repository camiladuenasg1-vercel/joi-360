// ============================================================
// Cuentas reales del superapp — Supabase Auth por REST
// ============================================================
//
// Hasta acá el "login" aceptaba cualquier contraseña y guardaba el nombre en
// localStorage: servía para recorrer pantallas, no para tener usuarios. Esto
// lo reemplaza por cuentas de verdad, con la contraseña hasheada por Supabase
// y el correo verificado antes de dejar entrar.
//
// Se habla con la API REST de Auth y no con @supabase/supabase-js a propósito:
// el resto del proyecto ya consume Supabase con fetch() plano, y una
// dependencia nueva en el bundle del superapp no compra nada aquí.
//
// Dónde queda cada dato, que es la decisión que importa:
//   · correo y número de documento → auth.users, que la llave anónima NO puede
//     leer. Siguen existiendo para soporte, con llave de servicio.
//   · nombre, apellidos, tipo de documento y las versiones enmascaradas →
//     app_profiles, que RedPontis sí lee para su tabla de usuarios.
// Enmascarar al escribir y no al pintar es deliberado: si el dato completo
// nunca sale de la base, ninguna pantalla ni export lo puede filtrar por
// descuido.

const SUPA_URL = "https://kobtxrhycaloyjkeyspv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYnR4cmh5Y2Fsb3lqa2V5c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzAwMjksImV4cCI6MjA5NzkwNjAyOX0.MlyyXGnsyMeVXaRfRbmFqwVhsh4FUFNztQoBaECd_i0";

const authHeaders = { apikey: ANON_KEY, "Content-Type": "application/json" };

// A dónde lleva el enlace del correo. Es una página suelta y no una ruta del
// router porque Supabase devuelve los tokens en el fragmento (#access_token=…)
// y este app usa HashRouter: las dos cosas se pelean por el mismo '#'.
export const URL_CONFIRMACION = `${window.location.origin}/correo-confirmado.html`;

export const TIPOS_DOCUMENTO = [
  { id: "DNI", label: "DNI", digitos: 8, soloNumeros: true },
  { id: "PASAPORTE", label: "Pasaporte", digitos: 12, soloNumeros: false },
  { id: "CARNET_EXT", label: "Carnet de extranjería", digitos: 12, soloNumeros: false },
];

export const tipoDocumento = id => TIPOS_DOCUMENTO.find(t => t.id === id) || TIPOS_DOCUMENTO[0];

// ── Reglas de contraseña ──────────────────────────────────────────────────
// Por ahora solo dos, y se muestran mientras se escribe en vez de castigar al
// enviar: nadie debería descubrir el requisito recién cuando ya falló.
export const REGLAS_PASSWORD = [
  { id: "largo", label: "Mínimo 8 caracteres", cumple: v => v.length >= 8 },
  { id: "mayus", label: "Al menos 1 mayúscula", cumple: v => /[A-Z]/.test(v) },
];

export const passwordValida = v => REGLAS_PASSWORD.every(r => r.cumple(v));

// ── Enmascarado ───────────────────────────────────────────────────────────
export function enmascararDocumento(numero) {
  const s = String(numero || "").trim();
  if (s.length <= 2) return "•".repeat(s.length || 4);
  const visibles = s.length > 6 ? 4 : 2;
  return "•".repeat(s.length - visibles) + s.slice(-visibles);
}

export function enmascararCorreo(email) {
  const s = String(email || "").trim();
  const [local, dominio] = s.split("@");
  if (!dominio) return "•••";
  const cabeza = local.slice(0, Math.min(2, local.length));
  return `${cabeza}${"•".repeat(Math.max(3, local.length - cabeza.length))}@${dominio}`;
}

// ── Traducción de errores ─────────────────────────────────────────────────
// Supabase responde en inglés y con códigos; el usuario necesita saber qué
// hacer, no qué falló internamente.
function mensajeDeError(codigo, descripcion, status) {
  const d = String(descripcion || "").toLowerCase();
  if (codigo === "email_not_confirmed" || d.includes("email not confirmed"))
    return "Todavía no confirmaste tu correo. Revisa tu bandeja y toca el enlace.";
  if (codigo === "invalid_credentials" || codigo === "invalid_grant" || d.includes("invalid login"))
    return "Correo o contraseña incorrectos.";
  if (codigo === "user_already_exists" || d.includes("already registered"))
    return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (codigo === "weak_password" || d.includes("password should be"))
    return "La contraseña no cumple los requisitos mínimos.";
  if (codigo === "over_email_send_rate_limit" || status === 429)
    return "Se enviaron demasiados correos seguidos. Espera un minuto y vuelve a intentar.";
  if (codigo === "validation_failed" || status === 400)
    return "Revisa los datos ingresados.";
  return descripcion || "No pudimos completar la operación. Intenta de nuevo.";
}

async function llamarAuth(ruta, body) {
  let res;
  try {
    res = await fetch(`${SUPA_URL}/auth/v1/${ruta}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(mensajeDeError(json.error_code || json.error, json.error_description || json.msg, res.status));
    err.codigo = json.error_code || json.error;
    throw err;
  }
  return json;
}

// ── Registro ──────────────────────────────────────────────────────────────
export async function registrarUsuario({ nombres, apellidos, docTipo, docNumero, email, password }) {
  const correo = email.trim().toLowerCase();

  const r = await llamarAuth(`signup?redirect_to=${encodeURIComponent(URL_CONFIRMACION)}`, {
    email: correo,
    password,
    data: { nombres, apellidos, doc_tipo: docTipo, doc_numero: docNumero },
  });

  const usuario = r.user || r;
  // Cuando el correo ya está tomado, Supabase responde 200 con el usuario pero
  // sin identidades, para no confirmarle a un desconocido qué correos existen.
  // Del lado de quien se está registrando el mensaje honesto es el mismo.
  if (Array.isArray(usuario.identities) && usuario.identities.length === 0) {
    const e = new Error("Ya existe una cuenta con este correo. Inicia sesión.");
    e.codigo = "user_already_exists";
    throw e;
  }
  if (!usuario.id) throw new Error("No pudimos crear la cuenta. Intenta de nuevo.");

  // El perfil visible se escribe aparte. Si esto falla la cuenta ya existe y el
  // correo ya salió, así que no se revierte nada: se deja que el registro siga
  // y el perfil se completa al primer inicio de sesión.
  await guardarPerfil({ id: usuario.id, nombres, apellidos, docTipo, docNumero, email: correo })
    .catch(() => {});

  return { id: usuario.id, email: correo };
}

async function guardarPerfil({ id, nombres, apellidos, docTipo, docNumero, email }) {
  await fetch(`${SUPA_URL}/rest/v1/app_profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      doc_tipo: docTipo,
      doc_mask: enmascararDocumento(docNumero),
      email_mask: enmascararCorreo(email),
    }),
  });
}

// ── Inicio de sesión ──────────────────────────────────────────────────────
export async function iniciarSesion(email, password) {
  const r = await llamarAuth("token?grant_type=password", {
    email: email.trim().toLowerCase(),
    password,
  });
  const u = r.user || {};
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email,
    nombres: meta.nombres || "",
    apellidos: meta.apellidos || "",
    nombre: [meta.nombres, meta.apellidos].filter(Boolean).join(" ") || (u.email || "").split("@")[0],
    accessToken: r.access_token,
  };
}

// ── ¿Ya confirmó? ─────────────────────────────────────────────────────────
// La pantalla de "revisa tu correo" pregunta esto mientras espera. Se resuelve
// intentando iniciar sesión: si Supabase contesta "email not confirmed" es que
// todavía no, y cualquier otra cosa ya es una respuesta definitiva. La
// contraseña vive solo en memoria mientras esa pantalla está abierta.
export async function correoConfirmado(email, password) {
  try {
    await iniciarSesion(email, password);
    return true;
  } catch (e) {
    if (e.codigo === "email_not_confirmed") return false;
    throw e;
  }
}

// ── Reenviar el correo de confirmación ────────────────────────────────────
export async function reenviarConfirmacion(email) {
  await llamarAuth(`resend?redirect_to=${encodeURIComponent(URL_CONFIRMACION)}`, {
    type: "signup",
    email: email.trim().toLowerCase(),
  });
}
