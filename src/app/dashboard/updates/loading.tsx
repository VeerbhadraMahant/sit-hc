export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading updates">
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-mist" />
        <div className="h-8 w-96 animate-pulse rounded-smallcards bg-mist" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-cards bg-mist/70" />
        ))}
      </div>
    </div>
  );
}
