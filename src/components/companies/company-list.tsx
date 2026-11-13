"use client";

import { eventStart } from "@/lib/google-calendar-service";
import { cn } from "@/lib/utils";
import { useUpdateCompany } from "@/hooks/use-companies";
import { useCompanyGroups, type CompanyGroupRecord } from "@/hooks/use-company-groups";
import { GroupDot } from "@/components/company-groups-dialog";
import type { CompanyStatus } from "@/lib/company-service";
import { formatDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BuildingIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  HashIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  MapPinIcon,
  MapPinOffIcon,
  RouteIcon,
  CheckIcon,
  FoldersIcon,
} from "lucide-react";
import { EnrichedCompany, STATUS_CONFIG, SortDir, SortKey } from "@/components/companies/company-model";

function QuickStatusMenu({ company }: { company: EnrichedCompany }) {
  const update = useUpdateCompany();
  const statusCfg = company.status ? STATUS_CONFIG[company.status] : null;

  async function handleStatusChange(status: CompanyStatus | null) {
    await update.mutateAsync({ id: company.id, data: { status } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
          aria-label={`Status de ${company.name}: ${statusCfg?.label ?? "sem status"}`}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {statusCfg ? (
            <Badge variant={statusCfg.variant} className={cn("text-xs cursor-pointer hover:opacity-75 transition-opacity", statusCfg.className)}>
              {statusCfg.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs cursor-pointer text-muted-foreground hover:opacity-75 transition-opacity">
              Sem status
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {(Object.entries(STATUS_CONFIG) as [CompanyStatus, typeof STATUS_CONFIG[CompanyStatus]][]).map(([key, cfg]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleStatusChange(key)}
            className={cn("gap-2", company.status === key && "font-semibold")}
          >
            <Badge variant={cfg.variant} className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>
          </DropdownMenuItem>
        ))}
        {company.status && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStatusChange(null)}
              className="text-muted-foreground text-xs"
            >
              Remover status
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GroupBadge({ group, className }: { group: CompanyGroupRecord; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
      <GroupDot color={group.color} />
      <span className="truncate">{group.name}</span>
    </Badge>
  );
}

function MoveToGroupSubmenu({ company }: { company: EnrichedCompany }) {
  const { data: groups = [] } = useCompanyGroups();
  const update = useUpdateCompany();

  function move(groupId: string | null) {
    if (groupId === company.groupId) return;
    update.mutate({ id: company.id, data: { groupId } });
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
        <FoldersIcon className="size-3.5 mr-2" /> Mover para grupo
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent onClick={(e) => e.stopPropagation()}>
        {groups.length === 0 && (
          <DropdownMenuItem disabled className="text-xs">Nenhum grupo criado</DropdownMenuItem>
        )}
        {groups.map((g) => (
          <DropdownMenuItem key={g.id} onClick={() => move(g.id)} className="gap-2">
            <GroupDot color={g.color} />
            <span className="flex-1 truncate">{g.name}</span>
            {company.groupId === g.id && <CheckIcon className="size-3.5" />}
          </DropdownMenuItem>
        ))}
        {company.groupId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => move(null)} className="text-muted-foreground text-xs">
              Remover do grupo
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function CompanyActionsMenu({
  company,
  onEdit,
  onDelete,
  onAddToRoute,
}: {
  company: EnrichedCompany;
  onEdit: (c: EnrichedCompany) => void;
  onDelete: (c: EnrichedCompany) => void;
  onAddToRoute: (c: EnrichedCompany) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
          aria-label={`Ações de ${company.name}`}
          className="inline-flex items-center justify-center size-6 shrink-0 rounded-md hover:bg-accent transition-colors"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onAddToRoute(company); }}
        >
          <RouteIcon className="size-3.5 mr-2" /> Adicionar à rota
        </DropdownMenuItem>
        <MoveToGroupSubmenu company={company} />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onEdit(company); }}
        >
          <PencilIcon className="size-3.5 mr-2" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onDelete(company); }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2Icon className="size-3.5 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CompanyCard({
  company,
  onClick,
  onEdit,
  onDelete,
  onAddToRoute,
}: {
  company: EnrichedCompany;
  onClick: () => void;
  onEdit: (c: EnrichedCompany) => void;
  onDelete: (c: EnrichedCompany) => void;
  onAddToRoute: (c: EnrichedCompany) => void;
}) {
  return (
    // Card clicável com menus dentro: um botão transparente cobre o card (abre a
    // empresa) e os menus ficam por cima — sem botão dentro de botão.
    <div className="relative w-full h-full text-left rounded-lg border bg-gradient-to-br from-card to-primary/[0.18] hover:to-primary/[0.28] focus-within:to-primary/[0.28] transition-colors p-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Abrir ${company.name}`}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BuildingIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm leading-snug line-clamp-2">{company.name}</span>
        </div>
        <div className="relative z-10 flex items-center gap-1 shrink-0">
          <QuickStatusMenu company={company} />
          <CompanyActionsMenu company={company} onEdit={onEdit} onDelete={onDelete} onAddToRoute={onAddToRoute} />
        </div>
      </div>

      {(company.cnpj || company.address) && (
        <div className="flex flex-col gap-1">
          {company.cnpj && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <HashIcon className="size-3 shrink-0" /> {company.cnpj}
            </p>
          )}
          {company.address && (
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              {company.geocodeFailedAt ? (
                <MapPinOffIcon
                  className="size-3 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
                  aria-label="Endereço não encontrado no mapa"
                />
              ) : (
                <MapPinIcon className="size-3 shrink-0 mt-0.5" />
              )}
              <span className="line-clamp-2">{company.address}</span>
            </p>
          )}
        </div>
      )}

      {company.group && (
        <div className="flex">
          <GroupBadge group={company.group} className="text-xs max-w-full" />
        </div>
      )}

      {company.projectNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {company.projectNames.slice(0, 3).map((p) => (
            <Badge key={p} variant="outline" className="text-xs font-normal truncate max-w-[140px]">{p}</Badge>
          ))}
          {company.projectNames.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">+{company.projectNames.length - 3}</Badge>
          )}
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        dir === "asc" ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />
      ) : (
        <ChevronsUpDownIcon className="size-3 opacity-40" />
      )}
    </button>
  );
}

export function CompanyTable({
  companies, onCompanyClick, onEdit, onDelete, onAddToRoute, sortKey, sortDir, onSort,
}: {
  companies: EnrichedCompany[];
  onCompanyClick: (c: EnrichedCompany) => void;
  onEdit: (c: EnrichedCompany) => void;
  onDelete: (c: EnrichedCompany) => void;
  onAddToRoute: (c: EnrichedCompany) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left px-4 py-2.5">
              <SortHeader label="Empresa" sortKey="name" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-left px-4 py-2.5">
              <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-left px-4 py-2.5 hidden lg:table-cell">
              <SortHeader label="Grupo" sortKey="group" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-left px-4 py-2.5 hidden sm:table-cell">
              <span className="text-xs font-medium text-muted-foreground">CNPJ</span>
            </th>
            <th className="text-right px-4 py-2.5">
              <SortHeader label="Abertas" sortKey="open" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-right px-4 py-2.5">
              <SortHeader label="Urgentes" sortKey="urgent" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-right px-4 py-2.5">
              <SortHeader label="Atrasadas" sortKey="overdue" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-right px-4 py-2.5">
              <SortHeader label="Encerradas" sortKey="closed" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="text-left px-4 py-2.5 hidden md:table-cell">
              <SortHeader label="Próx. evento" sortKey="nextEvent" current={sortKey} dir={sortDir} onSort={onSort} />
            </th>
            <th className="px-4 py-2.5 w-8" />
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            return (
              <tr
                key={company.id}
                onClick={() => onCompanyClick(company)}
                className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium">
                  {/* A linha inteira abre no clique; o botão no nome é o caminho pelo teclado. */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompanyClick(company);
                    }}
                    className="flex items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <BuildingIcon className="size-3.5 text-muted-foreground shrink-0" />
                    {company.name}
                  </button>
                </td>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: só barra o clique de chegar na linha; a interação é do menu dentro. */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <QuickStatusMenu company={company} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {company.group
                    ? <GroupBadge group={company.group} className="text-xs max-w-[160px]" />
                    : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  {company.cnpj ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={
                    company.openCount > 0
                      ? company.urgentCount > 0
                        ? "text-red-600 dark:text-red-500 font-semibold"
                        : company.overdueCount > 0
                        ? "text-orange-700 dark:text-orange-500 font-semibold"
                        : "text-emerald-700 dark:text-emerald-500 font-semibold"
                      : "text-muted-foreground"
                  }>
                    {company.openCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {company.urgentCount > 0
                    ? <span className="text-red-600 dark:text-red-500 font-semibold">{company.urgentCount}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {company.overdueCount > 0
                    ? <span className="text-orange-700 dark:text-orange-500 font-semibold">{company.overdueCount}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {company.closedCount}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {company.nextEvent ? (
                    <span className="text-xs">
                      <span className="text-muted-foreground mr-1">
                        {formatDate(eventStart(company.nextEvent), { year: false })}
                      </span>
                      <span className="line-clamp-1">{company.nextEvent.summary}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: só barra o clique de chegar na linha; a interação é do menu dentro. */}
                <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                  <CompanyActionsMenu company={company} onEdit={onEdit} onDelete={onDelete} onAddToRoute={onAddToRoute} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
