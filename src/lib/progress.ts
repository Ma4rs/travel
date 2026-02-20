import { REGIONS } from "@/data/regions";
import type { ExplorationProgress } from "@/types";

export function getProgressColor(percentage: number): string {
  if (percentage === 0) return "#525252";
  if (percentage === 100) return "#F59E0B";
  if (percentage >= 75) return "#A855F7";
  if (percentage >= 50) return "#8B5CF6";
  if (percentage >= 25) return "#10B981";
  return "#3B82F6";
}

export function getProgressLabel(percentage: number): string {
  if (percentage === 0) return "Undiscovered";
  if (percentage === 100) return "Mastered";
  if (percentage >= 75) return "Veteran";
  if (percentage >= 50) return "Explorer";
  if (percentage >= 25) return "Adventurer";
  return "Newcomer";
}

export function calculateStateProgress(
  stateId: string,
  completedQuestIds: string[]
): ExplorationProgress {
  const region = REGIONS.find((r) => r.id === stateId);
  if (!region) return { completed: 0, total: 0, percentage: 0 };

  const total = region.quests.length;
  const completed = region.quests.filter((q) =>
    completedQuestIds.includes(q.id)
  ).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

export function calculateOverallProgress(
  completedQuestIds: string[]
): ExplorationProgress {
  const total = REGIONS.reduce((sum, r) => sum + r.quests.length, 0);
  const completed = REGIONS.reduce(
    (sum, r) =>
      sum + r.quests.filter((q) => completedQuestIds.includes(q.id)).length,
    0
  );
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}
