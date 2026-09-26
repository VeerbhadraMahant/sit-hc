export default function MyFeedbackLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-mist" />
        <div className="h-9 w-80 max-w-full animate-pulse rounded-smallcards bg-mist" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-32 animate-pulse rounded-full bg-mist" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-smallcards bg-mist/70" />
      ))}
    </div>
  );
}
