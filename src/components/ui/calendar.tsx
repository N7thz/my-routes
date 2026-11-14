"use client"

import * as React from "react"
import {
  Calendar as CalendarPrimitive,
  CalendarDay,
  CalendarGrid,
  CalendarMonthSelect,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
  CalendarYearSelect,
} from "@ui-sdk/react/calendar"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = Omit<React.ComponentProps<typeof CalendarPrimitive>, "className"> & {
  className?: string
}

const navClassName = cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-(--cell-size) disabled:opacity-40")

const selectClassName =
  "h-8 rounded-md border border-input bg-background px-2 text-sm font-medium capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function Calendar({ className, locale = "pt-BR", ...props }: CalendarProps) {
  return (
    <CalendarPrimitive
      locale={locale}
      className={cn("flex flex-col gap-3 p-3 [--cell-size:2.25rem]", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <CalendarPrevious aria-label="Mês anterior" className={navClassName}>
          <ChevronLeft />
        </CalendarPrevious>
        <div className="flex items-center gap-2">
          <CalendarMonthSelect aria-label="Mês" className={selectClassName} />
          <CalendarYearSelect aria-label="Ano" className={selectClassName} />
        </div>
        <CalendarNext aria-label="Próximo mês" className={navClassName}>
          <ChevronRight />
        </CalendarNext>
      </div>
      <CalendarGrid className="w-full border-collapse">
        <CalendarWeekdays>
          {(index) => (
            <CalendarWeekday
              index={index}
              className="size-(--cell-size) text-[0.8rem] font-normal capitalize text-muted-foreground"
            />
          )}
        </CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => (
            <CalendarDay
              value={cell.date}
              className="size-(--cell-size) cursor-pointer rounded-full text-center text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-today:font-bold data-outside:text-muted-foreground/50 data-selected:bg-primary data-selected:text-primary-foreground data-disabled:pointer-events-none data-disabled:opacity-40 data-unavailable:line-through"
            />
          )}
        </CalendarWeeks>
      </CalendarGrid>
    </CalendarPrimitive>
  )
}

export { Calendar }
