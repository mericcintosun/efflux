import * as React from "react";
import { cn } from "@/lib/utils";

// Range control in the shadcn primitive shape. Track and thumb styling lives in
// app/globals.css under .efflux-range (pseudo-elements cannot be utilities).
function Slider({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return <input type="range" className={cn("efflux-range", className)} {...props} />;
}

export { Slider };
