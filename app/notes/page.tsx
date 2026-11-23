import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SceneSlot } from "@/components/scene-slot";
import { CMC_ENDPOINTS } from "@/lib/cmc";
import { DEFAULT_HOLDING_USD, tokens } from "@/lib/data";
import { exitQuote, fmtUsd, totalLiquidityUsd, fmtCompactUsd } from "@/lib/simulate";

export const metadata: Metadata = {
  title: "Method and endpoints",
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

export default function NotesPage() {
  const t = tokens[0];
  const plain = exitQuote({ token: t, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: false, applyDrain: false });
  const cuts = exitQuote({ token: t, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: true, applyDrain: true });
  const queue = exitQuote({ token: t, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 10, applyTax: true, applyDrain: true });

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <h1 className="efflux-wipe max-w-[18ch] text-3xl leading-tight md:text-5xl">Method, numbers and the API behind them</h1>
      <p className="mt-5 max-w-[65ch] text-lg">
        An appendix for anyone who wants to check the math. Everything here is also in the repository README.
      </p>

      <section className="mt-16 space-y-6">
        <h2 className="text-2xl md:text-3xl">The model</h2>
        <div className="max-w-[70ch] space-y-4 text-base leading-relaxed">
          <p>
            CoinMarketCap reports each pool&apos;s total liquidity in USD (liqUsd). Efflux splits it in half and builds a virtual
            constant product pool: one side in dollars, the other in tokens at the current price. A sale is spread across pools in
            proportion to their token reserves, so the deepest pool takes the biggest slice and every pool ends at the same price.
          </p>
          <p>
            The queue comes from the holder list. Pools, burn addresses, exchanges, bridges and lockers are skipped; the rest are
            sorted by balance and the ten largest sell first, one after another, each one moving the reserves before the next. Your
            order goes last. Sell tax is taken from every seller&apos;s tokens before the swap, and the LP drain scenario shrinks
            every pool by the share of liquidity that left in the last 24 hours.
          </p>
          <p>
            Worked example with the {t.symbol} snapshot ({t.pools.length} pools, {fmtCompactUsd(totalLiquidityUsd(t))} of liquidity):
            a {fmtUsd(DEFAULT_HOLDING_USD)} position pays {fmtUsd(plain.receiveUsd)} on price impact alone. With the{" "}
            {t.sellTaxPct}% sell tax and a repeat of the {Math.abs(t.lpChange24hPct)}% LP drain it pays {fmtUsd(cuts.receiveUsd)}.
            After the {queue.walletsAhead} largest wallets sell first, it pays {fmtUsd(queue.receiveUsd)}.
          </p>
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <h2 className="text-2xl md:text-3xl">CoinMarketCap endpoints we call</h2>
        <ul className="max-w-[80ch] divide-y divide-border">
          {CMC_ENDPOINTS.map((e) => (
            <li key={e.path} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <span className="min-w-[19rem] font-semibold">
                {e.method} /public-api{e.path}
              </span>
              <span className="text-muted-foreground">{e.use}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>A real call, in code</CardTitle>
            <CardDescription>The holders request, as lib/cmc.ts sends it through our server route.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto whitespace-pre bg-background p-4 font-sans text-xs leading-relaxed">{REQUEST_EXAMPLE}</pre>
            <p className="mt-4 text-sm">
              The raw response for any token you load sits in the proof drawer on the{" "}
              <Link href="/play" className="font-semibold underline decoration-primary decoration-2 underline-offset-4">
                simulator
              </Link>
              , with status code, timing and the first 2,400 characters of JSON.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What the API made possible, and where it pushed back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              Possible: pools, holders, sell tax and liquidity history for three chains from one provider, with no key, which is why
              the deployed site runs on live data.
            </p>
            <p>
              Pushback: pools expose liqUsd but no raw reserves, so reserves are reconstructed. Short field names such as a0, a1 and tu
              in the liquidity change list are not described in the schema. The keyless tier shares one rate limit per IP, so the
              server caches GET responses for 60 seconds and backs off on HTTP 429.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16 space-y-6">
        <h2 className="text-2xl md:text-3xl">Where the estimate can be off</h2>
        <ul className="max-w-[70ch] list-disc space-y-2 pl-5 text-base">
          <li>Concentrated liquidity pools (v3, CLMM, DLMM) hold more depth near the price than a constant product pool, so the loss shown leans high there.</li>
          <li>Holder tags are incomplete. A team wallet that will never sell still counts until you take it out of the queue on the simulator.</li>
          <li>The quote asset (WETH, WBNB, SOL) is held at a constant dollar price during the simulation.</li>
          <li>Tokens that auto-swap their tax into the pool sell even more than modeled.</li>
        </ul>
        <div className="max-w-3xl pt-6">
          <SceneSlot
            n={4}
            alt="An ink outline of a single liquidity pool seen from the side, with dashed lines marking reserve levels before and after a large sale"
            width={960}
            height={640}
          />
        </div>
        <Button asChild size="lg" className="mt-6">
          <Link href="/play">Run your own token</Link>
        </Button>
      </section>
    </div>
  );
}
