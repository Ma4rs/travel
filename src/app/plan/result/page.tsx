"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DynamicMap from "@/components/map/DynamicMap";
import UserMenu from "@/components/UserMenu";
import type { PlannedTrip, Quest } from "@/types";
import { QUEST_CATEGORIES } from "@/types";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}

export default function TripResultPage() {
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<PlannedTrip | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");

  useEffect(() => {
    const raw = searchParams.get("data");
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        setTrip(parsed);
      } catch {
        // Invalid data
      }
    }
  }, [searchParams]);

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl">🗺️</div>
          <h2 className="mb-2 text-lg font-semibold">No trip data found</h2>
          <p className="mb-6 text-sm text-muted">Go back and plan a trip first.</p>
          <Link
            href="/plan"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
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
        <Link
          href="/plan"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
        >
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
        {/* Sidebar */}
        <aside
          className={`${
            mobileTab === "list" ? "flex" : "hidden"
          } sm:flex w-full sm:w-96 shrink-0 flex-col border-r border-border overflow-y-auto`}
        >
          {/* Cost breakdown */}
          <div className="border-b border-border p-4">
            <div className="rounded-lg bg-background p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Transport</span>
                <span className="font-medium">
                  {trip.transportCost === 0 ? "Deutschlandticket" : `${trip.transportCost}€`}
                </span>
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
          </div>

          {/* Day-by-day itinerary */}
          <div className="flex-1 p-4 space-y-2">
            {trip.itinerary.map((day) => (
              <div key={day.day} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-card-hover transition-colors"
                >
                  <div>
                    <span className="text-sm font-semibold">Day {day.day}</span>
                    <span className="ml-2 text-xs text-muted">{day.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {day.distanceKm > 0 && <span>{day.distanceKm} km</span>}
                    {day.quests.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                        {day.quests.length}
                      </span>
                    )}
                    <span>{expandedDay === day.day ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expandedDay === day.day && (
                  <div className="border-t border-border p-3 space-y-2">
                    {day.distanceKm > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{day.isReturnDay ? "🔙" : "🚗"}</span>
                        <span>{day.distanceKm} km · ~{formatDuration(day.durationMinutes)}</span>
                      </div>
                    )}

                    {day.quests.length > 0 ? (
                      <div className="space-y-1.5">
                        {day.quests.map((quest) => {
                          const cat = QUEST_CATEGORIES[quest.category];
                          return (
                            <div key={quest.id} className="flex items-center gap-2 rounded-lg bg-background p-2">
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                                style={{ backgroundColor: cat.color + "20" }}
                              >
                                {cat.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{quest.title}</p>
                                <p className="text-xs text-muted">{quest.xp} XP</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted italic">
                        {day.distanceKm > 0 ? "Travel day" : "Free day to explore"}
                      </p>
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Map */}
        <main
          className={`${
            mobileTab === "map" ? "flex" : "hidden"
          } sm:flex flex-1 p-2 sm:p-4`}
        >
          <DynamicMap
            routeGeometry={trip.outboundGeometry}
            originalRouteGeometry={trip.returnGeometry.length > 0 ? trip.returnGeometry : undefined}
            quests={mapQuests}
            completedQuests={{}}
            onQuestClick={() => {}}
          />
        </main>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex sm:hidden border-t border-border" role="tablist">
        <button
          onClick={() => setMobileTab("list")}
          role="tab"
          aria-selected={mobileTab === "list"}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "list" ? "text-primary bg-primary/5" : "text-muted"
          }`}
        >
          Itinerary
        </button>
        <button
          onClick={() => setMobileTab("map")}
          role="tab"
          aria-selected={mobileTab === "map"}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "map" ? "text-primary bg-primary/5" : "text-muted"
          }`}
        >
          Map
        </button>
      </div>
    </div>
  );
}
