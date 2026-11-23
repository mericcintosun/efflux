# Efflux demo contract (90 seconds, 8 steps)

**Problem.** Your wallet shows $5,000, but what would a sale actually pay?

**Trigger.** A holder of a small DEX token on Base, BNB Chain or Solana wants to know what they can really take out before they press sell.

**Wow moment (step 4).** The "wallets selling ahead of you" slider goes from 0 to 10 and the amount a sale pays visibly falls from about $3,870 toward a few hundred dollars. The number is computed by `exitQuote()` in `lib/simulate.ts` over the seeded holder queue, not animated by hand.

**Demo start route:** `/`

## Steps

1. **`/` hero and 3D pool.** The headline says the wallet shows $5,000. Under it, in the first viewport, the source note reads "Live from CoinMarketCap, BRETT on Base, fetched HH:MM UTC" (the bundle's own fetch time), or "Bundled snapshot, CoinMarketCap was unavailable for some tokens" on a fallback. The orbitable pool sits below. Files: `app/page.tsx`, `components/pool-scene-frame.tsx`.
2. **`/` chapter "The quote".** Pools load into the sticky live panel and "A sale pays you" appears beside the wallet number; the curve shows how the payout bends. Files: `components/story-scroll.tsx`, `components/exit-stage.tsx`.
3. **`/` chapter "Hidden cuts".** Sell tax and the 24h LP drain switch on; the loss bar splits the gap into impact, tax, drain and queue. Files: `components/story-scroll.tsx`, `components/exit-stage.tsx`.
4. **`/` chapter "The queue".** Drag the whales slider from 0 to 10 and watch the payout melt. This is the wow moment (step 4). Files: `components/story-scroll.tsx`, `components/exit-stage.tsx`.
5. **`/play` free-form tool.** Pick a sample token, set the holding, move the queue, take a wallet out with "Will not sell". Files: `app/play/page.tsx`, `components/play-desk.tsx`.
6. **`/play` proof drawer.** Press "Show the CoinMarketCap calls" to see each request with its response. Files: `components/play-desk.tsx`, `app/api/exit/route.ts`.
7. **`/play` cuts waterfall.** Below "A sale pays you" on `/play`, the hidden cuts are a waterfall: "Wallet shows", then price impact, sell tax, 24h LP drain and the queue as four separate dollar rows, then "A sale pays you". Expected: the wallet row, the four cuts and the payout row; the line under them shows the four cuts adding up to the gap. Toggling "Assume tomorrow repeats the last 24 hours (LP moved -14.1%)" (the LP change rounded to one decimal by `fmtPctValue` in `lib/simulate.ts`) fills the LP drain row and lowers the payout. Files: `components/exit-stage.tsx`, `components/cuts-waterfall.tsx`, `components/play-desk.tsx`.
8. **`/play` share link, then `/notes`.** Press "Copy a link to this result", open it in a new tab and the same result comes back. Finish on the method and endpoint list. Files: `components/play-desk.tsx`, `app/notes/page.tsx`.

**Closing line.** The number on screen is not yours. Efflux tells you how much of it is.

## Data modes

- `ADAPTER_MODE=fake` (the default when unset) serves the seed tokens in `lib/data/seed.ts` through `lib/adapter.ts`. No network calls. The proof drawer labels its entries as seed data.
- `ADAPTER_MODE=real` loads the demo tokens (`DEMO_TOKENS` in `lib/config.ts`: BRETT on Base and BONK on Solana by default, BSC only when `EFFLUX_DEMO_BSC_ADDRESS` is set) live from CoinMarketCap through `lib/cmc.ts`, so steps 2 and 3 run `exitQuote()` over real pools and holders. Address lookups on `/play` go live too (keyless public API, or the keyed host when `CMC_PRO_API_KEY` is set). A token that fails to load falls back to its seed token.
- The source note (under the hero on `/`, beside the token name on `/play`) reads "Live from CoinMarketCap" (green, plus the token, chain and fetch time on `/`), "Seed data, not a live response" (fake mode) or "Bundled snapshot, CoinMarketCap was unavailable for some tokens" (real mode with a fallback).
