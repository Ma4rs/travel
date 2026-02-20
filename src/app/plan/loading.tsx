export default function PlanLoading() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-border" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-border" />
            <div className="h-3 w-56 animate-pulse rounded bg-border/50" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="h-12 animate-pulse rounded-xl bg-border" />
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="h-12 animate-pulse rounded-xl bg-border" />
            <div className="h-12 animate-pulse rounded-xl bg-border" />
            <div className="h-12 animate-pulse rounded-xl bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
