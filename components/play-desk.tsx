"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState } from "@/components/route-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SceneSlot } from "@/components/scene-slot";
import { ExitStage, type ExitControls } from "@/components/exit-stage";
import { PLATFORM_LABEL, SOURCE_LABEL } from "@/lib/data";
import { isErrorBody, type ErrorCode } from "@/lib/errors";
import type { ApiEnvelope, ApiProof, DataSource, Platform, TokenSnapshot } from "@/lib/types";
import { NON_SELLER_TAGS, eligibleSellers, fmtCompactUsd, fmtPctValue, fmtTokens, shortAddress, totalLiquidityUsd } from "@/lib/simulate";
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

/** One full-width band's inner column: the same width and padding as the home route bands. */
const BAND = "mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24";

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
      return "CoinMarketCap did not answer within 4 seconds. Try again: the second try is usually served from the 60 second cache.";
    case "upstream_error":
      return "CoinMarketCap returned an error, often the shared rate limit. Try again in a minute.";
    case "parse_failure":
      return "CoinMarketCap answered, but not with pool data Efflux can read.";
    case "not_configured":
      return "This server is not set up for live lookups.";
  }
}

/** Source line for a token that came from an address lookup. UTC, so server and browser render the same text. */
function lookupSource(envelope: ApiEnvelope<TokenSnapshot>, data: TokenSnapshot): SourceState {
  return {
    kind: envelope.source,
    note:
      envelope.source === "live"
        ? `Read at ${new Date(data.snapshotAt).toLocaleTimeString("en-US", { timeZone: "UTC" })} UTC`
        : envelope.message,
    sample: false,
  };
}

export function PlayDesk({
  initial,
  samples,
  samplesSource,
  samplesProof = [],
  initialLookup,
}: {
  initial: PlayInitial;
  samples: TokenSnapshot[];
  samplesSource: DataSource;
  /** The requests behind the sample list (seed entries in fake mode, real calls in real mode). */
  samplesProof?: ApiProof[];
  /** A shared link with platform and address, already resolved on the server by app/play/page.tsx. */
  initialLookup?: ApiEnvelope<TokenSnapshot>;
}) {
  const holdingId = useId();
  const addressRef = useRef<HTMLInputElement>(null);
  const proofFor = useCallback(
    (t: TokenSnapshot | null) => (t ? samplesProof.filter((p) => p.url.includes(t.address) || p.body?.tokenAddress === t.address) : []),
    [samplesProof]
  );

  // Starting state. A resolved shared link wins; a failed one keeps the sample
  // token on screen and opens in the error state with its retry button.
  const startLookup = initialLookup?.data ?? null;
  const startToken = startLookup ?? samples.find((t) => t.slug === initial.slug) ?? samples[0] ?? null;
  const [token, setToken] = useState<TokenSnapshot | null>(startToken);
  const [source, setSource] = useState<SourceState>(() =>
    initialLookup && startLookup ? lookupSource(initialLookup, startLookup) : sampleSource(samplesSource)
  );
  const [holdingUsd, setHoldingUsd] = useState(initial.holdingUsd);
  const [controls, setControls] = useState<ExitControls>({ ahead: initial.ahead, applyTax: initial.applyTax, applyDrain: initial.applyDrain });
  const [excluded, setExcluded] = useState<string[]>([]);
  const [platform, setPlatform] = useState<Platform>(initial.platform ?? "base");
  const [address, setAddress] = useState(initial.address ?? "");
  const [status, setStatus] = useState<Status>(() =>
    initialLookup && !startLookup
      ? { kind: "error", message: errorMessage(initialLookup.error?.error ?? "not_found", initial.platform ?? "base", samplesSource) }
      : { kind: "idle" }
  );
  const [lookedUp, setLookedUp] = useState(Boolean(initialLookup));
  const [proof, setProof] = useState<ApiProof[]>(() => (initialLookup && startLookup ? initialLookup.proof : proofFor(startToken)));
  // True when the newest lookup failed: the drawer keeps the earlier proof and says so.
  const [lookupFailed, setLookupFailed] = useState(Boolean(initialLookup && !startLookup));
  const [proofOpen, setProofOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Double-submit guard: every lookup gets an id and an AbortController. A new
  // lookup aborts the one in flight, and a response whose id is stale is ignored.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastLookupRef = useRef<{ platform: Platform; address: string } | null>(
    initial.platform && initial.address ? { platform: initial.platform, address: initial.address } : null
  );

  const isLive = source.kind === "live";
  const fromLookup = !source.sample;

  const loadLive = useCallback(
    async (p: Platform, a: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++requestIdRef.current;
      lastLookupRef.current = { platform: p, address: a };
      setStatus({ kind: "loading" });
      setLookedUp(true);
      const fail = (message: string) => {
        // Keep the previous proof entries; the drawer notes that this lookup failed.
        setLookupFailed(true);
        setStatus({ kind: "error", message });
      };
      try {
        const res = await fetch(`/api/exit?platform=${p}&address=${encodeURIComponent(a.trim())}`, { signal: controller.signal });
        const body = (await res.json()) as unknown;
        if (id !== requestIdRef.current) return;
        if (isErrorBody(body)) {
          fail(errorMessage(body.error, p, samplesSource));
          return;
        }
        const envelope = body as ApiEnvelope<TokenSnapshot>;
        if (!envelope.data) {
          fail(errorMessage("not_found", p, samplesSource));
          return;
        }
        const data = envelope.data;
        setProof(envelope.proof ?? []);
        setLookupFailed(false);
        setToken(data);
        setExcluded([]);
        setSource(lookupSource(envelope, data));
        setStatus({ kind: "idle" });
      } catch {
        if (id !== requestIdRef.current || controller.signal.aborted) return;
        fail("The request did not reach our server. Check your connection and try again.");
      }
    },
    [samplesSource]
  );

  // Cancel a lookup still in flight when the desk unmounts. No fetch here.
  useEffect(() => () => abortRef.current?.abort(), []);

  const retryLookup = () => {
    const last = lastLookupRef.current;
    if (last) void loadLive(last.platform, last.address);
    else if (address.trim()) void loadLive(platform, address);
    else addressRef.current?.focus();
  };

  const focusAddress = () => addressRef.current?.focus();

  const sellers = useMemo(() => (token ? eligibleSellers(token, excluded) : []), [token, excluded]);
  const ahead = Math.min(controls.ahead, sellers.length);
  const liquidity = token ? totalLiquidityUsd(token) : 0;

  const pickSample = (t: TokenSnapshot) => {
    // A sample pick wins over a lookup still in flight.
    abortRef.current?.abort();
    requestIdRef.current++;
    setLookupFailed(false);
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
    <>
      <section className="bg-surface" aria-label="Pick a token">
        <div className={BAND}>
          <h2 className="text-2xl md:text-4xl">Pick a token</h2>
          <p className="mt-3 max-w-[60ch] text-base">Start from a sample, or paste a contract address and read it from CoinMarketCap.</p>
          <div className="mt-8 space-y-6">
          {samples.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {samples.map((t) => (
                <Button
                  key={t.slug}
                  className="min-h-11"
                  variant={!fromLookup && token?.slug === t.slug ? "default" : "outline"}
                  onClick={() => pickSample(t)}
                >
                  {t.symbol} on {PLATFORM_LABEL[t.platform]}
                </Button>
              ))}
            </div>
          ) : (
            // EmptyState: no samples came back; the action moves focus to the address field.
            <EmptyState
              className="bg-background"
              title="No sample tokens right now"
              body="Neither CoinMarketCap nor the bundled snapshot returned a sample. Paste a contract address below instead."
              cta="Paste an address"
              onAction={focusAddress}
            />
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
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  className="min-h-11"
                  variant={platform === p ? "secondary" : "ghost"}
                  aria-pressed={platform === p}
                  onClick={() => setPlatform(p)}
                >
                  {PLATFORM_LABEL[p]}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                ref={addressRef}
                aria-label="Token contract address"
                placeholder={platform === "solana" ? "Mint address" : "0x contract address"}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                spellCheck={false}
              />
              {/* Submit guard: bound to the request status, not a timer. */}
              <Button type="submit" className="min-h-11" disabled={status.kind === "loading" || !address.trim()} aria-busy={status.kind === "loading"}>
                {status.kind === "loading" ? "Reading CoinMarketCap..." : "Read from CoinMarketCap"}
              </Button>
            </div>
          </form>
          {status.kind === "error" ? (
            // ErrorState: the lookup failed; "Try again" reruns loadLive with the same chain and address.
            <ErrorState className="bg-background" title="That lookup did not work" body={status.message} onRetry={retryLookup} />
          ) : !lookedUp ? (
            // Empty state of the lookup: nothing pasted yet. scene-5 is the artifact of this band.
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="w-36 shrink-0 sm:w-44">
                <SceneSlot n={5} alt="A magenta token block on a grey line, pointing at an empty ink pool outline with three faint level marks" width={640} height={600} className="mix-blend-multiply" />
              </div>
              <p className="max-w-[50ch] text-sm">
                No address looked up yet. Paste a contract address on {PLATFORM_LABEL[platform]} to see its pools, holders and the
                CoinMarketCap calls behind them.
              </p>
            </div>
          ) : null}
          </div>
        </div>
      </section>

      {token ? (
        <section aria-label="Exit result" className="bg-background">
          <div className={cn(BAND, "space-y-6")}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="min-w-0 break-words text-2xl md:text-4xl">
              {token.name} ({token.symbol})
            </h2>
            <Badge variant={isLive ? "ok" : "secondary"}>{SOURCE_LABEL[source.kind]}</Badge>
            <span className="text-sm text-muted-foreground">
              {source.note}. {token.pools.length} pools, {fmtCompactUsd(liquidity)} liquidity.
            </span>
            <span className="block w-full truncate text-xs text-muted-foreground" title={token.address}>
              {PLATFORM_LABEL[token.platform]} address {shortAddress(token.address)}
            </span>
          </div>
          <div className="w-full max-w-xs space-y-2 text-sm font-semibold">
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
                onEmptyAction={focusAddress}
                onRetry={retryLookup}
              />
            ) : (
              // EmptyState: zero-liquidity pools or no price, so there is no waterfall to draw.
              <EmptyState
                title="No liquidity to sell into"
                body={`${token.symbol} has no pool with a dollar value or no price right now, so a sale of ${fmtCompactUsd(holdingUsd)} would pay nothing. The cuts waterfall appears after you pick a token with live pools and enter a holding; try another chain or paste another address.`}
                cta="Paste an address"
                onAction={focusAddress}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={copyLink}>
              {copied ? "Link copied" : "Copy a link to this result"}
            </Button>
            <Button variant="ghost" className="min-h-11" aria-expanded={proofOpen} aria-controls="proof-drawer" onClick={() => setProofOpen((o) => !o)}>
              {proofOpen ? "Hide the CoinMarketCap calls" : "Show the CoinMarketCap calls"}
            </Button>
          </div>
          <div id="proof-drawer" className="max-w-full">
            {proofOpen ? <ProofDrawer proof={proof} source={source.kind} lastFailed={lookupFailed} /> : null}
          </div>
          </div>
        </section>
      ) : (
        <section aria-label="Exit result" className="bg-background">
          <div className={BAND}>
            <EmptyState
              title="Nothing to simulate yet"
              body="Paste a token address above and Efflux works out what a sale of it pays."
              cta="Paste an address"
              onAction={focusAddress}
            />
          </div>
        </section>
      )}

      {token ? (
        <section className="bg-surface" aria-label="The queue ahead of you">
          <div className={BAND}>
            <h2 className="text-2xl md:text-4xl">The queue ahead of you</h2>
            <p className="mt-3 max-w-[65ch] text-base">
              Largest holders first; pools, burn, exchange, bridge and locker wallets sit out, and &quot;Will not sell&quot; takes a wallet
              you trust out of the queue.
            </p>
            <div className="mt-8">
            {token.holders.length === 0 ? (
              <p className="bg-background px-4 py-6 text-sm">No holder list came back for this token, so nobody sells ahead of you.</p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <ol className="w-full divide-y divide-border bg-background">
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
                          <span className="min-w-[9rem] max-w-full truncate font-semibold" title={h.address}>
                            {h.label ?? shortAddress(h.address)}
                          </span>
                          <span className="tabular-nums">
                            {fmtTokens(h.balance)} {token.symbol}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {fmtPctValue((h.balance / Math.max(token.supply, 1)) * 100)} of supply
                          </span>
                          <span className="flex flex-wrap gap-1">
                            {h.tags.map((t) => (
                              <Badge key={t} variant="outline">
                                {t}
                              </Badge>
                            ))}
                            {sellsFirst ? <Badge>sells before you</Badge> : null}
                          </span>
                          {!sitsOut ? (
                            <Button size="sm" variant="ghost" className="ml-auto min-h-11" onClick={() => toggleExcluded(h.address)}>
                              {isOut ? "Put back in the queue" : "Will not sell"}
                            </Button>
                          ) : null}
                        </li>
                      );
                    })}
                </ol>
              </div>
            )}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function ProofDrawer({ proof, source, lastFailed }: { proof: ApiProof[]; source: DataSource; lastFailed: boolean }) {
  const failedNote = lastFailed ? (
    <p className="border-l-4 border-warn bg-surface px-4 py-3 text-sm">
      The last lookup failed, so the calls below are from the result still on screen.
    </p>
  ) : null;
  if (proof.length === 0) {
    return (
      <div className="space-y-4">
        {failedNote}
        <div className="bg-surface px-6 py-6 text-sm">
          No CoinMarketCap call has been made for the token on screen yet. Paste a token address above and press &quot;Read from
          CoinMarketCap&quot;: each of the five requests behind the result then shows up here with its status, timing and raw response.
        </div>
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
      {failedNote}
      <p className="text-sm">
        {intro} No API key was sent unless the server has one configured.
      </p>
      {proof.map((p, i) => (
        <details key={`${p.endpoint}-${i}`} className="bg-surface" open={i === 0}>
          <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-sm font-semibold">
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
          <div className="min-w-0 space-y-2 px-4 pb-4 text-xs">
            <p className="break-all" title={p.url}>
              {p.url}
            </p>
            {p.body ? <p className="break-all">Body: {JSON.stringify(p.body)}</p> : null}
            {/* The raw response scrolls inside its own box, so long JSON lines never widen the page. */}
            <div className="max-h-72 w-full max-w-full overflow-x-auto overflow-y-auto bg-background">
              <pre className="w-max min-w-full whitespace-pre p-3 font-sans">{p.excerpt}</pre>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
