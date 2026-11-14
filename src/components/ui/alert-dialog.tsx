"use client"

import * as React from "react"
import {
  AlertDialog as AlertDialogPrimitive,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent as AlertDialogContentPrimitive,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  AlertDialogTitle as AlertDialogTitlePrimitive,
  AlertDialogTrigger as AlertDialogTriggerPrimitive,
} from "@ui-sdk/react/alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { overlayClassName, popupClassName } from "@/components/ui/dialog"
import { asChildProps } from "@/components/ui/slot"

type WithClassName<T> = Omit<T, "className"> & { className?: string }
type AsChild = { asChild?: boolean; children?: React.ReactNode }

const AlertDialog = AlertDialogPrimitive

function AlertDialogTrigger({
  asChild,
  children,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogTriggerPrimitive>> & AsChild) {
  return <AlertDialogTriggerPrimitive {...props} {...asChildProps(asChild, children)} />
}

function AlertDialogOverlay({ className, ...props }: WithClassName<React.ComponentProps<typeof AlertDialogBackdrop>>) {
  return <AlertDialogBackdrop className={cn(overlayClassName, className)} {...props} />
}

function AlertDialogContent({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogContentPrimitive>>) {
  return (
    <>
      <AlertDialogOverlay />
      <AlertDialogContentPrimitive className={cn(popupClassName, className)} {...props} />
    </>
  )
}

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogTitlePrimitive>>) {
  return <AlertDialogTitlePrimitive className={cn("text-lg font-semibold", className)} {...props} />
}

function AlertDialogDescription({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogDescriptionPrimitive>>) {
  return (
    <AlertDialogDescriptionPrimitive className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

function AlertDialogAction({ className, ...props }: WithClassName<React.ComponentProps<typeof AlertDialogClose>>) {
  return <AlertDialogClose value="confirm" className={cn(buttonVariants(), className)} {...props} />
}

function AlertDialogCancel({ className, ...props }: WithClassName<React.ComponentProps<typeof AlertDialogClose>>) {
  return (
    <AlertDialogClose
      value="cancel"
      className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
}
