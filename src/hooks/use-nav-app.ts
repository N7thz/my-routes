"use client";

import { useSyncExternalStore } from "react";
import { getPreferredNavApp, setPreferredNavApp, type NavApp } from "@/lib/navigation";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * App de navegação preferido (Google Maps ou Waze), guardado no aparelho. No
 * servidor é sempre "google", para o HTML bater com a primeira renderização.
 */
export function usePreferredNavApp(): [NavApp, (app: NavApp) => void] {
  const app = useSyncExternalStore(subscribe, getPreferredNavApp, () => "google" as const);
  function choose(next: NavApp) {
    setPreferredNavApp(next);
    for (const l of listeners) l();
  }
  return [app, choose];
}
