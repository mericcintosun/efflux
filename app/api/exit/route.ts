import { NextResponse, type NextRequest } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiEnvelope, Platform, TokenSnapshot } from "@/lib/types";

// GET /api/exit?platform=base&address=0x...
// Reads one token through the adapter seam. With ADAPTER_MODE=real this is a
// server-side proxy to the CoinMarketCap DEX API: the browser never talks to CMC
// directly, which sidesteps CORS and keeps an optional API key on the server.
// With the default ADAPTER_MODE=fake it answers from the seed tokens.

const PLATFORMS: Platform[] = ["base", "bsc", "solana"];
const ADDRESS = /^[A-Za-z0-9]{32,64}$/;

function badRequest(message: string) {
  const body: ApiEnvelope<TokenSnapshot> = { source: "none", data: null, proof: [], message };
  return NextResponse.json(body, { status: 400 });
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") as Platform | null;
  const address = (req.nextUrl.searchParams.get("address") ?? "").trim();

  if (!platform || !PLATFORMS.includes(platform)) return badRequest("Pick Base, BNB Chain or Solana.");
  if (!ADDRESS.test(address)) return badRequest("That does not look like a token address.");

  const envelope = await getAdapter().lookup(platform, address);
  return NextResponse.json(envelope, { status: envelope.data ? 200 : 404 });
}
