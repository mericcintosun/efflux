// CoinMarketCap DEX integration. Server-side only; imported by lib/adapter.ts alone.
//
// Paths, both real:
// - Default: the keyless public API (KEYLESS_BASE in lib/config.ts). No key,
//   shared IP-based rate limit. This is what the deployed demo uses.
// - Optional: when CMC_PRO_API_KEY is set, the same paths go to the keyed host
//   with the X-CMC_PRO_API_KEY header.
// Every call is aborted after 8 seconds, and a 429, a network error or a timeout
// gets exactly one retry after 600 ms (a fixed wait, no backoff). Other HTTP errors
// are not retried. Failures come back as typed ErrorCodes, never provider text.
//
// Every call is recorded as an ApiProof (method, URL, body, status, timing and the
// first part of the raw response) so the UI can show a real request and its
// response. The key is sent as a header and never appears in a proof or a log.
//
// Response pickers live in lib/cmc-parse.ts (pure, tested against fixtures).

import {
  CACHE_SECONDS,
  CMC_RETRIES,
  CMC_RETRY_DELAY_MS,
  CMC_TIMEOUT_MS,
  HOLDERS_MEMO_MS,
  KEYED_BASE,
  KEYLESS_BASE,
  LOG_PREFIX,
  PLATFORM_PARAM,
  PROOF_EXCERPT_CHARS,
  getCmcKey,
} from "@/lib/config";
import { findTokenByAddress } from "@/lib/data/seed";
import { errorBody, type ErrorCode } from "@/lib/errors";
import {
  list,
  parseHolders,
  parseLpChangePct,
  parsePools,
  parseSearch,
  parseSellTaxPct,
  parseTokenInfo,
  rec,
  unwrap,
  type SearchHit,
} from "@/lib/cmc-parse";
import type { ApiEnvelope, ApiProof, Platform, TokenSnapshot } from "@/lib/types";

// Re-exported so existing imports from "@/lib/cmc" keep compiling.
export type { ApiProof, ExitBundle } from "@/lib/types";

/**
 * The endpoints in lib/cmc.ts, listed for the README, /notes and the proof drawer.
 * `live: true` marks the 5 that loadExitBundle calls for every token; the search
 * wrapper is listed with `live: false` because the UI does not call it.
 */
export const CMC_ENDPOINTS = [
  { method: "GET", path: "/v1/dex/token", live: true, use: "Price, symbol, name and supply of the token" },
  { method: "GET", path: "/v1/dex/token/pools", live: true, use: "Every pool with liqUsd and both token sides, the input for virtual reserves" },
  { method: "POST", path: "/v1/dex/holders/list", live: true, use: "Largest holders with balances and tags, the queue ahead of you" },
  { method: "GET", path: "/v1/dex/security/detail", live: true, use: "Sell tax" },
  { method: "GET", path: "/v1/dex/liquidity-change/list", live: true, use: "Liquidity added and removed, for the 24h LP drain" },
  { method: "GET", path: "/v1/dex/search", live: false, use: "Token search by name or symbol: wrapper exists in lib/cmc.ts, not called by the live UI yet" },
] as const;

type CallResult = { ok: true; json: unknown } | { ok: false; code: ErrorCode };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(line: string) {
  console.log(`${LOG_PREFIX} ${line}`);
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

async function cmcCall(
  path: string,
  opts: { method: "GET" | "POST"; query?: Record<string, string>; body?: Record<string, string> },
  proof: ApiProof[]
): Promise<CallResult> {
  const key = getCmcKey();
  const url = new URL((key ? KEYED_BASE : KEYLESS_BASE) + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (key) headers["X-CMC_PRO_API_KEY"] = key;

  const record = (status: number, ms: number, excerpt: string) =>
    proof.push({
      endpoint: path,
      method: opts.method,
      url: url.toString(),
      body: opts.body,
      status,
      ms,
      at: new Date().toISOString(),
      keyed: Boolean(key),
      excerpt: excerpt.slice(0, PROOF_EXCERPT_CHARS),
    });

  // attempt 0 is the call, attempt 1 the single retry (CMC_RETRIES = 1). Bounded.
  for (let attempt = 0; attempt <= CMC_RETRIES; attempt++) {
    const canRetry = attempt < CMC_RETRIES;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(CMC_TIMEOUT_MS),
        // Server cache keeps the shared keyless rate limit happy. Every GET is
        // cached 60 s by the Next data cache. The holders POST is not, so
        // holdersCall() below memoizes it in process memory for the same 60 s.
        next: { revalidate: CACHE_SECONDS },
      });
      const text = await res.text();
      const ms = Date.now() - started;
      log(`cmc call ${path} status=${res.status} ms=${ms} bytes=${text.length}${attempt > 0 ? " retry=1" : ""}`);
      record(res.status, ms, text);
      if (res.status === 429 && canRetry) {
        await sleep(CMC_RETRY_DELAY_MS);
        continue;
      }
      if (!res.ok) return { ok: false, code: "upstream_error" };
      try {
        return { ok: true, json: JSON.parse(text) as unknown };
      } catch {
        return { ok: false, code: "parse_failure" };
      }
    } catch (err) {
      const ms = Date.now() - started;
      const timedOut = isTimeout(err);
      log(`cmc call ${path} status=0 ms=${ms} bytes=0 err=${timedOut ? "timeout" : "network"}${attempt > 0 ? " retry=1" : ""}`);
      record(0, ms, timedOut ? `Timed out after ${CMC_TIMEOUT_MS} ms.` : "Network error: the request did not reach CoinMarketCap.");
      if (canRetry) {
        await sleep(CMC_RETRY_DELAY_MS);
        continue;
      }
      return { ok: false, code: timedOut ? "upstream_timeout" : "upstream_error" };
    }
  }
  return { ok: false, code: "upstream_error" };
}

const json = (r: CallResult): unknown => (r.ok ? r.json : null);

/**
 * The Next data cache does not keep POST responses, so the holders call gets a
 * small in-process memo: server memory only, keyed by platform plus address,
 * HOLDERS_MEMO_MS long, successful answers only. A hit replays the proof
 * entries of the call that filled it, so the drawer still shows a real request.
 */
const holdersMemo = new Map<string, { until: number; result: CallResult; proof: ApiProof[] }>();

async function holdersCall(platform: Platform, address: string, proof: ApiProof[]): Promise<CallResult> {
  const key = `${platform}:${address.toLowerCase()}`;
  const now = Date.now();
  const hit = holdersMemo.get(key);
  if (hit && hit.until > now) {
    proof.push(...hit.proof);
    log(`cmc call /v1/dex/holders/list memo=hit`);
    return hit.result;
  }
  if (hit) holdersMemo.delete(key);
  const own: ApiProof[] = [];
  const result = await cmcCall(
    "/v1/dex/holders/list",
    { method: "POST", body: { tokenAddress: address, platform: PLATFORM_PARAM[platform] } },
    own
  );
  proof.push(...own);
  if (result.ok) {
    if (holdersMemo.size > 200) holdersMemo.clear();
    holdersMemo.set(key, { until: now + HOLDERS_MEMO_MS, result, proof: own });
  }
  return result;
}

/** True when a 2xx body has no list shape the pool picker understands. */
function unreadableList(raw: unknown): boolean {
  const v = unwrap(raw);
  if (Array.isArray(v)) return false;
  const r = rec(v);
  if (!r) return true;
  return list(raw).length === 0 && !Object.values(r).some(Array.isArray);
}

/**
 * Load everything the simulation needs for one token: five CMC DEX calls.
 * Falls back to the bundled snapshot (same address) when the live data is unusable,
 * and sets `error` with a typed code whenever live data was not used.
 */
export async function loadExitBundle(platform: Platform, address: string): Promise<ApiEnvelope<TokenSnapshot>> {
  const proof: ApiProof[] = [];
  const query = { platform: PLATFORM_PARAM[platform], address };

  const [tokenRes, poolsRes, holdersRes, securityRes, lcRes] = await Promise.all([
    cmcCall("/v1/dex/token", { method: "GET", query }, proof),
    cmcCall("/v1/dex/token/pools", { method: "GET", query }, proof),
    holdersCall(platform, address, proof),
    cmcCall("/v1/dex/security/detail", { method: "GET", query }, proof),
    cmcCall("/v1/dex/liquidity-change/list", { method: "GET", query }, proof),
  ]);

  const info = parseTokenInfo(json(tokenRes));
  const pools = parsePools(json(poolsRes));
  const holders = parseHolders(json(holdersRes));
  const priceUsd = info.priceUsd;

  if (priceUsd && priceUsd > 0 && pools.length > 0) {
    const symbol = info.symbol ?? "TOKEN";
    log(`bundle ${platform} source=live pools=${pools.length} holders=${holders.length}`);
    return {
      source: "live",
      data: {
        slug: `${platform}-${address.slice(0, 10).toLowerCase()}`,
        symbol,
        name: info.name ?? symbol,
        platform,
        address,
        priceUsd,
        supply: info.supply ?? holders.reduce((s, h) => s + h.balance, 0),
        sellTaxPct: parseSellTaxPct(json(securityRes)),
        lpChange24hPct: parseLpChangePct(json(lcRes)),
        pools,
        holders,
        snapshotAt: new Date().toISOString(),
      },
      proof,
      message: holders.length
        ? `Live from CoinMarketCap: ${pools.length} pools, ${holders.length} holders.`
        : "Live pools from CoinMarketCap, but no holder list came back, so the queue is empty.",
    };
  }

  // Pick the most telling code: the pools call first, then the token call.
  const code: ErrorCode = !poolsRes.ok
    ? poolsRes.code
    : !tokenRes.ok
      ? tokenRes.code
      : unreadableList(poolsRes.json)
        ? "parse_failure"
        : "not_found";
  log(`bundle ${platform} source=fallback error=${code}`);

  const snapshot = findTokenByAddress(address);
  if (snapshot) {
    return {
      source: "snapshot",
      data: snapshot,
      proof,
      message: "CoinMarketCap did not return usable pools for this address, so this is the bundled snapshot.",
      error: errorBody(code),
    };
  }
  return {
    source: "none",
    data: null,
    proof,
    message: "CoinMarketCap returned no usable price or pools for this address on this chain.",
    error: errorBody(code),
  };
}

/**
 * Token search by name or symbol through /v1/dex/search. A wrapper only: no
 * page, route or component calls it, so the live UI makes 5 DEX calls per token.
 */
export async function searchTokens(keyword: string): Promise<ApiEnvelope<SearchHit[]>> {
  const proof: ApiProof[] = [];
  const res = await cmcCall("/v1/dex/search", { method: "GET", query: { keyword } }, proof);
  if (!res.ok) {
    return { source: "none", data: null, proof, message: "Search failed.", error: errorBody(res.code) };
  }
  const hits = parseSearch(res.json);
  return {
    source: "live",
    data: hits,
    proof,
    message: `${hits.length} results from CoinMarketCap.`,
  };
}
