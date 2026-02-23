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
  `node["tourism"~"viewpoint|museum|castle|artwork|attraction"]`,
  `node["amenity"~"restaurant|cafe|pub"]["cuisine"]`,
  `node["natural"~"peak|waterfall|spring|cave_entrance|beach"]`,
  `node["historic"~"castle|monument|memorial|ruins|archaeological_site"]`,
  `node["amenity"~"theatre|arts_centre|library"]["name"]`,
];

const MAX_SAMPLE_POINTS = 3;

export async function findPOIsNearPoint(
  lat: number,
  lng: number,
  radiusMeters: number = 10000
): Promise<POI[]> {
  return findPOIsAlongRoute([[lat, lng]], radiusMeters);
}

export async function findPOIsAlongRoute(
  samplePoints: [number, number][],
  radiusMeters: number = 8000
): Promise<POI[]> {
  if (samplePoints.length === 0) return [];

  // Limit sample points to keep the query fast
  const points = evenlyPickPoints(samplePoints, MAX_SAMPLE_POINTS);

  const statements: string[] = [];
  for (const type of POI_TYPES) {
    for (const [lat, lng] of points) {
      statements.push(`${type}(around:${radiusMeters},${lat},${lng});`);
    }
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${statements.join("\n      ")}
    );
    out body 30;
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
        lat: number;
        lon: number;
        tags: Record<string, string>;
      }) => ({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        name: el.tags.name,
        type: detectPOIType(el.tags),
        tags: el.tags,
      })
    );
}

function evenlyPickPoints(
  points: [number, number][],
  max: number
): [number, number][] {
  if (points.length <= max) return points;
  const result: [number, number][] = [points[0]];
  const step = (points.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) {
    result.push(points[Math.round(step * i)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

function detectPOIType(tags: Record<string, string>): string {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return tags.historic;
  if (tags.natural) return tags.natural;
  if (tags.amenity) return tags.amenity;
  return "unknown";
}
