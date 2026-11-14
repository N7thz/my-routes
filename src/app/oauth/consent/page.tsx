import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ConsentCard } from "./consent-card";

export const metadata: Metadata = { title: "Autorizar acesso" };

const SCOPE_LABELS: Record<string, string> = {
  openid: "Saber quem é você",
  profile: "Ver seu nome e foto",
  email: "Ver seu e-mail",
  offline_access: "Continuar conectado sem pedir login de novo",
};

/**
 * Tela de consentimento do OAuth do MCP. O authorize (/api/auth/mcp/authorize)
 * chega aqui com o `consent_code`; aceitar libera o código para o cliente.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const consentCode = typeof params.consent_code === "string" ? params.consent_code : null;
  const clientId = typeof params.client_id === "string" ? params.client_id : null;
  const scope = typeof params.scope === "string" ? params.scope : "";

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const client =
    consentCode && clientId
      ? await prisma.oauthApplication.findUnique({ where: { clientId }, select: { name: true, metadata: true } })
      : null;

  const scopes = scope
    .split(" ")
    .filter(Boolean)
    .map((s) => SCOPE_LABELS[s] ?? s);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <ConsentCard
        consentCode={client ? consentCode : null}
        clientName={client?.name || "Cliente MCP"}
        userEmail={user.email}
        scopes={scopes}
      />
    </div>
  );
}
