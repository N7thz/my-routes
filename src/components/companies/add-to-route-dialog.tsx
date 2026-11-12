"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { useRoutes, useCreateRoute, useAddStop, type RouteRecord } from "@/hooks/use-routes";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BuildingIcon, PlusIcon, MapPinIcon, CheckIcon } from "lucide-react";
import { EnrichedCompany } from "@/components/companies/company-model";

export function AddToRouteDialog({
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
