"use client";

import { useState } from "react";
import { BuildingIcon, EyeOffIcon, Loader2Icon, MapPinIcon, MapPinOffIcon, RotateCcwIcon } from "lucide-react";
import type { UnmatchedEvent } from "@/lib/route-sync-match";
import {
  useIgnoreEventTitle,
  useIgnoredEventTitles,
  useUnignoreEventTitle,
} from "@/hooks/use-unmatched-events";
import { CompanyFormDialog, type CompanyForm } from "@/components/companies/company-form-dialogs";
import { relativeDayLabel } from "@/components/routes/day-labels";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Quantos dias listar antes de resumir em "+N". */
const MAX_DAYS_SHOWN = 3;

function daysLabel(days: string[]): string {
  const shown = days.slice(0, MAX_DAYS_SHOWN).map(relativeDayLabel).join(" · ");
  const rest = days.length - MAX_DAYS_SHOWN;
  return rest > 0 ? `${shown} · +${rest}` : shown;
}

/** Campos da empresa nova tirados do evento: nome, local e o primeiro horário. */
function prefillFromEvent(event: UnmatchedEvent): Partial<CompanyForm> {
  const hasTime = event.firstStart.includes("T");
  return {
    name: event.label,
    address: event.location ?? "",
    date: event.days[0] ?? "",
    time: hasTime ? event.firstStart.slice(11, 16) : "",
  };
}

/**
 * Eventos da agenda que não citam nenhuma empresa cadastrada. Cada um pode
 * virar empresa (formulário já preenchido com o evento) ou ser marcado como
 * "não é visita", o que tira o evento da rota e desta lista.
 *
 * `onChanged` roda depois de cadastrar ou ignorar, para a rota refletir a mudança.
 */
export function UnmatchedEventsSheet({
  open,
  onOpenChange,
  events,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: UnmatchedEvent[];
  onChanged: () => void;
}) {
  const ignore = useIgnoreEventTitle();
  const unignore = useUnignoreEventTitle();
  const { data: ignored = [] } = useIgnoredEventTitles(open);
  const [creating, setCreating] = useState<UnmatchedEvent | null>(null);

  function handleIgnore(event: UnmatchedEvent) {
    ignore.mutate(event.label, { onSuccess: onChanged });
  }

  function handleUnignore(id: string) {
    unignore.mutate(id, { onSuccess: onChanged });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Eventos sem empresa</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Eventos dos próximos 30 dias que não citam nenhuma empresa cadastrada. Cadastre a empresa para o
              evento virar parada com o endereço dela, ou marque como "não é visita" para tirá-lo da rota.
            </p>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Todos os eventos da agenda já têm empresa.
              </p>
            ) : (
              <ul className="divide-y">
                {events.map((event) => {
                  const ignoring = ignore.isPending && ignore.variables === event.label;
                  return (
                    <li key={event.title} className="flex flex-col gap-2 px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {daysLabel(event.days)}
                          {event.count > 1 && ` · ${event.count} eventos`}
                        </p>
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                          {event.location ? (
                            <>
                              <MapPinIcon className="mt-px size-3.5 shrink-0" />
                              <span className="break-words">{event.location}</span>
                            </>
                          ) : (
                            <>
                              <MapPinOffIcon className="mt-px size-3.5 shrink-0" />
                              Sem local: fica fora da rota até ter endereço
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setCreating(event)}>
                          <BuildingIcon />
                          Cadastrar empresa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={ignoring}
                          onClick={() => handleIgnore(event)}
                        >
                          {ignoring ? <Loader2Icon className="animate-spin" /> : <EyeOffIcon />}
                          Não é visita
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {(ignore.isError || unignore.isError) && (
              <p role="alert" className="px-6 pb-4 text-sm text-destructive">
                {(ignore.error ?? unignore.error)?.message}
              </p>
            )}

            {ignored.length > 0 && (
              <section className="border-t px-6 py-4">
                <h3 className="text-sm font-medium">Marcados como "não é visita"</h3>
                <ul className="mt-2 flex flex-col gap-1">
                  {ignored.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={unignore.isPending && unignore.variables === item.id}
                        onClick={() => handleUnignore(item.id)}
                      >
                        <RotateCcwIcon />
                        Voltar a considerar
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CompanyFormDialog
        mode="create"
        open={creating !== null}
        prefill={creating ? prefillFromEvent(creating) : undefined}
        onSaved={onChanged}
        onClose={() => setCreating(null)}
      />
    </>
  );
}
