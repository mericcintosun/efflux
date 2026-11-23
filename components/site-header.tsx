"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Story" },
  { href: "/play", label: "Simulator" },
  { href: "/notes", label: "Notes" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// HEADER row of IDENTITY.md: solid ground, border-b in LINE, sticky.
// One brand mark, inside the brand link.
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
          <BrandMark />
          Efflux
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1 text-sm font-semibold">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-block rounded-xs px-3 py-2 underline-offset-4 hover:bg-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                      active && "underline decoration-primary decoration-2"
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
