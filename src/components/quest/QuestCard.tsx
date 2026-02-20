"use client";

import Image from "next/image";
import type { Quest } from "@/types";
import { QUEST_CATEGORIES } from "@/types";

interface QuestCardProps {
  quest: Quest;
  onClick?: () => void;
  compact?: boolean;
}

export default function QuestCard({
  quest,
  onClick,
  compact = false,
}: QuestCardProps) {
  const cat = QUEST_CATEGORIES[quest.category];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-card-hover"
      >
        {quest.completed && quest.photoUrl ? (
          <Image
            src={quest.photoUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: cat.color + "20" }}
          >
            {cat.icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium">{quest.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>+{quest.detourMinutes} min</span>
            <span>·</span>
            <span>{quest.xp} XP</span>
          </div>
        </div>
        {quest.completed && (
          <div className="text-secondary text-lg">✓</div>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:bg-card-hover"
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
          style={{ backgroundColor: cat.color + "20" }}
        >
          {cat.icon}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          {quest.xp} XP
        </div>
      </div>

      <h3 className="mb-1.5 text-lg font-semibold">{quest.title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-muted">
        {quest.description}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: cat.color + "15", color: cat.color }}
        >
          {cat.label}
        </span>
        <span>+{quest.detourMinutes} min detour</span>
      </div>

      {quest.completed && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-secondary">
          {quest.photoUrl && (
            <Image
              src={quest.photoUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-cover"
            />
          )}
          <span>✓</span> Completed
        </div>
      )}
    </div>
  );
}
