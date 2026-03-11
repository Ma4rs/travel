import { NextRequest, NextResponse } from "next/server";
import { getRoute, sampleRoutePoints } from "@/lib/osrm";
import { findHotelsNearWithPrices } from "@/lib/hotels";
import { ALL_QUESTS } from "@/data/regions";
import type { QuestCategory, Quest, ItineraryDay, TransportMode, FuelType, Hotel } from "@/types";

export const maxDuration = 60;

const FUEL_CONSUMPTION: Record<FuelType, number> = { petrol: 7.0, diesel: 5.5, electric: 20.0 };
const FUEL_PRICE: Record<FuelType, number> = { petrol: 1.75, diesel: 1.65, electric: 0.35 };
const TRAIN_COST_PER_KM = 0.15;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findQuestsAlongGeometry(
  geometry: [number, number][],
  interests: QuestCategory[],
  maxDetourKm: number = 30
): Quest[] {
  const sample = sampleRoutePoints(geometry, 5);
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
      let minDist = Infinity;
      for (const [lat, lng] of sample) {
        const d = haversineKm(q.lat, q.lng, lat, lng);
        if (d < minDist) minDist = d;
      }
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        lat: q.lat,
        lng: q.lng,
        detourMinutes: Math.round(minDist),
        xp: q.xp,
        visitMinutes: q.visitMinutes,
      } satisfies Quest;
    })
    .filter((q) => q.detourMinutes <= maxDetourKm)
    .sort((a, b) => a.detourMinutes - b.detourMinutes);
}

const DEFAULT_VISIT_MINUTES: Record<string, number> = {
  activity: 240,
  food: 60,
  scenic: 30,
  photo_spot: 20,
  hidden_gem: 45,
  history: 45,
  nature: 60,
  culture: 60,
  weird: 30,
};

function getVisitMinutes(quest: Quest): number {
  return quest.visitMinutes ?? DEFAULT_VISIT_MINUTES[quest.category] ?? 45;
}

const DAY_BUDGET_MINUTES = 480; // 8 hours of activities per day

function fitQuestsIntoDays(quests: Quest[], numDays: number): Quest[][] {
  if (numDays <= 0) return [];
  const days: Quest[][] = Array.from({ length: numDays }, () => []);
  const dayTime: number[] = new Array(numDays).fill(0);

  for (const quest of quests) {
    const visit = getVisitMinutes(quest);
    let bestDay = 0;
    let bestTime = dayTime[0];
    for (let d = 0; d < numDays; d++) {
      if (dayTime[d] < bestTime) {
        bestDay = d;
        bestTime = dayTime[d];
      }
    }
    if (dayTime[bestDay] + visit <= DAY_BUDGET_MINUTES || days[bestDay].length === 0) {
      days[bestDay].push(quest);
      dayTime[bestDay] += visit;
    }
  }
  return days;
}

function findClosestGeometryIndex(lat: number, lng: number, geometry: [number, number][]): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < geometry.length; i++) {
    const d = (geometry[i][0] - lat) ** 2 + (geometry[i][1] - lng) ** 2;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

function segmentDistance(geometry: [number, number][], from: number, to: number): number {
  let dist = 0;
  for (let i = from; i < to && i < geometry.length - 1; i++) {
    dist += haversineKm(geometry[i][0], geometry[i][1], geometry[i + 1][0], geometry[i + 1][1]);
  }
  return dist;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originLat, originLng, originName,
      destLat, destLng, destName,
      days, interests, transportMode, fuelType,
      hasDeutschlandticket, isRoundTrip, fuelConsumption,
    } = body;

    if (!originLat || !destLat) {
      return NextResponse.json({ error: "Origin and destination required" }, { status: 400 });
    }

    const validDays = Math.min(14, Math.max(1, Math.round(days || 3)));
    const validInterests: QuestCategory[] = Array.isArray(interests) ? interests : [];
    const validTransport: TransportMode = transportMode === "train" ? "train" : "car";
    const validFuel: FuelType = fuelType === "diesel" ? "diesel" : fuelType === "electric" ? "electric" : "petrol";
    const roundTrip = isRoundTrip !== false;

    const DEST_EXCLUSION_RADIUS_KM = 50;
    const DEST_SEARCH_RADIUS_KM = 100;
    // Calculate routes
    const outbound = await getRoute(originLat, originLng, destLat, destLng);
    let returnRoute: { geometry: [number, number][]; distance: number; duration: number } | null = null;
    if (roundTrip) {
      returnRoute = await getRoute(destLat, destLng, originLat, originLng);
    }

    // Split days
    const outboundDays = roundTrip
      ? Math.max(1, Math.floor(validDays / 3))
      : Math.max(1, Math.floor(validDays / 2));
    const returnDays = roundTrip
      ? Math.min(Math.max(1, Math.floor(validDays / 3)), validDays - outboundDays)
      : 0;
    const destDays = Math.max(0, validDays - outboundDays - returnDays);

    const usedIds = new Set<string>();

    // ── Phase 1: Outbound quests (along the route, EXCLUDING destination area) ──
    const allOutboundQuests = findQuestsAlongGeometry(outbound.geometry, validInterests);
    const outboundOnly = allOutboundQuests.filter(
      (q) => haversineKm(q.lat, q.lng, destLat, destLng) > DEST_EXCLUSION_RADIUS_KM
    );
    const sortedOutbound = [...outboundOnly].sort((a, b) =>
      findClosestGeometryIndex(a.lat, a.lng, outbound.geometry) -
      findClosestGeometryIndex(b.lat, b.lng, outbound.geometry)
    );
    sortedOutbound.forEach((q) => usedIds.add(q.id));

    // ── Phase 2: Destination quests (within 100km of destination) ──
    const destQuests = ALL_QUESTS
      .filter((q) => {
        if (usedIds.has(q.id)) return false;
        const dist = haversineKm(q.lat, q.lng, destLat, destLng);
        if (dist > DEST_SEARCH_RADIUS_KM) return false;
        if (validInterests.length > 0 && !validInterests.includes(q.category)) return false;
        return true;
      })
      .map((q) => ({
        id: q.id, title: q.title, description: q.description,
        category: q.category, lat: q.lat, lng: q.lng,
        detourMinutes: Math.round(haversineKm(q.lat, q.lng, destLat, destLng)),
        xp: q.xp,
        visitMinutes: q.visitMinutes,
      }))
      .sort((a, b) => a.detourMinutes - b.detourMinutes);
    destQuests.forEach((q) => usedIds.add(q.id));

    // ── Phase 3: Return quests (along return route, EXCLUDING destination area) ──
    let sortedReturn: Quest[] = [];
    if (roundTrip && returnRoute) {
      const allReturnQuests = findQuestsAlongGeometry(returnRoute.geometry, validInterests);
      const returnOnly = allReturnQuests.filter(
        (q) => !usedIds.has(q.id) && haversineKm(q.lat, q.lng, destLat, destLng) > DEST_EXCLUSION_RADIUS_KM
      );
      sortedReturn = [...returnOnly].sort((a, b) =>
        findClosestGeometryIndex(a.lat, a.lng, returnRoute!.geometry) -
        findClosestGeometryIndex(b.lat, b.lng, returnRoute!.geometry)
      );
    }

    // ── Build itinerary ──
    const itinerary: ItineraryDay[] = [];
    const destLabel = destName || "destination";

    // Outbound days — time-aware assignment
    const outboundDistPerDay = (outbound.distance / 1000) / outboundDays;
    const outboundDurPerDay = (outbound.duration / 60) / outboundDays;
    const outGeoLen = outbound.geometry.length;
    const outGeoPerDay = Math.max(1, Math.ceil(outGeoLen / outboundDays));
    const outboundByDay = fitQuestsIntoDays(sortedOutbound, outboundDays);

    for (let d = 0; d < outboundDays; d++) {
      const dayQuests = outboundByDay[d];
      const isLastOutbound = d === outboundDays - 1;
      const lastQuest = dayQuests.length > 0 ? dayQuests[dayQuests.length - 1] : null;
      const overnightLat = isLastOutbound ? destLat : lastQuest?.lat ?? outbound.geometry[Math.min((d + 1) * outGeoPerDay - 1, outGeoLen - 1)][0];
      const overnightLng = isLastOutbound ? destLng : lastQuest?.lng ?? outbound.geometry[Math.min((d + 1) * outGeoPerDay - 1, outGeoLen - 1)][1];

      let hotel: Hotel | undefined = undefined;
      let hotelOptions: Hotel[] = [];
      if (d + 1 < validDays) {
        const options = await findHotelsNearWithPrices(overnightLat, overnightLng, destLabel, 5);
        hotelOptions = options;
        hotel = options[0];
      }

      itinerary.push({
        day: d + 1,
        label: outboundDays === 1 ? `Travel to ${destLabel}` : `Travel day ${d + 1}`,
        quests: dayQuests,
        hotel,
        hotelOptions: hotelOptions.length > 0 ? hotelOptions : undefined,
        distanceKm: Math.round(outboundDistPerDay),
        durationMinutes: Math.round(outboundDurPerDay),
        isReturnDay: false,
      });
    }

    // Destination days — time-aware assignment
    const destByDay = fitQuestsIntoDays(destQuests, destDays);

    for (let d = 0; d < destDays; d++) {
      const dayQuests = destByDay[d] ?? [];
      const dayNum = outboundDays + d + 1;
      const lastDestQuest = dayQuests.length > 0 ? dayQuests[dayQuests.length - 1] : null;

      let hotel: Hotel | undefined = undefined;
      let hotelOptions: Hotel[] = [];
      if (dayNum < validDays) {
        const options = await findHotelsNearWithPrices(
          lastDestQuest?.lat ?? destLat,
          lastDestQuest?.lng ?? destLng,
          destLabel, 5
        );
        hotelOptions = options;
        hotel = options[0];
      }

      itinerary.push({
        day: dayNum,
        label: `Explore ${destLabel}`,
        quests: dayQuests,
        hotel,
        hotelOptions: hotelOptions.length > 0 ? hotelOptions : undefined,
        distanceKm: 0,
        durationMinutes: 0,
        isReturnDay: false,
      });
    }

    // Return days
    if (roundTrip && returnRoute) {
      const returnDistPerDay = (returnRoute.distance / 1000) / returnDays;
      const returnDurPerDay = (returnRoute.duration / 60) / returnDays;
      const retGeo = returnRoute.geometry;
      const retGeoPerDay = retGeo.length > 0 ? Math.max(1, Math.ceil(retGeo.length / returnDays)) : 1;
      const returnByDay = fitQuestsIntoDays(sortedReturn, returnDays);

      for (let d = 0; d < returnDays; d++) {
        const dayQuests = returnByDay[d] ?? [];
        const dayNum = outboundDays + destDays + d + 1;
        const isLastDay = dayNum === validDays;

        let hotel: Hotel | undefined = undefined;
        let hotelOptions: Hotel[] = [];
        if (!isLastDay) {
          const lastRetQuest = dayQuests.length > 0 ? dayQuests[dayQuests.length - 1] : null;
          const searchLat = lastRetQuest?.lat ?? (retGeo.length > 0 ? retGeo[Math.min((d + 1) * retGeoPerDay - 1, retGeo.length - 1)][0] : 0);
          const searchLng = lastRetQuest?.lng ?? (retGeo.length > 0 ? retGeo[Math.min((d + 1) * retGeoPerDay - 1, retGeo.length - 1)][1] : 0);
          if (searchLat !== 0) {
            const options = await findHotelsNearWithPrices(searchLat, searchLng, "Germany", 5);
            hotelOptions = options;
            hotel = options[0];
          }
        }

        itinerary.push({
          day: dayNum,
          label: isLastDay ? "Head home" : `Return day ${d + 1}`,
          quests: dayQuests,
          hotel,
          hotelOptions: hotelOptions.length > 0 ? hotelOptions : undefined,
          distanceKm: Math.round(returnDistPerDay),
          durationMinutes: Math.round(returnDurPerDay),
          isReturnDay: true,
        });
      }
    }

    // Cost calculation
    const totalDistanceKm = Math.round(
      outbound.distance / 1000 + (returnRoute ? returnRoute.distance / 1000 : 0)
    );
    const totalDurationMin = Math.round(
      outbound.duration / 60 + (returnRoute ? returnRoute.duration / 60 : 0)
    );

    const consumption = (typeof fuelConsumption === "number" && fuelConsumption > 0)
      ? fuelConsumption
      : FUEL_CONSUMPTION[validFuel];
    const fuelCostPerKm = validTransport === "train"
      ? TRAIN_COST_PER_KM
      : (consumption / 100) * FUEL_PRICE[validFuel];
    const transportCost = (validTransport === "train" && hasDeutschlandticket)
      ? 0
      : Math.round(totalDistanceKm * fuelCostPerKm);

    const accommodationCost = itinerary
      .filter((d) => d.hotel)
      .reduce((sum, d) => sum + (d.hotel?.estimatedPrice ?? 60), 0);

    return NextResponse.json({
      id: crypto.randomUUID(),
      title: `${originName || "Start"} → ${destName || "Destination"}`,
      origin: { lat: originLat, lng: originLng, name: originName || "" },
      destination: { lat: destLat, lng: destLng, name: destName || "" },
      days: validDays,
      itinerary,
      outboundGeometry: outbound.geometry,
      returnGeometry: returnRoute?.geometry ?? [],
      totalDistance: totalDistanceKm,
      totalDuration: totalDurationMin,
      estimatedCost: transportCost + accommodationCost,
      transportCost,
      accommodationCost,
      transportMode: validTransport,
      isRoundTrip: roundTrip,
    });
  } catch (error) {
    console.error("Itinerary generation failed:", error);
    return NextResponse.json({ error: "Failed to generate itinerary" }, { status: 500 });
  }
}
