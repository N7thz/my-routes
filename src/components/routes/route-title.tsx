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
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { STATUS_CONFIG } from "./list-status-config";

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
  const statusCfg = STATUS_CONFIG[route.status];

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {routesOfDay.length > 1 ? (
        <>
          <h1 className="sr-only">{route.name}</h1>
          <Select value={route.id} onValueChange={onSelectRoute}>
            <SelectTrigger aria-label="Rota do dia" className="h-9 w-auto min-w-0 max-w-64 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {routesOfDay.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <h1 className="truncate text-base font-semibold">{route.name}</h1>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Status da rota: ${statusCfg.label}. Alterar status`}
            title={statusCfg.description}
            className="flex min-h-10 shrink-0 items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Badge
              variant={statusCfg.variant}
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
        <DropdownMenuContent align="start" className="w-72">
          {(Object.entries(STATUS_CONFIG) as [RouteStatus, (typeof STATUS_CONFIG)[RouteStatus]][]).map(([key, cfg]) => (
            <DropdownMenuItem key={key} onClick={() => onStatusChange(key)} className="items-start py-2">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", cfg.dotClassName)} />
              <span className="flex flex-1 flex-col">
                <span className={cn(route.status === key && "font-semibold")}>{cfg.label}</span>
                <span className="text-xs text-muted-foreground">{cfg.description}</span>
              </span>
              {route.status === key && <CheckIcon className="mt-0.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
