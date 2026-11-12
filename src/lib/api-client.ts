export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Motivo estruturado enviado pela API (ex.: "not-connected"), quando há. */
    public reason?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiInit = { method?: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown };

/**
 * Chama uma rota da API e devolve o JSON. Em resposta de erro lança `ApiError`
 * com a mensagem da API (`error`) ou, na falta dela, `fallback`.
 */
export async function api<T = void>(url: string, fallback: string, init: ApiInit = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method,
    ...(init.body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(init.body),
    }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { error?: string; reason?: string }
      | null;
    throw new ApiError(res.status, payload?.error ?? fallback, payload?.reason);
  }

  return res.json();
}

type Unavailable<R extends string> = { reason: R };

/**
 * Para fontes opcionais (Google, Runrunit): quando a API responde com um
 * `reason`, a fonte está indisponível, não com defeito — devolve o motivo como
 * dado em vez de lançar, para a tela oferecer a conexão.
 */
export async function apiOrUnavailable<T, R extends string>(
  url: string,
  fallback: string
): Promise<T | Unavailable<R>> {
  try {
    return await api<T>(url, fallback);
  } catch (err) {
    if (err instanceof ApiError && err.reason) return { reason: err.reason as R };
    throw err;
  }
}
