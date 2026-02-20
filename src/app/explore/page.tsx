"use client";

import { useState } from "react";
import Link from "next/link";
import StateList from "@/components/explore/StateList";
import UserMenu from "@/components/UserMenu";
import DynamicExploreMap from "@/components/explore/DynamicExploreMap";
import { useTripStore } from "@/stores/trip-store";
import { calculateOverallProgress } from "@/lib/progress";
import { REGIONS } from "@/data/regions";

export default function ExplorePage() {
  const [showMap, setShowMap] = useState(false);
  const { completedQuests, completedQuestIds, completeMainQuest } =
    useTripStore();
  const ids = completedQuestIds();
  const overall = calculateOverallProgress(ids);

  const allQuests = REGIONS.flatMap((r) => r.quests);
  const totalXP = allQuests
    .filter((q) => ids.includes(q.id))
    .reduce((sum, q) => sum + q.xp, 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <Link
            href="/"
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
