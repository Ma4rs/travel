import { NextRequest, NextResponse } from "next/server";
import { geocode } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  if (query.length > 200) {
    return NextResponse.json({ error: "Query too long (max 200 characters)" }, { status: 400 });
  }

  try {
    const results = await geocode(query);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
