import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { COMPANIES_KEY, COMPANY_GROUPS_KEY, useInvalidateCompanies } from "@/hooks/use-companies";
import type { CompanyRecord } from "@/lib/company-service";
import type { CompanyGroupRecord, CompanyGroupInput } from "@/lib/company-group-service";

export type { CompanyGroupRecord };

export function useCompanyGroups() {
  return useQuery({
    queryKey: COMPANY_GROUPS_KEY,
    queryFn: () => api<CompanyGroupRecord[]>("/api/company-groups", "Falha ao carregar grupos"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompanyGroup() {
  return useMutation({
    mutationFn: (data: CompanyGroupInput & { name: string }) =>
      api<CompanyGroupRecord>("/api/company-groups", "Falha ao criar grupo", {
        method: "POST",
        body: data,
      }),
    onSuccess: useInvalidateCompanies(),
  });
}

/**
 * Cria um grupo já com as empresas (soltar um cartão sem grupo em cima de
 * outro). Grava o grupo e o `groupId` no cache antes de devolver, para o
 * formulário de edição que abre em seguida já ver as duas empresas marcadas.
 */
export function useCreateGroupWith() {
  const qc = useQueryClient();
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (data: { name: string; color: string; companyIds: string[] }) =>
      api<CompanyGroupRecord>("/api/company-groups", "Falha ao criar grupo", { method: "POST", body: data }),
    onSuccess: (group, { companyIds }) => {
      const ids = new Set(companyIds);
      qc.setQueryData<CompanyRecord[]>(COMPANIES_KEY, (list) =>
        list?.map((c) => (ids.has(c.id) ? { ...c, groupId: group.id } : c)),
      );
      qc.setQueryData<CompanyGroupRecord[]>(COMPANY_GROUPS_KEY, (list) =>
        list ? [...list, group].sort((a, b) => a.name.localeCompare(b.name)) : list,
      );
      invalidate();
    },
  });
}

export function useUpdateCompanyGroup() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompanyGroupInput }) =>
      api<CompanyGroupRecord>(`/api/company-groups/${id}`, "Falha ao atualizar grupo", {
        method: "PUT",
        body: data,
      }),
    onSuccess: useInvalidateCompanies(),
  });
}

export function useDeleteCompanyGroup() {
  return useMutation({
    mutationFn: (id: string) => api(`/api/company-groups/${id}`, "Falha ao excluir grupo", { method: "DELETE" }),
    onSuccess: useInvalidateCompanies(),
  });
}
