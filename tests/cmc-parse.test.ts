import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHolders, parseLpChangePct, parsePools, parseSellTaxPct, parseTokenInfo, poolKind } from "@/lib/cmc-parse";

// Fixtures are schema-shaped and hand-written (see each file's "_note"), not live captures.
function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/cmc/${name}.json`, import.meta.url), "utf8"));
}

describe("parsePools", () => {
  const pools = parsePools(fixture("pools"));

  it("drops zero-liquidity pools and sorts deepest first", () => {
    expect(pools).toHaveLength(2);
    expect(pools.map((p) => p.liqUsd)).toEqual([120000, 45000.5]);
  });

  it("reads dex, pair, kind and fee", () => {
    expect(pools[0]).toMatchObject({ dex: "Aerodrome", pair: "TKN/WETH", kind: "v2", feeBps: 30 });
    expect(pools[1]).toMatchObject({ dex: "Uniswap", pair: "TKN/USDC", kind: "v3", feeBps: 100 });
  });

  it("returns an empty list for unusable input", () => {
    expect(parsePools(null)).toEqual([]);
    expect(parsePools({ data: "nope" })).toEqual([]);
  });
});

describe("parseHolders", () => {
  const holders = parseHolders(fixture("holders"));

  it("keeps holders with a positive decimal-adjusted balance", () => {
    expect(holders).toHaveLength(4);
    expect(holders[0].balance).toBe(1000);
  });

  it("maps tags to pool, burn and cex", () => {
    const byAddr = Object.fromEntries(holders.map((h) => [h.address, h.tags]));
    expect(byAddr["0xholder00000000000000000000000000000000a1"]).toContain("pool");
    expect(byAddr["0x000000000000000000000000000000000000dEaD"]).toContain("burn");
    expect(byAddr["0xholder00000000000000000000000000000000e5"]).toContain("cex");
    expect(byAddr["0xholder00000000000000000000000000000000b2"]).toEqual([]);
  });
});

describe("parseSellTaxPct", () => {
  it("turns a fraction into a percent", () => {
    expect(parseSellTaxPct(fixture("security"))).toBeCloseTo(5, 9);
  });

  it("reads a nested tax object already in percent", () => {
    expect(parseSellTaxPct({ data: { tax: { sell: 3 } } })).toBe(3);
  });

  it("defaults to zero", () => {
    expect(parseSellTaxPct(null)).toBe(0);
  });
});

describe("parseLpChangePct", () => {
  it("compares the oldest and newest total liquidity points", () => {
    expect(parseLpChangePct(fixture("liquidity-change"))).toBeCloseTo(-10, 9);
  });

  it("prefers a direct 24h change when present", () => {
    expect(parseLpChangePct({ data: { chg24h: -4.5 } })).toBe(-4.5);
  });

  it("ignores points older than 24 hours before the newest one", () => {
    const lcs = [
      { t: 1_700_000_000, tlu: 20_000 },
      { t: 1_700_500_000, tlu: 100_000 },
      { t: 1_700_550_000, tlu: 110_000 },
    ];
    expect(parseLpChangePct({ data: { lcs } })).toBeCloseTo(10, 9);
  });

  it("reads millisecond timestamps and never reports a loss above 100%", () => {
    expect(parseLpChangePct({ data: { chg24h: -451.4 } })).toBe(-100);
    const lcs = [
      { t: 1_700_000_000_000, tlu: 100_000 },
      { t: 1_700_043_200_000, tlu: 94_000 },
    ];
    expect(parseLpChangePct({ data: { lcs } })).toBeCloseTo(-6, 9);
  });

  it("returns zero with fewer than two points", () => {
    expect(parseLpChangePct({ data: { lcs: [{ t: 1, tlu: 10 }] } })).toBe(0);
  });
});

describe("parseTokenInfo and poolKind", () => {
  it("reads price and symbol from short or long keys", () => {
    expect(parseTokenInfo({ data: { pu: "0.012", sym: "TKN", n: "Token" } })).toMatchObject({ priceUsd: 0.012, symbol: "TKN", name: "Token" });
    expect(parseTokenInfo({ data: { price: 2, symbol: "B" } })).toMatchObject({ priceUsd: 2, symbol: "B" });
  });

  it("classifies pool kinds", () => {
    expect(poolKind("Raydium CLMM")).toBe("clmm");
    expect(poolKind("Uniswap v3")).toBe("v3");
    expect(poolKind("Raydium CPMM")).toBe("cpmm");
    expect(poolKind("Aerodrome v2")).toBe("v2");
  });
});
