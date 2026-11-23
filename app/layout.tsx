import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Unbounded } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { WipeWatch } from "@/components/wipe-watch";
import "./globals.css";

const FOOTER_LINK =
  "inline-flex min-h-11 items-center underline-offset-4 hover:underline hover:decoration-primary hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const FOOTER_LINKS = [
  { href: "/play", label: "Simulator", external: false },
  { href: "/notes", label: "Notes", external: false },
  { href: "https://github.com/mericcintosun/efflux", label: "Source on GitHub", external: true },
  { href: "https://dorahacks.io/hackathon/coinmarketcap-api-202611", label: "Build with CMC hackathon", external: true },
];

const unbounded = Unbounded({ subsets: ["latin"], display: "swap", variable: "--font-unbounded" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

// The production URL from the README live demo link. One host only: og:image
// and every other relative metadata URL resolve against it.
const SITE_URL = "https://efflux-eight.vercel.app";
const TITLE = "Efflux: what your token really pays";
const DESCRIPTION =
  "Your wallet shows a price, not a payout. Efflux reads CoinMarketCap DEX pools and holders to show what a sale really pays, and what whales leave you.";
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: TITLE };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Efflux",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Efflux",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${manrope.variable}`}>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <main>{children}</main>
        <footer className="bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-12 text-sm md:px-8 md:py-16">
            <ul className="flex flex-wrap gap-x-6 font-semibold">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  {l.external ? (
                    <a href={l.href} rel="noopener noreferrer" className={FOOTER_LINK}>
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className={FOOTER_LINK}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-[65ch]">
              <span className="font-semibold">About and security:</span> Efflux reads public CoinMarketCap data, never asks for a
              wallet, and shows estimates, not advice (see SECURITY.md in the repo).
            </p>
          </div>
        </footer>
        <WipeWatch />
      </body>
    </html>
  );
}
