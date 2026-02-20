"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import QuestDetail from "@/components/quest/QuestDetail";
import { useTripStore } from "@/stores/trip-store";
import { QUEST_BY_ID } from "@/data/regions";
import { QUEST_CATEGORIES } from "@/types";
import type { Quest } from "@/types";

export default function AlbumPage() {
  const { completedQuests, completeQuest } = useTripStore();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  const entries = Object.values(completedQuests)
    .filter((e) => e.photoUrl)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

  function openQuest(questId: string) {
    const curated = QUEST_BY_ID[questId];
    if (curated) {
      setSelectedQuest({
        ...curated,
        detourMinutes: 0,
        completed: true,
        photoUrl: completedQuests[questId]?.photoUrl,
      });
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Memory Album</h1>
            <p className="text-xs text-muted">
              {entries.length} {entries.length === 1 ? "memory" : "memories"}{" "}
              captured
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {entries.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mb-4 text-5xl">📸</div>
            <h2 className="mb-2 text-lg font-medium">No memories yet</h2>
            <p className="mb-6 text-sm text-muted">
              Complete quests by uploading photos to build your travel album.
            </p>
            <Link
              href="/explore"
              className="inline-flex rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Start Exploring
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {entries.map((entry) => {
              const curated = QUEST_BY_ID[entry.questId];
              const cat = curated
                ? QUEST_CATEGORIES[curated.category]
                : null;

              return (
                <button
                  key={entry.questId}
                  onClick={() => openQuest(entry.questId)}
                  className="group relative aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Image
                    src={entry.photoUrl}
                    alt={curated?.title ?? "Quest photo"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {cat && (
                      <span className="mb-1 inline-block text-sm">
                        {cat.icon}
                      </span>
                    )}
                    <p className="text-sm font-medium text-white leading-tight">
                      {curated?.title ?? entry.questId}
                    </p>
                    <p className="mt-0.5 text-xs text-white/60">
                      {new Date(entry.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quest Detail Modal */}
      {selectedQuest && (
        <QuestDetail
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          photoUrl={completedQuests[selectedQuest.id]?.photoUrl}
          completedAt={completedQuests[selectedQuest.id]?.completedAt}
          onComplete={(questId, photoUrl) => {
            completeQuest(questId, photoUrl);
            setSelectedQuest(null);
          }}
        />
      )}
    </div>
  );
}
