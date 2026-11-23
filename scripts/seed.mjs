// Writes fixtures/seed.json from lib/data/seed.ts.
// Run with: npm run seed (node --experimental-strip-types scripts/seed.mjs)
// Deterministic: no timestamps, no randomness, so two runs give the same file.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_HOLDING_USD, PLATFORM_LABEL, tokens } from "../lib/data/seed.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "fixtures", "seed.json");

const payload = {
  defaultHoldingUsd: DEFAULT_HOLDING_USD,
  platformLabel: PLATFORM_LABEL,
  tokens,
};

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`seed: wrote ${tokens.length} tokens to fixtures/seed.json`);
