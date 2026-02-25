import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Trips — TravelGuide",
  description: "View and manage your saved trip routes.",
  openGraph: {
    title: "My Trips — TravelGuide",
    description: "View and manage your saved trip routes.",
  },
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
