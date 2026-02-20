"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import germanyGeoJSON from "@/data/germany-states.json";
import { calculateStateProgress, getProgressColor } from "@/lib/progress";

interface ExploreMapProps {
  completedQuestIds: string[];
  onClose: () => void;
  onStateClick?: (stateId: string) => void;
}

export default function ExploreMap({
  completedQuestIds,
  onClose,
  onStateClick,
}: ExploreMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  const onStateClickRef = useRef(onStateClick);
  onStateClickRef.current = onStateClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
    }).setView([51.1657, 10.4515], 6);

    const isDark = document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(mapRef.current);

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const buildGeoLayer = useCallback(
    (map: L.Map) => {
      if (geoLayerRef.current) {
        geoLayerRef.current.remove();
      }

      const geoLayer = L.geoJSON(
        germanyGeoJSON as GeoJSON.FeatureCollection,
        {
          style: (feature) => {
            const stateId = feature?.properties?.id ?? "";
            const progress = calculateStateProgress(
              stateId,
              completedQuestIds
            );
            const color = getProgressColor(progress.percentage);
            const isComplete = progress.percentage === 100;

            return {
              fillColor: color,
              fillOpacity:
                progress.percentage === 0
                  ? 0.1
                  : 0.25 + (progress.percentage / 100) * 0.45,
              color: isComplete ? "#F59E0B" : color,
              weight: isComplete ? 3 : 1.5,
              opacity: 0.8,
            };
          },
          onEachFeature: (feature, layer) => {
            const stateId = feature.properties?.id ?? "";
            const stateName = feature.properties?.name ?? "Unknown";
            const progress = calculateStateProgress(
              stateId,
              completedQuestIds
            );
            const color = getProgressColor(progress.percentage);

            layer.bindTooltip(
              `<div style="text-align:center">
                <strong>${stateName}</strong><br/>
                <span style="color:${color}">${progress.percentage}%</span>
                <span style="color:#737373"> — ${progress.completed}/${progress.total} quests</span>
              </div>`,
              { sticky: true, className: "explore-tooltip" }
            );

            layer.on("click", () => onStateClickRef.current?.(stateId));

            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({
                weight: 3,
                fillOpacity: 0.6,
              });
            });

            layer.on("mouseout", () => {
              geoLayer.resetStyle(layer);
            });
          },
        }
      ).addTo(map);

      geoLayerRef.current = geoLayer;
      map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
    },
    [completedQuestIds]
  );

  useEffect(() => {
    if (!mapRef.current) return;
    buildGeoLayer(mapRef.current);
  }, [buildGeoLayer]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h2 className="text-lg font-semibold">Exploration Map</h2>
        <button
          onClick={onClose}
          aria-label="Close map"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div ref={containerRef} className="flex-1" />

      <div className="flex items-center justify-center gap-6 border-t border-border px-6 py-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "#525252" }}
          />
          Undiscovered
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "#3B82F6" }}
          />
          1-25%
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "#10B981" }}
          />
          26-50%
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "#8B5CF6" }}
          />
          51-75%
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: "#A855F7" }}
          />
          76-99%
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-amber-400"
            style={{ backgroundColor: "#F59E0B" }}
          />
          Mastered
        </span>
      </div>
    </div>
  );
}
