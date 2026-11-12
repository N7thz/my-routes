"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLinkIcon,
  FolderIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  BuildingIcon,
  LayoutIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  GitBranchIcon,
} from "lucide-react";
import { useRunrunitComments } from "@/hooks/use-runrunit-comments";
import { extractAddress } from "@/lib/address-utils";
import { formatDate } from "@/lib/dates";
import {
  OVERDUE_BADGE,
  formatEstimate,
  runrunitTaskUrl,
  type RunrunitTask,
} from "@/lib/runrunit";
import { MapPinIcon } from "lucide-react";

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return formatDate(iso);
}

function AddressMap({ address }: { address: string }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=pt-BR`;
  return (
    <div className="mt-2 rounded-md overflow-hidden border border-border">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground">
        <MapPinIcon className="size-3 shrink-0" />
        <span className="truncate">{address}</span>
      </div>
      <iframe
        src={src}
        width="100%"
        height="200"
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Mapa: ${address}`}
      />
    </div>
  );
}

function CommentsSection({ taskId }: { taskId: number }) {
  const { data: comments, isLoading } = useRunrunitComments(taskId);
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!comments?.length) {
    return <p className="text-sm text-muted-foreground">Sem comentários.</p>;
  }

  const userComments = comments.filter((c) => !c.is_system_message && !c.is_automation_message);
  const history = comments.filter((c) => c.is_system_message || c.is_automation_message);

  return (
    <div className="flex flex-col gap-4">
      {userComments.length === 0 && (
        <p className="text-sm text-muted-foreground">Sem comentários de usuário.</p>
      )}

      {userComments.map((c) => {
        const address = extractAddress(c.text);
        return (
          <div key={c.id} className="flex gap-2 items-start">
            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {(c.commenter_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium">{c.commenter_name ?? "Usuário"}</span>
                <span className="text-xs text-muted-foreground">{formatRelative(c.created_at)}</span>
              </div>
              {c.quoted_comment_text && (
                <blockquote className="border-l-2 border-muted pl-2 text-xs text-muted-foreground italic mb-1">
                  {c.quoted_comment_user_name && (
                    <span className="not-italic font-medium">{c.quoted_comment_user_name}: </span>
                  )}
                  <span dangerouslySetInnerHTML={{ __html: c.quoted_comment_text }} />
                </blockquote>
              )}
              <div
                className="rr-comment text-sm bg-muted/50 rounded-md px-3 py-2 break-words"
                dangerouslySetInnerHTML={{ __html: c.text }}
              />
              {address && <AddressMap address={address} />}
            </div>
          </div>
        );
      })}

      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDownIcon
              className={`size-3 transition-transform ${showHistory ? "rotate-180" : ""}`}
            />
            {showHistory ? "Ocultar" : "Ver"} histórico ({history.length})
          </button>
          {showHistory && (
            <div className="flex flex-col gap-1 mt-2 pl-2 border-l border-border">
              {history.map((c) => (
                <p key={c.id} className="text-xs text-muted-foreground">
                  <span className="text-muted-foreground/60">{formatRelative(c.created_at)} — </span>
                  {c.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  task: RunrunitTask | null;
  onClose: () => void;
};

export function RunrunitTaskSheet({ task, onClose }: Props) {
  const overdueBadge = OVERDUE_BADGE[task?.overdue ?? "on_schedule"];

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 overflow-y-auto w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {task?.is_closed && <Badge variant="secondary">Encerrada</Badge>}
            {task?.is_urgent && !task.is_closed && <Badge variant="destructive">Urgente</Badge>}
            {!task?.is_closed && overdueBadge && (
              <Badge variant={overdueBadge.variant}>{overdueBadge.label}</Badge>
            )}
            {task?.type_name && <Badge variant="outline">{task.type_name}</Badge>}
          </div>
          <SheetTitle className="text-base leading-snug">{task?.title}</SheetTitle>
        </SheetHeader>

        <Separator />

        <div className="flex flex-col gap-4 py-4">
          {task?.parent_task_title && (
            <Row icon={<GitBranchIcon className="size-4 text-muted-foreground" />} label="Tarefa raiz">
              {task.parent_task_title}
            </Row>
          )}

          {task?.board_stage_name && (
            <Row icon={<LayoutIcon className="size-4 text-muted-foreground" />} label="Estágio">
              <span>
                {task.board_name && <span className="text-muted-foreground">{task.board_name} / </span>}
                {task.board_stage_name}
              </span>
            </Row>
          )}
          {task?.client_name && (
            <Row icon={<BuildingIcon className="size-4 text-muted-foreground" />} label="Cliente">
              {task.client_name}
            </Row>
          )}
          {task?.project_name && (
            <Row icon={<FolderIcon className="size-4 text-muted-foreground" />} label="Projeto">
              {task.project_name}
            </Row>
          )}
          {task?.responsible_name && (
            <Row icon={<UserIcon className="size-4 text-muted-foreground" />} label="Responsável">
              {task.responsible_name}
            </Row>
          )}
          {task?.desired_date && (
            <Row icon={<CalendarIcon className="size-4 text-muted-foreground" />} label="Data planejada">
              {formatDate(task.desired_date)}
            </Row>
          )}
          {task?.scheduled_start_time && (
            <Row icon={<CalendarIcon className="size-4 text-muted-foreground" />} label="Agendado">
              {formatDate(task.scheduled_start_time)} às {formatTime(task.scheduled_start_time)}
              {task.gantt_bar_end_date && <> – {formatTime(task.gantt_bar_end_date)}</>}
            </Row>
          )}
          {task?.current_estimate_seconds ? (
            <Row icon={<ClockIcon className="size-4 text-muted-foreground" />} label="Estimativa">
              {formatEstimate(task.current_estimate_seconds)}
            </Row>
          ) : null}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareIcon className="size-4" />
            Comentários
          </div>
          {task && <CommentsSection taskId={task.id} />}
        </div>

        <Separator />

        <div className="pt-4">
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href={task ? runrunitTaskUrl(task.id) : undefined} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-4" />
              Ver no Runrunit
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm">{children}</span>
      </div>
    </div>
  );
}
