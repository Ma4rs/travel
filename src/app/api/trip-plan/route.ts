import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/geocode";
import { planTrips } from "@/lib/trip-planner";
import type { QuestCategory, TransportMode, FuelType } from "@/types";

const VALID_CATEGORIES: QuestCategory[] = [
  "hidden_gem", "scenic", "food", "history",
  "photo_spot", "weird", "nature", "culture", "activity",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startLocation, minBudget, maxBudget, days, interests, transportMode, hasDeutschlandticket, fuelType, isRoundTrip, fuelConsumption } = body;

    if (typeof startLocation !== "string" || !startLocation.trim()) {
      return NextResponse.json(
        { error: "startLocation is required" },
        { status: 400 }
      );
    }

    if (startLocation.length > 200) {
      return NextResponse.json(
        { error: "startLocation too long" },
        { status: 400 }
      );
    }

    const validMinBudget = typeof minBudget === "number" && Number.isFinite(minBudget)
      ? Math.max(0, minBudget)
      : 0;
    const validMaxBudget = typeof maxBudget === "number" && Number.isFinite(maxBudget)
      ? Math.min(100000, Math.max(validMinBudget, maxBudget))
      : 500;
    const validFuelConsumption = typeof fuelConsumption === "number" && Number.isFinite(fuelConsumption) && fuelConsumption > 0
      ? fuelConsumption
      : undefined;

    const validDays = typeof days === "number"
      ? Math.min(14, Math.max(1, Math.round(days)))
      : 3;

    const validInterests = Array.isArray(interests)
      ? interests.filter((i: string) => VALID_CATEGORIES.includes(i as QuestCategory))
      : [];

    const validTransportMode: TransportMode =
      transportMode === "train" ? "train" : "car";

    const validFuelType: FuelType =
      fuelType === "diesel" ? "diesel" : fuelType === "electric" ? "electric" : "petrol";

    const validHasDeutschlandticket =
      typeof hasDeutschlandticket === "boolean" ? hasDeutschlandticket : false;

    const locations = await geocode(startLocation.trim());

    if (locations.length === 0) {
      return NextResponse.json(
        { error: "Could not find that location. Try a different search." },
        { status: 400 }
      );
    }

    const start = locations[0];

    const validRoundTrip = typeof isRoundTrip === "boolean" ? isRoundTrip : true;

    const suggestions = await planTrips(
      start.lat,
      start.lng,
      validMinBudget,
      validMaxBudget,
      validDays,
      validInterests as QuestCategory[],
      validTransportMode,
      validHasDeutschlandticket,
      validFuelType,
      validRoundTrip,
      validFuelConsumption
    );

    return NextResponse.json({ suggestions, startPoint: start });
  } catch (error) {
    console.error("Trip planning failed:", error);
    return NextResponse.json(
      { error: "Failed to plan trip" },
      { status: 500 }
    );
  }
}
