import type { RouteStatus } from "@/lib/route-service";

/**
 * Status de rota: fonte única para badges, menus e pontos de status.
 * Monocromático, com verde só para "Concluída" (ver DESIGN.md, The Signal Only Rule).
 */
export const STATUS_CONFIG: Record<
  RouteStatus,
  {
    label: string;
    /** O que o status quer dizer, mostrado no menu de troca. */
    description: string;
    variant: "secondary" | "default" | "outline";
    className?: string;
    /** Ponto de status em listas compactas (acompanha o rótulo, nunca sozinho). */
    dotClassName: string;
  }
> = {
  RASCUNHO: {
    label: "Rascunho",
    description: "Planejada, as visitas ainda não começaram",
    variant: "secondary",
    dotClassName: "bg-muted-foreground/50",
  },
  EM_ANDAMENTO: {
    label: "Em andamento",
    description: "Visitas acontecendo agora",
    variant: "default",
    dotClassName: "bg-foreground",
  },
  CONCLUIDA: {
    label: "Concluída",
    description: "Todas as visitas foram feitas",
    variant: "outline",
    className:
      "border-emerald-600/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
};
