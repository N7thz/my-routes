import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { COMPANY_GROUPS_KEY, useInvalidateCompanies } from "@/hooks/use-companies";
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
    mutationFn: (id: string) =>
      api(`/api/company-groups/${id}`, "Falha ao excluir grupo", { method: "DELETE" }),
    onSuccess: useInvalidateCompanies(),
  });
}
