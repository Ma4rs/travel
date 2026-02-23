import { NextRequest, NextResponse } from "next/server";
import { generateQuestsForRoute } from "@/lib/quest-generator";
import type { QuestCategory } from "@/types";

export const maxDuration = 60;

const VALID_CATEGORIES: QuestCategory[] = [
  "hidden_gem", "scenic", "food", "history",
  "photo_spot", "weird", "nature", "culture",
];

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && v >= -90 && v <= 90;
}

function isValidLng(v: unknown): v is number {
  return typeof v === "number" && v >= -180 && v <= 180;
}

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

    if (!isValidLat(originLat) || !isValidLng(originLng)) {
      return NextResponse.json(
        { error: "Invalid origin coordinates" },
        { status: 400 }
      );
    }

    if (!isValidLat(destLat) || !isValidLng(destLng)) {
      return NextResponse.json(
        { error: "Invalid destination coordinates" },
        { status: 400 }
      );
    }

    const detour = typeof maxDetourMinutes === "number"
      ? Math.min(120, Math.max(1, maxDetourMinutes))
      : 30;

    const validInterests = Array.isArray(interests)
      ? interests.filter((i: string) => VALID_CATEGORIES.includes(i as QuestCategory))
      : [];

    const oName = typeof originName === "string" ? originName.slice(0, 200) : "Origin";
    const dName = typeof destName === "string" ? destName.slice(0, 200) : "Destination";

    const result = await generateQuestsForRoute(
      originLat,
      originLng,
      oName,
      destLat,
      destLng,
      dName,
      validInterests as QuestCategory[],
      detour
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
