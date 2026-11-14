"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailPlusIcon, UnlinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { linkSocial, unlinkAccount } from "@/lib/auth-client";

export type LinkedAccount = {
  id: string;
  providerId: string;
  accountId: string;
  email: string | null;
  primary: boolean;
};

const PROVIDER_LABEL: Record<string, string> = { google: "Google", notion: "Notion" };

export function LinkEmailButton() {
  const [pending, setPending] = useState(false);

  async function link() {
    setPending(true);
    try {
      await linkSocial({ provider: "google", callbackURL: "/perfil", errorCallbackURL: "/perfil" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={link} disabled={pending}>
      <MailPlusIcon />
      Vincular e-mail
    </Button>
  );
}

export function UnlinkAccountButton({ account, disabled }: { account: LinkedAccount; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = account.email ?? PROVIDER_LABEL[account.providerId] ?? account.providerId;

  async function unlink() {
    setPending(true);
    setError(null);
    const { error } = await unlinkAccount({
      providerId: account.providerId,
      accountId: account.accountId,
    });
    setPending(false);
    if (error) {
      // A rota exige sessão recente: depois de 1 dia logado, pede para entrar de novo.
      setError(
        error.status === 403
          ? "Por segurança, saia e entre de novo antes de desvincular."
          : (error.message ?? "Não foi possível desvincular."),
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={disabled || pending}>
            <UnlinkIcon />
            {pending ? "Desvinculando…" : "Desvincular"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse login deixa de entrar na sua conta. Suas empresas e rotas continuam aqui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={unlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="max-w-56 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
