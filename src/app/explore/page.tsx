"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import StateList from "@/components/explore/StateList";
import UserMenu from "@/components/UserMenu";
import DynamicExploreMap from "@/components/explore/DynamicExploreMap";
import { useTripStore } from "@/stores/trip-store";
import { calculateOverallProgress } from "@/lib/progress";
import { REGIONS, ALL_QUESTS } from "@/data/regions";
import { QUEST_CATEGORIES } from "@/types";
import type { RegionQuest } from "@/types";
import { haversineKm } from "@/lib/utils";

export default function ExplorePage() {
  const [showMap, setShowMap] = useState(false);
  const [nearbyQuests, setNearbyQuests] = useState<(RegionQuest & { distanceKm: number })[]>([]);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
  const [showNearMe, setShowNearMe] = useState(false);
  const { completedQuests, completedQuestIds, completeMainQuest } =
    useTripStore();
  const ids = completedQuestIds();
  const overall = calculateOverallProgress(ids);

  const allQuests = REGIONS.flatMap((r) => r.quests);
  const totalXP = allQuests
    .filter((q) => ids.includes(q.id))
    .reduce((sum, q) => sum + q.xp, 0);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setNearMeError("GPS not available in your browser.");
      return;
    }
    setNearMeLoading(true);
    setNearMeError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearby = ALL_QUESTS
          .map((q) => ({ ...q, distanceKm: Math.round(haversineKm(latitude, longitude, q.lat, q.lng)) }))
          .filter((q) => q.distanceKm <= 50)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 20);
        setNearbyQuests(nearby);
        setShowNearMe(true);
        setNearMeLoading(false);
      },
      () => {
        setNearMeError("Location access denied. Enable GPS in your browser settings.");
        setNearMeLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Exploration Progress</h1>
            <p className="text-xs text-muted">
              {overall.completed} quests completed across Germany
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-accent/10 px-3 py-1 font-medium text-accent">
              {totalXP} XP
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Progress summary */}
        <p className="mb-6 text-center text-sm text-muted">
          <span className="font-medium text-foreground">{overall.completed}</span> of{" "}
          <span className="font-medium text-foreground">{overall.total}</span> quests completed
          {" · "}
          <span className="font-medium text-foreground">{overall.percentage}%</span> complete
          {" across "}
          <span className="font-medium text-foreground">{REGIONS.length}</span> states
        </p>
        {/* Near Me section */}
        <div className="mb-6">
          <button
            onClick={showNearMe ? () => setShowNearMe(false) : handleNearMe}
            disabled={nearMeLoading}
            className="w-full rounded-xl border border-primary/30 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            {nearMeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                Finding quests near you...
              </span>
            ) : showNearMe ? (
              "Hide nearby quests"
            ) : (
              "📍 Show quests near me"
            )}
          </button>
          {nearMeError && (
            <p className="mt-2 text-center text-xs text-red-400">{nearMeError}</p>
          )}
          {showNearMe && nearbyQuests.length === 0 && !nearMeLoading && (
            <p className="mt-3 text-center text-sm text-muted">No quests found within 50 km of your location.</p>
          )}
          {showNearMe && nearbyQuests.length > 0 && (
            <div className="mt-3 space-y-2">
              <h3 className="text-sm font-semibold text-muted">Quests near you ({nearbyQuests.length})</h3>
              {nearbyQuests.map((q) => {
                const cat = QUEST_CATEGORIES[q.category] ?? QUEST_CATEGORIES.hidden_gem;
                const isCompleted = ids.includes(q.id);
                return (
                  <div
                    key={q.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      isCompleted ? "border-secondary/30 bg-secondary/5" : "border-border bg-card"
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: cat.color + "20" }}
                    >
                      {cat.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{q.title}</p>
                      <p className="text-xs text-muted">
                        {q.distanceKm} km away · {q.xp} XP
                        {isCompleted && <span className="ml-1 text-secondary"> · Completed</span>}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${q.lat},${q.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      Go
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <StateList
          completedQuests={completedQuests}
          onCompleteQuest={completeMainQuest}
          onShowMap={() => setShowMap(true)}
        />
      </div>

      {/* Map Overlay */}
      {showMap && (
        <DynamicExploreMap
          completedQuestIds={ids}
          onClose={() => setShowMap(false)}
          onStateClick={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
