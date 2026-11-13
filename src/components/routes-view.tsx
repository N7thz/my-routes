"use client";

import { useState } from "react";
import { useRoutes } from "@/hooks/use-routes";
import { ROUTES_LOOKBACK_DAYS } from "@/lib/dates";
import type { RouteRecord } from "@/lib/route-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarPlusIcon, PlusIcon, RouteIcon } from "lucide-react";
import { CreateRouteDialog } from "@/components/routes/create-route-dialog";
import { DeleteRouteDialog } from "@/components/routes/delete-route-dialog";
import { EditRouteDialog } from "@/components/routes/edit-route-dialog";
import { GenerateRouteDialog } from "@/components/routes/generate-route-dialog";
import { RouteCard } from "@/components/routes/route-card";
import { RouteSheet } from "@/components/routes/route-sheet";

export function RoutesView() {
  // Por padrão só os últimos 60 dias; o histórico inteiro vem sob demanda.
  const [showOlder, setShowOlder] = useState(false);
  const { data: routes, isLoading, isFetching } = useRoutes(showOlder ? { from: "2000-01-01" } : undefined);
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
          {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((key) => (
            <Skeleton key={key} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const list = routes ?? [];
  // a sheet lê a rota ao vivo do cache (não o snapshot) para refletir
  // reordenação / visitas / adições / remoções enquanto está aberta
  const selectedLive = selectedRoute ? (list.find((r) => r.id === selectedRoute.id) ?? null) : null;

  return (
    <>
      <CreateRouteDialog open={creating} onClose={() => setCreating(false)} />
      <GenerateRouteDialog open={generating} onClose={() => setGenerating(false)} />
      <EditRouteDialog key={editingRoute?.id} route={editingRoute} onClose={() => setEditingRoute(null)} />
      <DeleteRouteDialog
        route={deletingRoute}
        onClose={() => {
          setDeletingRoute(null);
          setSelectedRoute(null);
        }}
      />
      <RouteSheet
        route={selectedLive}
        onClose={() => setSelectedRoute(null)}
        onEdit={(r) => {
          setSelectedRoute(null);
          setEditingRoute(r);
        }}
        onDelete={(r) => setDeletingRoute(r)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {list.length} rota{list.length !== 1 ? "s" : ""}
          </span>
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

        {!showOlder && (
          <Button variant="ghost" size="sm" className="self-center" onClick={() => setShowOlder(true)}>
            Mostrar rotas com mais de {ROUTES_LOOKBACK_DAYS} dias
          </Button>
        )}
        {showOlder && isFetching && (
          <p className="self-center text-xs text-muted-foreground">Carregando histórico…</p>
        )}
      </div>
    </>
  );
}
