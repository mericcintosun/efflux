// Seed snapshots for the story and the simulator. Shapes mirror what lib/cmc.ts
// normalizes from the CoinMarketCap DEX API, so a live token and a bundled
// snapshot flow through exactly the same simulation.
//
// The three tokens are illustrative microcaps (one per chain) with realistic
// pool depth, holder concentration, sell tax and 24h LP change. Before the demo,
// replace them with captured snapshots of real long-lived tokens (see HANDOFF.md).

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

export const PLATFORM_LABEL: Record<Platform, string> = {
  base: "Base",
  bsc: "BNB Chain",
  solana: "Solana",
};

export const DEFAULT_HOLDING_USD = 5000;

export const tokens: TokenSnapshot[] = [
  {
    slug: "fin",
    symbol: "FIN",
    name: "Driftfin",
    platform: "base",
    address: "0x4f1c9e2a7b83d05e6a19c4b27e8f3d6a91b0c5e2",
    priceUsd: 0.0042,
    supply: 100_000_000,
    sellTaxPct: 5,
    lpChange24hPct: -18,
    pools: [
      { address: "0x8c21f04e9a7d3b6e52c1a09f4d87e3b26a5c0f91", dex: "Aerodrome", pair: "FIN/WETH", kind: "v2", liqUsd: 38_400, feeBps: 30 },
      { address: "0x2e9a7c41d05b8f63e1a4c92d7b06f5e83a1d4c70", dex: "Uniswap v3", pair: "FIN/USDC", kind: "v3", liqUsd: 17_900, feeBps: 100 },
      { address: "0xa47d1e93c26b0f58e4a3d71c95b2e06f8d3a1b54", dex: "Uniswap v2", pair: "FIN/WETH", kind: "v2", liqUsd: 7_700, feeBps: 30 },
    ],
    holders: [
      { address: "0x000000000000000000000000000000000000dEaD", label: "Burn address", balance: 12_000_000, tags: ["burn"] },
      { address: "0x8c21f04e9a7d3b6e52c1a09f4d87e3b26a5c0f91", label: "Aerodrome FIN/WETH pool", balance: 4_570_000, tags: ["pool"] },
      { address: "0x7a3f5e1c90d24b86a3e17f0c5d92b4a8e6c13f27", label: "Deployer", balance: 4_100_000, tags: ["deployer"] },
      { address: "0x1d94b7e02c6a5f38e9b14d70a2c3e85f61b9d0a4", balance: 3_300_000, tags: [] },
      { address: "0xe5b20a7f4c19d83e6a0b52c97f1d4e3a8b06c2d9", balance: 2_600_000, tags: [] },
      { address: "0x3c7e81a5d04f92b6e1c3a07d58f2b9e4c60a1d83", balance: 2_200_000, tags: [] },
      { address: "0xb08f2d6e3a95c14e7b2d0a68c3f51e9d47a2b6c0", balance: 1_900_000, tags: [] },
      { address: "0x64a1c3e8f07b25d9e4a6c10b83d7f2e5a9c40b16", balance: 1_500_000, tags: [] },
      { address: "0xd2e6b9a14c03f87e5d2b6a90c1e4f38d7b5a2c09", balance: 1_200_000, tags: [] },
      { address: "0x59c0e3b7a26d14f8e0b3c75a2d9e61f4b8c07a35", balance: 950_000, tags: [] },
      { address: "0xf31a7d5c08e2b96a4f1d3c07e5b82a6d90c4e1b7", balance: 800_000, tags: [] },
      { address: "0x0e8b4c2a7d61f39e5c0a8b14d6e27f3a5c9b0d62", balance: 650_000, tags: [] },
    ],
    snapshotAt: "2026-11-23T18:40:00Z",
  },
  {
    slug: "moss",
    symbol: "MOSS",
    name: "Mossbit",
    platform: "bsc",
    address: "0x9b2e47d1c08a3f65e7d42b19a6c8e03f75d1a4b8",
    priceUsd: 0.0187,
    supply: 50_000_000,
    sellTaxPct: 3,
    lpChange24hPct: -6.5,
    pools: [
      { address: "0x5e07c3a9d81b4f26e0a5c3d97b14e68f2a0d5c31", dex: "PancakeSwap v2", pair: "MOSS/WBNB", kind: "v2", liqUsd: 118_000, feeBps: 25 },
      { address: "0xc94a2e60b7d13f58a2e9c04d61b7f3e85a2c9d17", dex: "PancakeSwap v3", pair: "MOSS/USDT", kind: "v3", liqUsd: 41_000, feeBps: 25 },
    ],
    holders: [
      { address: "0x407c3e9a1d5b82f60e4c7a3d19b5e28f6a0c3d74", label: "Token locker", balance: 5_000_000, tags: ["locker"] },
      { address: "0x5e07c3a9d81b4f26e0a5c3d97b14e68f2a0d5c31", label: "PancakeSwap MOSS/WBNB pool", balance: 3_160_000, tags: ["pool"] },
      { address: "0xa81d6f3c2e09b74a5d1e8c60f3b29a7e4d0c5b18", balance: 2_900_000, tags: [] },
      { address: "0x2b6e9d04c7a15f83e2b0d6a94c1f7e35b8a2d061", label: "Exchange hot wallet", balance: 2_400_000, tags: ["cex"] },
      { address: "0xe07a3c5d91b28f46a0e3d7c15b9f2a68e4c1b03d", label: "Team multisig", balance: 2_100_000, tags: ["team"] },
      { address: "0x6d1f8b2a40c97e35d6b1a0e83f5c2d94a7e0b5c2", balance: 1_750_000, tags: [] },
      { address: "0x93c4a7e0d25b16f8c3a9e2d40b7f61c5e8a3d0b9", balance: 1_400_000, tags: [] },
      { address: "0x1f5b0d83a6e2c47f9b1d5a03e8c6f27d4b9a0e16", balance: 1_100_000, tags: [] },
      { address: "0xc2a8e61f7b03d95e4c2a0b78d1f6e39a5c7b2d40", balance: 920_000, tags: [] },
      { address: "0x48e3b9c0a71d26f5e8b3c04a9d2f71e6b0c5a3d8", balance: 800_000, tags: [] },
      { address: "0xb7d02e5a8c34f16b9e7d2c50a3f8e14d6b2c9a07", balance: 610_000, tags: [] },
      { address: "0x0a9c4f7e3b61d28a5c0f9e43b7d16a2e8c4f0b5d", balance: 500_000, tags: [] },
      { address: "0x7e3b1d9a5c08f42e6b3a7d01c9e5f84b2d6a1c3e", balance: 420_000, tags: [] },
    ],
    snapshotAt: "2026-11-23T18:42:00Z",
  },
  {
    slug: "salt",
    symbol: "SALT",
    name: "Saltmarsh",
    platform: "solana",
    address: "7xQm4Rk2VhPz9WcN3tLs8YbJ5fGd1HeA6uKpTq2MnZvE",
    priceUsd: 0.00093,
    supply: 999_000_000,
    sellTaxPct: 0,
    lpChange24hPct: -22,
    pools: [
      { address: "9hTq2PzWm5Rk7XcV3NbL8sYf4GjD6eKa1uHpQr3MtCwB", dex: "Raydium CPMM", pair: "SALT/SOL", kind: "cpmm", liqUsd: 212_000, feeBps: 25 },
      { address: "4kLm8NvB2xQc6RtZ9WpH3sYd7GfJ5eUa1oKiPr6TnXwE", dex: "Meteora DLMM", pair: "SALT/SOL", kind: "clmm", liqUsd: 36_000, feeBps: 30 },
      { address: "Bw3Hq7Pz1Xc5Rk9TmV2NsL6Yf8GjD4eKa7uJpQn2MrCt", dex: "Orca Whirlpool", pair: "SALT/USDC", kind: "clmm", liqUsd: 15_500, feeBps: 30 },
    ],
    holders: [
      { address: "5Yd2Hq9Pz4Xc8Rk1TmW6NsV3Lf7GjB2eKa5uJpQo9MrE", label: "Raydium pool authority", balance: 114_000_000, tags: ["pool"] },
      { address: "Dk6Lm1NvB9xQc3RtZ5WpH8sYe2GfJ7eUa4oKiPr1TnXb", balance: 61_000_000, tags: [] },
      { address: "8pRs3Tv6Wx1Yz4Ab7Cd2Ef5Gh9Jk3Lm6Np8Qr1St4Uv", balance: 48_000_000, tags: [] },
      { address: "Gq4Hr7Js1Kt5Lu8Mv2Nw6Px9Qy3Rz7Sa1Tb4Uc8Vd2We", balance: 39_000_000, tags: [] },
      { address: "3Ab6Cd9Ef2Gh5Jk8Lm1Np4Qr7St3Uv6Wx9Yz2Ab5Cd8E", label: "Wormhole custody", balance: 20_000_000, tags: ["bridge"] },
      { address: "Hm2Np5Qr8St1Uv4Wx7Yz3Ab6Cd9Ef2Gh5Jk8Lm1Np4Q", balance: 30_000_000, tags: [] },
      { address: "6Tv9Wx2Yz5Ab8Cd1Ef4Gh7Jk3Lm6Np9Qr2St5Uv8Wx1Y", balance: 24_000_000, tags: [] },
      { address: "Kc1Ef4Gh7Jk2Lm5Np8Qr3St6Uv9Wx4Yz7Ab1Cd5Ef8Gh", balance: 19_000_000, tags: [] },
      { address: "2Lm5Np8Qr1St4Uv7Wx3Yz6Ab9Cd2Ef5Gh8Jk1Lm4Np7Q", balance: 15_000_000, tags: [] },
      { address: "Pr7St1Uv4Wx8Yz2Ab5Cd9Ef3Gh6Jk1Lm4Np7Qr2St5Uv", balance: 12_000_000, tags: [] },
      { address: "9Wx3Yz6Ab1Cd4Ef8Gh2Jk5Lm9Np3Qr6St1Uv4Wx7Yz2A", balance: 9_500_000, tags: [] },
      { address: "Ef5Gh9Jk2Lm6Np1Qr4St8Uv3Wx6Yz9Ab2Cd5Ef8Gh1Jk", balance: 7_800_000, tags: [] },
    ],
    snapshotAt: "2026-11-23T18:45:00Z",
  },
];

export function findToken(slug: string | undefined): TokenSnapshot | undefined {
  if (!slug) return undefined;
  return tokens.find((t) => t.slug === slug.toLowerCase());
}

export function findTokenByAddress(address: string): TokenSnapshot | undefined {
  const a = address.toLowerCase();
  return tokens.find((t) => t.address.toLowerCase() === a);
}
