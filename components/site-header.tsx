"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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

const PANEL_ID = "site-nav-panel";

// HEADER row of IDENTITY.md: solid ground, border-b in LINE, sticky, h-16.
// One brand mark, inside the brand link. Below md the links move into a
// disclosure panel opened by one button; it closes on every route change.
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 font-display text-lg tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          <BrandMark />
          Efflux
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-semibold">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-xs px-3 underline-offset-4 hover:bg-surface hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
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

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xs px-2 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:hidden"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          <span>{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      <nav
        id={PANEL_ID}
        aria-label="Main, small screens"
        className={cn("absolute inset-x-0 top-16 border-b border-border bg-background md:hidden", open ? "block" : "hidden")}
      >
        <ul className="mx-auto max-w-6xl px-5 py-2 text-base font-semibold">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 w-full items-center px-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                    active && "underline decoration-primary decoration-2 underline-offset-4"
                  )}
                >
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
