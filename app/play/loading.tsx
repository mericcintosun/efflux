// Simulator skeleton: title band, token picker block, result block.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <p className="efflux-wipe font-display text-3xl leading-tight md:text-5xl">Efflux simulator</p>
      <p className="mt-5 text-lg">Loading the sample tokens.</p>
      <div className="mt-12 space-y-12" aria-hidden="true">
        <div className="h-48 bg-surface" />
        <div className="space-y-4">
          <div className="h-16 max-w-md bg-primary" />
          <div className="h-36 bg-deep" />
        </div>
      </div>
    </div>
  );
}
