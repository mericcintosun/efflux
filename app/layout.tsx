import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Unbounded } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

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
        <footer className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-10 text-sm md:px-8">
            <p className="max-w-[65ch]">
              Efflux runs on the CoinMarketCap DEX API through its keyless public endpoints. Built for the Build with CMC API
              hackathon. Estimates, not advice.
            </p>
            <p className="flex flex-wrap gap-x-4 font-semibold">
              <Link href="/" className="inline-flex min-h-11 items-center underline decoration-primary decoration-2 underline-offset-4">
                Story
              </Link>
              <Link href="/play" className="inline-flex min-h-11 items-center underline decoration-primary decoration-2 underline-offset-4">
                Simulator
              </Link>
              <Link href="/notes" className="inline-flex min-h-11 items-center underline decoration-primary decoration-2 underline-offset-4">
                Method and endpoints
              </Link>
            </p>
            <p className="max-w-[65ch]">
              <span className="font-semibold">About and security:</span> Efflux reads public CoinMarketCap data and never asks for a
              wallet.{" "}
              <a
                href="https://github.com/mericcintosun/efflux"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-primary decoration-2 underline-offset-4"
              >
                Source and SECURITY.md on GitHub
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
