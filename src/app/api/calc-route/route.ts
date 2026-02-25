import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/retry";

const MAX_WAYPOINTS = 25;

interface RoutePoint {
  lat: number;
  lng: number;
}

function isValidCoord(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, waypoints } = body;

    if (
      !origin || !destination ||
      !isValidCoord(origin.lat) || !isValidCoord(origin.lng) ||
      !isValidCoord(destination.lat) || !isValidCoord(destination.lng)
    ) {
      return NextResponse.json(
        { error: "Invalid origin or destination" },
        { status: 400 }
      );
    }

    if (!Array.isArray(waypoints)) {
      return NextResponse.json(
        { error: "waypoints must be an array" },
        { status: 400 }
      );
    }

    if (waypoints.length > MAX_WAYPOINTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_WAYPOINTS} waypoints allowed` },
        { status: 400 }
      );
    }

    const validWaypoints: RoutePoint[] = waypoints.filter(
      (w: { lat?: unknown; lng?: unknown }) =>
        isValidCoord(w.lat) && isValidCoord(w.lng)
    );

    const points = [
      origin,
      ...validWaypoints,
      destination,
    ];

    const coords = points
      .map((p: RoutePoint) => `${p.lng},${p.lat}`)
      .join(";");

    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to calculate route" },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: "No route found" },
        { status: 404 }
      );
    }

    const route = data.routes[0];

    return NextResponse.json({
      geometry: route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      ),
      distance: route.distance,
      duration: route.duration,
    });
  } catch (error) {
    console.error("Route calculation failed:", error);
    return NextResponse.json(
      { error: "Route calculation failed" },
      { status: 500 }
    );
  }
}
