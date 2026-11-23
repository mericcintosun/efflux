"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Route error surface. The error itself is never printed: no message, no stack.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-16 md:px-8 md:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Efflux</p>
        <h1 className="max-w-[20ch] text-3xl leading-tight md:text-5xl">This page could not finish its sums.</h1>
        <p className="max-w-[60ch] text-lg">Try again, or go back to the story and start from the top.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the story</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
