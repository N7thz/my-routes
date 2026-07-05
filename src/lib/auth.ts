import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

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
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessType: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    },
    notion: {
      clientId: process.env.NOTION_CLIENT_ID!,
      clientSecret: process.env.NOTION_CLIENT_SECRET!,
    },
  },
});
