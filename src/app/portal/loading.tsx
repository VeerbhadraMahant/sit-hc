export default function PortalLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-mist" />
        <div className="h-9 w-72 animate-pulse rounded-smallcards bg-mist" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-36 animate-pulse rounded-full bg-mist" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="h-72 animate-pulse rounded-cards bg-mist/70" />
        <div className="h-72 animate-pulse rounded-cards bg-mist/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-52 animate-pulse rounded-cards bg-mist/70" />
        <div className="h-52 animate-pulse rounded-cards bg-mist/70" />
      </div>
    </div>
  );
}
