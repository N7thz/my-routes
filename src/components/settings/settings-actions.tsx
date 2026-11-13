"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, LinkIcon, LogOutIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-sign-out";
import { linkSocial } from "@/lib/auth-client";

/** Conecta (ou reconecta, para renovar escopos) uma conta OAuth à sessão atual. */
export function ConnectButton({
  provider,
  connected,
}: {
  provider: "google" | "notion";
  connected: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    try {
      await linkSocial({ provider, callbackURL: "/perfil" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant={connected ? "ghost" : "outline"} size="sm" onClick={connect} disabled={pending}>
      {connected ? <RefreshCwIcon /> : <LinkIcon />}
      {connected ? "Reconectar" : "Conectar"}
    </Button>
  );
}

/** Apaga o cache offline (React Query persistido no localStorage). */
export function ClearCacheButton() {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);

  function clear() {
    queryClient.clear();
    try {
      window.localStorage.removeItem("my-routes-cache");
    } catch {
      // armazenamento indisponível: nada a limpar
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={clear} disabled={done}>
      {done ? <CheckIcon /> : <Trash2Icon />}
      {done ? "Cache limpo" : "Limpar cache"}
    </Button>
  );
}

export function SignOutButton() {
  const signOut = useSignOut();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await signOut();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleSignOut} disabled={pending}>
      <LogOutIcon />
      Sair da conta
    </Button>
  );
}
