import { NextRequest, NextResponse } from "next/server";
import { getRoute, sampleRoutePoints } from "@/lib/osrm";
import { findBestHotelNear } from "@/lib/hotels";
import { ALL_QUESTS } from "@/data/regions";
import type { QuestCategory, Quest, ItineraryDay, TransportMode, FuelType } from "@/types";

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
      } satisfies Quest;
    })
    .filter((q) => q.detourMinutes <= maxDetourKm)
    .sort((a, b) => a.detourMinutes - b.detourMinutes);
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
      hasDeutschlandticket, isRoundTrip,
    } = body;

    if (!originLat || !destLat) {
      return NextResponse.json({ error: "Origin and destination required" }, { status: 400 });
    }

    const validDays = Math.min(14, Math.max(1, Math.round(days || 3)));
    const validInterests: QuestCategory[] = Array.isArray(interests) ? interests : [];
    const validTransport: TransportMode = transportMode === "train" ? "train" : "car";
    const validFuel: FuelType = fuelType === "diesel" ? "diesel" : fuelType === "electric" ? "electric" : "petrol";
    const roundTrip = isRoundTrip !== false;

    // Calculate outbound route
    const outbound = await getRoute(originLat, originLng, destLat, destLng);
    const outboundQuests = findQuestsAlongGeometry(outbound.geometry, validInterests);

    // Calculate return route if round trip
    let returnRoute: { geometry: [number, number][]; distance: number; duration: number } | null = null;
    let returnQuests: Quest[] = [];
    if (roundTrip) {
      returnRoute = await getRoute(destLat, destLng, originLat, originLng);
      const usedIds = new Set(outboundQuests.map((q) => q.id));
      returnQuests = findQuestsAlongGeometry(returnRoute.geometry, validInterests)
        .filter((q) => !usedIds.has(q.id));
    }

    // Split days: outbound days, destination days, return days
    const outboundDays = roundTrip ? Math.max(1, Math.floor(validDays / 3)) : Math.max(1, Math.floor(validDays / 2));
    const returnDays = roundTrip ? Math.max(1, Math.floor(validDays / 3)) : 0;
    const destDays = validDays - outboundDays - returnDays;

    // Assign quests to outbound segments
    const sortedOutbound = [...outboundQuests].sort((a, b) =>
      findClosestGeometryIndex(a.lat, a.lng, outbound.geometry) -
      findClosestGeometryIndex(b.lat, b.lng, outbound.geometry)
    );

    const questsPerOutboundDay = Math.ceil(sortedOutbound.length / Math.max(1, outboundDays));
    const sortedReturn = [...returnQuests].sort((a, b) =>
      findClosestGeometryIndex(a.lat, a.lng, returnRoute?.geometry ?? []) -
      findClosestGeometryIndex(b.lat, b.lng, returnRoute?.geometry ?? [])
    );
    const questsPerReturnDay = returnDays > 0 ? Math.ceil(sortedReturn.length / returnDays) : 0;

    // Build itinerary days
    const itinerary: ItineraryDay[] = [];
    const outboundDistPerDay = (outbound.distance / 1000) / outboundDays;
    const outboundDurPerDay = (outbound.duration / 60) / outboundDays;
    const totalGeoPoints = outbound.geometry.length;
    const geoPerDay = Math.ceil(totalGeoPoints / outboundDays);

    // Find hotels for overnight stops
    for (let d = 0; d < outboundDays; d++) {
      const dayQuests = sortedOutbound.slice(d * questsPerOutboundDay, (d + 1) * questsPerOutboundDay);
      const isLast = d === outboundDays - 1 && destDays > 0;

      // Overnight location: end of this day's segment (or destination)
      const segEnd = Math.min((d + 1) * geoPerDay - 1, totalGeoPoints - 1);
      const overnightLat = isLast ? destLat : outbound.geometry[segEnd][0];
      const overnightLng = isLast ? destLng : outbound.geometry[segEnd][1];

      let hotel = undefined;
      if (d < validDays - 1) {
        hotel = await findBestHotelNear(overnightLat, overnightLng, destName || "Germany");
      }

      itinerary.push({
        day: d + 1,
        label: outboundDays === 1 ? "Travel to destination" : `Outbound day ${d + 1}`,
        quests: dayQuests,
        hotel,
        distanceKm: Math.round(outboundDistPerDay),
        durationMinutes: Math.round(outboundDurPerDay),
        isReturnDay: false,
      });
    }

    // Destination days (explore, no driving)
    const destQuests = ALL_QUESTS
      .filter((q) => {
        const dist = haversineKm(q.lat, q.lng, destLat, destLng);
        if (dist > 20) return false;
        if (validInterests.length > 0 && !validInterests.includes(q.category)) return false;
        const usedIds = new Set(sortedOutbound.map((oq) => oq.id));
        return !usedIds.has(q.id);
      })
      .map((q) => ({
        id: q.id, title: q.title, description: q.description,
        category: q.category, lat: q.lat, lng: q.lng,
        detourMinutes: 0, xp: q.xp,
      }));

    const questsPerDestDay = destDays > 0 ? Math.ceil(destQuests.length / destDays) : 0;

    for (let d = 0; d < destDays; d++) {
      const dayQuests = destQuests.slice(d * questsPerDestDay, (d + 1) * questsPerDestDay);
      const dayNum = outboundDays + d + 1;

      let hotel = undefined;
      if (dayNum < validDays) {
        hotel = await findBestHotelNear(destLat, destLng, destName || "Germany");
      }

      itinerary.push({
        day: dayNum,
        label: `Exploring ${destName || "destination"}`,
        quests: dayQuests,
        hotel,
        distanceKm: 0,
        durationMinutes: 0,
        isReturnDay: false,
      });
    }

    // Return days
    if (roundTrip && returnRoute) {
      const returnDistPerDay = (returnRoute.distance / 1000) / returnDays;
      const returnDurPerDay = (returnRoute.duration / 60) / returnDays;

      for (let d = 0; d < returnDays; d++) {
        const dayQuests = sortedReturn.slice(d * questsPerReturnDay, (d + 1) * questsPerReturnDay);
        const dayNum = outboundDays + destDays + d + 1;
        const isLastDay = dayNum === validDays;

        let hotel = undefined;
        if (!isLastDay) {
          const retGeo = returnRoute.geometry;
          const retGeoPerDay = Math.ceil(retGeo.length / returnDays);
          const segEnd = Math.min((d + 1) * retGeoPerDay - 1, retGeo.length - 1);
          hotel = await findBestHotelNear(retGeo[segEnd][0], retGeo[segEnd][1], "Germany");
        }

        itinerary.push({
          day: dayNum,
          label: isLastDay ? "Return home" : `Return day ${d + 1}`,
          quests: dayQuests,
          hotel,
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

    const fuelCostPerKm = validTransport === "train"
      ? TRAIN_COST_PER_KM
      : (FUEL_CONSUMPTION[validFuel] / 100) * FUEL_PRICE[validFuel];
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
