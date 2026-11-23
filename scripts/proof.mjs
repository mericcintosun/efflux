// npm run proof: real keyless CoinMarketCap DEX calls for the demo tokens.
// Writes the results into README.md and SUBMISSION.md between the PROOF markers.
// Plain Node ESM, no dependencies. Never throws, always exits 0, never invents
// output: a failed call becomes one honest "Not run" line.
// It never reads or sends CMC_PRO_API_KEY: proof runs on the keyless host only.
//
// The brett-exit block runs the app's own model (exitQuote in lib/simulate.ts and
// the pickers in lib/cmc-parse.ts) through a dynamic import. Both files only use
// `import type`, so Node's type stripping can load them; on a Node that cannot,
// the block says so instead of duplicating the model here.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = resolve(root, "README.md");
const submissionPath = resolve(root, "SUBMISSION.md");
const CHAIN_NAME = { base: "Base", bsc: "BNB Chain", solana: "Solana" };
const HOLDING_USD = 5000;

const KEYLESS_BASE = "https://pro-api.coinmarketcap.com/public-api";
const TIMEOUT_MS = 10000;
const EXCERPT_CHARS = 600;

// Same defaults as lib/config.ts (kept in sync by hand; this script cannot import TypeScript).
const env = (name) => (process.env[name] ?? "").trim() || undefined;
const DEMO = [
  { platform: "base", address: env("EFFLUX_DEMO_BASE_ADDRESS") ?? "0x532f27101965dd16442E59d40670FaF5eBB142E4" },
  { platform: "bsc", address: env("EFFLUX_DEMO_BSC_ADDRESS") },
  { platform: "solana", address: env("EFFLUX_DEMO_SOLANA_ADDRESS") ?? "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
].filter((d) => d.address);

// Candidate keys from lib/cmc-parse.ts, so the README shows which ones a real response carries.
const CANDIDATES = {
  "/v1/dex/token/pools": {
    liquidity: ["liqUsd", "liquidityUsd", "liquidity", "liq"],
    address: ["addr", "address", "poolAddress", "pairAddress"],
    dex: ["exn", "dexName", "dex", "exchangeName", "dexer"],
    version: ["v", "version", "poolType", "type"],
    fee: ["feeRate", "fee"],
    sides: ["t0", "t1"],
  },
  "/v1/dex/holders/list": {
    address: ["addr", "address", "wallet", "owner"],
    balance: ["actualBalance", "balance", "amount", "b"],
    percent: ["percent"],
    tags: ["tags"],
  },
};

async function call(method, path, { query, body } = {}) {
  const url = new URL(KEYLESS_BASE + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { Accept: "application/json", "Content-Type": "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { method, path, url: url.toString(), body, status: res.status, ms: Date.now() - started, text, json };
  } catch (err) {
    const timedOut = err && (err.name === "TimeoutError" || err.name === "AbortError");
    return { method, path, url: url.toString(), body, status: 0, ms: Date.now() - started, error: timedOut ? "timeout" : "network" };
  }
}

function firstItem(json) {
  if (!json || typeof json !== "object") return null;
  const data = "data" in json ? json.data : json;
  if (Array.isArray(data)) return data.find((x) => x && typeof x === "object") ?? null;
  if (data && typeof data === "object") {
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) return v.find((x) => x && typeof x === "object") ?? null;
    }
  }
  return null;
}

function failLine(r) {
  if (r.status === 0) return `Not run in this build: ${r.error === "timeout" ? `the request timed out after ${TIMEOUT_MS} ms` : "no network to reach CoinMarketCap"} (${r.method} ${r.path}).`;
  if (r.status === 429) return `Not run in this build: CoinMarketCap returned 429 (${r.method} ${r.path}).`;
  return `Not run in this build: CoinMarketCap returned ${r.status} (${r.method} ${r.path}).`;
}

const ok = (r) => r.status >= 200 && r.status < 300;
const label = (r, d) => `${r.method} /public-api${r.path} (${d.platform}, \`${d.address}\`)`;

function callBlock(results, at) {
  const lines = [`Captured by \`npm run proof\` at ${at}, keyless host, no key header sent. First ${EXCERPT_CHARS} characters of each response.`, ""];
  for (const { r, d } of results) {
    if (!ok(r)) {
      lines.push(`- ${failLine(r)}`, "");
      continue;
    }
    lines.push(`**${label(r, d)}**: status ${r.status}, ${r.ms} ms${r.body ? `, body \`${JSON.stringify(r.body)}\`` : ""}`, "");
    lines.push("```json", r.text.slice(0, EXCERPT_CHARS), "```", "");
  }
  return lines.join("\n").trimEnd();
}

function fieldsBlock(results) {
  const lines = ["Keys seen in the real responses, checked against the candidate keys in `lib/cmc-parse.ts`.", ""];
  for (const { r, d } of results) {
    if (!ok(r)) {
      lines.push(`- ${failLine(r)}`);
      continue;
    }
    const top = r.json && typeof r.json === "object" ? Object.keys(r.json) : [];
    const item = firstItem(r.json);
    const itemKeys = item ? Object.keys(item) : [];
    lines.push(`- ${label(r, d)}: top-level keys \`${top.join(", ") || "none"}\`; first item keys \`${itemKeys.join(", ") || "none"}\``);
    const cands = CANDIDATES[r.path];
    if (cands) {
      for (const [field, keys] of Object.entries(cands)) {
        const hit = keys.filter((k) => itemKeys.includes(k));
        lines.push(`  - ${field}: ${hit.length ? `found \`${hit.join(", ")}\`` : `none of \`${keys.join(", ")}\``}`);
      }
    }
  }
  return lines.join("\n");
}

// demo-timing: the same five calls lib/cmc.ts loadExitBundle makes, in parallel,
// timed with performance.now(). Measured, never invented.
const DEMO_BUDGET_MS = 5000;

async function timeToken(d) {
  const query = { platform: d.platform, address: d.address };
  const started = performance.now();
  const calls = await Promise.all([
    call("GET", "/v1/dex/token", { query }),
    call("GET", "/v1/dex/token/pools", { query }),
    call("POST", "/v1/dex/holders/list", { body: { tokenAddress: d.address, platform: d.platform } }),
    call("GET", "/v1/dex/security/detail", { query }),
    call("GET", "/v1/dex/liquidity-change/list", { query }),
  ]);
  const totalMs = Math.round(performance.now() - started);
  const info = calls[0].json && typeof calls[0].json === "object" ? calls[0].json.data : null;
  const symbol = info && typeof info === "object" && !Array.isArray(info) ? info.symbol ?? info.sym ?? null : null;
  return { d, calls, totalMs, symbol: typeof symbol === "string" ? symbol : null };
}

function timingBlock(rows, at) {
  if (rows.every((r) => r.calls.every((c) => c.status === 0))) {
    const c = rows[0].calls[0];
    return `Not run in this build: ${c.error === "timeout" ? `every request timed out after ${TIMEOUT_MS} ms` : "no network to reach CoinMarketCap"}.`;
  }
  const lines = [
    `Measured by \`npm run proof\` at ${at}, keyless host. Each row runs the five calls the app makes for one token, in parallel, timed with \`performance.now()\`.`,
    "",
    "| Token | Chain | Total ms | Status codes (token, pools, holders, security, liquidity) | Within 5 s |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const r of rows) {
    const name = r.symbol ?? `${r.d.address.slice(0, 6)}...${r.d.address.slice(-4)}`;
    const codes = r.calls.map((c) => (c.status === 0 ? (c.error === "timeout" ? "timeout" : "network") : String(c.status))).join(", ");
    lines.push(`| ${name} | ${r.d.platform} | ${r.totalMs} | ${codes} | ${r.totalMs < DEMO_BUDGET_MS ? "yes" : "no"} |`);
  }
  return lines.join("\n");
}

/** The first `n` object records of a response, wherever the list sits. */
function firstItems(json, n) {
  if (!json || typeof json !== "object") return [];
  const data = "data" in json ? json.data : json;
  const pick = (arr) => arr.filter((x) => x && typeof x === "object").slice(0, n);
  if (Array.isArray(data)) return pick(data);
  if (data && typeof data === "object") {
    for (const v of Object.values(data)) if (Array.isArray(v)) return pick(v);
  }
  return [];
}

const utc = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const tokenName = (d, symbol) => `${symbol ?? `\`${d.address}\``} on ${CHAIN_NAME[d.platform] ?? d.platform}`;

// holders-sample: the real holders POST for the first demo token (BRETT on Base by default).
function holdersSampleBlock(r, d, symbol, at) {
  if (!ok(r)) return failLine(r);
  const records = firstItems(r.json, 2);
  if (records.length === 0) return `Not run in this build: CoinMarketCap answered ${r.status} but the response held no holder records (POST /v1/dex/holders/list).`;
  return [
    `Fetched by \`npm run proof\` at ${utc(at)}: POST /public-api/v1/dex/holders/list for ${tokenName(d, symbol)}, keyless host, status ${r.status}, ${r.ms} ms, body \`${JSON.stringify(r.body)}\`. First ${records.length} holder records of the real response:`,
    "",
    "```json",
    JSON.stringify(records, null, 2),
    "```",
  ].join("\n");
}

// brett-exit: what a $5,000 position pays at 0, 5 and 10 wallets ahead, computed by
// exitQuote() over the live calls timeToken() just made. Sell tax on, LP drain off,
// the same defaults /play opens with.
async function brettExitBlock(t, at) {
  if (!t) return "Not run in this build: no demo address is configured.";
  const [tokenRes, poolsRes, holdersRes, securityRes, lcRes] = t.calls;
  const failed = [tokenRes, poolsRes, holdersRes].find((c) => !ok(c));
  if (failed) return failLine(failed);
  let sim;
  let parse;
  try {
    sim = await import(pathToFileURL(resolve(root, "lib/simulate.ts")).href);
    parse = await import(pathToFileURL(resolve(root, "lib/cmc-parse.ts")).href);
  } catch (err) {
    return `Not run in this build: this Node version cannot load lib/simulate.ts without a build step (${err && err.code ? err.code : "import failed"}); Node 22.18 or newer strips the types.`;
  }
  const info = parse.parseTokenInfo(tokenRes.json);
  const pools = parse.parsePools(poolsRes.json);
  const holders = parse.parseHolders(holdersRes.json);
  if (!(info.priceUsd > 0) || pools.length === 0) return "Not run in this build: the live response had no usable price or pools.";
  const token = {
    slug: `${t.d.platform}-${t.d.address.slice(0, 10).toLowerCase()}`,
    symbol: info.symbol ?? "TOKEN",
    name: info.name ?? info.symbol ?? "TOKEN",
    platform: t.d.platform,
    address: t.d.address,
    priceUsd: info.priceUsd,
    supply: info.supply ?? holders.reduce((s, h) => s + h.balance, 0),
    sellTaxPct: ok(securityRes) ? parse.parseSellTaxPct(securityRes.json) : 0,
    lpChange24hPct: ok(lcRes) ? parse.parseLpChangePct(lcRes.json) : 0,
    pools,
    holders,
    snapshotAt: at,
  };
  const quote = (ahead) => sim.exitQuote({ token, holdingUsd: HOLDING_USD, walletsAhead: ahead, applyTax: true, applyDrain: false });
  const q0 = quote(0);
  const q5 = quote(5);
  const q10 = quote(10);
  if (q10.walletsAhead === 0) return "Not run in this build: the live holder list had no wallets that can sell, so the queue cannot be shown.";
  const keep = Math.round((q0.receiveUsd / HOLDING_USD) * 100);
  return [
    `${tokenName(t.d, token.symbol)}, fetched ${utc(at)} by \`npm run proof\`: wallet shows ${sim.fmtUsd(HOLDING_USD)}, a sale pays ${sim.fmtUsd(q0.receiveUsd)} now, ${sim.fmtUsd(q5.receiveUsd)} if the top ${q5.walletsAhead} holders sell first, ${sim.fmtUsd(q10.receiveUsd)} if the top ${q10.walletsAhead} do. Selling now keeps ${keep}% of what your wallet shows.`,
    "",
    `Computed by \`exitQuote()\` in \`lib/simulate.ts\` with the sell tax on (${sim.fmtPctValue(token.sellTaxPct)}) and LP drain off, over ${pools.length} live pools and ${holders.length} live holders.`,
  ].join("\n");
}

function replaceBlock(text, name, body, file = "README.md") {
  const begin = `<!-- PROOF:BEGIN ${name} -->`;
  const end = `<!-- PROOF:END ${name} -->`;
  const i = text.indexOf(begin);
  const j = text.indexOf(end);
  if (i < 0 || j < i) {
    console.log(`proof: markers for ${name} not found in ${file}, skipped`);
    return text;
  }
  return text.slice(0, i + begin.length) + "\n" + body + "\n" + text.slice(j);
}

async function main() {
  const at = new Date().toISOString();
  const results = [];
  for (const d of DEMO) {
    const r = await call("GET", "/v1/dex/token/pools", { query: { platform: d.platform, address: d.address } });
    results.push({ r, d });
  }
  let holders = null;
  if (DEMO[0]) {
    const d = DEMO[0];
    const r = await call("POST", "/v1/dex/holders/list", { body: { tokenAddress: d.address, platform: d.platform } });
    results.push({ r, d });
    holders = { r, d };
  }

  for (const { r, d } of results) {
    const summary = ok(r) ? `status=${r.status} ms=${r.ms} bytes=${r.text.length}` : failLine(r);
    console.log(`proof: ${r.method} ${r.path} ${d.platform} ${summary}`);
  }

  const timings = [];
  for (const d of DEMO) {
    const t = await timeToken(d);
    timings.push(t);
    console.log(`proof: demo-timing ${d.platform} total_ms=${t.totalMs} within_5s=${t.totalMs < DEMO_BUDGET_MS ? "yes" : "no"}`);
  }

  const none = "Not run in this build: no demo address is configured.";
  const holdersBody = holders ? holdersSampleBlock(holders.r, holders.d, timings[0]?.symbol ?? null, at) : none;
  const exitBody = await brettExitBlock(timings[0], at);
  console.log(`proof: brett-exit ${exitBody.startsWith("Not run") ? exitBody : "written"}`);

  let readme = await readFile(readmePath, "utf8");
  if (results.length === 0) {
    readme = replaceBlock(readme, "cmc-call", none);
    readme = replaceBlock(readme, "cmc-fields", none);
    readme = replaceBlock(readme, "demo-timing", none);
  } else {
    readme = replaceBlock(readme, "cmc-call", callBlock(results, at));
    readme = replaceBlock(readme, "cmc-fields", fieldsBlock(results));
    readme = replaceBlock(readme, "demo-timing", timingBlock(timings, at));
  }
  readme = replaceBlock(readme, "holders-sample", holdersBody);
  readme = replaceBlock(readme, "brett-exit", exitBody);
  await writeFile(readmePath, readme, "utf8");
  console.log("proof: README.md blocks updated");

  let submission = await readFile(submissionPath, "utf8");
  submission = replaceBlock(submission, "holders-sample", holdersBody, "SUBMISSION.md");
  submission = replaceBlock(submission, "brett-exit", exitBody, "SUBMISSION.md");
  await writeFile(submissionPath, submission, "utf8");
  console.log("proof: SUBMISSION.md blocks updated");
}

try {
  await main();
} catch (err) {
  console.log(`proof: stopped early (${err && err.name ? err.name : "error"}); files not yet written were left as they were`);
}
process.exit(0);
