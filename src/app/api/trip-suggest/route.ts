import { NextRequest, NextResponse } from "next/server";
import { generateTripSuggestions } from "@/lib/gemini";
import type { QuestCategory } from "@/types";

const VALID_CATEGORIES: QuestCategory[] = [
  "hidden_gem", "scenic", "food", "history",
  "photo_spot", "weird", "nature", "culture",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startLocation, budget, days, interests } = body;

    if (typeof startLocation !== "string" || !startLocation.trim()) {
      return NextResponse.json(
        { error: "startLocation is required" },
        { status: 400 }
      );
    }

    if (startLocation.length > 200) {
      return NextResponse.json(
        { error: "startLocation too long (max 200 characters)" },
        { status: 400 }
      );
    }

    const validBudget = typeof budget === "number"
      ? Math.min(100000, Math.max(1, budget))
      : 500;

    const validDays = typeof days === "number"
      ? Math.min(30, Math.max(1, Math.round(days)))
      : 3;

    const validInterests = Array.isArray(interests)
      ? interests.filter((i: string) => VALID_CATEGORIES.includes(i as QuestCategory))
      : [];

    const suggestions = await generateTripSuggestions(
      startLocation.trim().slice(0, 200),
      validBudget,
      validDays,
      validInterests as QuestCategory[]
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Trip suggestion failed:", error);
    return NextResponse.json(
      { error: "Failed to generate trip suggestions" },
      { status: 500 }
    );
  }
}
