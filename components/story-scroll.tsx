"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ExitStage, type ExitControls } from "@/components/exit-stage";
import { PoolSceneFrame } from "@/components/pool-scene-frame";
import type { PoolView } from "@/components/pool-scene";
import { EmptyState } from "@/components/route-states";
import { DEFAULT_HOLDING_USD } from "@/lib/data";
import type { TokenSnapshot } from "@/lib/types";
import { exitQuote, fmtPctValue, fmtUsd, type ExitResult } from "@/lib/simulate";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  label: string;
  /** null = hand control to the reader, keep whatever they set. */
  preset: ((sellers: number) => ExitControls) | null;
  line: (q: ExitResult, t: TokenSnapshot) => string;
}

const CHAPTERS: Chapter[] = [
  {
    id: "quote",
    label: "The quote",
    preset: () => ({ ahead: 0, applyTax: false, applyDrain: false }),
    line: (q, t) =>
      `Your wallet says ${fmtUsd(q.screenUsd)} of ${t.symbol}; sold into the pools right now, with nobody else moving, it pays ${fmtUsd(q.receiveUsd)}.`,
  },
  {
    id: "cuts",
    label: "Hidden cuts",
    preset: () => ({ ahead: 0, applyTax: true, applyDrain: true }),
    line: (q, t) => {
      const tax = t.sellTaxPct > 0 ? `Add the ${fmtPctValue(t.sellTaxPct)} sell tax` : `${t.symbol} has no sell tax on record`;
      // Only liquidity that left is projected forward (drainScale in lib/simulate.ts), so the copy follows the sign.
      return t.lpChange24hPct < 0
        ? `${tax}, and assume tomorrow loses another ${fmtPctValue(-t.lpChange24hPct)} of liquidity, like the last 24 hours did: ${fmtUsd(q.receiveUsd)}.`
        : `${tax}, and liquidity did not shrink in the last 24 hours, so there is no drain to repeat: ${fmtUsd(q.receiveUsd)}.`;
    },
  },
  {
    id: "queue",
    label: "The queue",
    preset: (n) => ({ ahead: n, applyTax: true, applyDrain: true }),
    line: (q, t) =>
      q.walletsAhead > 0
        ? `Now let the ${q.walletsAhead === 1 ? "largest wallet" : `${q.walletsAhead} largest wallets`} sell before you do, one after another into the same pools, and your exit is worth ${fmtUsd(q.receiveUsd)}.`
        : t.holders.length === 0
          ? `CoinMarketCap sent no holder list for ${t.symbol} on this load, so no whale is queued ahead of you here and ${fmtUsd(q.receiveUsd)} stands.`
          : `None of ${t.symbol}'s largest holders is a wallet that market-sells (they are pools, burns, exchanges, bridges or lockers), so ${fmtUsd(q.receiveUsd)} stands.`,
  },
  {
    id: "yours",
    label: "Your turn",
    preset: null,
    line: () => "The controls are yours now: drag the queue, flip the cuts, then try a token you actually hold.",
  },
];

/**
 * Story-scroll (structure S6), the first band of the home route. One live
 * component (the 3D pool plus the ExitStage panel) stays on screen while four
 * chapters scroll beside it (lg) or under it (phones). The chapter state lives
 * here and feeds both halves of the live component, so the pool follows the
 * panel's slider and switches (signature 2) and the camera follows the chapter
 * (signature 3). `intro` is the server-rendered hero copy.
 */
export function StoryScroll({ tokens, intro }: { tokens: TokenSnapshot[]; intro: ReactNode }) {
  const token = tokens[0];
  if (!token) {
    return (
      <section aria-label="The story of one exit" className="bg-background">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          {intro}
          <EmptyState
            className="mt-12"
            title="No sample token is loaded, so the story has nothing to sell yet."
            body="Open the simulator and paste any Base, BNB Chain or Solana token address instead."
            href="/play"
            cta="Open the simulator"
          />
        </div>
      </section>
    );
  }
  return <StoryChapters token={token} intro={intro} />;
}

function StoryChapters({ token, intro }: { token: TokenSnapshot; intro: ReactNode }) {
  const sellers = useMemo(() => exitQuote({ token, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: false, applyDrain: false }).sellers.length, [token]);
  const [active, setActive] = useState(0);
  // The one state object behind the live component: ExitStage and the pool both read and write it.
  const [controls, setControls] = useState<ExitControls>(() => CHAPTERS[0].preset!(sellers));
  const bandRefs = useRef<(HTMLElement | null)[]>([]);
  const update = (next: Partial<ExitControls>) => setControls((c) => ({ ...c, ...next }));
  const view: PoolView = CHAPTERS[active].id === "queue" ? "side" : "front";

  // Lines are computed from each chapter's own preset, so the copy always matches the math.
  const lines = useMemo(
    () =>
      CHAPTERS.map((c) => {
        const p = c.preset ? c.preset(sellers) : { ahead: sellers, applyTax: true, applyDrain: true };
        const q = exitQuote({ token, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: p.ahead, applyTax: p.applyTax, applyDrain: p.applyDrain });
        return c.line(q, token);
      }),
    [token, sellers]
  );

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-72% 0px -26% 0px" }
    );
    bandRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const preset = CHAPTERS[active].preset;
    if (preset) setControls(preset(sellers));
  }, [active, sellers]);

  const jump = (i: number) => {
    setActive(i);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bandRefs.current[i]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  return (
    <section aria-label="The story of one exit" className="bg-background">
      <div className="mx-auto max-w-6xl px-5 pt-14 md:px-8 md:pt-20">{intro}</div>

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pb-28 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:pt-14">
        {/* The live component. On phones both wrappers are display: contents, so the pool sits in the flow and the
            panel sticks under the header for the whole story; at lg the pair is one sticky right column. */}
        <div className="contents lg:col-start-2 lg:row-start-1 lg:block">
          <div className="contents lg:sticky lg:top-20 lg:block lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
            <PoolSceneFrame token={token} controls={controls} onChange={update} view={view} />

            <div className="sticky top-16 z-30 -mx-5 mt-8 max-h-[55svh] overflow-y-auto bg-surface px-5 py-3 md:-mx-8 md:px-8 lg:static lg:mx-0 lg:mt-6 lg:max-h-none lg:overflow-visible lg:p-6">
              <nav aria-label="Chapters" className="mb-3">
                <ol className="flex gap-1 overflow-x-auto">
                  {CHAPTERS.map((c, i) => (
                    <li key={c.id} className="shrink-0">
                      <a
                        href={`#chapter-${c.id}`}
                        aria-current={i === active ? "step" : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          jump(i);
                        }}
                        className={cn(
                          "inline-flex min-h-11 items-center whitespace-nowrap rounded-xs px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                          i === active ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-deep"
                        )}
                      >
                        {c.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              {/* The source note with its fetch time sits under the hero (app/page.tsx), in the first viewport. */}
              <p className="mb-3 hidden text-xs text-muted-foreground sm:block">
                {token.symbol}, {token.pools.length} pools,{" "}
                {token.holders.length > 0 ? `${token.holders.length} holders` : "no holder list in this load"}.
              </p>
              <ExitStage compact token={token} holdingUsd={DEFAULT_HOLDING_USD} {...controls} onChange={update} />
            </div>
          </div>
        </div>

        <ol className="lg:col-start-1 lg:row-start-1">
          {CHAPTERS.map((c, i) => (
            <li
              key={c.id}
              id={`chapter-${c.id}`}
              data-index={i}
              ref={(el) => {
                bandRefs.current[i] = el;
              }}
              className="flex min-h-[70svh] flex-col justify-center py-10 lg:min-h-[80svh]"
            >
              <p className="text-sm font-semibold text-muted-foreground">{c.label}</p>
              <h2 className="mt-3 max-w-[22ch] text-2xl leading-tight md:text-3xl lg:text-4xl">{lines[i]}</h2>
              {c.preset === null ? (
                <Button asChild variant="link" className="mt-8 min-h-11 text-base">
                  <Link href={`/play?token=${token.slug}`}>Simulate your own exit with these controls</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
