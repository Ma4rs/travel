import { NextRequest, NextResponse } from "next/server";
import { findHotelsNearWithPrices } from "@/lib/hotels";

export async function POST(request: NextRequest) {
  try {
    const { lat, lng, regionName, limit } = await request.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const name = typeof regionName === "string" ? regionName : "Germany";
    const max = typeof limit === "number" && limit > 0 ? Math.min(limit, 10) : 5;
    const hotels = await findHotelsNearWithPrices(lat, lng, name, max);

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error("Hotel search failed:", error);
    return NextResponse.json({ hotels: [] });
  }
}
