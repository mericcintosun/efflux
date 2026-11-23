import { NextResponse, type NextRequest } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { ERROR_STATUS, errorBody } from "@/lib/errors";
import { tokensQuerySchema } from "@/lib/schemas";

// GET /api/tokens
// The sample tokens, through the adapter seam, in the shared ApiEnvelope shape.
// Takes no parameters; any query key is rejected as invalid_input.
// Route handlers are not cached by default in Next 15, so ADAPTER_MODE is read per request.
export async function GET(req: NextRequest) {
  const parsed = tokensQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json(errorBody("invalid_input"), { status: 400 });

  const envelope = await getAdapter().listTokens();
  if (!envelope.data || envelope.data.length === 0) {
    const code = envelope.error?.error ?? "not_found";
    return NextResponse.json(errorBody(code), { status: ERROR_STATUS[code] });
  }
  return NextResponse.json(envelope, { status: 200 });
}
