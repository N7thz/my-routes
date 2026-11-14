"use client";

import { Button } from "@/components/ui/button";
import { CalendarSyncIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon, SparklesIcon } from "lucide-react";

/** Nenhuma rota em lugar nenhum: o caminho automático vem primeiro. */
export function EmptyState({
  onGenerate,
  generating,
  onManage,
  onSync,
  syncing,
}: {
  onGenerate: () => void;
  generating: boolean;
  onManage: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Nenhuma rota ainda</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gere a rota de hoje com as empresas agendadas e os eventos da agenda, já na melhor ordem.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onGenerate} disabled={generating}>
          {generating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Gerar rota de hoje
        </Button>
        <Button variant="outline" onClick={onSync} disabled={syncing}>
          {syncing ? <Loader2Icon className="animate-spin" /> : <CalendarSyncIcon />}
          Buscar na agenda
        </Button>
        <Button variant="ghost" onClick={onManage}>
          Criar manualmente
        </Button>
      </div>
    </div>
  );
}

export function EmptyDay({
  dayLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onManage,
  onGenerate,
  generating = false,
}: {
  dayLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onManage: () => void;
  /** Só no dia de hoje: gera a rota automática. */
  onGenerate?: () => void;
  generating?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-xl font-bold tracking-tight">
          Nenhuma rota {dayLabel === "Sem data" ? "sem data" : `em ${dayLabel.toLowerCase()}`}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {onGenerate
            ? "Gere a rota de hoje com as empresas agendadas e a agenda, ou monte uma à mão."
            : "Veja a rota de outro dia ou monte uma para esta data."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onGenerate && (
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            Gerar rota de hoje
          </Button>
        )}
        {canPrev && (
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeftIcon /> Rota anterior
          </Button>
        )}
        {canNext && (
          <Button variant="outline" onClick={onNext}>
            Próxima rota <ChevronRightIcon />
          </Button>
        )}
        <Button variant={onGenerate ? "ghost" : "default"} onClick={onManage}>
          Gerenciar rotas
        </Button>
      </div>
    </div>
  );
}
