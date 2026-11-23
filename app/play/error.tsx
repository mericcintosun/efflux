"use client";

import Link from "next/link";
import { ErrorState } from "@/components/route-states";
import { Button } from "@/components/ui/button";

// Simulator error surface. The error itself is never printed: no message, no stack.
export default function PlayError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <ErrorState
        title="The simulator could not load its tokens."
        body="CoinMarketCap or our server did not answer in time. Try again; the sample tokens come back from the bundled snapshot if the live call still fails."
        onRetry={reset}
      >
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/play">Start the simulator fresh</Link>
        </Button>
      </ErrorState>
    </div>
  );
}
