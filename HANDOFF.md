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
- `lib/cmc.ts`: **real CoinMarketCap integration**. `loadExitBundle(platform, address)` calls five DEX endpoints on the keyless host (or the keyed host when `CMC_PRO_API_KEY` is set). Every call is aborted after 8 seconds, and a 429, a network error or a timeout gets exactly one retry after 600 ms. It caches 60 s, records every call as `ApiProof`, returns typed `error` codes. Pickers live in `lib/cmc-parse.ts` (Phase 2).
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

## Phase 5 log (frontend pass, kit signatures 2 and 3, submission package)

### Goal

DEMO.md steps 1 to 4 on `/` read like a funded product in the IDENTITY look (D2, S6, L5, M4, K6), the 3D pool follows the sticky story controls (signature 2) and moves its camera between chapters (signature 3), `/play` and `/notes` share the band rhythm, and the submission files exist.

### Status

Written by file editing only. Build, tests, proof and every visual check are unverified until the runner and a person run them. `.farm-delta.md` holds the shot-by-shot diagnosis (13 items), 20 change rows (13 A, 7 B) with Grep proofs, and one Kept row.

- **Home bands** (`app/page.tsx`): 1 story band GROUND (hero copy plus the S6 chapters beside the sticky pool and panel), 2 problem band SURFACE (one sentence computed from the story token through the adapter, scene-2), 3 cuts band GROUND (scene-3), 4 API band DEEP (the `CMC_ENDPOINTS` list as type, link to `/notes`), 5 CTA band GROUND (the one primary button "Open the simulator", scene-6).
- **Wipe** (`app/globals.css`, `components/wipe-watch.tsx`): `.efflux-wipe-view` no longer uses `animation-timeline: view()` (it held band headings clipped until scrolled, so the BEFORE shots showed empty bands). An IntersectionObserver sets `data-wipe="run"` as an element enters; elements already on screen at load get `data-wipe="seen"` and never replay. Before JS, with JS off, or under reduced motion nothing is hidden.
- **Story** (`components/story-scroll.tsx`): one `controls` state feeds `ExitStage` and `PoolSceneFrame`. At lg the chapters are the left column and the pool plus panel a sticky right column; on phones both wrappers are `display: contents`, the pool sits in the flow and the panel sticks under the header with `max-h-[55svh]`. Chapter links are one mixed-case row; the active chapter is a flat ACCENT block. The last chapter hands over with a link-style button.
- **Compact panel** (`components/exit-stage.tsx`): under 640 px it keeps the payout, the loss bar and the slider; the legend and the tax and drain switches fold into `<Fold>` ("Where the gap goes, sell tax and LP drain"). Loss bar series are INK, INK 60%, INK 30%, LINE and ACCENT; WARN and BAD are no longer series colors.
- **Kit** (`components/pool-scene.tsx`, `components/pool-scene-frame.tsx`): see the interaction table below.
- **Primitives**: new `components/ui/fold.tsx` (details plus one-line summary). Badge is sentence case. Input has a visible INK focus outline. Header Menu control is the `Button` primitive. No bare `<button>`, `<input>` or `<select>` outside `components/ui/`.
- **`/play`** (`app/play/page.tsx`, `components/play-desk.tsx`): title band GROUND, pick band SURFACE (with scene-5 in the "no lookup yet" state), result band GROUND, queue band SURFACE. No cards.
- **`/notes`** (`app/notes/page.tsx`): five bands; the full method, the endpoint list and the limits fold behind one-line disclosures; the code block scrolls in its own box.
- **Footer** (`app/layout.tsx`): one link row (Simulator, Notes, Source on GitHub, Build with CMC hackathon) plus the Phase 4 "About and security" sentence.
- **OG image**: wordmark plus the real one-liner on GROUND with INK, DEEP and an ACCENT block; tokens from `lib/brand-colors.ts` (equal to IDENTITY).
- **Submission**: README rewritten as the submission text (PROOF blocks untouched), `SUBMISSION.md`, `docs/SCREENSHOTS.md`.

### Interaction kit, interaction to file

| Signature | Files | What drives it |
| --- | --- | --- |
| 1 orbitable pool on the first screen | `components/pool-scene-frame.tsx`, `components/pool-scene.tsx` | Click the pool or "Let the next wallet sell": next real holder from `lib/data/seed.ts` (through `lib/adapter.ts`) sells; "Refill the pool" wraps to 0 |
| 2 pool follows product state | `components/story-scroll.tsx` (`controls`, `update`) into `ExitStage` and `PoolSceneFrame` | Liquid height = `receiveUsd / screenUsd` from `exitQuote()`; tax (INK) and drain (DEEP) are separate layers above it; holder blocks flatten for `i < walletsAhead`; the pool button writes the same `controls.ahead` |
| 3 chapter camera move | `CameraRig` in `components/pool-scene.tsx`, `view` from `components/story-scroll.tsx` | Chapter id `queue` selects the low side view `[-9, 1.9, 2.6]`, every other chapter the front view `[-3.2, 3.6, 7.4]`; damped lerp with `invalidate()`, snap under reduced motion; "Reset view" button returns to the chapter's view |

Canvas: `next/dynamic` with `ssr: false` from the client `pool-scene-frame.tsx`, inside `SceneBoundary` falling back to `scene-1.svg`; `frameloop="demand"`; no lights, every material `meshBasicMaterial` in IDENTITY colors; all text in HTML. Every file importing `three`, `@react-three/fiber` or `@react-three/drei` starts with `"use client"` (`components/pool-scene.tsx`); `story-scroll.tsx` and `pool-scene-frame.tsx` import only types from it.

### Scene slots (all six are SVG fallbacks, `public/brand/` is absent)

| Slot | Shape | Route and file |
| --- | --- | --- |
| `n={1}` | 960x640 | `/`, `components/pool-scene-frame.tsx` (WebGL off or loading) |
| `n={2}` | 960x640 | `/`, `app/page.tsx` problem band |
| `n={3}` | 960x640 | `/`, `app/page.tsx` cuts band |
| `n={4}` | 960x640 | `/notes`, `app/notes/page.tsx` limits band |
| `n={5}` | 640x600, near square (new) | `/play`, `components/play-desk.tsx` "no lookup yet" state |
| `n={6}` | 1200x480, wide (new) | `/`, `app/page.tsx` CTA band |

No `Marka rerun needed` condition appeared: the header still renders the mark only through `<BrandMark />`.

### Route map

`/` is `app/page.tsx` plus `components/story-scroll.tsx`; `/play` is `app/play/page.tsx` plus `components/play-desk.tsx`; `/notes` is `app/notes/page.tsx`. All three are linked from `components/site-header.tsx` (`NAV`).

### Decisions

- The pool moved from a separate hero block into the story band, because signatures 2 and 3 only read if the pool is on screen while the slider moves and the chapter changes. At lg it is in the sticky column; on phones it stays in the flow above the sticky panel (the phone panel stays under 55 percent of the viewport, so the pool scrolls away while dragging there).
- Liquid height is the payout share (`receiveUsd / screenUsd`), as the spec says, not the old `quoteLeftFrac`.
- Illustrations with a white background on SURFACE bands use `mix-blend-multiply`, so they read as part of the band instead of a white card; no SVG under `public/illustrations` was edited except the two new files.
- `scene-3.svg` keeps its WARN and BAD bars (Kept row in `.farm-delta.md`): the existing illustration files are on the CLAUDE.md never-touch list.
- The problem band sentence is computed from the story token (`exitQuote`, no tax, nobody ahead) instead of the hand-typed $300,000 example.
- No new dependency, env variable, route or schema change. `lucide-react` was already installed (used by `fold.tsx`).

### Failed attempts

None.

### Files changed

New: `components/wipe-watch.tsx`, `components/ui/fold.tsx`, `public/illustrations/scene-5.svg`, `public/illustrations/scene-6.svg`, `SUBMISSION.md`, `docs/SCREENSHOTS.md`, `.farm-delta.md`, `.farm-commits.json`.
Edited: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/play/page.tsx`, `app/notes/page.tsx`, `app/not-found.tsx`, `app/opengraph-image.tsx`, `components/story-scroll.tsx`, `components/exit-stage.tsx`, `components/pool-scene.tsx`, `components/pool-scene-frame.tsx`, `components/play-desk.tsx`, `components/site-header.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `README.md`, `HANDOFF.md`, `IDENTITY.md` (Amendments only).

### Commands run

None, no command access.

### Unmet or unverified items (evidence)

- Everything that needs a command: `npm run build`, `npm test`, `npm run proof`, Lighthouse, the 360, 768 and 1280 px checks. In particular the R3F typing of `useThree((s) => s.controls)` and the spread `camera.lookAt(...TARGET)` in `components/pool-scene.tsx` are written to the documented API but not compiled.
- The camera rig and OrbitControls both write the camera while the rig eases (`components/pool-scene.tsx`, `CameraRig`); a visible fight with damping is possible and only a live look can tell.
- `/play` and `/notes` had no BEFORE shots, so their changes are not tied to a Diagnosis item.
- The sticky right column at lg holds the pool (2:1) and the compact panel; on a 1280x720 window it may need its own scroll (`lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto` in `components/story-scroll.tsx`).
- On phones the pool is not on screen while the slider is dragged; the wow drag reads best on desktop.
- The "$3,870 toward a few hundred dollars" line in DEMO.md was not recomputed; `SUBMISSION.md` says "from thousands of dollars to a few hundred" instead.
- No LICENSE file exists in the repo (Glob `LICENSE*` returns nothing), so README names no license.
- DoraHacks field character limits are unknown from the repo.
- Holders POST 400 is still parked (Phase 6 or 7).

### Open questions

- Which host is the production alias, `efflux-eight.vercel.app` (README, `metadataBase`, `SUBMISSION.md`) or `efflux.vercel.app` (Definition of done below)? This phase follows the README host.
- The track name "Markets and Trading Tools" is not verified byte-exact against the form (kept as in DELIVERY.md).
- Add a LICENSE file (which license)?

### Next best step

Phase 6 starts from the judge findings and the `npm run proof` output: compare the redeployed site against the BEFORE shots defect by defect, then settle the holders POST body.

### Manual submit checklist

1. Team member names in the DoraHacks form.
2. Age and eligibility confirmation in the form.
3. Confirm the exact track name on the form ("Markets and Trading Tools").
4. Record the demo video and paste its link in the form.
5. Post on X with #BuildwithCMC linking the BUIDL page and the demo video; paste the post URL in the form.
6. Run `npm run proof` and commit the rewritten README blocks; run `npm test` once and commit `tests/__snapshots__/`.
7. Walk DEMO.md steps 1 to 8 on the live URL in a private window, once at phone width.
8. Paste the fields from `SUBMISSION.md` and work through `DELIVERY.md`.

## Phase 6 log (first jury fixes)

### Goal

The claims on screen and in the docs match what the code does, and the first screen of `/` and `/play` looks finished: 5 live endpoints (search is a wrapper only), one retry sentence everywhere, rounded percentages, no duplicated switch line, a timestamped source note under the hero, and the same BRETT on `/` and `/play`.

### Status

Slices 0 to 5 written by file editing only. Build, tests and every live check are unverified until the runner and a person run them.

### Decisions

- **Endpoint list:** `CMC_ENDPOINTS` (`lib/cmc.ts:55`) gained a `live` flag. `/notes`, the home API band (`app/page.tsx`) and `seedProof` (`lib/adapter.ts:49`) show only `live: true` rows, so the count is 5 everywhere and fake-mode proof shows 5 entries, not 6. `/notes` lists `/v1/dex/search` separately as "Not live: wrapper exists in lib/cmc.ts, not called by the live UI yet."
- **Retry sentence (one wording, matching `lib/cmc.ts:103` and `lib/config.ts:14` to `:20`):** "Every call is aborted after 8 seconds, and a 429, a network error or a timeout gets exactly one retry after 600 ms." The code has a fixed 600 ms wait, no backoff; other HTTP errors are not retried.
- **Percent formatter:** `fmtPctValue()` in `lib/simulate.ts` (next to `fmtPct`), one decimal, never "-0.0%". Used for the LP toggle and the sell tax in `components/exit-stage.tsx`, the tax and drain rows in `components/cuts-waterfall.tsx`, share of supply in `components/play-desk.tsx`, the "Hidden cuts" chapter line in `components/story-scroll.tsx` and the worked example in `app/notes/page.tsx`. The model numbers are unchanged. A side effect: the sell tax now prints "5.0%" where it printed "5%".
- **Duplicate line:** the duplication was in `components/exit-stage.tsx` (compact mode), not `story-scroll.tsx`. The two switches rendered twice (once inside the phone `Fold`, once in a `hidden sm:block` copy), so the server HTML printed "No sell tax" and "LP did not shrink in 24 hours" twice. The switches now render once and the phone `Fold` holds only the legend ("Where the gap goes"). On phones the sticky panel grows by the two switch buttons. It still scrolls inside `max-h-[55svh]`.
- **One number for BRETT:** both routes already used the same call, `getAdapter().listTokens()` (`app/page.tsx` `Home`, `app/play/page.tsx:41`), and both take the first token. The difference was timing: `/` was ISR (`revalidate = 60`, prerendered at build), while `/play` is dynamic. `/` now calls `await connection()` (`next/server`) and renders per request like `/play`. `force-dynamic` was rejected because it turns every fetch into `no-store` and would bypass the 60 s CoinMarketCap cache.
- **Source note:** moved from the sticky panel badge (`components/story-scroll.tsx`) to `SourceNote` in `app/page.tsx`, under the hero paragraph, inside the first band and in server HTML. On live data it reads "Live from CoinMarketCap, BRETT on Base, fetched HH:MM UTC" from the token's own `snapshotAt` (set in `lib/cmc.ts` `loadExitBundle` when the bundle is built). On fallback it reads `SOURCE_LABEL` exactly as before ("Bundled snapshot, CoinMarketCap was unavailable for some tokens", or "Seed data, not a live response" in fake mode). The `source` prop on `StoryScroll` was removed.
- **CTA sentence:** "Open the simulator and paste the token you hold to see what a sale pays before you press sell." No input was added.

### Failed attempts

None.

### Files changed

`.gitignore`, `README.md`, `lib/cmc.ts`, `lib/adapter.ts`, `lib/simulate.ts`, `app/notes/page.tsx`, `app/page.tsx`, `components/exit-stage.tsx`, `components/cuts-waterfall.tsx`, `components/play-desk.tsx`, `components/story-scroll.tsx`, `DEMO.md`, `HANDOFF.md`, `.farm-commits.json`. `package.json` is unchanged. No new route, dependency, env variable or schema change.

### Commands run

None, no command access.

### Unmet or unverified items (evidence)

- Everything that needs a command: `npm run build`, `npm test`, `npm run proof`, the live spot checks.
- **A failed LP call reads as "did not shrink".** `parseLpChangePct` (`lib/cmc-parse.ts:133`) returns 0 when the liquidity-change call fails or has fewer than 2 points, and `loadExitBundle` still marks the bundle `live` if token and pools succeeded. A 429 on that one call can therefore show "LP did not shrink in 24 hours" on a live token. The Phase 6 per-request rendering removes the build-time copy, but not this case. Fixing it means carrying "LP unknown" through `TokenSnapshot`, which is a type change, so it is an open question below.
- No test covers "a sale is split across pools and all pools end at the same price" directly (see ledger item 5.5).
- `/` now waits up to `LIST_BUDGET_MS` (4 s) on a cold cache per request instead of serving a prerendered page. `app/loading.tsx` (`HomeSkeleton`) streams meanwhile. Check the landing TTFB on the live URL.
- `SUBMISSION.md:40` still says "planned for the search box". It belongs to the farm (ledger, rank 3), so it was not edited.

### Open questions

- Carry an "LP change unknown" state when the liquidity-change call fails (type change to `TokenSnapshot.lpChange24hPct`, ask first)?
- Holders POST 400 is still parked from Phase 4.

### Next best step

Runner: build, test, redeploy. Then spot-check the landing note, `/play` "LP moved -14.1%", `/notes` "5 DEX endpoints live", and run the `git rm --cached` line below. Then Jüri 2, then Phase 7.

### Left to the builder

- Run `git rm --cached .farm-delta.md .farm-scaffold.json public/__farm.txt`, then commit. `public/__farm.txt` is served on the live site (`/__farm.txt`, per the technical judge) until this runs and the site is redeployed. The agent has no deletion tool, so it could not do this itself.
- Record the demo video and paste its link in the form.
- Confirm the exact track name in the DoraHacks form.
- Team names and eligibility (Phase 5 manual submit checklist, items 1 and 2).

## Phase 6 fix ledger

| # | Panel item | Outcome | Evidence |
| --- | --- | --- | --- |
| R1 | X post with #BuildwithCMC linking the BUIDL page and demo video, URL pasted in the form (blocker, submission-text) | handled by the farm | Verbatim: "BUIDL sayfası oluşunca #BuildwithCMC etiketli, DoraHacks BUIDL sayfasına ve demo videosuna link veren X paylaşımını yap, paylaşım URL'sini forma yapıştır." Builder note: this post and its URL in the form are the only blocker and take about 10 minutes by hand. |
| R2a | Repo hygiene: ignore farm artifacts | applied | `.gitignore:10` `.farm-delta.md`, `.gitignore:11` `public/__farm.txt` (`.farm-scaffold.json` already at `:9`). `.farm-*` and `.farm-live.json` deliberately not added. |
| R2b | Repo hygiene: `git rm` the farm files | declined for IDENTITY.md and `.farm-live.json`; left to the builder for the rest | IDENTITY.md is the identity contract that later phases read. `.farm-live.json` names the env keys for the live deploy and the runner reads it from disk. The `git rm --cached` line is under "Left to the builder" above. |
| R2c | README: `npm test` plus what `tests/simulate.test.ts` checks | applied | `README.md`, end of "How the number is built": two lines. They name only the assertions that exist (`tests/simulate.test.ts:21`, `:36`, `:43`, `:62`, `:89`, `:97`). |
| R3a | `/notes`: "5 DEX endpoints live", search shown separately | applied | `app/notes/page.tsx` endpoint band heading and the separate "Not live" list. `lib/cmc.ts:55` `live` flag. |
| R3b | `lib/cmc.ts` search wording | applied | `lib/cmc.ts:61` `use` text; `lib/cmc.ts:267` doc comment on `searchTokens`. |
| R3c | README endpoint row, count and "token search" feature bullet | applied | `README.md` endpoint table (5 live rows plus one "not live" row and the sentence above it). Search bullet removed from "What we would build next" and replaced by a "Not wired yet" note. |
| R3d | Backoff vs one retry | applied | No "exponential" or "backoff" claim left. Code: `lib/cmc.ts:103` loop, `lib/config.ts:17` `CMC_RETRIES = 1`, `:20` `CMC_RETRY_DELAY_MS = 600`. One sentence in README (rate limits bullet and tech stack), `/notes` pushback paragraph, `lib/cmc.ts:8` and HANDOFF section 2. |
| R3e | SUBMISSION.md endpoint section and deck slide 6 (the `/v1/dex/search` row) | handled by the farm | `SUBMISSION.md:40` untouched by the agent. |
| R4 | Deck slide 7, replace "1,000 users x $5,000 x 10% = $500,000 of surprises avoided" with the live BRETT result and the CLMM caveat | handled by the farm | Deck surface. No file written. |
| R5a | Round the LP percentage | applied | `fmtPctValue` in `lib/simulate.ts`. `components/exit-stage.tsx:80` "LP moved ${fmtPctValue(lp)}". Also used in `cuts-waterfall.tsx`, `play-desk.tsx`, `story-scroll.tsx` and `app/notes/page.tsx`. Grep for a raw `Pct}%` interpolation in `app/` and `components/`: no matches. |
| R5b | Duplicate "No sell tax / LP did not shrink" on the landing | applied | `components/exit-stage.tsx` compact branch: switches render once. |
| R6a | Timestamped source note under the hero | applied | `app/page.tsx` `SourceNote`, rendered inside `intro` above the chapters. Time from `token.snapshotAt`. |
| R6b | Same adapter call for BRETT on `/` and `/play` | applied (was already the same call; the render timing differed) | `app/page.tsx` `await connection()` plus `getAdapter().listTokens()`. `app/play/page.tsx:41` uses the same call. |
| R6c | "Paste the token you hold" has no input | applied | `app/page.tsx` CTA band: "Open the simulator and paste the token you hold to see what a sale pays before you press sell." |
| 5.1 | Live deploy mode | could not verify | `lib/adapter.ts` `getAdapter()` defaults to fake unless `ADAPTER_MODE === "real"`. `lib/config.ts` does not read `ADAPTER_MODE`. `.env.example:11` `ADAPTER_MODE=fake`. `.farm-live.json` has `requiredEnv: []` and no `ADAPTER_MODE` key, so whether the runner's live rule sets `real` on Vercel is not visible in the repo. Vercel env not touched. |
| 5.2 | Keyless 429 under concurrent users | could not verify (live only) | `lib/cmc.ts:121`: on 429, wait 600 ms and retry once. A second 429 returns `upstream_error`. `loadDemoTokens` (`lib/adapter.ts`) then serves the seed token for that chain, and the note reads "Bundled snapshot, CoinMarketCap was unavailable for some tokens" (`lib/data.ts:11`). In that case the story token is the seed FIN, not BRETT. A pasted address shows an error with "Try again". |
| 5.3 | Random address on `/play` | verified by reading | `app/api/exit/route.ts:26` validates only the chain format (`lib/schemas.ts:17`, `EVM_ADDRESS`, `SOLANA_ADDRESS`), then `lookupWithinBudget` calls `realAdapter.lookup` = `loadExitBundle` for any address. In fake mode only the three seed addresses resolve (`lib/adapter.ts` `fakeAdapter.lookup`). |
| 5.4 | BNB sample (MOSS) | verified by reading | `lib/config.ts:70`: `DEMO_TOKENS.bsc` is null unless `EFFLUX_DEMO_BSC_ADDRESS` is set (`.env.example:26`, empty). When unset, `loadDemoTokens` serves the seed MOSS for BNB Chain, names it in the message, and sets the list source to `snapshot`. So in real mode without that variable the note always reads "Bundled snapshot", even when BRETT and BONK load live. |
| 5.5 | `simulate.ts` correctness | partially covered | `tests/simulate.test.ts:43` "splits the gap exactly into impact, tax, drain and queue", `:21` pinned output at 0, 5 and 10, `:36` monotone payout, `:97` never above the wallet. No test asserts the split across pools or the equal final price (`sellInto`, `lib/simulate.ts:78`). That is claimed only in the comment at `lib/simulate.ts:8`. |
| 5.6 | Recharts and 3D library claims | verified, nothing to change | Grep `recharts` across the repo (excluding node_modules): no matches in package.json, README, `/notes` or UI. 3D claim in README "Tech stack" matches `package.json:16`, `:17`, `:25` (drei ^10.7.9, fiber ^9.8.2, three ^0.187.0). |
| 5.7 | Strongest objections: no swap-quote comparison; CLMM as constant product | verified, nothing to change | The "leans cautious" sentence is already on `/notes` (heading "The estimate leans cautious, and four things can move it." and the CLMM bullet in the same band). README says the same under "How the number is built". Swap-quote comparison: jüri önerisi, kapsam dışı: yeni özellik. |
| 5.8 | Track name "Markets and Trading Tools" | left to the builder | Not verifiable from the repo. |
| B1 | Demo video recording and link in the form | left to the builder | |
| B2 | `git rm --cached` command | left to the builder | See "Left to the builder". |
| B3 | Team names and eligibility | left to the builder | Phase 5 manual submit checklist items 1 and 2. |

## Phase 7 log (second jury fixes and freeze)

### Goal

Apply what the second panel (overall 6.3, fix-then-submit, 0 regressions) still found, then freeze the code. No new demo step, no new route, dependency or module; `package.json` unchanged.

### Status

Slices 0, A, B, C, D and E written by file editing only. Nothing was cut. Build, tests and `npm run proof` are unverified until the runner runs them. This is the last code phase: after the runner's redeploy the code is FROZEN.

### Round 2 triage

| Rank | Finding | Class | Surface | Owner |
| --- | --- | --- | --- | --- |
| 1 | #BuildwithCMC X post and form | REPEAT | submission-text | handled by the farm / builder, no task |
| 2 | Real API call proof response and live-vs-seed evidence | REPEAT | readme | slice A |
| 3 | `.farm-*` leftovers, retry wording, search row | REPEAT | code | slice B |
| 4 | Live BRETT paragraph, "selling now keeps X%", stress-test sentence | NEW | readme | slice C |
| 5 | DEMO.md steps 3 and 4 order | NEW | readme | slice D |
| 6 | "Checked against a real swap" table | NEW | readme | declined: bottom half of the ranking, needs aggregator quotes only a live call can produce, feature-shaped. The CLMM caveat already sits on `/notes` and in README "How the number is built". |

### Round 2 ledger

| Rank | Outcome | Evidence |
| --- | --- | --- |
| 0 re-check | partly already resolved | Already resolved: README retry sentence (`README.md`, rate limits bullet and Tech stack) matches `lib/cmc.ts:8` to `:10` and `:103` to `:124`; README search row "not live: wrapper exists" matches `CMC_ENDPOINTS` (`lib/cmc.ts:61`, `live: false`) and `/notes`. SUBMISSION.md had no "exponential" or "backoff" and no Recharts (Grep, before and after). Still open before this phase: `SUBMISSION.md:40` "planned for the search box", the hypothetical $300,000 pool in README "The problem" (it was never in SUBMISSION.md), no `.farm-*` rule in `.gitignore`. |
| 1 | handled by the farm / left to the builder, no task | X post with #BuildwithCMC linking the BUIDL page and the video; post URL in the form. |
| 2 | applied | `scripts/proof.mjs` `holdersSampleBlock()` writes the `holders-sample` block (status, ms, UTC fetch time, first 2 holder records of the real `POST /public-api/v1/dex/holders/list` response as JSON, or one "Not run in this build: <reason>" line) into README.md (under "Live demo:") and SUBMISSION.md ("Real API call proof"). The "Response: the README section ..." sentence is gone. Live link uses the format `copyLink` writes for a lookup (`components/play-desk.tsx:213` to `:215`, `platform` plus `address`, parsed by `playQuerySchema` `lib/schemas.ts:46` to `:51`): `/play?platform=base&address=0x532f...42E4`. README names the source note under the hero; no claim about the Vercel mode was written. |
| 3 | applied | `.gitignore` `.farm-*` (keeps `public/__farm.txt`, `.env*`, `!.env.example`). SUBMISSION.md search row: "wrapper exists in `lib/cmc.ts`, not called at runtime yet". SUBMISSION.md pushback sentence now reads "8 s timeout, one retry after 600 ms on 429, network error or timeout, and a 60 s cache". `git rm --cached` is under "Left to the builder". |
| 4 | applied | README "The problem" and SUBMISSION.md "Description": `brett-exit` PROOF block written by `brettExitBlock()` in `scripts/proof.mjs`, which imports `exitQuote()` from `lib/simulate.ts` and the pickers from `lib/cmc-parse.ts` (both have only `import type` imports, so Node type stripping loads them). No model code was duplicated. On a Node without type stripping, or when the holders call fails, the block writes one "Not run" line. Static sentence "Read 0 as today and 10 as the worst case; the queue slider is a stress test, not a forecast." in both files. |
| 5 | applied | `DEMO.md`: step 3 "Hidden cuts", step 4 "The queue" (wow moment, last `/` step), "jump back" sentence deleted, header "Wow moment (step 4)". Page order confirmed in `components/story-scroll.tsx:25`, `:32`, `:39`, `:46` (quote, cuts, queue, yours). README "DEMO.md step 4" and the bounty table steps "2, 4, 6" follow the new numbers. |
| 6 | declined | See triage. |

### Phase 6 fix verdicts

| Fix | Verdict | Evidence |
| --- | --- | --- |
| R3e SUBMISSION search row | re-done | `SUBMISSION.md` endpoint list, search row (slice B). |
| R5a rounded LP percentage | held | `components/exit-stage.tsx:80` `fmtPctValue(lp)`; also `cuts-waterfall.tsx:65`, `:69`, `play-desk.tsx:423`, `story-scroll.tsx:36`, `app/notes/page.tsx:37`. |
| R5b single switch line | held | `components/exit-stage.tsx:70`, `:80` render once; comment at `:143`. |
| R6a timestamped source note | held | `app/page.tsx:30` `SourceNote`. |
| R6b same BRETT on `/` and `/play` | held | `app/page.tsx:51` `await connection()`. |
| R6c CTA wording | held | `app/page.tsx:138`. |
| `.gitignore` additions | held, extended | `.farm-scaffold.json`, `.farm-delta.md`, `public/__farm.txt` still present, `.farm-*` added. |
| Retry wording | held | README and `lib/cmc.ts:8`; SUBMISSION.md now matches too. |
| README claims (5 live endpoints, tests list) | held | README endpoint table and "Run the checks with `npm test`" lines untouched. |

### couldNotVerify and strongestObjection

- Deploy mode live vs seed: the source note under the hero states the mode at runtime (`app/page.tsx:30`); the check is the builder's (below).
- MOSS button: `lib/config.ts` `DEMO_TOKENS.bsc` is null without `EFFLUX_DEMO_BSC_ADDRESS`, so the seed serves; `.env.example:24` to `:26`, DEMO.md "Data modes" and SUBMISSION.md "Known gaps" say so.
- Track name "Markets and Trading Tools": not verifiable from the repo, left to the builder.
- 429 under concurrent judges: live only; `lib/cmc.ts:121` one retry, then seed fallback with the "Bundled snapshot" note.
- Recharts: not in `package.json`; no claim anywhere (Grep).
- Swap-quote objection: declined; caveat in README and `/notes`.
- Stale QA scan: runner's job after redeploy.

### Decisions

- `holders-sample` is the same block in README.md and SUBMISSION.md (short: two records), so one marker name covers both files.
- The live link uses `platform` plus `address`, not `token=base-0x532f2710`: the slug form only matches a sample loaded live, while the address form resolves on the server in real mode and is what `copyLink` writes after a lookup.
- `brett-exit` uses the `/play` defaults: $5,000, sell tax on, LP drain off.
- Known gaps went into SUBMISSION.md as a new section; README already carries the CLMM and search lines.

### Failed attempts

None.

### Files changed

`scripts/proof.mjs`, `README.md`, `SUBMISSION.md`, `.gitignore`, `DEMO.md`, `HANDOFF.md`, `.farm-commits.json`. `.env.example` checked, unchanged (every `process.env` name in `lib/config.ts`, `lib/adapter.ts`, `lib/brand-files.ts` is listed). No `app/` or `components/` edit.

### Commands run

None, no command access.

### Unmet or unverified items (evidence)

- The `holders-sample` and `brett-exit` blocks hold a "Not run in this build" placeholder until `npm run proof` runs. The last recorded proof (README `cmc-call`, `demo-timing`) shows the holders POST returning 400, so both blocks may stay "Not run" with that reason: `brettExitBlock()` stops on a failed holders call rather than print a queue of zero.
- `brettExitBlock()` needs Node 22.18 or newer (type stripping on by default) to import `lib/simulate.ts`; `package.json` `proof` is plain `node scripts/proof.mjs` and was left unchanged. On older Node the block says so.
- DEMO.md wow figure "$3,870 toward a few hundred dollars" is still for the seed token, not recomputed.
- Everything that needs a command: build, `npm test`, `npm run proof`, the redeploy checks.

### Open questions

- Holders POST 400 (parked since Phase 4): the body CoinMarketCap expects is still unknown.
- Carry an "LP change unknown" state (type change to `TokenSnapshot.lpChange24hPct`)? Left as a known gap.

### Left to the builder

- Run once: `git rm --cached .farm-delta.md .farm-scaffold.json public/__farm.txt .farm-live.json`, commit, redeploy, and check `/__farm.txt` returns 404. Do not delete `.farm-live.json` or IDENTITY.md from disk.
- After redeploy, open the landing page and read the note under the hero: "Live from CoinMarketCap, BRETT on Base, fetched HH:MM UTC" means live; "Bundled snapshot" or "Seed data" means not.
- #BuildwithCMC X post linking the DoraHacks BUIDL page and the video; post URL, video link, exact track name, team and eligibility in the form.

### Next best step (builder submission checklist)

1. Runner: `npm install`, `npm run build`, `npm test`, `npm run proof`; commit the rewritten PROOF blocks.
2. Run the `git rm --cached` line above, redeploy, confirm `/__farm.txt` is 404.
3. Read the landing source note; click one sample per chain; open the `/play` proof drawer.
4. Closing commit `faz-7:`, tag `v0.1-hackathon`. Code frozen.
5. X post, form fields from `SUBMISSION.md`, video link, track, team, eligibility.

## 5. Definition of done

- Deployed at https://efflux.vercel.app on live keyless CMC data, all three demo tokens loading on the live URL.
- README live demo link correct, endpoint table and real call proof present, proof drawer screenshot added.
- The 90-second flow above runs end to end, seed data and live data both.
- Wow moment rehearsed: the queue slider drag reads on camera without explanation.
- DoraHacks BUIDL submitted with video, repo, track and the #BuildwithCMC post URL before 2026-12-09 23:59 UTC.

## QA: external findings

Round 1 of the live-site QA pass (2026-11-24).

- `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, header `Content-Type: application/json`, body `{"tokenAddress":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` answers **400** (README `demo-timing`: BRETT and Bonk both `200, 200, 400, 400, 200`). The body matches the field names in the ecosystem research (tokenAddress, platform), and the GET calls with `platform=base` succeed, so the right shape could not be settled from the repo. The QA agent had no network access to the CMC docs or the OpenAPI spec and did not guess a new body. Not fixed.
- `GET .../public-api/v1/dex/security/detail?platform=base&address=0x532f...` answers **400** as well, so `sellTaxPct` is 0 for live tokens. The UI now says "no sell tax on record" instead of claiming the token has none.
- What the judge sees now: live pools from CoinMarketCap, and where the holder list is missing the story, `/notes` and the panel say in one muted sentence that CoinMarketCap sent no holder list for this load, so no wallet is queued. No "0 largest wallets", no "0 holders", no "0 wallets ahead".
- Next step for a human with network access: read the holders/list and security/detail operations in the openCMC OpenAPI spec, fix the body in `holdersCall` (`lib/cmc.ts`) and the matching call in `scripts/proof.mjs`, and rerun `npm run proof`. The proof lines stay "Not run ... returned 400" until then, which is truthful.

Fixed in this repo (root causes, not external):
- "Bundled snapshot" notice: BSC has no demo address, so `loadDemoTokens` always mixed the seed MOSS into the real-mode list and marked every load as a snapshot. Chains with no demo address are now skipped (`lib/adapter.ts`); a real fallback logs a `console.warn` and keeps a calmer note (`lib/data.ts`).
- "loses another 451.4% of liquidity": `parseLpChangePct` compared the two ends of the whole liquidity-change list, not 24 hours, and the story and `/notes` printed `Math.abs()` of a growth as a loss. The picker now uses the last 24 hours, bounds a loss at -100%, and the copy follows the sign the model uses (`drainScale` only repeats liquidity that left).

Round 2 of the live-site QA pass (2026-11-24).

- Evidence: the runner's `npm run proof` got **429** on every keyless request (`GET /public-api/v1/dex/token/pools` for base and solana, `POST /public-api/v1/dex/holders/list` for base, and all five timing calls per token, each answered in about 400 ms). That is the per-IP keyless rate limit on the runner machine, so this run says nothing either way about the request shapes (round 1 saw 400 on holders and security).
- Root cause in this repo: `scripts/proof.mjs` sent 13 requests in quick bursts with no retry at all (the app's `lib/cmc.ts` retries once; the script did not), and it called pools and holders twice, once alone and again in the timing pass.
- Fix (`scripts/proof.mjs`): each call is retried up to 4 times on 429, 5xx, timeout or network error, waiting for CoinMarketCap's `Retry-After` (capped at 30 s) or a 2 s, 5 s, 10 s, 20 s backoff, plus up to 1.5 s of random jitter so the five parallel calls of one token do not retry in lockstep; tokens run one after another with a 2.5 s pause; the cmc-call, cmc-fields and holders-sample blocks reuse the timing-pass responses, so 10 requests instead of 13. When `CMC_PRO_API_KEY` is set on the runner, the script uses the keyed host (key as a header, never printed), which sidesteps the shared keyless pool. The timing table shows retried calls as `429 > 200` and counts the wait in the total.
- If the runner IP stays rate-limited past all retries, the proof lines keep saying so ("rate-limited this machine with 429 ... after 5 attempts"), which is truthful. The live site was not affected this round: the crawl reported no `data` or `visible` findings, and the app keeps its 60 s cache, its one retry and the calm "Bundled snapshot" note.

Round 3 of the live-site QA pass (2026-11-24). Findings: `proof: POST /v1/dex/holders/list base ... returned 400` and `proof: brett-exit ... returned 400`.

- Still unresolved from the docs: this QA agent had no network either (curl and doc fetches were not permitted), so the documented body for holders/list was not read. The request that fails is unchanged: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"tokenAddress":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}`, status **400**. Bonk on Solana gets the same 400.
- Gap fixed: the proof script dropped CoinMarketCap's 400 body, so no run ever showed CMC's own reason. `failLine()` in `scripts/proof.mjs` now writes the body that was sent and CMC's `status.error_message` (or the raw text) into the line, and `lib/cmc.ts` logs the first 300 characters of any 4xx body with `console.warn` on the server. After the next `npm run proof` the README line itself names the rejected field.
- One bounded fallback, not a guessing loop: every DEX GET that answers 200 (`token`, `token/pools`, `liquidity-change/list`) names the token `address`, while only the holders POST used `tokenAddress`. `holdersCall()` (`lib/cmc.ts`) and `holdersPost()` (`scripts/proof.mjs`) now try `{"address": ..., "platform": ...}` once after a 400 on the first body. The app keeps the body that answered 2xx for the rest of the process, and memoizes a 400 for 60 s, so a reload sends no further rejected POSTs. The proof drawer shows both attempts. If CMC rejects `address` too, the reason recorded in the README says what to change next. Note that `security/detail` gets a 400 with the same `platform` and `address` query that works for `token/pools`, so the `platform` value may be the real problem for both endpoints (a chain id or a different chain name).
- brett-exit no longer depends on the holders call. "What a sale pays now" needs only token and pools, so the block now prints the live quote and adds one sentence: the holder queue is not shown in this build, followed by the failed holders request and CMC's reason. When holders succeed, the block is unchanged (0, 5 and 10 wallets ahead).
- Not claimed as fixed: if the next proof run still shows 400 for holders/list, this is an external request-shape question. Next step: read the reason now printed in README `holders-sample`, then change the body field or the `platform` value in `holdersCall` and `holdersPost`.

Round 4 of the live-site QA pass (2026-11-24). Finding: `proof: POST /v1/dex/holders/list base ... returned 400 ... reason: "Parameter error"`.

- Evidence, now with CMC's own reason: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"tokenAddress":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` answers **400**, and the fallback body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` answers **400** with `status.error_message` "Parameter error". Bonk on Solana: same. `GET .../v1/dex/security/detail?platform=base&address=...` also 400, while `token`, `token/pools` and `liquidity-change/list` answer 200 with that exact query.
- "Parameter error" does not name the field, and this QA agent again had no network (curl, WebFetch and a fetch subagent were all denied), so the documented shape could not be read. Per the QA rules, no third body was guessed. The strongest lead stays the one from round 3: both failing endpoints may want a different chain parameter (a numeric platform or chain id, or a differently named field) and possibly paging fields, while the three GETs that work accept `platform=base`.
- Judge-visible surface made honest (not hidden): `/notes` no longer says the holders request is sent "exactly" and works; it states the 400 and its date, the endpoint list marks holders and security with one muted line each (`note` in `CMC_ENDPOINTS`, `lib/cmc.ts`), and the "Possible" paragraph no longer claims holders and sell tax. README and SUBMISSION say the same. The story and `/play` already degrade in one calm sentence ("CoinMarketCap sent no holder list ..."), and the quote still runs on live price and pools.
- Proof script unchanged on purpose: its "Not run ... returned 400 ... Parameter error" line is truthful and stays until a human with docs access fixes the body in `holdersCall` (`lib/cmc.ts`) and `holdersPost` (`scripts/proof.mjs`). When that lands, clear the `note` on the two endpoints in `CMC_ENDPOINTS`.

Round 5 of the live-site QA pass (2026-11-24). Finding (unchanged): `proof: POST /v1/dex/holders/list base ... returned 400 ... reason: "Parameter error"` with body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}`.

- Classification: external request-shape question, NOT fixed. This QA agent again had no network (a direct curl to the endpoint and a WebFetch of the keyless API reference were both denied), and no local copy of the CMC OpenAPI spec or `@coinmarketcap/sdk` exists on the machine. The farm research notes only say "body tokenAddress and platform", which is the first shape already rejected. Two shapes have been tried; per the QA rules no third body was guessed.
- Exact failing requests: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, bodies `{"tokenAddress":"0x532f...42E4","platform":"base"}` and `{"address":"0x532f...42E4","platform":"base"}`, both **400**, `status.error_message` "Parameter error".
- Judge-visible surface tightened this round: the home band listing endpoints now marks holders/list and security/detail "(not accepted yet, skipped)" (driven by the existing `note` in `CMC_ENDPOINTS`), so the band no longer implies those two feed the numbers; the simulator's sell-tax row says "none on record" instead of "none on this token", since the security call never answered.
- For a human with docs access: open the holders/list operation in the openCMC OpenAPI spec (github.com/openCMC) and check (1) the chain field name and value format (chain id such as 8453 for Base, or a `platform_id`/`network` field), (2) required paging fields, (3) whether the address belongs in the query string rather than the body. Change `holdersCall` (`lib/cmc.ts`) and `holdersPost` (`scripts/proof.mjs`) together, rerun `npm run proof`, and clear the two `note` values.

Round 6 of the live-site QA pass (2026-11-24). Finding (unchanged from round 5): `proof: POST /v1/dex/holders/list base Not run in this build: CoinMarketCap returned 400 ... body {"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}, reason: "Parameter error"`.

- Classification: external request-shape question, NOT fixed. It needs a person, not another automated QA round. This agent had no network either: a direct curl to the endpoint, a WebFetch of the keyless API reference, and a fetch subagent were all denied. There is still no local copy of the CMC OpenAPI spec or `@coinmarketcap/sdk`. Per the QA rules, no third body was guessed.
- Exact failing request, unchanged: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` (and before it `{"tokenAddress":...,"platform":"base"}`), status **400**, `status.error_message` "Parameter error".
- No code changed this round. The judge-visible surface was already made calm in rounds 1, 4 and 5: the story and `/play` show one muted sentence when no holder list arrives, `/notes` and the home band mark holders/list and security/detail as skipped, and the quote runs on live price and pools. The proof line is truthful and stays as it is. Rewording it just to get past the crawl would hide the problem, not fix it.
- Recommendation to the runner: stop re-queuing this finding for automated QA rounds until someone with docs or network access runs the three checks listed under round 5, or until `CMC_PRO_API_KEY` is set on the runner. With the key set, the proof script uses the keyed host, which may accept the same body. Each further offline round can only repeat this entry.

Round 7 of the live-site QA pass (2026-11-24). Finding (unchanged from rounds 4 to 6): `proof: POST /v1/dex/holders/list base Not run in this build: CoinMarketCap returned 400 ... body {"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}, reason: "Parameter error"`.

- Classification: external request-shape question, NOT fixed. This round tried three sources for the documented body. A curl to the openCMC GitHub org and a WebFetch subagent on the keyless API reference were both denied (no network permission). There is no `@coinmarketcap/sdk` in `node_modules`. The farm research DB (`data/db.json` and its backups) only says "body tokenAddress and platform", and that shape is already rejected. Two bodies have been tried, so per the QA rules no third one was guessed.
- Exact failing request, unchanged: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` (after `{"tokenAddress":...,"platform":"base"}`), status **400**, `status.error_message` "Parameter error".
- No app code changed. The judge-visible surface is still calm and honest (one muted sentence when no holder list arrives, holders/list and security/detail marked skipped on `/notes` and the home band, and the quote runs on live price and pools). The proof line is truthful and stays.
- To close this, the runner needs one of these: network permission for the QA agent (WebFetch on coinmarketcap.com/api/documentation or raw.githubusercontent.com/openCMC), a local copy of the CMC OpenAPI spec in the repo (for example `docs/cmc-openapi.yaml`), or `CMC_PRO_API_KEY` set for `npm run proof`. With any of these, the fix belongs in `holdersCall` (`lib/cmc.ts`) and `holdersPost` (`scripts/proof.mjs`). After that, clear the two `note` values in `CMC_ENDPOINTS`.

Round 8 of the live-site QA pass (2026-11-24). Finding (unchanged from rounds 4 to 7): `proof: POST /v1/dex/holders/list base Not run in this build: CoinMarketCap returned 400 ... body {"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}, reason: "Parameter error"`.

- Classification: external request-shape question, NOT fixed. A WebFetch subagent tried the keyless API reference, the documentation index and the openCMC GitHub org, and all three were denied for lack of WebFetch permission. The repo still has no OpenAPI spec (`docs/` holds only `SCREENSHOTS.md`) and there is no `@coinmarketcap/sdk` in `node_modules`. The research block given to this round lists holders/list only by name, with no body fields. Two bodies have been rejected already, so no third one was guessed.
- Exact failing request, unchanged: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` (after `{"tokenAddress":...,"platform":"base"}`), status **400**, `status.error_message` "Parameter error".
- No app code changed. The judge-visible surface is still calm and honest, and the proof line is still truthful. Closing this needs the same thing listed under round 7: WebFetch permission, a local `docs/cmc-openapi.yaml`, or `CMC_PRO_API_KEY` for `npm run proof`.

Round 9 of the live-site QA pass (2026-11-24). Finding (unchanged from rounds 4 to 8): `proof: POST /v1/dex/holders/list base Not run in this build: CoinMarketCap returned 400 ... body {"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}, reason: "Parameter error"`.

- Classification: external request-shape question, NOT fixed. A direct curl to the endpoint and to the openCMC GitHub API was denied, and so was a WebFetch subagent on the keyless API reference, the v1 docs, the openCMC org and the TS SDK README. `node_modules` has no `@coinmarketcap` package. No third body was guessed.
- Exact failing request, unchanged: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` (after `{"tokenAddress":...,"platform":"base"}`), status **400**, `status.error_message` "Parameter error".
- No app code changed. The judge-visible surface is still calm and the proof line is still truthful. Further offline rounds cannot change this. It needs one of the three inputs listed under round 7.

Round 10 of the live-site QA pass (2026-11-24). Finding (unchanged from rounds 4 to 9): `proof: POST /v1/dex/holders/list base Not run in this build: CoinMarketCap returned 400 ... body {"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}, reason: "Parameter error"`.

- Classification: external request-shape question, NOT fixed. This round tried again: a direct curl to the endpoint (with a `limit` paging field added) needed approval and did not run, a WebFetch subagent on the keyless API reference was denied, and there is still no `docs/*openapi*` file and no `node_modules/@coinmarketcap` package. The research block for this round names holders/list only in passing, with no body fields. No third body was guessed.
- Exact failing request, unchanged: `POST https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list`, `Content-Type: application/json`, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}` (after `{"tokenAddress":...,"platform":"base"}`), status **400**, `status.error_message` "Parameter error".
- No app code changed. The judge-visible surface is still calm and the proof line is still truthful. This is the tenth round with the same result. Closing it needs a human, or one of the three inputs listed under round 7 (WebFetch or curl permission for the QA agent, a local `docs/cmc-openapi.yaml`, or `CMC_PRO_API_KEY` for `npm run proof`).
