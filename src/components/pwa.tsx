"use client";

import { useEffect, useState } from "react";
import { WifiOffIcon } from "lucide-react";

// Registra o service worker e mostra um aviso quando o dispositivo está offline.
export function PWAManager() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* SW opcional — falha não deve quebrar o app */
        });
    }

    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[2000] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1 text-xs font-medium text-amber-950"
      style={{ paddingTop: "calc(0.25rem + env(safe-area-inset-top))" }}
    >
      <WifiOffIcon className="size-3.5 shrink-0" />
      Você está offline — usando dados salvos
    </div>
  );
}
