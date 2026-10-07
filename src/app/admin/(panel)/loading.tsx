// Suspense boundary for every admin page: their session checks run at request time.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat">
      <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}
