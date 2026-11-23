import { describe, expect, it } from "vitest";
import { tokens } from "@/lib/data/seed";
import { exitQuote } from "@/lib/simulate";

const HOLDING = 5000;
const QUEUES = [0, 5, 10];

const round = (v: number) => Math.round(v * 100) / 100;

describe("exitQuote over the fixed seed tokens", () => {
  it("has three non-empty seed tokens", () => {
    expect(tokens).toHaveLength(3);
    for (const t of tokens) {
      expect(t.pools.length).toBeGreaterThan(0);
      expect(t.holders.length).toBeGreaterThan(0);
    }
  });

  for (const t of tokens) {
    describe(t.symbol, () => {
      it("matches the pinned output for queue sizes 0, 5 and 10", () => {
        const pinned = QUEUES.map((ahead) => {
          const q = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: ahead, applyTax: true, applyDrain: true });
          return {
            ahead: q.walletsAhead,
            receiveUsd: round(q.receiveUsd),
            impactUsd: round(q.breakdown.impactUsd),
            taxUsd: round(q.breakdown.taxUsd),
            drainUsd: round(q.breakdown.drainUsd),
            queueUsd: round(q.breakdown.queueUsd),
          };
        });
        expect(pinned).toMatchSnapshot();
      });

      it("pays less or the same as more wallets sell ahead", () => {
        const paid = Array.from({ length: 11 }, (_, k) =>
          exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: k, applyTax: true, applyDrain: true }).receiveUsd
        );
        for (let k = 1; k < paid.length; k++) expect(paid[k]).toBeLessThanOrEqual(paid[k - 1] + 1e-9);
      });

      it("splits the gap exactly into impact, tax, drain and queue", () => {
        for (const ahead of QUEUES) {
          const q = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: ahead, applyTax: true, applyDrain: true });
          const b = q.breakdown;
          expect(b.impactUsd + b.taxUsd + b.drainUsd + b.queueUsd).toBeCloseTo(q.screenUsd - q.receiveUsd, 6);
        }
      });

      it("never pays more than the wallet shows", () => {
        const q = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: 0, applyTax: false, applyDrain: false });
        expect(q.receiveUsd).toBeLessThan(HOLDING);
        expect(q.receiveUsd).toBeGreaterThan(0);
      });
    });
  }
});
