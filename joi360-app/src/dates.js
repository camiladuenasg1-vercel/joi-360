// Utilidades de fecha LOCAL (zona del dispositivo / Perú UTC-5), nunca UTC.
//
// `new Date().toISOString().slice(0,10)` devuelve la fecha en UTC. En Perú
// (UTC-5), en la tarde/noche ya es "mañana" en UTC, así que cualquier filtro
// de "hoy" o etiqueta de fecha date-only calculada con toISOString() cae un
// día corrido. Este helper centraliza el patrón correcto (getFullYear/
// getMonth/getDate) para no repetirlo mal en cada pantalla.

// "YYYY-MM-DD" de hoy en hora local.
export function hoyLocalISO() {
  return toLocalISO(new Date());
}

// Convierte un Date (o algo parseable por Date) a "YYYY-MM-DD" local.
export function toLocalISO(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parsea una fecha date-only "YYYY-MM-DD" como fecha LOCAL (no UTC) y la
// formatea. Sin esto, `new Date("2026-09-02")` = medianoche UTC → en Perú se
// muestra como el día anterior.
export function fmtFechaLocal(iso, opts = { day: "2-digit", month: "short" }) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("es-PE", opts);
}

// Un Date a partir de una fecha date-only, en hora local (para hacer
// aritmética de meses/años sin cruzar por UTC).
export function fechaLocalDe(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
