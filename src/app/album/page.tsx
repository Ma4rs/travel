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
    const entry = completedQuests[questId];
    if (curated) {
      setSelectedQuest({
        ...curated,
        detourMinutes: 0,
        completed: true,
        photoUrl: entry?.photoUrl,
      });
    } else if (entry) {
      setSelectedQuest({
        id: questId,
        title: entry.title || questId,
        description: "Completed quest",
        category: entry.category || "hidden_gem",
        lat: 0,
        lng: 0,
        detourMinutes: 0,
        xp: 50,
        completed: true,
        photoUrl: entry.photoUrl,
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
            aria-label="Back to home"
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
              const category = curated?.category ?? entry.category;
              const cat = category ? QUEST_CATEGORIES[category] : null;
              const title = curated?.title ?? entry.title ?? entry.questId;

              return (
                <AlbumCard
                  key={entry.questId}
                  photoUrl={entry.photoUrl}
                  title={title}
                  icon={cat?.icon}
                  date={entry.completedAt}
                  onClick={() => openQuest(entry.questId)}
                />
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

function AlbumCard({
  photoUrl,
  title,
  icon,
  date,
  onClick,
}: {
  photoUrl: string;
  title: string;
  icon?: string;
  date: string;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {imgError ? (
        <div className="flex h-full w-full items-center justify-center bg-card text-4xl">
          📸
        </div>
      ) : (
        <Image
          src={photoUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {icon && (
          <span className="mb-1 inline-block text-sm">{icon}</span>
        )}
        <p className="text-sm font-medium text-white leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-white/60">
          {new Date(date).toLocaleDateString()}
        </p>
      </div>
    </button>
  );
}
