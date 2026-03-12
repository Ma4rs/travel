"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { useTripStore } from "@/stores/trip-store";

type SortOption = "newest" | "oldest" | "longest" | "most-quests";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TripsPage() {
  const { savedTrips, deleteTrip, loadTrip } = useTripStore();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filter, setFilter] = useState("");

  function handleLoad(tripId: string) {
    loadTrip(tripId);
    router.push("/route");
  }

  function handleDelete(tripId: string) {
    deleteTrip(tripId);
    setConfirmDelete(null);
  }

  async function handleShare(trip: (typeof savedTrips)[0]) {
    setShareToast("sharing-" + trip.id);
    try {
      const res = await fetch("/api/share-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip }),
      });
      if (!res.ok) throw new Error();
      const { shareId } = await res.json();
      const url = `${window.location.origin}/shared?id=${shareId}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: trip.title,
            text: `Check out my trip: ${trip.origin.name} → ${trip.destination.name}`,
            url,
          });
          setShareToast(trip.id);
        } catch {
          // User cancelled or share failed — don't show success
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          setShareToast(trip.id);
        } catch {
          // Clipboard failed
        }
      }
      setTimeout(() => setShareToast(null), 3000);
    } catch {
      setShareToast("error-" + trip.id);
      setTimeout(() => setShareToast(null), 2000);
    } finally {
      setShareToast((prev) => (prev === "sharing-" + trip.id ? null : prev));
    }
  }

  function handleExportJson(trip: (typeof savedTrips)[0]) {
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.title.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalXP = (quests: (typeof savedTrips)[0]["quests"]) =>
    quests.reduce((sum, q) => sum + q.xp, 0);

  const filterLower = filter.toLowerCase();
  const filteredTrips = savedTrips.filter((trip) => {
    if (!filterLower) return true;
    return (
      trip.title.toLowerCase().includes(filterLower) ||
      trip.origin.name.toLowerCase().includes(filterLower) ||
      trip.destination.name.toLowerCase().includes(filterLower)
    );
  });

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "longest": {
        const distA = a.totalDistance ?? 0;
        const distB = b.totalDistance ?? 0;
        return distB - distA;
      }
      case "most-quests":
        return b.quests.length - a.quests.length;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">My Trips</h1>
            <p className="text-xs text-muted">
              {savedTrips.length} {savedTrips.length === 1 ? "trip" : "trips"} saved
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {savedTrips.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-4 text-5xl">🗺️</div>
            <h3 className="mb-2 text-lg font-medium">No saved trips yet</h3>
            <p className="mb-6 text-sm text-muted">
              Save trips from the route planner or the trip planner to see them here.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/route"
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Enhance a Route →
              </Link>
              <Link
                href="/plan"
                className="inline-flex items-center gap-1 rounded-xl border border-primary px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                Plan a Trip →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Filter & Sort controls */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
                  🔍
                </span>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by title, origin or destination…"
                  className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                {filter && (
                  <button
                    onClick={() => setFilter("")}
                    className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="longest">Longest (km)</option>
                <option value="most-quests">Most quests</option>
              </select>
            </div>

            {sortedTrips.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-3 text-4xl">🔍</div>
                <p className="text-sm text-muted">No trips match &ldquo;{filter}&rdquo;</p>
                <button
                  onClick={() => setFilter("")}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {sortedTrips.map((trip) => {
                  const itineraryDays =
                    trip.itinerary && Array.isArray(trip.itinerary)
                      ? trip.itinerary.length
                      : null;

                  return (
                    <div
                      key={trip.id}
                      className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold leading-snug">{trip.title}</h3>
                          <p className="mt-0.5 text-sm font-medium text-foreground/70">
                            {trip.origin.name} → {trip.destination.name}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Saved {formatDate(trip.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                            {totalXP(trip.quests)} XP
                          </span>
                          {itineraryDays && (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                              📅 {itineraryDays} {itineraryDays === 1 ? "day" : "days"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted">
                        <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary">
                          {trip.quests.length} {trip.quests.length === 1 ? "quest" : "quests"}
                        </span>
                        {trip.totalDistance != null && (
                          <span className="rounded-lg bg-muted/10 px-2.5 py-1">
                            {trip.totalDistance > 10000
                              ? Math.round(trip.totalDistance / 1000)
                              : Math.round(trip.totalDistance)}{" "}
                            km
                          </span>
                        )}
                        {trip.days && trip.days > 1 && !itineraryDays && (
                          <span className="rounded-lg bg-muted/10 px-2.5 py-1">{trip.days} days</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleLoad(trip.id)}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                        >
                          Load Route
                        </button>
                        <button
                          onClick={() => handleShare(trip)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                        >
                          {shareToast === "sharing-" + trip.id
                            ? "Sharing..."
                            : shareToast === trip.id
                            ? "Link copied!"
                            : shareToast === "error-" + trip.id
                            ? "Share failed"
                            : "Share"}
                        </button>
                        <button
                          onClick={() => handleExportJson(trip)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                        >
                          Export
                        </button>
                        {confirmDelete === trip.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(trip.id)}
                              className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-hover"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(trip.id)}
                            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-card-hover hover:text-red-400"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
