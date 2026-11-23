// Zod schemas for every API route input. Routes call safeParse before any other logic.

import { z } from "zod";
import { DEFAULT_HOLDING_USD } from "@/lib/data/seed";

export const platformSchema = z.enum(["base", "bsc", "solana"]);

export const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** Base58 alphabet (no 0, O, I, l), 32 to 44 characters. */
export const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const exitQuerySchema = z
  .object({
    platform: platformSchema,
    address: z.string().trim().min(1).max(64),
  })
  .refine((q) => (q.platform === "solana" ? SOLANA_ADDRESS.test(q.address) : EVM_ADDRESS.test(q.address)), {
    message: "Address does not match the chain format.",
    path: ["address"],
  });

export type ExitQuery = z.infer<typeof exitQuerySchema>;

export const searchQuerySchema = z.object({
  keyword: z.string().trim().min(1).max(40),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** /api/tokens takes no parameters; any query keys are rejected. */
export const tokensQuerySchema = z.object({}).strict();

/**
 * The /play query, as written by "Copy a link to this result". It never throws:
 * every invalid or out-of-range value falls back to its default. `lookup` is set
 * only when platform and address together pass exitQuerySchema, and then the
 * page resolves the token on the server.
 */
export const playQuerySchema = z
  .object({
    token: z.string().trim().toLowerCase().max(64).optional().catch(undefined),
    usd: z.coerce.number().finite().min(1).max(10_000_000).catch(DEFAULT_HOLDING_USD),
    ahead: z.coerce.number().int().min(0).max(10).catch(0),
    tax: z.string().optional().catch(undefined).transform((v) => v !== "0"),
    drain: z.string().optional().catch(undefined).transform((v) => v === "1"),
    platform: platformSchema.optional().catch(undefined),
    address: z.string().trim().max(64).optional().catch(undefined),
  })
  .transform((q) => {
    const lk = exitQuerySchema.safeParse({ platform: q.platform, address: q.address });
    return { ...q, lookup: lk.success ? lk.data : undefined };
  });

export type PlayQuery = z.output<typeof playQuerySchema>;
