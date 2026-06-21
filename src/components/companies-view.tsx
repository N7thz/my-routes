"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCompanies, useUpdateCompany, useDeleteCompany, useCreateCompany } from "@/hooks/use-companies";
import { useCnpjLookup, formatCnpj } from "@/hooks/use-cnpj";
import { DatePicker } from "@/components/ui/date-picker";
import { useRoutes, useCreateRoute, useAddStop, type RouteRecord } from "@/hooks/use-routes";
import { useRunrunitList } from "@/hooks/use-runrunit-list";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { RunrunitTaskSheet, type RunrunitTaskDetails } from "@/components/runrunit-task-sheet";
import type { CompanyRecord } from "@/lib/company-service";
import type { CompanyStatus } from "@/lib/company-service";
import type { RunrunitTask } from "@/lib/runrunit-service";
import type { CalendarEvent } from "@/lib/google-calendar-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  BuildingIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClockIcon,
  FolderIcon,
  ExternalLinkIcon,
  ChevronsUpDownIcon,
  ClipboardXIcon,
  HashIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  SearchCheckIcon,
  MapPinIcon,
  RouteIcon,
  CheckIcon,
} from "lucide-react";

// ─── tipos ────────────────────────────────────────────────────────────────────

type EnrichedCompany = CompanyRecord & {
  tasks: RunrunitTask[];
  events: CalendarEvent[];
  openCount: number;
  closedCount: number;
  urgentCount: number;
  overdueCount: number;
  projectNames: string[];
  nextEvent: CalendarEvent | null;
};

type SortKey = "name" | "open" | "urgent" | "overdue" | "closed" | "status" | "nextEvent";
type SortDir = "asc" | "desc";
type ViewMode = "cards" | "table";

const PER_PAGE_OPTIONS = [12, 24, 48, 96] as const;
type PerPage = (typeof PER_PAGE_OPTIONS)[number];

// ─── status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  CompanyStatus,
  { label: string; variant: "destructive" | "secondary" | "outline" | "default"; className?: string }
> = {
  PENDENTE: { label: "Pendente", variant: "destructive" },
  EM_ANDAMENTO: { label: "Em Andamento", variant: "default" },
  CONCLUIDO: { label: "Concluído", variant: "outline", className: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700" },
  REVISAO: { label: "Revisão", variant: "outline" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const OVERDUE_COLORS: Record<string, string> = {
  on_schedule: "#10b981",
  soft_overdue: "#f97316",
  hard_overdue: "#ef4444",
};

function taskBestDate(t: RunrunitTask): string | null {
  return t.close_date ?? t.desired_date ?? t.gantt_bar_start_date ?? t.estimated_delivery_date ?? null;
}

function eventStart(e: CalendarEvent): Date {
  return new Date(e.start.dateTime ?? e.start.date ?? "");
}

function formatShort(iso: string): string {
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatEstimate(seconds?: number): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function taskToDetails(task: RunrunitTask): RunrunitTaskDetails {
  return {
    id: task.id,
    title: task.title,
    source: "runrunit",
    project: task.project_name,
    client: task.client_name,
    board: task.board_name,
    stage: task.board_stage_name,
    overdue: task.overdue,
    isUrgent: task.is_urgent,
    isClosed: task.is_closed,
    responsible: task.responsible_name,
    typeName: task.type_name,
    desiredDate: task.desired_date,
    scheduledStart: task.scheduled_start_time,
    ganttEnd: task.gantt_bar_end_date,
    estimateSeconds: task.current_estimate_seconds,
    parentTitle: task.parent_task_title,
    url: `https://secure.runrun.it/tasks/${task.id}`,
  };
}

// ─── enriquecimento ───────────────────────────────────────────────────────────

function enrichCompanies(
  companies: CompanyRecord[],
  tasks: RunrunitTask[],
  events: CalendarEvent[]
): EnrichedCompany[] {
  const now = new Date();

  return companies.map((company) => {
    const nameLower = company.name.toLowerCase();

    const matched = tasks.filter(
      (t) => t.client_name?.toLowerCase() === nameLower
    );

    const matchedEvents = events.filter((e) =>
      (e.summary ?? "").toLowerCase().includes(nameLower)
    );

    const nextEvent =
      matchedEvents
        .filter((e) => eventStart(e) > now)
        .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime())[0] ?? null;

    const projects = [...new Set(matched.map((t) => t.project_name).filter(Boolean) as string[])];

    return {
      ...company,
      tasks: matched,
      events: matchedEvents,
      openCount: matched.filter((t) => !t.is_closed).length,
      closedCount: matched.filter((t) => t.is_closed).length,
      urgentCount: matched.filter((t) => t.is_urgent && !t.is_closed).length,
      overdueCount: matched.filter((t) => t.overdue === "hard_overdue" && !t.is_closed).length,
      projectNames: projects,
      nextEvent,
    };
  });
}

function sortCompanies(list: EnrichedCompany[], key: SortKey, dir: SortDir): EnrichedCompany[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "name": cmp = a.name.localeCompare(b.name, "pt-BR"); break;
      case "open": cmp = a.openCount - b.openCount; break;
      case "urgent": cmp = a.urgentCount - b.urgentCount; break;
      case "overdue": cmp = a.overdueCount - b.overdueCount; break;
      case "closed": cmp = a.closedCount - b.closedCount; break;
      case "status":
        cmp = (a.status ?? "").localeCompare(b.status ?? "", "pt-BR");
        break;
      case "nextEvent": {
        const da = a.nextEvent ? eventStart(a.nextEvent).getTime() : Infinity;
        const db = b.nextEvent ? eventStart(b.nextEvent).getTime() : Infinity;
        cmp = da - db;
        break;
      }
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── create dialog ───────────────────────────────────────────────────────────

function CreateCompanyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCompany();
  const cnpjLookup = useCnpjLookup();
  const [form, setForm] = useState<{
    name: string;
    cnpj: string;
    address: string;
    status: CompanyStatus | "";
    date: string;
    observations: string;
  }>({ name: "", cnpj: "", address: "", status: "", date: "", observations: "" });

  function resetForm() {
    setForm({ name: "", cnpj: "", address: "", status: "", date: "", observations: "" });
    cnpjLookup.reset();
  }

  async function handleCnpjLookup() {
    const result = await cnpjLookup.lookup(form.cnpj);
    if (result) {
      setForm((f) => ({
        ...f,
        name: f.name || result.razaoSocial,
        address: f.address || result.address,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      name: form.name,
      cnpj: form.cnpj || null,
      address: form.address || null,
      status: (form.status as CompanyStatus) || null,
      date: form.date || null,
      observations: form.observations || null,
    });
    resetForm();
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (!open) { resetForm(); onClose(); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-name">Nome *</Label>
            <Input
              id="cc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome da empresa"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-cnpj">CNPJ</Label>
            <div className="flex gap-2">
              <Input
                id="cc-cnpj"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Buscar na Receita Federal"
                disabled={cnpjLookup.isLoading || form.cnpj.replace(/\D/g, "").length !== 14}
                onClick={handleCnpjLookup}
              >
                <SearchCheckIcon className="size-4" />
              </Button>
            </div>
            {cnpjLookup.error && (
              <p className="text-xs text-destructive">{cnpjLookup.error}</p>
            )}
            {cnpjLookup.data && (
              <p className="text-xs text-muted-foreground">
                {cnpjLookup.data.nomeFantasia
                  ? `${cnpjLookup.data.razaoSocial} (${cnpjLookup.data.nomeFantasia})`
                  : cnpjLookup.data.razaoSocial}
                {" · "}{cnpjLookup.data.situacao}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-address">Endereço</Label>
            <Input
              id="cc-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Rua, número, bairro, cidade…"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as CompanyStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="REVISAO">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Data</Label>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm((f) => ({ ...f, date: v }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-obs">Observações</Label>
            <Textarea
              id="cc-obs"
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── edit dialog ─────────────────────────────────────────────────────────────

function EditCompanyDialog({
  company,
  onClose,
}: {
  company: EnrichedCompany | null;
  onClose: () => void;
}) {
  const update = useUpdateCompany();
  const cnpjLookup = useCnpjLookup();
  const [form, setForm] = useState<{
    name: string;
    cnpj: string;
    address: string;
    status: CompanyStatus | "";
    date: string;
    observations: string;
  }>({ name: "", cnpj: "", address: "", status: "", date: "", observations: "" });

  useMemo(() => {
    if (company) {
      cnpjLookup.reset();
      setForm({
        name: company.name,
        cnpj: company.cnpj ? formatCnpj(company.cnpj) : "",
        address: company.address ?? "",
        status: company.status ?? "",
        date: company.date ? new Date(company.date).toISOString().slice(0, 10) : "",
        observations: company.observations ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function handleCnpjLookup() {
    const result = await cnpjLookup.lookup(form.cnpj);
    if (result) {
      setForm((f) => ({
        ...f,
        name: result.razaoSocial,
        address: result.address,
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    await update.mutateAsync({
      id: company.id,
      data: {
        name: form.name,
        cnpj: form.cnpj || null,
        address: form.address || null,
        status: (form.status as CompanyStatus) || null,
        date: form.date || null,
        observations: form.observations || null,
      },
    });
    onClose();
  }

  return (
    <Dialog open={!!company} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-name">Nome</Label>
            <Input
              id="ec-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-cnpj">CNPJ</Label>
            <div className="flex gap-2">
              <Input
                id="ec-cnpj"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Buscar na Receita Federal"
                disabled={cnpjLookup.isLoading || form.cnpj.replace(/\D/g, "").length !== 14}
                onClick={handleCnpjLookup}
              >
                <SearchCheckIcon className="size-4" />
              </Button>
            </div>
            {cnpjLookup.error && (
              <p className="text-xs text-destructive">{cnpjLookup.error}</p>
            )}
            {cnpjLookup.data && (
              <p className="text-xs text-muted-foreground">
                {cnpjLookup.data.nomeFantasia
                  ? `${cnpjLookup.data.razaoSocial} (${cnpjLookup.data.nomeFantasia})`
                  : cnpjLookup.data.razaoSocial}
                {" · "}{cnpjLookup.data.situacao}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-address">Endereço</Label>
            <Input
              id="ec-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Rua, número, bairro, cidade…"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as CompanyStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="REVISAO">Revisão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Data</Label>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm((f) => ({ ...f, date: v }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-obs">Observações</Label>
            <Textarea
              id="ec-obs"
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── delete dialog ────────────────────────────────────────────────────────────

function DeleteCompanyDialog({
  company,
  onClose,
}: {
  company: EnrichedCompany | null;
  onClose: () => void;
}) {
  const del = useDeleteCompany();

  async function handleDelete() {
    if (!company) return;
    await del.mutateAsync(company.id);
    onClose();
  }

  return (
    <AlertDialog open={!!company} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{company?.name}</strong> será removida permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? "Excluindo…" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── company sheet ────────────────────────────────────────────────────────────

function CompanySheet({
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
    .filter((e) => eventStart(e) > new Date())
    .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime());

  const pastEvents = company.events
    .filter((e) => eventStart(e) <= new Date())
    .sort((a, b) => eventStart(b).getTime() - eventStart(a).getTime());

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

        {/* metadados do Notion */}
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
              <span>{formatDate(company.date)}</span>
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

        {/* projetos */}
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

        {/* tarefas */}
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
                        backgroundColor: task.is_closed
                          ? "#6b7280"
                          : task.is_urgent
                          ? "#ef4444"
                          : OVERDUE_COLORS[task.overdue ?? "on_schedule"],
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
                        {formatShort(date)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* eventos */}
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
  const start = event.start.dateTime ?? event.start.date ?? "";
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
        <span className="text-xs text-muted-foreground">{start ? formatShort(start) : ""}</span>
        <ExternalLinkIcon className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
}

// ─── add to route dialog ─────────────────────────────────────────────────────

function AddToRouteDialog({
  company,
  onClose,
}: {
  company: EnrichedCompany | null;
  onClose: () => void;
}) {
  const { data: routes = [], isLoading: routesLoading } = useRoutes();
  const createRoute = useCreateRoute();
  const addStop = useAddStop();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [newDate, setNewDate] = useState(todayIso);

  const { todayRoutes, futureRoutes, undatedRoutes } = useMemo(() => {
    const todayRoutes: RouteRecord[] = [];
    const futureRoutes: RouteRecord[] = [];
    const undatedRoutes: RouteRecord[] = [];
    for (const r of routes) {
      if (!r.date) { undatedRoutes.push(r); continue; }
      const iso = new Date(r.date).toISOString().slice(0, 10);
      if (iso === todayIso) todayRoutes.push(r);
      else if (iso > todayIso) futureRoutes.push(r);
    }
    futureRoutes.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return { todayRoutes, futureRoutes, undatedRoutes };
  }, [routes, todayIso]);

  const hasRoutes = todayRoutes.length + futureRoutes.length + undatedRoutes.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !selectedId) return;
    let routeId: string;
    if (selectedId === "new") {
      const label = newDate
        ? `Rota do dia ${new Date(newDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
        : "Rota do dia";
      const r = await createRoute.mutateAsync({ name: label, date: newDate || null });
      routeId = r.id;
    } else {
      routeId = selectedId;
    }
    await addStop.mutateAsync({
      routeId,
      data: {
        companyId: company.id,
        label: company.name,
        address: company.address ?? "",
        lat: company.lat ?? null,
        lng: company.lng ?? null,
      },
    });
    onClose();
  }

  const isPending = createRoute.isPending || addStop.isPending;

  function routeRow(route: RouteRecord) {
    const inRoute = route.stops.some((s) => s.companyId === company?.id);
    const selected = selectedId === route.id;
    const dateIso = route.date ? new Date(route.date).toISOString().slice(0, 10) : null;
    const dateLabel = dateIso === todayIso ? "Hoje" : route.date ? formatDate(route.date) : null;
    return (
      <button
        key={route.id}
        type="button"
        disabled={inRoute}
        onClick={() => setSelectedId(route.id)}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-md border transition-colors flex items-center justify-between gap-2",
          selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          inRoute && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium truncate">{route.name}</span>
          <span className="text-xs text-muted-foreground">
            {route.stops.length} parada{route.stops.length !== 1 ? "s" : ""}
            {dateLabel && ` · ${dateLabel}`}
          </span>
        </div>
        {inRoute && <CheckIcon className="size-4 text-emerald-500 shrink-0" />}
      </button>
    );
  }

  return (
    <Dialog open={!!company} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar à Rota</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 px-3 py-2.5 bg-muted/40 rounded-md">
          <div className="flex items-center gap-2">
            <BuildingIcon className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{company?.name}</span>
          </div>
          {company?.address ? (
            <div className="flex items-start gap-2">
              <MapPinIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground line-clamp-2">{company.address}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPinIcon className="size-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Sem endereço — será adicionada sem localização</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {routesLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
              {todayRoutes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hoje</p>
                  {todayRoutes.map(routeRow)}
                </div>
              )}
              {futureRoutes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Próximos dias</p>
                  {futureRoutes.map(routeRow)}
                </div>
              )}
              {undatedRoutes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sem data</p>
                  {undatedRoutes.map(routeRow)}
                </div>
              )}
              {!hasRoutes && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma rota disponível. Crie uma abaixo.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setSelectedId("new")}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-md border border-dashed transition-colors",
              selectedId === "new" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PlusIcon className="size-3.5" /> Nova rota
            </div>
          </button>

          {selectedId === "new" && (
            <div className="flex flex-col gap-1 pl-1">
              <Label className="text-xs">Data da rota</Label>
              <DatePicker
                value={newDate}
                onChange={setNewDate}
                className="h-9 text-sm"
                calendarClassName="[--cell-size:3.5rem] text-base"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedId || isPending}>
              {isPending ? "Adicionando…" : "Adicionar à rota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── quick status menu ────────────────────────────────────────────────────────

function QuickStatusMenu({ company }: { company: EnrichedCompany }) {
  const update = useUpdateCompany();
  const statusCfg = company.status ? STATUS_CONFIG[company.status] : null;

  async function handleStatusChange(status: CompanyStatus | null) {
    await update.mutateAsync({ id: company.id, data: { status } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
          className="focus:outline-none"
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
        </div>
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

// ─── card view ────────────────────────────────────────────────────────────────

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
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
          className="inline-flex items-center justify-center size-6 shrink-0 rounded-md hover:bg-accent transition-colors"
        >
          <MoreHorizontalIcon className="size-3.5" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onAddToRoute(company); }}
        >
          <RouteIcon className="size-3.5 mr-2" /> Adicionar à rota
        </DropdownMenuItem>
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

function CompanyCard({
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
  const urgencyColor =
    company.urgentCount > 0
      ? "text-red-500"
      : company.overdueCount > 0
      ? "text-orange-500"
      : "text-emerald-500";

  return (
    <button
      onClick={onClick}
      className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-card to-primary/[0.18] hover:to-primary/[0.28] transition-colors p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BuildingIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm leading-snug line-clamp-2">{company.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
              <MapPinIcon className="size-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{company.address}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className={`text-2xl font-bold tabular-nums ${urgencyColor}`}>
            {company.openCount}
          </span>
          <span className="text-xs text-muted-foreground">abertas</span>
        </div>
        {company.urgentCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums text-red-500">{company.urgentCount}</span>
            <span className="text-xs text-muted-foreground">urgentes</span>
          </div>
        )}
        {company.overdueCount > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums text-orange-500">{company.overdueCount}</span>
            <span className="text-xs text-muted-foreground">atrasadas</span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums text-muted-foreground">{company.closedCount}</span>
          <span className="text-xs text-muted-foreground">encerradas</span>
        </div>
      </div>

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

      {company.nextEvent ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2 mt-auto">
          <CalendarIcon className="size-3 shrink-0" />
          <span className="truncate">{company.nextEvent.summary}</span>
          <span className="shrink-0 ml-auto">
            {formatShort(company.nextEvent.start.dateTime ?? company.nextEvent.start.date ?? "")}
          </span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground border-t pt-2 mt-auto">
          Sem eventos agendados
        </div>
      )}
    </button>
  );
}

// ─── table view ───────────────────────────────────────────────────────────────

function SortHeader({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
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

function CompanyTable({
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
                  <div className="flex items-center gap-2">
                    <BuildingIcon className="size-3.5 text-muted-foreground shrink-0" />
                    {company.name}
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <QuickStatusMenu company={company} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                  {company.cnpj ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={
                    company.openCount > 0
                      ? company.urgentCount > 0
                        ? "text-red-500 font-semibold"
                        : company.overdueCount > 0
                        ? "text-orange-500 font-semibold"
                        : "text-emerald-500 font-semibold"
                      : "text-muted-foreground"
                  }>
                    {company.openCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {company.urgentCount > 0
                    ? <span className="text-red-500 font-semibold">{company.urgentCount}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {company.overdueCount > 0
                    ? <span className="text-orange-500 font-semibold">{company.overdueCount}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {company.closedCount}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {company.nextEvent ? (
                    <span className="text-xs">
                      <span className="text-muted-foreground mr-1">
                        {formatShort(company.nextEvent.start.dateTime ?? company.nextEvent.start.date ?? "")}
                      </span>
                      <span className="line-clamp-1">{company.nextEvent.summary}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
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

// ─── main view ────────────────────────────────────────────────────────────────

export function CompaniesView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const perPage = ((): PerPage => {
    const v = parseInt(searchParams.get("perPage") ?? "12") as PerPage;
    return (PER_PAGE_OPTIONS as readonly number[]).includes(v) ? v : 12;
  })();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<CompanyStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<EnrichedCompany | null>(null);
  const [editingCompany, setEditingCompany] = useState<EnrichedCompany | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<EnrichedCompany | null>(null);
  const [addingToRoute, setAddingToRoute] = useState<EnrichedCompany | null>(null);
  const [selectedTask, setSelectedTask] = useState<RunrunitTaskDetails | null>(null);

  const calendarRange = useMemo(() => {
    const now = Date.now();
    return {
      timeMin: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }, []);

  const { data: companiesData, isLoading: companiesLoading } = useCompanies();
  const { data: tasksData, isLoading: tasksLoading } = useRunrunitList();
  const { data: calendarData, isLoading: calendarLoading } = useGoogleCalendar(calendarRange);

  const isLoading = companiesLoading || tasksLoading || calendarLoading;

  const enriched = useMemo(() => {
    const companies = companiesData ?? [];
    const tasks = Array.isArray(tasksData) ? tasksData : [];
    const events = Array.isArray(calendarData) ? calendarData : [];
    return enrichCompanies(companies, tasks, events);
  }, [companiesData, tasksData, calendarData]);

  function toggleStatusFilter(key: CompanyStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    updateParams({ page: "1" });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? enriched.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.cnpj?.includes(q) ||
            c.projectNames.some((p) => p.toLowerCase().includes(q))
        )
      : enriched;
    if (statusFilter.size > 0) {
      list = list.filter((c) => c.status !== null && statusFilter.has(c.status));
    }
    return sortCompanies(list, sortKey, sortDir);
  }, [enriched, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <RunrunitTaskSheet task={selectedTask} onClose={() => setSelectedTask(null)} />
      <CreateCompanyDialog
        open={creatingCompany}
        onClose={() => setCreatingCompany(false)}
      />
      <EditCompanyDialog
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
      <AddToRouteDialog
        key={addingToRoute?.id}
        company={addingToRoute}
        onClose={() => setAddingToRoute(null)}
      />
      <CompanySheet
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onEdit={(c) => { setSelectedCompany(null); setEditingCompany(c); }}
        onDelete={(c) => { setDeletingCompany(c); }}
        onAddToRoute={(c) => { setSelectedCompany(null); setAddingToRoute(c); }}
        onTaskClick={(task) => {
          setSelectedCompany(null);
          setSelectedTask(taskToDetails(task));
        }}
      />

      <div className="flex flex-col gap-4">
        {/* toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar empresa, CNPJ ou projeto…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); updateParams({ page: "1" }); }}
              className="pl-8"
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {filtered.length} empresa{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" onClick={() => setCreatingCompany(true)}>
              <PlusIcon className="size-4 mr-1.5" />
              Nova Empresa
            </Button>
            <Select
              value={String(perPage)}
              onValueChange={(v) => updateParams({ perPage: v, page: "1" })}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / pág.</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("cards")}
                title="Cards"
              >
                <LayoutGridIcon className="size-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="size-8"
                onClick={() => setViewMode("table")}
                title="Tabela"
              >
                <ListIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* filtros de status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.entries(STATUS_CONFIG) as [CompanyStatus, typeof STATUS_CONFIG[CompanyStatus]][]).map(([key, cfg]) => {
            const active = statusFilter.has(key);
            return (
              <button key={key} onClick={() => toggleStatusFilter(key)}>
                <Badge
                  variant={active ? cfg.variant : "outline"}
                  className={cn("cursor-pointer transition-opacity", active && cfg.className, !active && "opacity-50 hover:opacity-80")}
                >
                  {cfg.label}
                </Badge>
              </button>
            );
          })}
          {statusFilter.size > 0 && (
            <button
              onClick={() => setStatusFilter(new Set())}
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
              {search && statusFilter.size > 0
                ? `Nenhuma empresa para "${search}" com os filtros selecionados`
                : search
                ? `Nenhuma empresa encontrada para "${search}"`
                : "Nenhuma empresa com os filtros selecionados"}
            </p>
            {statusFilter.size > 0 && (
              <button
                onClick={() => setStatusFilter(new Set())}
                className="text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
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

        {/* paginação */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={safePage <= 1}
                onClick={() => updateParams({ page: String(safePage - 1) })}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-xs tabular-nums px-1">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={safePage >= totalPages}
                onClick={() => updateParams({ page: String(safePage + 1) })}
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
