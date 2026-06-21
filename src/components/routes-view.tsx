"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useRoutes,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
  useAddStop,
  useRemoveStop,
  useMarkStopVisited,
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
  BuildingIcon,
  ClipboardXIcon,
  NavigationIcon,
} from "lucide-react";

// ─── status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  RouteStatus,
  { label: string; variant: "secondary" | "default" | "outline"; className?: string }
> = {
  RASCUNHO:    { label: "Rascunho",     variant: "secondary" },
  EM_ANDAMENTO:{ label: "Em Andamento", variant: "default" },
  CONCLUIDA:   { label: "Concluída",    variant: "outline", className: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700" },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── quick status ─────────────────────────────────────────────────────────────

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

// ─── create route dialog ───────────────────────────────────────────────────────

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

// ─── edit route dialog ─────────────────────────────────────────────────────────

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

// ─── add stop dialog ──────────────────────────────────────────────────────────

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

// ─── stop row ─────────────────────────────────────────────────────────────────

function StopRow({ stop, routeId }: { stop: StopRecord; routeId: string }) {
  const remove = useRemoveStop();
  const markVisited = useMarkStopVisited();
  const visited = !!stop.visitedAt;

  return (
    <div className={cn("flex items-start gap-3 py-3 px-1 rounded-md transition-colors group", visited && "opacity-60")}>
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

// ─── route sheet ──────────────────────────────────────────────────────────────

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
  if (!route) return null;

  const visited = route.stops.filter((s) => s.visitedAt).length;
  const cfg = STATUS_CONFIG[route.status];

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
                {route.stops.map((stop) => (
                  <StopRow key={stop.id} stop={stop} routeId={route.id} />
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

// ─── route card ───────────────────────────────────────────────────────────────

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
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card hover:bg-muted/30 transition-colors p-4 flex flex-col gap-3"
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
    </button>
  );
}

// ─── delete dialog ─────────────────────────────────────────────────────────────

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

// ─── main view ─────────────────────────────────────────────────────────────────

export function RoutesView() {
  const { data: routes, isLoading } = useRoutes();
  const [creating, setCreating] = useState(false);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const list = routes ?? [];

  return (
    <>
      <CreateRouteDialog open={creating} onClose={() => setCreating(false)} />
      <EditRouteDialog
        route={editingRoute}
        onClose={() => setEditingRoute(null)}
      />
      <DeleteRouteDialog
        route={deletingRoute}
        onClose={() => { setDeletingRoute(null); setSelectedRoute(null); }}
      />
      <RouteSheet
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        onEdit={(r) => { setSelectedRoute(null); setEditingRoute(r); }}
        onDelete={(r) => setDeletingRoute(r)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{list.length} rota{list.length !== 1 ? "s" : ""}</span>
          <Button size="sm" className="ml-auto" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4 mr-1.5" /> Nova Rota
          </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
