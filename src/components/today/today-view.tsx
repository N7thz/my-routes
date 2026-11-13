"use client";

import { dayKey, todayKey } from "@/lib/dates";
import { useRoutes } from "@/hooks/use-routes";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TodayEventsCard } from "./today-events-card";
import { TodayHeader } from "./today-header";
import { TodayRouteCard, TodayRouteEmpty } from "./today-route-card";

export function TodayView({ name }: { name?: string | null }) {
  const { data, isPending, isError } = useRoutes();
  const routes = data?.filter((r) => dayKey(r.date) === todayKey()) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 p-4 md:p-6">
      <TodayHeader name={name} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Rota de hoje</h2>
        {isPending ? (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Não deu pra carregar as rotas agora.</p>
        ) : routes.length === 0 ? (
          <TodayRouteEmpty />
        ) : (
          routes.map((route) => <TodayRouteCard key={route.id} route={route} />)
        )}
      </section>

      <TodayEventsCard />
    </div>
  );
}
