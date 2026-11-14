"use client"

import * as React from "react"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@ui-sdk/react/drawer"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { closeButtonClassName } from "@/components/ui/dialog"
import { asChildProps } from "@/components/ui/slot"

type WithClassName<T> = Omit<T, "className"> & { className?: string }
type AsChild = { asChild?: boolean; children?: React.ReactNode }
type SheetSide = "top" | "bottom" | "left" | "right"

const SheetSideContext = React.createContext<SheetSide>("right")

// O ui-sdk define o lado na raiz; o SheetContent lê daqui para escolher o estilo.
function Sheet({
  side = "right",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Drawer>, "side"> & { side?: SheetSide }) {
  return (
    <Drawer side={side} {...props}>
      <SheetSideContext.Provider value={side}>{children}</SheetSideContext.Provider>
    </Drawer>
  )
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof DrawerTrigger>> & AsChild) {
  return <DrawerTrigger {...props} {...asChildProps(asChild, children)} />
}

function SheetClose({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof DrawerClose>> & AsChild) {
  return <DrawerClose {...props} {...asChildProps(asChild, children)} />
}

function SheetOverlay({ className, ...props }: WithClassName<React.ComponentProps<typeof DrawerBackdrop>>) {
  return <DrawerBackdrop className={cn("fixed inset-0 z-50 bg-black/80", className)} {...props} />
}

const sheetVariants = cva(
  "relative flex flex-col gap-4 bg-popover p-6 text-popover-foreground shadow-lg outline-none",
  {
    variants: {
      side: {
        top: "max-h-[85dvh] w-full border-b",
        bottom: "max-h-[85dvh] w-full border-t",
        left: "h-full w-3/4 border-r sm:max-w-sm",
        right: "h-full w-3/4 border-l sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

type SheetContentProps = WithClassName<React.ComponentProps<typeof DrawerContent>> &
  VariantProps<typeof sheetVariants> & { children?: React.ReactNode }

// O Drawer só move pelo `side` do Sheet; aqui o `side` muda apenas o estilo.
function SheetContent({ side: sideProp, className, children, ...props }: SheetContentProps) {
  const rootSide = React.useContext(SheetSideContext)
  const side = sideProp ?? rootSide
  return (
    <>
      <SheetOverlay />
      <DrawerContent className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <DrawerClose aria-label="Fechar" className={closeButtonClassName}>
          <X className="h-4 w-4" />
        </DrawerClose>
      </DrawerContent>
    </>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: WithClassName<React.ComponentProps<typeof DrawerTitle>>) {
  return <DrawerTitle className={cn("text-lg font-semibold text-foreground", className)} {...props} />
}

function SheetDescription({ className, ...props }: WithClassName<React.ComponentProps<typeof DrawerDescription>>) {
  return <DrawerDescription className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export {
  Sheet,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
