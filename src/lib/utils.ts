import type { RoutePoint, Quest } from "@/types";

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildGoogleMapsUrl(
  origin: RoutePoint,
  destination: RoutePoint,
  quests: Quest[]
): string {
  const base = "https://www.google.com/maps/dir/";
  const waypoints = [
    `${origin.lat},${origin.lng}`,
    ...quests.map((q) => `${q.lat},${q.lng}`),
    `${destination.lat},${destination.lng}`,
  ];
  return base + waypoints.join("/");
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}min`;
}

export function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}

export function formatDistance(meters: number): string {
  return `${Math.round(meters / 1000)} km`;
}
