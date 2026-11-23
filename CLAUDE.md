# CLAUDE.md

Efflux: what selling a small DEX token pays today, and what is left after the biggest wallets sell first. Read IDENTITY.md, HANDOFF.md and DEMO.md before editing.

## Commands

- `npm install`
- `npm run dev` (http://localhost:3000)
- `npm run build` (must stay green: strict TypeScript, every import resolving)
- `npm run seed` (writes `fixtures/seed.json` from `lib/data/seed.ts`; deterministic)

## Layout

- `lib/types.ts` shared types and `ApiEnvelope`. `lib/data/seed.ts` seed tokens. `lib/data.ts` is a compat barrel.
- `lib/adapter.ts` is the only data seam: `getAdapter()` reads `ADAPTER_MODE` (`fake` default, `real` calls CMC via `lib/cmc.ts`). Pages and routes never import the seed array.
- `lib/config.ts` is the single reader of `process.env` for CMC settings, the key and demo addresses (only `ADAPTER_MODE` is read in `lib/adapter.ts`). `lib/cmc-parse.ts` pure pickers, `lib/errors.ts` error codes, `lib/schemas.ts` zod route inputs.
- `lib/simulate.ts` pure exit math. Do not change it casually.
- `npm test` (vitest, `tests/`), `npm run proof` (real keyless CMC calls into README proof blocks).

## Stack pitfalls

- Next 15 App Router: `searchParams` on pages is a Promise; route handlers are not cached by default.
- Tailwind v4 with no config file. Tokens live in the `@theme` block of `app/globals.css`.
- Kit imports (`three`, `@react-three/fiber`, `@react-three/drei`) only in `"use client"` files.
- The Canvas loads through `next/dynamic` with `ssr: false`, inside an error boundary that falls back to an SVG.

## Never touch

- `node_modules`, `.next`, `public/illustrations`

## Vercel guardrails

- No runtime filesystem writes (only `scripts/` may write files).
- `useSearchParams` only under `Suspense`.
- No Node-only APIs in edge paths.
- No custom server and no `output: export`.
- Every `process.env` key mirrored in `.env.example`.

## Rules

- IDENTITY.md is law. Never edit it above its Amendments heading.
- No hex in components; colors come from token classes only.
- Never commit keys. `CMC_PRO_API_KEY` lives in Vercel env only.
- Copy: no em dash, no en dash, no double hyphen as a dash. Banned words: seamless, seamlessly, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless, "in today's world", "it's not just X, it's Y".

When compacting, preserve the list of modified files and test commands.
