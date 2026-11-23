// Pure pickers for CoinMarketCap DEX responses: no env, no fetch, no clock.
// Exported so tests/cmc-parse.test.ts can feed fixtures through them.
//
// Field names follow the OpenAPI schema (pools: liqUsd, t0, t1; holders:
// balance, actualBalance, percent, tags; liquidity change: lcs, tlu). They are
// confirmed only by `npm run proof` output (README block "cmc-fields"); each
// value is read from a list of candidate keys so a renamed field degrades to
// the next candidate instead of breaking the page.

import type { Holder, HolderTag, Pool, PoolKind } from "@/lib/types";

export type Json = Record<string, unknown>;

export function rec(v: unknown): Json | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null;
}

/** CMC wraps payloads as { data, status }; return the payload. */
export function unwrap(raw: unknown): unknown {
  const r = rec(raw);
  return r && "data" in r ? r.data : raw;
}

export function list(raw: unknown): Json[] {
  const v = unwrap(raw);
  if (Array.isArray(v)) return v.filter((x): x is Json => rec(x) !== null);
  const r = rec(v);
  if (!r) return [];
  for (const k of ["list", "items", "pools", "holders", "lcs"]) {
    if (Array.isArray(r[k])) return (r[k] as unknown[]).filter((x): x is Json => rec(x) !== null);
  }
  return [];
}

export function num(o: Json | null, keys: string[]): number | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
}

export function str(o: Json | null, keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

export function poolKind(label: string): PoolKind {
  const l = label.toLowerCase();
  if (/v3|clmm|dlmm|whirlpool|concentrated|slipstream/.test(l)) return l.includes("v3") ? "v3" : "clmm";
  if (/cpmm|amm/.test(l)) return "cpmm";
  return "v2";
}

const KNOWN_TAGS: HolderTag[] = ["pool", "burn", "cex", "bridge", "locker", "deployer", "team"];

export function holderTags(h: Json): HolderTag[] {
  const raw = Array.isArray(h.tags) ? h.tags : [];
  const words = raw
    .map((t) => (typeof t === "string" ? t : (str(rec(t), ["name", "tag", "label"]) ?? "")))
    .join(" ")
    .toLowerCase();
  const tags = KNOWN_TAGS.filter((t) => words.includes(t));
  if (/exchange|binance|okx|bybit|coinbase/.test(words) && !tags.includes("cex")) tags.push("cex");
  if (/\blp\b|pair|liquidity/.test(words) && !tags.includes("pool")) tags.push("pool");
  if (/dead|null|black ?hole/.test(words) && !tags.includes("burn")) tags.push("burn");
  return tags;
}

export function parsePools(raw: unknown): Pool[] {
  return list(raw)
    .map((p, i): Pool => {
      const dex = str(p, ["exn", "dexName", "dex", "exchangeName", "dexer"]) ?? "DEX";
      const t0 = str(rec(p.t0), ["sym", "symbol"]) ?? "?";
      const t1 = str(rec(p.t1), ["sym", "symbol"]) ?? "?";
      const version = str(p, ["v", "version", "poolType", "type"]) ?? "";
      // Fee may arrive as a fraction (0.003) or in basis points (30); default 0.3%.
      const feeRaw = num(p, ["feeRate", "fee"]);
      const feeBps = feeRaw === undefined ? 30 : feeRaw < 1 ? Math.round(feeRaw * 10_000) : Math.round(feeRaw);
      return {
        address: str(p, ["addr", "address", "poolAddress", "pairAddress"]) ?? `pool-${i}`,
        dex,
        pair: `${t0}/${t1}`,
        kind: poolKind(`${dex} ${version}`),
        liqUsd: num(p, ["liqUsd", "liquidityUsd", "liquidity", "liq"]) ?? 0,
        feeBps,
      };
    })
    .filter((p) => p.liqUsd > 0)
    .sort((a, b) => b.liqUsd - a.liqUsd);
}

export function parseHolders(raw: unknown): Holder[] {
  return list(raw)
    .map((h): Holder => {
      const label = str(h, ["label", "name", "alias"]);
      return {
        address: str(h, ["addr", "address", "wallet", "owner"]) ?? "",
        ...(label ? { label } : {}),
        // actualBalance is decimal-adjusted; balance may be raw units, so it comes second.
        balance: num(h, ["actualBalance", "balance", "amount", "b"]) ?? 0,
        tags: holderTags(h),
      };
    })
    .filter((h) => h.address && h.balance > 0);
}

export function parseSellTaxPct(raw: unknown): number {
  const d = rec(unwrap(raw));
  const fromRoot = num(d, ["sellTax", "sell_tax", "st"]);
  const nested = num(rec(d?.tax ?? null), ["sell", "sellTax"]);
  const v = fromRoot ?? nested ?? 0;
  // A value at or below 1 is a fraction (0.05), above 1 already a percent (5).
  return v <= 1 ? v * 100 : v;
}

export function parseLpChangePct(raw: unknown): number {
  const d = rec(unwrap(raw));
  const direct = num(d, ["chg24h", "change24h", "lc24h"]);
  if (direct !== undefined) return direct;
  // Otherwise compare the oldest and newest total-liquidity points in the window.
  // tlu is total liquidity USD; a0, a1 and tu are not described in the schema.
  const points = list(raw)
    .map((e) => ({ t: num(e, ["t", "ts", "time"]) ?? 0, v: num(e, ["tlu", "tu"]) ?? NaN }))
    .filter((p) => Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return 0;
  return ((points[points.length - 1].v - points[0].v) / points[0].v) * 100;
}

/** Token info: price, symbol, name and supply, or undefined fields when missing. */
export function parseTokenInfo(raw: unknown): { priceUsd?: number; symbol?: string; name?: string; supply?: number } {
  const info = rec(unwrap(raw));
  return {
    priceUsd: num(info, ["priceUsd", "price", "pu", "p"]),
    symbol: str(info, ["sym", "symbol"]),
    name: str(info, ["n", "name"]),
    supply: num(info, ["ts", "totalSupply", "supply"]),
  };
}

export interface SearchHit {
  platform: string;
  address: string;
  symbol: string;
  name: string;
}

export function parseSearch(raw: unknown): SearchHit[] {
  return list(raw)
    .map((r) => ({
      platform: str(r, ["platform", "plt", "network", "chain"]) ?? "",
      address: str(r, ["addr", "address", "tokenAddress", "contractAddress"]) ?? "",
      symbol: str(r, ["sym", "symbol"]) ?? "",
      name: str(r, ["n", "name"]) ?? "",
    }))
    .filter((h) => h.address.length > 0);
}
