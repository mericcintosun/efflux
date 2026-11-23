import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Unbounded } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin"], display: "swap", variable: "--font-unbounded" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata: Metadata = {
  metadataBase: new URL("https://efflux.vercel.app"),
  title: {
    default: "Efflux: what selling your DEX token actually pays",
    template: "%s | Efflux",
  },
  description:
    "Find out what a small DEX token really pays if you sell today, and what is left if the biggest wallets sell first. Real pools, holders, sell tax and LP changes from the CoinMarketCap DEX API.",
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
            <p className="flex gap-4 font-semibold">
              <Link href="/play" className="underline decoration-primary decoration-2 underline-offset-4">
                Simulator
              </Link>
              <Link href="/notes" className="underline decoration-primary decoration-2 underline-offset-4">
                Method and endpoints
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
