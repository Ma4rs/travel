import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — TravelGuide",
  description:
    "Sign in to TravelGuide to track your quests, save your photos, and sync your progress across devices.",
  openGraph: {
    title: "Sign In — TravelGuide",
    description: "Sign in to continue your adventure.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
