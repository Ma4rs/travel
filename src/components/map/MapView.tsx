"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Quest, CompletedQuestData } from "@/types";
import { QUEST_CATEGORIES } from "@/types";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  routeGeometry?: [number, number][];
  quests?: Quest[];
  completedQuests?: Record<string, CompletedQuestData>;
  onQuestClick?: (quest: Quest) => void;
}

export default function MapView({
  center = [50.1109, 8.6821],
  zoom = 6,
  routeGeometry = [],
  quests = [],
  completedQuests,
  onQuestClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center, zoom);

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

    markersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
    }

    if (routeGeometry.length > 0) {
      routeLayerRef.current = L.polyline(routeGeometry, {
        color: "#8B5CF6",
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), {
        padding: [50, 50],
      });
    }
  }, [routeGeometry]);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    quests.forEach((quest) => {
      const cat = QUEST_CATEGORIES[quest.category];
      const photoUrl = completedQuests?.[quest.id]?.photoUrl || quest.photoUrl;
      const isCompleted = quest.completed || !!completedQuests?.[quest.id];

      const innerHtml =
        isCompleted && photoUrl
          ? `<img src="${photoUrl}" style="width:36px;height:36px;border-radius:50%;border:3px solid #10B981;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;" />`
          : `<div style="
              background: ${cat.color};
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              border: 3px solid ${isCompleted ? "#10B981" : "white"};
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">${cat.icon}</div>`;

      const marker = L.marker([quest.lat, quest.lng], {
        icon: L.divIcon({
          className: "quest-marker",
          html: innerHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });

      marker.bindTooltip(quest.title, {
        direction: "top",
        offset: [0, -20],
      });

      marker.on("click", () => onQuestClick?.(quest));
      markersRef.current!.addLayer(marker);
    });
  }, [quests, completedQuests, onQuestClick]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-xl overflow-hidden border border-border"
    />
  );
}
