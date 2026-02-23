import { fetchWithRetry } from "./retry";

export interface POI {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: string;
  tags: Record<string, string>;
}

const POI_QUERIES: Record<string, string> = {
  tourism: `nwr["tourism"~"viewpoint|museum|castle|artwork|attraction"](around:{radius},{lat},{lng});`,
  food: `nwr["amenity"~"restaurant|cafe|pub"]["cuisine"](around:{radius},{lat},{lng});`,
  nature: `nwr["natural"~"peak|waterfall|spring|cave_entrance|beach"](around:{radius},{lat},{lng});`,
  historic: `nwr["historic"~"castle|monument|memorial|ruins|archaeological_site"](around:{radius},{lat},{lng});`,
  culture: `nwr["amenity"~"theatre|arts_centre|library"]["name"](around:{radius},{lat},{lng});`,
};

export async function findPOIsNearPoint(
  lat: number,
  lng: number,
  radiusMeters: number = 10000
): Promise<POI[]> {
  const queries = Object.values(POI_QUERIES)
    .map((q) =>
      q
        .replace("{radius}", String(radiusMeters))
        .replace("{lat}", String(lat))
        .replace("{lng}", String(lng))
    )
    .join("\n");

  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${queries}
    );
    out center 30;
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

  return data.elements
    .filter((el: { tags?: { name?: string } }) => el.tags?.name)
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

export async function findPOIsAlongRoute(
  samplePoints: [number, number][],
  radiusMeters: number = 10000
): Promise<POI[]> {
  const allPois: POI[] = [];
  const seenIds = new Set<number>();

  const batchSize = 5;
  for (let i = 0; i < samplePoints.length; i += batchSize) {
    const batch = samplePoints.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([lat, lng]) => findPOIsNearPoint(lat, lng, radiusMeters))
    );

    for (const pois of results) {
      for (const poi of pois) {
        if (!seenIds.has(poi.id)) {
          seenIds.add(poi.id);
          allPois.push(poi);
        }
      }
    }

    if (i + batchSize < samplePoints.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return allPois;
}

function detectPOIType(tags: Record<string, string>): string {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return tags.historic;
  if (tags.natural) return tags.natural;
  if (tags.amenity) return tags.amenity;
  return "unknown";
}
