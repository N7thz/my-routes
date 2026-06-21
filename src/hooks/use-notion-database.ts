import { useQuery } from "@tanstack/react-query";
import type {
  DatabaseObjectResponse,
  GetDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints/databases";
import type {
  QueryDataSourceParameters,
  QueryDataSourceResponse,
} from "@notionhq/client/build/src/api-endpoints/data-sources";

async function fetchDatabase(id: string): Promise<GetDatabaseResponse> {
  const res = await fetch(`/api/notion/databases/${id}`);
  if (!res.ok) throw new Error("Falha ao carregar database do Notion");
  return res.json();
}

async function fetchDataSourceRows(
  id: string,
  options?: Omit<QueryDataSourceParameters, "data_source_id">
): Promise<QueryDataSourceResponse> {
  const res = await fetch(`/api/notion/databases/${id}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) throw new Error("Falha ao consultar database do Notion");
  return res.json();
}

export function useNotionDatabase(databaseId: string) {
  return useQuery({
    queryKey: ["notion", "database", databaseId],
    queryFn: () => fetchDatabase(databaseId),
    enabled: !!databaseId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotionDatabaseRows(
  databaseId: string,
  options?: Omit<QueryDataSourceParameters, "data_source_id">
) {
  return useQuery({
    queryKey: ["notion", "database", databaseId, "rows", options],
    queryFn: () => fetchDataSourceRows(databaseId, options),
    enabled: !!databaseId,
    staleTime: 60 * 1000,
  });
}

export type { DatabaseObjectResponse };
