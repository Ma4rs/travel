import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan a Trip — TravelGuide",
  description:
    "Tell us your budget, days, and interests. Our AI generates full trip suggestions with destinations, daily plans, and side quests.",
  openGraph: {
    title: "Plan a Trip — TravelGuide",
    description:
      "AI-powered trip planning with side quests. Budget-friendly road trip ideas across Germany.",
  },
};

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
