"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import DynamicMap from "@/components/map/DynamicMap";
import UserMenu from "@/components/UserMenu";
import { useTripStore } from "@/stores/trip-store";
import type { Quest, ItineraryDay } from "@/types";
import { QUEST_CATEGORIES } from "@/types";
import { formatDurationMinutes, buildGoogleMapsUrl } from "@/lib/utils";

export default function TripResultPage() {
  const { plannedTrip: trip, updatePlannedItinerary } = useTripStore();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const dragDataRef = useRef<{ questId: string; fromDay: number } | null>(null);

  function handleSaveTrip() {
    if (!trip) return;
    const allQuests = trip.itinerary.flatMap((d) => d.quests);
    const store = useTripStore.getState();
    const newId = crypto.randomUUID();
    const savedTrip = {
      id: newId,
      title: trip.title,
      origin: trip.origin,
      destination: trip.destination,
      waypoints: [],
      quests: allQuests,
      routeGeometry: trip.outboundGeometry,
      totalDistance: trip.totalDistance,
      totalDuration: trip.totalDuration,
      days: trip.days,
      createdAt: new Date().toISOString(),
    };
    useTripStore.setState({
      savedTrips: [...store.savedTrips, savedTrip],
    });
    setSaveToast("Trip saved!");
    setTimeout(() => setSaveToast(null), 3000);
  }

  async function handleRecalculate() {
    if (!trip) return;
    setIsRecalculating(true);
    try {
      const updatedItinerary = [...trip.itinerary];
      let totalDist = 0;
      let totalDur = 0;
      const outboundGeo: [number, number][] = [];
      const returnGeo: [number, number][] = [];

      for (let i = 0; i < updatedItinerary.length; i++) {
        const day = updatedItinerary[i];
        const isLastDay = i === updatedItinerary.length - 1;

        const prevDay = i > 0 ? updatedItinerary[i - 1] : null;
        const dayStart = i === 0
          ? trip.origin
          : prevDay?.hotel
            ? { lat: prevDay.hotel.lat, lng: prevDay.hotel.lng }
            : prevDay?.quests.length
              ? { lat: prevDay.quests[prevDay.quests.length - 1].lat, lng: prevDay.quests[prevDay.quests.length - 1].lng }
              : trip.origin;

        const dayEnd = day.isReturnDay && isLastDay
          ? trip.origin
          : day.isReturnDay
            ? (day.quests.length > 0 ? { lat: day.quests[day.quests.length - 1].lat, lng: day.quests[day.quests.length - 1].lng } : trip.origin)
            : trip.destination;

        if (day.quests.length > 0 || day.distanceKm > 0) {
          try {
            const routeRes = await fetch("/api/calc-route", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                origin: dayStart,
                destination: dayEnd,
                waypoints: day.quests.map((q) => ({ lat: q.lat, lng: q.lng })),
              }),
            });
            if (routeRes.ok) {
              const routeData = await routeRes.json();
              updatedItinerary[i] = {
                ...day,
                distanceKm: Math.round(routeData.distance / 1000),
                durationMinutes: Math.round(routeData.duration / 60),
              };
              totalDist += routeData.distance / 1000;
              totalDur += routeData.duration / 60;
              if (day.isReturnDay) {
                returnGeo.push(...routeData.geometry);
              } else {
                outboundGeo.push(...routeData.geometry);
              }
            }
          } catch {
            // Keep existing route data
          }
        }

        if (!isLastDay && day.quests.length > 0) {
          const lastQuest = day.quests[day.quests.length - 1];
          try {
            const hotelRes = await fetch("/api/find-hotel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: lastQuest.lat,
                lng: lastQuest.lng,
                regionName: trip.destination.name || "Germany",
              }),
            });
            if (hotelRes.ok) {
              const hotelData = await hotelRes.json();
              updatedItinerary[i] = {
                ...updatedItinerary[i],
                hotel: hotelData.hotel ?? undefined,
              };
            }
          } catch {
            // Keep existing hotel
          }
        }
      }

      const updatedTrip = {
        ...trip,
        itinerary: updatedItinerary,
        outboundGeometry: outboundGeo.length > 0 ? outboundGeo : trip.outboundGeometry,
        returnGeometry: returnGeo.length > 0 ? returnGeo : trip.returnGeometry,
        totalDistance: Math.round(totalDist),
        totalDuration: Math.round(totalDur),
      };
      useTripStore.setState({ plannedTrip: updatedTrip });
      setHasChanges(false);
    } catch {
      // Recalculation failed
    } finally {
      setIsRecalculating(false);
    }
  }

  const removeQuest = useCallback((dayNum: number, questId: string) => {
    if (!trip) return;
    const newItinerary = trip.itinerary.map((day) =>
      day.day === dayNum
        ? { ...day, quests: day.quests.filter((q) => q.id !== questId) }
        : day
    );
    updatePlannedItinerary(newItinerary);
    setHasChanges(true);
  }, [trip, updatePlannedItinerary]);

  const moveQuest = useCallback((fromDay: number, toDay: number, questId: string, insertIdx?: number) => {
    if (!trip || fromDay === toDay && insertIdx === undefined) return;
    const itinerary = trip.itinerary;

    const sourceDayData = itinerary.find((d) => d.day === fromDay);
    if (!sourceDayData) return;
    const quest = sourceDayData.quests.find((q) => q.id === questId);
    if (!quest) return;

    const newItinerary: ItineraryDay[] = itinerary.map((day) => {
      if (day.day === fromDay && day.day === toDay) {
        const without = day.quests.filter((q) => q.id !== questId);
        const idx = insertIdx !== undefined ? Math.min(insertIdx, without.length) : without.length;
        const reordered = [...without];
        reordered.splice(idx, 0, quest);
        return { ...day, quests: reordered };
      }
      if (day.day === fromDay) {
        return { ...day, quests: day.quests.filter((q) => q.id !== questId) };
      }
      if (day.day === toDay) {
        const idx = insertIdx !== undefined ? Math.min(insertIdx, day.quests.length) : day.quests.length;
        const newQuests = [...day.quests];
        newQuests.splice(idx, 0, quest);
        return { ...day, quests: newQuests };
      }
      return day;
    });

    updatePlannedItinerary(newItinerary);
    setHasChanges(true);
  }, [trip, updatePlannedItinerary]);

  function handleDragStart(e: React.DragEvent, questId: string, fromDay: number) {
    dragDataRef.current = { questId, fromDay };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", questId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    dragDataRef.current = null;
    setDragOverDay(null);
    setDragOverIdx(null);
  }

  function handleDayDragOver(e: React.DragEvent, dayNum: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayNum);
  }

  function handleQuestDragOver(e: React.DragEvent, dayNum: number, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayNum);
    setDragOverIdx(idx);
  }

  function handleDayDrop(e: React.DragEvent, dayNum: number) {
    e.preventDefault();
    const data = dragDataRef.current;
    if (!data) return;
    moveQuest(data.fromDay, dayNum, data.questId);
    setDragOverDay(null);
    setDragOverIdx(null);
    setExpandedDay(dayNum);
  }

  function handleQuestDrop(e: React.DragEvent, dayNum: number, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    const data = dragDataRef.current;
    if (!data) return;
    moveQuest(data.fromDay, dayNum, data.questId, idx);
    setDragOverDay(null);
    setDragOverIdx(null);
    setExpandedDay(dayNum);
  }

  function handleDayDragLeave() {
    setDragOverDay(null);
    setDragOverIdx(null);
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl">🗺️</div>
          <h2 className="mb-2 text-lg font-semibold">No trip data found</h2>
          <p className="mb-6 text-sm text-muted">Go back and plan a trip first.</p>
          <Link href="/plan" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
            Plan a Trip
          </Link>
        </div>
      </div>
    );
  }

  const allQuests: Quest[] = trip.itinerary.flatMap((d) => d.quests);
  const hotelMarkers: Quest[] = trip.itinerary
    .filter((d) => d.hotel)
    .map((d) => ({
      id: `hotel-day-${d.day}`,
      title: d.hotel!.name,
      description: `~${d.hotel!.estimatedPrice}€/night`,
      category: "hidden_gem" as const,
      lat: d.hotel!.lat,
      lng: d.hotel!.lng,
      detourMinutes: 0,
      xp: 0,
    }));
  const mapQuests = [...allQuests, ...hotelMarkers];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border px-4 sm:px-6 py-3">
        <Link href="/plan" aria-label="Back to Plan a Trip" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{trip.title}</h1>
          <p className="text-xs text-muted">
            {trip.days} {trip.days === 1 ? "day" : "days"} · {trip.totalDistance} km · ~{trip.estimatedCost}€
          </p>
        </div>
        <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`${mobileTab === "list" ? "flex" : "hidden"} sm:flex w-full sm:w-96 shrink-0 flex-col border-r border-border overflow-y-auto`}>
          {/* Cost breakdown */}
          <div className="border-b border-border p-4">
            <div className="rounded-lg bg-background p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Transport</span>
                <span className="font-medium">{trip.transportCost === 0 ? "Deutschlandticket" : `${trip.transportCost}€`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Accommodation</span>
                <span className="font-medium">{trip.accommodationCost}€</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span>Total</span>
                <span>~{trip.estimatedCost}€</span>
              </div>
            </div>
            {trip.isRoundTrip && (
              <p className="mt-2 text-xs text-muted text-center">Round trip · {trip.totalDistance} km total</p>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={handleSaveTrip} className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-card-hover">
                💾 Save
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("from", trip.origin.name);
                  params.set("to", trip.destination.name);
                  if (trip.days > 1) params.set("days", String(trip.days));
                  const url = `${window.location.origin}/route?${params.toString()}`;
                  if (navigator.share) {
                    navigator.share({ title: trip.title, text: `${trip.origin.name} → ${trip.destination.name} (${trip.days} days)`, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => {
                      setShareToast("Link copied!");
                      setTimeout(() => setShareToast(null), 3000);
                    }).catch(() => {});
                  }
                }}
                className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-card-hover"
              >
                🔗 Share
              </button>
            </div>
            {(saveToast || shareToast) && (
              <p className="mt-1 text-center text-xs font-medium text-secondary">{saveToast || shareToast}</p>
            )}
            {hasChanges && (
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="mt-2 w-full rounded-lg border border-secondary py-2 text-xs font-medium text-secondary transition-colors hover:bg-secondary/10 disabled:opacity-50"
              >
                {isRecalculating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
                    Recalculating...
                  </span>
                ) : (
                  "Recalculate Route"
                )}
              </button>
            )}
            <p className="mt-2 text-center text-xs text-muted">Drag quests between days to rearrange</p>
          </div>

          {/* Day-by-day itinerary with drag-and-drop */}
          <div className="flex-1 p-4 space-y-2">
            {trip.itinerary.map((day) => {
              const isExpanded = expandedDay === day.day;
              const isDragTarget = dragOverDay === day.day;
              return (
                <div
                  key={day.day}
                  className={`rounded-xl border bg-card overflow-hidden transition-colors ${
                    isDragTarget ? "border-primary border-2" : "border-border"
                  }`}
                  onDragOver={(e) => handleDayDragOver(e, day.day)}
                  onDragLeave={handleDayDragLeave}
                  onDrop={(e) => handleDayDrop(e, day.day)}
                >
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-card-hover transition-colors"
                  >
                    <div>
                      <span className="text-sm font-semibold">Day {day.day}</span>
                      <span className="ml-2 text-xs text-muted">{day.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {day.distanceKm > 0 && <span>{day.distanceKm} km</span>}
                      {day.quests.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">{day.quests.length}</span>
                      )}
                      {(() => {
                        const visitMin = day.quests.reduce((s, q) => s + (q.visitMinutes ?? 45), 0);
                        const totalMin = day.durationMinutes + visitMin;
                        if (totalMin > 0) {
                          const h = Math.floor(totalMin / 60);
                          return <span className={totalMin > 600 ? "text-red-400 font-medium" : ""}>{h}h</span>;
                        }
                        return null;
                      })()}
                      <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-2">
                      {(day.distanceKm > 0 || day.quests.length > 0) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          {day.distanceKm > 0 && (
                            <span>{day.isReturnDay ? "🔙" : "🚗"} {day.distanceKm} km · ~{formatDurationMinutes(day.durationMinutes)} driving</span>
                          )}
                          {day.quests.length > 0 && (() => {
                            const totalVisit = day.quests.reduce((sum, q) => sum + (q.visitMinutes ?? 45), 0);
                            return <span>🕐 ~{formatDurationMinutes(totalVisit)} activities</span>;
                          })()}
                        </div>
                      )}

                      {day.quests.length > 0 ? (
                        <div className="space-y-1">
                          {day.quests.map((quest, idx) => {
                            const cat = QUEST_CATEGORIES[quest.category] ?? QUEST_CATEGORIES.hidden_gem;
                            const showDropIndicator = isDragTarget && dragOverIdx === idx;
                            return (
                              <div key={quest.id}>
                                {showDropIndicator && (
                                  <div className="h-0.5 rounded bg-primary mx-2 my-1" />
                                )}
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, quest.id, day.day)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleQuestDragOver(e, day.day, idx)}
                                  onDrop={(e) => handleQuestDrop(e, day.day, idx)}
                                  className="flex items-center gap-2 rounded-lg bg-background p-2 cursor-grab active:cursor-grabbing group"
                                >
                                  <div className="flex items-center text-muted opacity-40 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                      <circle cx="3.5" cy="2" r="1.2" />
                                      <circle cx="8.5" cy="2" r="1.2" />
                                      <circle cx="3.5" cy="6" r="1.2" />
                                      <circle cx="8.5" cy="6" r="1.2" />
                                      <circle cx="3.5" cy="10" r="1.2" />
                                      <circle cx="8.5" cy="10" r="1.2" />
                                    </svg>
                                  </div>
                                  <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                                    style={{ backgroundColor: cat.color + "20" }}
                                  >
                                    {cat.icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{quest.title}</p>
                                    <p className="text-xs text-muted">
                                      {quest.xp} XP
                                      {quest.visitMinutes ? ` · ~${quest.visitMinutes >= 60 ? `${Math.floor(quest.visitMinutes / 60)}h${quest.visitMinutes % 60 > 0 ? ` ${quest.visitMinutes % 60}min` : ""}` : `${quest.visitMinutes}min`}` : ""}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeQuest(day.day, quest.id); }}
                                    aria-label={`Remove ${quest.title}`}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {isDragTarget && dragOverIdx === null && (
                            <div className="h-0.5 rounded bg-primary mx-2 my-1" />
                          )}
                        </div>
                      ) : (
                        <div
                          className={`rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted italic transition-colors ${
                            isDragTarget ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          {isDragTarget ? "Drop quest here" : day.distanceKm > 0 ? "Travel day — drag quests here" : "Free day — drag quests here"}
                        </div>
                      )}

                      {day.hotel && (
                        <div className="flex items-center gap-2 rounded-lg bg-accent/10 p-2">
                          <span className="text-lg">🏨</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{day.hotel.name}</p>
                            <p className="text-xs text-accent">~{day.hotel.estimatedPrice}€/night</p>
                          </div>
                        </div>
                      )}

                      {day.quests.length > 0 && (() => {
                        const prevDay = day.day > 1 ? trip.itinerary[day.day - 2] : null;
                        const dayStart = day.day === 1
                          ? trip.origin
                          : prevDay?.hotel
                            ? { lat: prevDay.hotel.lat, lng: prevDay.hotel.lng, name: prevDay.hotel.name }
                            : prevDay?.quests.length
                              ? { lat: prevDay.quests[prevDay.quests.length - 1].lat, lng: prevDay.quests[prevDay.quests.length - 1].lng, name: "" }
                              : trip.destination;
                        const dayEnd = day.hotel
                          ? { lat: day.hotel.lat, lng: day.hotel.lng, name: day.hotel.name }
                          : day.isReturnDay
                            ? trip.origin
                            : trip.destination;
                        return (
                        <a
                          href={buildGoogleMapsUrl(dayStart, dayEnd, day.quests)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                        >
                          Navigate Day {day.day} →
                        </a>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className={`${mobileTab === "map" ? "flex" : "hidden"} sm:flex flex-1 p-2 sm:p-4`}>
          <DynamicMap
            routeGeometry={trip.outboundGeometry}
            originalRouteGeometry={trip.returnGeometry.length > 0 ? trip.returnGeometry : undefined}
            quests={mapQuests}
            completedQuests={{}}
            onQuestClick={(q) => {
              const day = trip.itinerary.find((d) => d.quests.some((dq) => dq.id === q.id));
              if (day) {
                setExpandedDay(day.day);
                setMobileTab("list");
              }
            }}
          />
        </main>
      </div>

      <div className="flex sm:hidden border-t border-border" role="tablist" aria-label="View mode">
        <button
          onClick={() => setMobileTab("list")}
          role="tab"
          aria-selected={mobileTab === "list"}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${mobileTab === "list" ? "text-primary bg-primary/5" : "text-muted"}`}
        >
          Itinerary
        </button>
        <button
          onClick={() => setMobileTab("map")}
          role="tab"
          aria-selected={mobileTab === "map"}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${mobileTab === "map" ? "text-primary bg-primary/5" : "text-muted"}`}
        >
          Map
        </button>
      </div>
    </div>
  );
}
