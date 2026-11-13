"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import type { RouteRecord } from "@/lib/route-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, MapPinIcon, MoreHorizontalIcon, PencilIcon, RouteIcon, Trash2Icon } from "lucide-react";
import { STATUS_CONFIG } from "./list-status-config";

export function RouteCard({
  route,
  onClick,
  onEdit,
  onDelete,
}: {
  route: RouteRecord;
  onClick: () => void;
  onEdit: (r: RouteRecord) => void;
  onDelete: (r: RouteRecord) => void;
}) {
  const cfg = STATUS_CONFIG[route.status];
  const visited = route.stops.filter((s) => s.visitedAt).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full cursor-pointer text-left rounded-lg border bg-card hover:bg-muted/30 transition-colors p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RouteIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm leading-snug line-clamp-2">{route.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={cfg.variant} className={cn("text-xs", cfg.className)}>
            {cfg.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontalIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(route)}>
                <PencilIcon className="size-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(route)} className="text-destructive focus:text-destructive">
                <Trash2Icon className="size-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {route.date && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarIcon className="size-3" />
          {formatDate(route.date)}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm">
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold tabular-nums">{route.stops.length}</span>
          <span className="text-xs text-muted-foreground">paradas</span>
        </div>
        {route.stops.length > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold tabular-nums text-emerald-500">{visited}</span>
            <span className="text-xs text-muted-foreground">visitadas</span>
          </div>
        )}
      </div>

      {route.stops.length > 0 && (
        <div className="border-t pt-2 mt-auto flex flex-col gap-1">
          {route.stops.slice(0, 3).map((s) => (
            <p key={s.id} className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPinIcon className="size-3 shrink-0" />
              <span className="truncate">{s.label ?? s.company?.name ?? s.address}</span>
            </p>
          ))}
          {route.stops.length > 3 && <p className="text-xs text-muted-foreground">+{route.stops.length - 3} mais…</p>}
        </div>
      )}
    </div>
  );
}
