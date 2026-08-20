import { useSyncExternalStore, useState, useEffect, useCallback } from "react";
import { getState, subscribe } from "./store";
import { useUser } from "./userStore.js";
import { getSyntheticUserId, fetchWalletBalance, fetchCashbackBalance, fetchCashbackPorComercio, fetchWalletBalancesBatch, canalesHabilitadosDeMundoLive, recargarSupabase, pagarSupabase, fetchTxHistory, fetchWorldConfigLive, fetchMerchantsLive, fetchCapacitiesLive, sincronizarCicloSuscripcionesMembresia } from "./supabaseClient.js";
import { MODULES } from "./modules.js";

let snapshot = getState();
const sub = (cb) => subscribe(() => { snapshot = getState(); cb(); });

export function useStore() {
  return useSyncExternalStore(sub, () => snapshot, () => snapshot);
}

/**
 * useWorldConfig(worldId) — FASE 0
 * Configuración VIVA del mundo leída de Supabase: exactamente lo que el
 * admin configuró (capacidades activas + feature flags + configFields).
 * Es la fuente única de verdad. Nada de catálogos locales.
 *
 * Devuelve { modulos, activo(cap), flag(cap, code), cfg(cap), loading }
 */
export function useWorldConfig(worldId) {
  const [conf, setConf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    if (!worldId) { setConf(null); setLoading(false); return; }
    setLoading(true);
    fetchWorldConfigLive(worldId)
      .then(c => { if (vivo) setConf(c); })
      .catch(() => { if (vivo) setConf(null); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [worldId]);

  return {
    loading,
    modulos: conf?.modulos || [],
    activo: conf?.activo || (() => false),
    flag:   conf?.flag   || (() => false),
    cfg:    conf?.cfg    || (() => ({})),
  };
}

/**
 * useModuleConfig(moduleId)
 * Config de UN módulo del mundo activo — ahora leída en vivo de Supabase
 * (antes venía del espejo local de store.js, que ya había divergido del admin).
 * Devuelve null si el módulo no existe o no está activo en este mundo.
 */
export function useModuleConfig(moduleId) {
  const u = useUser();
  const st = useStore();
  const activeMundoId = u?.activeMundoId;
  const { modulos, loading } = useWorldConfig(activeMundoId);

  const mundo = (st.mundos || []).find(m => m.id === activeMundoId);
  if (loading) return null;

  const mod = modulos.find(m => m.id === moduleId);
  if (!mod || !mod.enabled) return null;

  return {
    enabled: true,
    config: mod.config || {},
    servicios: mod.servicios || {},
    mundo,
    // Un flag cuenta como activo solo si está explícitamente en true.
    has: (flagCode) => mod.servicios?.[flagCode] === true,
  };
}

/**
 * useWalletLive(worldId)
 * Fuente única de verdad del saldo + canales habilitados para un mundo,
 * leída en vivo de Supabase (Fase 3). Reemplaza el balance local de
 * userStore.js — Hub y Pay comparten este mismo hook para no divergir.
 */
export function useWalletLive(worldId) {
  const [saldo, setSaldo] = useState(0);
  const [cashback, setCashback] = useState(0);
  const [cashbackPorComercio, setCashbackPorComercio] = useState({});
  const [canales, setCanales] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = getSyntheticUserId();

  const refresh = useCallback(async () => {
    if (!worldId) return;
    setLoading(true);
    try {
      // Motor de cobro recurrente de membresías (Suscripciones, 20-ago) — se
      // dispara ANTES de leer el saldo, para que un cobro que justo venció
      // se refleje de una en el número que ve el usuario, no en el próximo
      // refresh. Silencioso a propósito: un fallo acá no debe romper la
      // pantalla de Wallet, la próxima carga lo vuelve a intentar solo.
      await sincronizarCicloSuscripcionesMembresia(userId, worldId).catch(() => {});
      const [bal, cb, cbPorComercio, chs, hist] = await Promise.all([
        fetchWalletBalance(userId, worldId),
        fetchCashbackBalance(userId, worldId),
        fetchCashbackPorComercio(userId, worldId).catch(() => ({})),
        canalesHabilitadosDeMundoLive(worldId),
        fetchTxHistory(userId, worldId),
      ]);
      setSaldo(bal);
      setCashback(cb);
      setCashbackPorComercio(cbPorComercio);
      setCanales(chs);
      setHistorial(hist || []);
    } finally {
      setLoading(false);
    }
  }, [worldId, userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const recargar = useCallback(async (monto, channelId, channelNombre) => {
    const nuevo = await recargarSupabase(userId, worldId, monto, channelId, channelNombre);
    setSaldo(nuevo);
    refresh();
    return nuevo;
  }, [worldId, userId, refresh]);

  const pagar = useCallback(async (monto, comercioNombre) => {
    const r = await pagarSupabase(userId, worldId, monto, comercioNombre);
    if (r.ok) { setSaldo(r.balance); refresh(); }
    return r.ok;
  }, [worldId, userId, refresh]);

  return { saldo, cashback, cashbackPorComercio, canales, historial, loading, refresh, recargar, pagar };
}

/**
 * useCatalogLive()
 * Registry de módulos = catálogo local (colores/superficies curados) +
 * capacities de Supabase (cualquier capacidad NUEVA publicada por el admin
 * renderiza con su icono y nombre del catálogo, sin tocar este código).
 */
const CATALOG_FALLBACK = { bg: "bg-[#EEF2FD]", color: "text-[#1A3270]" };
export function useCatalogLive() {
  const [registry, setRegistry] = useState(MODULES);
  useEffect(() => {
    let vivo = true;
    fetchCapacitiesLive()
      .then(caps => {
        if (!vivo || !caps) return;
        const merged = { ...MODULES };
        for (const c of caps) {
          // Los módulos ya curados localmente (colores, superficie) mandan;
          // solo las capacidades NUEVAS entran con la metadata del catálogo.
          if (!merged[c.id]) merged[c.id] = { icon: c.icon || "extension", label: c.name || c.id, ...CATALOG_FALLBACK };
        }
        setRegistry(merged);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return registry;
}

/**
 * useMerchantsLive(worldId)
 * Directorio de comercios del mundo leído de Supabase (tabla merchants).
 * El alta de un comercio en el admin aparece aquí al refrescar.
 */
export function useMerchantsLive(worldId) {
  const [comercios, setComercios] = useState([]);
  useEffect(() => {
    let vivo = true;
    if (!worldId) { setComercios([]); return; }
    fetchMerchantsLive(worldId)
      .then(rows => { if (vivo) setComercios((rows || []).map(r => ({ id: r.id, nombre: r.name, fotoUrl: r.photo_url || null }))); })
      .catch(() => { if (vivo) setComercios([]); });
    return () => { vivo = false; };
  }, [worldId]);
  return comercios;
}

/**
 * useWalletBalances(worldIds)
 * Para vistas que muestran el saldo de VARIOS mundos a la vez (selector de
 * mundos, perfil). Devuelve { [worldId]: balance } leído en vivo de Supabase.
 */
export function useWalletBalances(worldIds) {
  const [balances, setBalances] = useState({});
  const key = (worldIds || []).join(",");
  const userId = getSyntheticUserId();

  useEffect(() => {
    if (!worldIds || !worldIds.length) return;
    fetchWalletBalancesBatch(userId, worldIds).then(setBalances);
  }, [key, userId]);

  return balances;
}
