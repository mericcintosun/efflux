import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Solid flat tags with sharp corners. Semantic variants mark state only.
const badgeVariants = cva(
  "inline-flex items-center rounded-xs px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-deep text-foreground",
        outline: "border border-foreground text-foreground",
        destructive: "bg-bad text-background",
        ok: "bg-ok text-background",
        warn: "bg-warn text-background",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
