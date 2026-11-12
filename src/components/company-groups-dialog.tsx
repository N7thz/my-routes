"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useCompanyGroups,
  useCreateCompanyGroup,
  useUpdateCompanyGroup,
  useDeleteCompanyGroup,
  type CompanyGroupRecord,
} from "@/hooks/use-company-groups";
import type { CompanyRecord } from "@/lib/company-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ArrowLeftIcon,
  CheckIcon,
  FolderPlusIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

export const GROUP_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#64748b",
] as const;

const FALLBACK_COLOR = "#64748b";

export function GroupDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 rounded-full shrink-0", className)}
      style={{ backgroundColor: color ?? FALLBACK_COLOR }}
    />
  );
}

function GroupForm({
  group,
  companies,
  onDone,
}: {
  group: CompanyGroupRecord | null;
  companies: CompanyRecord[];
  onDone: () => void;
}) {
  const create = useCreateCompanyGroup();
  const update = useUpdateCompanyGroup();
  const [name, setName] = useState(group?.name ?? "");
  const [color, setColor] = useState<string>(group?.color ?? GROUP_COLORS[0]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(group ? companies.filter((c) => c.groupId === group.id).map((c) => c.id) : [])
  );
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const visible = q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies;
  const mutation = group ? update : create;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { name, color, companyIds: [...selected] };
    if (group) await update.mutateAsync({ id: group.id, data });
    else await create.mutateAsync(data);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cg-name">Nome *</Label>
        <Input
          id="cg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Região Norte"
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              title={c}
              className={cn(
                "size-7 rounded-full flex items-center justify-center ring-offset-2 ring-offset-background transition",
                color === c ? "ring-2 ring-foreground" : "hover:scale-110"
              )}
              style={{ backgroundColor: c }}
            >
              {color === c && <CheckIcon className="size-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Empresas</Label>
          <span className="text-xs text-muted-foreground">{selected.size} selecionada{selected.size !== 1 ? "s" : ""}</span>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar empresas…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto rounded-md border divide-y">
          {visible.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma empresa encontrada.</p>
          ) : (
            visible.map((c) => {
              const checked = selected.has(c.id);
              const inOtherGroup = !checked && c.groupId !== null && c.groupId !== group?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={cn(
                      "size-4 rounded border flex items-center justify-center shrink-0",
                      checked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                    )}
                  >
                    {checked && <CheckIcon className="size-3" />}
                  </span>
                  <span className="truncate flex-1">{c.name}</span>
                  {inOtherGroup && (
                    <span className="text-[10px] text-muted-foreground shrink-0">em outro grupo</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Uma empresa fica em um grupo só — marcar aqui tira ela do grupo anterior.
        </p>
      </div>

      {mutation.error && <p className="text-xs text-destructive">{mutation.error.message}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || !name.trim()}>
          {mutation.isPending ? "Salvando…" : group ? "Salvar" : "Criar grupo"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CompanyGroupsDialog({
  open,
  onClose,
  companies,
}: {
  open: boolean;
  onClose: () => void;
  companies: CompanyRecord[];
}) {
  const { data: groups = [], isLoading } = useCompanyGroups();
  const del = useDeleteCompanyGroup();
  // null = listagem; "new" = criando; objeto = editando
  const [editing, setEditing] = useState<CompanyGroupRecord | "new" | null>(null);
  const [deleting, setDeleting] = useState<CompanyGroupRecord | null>(null);

  function handleOpenChange(o: boolean) {
    if (!o) {
      setEditing(null);
      onClose();
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 -ml-1"
                  onClick={() => setEditing(null)}
                  title="Voltar"
                >
                  <ArrowLeftIcon className="size-4" />
                </Button>
              )}
              {editing === "new" ? "Novo grupo" : editing ? `Editar "${editing.name}"` : "Grupos de empresas"}
            </DialogTitle>
          </DialogHeader>

          {editing ? (
            <GroupForm
              key={editing === "new" ? "new" : editing.id}
              group={editing === "new" ? null : editing}
              companies={companies}
              onDone={() => setEditing(null)}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-11 rounded-md" />
                  <Skeleton className="h-11 rounded-md" />
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum grupo ainda. Crie um para organizar as empresas.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md border"
                    >
                      <GroupDot color={g.color} className="size-2.5" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{g.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.companyCount} empresa{g.companyCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditing(g)}
                        title="Editar"
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(g)}
                        title="Excluir"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" onClick={() => setEditing("new")}>
                <FolderPlusIcon className="size-4 mr-1.5" />
                Novo grupo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              O grupo <strong>{deleting?.name}</strong> será removido. As empresas dele não são
              excluídas — só ficam sem grupo.
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
    </>
  );
}
