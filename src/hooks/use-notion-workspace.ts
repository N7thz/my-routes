import { useQuery } from "@tanstack/react-query";
import type { NotionSearchResult } from "@/lib/notion";

async function fetchWorkspace(query?: string): Promise<NotionSearchResult[] | null> {
  const url = query
    ? `/api/notion/workspace?q=${encodeURIComponent(query)}`
    : "/api/notion/workspace";

  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Falha ao carregar workspace do Notion");
  return res.json();
}

export function useNotionWorkspace(query?: string) {
  return useQuery({
    queryKey: ["notion", "workspace", query ?? ""],
    queryFn: () => fetchWorkspace(query),
    staleTime: 60 * 1000,
    retry: 1,
  });
}
