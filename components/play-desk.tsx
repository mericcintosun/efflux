"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExitStage, type ExitControls } from "@/components/exit-stage";
import { PLATFORM_LABEL, SOURCE_LABEL } from "@/lib/data";
import { isErrorBody, type ErrorCode } from "@/lib/errors";
import type { ApiEnvelope, ApiProof, DataSource, Platform, TokenSnapshot } from "@/lib/types";
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

type SourceState = { kind: DataSource; note: string; sample: boolean };

function sampleSource(source: DataSource): SourceState {
  return { kind: source, note: "Sample token", sample: true };
}

/** UI copy per error code. Switches on the code, never on server text. */
function errorMessage(code: ErrorCode, platform: Platform, samplesSource: DataSource): string {
  const chain = PLATFORM_LABEL[platform];
  switch (code) {
    case "invalid_input":
      return platform === "solana"
        ? "That does not look like a Solana mint address (32 to 44 base58 characters)."
        : `That does not look like a ${chain} contract address (0x followed by 40 hex characters).`;
    case "not_found":
      return samplesSource === "fake"
        ? "Efflux is running on seed data, so only the three sample addresses resolve here."
        : `CoinMarketCap has no price or pools for this address on ${chain}. Check the chain and the address.`;
    case "upstream_timeout":
      return "CoinMarketCap took too long to answer. Try again in a moment.";
    case "upstream_error":
      return "CoinMarketCap returned an error, often the shared rate limit. Try again in a minute.";
    case "parse_failure":
      return "CoinMarketCap answered, but not with pool data Efflux can read.";
    case "not_configured":
      return "This server is not set up for live lookups.";
  }
}

export function PlayDesk({
  initial,
  samples,
  samplesSource,
  samplesProof = [],
}: {
  initial: PlayInitial;
  samples: TokenSnapshot[];
  samplesSource: DataSource;
  /** The requests behind the sample list (seed entries in fake mode, real calls in real mode). */
  samplesProof?: ApiProof[];
}) {
  const holdingId = useId();
  const proofFor = useCallback(
    (t: TokenSnapshot | null) => (t ? samplesProof.filter((p) => p.url.includes(t.address) || p.body?.tokenAddress === t.address) : []),
    [samplesProof]
  );
  const [token, setToken] = useState<TokenSnapshot | null>(() => samples.find((t) => t.slug === initial.slug) ?? samples[0] ?? null);
  const [source, setSource] = useState<SourceState>(() => sampleSource(samplesSource));
  const [holdingUsd, setHoldingUsd] = useState(initial.holdingUsd);
  const [controls, setControls] = useState<ExitControls>({ ahead: initial.ahead, applyTax: initial.applyTax, applyDrain: initial.applyDrain });
  const [excluded, setExcluded] = useState<string[]>([]);
  const [platform, setPlatform] = useState<Platform>(initial.platform ?? "base");
  const [address, setAddress] = useState(initial.address ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [lookedUp, setLookedUp] = useState(false);
  const [proof, setProof] = useState<ApiProof[]>(() => proofFor(token));
  const [proofOpen, setProofOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLive = source.kind === "live";
  const fromLookup = !source.sample;

  const loadLive = useCallback(
    async (p: Platform, a: string) => {
      setStatus({ kind: "loading" });
      setLookedUp(true);
      try {
        const res = await fetch(`/api/exit?platform=${p}&address=${encodeURIComponent(a.trim())}`);
        const body = (await res.json()) as unknown;
        if (isErrorBody(body)) {
          setProof([]);
          setStatus({ kind: "error", message: errorMessage(body.error, p, samplesSource) });
          return;
        }
        const envelope = body as ApiEnvelope<TokenSnapshot>;
        setProof(envelope.proof ?? []);
        if (!envelope.data) {
          setStatus({ kind: "error", message: errorMessage("not_found", p, samplesSource) });
          return;
        }
        const data = envelope.data;
        setToken(data);
        setExcluded([]);
        setSource({
          kind: envelope.source,
          note: envelope.source === "live" ? `Read at ${new Date(data.snapshotAt).toLocaleTimeString("en-US")}` : envelope.message,
          sample: false,
        });
        setStatus({ kind: "idle" });
      } catch {
        setStatus({ kind: "error", message: "The request did not reach our server. Check your connection and try again." });
      }
    },
    [samplesSource]
  );

  // A shared link with platform + address loads the token on arrival.
  useEffect(() => {
    if (initial.platform && initial.address) void loadLive(initial.platform, initial.address);
  }, [initial.platform, initial.address, loadLive]);

  const sellers = useMemo(() => (token ? eligibleSellers(token, excluded) : []), [token, excluded]);
  const ahead = Math.min(controls.ahead, sellers.length);
  const liquidity = token ? totalLiquidityUsd(token) : 0;

  const pickSample = (t: TokenSnapshot) => {
    setToken(t);
    setExcluded([]);
    setSource(sampleSource(samplesSource));
    setStatus({ kind: "idle" });
    setProof(proofFor(t));
  };

  const toggleExcluded = (addr: string) =>
    setExcluded((list) => (list.includes(addr) ? list.filter((a) => a !== addr) : [...list, addr]));

  const copyLink = async () => {
    if (!token) return;
    const params = new URLSearchParams({
      usd: String(holdingUsd),
      ahead: String(ahead),
      tax: controls.applyTax ? "1" : "0",
      drain: controls.applyDrain ? "1" : "0",
    });
    if (fromLookup) {
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
          <CardDescription>Start from a sample, or paste a contract address and read it from CoinMarketCap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {samples.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {samples.map((t) => (
                <Button key={t.slug} variant={!fromLookup && token?.slug === t.slug ? "default" : "outline"} onClick={() => pickSample(t)}>
                  {t.symbol} on {PLATFORM_LABEL[t.platform]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="bg-background px-4 py-3 text-sm">No sample tokens are available right now. Paste an address below.</p>
          )}
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
          ) : !lookedUp ? (
            <p className="border-l-4 border-line bg-background px-4 py-3 text-sm">
              No address looked up yet. Paste a contract address on {PLATFORM_LABEL[platform]} to see its pools, holders and the CoinMarketCap
              calls behind them.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {token ? (
        <section aria-label="Exit result" className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl md:text-3xl">
              {token.name} ({token.symbol})
            </h2>
            <Badge variant={isLive ? "ok" : "secondary"}>{SOURCE_LABEL[source.kind]}</Badge>
            <span className="text-sm text-muted-foreground">
              {source.note}. {token.pools.length} pools, {fmtCompactUsd(liquidity)} liquidity.
            </span>
          </div>
          <div className="max-w-xs space-y-2 text-sm font-semibold">
            <label htmlFor={holdingId} className="block">
              What your wallet shows, in USD
            </label>
            <Input
              id={holdingId}
              type="number"
              inputMode="decimal"
              min={1}
              step={50}
              value={holdingUsd}
              onChange={(e) => setHoldingUsd(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className={cn("transition-opacity", status.kind === "loading" && "opacity-50")}>
            {liquidity > 0 && token.priceUsd > 0 ? (
              <ExitStage
                token={token}
                holdingUsd={holdingUsd}
                excluded={excluded}
                {...controls}
                ahead={ahead}
                onChange={(next) => setControls((c) => ({ ...c, ...next }))}
              />
            ) : (
              <div className="bg-surface px-6 py-8">
                <p className="font-display text-2xl md:text-3xl">No liquidity to sell into</p>
                <p className="mt-3 max-w-[60ch] text-sm">
                  {token.symbol} has no pool with a dollar value or no price right now, so a sale of {fmtCompactUsd(holdingUsd)} would pay
                  nothing. Try another chain or another address.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink}>
              {copied ? "Link copied" : "Copy a link to this result"}
            </Button>
            <Button variant="ghost" aria-expanded={proofOpen} onClick={() => setProofOpen((o) => !o)}>
              {proofOpen ? "Hide the CoinMarketCap calls" : "Show the CoinMarketCap calls"}
            </Button>
          </div>
          {proofOpen ? <ProofDrawer proof={proof} source={source.kind} /> : null}
        </section>
      ) : (
        <section aria-label="Exit result" className="bg-surface px-6 py-10">
          <h2 className="text-2xl md:text-3xl">Nothing to simulate yet</h2>
          <p className="mt-3 max-w-[60ch] text-sm">Paste a token address above and Efflux works out what a sale of it pays.</p>
        </section>
      )}

      {token ? (
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
              <p className="bg-background px-4 py-6 text-sm">No holder list came back for this token, so nobody sells ahead of you.</p>
            ) : (
              <div className="overflow-x-auto">
                <ol className="min-w-[36rem] divide-y divide-border bg-background">
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
                          <span className="tabular-nums">
                            {fmtTokens(h.balance)} {token.symbol}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {((h.balance / Math.max(token.supply, 1)) * 100).toFixed(1)}% of supply
                          </span>
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
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ProofDrawer({ proof, source }: { proof: ApiProof[]; source: DataSource }) {
  if (proof.length === 0) {
    return (
      <div className="bg-surface px-6 py-6 text-sm">
        You are looking at a sample token, so no request has been made yet. Paste any token address above and every CoinMarketCap call
        behind the result shows up here, with its raw response.
      </div>
    );
  }
  const intro =
    source === "live"
      ? "These are the requests behind the numbers above."
      : source === "fake"
        ? "Seed data, not live calls. These entries show the shape of each CoinMarketCap request; no request left the server."
        : "These requests ran against CoinMarketCap. Where a call failed or came back unusable, the bundled snapshot is shown instead.";
  return (
    <div className="space-y-4">
      <p className="text-sm">
        {intro} No API key was sent unless the server has one configured.
      </p>
      {proof.map((p, i) => (
        <details key={`${p.endpoint}-${i}`} className="bg-surface" open={i === 0}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-sm font-semibold">
            {source === "fake" ? (
              <Badge variant="secondary">Seed</Badge>
            ) : (
              <Badge variant={p.status >= 200 && p.status < 300 ? "ok" : p.status === 429 ? "warn" : "destructive"}>{p.status || "ERR"}</Badge>
            )}
            <span>
              {p.method} {p.endpoint}
            </span>
            <span className="font-normal text-muted-foreground">
              {source === "fake" ? "illustrative" : `${p.ms} ms`}, {p.keyed ? "keyed" : "keyless"}
            </span>
          </summary>
          <div className="space-y-2 px-4 pb-4 text-xs">
            <p className="break-all">{p.url}</p>
            {p.body ? <p className="break-all">Body: {JSON.stringify(p.body)}</p> : null}
            <div className="max-h-72 overflow-x-auto overflow-y-auto">
              <pre className="whitespace-pre-wrap break-all bg-background p-3 font-sans">{p.excerpt}</pre>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
