"use client"

import * as React from "react"
import {
  Popover as PopoverPrimitive,
  PopoverContent as PopoverContentPrimitive,
  PopoverTrigger as PopoverTriggerPrimitive,
} from "@ui-sdk/react/popover"

import { cn } from "@/lib/utils"
import { asChildProps } from "@/components/ui/slot"

type WithClassName<T> = Omit<T, "className"> & { className?: string }

const Popover = PopoverPrimitive

function PopoverTrigger({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof PopoverTriggerPrimitive>> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <PopoverTriggerPrimitive {...props} {...asChildProps(asChild, children)} />
}

const floatingClassName =
  "z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: WithClassName<React.ComponentProps<typeof PopoverContentPrimitive>>) {
  return (
    <PopoverContentPrimitive
      align={align}
      sideOffset={sideOffset}
      className={cn(floatingClassName, "w-72 p-4", className)}
      {...props}
    />
  )
}

export { Popover, PopoverTrigger, PopoverContent, floatingClassName }
