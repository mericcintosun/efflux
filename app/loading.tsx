// Story route skeleton: the same band rhythm as the page, in flat token blocks.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
          <p className="efflux-wipe font-display text-4xl leading-[1.02] sm:text-6xl">Efflux</p>
          <p className="mt-6 text-lg">Loading the story and the pool.</p>
          <div className="mt-12 h-72 max-w-4xl bg-surface md:h-96" aria-hidden="true" />
        </div>
      </section>
      <section className="bg-surface" aria-hidden="true">
        <div className="mx-auto max-w-6xl space-y-4 px-5 py-16 md:px-8 md:py-24">
          <div className="h-8 max-w-xl bg-deep" />
          <div className="h-8 max-w-md bg-deep" />
        </div>
      </section>
    </div>
  );
}
