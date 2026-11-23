// Efflux exit simulation. Pure functions only: no fetch, no React, no globals,
// so the same math runs on the server, in the browser and in unit tests.
//
// Model
// 1. Every pool becomes a virtual constant product pool (x * y = k). CMC gives us
//    liqUsd for both sides together, so each side is liqUsd / 2: y in USD and
//    x = (liqUsd / 2) / priceUsd in tokens.
// 2. A sale is split across pools in proportion to their token reserve. When all
//    pools start at the same price this keeps their prices equal after the trade,
//    which is the best a router can do across constant product pools (the deepest
//    pool takes the largest slice).
// 3. Concentrated liquidity pools (v3, CLMM, DLMM) are modeled the same way. That
//    understates their depth near the current price, so the loss shown leans high
//    for those pools. The UI says so whenever one is present.
// 4. The quote side is valued at a constant USD price (WETH, WBNB or SOL do not
//    move during the simulation).

import type { Holder, TokenSnapshot } from "@/lib/types";

export const MAX_SELLERS = 10;

/** Holders with these tags do not market-sell, so they never enter the queue. */
export const NON_SELLER_TAGS = new Set(["pool", "burn", "cex", "bridge", "locker"]);

export interface VirtualPool {
  id: string;
  /** Token reserve. */
  x: number;
  /** Quote reserve, in USD. */
  y: number;
  /** Swap fee as a fraction. */
  fee: number;
}

export interface ExitInput {
  token: TokenSnapshot;
  holdingUsd: number;
  walletsAhead: number;
  applyTax: boolean;
  applyDrain: boolean;
  /** Addresses the user removed from the queue by hand. */
  excluded?: string[];
}

export interface ExitBreakdown {
  impactUsd: number;
  taxUsd: number;
  drainUsd: number;
  queueUsd: number;
}

export interface ExitResult {
  screenUsd: number;
  receiveUsd: number;
  lossPct: number;
  breakdown: ExitBreakdown;
  sellers: Holder[];
  walletsAhead: number;
  /** Receive amount for 0..sellers.length wallets ahead, with the current tax and drain switches. */
  curve: { ahead: number; receiveUsd: number }[];
  /** Share of the original USD side left in the pools when your order arrives. */
  quoteLeftFrac: number;
  /** True when any pool is concentrated liquidity (loss leans high). */
  conservative: boolean;
}

export function buildVirtualPools(token: TokenSnapshot, liquidityScale = 1): VirtualPool[] {
  if (!(token.priceUsd > 0)) return [];
  return token.pools
    .filter((p) => p.liqUsd > 0)
    .map((p) => {
      const half = (p.liqUsd * liquidityScale) / 2;
      return { id: p.address, x: half / token.priceUsd, y: half, fee: p.feeBps / 10_000 };
    });
}

/** Sell `amount` tokens across the pools. Returns USD out and the updated reserves. */
export function sellInto(pools: VirtualPool[], amount: number): { outUsd: number; pools: VirtualPool[] } {
  if (!(amount > 0) || pools.length === 0) return { outUsd: 0, pools };
  const totalX = pools.reduce((s, p) => s + p.x, 0);
  let outUsd = 0;
  const next = pools.map((p) => {
    const dx = amount * (p.x / totalX);
    const dxAfterFee = dx * (1 - p.fee);
    const dy = (p.y * dxAfterFee) / (p.x + dxAfterFee);
    outUsd += dy;
    // The fee stays in the pool, as in Uniswap v2.
    return { ...p, x: p.x + dx, y: p.y - dy };
  });
  return { outUsd, pools: next };
}

/** The ordered queue: largest balances first, without pools, burns, exchanges, bridges and lockers. */
export function eligibleSellers(token: TokenSnapshot, excluded: string[] = []): Holder[] {
  const poolAddresses = new Set(token.pools.map((p) => p.address.toLowerCase()));
  const skip = new Set(excluded.map((a) => a.toLowerCase()));
  return token.holders
    .filter((h) => h.balance > 0)
    .filter((h) => !h.tags.some((t) => NON_SELLER_TAGS.has(t)))
    .filter((h) => !poolAddresses.has(h.address.toLowerCase()))
    .filter((h) => !skip.has(h.address.toLowerCase()))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, MAX_SELLERS);
}

/** Only liquidity that left counts: a growing pool is not projected forward. */
export function drainScale(token: TokenSnapshot): number {
  const change = Math.min(0, token.lpChange24hPct) / 100;
  return Math.max(0.05, 1 + change);
}

interface Scenario {
  holdingTokens: number;
  sellers: Holder[];
  ahead: number;
  taxFrac: number;
  liquidityScale: number;
}

function runScenario(token: TokenSnapshot, s: Scenario): { outUsd: number; quoteLeftFrac: number } {
  let pools = buildVirtualPools(token, s.liquidityScale);
  const startY = pools.reduce((sum, p) => sum + p.y, 0);
  // Whales pay the same sell tax. Tokens that auto-swap their tax into the pool
  // would sell even more; we ignore that, which keeps the estimate on the kind side.
  for (const h of s.sellers.slice(0, s.ahead)) {
    pools = sellInto(pools, h.balance * (1 - s.taxFrac)).pools;
  }
  const leftY = pools.reduce((sum, p) => sum + p.y, 0);
  const { outUsd } = sellInto(pools, s.holdingTokens * (1 - s.taxFrac));
  return { outUsd, quoteLeftFrac: startY > 0 ? leftY / startY : 0 };
}

export function exitQuote(input: ExitInput): ExitResult {
  const { token, holdingUsd } = input;
  const sellers = eligibleSellers(token, input.excluded);
  const ahead = Math.max(0, Math.min(Math.round(input.walletsAhead), sellers.length));
  const holdingTokens = token.priceUsd > 0 ? holdingUsd / token.priceUsd : 0;
  const taxFrac = input.applyTax ? Math.max(0, Math.min(token.sellTaxPct, 99)) / 100 : 0;
  const scale = input.applyDrain ? drainScale(token) : 1;

  const base = { holdingTokens, sellers, ahead: 0, taxFrac: 0, liquidityScale: 1 };
  // Each step adds one effect, so the four losses add up exactly to screen minus receive.
  const plain = runScenario(token, base).outUsd;
  const taxed = runScenario(token, { ...base, taxFrac }).outUsd;
  const drained = runScenario(token, { ...base, taxFrac, liquidityScale: scale }).outUsd;
  const final = runScenario(token, { ...base, taxFrac, liquidityScale: scale, ahead });

  const curve = Array.from({ length: sellers.length + 1 }, (_, k) => ({
    ahead: k,
    receiveUsd: runScenario(token, { ...base, taxFrac, liquidityScale: scale, ahead: k }).outUsd,
  }));

  const screenUsd = holdingUsd;
  const receiveUsd = final.outUsd;
  return {
    screenUsd,
    receiveUsd,
    lossPct: screenUsd > 0 ? 1 - receiveUsd / screenUsd : 0,
    breakdown: {
      impactUsd: Math.max(0, screenUsd - plain),
      taxUsd: Math.max(0, plain - taxed),
      drainUsd: Math.max(0, taxed - drained),
      queueUsd: Math.max(0, drained - final.outUsd),
    },
    sellers,
    walletsAhead: ahead,
    curve,
    quoteLeftFrac: final.quoteLeftFrac,
    conservative: token.pools.some((p) => p.kind === "v3" || p.kind === "clmm"),
  };
}

export type CutKey = "impact" | "tax" | "drain" | "queue";

export interface WaterfallCut {
  key: CutKey;
  /** The cut in whole display units (dollars, or cents for positions under $100). */
  units: number;
  /** The same cut in dollars, ready for fmtUsd. */
  usd: number;
}

export interface Waterfall {
  /** 1 = whole dollars, 0.01 = cents. */
  unit: 1 | 0.01;
  screenUnits: number;
  receiveUnits: number;
  gapUnits: number;
  screenUsd: number;
  receiveUsd: number;
  gapUsd: number;
  cuts: WaterfallCut[];
}

/**
 * Display rounding for the cuts waterfall on /play. The model numbers are not
 * touched: exitQuote() already makes the four cuts add up to screen minus
 * receive. Rounding each one on its own could still print, say, $1 too much, so
 * this rounds the wallet and the payout to the display unit first, then hands
 * the four cuts their rounded share by largest remainder. The printed cuts
 * always add up to the printed gap, to the unit.
 */
export function cutsWaterfall(q: ExitResult): Waterfall {
  const unit: 1 | 0.01 = Math.abs(q.screenUsd) >= 100 ? 1 : 0.01;
  const per = unit === 1 ? 1 : 100;
  const screenUnits = Math.round(q.screenUsd * per);
  const receiveUnits = Math.min(screenUnits, Math.round(q.receiveUsd * per));
  const gapUnits = Math.max(0, screenUnits - receiveUnits);

  const keys: CutKey[] = ["impact", "tax", "drain", "queue"];
  const b = q.breakdown;
  const raw = [b.impactUsd, b.taxUsd, b.drainUsd, b.queueUsd].map((v) => Math.max(0, v) * per);
  const units = raw.map((v) => Math.floor(v));
  // Largest fractional part first; ties go to the earlier cut.
  const order = raw.map((v, i) => ({ i, r: v - units[i] })).sort((x, y) => y.r - x.r || x.i - y.i);
  let rest = gapUnits - units.reduce((s, v) => s + v, 0);
  for (let k = 0; rest > 0; k++, rest--) units[order[k % order.length].i] += 1;
  while (rest < 0) {
    // Take the unit back from the largest cut, so no cut goes below zero.
    let at = 0;
    for (let i = 1; i < units.length; i++) if (units[i] > units[at]) at = i;
    if (units[at] <= 0) break;
    units[at] -= 1;
    rest += 1;
  }

  const toUsd = (u: number) => (unit === 1 ? u : u / 100);
  return {
    unit,
    screenUnits,
    receiveUnits,
    gapUnits,
    screenUsd: toUsd(screenUnits),
    receiveUsd: toUsd(receiveUnits),
    gapUsd: toUsd(gapUnits),
    cuts: keys.map((key, i) => ({ key, units: units[i], usd: toUsd(units[i]) })),
  };
}

export function totalLiquidityUsd(token: TokenSnapshot): number {
  return token.pools.reduce((s, p) => s + p.liqUsd, 0);
}

const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function fmtUsd(v: number): string {
  return Math.abs(v) >= 100 ? usdWhole.format(v) : usdCents.format(v);
}

export function fmtCompactUsd(v: number): string {
  return `$${compact.format(v)}`;
}

export function fmtTokens(v: number): string {
  return compact.format(v);
}

export function fmtPct(frac: number): string {
  return `${(frac * 100).toFixed(frac < 0.1 ? 1 : 0)}%`;
}

export function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
}
