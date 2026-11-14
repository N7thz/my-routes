import * as React from "react"
import { Separator as SeparatorPrimitive } from "@ui-sdk/react/separator"

import { cn } from "@/lib/utils"

type SeparatorProps = Omit<React.ComponentProps<typeof SeparatorPrimitive>, "className"> & {
  className?: string
}

function Separator({ className, orientation = "horizontal", decorative = true, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
