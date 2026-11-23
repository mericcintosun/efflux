import type { Metadata } from "next";
import { PlayDesk, type PlayInitial } from "@/components/play-desk";
import { getAdapter, lookupWithinBudget } from "@/lib/adapter";
import { DEFAULT_HOLDING_USD, type ApiEnvelope, type TokenSnapshot } from "@/lib/data";
import { playQuerySchema } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Simulator",
  description: "Paste a Base, BNB Chain or Solana token and see what a sale pays after price impact, sell tax, LP drain and the whales ahead of you.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// The free-form tool without the narrative, in the same band rhythm as the home
// route: a GROUND title band, then the desk's own bands (pick on SURFACE, result
// on GROUND, queue on SURFACE). Every control is mirrored in the URL by "Copy a
// link to this result", so a shared link reopens the same exit. This page reads
// searchParams, so it stays dynamic and relies on the 60 s fetch cache in
// lib/cmc.ts. A shared link with platform and address resolves here on the
// server (initialLookup), never through a client effect.
export default async function PlayPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const parsed = playQuerySchema.safeParse({
    token: one(sp.token),
    usd: one(sp.usd),
    ahead: one(sp.ahead),
    tax: one(sp.tax),
    drain: one(sp.drain),
    platform: one(sp.platform),
    address: one(sp.address),
  });
  const q = parsed.success
    ? parsed.data
    : { token: undefined, usd: DEFAULT_HOLDING_USD, ahead: 0, tax: true, drain: false, platform: undefined, address: undefined, lookup: undefined };

  const [list, initialLookup] = await Promise.all([
    getAdapter().listTokens(),
    q.lookup ? lookupWithinBudget(q.lookup.platform, q.lookup.address) : Promise.resolve<ApiEnvelope<TokenSnapshot> | undefined>(undefined),
  ]);
  const samples = list.data ?? [];
  const initial: PlayInitial = {
    slug: samples.find((t) => t.slug === q.token)?.slug ?? samples[0]?.slug ?? "",
    holdingUsd: q.usd,
    ahead: q.ahead,
    applyTax: q.tax,
    applyDrain: q.drain,
    platform: q.platform,
    address: q.address,
  };

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20">
          <h1 className="efflux-wipe max-w-[18ch] text-4xl leading-[1.04] sm:text-5xl lg:text-6xl">How much of it can you actually take out?</h1>
          <p className="mt-6 max-w-[60ch] text-lg">
            Enter what your wallet shows and move the queue: Efflux sells the largest real holders into the pools first, then yours.
          </p>
        </div>
      </section>
      <PlayDesk initial={initial} samples={samples} samplesSource={list.source} samplesProof={list.proof} initialLookup={initialLookup} />
    </>
  );
}
