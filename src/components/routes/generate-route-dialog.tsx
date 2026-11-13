"use client";

import { useState } from "react";
import { dayKey, todayKey } from "@/lib/dates";
import { useRoutes, useGenerateRoute } from "@/hooks/use-routes";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BuildingIcon } from "lucide-react";

export function GenerateRouteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: companies = [] } = useCompanies();
  const { data: routes = [] } = useRoutes();
  const generate = useGenerateRoute();
  const [date, setDate] = useState(() => todayKey());
  const [error, setError] = useState<string | null>(null);

  const ofDay = companies.filter((c) => dayKey(c.date) === date).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const existing = routes.filter((r) => dayKey(r.date) === date).length;

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
        <DialogHeader>
          <DialogTitle>Gerar rota do dia</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <DatePicker
              value={date}
              onChange={(v) => {
                setDate(v);
                setError(null);
              }}
            />
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
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma empresa cadastrada nesta data.</p>
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
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={!ofDay.length || generate.isPending}>
            {generate.isPending ? "Gerando…" : `Gerar rota (${ofDay.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
