import type { Metadata } from "next";
import { WifiOffIcon } from "lucide-react";

export const metadata: Metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <WifiOffIcon className="size-8 text-muted-foreground/60" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Você está offline</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Esta página ainda não foi salva para uso offline. Abra uma página já
          visitada (Rotas, Empresas) ou reconecte-se à internet.
        </p>
      </div>
    </div>
  );
}
