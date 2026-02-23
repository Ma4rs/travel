import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Quest, QuestCategory } from "@/types";
import type { POI } from "./overpass";

const GEMINI_TIMEOUT_MS = 20000;

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in environment");
  return new GoogleGenerativeAI(key);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini request timed out")), ms)
    ),
  ]);
}

export async function generateQuests(
  pois: POI[],
  interests: QuestCategory[],
  originName: string,
  destName: string
): Promise<Quest[]> {
  if (pois.length === 0) return [];

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const slicedPois = pois.slice(0, 30);
  const poiList = slicedPois
    .map(
      (p, i) =>
        `${i + 1}. "${p.name}" (type: ${p.type}, lat: ${p.lat}, lng: ${p.lng}${p.tags.cuisine ? `, cuisine: ${p.tags.cuisine}` : ""}${p.tags.description ? `, info: ${p.tags.description}` : ""})`
    )
    .join("\n");

  const interestStr =
    interests.length > 0 ? interests.join(", ") : "all categories";

  const prompt = `You are a creative travel guide AI. A traveler is driving from ${originName} to ${destName}.

Here are interesting places along their route:
${poiList}

Generate engaging "side quests" for the best ones. Focus on: ${interestStr}.

For each quest, return a JSON array with objects containing:
- "poiIndex": the number from the list above (1-based)
- "title": a catchy, short quest title (like a video game quest name)
- "description": 2-3 sentences that make the traveler excited to stop. Include what makes it special, a local tip, or a fun fact.
- "category": one of: hidden_gem, scenic, food, history, photo_spot, weird, nature, culture
- "detourMinutes": estimated extra time needed (5-60 minutes)
- "xp": points from 10-100 based on how unique/worthwhile the stop is

Return ONLY a valid JSON array, no markdown, no explanation. Generate 5-15 quests from the best POIs.`;

  let result;
  try {
    result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS);
  } catch {
    console.error("Gemini quest generation timed out or failed");
    return [];
  }

  if (!result?.response) {
    console.error("Gemini returned no response");
    return [];
  }

  const text = result.response.text().trim();
  const jsonStr = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");

  let questData: {
    poiIndex: number;
    title: string;
    description: string;
    category: QuestCategory;
    detourMinutes: number;
    xp: number;
  }[];

  try {
    questData = JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse Gemini quest response:", jsonStr.slice(0, 200));
    return [];
  }

  if (!Array.isArray(questData)) return [];

  return questData
    .filter((q) => q.poiIndex >= 1 && q.poiIndex <= slicedPois.length)
    .map((q) => {
      const poi = slicedPois[q.poiIndex - 1];
      return {
        id: `quest-${poi.id || Math.random().toString(36).slice(2)}`,
        title: q.title,
        description: q.description,
        category: q.category,
        lat: poi.lat,
        lng: poi.lng,
        detourMinutes: q.detourMinutes || 15,
        xp: q.xp || 50,
        address: poi.tags?.["addr:street"]
          ? `${poi.tags["addr:street"]} ${poi.tags["addr:housenumber"] || ""}, ${poi.tags["addr:city"] || ""}`
          : undefined,
      };
    });
}

export async function generateTripSuggestions(
  startLocation: string,
  budget: number,
  days: number,
  interests: QuestCategory[]
): Promise<
  {
    title: string;
    description: string;
    destination: string;
    estimatedCost: number;
    highlights: string[];
    dailyPlan: string[];
  }[]
> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const interestStr =
    interests.length > 0 ? interests.join(", ") : "varied activities";

  const prompt = `You are a creative travel planner. A traveler wants a trip with these details:
- Starting from: ${startLocation}
- Budget: ${budget}€ total
- Duration: ${days} days
- Interests: ${interestStr}

Suggest 3 different trip ideas. For each, return a JSON array with:
- "title": catchy trip name
- "description": 2-3 sentences about why this trip is great
- "destination": main destination city/region
- "estimatedCost": estimated total cost in euros (gas, accommodation, food)
- "highlights": array of 3-5 highlight stops/activities
- "dailyPlan": array of ${days} strings, one per day, summarizing the day

Return ONLY a valid JSON array, no markdown.`;

  let result;
  try {
    result = await withTimeout(model.generateContent(prompt), GEMINI_TIMEOUT_MS);
  } catch {
    console.error("Gemini trip suggestion timed out or failed");
    return [];
  }

  if (!result?.response) {
    console.error("Gemini returned no response for trip suggestion");
    return [];
  }

  const text = result.response.text().trim();
  const jsonStr = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");

  let suggestions;
  try {
    suggestions = JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse Gemini trip response:", jsonStr.slice(0, 200));
    return [];
  }

  if (!Array.isArray(suggestions)) return [];

  return suggestions.map((s: Record<string, unknown>) => ({
    title: String(s.title || "Unnamed Trip"),
    description: String(s.description || ""),
    destination: String(s.destination || "Unknown"),
    estimatedCost: Number(s.estimatedCost) || budget,
    highlights: Array.isArray(s.highlights) ? s.highlights.map(String) : [],
    dailyPlan: Array.isArray(s.dailyPlan) ? s.dailyPlan.map(String) : [],
  }));
}
