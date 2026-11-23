// CoinMarketCap DEX integration. Server-side only (imported by app/api/exit/route.ts).
//
// Paths, both real:
// - Default: the keyless public API at https://pro-api.coinmarketcap.com/public-api.
//   No key, shared IP-based rate limit. This is what the deployed demo uses.
// - Optional: when CMC_PRO_API_KEY is set, the same paths go to the keyed
//   https://pro-api.coinmarketcap.com host with the X-CMC_PRO_API_KEY header.
// When CoinMarketCap returns nothing usable, loadExitBundle falls back to the
// bundled snapshot for that address (lib/data.ts) and says so in `message`.
//
// Every call is recorded as an ApiProof (method, URL, body, status, timing and the
// first part of the raw response) so the UI can show judges a real request and
// its response. The key is sent as a header and never appears in a proof.
//
// TODO: verify field names with curl against one Base, BSC and Solana token and
// tighten the pickers below. The OpenAPI schema documents pools (liqUsd, t0, t1)
// and holders (balance, actualBalance, percent, tags) but not every field.

import { findTokenByAddress, type Holder, type HolderTag, type Platform, type Pool, type PoolKind, type TokenSnapshot } from "@/lib/data";

const KEYLESS_BASE = "https://pro-api.coinmarketcap.com/public-api";
const KEYED_BASE = "https://pro-api.coinmarketcap.com";
const MAX_RETRIES = 3;

export interface ApiProof {
  endpoint: string;
  method: "GET" | "POST";
  url: string;
  body?: Record<string, string>;
  status: number;
  ms: number;
  at: string;
  keyed: boolean;
  excerpt: string;
}

export interface ExitBundle {
  source: "live" | "snapshot" | "none";
  token: TokenSnapshot | null;
  proof: ApiProof[];
  message: string;
}

/** The endpoints Efflux calls, listed for the README, /notes and the proof drawer. */
export const CMC_ENDPOINTS = [
  { method: "GET", path: "/v1/dex/token", use: "Price, symbol, name and supply of the token" },
  { method: "GET", path: "/v1/dex/token/pools", use: "Every pool with liqUsd and both token sides, the input for virtual reserves" },
  { method: "POST", path: "/v1/dex/holders/list", use: "Largest holders with balances and tags, the queue ahead of you" },
  { method: "GET", path: "/v1/dex/security/detail", use: "Sell tax" },
  { method: "GET", path: "/v1/dex/liquidity-change/list", use: "Liquidity added and removed, for the 24h LP drain" },
  { method: "GET", path: "/v1/dex/search", use: "Token search by name or symbol (planned for the search box)" },
] as const;

// TODO: confirm the platform identifiers the DEX endpoints expect for each chain.
const PLATFORM_PARAM: Record<Platform, string> = { base: "base", bsc: "bsc", solana: "solana" };

type Json = Record<string, unknown>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cmcCall(
  path: string,
  opts: { method: "GET" | "POST"; query?: Record<string, string>; body?: Record<string, string> },
  proof: ApiProof[]
): Promise<unknown | null> {
  const key = process.env.CMC_PRO_API_KEY;
  const url = new URL((key ? KEYED_BASE : KEYLESS_BASE) + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (key) headers["X-CMC_PRO_API_KEY"] = key;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        // 60 second server cache keeps the shared keyless rate limit happy.
        ...(opts.method === "GET" ? { next: { revalidate: 60 } } : { cache: "no-store" as const }),
      });
      if (res.status === 429 && attempt < MAX_RETRIES) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      const text = await res.text();
      proof.push({
        endpoint: path,
        method: opts.method,
        url: url.toString(),
        body: opts.body,
        status: res.status,
        ms: Date.now() - started,
        at: new Date().toISOString(),
        keyed: Boolean(key),
        excerpt: text.slice(0, 2400),
      });
      if (!res.ok) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    } catch (err) {
      proof.push({
        endpoint: path,
        method: opts.method,
        url: url.toString(),
        body: opts.body,
        status: 0,
        ms: Date.now() - started,
        at: new Date().toISOString(),
        keyed: Boolean(key),
        excerpt: `Network error: ${err instanceof Error ? err.message : String(err)}`,
      });
      return null;
    }
  }
  return null;
}

// Small defensive pickers: CMC uses short keys (liqUsd, t0, exn) in some DEX
// responses and long ones elsewhere, so each value is read from a list of candidates.

function rec(v: unknown): Json | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null;
}

function unwrap(raw: unknown): unknown {
  const r = rec(raw);
  return r && "data" in r ? r.data : raw;
}

function list(raw: unknown): Json[] {
  const v = unwrap(raw);
  if (Array.isArray(v)) return v.filter((x): x is Json => rec(x) !== null);
  const r = rec(v);
  if (!r) return [];
  for (const k of ["list", "items", "pools", "holders", "lcs"]) {
    if (Array.isArray(r[k])) return (r[k] as unknown[]).filter((x): x is Json => rec(x) !== null);
  }
  return [];
}

function num(o: Json | null, keys: string[]): number | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(o: Json | null, keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function poolKind(label: string): PoolKind {
  const l = label.toLowerCase();
  if (/v3|clmm|dlmm|whirlpool|concentrated|slipstream/.test(l)) return l.includes("v3") ? "v3" : "clmm";
  if (/cpmm|amm/.test(l)) return "cpmm";
  return "v2";
}

const KNOWN_TAGS: HolderTag[] = ["pool", "burn", "cex", "bridge", "locker", "deployer", "team"];

function holderTags(h: Json): HolderTag[] {
  const raw = Array.isArray(h.tags) ? h.tags : [];
  const words = raw
    .map((t) => (typeof t === "string" ? t : str(rec(t), ["name", "tag", "label"]) ?? ""))
    .join(" ")
    .toLowerCase();
  const tags = KNOWN_TAGS.filter((t) => words.includes(t));
  if (/exchange|binance|okx|bybit|coinbase/.test(words) && !tags.includes("cex")) tags.push("cex");
  if (/lp|pair|liquidity/.test(words) && !tags.includes("pool")) tags.push("pool");
  if (/dead|null|black ?hole/.test(words) && !tags.includes("burn")) tags.push("burn");
  return tags;
}

function parsePools(raw: unknown): Pool[] {
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

function parseHolders(raw: unknown): Holder[] {
  return list(raw)
    .map((h) => ({
      address: str(h, ["addr", "address", "wallet", "owner"]) ?? "",
      label: str(h, ["label", "name", "alias"]),
      balance: num(h, ["actualBalance", "balance", "amount", "b"]) ?? 0,
      tags: holderTags(h),
    }))
    .filter((h) => h.address && h.balance > 0);
}

function parseSellTaxPct(raw: unknown): number {
  const d = rec(unwrap(raw));
  const fromRoot = num(d, ["sellTax", "sell_tax", "st"]);
  const nested = num(rec(d?.tax ?? null), ["sell", "sellTax"]);
  const v = fromRoot ?? nested ?? 0;
  // A value at or below 1 is a fraction (0.05), above 1 already a percent (5).
  return v <= 1 ? v * 100 : v;
}

function parseLpChangePct(raw: unknown): number {
  const d = rec(unwrap(raw));
  const direct = num(d, ["chg24h", "change24h", "lc24h"]);
  if (direct !== undefined) return direct;
  // Otherwise compare the oldest and newest total-liquidity points in the window.
  // TODO: confirm the meaning of a0, a1 and tu in lcs entries; tlu is total liquidity USD.
  const points = list(raw)
    .map((e) => ({ t: num(e, ["t", "ts", "time"]) ?? 0, v: num(e, ["tlu", "tu"]) ?? NaN }))
    .filter((p) => Number.isFinite(p.v) && p.v > 0)
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return 0;
  return ((points[points.length - 1].v - points[0].v) / points[0].v) * 100;
}

/**
 * Load everything the simulation needs for one token: five CMC DEX calls.
 * Falls back to the bundled snapshot (same address) when the live data is unusable.
 */
export async function loadExitBundle(platform: Platform, address: string): Promise<ExitBundle> {
  const proof: ApiProof[] = [];
  const query = { platform: PLATFORM_PARAM[platform], address };

  const [tokenRaw, poolsRaw, holdersRaw, securityRaw, lcRaw] = await Promise.all([
    cmcCall("/v1/dex/token", { method: "GET", query }, proof),
    cmcCall("/v1/dex/token/pools", { method: "GET", query }, proof),
    cmcCall("/v1/dex/holders/list", { method: "POST", body: { tokenAddress: address, platform: PLATFORM_PARAM[platform] } }, proof),
    cmcCall("/v1/dex/security/detail", { method: "GET", query }, proof),
    cmcCall("/v1/dex/liquidity-change/list", { method: "GET", query }, proof),
  ]);

  const info = rec(unwrap(tokenRaw));
  const pools = parsePools(poolsRaw);
  const holders = parseHolders(holdersRaw);
  const priceUsd = num(info, ["priceUsd", "price", "pu", "p"]);

  if (priceUsd && priceUsd > 0 && pools.length > 0) {
    const symbol = str(info, ["sym", "symbol"]) ?? "TOKEN";
    return {
      source: "live",
      token: {
        slug: `${platform}-${address.slice(0, 10).toLowerCase()}`,
        symbol,
        name: str(info, ["n", "name"]) ?? symbol,
        platform,
        address,
        priceUsd,
        supply: num(info, ["ts", "totalSupply", "supply"]) ?? holders.reduce((s, h) => s + h.balance, 0),
        sellTaxPct: parseSellTaxPct(securityRaw),
        lpChange24hPct: parseLpChangePct(lcRaw),
        pools,
        holders,
        snapshotAt: new Date().toISOString(),
      },
      proof,
      message: holders.length
        ? `Live from CoinMarketCap: ${pools.length} pools, ${holders.length} holders.`
        : `Live pools from CoinMarketCap, but no holder list came back, so the queue is empty.`,
    };
  }

  const snapshot = findTokenByAddress(address);
  if (snapshot) {
    return {
      source: "snapshot",
      token: snapshot,
      proof,
      message: "CoinMarketCap did not return usable pools for this address, so this is the bundled snapshot.",
    };
  }
  return {
    source: "none",
    token: null,
    proof,
    message: "CoinMarketCap returned no price or pools for this address on this chain. Check the chain and the address.",
  };
}
