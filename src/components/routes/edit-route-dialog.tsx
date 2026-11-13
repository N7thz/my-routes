"use client";

import { useState } from "react";
import { useUpdateRoute } from "@/hooks/use-routes";
import type { RouteRecord } from "@/lib/route-service";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditRouteDialog({ route, onClose }: { route: RouteRecord | null; onClose: () => void }) {
  const update = useUpdateRoute();
  const [name, setName] = useState(route?.name ?? "");
  const [date, setDate] = useState(route?.date ? new Date(route.date).toISOString().slice(0, 10) : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!route) return;
    await update.mutateAsync({ id: route.id, data: { name, date: date || null } });
    onClose();
  }

  return (
    <Dialog open={!!route} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Rota</DialogTitle>
        </DialogHeader>
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
