# Security

Efflux is a read-only web app. It reads public market data from CoinMarketCap and does arithmetic on it. It never touches a wallet or funds.

## 1. Contract addresses and chain id

None. The app deploys no contract and holds no funds. Token addresses typed into `/play` are only passed to CoinMarketCap as lookup keys.

## 2. Wallet permissions

None requested. No wallet connection exists: there is no connect button, no injected provider access and no signing request anywhere in the code.

## 3. Approvals and spenders

None. Efflux sends no transaction, so it never asks for a token approval and names no spender.

## 4. Source repo

https://github.com/mericcintosun/efflux

## Data and keys

- Only public CoinMarketCap market data is read: DEX pools, holders, sell tax and liquidity changes. Every call runs on the server (`lib/cmc.ts`); the browser only talks to our own `/api/exit` route.
- The optional `CMC_PRO_API_KEY` lives in the server environment (Vercel project settings) and is read only by `getCmcKey()` in `lib/config.ts`. It is sent as a request header, never logged, never put in a proof drawer entry and never committed. The default deploy uses the keyless public API and has no key at all.
- There is no user account, no database and no stored data. The share link carries every control in its URL.
- Every response carries `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` and a `Permissions-Policy` that turns off camera, microphone, geolocation and payment (`next.config.ts`).

## Reporting

Open an issue on the repo above. Please do not include a working API key in the report.
