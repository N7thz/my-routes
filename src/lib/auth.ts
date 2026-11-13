import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { prisma } from "./prisma";

/**
 * Quem pode criar conta: ALLOWED_EMAILS (separados por vírgula) ou, na falta,
 * o CRON_USER_EMAIL. Sem nenhum dos dois ninguém novo entra. Só vale para a
 * criação: quem já tem usuário continua entrando normalmente.
 */
function allowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? process.env.CRON_USER_EMAIL ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const auth = betterAuth({
  // Em produção usamos a URL pública fixa (domínio da Vercel).
  // Em dev deixamos undefined para o better-auth inferir a origem a partir
  // da requisição — resolve para http://localhost:<porta> automaticamente,
  // sem depender de uma porta fixa.
  baseURL:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL
      : undefined,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // O login é só por Google/Notion; email e senha ficavam abertos para
  // qualquer um se cadastrar pela API (/api/auth/sign-up/email).
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: true,
      // O Notion não devolve e-mail verificado: sem confiar nele, conectar a
      // conta pelo linkSocial falha com `unable_to_link_account`.
      trustedProviders: ["google", "notion"],
      // A conta do Notion usa outro e-mail que a do Google. Só afeta o
      // linkSocial, que exige usuário logado.
      allowDifferentEmails: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!allowedEmails().has(user.email.toLowerCase())) {
            throw new APIError("FORBIDDEN", { message: "Este e-mail não tem acesso ao app" });
          }
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      // prompt:"consent" força o Google a reexibir a tela de autorização. Sem
      // isso, contas já conectadas reaproveitam o consentimento antigo e o
      // token volta SEM o escopo de escrita — mesmo com o scope certo no banco.
      prompt: "consent",
      // calendar.events permite ler E criar/editar eventos (necessário para
      // sincronizar tarefas do Runrunit como eventos). Substitui o antigo
      // calendar.readonly — usuários já conectados precisam reconectar.
      scope: ["https://www.googleapis.com/auth/calendar.events"],
    },
    notion: {
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
    },
  },
});
