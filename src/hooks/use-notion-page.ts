import { useQuery } from "@tanstack/react-query";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

async function fetchPage(id: string): Promise<PageObjectResponse> {
  const res = await fetch(`/api/notion/pages/${id}`);
  if (!res.ok) throw new Error("Falha ao carregar página do Notion");
  return res.json();
}

async function fetchPageBlocks(
  id: string
): Promise<(BlockObjectResponse | PartialBlockObjectResponse)[]> {
  const res = await fetch(`/api/notion/pages/${id}/blocks`);
  if (!res.ok) throw new Error("Falha ao carregar blocos da página");
  return res.json();
}

export function useNotionPage(pageId: string) {
  return useQuery({
    queryKey: ["notion", "page", pageId],
    queryFn: () => fetchPage(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotionPageBlocks(pageId: string) {
  return useQuery({
    queryKey: ["notion", "page", pageId, "blocks"],
    queryFn: () => fetchPageBlocks(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000,
  });
}
