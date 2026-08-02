import { useState, useEffect } from "react";
import { resetSyntheticUserId } from "./supabaseClient.js";

const USER_KEY = "joi360_user_v3";
let _state = null;
let _listeners = [];

function load() {
  if (_state) return _state;
  try { const r = localStorage.getItem(USER_KEY); _state = r ? JSON.parse(r) : null; } catch { _state = null; }
  return _state;
}
function save() {
  localStorage.setItem(USER_KEY, JSON.stringify(_state));
  _listeners.forEach(fn => fn());
}
function ensure() {
  if (!_state) _state = { auth: null, activeMundoId: null, memberships: [], balances: {}, puntos: {}, txHistory: [], childConfigs: {}, preferencias: { notificacionesPush: true } };
  if (!_state.preferencias) _state.preferencias = { notificacionesPush: true };
}

export const getUser = () => load();

export function updateUser(fn) { load(); ensure(); fn(_state); save(); }

export function subscribeUser(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

// Resto de la época sin cuentas reales: se guardaba localmente qué nombre había
// usado cada correo, porque el "login" no sabía más que el correo y si no
// mostraba el prefijo ("camiduenasg1") como si fuera un nombre.
//
// Ahora la cuenta trae nombres y apellidos de verdad, así que este mapa pasó a
// ser solo un respaldo: solo se usa si el login no aporta un nombre. Dejarlo
// mandar por encima de la cuenta era lo que hacía que el saludo siguiera
// diciendo el prefijo del correo aunque la persona ya se hubiera registrado.
const NOMBRES_KEY = "joi360_nombres_por_email";
function nombreRecordado(email) {
  try { return JSON.parse(localStorage.getItem(NOMBRES_KEY) || "{}")[email]; } catch { return undefined; }
}
function recordarNombre(email, nombre) {
  try {
    const mapa = JSON.parse(localStorage.getItem(NOMBRES_KEY) || "{}");
    mapa[email] = nombre;
    localStorage.setItem(NOMBRES_KEY, JSON.stringify(mapa));
  } catch { /* localStorage no disponible */ }
}

export function loginUser(nombre, email) {
  const nombreFinal = (nombre || "").trim() || nombreRecordado(email) || (email || "").split("@")[0];
  recordarNombre(email, nombreFinal);
  updateUser(s => {
    s.auth = { nombre: nombreFinal, email, since: Date.now() };
    // Auto-join fixed RP worlds on first login
    const rpIds = ["mundo-eventos-rp", "mundo-promos-rp"];
    rpIds.forEach(id => {
      if (!s.memberships.includes(id)) s.memberships.push(id);
      if (s.balances[id] === undefined) s.balances[id] = 0;
      if (s.puntos[id] === undefined) s.puntos[id] = 0;
    });
  });
}
export function logoutUser() {
  updateUser(s => {
    s.auth = null; s.activeMundoId = null; s.memberships = [];
    s.balances = {}; s.puntos = {}; s.txHistory = []; s.childConfigs = {};
  });
  resetSyntheticUserId();
}

export function joinMundo(mundoId) {
  updateUser(s => {
    if (!s.memberships.includes(mundoId)) s.memberships.push(mundoId);
    if (s.balances[mundoId] === undefined) s.balances[mundoId] = 0;
    if (s.puntos[mundoId] === undefined) s.puntos[mundoId] = 0;
    if (!s.activeMundoId) s.activeMundoId = mundoId;
  });
}

export function setActiveMundo(mundoId) { updateUser(s => { s.activeMundoId = mundoId; }); }

export function recargar(mundoId, monto, canalNombre = "Recarga rápida") {
  updateUser(s => {
    s.balances[mundoId] = (s.balances[mundoId] || 0) + monto;
    s.txHistory.unshift({ id: `tx-${Date.now()}`, tipo: "RECARGA", titulo: `${canalNombre} · S/ ${monto.toFixed(2)}`, monto, mundoId, fecha: new Date().toISOString() });
  });
}

export function pagar(mundoId, monto, comercio = "Comercio") {
  let ok = false;
  updateUser(s => {
    if ((s.balances[mundoId] || 0) >= monto) {
      s.balances[mundoId] -= monto;
      s.puntos[mundoId] = (s.puntos[mundoId] || 0) + Math.floor(monto * 2);
      s.txHistory.unshift({ id: `tx-${Date.now()}`, tipo: "PAGO", titulo: `Pago en ${comercio}`, monto: -monto, mundoId, fecha: new Date().toISOString() });
      ok = true;
    }
  });
  return ok;
}

export function setChildConfig(mundoId, config) { updateUser(s => { s.childConfigs[mundoId] = { ...s.childConfigs?.[mundoId], ...config }; }); }

// Preferencias de cuenta (Gantt #12 — antes "Configuración" en Perfil era 5
// filas 100% decorativas sin ningún onClick real).
export function setPreferencia(key, value) {
  updateUser(s => { s.preferencias = { ...s.preferencias, [key]: value }; });
}

export function useUser() {
  const [u, setU] = useState(() => load());
  useEffect(() => subscribeUser(() => setU({ ...load() })), []);
  return u;
}
