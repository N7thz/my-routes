import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePageParameters,
  UpdatePageParameters,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

export function useCreateNotionPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreatePageParameters): Promise<PageObjectResponse> => {
      const res = await fetch("/api/notion/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Falha ao criar página no Notion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notion", "workspace"] });
    },
  });
}

export function useUpdateNotionPage(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      properties: UpdatePageParameters["properties"]
    ): Promise<PageObjectResponse> => {
      const res = await fetch(`/api/notion/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar página no Notion");
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["notion", "page", pageId], updated);
    },
  });
}

export function useArchiveNotionPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string): Promise<PageObjectResponse> => {
      const res = await fetch(`/api/notion/pages/${pageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao arquivar página no Notion");
      return res.json();
    },
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: ["notion", "workspace"] });
      queryClient.removeQueries({ queryKey: ["notion", "page", pageId] });
    },
  });
}
