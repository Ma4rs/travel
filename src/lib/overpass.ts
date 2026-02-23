import { fetchWithRetry } from "./retry";

export interface POI {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: string;
  tags: Record<string, string>;
}

const POI_TYPES = [
  `nwr["tourism"~"viewpoint|museum|castle|artwork|attraction"]`,
  `nwr["amenity"~"restaurant|cafe|pub"]["cuisine"]`,
  `nwr["natural"~"peak|waterfall|spring|cave_entrance|beach"]`,
  `nwr["historic"~"castle|monument|memorial|ruins|archaeological_site"]`,
  `nwr["amenity"~"theatre|arts_centre|library"]["name"]`,
];

export async function findPOIsNearPoint(
  lat: number,
  lng: number,
  radiusMeters: number = 10000
): Promise<POI[]> {
  const deg = radiusMeters / 111000;
  return findPOIsInBbox(lat - deg, lng - deg, lat + deg, lng + deg);
}

export async function findPOIsAlongRoute(
  samplePoints: [number, number][],
  _radiusMeters: number = 10000
): Promise<POI[]> {
  if (samplePoints.length === 0) return [];

  // Compute bounding box of the route with padding
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const [lat, lng] of samplePoints) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // Add ~10km padding (roughly 0.09 degrees)
  const pad = 0.09;
  return findPOIsInBbox(minLat - pad, minLng - pad, maxLat + pad, maxLng + pad);
}

async function findPOIsInBbox(
  south: number,
  west: number,
  north: number,
  east: number
): Promise<POI[]> {
  const bbox = `${south},${west},${north},${east}`;

  const statements = POI_TYPES.map(
    (type) => `${type}(${bbox});`
  ).join("\n      ");

  const overpassQuery = `
    [out:json][timeout:20];
    (
      ${statements}
    );
    out center 50;
  `;

  const res = await fetchWithRetry(
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (!res.ok) throw new Error("Overpass API request failed");

  const data = await res.json();

  if (!data.elements || !Array.isArray(data.elements)) return [];

  const seenIds = new Set<number>();

  return data.elements
    .filter((el: { id: number; tags?: { name?: string } }) => {
      if (!el.tags?.name || seenIds.has(el.id)) return false;
      seenIds.add(el.id);
      return true;
    })
    .map(
      (el: {
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags: Record<string, string>;
      }) => ({
        id: el.id,
        lat: el.lat ?? el.center?.lat ?? 0,
        lng: el.lon ?? el.center?.lon ?? 0,
        name: el.tags.name,
        type: detectPOIType(el.tags),
        tags: el.tags,
      })
    )
    .filter((poi: POI) => poi.lat !== 0 && poi.lng !== 0);
}

function detectPOIType(tags: Record<string, string>): string {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return tags.historic;
  if (tags.natural) return tags.natural;
  if (tags.amenity) return tags.amenity;
  return "unknown";
}
