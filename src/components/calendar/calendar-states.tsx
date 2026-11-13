"use client";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon } from "lucide-react";

export function CalendarSkeleton() {
  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-7 gap-px mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ConnectGoogleCard({ reason }: { reason?: string }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="size-5" />
          Google Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {reason === "no-calendar-scope"
            ? "Permissão de calendário não concedida. Reconecte para liberar o acesso."
            : "Conecte sua conta Google para visualizar seus eventos."}
        </p>
        <Button
          variant="outline"
          className="w-fit gap-2"
          onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
        >
          <CalendarIcon className="size-4" />
          {reason === "no-calendar-scope" ? "Reconectar Google Agenda" : "Conectar Google Agenda"}
        </Button>
      </CardContent>
    </Card>
  );
}
