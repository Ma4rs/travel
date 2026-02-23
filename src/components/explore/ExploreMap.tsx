"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import germanyGeoJSON from "@/data/germany-states.json";
import { calculateStateProgress, getProgressColor } from "@/lib/progress";
import { ALL_QUESTS } from "@/data/regions";
import { QUEST_CATEGORIES } from "@/types";
import type { QuestCategory } from "@/types";

interface ExploreMapProps {
  completedQuestIds: string[];
  onClose: () => void;
  onStateClick?: (stateId: string) => void;
}

const CATEGORIES = Object.entries(QUEST_CATEGORIES) as [
  QuestCategory,
  { label: string; icon: string; color: string },
][];

export default function ExploreMap({
  completedQuestIds,
  onClose,
  onStateClick,
}: ExploreMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<QuestCategory | null>(null);

  const onStateClickRef = useRef(onStateClick);
  onStateClickRef.current = onStateClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
    }).setView([51.1657, 10.4515], 6);

    const isDark =
      document.documentElement.classList.contains("dark") ||
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
    markersRef.current = L.layerGroup().addTo(mapRef.current);

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

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    if (!selectedCategory) return;

    const cat = QUEST_CATEGORIES[selectedCategory];
    const filtered = ALL_QUESTS.filter((q) => q.category === selectedCategory);

    filtered.forEach((quest) => {
      const isCompleted = completedQuestIds.includes(quest.id);
      const marker = L.marker([quest.lat, quest.lng], {
        icon: L.divIcon({
          className: "quest-marker",
          html: `<div style="
            background: ${cat.color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 3px solid ${isCompleted ? "#10B981" : "white"};
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">${isCompleted ? "✓" : cat.icon}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      });

      marker.bindPopup(
        `<div style="min-width:180px">
          <strong>${quest.title}</strong>
          <div style="font-size:12px;color:#737373;margin-top:4px">${quest.description}</div>
          <div style="font-size:12px;margin-top:6px;color:${cat.color}">${quest.xp} XP ${isCompleted ? "· Completed ✓" : ""}</div>
        </div>`
      );

      markersRef.current!.addLayer(marker);
    });
  }, [selectedCategory, completedQuestIds]);

  function toggleCategory(cat: QuestCategory) {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  }

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="shrink-0 text-lg font-semibold">Exploration Map</h2>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1.5 whitespace-nowrap">
            {CATEGORIES.map(([key, cat]) => (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === key
                    ? "text-white"
                    : "bg-card text-muted hover:text-foreground"
                }`}
                style={
                  selectedCategory === key
                    ? { backgroundColor: cat.color }
                    : undefined
                }
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close map"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
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
