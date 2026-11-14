import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type ApiTokenView = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

/** Resposta da criação: o `token` em claro só existe aqui, uma única vez. */
export type CreatedApiToken = ApiTokenView & { token: string };

const KEY = ["api-tokens"] as const;

export function useApiTokens() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<ApiTokenView[]>("/api/tokens", "Falha ao carregar os tokens"),
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<CreatedApiToken>("/api/tokens", "Falha ao criar o token", { method: "POST", body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/tokens/${id}`, "Falha ao revogar o token", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
