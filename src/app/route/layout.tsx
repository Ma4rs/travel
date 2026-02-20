import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enhance My Route — TravelGuide",
  description:
    "Enter your route and discover hidden gems, scenic detours, and side quests along the way. AI-powered quest generation for any road trip.",
  openGraph: {
    title: "Enhance My Route — TravelGuide",
    description:
      "Discover side quests along any route. AI finds the stops you'd never find on your own.",
  },
};

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
