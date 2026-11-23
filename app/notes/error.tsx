"use client";

import Link from "next/link";
import { ErrorState } from "@/components/route-states";
import { Button } from "@/components/ui/button";

// Notes error surface. The error itself is never printed: no message, no stack.
export default function NotesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <ErrorState title="The notes could not load." body="Try again, or open the simulator and run a token yourself." onRetry={reset}>
        <Button asChild variant="outline">
          <Link href="/play">Open the simulator</Link>
        </Button>
      </ErrorState>
    </div>
  );
}
