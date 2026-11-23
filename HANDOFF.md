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
- `lib/cmc.ts`: **real CoinMarketCap integration**. `loadExitBundle(platform, address)` calls five DEX endpoints on the keyless host (or the keyed host when `CMC_PRO_API_KEY` is set), retries 429 with backoff, caches GETs 60 s, records every call as `ApiProof`. Field pickers are defensive because some fields are undocumented.
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
- Unverified: the field pickers (`parsePools`, `parseHolders`, `parseSellTaxPct`, `parseLpChangePct`) and `PLATFORM_PARAM` in `lib/cmc.ts` are educated guesses from the OpenAPI schema. Marked with TODOs.

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

## 5. Definition of done

- Deployed at https://efflux.vercel.app on live keyless CMC data, all three demo tokens loading on the live URL.
- README live demo link correct, endpoint table and real call proof present, proof drawer screenshot added.
- The 90-second flow above runs end to end, seed data and live data both.
- Wow moment rehearsed: the queue slider drag reads on camera without explanation.
- DoraHacks BUIDL submitted with video, repo, track and the #BuildwithCMC post URL before 2026-12-09 23:59 UTC.
