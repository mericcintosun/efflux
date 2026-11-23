"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExitStage, type ExitControls } from "@/components/exit-stage";
import { EmptyState } from "@/components/route-states";
import { DEFAULT_HOLDING_USD, SOURCE_LABEL } from "@/lib/data";
import type { DataSource, TokenSnapshot } from "@/lib/types";
import { exitQuote, fmtUsd, type ExitResult } from "@/lib/simulate";
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
    line: (q, t) =>
      `Add the ${t.sellTaxPct}% sell tax and assume tomorrow loses another ${Math.abs(t.lpChange24hPct)}% of liquidity, like the last 24 hours did: ${fmtUsd(q.receiveUsd)}.`,
  },
  {
    id: "queue",
    label: "The queue",
    preset: (n) => ({ ahead: n, applyTax: true, applyDrain: true }),
    line: (q) =>
      `Now let the ${q.walletsAhead} largest wallets sell before you do, one after another into the same pools, and your exit is worth ${fmtUsd(q.receiveUsd)}.`,
  },
  {
    id: "yours",
    label: "Your turn",
    preset: null,
    line: () => "The controls are yours now: drag the queue, flip the cuts, then try a token you actually hold.",
  },
];

/**
 * Story-scroll (structure S6): one sticky live ExitStage, four chapter bands
 * scrolling under it. The active chapter sets the stage state from the first
 * token the page received through the adapter.
 */
export function StoryScroll({ tokens, source = "fake" }: { tokens: TokenSnapshot[]; source?: DataSource }) {
  const token = tokens[0];
  if (!token) {
    return (
      <section aria-label="The story of one exit" className="bg-background">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <EmptyState
            title="No sample token is loaded, so the story has nothing to sell yet."
            body="Open the simulator and paste any Base, BNB Chain or Solana token address instead."
            href="/play"
            cta="Open the simulator"
          />
        </div>
      </section>
    );
  }
  return <StoryChapters token={token} source={source} />;
}

function StoryChapters({ token, source }: { token: TokenSnapshot; source: DataSource }) {
  const sellers = useMemo(() => exitQuote({ token, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: 0, applyTax: false, applyDrain: false }).sellers.length, [token]);
  const [active, setActive] = useState(0);
  const [controls, setControls] = useState<ExitControls>(() => CHAPTERS[0].preset!(sellers));
  const bandRefs = useRef<(HTMLElement | null)[]>([]);

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
    <section aria-label="The story of one exit">
      <div className="sticky top-16 z-30 border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-5 pt-3 md:px-8">
          <nav aria-label="Chapters" className="mb-4">
            <ol className="flex flex-wrap gap-1">
              {CHAPTERS.map((c, i) => (
                <li key={c.id}>
                  <a
                    href={`#chapter-${c.id}`}
                    aria-current={i === active ? "step" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      jump(i);
                    }}
                    className={cn(
                      "inline-block rounded-xs px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                      i === active ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-deep"
                    )}
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-2 h-1 w-full bg-deep" aria-hidden="true">
              <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${((active + 1) / CHAPTERS.length) * 100}%` }} />
            </div>
          </nav>
          <p className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={source === "live" ? "ok" : "secondary"}>{SOURCE_LABEL[source]}</Badge>
            <span>
              {token.symbol}, {token.pools.length} pools, {token.holders.length} holders.
            </span>
          </p>
          <ExitStage
            compact
            token={token}
            holdingUsd={DEFAULT_HOLDING_USD}
            {...controls}
            onChange={(next) => setControls((c) => ({ ...c, ...next }))}
          />
        </div>
      </div>

      {CHAPTERS.map((c, i) => (
        <section
          key={c.id}
          id={`chapter-${c.id}`}
          data-index={i}
          ref={(el) => {
            bandRefs.current[i] = el;
          }}
          className={cn("min-h-[85vh] scroll-mt-16", i % 2 === 0 ? "bg-background" : "bg-surface")}
        >
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <h2 className="max-w-[24ch] text-2xl leading-tight md:text-4xl">{lines[i]}</h2>
            {c.preset === null ? (
              <Button asChild size="lg" className="mt-10">
                <Link href={`/play?token=${token.slug}`}>Simulate your own exit</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ))}
    </section>
  );
}
