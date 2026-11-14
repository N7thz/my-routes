"use client";

import { createParts } from "@ui-sdk/react/primitive";
import { GripVerticalIcon } from "lucide-react";
import { companyTransfer } from "@/components/companies/company-transfer-primitive";
import { cn } from "@/lib/utils";

const parts = createParts(companyTransfer, {
  root: "div",
  list: "section",
  item: "div",
  handle: "button",
});

export const CompanyTransferRoot = parts.Root;

/** Seção de grupo que recebe cartões. `value` é o id do grupo ou `NO_GROUP`. */
export function TransferGroup({ className, ...props }: React.ComponentProps<typeof parts.List>) {
  return (
    <parts.List
      {...props}
      className={cn(
        "rounded-xl outline-2 outline-offset-4 outline-transparent transition-colors",
        "data-over:bg-primary/5 data-over:outline-dashed data-over:outline-primary/50",
        className as string,
      )}
    />
  );
}

/** Cartão arrastável pela alça; o resto do cartão continua clicável e rola no toque. */
export function TransferCard({
  value,
  label,
  className,
  children,
}: {
  value: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <parts.Item
      value={value}
      className={cn(
        "group/transfer relative h-full rounded-lg transition-[opacity,box-shadow] data-dragging:opacity-40 data-grabbed:opacity-60 data-grabbed:ring-2 data-grabbed:ring-primary/50",
        "data-combining:ring-2 data-combining:ring-primary data-combining:ring-offset-2 data-combining:ring-offset-background",
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-2 z-10 mx-auto hidden w-fit rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow group-data-combining/transfer:block"
      >
        Soltar para criar grupo
      </span>
      <parts.Handle
        value={value}
        aria-label={`Mover ${label} para outro grupo`}
        className="absolute right-2 bottom-2 z-10 flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-4" />
      </parts.Handle>
    </parts.Item>
  );
}
