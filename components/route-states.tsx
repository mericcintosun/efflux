"use client";

// Named loading, error and empty states for the three demo routes.
// D2 gallery: flat SURFACE and DEEP blocks, INK text, ACCENT only on the primary
// button, sharp corners, no borders and no cards. Skeleton blocks reuse the
// efflux-wipe entrance and never pulse.

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** `/` skeleton: the hero band and one surface band, the same rhythm as the story. */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
          <p className="efflux-wipe font-display text-4xl leading-[1.02] sm:text-6xl">Efflux</p>
          <p className="mt-6 text-lg">Loading the story and the pool.</p>
          <div className="efflux-wipe mt-12 h-72 max-w-4xl bg-surface md:h-96" aria-hidden="true" />
        </div>
      </section>
      <section className="bg-surface" aria-hidden="true">
        <div className="mx-auto max-w-6xl space-y-4 px-5 py-16 md:px-8 md:py-24">
          <div className="efflux-wipe h-8 max-w-xl bg-deep" />
          <div className="efflux-wipe h-8 max-w-md bg-deep" />
        </div>
      </section>
    </div>
  );
}

/** `/play` skeleton: title, token picker block, result block. */
export function PlaySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <p className="efflux-wipe font-display text-3xl leading-tight md:text-5xl">Efflux simulator</p>
      <p className="mt-5 text-lg">Loading the sample tokens.</p>
      <div className="mt-12 space-y-12" aria-hidden="true">
        <div className="efflux-wipe h-48 bg-surface" />
        <div className="space-y-4">
          <div className="efflux-wipe h-16 max-w-md bg-deep" />
          {/* The cuts waterfall placeholder: wallet, four cuts, payout. */}
          <div className="space-y-3">
            <div className="efflux-wipe h-4 w-full bg-deep" />
            <div className="efflux-wipe ml-auto h-4 w-1/4 bg-surface" />
            <div className="efflux-wipe ml-auto h-4 w-1/6 bg-surface" />
            <div className="efflux-wipe ml-auto h-4 w-1/6 bg-surface" />
            <div className="efflux-wipe ml-auto h-4 w-1/5 bg-surface" />
            <div className="efflux-wipe h-4 w-1/4 bg-deep" />
          </div>
          <div className="efflux-wipe h-36 bg-surface" />
        </div>
      </div>
    </div>
  );
}

/** `/notes` skeleton: title and three text blocks. */
export function NotesSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <p className="efflux-wipe font-display text-3xl leading-tight md:text-5xl">Efflux notes</p>
      <p className="mt-5 text-lg">Loading the method and the endpoint list.</p>
      <div className="mt-16 space-y-6" aria-hidden="true">
        <div className="efflux-wipe h-24 max-w-3xl bg-surface" />
        <div className="efflux-wipe h-24 max-w-3xl bg-surface" />
        <div className="efflux-wipe h-40 bg-deep" />
      </div>
    </div>
  );
}

/**
 * Error state with a retry. The caller passes its own sentence; an error message
 * or stack is never printed here.
 */
export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel = "Try again",
  className,
  children,
}: {
  title: string;
  body: string;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="alert" className={cn("bg-surface px-6 py-8", className)}>
      <p className="font-display text-2xl leading-tight md:text-3xl">{title}</p>
      <p className="mt-3 max-w-[60ch] text-sm">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" className="min-h-11" onClick={() => onRetry()}>
          {retryLabel}
        </Button>
        {children}
      </div>
    </div>
  );
}

/**
 * Empty state with one call to action: a link (`href`) or, inside a client
 * component, an action (`onAction`, for example focusing a field).
 */
export function EmptyState({
  title,
  body,
  href,
  onAction,
  cta,
  className,
}: {
  title: string;
  body: string;
  href?: string;
  onAction?: () => void;
  cta: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface px-6 py-8", className)}>
      <p className="font-display text-2xl leading-tight md:text-3xl">{title}</p>
      <p className="mt-3 max-w-[60ch] text-sm">{body}</p>
      <div className="mt-6">
        {href ? (
          <Button asChild className="min-h-11">
            <Link href={href}>{cta}</Link>
          </Button>
        ) : (
          <Button type="button" className="min-h-11" onClick={() => onAction?.()}>
            {cta}
          </Button>
        )}
      </div>
    </div>
  );
}
