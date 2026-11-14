import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

const AUTHORIZE_PATH = "/api/auth/mcp/authorize";

/**
 * O plugin `mcp` só mostra a tela de consentimento com `prompt=consent`; sem
 * isso, qualquer cliente registrado (o registro é aberto) receberia o código de
 * quem já está logado sem a pessoa ver nada. Aqui o authorize sempre pede
 * consentimento. Tem que ser exatamente "consent": o plugin compara o valor
 * inteiro (um "login consent" pularia a tela).
 */
function forceConsent(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== AUTHORIZE_PATH) return request;
  url.searchParams.set("prompt", "consent");
  return new Request(url, request);
}

export const GET = (request: Request) => handler.GET(forceConsent(request));
export const POST = handler.POST;
