import { REGIONS } from "@/data/regions";
import type { QuestCategory, TransportMode, FuelType } from "@/types";

export interface TripSuggestion {
  title: string;
  destination: string;
  description: string;
  questCount: number;
  totalXP: number;
  estimatedCost: number;
  transportCost: number;
  accommodationCost: number;
  drivingDistanceKm: number;
  highlights: string[];
  center: [number, number];
  transportMode: TransportMode;
  hasDeutschlandticket: boolean;
  fuelType: FuelType;
}

const FUEL_CONSUMPTION: Record<FuelType, number> = { petrol: 7.0, diesel: 5.5, electric: 20.0 };
const FUEL_PRICE: Record<FuelType, number> = { petrol: 1.75, diesel: 1.65, electric: 0.35 };
const TRAIN_COST_PER_KM = 0.15;
const ACCOMMODATION_PER_NIGHT = 60;

async function getDrivingDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM failed");
    const data = await res.json();
    if (data.routes?.[0]?.distance) {
      return data.routes[0].distance / 1000;
    }
  } catch {
    // Fall back to straight-line * 1.3
  }
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const straightLine = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return straightLine * 1.3;
}

export async function planTrips(
  startLat: number,
  startLng: number,
  budget: number,
  days: number,
  interests: QuestCategory[],
  transportMode: TransportMode,
  hasDeutschlandticket: boolean,
  fuelType: FuelType
): Promise<TripSuggestion[]> {
  const fuelCostPerKm =
    transportMode === "train"
      ? TRAIN_COST_PER_KM
      : (FUEL_CONSUMPTION[fuelType] / 100) * FUEL_PRICE[fuelType];

  const regionsWithQuests = REGIONS.map((region) => {
    const matchingQuests =
      interests.length > 0
        ? region.quests.filter((q) => interests.includes(q.category))
        : region.quests;

    const totalXP = matchingQuests.reduce((sum, q) => sum + q.xp, 0);
    const topQuests = [...matchingQuests]
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 4);

    return { region, matchingQuests, totalXP, topQuests };
  }).filter((r) => r.matchingQuests.length > 0);

  const distances = await Promise.all(
    regionsWithQuests.map((r) =>
      getDrivingDistanceKm(
        startLat,
        startLng,
        r.region.center[0],
        r.region.center[1]
      )
    )
  );

  const scored = regionsWithQuests.map((r, i) => {
    const drivingDistanceKm = Math.round(distances[i]);
    const roundTripKm = drivingDistanceKm * 2;

    const transportCost =
      transportMode === "train" && hasDeutschlandticket
        ? 0
        : Math.round(roundTripKm * fuelCostPerKm);
    const accommodationCost = Math.max(0, days - 1) * ACCOMMODATION_PER_NIGHT;
    const estimatedCost = transportCost + accommodationCost;

    const questNouns = r.matchingQuests.length === 1 ? "quest" : "quests";
    const description =
      r.matchingQuests.length > 0
        ? `Discover ${r.matchingQuests.length} ${questNouns} in ${r.region.name}. Highlights include ${r.topQuests
            .slice(0, 2)
            .map((q) => q.title)
            .join(" and ")}.`
        : `Explore ${r.region.name} and uncover its hidden treasures.`;

    return {
      title: `Explore ${r.region.name}`,
      destination: r.region.name,
      description,
      questCount: r.matchingQuests.length,
      totalXP: r.totalXP,
      estimatedCost,
      transportCost,
      accommodationCost,
      drivingDistanceKm,
      highlights: r.topQuests.map((q) => q.title),
      center: r.region.center,
      transportMode,
      hasDeutschlandticket,
      fuelType,
      score:
        r.matchingQuests.length * 10 +
        r.totalXP / 10 -
        drivingDistanceKm / 50,
      fitsbudget: estimatedCost <= budget,
    };
  });

  return scored
    .filter((s) => s.fitsbudget)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _s, fitsbudget: _f, ...rest }) => rest);
}
