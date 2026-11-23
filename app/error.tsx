"use client";

import Link from "next/link";
import { ErrorState } from "@/components/route-states";
import { Button } from "@/components/ui/button";

// Route error surface. The error itself is never printed: no message, no stack.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <ErrorState
          title="This page could not finish its sums."
          body="Try again, or go back to the story and start from the top."
          onRetry={reset}
        >
          <Button asChild variant="outline">
            <Link href="/">Back to the story</Link>
          </Button>
        </ErrorState>
      </div>
    </section>
  );
}
