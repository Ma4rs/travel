"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-5xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted">
          An unexpected error occurred. This might be a temporary issue — try
          again or go back to the home page.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded-xl border border-border px-6 py-3 font-medium text-muted transition-colors hover:text-foreground"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
