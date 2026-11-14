"use client";

import { useState } from "react";
import { createLoader, createSerializer, type ParserMap, useQueryStates } from "nuqs";
import { BookmarkIcon, CheckIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type SavedFilterScreen,
  useDeleteSavedFilter,
  useSaveFilter,
  useSavedFilters,
} from "@/hooks/use-saved-filters";

/**
 * Filtros nomeados da conta: aplica um salvo com um clique e salva a combinação
 * atual com um nome. `parsers` são os mesmos parsers nuqs da tela (constante de
 * módulo) com tudo que entra no filtro salvo.
 */
/** Atalho fixo da tela; `query` vem do mesmo serializer dos filtros salvos. */
export type FilterPreset = { id: string; name: string; query: string };

export function SavedFiltersMenu({
  screen,
  parsers,
  presets = [],
  onApply,
}: {
  screen: SavedFilterScreen;
  parsers: ParserMap;
  presets?: FilterPreset[];
  /** Chamado depois de aplicar um filtro salvo (ex.: voltar para a página 1). */
  onApply?: () => void;
}) {
  const [values, setValues] = useQueryStates(parsers);
  const current = createSerializer(parsers)(values);
  const { data: saved = [] } = useSavedFilters(screen);
  const [managing, setManaging] = useState(false);

  function apply(query: string) {
    void setValues(createLoader(parsers)(query));
    onApply?.();
  }

  // Um filtro salvo com a mesma combinação de um atalho leva o nome dado pelo usuário.
  const active = saved.find((f) => f.query === current) ?? presets.find((p) => p.query === current);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant={active ? "secondary" : "outline"} title="Filtros salvos">
            <BookmarkIcon className="size-4 mr-1.5" />
            <span className="max-w-32 truncate">{active?.name ?? "Filtros"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {presets.length > 0 && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Atalhos</DropdownMenuLabel>
                {presets.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => apply(p.query)}>
                    <CheckIcon className={p.query === current ? "opacity-100" : "opacity-0"} />
                    <span className="truncate">{p.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          {saved.length > 0 ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Filtros salvos</DropdownMenuLabel>
                {saved.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => apply(f.query)}>
                    <CheckIcon className={f.id === active?.id ? "opacity-100" : "opacity-0"} />
                    <span className="truncate">{f.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : presets.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum filtro salvo ainda</p>
          ) : null}
          <DropdownMenuItem onClick={() => setManaging(true)}>
            <BookmarkIcon />
            {saved.length > 0 ? "Salvar ou gerenciar…" : "Salvar filtros atuais…"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManageSavedFiltersDialog
        open={managing}
        onClose={() => setManaging(false)}
        screen={screen}
        currentQuery={current}
        activeName={active?.name}
      />
    </>
  );
}

function ManageSavedFiltersDialog({
  open,
  onClose,
  screen,
  currentQuery,
  activeName,
}: {
  open: boolean;
  onClose: () => void;
  screen: SavedFilterScreen;
  currentQuery: string;
  activeName?: string;
}) {
  const { data: saved = [] } = useSavedFilters(screen);
  const save = useSaveFilter(screen);
  const remove = useDeleteSavedFilter(screen);
  const [name, setName] = useState("");

  const trimmed = name.trim();
  const overwrites = saved.some((f) => f.name === trimmed);
  const error = save.error ?? remove.error;

  function close() {
    setName("");
    save.reset();
    remove.reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    save.mutate({ name: trimmed, query: currentQuery }, { onSuccess: close });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros salvos</DialogTitle>
          <DialogDescription>
            Guarde a combinação de filtros atual com um nome. Ela fica na sua conta, em qualquer aparelho.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Label htmlFor="saved-filter-name" className="text-xs">
            Nome
          </Label>
          <Input
            id="saved-filter-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={activeName ?? "Ex.: Pendentes de Joinville"}
            maxLength={60}
            autoFocus
          />
          {overwrites && (
            <p className="text-xs text-muted-foreground">Já existe um filtro com esse nome: ele será substituído.</p>
          )}

          {saved.length > 0 && (
            <ul className="mt-2 flex flex-col divide-y rounded-md border">
              {saved.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="flex-1 truncate">{f.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    title={`Excluir "${f.name}"`}
                    aria-label={`Excluir filtro ${f.name}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(f.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-xs text-destructive">{error.message}</p>}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={close} disabled={save.isPending}>
              Fechar
            </Button>
            <Button type="submit" disabled={!trimmed || save.isPending}>
              {save.isPending ? "Salvando…" : overwrites ? "Substituir" : "Salvar filtros atuais"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
