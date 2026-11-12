import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyGroupRecord, CompanyGroupInput } from "@/lib/company-group-service";

export type { CompanyGroupRecord };

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error ?? fallback);
}

async function fetchGroups(): Promise<CompanyGroupRecord[]> {
  const res = await fetch("/api/company-groups");
  if (!res.ok) throw new Error("Falha ao carregar grupos");
  return res.json();
}

async function createGroupFetch(data: CompanyGroupInput & { name: string }): Promise<CompanyGroupRecord> {
  const res = await fetch("/api/company-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res, "Falha ao criar grupo");
  return res.json();
}

async function updateGroupFetch({ id, data }: { id: string; data: CompanyGroupInput }): Promise<CompanyGroupRecord> {
  const res = await fetch(`/api/company-groups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res, "Falha ao atualizar grupo");
  return res.json();
}

async function deleteGroupFetch(id: string): Promise<void> {
  const res = await fetch(`/api/company-groups/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Falha ao excluir grupo");
}

export function useCompanyGroups() {
  return useQuery<CompanyGroupRecord[]>({
    queryKey: ["company-groups"],
    queryFn: fetchGroups,
    staleTime: 5 * 60 * 1000,
  });
}

// Mudanças em grupos também alteram o groupId das empresas.
function useInvalidateGroups() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["company-groups"] });
    qc.invalidateQueries({ queryKey: ["companies"] });
  };
}

export function useCreateCompanyGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({ mutationFn: createGroupFetch, onSuccess: invalidate });
}

export function useUpdateCompanyGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({ mutationFn: updateGroupFetch, onSuccess: invalidate });
}

export function useDeleteCompanyGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({ mutationFn: deleteGroupFetch, onSuccess: invalidate });
}
