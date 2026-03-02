import { Toaster as SonnerToaster } from "sonner"
import type { ComponentProps } from "react"

type ToasterProps = ComponentProps<typeof SonnerToaster>

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group border-border bg-background text-foreground shadow-lg rounded-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          actionButton:
            "bg-coor-blue-500 text-white hover:bg-coor-blue-600",
          cancelButton:
            "bg-muted text-muted-foreground hover:bg-muted/80",
          success:
            "border-coor-green-500/30 text-coor-green-700",
          error:
            "border-destructive/30 text-destructive",
          warning:
            "border-coor-orange-500/30 text-coor-orange-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
