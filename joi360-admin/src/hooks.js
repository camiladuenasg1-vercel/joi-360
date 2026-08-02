import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./store";

let snapshot = getState();
const sub = (cb) => subscribe(() => { snapshot = getState(); cb(); });

export function useStore() {
  return useSyncExternalStore(sub, () => snapshot, () => snapshot);
}
