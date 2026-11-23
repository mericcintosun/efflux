# DELIVERY: Build with CMC API Hackathon (DoraHacks)

A human checklist for submission day. Nothing here is code. The deadline is 2026-12-09 23:59 UTC.

The three prizes below are slices of one judged ranking. There is no separate entry for each: one valid BUIDL is ranked once, and its place decides the prize. `watch:` names the DEMO.md step that carries the most judging weight ("Does it work", 30 points) and must work on the live URL.

## Top 3

- prize: Full year of CMC API access: Professional, Growth, and Startup (Top 3)
- entryMode: automatic
- action: none, ranked automatically from the judged score
- watch: 3

## Top 10

- prize: Exclusive CMC Plushie (Top 10)
- entryMode: automatic
- action: none, ranked automatically from the judged score
- watch: 3

## Top 30

- prize: Exclusive CMC Keyboard (Top 30)
- entryMode: automatic
- action: none, ranked automatically from the judged score
- watch: 3

## Also required for a valid entry

A missing item can make the entry invalid.

- [ ] Public GitHub repo: https://github.com/mericcintosun/efflux (private repos are rejected).
- [ ] Demo video link pasted into the DoraHacks form.
- [ ] An X post tagged **#BuildwithCMC** that links the DoraHacks submission and the demo video.
- [ ] The CoinMarketCap endpoint list: README "How it uses the CoinMarketCap API" table and `/notes`.
- [ ] Visible proof of a real call: the README `cmc-call` block (written by `npm run proof`) and the proof drawer on `/play` (DEMO.md step 6).
- [ ] The API note: README "What the API made possible and where it pushed back" and the same note on `/notes`.
- [ ] Exactly one track picked.

**Track to pick: Markets and Trading Tools.** This track name is unverified on the form itself. Confirm the exact wording in the DoraHacks "Ask Question" tab before submitting.

## Before submitting

- [ ] Verify the live URL in the form is the one in the README live demo link (https://efflux-eight.vercel.app) and that it loads in a private window.
- [ ] Confirm the CoinMarketCap account email matches the DoraHacks registration email.
- [ ] Confirm no key is in the repo: search the repo for `CMC_PRO_API_KEY=` with a value and for `X-CMC_PRO_API_KEY` outside `lib/cmc.ts`; the key lives in Vercel env only.
- [ ] Paste the X post URL into the form.
