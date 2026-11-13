import type { RouteStatus } from "@/lib/route-service";

export const STATUS_CONFIG: Record<
  RouteStatus,
  { label: string; variant: "secondary" | "default" | "outline"; className?: string }
> = {
  RASCUNHO: { label: "Rascunho", variant: "secondary" },
  EM_ANDAMENTO: { label: "Em Andamento", variant: "default" },
  CONCLUIDA: {
    label: "Concluída",
    variant: "outline",
    className:
      "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
  },
};
