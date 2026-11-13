"use client";

import { useState } from "react";
import { OVERDUE_BADGE, taskColor, formatEstimate, taskBestDate, type RunrunitTask } from "@/lib/runrunit";
import { formatDate } from "@/lib/dates";
import { useRunrunitList } from "@/hooks/use-runrunit-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BuildingIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardXIcon, ClockIcon, FolderIcon } from "lucide-react";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function RunrunitListView({ onTaskClick }: { onTaskClick: (task: RunrunitTask) => void }) {
  const { data, isLoading } = useRunrunitList();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const sorted: RunrunitTask[] = !Array.isArray(data)
    ? []
    : [...data].sort((a, b) => {
        const da = taskBestDate(a);
        const db = taskBestDate(b);
        if (da && db) return new Date(db).getTime() - new Date(da).getTime();
        if (da) return -1;
        if (db) return 1;
        return b.id - a.id;
      });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!Array.isArray(data) || sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <ClipboardXIcon className="size-8" />
        <p className="text-sm">Nenhuma tarefa encontrada</p>
      </div>
    );
  }

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, sorted.length);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">
          {start}–{end} de {sorted.length} tarefas
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Por página:</span>
          <div className="flex gap-1">
            {PAGE_SIZE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handlePageSize(s)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  pageSize === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {paginated.map((task) => {
          const date = taskBestDate(task);
          const estimate = formatEstimate(task.current_estimate_seconds);
          const overdueBadge = OVERDUE_BADGE[task.overdue ?? "on_schedule"];

          return (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="w-full text-left flex gap-3 items-start px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <div
                className="mt-1.5 size-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: taskColor(task),
                }}
              />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-sm font-medium leading-snug line-clamp-2">
                  {task.is_subtask && task.parent_task_title && (
                    <span className="text-muted-foreground font-normal">{task.parent_task_title} · </span>
                  )}
                  {task.title}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {task.client_name && (
                    <span className="flex items-center gap-1">
                      <BuildingIcon className="size-3" />
                      {task.client_name}
                    </span>
                  )}
                  {task.project_name && (
                    <span className="flex items-center gap-1">
                      <FolderIcon className="size-3" />
                      {task.project_name}
                    </span>
                  )}
                  {estimate && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {estimate}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {task.is_closed && <Badge variant="secondary">Encerrada</Badge>}
                  {task.is_urgent && !task.is_closed && <Badge variant="destructive">Urgente</Badge>}
                  {!task.is_closed && overdueBadge && (
                    <Badge variant={overdueBadge.variant}>{overdueBadge.label}</Badge>
                  )}
                  {task.type_name && <Badge variant="outline">{task.type_name}</Badge>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5 text-right">
                {date ? formatDate(date) : <span className="italic">Sem data</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[5rem] text-center">
          Página {safePage} de {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
