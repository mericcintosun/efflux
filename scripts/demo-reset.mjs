// npm run demo:reset: return the demo to the same start state every time.
// Run with: node --experimental-strip-types scripts/demo-reset.mjs
//
// Efflux keeps no server state: no database, no KV, no contract. The share link
// carries every control in the URL. So a reset only has to:
// 1. remove .next/cache/fetch-cache (the 60 s CoinMarketCap response cache that
//    `next start` keeps on disk), if it exists;
// 2. regenerate fixtures/seed.json exactly as `npm run seed` does.
// Deterministic: no timestamps or random values reach the seed output.
// File writes are allowed here because this lives in scripts/.

import { access, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fetchCache = resolve(root, ".next", "cache", "fetch-cache");

let cleared = false;
try {
  await access(fetchCache);
  await rm(fetchCache, { recursive: true, force: true });
  cleared = true;
} catch {
  cleared = false;
}

// seed.mjs writes fixtures/seed.json at import time (top-level await).
await import("./seed.mjs");

console.log(
  `demo:reset: ${cleared ? "removed .next/cache/fetch-cache" : "no .next/cache/fetch-cache to remove"}, regenerated fixtures/seed.json; no database to migrate.`
);
