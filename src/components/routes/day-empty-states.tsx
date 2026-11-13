"use client";

import { Button } from "@/components/ui/button";
import {
  CalendarDaysIcon,
  CalendarSyncIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  RouteIcon,
} from "lucide-react";

export function EmptyState({
  onManage,
  onSync,
  syncing,
}: {
  onManage: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <RouteIcon className="size-8 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold">Nenhuma rota criada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere as rotas a partir dos eventos da sua agenda ou crie a primeira manualmente.
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onSync} disabled={syncing}>
          {syncing ? (
            <Loader2Icon className="mr-1 size-4 animate-spin" />
          ) : (
            <CalendarSyncIcon className="mr-1 size-4" />
          )}
          Buscar na agenda
        </Button>
        <Button variant="outline" onClick={onManage}>
          Criar rota manualmente
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
}: {
  dayLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onManage: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <CalendarDaysIcon className="size-8 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold">Nenhuma rota em {dayLabel.toLowerCase()}</p>
        <p className="mt-1 text-sm text-muted-foreground">Veja uma rota de outro dia ou crie uma para esta data.</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {canPrev && (
          <Button variant="outline" onClick={onPrev}>
            <ChevronLeftIcon className="mr-1 size-4" /> Ver rota anterior
          </Button>
        )}
        {canNext && (
          <Button variant="outline" onClick={onNext}>
            Ver próxima rota <ChevronRightIcon className="ml-1 size-4" />
          </Button>
        )}
        <Button onClick={onManage}>Gerenciar rotas</Button>
      </div>
    </div>
  );
}
