"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SceneSlot } from "@/components/scene-slot";
import { DEFAULT_HOLDING_USD, PLATFORM_LABEL } from "@/lib/data";
import type { TokenSnapshot } from "@/lib/types";
import { exitQuote, fmtCompactUsd, fmtUsd, totalLiquidityUsd } from "@/lib/simulate";
import type { ExitControls } from "@/components/exit-stage";
import type { PoolView, ScenePalette } from "@/components/pool-scene";

function PoolPoster() {
  return (
    <SceneSlot
      n={1}
      alt="A tall glass liquidity pool half full of magenta liquid, with ten dark blocks of decreasing size queued at its edge and one small magenta block waiting last"
      width={960}
      height={640}
      className="h-full w-full object-contain mix-blend-multiply"
    />
  );
}

const PoolScene = dynamic(() => import("@/components/pool-scene"), { ssr: false, loading: () => <PoolPoster /> });

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function readPalette(): ScenePalette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { ground: v("--ground"), surface: v("--surface"), deep: v("--deep"), line: v("--line"), ink: v("--ink"), magenta: v("--magenta") };
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Kit K6 on the home route.
 * Signature 1: the token's pool as one orbitable 3D object; clicking it (or "Let
 * the next wallet sell") lets the next-largest real holder sell into the pool.
 * Signature 2: it has no state of its own. The story's controls (ahead, tax,
 * drain) come in as props, the same ones the sticky ExitStage slider writes, and
 * the liquid, the tax and drain layers and the sold blocks come from the same
 * exitQuote() inputs the panel uses.
 * Signature 3: `view` (from the active chapter) moves the camera.
 */
export function PoolSceneFrame({
  token,
  controls,
  onChange,
  view = "front",
}: {
  token: TokenSnapshot;
  controls: ExitControls;
  onChange: (next: Partial<ExitControls>) => void;
  view?: PoolView;
}) {
  const [palette, setPalette] = useState<ScenePalette | null>(null);
  const [webgl, setWebgl] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    setPalette(readPalette());
    setWebgl(hasWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMotion = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onMotion);
    return () => mq.removeEventListener("change", onMotion);
  }, []);

  // Same inputs as the sticky ExitStage, so the pool and the panel show one result.
  const q = useMemo(
    () =>
      exitQuote({
        token,
        holdingUsd: DEFAULT_HOLDING_USD,
        walletsAhead: controls.ahead,
        applyTax: controls.applyTax,
        applyDrain: controls.applyDrain,
      }),
    [token, controls.ahead, controls.applyTax, controls.applyDrain]
  );
  const screen = Math.max(q.screenUsd, 1);
  const biggest = q.sellers[0]?.balance ?? 1;
  const bags = q.sellers.map((h) => h.balance / biggest);
  const yourBag = Math.min(1, DEFAULT_HOLDING_USD / Math.max(token.priceUsd, 1e-12) / biggest);
  const max = q.sellers.length;
  const sold = q.walletsAhead;
  const pour = () => onChange({ ahead: controls.ahead >= max ? 0 : controls.ahead + 1 });
  const layered = q.breakdown.taxUsd >= 0.5 || q.breakdown.drainUsd >= 0.5;

  return (
    <figure>
      <div className="relative aspect-[3/2] w-full bg-surface lg:aspect-[2/1]">
        {palette && webgl ? (
          <SceneBoundary fallback={<PoolPoster />}>
            <PoolScene
              payout={q.receiveUsd / screen}
              taxCut={q.breakdown.taxUsd / screen}
              drainCut={q.breakdown.drainUsd / screen}
              bags={bags}
              sold={sold}
              yourBag={yourBag}
              palette={palette}
              reduced={reduced}
              view={view}
              resetKey={resetKey}
              onPour={pour}
            />
          </SceneBoundary>
        ) : (
          <PoolPoster />
        )}
      </div>
      <figcaption className="mt-4 flex flex-col items-start gap-3">
        <p className="max-w-[62ch] text-sm sm:text-base">
          {token.name} ({token.symbol}) on {PLATFORM_LABEL[token.platform]}: {token.pools.length} pools, {fmtCompactUsd(totalLiquidityUsd(token))} of
          liquidity.{" "}
          {sold === 0 ? (
            <>Nobody sells ahead of you, so a {fmtUsd(DEFAULT_HOLDING_USD)} exit pays {fmtUsd(q.receiveUsd)}.</>
          ) : (
            <>
              {sold} of the largest wallets sold first, and your {fmtUsd(DEFAULT_HOLDING_USD)} now pays {fmtUsd(q.receiveUsd)}.
            </>
          )}{" "}
          {layered ? <>Magenta is what arrives; the ink layer is the sell tax and the grey layer the LP drain.</> : null}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" className="min-h-11" onClick={pour} disabled={max === 0}>
            {max === 0 ? "No wallet queued to sell" : sold >= max ? "Refill the pool" : "Let the next wallet sell"}
          </Button>
          {palette && webgl ? (
            <Button variant="ghost" className="min-h-11" onClick={() => setResetKey((k) => k + 1)}>
              Reset view
            </Button>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}
