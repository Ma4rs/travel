import { NextRequest, NextResponse } from "next/server";
import { generateQuestsForRoute } from "@/lib/quest-generator";
import type { QuestCategory } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originLat,
      originLng,
      originName,
      destLat,
      destLng,
      destName,
      interests,
      maxDetourMinutes,
    } = body;

    if (originLat == null || originLng == null || destLat == null || destLng == null) {
      return NextResponse.json(
        { error: "Origin and destination coordinates required" },
        { status: 400 }
      );
    }

    const result = await generateQuestsForRoute(
      originLat,
      originLng,
      originName || "Origin",
      destLat,
      destLng,
      destName || "Destination",
      Array.isArray(interests) ? (interests as QuestCategory[]) : [],
      maxDetourMinutes || 30
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Quest generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate quests" },
      { status: 500 }
    );
  }
}
