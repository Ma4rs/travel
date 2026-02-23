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
  return findPOIsAlongRoute([[lat, lng]], radiusMeters);
}

export async function findPOIsAlongRoute(
  samplePoints: [number, number][],
  radiusMeters: number = 10000
): Promise<POI[]> {
  if (samplePoints.length === 0) return [];

  // Build a single Overpass query that covers ALL sample points at once
  const aroundClauses = samplePoints
    .map(([lat, lng]) => `(around:${radiusMeters},${lat},${lng})`)
    .join("");

  const queries = POI_TYPES.map(
    (type) => `${type}${aroundClauses};`
  ).join("\n");

  const overpassQuery = `
    [out:json][timeout:30];
    (
      ${queries}
    );
    out center 40;
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
