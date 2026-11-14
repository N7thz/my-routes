import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Playground } from "./playground";

export const metadata: Metadata = { title: "Teste ui-sdk" };

export default function TesteUiPage() {
  // Bancada de componentes: só existe em desenvolvimento.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Teste do ui-sdk</h1>
        <p className="text-sm text-muted-foreground">
          Página de bancada para ver os componentes com o tema do app.
        </p>
      </header>
      <Playground />
    </main>
  );
}
