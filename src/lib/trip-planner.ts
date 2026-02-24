import { REGIONS } from "@/data/regions";
import type { QuestCategory } from "@/types";

export interface TripSuggestion {
  title: string;
  destination: string;
  description: string;
  questCount: number;
  totalXP: number;
  estimatedCost: number;
  highlights: string[];
  center: [number, number];
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GAS_COST_PER_KM = 0.3;
const ACCOMMODATION_PER_NIGHT = 60;

export function planTrips(
  startLat: number,
  startLng: number,
  budget: number,
  days: number,
  interests: QuestCategory[]
): TripSuggestion[] {
  const scored = REGIONS.map((region) => {
    const matchingQuests =
      interests.length > 0
        ? region.quests.filter((q) => interests.includes(q.category))
        : region.quests;

    const distanceKm = haversineKm(
      startLat,
      startLng,
      region.center[0],
      region.center[1]
    );

    const gasCost = distanceKm * 2 * GAS_COST_PER_KM;
    const accommodationCost = Math.max(0, days - 1) * ACCOMMODATION_PER_NIGHT;
    const estimatedCost = Math.round(gasCost + accommodationCost);

    const totalXP = matchingQuests.reduce((sum, q) => sum + q.xp, 0);

    const topQuests = matchingQuests
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 4);

    const questNouns = matchingQuests.length === 1 ? "quest" : "quests";
    const description =
      matchingQuests.length > 0
        ? `Discover ${matchingQuests.length} ${questNouns} in ${region.name}. Highlights include ${topQuests
            .slice(0, 2)
            .map((q) => q.title)
            .join(" and ")}.`
        : `Explore ${region.name} and uncover its hidden treasures.`;

    return {
      title: `Explore ${region.name}`,
      destination: region.name,
      description,
      questCount: matchingQuests.length,
      totalXP,
      estimatedCost,
      highlights: topQuests.map((q) => q.title),
      center: region.center,
      score: matchingQuests.length * 10 + totalXP / 10 - distanceKm / 50,
      fitsbudget: estimatedCost <= budget,
    };
  });

  return scored
    .filter((s) => s.questCount > 0 && s.fitsbudget)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _s, fitsbudget: _f, ...rest }) => rest);
}
