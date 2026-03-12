export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-40 animate-pulse rounded bg-border" />
          <div className="mx-auto h-4 w-56 animate-pulse rounded bg-border" />
        </div>
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-xl bg-border" />
          <div className="h-12 animate-pulse rounded-xl bg-border" />
          <div className="h-12 animate-pulse rounded-xl bg-border" />
        </div>
      </div>
    </div>
  );
}
