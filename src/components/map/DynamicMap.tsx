"use client";

import dynamic from "next/dynamic";
import type { Quest, CompletedQuestData } from "@/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-card">
      <div className="text-center">
        <div className="mb-2 h-8 w-8 mx-auto animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted">Loading map...</p>
      </div>
    </div>
  ),
});

interface DynamicMapProps {
  center?: [number, number];
  zoom?: number;
  routeGeometry?: [number, number][];
  quests?: Quest[];
  completedQuests?: Record<string, CompletedQuestData>;
  onQuestClick?: (quest: Quest) => void;
}

export default function DynamicMap(props: DynamicMapProps) {
  return <MapView {...props} />;
}
