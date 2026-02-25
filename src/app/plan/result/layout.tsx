import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Trip Itinerary — TravelGuide",
  description: "View your planned trip with day-by-day itinerary, hotels, and quests.",
  openGraph: {
    title: "Your Trip Itinerary — TravelGuide",
    description: "View your planned trip with day-by-day itinerary, hotels, and quests.",
  },
};

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
