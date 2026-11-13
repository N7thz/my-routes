"use client";

import { useState } from "react";
import { useCreateRoute } from "@/hooks/use-routes";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateRouteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRoute();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  function reset() {
    setName("");
    setDate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({ name, date: date || null });
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Rota</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cr-name">Nome *</Label>
            <Input
              id="cr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Visitas terça-feira"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
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
