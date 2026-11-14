"use client"

import * as React from "react"
import {
  Select as SelectPrimitive,
  type SelectProps as SelectPrimitiveProps,
  SelectContent as SelectContentPrimitive,
  SelectGroup as SelectGroupPrimitive,
  SelectGroupLabel as SelectGroupLabelPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectItemIndicator,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
  SelectValue as SelectValuePrimitive,
} from "@ui-sdk/react/select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type WithClassName<T> = Omit<T, "className"> & { className?: string }

type SelectProps = Omit<
  SelectPrimitiveProps<string>,
  "value" | "defaultValue" | "onValueChange" | "multiple"
> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

// Mantém a API de string do shadcn: sem seleção vira "".
function Select({ value, defaultValue, onValueChange, ...props }: SelectProps) {
  return (
    <SelectPrimitive
      value={value === undefined ? undefined : value || null}
      defaultValue={defaultValue === undefined ? undefined : defaultValue || null}
      onValueChange={(next: unknown) => onValueChange?.(typeof next === "string" ? next : "")}
      {...props}
    />
  )
}

function SelectValue(props: WithClassName<React.ComponentProps<typeof SelectValuePrimitive>>) {
  return <SelectValuePrimitive {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectTriggerPrimitive>> & { children?: React.ReactNode }) {
  return (
    <SelectTriggerPrimitive
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background data-placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown aria-hidden className="h-4 w-4 shrink-0 opacity-50" />
    </SelectTriggerPrimitive>
  )
}

function SelectContent({
  className,
  sideOffset = 4,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectContentPrimitive>>) {
  return (
    <SelectContentPrimitive
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[min(var(--available-height),24rem)] min-w-[max(8rem,var(--anchor-width))] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SelectGroup(props: WithClassName<React.ComponentProps<typeof SelectGroupPrimitive>>) {
  return <SelectGroupPrimitive {...props} />
}

function SelectLabel({ className, ...props }: WithClassName<React.ComponentProps<typeof SelectGroupLabelPrimitive>>) {
  return (
    <SelectGroupLabelPrimitive
      className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectItemPrimitive>> & { children?: React.ReactNode }) {
  return (
    <SelectItemPrimitive
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectItemIndicator>
          <Check className="h-4 w-4" />
        </SelectItemIndicator>
      </span>
      {children}
    </SelectItemPrimitive>
  )
}

function SelectSeparator({ className, ...props }: WithClassName<React.ComponentProps<typeof SelectSeparatorPrimitive>>) {
  return <SelectSeparatorPrimitive className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}
