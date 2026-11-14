import * as React from "react"

import { cn } from "@/lib/utils"

type AnyProps = Record<string, unknown>

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps }
  for (const key of Object.keys(slotProps)) {
    const slotValue = slotProps[key]
    const childValue = childProps[key]
    if (/^on[A-Z]/.test(key) && typeof slotValue === "function" && typeof childValue === "function") {
      merged[key] = (...args: unknown[]) => {
        childValue(...args)
        slotValue(...args)
      }
    } else if (key === "className") {
      merged.className = cn(slotValue as string, childValue as string)
    } else if (key === "style") {
      merged.style = { ...(slotValue as object), ...(childValue as object) }
    }
  }
  return merged
}

function Slot({ children, ...props }: AnyProps & { children?: React.ReactNode }) {
  if (!React.isValidElement<AnyProps>(children)) return null
  return React.cloneElement(children, mergeProps(props, children.props))
}

// Converte o `asChild` da API antiga no `render` dos componentes do ui-sdk.
function asChildProps(asChild: boolean | undefined, children: React.ReactNode) {
  if (!asChild || !React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return { children }
  }
  return {
    render: children as React.ReactElement<Record<string, unknown>>,
    children: children.props.children,
  }
}

export { Slot, asChildProps }
