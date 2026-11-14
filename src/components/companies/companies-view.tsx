"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
  parseAsNumberLiteral,
  parseAsArrayOf,
  parseAsBoolean,
  debounce,
  createSerializer,
} from "nuqs";
import { cn } from "@/lib/utils";
import { useCompanies, useMoveCompanyToGroup } from "@/hooks/use-companies";
import { useRememberedFilters } from "@/hooks/use-remembered-filters";
import { type FilterPreset, SavedFiltersMenu } from "@/components/saved-filters-menu";
import { type CompanyGroupRecord, useCompanyGroups, useCreateGroupWith } from "@/hooks/use-company-groups";
import { CompanyGroupsDialog, GROUP_COLORS, GroupDot } from "@/components/company-groups-dialog";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import type { CompanyStatus } from "@/lib/company-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  ChevronDownIcon,
  ClipboardXIcon,
  PlusIcon,
  FoldersIcon,
  LayersIcon,
} from "lucide-react";
import {
  EnrichedCompany,
  NO_GROUP,
  PERIOD_KEYS,
  PERIOD_LABELS,
  PER_PAGE_OPTIONS,
  PerPage,
  type PeriodKey,
  SORT_DIRS,
  SORT_KEYS,
  STATUS_CONFIG,
  STATUS_KEYS,
  SortKey,
  VIEW_MODES,
  enrichCompanies,
  matchesPeriod,
  sortCompanies,
} from "@/components/companies/company-model";
import { CompanyFormDialog, DeleteCompanyDialog } from "@/components/companies/company-form-dialogs";
import { CompanySheet } from "@/components/companies/company-sheet";
import { AddToRouteDialog } from "@/components/companies/add-to-route-dialog";
import { CompanyCard, CompanyTable } from "@/components/companies/company-list";
import { CompanyTransferRoot, TransferCard, TransferGroup } from "@/components/companies/company-transfer";

const subscribeNoop = () => () => {};

/** Preferências lembradas entre visitas (busca e página ficam de fora). */
const PREF_PARSERS = {
  view: parseAsStringLiteral(VIEW_MODES).withDefault("cards"),
  status: parseAsArrayOf(parseAsStringLiteral(STATUS_KEYS)).withDefault([]),
  sort: parseAsStringLiteral(SORT_KEYS).withDefault("name"),
  dir: parseAsStringLiteral(SORT_DIRS).withDefault("asc"),
  perPage: parseAsNumberLiteral(PER_PAGE_OPTIONS).withDefault(12),
  groups: parseAsArrayOf(parseAsString).withDefault([]),
  periodo: parseAsStringLiteral(PERIOD_KEYS),
  groupBy: parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
};

/** O que entra num filtro salvo com nome: o que filtra e ordena, não o layout. */
const SAVED_FILTER_PARSERS = {
  q: parseAsString.withDefault(""),
  status: PREF_PARSERS.status,
  groups: PREF_PARSERS.groups,
  periodo: PREF_PARSERS.periodo,
  sort: PREF_PARSERS.sort,
  dir: PREF_PARSERS.dir,
};

const serializeSavedFilter = createSerializer(SAVED_FILTER_PARSERS);

function preset(id: string, name: string, values: { status?: CompanyStatus[]; periodo?: PeriodKey }): FilterPreset {
  return { id, name, query: serializeSavedFilter(values) };
}

/** Atalhos fixos do menu de filtros (combinações de status e período). */
const FILTER_PRESETS: FilterPreset[] = [
  preset("pendentes", "Pendentes", { status: ["PENDENTE"] }),
  preset("andamento", "Em andamento", { status: ["EM_ANDAMENTO"] }),
  preset("revisao", "Para revisar", { status: ["REVISAO"] }),
  preset("hoje", "Agendadas para hoje", { periodo: "hoje" }),
  preset("semana", "Agendadas esta semana", { periodo: "semana" }),
  preset("feitas-semana", "Feitas esta semana", { status: ["CONCLUIDO"], periodo: "semana" }),
  preset("feitas-mes", "Feitas este mês", { status: ["CONCLUIDO"], periodo: "mes" }),
  preset("atrasadas", "Atrasadas (não concluídas)", {
    status: ["PENDENTE", "EM_ANDAMENTO", "REVISAO"],
    periodo: "atrasadas",
  }),
];
const DAY_MS = 24 * 60 * 60 * 1000;

export function CompaniesView() {
  // Todos os filtros vivem na URL (nuqs). O estado retornado atualiza na hora;
  // só a escrita na URL da busca é adiada via debounce para não poluir o histórico.
  useRememberedFilters("empresas", PREF_PARSERS);
  const [viewMode, setViewMode] = useQueryState("view", PREF_PARSERS.view);
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({
      limitUrlUpdates: debounce(300),
      clearOnDefault: true,
    }),
  );
  const [statusFilter, setStatusFilter] = useQueryState("status", PREF_PARSERS.status);
  const [sortKey, setSortKey] = useQueryState("sort", PREF_PARSERS.sort);
  const [sortDir, setSortDir] = useQueryState("dir", PREF_PARSERS.dir);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", PREF_PARSERS.perPage);
  const [groupFilter, setGroupFilter] = useQueryState("groups", PREF_PARSERS.groups);
  const [groupBy, setGroupBy] = useQueryState("groupBy", PREF_PARSERS.groupBy);
  const [periodFilter, setPeriodFilter] = useQueryState("periodo", PREF_PARSERS.periodo);
  const [managingGroups, setManagingGroups] = useState(false);
  const [newGroup, setNewGroup] = useState<CompanyGroupRecord | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<EnrichedCompany | null>(null);
  const [editingCompany, setEditingCompany] = useState<EnrichedCompany | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<EnrichedCompany | null>(null);
  const [addingToRoute, setAddingToRoute] = useState<EnrichedCompany | null>(null);

  // Janela fixada na montagem: se mudasse a cada render, a chave da query mudaria junto.
  const [calendarRange] = useState(() => {
    const now = Date.now();
    return {
      timeMin: new Date(now - 30 * DAY_MS).toISOString(),
      timeMax: new Date(now + 60 * DAY_MS).toISOString(),
    };
  });

  const { data: companiesData, isLoading: companiesLoading } = useCompanies();
  const { data: calendarData, isLoading: calendarLoading } = useGoogleCalendar(calendarRange);
  const { data: groupsData, isLoading: groupsLoading } = useCompanyGroups();
  const groups = groupsData ?? [];

  // O servidor nunca tem dados, mas o client pode já ter restaurado o cache do
  // localStorage quando o <Suspense> hidrata. Mantém o skeleton até hidratar
  // para o primeiro render do client bater com o HTML do servidor.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const isLoading = !hydrated || companiesLoading || calendarLoading || groupsLoading;

  const enriched = useMemo(() => {
    const companies = companiesData ?? [];
    const events = Array.isArray(calendarData) ? calendarData : [];
    return enrichCompanies(companies, events, groupsData ?? []);
  }, [companiesData, calendarData, groupsData]);

  function toggleStatusFilter(key: CompanyStatus) {
    setStatusFilter((prev) => {
      const arr = prev ?? [];
      const next = arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
      return next.length > 0 ? next : null;
    });
    setPage(1);
  }

  function toggleGroupFilter(key: string) {
    setGroupFilter((prev) => {
      const arr = prev ?? [];
      const next = arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
      return next.length > 0 ? next : null;
    });
    setPage(1);
  }

  function toggleCollapsed(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePeriodFilter(key: PeriodKey) {
    setPeriodFilter((prev) => (prev === key ? null : key));
    setPage(1);
  }

  function clearFilters() {
    setStatusFilter(null);
    setGroupFilter(null);
    setPeriodFilter(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? enriched.filter(
          (c) => c.name.toLowerCase().includes(q) || c.cnpj?.includes(q) || c.group?.name.toLowerCase().includes(q),
        )
      : enriched;
    if (statusFilter.length > 0) {
      list = list.filter((c) => c.status !== null && statusFilter.includes(c.status));
    }
    if (groupFilter.length > 0) {
      list = list.filter((c) => groupFilter.includes(c.groupId ?? NO_GROUP));
    }
    if (periodFilter) {
      list = list.filter((c) => matchesPeriod(c.date, periodFilter));
    }
    return sortCompanies(list, sortKey, sortDir);
  }, [enriched, search, statusFilter, groupFilter, periodFilter, sortKey, sortDir]);

  // Agrupado: mostra todas as empresas filtradas em seções (sem paginação),
  // na ordem alfabética dos grupos e com "Sem grupo" por último.
  const sections = groupBy
    ? [
        ...groups.map((g) => ({
          key: g.id,
          label: g.name,
          color: g.color,
          items: filtered.filter((c) => c.groupId === g.id),
        })),
        {
          key: NO_GROUP,
          label: "Sem grupo",
          color: null,
          items: filtered.filter((c) => !c.group),
        },
        // Grupos vazios continuam na tela (para receber cartões arrastados),
        // menos quando a busca ou o filtro de status escondem empresas.
      ].filter(
        (s) => s.items.length > 0 || (!search && statusFilter.length === 0 && !periodFilter && s.key !== NO_GROUP),
      )
    : [];

  const moveToGroup = useMoveCompanyToGroup();
  const createGroupWith = useCreateGroupWith();
  const canDrag = groupBy && viewMode === "cards";

  /** Soltar um cartão sem grupo em cima de outro sem grupo cria um grupo com os dois e abre a edição dele. */
  async function combineIntoNewGroup(companyId: string, targetId: string) {
    const names = new Set(groups.map((g) => g.name.toLowerCase()));
    let name = "Novo grupo";
    for (let n = 2; names.has(name.toLowerCase()); n++) name = `Novo grupo ${n}`;
    const used = new Set(groups.map((g) => g.color));
    const color = GROUP_COLORS.find((c) => !used.has(c)) ?? GROUP_COLORS[groups.length % GROUP_COLORS.length];
    const group = await createGroupWith.mutateAsync({ name, color, companyIds: [targetId, companyId] });
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.delete(group.id);
      return next;
    });
    setNewGroup(group);
    setManagingGroups(true);
  }
  const companiesById = new Map(filtered.map((c) => [c.id, c]));
  const transferLists = Object.fromEntries(sections.map((s) => [s.key, s.items.map((c) => c.id)]));

  const hasFilters = statusFilter.length > 0 || groupFilter.length > 0 || !!periodFilter;

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
            <Skeleton key={key} className="h-52 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <CompanyGroupsDialog
        open={managingGroups}
        onClose={() => {
          setManagingGroups(false);
          setNewGroup(null);
        }}
        companies={companiesData ?? []}
        initialEditing={newGroup}
      />
      <CompanyFormDialog mode="create" open={creatingCompany} onClose={() => setCreatingCompany(false)} />
      <CompanyFormDialog
        mode="edit"
        open={!!editingCompany}
        company={editingCompany}
        onClose={() => setEditingCompany(null)}
      />
      <DeleteCompanyDialog
        company={deletingCompany}
        onClose={() => {
          setDeletingCompany(null);
          setSelectedCompany(null);
        }}
      />
      <AddToRouteDialog key={addingToRoute?.id} company={addingToRoute} onClose={() => setAddingToRoute(null)} />
      <CompanySheet
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onEdit={(c) => {
          setSelectedCompany(null);
          setEditingCompany(c);
        }}
        onDelete={(c) => {
          setDeletingCompany(c);
        }}
        onAddToRoute={(c) => {
          setSelectedCompany(null);
          setAddingToRoute(c);
        }}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar empresa, CNPJ ou projeto…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {filtered.length} empresa{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <SavedFiltersMenu
              screen="empresas"
              parsers={SAVED_FILTER_PARSERS}
              presets={FILTER_PRESETS}
              onApply={() => setPage(1)}
            />
            <Button size="sm" variant="outline" onClick={() => setManagingGroups(true)}>
              <FoldersIcon className="size-4 mr-1.5" />
              Grupos
            </Button>
            <Button size="sm" onClick={() => setCreatingCompany(true)}>
              <PlusIcon className="size-4 mr-1.5" />
              Nova Empresa
            </Button>
            <Button
              variant={groupBy ? "secondary" : "ghost"}
              size="icon"
              className="size-8 pointer-coarse:size-10"
              onClick={() => setGroupBy(groupBy ? null : true)}
              title={groupBy ? "Desagrupar" : "Agrupar por grupo"}
            >
              <LayersIcon className="size-4" />
            </Button>
            <Select
              value={String(perPage)}
              disabled={groupBy}
              onValueChange={(v) => {
                setPerPage(Number(v) as PerPage);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Empresas por página" className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / pág.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="icon"
                className="size-8 pointer-coarse:size-10"
                onClick={() => setViewMode("cards")}
                title="Cards"
              >
                <LayoutGridIcon className="size-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="size-8 pointer-coarse:size-10"
                onClick={() => setViewMode("table")}
                title="Tabela"
              >
                <ListIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.entries(STATUS_CONFIG) as [CompanyStatus, (typeof STATUS_CONFIG)[CompanyStatus]][]).map(
            ([key, cfg]) => {
              const active = statusFilter.includes(key);
              return (
                <button type="button" key={key} onClick={() => toggleStatusFilter(key)}>
                  <Badge
                    variant={active ? cfg.variant : "outline"}
                    className={cn(
                      "cursor-pointer transition-opacity",
                      active && cfg.className,
                      !active && "opacity-50 hover:opacity-80",
                    )}
                  >
                    {cfg.label}
                  </Badge>
                </button>
              );
            },
          )}
          <Separator orientation="vertical" className="h-4 mx-1" />
          {PERIOD_KEYS.map((key) => {
            const active = periodFilter === key;
            return (
              <button type="button" key={key} onClick={() => togglePeriodFilter(key)} aria-pressed={active}>
                <Badge
                  variant={active ? "secondary" : "outline"}
                  className={cn("cursor-pointer transition-opacity", !active && "opacity-50 hover:opacity-80")}
                >
                  {PERIOD_LABELS[key]}
                </Badge>
              </button>
            );
          })}
          {groups.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4 mx-1" />
              {[...groups, { id: NO_GROUP, name: "Sem grupo", color: null }].map((g) => {
                const active = groupFilter.includes(g.id);
                return (
                  <button type="button" key={g.id} onClick={() => toggleGroupFilter(g.id)}>
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className={cn(
                        "cursor-pointer gap-1.5 transition-opacity",
                        !active && "opacity-50 hover:opacity-80",
                      )}
                    >
                      {g.id !== NO_GROUP && <GroupDot color={g.color} />}
                      {g.name}
                    </Badge>
                  </button>
                );
              })}
            </>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <ClipboardXIcon className="size-10" />
            <p className="text-sm">Nenhuma empresa cadastrada.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <ClipboardXIcon className="size-8" />
            <p className="text-sm">
              {search && hasFilters
                ? `Nenhuma empresa para "${search}" com os filtros selecionados`
                : search
                  ? `Nenhuma empresa encontrada para "${search}"`
                  : "Nenhuma empresa com os filtros selecionados"}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : groupBy ? (
          <CompanyTransferRoot
            lists={transferLists}
            companyLabel={(id) => filtered.find((c) => c.id === id)?.name}
            groupLabel={(id) => sections.find((s) => s.key === id)?.label}
            onMove={(id, groupId) => moveToGroup.mutate({ id, groupId })}
            canCombine={(id, targetId) =>
              companiesById.get(id)?.groupId == null && companiesById.get(targetId)?.groupId == null
            }
            onCombine={(id, targetId) => {
              combineIntoNewGroup(id, targetId).catch(() => {});
            }}
            className="flex flex-col gap-6"
          >
            {({ lists }) => (
              <>
                {canDrag && (
                  <p className="-mb-2 text-xs text-muted-foreground">
                    Arraste a alça do cartão para outro grupo para mudar o grupo da empresa. Solte uma empresa sem grupo
                    em cima de outra sem grupo para criar um grupo com as duas. Pelo teclado: foque a alça, espaço para
                    pegar, setas para mover e espaço para soltar.
                  </p>
                )}
                {moveToGroup.isError && <p className="-mb-2 text-xs text-destructive">{moveToGroup.error.message}</p>}
                {createGroupWith.isError && (
                  <p className="-mb-2 text-xs text-destructive">{createGroupWith.error.message}</p>
                )}
                {sections.map((section) => {
                  const collapsed = collapsedGroups.has(section.key);
                  return (
                    <TransferGroup key={section.key} value={section.key} className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(section.key)}
                        className="flex items-center gap-2 text-left group w-fit"
                      >
                        {collapsed ? (
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDownIcon className="size-4 text-muted-foreground" />
                        )}
                        {section.key === NO_GROUP ? (
                          <span className="size-2.5 rounded-full border border-dashed border-muted-foreground shrink-0" />
                        ) : (
                          <GroupDot color={section.color} className="size-2.5" />
                        )}
                        <span className="text-sm font-semibold group-hover:underline">{section.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{section.items.length}</span>
                      </button>
                      {!collapsed &&
                        (viewMode === "cards" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {(lists[section.key] ?? section.items.map((c) => c.id))
                              .map((id) => companiesById.get(id))
                              .filter((c) => c !== undefined)
                              .map((company) => (
                                <TransferCard key={company.id} value={company.id} label={company.name}>
                                  <CompanyCard
                                    company={company}
                                    onClick={() => setSelectedCompany(company)}
                                    onEdit={setEditingCompany}
                                    onDelete={setDeletingCompany}
                                    onAddToRoute={setAddingToRoute}
                                  />
                                </TransferCard>
                              ))}
                            {(lists[section.key]?.length ?? section.items.length) === 0 && (
                              <div className="col-span-full rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                                Nenhuma empresa. Arraste um cartão para cá.
                              </div>
                            )}
                          </div>
                        ) : (
                          <Card className="overflow-hidden">
                            <CompanyTable
                              companies={section.items}
                              onCompanyClick={setSelectedCompany}
                              onEdit={setEditingCompany}
                              onDelete={setDeletingCompany}
                              onAddToRoute={setAddingToRoute}
                              sortKey={sortKey}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                          </Card>
                        ))}
                    </TransferGroup>
                  );
                })}
              </>
            )}
          </CompanyTransferRoot>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => setSelectedCompany(company)}
                onEdit={setEditingCompany}
                onDelete={setDeletingCompany}
                onAddToRoute={setAddingToRoute}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CompanyTable
              companies={paginated}
              onCompanyClick={setSelectedCompany}
              onEdit={setEditingCompany}
              onDelete={setDeletingCompany}
              onAddToRoute={setAddingToRoute}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </Card>
        )}

        {filtered.length > 0 && !groupBy && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 pointer-coarse:size-10"
                aria-label="Página anterior"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-xs tabular-nums px-1">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 pointer-coarse:size-10"
                aria-label="Próxima página"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
