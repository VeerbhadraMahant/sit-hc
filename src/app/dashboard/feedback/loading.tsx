export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading feedback">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-mist" />
          <div className="h-9 w-44 animate-pulse rounded-smallcards bg-mist" />
        </div>
        <div className="h-11 w-36 animate-pulse rounded-buttons bg-mist" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-36 animate-pulse rounded-smallcards bg-mist/80" />
        ))}
      </div>
      <div className="overflow-hidden rounded-cards bg-paper shadow-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-mist px-5 py-4 last:border-0">
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-mist" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-mist" />
            </div>
            <div className="h-4 w-11/12 animate-pulse rounded bg-mist/80" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-mist/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
