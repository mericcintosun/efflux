// The only module that reads process.env for CoinMarketCap and demo settings.
// ADAPTER_MODE is the one exception: lib/adapter.ts reads it once in getAdapter().
// Server-side only: never import this file from a "use client" component.

import type { Platform } from "@/lib/types";

/** Keyless public CoinMarketCap API. No key, shared IP-based rate limit. */
export const KEYLESS_BASE = "https://pro-api.coinmarketcap.com/public-api";

/** Keyed host, used only when CMC_PRO_API_KEY is set. */
export const KEYED_BASE = "https://pro-api.coinmarketcap.com";

/** Every CoinMarketCap fetch is aborted after this many milliseconds. */
export const CMC_TIMEOUT_MS = 8000;

/** Exactly one retry, only on HTTP 429, a network error or a timeout. */
export const CMC_RETRIES = 1;

/** Wait before the single retry. */
export const CMC_RETRY_DELAY_MS = 600;

/** Server cache for CoinMarketCap responses, in seconds. */
export const CACHE_SECONDS = 60;

/** Prefix for every core-path log line. */
export const LOG_PREFIX = "[core]";

/** How much of a raw response the proof drawer keeps. */
export const PROOF_EXCERPT_CHARS = 2400;

/** Platform identifiers sent to the DEX endpoints. Unverified until `npm run proof` reports. */
export const PLATFORM_PARAM: Record<Platform, string> = { base: "base", bsc: "bsc", solana: "solana" };

export interface DemoToken {
  platform: Platform;
  address: string;
}

function envAddress(name: "EFFLUX_DEMO_BASE_ADDRESS" | "EFFLUX_DEMO_BSC_ADDRESS" | "EFFLUX_DEMO_SOLANA_ADDRESS"): string | undefined {
  const v = (process.env[name] ?? "").trim();
  return v.length > 0 ? v : undefined;
}

/**
 * One long-lived token per chain for the story and the simulator samples in
 * ADAPTER_MODE=real. The Base (BRETT) and Solana (BONK) defaults are unverified
 * until `npm run proof` reports a result for them. BSC has no default: without
 * EFFLUX_DEMO_BSC_ADDRESS that chain keeps its seed token.
 */
export const DEMO_TOKENS: Record<Platform, DemoToken | null> = {
  base: { platform: "base", address: envAddress("EFFLUX_DEMO_BASE_ADDRESS") ?? "0x532f27101965dd16442E59d40670FaF5eBB142E4" },
  bsc: envAddress("EFFLUX_DEMO_BSC_ADDRESS") ? { platform: "bsc", address: envAddress("EFFLUX_DEMO_BSC_ADDRESS")! } : null,
  solana: { platform: "solana", address: envAddress("EFFLUX_DEMO_SOLANA_ADDRESS") ?? "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
};

/** Optional CoinMarketCap key. Server only; never logged, never put in a proof entry. */
export function getCmcKey(): string | undefined {
  const k = (process.env.CMC_PRO_API_KEY ?? "").trim();
  return k.length > 0 ? k : undefined;
}
