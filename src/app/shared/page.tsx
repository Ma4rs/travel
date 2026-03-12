"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DynamicMap from "@/components/map/DynamicMap";
import type { Quest, Trip } from "@/types";
import { QUEST_CATEGORIES } from "@/types";

export default function SharedTripPage() {
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setError("No trip ID provided.");
      setLoading(false);
      return;
    }

    fetch(`/api/share-trip?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Trip not found");
        const data = await res.json();
        setTrip(data.trip);
      })
      .catch(() => setError("This trip doesn't exist or has been removed."))
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-4 text-5xl">🔗</div>
          <h2 className="mb-2 text-lg font-semibold">{error || "Trip not found"}</h2>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Go to TravelGuide
          </Link>
        </div>
      </div>
    );
  }

  const totalXP = trip.quests.reduce((s, q) => s + q.xp, 0);
  const mapQuests: Quest[] = trip.quests.map((q) => ({
    ...q,
    detourMinutes: q.detourMinutes ?? 0,
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{trip.title}</h1>
            <p className="text-xs text-muted">
              {trip.origin.name} → {trip.destination.name}
              {trip.days && trip.days > 1 ? ` · ${trip.days} days` : ""}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Try TravelGuide
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Stats */}
        <div className="mb-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            {trip.quests.length} quests
          </span>
          <span className="rounded-full bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent">
            {totalXP} XP
          </span>
          {trip.totalDistance && (
            <span className="rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
              {trip.totalDistance > 10000 ? Math.round(trip.totalDistance / 1000) : Math.round(trip.totalDistance)} km
            </span>
          )}
        </div>

        {/* Map */}
        {trip.routeGeometry && trip.routeGeometry.length > 0 && (
          <div className="mb-6 h-80 rounded-xl overflow-hidden">
            <DynamicMap
              routeGeometry={trip.routeGeometry}
              quests={mapQuests}
              completedQuests={{}}
              onQuestClick={() => {}}
            />
          </div>
        )}

        {/* Quest list */}
        <h2 className="mb-3 text-lg font-semibold">Quests on this trip</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {trip.quests.map((quest) => {
            const cat = QUEST_CATEGORIES[quest.category] ?? QUEST_CATEGORIES.hidden_gem;
            return (
              <div key={quest.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: cat.color + "20" }}
                >
                  {cat.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{quest.title}</p>
                  <p className="text-xs text-muted">{cat.label} · {quest.xp} XP</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold">Want to plan your own trip?</h3>
          <p className="mb-4 text-sm text-muted">
            TravelGuide finds hidden gems, scenic detours, and local favorites along any route.
          </p>
          <Link
            href="/plan"
            className="inline-block rounded-xl bg-primary px-6 py-3 font-medium text-white hover:bg-primary-hover"
          >
            Plan a Trip
          </Link>
        </div>
      </div>
    </div>
  );
}
