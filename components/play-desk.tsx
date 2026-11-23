"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExitStage, type ExitControls } from "@/components/exit-stage";
import { PLATFORM_LABEL, tokens, type Platform, type TokenSnapshot } from "@/lib/data";
import type { ApiProof, ExitBundle } from "@/lib/cmc";
import { NON_SELLER_TAGS, eligibleSellers, fmtCompactUsd, fmtTokens, shortAddress, totalLiquidityUsd } from "@/lib/simulate";
import { cn } from "@/lib/utils";

export interface PlayInitial {
  slug: string;
  holdingUsd: number;
  ahead: number;
  applyTax: boolean;
  applyDrain: boolean;
  platform?: Platform;
  address?: string;
}

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

const PLATFORMS: Platform[] = ["base", "bsc", "solana"];

export function PlayDesk({ initial }: { initial: PlayInitial }) {
  const [token, setToken] = useState<TokenSnapshot>(() => tokens.find((t) => t.slug === initial.slug) ?? tokens[0]);
  const [source, setSource] = useState<{ live: boolean; note: string }>({ live: false, note: "Bundled snapshot" });
  const [holdingUsd, setHoldingUsd] = useState(initial.holdingUsd);
  const [controls, setControls] = useState<ExitControls>({ ahead: initial.ahead, applyTax: initial.applyTax, applyDrain: initial.applyDrain });
  const [excluded, setExcluded] = useState<string[]>([]);
  const [platform, setPlatform] = useState<Platform>(initial.platform ?? "base");
  const [address, setAddress] = useState(initial.address ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [proof, setProof] = useState<ApiProof[]>([]);
  const [proofOpen, setProofOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadLive = useCallback(async (p: Platform, a: string) => {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch(`/api/exit?platform=${p}&address=${encodeURIComponent(a.trim())}`);
      const bundle = (await res.json()) as ExitBundle;
      setProof(bundle.proof ?? []);
      if (!bundle.token) {
        setStatus({ kind: "error", message: bundle.message });
        return;
      }
      setToken(bundle.token);
      setExcluded([]);
      setSource({
        live: bundle.source === "live",
        note: bundle.source === "live" ? `Live from CoinMarketCap, ${new Date(bundle.token.snapshotAt).toLocaleTimeString("en-US")}` : bundle.message,
      });
      setStatus({ kind: "idle" });
    } catch {
      setStatus({ kind: "error", message: "The request did not reach our server. Check your connection and try again." });
    }
  }, []);

  // A shared link with platform + address loads the live token on arrival.
  useEffect(() => {
    if (initial.platform && initial.address) void loadLive(initial.platform, initial.address);
  }, [initial.platform, initial.address, loadLive]);

  const sellers = useMemo(() => eligibleSellers(token, excluded), [token, excluded]);
  const ahead = Math.min(controls.ahead, sellers.length);

  const pickSample = (t: TokenSnapshot) => {
    setToken(t);
    setExcluded([]);
    setSource({ live: false, note: "Bundled snapshot" });
    setStatus({ kind: "idle" });
    setProof([]);
  };

  const toggleExcluded = (addr: string) =>
    setExcluded((list) => (list.includes(addr) ? list.filter((a) => a !== addr) : [...list, addr]));

  const copyLink = async () => {
    const params = new URLSearchParams({
      usd: String(holdingUsd),
      ahead: String(ahead),
      tax: controls.applyTax ? "1" : "0",
      drain: controls.applyDrain ? "1" : "0",
    });
    if (source.live) {
      params.set("platform", token.platform);
      params.set("address", token.address);
    } else {
      params.set("token", token.slug);
    }
    const url = `${window.location.origin}/play?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Pick a token</CardTitle>
          <CardDescription>Start from a sample, or paste a contract address and read it live from CoinMarketCap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {tokens.map((t) => (
              <Button key={t.slug} variant={!source.live && token.slug === t.slug ? "default" : "outline"} onClick={() => pickSample(t)}>
                {t.symbol} on {PLATFORM_LABEL[t.platform]}
              </Button>
            ))}
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (address.trim()) void loadLive(platform, address);
            }}
          >
            <div className="flex flex-wrap gap-2" role="group" aria-label="Chain">
              {PLATFORMS.map((p) => (
                <Button key={p} type="button" size="sm" variant={platform === p ? "secondary" : "ghost"} aria-pressed={platform === p} onClick={() => setPlatform(p)}>
                  {PLATFORM_LABEL[p]}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Token contract address"
                placeholder={platform === "solana" ? "Mint address" : "0x contract address"}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                spellCheck={false}
              />
              <Button type="submit" disabled={status.kind === "loading" || !address.trim()}>
                {status.kind === "loading" ? "Reading CoinMarketCap..." : "Read from CoinMarketCap"}
              </Button>
            </div>
          </form>
          {status.kind === "error" ? (
            <p role="alert" className="border-l-4 border-bad bg-background px-4 py-3 text-sm">
              {status.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section aria-label="Exit result" className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl md:text-3xl">
            {token.name} ({token.symbol})
          </h2>
          <Badge variant={source.live ? "ok" : "secondary"}>{source.live ? "Live" : "Snapshot"}</Badge>
          <span className="text-sm text-muted-foreground">
            {source.note}. {token.pools.length} pools, {fmtCompactUsd(totalLiquidityUsd(token))} liquidity.
          </span>
        </div>
        <label className="block max-w-xs space-y-2 text-sm font-semibold">
          <span>What your wallet shows, in USD</span>
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            step={50}
            value={holdingUsd}
            onChange={(e) => setHoldingUsd(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <div className={cn("transition-opacity", status.kind === "loading" && "opacity-50")}>
          <ExitStage
            token={token}
            holdingUsd={holdingUsd}
            excluded={excluded}
            {...controls}
            ahead={ahead}
            onChange={(next) => setControls((c) => ({ ...c, ...next }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyLink}>
            {copied ? "Link copied" : "Copy a link to this result"}
          </Button>
          <Button variant="ghost" aria-expanded={proofOpen} onClick={() => setProofOpen((o) => !o)}>
            {proofOpen ? "Hide the CoinMarketCap calls" : "Show the CoinMarketCap calls"}
          </Button>
        </div>
        {proofOpen ? <ProofDrawer proof={proof} live={source.live} /> : null}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>The queue ahead of you</CardTitle>
          <CardDescription>
            Largest holders first. Pools, burn addresses, exchanges, bridges and lockers never sell, so they sit out. Click a wallet to
            take it out of the queue if you know it will hold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token.holders.length === 0 ? (
            <p className="bg-background px-4 py-6 text-sm">CoinMarketCap returned no holders for this token, so nobody sells ahead of you.</p>
          ) : (
            <ol className="divide-y divide-border bg-background">
              {[...token.holders]
                .sort((a, b) => b.balance - a.balance)
                .map((h) => {
                  const sitsOut = h.tags.some((t) => NON_SELLER_TAGS.has(t));
                  const rank = sellers.findIndex((s) => s.address === h.address);
                  const isOut = excluded.includes(h.address);
                  const sellsFirst = rank >= 0 && rank < ahead;
                  return (
                    <li key={h.address} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 text-sm", sellsFirst && "bg-deep")}>
                      <span className="w-6 font-display tabular-nums">{rank >= 0 ? rank + 1 : ""}</span>
                      <span className="min-w-[9rem] font-semibold">{h.label ?? shortAddress(h.address)}</span>
                      <span className="tabular-nums">{fmtTokens(h.balance)} {token.symbol}</span>
                      <span className="tabular-nums text-muted-foreground">{((h.balance / Math.max(token.supply, 1)) * 100).toFixed(1)}% of supply</span>
                      <span className="flex gap-1">
                        {h.tags.map((t) => (
                          <Badge key={t} variant="outline">
                            {t}
                          </Badge>
                        ))}
                        {sellsFirst ? <Badge>sells before you</Badge> : null}
                      </span>
                      {!sitsOut ? (
                        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toggleExcluded(h.address)}>
                          {isOut ? "Put back in the queue" : "Will not sell"}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProofDrawer({ proof, live }: { proof: ApiProof[]; live: boolean }) {
  if (proof.length === 0) {
    return (
      <div className="bg-surface px-6 py-6 text-sm">
        You are looking at a bundled snapshot, so no request has been made yet. Paste any token address above and every CoinMarketCap
        call behind the result shows up here, with its raw response.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm">
        {live ? "These are the requests behind the numbers above." : "These requests ran, but the data was not usable, so the snapshot is shown."} No
        API key was sent unless the server has one configured.
      </p>
      {proof.map((p, i) => (
        <details key={`${p.endpoint}-${i}`} className="bg-surface" open={i === 0}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-sm font-semibold">
            <Badge variant={p.status >= 200 && p.status < 300 ? "ok" : p.status === 429 ? "warn" : "destructive"}>{p.status || "ERR"}</Badge>
            <span>
              {p.method} {p.endpoint}
            </span>
            <span className="font-normal text-muted-foreground">
              {p.ms} ms, {p.keyed ? "keyed" : "keyless"}
            </span>
          </summary>
          <div className="space-y-2 px-4 pb-4 text-xs">
            <p className="break-all">{p.url}</p>
            {p.body ? <p className="break-all">Body: {JSON.stringify(p.body)}</p> : null}
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all bg-background p-3 font-sans">{p.excerpt}</pre>
          </div>
        </details>
      ))}
    </div>
  );
}
