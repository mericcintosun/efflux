"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SceneSlot } from "@/components/scene-slot";
import { DEFAULT_HOLDING_USD, PLATFORM_LABEL } from "@/lib/data";
import type { TokenSnapshot } from "@/lib/types";
import { exitQuote, fmtCompactUsd, fmtUsd, totalLiquidityUsd } from "@/lib/simulate";
import type { ScenePalette } from "@/components/pool-scene";

function PoolPoster() {
  return (
    <SceneSlot
      n={1}
      alt="A tall glass liquidity pool half full of magenta liquid, with ten dark blocks of decreasing size queued at its edge and one small magenta block waiting last"
      width={960}
      height={640}
      className="h-full w-full object-contain"
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
 * Signature interaction 1 (kit K6): the token's pool as one orbitable 3D object.
 * Clicking it lets the next-largest real holder from the seed sell into the pool;
 * the liquid level and the caption below come from lib/simulate.ts.
 */
export function PoolSceneFrame({ token }: { token: TokenSnapshot }) {
  const [sold, setSold] = useState(0);
  const [palette, setPalette] = useState<ScenePalette | null>(null);
  const [webgl, setWebgl] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setPalette(readPalette());
    setWebgl(hasWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const q = useMemo(
    () => exitQuote({ token, holdingUsd: DEFAULT_HOLDING_USD, walletsAhead: sold, applyTax: true, applyDrain: false }),
    [token, sold]
  );
  const biggest = q.sellers[0]?.balance ?? 1;
  const bags = q.sellers.map((h) => h.balance / biggest);
  const yourBag = Math.min(1, DEFAULT_HOLDING_USD / token.priceUsd / biggest);
  const max = q.sellers.length;
  const pour = () => setSold((s) => (s >= max ? 0 : s + 1));

  return (
    <figure>
      <div className="relative aspect-[3/2] w-full bg-surface md:aspect-[16/7]">
        {palette && webgl ? (
          <SceneBoundary fallback={<PoolPoster />}>
            <PoolScene level={q.quoteLeftFrac} bags={bags} sold={sold} yourBag={yourBag} palette={palette} reduced={reduced} onPour={pour} />
          </SceneBoundary>
        ) : (
          <PoolPoster />
        )}
      </div>
      <figcaption className="mt-5 flex flex-col items-start gap-4">
        <p className="max-w-[62ch] text-base">
          {token.name} ({token.symbol}) on {PLATFORM_LABEL[token.platform]}: {token.pools.length} pools, {fmtCompactUsd(totalLiquidityUsd(token))} of
          liquidity.{" "}
          {sold === 0 ? (
            <>Nobody has sold yet, so a {fmtUsd(DEFAULT_HOLDING_USD)} exit pays {fmtUsd(q.receiveUsd)}.</>
          ) : (
            <>
              {sold} of the largest wallets sold first. The pool kept {Math.round(q.quoteLeftFrac * 100)}% of its dollars, and
              your {fmtUsd(DEFAULT_HOLDING_USD)} now pays {fmtUsd(q.receiveUsd)}.
            </>
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={pour} disabled={max === 0}>
            {sold >= max ? "Refill the pool" : "Let the next wallet sell"}
          </Button>
          {sold > 0 && sold < max ? (
            <Button variant="ghost" onClick={() => setSold(0)}>
              Reset
            </Button>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}
