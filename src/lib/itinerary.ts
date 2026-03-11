import type { Quest, DayPlan, RoutePoint } from "@/types";

const DEFAULT_VISIT: Record<string, number> = {
  activity: 240, food: 60, scenic: 30, photo_spot: 20,
  hidden_gem: 45, history: 45, nature: 60, culture: 60, weird: 30,
};
const DAY_BUDGET_MINUTES = 480;

function getVisitMin(q: Quest): number {
  return q.visitMinutes ?? DEFAULT_VISIT[q.category] ?? 45;
}

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
    if (d < minDist) { minDist = d; minIdx = i; }
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

  const questsWithIdx = quests.map((q) => ({
    quest: q,
    routeIdx: findClosestGeometryIndex(q.lat, q.lng, routeGeometry),
  }));
  questsWithIdx.sort((a, b) => a.routeIdx - b.routeIdx);

  // Time-aware assignment: fill each day up to the budget
  const dayPlans: { quests: Quest[]; visitTime: number; lastRouteIdx: number }[] =
    Array.from({ length: days }, () => ({ quests: [], visitTime: 0, lastRouteIdx: 0 }));

  let currentDay = 0;
  for (const { quest, routeIdx } of questsWithIdx) {
    const visit = getVisitMin(quest);

    if (
      currentDay < days - 1 &&
      dayPlans[currentDay].visitTime + visit > DAY_BUDGET_MINUTES &&
      dayPlans[currentDay].quests.length > 0
    ) {
      dayPlans[currentDay].lastRouteIdx = routeIdx;
      currentDay++;
    }

    dayPlans[currentDay].quests.push(quest);
    dayPlans[currentDay].visitTime += visit;
    dayPlans[currentDay].lastRouteIdx = routeIdx;
  }

  const totalPoints = routeGeometry.length;
  const result: DayPlan[] = [];

  for (let d = 0; d < days; d++) {
    const plan = dayPlans[d];
    const segStart = d === 0 ? 0 : dayPlans[d - 1].lastRouteIdx;
    const segEnd = d === days - 1 ? totalPoints - 1 : plan.lastRouteIdx;
    const dist = geometrySegmentDistance(routeGeometry, segStart, Math.max(segStart, segEnd));

    const lastQuest = plan.quests.length > 0 ? plan.quests[plan.quests.length - 1] : null;
    const overnight: RoutePoint | undefined =
      d < days - 1 && lastQuest
        ? { lat: lastQuest.lat, lng: lastQuest.lng, name: lastQuest.title }
        : d < days - 1
          ? { lat: routeGeometry[Math.min(segEnd, totalPoints - 1)][0], lng: routeGeometry[Math.min(segEnd, totalPoints - 1)][1], name: `Day ${d + 1} stop` }
          : undefined;

    result.push({
      day: d + 1,
      quests: plan.quests,
      overnightLocation: overnight,
      distanceKm: Math.round(dist),
      durationMinutes: Math.round((dist / 80) * 60),
    });
  }

  return result;
}
