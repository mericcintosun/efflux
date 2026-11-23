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

Every request is recorded with method, URL, body, status, latency and the first 2,400 characters of the raw response. On `/play`, load any token address and press **Show the CoinMarketCap calls** to see them.

#### Captured by `npm run proof`

`scripts/proof.mjs` makes real keyless calls for the demo tokens and rewrites the two blocks below. When CoinMarketCap cannot be reached, it says so in one line instead of showing a response.

<!-- PROOF:BEGIN cmc-call -->
Captured by `npm run proof` at 2026-11-23T20:11:26.705Z, keyless host, no key header sent. First 600 characters of each response.

**GET /public-api/v1/dex/token/pools (base, `0x532f27101965dd16442E59d40670FaF5eBB142E4`)**: status 200, 558 ms

```json
{"data":[{"addr":"0xba3f945812a83471d709bce9c3ca699a19fb46f7","v24":"5302.759432650673254781","pubAt":"1709041137000","t0":{"addr":"0x4200000000000000000000000000000000000006","lg":"https://s2.coinmarketcap.com/static/img/coins/64x64/2396.png","n":"Wrapped Ether","sym":"WETH","liq":"300.614478874713471174","liqUsd":"521037.725358045915538707"},"t1":{"addr":"0x532f27101965dd16442e59d40670faf5ebb142e4","lg":"https://s2.coinmarketcap.com/static/img/coins/64x64/29743.png","n":"Brett","sym":"BRETT","liq":"87631596.092317424700355678","liqUsd":"279876.27033868426492202"},"bidx":1,"exid":7791,"exn":"
```

**GET /public-api/v1/dex/token/pools (solana, `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`)**: status 200, 404 ms

```json
{"data":[{"addr":"5zpyutJu9ee6jFymDGoK7F6S5Kczqtc9FomP3ueKuyA9","v24":"239253.060132060062552223","pubAt":"1726946017000","t0":{"addr":"DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263","lg":"https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png","n":"Bonk","sym":"Bonk","liq":"71763008643.83857","liqUsd":"155962.609546829098753963"},"t1":{"addr":"So11111111111111111111111111111111111111112","lg":"https://dex-static.sintral.io/token-logo/16/So11111111111111111111111111111111111111112/1766048405124.jpeg","n":"Wrapped SOL","sym":"wSOL","liq":"818.528011197","liqUsd":"59741.584477047090424291"
```

- Not run in this build: CoinMarketCap returned 400 (POST /v1/dex/holders/list).
<!-- PROOF:END cmc-call -->

Field names seen in those responses, checked against the parser candidates:

<!-- PROOF:BEGIN cmc-fields -->
Keys seen in the real responses, checked against the candidate keys in `lib/cmc-parse.ts`.

- GET /public-api/v1/dex/token/pools (base, `0x532f27101965dd16442E59d40670FaF5eBB142E4`): top-level keys `data, status`; first item keys `addr, v24, pubAt, t0, t1, bidx, exid, exn, liqUsd, fa, top, mi`
  - liquidity: found `liqUsd`
  - address: found `addr`
  - dex: found `exn`
  - version: none of `v, version, poolType, type`
  - fee: none of `feeRate, fee`
  - sides: found `t0, t1`
- GET /public-api/v1/dex/token/pools (solana, `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`): top-level keys `data, status`; first item keys `addr, v24, pubAt, t0, t1, bidx, exid, exn, liqUsd, fa, top, mi`
  - liquidity: found `liqUsd`
  - address: found `addr`
  - dex: found `exn`
  - version: none of `v, version, poolType, type`
  - fee: none of `feeRate, fee`
  - sides: found `t0, t1`
- Not run in this build: CoinMarketCap returned 400 (POST /v1/dex/holders/list).
<!-- PROOF:END cmc-fields -->

### What the API made possible, and where it pushed back

- **Made possible:** pools, holders, sell tax and liquidity history for three chains from one provider, with no key. That is why the judged link runs on live data and keeps working after the hackathon tier expires.
- **Pushed back:** pools give `liqUsd` but no raw reserves, so reserves are reconstructed from price. Some short fields (`a0`, `a1`, `tu` in the liquidity change list) are not described in the schema, and we could not confirm whether holder `percent` is a fraction or a percent. The keyless tier shares one rate limit per IP, so responses are cached for 60 seconds, every call is aborted after 8 seconds, and HTTP 429 or a timeout gets exactly one retry.

Optional: set `CMC_PRO_API_KEY` in Vercel and the same paths go to the keyed host. The key travels as a header and never appears in the proof drawer or the logs.

## Tech stack

Exactly what `package.json` installs:

- Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4
- `three`, `@react-three/fiber`, `@react-three/drei` for the interactive pool on the home page
- `zod` for input validation on every API route (`lib/schemas.ts`)
- `vitest` for the tests
- CoinMarketCap DEX API, keyless public endpoints, through a Route Handler proxy with a 60 s cache, an 8 s timeout and one retry
- Deployed on Vercel

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are required. `.env.example` lists every key; `lib/config.ts` is the only file that reads them (plus `ADAPTER_MODE` in `lib/adapter.ts`).

### Data modes

Pages and API routes read tokens through one adapter (`lib/adapter.ts`). With `ADAPTER_MODE=fake`, the default, they serve the seed tokens in `lib/data/seed.ts` and make no network calls. With `ADAPTER_MODE=real`, the demo tokens (BRETT on Base and BONK on Solana by default, overridable with `EFFLUX_DEMO_*_ADDRESS`) and every pasted address load live from the CoinMarketCap DEX API through `lib/cmc.ts`. A demo token that fails to load falls back to its seed token, and the page says "Bundled snapshot" instead of "Live from CoinMarketCap". `npm run seed` writes the seed tokens to `fixtures/seed.json`, and two runs give the same file.

API errors come back as `{ "error": "<code>", "hint": "<sentence>" }` with codes from `lib/errors.ts` (`invalid_input` 400, `not_found` 404, `parse_failure` 422, `upstream_error` 502, `upstream_timeout` 504).

### Tests

```bash
npm test        # vitest: exit math snapshot over the seed tokens, CMC parsers, input schemas
npm run proof   # real keyless CoinMarketCap calls, written into the proof blocks above
```

The parser fixtures in `fixtures/cmc/` are hand-written to the OpenAPI field names, not captured responses; each one says so in its `_note` key.

Routes:

- `/` the story: four chapters drive one live exit panel, from a clean quote to the whale queue
- `/play` the simulator: sample tokens, paste any address, share a link to the result
- `/notes` method, endpoint list, a real call and the API notes

## What we would build next

- Token search by name through `/v1/dex/search`, so nobody has to paste an address
- A real concentrated liquidity model for v3 and CLMM pools using tick data
- Vitest cases for `lib/simulate.ts` against known Uniswap v2 swaps (today the tests pin our own output)
- An alert when the queue ahead of a position gets thinner than a set dollar amount

## AI use

> Adjust this section to each hackathon's disclosure rules.

We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.

Efflux shows estimates, not financial advice.
