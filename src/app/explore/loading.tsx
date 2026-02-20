export default function ExploreLoading() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-border" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-44 animate-pulse rounded bg-border" />
            <div className="h-3 w-56 animate-pulse rounded bg-border/50" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        <div className="h-36 animate-pulse rounded-2xl bg-border/30" />
        <div className="h-20 animate-pulse rounded-xl bg-border/20" />
        <div className="h-20 animate-pulse rounded-xl bg-border/20" />
        <div className="h-20 animate-pulse rounded-xl bg-border/20" />
      </div>
    </div>
  );
}
