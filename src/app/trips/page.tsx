"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UserMenu from "@/components/UserMenu";
import { useTripStore } from "@/stores/trip-store";

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

  function handleLoad(tripId: string) {
    loadTrip(tripId);
    router.push("/route");
  }

  function handleDelete(tripId: string) {
    deleteTrip(tripId);
    setConfirmDelete(null);
  }

  function handleShare(trip: (typeof savedTrips)[0]) {
    const params = new URLSearchParams();
    params.set("from", trip.origin.name);
    params.set("to", trip.destination.name);
    const url = `${window.location.origin}/route?${params.toString()}`;

    if (navigator.share) {
      navigator.share({
        title: trip.title,
        text: `Check out this route: ${trip.origin.name} → ${trip.destination.name}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast(trip.id);
        setTimeout(() => setShareToast(null), 3000);
      });
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/"
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
              Find side quests on a route and save it to see it here.
            </p>
            <Link
              href="/route"
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Enhance a Route →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {savedTrips.map((trip) => (
              <div
                key={trip.id}
                className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{trip.title}</h3>
                    <p className="text-sm text-muted">
                      {trip.origin.name} → {trip.destination.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      {totalXP(trip.quests)} XP
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    {trip.quests.length} {trip.quests.length === 1 ? "quest" : "quests"}
                  </span>
                  <span className="flex items-center gap-1">
                    📅 {formatDate(trip.createdAt)}
                  </span>
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
                    {shareToast === trip.id ? "Copied!" : "Share"}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
