"use client"

import * as React from "react"
import {
  Dialog as DialogPrimitive,
  DialogBackdrop,
  DialogClose as DialogClosePrimitive,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogTrigger as DialogTriggerPrimitive,
} from "@ui-sdk/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { asChildProps } from "@/components/ui/slot"

type WithClassName<T> = Omit<T, "className"> & { className?: string }
type AsChild = { asChild?: boolean; children?: React.ReactNode }

const Dialog = DialogPrimitive

function DialogTrigger({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogTriggerPrimitive>> & AsChild) {
  return <DialogTriggerPrimitive {...props} {...asChildProps(asChild, children)} />
}

function DialogClose({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogClosePrimitive>> & AsChild) {
  return <DialogClosePrimitive {...props} {...asChildProps(asChild, children)} />
}

const overlayClassName =
  "fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0"

const popupClassName =
  "fixed inset-0 z-50 m-auto grid h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg gap-4 overflow-y-auto overscroll-contain rounded-lg border bg-popover p-6 text-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-200 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"

const closeButtonClassName =
  "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"

function DialogOverlay({ className, ...props }: WithClassName<React.ComponentProps<typeof DialogBackdrop>>) {
  return <DialogBackdrop className={cn(overlayClassName, className)} {...props} />
}

function DialogContent({
  className,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogContentPrimitive>> & { children?: React.ReactNode }) {
  return (
    <>
      <DialogOverlay />
      <DialogContentPrimitive className={cn(popupClassName, className)} {...props}>
        {children}
        <DialogClosePrimitive aria-label="Fechar" className={closeButtonClassName}>
          <X className="h-4 w-4" />
        </DialogClosePrimitive>
      </DialogContentPrimitive>
    </>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: WithClassName<React.ComponentProps<typeof DialogTitlePrimitive>>) {
  return (
    <DialogTitlePrimitive
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogDescriptionPrimitive>>) {
  return <DialogDescriptionPrimitive className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export {
  Dialog,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  overlayClassName,
  popupClassName,
  closeButtonClassName,
}
