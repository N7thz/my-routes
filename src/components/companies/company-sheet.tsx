"use client";

import { taskColor, formatEstimate, taskBestDate, type RunrunitTask } from "@/lib/runrunit";
import { formatDate } from "@/lib/dates";
import { eventStart, type CalendarEvent } from "@/lib/google-calendar-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  FolderIcon,
  ExternalLinkIcon,
  HashIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
  RouteIcon,
} from "lucide-react";
import { EnrichedCompany, STATUS_CONFIG, eventStartDate, formatDateTime } from "@/components/companies/company-model";
import { GroupBadge } from "@/components/companies/company-list";

export function CompanySheet({
  company,
  onClose,
  onTaskClick,
  onEdit,
  onDelete,
  onAddToRoute,
}: {
  company: EnrichedCompany | null;
  onClose: () => void;
  onTaskClick: (task: RunrunitTask) => void;
  onEdit: (c: EnrichedCompany) => void;
  onDelete: (c: EnrichedCompany) => void;
  onAddToRoute: (c: EnrichedCompany) => void;
}) {
  if (!company) return null;

  const sortedTasks = [...company.tasks].sort((a, b) => {
    const da = taskBestDate(a);
    const db = taskBestDate(b);
    if (da && db) return new Date(db).getTime() - new Date(da).getTime();
    if (da) return -1;
    if (db) return 1;
    return b.id - a.id;
  });

  const upcomingEvents = company.events
    .filter((e) => eventStartDate(e) > new Date())
    .sort((a, b) => eventStartDate(a).getTime() - eventStartDate(b).getTime());

  const pastEvents = company.events
    .filter((e) => eventStartDate(e) <= new Date())
    .sort((a, b) => eventStartDate(b).getTime() - eventStartDate(a).getTime());

  const statusCfg = company.status ? STATUS_CONFIG[company.status] : null;

  return (
    <Sheet open={!!company} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BuildingIcon className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Empresa</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onAddToRoute(company)}
                title="Adicionar à rota"
              >
                <RouteIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onEdit(company)}
                title="Editar"
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(company)}
                title="Excluir"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          </div>
          <SheetTitle className="text-lg">{company.name}</SheetTitle>
          <div className="flex flex-wrap gap-2 mt-1">
            {company.group && <GroupBadge group={company.group} />}
            {statusCfg && <Badge variant={statusCfg.variant} className={statusCfg.className}>{statusCfg.label}</Badge>}
            <Badge variant="outline">{company.openCount} abertas</Badge>
            {company.urgentCount > 0 && (
              <Badge variant="destructive">{company.urgentCount} urgentes</Badge>
            )}
            {company.overdueCount > 0 && (
              <Badge variant="secondary">{company.overdueCount} atrasadas</Badge>
            )}
            <Badge variant="secondary">{company.closedCount} encerradas</Badge>
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-3 flex flex-col gap-2 px-1">
          {company.cnpj && (
            <div className="flex items-center gap-2 text-sm">
              <HashIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">CNPJ:</span>
              <span>{company.cnpj}</span>
            </div>
          )}
          {company.date && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Data:</span>
              <span>{formatDateTime(company.date)}</span>
            </div>
          )}
          {company.observations && (
            <div className="flex items-start gap-2 text-sm">
              <FileTextIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground shrink-0">Obs:</span>
              <span className="text-sm">{company.observations}</span>
            </div>
          )}
        </div>

        {company.projectNames.length > 0 && (
          <>
            <Separator />
            <div className="py-3 px-1">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <FolderIcon className="size-3" /> Projetos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {company.projectNames.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="py-3">
          <p className="text-xs font-medium mb-3 px-1">
            Tarefas Runrunit ({sortedTasks.length})
          </p>
          {sortedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">Nenhuma tarefa vinculada.</p>
          ) : (
            <div className="flex flex-col">
              {sortedTasks.map((task) => {
                const date = taskBestDate(task);
                const estimate = formatEstimate(task.current_estimate_seconds);
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="w-full text-left flex gap-3 items-start px-1 py-2.5 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <div
                      className="mt-1.5 size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: taskColor(task),
                      }}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm leading-snug line-clamp-2">{task.title}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {task.project_name && <span>{task.project_name}</span>}
                        {estimate && (
                          <span className="flex items-center gap-0.5">
                            <ClockIcon className="size-3" />{estimate}
                          </span>
                        )}
                      </div>
                    </div>
                    {date && (
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        {formatDate(date, { year: false })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {company.events.length > 0 && (
          <>
            <Separator />
            <div className="py-3">
              <p className="text-xs font-medium mb-3 flex items-center gap-1.5 px-1">
                <CalendarIcon className="size-3.5" />
                Eventos no Agenda ({company.events.length})
              </p>
              {upcomingEvents.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2 px-1">Próximos</p>
                  {upcomingEvents.map((e) => <EventRow key={e.id} event={e} />)}
                </div>
              )}
              {pastEvents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 px-1">Passados</p>
                  {pastEvents.map((e) => <EventRow key={e.id} event={e} />)}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const start = eventStart(event);
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-1 py-2 hover:bg-muted/50 rounded-md transition-colors group"
    >
      <div className="size-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-sm line-clamp-1 group-hover:underline">{event.summary}</span>
        {event.location && (
          <span className="text-xs text-muted-foreground line-clamp-1">{event.location}</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">{start ? formatDate(start, { year: false }) : ""}</span>
        <ExternalLinkIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}
