"use client";

import { useEffect, useState } from "react";
import { getProgressColor } from "@/lib/progress";

interface ProgressBarProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

export default function ProgressBar({
  percentage,
  size = "md",
  showLabel = true,
  animated = true,
}: ProgressBarProps) {
  const [width, setWidth] = useState(animated ? 0 : percentage);
  const color = getProgressColor(percentage);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage, animated]);

  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-1 overflow-hidden rounded-full bg-border/50 ${heights[size]}`}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            boxShadow: percentage === 100 ? `0 0 8px ${color}80` : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span
          className="min-w-[3ch] text-right text-sm font-medium"
          style={{ color }}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}
