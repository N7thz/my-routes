"use client"

import * as React from "react"
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@ui-sdk/react/menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import { floatingClassName } from "@/components/ui/popover"
import { asChildProps } from "@/components/ui/slot"

type WithClassName<T> = Omit<T, "className"> & { className?: string }

const DropdownMenu = Menu
const DropdownMenuGroup = MenuGroup
const DropdownMenuSub = MenuSub
const DropdownMenuRadioGroup = MenuRadioGroup

function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuTrigger>> & { asChild?: boolean; children?: React.ReactNode }) {
  return <MenuTrigger {...props} {...asChildProps(asChild, children)} />
}

const itemClassName =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuContent>>) {
  return (
    <MenuContent
      sideOffset={sideOffset}
      className={cn(
        floatingClassName,
        "max-h-(--available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden p-1",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuSubTrigger>> & { inset?: boolean; children?: React.ReactNode }) {
  return (
    <MenuSubTrigger className={cn(itemClassName, "data-open:bg-accent", inset && "pl-8", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </MenuSubTrigger>
  )
}

function DropdownMenuSubContent({ className, ...props }: WithClassName<React.ComponentProps<typeof MenuSubContent>>) {
  return (
    <MenuSubContent
      className={cn(floatingClassName, "min-w-[8rem] overflow-hidden p-1 shadow-lg", className)}
      {...props}
    />
  )
}

type DropdownMenuItemProps = Omit<WithClassName<React.ComponentProps<typeof MenuItem>>, "onClick"> & {
  inset?: boolean
  // O ui-sdk dispara `onSelect` para clique e teclado; o `onClick` antigo vira ele.
  onClick?: (event: Event) => unknown
}

function DropdownMenuItem({ className, inset, onClick, onSelect, ...props }: DropdownMenuItemProps) {
  return (
    <MenuItem
      className={cn(itemClassName, inset && "pl-8", className)}
      onSelect={(event) => {
        onSelect?.(event)
        return onClick?.(event)
      }}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuCheckboxItem>> & { children?: React.ReactNode }) {
  return (
    <MenuCheckboxItem className={cn(itemClassName, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenuItemIndicator>
          <Check className="h-4 w-4" />
        </MenuItemIndicator>
      </span>
      {children}
    </MenuCheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuRadioItem>> & { children?: React.ReactNode }) {
  return (
    <MenuRadioItem className={cn(itemClassName, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenuItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </MenuItemIndicator>
      </span>
      {children}
    </MenuRadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuGroupLabel>> & { inset?: boolean }) {
  return <MenuGroupLabel className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />
}

function DropdownMenuSeparator({ className, ...props }: WithClassName<React.ComponentProps<typeof MenuSeparator>>) {
  return <MenuSeparator className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
