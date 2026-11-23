// Typed error codes for every API route and the adapter. Provider text never
// passes through: the UI switches on `error` and the hint is our own sentence.
// Pure module, safe to import from client components.

export type ErrorCode = "invalid_input" | "upstream_timeout" | "upstream_error" | "parse_failure" | "not_configured" | "not_found";

export interface ErrorBody {
  error: ErrorCode;
  hint: string;
}

const HINTS: Record<ErrorCode, string> = {
  invalid_input: "Check the chain and the token address, then try again.",
  upstream_timeout: "CoinMarketCap took more than 4 seconds to answer. Try again: the second try is usually served from the 60 second cache.",
  upstream_error: "CoinMarketCap returned an error, so try again in a minute.",
  parse_failure: "CoinMarketCap answered, but not with data Efflux can read.",
  not_configured: "This server is not set up for that request.",
  not_found: "No price or pools came back for this address on this chain.",
};

export function hintFor(code: ErrorCode): string {
  return HINTS[code];
}

export function errorBody(code: ErrorCode): ErrorBody {
  return { error: code, hint: hintFor(code) };
}

/** HTTP status for each code, used by the route handlers. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  invalid_input: 400,
  upstream_timeout: 504,
  upstream_error: 502,
  parse_failure: 422,
  not_configured: 503,
  not_found: 404,
};

export function isErrorBody(v: unknown): v is ErrorBody {
  if (!v || typeof v !== "object") return false;
  const e = (v as { error?: unknown }).error;
  return typeof e === "string" && e in HINTS;
}
