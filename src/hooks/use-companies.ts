import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CompanyRecord, CompanyUpdateInput, CompanyCreateInput, NotionPageResult } from "@/lib/company-service";

export const COMPANIES_KEY = ["companies"] as const;
export const COMPANY_GROUPS_KEY = ["company-groups"] as const;

/**
 * Empresas e grupos mudam juntos: a empresa carrega o `groupId` e o grupo, a
 * contagem de empresas. Toda mutação de um invalida os dois.
 */
export function useInvalidateCompanies() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: COMPANIES_KEY });
    qc.invalidateQueries({ queryKey: COMPANY_GROUPS_KEY });
  };
}

export function useCompanies() {
  return useQuery({
    queryKey: COMPANIES_KEY,
    queryFn: () => api<CompanyRecord[]>("/api/companies", "Falha ao carregar empresas"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompany() {
  return useMutation({
    mutationFn: (data: CompanyCreateInput) =>
      api<CompanyRecord>("/api/companies", "Falha ao criar empresa", { method: "POST", body: data }),
    onSuccess: useInvalidateCompanies(),
  });
}

export function useUpdateCompany() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompanyUpdateInput }) =>
      api<CompanyRecord>(`/api/companies/${id}`, "Falha ao atualizar empresa", {
        method: "PUT",
        body: data,
      }),
    onSuccess: useInvalidateCompanies(),
  });
}

/**
 * Troca o grupo da empresa (arrastar o cartão). Atualiza o cache na hora para o
 * cartão não "voltar" até a resposta chegar, e desfaz se a API falhar.
 */
export function useMoveCompanyToGroup() {
  const qc = useQueryClient();
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({ id, groupId }: { id: string; groupId: string | null }) =>
      api<CompanyRecord>(`/api/companies/${id}`, "Falha ao mover empresa de grupo", {
        method: "PUT",
        body: { groupId },
      }),
    onMutate: async ({ id, groupId }) => {
      await qc.cancelQueries({ queryKey: COMPANIES_KEY });
      const previous = qc.getQueryData<CompanyRecord[]>(COMPANIES_KEY);
      qc.setQueryData<CompanyRecord[]>(COMPANIES_KEY, (list) =>
        list?.map((c) => (c.id === id ? { ...c, groupId } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(COMPANIES_KEY, context.previous);
    },
    onSettled: invalidate,
  });
}

export function useDeleteCompany() {
  return useMutation({
    mutationFn: (id: string) => api(`/api/companies/${id}`, "Falha ao excluir empresa", { method: "DELETE" }),
    onSuccess: useInvalidateCompanies(),
  });
}

/** Cria a página da empresa no Notion; devolve a URL para abrir. */
export function useCreateNotionPage() {
  return useMutation({
    mutationFn: (id: string) =>
      api<NotionPageResult>(`/api/companies/${id}/notion`, "Falha ao criar página no Notion", {
        method: "POST",
      }),
    onSuccess: useInvalidateCompanies(),
  });
}
