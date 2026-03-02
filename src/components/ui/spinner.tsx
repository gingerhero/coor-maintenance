import { cn } from "@/lib/utils"

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "sm" | "default" | "lg"
}

const sizeMap = {
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-8 w-8",
} as const

function Spinner({ className, size = "default", ...props }: SpinnerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin text-coor-blue-500", sizeMap[size], className)}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export { Spinner }
export type { SpinnerProps }
