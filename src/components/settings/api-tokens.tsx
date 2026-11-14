"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiTokens, useCreateApiToken, useRevokeApiToken, type CreatedApiToken } from "@/hooks/use-api-tokens";

function lastUsed(value: string | null): string {
  if (!value) return "Nunca usado";
  return `Usado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))}`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o texto continua selecionável na tela.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

/** Token recém-criado: aparece uma única vez, com o comando pronto para o Claude Code. */
function NewToken({ created, onDone }: { created: CreatedApiToken; onDone: () => void }) {
  const command = `claude mcp add --transport http my-routes ${window.location.origin}/api/mcp --header "Authorization: Bearer ${created.token}"`;

  return (
    <div className="space-y-3 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-medium">Token “{created.name}” criado</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Copie agora: por segurança ele não será mostrado de novo.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1.5 font-mono text-xs">
          {created.token}
        </code>
        <CopyButton text={created.token} label="Copiar" />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Para conectar o Claude Code:</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md border bg-background p-2 font-mono text-xs">
          {command}
        </pre>
        <CopyButton text={command} label="Copiar comando" />
      </div>
      <Button type="button" size="sm" onClick={onDone}>
        Já copiei
      </Button>
    </div>
  );
}

const noop = () => () => {};

/** Conector do claude.ai (web/celular): faz login por OAuth, sem colar token. */
function ClaudeConnectorHint() {
  // A origem só existe no navegador; no servidor o texto sai sem a URL completa.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = `${origin}/api/mcp`;
  return (
    <div className="space-y-2 border-b p-4">
      <p className="text-xs text-muted-foreground">
        No claude.ai (web ou celular), não precisa de token: em Configurações → Conectores → Adicionar conector
        personalizado, use a URL abaixo e entre com sua conta. O token pessoal é para o Claude Code e outros clientes.
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1.5 font-mono text-xs">{url}</code>
        {origin && <CopyButton text={url} label="Copiar" />}
      </div>
    </div>
  );
}

export function ApiTokens() {
  const tokens = useApiTokens();
  const create = useCreateApiToken();
  const revoke = useRevokeApiToken();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedApiToken | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(trimmed, {
      onSuccess: (token) => {
        setCreated(token);
        setName("");
      },
    });
  }

  return (
    <>
      <ClaudeConnectorHint />
      {created && <NewToken created={created} onDone={() => setCreated(null)} />}

      {tokens.isPending && (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Carregando tokens…
        </div>
      )}
      {tokens.isError && <p className="p-4 text-sm text-destructive">{tokens.error.message}</p>}

      {tokens.data?.map((t) => (
        <div key={t.id} className="flex items-center gap-3 p-4">
          <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{t.prefix}…</span> · {lastUsed(t.lastUsedAt)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Revogar ${t.name}`}
            disabled={revoke.isPending && revoke.variables === t.id}
            onClick={() => revoke.mutate(t.id)}
          >
            <Trash2Icon />
            Revogar
          </Button>
        </div>
      ))}
      {tokens.data?.length === 0 && !created && (
        <p className="p-4 text-sm text-muted-foreground">Nenhum token criado ainda.</p>
      )}
      {revoke.isError && <p className="px-4 pb-3 text-sm text-destructive">{revoke.error.message}</p>}

      <form onSubmit={submit} className="space-y-2 p-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do token (ex.: Claude Code no notebook)"
            maxLength={60}
            aria-label="Nome do novo token"
          />
          <Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>
            {create.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
            Criar
          </Button>
        </div>
        {create.isError && <p className="text-sm text-destructive">{create.error.message}</p>}
      </form>
    </>
  );
}
