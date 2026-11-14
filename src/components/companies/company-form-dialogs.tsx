"use client";

import { useState } from "react";
import { useUpdateCompany, useDeleteCompany, useCreateCompany } from "@/hooks/use-companies";
import { useCompanyGroups } from "@/hooks/use-company-groups";
import { GroupDot } from "@/components/company-groups-dialog";
import { useCnpjLookup } from "@/hooks/use-cnpj";
import { CNPJ_LENGTH, cnpjDigits, formatCnpj } from "@/lib/cnpj";
import { DatePicker } from "@/components/ui/date-picker";
import type { CompanyRecord } from "@/lib/company-service";
import type { CompanyStatus } from "@/lib/company-service";
import { todayKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchCheckIcon } from "lucide-react";
import {
  EnrichedCompany,
  NO_GROUP,
  STATUS_CONFIG,
  STATUS_KEYS,
  combineDateTime,
  timeFromDate,
} from "@/components/companies/company-model";

function GroupSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: groups = [] } = useCompanyGroups();
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Grupo</Label>
      <Select value={value || NO_GROUP} onValueChange={(v) => onChange(v === NO_GROUP ? "" : v)}>
        <SelectTrigger aria-label="Grupo">
          <SelectValue placeholder="Sem grupo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_GROUP}>Sem grupo</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              <span className="flex items-center gap-2">
                <GroupDot color={g.color} />
                {g.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export type CompanyForm = {
  name: string;
  cnpj: string;
  address: string;
  status: CompanyStatus | "";
  date: string;
  time: string;
  observations: string;
  groupId: string;
};

function initialForm(company: CompanyRecord | null, prefill?: Partial<CompanyForm>): CompanyForm {
  if (!company) {
    return {
      name: "",
      cnpj: "",
      address: "",
      status: "PENDENTE",
      date: todayKey(),
      time: "",
      observations: "",
      groupId: "",
      ...prefill,
    };
  }
  return {
    name: company.name,
    cnpj: company.cnpj ? formatCnpj(company.cnpj) : "",
    address: company.address ?? "",
    status: company.status ?? "",
    date: company.date ? new Date(company.date).toISOString().slice(0, 10) : "",
    time: timeFromDate(company.date),
    observations: company.observations ?? "",
    groupId: company.groupId ?? "",
  };
}

/**
 * Formulário de empresa. É montado junto com o conteúdo do diálogo, então cada
 * abertura começa do estado inicial; a empresa é fixada nesse momento porque o
 * pai a zera ao fechar, enquanto o diálogo ainda está na tela.
 */
function CompanyFormFields({
  editing,
  company: currentCompany,
  prefill,
  onSaved,
  onClose,
}: {
  editing: boolean;
  company: CompanyRecord | null;
  prefill?: Partial<CompanyForm>;
  onSaved?: (company: CompanyRecord) => void;
  onClose: () => void;
}) {
  const [company] = useState(currentCompany);
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const cnpjLookup = useCnpjLookup();
  const [form, setForm] = useState(() => initialForm(company, prefill));
  const isPending = create.isPending || update.isPending;

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCnpjLookup() {
    const result = await cnpjLookup.lookup(form.cnpj);
    if (!result) return;
    // Ao editar, a Receita corrige o cadastro; ao criar, só preenche o que falta.
    setForm((f) => ({
      ...f,
      name: editing ? result.razaoSocial : f.name || result.razaoSocial,
      address: editing ? result.address : f.address || result.address,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      cnpj: form.cnpj || null,
      address: form.address || null,
      status: form.status || null,
      date: combineDateTime(form.date, form.time),
      observations: form.observations || null,
      groupId: form.groupId || null,
    };
    const saved = company
      ? await update.mutateAsync({ id: company.id, data })
      : await create.mutateAsync(data);
    onSaved?.(saved);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-name">{editing ? "Nome" : "Nome *"}</Label>
        <Input
          id="company-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={editing ? undefined : "Nome da empresa"}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-cnpj">CNPJ</Label>
        <div className="flex gap-2">
          <Input
            id="company-cnpj"
            value={form.cnpj}
            onChange={(e) => set("cnpj", formatCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Buscar na Receita Federal"
            disabled={cnpjLookup.isLoading || cnpjDigits(form.cnpj).length !== CNPJ_LENGTH}
            onClick={handleCnpjLookup}
          >
            <SearchCheckIcon className="size-4" />
          </Button>
        </div>
        {cnpjLookup.error && <p className="text-xs text-destructive">{cnpjLookup.error}</p>}
        {cnpjLookup.data && (
          <p className="text-xs text-muted-foreground">
            {cnpjLookup.data.nomeFantasia
              ? `${cnpjLookup.data.razaoSocial} (${cnpjLookup.data.nomeFantasia})`
              : cnpjLookup.data.razaoSocial}
            {" · "}
            {cnpjLookup.data.situacao}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-address">Endereço</Label>
        <Input
          id="company-address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Rua, número, bairro, cidade…"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as CompanyStatus)}>
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Sem status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_CONFIG[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <Label>Data</Label>
          <DatePicker value={form.date} onChange={(v) => set("date", v)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-time">Hora da visita</Label>
        <Input
          id="company-time"
          type="time"
          value={form.time}
          onChange={(e) => set("time", e.target.value)}
          className="w-40"
        />
      </div>
      <GroupSelect value={form.groupId} onChange={(v) => set("groupId", v)} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-obs">Observações</Label>
        <Textarea
          id="company-obs"
          value={form.observations}
          onChange={(e) => set("observations", e.target.value)}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {editing ? (isPending ? "Salvando…" : "Salvar") : isPending ? "Criando…" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Diálogo de empresa: `mode="create"` para uma nova, `mode="edit"` com a `company` a editar.
 * `prefill` preenche campos de uma empresa nova (ex.: a partir de um evento da agenda).
 */
export function CompanyFormDialog({
  mode,
  open,
  company = null,
  prefill,
  onSaved,
  onClose,
}: {
  mode: "create" | "edit";
  open: boolean;
  company?: CompanyRecord | null;
  prefill?: Partial<CompanyForm>;
  onSaved?: (company: CompanyRecord) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
        </DialogHeader>
        <CompanyFormFields
          editing={mode === "edit"}
          company={company}
          prefill={prefill}
          onSaved={onSaved}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCompanyDialog({ company, onClose }: { company: EnrichedCompany | null; onClose: () => void }) {
  const del = useDeleteCompany();

  async function handleDelete() {
    if (!company) return;
    await del.mutateAsync(company.id);
    onClose();
  }

  return (
    <AlertDialog open={!!company} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{company?.name}</strong> será removida permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={del.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? "Excluindo…" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
