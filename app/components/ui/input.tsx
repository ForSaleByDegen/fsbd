import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-black/30 backdrop-blur-sm px-3 py-2 text-sm text-[#00ff00] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#660099] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] focus-visible:ring-offset-2 focus-visible:border-[#00ff00] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
