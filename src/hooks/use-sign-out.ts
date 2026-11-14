"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { REMEMBERED_FILTERS_PREFIX } from "@/hooks/use-remembered-filters";

const CACHE_KEY = "my-routes-cache";

/** Encerra a sessão e apaga os dados do aparelho (cache do React Query + localStorage). */
export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async function handleSignOut() {
    try {
      await signOut();
    } finally {
      queryClient.clear();
      try {
        localStorage.removeItem(CACHE_KEY);
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(REMEMBERED_FILTERS_PREFIX)) localStorage.removeItem(key);
        }
      } catch {
        // localStorage indisponível (modo privado etc.): nada a limpar
      }
      router.push("/login");
    }
  };
}
