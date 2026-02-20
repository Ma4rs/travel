export default function AlbumLoading() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-border" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-border" />
            <div className="h-3 w-28 animate-pulse rounded bg-border/50" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl bg-border/30"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
