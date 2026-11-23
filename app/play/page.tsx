import type { Metadata } from "next";
import { PlayDesk, type PlayInitial } from "@/components/play-desk";
import { DEFAULT_HOLDING_USD, findToken, tokens, type Platform } from "@/lib/data";

export const metadata: Metadata = {
  title: "Exit simulator",
  description: "Paste a Base, BNB Chain or Solana token and see what a sale pays after price impact, sell tax, LP drain and the whales ahead of you.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function clampNumber(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? Math.min(max, Math.max(min, n)) : fallback;
}

// The free-form tool without the narrative. Every control is mirrored in the
// URL by "Copy a link to this result", so a shared link reopens the same exit.
export default async function PlayPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const platform = one(sp.platform);
  const initial: PlayInitial = {
    slug: findToken(one(sp.token))?.slug ?? tokens[0].slug,
    holdingUsd: clampNumber(one(sp.usd), DEFAULT_HOLDING_USD, 1, 10_000_000),
    ahead: clampNumber(one(sp.ahead), 0, 0, 10),
    applyTax: one(sp.tax) !== "0",
    applyDrain: one(sp.drain) === "1",
    platform: platform === "base" || platform === "bsc" || platform === "solana" ? (platform as Platform) : undefined,
    address: one(sp.address),
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <h1 className="efflux-wipe max-w-[20ch] text-3xl leading-tight md:text-5xl">How much of it can you actually take out?</h1>
      <p className="mt-5 max-w-[65ch] text-lg">
        Enter what your wallet shows, then move the queue. Efflux sells the largest real holders into the token&apos;s pools first,
        then sells yours, and tells you what arrives.
      </p>
      <div className="mt-12">
        <PlayDesk initial={initial} />
      </div>
    </div>
  );
}
