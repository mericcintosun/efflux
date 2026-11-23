// Shared types for Efflux. One source for the seed module, the adapter, the
// CoinMarketCap client, the simulation and every route handler.
// Plain types only (no enums, no runtime code), so lib/data/seed.ts can import
// them under `node --experimental-strip-types`.

import type { ErrorBody } from "./errors";

export type Platform = "base" | "bsc" | "solana";

/** v2 / cpmm are true constant product; v3 / clmm are concentrated liquidity. */
export type PoolKind = "v2" | "v3" | "cpmm" | "clmm";

export interface Pool {
  address: string;
  dex: string;
  pair: string;
  kind: PoolKind;
  /** Total pool liquidity in USD, both sides (CMC field: liqUsd). */
  liqUsd: number;
  feeBps: number;
}

/**
 * Tags that mean "this address will not market-sell": the pool itself, a burn
 * address, an exchange, a bridge or a token locker. lib/simulate.ts skips them.
 */
export type HolderTag = "pool" | "burn" | "cex" | "bridge" | "locker" | "deployer" | "team";

export interface Holder {
  address: string;
  label?: string;
  /** Token units, not USD. */
  balance: number;
  tags: HolderTag[];
}

export interface TokenSnapshot {
  slug: string;
  symbol: string;
  name: string;
  platform: Platform;
  address: string;
  priceUsd: number;
  supply: number;
  /** Percent, e.g. 5 means 5% (CMC: /v1/dex/security/detail). */
  sellTaxPct: number;
  /** Net LP change over 24h in percent (CMC: /v1/dex/liquidity-change/list). */
  lpChange24hPct: number;
  pools: Pool[];
  holders: Holder[];
  snapshotAt: string;
}

/** One recorded CoinMarketCap request, shown in the proof drawer on /play. */
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

/**
 * Where a response came from.
 * - fake: seed data from lib/data/seed.ts (ADAPTER_MODE=fake, the default)
 * - live: a real CoinMarketCap response
 * - snapshot: a bundled snapshot served in real mode when live data was unusable
 * - none: nothing to show
 */
export type DataSource = "fake" | "live" | "snapshot" | "none";

/** The one response shape every route handler returns on success. */
export interface ApiEnvelope<T> {
  source: DataSource;
  data: T | null;
  proof: ApiProof[];
  message: string;
  /** Set when data is null (or a fallback was served): a typed code, never provider text. */
  error?: ErrorBody;
}

/** What /api/exit returns for one token. */
export type ExitBundle = ApiEnvelope<TokenSnapshot>;
