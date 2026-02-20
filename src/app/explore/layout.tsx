import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exploration Progress — TravelGuide",
  description:
    "Track your exploration across all 16 German states. Complete quests, earn XP, and fill the map from Newcomer to Mastered.",
  openGraph: {
    title: "Exploration Progress — TravelGuide",
    description:
      "160+ quests across Germany. Track your progress, earn XP, and become a true explorer.",
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
