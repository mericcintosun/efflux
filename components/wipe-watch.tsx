"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Starts the efflux-wipe entrance on every `.efflux-wipe-view` element when it
 * enters the viewport. Elements are never hidden before that: without this
 * component (no JS, reduced motion, a full-page capture) they simply stay visible.
 * Renders nothing; mounted once in app/layout.tsx and re-run on route change.
 */
export function WipeWatch() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    // The first report for each element tells whether it was already on screen
    // when the page settled; those stay as they are, with no replay.
    const reported = new WeakSet<Element>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const first = !reported.has(e.target);
          reported.add(e.target);
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.wipe = first ? "seen" : "run";
          obs.unobserve(e.target);
        }
      },
      { threshold: 0 }
    );
    document.querySelectorAll<HTMLElement>(".efflux-wipe-view:not([data-wipe])").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [pathname]);

  return null;
}
