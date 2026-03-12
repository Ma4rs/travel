import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { trip } = await request.json();
    if (!trip) return NextResponse.json({ error: "Missing trip data" }, { status: 400 });

    const shareId = crypto.randomUUID().slice(0, 8);

    const { error } = await supabase
      .from("saved_trips")
      .upsert({
        id: trip.id || crypto.randomUUID(),
        user_id: user.id,
        title: trip.title || "Shared Trip",
        trip_data: { ...trip, shareId },
      }, { onConflict: "id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ shareId });
  } catch (error) {
    console.error("Share trip failed:", error);
    return NextResponse.json({ error: "Failed to share trip" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get("id");
  if (!shareId) return NextResponse.json({ error: "Missing share ID" }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("saved_trips")
      .select("trip_data, title, created_at")
      .eq("trip_data->>shareId", shareId)
      .single();

    if (error) {
      console.error("Share trip GET error:", error);
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    if (!data) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    return NextResponse.json({
      trip: {
        ...data.trip_data,
        title: data.title,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    console.error("Share trip GET failed:", err);
    return NextResponse.json({ error: "Failed to load trip" }, { status: 500 });
  }
}
