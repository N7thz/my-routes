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
      .filter(Boolean),
  );
}

export const auth = betterAuth({
  // Em produção usamos a URL pública fixa (domínio da Vercel).
  // Em dev a origem vem da requisição, restrita a localhost em qualquer porta
  // (não depende de porta fixa e não dispara o aviso "Base URL is not set").
  baseURL:
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL
      : { allowedHosts: ["localhost:*", "127.0.0.1:*"], protocol: "http" },
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
      // select_account mostra o seletor de contas, para dar para vincular outro
      // e-mail do Google sem sair da conta atual no navegador.
      prompt: "select_account consent",
      // calendar.events dá leitura e escrita. O app hoje só lê a agenda; manter
      // o escopo evita obrigar quem já está conectado a reconectar.
      scope: ["https://www.googleapis.com/auth/calendar.events"],
    },
    notion: {
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
    },
  },
});
