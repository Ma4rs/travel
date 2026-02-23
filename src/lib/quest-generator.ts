import type { Quest, QuestCategory } from "@/types";
import { getRoute, sampleRoutePoints } from "./osrm";
import { findPOIsAlongRoute } from "./overpass";
import { generateQuests } from "./gemini";
import { ALL_QUESTS } from "@/data/regions";

const MATCH_THRESHOLD_KM = 0.5;

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

function findMatchingCuratedQuestId(
  lat: number,
  lng: number
): string | null {
  for (const cq of ALL_QUESTS) {
    if (haversineKm(lat, lng, cq.lat, cq.lng) <= MATCH_THRESHOLD_KM) {
      return cq.id;
    }
  }
  return null;
}

function deduplicateQuests(quests: Quest[]): Quest[] {
  return quests.map((quest) => {
    const curatedId = findMatchingCuratedQuestId(quest.lat, quest.lng);
    if (curatedId) {
      return { ...quest, id: curatedId };
    }
    return quest;
  });
}

export async function generateQuestsForRoute(
  originLat: number,
  originLng: number,
  originName: string,
  destLat: number,
  destLng: number,
  destName: string,
  interests: QuestCategory[],
  maxDetourMinutes: number
): Promise<{
  quests: Quest[];
  routeGeometry: [number, number][];
  distance: number;
  duration: number;
}> {
  const route = await getRoute(originLat, originLng, destLat, destLng);

  const samplePoints = sampleRoutePoints(route.geometry, 30);

  const pois = await findPOIsAlongRoute(samplePoints, 10000);

  const quests = await generateQuests(pois, interests, originName, destName);

  const filtered = quests.filter((q) => q.detourMinutes <= maxDetourMinutes);

  const deduplicated = deduplicateQuests(filtered);

  return {
    quests: deduplicated,
    routeGeometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
  };
}
