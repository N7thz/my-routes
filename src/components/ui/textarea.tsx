import * as React from "react"
import { Textarea as TextareaPrimitive } from "@ui-sdk/react/textarea"

import { cn } from "@/lib/utils"

type TextareaProps = Omit<React.ComponentProps<typeof TextareaPrimitive>, "className"> & {
  className?: string
}

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <TextareaPrimitive
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
