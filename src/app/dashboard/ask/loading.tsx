export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading Ask AI">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-mist" />
        <div className="h-10 w-72 animate-pulse rounded-smallcards bg-mist" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-mist/70" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-64 max-w-full animate-pulse rounded-full bg-mist/80" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-cards bg-mist/50" />
      <div className="h-14 animate-pulse rounded-buttons bg-mist" />
    </div>
  );
}
