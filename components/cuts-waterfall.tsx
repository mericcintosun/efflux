"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/route-states";
import type { TokenSnapshot } from "@/lib/types";
import { cutsWaterfall, fmtUsd, type CutKey, type ExitResult } from "@/lib/simulate";
import { cn } from "@/lib/utils";

interface CutsWaterfallProps {
  q: ExitResult;
  token: TokenSnapshot;
  applyTax: boolean;
  applyDrain: boolean;
  /** Empty state action, for example focusing the address field on /play. */
  onEmptyAction?: () => void;
  /** Error state action. Without it, "Try again" reloads the page. */
  onRetry?: () => void;
}

const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * The hidden cuts as a waterfall: what the wallet shows, then price impact, sell
 * tax, the 24h LP drain and the queue as separate dollar steps, then what a sale
 * pays. Flat blocks only: DEEP for the wallet number, INK for each cut, ACCENT
 * for the payout. The printed cuts add up to the printed gap (cutsWaterfall in
 * lib/simulate.ts, pinned by tests/simulate.test.ts).
 */
export function CutsWaterfall({ q, token, applyTax, applyDrain, onEmptyAction, onRetry }: CutsWaterfallProps) {
  const numbers = [q.screenUsd, q.receiveUsd, q.breakdown.impactUsd, q.breakdown.taxUsd, q.breakdown.drainUsd, q.breakdown.queueUsd];
  if (!numbers.every(Number.isFinite)) {
    // ErrorState: the token data produced a number the waterfall cannot draw.
    return (
      <ErrorState
        title="The cuts could not be split"
        body={`The ${token.symbol} data gave a price or a pool size Efflux cannot sell into. Try again, or pick another token.`}
        onRetry={onRetry ?? (() => window.location.reload())}
      />
    );
  }

  if (q.screenUsd <= 0) {
    // EmptyState: no holding entered, so there is nothing to cut.
    return (
      <div className="bg-surface px-6 py-6">
        <p className="max-w-[60ch] text-sm">
          The cuts waterfall appears after you pick a token and enter what your wallet shows. Type a dollar amount above, or paste
          a token address.
        </p>
        {onEmptyAction ? (
          <Button type="button" className="mt-4 min-h-11" onClick={onEmptyAction}>
            Paste an address
          </Button>
        ) : null}
      </div>
    );
  }

  const w = cutsWaterfall(q);
  // Whole dollars when the waterfall rounds to dollars, so "$42" never prints as "$42.00" beside "$4,958".
  const money = (v: number) => (w.unit === 1 ? usdWhole.format(v) : fmtUsd(v));
  const lp = token.lpChange24hPct;
  const label: Record<CutKey, string> = {
    impact: "Price impact",
    tax: token.sellTaxPct > 0 ? (applyTax ? `Sell tax ${token.sellTaxPct}%` : "Sell tax (switched off)") : "Sell tax (none on this token)",
    drain:
      lp < 0
        ? applyDrain
          ? `24h LP drain, tomorrow repeats the last ${Math.abs(lp)}%`
          : "24h LP drain (repeat tomorrow is off)"
        : "24h LP drain (liquidity did not shrink)",
    queue: q.walletsAhead > 0 ? `${q.walletsAhead} wallets sell before you` : "Queue (nobody sells before you)",
  };

  const total = Math.max(w.screenUnits, 1);
  const pct = (u: number) => (u / total) * 100;
  let remaining = w.screenUnits;
  const rows = [
    { key: "wallet", label: "Wallet shows", amount: money(w.screenUsd), left: 0, width: 100, block: "bg-deep", strong: false },
    ...w.cuts.map((c) => {
      remaining -= c.units;
      return {
        key: c.key,
        label: label[c.key],
        amount: c.units > 0 ? `-${money(c.usd)}` : money(0),
        left: pct(remaining),
        width: pct(c.units),
        block: "bg-foreground",
        strong: false,
      };
    }),
    { key: "receive", label: "A sale pays you", amount: money(w.receiveUsd), left: 0, width: pct(w.receiveUnits), block: "bg-primary", strong: true },
  ];

  const sum = w.cuts.map((c) => money(c.usd)).join(" + ");

  return (
    <figure className="space-y-4" aria-label={`Hidden cuts: ${money(w.screenUsd)} on screen, ${money(w.receiveUsd)} paid`}>
      <figcaption className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Where the {money(w.gapUsd)} goes
      </figcaption>
      <ol className="space-y-3">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
              <span className={cn(r.strong && "font-bold")}>{r.label}</span>
              <span className={cn("font-bold tabular-nums", r.strong && "font-display text-lg")}>{r.amount}</span>
            </div>
            <div className="relative mt-1 h-4 w-full bg-surface" aria-hidden="true">
              <div
                className={cn("efflux-wipe absolute inset-y-0 transition-[left,width] duration-500", r.block)}
                style={{ left: `${r.left}%`, width: r.width > 0 ? `max(2px, ${r.width}%)` : "0" }}
              />
            </div>
          </li>
        ))}
      </ol>
      <p className="max-w-[70ch] text-sm">
        The four cuts add up to the gap: {sum} = <span className="font-bold">{money(w.gapUsd)}</span>, which is{" "}
        {money(w.screenUsd)} on screen minus {money(w.receiveUsd)} paid.
      </p>
    </figure>
  );
}
