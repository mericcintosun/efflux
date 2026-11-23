import type { Metadata } from "next";
import Link from "next/link";
import { PoolSceneFrame } from "@/components/pool-scene-frame";
import { EmptyState } from "@/components/route-states";
import { SceneSlot } from "@/components/scene-slot";
import { StoryScroll } from "@/components/story-scroll";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = {
  title: "Story: what selling your DEX token actually pays",
};

// No searchParams here, so the story is an ISR page: the demo token list is
// rebuilt at most once a minute, matching the 60 s CoinMarketCap cache.
export const revalidate = 60;

// Home route: L5 bands. Full-width bands alternate ground and surface, each one
// sentence plus one artifact; the "Your turn" chapter inside StoryScroll is the
// CTA band. No columns inside a band, no cards inside a band.
// Tokens arrive through the adapter seam (ADAPTER_MODE), never from a seed import.
export default async function Home() {
  const { data, source } = await getAdapter().listTokens();
  const list = data ?? [];
  const story = list[0];

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
          <div className="efflux-wipe-group">
            <h1 className="efflux-wipe max-w-[16ch] text-4xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Your wallet says $5,000. The pool decides what you get.
            </h1>
            <p className="efflux-wipe mt-6 max-w-[62ch] text-lg">
              Efflux reads a token&apos;s real pools and biggest holders from the CoinMarketCap DEX API, then works out what a sale pays
              today, and what is left if the whales get out first.
            </p>
          </div>
          <div className="mt-12">
            {story ? (
              <PoolSceneFrame token={story} />
            ) : (
              // Empty branch: the adapter returned no token, so there is no pool to draw.
              <EmptyState
                className="max-w-4xl"
                title="No token is loaded yet."
                body="Neither CoinMarketCap nor the bundled snapshot gave the story a token to sell. The simulator still takes any address."
                href="/play"
                cta="Open the simulator"
              />
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2 className="efflux-wipe-view max-w-[26ch] text-2xl leading-tight md:text-4xl">
            Market value assumes the pool can pay it; in a pool holding $300,000, a $20,000 sale already loses about 12% before
            any tax.
          </h2>
          <div className="mt-12 max-w-4xl">
            <SceneSlot
              n={2}
              alt="Three liquidity pools of different heights drained to low levels, with a line of large holder blocks standing ahead of one small magenta block"
              width={960}
              height={640}
            />
          </div>
        </div>
      </section>

      <StoryScroll tokens={list} source={source} />

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2 className="efflux-wipe-view max-w-[26ch] text-2xl leading-tight md:text-4xl">
            Every number above comes from five CoinMarketCap DEX endpoints, called without an API key.
          </h2>
          <div className="mt-12 max-w-4xl">
            <SceneSlot
              n={3}
              alt="A descending staircase of flat bars, from a tall ink bar for the wallet value down to a short magenta bar for the cash that arrives"
              width={960}
              height={640}
            />
          </div>
          <p className="mt-8 text-base">
            <Link href="/notes" className="font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground">
              Read the method, the endpoint list and a real request with its response
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
