import { describe, expect, it } from "vitest";
import { exitQuerySchema, platformSchema, playQuerySchema, searchQuerySchema } from "@/lib/schemas";

const EVM = "0x532f27101965dd16442E59d40670FaF5eBB142E4";
const SOL = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

describe("platformSchema", () => {
  it("accepts the three chains only", () => {
    for (const p of ["base", "bsc", "solana"]) expect(platformSchema.safeParse(p).success).toBe(true);
    expect(platformSchema.safeParse("eth").success).toBe(false);
  });
});

describe("exitQuerySchema", () => {
  it("accepts an EVM address on base and bsc", () => {
    expect(exitQuerySchema.safeParse({ platform: "base", address: EVM }).success).toBe(true);
    expect(exitQuerySchema.safeParse({ platform: "bsc", address: EVM }).success).toBe(true);
  });

  it("accepts a base58 mint on solana", () => {
    expect(exitQuerySchema.safeParse({ platform: "solana", address: SOL }).success).toBe(true);
  });

  it("rejects a Solana mint on an EVM chain and the other way round", () => {
    expect(exitQuerySchema.safeParse({ platform: "base", address: SOL }).success).toBe(false);
    expect(exitQuerySchema.safeParse({ platform: "solana", address: EVM }).success).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(exitQuerySchema.safeParse({ platform: "base", address: "0x123" }).success).toBe(false);
    expect(exitQuerySchema.safeParse({ platform: "bsc", address: `${EVM.slice(0, -1)}Z` }).success).toBe(false);
    expect(exitQuerySchema.safeParse({ platform: "solana", address: "0OIl" + SOL.slice(4) }).success).toBe(false);
    expect(exitQuerySchema.safeParse({ platform: "solana", address: "abc" }).success).toBe(false);
  });

  it("rejects a missing platform", () => {
    expect(exitQuerySchema.safeParse({ address: EVM }).success).toBe(false);
  });
});

describe("playQuerySchema", () => {
  it("reads a full shared link and builds the server lookup", () => {
    const r = playQuerySchema.safeParse({ usd: "2500", ahead: "7", tax: "0", drain: "1", platform: "base", address: EVM });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.usd).toBe(2500);
    expect(r.data.ahead).toBe(7);
    expect(r.data.tax).toBe(false);
    expect(r.data.drain).toBe(true);
    expect(r.data.lookup).toEqual({ platform: "base", address: EVM });
  });

  it("falls back to defaults for an out-of-range ahead and a bad usd", () => {
    const r = playQuerySchema.safeParse({ ahead: "50", usd: "-3" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.ahead).toBe(0);
    expect(r.data.usd).toBe(5000);
    expect(r.data.tax).toBe(true);
    expect(r.data.drain).toBe(false);
  });

  it("drops an unknown platform without throwing", () => {
    const r = playQuerySchema.safeParse({ platform: "eth", address: EVM });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.platform).toBeUndefined();
    expect(r.data.lookup).toBeUndefined();
  });

  it("makes no lookup when the address is missing or wrong for the chain", () => {
    const missing = playQuerySchema.safeParse({ platform: "solana" });
    expect(missing.success).toBe(true);
    if (missing.success) expect(missing.data.lookup).toBeUndefined();
    const wrong = playQuerySchema.safeParse({ platform: "solana", address: EVM });
    expect(wrong.success).toBe(true);
    if (wrong.success) expect(wrong.data.lookup).toBeUndefined();
  });

  it("lowercases the sample token slug", () => {
    const r = playQuerySchema.safeParse({ token: "FIN" });
    expect(r.success && r.data.token).toBe("fin");
  });
});

describe("searchQuerySchema", () => {
  it("takes 1 to 40 characters", () => {
    expect(searchQuerySchema.safeParse({ keyword: "brett" }).success).toBe(true);
    expect(searchQuerySchema.safeParse({ keyword: "" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ keyword: "x".repeat(41) }).success).toBe(false);
  });
});
