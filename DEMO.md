# Efflux demo contract (90 seconds)

**Problem.** Your wallet shows $5,000, but what would a sale actually pay?

**Trigger.** A holder of a small DEX token on Base, BNB Chain or Solana wants to know what they can really take out before they press sell.

**Wow moment.** The "wallets selling ahead of you" slider goes from 0 to 10 and the amount a sale pays visibly falls from about $3,870 toward a few hundred dollars. The number is computed by `exitQuote()` in `lib/simulate.ts` over the seeded holder queue, not animated by hand.

**Demo start route:** `/`

## Steps

1. **`/` hero and 3D pool.** The headline says the wallet shows $5,000; the orbitable pool sits under it. Files: `app/page.tsx`, `components/pool-scene-frame.tsx`.
2. **`/` chapter "The quote".** Pools load into the sticky live panel and "A sale pays you" appears beside the wallet number; the curve shows how the payout bends. Files: `components/story-scroll.tsx`, `components/exit-stage.tsx`.
3. **`/` chapter "The queue".** Drag the whales slider from 0 to 10 and watch the payout melt. This is the wow moment. Files: `components/story-scroll.tsx`, `components/exit-stage.tsx`.
4. **`/` chapter "Hidden cuts".** Sell tax and the 24h LP drain switch on; the loss bar splits the gap into impact, tax, drain and queue. On the page this chapter sits before "The queue"; jump back to it with the chapter indicator. Files: `components/story-scroll.tsx`, `components/exit-stage.tsx`.
5. **`/play` free-form tool.** Pick a sample token, set the holding, move the queue, take a wallet out with "Will not sell". Files: `app/play/page.tsx`, `components/play-desk.tsx`.
6. **`/play` proof drawer.** Press "Show the CoinMarketCap calls" to see each request with its response. Files: `components/play-desk.tsx`, `app/api/exit/route.ts`.
7. **`/play` share link, then `/notes`.** Press "Copy a link to this result", open it in a new tab and the same result comes back. Finish on the method and endpoint list. Files: `components/play-desk.tsx`, `app/notes/page.tsx`.

**Closing line.** The number on screen is not yours. Efflux tells you how much of it is.

## Data modes

- `ADAPTER_MODE=fake` (the default when unset) serves the seed tokens in `lib/data/seed.ts` through `lib/adapter.ts`. No network calls. The proof drawer labels its entries as seed data.
- `ADAPTER_MODE=real` sends address lookups to CoinMarketCap through `lib/cmc.ts` (keyless public API, or the keyed host when `CMC_PRO_API_KEY` is set). Only this mode shows the green "Live" badge.

## Recording

Builder records the video.
