import { demoState } from "./demoData";
import type { SportState } from "../types";

const STORAGE_KEY = "suivi-sport-web-state-v1";

export function loadState(): SportState {
  if (typeof window === "undefined") return demoState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveState(demoState);
    return structuredClone(demoState);
  }

  try {
    const parsed = JSON.parse(raw) as SportState;
    return parsed.version === 1 ? parsed : structuredClone(demoState);
  } catch {
    return structuredClone(demoState);
  }
}

export function saveState(state: SportState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetDemoState(): SportState {
  const fresh = structuredClone(demoState);
  saveState(fresh);
  return fresh;
}

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
