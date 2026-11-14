"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  consentCode: string | null;
  clientName: string;
  userEmail: string;
  scopes: string[];
};

export function ConsentCard({ consentCode, clientName, userEmail, scopes }: Props) {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function answer(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept, consent_code: consentCode }),
      });
      const data = (await res.json().catch(() => null)) as { redirectURI?: string } | null;
      if (!res.ok || !data?.redirectURI) throw new Error();
      window.location.assign(data.redirectURI);
    } catch {
      setError("Não deu para concluir. Volte ao aplicativo e tente conectar de novo.");
      setPending(null);
    }
  }

  if (!consentCode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {/* O preflight do Tailwind zera o estilo do h1: o visual continua o do CardTitle. */}
            <h1>Pedido inválido ou expirado</h1>
          </CardTitle>
          <CardDescription>Volte ao aplicativo e tente conectar o My Routes de novo.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>Conectar {clientName} ao My Routes?</h1>
        </CardTitle>
        <CardDescription>
          Entrando como <span className="font-medium text-foreground">{userEmail}</span>. Com o acesso, o {clientName}{" "}
          pode ler e alterar suas empresas, rotas e agenda pelas ferramentas do MCP (nada é apagado).
        </CardDescription>
      </CardHeader>
      {scopes.length > 0 && (
        <CardContent>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {scopes.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-foreground/60" />
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
      <CardFooter className="flex flex-col items-stretch gap-3">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => answer(false)} disabled={pending !== null}>
            {pending === "deny" ? "Recusando…" : "Recusar"}
          </Button>
          <Button onClick={() => answer(true)} disabled={pending !== null}>
            {pending === "accept" ? "Autorizando…" : "Autorizar"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
