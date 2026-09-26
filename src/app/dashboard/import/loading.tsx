export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading import">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-mist" />
        <div className="h-10 w-80 max-w-full animate-pulse rounded-smallcards bg-mist" />
        <div className="h-4 w-[32rem] max-w-full animate-pulse rounded bg-mist/70" />
      </div>
      <div className="h-11 w-72 animate-pulse rounded-full bg-mist" />
      <div className="h-64 animate-pulse rounded-cards bg-mist/60" />
    </div>
  );
}
