// Zod schemas for every API route input. Routes call safeParse before any other logic.

import { z } from "zod";

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
