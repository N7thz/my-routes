"use client";

import { useState } from "react";
import { useAddStop } from "@/hooks/use-routes";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddStopDialog({ routeId, open, onClose }: { routeId: string; open: boolean; onClose: () => void }) {
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

  function reset() {
    setCompanyId("");
    setLabel("");
    setAddress("");
  }

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
          <DialogTitle>Adicionar Parada</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Empresa (opcional)</Label>
            <Select value={companyId} onValueChange={handleCompanyChange}>
              <SelectTrigger aria-label="Empresa (opcional)">
                <SelectValue placeholder="Selecionar empresa…" />
              </SelectTrigger>
              <SelectContent>
                {(companies ?? [])
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
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
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Adicionando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
