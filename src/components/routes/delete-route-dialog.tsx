"use client";

import { useDeleteRoute } from "@/hooks/use-routes";
import type { RouteRecord } from "@/lib/route-service";
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

export function DeleteRouteDialog({ route, onClose }: { route: RouteRecord | null; onClose: () => void }) {
  const del = useDeleteRoute();
  return (
    <AlertDialog open={!!route} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir rota?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{route?.name}</strong> e todas as suas paradas serão removidas permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending}
            onClick={async () => {
              if (route) {
                await del.mutateAsync(route.id);
                onClose();
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {del.isPending ? "Excluindo…" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
