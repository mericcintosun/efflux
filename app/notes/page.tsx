import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { EmptyState } from "@/components/route-states";
import { SceneSlot } from "@/components/scene-slot";
import { CMC_ENDPOINTS, getAdapter } from "@/lib/adapter";
import { DEFAULT_HOLDING_USD, type TokenSnapshot } from "@/lib/data";
import { exitQuote, fmtPctValue, fmtUsd, totalLiquidityUsd, fmtCompactUsd } from "@/lib/simulate";

export const metadata: Metadata = {
  title: "Notes",
  description: "How Efflux turns CoinMarketCap DEX pools, holders, sell tax and LP changes into one exit number, with the endpoints it calls.",
};

const REQUEST_EXAMPLE = `const res = await fetch(
  "https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenAddress, platform: "base" }),
  }
);
const holders = await res.json(); // no API key on this path`;

/** One full-width band's inner column, the same as on / and /play. */
const BAND = "mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24";

function WorkedExample({ t }: { t: TokenSnapshot }) {
  const plain = exitQuote({ token: t, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: false, applyDrain: false });
  const cuts = exitQuote({ token: t, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: true, applyDrain: true });
  const queue = exitQuote({ token: t, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 10, applyTax: true, applyDrain: true });
  const tax = t.sellTaxPct > 0 ? `the ${fmtPctValue(t.sellTaxPct)} sell tax` : "no sell tax on record";
  // Only liquidity that left is repeated (drainScale in lib/simulate.ts), so a growing pool gets no drain clause.
  const drain = t.lpChange24hPct < 0 ? ` and a repeat of the ${fmtPctValue(-t.lpChange24hPct)} LP drain` : " (liquidity did not shrink in 24 hours, so no drain)";
  const ahead = queue.walletsAhead;
  const queueClause =
    ahead > 0
      ? `, and ${fmtUsd(queue.receiveUsd)} after the ${ahead === 1 ? "largest wallet sells" : `${ahead} largest wallets sell`} first.`
      : t.holders.length === 0
        ? ". CoinMarketCap sent no holder list for this load, so the queue step has no wallets to sell first."
        : ". None of the largest holders is a wallet that market-sells, so the queue step changes nothing.";
  return (
    <p className="max-w-[65ch] text-lg">
      With the {t.symbol} snapshot ({t.pools.length} pools, {fmtCompactUsd(totalLiquidityUsd(t))} of liquidity), a{" "}
      {fmtUsd(DEFAULT_HOLDING_USD)} position pays {fmtUsd(plain.receiveUsd)} on price impact alone, {fmtUsd(cuts.receiveUsd)} with {tax}
      {drain}
      {queueClause}
    </p>
  );
}

// The appendix, in the same band rhythm as the home route: GROUND, SURFACE,
// GROUND, SURFACE, GROUND. Dense lists fold behind one-line disclosures and the
// code block scrolls inside its own box.
export default async function NotesPage() {
  const { data } = await getAdapter().listTokens();
  const t = data?.[0];
  const all: ReadonlyArray<(typeof CMC_ENDPOINTS)[number]> = CMC_ENDPOINTS;
  // The 5 calls every token load makes, and the search wrapper the UI does not call yet.
  const endpoints = all.filter((e) => e.live);
  const wrappers = all.filter((e) => !e.live);

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20">
          <h1 className="efflux-wipe max-w-[18ch] text-4xl leading-[1.04] sm:text-5xl lg:text-6xl">Method, numbers and the API behind them</h1>
          <p className="mt-6 max-w-[60ch] text-lg">An appendix for anyone who wants to check the math; the README in the repository says the same.</p>
        </div>
      </section>

      <section className="bg-surface" aria-label="The model">
        <div className={BAND}>
          <h2 className="efflux-wipe-view max-w-[24ch] text-2xl leading-tight md:text-4xl">
            Each pool becomes a virtual constant product pool, and the largest holders sell into it before you do.
          </h2>
          <div className="mt-8 space-y-6">
            {t ? <WorkedExample t={t} /> : <p className="text-lg">No sample token is loaded, so the worked example is skipped.</p>}
            <Fold className="max-w-3xl" summary="The full method, step by step">
              <div className="max-w-[65ch] space-y-4 text-base leading-relaxed">
                <p>
                  CoinMarketCap reports each pool&apos;s total liquidity in USD (liqUsd). Efflux splits it in half: one side in dollars,
                  the other in tokens at the current price. A sale is spread across pools in proportion to their token reserves, so the
                  deepest pool takes the biggest slice and every pool ends at the same price.
                </p>
                <p>
                  The queue comes from the holder list. Pools, burn addresses, exchanges, bridges and lockers are skipped; the rest are
                  sorted by balance and the ten largest sell first, one after another, each one moving the reserves before the next.
                  Your order goes last. Sell tax is taken from every seller&apos;s tokens before the swap, and the LP drain scenario
                  shrinks every pool by the share of liquidity that left in the last 24 hours.
                </p>
              </div>
            </Fold>
          </div>
        </div>
      </section>

      <section className="bg-background" aria-label="CoinMarketCap endpoints">
        <div className={BAND}>
          <h2 className="efflux-wipe-view max-w-[24ch] text-2xl leading-tight md:text-4xl">
            {endpoints.length} DEX endpoints live: Efflux calls them for every token, all on the keyless public host.
          </h2>
          <div className="mt-8">
            {endpoints.length === 0 ? (
              // Empty branch: no endpoint list to show, send the reader to the live tool.
              <EmptyState
                className="max-w-3xl"
                title="The endpoint list is empty in this build."
                body="The simulator still shows every CoinMarketCap request it makes in its proof drawer."
                href="/play"
                cta="Open the simulator"
              />
            ) : (
              <Fold className="max-w-4xl" summary={`The ${endpoints.length} live endpoints and what Efflux takes from each`}>
                <ul className="divide-y divide-border">
                  {endpoints.map((e) => (
                    <li key={e.path} className="flex flex-col gap-1 py-3 md:flex-row md:gap-6">
                      <span className="break-all font-semibold md:min-w-[19rem] md:break-normal">
                        {e.method} /public-api{e.path}
                      </span>
                      <span className="text-muted-foreground">{e.use}</span>
                    </li>
                  ))}
                </ul>
                {wrappers.length > 0 ? (
                  <ul className="mt-6 space-y-2 text-sm">
                    {wrappers.map((e) => (
                      <li key={e.path} className="flex flex-col gap-1 md:flex-row md:gap-6">
                        <span className="break-all font-semibold md:min-w-[19rem] md:break-normal">
                          {e.method} /public-api{e.path}
                        </span>
                        <span className="text-muted-foreground">Not live: wrapper exists in lib/cmc.ts, not called by the live UI yet.</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Fold>
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface" aria-label="A real call and the API notes">
        <div className={BAND}>
          <h2 className="efflux-wipe-view max-w-[24ch] text-2xl leading-tight md:text-4xl">
            This is the holders request exactly as our server sends it, with no API key.
          </h2>
          <div className="mt-8 max-w-3xl space-y-8">
            <div className="max-w-full overflow-x-auto bg-background">
              <pre className="w-max min-w-full whitespace-pre p-4 font-sans text-xs leading-relaxed">{REQUEST_EXAMPLE}</pre>
            </div>
            <p className="max-w-[65ch] text-base">
              The raw response for any token you load sits in the proof drawer on the{" "}
              <Link href="/play" className="font-semibold underline decoration-primary decoration-2 underline-offset-4">
                simulator
              </Link>
              , with status code, timing and the first 2,400 characters of JSON.
            </p>
            <div className="space-y-3">
              <h3 className="font-display text-lg md:text-xl">What the API made possible and where it pushed back</h3>
              <div className="max-w-[65ch] space-y-3 text-base leading-relaxed">
                <p>
                  Possible: pools, holders, sell tax and liquidity history for three chains from one provider, with no key, so the
                  deployed site runs on live data with zero secrets.
                </p>
                <p>
                  Pushback: pools expose liqUsd but no reserve field, so reserves are virtual: half of liqUsd per side. The holders
                  percent field does not say whether it is a fraction or a percent, so Efflux computes share of supply itself. The
                  keyless tier shares one rate limit per IP, so the server caches responses for 60 seconds. Every call is aborted
                  after 8 seconds, and a 429, a network error or a timeout gets exactly one retry after 600 ms. If the retry fails
                  too, a sample token falls back to its bundled snapshot and a pasted address shows an error with a retry button.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background" aria-label="Where the estimate can be off">
        <div className={BAND}>
          <h2 className="efflux-wipe-view max-w-[24ch] text-2xl leading-tight md:text-4xl">
            The estimate leans cautious, and four things can move it.
          </h2>
          <div className="mt-8 space-y-10">
            <Fold className="max-w-3xl" summary="Where the estimate can be off">
              <ul className="max-w-[65ch] list-disc space-y-2 pl-5 text-base">
                <li>Concentrated liquidity pools (v3, CLMM, DLMM) hold more depth near the price than a constant product pool, so the loss shown leans high there.</li>
                <li>Holder tags are incomplete. A team wallet that will never sell still counts until you take it out of the queue on the simulator.</li>
                <li>The quote asset (WETH, WBNB, SOL) is held at a constant dollar price during the simulation.</li>
                <li>Tokens that auto-swap their tax into the pool sell even more than modeled.</li>
              </ul>
            </Fold>
            <div className="efflux-wipe-view max-w-3xl">
              <SceneSlot
                n={4}
                alt="An ink outline of a single liquidity pool seen from the side, with dashed lines marking reserve levels before and after a large sale"
                width={960}
                height={640}
              />
            </div>
            <Button asChild size="lg" className="min-h-11">
              <Link href="/play">Run your own token</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
