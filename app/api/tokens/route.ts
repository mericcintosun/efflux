import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";

// GET /api/tokens
// The sample tokens, through the adapter seam, in the shared ApiEnvelope shape.
// Route handlers are not cached by default in Next 15, so ADAPTER_MODE is read per request.
export async function GET() {
  const envelope = await getAdapter().listTokens();
  return NextResponse.json(envelope, { status: 200 });
}
