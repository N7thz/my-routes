import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyRecord, ImportResult, CompanyUpdateInput, CompanyCreateInput } from "@/lib/company-service";

async function fetchCompanies(): Promise<CompanyRecord[]> {
  const res = await fetch("/api/companies");
  if (!res.ok) throw new Error("Falha ao carregar empresas");
  return res.json();
}

async function importFromNotion(): Promise<ImportResult> {
  const res = await fetch("/api/companies/import/notion", { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Falha na importação");
  }
  return res.json();
}

export function useCompanies() {
  return useQuery<CompanyRecord[]>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportNotionCompanies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importFromNotion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

async function updateCompanyFetch({ id, data }: { id: string; data: CompanyUpdateInput }): Promise<CompanyRecord> {
  const res = await fetch(`/api/companies/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Falha ao atualizar empresa");
  return res.json();
}

async function deleteCompanyFetch(id: string): Promise<void> {
  const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao excluir empresa");
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCompanyFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompanyFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

async function createCompanyFetch(data: CompanyCreateInput): Promise<CompanyRecord> {
  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Falha ao criar empresa");
  }
  return res.json();
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompanyFetch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
