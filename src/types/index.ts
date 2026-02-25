export type QuestCategory =
  | "hidden_gem"
  | "scenic"
  | "food"
  | "history"
  | "photo_spot"
  | "weird"
  | "nature"
  | "culture";

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  lat: number;
  lng: number;
  detourMinutes: number;
  xp: number;
  imageUrl?: string;
  address?: string;
  completed?: boolean;
  photoUrl?: string;
}

export interface CompletedQuestData {
  questId: string;
  photoUrl: string;
  completedAt: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

export interface Trip {
  id: string;
  title: string;
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints: RoutePoint[];
  quests: Quest[];
  routeGeometry?: [number, number][];
  totalDistance?: number;
  totalDuration?: number;
  createdAt: string;
  days?: number;
  itinerary?: DayPlan[];
}

export interface TripSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedCost: number;
  days: number;
  origin: RoutePoint;
  destination: RoutePoint;
  highlights: string[];
  quests: Quest[];
  routeGeometry?: [number, number][];
}

export interface TripPlanRequest {
  budget: number;
  days: number;
  startLocation: string;
  interests: QuestCategory[];
}

export interface RouteRequest {
  origin: string;
  destination: string;
  interests: QuestCategory[];
  maxDetourMinutes: number;
}

export interface RegionQuest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  lat: number;
  lng: number;
  xp: number;
  photoUrl?: string;
}

export interface Region {
  id: string;
  name: string;
  center: [number, number];
  quests: RegionQuest[];
}

export interface ExplorationProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface WeatherData {
  code: number;
  tempC: number;
  icon: string;
  label: string;
}

export interface DayPlan {
  day: number;
  quests: Quest[];
  overnightLocation?: RoutePoint;
  distanceKm: number;
  durationMinutes: number;
}

export type TransportMode = "car" | "train";
export type FuelType = "petrol" | "diesel" | "electric";

export interface Hotel {
  name: string;
  lat: number;
  lng: number;
  type: "hotel" | "hostel" | "guest_house";
  stars?: number;
  estimatedPrice: number;
}

export interface ItineraryDay {
  day: number;
  label: string;
  quests: Quest[];
  hotel?: Hotel;
  distanceKm: number;
  durationMinutes: number;
  isReturnDay: boolean;
}

export interface PlannedTrip {
  id: string;
  title: string;
  origin: RoutePoint;
  destination: RoutePoint;
  days: number;
  itinerary: ItineraryDay[];
  outboundGeometry: [number, number][];
  returnGeometry: [number, number][];
  totalDistance: number;
  totalDuration: number;
  estimatedCost: number;
  transportCost: number;
  accommodationCost: number;
  transportMode: TransportMode;
  isRoundTrip: boolean;
}

export const QUEST_CATEGORIES: Record<
  QuestCategory,
  { label: string; icon: string; color: string }
> = {
  hidden_gem: { label: "Hidden Gem", icon: "💎", color: "#8B5CF6" },
  scenic: { label: "Scenic Detour", icon: "🏔️", color: "#10B981" },
  food: { label: "Local Food", icon: "🍕", color: "#F59E0B" },
  history: { label: "History", icon: "🏛️", color: "#6366F1" },
  photo_spot: { label: "Photo Spot", icon: "📸", color: "#EC4899" },
  weird: { label: "Weird & Wonderful", icon: "🎪", color: "#F97316" },
  nature: { label: "Nature", icon: "🌿", color: "#22C55E" },
  culture: { label: "Culture", icon: "🎭", color: "#3B82F6" },
};
