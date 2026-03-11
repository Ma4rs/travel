export default function ResultLoading() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border px-4 sm:px-6 py-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-border" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-border" />
          <div className="h-3 w-32 animate-pulse rounded bg-border" />
        </div>
        <div className="h-8 w-8 animate-pulse rounded-full bg-border" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden sm:flex w-96 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-4">
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-border" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-border" />
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-border" />
            ))}
          </div>
        </aside>

        <main className="flex flex-1 p-2 sm:p-4">
          <div className="h-full w-full animate-pulse rounded-xl bg-border" />
        </main>
      </div>
    </div>
  );
}
