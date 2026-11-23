"use client";

import { useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { TokenSnapshot } from "@/lib/data";
import { exitQuote, fmtPct, fmtUsd, type ExitResult } from "@/lib/simulate";
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
  /** Story mode: tighter layout for the sticky stage on the home route. */
  compact?: boolean;
  className?: string;
}

/**
 * The live exit panel: what the wallet shows, what a sale pays, where the
 * difference went, and the controls that move it. Used by the story on / and by
 * the free-form simulator on /play.
 */
export function ExitStage({ token, holdingUsd, excluded, ahead, applyTax, applyDrain, onChange, compact, className }: ExitStageProps) {
  const sliderId = useId();
  const q = useMemo(
    () => exitQuote({ token, holdingUsd, walletsAhead: ahead, applyTax, applyDrain, excluded }),
    [token, holdingUsd, ahead, applyTax, applyDrain, excluded]
  );
  const maxAhead = q.sellers.length;
  const lp = token.lpChange24hPct;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">Wallet shows</p>
          <p className="font-display text-2xl tabular-nums md:text-3xl">{fmtUsd(q.screenUsd)}</p>
        </div>
        <div className="bg-primary px-4 py-2 text-primary-foreground">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]">A sale pays you</p>
          <p
            key={Math.round(q.receiveUsd)}
            aria-live="polite"
            className={cn("efflux-wipe font-display tabular-nums", compact ? "text-3xl md:text-5xl" : "text-4xl md:text-6xl")}
          >
            {fmtUsd(q.receiveUsd)}
          </p>
        </div>
        <p className="max-w-[28ch] pb-1 text-sm">
          <span className="font-bold">{fmtPct(q.lossPct)}</span> of the {token.symbol} on screen never reaches you.
        </p>
      </div>

      <div className={cn(compact && "hidden md:block")}>
        <ExitCurve q={q} />
      </div>

      <LossBar q={q} token={token} ahead={ahead} />

      <div className="space-y-3">
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
          onChange={(e) => onChange({ ahead: Number(e.target.value) })}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={applyTax ? "default" : "outline"}
            aria-pressed={applyTax}
            disabled={token.sellTaxPct <= 0}
            onClick={() => onChange({ applyTax: !applyTax })}
          >
            {token.sellTaxPct > 0 ? `Sell tax ${token.sellTaxPct}%` : "No sell tax"}
          </Button>
          <Button
            size="sm"
            variant={applyDrain ? "default" : "outline"}
            aria-pressed={applyDrain}
            disabled={lp >= 0}
            onClick={() => onChange({ applyDrain: !applyDrain })}
          >
            {lp < 0 ? `24h LP pulled ${Math.abs(lp)}%, repeat tomorrow` : "LP not shrinking"}
          </Button>
        </div>
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

function ExitCurve({ q }: { q: ExitResult }) {
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
        className="h-28 w-full md:h-36"
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
        <span>{q.curve.length - 1} wallets ahead</span>
      </figcaption>
    </figure>
  );
}

function LossBar({ q, token, ahead }: { q: ExitResult; token: TokenSnapshot; ahead: number }) {
  const parts = [
    { key: "receive", label: "You receive", usd: q.receiveUsd, swatch: "bg-primary" },
    { key: "impact", label: "Price impact", usd: q.breakdown.impactUsd, swatch: "bg-foreground" },
    { key: "tax", label: `Sell tax ${token.sellTaxPct}%`, usd: q.breakdown.taxUsd, swatch: "bg-warn" },
    { key: "drain", label: "LP drain", usd: q.breakdown.drainUsd, swatch: "bg-bad" },
    { key: "queue", label: `${ahead} wallets first`, usd: q.breakdown.queueUsd, swatch: "bg-line" },
  ].filter((p) => p.usd >= 0.5);
  const total = Math.max(q.screenUsd, 1);

  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden bg-surface" aria-hidden="true">
        {parts.map((p) => (
          <div key={p.key} className={cn("h-full transition-[width] duration-500", p.swatch)} style={{ width: `${(p.usd / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
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
