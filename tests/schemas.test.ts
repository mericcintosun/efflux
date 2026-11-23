import { describe, expect, it } from "vitest";
import { exitQuerySchema, platformSchema, searchQuerySchema } from "@/lib/schemas";

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

describe("searchQuerySchema", () => {
  it("takes 1 to 40 characters", () => {
    expect(searchQuerySchema.safeParse({ keyword: "brett" }).success).toBe(true);
    expect(searchQuerySchema.safeParse({ keyword: "" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ keyword: "x".repeat(41) }).success).toBe(false);
  });
});
