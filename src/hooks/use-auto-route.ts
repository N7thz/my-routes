import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ROUTES_KEY } from "@/hooks/use-routes";
import type {
  AutoRouteRunResult,
  AutoRouteSettingsInput,
  AutoRouteSettingsView,
} from "@/lib/auto-route-service";

export const AUTO_ROUTE_SETTINGS_KEY = ["auto-route-settings"] as const;

export function useAutoRouteSettings() {
  return useQuery({
    queryKey: AUTO_ROUTE_SETTINGS_KEY,
    queryFn: () =>
      api<AutoRouteSettingsView>("/api/settings/auto-route", "Falha ao carregar a rota automática"),
  });
}

export function useUpdateAutoRouteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AutoRouteSettingsInput) =>
      api<AutoRouteSettingsView>("/api/settings/auto-route", "Falha ao salvar a rota automática", {
        method: "PATCH",
        body: input,
      }),
    // Atualiza na hora: os interruptores não piscam esperando o refetch.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: AUTO_ROUTE_SETTINGS_KEY });
      const previous = qc.getQueryData<AutoRouteSettingsView>(AUTO_ROUTE_SETTINGS_KEY);
      if (previous) qc.setQueryData(AUTO_ROUTE_SETTINGS_KEY, { ...previous, ...input });
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(AUTO_ROUTE_SETTINGS_KEY, ctx.previous);
    },
    onSuccess: (data) => qc.setQueryData(AUTO_ROUTE_SETTINGS_KEY, data),
  });
}

/** "Gerar agora": roda as fontes + otimização e recarrega as rotas. */
export function useRunAutoRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<AutoRouteRunResult>("/api/routes/auto", "Falha ao gerar as rotas do dia", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROUTES_KEY });
      qc.invalidateQueries({ queryKey: AUTO_ROUTE_SETTINGS_KEY });
    },
  });
}
