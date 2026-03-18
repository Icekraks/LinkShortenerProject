"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type LabelProps = React.ComponentProps<"label"> & {
  required?: boolean
}

function Label({ className, required = false, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      data-required={required ? "true" : undefined}
      className={cn(
        "text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
        required && "after:ml-1 after:text-destructive after:content-['*']",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  )
}

export { Label }
