export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-12 w-72 animate-pulse rounded-smallcards bg-mist" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-cards bg-mist/70" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-cards bg-mist/70 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-cards bg-mist/70" />
      </div>
    </div>
  );
}
