# Efflux

**What would selling your small DEX token pay today, and what is left if the biggest wallets sell before you?** Efflux answers both with live CoinMarketCap DEX data, on one screen.

> Live demo: https://efflux-eight.vercel.app

## The problem

People holding small tokens on Base, BNB Chain and Solana see a "value" in their wallet. That number is price times balance. It says nothing about how much money is actually sitting in the pools.

Take a pool with $300,000 of liquidity. A $20,000 sale into it loses about 12% to price impact alone. Add a 5% sell tax and the liquidity that left in the last 24 hours, and the loss roughly doubles. The worst part is the order: if the top 10 wallets hold half the supply and they sell first, the pool the small holder sells into is close to empty.

Swap interfaces quote one trade at one moment. None of the ones we tried shows the queue.

## The solution

Paste a token, enter what your wallet shows, and Efflux tells you:

- what a sale pays right now, and the gap to the wallet number
- how much of that gap is price impact, sell tax and LP drain
- what is left after the largest holders sell ahead of you, with a slider from 0 to 10 wallets

How the number is built (all in `lib/simulate.ts`, pure functions, no I/O):

1. Every pool from `/v1/dex/token/pools` becomes a virtual constant product pool. CMC gives `liqUsd` for both sides together, so each side is half: `y = liqUsd / 2` dollars and `x = y / price` tokens.
2. A sale is split across pools in proportion to their token reserve. The deepest pool takes the biggest slice and all pools end at the same price.
3. The holder list from `POST /v1/dex/holders/list` is cleaned (pool addresses, burn, exchange, bridge and locker wallets never sell), sorted by balance, and the top N sell one after another. Reserves update after every sale. Your order goes last.
4. Sell tax from `/v1/dex/security/detail` is taken off every seller's tokens. The "repeat tomorrow" switch shrinks every pool by the share of liquidity that left in the last 24 hours, read from `/v1/dex/liquidity-change/list`.

The four losses are computed as successive scenarios, so impact + tax + drain + queue adds up exactly to "wallet shows" minus "you receive".

Concentrated liquidity pools (Uniswap v3, Raydium CLMM, Meteora DLMM, Orca) are modeled as constant product too. That understates their depth near the price, so the loss leans high for them, and the UI says so.

## How it uses the CoinMarketCap API

Every call runs server-side in `lib/cmc.ts`, behind the route `GET /api/exit?platform=base&address=0x...`. By default it uses the **keyless public API**, so the deployed site works on live data with no key in the repo or in Vercel.

| Method | Endpoint | What Efflux takes from it |
| --- | --- | --- |
| GET | `/public-api/v1/dex/token` | price, symbol, name, supply |
| GET | `/public-api/v1/dex/token/pools` | every pool, `liqUsd`, both token sides, DEX name (virtual reserves) |
| POST | `/public-api/v1/dex/holders/list` | largest holders, balances, tags (the queue) |
| GET | `/public-api/v1/dex/security/detail` | sell tax |
| GET | `/public-api/v1/dex/liquidity-change/list` | liquidity history, for the 24h LP change |
| GET | `/public-api/v1/dex/search` | token search by name (planned for the search box) |

### A real call, code and response

This is the holders request exactly as `lib/cmc.ts` sends it on the keyless path:

```ts
const res = await fetch("https://pro-api.coinmarketcap.com/public-api/v1/dex/holders/list", {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ tokenAddress, platform: "base" }),
});
```

Every request is recorded with method, URL, body, status, latency and the first 2,400 characters of the raw response. On `/play`, load any token address and press **Show the CoinMarketCap calls** to see them. The screenshot of that drawer is our proof of a live call in the submission.

### What the API made possible, and where it pushed back

- **Made possible:** pools, holders, sell tax and liquidity history for three chains from one provider, with no key. That is why the judged link runs on live data and keeps working after the hackathon tier expires.
- **Pushed back:** pools give `liqUsd` but no raw reserves, so reserves are reconstructed from price. Some short fields (`a0`, `a1`, `tu` in the liquidity change list) are not described in the schema, and we could not confirm whether holder `percent` is a fraction or a percent. The keyless tier shares one rate limit per IP, so GET responses are cached for 60 seconds and HTTP 429 triggers exponential backoff (400 ms, 800 ms, 1.6 s).

Optional: set `CMC_PRO_API_KEY` in Vercel and the same paths go to the keyed host. The key travels as a header and never appears in the proof drawer.

## Tech stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4
- CoinMarketCap DEX API, keyless public endpoints
- React Three Fiber (`three`, `@react-three/fiber`, `@react-three/drei`) for the interactive pool on the home page
- Route Handler proxy with 60 s cache and 429 backoff
- Deployed on Vercel

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are required. `.env.example` lists every key.

### Data modes

Pages and API routes read tokens through one adapter (`lib/adapter.ts`). With `ADAPTER_MODE=fake`, the default, they serve the seed tokens in `lib/data/seed.ts` and make no network calls. With `ADAPTER_MODE=real`, address lookups go to the CoinMarketCap DEX API through `lib/cmc.ts`. `npm run seed` writes the seed tokens to `fixtures/seed.json`, and two runs give the same file.

Routes:

- `/` the story: four chapters drive one live exit panel, from a clean quote to the whale queue
- `/play` the simulator: sample tokens, paste any address, share a link to the result
- `/notes` method, endpoint list, a real call and the API notes

## What we would build next

- Token search by name through `/v1/dex/search`, so nobody has to paste an address
- A real concentrated liquidity model for v3 and CLMM pools using tick data
- Vitest cases for `lib/simulate.ts` against known Uniswap v2 swaps
- An alert when the queue ahead of a position gets thinner than a set dollar amount

## AI use

> Adjust this section to each hackathon's disclosure rules.

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.

Efflux shows estimates, not financial advice.
