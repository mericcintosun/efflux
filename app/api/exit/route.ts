import { NextResponse, type NextRequest } from "next/server";
import { lookupWithinBudget } from "@/lib/adapter";
import { ERROR_STATUS, errorBody } from "@/lib/errors";
import { exitQuerySchema } from "@/lib/schemas";

// GET /api/exit?platform=base&address=0x...
// Reads one token through the adapter seam. With ADAPTER_MODE=real this is a
// server-side proxy to the CoinMarketCap DEX API: the browser never talks to CMC
// directly, which sidesteps CORS and keeps an optional API key on the server.
// With the default ADAPTER_MODE=fake it answers from the seed tokens.
// Success: the ApiEnvelope. Failure: { error, hint } with a matching status.
//
// Idempotency guard: this GET is read-only and idempotent. It writes nothing,
// so a double click or a retry cannot change state. A success carries
// SUCCESS_CACHE_CONTROL so a repeat inside a minute is served from cache.
//
// Latency bound: the lookup is raced against LOOKUP_BUDGET_MS (4 s, lib/config.ts)
// inside lookupWithinBudget (lib/adapter.ts). A late lookup answers 504 with the
// typed upstream_timeout body; its hint tells the user to try again, and the
// retry usually hits the 60 s fetch cache the late load warmed.

const SUCCESS_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = exitQuerySchema.safeParse({ platform: sp.get("platform") ?? undefined, address: sp.get("address") ?? undefined });
  if (!parsed.success) return NextResponse.json(errorBody("invalid_input"), { status: 400 });

  const { platform, address } = parsed.data;
  const envelope = await lookupWithinBudget(platform, address);
  if (envelope.data) {
    return NextResponse.json(envelope, { status: 200, headers: { "Cache-Control": SUCCESS_CACHE_CONTROL } });
  }

  const code = envelope.error?.error ?? "not_found";
  return NextResponse.json(errorBody(code), { status: ERROR_STATUS[code] });
}
