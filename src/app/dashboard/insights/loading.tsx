export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading insights">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-mist" />
          <div className="h-10 w-[28rem] max-w-full animate-pulse rounded-smallcards bg-mist" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-32 animate-pulse rounded-buttons bg-mist" />
          <div className="h-11 w-40 animate-pulse rounded-buttons bg-mist" />
        </div>
      </div>
      <div className="h-36 animate-pulse rounded-cards bg-mist/70" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-cards bg-mist/70" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-cards bg-mist/60" />
        ))}
      </div>
    </div>
  );
}
