import { ImageResponse } from "next/og";

export const alt = "Efflux: what selling your DEX token actually pays";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette from IDENTITY.md (D2 gallery). ImageResponse cannot read CSS variables.
const GROUND = "#ffffff";
const INK = "#17161a";
const MAGENTA = "#d92bd9";
const DEEP = "#ececea";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: GROUND, color: INK, padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700 }}>
          <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: -6 }}>Efflux</div>
          <div style={{ fontSize: 44, lineHeight: 1.15, fontWeight: 700 }}>
            Your wallet says $5,000. The pool decides what you get.
          </div>
          <div style={{ fontSize: 26 }}>Real pools and holders from the CoinMarketCap DEX API</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginLeft: 40 }}>
          <div style={{ width: 70, height: 420, background: INK }} />
          <div style={{ width: 70, height: 300, background: DEEP }} />
          <div style={{ width: 70, height: 190, background: DEEP }} />
          <div style={{ width: 70, height: 110, background: MAGENTA }} />
        </div>
      </div>
    ),
    size
  );
}
