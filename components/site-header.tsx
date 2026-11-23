import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const NAV = [
  { href: "/", label: "Story" },
  { href: "/play", label: "Simulator" },
  { href: "/notes", label: "Notes" },
];

// HEADER row of IDENTITY.md: solid ground, border-b in LINE, sticky.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg tracking-tight">
          <BrandMark />
          Efflux
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1 text-sm font-semibold">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-block rounded-xs px-3 py-2 underline-offset-4 hover:bg-surface hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
