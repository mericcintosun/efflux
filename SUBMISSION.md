# SUBMISSION: DoraHacks form, Build with CMC API Hackathon

Paste-ready answers in the order of the BUIDL form. Character limits were not visible from the repo; where a field may be short, use the first sentence only. Fields only a person can fill (team members, age and eligibility, the X post URL) are in the HANDOFF.md manual checklist, not here.

## Project name

Efflux

## One-liner

What selling a small DEX token pays today, and what is left after the biggest wallets sell first.

## Description

Your wallet shows price times balance, not what a sale would pay. Efflux reads a token's real pools, largest holders, sell tax and 24 hour liquidity change from the CoinMarketCap DEX API and turns them into one number: "A sale pays you".

On the home page a 3D pool holds the token's liquidity, its largest holders stand in line beside it, and a slider lets the largest wallets sell before you. Drag it from 0 to 10 on the sample token and the payout falls from thousands of dollars to a few hundred while the pool drains in step. The simulator on `/play` takes any Base, BNB Chain or Solana address, splits the gap into price impact, sell tax, LP drain and the queue as a waterfall, and opens a proof drawer with every CoinMarketCap request and its raw response. A share link reopens the same result.

The math is pure TypeScript in `lib/simulate.ts` (virtual constant product reserves from `liqUsd`, sales split across pools, holders selling one after another) and is covered by Vitest. The default deploy uses the keyless public API, so no key lives in the repo or in Vercel.

## Track

Markets and Trading Tools

## GitHub repo

https://github.com/mericcintosun/efflux

## Demo or deploy URL

https://efflux-eight.vercel.app

## CoinMarketCap endpoints used

- GET `/public-api/v1/dex/token`: price, symbol, name, supply
- GET `/public-api/v1/dex/token/pools`: every pool, `liqUsd`, both token sides, DEX name
- POST `/public-api/v1/dex/holders/list`: largest holders, balances, tags (the queue)
- GET `/public-api/v1/dex/security/detail`: sell tax
- GET `/public-api/v1/dex/liquidity-change/list`: liquidity history, for the 24h LP change
- GET `/public-api/v1/dex/search`: token search by name (in `lib/cmc.ts`, planned for the search box)

## Real API call proof

Code (`lib/cmc.ts`, keyless path):

```ts
const res = await fetch("https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list", {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ tokenAddress, platform: "base" }),
});
```

Response: the README section "Captured by `npm run proof`" holds the real responses (status, first 600 characters) written by `scripts/proof.mjs`, and the proof drawer on `/play` ("Show the CoinMarketCap calls") shows each live request with its status, timing and raw JSON.

## What the API made possible and where it pushed back

Made possible: pools, holders, sell tax and liquidity history for three chains from one provider with no key, so the judged link runs on live data with zero secrets. Pushed back: pools carry `liqUsd` but no reserve field, so Efflux builds virtual reserves (half of `liqUsd` per side); the holders `percent` field does not state its unit, so Efflux computes share of supply itself; keyless limits are shared per IP, so every GET is cached for 60 seconds, the holders POST is memoized, every call has an 8 second timeout and one retry.

## #BuildwithCMC post (manual step)

Post on X with the tag #BuildwithCMC, linking the DoraHacks BUIDL page as the rules require, then copy the post URL into the form. This is done by hand after the BUIDL page exists.
