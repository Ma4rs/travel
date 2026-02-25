import type { Quest, DayPlan, RoutePoint } from "@/types";

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
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

function findClosestGeometryIndex(
  lat: number, lng: number,
  geometry: [number, number][]
): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < geometry.length; i++) {
    const d = (geometry[i][0] - lat) ** 2 + (geometry[i][1] - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

function geometrySegmentDistance(
  geometry: [number, number][],
  fromIdx: number,
  toIdx: number
): number {
  let dist = 0;
  for (let i = fromIdx; i < toIdx && i < geometry.length - 1; i++) {
    dist += haversineKm(geometry[i][0], geometry[i][1], geometry[i + 1][0], geometry[i + 1][1]);
  }
  return dist;
}

export function buildItinerary(
  quests: Quest[],
  origin: RoutePoint,
  destination: RoutePoint,
  days: number,
  routeGeometry: [number, number][]
): DayPlan[] {
  if (days <= 1 || quests.length === 0 || routeGeometry.length === 0) {
    const totalDist = geometrySegmentDistance(routeGeometry, 0, routeGeometry.length - 1);
    return [{
      day: 1,
      quests,
      distanceKm: Math.round(totalDist),
      durationMinutes: Math.round((totalDist / 80) * 60),
    }];
  }

  // Sort quests by their position along the route
  const questsWithIdx = quests.map((q) => ({
    quest: q,
    routeIdx: findClosestGeometryIndex(q.lat, q.lng, routeGeometry),
  }));
  questsWithIdx.sort((a, b) => a.routeIdx - b.routeIdx);

  // Divide route geometry evenly into day segments
  const totalPoints = routeGeometry.length;
  const pointsPerDay = Math.ceil(totalPoints / days);

  const dayPlans: DayPlan[] = [];

  for (let d = 0; d < days; d++) {
    const segStart = d * pointsPerDay;
    const segEnd = Math.min((d + 1) * pointsPerDay, totalPoints - 1);

    const dayQuests = questsWithIdx
      .filter((q) => q.routeIdx >= segStart && q.routeIdx < (d === days - 1 ? totalPoints : segEnd))
      .map((q) => q.quest);

    const dist = geometrySegmentDistance(routeGeometry, segStart, segEnd);

    const lastQuest = dayQuests.length > 0 ? dayQuests[dayQuests.length - 1] : null;
    const overnight: RoutePoint | undefined =
      d < days - 1 && lastQuest
        ? { lat: lastQuest.lat, lng: lastQuest.lng, name: lastQuest.title }
        : d < days - 1
          ? { lat: routeGeometry[segEnd][0], lng: routeGeometry[segEnd][1], name: `Day ${d + 1} stop` }
          : undefined;

    dayPlans.push({
      day: d + 1,
      quests: dayQuests,
      overnightLocation: overnight,
      distanceKm: Math.round(dist),
      durationMinutes: Math.round((dist / 80) * 60),
    });
  }

  return dayPlans;
}
