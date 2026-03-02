import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaProps = React.ComponentPropsWithRef<"textarea"> & {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coor-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
export type { TextareaProps }
