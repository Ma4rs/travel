"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Quest } from "@/types";
import { QUEST_CATEGORIES } from "@/types";
import PhotoUploadDialog from "./PhotoUploadDialog";

interface QuestDetailProps {
  quest: Quest;
  onClose: () => void;
  onComplete?: (questId: string, photoUrl: string) => void;
  photoUrl?: string;
  completedAt?: string;
}

export default function QuestDetail({
  quest,
  onClose,
  onComplete,
  photoUrl,
  completedAt,
}: QuestDetailProps) {
  const cat = QUEST_CATEGORIES[quest.category];
  const [showUpload, setShowUpload] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isCompleted = quest.completed || !!photoUrl;
  const displayPhotoUrl = photoUrl || quest.photoUrl;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, [onClose]);

  if (showUpload && onComplete) {
    return (
      <PhotoUploadDialog
        questTitle={quest.title}
        questId={quest.id}
        onComplete={(questId, url) => {
          onComplete(questId, url);
          setShowUpload(false);
          onClose();
        }}
        onClose={() => setShowUpload(false)}
      />
    );
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-detail-title"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl bg-card p-6 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-border/50 text-muted hover:text-foreground z-10"
        >
          ✕
        </button>

        {isCompleted && displayPhotoUrl && !imgError && (
          <div className="relative mb-4 -mx-6 -mt-6 sm:rounded-t-2xl overflow-hidden h-56">
            <Image
              src={displayPhotoUrl}
              alt={`Photo from ${quest.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
              onError={() => setImgError(true)}
            />
          </div>
        )}

        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
          style={{ backgroundColor: cat.color + "20" }}
        >
          {cat.icon}
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ backgroundColor: cat.color + "15", color: cat.color }}
          >
            {cat.label}
          </span>
          <span className="text-xs text-accent font-medium">
            {quest.xp} XP
          </span>
          {isCompleted && (
            <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondary">
              Completed
              {completedAt &&
                ` · ${new Date(completedAt).toLocaleDateString()}`}
            </span>
          )}
        </div>

        <h2 id="quest-detail-title" className="mb-3 text-2xl font-bold">{quest.title}</h2>
        <p className="mb-4 leading-relaxed text-muted">{quest.description}</p>

        <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted">
          {quest.detourMinutes > 0 && (
            <div className="flex items-center gap-1.5">
              <span>🕐</span>
              <span>+{quest.detourMinutes} min detour</span>
            </div>
          )}
          {quest.address && (
            <div className="flex items-center gap-1.5">
              <span>📍</span>
              <span>{quest.address}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${quest.lat},${quest.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-primary py-3 text-center font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Navigate Here
          </a>
          {!isCompleted && onComplete && (
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-xl border border-secondary px-6 py-3 font-medium text-secondary transition-colors hover:bg-secondary/10"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
