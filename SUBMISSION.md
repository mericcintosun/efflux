# SUBMISSION: DoraHacks form, Build with CMC API Hackathon

Paste-ready answers in the order of the BUIDL form. Character limits were not visible from the repo; where a field may be short, use the first sentence only. Fields only a person can fill (team members, age and eligibility, the X post URL) are in the HANDOFF.md manual checklist, not here.

## Project name

Efflux

## One-liner

What selling a small DEX token pays today, and what is left after the biggest wallets sell first.

## Description

Your wallet shows price times balance, not what a sale would pay. On a real token, computed by `exitQuote()` over live CoinMarketCap data when `npm run proof` runs:

<!-- PROOF:BEGIN brett-exit -->
BRETT on Base, fetched 2026-11-24 11:05 UTC by `npm run proof`: wallet shows $5,000, a sale pays $4,953 now. Selling now keeps 99% of what your wallet shows.

Computed by `exitQuote()` in `lib/simulate.ts` with the sell tax on (0.0%) and LP drain off, over 20 live pools. The holder queue is not shown in this build: CoinMarketCap returned 400 (POST /v1/dex/holders/list, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}`), reason: "Parameter error".
<!-- PROOF:END brett-exit -->

Read 0 as today and 10 as the worst case; the queue slider is a stress test, not a forecast.

Efflux reads a token's real pools, largest holders, sell tax and 24 hour liquidity change from the CoinMarketCap DEX API and turns them into one number: "A sale pays you".

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
- GET `/public-api/v1/dex/search`: wrapper exists in `lib/cmc.ts`, not called at runtime yet

## Real API call proof

Code (`lib/cmc.ts`, keyless path):

```ts
const res = await fetch("https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list", {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ tokenAddress, platform: "base" }),
});
```

<!-- PROOF:BEGIN holders-sample -->
Not run in this build: CoinMarketCap returned 400 (POST /v1/dex/holders/list, body `{"address":"0x532f27101965dd16442E59d40670FaF5eBB142E4","platform":"base"}`), reason: "Parameter error".
<!-- PROOF:END holders-sample -->

Same request, live: https://efflux-eight.vercel.app/play?platform=base&address=0x532f27101965dd16442E59d40670FaF5eBB142E4 then Show the CoinMarketCap calls

## What the API made possible and where it pushed back

Made possible: price, pools and liquidity history for three chains from one provider with no key, so the judged link runs on live data with zero secrets. Holders and sell tax sit on the same keyless host, but as of 2026-11-24 our request shape for them gets 400 ("Parameter error"), so the queue and sell tax steps stay at zero and say so. Pushed back: pools carry `liqUsd` but no reserve field, so Efflux builds virtual reserves (half of `liqUsd` per side); the holders `percent` field does not state its unit, so Efflux computes share of supply itself; keyless limits are shared per IP, so every call has an 8 s timeout, one retry after 600 ms on 429, network error or timeout, and a 60 s cache (the Next data cache for GETs, an in-process memo for the holders POST).

## Known gaps

- When the liquidity-change call fails, the LP change reads 0% (`lib/cmc-parse.ts:133`), so "LP did not shrink" can show on a live token.
- Concentrated liquidity pools (Uniswap v3, CLMM, DLMM) are modeled as constant product, so the estimate leans cautious for them.
- GET `/v1/dex/search` is a wrapper in `lib/cmc.ts`; nothing calls it at runtime.
- The BNB Chain sample is the bundled MOSS seed unless `EFFLUX_DEMO_BSC_ADDRESS` is set (`lib/config.ts`, `DEMO_TOKENS.bsc`).

## #BuildwithCMC post (manual step)

Post on X with the tag #BuildwithCMC, linking the DoraHacks BUIDL page as the rules require, then copy the post URL into the form. This is done by hand after the BUIDL page exists.
