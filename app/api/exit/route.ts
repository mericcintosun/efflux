import { NextResponse, type NextRequest } from "next/server";
import { loadExitBundle } from "@/lib/cmc";
import type { Platform } from "@/lib/data";

// GET /api/exit?platform=base&address=0x...
// Server-side proxy to the CoinMarketCap DEX API. The browser never talks to CMC
// directly, which sidesteps CORS and keeps an optional API key on the server.

const PLATFORMS: Platform[] = ["base", "bsc", "solana"];
const ADDRESS = /^[A-Za-z0-9]{32,64}$/;

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") as Platform | null;
  const address = (req.nextUrl.searchParams.get("address") ?? "").trim();

  if (!platform || !PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { source: "none", token: null, proof: [], message: "Pick Base, BNB Chain or Solana." },
      { status: 400 }
    );
  }
  if (!ADDRESS.test(address)) {
    return NextResponse.json(
      { source: "none", token: null, proof: [], message: "That does not look like a token address." },
      { status: 400 }
    );
  }

  const bundle = await loadExitBundle(platform, address);
  return NextResponse.json(bundle, { status: bundle.token ? 200 : 404 });
}
