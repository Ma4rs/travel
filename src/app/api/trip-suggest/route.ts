import { NextRequest, NextResponse } from "next/server";
import { generateTripSuggestions } from "@/lib/gemini";
import type { QuestCategory } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startLocation, budget, days, interests } = body;

    if (!startLocation || !budget || !days) {
      return NextResponse.json(
        { error: "startLocation, budget, and days are required" },
        { status: 400 }
      );
    }

    const suggestions = await generateTripSuggestions(
      startLocation,
      budget,
      days,
      (interests as QuestCategory[]) || []
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
