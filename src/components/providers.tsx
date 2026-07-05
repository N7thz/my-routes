"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState } from "react";
import { PWAManager } from "@/components/pwa";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // mantém em cache por 24h para que a persistência offline valha a pena
            gcTime: 1000 * 60 * 60 * 24,
            retry: 2,
          },
        },
      })
  );

  // persiste o cache no localStorage → dados sobrevivem a reload offline
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: "my-routes-cache",
    })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      scriptProps={{
        type:
          typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24,
          buster: "v1",
        }}
        onSuccess={() => {
          // ao reconectar/restaurar, reenvia mutações que ficaram pausadas offline
          queryClient.resumePausedMutations();
        }}
      >
        <NuqsAdapter>{children}</NuqsAdapter>
        <PWAManager />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
