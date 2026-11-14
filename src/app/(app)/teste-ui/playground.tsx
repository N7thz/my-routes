"use client";

import { Toast, ToastClose, ToastDescription, ToastRegion, ToastTitle, toast } from "@ui-sdk/react/toast";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

const PERIODOS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "dia-todo", label: "Dia todo" },
];

function Playground() {
  const [empresa, setEmpresa] = useState("");
  const [periodo, setPeriodo] = useState("manha");
  const [data, setData] = useState("");

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rotulo = PERIODOS.find((p) => p.value === periodo)?.label;
    toast("Parada salva", {
      description: [empresa || "Sem nome", rotulo, data].filter(Boolean).join(" · "),
    });
  }

  return (
    <>
      <form onSubmit={salvar} className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="empresa">Empresa</Label>
          <Input
            id="empresa"
            placeholder="Ex.: Padaria Central"
            value={empresa}
            onValueChange={setEmpresa}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Período</Label>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Data</Label>
          <DatePicker value={data} onChange={setData} />
        </div>

        <Button type="submit" className="self-start">
          Salvar parada
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Ações</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => toast("Editar")}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("Duplicar")}>Duplicar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast("Excluir")} className="text-destructive">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Abrir painel</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Detalhes da rota</SheetTitle>
              <SheetDescription>6 paradas hoje.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Cancelar rota</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar a rota de hoje?</AlertDialogTitle>
              <AlertDialogDescription>As 6 paradas voltam para a lista de pendentes.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast("Rota cancelada")}>Cancelar rota</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">Passe o mouse</Button>
          </TooltipTrigger>
          <TooltipContent>Dica do ui-sdk</TooltipContent>
        </Tooltip>
      </div>

      <ToastRegion className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {() => (
          <Toast className="relative flex flex-col gap-1 rounded-lg border bg-popover p-4 pr-10 text-popover-foreground shadow-lg transition-[opacity,translate] duration-200 data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <ToastTitle className="text-sm font-semibold" />
            <ToastDescription className="text-sm text-muted-foreground" />
            <ToastClose aria-label="Fechar aviso" className="absolute right-3 top-3 opacity-70 hover:opacity-100">
              <X className="size-4" />
            </ToastClose>
          </Toast>
        )}
      </ToastRegion>
    </>
  );
}

export { Playground };
