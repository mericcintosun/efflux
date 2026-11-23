import { describe, expect, it } from "vitest";
import { tokens } from "@/lib/data/seed";
import { cutsWaterfall, exitQuote } from "@/lib/simulate";

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

      // The /play cuts waterfall (components/cuts-waterfall.tsx): the four printed
      // cuts must add up to the printed gap between the wallet and the payout.
      describe("cuts waterfall", () => {
        const SWITCHES = [
          { applyTax: false, applyDrain: false },
          { applyTax: true, applyDrain: false },
          { applyTax: false, applyDrain: true },
          { applyTax: true, applyDrain: true },
        ];
        for (const ahead of [0, 10]) {
          for (const s of SWITCHES) {
            it(`sums the four cuts to the gap at ${ahead} wallets ahead, tax ${s.applyTax ? "on" : "off"}, drain ${s.applyDrain ? "on" : "off"}`, () => {
              const q = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: ahead, ...s });
              const w = cutsWaterfall(q);
              const cutUnits = w.cuts.reduce((sum, c) => sum + c.units, 0);

              // Model: the unrounded cuts add up to wallet minus payout.
              const b = q.breakdown;
              expect(b.impactUsd + b.taxUsd + b.drainUsd + b.queueUsd).toBeCloseTo(q.screenUsd - q.receiveUsd, 6);

              // Display: the rounded cuts add up to the rounded gap, exactly.
              expect(w.cuts.map((c) => c.key)).toEqual(["impact", "tax", "drain", "queue"]);
              expect(cutUnits).toBe(w.gapUnits);
              expect(w.gapUnits).toBe(w.screenUnits - w.receiveUnits);
              expect(w.cuts.reduce((sum, c) => sum + c.usd, 0)).toBeCloseTo(w.gapUsd, 9);
              for (const c of w.cuts) {
                expect(Number.isInteger(c.units)).toBe(true);
                expect(c.units).toBeGreaterThanOrEqual(0);
              }

              // A switch that is off removes nothing.
              if (!s.applyTax) expect(w.cuts[1].units).toBe(0);
              if (!s.applyDrain) expect(w.cuts[2].units).toBe(0);
              if (ahead === 0) expect(w.cuts[3].units).toBe(0);
            });
          }
        }

        it("repeat tomorrow lowers the payout when the LP shrank", () => {
          const off = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: 0, applyTax: true, applyDrain: false });
          const on = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: 0, applyTax: true, applyDrain: true });
          if (t.lpChange24hPct < 0) expect(on.receiveUsd).toBeLessThan(off.receiveUsd);
          else expect(on.receiveUsd).toBeCloseTo(off.receiveUsd, 9);
        });
      });

      it("never pays more than the wallet shows", () => {
        const q = exitQuote({ token: t, holdingUsd: HOLDING, walletsAhead: 0, applyTax: false, applyDrain: false });
        expect(q.receiveUsd).toBeLessThan(HOLDING);
        expect(q.receiveUsd).toBeGreaterThan(0);
      });
    });
  }
});
