// The one data seam. Pages and route handlers ask getAdapter() for tokens and
// never import seed arrays themselves.
//
// ADAPTER_MODE=fake (the default) serves lib/data/seed.ts and never touches the
// network. ADAPTER_MODE=real sends address lookups to CoinMarketCap through
// loadExitBundle in lib/cmc.ts. Server-side only.

import { CMC_ENDPOINTS, loadExitBundle } from "@/lib/cmc";
import { findToken, findTokenByAddress, tokens } from "@/lib/data/seed";
import type { ApiEnvelope, ApiProof, Platform, TokenSnapshot } from "@/lib/types";

export interface ExitAdapter {
  listTokens(): Promise<ApiEnvelope<TokenSnapshot[]>>;
  getToken(slug: string): Promise<ApiEnvelope<TokenSnapshot>>;
  lookup(platform: Platform, address: string): Promise<ApiEnvelope<TokenSnapshot>>;
}

const KEYLESS_BASE = "https://pro-api.coinmarketcap.com/public-api";
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
    return { source: "none", data: null, proof: [], message: `There is no sample token called "${slug}".` };
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

export const realAdapter: ExitAdapter = {
  // Phase 2 swaps these seeds for captured snapshots of real tokens.
  async listTokens() {
    return {
      source: "snapshot",
      data: tokens,
      proof: [],
      message: `${tokens.length} bundled snapshots. Paste an address to read live data.`,
    };
  },
  async getToken(slug) {
    return seedToken(slug, "snapshot");
  },
  lookup(platform, address) {
    return loadExitBundle(platform, address);
  },
};

export function getAdapter(): ExitAdapter {
  return process.env.ADAPTER_MODE === "real" ? realAdapter : fakeAdapter;
}
