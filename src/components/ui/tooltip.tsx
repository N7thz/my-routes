"use client"

import * as React from "react"
import {
  Tooltip as TooltipPrimitive,
  TooltipContent as TooltipContentPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "@ui-sdk/react/tooltip"

import { cn } from "@/lib/utils"
import { asChildProps } from "@/components/ui/slot"

type WithClassName<T> = Omit<T, "className"> & { className?: string }

const Tooltip = TooltipPrimitive

function TooltipTrigger({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof TooltipTriggerPrimitive>> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <TooltipTriggerPrimitive {...props} {...asChildProps(asChild, children)} />
}

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: WithClassName<React.ComponentProps<typeof TooltipContentPrimitive>>) {
  return (
    <TooltipContentPrimitive
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md origin-(--transform-origin) transition-[opacity,scale] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipTrigger, TooltipContent }
