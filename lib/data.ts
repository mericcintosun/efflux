// Compat barrel: types live in lib/types.ts and seed data in lib/data/seed.ts; pages read tokens through lib/adapter.ts.
import type { DataSource } from "./types";

export * from "./types";
export * from "./data/seed";

/** The one-line source note shown on / and /play, driven by the envelope source. */
export const SOURCE_LABEL: Record<DataSource, string> = {
  live: "Live from CoinMarketCap",
  fake: "Seed data, not a live response",
  snapshot: "Bundled snapshot, CoinMarketCap was unavailable for some tokens",
  none: "No data source",
};
