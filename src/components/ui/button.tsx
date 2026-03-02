import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coor-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-coor-blue-500 text-white shadow-sm hover:bg-coor-blue-600 active:bg-coor-blue-700",
        secondary:
          "bg-muted text-foreground shadow-sm hover:bg-muted/80 active:bg-muted/70",
        outline:
          "border border-border bg-background text-foreground shadow-sm hover:bg-muted active:bg-muted/80",
        ghost:
          "text-foreground hover:bg-muted active:bg-muted/80",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 active:bg-destructive/80",
        link:
          "text-coor-blue-500 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-md px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-11 min-h-[44px] rounded-md px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentPropsWithRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export type { ButtonProps }
