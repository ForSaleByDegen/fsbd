import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-black/30 backdrop-blur-sm px-3 py-2 text-sm text-[#00ff00] ring-offset-background placeholder:text-purple-readable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] focus-visible:ring-offset-2 focus-visible:border-[#00ff00] disabled:cursor-not-allowed disabled:opacity-50",
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
