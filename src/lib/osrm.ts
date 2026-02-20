import { fetchWithRetry } from "./retry";

interface OSRMRouteResponse {
  routes: {
    geometry: {
      coordinates: [number, number][];
    };
    distance: number;
    duration: number;
  }[];
}

export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{
  geometry: [number, number][];
  distance: number;
  duration: number;
}> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error("Failed to fetch route from OSRM");

  const data: OSRMRouteResponse = await res.json();
  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found between the given points");
  }
  const route = data.routes[0];

  return {
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
  };
}

export function sampleRoutePoints(
  geometry: [number, number][],
  intervalKm: number = 15
): [number, number][] {
  if (geometry.length === 0) return [];

  const points: [number, number][] = [geometry[0]];
  let accumulatedDistance = 0;

  for (let i = 1; i < geometry.length; i++) {
    const dist = haversineDistance(geometry[i - 1], geometry[i]);
    accumulatedDistance += dist;

    if (accumulatedDistance >= intervalKm) {
      points.push(geometry[i]);
      accumulatedDistance = 0;
    }
  }

  const last = geometry[geometry.length - 1];
  const lastSampled = points[points.length - 1];
  if (last[0] !== lastSampled[0] || last[1] !== lastSampled[1]) {
    points.push(last);
  }

  return points;
}

function haversineDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
