"use client";

import { useState } from "react";
import Image from "next/image";
import { REGIONS } from "@/data/regions";
import { QUEST_CATEGORIES } from "@/types";
import type { RegionQuest, CompletedQuestData } from "@/types";
import {
  calculateOverallProgress,
  calculateStateProgress,
  getProgressColor,
  getProgressLabel,
} from "@/lib/progress";
import ProgressBar from "./ProgressBar";
import QuestDetail from "@/components/quest/QuestDetail";
import PhotoUploadDialog from "@/components/quest/PhotoUploadDialog";

interface StateListProps {
  completedQuests: Record<string, CompletedQuestData>;
  onCompleteQuest: (questId: string, photoUrl: string) => void;
  onShowMap: () => void;
}

export default function StateList({
  completedQuests,
  onCompleteQuest,
  onShowMap,
}: StateListProps) {
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<RegionQuest | null>(null);
  const [uploadQuest, setUploadQuest] = useState<RegionQuest | null>(null);
  const completedQuestIds = Object.keys(completedQuests);
  const overall = calculateOverallProgress(completedQuestIds);

  const sortedRegions = [...REGIONS].sort((a, b) => {
    const pa = calculateStateProgress(a.id, completedQuestIds).percentage;
    const pb = calculateStateProgress(b.id, completedQuestIds).percentage;
    return pb - pa;
  });

  return (
    <div className="space-y-6">
      {/* Overall Germany Progress */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xl font-bold">Germany</h2>
          <button
            onClick={onShowMap}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary hover:text-primary"
          >
            See on Map
          </button>
        </div>
        <p className="mb-3 text-sm text-muted">
          {overall.completed} / {overall.total} quests completed
        </p>
        <ProgressBar percentage={overall.percentage} size="lg" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span
            className="font-medium"
            style={{ color: getProgressColor(overall.percentage) }}
          >
            {getProgressLabel(overall.percentage)}
          </span>
          <span>
            {REGIONS.filter(
              (r) =>
                calculateStateProgress(r.id, completedQuestIds).percentage ===
                100
            ).length}{" "}
            / {REGIONS.length} states mastered
          </span>
        </div>
      </div>

      {/* State List */}
      <div className="space-y-2">
        {sortedRegions.map((region) => {
          const progress = calculateStateProgress(
            region.id,
            completedQuestIds
          );
          const isExpanded = expandedState === region.id;
          const color = getProgressColor(progress.percentage);

          return (
            <div
              key={region.id}
              className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-card-hover"
            >
              {/* State Header */}
              <button
                onClick={() =>
                  setExpandedState(isExpanded ? null : region.id)
                }
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{
                    backgroundColor: color + "15",
                    color: color,
                  }}
                >
                  {progress.percentage}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{region.name}</h3>
                    {progress.percentage === 100 && (
                      <span className="text-xs" title="Mastered!">
                        ✨
                      </span>
                    )}
                  </div>
                  <ProgressBar
                    percentage={progress.percentage}
                    size="sm"
                    showLabel={false}
                  />
                </div>

                <span className="shrink-0 text-sm text-muted">
                  {progress.completed}/{progress.total}
                </span>

                <svg
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded Quest List */}
              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-2">
                  <div className="space-y-1.5">
                    {region.quests.map((quest) => {
                      const questData = completedQuests[quest.id];
                      const isCompleted = !!questData;

                      return (
                        <QuestRow
                          key={quest.id}
                          quest={quest}
                          isCompleted={isCompleted}
                          photoUrl={questData?.photoUrl}
                          onComplete={() => setUploadQuest(quest)}
                          onClick={() => setSelectedQuest(quest)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quest Detail Dialog */}
      {selectedQuest && (
        <QuestDetail
          quest={{
            ...selectedQuest,
            detourMinutes: 0,
            completed: !!completedQuests[selectedQuest.id],
            photoUrl: completedQuests[selectedQuest.id]?.photoUrl,
          }}
          photoUrl={completedQuests[selectedQuest.id]?.photoUrl}
          completedAt={completedQuests[selectedQuest.id]?.completedAt}
          onClose={() => setSelectedQuest(null)}
          onComplete={(questId, photoUrl) => {
            onCompleteQuest(questId, photoUrl);
            setSelectedQuest(null);
          }}
        />
      )}

      {/* Photo Upload Dialog */}
      {uploadQuest && !selectedQuest && (
        <PhotoUploadDialog
          questTitle={uploadQuest.title}
          questId={uploadQuest.id}
          onComplete={(questId, photoUrl) => {
            onCompleteQuest(questId, photoUrl);
            setUploadQuest(null);
          }}
          onClose={() => setUploadQuest(null)}
        />
      )}
    </div>
  );
}

function QuestRow({
  quest,
  isCompleted,
  photoUrl,
  onComplete,
  onClick,
}: {
  quest: RegionQuest;
  isCompleted: boolean;
  photoUrl?: string;
  onComplete: () => void;
  onClick: () => void;
}) {
  const cat = QUEST_CATEGORIES[quest.category];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors cursor-pointer ${
        isCompleted ? "opacity-80" : "hover:bg-background"
      }`}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isCompleted) onComplete();
        }}
        disabled={isCompleted}
        aria-label={isCompleted ? `${quest.title} completed` : `Complete ${quest.title}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs transition-colors ${
          isCompleted
            ? "border-secondary bg-secondary text-white"
            : "border-border hover:border-secondary hover:bg-secondary/10"
        }`}
      >
        {isCompleted && "✓"}
      </button>

      {isCompleted && photoUrl && !imgError ? (
        <Image
          src={photoUrl}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-md object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-lg" title={cat.label}>
          {cat.icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${isCompleted ? "line-through" : ""}`}
        >
          {quest.title}
        </p>
        <p className="truncate text-xs text-muted">{quest.description}</p>
      </div>

      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
        {quest.xp} XP
      </span>

      {!isCompleted && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${quest.lat},${quest.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
          title="Navigate"
        >
          Navigate
        </a>
      )}
    </div>
  );
}
