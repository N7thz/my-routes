"use client";

import { cn } from "@/lib/utils";
import { useUpdateRoute } from "@/hooks/use-routes";
import type { RouteRecord, RouteStatus } from "@/lib/route-service";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_CONFIG } from "./list-status-config";

export function QuickRouteStatus({ route }: { route: RouteRecord }) {
  const update = useUpdateRoute();
  const cfg = STATUS_CONFIG[route.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="focus:outline-none" onClick={(e) => e.stopPropagation()}>
          <Badge
            variant={cfg.variant}
            className={cn("text-xs cursor-pointer hover:opacity-75 transition-opacity", cfg.className)}
          >
            {cfg.label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {(Object.entries(STATUS_CONFIG) as [RouteStatus, (typeof STATUS_CONFIG)[RouteStatus]][]).map(([key, c]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => update.mutate({ id: route.id, data: { status: key } })}
            className={cn("gap-2", route.status === key && "font-semibold")}
          >
            <Badge variant={c.variant} className={cn("text-xs", c.className)}>
              {c.label}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
