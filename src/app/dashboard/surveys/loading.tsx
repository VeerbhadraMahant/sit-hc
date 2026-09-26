export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading surveys">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-mist" />
          <div className="h-8 w-80 animate-pulse rounded-smallcards bg-mist" />
        </div>
        <div className="h-11 w-36 animate-pulse rounded-buttons bg-mist" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-smallcards bg-mist/70" />
        ))}
      </div>
    </div>
  );
}
