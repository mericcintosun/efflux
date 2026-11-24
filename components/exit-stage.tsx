"use client";

import { useId, useMemo } from "react";
import { CutsWaterfall } from "@/components/cuts-waterfall";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { Slider } from "@/components/ui/slider";
import type { TokenSnapshot } from "@/lib/types";
import { exitQuote, fmtPct, fmtPctValue, fmtUsd, type ExitResult } from "@/lib/simulate";
import { cn } from "@/lib/utils";

export interface ExitControls {
  ahead: number;
  applyTax: boolean;
  applyDrain: boolean;
}

interface ExitStageProps extends ExitControls {
  token: TokenSnapshot;
  holdingUsd: number;
  excluded?: string[];
  onChange: (next: Partial<ExitControls>) => void;
  /** Story mode: tighter layout for the sticky stage on the home route (loss bar instead of the waterfall). */
  compact?: boolean;
  /** Waterfall empty state action on /play ("Paste an address"). */
  onEmptyAction?: () => void;
  /** Waterfall error state retry on /play. */
  onRetry?: () => void;
  className?: string;
}

/**
 * The live exit panel: what the wallet shows, what a sale pays, where the
 * difference went, and the controls that move it. Used by the story on / and by
 * the free-form simulator on /play. On /play the difference is drawn as the
 * cuts waterfall (components/cuts-waterfall.tsx); the sticky story panel keeps
 * the one-line loss bar so it stays short.
 */
export function ExitStage({
  token,
  holdingUsd,
  excluded,
  ahead,
  applyTax,
  applyDrain,
  onChange,
  compact,
  onEmptyAction,
  onRetry,
  className,
}: ExitStageProps) {
  const sliderId = useId();
  const q = useMemo(
    () => exitQuote({ token, holdingUsd, walletsAhead: ahead, applyTax, applyDrain, excluded }),
    [token, holdingUsd, ahead, applyTax, applyDrain, excluded]
  );
  const maxAhead = q.sellers.length;
  const lp = token.lpChange24hPct;

  const switches = (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        className="min-h-11 whitespace-normal text-left"
        variant={applyTax ? "default" : "outline"}
        aria-pressed={applyTax}
        disabled={token.sellTaxPct <= 0}
        onClick={() => onChange({ applyTax: !applyTax })}
      >
        {token.sellTaxPct > 0 ? `Sell tax ${fmtPctValue(token.sellTaxPct)}` : "No sell tax"}
      </Button>
      <Button
        size="sm"
        className="min-h-11 whitespace-normal text-left"
        variant={applyDrain ? "default" : "outline"}
        aria-pressed={applyDrain}
        disabled={lp >= 0}
        onClick={() => onChange({ applyDrain: !applyDrain })}
      >
        {lp < 0 ? `Assume tomorrow repeats the last 24 hours (LP moved ${fmtPctValue(lp)})` : "LP did not shrink in 24 hours"}
      </Button>
    </div>
  );

  return (
    <div className={cn(compact ? "space-y-3 sm:space-y-5" : "space-y-5", className)}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 sm:gap-x-8 sm:gap-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Wallet shows</p>
          <p className="font-display text-xl tabular-nums sm:text-2xl md:text-3xl">{fmtUsd(q.screenUsd)}</p>
        </div>
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <p className="text-xs font-semibold">A sale pays you</p>
          <p
            key={Math.round(q.receiveUsd)}
            aria-live="polite"
            className={cn("efflux-wipe font-display tabular-nums", compact ? "text-2xl sm:text-3xl md:text-5xl" : "text-4xl md:text-6xl")}
          >
            {fmtUsd(q.receiveUsd)}
          </p>
        </div>
        <p className={cn("max-w-[28ch] pb-1 text-sm", compact && "hidden sm:block")}>
          <span className="font-bold">{fmtPct(q.lossPct)}</span> of the {token.symbol} on screen never reaches you.
        </p>
      </div>

      <div className={cn("overflow-x-auto", compact && "hidden md:block")}>
        <ExitCurve q={q} compact={compact} />
      </div>

      {compact ? (
        <LossBar q={q} token={token} ahead={ahead} />
      ) : (
        <CutsWaterfall q={q} token={token} applyTax={applyTax} applyDrain={applyDrain} onEmptyAction={onEmptyAction} onRetry={onRetry} />
      )}

      <div className={compact ? "space-y-2 sm:space-y-3" : "space-y-3"}>
        <label htmlFor={sliderId} className="flex items-baseline justify-between gap-4 text-sm font-semibold">
          <span>Wallets selling ahead of you</span>
          <span className="font-display tabular-nums">
            {q.walletsAhead} of {maxAhead}
          </span>
        </label>
        <Slider
          id={sliderId}
          min={0}
          max={maxAhead}
          step={1}
          value={q.walletsAhead}
          disabled={maxAhead === 0}
          className="min-h-11"
          onChange={(e) => onChange({ ahead: Number(e.target.value) })}
        />
        {maxAhead === 0 ? (
          <p className="text-xs text-muted-foreground">
            {token.holders.length === 0
              ? "CoinMarketCap sent no holder list for this token, so the queue stays empty and the slider rests at zero."
              : "Every large wallet of this token is a pool, burn, exchange, bridge or locker, so nobody is queued to sell ahead of you."}
          </p>
        ) : null}
        {compact ? (
          <>
            {/* Under 640 px the legend folds away so the panel stays short. The two switches render once,
                so "No sell tax" and the LP line are never printed twice. */}
            <Fold className="sm:hidden" summary="Where the gap goes">
              <LossLegend q={q} token={token} ahead={ahead} />
            </Fold>
            {switches}
          </>
        ) : (
          switches
        )}
        {!compact && q.conservative ? (
          <p className="max-w-[70ch] text-xs text-muted-foreground">
            Some of these pools are concentrated liquidity. Efflux models them as constant product, so the loss shown leans
            high; the real fill may be a little better.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ExitCurve({ q, compact }: { q: ExitResult; compact?: boolean }) {
  // With no wallet that can sell first, the curve is a single point; say that instead of drawing "0 wallets ahead".
  if (q.curve.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        No large wallet is queued ahead of you, so the payout does not change with the queue: {fmtUsd(q.receiveUsd)}.
      </p>
    );
  }
  const W = 640;
  const H = 150;
  const pad = 10;
  const max = Math.max(q.screenUsd, 1);
  const steps = Math.max(q.curve.length - 1, 1);
  const pts = q.curve.map((c, i) => [pad + (i * (W - 2 * pad)) / steps, H - pad - (c.receiveUsd / max) * (H - 2 * pad)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${pts.length ? pts[pts.length - 1][0].toFixed(1) : W - pad},${H - pad}`;
  const cur = pts[q.walletsAhead];
  const screenY = pad;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={cn("w-full", compact ? "h-20 lg:h-24" : "h-28 md:h-36")}
        role="img"
        aria-label={`What a sale pays as 0 to ${q.curve.length - 1} large wallets sell first, from ${fmtUsd(q.curve[0]?.receiveUsd ?? 0)} down to ${fmtUsd(q.curve[q.curve.length - 1]?.receiveUsd ?? 0)}`}
        preserveAspectRatio="none"
      >
        <line x1={pad} x2={W - pad} y1={screenY} y2={screenY} className="stroke-line" strokeWidth={2} strokeDasharray="6 6" />
        <polygon points={area} className="fill-deep" />
        <polyline points={line} className="fill-none stroke-foreground" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        {cur ? <rect x={cur[0] - 7} y={cur[1] - 7} width={14} height={14} className="fill-primary stroke-foreground" strokeWidth={2} /> : null}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Nobody ahead of you</span>
        <span>Dashed line: what the wallet shows</span>
        <span>{q.curve.length - 1 === 1 ? "1 wallet ahead" : `${q.curve.length - 1} wallets ahead`}</span>
      </figcaption>
    </figure>
  );
}

// Series colors come from INK, its tints, LINE and ACCENT only. OK, WARN and BAD
// are kept for state (a failed call, a live source), never for a chart series.
function lossParts(q: ExitResult, token: TokenSnapshot, ahead: number) {
  return [
    { key: "receive", label: "You receive", usd: q.receiveUsd, swatch: "bg-primary" },
    { key: "impact", label: "Price impact", usd: q.breakdown.impactUsd, swatch: "bg-foreground" },
    { key: "tax", label: `Sell tax ${fmtPctValue(token.sellTaxPct)}`, usd: q.breakdown.taxUsd, swatch: "bg-foreground/60" },
    { key: "drain", label: "LP drain", usd: q.breakdown.drainUsd, swatch: "bg-foreground/30" },
    { key: "queue", label: `${ahead} wallets first`, usd: q.breakdown.queueUsd, swatch: "bg-line" },
  ].filter((p) => p.usd >= 0.5);
}

function LossBar({ q, token, ahead }: { q: ExitResult; token: TokenSnapshot; ahead: number }) {
  const parts = lossParts(q, token, ahead);
  const total = Math.max(q.screenUsd, 1);

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden bg-surface sm:h-5" aria-hidden="true">
        {parts.map((p) => (
          <div key={p.key} className={cn("h-full transition-[width] duration-500", p.swatch)} style={{ width: `${(p.usd / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 hidden sm:block">
        <LossLegend q={q} token={token} ahead={ahead} />
      </div>
    </div>
  );
}

function LossLegend({ q, token, ahead }: { q: ExitResult; token: TokenSnapshot; ahead: number }) {
  const parts = lossParts(q, token, ahead);
  return (
    <div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-2.5", p.swatch)} />
            <span>{p.label}</span>
            <span className="font-bold tabular-nums">{fmtUsd(p.usd)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
