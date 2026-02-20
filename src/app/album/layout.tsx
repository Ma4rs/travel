import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memory Album — TravelGuide",
  description:
    "Your personal travel photo album. Every completed quest becomes a memory with your photo alongside the story of the place.",
  openGraph: {
    title: "Memory Album — TravelGuide",
    description:
      "A travel journal that builds itself. Browse your quest completion photos.",
  },
};

export default function AlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
