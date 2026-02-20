"use client";

import dynamic from "next/dynamic";

const ExploreMap = dynamic(() => import("./ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-2 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="text-sm text-muted">Loading map...</p>
      </div>
    </div>
  ),
});

interface DynamicExploreMapProps {
  completedQuestIds: string[];
  onClose: () => void;
  onStateClick?: (stateId: string) => void;
}

export default function DynamicExploreMap(props: DynamicExploreMapProps) {
  return <ExploreMap {...props} />;
}
