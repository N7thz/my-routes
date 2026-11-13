/**
 * Erro com status HTTP: lançado de qualquer camada (serviço, sessão, rota) e
 * convertido em `{ error, reason? }` pelo `apiRoute`, no formato que o
 * `api()` do cliente já entende.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public reason?: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnauthenticatedError extends HttpError {
  constructor() {
    super(401, "Não autenticado", "unauthenticated");
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Não encontrado") {
    super(404, message);
  }
}
