"use client";

import type { QuestCategory } from "@/types";
import { QUEST_CATEGORIES } from "@/types";

interface InterestFilterProps {
  selected: QuestCategory[];
  onToggle: (category: QuestCategory) => void;
}

export default function InterestFilter({
  selected,
  onToggle,
}: InterestFilterProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-muted">
        Interests
      </label>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(QUEST_CATEGORIES) as [QuestCategory, { label: string; icon: string; color: string }][]).map(
          ([key, cat]) => {
            const isActive = selected.includes(key);
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className="rounded-full border px-3 py-1.5 text-sm transition-all"
                style={{
                  borderColor: isActive ? cat.color : "var(--border)",
                  backgroundColor: isActive ? cat.color + "15" : "transparent",
                  color: isActive ? cat.color : "var(--muted)",
                }}
              >
                {cat.icon} {cat.label}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
