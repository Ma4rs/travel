import type { Quest, QuestCategory } from "@/types";
import { getRoute, sampleRoutePoints } from "./osrm";
import { findPOIsAlongRoute } from "./overpass";
import { generateQuests } from "./gemini";
import { ALL_QUESTS } from "@/data/regions";

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

function distanceToRoute(
  questLat: number,
  questLng: number,
  routeSample: [number, number][]
): number {
  let minDist = Infinity;
  for (const [lat, lng] of routeSample) {
    const d = haversineKm(questLat, questLng, lat, lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// ~1km per minute of driving on average roads
const KM_PER_DETOUR_MINUTE = 1;

function findCuratedQuestsAlongRoute(
  geometry: [number, number][],
  maxDetourMinutes: number,
  interests: QuestCategory[]
): Quest[] {
  const routeSample = sampleRoutePoints(geometry, 5);
  const maxDetourKm = maxDetourMinutes * KM_PER_DETOUR_MINUTE;

  // Bbox rough filter
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const [lat, lng] of geometry) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const pad = maxDetourKm / 111;

  return ALL_QUESTS
    .filter((q) => {
      if (q.lat < minLat - pad || q.lat > maxLat + pad) return false;
      if (q.lng < minLng - pad || q.lng > maxLng + pad) return false;
      if (interests.length > 0 && !interests.includes(q.category)) return false;
      return true;
    })
    .map((q) => {
      const dist = distanceToRoute(q.lat, q.lng, routeSample);
      const detourMinutes = Math.round(dist / KM_PER_DETOUR_MINUTE);
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        lat: q.lat,
        lng: q.lng,
        detourMinutes,
        xp: q.xp,
      } satisfies Quest;
    })
    .filter((q) => q.detourMinutes <= maxDetourMinutes)
    .sort((a, b) => a.detourMinutes - b.detourMinutes);
}

export async function generateQuestsForRoute(
  originLat: number,
  originLng: number,
  _originName: string,
  destLat: number,
  destLng: number,
  _destName: string,
  interests: QuestCategory[],
  maxDetourMinutes: number
): Promise<{
  quests: Quest[];
  routeGeometry: [number, number][];
  distance: number;
  duration: number;
}> {
  const route = await getRoute(originLat, originLng, destLat, destLng);

  const quests = findCuratedQuestsAlongRoute(
    route.geometry,
    maxDetourMinutes,
    interests
  );

  return {
    quests,
    routeGeometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
  };
}

export async function generateAIQuestsForRoute(
  originLat: number,
  originLng: number,
  originName: string,
  destLat: number,
  destLng: number,
  destName: string,
  interests: QuestCategory[],
  maxDetourMinutes: number
): Promise<Quest[]> {
  const route = await getRoute(originLat, originLng, destLat, destLng);
  const samplePoints = sampleRoutePoints(route.geometry, 30);
  const pois = await findPOIsAlongRoute(samplePoints, 10000);
  const quests = await generateQuests(pois, interests, originName, destName);

  return quests
    .filter((q) => q.detourMinutes <= maxDetourMinutes)
    .map((quest) => {
      const match = ALL_QUESTS.find(
        (cq) => haversineKm(quest.lat, quest.lng, cq.lat, cq.lng) <= 0.5
      );
      return match ? { ...quest, id: match.id } : quest;
    });
}
