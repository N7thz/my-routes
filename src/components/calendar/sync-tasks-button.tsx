"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { signIn } from "@/lib/auth-client";
import { useSyncTasksToCalendar } from "@/hooks/use-sync-tasks-to-calendar";
import { Button } from "@/components/ui/button";
import { CalendarPlusIcon, Loader2Icon } from "lucide-react";

type SyncMessage = { type: "ok" | "err"; text: string; canReconnect?: boolean };

/** Botão "Sincronizar tarefas" (Runrunit → Google Agenda) com a mensagem do resultado. */
export function SyncTasksButton() {
  const sync = useSyncTasksToCalendar();
  const [syncMsg, setSyncMsg] = useState<SyncMessage | null>(null);

  const handleSync = () => {
    setSyncMsg(null);
    sync.mutate(undefined, {
      onSuccess: (r) => {
        setSyncMsg({
          type: "ok",
          text:
            r.created > 0
              ? `${r.created} tarefa(s) adicionada(s) à agenda`
              : r.total > 0
                ? "Tarefas já sincronizadas"
                : "Nenhuma tarefa com data para sincronizar",
        });
      },
      onError: (e) => {
        const reason = e instanceof ApiError ? e.reason : undefined;
        const scopeIssue = reason === "no-write-scope" || reason === "no-calendar-scope";
        const text = reason
          ? scopeIssue
            ? "Reconecte o Google para permitir escrita na agenda"
            : reason === "not-connected" || reason === "unauthenticated"
              ? "Conecte sua conta Google primeiro"
              : "Runrunit não configurado"
          : "Falha ao sincronizar";
        setSyncMsg({ type: "err", text, canReconnect: scopeIssue });
      },
    });
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5"
        onClick={handleSync}
        disabled={sync.isPending}
        title="Verifica tarefas atribuídas a você e adiciona ao Google Agenda"
      >
        {sync.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CalendarPlusIcon className="size-4" />}
        <span className="hidden sm:inline">Sincronizar tarefas</span>
      </Button>
      {syncMsg && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-xs truncate ${syncMsg.type === "err" ? "text-destructive" : "text-muted-foreground"}`}>
            {syncMsg.text}
          </span>
          {syncMsg.canReconnect && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs shrink-0"
              onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
            >
              Reconectar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
