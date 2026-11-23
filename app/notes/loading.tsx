// Notes skeleton: title band and three text blocks.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <p className="efflux-wipe font-display text-3xl leading-tight md:text-5xl">Efflux notes</p>
      <p className="mt-5 text-lg">Loading the method and the endpoint list.</p>
      <div className="mt-16 space-y-6" aria-hidden="true">
        <div className="h-24 max-w-3xl bg-surface" />
        <div className="h-24 max-w-3xl bg-surface" />
        <div className="h-40 bg-deep" />
      </div>
    </div>
  );
}
