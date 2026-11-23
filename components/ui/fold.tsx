import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// D2 disclosure: a native <details> with a one-line summary. No border and no
// card; a flat SURFACE summary row with a sharp corner and an INK focus outline.
function Fold({
  summary,
  className,
  summaryClassName,
  children,
  ...props
}: Omit<React.ComponentProps<"details">, "children"> & {
  summary: React.ReactNode;
  summaryClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={cn("group", className)} {...props}>
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xs bg-surface px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&::-webkit-details-marker]:hidden",
          summaryClassName
        )}
      >
        <span>{summary}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

export { Fold };
