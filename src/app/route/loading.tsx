export default function RouteLoading() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border px-6 py-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-border" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-border" />
          <div className="h-3 w-56 animate-pulse rounded bg-border/50" />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden sm:flex w-96 shrink-0 flex-col border-r border-border p-4 space-y-4">
          <div className="h-12 animate-pulse rounded-xl bg-border" />
          <div className="h-12 animate-pulse rounded-xl bg-border" />
          <div className="h-8 animate-pulse rounded-xl bg-border/50" />
          <div className="h-12 animate-pulse rounded-xl bg-border" />
        </aside>
        <main className="flex-1 p-4">
          <div className="h-full animate-pulse rounded-xl bg-border/30" />
        </main>
      </div>
    </div>
  );
}
