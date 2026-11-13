"use client";

import { useState } from "react";
import { Loader2Icon, MapPinIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAutoRouteSettings,
  useRunAutoRoute,
  useUpdateAutoRouteSettings,
} from "@/hooks/use-auto-route";
import type { AutoRouteSettingsInput } from "@/lib/auto-route-service";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function formatRunAt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Linhas da seção "Rota automática" na página de configurações. */
export function AutoRouteSettings() {
  const { data: settings, isLoading, isError } = useAutoRouteSettings();
  const update = useUpdateAutoRouteSettings();
  const run = useRunAutoRoute();
  const [origin, setOrigin] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (isError || !settings) {
    return <p className="p-4 text-sm text-destructive">Não foi possível carregar a rota automática.</p>;
  }

  const set = (input: AutoRouteSettingsInput) => update.mutate(input);
  const originValue = origin ?? settings.originAddress ?? "";
  const originDirty = originValue.trim() !== (settings.originAddress ?? "");
  const off = !settings.enabled;

  return (
    <>
      <Row
        title="Gerar rotas automaticamente"
        description="Todo dia às 6h, monta as rotas dos próximos dias com as empresas agendadas."
      >
        <Toggle label="Gerar rotas automaticamente" checked={settings.enabled} onChange={(v) => set({ enabled: v })} />
      </Row>

      <Row
        title="Tarefas do Runrunit"
        description={
          settings.runrunitAvailable
            ? "Cria a rota nos dias que têm tarefa do Runrunit."
            : "Runrunit não configurado no servidor."
        }
      >
        <Toggle
          label="Usar tarefas do Runrunit"
          checked={settings.useRunrunit && settings.runrunitAvailable}
          disabled={off || !settings.runrunitAvailable}
          onChange={(v) => set({ useRunrunit: v })}
        />
      </Row>

      <Row title="Eventos do Google Agenda" description="Cada evento com local vira uma parada na rota do dia.">
        <Toggle
          label="Usar eventos do Google Agenda"
          checked={settings.useCalendar}
          disabled={off}
          onChange={(v) => set({ useCalendar: v })}
        />
      </Row>

      <Row
        title="Otimizar a ordem das paradas"
        description="Reordena as paradas pelo menor tempo de carro. Só mexe nas rotas que mudaram, então a ordem que você ajustar à mão continua valendo."
      >
        <Toggle
          label="Otimizar a ordem das paradas"
          checked={settings.optimizeOrder}
          onChange={(v) => set({ optimizeOrder: v })}
        />
      </Row>

      <div className="space-y-2 p-4">
        <div>
          <div className="text-sm font-medium">Ponto de saída</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Casa ou escritório. A rota otimizada sai daqui e volta para cá no fim do dia.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(
              { originAddress: originValue.trim() || null },
              { onSuccess: () => setOrigin(null) }
            );
          }}
        >
          <div className="relative flex-1">
            <MapPinIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={originValue}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Rua, número, cidade"
              aria-label="Endereço do ponto de saída"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-10" disabled={!originDirty || update.isPending}>
            Salvar
          </Button>
        </form>
        {settings.originAddress && !settings.originGeocoded && !originDirty && (
          <p className="text-xs text-destructive">
            Não achamos esse endereço no mapa. Tente com rua, número e cidade.
          </p>
        )}
      </div>

      <Row
        title="Gerar agora"
        description={
          run.isSuccess ? (
            run.data.summary
          ) : run.isError ? (
            <span className="text-destructive">{run.error.message}</span>
          ) : settings.lastRunAt ? (
            <>
              Última vez em {formatRunAt(settings.lastRunAt)}
              {settings.lastRunSummary && <>: {settings.lastRunSummary}</>}
              {settings.lastRunOk === false && <span className="text-destructive"> (com erro)</span>}
            </>
          ) : (
            "Ainda não rodou. Rode agora para ver as rotas dos próximos dias."
          )
        }
      >
        <Button size="sm" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          {run.isPending ? "Gerando…" : "Gerar agora"}
        </Button>
      </Row>

      {update.isError && <p className="px-4 pb-4 text-xs text-destructive">{update.error.message}</p>}
    </>
  );
}
