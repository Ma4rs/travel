import { fetchWithRetry } from "./retry";
import type { Hotel } from "@/types";

const FALLBACK_PRICES: Record<string, number> = {
  hotel: 80,
  guest_house: 55,
  hostel: 30,
};

interface RawHotel {
  name: string;
  lat: number;
  lng: number;
  type: "hotel" | "hostel" | "guest_house";
  stars?: number;
}

export async function findHotelsNear(
  lat: number,
  lng: number,
  radiusMeters: number = 5000
): Promise<RawHotel[]> {
  const query = `
    [out:json][timeout:10];
    (
      nwr["tourism"~"hotel|hostel|guest_house"](around:${radiusMeters},${lat},${lng});
    );
    out center 15;
  `;

  try {
    const res = await fetchWithRetry(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.elements || !Array.isArray(data.elements)) return [];

    return data.elements
      .filter((el: { tags?: { name?: string } }) => el.tags?.name)
      .map((el: {
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags: Record<string, string>;
      }) => {
        const tourism = el.tags.tourism as "hotel" | "hostel" | "guest_house";
        const starsStr = el.tags.stars || el.tags["star_rating"];
        return {
          name: el.tags.name,
          lat: el.lat ?? el.center?.lat ?? 0,
          lng: el.lon ?? el.center?.lon ?? 0,
          type: tourism || "hotel",
          stars: starsStr ? parseInt(starsStr, 10) : undefined,
        };
      })
      .filter((h: RawHotel) => h.lat !== 0 && h.lng !== 0);
  } catch {
    return [];
  }
}

export async function estimateHotelPrices(
  hotels: RawHotel[],
  regionName: string
): Promise<Hotel[]> {
  if (hotels.length === 0) return [];

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Gemini key");

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const hotelList = hotels
      .slice(0, 10)
      .map((h, i) => `${i + 1}. "${h.name}" (${h.type}${h.stars ? `, ${h.stars} stars` : ""}) in ${regionName}`)
      .join("\n");

    const prompt = `Estimate the price per night in EUR for each of these accommodations in Germany. Consider the type, star rating, and region.

${hotelList}

Return ONLY a JSON array of numbers (estimated price per night in EUR), one per hotel, in the same order. Example: [75, 45, 90]`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
    ]);

    if (!result?.response) throw new Error("No response");

    const text = result.response.text().trim();
    const jsonStr = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    const prices: number[] = JSON.parse(jsonStr);

    if (!Array.isArray(prices)) throw new Error("Not an array");

    return hotels.slice(0, 10).map((h, i) => ({
      ...h,
      estimatedPrice: typeof prices[i] === "number" && prices[i] > 0
        ? Math.round(prices[i])
        : FALLBACK_PRICES[h.type] ?? 70,
    }));
  } catch {
    return hotels.map((h) => ({
      ...h,
      estimatedPrice: FALLBACK_PRICES[h.type] ?? 70,
    }));
  }
}

export async function findBestHotelNear(
  lat: number,
  lng: number,
  regionName: string
): Promise<Hotel | undefined> {
  const rawHotels = await findHotelsNear(lat, lng);
  if (rawHotels.length === 0) return undefined;

  const withPrices = await estimateHotelPrices(rawHotels, regionName);
  // Prefer hotels over hostels, pick cheapest hotel
  const hotels = withPrices.filter((h) => h.type === "hotel");
  const sorted = (hotels.length > 0 ? hotels : withPrices).sort(
    (a, b) => a.estimatedPrice - b.estimatedPrice
  );
  return sorted[0];
}
