import type { RoutePoint } from "@/types";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export async function geocode(query: string): Promise<RoutePoint[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;

  const res = await fetch(url, {
    headers: { "User-Agent": "TravelGuide/1.0" },
  });

  if (!res.ok) throw new Error("Geocoding failed");

  const data: NominatimResult[] = await res.json();

  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    name: r.display_name.split(",").slice(0, 2).join(",").trim(),
  }));
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

  const res = await fetch(url, {
    headers: { "User-Agent": "TravelGuide/1.0" },
  });

  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  const data = await res.json();
  return (
    data.display_name?.split(",").slice(0, 2).join(",").trim() ||
    `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  );
}
