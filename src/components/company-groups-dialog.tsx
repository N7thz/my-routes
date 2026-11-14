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
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  FolderPlusIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";

/** Quantas empresas aparecem como etiqueta com a seção recolhida. */
const CHIP_LIMIT = 8;

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

/** Nome falado de cada cor, para o leitor de tela não ler o código hex. */
const COLOR_NAMES: Record<string, string> = {
  "#3b82f6": "azul",
  "#10b981": "verde",
  "#f59e0b": "âmbar",
  "#ef4444": "vermelho",
  "#8b5cf6": "roxo",
  "#ec4899": "rosa",
  "#14b8a6": "turquesa",
  "#64748b": "cinza",
};

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
    () => new Set(group ? companies.filter((c) => c.groupId === group.id).map((c) => c.id) : []),
  );
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const visible = q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies;
  const mutation = group ? update : create;
  const selectedCompanies = companies.filter((c) => selected.has(c.id));

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
    <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
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

      <div className="flex flex-col gap-2">
        <Label>Cor</Label>
        {/* p-1 dá espaço para o anel da cor escolhida não ser cortado. */}
        <div className="-m-1 flex flex-wrap gap-2.5 p-1">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={color === c}
              aria-label={`Cor ${COLOR_NAMES[c] ?? c}`}
              onClick={() => setColor(c)}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition-[box-shadow,scale] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                color === c ? "ring-2 ring-foreground" : "hover:scale-110",
              )}
              style={{ backgroundColor: c }}
            >
              {color === c && <CheckIcon className="size-4 text-white drop-shadow-sm" />}
            </button>
          ))}
        </div>
      </div>

      {/* Recolhida por padrão quando o grupo já tem empresas: mostra só as marcadas. */}
      <Collapsible defaultOpen={selected.size === 0} className="group/emp flex min-h-0 flex-1 flex-col gap-2">
        <CollapsibleTrigger className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-open/emp:rotate-90" />
          <span className="text-sm font-medium">Empresas</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {selected.size} selecionada{selected.size !== 1 ? "s" : ""}
          </span>
        </CollapsibleTrigger>

        {selected.size > 0 && (
          <ul className="flex flex-wrap gap-1.5 group-data-open/emp:hidden" aria-label="Empresas do grupo">
            {selectedCompanies.slice(0, CHIP_LIMIT).map((c) => (
              <li
                key={c.id}
                title={c.name}
                className="max-w-full truncate rounded-md border bg-muted/40 px-2 py-1 text-xs sm:max-w-[16rem]"
              >
                {c.name}
              </li>
            ))}
            {selectedCompanies.length > CHIP_LIMIT && (
              <li className="px-1 py-1 text-xs text-muted-foreground">+{selectedCompanies.length - CHIP_LIMIT}</li>
            )}
          </ul>
        )}

        <CollapsiblePanel className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar empresas…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <div className="min-h-24 max-h-[min(26rem,50dvh)] min-w-0 flex-1 divide-y overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border">
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
                    className="flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={cn(
                        "size-4 rounded border flex items-center justify-center shrink-0",
                        checked ? "bg-primary border-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {checked && <CheckIcon className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={c.name}>
                      {c.name}
                    </span>
                    {inOtherGroup && <span className="text-xs text-muted-foreground shrink-0">em outro grupo</span>}
                  </button>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Uma empresa fica em um grupo só — marcar aqui tira ela do grupo anterior.
          </p>
        </CollapsiblePanel>
      </Collapsible>

      {mutation.error && <p className="text-xs text-destructive">{mutation.error.message}</p>}

      <DialogFooter className="shrink-0 flex-row justify-end gap-2 sm:space-x-0">
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
  initialEditing = null,
}: {
  open: boolean;
  onClose: () => void;
  companies: CompanyRecord[];
  /** Abre direto no formulário desse grupo (ex.: o grupo recém-criado ao juntar dois cartões). */
  initialEditing?: CompanyGroupRecord | null;
}) {
  const { data: groups = [], isLoading } = useCompanyGroups();
  const del = useDeleteCompanyGroup();
  // null = listagem; "new" = criando; objeto = editando
  const [editing, setEditing] = useState<CompanyGroupRecord | "new" | null>(initialEditing);
  // Troca de grupo inicial com o diálogo montado: ajusta durante o render.
  const [shownInitial, setShownInitial] = useState(initialEditing);
  if (initialEditing !== shownInitial) {
    setShownInitial(initialEditing);
    if (initialEditing) setEditing(initialEditing);
  }
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
        {/* Coluna com altura limitada: só a lista de empresas rola; título e rodapé ficam fixos. */}
        <DialogContent className="flex flex-col gap-5 overflow-hidden sm:max-w-xl">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="flex min-w-0 items-center gap-2 leading-tight">
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-8 shrink-0"
                  onClick={() => setEditing(null)}
                  aria-label="Voltar para a lista de grupos"
                >
                  <ArrowLeftIcon className="size-4" />
                </Button>
              )}
              <span className="truncate">
                {editing === "new" ? "Novo grupo" : editing ? `Editar “${editing.name}”` : "Grupos de empresas"}
              </span>
            </DialogTitle>
          </DialogHeader>

          {editing ? (
            <GroupForm
              key={editing === "new" ? "new" : editing.id}
              group={editing === "new" ? null : editing}
              companies={companies}
              // Veio direto para o formulário (grupo recém-criado): ao terminar, fecha.
              onDone={() => (shownInitial && editing === shownInitial ? handleOpenChange(false) : setEditing(null))}
            />
          ) : (
            <div className="flex min-h-0 flex-col gap-3">
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
                <div className="-mr-1 flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-md border">
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
                        className="size-7 pointer-coarse:size-10"
                        onClick={() => setEditing(g)}
                        title="Editar"
                      >
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 pointer-coarse:size-10 text-destructive hover:text-destructive"
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
              O grupo <strong>{deleting?.name}</strong> será removido. As empresas dele não são excluídas — só ficam sem
              grupo.
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
