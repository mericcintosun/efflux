# HANDOFF: Efflux

You are picking up a working Next.js 15 scaffold. Read this file, then IDENTITY.md, then start on the Mission list. Keep `npm run build` green after every change.

## 1. Context

**Efflux.** What would selling your small DEX token pay today, and what is left if the biggest wallets sell before you? Efflux answers both with live CoinMarketCap DEX data, on one screen.

**Plain pitch.** Your wallet shows a token worth $5,000, but you do not know if you can actually take that money out. You open Efflux, type the token, enter how much you hold. The page shows what a sale would really pay, the gap to the wallet number, and what is left if the 10 largest wallets sell first. A slider lets you play "how many whales sell ahead of me" and watch your exit shrink.

**Hackathon.** Build with CMC: API Hackathon (DoraHacks, organized by CoinMarketCap). https://dorahacks.io/hackathon/coinmarketcap-api-202611

- Submission deadline: **2026-12-09 23:59 UTC**. Results 2026-12-30.
- Target: **Top 3** (12 months of CMC API access). Top 10 (plushie) and Top 30 (keyboard) are slices of the same ranking, no extra work.
- Track to pick in the form: **Markets and Trading Tools**. One track per BUIDL.
- Judging: Does it work 30, Usefulness to a real person 25, Interesting use of the API 20, Code quality and documentation 15, Presentation 10.

Verified submission requirements (a missing item can make the entry invalid):

1. Public GitHub repo (private repos are rejected).
2. Working demo: deployed link or a screen recording of it running.
3. Demo video link (required on the platform).
4. An X/Twitter post tagged **#BuildwithCMC** that links the DoraHacks submission and the demo video; paste the post URL into the form.
5. An explicit list of the CMC API endpoints used (README table and `/notes`).
6. Visible proof of a real API call: code and response (README snippet plus the proof drawer on `/play`).
7. A short note on what the API made possible and where it pushed back (README and `/notes`).
8. Pick one of the four tracks.
9. No API key committed to the repo (costs code quality points).

## 2. Current state

Identity: see IDENTITY.md (direction D2, structure S6, archetype L5, kit K6)

Poster-white gallery look, magenta flat blocks, Unbounded for display, Manrope for body, sharp corners, wipe entrance (`efflux-wipe` keyframes in `app/globals.css`).

### Routes

| Route | File | What it shows |
| --- | --- | --- |
| `/` | `app/page.tsx` + `components/story-scroll.tsx` | L5 bands: hero with the 3D pool, problem band, four story chapters driving one sticky live exit panel, method band. The last chapter ("Your turn") is the CTA band linking to `/play`. |
| `/play` | `app/play/page.tsx` + `components/play-desk.tsx` | Free-form simulator: sample tokens, paste an address (live CMC), holding input, queue list with "Will not sell", share link, proof drawer. |
| `/notes` | `app/notes/page.tsx` | Method, worked example on seed data, endpoint list, real call code, API notes, limits. |
| `/api/exit` | `app/api/exit/route.ts` | Server proxy: `GET ?platform=&address=` returns token, proof and a message. |

All three pages are linked from the header (`Story`, `Simulator`, `Notes`) and the footer.

### File map

- `lib/simulate.ts`: the whole model, pure functions. `exitQuote()` returns receive amount, loss breakdown (impact, tax, drain, queue), the 0..N curve and pool level.
- `lib/cmc.ts`: **real CoinMarketCap integration**. `loadExitBundle(platform, address)` calls five DEX endpoints on the keyless host (or the keyed host when `CMC_PRO_API_KEY` is set), 8 s timeout and one retry per call, caches 60 s, records every call as `ApiProof`, returns typed `error` codes. Pickers live in `lib/cmc-parse.ts` (Phase 2).
- `lib/data.ts`: three seed tokens (FIN on Base, MOSS on BNB Chain, SALT on Solana) with pools, 12 to 13 holders each, sell tax and 24h LP change.
- `components/exit-stage.tsx`: the live panel (wallet shows, sale pays, curve, loss bar, queue slider, tax and drain toggles). Shared by `/` and `/play`.
- `components/pool-scene-frame.tsx` + `components/pool-scene.tsx`: kit K6, the 3D pool (see below).
- `components/site-header.tsx`, `components/brand-mark.tsx`, `components/scene-slot.tsx`: header and brand slots.
- `components/ui/*`: shadcn primitives restyled for D2 (flat blocks, `rounded-xs` = 0.125rem). `slider.tsx` is a native range input styled in `globals.css`.
- `public/logo.svg`, `app/icon.svg`, `app/opengraph-image.tsx`, `public/illustrations/scene-1..4.svg`.

### Real vs mocked

- Real: every CMC call in `lib/cmc.ts` (`cmcCall`, `loadExitBundle`). Pasting an address on `/play` hits CoinMarketCap live.
- Seeded: the home story and the default `/play` view run on `tokens` in `lib/data.ts`. They are illustrative microcaps with fake addresses. **Replace them with captured snapshots of three real, long-lived tokens** before recording (see Mission 1).
- Fallback: `loadExitBundle` returns the bundled snapshot when CMC returns no usable pools for a seeded address, and says so in `message`.
- Unverified: the field pickers (`parsePools`, `parseHolders`, `parseSellTaxPct`, `parseLpChangePct`, now in `lib/cmc-parse.ts`) and `PLATFORM_PARAM` (now in `lib/config.ts`) are educated guesses from the OpenAPI schema until `npm run proof` output confirms them.

### Interaction kit K6 (three)

- **Shipped, signature 1:** `components/pool-scene-frame.tsx` on `/` (first screen). One orbitable 3D pool built from primitives: a cylinder of magenta liquid with the token's real holder queue as ink blocks beside it and your bag as the last magenta block. Clicking the pool (or "Let the next wallet sell") sells the next real holder from the seed; the liquid level and caption come from `exitQuote()`. Loaded with `next/dynamic` `ssr: false`, wrapped in an error boundary that falls back to `scene-1.svg`, `frameloop="demand"`, static under reduced motion.
- **To build, signature 2:** the object reacts to the demo input. Lift the story's `controls` (ahead, tax, drain) so the 3D pool on `/` follows the sticky ExitStage slider, and color the tax and LP drain as removed layers of the liquid.
- **To build, signature 3:** a step-linked camera move. When the story chapter changes from "The quote" to "The queue", ease the camera from the pool front view to a low side view along the holder line. Skip the tween under reduced motion.

### One-mark proof

`components/site-header.tsx`, the home link:

```tsx
<Link href="/" className="flex items-center gap-2.5 font-display text-lg tracking-tight">
  <BrandMark />
  Efflux
</Link>
```

## 3. Mission (in order)

1. **Verify the API, then swap the seeds (1 h).** curl the five keyless endpoints for one long-lived, mid-size token on Base, BSC and Solana. Fix field names in the pickers and `PLATFORM_PARAM` in `lib/cmc.ts`. Confirm the holder `percent` unit and what `a0`, `a1`, `tu` mean. Replace the three tokens in `lib/data.ts` with snapshots built from those real responses (keep the shape). Done: pasting each address on `/play` shows a green "Live" badge and numbers close to the snapshot.
2. **Live exit curve polish (2.5 h).** Feature 1. Add search by name via `/v1/dex/search` above the address field on `/play`, plus a "position size" slider that bends the curve. Done: type "FIN"-style symbol, pick a result, see pools listed with their liquidity and the big "A sale pays you" number.
3. **The queue, wow moment (3 h, schedule for day 1 afternoon).** Feature 2. It already works on seed data; make it land on camera. Animate the receive number as the "wallets ahead" slider goes 0 to 10, highlight the holder row that just sold, and ship kit signature 2 so the 3D pool drains in step. Rehearse: the number must visibly fall from roughly $3,870 toward a few hundred dollars on the chosen demo token. Done: a 25-second take of the slider drag reads with no narration.
4. **Hidden cuts (2 h).** Feature 3. Turn the loss bar into a small waterfall (impact, tax, LP drain, queue as separate steps) and label the "repeat tomorrow" scenario clearly. Done: each cut shows its own dollar amount and the sum matches.
5. **Proof drawer (1 h).** Feature 4. Add the endpoint list inside the drawer, show the last successful response with its timestamp when a later call hits 429, and pretty-print JSON. Done: the drawer shows `POST /public-api/v1/dex/holders/list` with body and raw response in the video.
6. **Share link and samples (0.5 h).** Feature 5 is mostly done (`Copy a link to this result`). Check a copied live link reopens the same result in a new tab, including excluded wallets (add `ex=` to the URL).
7. **Kit signature 3 (1 h).** Chapter-linked camera move on `/`.
8. **Hardening (1 h).** Empty holder list, 429 storm, unknown chain address, zero-liquidity pools: each has a styled state. Deploy to Vercel, test all three chains on the live URL.
9. **Submission (1.5 h).** README screenshot of the proof drawer, 90-second video, DoraHacks form with track "Markets and Trading Tools", #BuildwithCMC post with DoraHacks and video links, paste the post URL in the form.

Demo flow to rehearse (90 s): wallet shows $5,000 (0-15 s), pools load and "a sale pays" appears, curve bends (15-35 s), whales slider 0 to 10, number melts (35-60 s, the wow moment), waterfall of cuts plus "repeat tomorrow" (60-72 s), proof drawer with the holders POST (72-82 s), shared link opens in a new tab, closing line "The number on screen is not yours. Efflux tells you how much of it is." (82-90 s).

## 4. Constraints

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (no config file), deploys to Vercel. No custom server, no filesystem writes at runtime.
- IDENTITY.md is law for every color, font, route, layout and animation. Never edit above its Amendments heading; append dated lines below it if you must record a decision. Colors only through tokens in `app/globals.css`, no hex in components. Sharp corners (`rounded-xs` max). No columns or cards inside home bands.
- UI through `components/ui/*` with `cn()`. Kit packages only in `"use client"` files; the page must work with WebGL off and with reduced motion.
- No API key in the repo, ever. `CMC_PRO_API_KEY` lives in Vercel env only.
- Copy: English, human tone, concrete numbers. No em or en dashes, no double hyphen dashes. Avoid: seamless, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless.
- Scope: if something threatens the December 9 deadline, cut it (signature 3 and search go first). A working live link beats polish; "Does it work" is 30 points.
- Run `npm run build` after every change and keep it passing.

## Phase 1 log (walking skeleton, adapter seam, demo contract)

### Goal

Every step of the 90-second demo (DEMO.md) runs on seeded data through one adapter seam, with `ADAPTER_MODE` defaulting to `fake`. Pages never import seed arrays directly.

### Status

Done by file reading only; build, seed and deploy are unverified until the runner runs them.

- Typed core: `lib/types.ts` (domain types, `ApiProof`, `DataSource`, `ApiEnvelope<T>`, `ExitBundle` alias). Seed: `lib/data/seed.ts` (fixed ids and timestamps, only a type import). `lib/data.ts` is a two-line compat barrel.
- Seed script: `scripts/seed.mjs`, `package.json` `seed` = `node --experimental-strip-types scripts/seed.mjs`. `fixtures/seed.json` is a placeholder until the runner runs `npm run seed`.
- Adapter: `lib/adapter.ts` exports `ExitAdapter`, `fakeAdapter`, `realAdapter`, `getAdapter`, `seedProof`. Fake proof entries are prefixed `Seed data, not a live response.` and the drawer shows a "Seed" tag instead of a status code for them.
- `lib/cmc.ts` `loadExitBundle` returns `ApiEnvelope<TokenSnapshot>` (`data` replaces `token`); fallback and proof recording unchanged.
- Routes: `/api/exit` (200 / 404 / 400, envelope bodies) and new `/api/tokens`, both via `getAdapter()`.
- Pages `/`, `/play`, `/notes` are server components that call `getAdapter().listTokens()` and pass tokens as props. `components/play-desk.tsx` reads `envelope.data` and `envelope.source`; green "Live" badge only for `live`, otherwise a "Seed data" badge in DEEP/INK.
- Loading skeletons in `app/loading.tsx`, `app/play/loading.tsx`, `app/notes/loading.tsx`. Empty states in play-desk (no lookup yet, null result, zero holders, no liquidity, no samples) and story-scroll (no tokens).
- Header is a client component with `usePathname()` and `aria-current="page"`. Metadata titles: `Story: ...`, `Simulator`, `Notes`.
- `lib/brand-colors.ts` feeds `app/opengraph-image.tsx`; no hex remains in `app/` or `components/` code. `app/globals.css` gained a type scale and band spacing tokens.
- DEMO.md, CLAUDE.md, README "Data modes" paragraph.

### Decisions

- The IDENTITY hexes stay in `:root` of `app/globals.css` and reach Tailwind through `@theme inline`, because the 3D pool reads the raw `--magenta`, `--ink` etc. at runtime. Moving them into `@theme` literal values would risk the scene.
- `realAdapter.listTokens` and `getToken` return the seed list with `source: "snapshot"` (Phase 2 swaps in real snapshots). In fake mode `/api/exit` resolves only the three seed addresses and only on their own chain; any other address returns 404 with a message that says to set `ADAPTER_MODE=real`.
- The home page passes the whole list to `StoryScroll` (`tokens` prop), which renders an empty state when the list is empty.
- `/` metadata title is `Story: what selling your DEX token actually pays` (rendered as `... | Efflux`).
- DEMO step order follows the spec (queue before hidden cuts). On the page "Hidden cuts" sits before "The queue"; the presenter jumps with the chapter indicator.
- `app/icon.svg` contains hex fills; it is an SVG asset on the never-touch list, so it stays.
- `app/opengraph-image.tsx` keeps inline pixel sizes: it renders a 1200x630 image, not a responsive container.

### Failed attempts

None.

### Files changed

`lib/types.ts` (new), `lib/data/seed.ts` (new), `lib/data.ts`, `scripts/seed.mjs` (new), `fixtures/seed.json` (new, placeholder), `package.json`, `lib/adapter.ts` (new), `lib/cmc.ts`, `lib/simulate.ts` (type import only), `.env.example`, `app/api/exit/route.ts`, `app/api/tokens/route.ts` (new), `app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx`, `components/play-desk.tsx`, `components/story-scroll.tsx`, `components/exit-stage.tsx` (type import, overflow wrapper on the curve), `components/pool-scene-frame.tsx` (type import only), `components/site-header.tsx`, `app/loading.tsx`, `app/play/loading.tsx`, `app/notes/loading.tsx` (new), `app/globals.css`, `lib/brand-colors.ts` (new), `app/opengraph-image.tsx`, `app/error.tsx`, `app/not-found.tsx`, `DEMO.md`, `CLAUDE.md`, `README.md`, `HANDOFF.md`, `.farm-commits.json`.

### Commands run

None, no command access.

### Open questions

- `.farm-live.json` belongs to Phase 2. The keyless path needs no secret, so the real adapter has no required env keys. Phase 2 must define what the runner writes there besides `ADAPTER_MODE=real`.
- Phase 2 replaces the three seed tokens with real captured snapshots.
- `npm run seed` relies on Node loading `lib/data/seed.ts` as ESM without `"type": "module"` in `package.json` (syntax detection, Node 22.7 or newer). If the runner's Node is older, either upgrade Node or rename the seed module to `.mts`; no dependency is needed either way.
- The wow moment numbers ($3,870 toward a few hundred dollars) are quoted from this file's Mission 3; they were not recomputed in this phase.

### Next best step

Mission 1 above: verify the CMC field pickers by response, then swap the seeds in `lib/data/seed.ts` and rerun `npm run seed`.

## Phase 2 log (real CoinMarketCap DEX data behind the adapter seam)

### Goal

Make the CoinMarketCap DEX API the real mechanism behind DEMO.md steps 2 and 3: in `ADAPTER_MODE=real` the queue slider on `/` runs `exitQuote()` over pools and holders fetched live from CMC (keyless first), with typed errors, zod edge validation, tests and a proof script. Fake mode stays the default and keeps rendering every step.

### Status

All six slices written by file editing only. Build, tests and proof are unverified until the runner and the human run them.

- Mechanism that went real: the CMC DEX endpoints `/v1/dex/token`, `/v1/dex/token/pools`, POST `/v1/dex/holders/list`, `/v1/dex/security/detail`, `/v1/dex/liquidity-change/list` (plus `searchTokens()` on `/v1/dex/search`, no UI), keyless host first, keyed host only when `CMC_PRO_API_KEY` is set.
- `realAdapter.listTokens()` loads every `DEMO_TOKENS` entry through `loadExitBundle` in parallel; a failed token falls back to the seed token on the same chain; `source` is `live` only when all are live, otherwise `snapshot` with a message naming the fallbacks. `getToken` resolves from the same list. `lookup` is live.
- Still fixtures: `fakeAdapter` entirely (the default); in real mode the BSC sample stays the seed token MOSS unless `EFFLUX_DEMO_BSC_ADDRESS` is set; any demo token whose live load fails.
- `.farm-live.json` env names: `requiredEnv` is empty because the real path uses the keyless public API and needs no secret; `optionalEnv` is `CMC_PRO_API_KEY`, `EFFLUX_DEMO_BASE_ADDRESS`, `EFFLUX_DEMO_BSC_ADDRESS`, `EFFLUX_DEMO_SOLANA_ADDRESS`. All four are read by `lib/config.ts` and listed in `.env.example`.

### Decisions

- `lib/config.ts` is the only reader of CMC and demo env names; `lib/adapter.ts` keeps the single `ADAPTER_MODE` read.
- Every CMC fetch uses `next: { revalidate: 60 }` (GET and POST) and no `no-store`, so `/` and `/notes` stay ISR pages in real mode instead of throwing a dynamic bailout inside the client's try/catch. Build time fetches fall back to seed if the build machine has no network.
- `CMC_ENDPOINTS` is re-exported from `lib/adapter.ts` so `/notes` no longer imports `lib/cmc`.
- `SOURCE_LABEL` lives in `lib/data.ts` (the client-safe barrel) so `/` and `/play` show the same three sentences.
- Error responses are exactly `{ error, hint }`; codes and statuses in `lib/errors.ts` (`not_configured` maps to 503, unused today). The fake-mode "only sample addresses resolve" sentence moved into the UI: `components/play-desk.tsx` shows it for `not_found` when the samples are seed data.
- `/api/tokens` takes no parameters; `tokensQuerySchema` rejects any query key with 400.
- Holder tag matching for "lp" now needs a word boundary (`\blp\b`), so words such as "help" no longer tag a holder as a pool.
- The `/play` proof drawer now shows the sample list's proof entries for the picked sample (seed entries in fake mode, real calls in real mode).

### Failed attempts

None.

### Files changed

New: `lib/config.ts`, `lib/errors.ts`, `lib/schemas.ts`, `lib/cmc-parse.ts`, `scripts/proof.mjs`, `.farm-live.json`, `vitest.config.ts`, `tests/simulate.test.ts`, `tests/cmc-parse.test.ts`, `tests/schemas.test.ts`, `fixtures/cmc/pools.json`, `fixtures/cmc/holders.json`, `fixtures/cmc/security.json`, `fixtures/cmc/liquidity-change.json`, `.farm-commits.json`.
Edited: `lib/cmc.ts`, `lib/types.ts`, `lib/adapter.ts`, `lib/data.ts`, `app/api/exit/route.ts`, `app/api/tokens/route.ts`, `app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx` (import path, retry claim), `components/play-desk.tsx`, `components/story-scroll.tsx`, `package.json`, `.env.example`, `README.md`, `DEMO.md`, `CLAUDE.md`, `HANDOFF.md`.

### Commands run

None, no command access.

### Unmet or unverified items (evidence)

- Field pickers not tightened: the repo holds no captured CMC response, so the candidate lists in `lib/cmc-parse.ts` are unchanged guesses; field names are confirmed only by the `cmc-fields` block that `npm run proof` writes into README.md.
- `tests/simulate.test.ts:33` uses `toMatchSnapshot()`; the snapshot file is created on the first `npm test`, which the runner does not run. Commit `tests/__snapshots__/` after the first human run.
- `components/play-desk.tsx:99`: a failed lookup clears the proof drawer, because error bodies are strictly `{ error, hint }` and carry no proof. Step 6 shows real calls only on success.
- `components/play-desk.tsx:234`: in real mode with a fallback, every sample button shows the list-level "Bundled snapshot" badge, even the samples that loaded live. Per-token source is not tracked on the client.
- `lib/cmc.ts:108`: caching of the holders POST by the Next data cache is assumed, not observed.
- `lib/cmc-parse.ts:107`: `actualBalance` is assumed to be decimal adjusted. If it is raw units, the queue is wildly oversized.
- The wow numbers on live BRETT are not known; the "$3,870 toward a few hundred dollars" line in DEMO.md is for the seed token FIN.
- No `/api/search` route exists (no new routes allowed this phase); `searchTokens()` is ready for it.

### Open questions

- Is the `platform` query parameter right (`base`, `bsc`, `solana`), or do the DEX endpoints want a chain id or a different slug? `PLATFORM_PARAM` in `lib/config.ts`.
- Is holder `percent` a fraction or a percent? Efflux does not use it today.

### Manual checklist (facts only a person can supply)

1. Run `npm run proof` and read the README `cmc-call` block: confirm BRETT (`0x532f27101965dd16442E59d40670FaF5eBB142E4`) and BONK (`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`) return pools with status 200.
2. Read the `cmc-fields` block; if a picker key is missing, fix the candidate list in `lib/cmc-parse.ts`.
3. Pick a long-lived BSC token, set `EFFLUX_DEMO_BSC_ADDRESS` in Vercel and `.env.local`, rerun `npm run proof`.
4. Run `npm test` once and commit the generated snapshot.
5. Swap the seeds in `lib/data/seed.ts` for snapshots built from the captured responses, then `npm run seed`.
6. On the deployed URL with `ADAPTER_MODE=real`: confirm the green "Live from CoinMarketCap" note on `/`, drag the queue slider, open the proof drawer on `/play`.

### Next best step

Run `npm run proof`, correct any picker key the `cmc-fields` block contradicts, then rehearse the queue drag on live BRETT and decide whether the story should open on the Base or the Solana token.

## Phase 3 log (demo path end to end on real data)

### Goal

Every DEMO.md step 1 to 7 survives the real flow: bounded latency, a per-step fallback in code, named loading, error and empty states on `/`, `/play` and `/notes`, a reset that returns the demo to the same start state, and share links that resolve on the server.

### Status

All five slices written by file editing only. Build, tests, proof and the reset cycle are unverified until the runner and a person run them.

- Slice 1: `LIST_BUDGET_MS = 4000` in `lib/config.ts:30`. `loadDemoTokens()` in `lib/adapter.ts` races each token's `loadExitBundle` against it (`Promise.race`, `lib/adapter.ts:143`). A late token serves its seed and is named in the message as "SYMBOL (chain, over the 4 s budget)". `lookupWithinBudget()` (`lib/adapter.ts:207`) gives the server-side share link the same budget. Every GET in `lib/cmc.ts` keeps `next: { revalidate: 60 }`; the holders POST now goes through `holdersCall()` with an in-process `Map` memo (`lib/cmc.ts:149`, 60 s, keyed by platform plus lowercased address, successful answers only, a hit replays the earlier proof entries). `/` has `export const revalidate = 60`; `/play` reads `searchParams` and stays dynamic.
- Slice 2: `npm run demo:reset` (`scripts/demo-reset.mjs`) removes `.next/cache/fetch-cache` if present and imports `scripts/seed.mjs` to regenerate `fixtures/seed.json`, then prints one line. README "Reset the demo" section.
- Slice 3: `components/route-states.tsx` exports `HomeSkeleton`, `PlaySkeleton`, `NotesSkeleton`, `ErrorState`, `EmptyState`. The failed-lookup proof gap is fixed: the drawer keeps the previous proof and shows "The last lookup failed, so the calls below are from the result still on screen."
- Slice 4: `playQuerySchema` (`lib/schemas.ts:39`) parses the `/play` query, never throws. `app/play/page.tsx` resolves `platform` plus `address` on the server and passes `initialLookup` to `PlayDesk`. The arrival `useEffect` fetch is gone. Lookup guarded by `requestIdRef` plus `AbortController`; submit `disabled` and `aria-busy` from `status.kind === "loading"`. `/api/exit` documents the idempotent GET and sends `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on success.
- Slice 5: `components/scene-slot.tsx` uses `next/image` (no `unoptimized`: Next serves `.svg` unoptimized by itself when `dangerouslyAllowSVG` is off). `scripts/proof.mjs` writes a `demo-timing` table; README "Measured latency" holds the markers with an honest "Not run" line until the runner runs proof.

### Decisions

**Persistence: none.** First row of the table, "seed constants and in-memory per request". No demo step writes server state; the share link carries every control in the URL (`copyLink` in `components/play-desk.tsx`). No `lib/store.ts`.

Rejected rows:
- KV: nothing to store; every value is either a URL parameter or a 60 s cached CMC response.
- Postgres: no relational read anywhere in the demo.
- On-chain: no contract in this repo and no wallet flow.

The only server memory is the 60 s holders memo in `lib/cmc.ts`, a cache, not a store; a restart or a new serverless instance starts it empty.

Other decisions:
- No new dependency, env variable, API route or schema change to a route input. `playQuerySchema` is a new page-query schema, not a route schema; `.farm-live.json` and `.env.example` need no change because this phase adds no secret or env key.
- A failed shared link opens on the sample token with the error state and its retry; the drawer keeps the sample proof and shows the "last lookup failed" note, rather than showing failed CMC calls under a "Live" intro.
- Out-of-range `ahead` (for example 50) falls back to 0, not a clamp to 10: invalid values take defaults, as the spec asks.
- Times on `/play` now print in UTC ("Read at 8:11:26 PM UTC") so server and browser render the same text for a server-resolved link.

**Per-step table (real path, fallback in the same file)**

| Step | Real path (file, symbol) | Fallback (file, symbol) |
| --- | --- | --- |
| 1 `/` hero and 3D pool | `app/page.tsx` `Home` via `getAdapter().listTokens()` then `lib/adapter.ts` `loadDemoTokens` | `lib/adapter.ts` `loadDemoTokens` late or failed branch serves the seed; `app/page.tsx` `EmptyState` when the list is empty; `components/pool-scene-frame.tsx` error boundary falls back to the SVG |
| 2 `/` "The quote" | `components/story-scroll.tsx` `StoryChapters` over `loadDemoTokens` live data | same `loadDemoTokens` seed branch inside `LIST_BUDGET_MS`; `components/story-scroll.tsx` `StoryScroll` `EmptyState` |
| 3 `/` "The queue" (wow) | `exitQuote()` in `lib/simulate.ts` over live holders from `lib/cmc.ts` `holdersCall` | `holdersCall` memo hit, else `loadDemoTokens` seed holders |
| 4 `/` "Hidden cuts" | `parseSellTaxPct`, `parseLpChangePct` through `lib/cmc.ts` `loadExitBundle` | `loadDemoTokens` seed token's `sellTaxPct` and `lpChange24hPct` |
| 5 `/play` free tool | `app/play/page.tsx` `PlayPage` via `listTokens`; lookup `components/play-desk.tsx` `loadLive` then `/api/exit` | `loadDemoTokens` seed branch; `components/play-desk.tsx` `ErrorState` with `retryLookup`, `EmptyState` with `focusAddress` |
| 6 `/play` proof drawer | `components/play-desk.tsx` `ProofDrawer` with `envelope.proof` from `lib/cmc.ts` `cmcCall` | `ProofDrawer` keeps previous proof plus `lastFailed` note; `lib/adapter.ts` `seedProof` in fake mode |
| 7 share link, then `/notes` | `app/play/page.tsx` `playQuerySchema` then `lib/adapter.ts` `lookupWithinBudget` into `PlayDesk` `initialLookup`; `app/notes/page.tsx` `NotesPage` | `lookupWithinBudget` late branch returns `upstream_timeout`, `PlayDesk` opens in `ErrorState` with retry; `app/notes/page.tsx` `EmptyState` for an empty endpoint list |

**State triad per route**

| Route | Skeleton | ErrorState (retry) | EmptyState (call to action) |
| --- | --- | --- | --- |
| `/` | `app/loading.tsx` `HomeSkeleton` | `app/error.tsx` `onRetry={reset}` | `app/page.tsx` and `components/story-scroll.tsx`, "Open the simulator" to `/play` |
| `/play` | `app/play/loading.tsx` `PlaySkeleton` | `app/play/error.tsx` `onRetry={reset}`; inline `components/play-desk.tsx:283` `onRetry={retryLookup}` | `components/play-desk.tsx:244` and `:350`, "Paste an address" focuses the field |
| `/notes` | `app/notes/loading.tsx` `NotesSkeleton` | `app/notes/error.tsx` `onRetry={reset}` | `app/notes/page.tsx:74`, "Open the simulator" to `/play` |

### Failed attempts

None.

### Files changed

New: `components/route-states.tsx`, `app/play/error.tsx`, `app/notes/error.tsx`, `scripts/demo-reset.mjs`, `.farm-commits.json`.
Edited: `lib/config.ts`, `lib/adapter.ts`, `lib/cmc.ts`, `lib/schemas.ts`, `tests/schemas.test.ts`, `app/page.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/play/page.tsx`, `app/play/loading.tsx`, `app/notes/page.tsx`, `app/notes/loading.tsx`, `app/api/exit/route.ts`, `components/play-desk.tsx`, `components/story-scroll.tsx`, `components/scene-slot.tsx`, `scripts/proof.mjs`, `package.json`, `README.md`, `HANDOFF.md`.

### Commands run

None, no command access.

### Unmet or unverified items (evidence)

- User-typed lookups on `/play` are not bounded at 5 s: `/api/exit` (`app/api/exit/route.ts`) calls `getAdapter().lookup` directly, so a cold CMC call can take up to 8 s plus one 600 ms retry plus 8 s (`lib/config.ts` `CMC_TIMEOUT_MS`, `CMC_RETRIES`). Only the sample list and the server-resolved share link are raced against `LIST_BUDGET_MS`. The submit stays disabled and labelled "Reading CoinMarketCap..." meanwhile.
- A late demo token keeps loading in the background after the budget fires (`lib/adapter.ts:143`); its GETs warm the 60 s fetch cache, but its result is not used for that request.
- `components/brand-mark.tsx:11` still renders `<img>`: it is the header brand slot, left alone to keep the one-mark rule intact. It is the only `<img` under `app` and `components`.
- `NEXT_PUBLIC_BRAND_FILES` exists in `lib/brand-files.ts:2` and `next.config.ts:17` from the scaffold. It carries image file names, not a secret, and `lib/brand-*.ts` is on the never-touch list, so it stays.
- `.next/cache/fetch-cache` is the cache path for `next start`; on Vercel the data cache lives on the platform and `demo:reset` cannot clear it. A redeploy or a 60 s wait does.
- The holders memo lives per server instance. On Vercel each cold lambda starts empty, so the memo helps repeat requests on a warm instance only.
- Everything that needs a command: `npm run build`, `npm test` (5 new `playQuerySchema` cases), `npm run proof` (new `demo-timing` block), `npm run demo:reset`.

### Open questions

- Should user lookups through `/api/exit` get the same 4 s budget, returning `upstream_timeout` and letting the retry hit the warm cache? It would make every step meet the 5 s rule, at the cost of more retry clicks on cold tokens.
- Does the keyless holders POST accept `platform` as `base` and `solana`? Phase 2 proof recorded a 400 for it (README `cmc-call` block).

### Manual checklist (facts only a person can supply)

1. Run `npm run proof`; read `cmc-call`, `cmc-fields` and the new `demo-timing` block. Every demo token should show a total under 5000 ms.
2. The holders POST returned 400 in the Phase 2 proof: find the body CMC expects and fix `holdersCall` in `lib/cmc.ts` and the matching proof call.
3. If a picker key is missing in `cmc-fields`, fix the candidate list in `lib/cmc-parse.ts`.
4. Pick a long-lived BSC token, set `EFFLUX_DEMO_BSC_ADDRESS` in Vercel and `.env.local`, rerun `npm run proof`.
5. Run `npm test` once and commit `tests/__snapshots__/`.
6. Swap the seeds in `lib/data/seed.ts` for snapshots built from the captured responses, then `npm run seed`.
7. On the live URL with `ADAPTER_MODE=real`: run `npm run demo:reset`, `npm run seed`, then walk DEMO.md steps 1 to 7 three times; same numbers each time, no step over 5 s. Open a copied share link in a new tab.
8. Block or throttle CoinMarketCap once: the "Bundled snapshot" note appears, "Try again" works, the proof drawer keeps the last good entries with the failure note.

### Next best step

Run `npm run proof`, fix the holders POST body (the 400), then decide the open question on bounding `/api/exit`. Phase 4 can then move on to Mission 2 and 3 polish on live data.

## Phase 4 log (sponsor proof, hidden cuts waterfall, responsive and security pass)

### Goal

Prove the CoinMarketCap integration is load-bearing (README bounty table, endpoint list checked against code, DELIVERY.md), ship the second wow (the cuts waterfall plus "repeat tomorrow" on `/play`, DEMO.md step 7), make every route work at 360, 768 and 1280 px, tighten metadata and the landing band, then a web hygiene pass with SECURITY.md.

### Status

All five Part A slices and Part B written by file editing only. Build, tests, proof and every visual check are unverified until the runner and a person run them.

- Slice 1: `LOOKUP_BUDGET_MS = 4000` (`lib/config.ts:38`). `lookupWithinBudget` (`lib/adapter.ts`, around line 207) now races against it, and `/api/exit` calls it (`app/api/exit/route.ts:30`), so every user lookup is bounded at 4 s and a late one returns the typed `upstream_timeout` (504) with the hint "Try again: the second try is usually served from the 60 second cache" (`lib/errors.ts`). Input is still `exitQuerySchema.safeParse` in the route; the key is still read only by `getCmcKey()`. Proof drawer behavior unchanged (a failed call keeps the last good entries). Holders POST 400: parked, see below.
- Slice 2: README "Bounty" table (`README.md:36` to `:40`), the one-ranking sentence, the depth statement (`README.md:44`), the endpoint table note, and the rewritten "What the API made possible and where it pushed back" (four concrete points). `DELIVERY.md` new. `.env.example` demo address values are now empty placeholders (the defaults stay in `lib/config.ts`). `/notes` API note matches the README.
- Slice 3: `cutsWaterfall()` in `lib/simulate.ts:203` (display rounding only, largest remainder so the printed cuts add up to the printed gap; no model change). `components/cuts-waterfall.tsx` new: wallet row (DEEP), four cut rows (INK blocks, staircase from the right), payout row (ACCENT), a sum line, `efflux-wipe` entrance; empty state (zero holding) with "Paste an address", `ErrorState` when a number is not finite. `components/exit-stage.tsx:88` renders it on `/play`; the compact sticky panel on `/` keeps the loss bar. The drain toggle reads "Assume tomorrow repeats the last 24 hours (LP moved X%)". `PlaySkeleton` has waterfall placeholder rows. Tests: `tests/simulate.test.ts:73` asserts the sum for the three seed tokens at 0 and 10 wallets ahead with all four tax and drain combinations, plus "repeat tomorrow lowers the payout".
- Slice 4: mobile nav disclosure in `components/site-header.tsx` (`md:hidden` button with `aria-expanded` and `aria-controls`, `hidden md:block` desktop nav, `min-h-11` links, closes on route change, header still `h-16` solid with `border-b`, one `BrandMark`). Proof drawer JSON and the `/notes` code block scroll in `max-w-full overflow-x-auto` boxes; the `/notes` card grid is `grid-cols-1` (minmax 0) so the code never widens the page. Holder list lost its `min-w-[36rem]`; holder names and the token address truncate with a `title`. `min-h-11` on sample buttons, chain buttons, submit, toggles, slider, "Will not sell", copy, drawer button, drawer summaries, state buttons, chapter links (below md), pool buttons, error page buttons, footer links.
- Slice 5: landing band at the end of `/` (surface, after the ground method band) with "Open the simulator" to `/play` (`app/page.tsx:105`). Root metadata (`app/layout.tsx`): default title "Efflux: what your token really pays", template `%s | Efflux`, 151 character description, `openGraph.images`, `twitter.card: "summary_large_image"`, `metadataBase` set to the README live URL `https://efflux-eight.vercel.app` (was `https://efflux.vercel.app`). Empty-state microcopy: proof drawer before any call, queue with no eligible holders (new line under the slider), zero liquidity (now an `EmptyState` with "Paste an address").
- Part B: security headers in `next.config.ts`, `SECURITY.md`, footer "About and security" line in `app/layout.tsx`.

### Decisions

- **`/api/exit` budget: yes, 4 s.** Every step now meets the 5 s rule. A cold token may need one "Try again" click; the late load keeps running and warms the 60 s cache, so the retry is fast. The share link and the API route share one function (`lookupWithinBudget`) and one constant (`LOOKUP_BUDGET_MS`); routes still never import `lib/config`.
- **Waterfall on `/play` only.** The sticky story panel on `/` would grow by six rows and cover most of a phone screen, so it keeps the one-line loss bar (DEMO step 4 unchanged). The waterfall needs display rounding, not model changes: `exitQuote()` already sums exactly; `cutsWaterfall()` rounds wallet and payout first and spreads the remainder, so "$a + $b + $c + $d = $gap" is true to the unit on screen.
- **DEMO step 7 wording.** The spec text says "five rows"; the waterfall has six (wallet, four cuts, payout), so step 7 describes them by name instead of a count.
- **Signatures 2 and 3 left to Phase 5,** as the scope fence says. The waterfall is plain HTML blocks, so it adds no second animation library and does not touch `components/pool-scene*.tsx` beyond `min-h-11` on two buttons.
- **Landing band at the end of `/`.** Inserting it after the hero would put two surface bands next to each other (the problem band) or two ground bands (the first chapter); at the end it keeps the L5 alternation and doubles as a second CTA band.
- `lib/cmc.ts:64` keeps its `console.log` `[core]` line: server-only request logging that Phase 2 asked for. No `console.` remains in `app/` or `components/`.

### Part B notes

- **B1 contract front: skipped.** `Glob contracts/**` returns no files; the repo has no contracts.
- **B2 wallet front: verifies vacuously.** `Grep "eth_requestAccounts|wallet_|personal_sign|eth_sign|ethers|wagmi|window\.ethereum"` over `app components lib`: no matches. No wallet code, no approvals, no signing.
- **B3 web hygiene greps (all over `app components lib`):**
  - `sk-|PRIVATE_KEY|[0-9a-fA-F]{64}|CMC_PRO_API_KEY`: only `lib/cmc.ts` (comments and the header line) and `lib/config.ts` (`getCmcKey`), both server-only.
  - `"use client"` files and `from "@/lib/(config|cmc|adapter)"`: no client file imports `lib/config`, `lib/cmc` or `lib/adapter`.
  - `NEXT_PUBLIC_BRAND_FILES` carries image file names only (`next.config.ts:17`).
  - `target=`: no `target="_blank"` anywhere. The footer GitHub link carries `rel="noopener noreferrer"` anyway.
  - `http://`: only the SVG namespace in `app/icon.svg` (a never-touch asset, not a request).
  - Forms: one `<form>` (`components/play-desk.tsx`), `preventDefault` then `fetch("/api/exit...")`. CMC calls are server-side; the UI names CoinMarketCap as the source.
  - `useSearchParams`: none (`/play` reads the `searchParams` prop on the server). No `writeFile` or `node:` import in `app/` or `lib/`; no `runtime = "edge"` export.
  - Fixed (low): no baseline security headers. Added `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` and a `Permissions-Policy` in `next.config.ts`.
- **B4** `SECURITY.md` with the four sections plus "Data and keys".
- **B5** footer line in `app/layout.tsx` (the shared shell, every route).
- **B6** both fronts clean, nothing found and left unfixed. **Blockaid note:** the app has no wallet flow, so a wallet security warning is not expected; if one shows, it is about the domain, not a transaction.

### Failed attempts

None.

### Files changed

New: `components/cuts-waterfall.tsx`, `DELIVERY.md`, `SECURITY.md`, `.farm-commits.json`.
Edited: `lib/config.ts`, `lib/adapter.ts`, `lib/errors.ts`, `lib/simulate.ts`, `app/api/exit/route.ts`, `tests/simulate.test.ts`, `components/exit-stage.tsx`, `components/play-desk.tsx`, `components/route-states.tsx`, `components/site-header.tsx`, `components/story-scroll.tsx`, `components/pool-scene-frame.tsx` (`min-h-11` only), `app/layout.tsx`, `app/page.tsx`, `app/opengraph-image.tsx`, `app/notes/page.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/play/error.tsx`, `app/notes/error.tsx`, `next.config.ts`, `.env.example`, `README.md`, `DEMO.md`, `HANDOFF.md`.

### Commands run

None, no command access.

### Unmet or unverified items (evidence)

- **Holders POST 400, parked (severity: medium).** The README `cmc-call` block now shows only 429s (`README.md`, "Captured by `npm run proof`"), and neither `fixtures/cmc/holders.json` (hand-written) nor the code shows what body CMC expects, so no speculative change was made to `holdersCall` (`lib/cmc.ts:151`) or `scripts/proof.mjs:135` and `:185`. Shortest fix path: run `npm run proof` from a machine that is not rate limited, read the holders status and response text; if it is 400, try `platform` as a chain id or `chainId`, or the body keys the OpenAPI page lists for `/v1/dex/holders/list`, then change the body in `holdersCall`, both proof calls and `seedProof` in `lib/adapter.ts`, and pin it with a test in `tests/cmc-parse.test.ts`.
- Everything that needs a command: `npm run build`, `npm test` (the 27 new waterfall cases), `npm run proof`, the 360, 768 and 1280 px checks, Lighthouse, the og:image fetch.
- The sticky story panel on `/` is still tall on a 360 px phone (curve hidden, loss bar, slider, two toggles). Not changed in this phase; Phase 5 frontend pass.
- HANDOFF "Definition of done" below still names `https://efflux.vercel.app`; the README and `metadataBase` use `https://efflux-eight.vercel.app`. Confirm which one is the Vercel production alias.
- `cutsWaterfall` for a position under $100 rounds to cents; the sum is exact in cents, untested on a live token.

### Open questions

- Which host is the production alias, `efflux-eight.vercel.app` (README) or `efflux.vercel.app` (Definition of done)? `metadataBase` follows the README.
- Is the track name "Markets and Trading Tools" exactly as written on the DoraHacks form? DELIVERY.md asks to confirm it in the Ask Question tab.

### Manual checklist (facts only a person can supply)

1. Run `npm run proof`; read `cmc-call` for a 200 on the holders POST (if 400, follow the parked fix path above), and `demo-timing` for every token under 5000 ms.
2. Run `npm test` once and commit `tests/__snapshots__/` if it is new.
3. On the live URL in a private window: walk DEMO.md steps 1 to 8, no console errors. Step 7: toggle "Assume tomorrow repeats the last 24 hours" and watch the LP drain row fill and the payout drop.
4. Devtools at 360, 768 and 1280 px: no horizontal page scroll, the Menu button opens the nav and reaches all three routes, the proof drawer JSON scrolls inside its own box.
5. View source on `/`: `og:image` is an absolute `https://efflux-eight.vercel.app/opengraph-image...` URL and loads. Lighthouse performance and accessibility about 80 or higher.
6. With `ADAPTER_MODE=real`, throttle CoinMarketCap once: the "Bundled snapshot" note appears, a lookup over 4 s shows "Try again", and the retry answers.
7. `curl -I` the live URL: the four security headers are present.
8. At submission time, work through `DELIVERY.md`.

### Next best step

Phase 5: kit signatures 2 and 3 (the pool follows the story controls; the chapter-linked camera move) and the frontend pass, starting with the sticky story panel height on phones. Before that, run `npm run proof` and settle the holders body.

## 5. Definition of done

- Deployed at https://efflux.vercel.app on live keyless CMC data, all three demo tokens loading on the live URL.
- README live demo link correct, endpoint table and real call proof present, proof drawer screenshot added.
- The 90-second flow above runs end to end, seed data and live data both.
- Wow moment rehearsed: the queue slider drag reads on camera without explanation.
- DoraHacks BUIDL submitted with video, repo, track and the #BuildwithCMC post URL before 2026-12-09 23:59 UTC.
