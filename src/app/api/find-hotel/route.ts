import { NextRequest, NextResponse } from "next/server";
import { findBestHotelNear } from "@/lib/hotels";

export async function POST(request: NextRequest) {
  try {
    const { lat, lng, regionName } = await request.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const name = typeof regionName === "string" ? regionName : "Germany";
    const hotel = await findBestHotelNear(lat, lng, name);

    return NextResponse.json({ hotel: hotel ?? null });
  } catch (error) {
    console.error("Hotel search failed:", error);
    return NextResponse.json({ hotel: null });
  }
}
