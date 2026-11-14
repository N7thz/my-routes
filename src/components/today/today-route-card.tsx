"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRightIcon, CheckCircle2Icon, MapPinIcon, NavigationIcon, RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPreferredNavApp, navUrl, nextStop, type NavApp } from "@/lib/navigation";
import type { RouteRecord } from "@/lib/route-service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_CONFIG } from "@/components/routes/list-status-config";

const NAV_APPS: { app: NavApp; label: string }[] = [
  { app: "google", label: "Google Maps" },
  { app: "waze", label: "Waze" },
];

/** O app preferido só existe no aparelho: no servidor (e na hidratação) vale o padrão. */
function usePreferredNavApp(): NavApp {
  return useSyncExternalStore(
    () => () => {},
    getPreferredNavApp,
    (): NavApp => "google",
  );
}

export function TodayRouteCard({ route }: { route: RouteRecord }) {
  const preferred = usePreferredNavApp();
  const cfg = STATUS_CONFIG[route.status];
  const total = route.stops.length;
  const visited = route.stops.filter((s) => s.visitedAt).length;
  const next = nextStop(route.stops);
  const percent = total === 0 ? 0 : Math.round((visited / total) * 100);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <RouteIcon className="size-4 shrink-0 text-muted-foreground" />
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{route.name}</h3>
          </div>
          <Badge variant={cfg.variant} className={cn("shrink-0 text-xs", cfg.className)}>
            {cfg.label}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {visited} de {total} {total === 1 ? "parada" : "paradas"}
            </span>
            <span>{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Paradas visitadas"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={visited}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {next ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Próxima parada
            </p>
            <div className="flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium leading-snug">{next.company?.name ?? next.label ?? next.address}</p>
                <p className="text-sm text-muted-foreground">{next.address}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_APPS.map(({ app, label }) => (
                <a
                  key={app}
                  href={navUrl(app, next)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: app === preferred ? "default" : "outline" }),
                    "gap-2",
                  )}
                >
                  <NavigationIcon className="size-4" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            {total === 0 ? "Esta rota ainda não tem paradas." : "Todas as paradas foram visitadas."}
          </p>
        )}

        <Link
          href="/rotas"
          className="flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver rota
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function TodayRouteEmpty() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 p-4">
        <div className="flex items-center gap-2">
          <RouteIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Nenhuma rota para hoje</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Gere uma rota com as empresas do dia ou monte uma na mão.
        </p>
        <Link href="/rotas" className={buttonVariants({ variant: "outline" })}>
          Ir para Rotas
        </Link>
      </CardContent>
    </Card>
  );
}
