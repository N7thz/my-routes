"use client";

import { cn } from "@/lib/utils";
import type { RouteRecord, RouteStatus } from "@/lib/route-service";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDownIcon } from "lucide-react";
import { DAY_STATUS_CONFIG } from "./day-labels";

/** Nome da rota (ou seletor, se o dia tem várias) + badge de status editável. */
export function RouteTitle({
  route,
  routesOfDay,
  onSelectRoute,
  onStatusChange,
}: {
  route: RouteRecord;
  routesOfDay: RouteRecord[];
  onSelectRoute: (id: string) => void;
  onStatusChange: (status: RouteStatus) => void;
}) {
  const statusCfg = DAY_STATUS_CONFIG[route.status];

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {routesOfDay.length > 1 ? (
        <Select value={route.id} onValueChange={onSelectRoute}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {routesOfDay.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <h1 className="truncate text-sm font-semibold">{route.name}</h1>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="shrink-0 focus:outline-none">
            <Badge
              className={cn(
                "cursor-pointer gap-1 pr-1.5 text-xs font-medium transition-opacity hover:opacity-80",
                statusCfg.className,
              )}
            >
              {statusCfg.label}
              <ChevronDownIcon className="size-3" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {(Object.entries(DAY_STATUS_CONFIG) as [RouteStatus, (typeof DAY_STATUS_CONFIG)[RouteStatus]][]).map(
            ([key, cfg]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onStatusChange(key)}
                className={cn("gap-2", route.status === key && "font-semibold")}
              >
                <Badge className={cn("size-2 rounded-full p-0", cfg.className)} />
                {cfg.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
