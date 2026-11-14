import * as React from "react"
import { Input as InputPrimitive } from "@ui-sdk/react/input"

import { cn } from "@/lib/utils"

type InputProps = Omit<React.ComponentProps<typeof InputPrimitive>, "className"> & {
  className?: string
}

function Input({ className, ...props }: InputProps) {
  return (
    <InputPrimitive
      className={cn(
        "flex h-10 w-full rounded-full border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
