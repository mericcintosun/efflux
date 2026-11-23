import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SceneSlot } from "@/components/scene-slot";
import { StoryScroll } from "@/components/story-scroll";
import { CMC_ENDPOINTS, getAdapter } from "@/lib/adapter";
import { DEFAULT_HOLDING_USD, PLATFORM_LABEL, SOURCE_LABEL, type DataSource, type TokenSnapshot } from "@/lib/data";
import { exitQuote, fmtCompactUsd, fmtPct, fmtUsd, totalLiquidityUsd } from "@/lib/simulate";

export const metadata: Metadata = {
  title: "Story: what your token really pays",
};

// Rendered per request, like /play: both routes resolve the story token through
// the same getAdapter().listTokens() call and the same 60 s CoinMarketCap fetch
// cache, so the landing never shows a build-time copy of BRETT while /play shows
// a fresher one. connection() opts into request-time rendering without turning
// the fetches into no-store (force-dynamic would), so the 60 s cache still holds.
// The 4 s LIST_BUDGET_MS in lib/config.ts bounds the wait.

/** "14:05 UTC" from the bundle's own fetch time (snapshotAt), never from the render clock. */
function utcClock(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.toISOString().slice(11, 16)} UTC`;
}

/** The source note under the hero: which data the story runs on, and when it was fetched. */
function SourceNote({ source, token }: { source: DataSource; token?: TokenSnapshot }) {
  const at = token ? utcClock(token.snapshotAt) : null;
  const text =
    source === "live" && token
      ? `${SOURCE_LABEL.live}, ${token.symbol} on ${PLATFORM_LABEL[token.platform]}${at ? `, fetched ${at}` : ""}`
      : SOURCE_LABEL[source];
  return (
    <p className="efflux-wipe mt-6 text-sm">
      <Badge variant={source === "live" ? "ok" : "secondary"} className="whitespace-normal">
        {text}
      </Badge>
    </p>
  );
}

// Home route: L5 bands, full width, alternating GROUND, SURFACE and DEEP, each
// one sentence plus one artifact. No columns and no cards inside a band, except
// the story band, where S6 puts the chapter text beside the sticky live pool.
// 1 story (GROUND)  2 problem (SURFACE)  3 cuts (GROUND)  4 API (DEEP)  5 CTA (GROUND)
// Tokens arrive through the adapter seam (ADAPTER_MODE), never from a seed import.
export default async function Home() {
  await connection();
  const { data, source } = await getAdapter().listTokens();
  const list = data ?? [];
  const story = list[0];
  // The problem sentence is computed from the same token the story sells, so every number traces to the adapter.
  const plain = story
    ? exitQuote({ token: story, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: false, applyDrain: false })
    : null;

  const intro = (
    <div className="efflux-wipe-group">
      <h1 className="efflux-wipe max-w-[16ch] text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">
        Your wallet says $5,000. The pool decides what you get.
      </h1>
      <p className="efflux-wipe mt-6 max-w-[60ch] text-lg">
        Efflux reads a token&apos;s real pools and biggest holders from the CoinMarketCap DEX API and works out what a sale pays
        today, and what is left if the whales get out first.
      </p>
      <SourceNote source={source} token={story} />
    </div>
  );

  return (
    <>
      <StoryScroll tokens={list} intro={intro} />

      <section className="bg-surface" aria-labelledby="band-problem">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <h2 id="band-problem" className="efflux-wipe-view max-w-[24ch] text-3xl leading-tight md:text-5xl">
            {story && plain
              ? `In ${story.symbol}'s ${fmtCompactUsd(totalLiquidityUsd(story))} of pools, a ${fmtUsd(DEFAULT_HOLDING_USD)} sale loses ${fmtPct(plain.lossPct)} before any tax or any whale.`
              : "Market value is price times balance; it never asks whether the pool can pay it."}
          </h2>
          <div className="efflux-wipe-view mt-14 max-w-4xl">
            <SceneSlot
              n={2}
              alt="Three liquidity pools of different heights drained to low levels, with a line of large holder blocks standing ahead of one small magenta block"
              width={960}
              height={640}
              className="mix-blend-multiply"
            />
          </div>
        </div>
      </section>

      <section className="bg-background" aria-labelledby="band-cuts">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <h2 id="band-cuts" className="efflux-wipe-view max-w-[24ch] text-3xl leading-tight md:text-5xl">
            The gap splits into four cuts: price impact, sell tax, the 24h LP drain and the wallets ahead of you.
          </h2>
          <div className="efflux-wipe-view mt-14 max-w-4xl">
            <SceneSlot
              n={3}
              alt="A descending staircase of flat bars, from a tall ink bar for the wallet value down to a short magenta bar for the cash that arrives"
              width={960}
              height={640}
            />
          </div>
        </div>
      </section>

      <section className="bg-deep" aria-labelledby="band-api">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <h2 id="band-api" className="efflux-wipe-view max-w-[24ch] text-3xl leading-tight md:text-5xl">
            Every number comes from CoinMarketCap DEX endpoints, called without an API key.
          </h2>
          <ul className="efflux-wipe-view mt-12 space-y-3 font-display text-lg leading-snug md:text-2xl">
            {CMC_ENDPOINTS.filter((e) => e.live).map((e) => (
              <li key={e.path} className="break-all sm:break-normal">
                <span className="text-muted-foreground">{e.method}</span> {e.path}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-base">
            <Link
              href="/notes"
              className="inline-flex min-h-11 items-center font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground"
            >
              Read the method and a real request with its response
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-background" aria-labelledby="band-cta">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <h2 id="band-cta" className="efflux-wipe-view max-w-[22ch] text-3xl leading-tight md:text-5xl">
            Open the simulator and paste the token you hold to see what a sale pays before you press sell.
          </h2>
          <Button asChild size="lg" className="mt-10 min-h-14 px-10 text-lg">
            <Link href="/play">Open the simulator</Link>
          </Button>
          <div className="efflux-wipe-view mt-16">
            <SceneSlot n={6} alt="A wide poster of flat blocks: a row of ink wallet blocks shrinking from left to right, then one small magenta block waiting in front of a narrow gate with a magenta lintel" width={1200} height={480} />
          </div>
        </div>
      </section>
    </>
  );
}
