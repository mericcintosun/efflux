import { NextResponse, type NextRequest } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { ERROR_STATUS, errorBody } from "@/lib/errors";
import { exitQuerySchema } from "@/lib/schemas";

// GET /api/exit?platform=base&address=0x...
// Reads one token through the adapter seam. With ADAPTER_MODE=real this is a
// server-side proxy to the CoinMarketCap DEX API: the browser never talks to CMC
// directly, which sidesteps CORS and keeps an optional API key on the server.
// With the default ADAPTER_MODE=fake it answers from the seed tokens.
// Success: the ApiEnvelope. Failure: { error, hint } with a matching status.

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = exitQuerySchema.safeParse({ platform: sp.get("platform") ?? undefined, address: sp.get("address") ?? undefined });
  if (!parsed.success) return NextResponse.json(errorBody("invalid_input"), { status: 400 });

  const { platform, address } = parsed.data;
  const envelope = await getAdapter().lookup(platform, address);
  if (envelope.data) return NextResponse.json(envelope, { status: 200 });

  const code = envelope.error?.error ?? "not_found";
  return NextResponse.json(errorBody(code), { status: ERROR_STATUS[code] });
}
