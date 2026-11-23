// The one data seam. Pages and route handlers ask getAdapter() for tokens and
// never import seed arrays, lib/cmc or lib/config themselves.
//
// ADAPTER_MODE=fake (the default) serves lib/data/seed.ts and never touches the
// network. ADAPTER_MODE=real loads the demo tokens (DEMO_TOKENS in lib/config.ts)
// and any pasted address live from CoinMarketCap through lib/cmc.ts, falling back
// per token to the seed when a live load fails. Server-side only.

import { CMC_ENDPOINTS, loadExitBundle } from "@/lib/cmc";
import { DEMO_TOKENS, KEYLESS_BASE, LIST_BUDGET_MS, LOOKUP_BUDGET_MS } from "@/lib/config";
import { findToken, findTokenByAddress, tokens } from "@/lib/data/seed";
import { errorBody } from "@/lib/errors";
import type { ApiEnvelope, ApiProof, Platform, TokenSnapshot } from "@/lib/types";

export { CMC_ENDPOINTS };

export interface ExitAdapter {
  listTokens(): Promise<ApiEnvelope<TokenSnapshot[]>>;
  getToken(slug: string): Promise<ApiEnvelope<TokenSnapshot>>;
  lookup(platform: Platform, address: string): Promise<ApiEnvelope<TokenSnapshot>>;
}

const SEED_NOTE = "Seed data, not a live response.";

/** What each endpoint would carry, taken from the seed token's own fields. */
function seedExcerpt(path: string, t: TokenSnapshot): unknown {
  switch (path) {
    case "/v1/dex/token":
      return { symbol: t.symbol, name: t.name, priceUsd: t.priceUsd, supply: t.supply };
    case "/v1/dex/token/pools":
      return t.pools;
    case "/v1/dex/holders/list":
      return t.holders;
    case "/v1/dex/security/detail":
      return { sellTaxPct: t.sellTaxPct };
    case "/v1/dex/liquidity-change/list":
      return { lpChange24hPct: t.lpChange24hPct };
    default:
      return { symbol: t.symbol, name: t.name, platform: t.platform, address: t.address };
  }
}

/**
 * Illustrative proof entries for a seed token: one per endpoint Efflux uses,
 * marked keyless, stamped with the snapshot time and labelled as seed data so
 * the proof drawer never passes them off as a live call.
 */
export function seedProof(t: TokenSnapshot): ApiProof[] {
  return CMC_ENDPOINTS.map((e): ApiProof => {
    const isPost = e.method === "POST";
    const url = new URL(KEYLESS_BASE + e.path);
    if (!isPost) {
      if (e.path === "/v1/dex/search") url.searchParams.set("keyword", t.symbol);
      else {
        url.searchParams.set("platform", t.platform);
        url.searchParams.set("address", t.address);
      }
    }
    const json = JSON.stringify(seedExcerpt(e.path, t), null, 2);
    return {
      endpoint: e.path,
      method: e.method,
      url: url.toString(),
      body: isPost ? { tokenAddress: t.address, platform: t.platform } : undefined,
      status: 200,
      ms: 0,
      at: t.snapshotAt,
      keyed: false,
      excerpt: `${SEED_NOTE}\n${json}`.slice(0, 2400),
    };
  });
}

function seedToken(slug: string, source: "fake" | "snapshot"): ApiEnvelope<TokenSnapshot> {
  const t = findToken(slug);
  if (!t) {
    return { source: "none", data: null, proof: [], message: `There is no sample token called "${slug}".`, error: errorBody("not_found") };
  }
  return {
    source,
    data: t,
    proof: source === "fake" ? seedProof(t) : [],
    message: `Seed data for ${t.symbol}, captured ${t.snapshotAt}.`,
  };
}

export const fakeAdapter: ExitAdapter = {
  async listTokens() {
    return {
      source: "fake",
      data: tokens,
      proof: tokens.flatMap(seedProof),
      message: `${tokens.length} seed tokens. Seed data, not a live response.`,
    };
  },
  async getToken(slug) {
    return seedToken(slug, "fake");
  },
  async lookup(platform, address) {
    const t = findTokenByAddress(address);
    if (!t || t.platform !== platform) {
      return {
        source: "none",
        data: null,
        proof: [],
        message:
          "Efflux is running on seed data, so only the three sample addresses resolve. Set ADAPTER_MODE=real to read any address from CoinMarketCap.",
        error: errorBody("not_found"),
      };
    }
    return {
      source: "fake",
      data: t,
      proof: seedProof(t),
      message: `Seed data for ${t.symbol}. Set ADAPTER_MODE=real to read it from CoinMarketCap.`,
    };
  },
};

const LATE = Symbol("late");

/** Resolves to LATE after `ms`, so a Promise.race can give up on a slow load. */
function budget(ms: number): Promise<typeof LATE> {
  return new Promise((resolve) => setTimeout(() => resolve(LATE), ms));
}

/**
 * Real mode sample list: every DEMO_TOKENS entry loads through loadExitBundle in
 * parallel, each one raced against LIST_BUDGET_MS. A live result inside the
 * budget is used as is. A failed one, a late one, or a chain with no demo
 * address falls back to the seed token on the same chain and is named in the
 * message. The late load keeps running and warms the 60 s cache for the next
 * request.
 */
async function loadDemoTokens(): Promise<ApiEnvelope<TokenSnapshot[]>> {
  const chains: Platform[] = ["base", "bsc", "solana"];
  const results = await Promise.all(
    chains.map(async (platform) => {
      const seed = tokens.find((t) => t.platform === platform);
      const demo = DEMO_TOKENS[platform];
      if (!demo) return { platform, live: null as TokenSnapshot | null, seed, proof: [] as ApiProof[], late: false };
      const load = loadExitBundle(demo.platform, demo.address).catch(() => null);
      const env = await Promise.race([load, budget(LIST_BUDGET_MS)]);
      if (env === LATE) {
        // Fallback branch: over budget, serve the seed snapshot for this chain.
        return { platform, live: null, seed, proof: [] as ApiProof[], late: true };
      }
      if (!env) return { platform, live: null, seed, proof: [] as ApiProof[], late: false };
      return { platform, live: env.source === "live" ? env.data : null, seed, proof: env.proof, late: false };
    })
  );

  const data: TokenSnapshot[] = [];
  const fellBack: string[] = [];
  for (const r of results) {
    if (r.live) data.push(r.live);
    else if (r.seed) {
      data.push(r.seed);
      fellBack.push(`${r.seed.symbol} (${r.platform}${r.late ? `, over the ${LIST_BUDGET_MS / 1000} s budget` : ""})`);
    }
  }
  const proof = results.flatMap((r) => r.proof);
  const liveCount = data.length - fellBack.length;
  const allLive = fellBack.length === 0 && data.length > 0;
  return {
    source: allLive ? "live" : "snapshot",
    data,
    proof,
    message: allLive
      ? `${data.length} tokens live from CoinMarketCap.`
      : liveCount > 0
        ? `Bundled snapshot used for ${fellBack.join(", ")}; the other ${liveCount} live from CoinMarketCap.`
        : `Bundled snapshot used for ${fellBack.join(", ")}; CoinMarketCap returned nothing usable.`,
  };
}

export const realAdapter: ExitAdapter = {
  listTokens() {
    return loadDemoTokens();
  },
  async getToken(slug) {
    const env = await loadDemoTokens();
    const t = (env.data ?? []).find((x) => x.slug === slug.toLowerCase());
    if (!t) {
      return { source: "none", data: null, proof: env.proof, message: `There is no sample token called "${slug}".`, error: errorBody("not_found") };
    }
    const isSeed = tokens.some((s) => s.slug === t.slug);
    return {
      source: isSeed ? "snapshot" : "live",
      data: t,
      proof: env.proof.filter((p) => p.url.includes(encodeURIComponent(t.address)) || p.body?.tokenAddress === t.address),
      message: isSeed ? `Bundled snapshot for ${t.symbol}.` : `Live from CoinMarketCap: ${t.symbol}.`,
    };
  },
  lookup(platform, address) {
    return loadExitBundle(platform, address);
  },
};

/**
 * Every user lookup, raced against LOOKUP_BUDGET_MS: GET /api/exit and the
 * server-resolved shared /play link both call this, so no lookup waits more than
 * 4 s on CoinMarketCap. Fallback branch: a late lookup comes back as an
 * `upstream_timeout` envelope and the UI shows its "Try again" button. The late
 * load keeps running and warms the 60 s cache, so the retry is usually fast.
 */
export async function lookupWithinBudget(platform: Platform, address: string): Promise<ApiEnvelope<TokenSnapshot>> {
  const env = await Promise.race([getAdapter().lookup(platform, address).catch(() => null), budget(LOOKUP_BUDGET_MS)]);
  if (env === LATE || env === null) {
    const code = env === LATE ? "upstream_timeout" : "upstream_error";
    return {
      source: "none",
      data: null,
      proof: [],
      message: env === LATE ? `CoinMarketCap did not answer within ${LOOKUP_BUDGET_MS / 1000} s.` : "The lookup failed on our server.",
      error: errorBody(code),
    };
  }
  return env;
}

export function getAdapter(): ExitAdapter {
  return process.env.ADAPTER_MODE === "real" ? realAdapter : fakeAdapter;
}
