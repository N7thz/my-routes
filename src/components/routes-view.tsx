"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { dayKey, formatDate, todayKey } from "@/lib/dates";
import {
  useRoutes,
  useCreateRoute,
  useGenerateRoute,
  useUpdateRoute,
  useDeleteRoute,
  useAddStop,
  useRemoveStop,
  useMarkStopVisited,
  useReorderStops,
} from "@/hooks/use-routes";
import { useCompanies } from "@/hooks/use-companies";
import type { RouteRecord, StopRecord } from "@/lib/route-service";
import type { RouteStatus } from "@/lib/route-service";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  RouteIcon,
  PlusIcon,
  MapPinIcon,
  CheckCircle2Icon,
  CircleIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  CalendarIcon,
  CalendarPlusIcon,
  BuildingIcon,
  NavigationIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";

const STATUS_CONFIG: Record<
  RouteStatus,
  { label: string; variant: "secondary" | "default" | "outline"; className?: string }
> = {
  RASCUNHO:    { label: "Rascunho",     variant: "secondary" },
  EM_ANDAMENTO:{ label: "Em Andamento", variant: "default" },
  CONCLUIDA:   { label: "Concluída",    variant: "outline", className: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700" },
};

function QuickRouteStatus({ route }: { route: RouteRecord }) {
  const update = useUpdateRoute();
  const cfg = STATUS_CONFIG[route.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none" onClick={(e) => e.stopPropagation()}>
          <Badge variant={cfg.variant} className={cn("text-xs cursor-pointer hover:opacity-75 transition-opacity", cfg.className)}>
            {cfg.label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {(Object.entries(STATUS_CONFIG) as [RouteStatus, typeof STATUS_CONFIG[RouteStatus]][]).map(([key, c]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => update.mutate({ id: route.id, data: { status: key } })}
            className={cn("gap-2", route.status === key && "font-semibold")}
          >
            <Badge variant={c.variant} className={cn("text-xs", c.className)}>{c.label}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateRouteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRoute();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  function reset() { setName(""); setDate(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({ name, date: date || null });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nova Rota</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cr-name">Nome *</Label>
            <Input id="cr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Visitas terça-feira" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Criando…" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GenerateRouteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: companies = [] } = useCompanies();
  const { data: routes = [] } = useRoutes();
  const generate = useGenerateRoute();
  const [date, setDate] = useState(() => todayKey());
  const [error, setError] = useState<string | null>(null);

  const ofDay = useMemo(
    () =>
      companies
        .filter((c) => dayKey(c.date) === date)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [companies, date]
  );
  const existing = useMemo(
    () => routes.filter((r) => dayKey(r.date) === date).length,
    [routes, date]
  );

  async function handleGenerate() {
    if (!ofDay.length) return;
    setError(null);
    try {
      await generate.mutateAsync(date);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar rota");
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Gerar rota do dia</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <DatePicker value={date} onChange={(v) => { setDate(v); setError(null); }} />
          </div>

          {existing > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Já existe {existing} rota{existing > 1 ? "s" : ""} nesta data — uma nova será criada.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              {ofDay.length} empresa{ofDay.length !== 1 ? "s" : ""} nesta data
            </span>
            {ofDay.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma empresa cadastrada nesta data.
              </p>
            ) : (
              <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-md border p-2">
                {ofDay.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 px-1 py-1 text-sm">
                    <BuildingIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      {c.address ? (
                        <p className="truncate text-xs text-muted-foreground">{c.address}</p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">sem endereço</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={!ofDay.length || generate.isPending}>
            {generate.isPending ? "Gerando…" : `Gerar rota (${ofDay.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRouteDialog({ route, onClose }: { route: RouteRecord | null; onClose: () => void }) {
  const update = useUpdateRoute();
  const [name, setName] = useState(route?.name ?? "");
  const [date, setDate] = useState(
    route?.date ? new Date(route.date).toISOString().slice(0, 10) : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!route) return;
    await update.mutateAsync({ id: route.id, data: { name, date: date || null } });
    onClose();
  }

  return (
    <Dialog open={!!route} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar Rota</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddStopDialog({
  routeId,
  open,
  onClose,
}: {
  routeId: string;
  open: boolean;
  onClose: () => void;
}) {
  const add = useAddStop();
  const { data: companies } = useCompanies();
  const [companyId, setCompanyId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");

  const selectedCompany = companies?.find((c) => c.id === companyId);

  function handleCompanyChange(id: string) {
    setCompanyId(id);
    const c = companies?.find((c) => c.id === id);
    if (c?.address) setAddress(c.address);
    if (c && !label) setLabel(c.name);
  }

  function reset() { setCompanyId(""); setLabel(""); setAddress(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await add.mutateAsync({
      routeId,
      data: {
        companyId: companyId || null,
        label: label || null,
        address,
      },
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Adicionar Parada</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Empresa (opcional)</Label>
            <Select value={companyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar empresa…" />
              </SelectTrigger>
              <SelectContent>
                {(companies ?? []).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-label">Label</Label>
            <Input
              id="as-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={selectedCompany?.name ?? "Nome da parada"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="as-address">Endereço *</Label>
            <Input
              id="as-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, cidade…"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
            <Button type="submit" disabled={add.isPending}>{add.isPending ? "Adicionando…" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StopRow({
  stop,
  routeId,
  index,
  total,
  onMove,
}: {
  stop: StopRecord;
  routeId: string;
  index: number;
  total: number;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const remove = useRemoveStop();
  const markVisited = useMarkStopVisited();
  const visited = !!stop.visitedAt;

  return (
    <div className={cn("flex items-start gap-2 py-3 px-1 rounded-md transition-colors group", visited && "opacity-60")}>
      <div className="-my-0.5 flex shrink-0 flex-col">
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          title="Mover para cima"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUpIcon className="size-4" />
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          title="Mover para baixo"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronDownIcon className="size-4" />
        </button>
      </div>
      <button
        onClick={() => markVisited.mutate({ routeId, stopId: stop.id, visited: !visited })}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title={visited ? "Marcar como não visitada" : "Marcar como visitada"}
      >
        {visited
          ? <CheckCircle2Icon className="size-4 text-emerald-500" />
          : <CircleIcon className="size-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug", visited && "line-through")}>
          {stop.label ?? stop.company?.name ?? "Parada"}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPinIcon className="size-3 shrink-0" />
          <span className="truncate">{stop.address}</span>
        </p>
        {stop.company && stop.label && stop.label !== stop.company.name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <BuildingIcon className="size-3 shrink-0" />
            {stop.company.name}
          </p>
        )}
      </div>
      <button
        onClick={() => remove.mutate({ routeId, stopId: stop.id })}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Remover parada"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );
}

function RouteSheet({
  route,
  onClose,
  onEdit,
  onDelete,
}: {
  route: RouteRecord | null;
  onClose: () => void;
  onEdit: (r: RouteRecord) => void;
  onDelete: (r: RouteRecord) => void;
}) {
  const [addingStop, setAddingStop] = useState(false);
  const reorder = useReorderStops();
  if (!route) return null;

  function moveStop(index: number, dir: -1 | 1) {
    if (!route) return;
    const ids = route.stops.map((s) => s.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder.mutate({ routeId: route.id, orderedIds: ids });
  }

  const visited = route.stops.filter((s) => s.visitedAt).length;

  return (
    <>
      {route && (
        <AddStopDialog
          routeId={route.id}
          open={addingStop}
          onClose={() => setAddingStop(false)}
        />
      )}
      <Sheet open={!!route} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="flex flex-col gap-0 overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <RouteIcon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Rota</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(route)} title="Editar">
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => onDelete(route)} title="Excluir">
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
            <SheetTitle className="text-lg">{route.name}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <QuickRouteStatus route={route} />
              {route.date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  {formatDate(route.date)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {visited}/{route.stops.length} paradas visitadas
              </span>
            </div>
          </SheetHeader>

          <Separator />

          <div className="py-3 flex-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-medium">Paradas ({route.stops.length})</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingStop(true)}>
                <PlusIcon className="size-3 mr-1" /> Adicionar
              </Button>
            </div>

            {route.stops.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <MapPinIcon className="size-8" />
                <p className="text-sm">Nenhuma parada ainda.</p>
                <Button size="sm" variant="outline" onClick={() => setAddingStop(true)}>
                  <PlusIcon className="size-4 mr-1.5" /> Adicionar parada
                </Button>
              </div>
            ) : (
              <div className="flex flex-col divide-y">
                {route.stops.map((stop, i) => (
                  <StopRow
                    key={stop.id}
                    stop={stop}
                    routeId={route.id}
                    index={i}
                    total={route.stops.length}
                    onMove={moveStop}
                  />
                ))}
              </div>
            )}
          </div>

          {route.stops.length > 0 && (
            <>
              <Separator />
              <div className="py-3 px-1">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    const addresses = route.stops.map((s) => encodeURIComponent(s.address)).join("/");
                    window.open(`https://www.google.com/maps/dir/${addresses}`, "_blank");
                  }}
                >
                  <NavigationIcon className="size-4" />
                  Abrir no Google Maps
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function RouteCard({
  route,
  onClick,
  onEdit,
  onDelete,
}: {
  route: RouteRecord;
  onClick: () => void;
  onEdit: (r: RouteRecord) => void;
  onDelete: (r: RouteRecord) => void;
}) {
  const cfg = STATUS_CONFIG[route.status];
  const visited = route.stops.filter((s) => s.visitedAt).length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full cursor-pointer text-left rounded-lg border bg-card hover:bg-muted/30 transition-colors p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <RouteIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm leading-snug line-clamp-2">{route.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={cfg.variant} className={cn("text-xs", cfg.className)}>{cfg.label}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontalIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(route)}>
                <PencilIcon className="size-3.5 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(route)} className="text-destructive focus:text-destructive">
                <Trash2Icon className="size-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {route.date && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarIcon className="size-3" />
          {formatDate(route.date)}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm">
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold tabular-nums">{route.stops.length}</span>
          <span className="text-xs text-muted-foreground">paradas</span>
        </div>
        {route.stops.length > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold tabular-nums text-emerald-500">{visited}</span>
            <span className="text-xs text-muted-foreground">visitadas</span>
          </div>
        )}
      </div>

      {route.stops.length > 0 && (
        <div className="border-t pt-2 mt-auto flex flex-col gap-1">
          {route.stops.slice(0, 3).map((s) => (
            <p key={s.id} className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPinIcon className="size-3 shrink-0" />
              <span className="truncate">{s.label ?? s.company?.name ?? s.address}</span>
            </p>
          ))}
          {route.stops.length > 3 && (
            <p className="text-xs text-muted-foreground">+{route.stops.length - 3} mais…</p>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteRouteDialog({ route, onClose }: { route: RouteRecord | null; onClose: () => void }) {
  const del = useDeleteRoute();
  return (
    <AlertDialog open={!!route} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir rota?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{route?.name}</strong> e todas as suas paradas serão removidas permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending}
            onClick={async () => { if (route) { await del.mutateAsync(route.id); onClose(); } }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? "Excluindo…" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RoutesView() {
  const { data: routes, isLoading } = useRoutes();
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);
  const [editingRoute, setEditingRoute] = useState<RouteRecord | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<RouteRecord | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-xs" />
          <Skeleton className="h-9 w-32 ml-auto" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const list = routes ?? [];
  // a sheet lê a rota ao vivo do cache (não o snapshot) para refletir
  // reordenação / visitas / adições / remoções enquanto está aberta
  const selectedLive = selectedRoute
    ? list.find((r) => r.id === selectedRoute.id) ?? null
    : null;

  return (
    <>
      <CreateRouteDialog open={creating} onClose={() => setCreating(false)} />
      <GenerateRouteDialog open={generating} onClose={() => setGenerating(false)} />
      <EditRouteDialog
        route={editingRoute}
        onClose={() => setEditingRoute(null)}
      />
      <DeleteRouteDialog
        route={deletingRoute}
        onClose={() => { setDeletingRoute(null); setSelectedRoute(null); }}
      />
      <RouteSheet
        route={selectedLive}
        onClose={() => setSelectedRoute(null)}
        onEdit={(r) => { setSelectedRoute(null); setEditingRoute(r); }}
        onDelete={(r) => setDeletingRoute(r)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{list.length} rota{list.length !== 1 ? "s" : ""}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setGenerating(true)}>
              <CalendarPlusIcon className="size-4 mr-1.5" /> Gerar do dia
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon className="size-4 mr-1.5" /> Nova Rota
            </Button>
          </div>
        </div>

        {list.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <RouteIcon className="size-10" />
            <p className="text-sm">Nenhuma rota criada ainda.</p>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <PlusIcon className="size-4 mr-1.5" /> Criar primeira rota
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {list.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onClick={() => setSelectedRoute(route)}
                onEdit={setEditingRoute}
                onDelete={setDeletingRoute}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
