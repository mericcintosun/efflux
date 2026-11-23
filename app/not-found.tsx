import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-16 md:px-8 md:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Efflux</p>
        <h1 className="max-w-[20ch] text-3xl leading-tight md:text-5xl">There is no page at this address.</h1>
        <p className="max-w-[60ch] text-lg">The story, the simulator and the notes are all one click away.</p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/">Back to Efflux</Link>
        </Button>
      </div>
    </section>
  );
}
