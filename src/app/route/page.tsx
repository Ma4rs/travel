"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DynamicMap from "@/components/map/DynamicMap";
import LocationSearch from "@/components/LocationSearch";
import InterestFilter from "@/components/InterestFilter";
import QuestCard from "@/components/quest/QuestCard";
import QuestDetail from "@/components/quest/QuestDetail";
import UserMenu from "@/components/UserMenu";
import { useTripStore } from "@/stores/trip-store";
import type { Quest, RoutePoint, WeatherData, QuestCategory } from "@/types";
import { fetchWeatherForLocations } from "@/lib/weather";
import { buildItinerary } from "@/lib/itinerary";

const COOLDOWN_SECONDS = 15;
const MAX_WAYPOINTS = 25;

function buildGoogleMapsUrl(
  origin: RoutePoint,
  destination: RoutePoint,
  quests: Quest[]
): string {
  const base = "https://www.google.com/maps/dir/";
  const waypoints = [
    `${origin.lat},${origin.lng}`,
    ...quests.map((q) => `${q.lat},${q.lng}`),
    `${destination.lat},${destination.lng}`,
  ];
  return base + waypoints.join("/");
}

function findClosestRouteIndex(
  lat: number,
  lng: number,
  geometry: [number, number][]
): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < geometry.length; i++) {
    const d = (geometry[i][0] - lat) ** 2 + (geometry[i][1] - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

function sortQuestsByRoute(
  questsToSort: Quest[],
  geometry: [number, number][]
): Quest[] {
  return [...questsToSort].sort((a, b) => {
    const aIdx = findClosestRouteIndex(a.lat, a.lng, geometry);
    const bIdx = findClosestRouteIndex(b.lat, b.lng, geometry);
    return aIdx - bIdx;
  });
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}min`;
}

function formatDistance(meters: number): string {
  return `${Math.round(meters / 1000)} km`;
}

export default function RoutePage() {
  const searchParams = useSearchParams();
  const {
    origin,
    destination,
    routeGeometry,
    quests,
    selectedQuest,
    interests,
    maxDetourMinutes,
    isLoadingQuests,
    completedQuests,
    setOrigin,
    setDestination,
    setRouteGeometry,
    setQuests,
    setSelectedQuest,
    toggleInterest,
    setMaxDetourMinutes,
    setIsLoadingQuests,
    completeQuest,
    saveTrip,
  } = useTripStore();

  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedQuestIds, setSelectedQuestIds] = useState<Set<string>>(new Set());
  const [showSelectAllWarning, setShowSelectAllWarning] = useState(false);
  const [selectionLimitMsg, setSelectionLimitMsg] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcRoute, setRecalcRoute] = useState<{
    geometry: [number, number][];
    distance: number;
    duration: number;
  } | null>(null);
  const [originalGeometry, setOriginalGeometry] = useState<[number, number][]>([]);
  const [needsRecalc, setNeedsRecalc] = useState(false);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save/share state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Weather state
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>({});
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Multi-day state
  const [tripDays, setTripDays] = useState(1);

  const originRef = useRef(origin);
  const destinationRef = useRef(destination);
  originRef.current = origin;
  destinationRef.current = destination;

  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const sharedInterests = searchParams.get("interests");
    const daysParam = searchParams.get("days");

    if (sharedInterests && interests.length === 0) {
      const cats = sharedInterests.split(",").filter(Boolean) as QuestCategory[];
      cats.forEach((cat) => {
        if (!interests.includes(cat)) toggleInterest(cat);
      });
    }

    if (daysParam) {
      const d = parseInt(daysParam, 10);
      if (d >= 1 && d <= 7) setTripDays(d);
    }

    if (!from && !to) return;

    async function geocodeParams() {
      try {
        if (from && !originRef.current) {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(from)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) setOrigin(data[0]);
          }
        }
        if (to && !destinationRef.current) {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(to)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) setDestination(data[0]);
          }
        }
      } catch {
        // silently ignore
      }
    }
    geocodeParams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setOrigin, setDestination]);

  const startCooldown = useCallback(() => {
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    setCooldown(COOLDOWN_SECONDS);
    cooldownInterval.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    };
  }, []);

  function toggleQuestSelection(questId: string) {
    setSelectedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(questId)) {
        next.delete(questId);
      } else {
        if (next.size >= MAX_WAYPOINTS) {
          setSelectionLimitMsg(`Maximum ${MAX_WAYPOINTS} stops per route.`);
          return prev;
        }
        next.add(questId);
      }
      return next;
    });
    setShowSelectAllWarning(false);
    setSelectionLimitMsg(null);
    setNeedsRecalc(true);
  }

  function handleSelectAll() {
    const limited = quests.slice(0, MAX_WAYPOINTS);
    setSelectedQuestIds(new Set(limited.map((q) => q.id)));
    setShowSelectAllWarning(true);
    setNeedsRecalc(true);
    if (quests.length > MAX_WAYPOINTS) {
      setSelectionLimitMsg(`Only the first ${MAX_WAYPOINTS} quests were selected (maximum).`);
    }
  }

  function handleClearAll() {
    setSelectedQuestIds(new Set());
    setShowSelectAllWarning(false);
    setSelectionLimitMsg(null);
    setRecalcRoute(null);
    setNeedsRecalc(false);
  }

  async function handleRecalculateRoute() {
    if (!origin || !destination || selectedQuestIds.size === 0) return;

    setIsRecalculating(true);

    const selected = quests.filter((q) => selectedQuestIds.has(q.id));
    const sorted = sortQuestsByRoute(selected, routeGeometry);

    try {
      const res = await fetch("/api/calc-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          waypoints: sorted.map((q) => ({ lat: q.lat, lng: q.lng })),
        }),
      });

      if (!res.ok) throw new Error("Route calculation failed");

      const data = await res.json();
      setOriginalGeometry(routeGeometry);
      setRouteGeometry(data.geometry);
      setRecalcRoute(data);
      setNeedsRecalc(false);
    } catch {
      setError("Failed to recalculate route. Please try again.");
    } finally {
      setIsRecalculating(false);
    }
  }

  async function handleFindQuests() {
    if (!origin || !destination) return;

    setError(null);
    setIsLoadingQuests(true);
    setSelectedQuestIds(new Set());
    setShowSelectAllWarning(false);
    setSelectionLimitMsg(null);
    setRecalcRoute(null);
    setOriginalGeometry([]);
    setNeedsRecalc(false);

    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLat: origin.lat,
          originLng: origin.lng,
          originName: origin.name,
          destLat: destination.lat,
          destLng: destination.lng,
          destName: destination.name,
          interests,
          maxDetourMinutes,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate quests");

      const data = await res.json();
      setRouteGeometry(data.routeGeometry);
      setQuests(data.quests);
      setHasSearched(true);
      if (data.quests.length > 0) setMobileTab("map");
      startCooldown();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoadingQuests(false);
    }
  }

  async function handleFindMoreAI() {
    if (!origin || !destination) return;

    setIsLoadingAI(true);
    setAiError(null);

    try {
      const res = await fetch("/api/quests-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLat: origin.lat,
          originLng: origin.lng,
          originName: origin.name,
          destLat: destination.lat,
          destLng: destination.lng,
          destName: destination.name,
          interests,
          maxDetourMinutes,
        }),
      });

      if (!res.ok) throw new Error("AI enrichment failed");

      const data = await res.json();
      if (data.quests?.length > 0) {
        const existingIds = new Set(quests.map((q) => q.id));
        const newQuests = data.quests.filter(
          (q: { id: string }) => !existingIds.has(q.id)
        );
        if (newQuests.length > 0) {
          setQuests([...quests, ...newQuests]);
        } else {
          setAiError("No additional quests found.");
        }
      } else {
        setAiError("No additional quests found.");
      }
      startCooldown();
    } catch {
      setAiError("AI search failed. The curated quests above are still available.");
    } finally {
      setIsLoadingAI(false);
    }
  }

  // Fetch weather when quests change or trip date changes
  useEffect(() => {
    if (quests.length === 0) return;
    let cancelled = false;
    setIsLoadingWeather(true);

    const coords = quests.map((q) => ({ lat: q.lat, lng: q.lng, id: q.id }));
    fetchWeatherForLocations(coords).then((data) => {
      if (!cancelled) {
        setWeatherMap(data);
        setIsLoadingWeather(false);
      }
    });

    return () => { cancelled = true; };
  }, [quests]);

  function handleSaveTrip() {
    const name = saveName.trim() || `${origin?.name ?? "?"} → ${destination?.name ?? "?"}`;
    saveTrip(name);
    setShowSaveInput(false);
    setSaveName("");
    setSaveToast("Trip saved!");
    setTimeout(() => setSaveToast(null), 3000);
  }

  function handleShareRoute() {
    if (!origin || !destination) return;
    const params = new URLSearchParams();
    params.set("from", origin.name);
    params.set("to", destination.name);
    if (interests.length > 0) params.set("interests", interests.join(","));
    const url = `${window.location.origin}/route?${params.toString()}`;

    if (navigator.share) {
      navigator.share({ title: "TravelGuide Route", text: `Check out this route: ${origin.name} → ${destination.name}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast("Link copied!");
        setTimeout(() => setShareToast(null), 3000);
      });
    }
  }

  // Build itinerary when days > 1
  const itinerary = tripDays > 1 && origin && destination && quests.length > 0
    ? buildItinerary(quests, origin, destination, tripDays, recalcRoute?.geometry ?? routeGeometry)
    : null;

  // Sort quests: selected first (in route order if recalculated), then unselected
  const displayGeometry = recalcRoute ? recalcRoute.geometry : routeGeometry;
  const selectedSorted = sortQuestsByRoute(
    quests.filter((q) => selectedQuestIds.has(q.id)),
    displayGeometry
  );
  const unselected = quests.filter((q) => !selectedQuestIds.has(q.id));
  const displayQuests = [...selectedSorted, ...unselected];

  const selectedCount = selectedSorted.length;

  const totalXP = quests.reduce((sum, q) => sum + q.xp, 0);
  const completedXP = quests
    .filter((q) => q.completed)
    .reduce((sum, q) => sum + q.xp, 0);

  const isButtonDisabled =
    !origin || !destination || isLoadingQuests || cooldown > 0;

  const buttonLabel = isLoadingQuests ? (
    <span className="flex items-center justify-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      Searching...
    </span>
  ) : cooldown > 0 ? (
    `Wait ${cooldown}s...`
  ) : (
    "Find Side Quests"
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border px-4 sm:px-6 py-3">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold">Enhance My Route</h1>
          <p className="text-xs text-muted hidden sm:block">
            Enter your route and discover side quests
          </p>
        </div>
        {quests.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className="text-muted">
              {selectedCount}/{quests.length} selected
            </span>
            <span className="rounded-full bg-accent/10 px-3 py-1 font-medium text-accent">
              {completedXP}/{totalXP} XP
            </span>
          </div>
        )}
        <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            mobileTab === "list" ? "flex" : "hidden"
          } sm:flex w-full sm:w-96 shrink-0 flex-col border-r border-border overflow-y-auto`}
        >
          <div className="space-y-4 p-4">
            <LocationSearch
              label="From"
              placeholder="Starting point..."
              value={origin}
              onSelect={setOrigin}
              icon="🟢"
            />
            <LocationSearch
              label="To"
              placeholder="Destination..."
              value={destination}
              onSelect={setDestination}
              icon="🔴"
            />
            <InterestFilter selected={interests} onToggle={toggleInterest} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Max detour: {maxDetourMinutes} min
              </label>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={maxDetourMinutes}
                onChange={(e) => setMaxDetourMinutes(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            {hasSearched && quests.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">
                  Trip duration: {tripDays} {tripDays === 1 ? "day" : "days"}
                </label>
                <input
                  type="range"
                  min={1}
                  max={7}
                  step={1}
                  value={tripDays}
                  onChange={(e) => setTripDays(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
            <button
              onClick={handleFindQuests}
              disabled={isButtonDisabled}
              className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buttonLabel}
            </button>
            {error && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Quest List */}
          {quests.length > 0 && (
            <div className="flex-1 border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted">
                  Side Quests Along Your Route
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-muted">|</span>
                  <button
                    onClick={handleClearAll}
                    className="text-xs font-medium text-muted hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {showSelectAllWarning && (
                <p className="mb-3 rounded-lg bg-accent/10 p-2.5 text-xs text-accent">
                  Heads up: These quests are spread across different areas. Your
                  actual travel time may be longer than the individual detour
                  times suggest.
                </p>
              )}

              {selectionLimitMsg && (
                <p className="mb-3 rounded-lg bg-primary/10 p-2.5 text-xs text-primary">
                  {selectionLimitMsg}
                </p>
              )}

              {/* Route info after recalculation */}
              {recalcRoute && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-secondary/10 p-2.5 text-xs font-medium text-secondary">
                  <span>{formatDistance(recalcRoute.distance)}</span>
                  <span>·</span>
                  <span>~{formatDuration(recalcRoute.duration)}</span>
                  <span>·</span>
                  <span>{selectedCount} {selectedCount === 1 ? "stop" : "stops"}</span>
                </div>
              )}

              {itinerary && tripDays > 1 ? (
                <div className="space-y-4">
                  {itinerary.map((dayPlan) => (
                    <div key={dayPlan.day}>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          Day {dayPlan.day}
                        </h4>
                        <span className="text-xs text-muted">
                          ~{dayPlan.distanceKm} km · {Math.floor(dayPlan.durationMinutes / 60)}h {dayPlan.durationMinutes % 60}min
                        </span>
                      </div>
                      {dayPlan.quests.length === 0 ? (
                        <p className="py-2 text-xs text-muted italic">Travel day — no quests in this segment</p>
                      ) : (
                        <div className="space-y-2">
                          {dayPlan.quests.map((quest) => (
                            <QuestCard
                              key={quest.id}
                              quest={quest}
                              compact
                              selected={selectedQuestIds.has(quest.id)}
                              onToggleSelect={toggleQuestSelection}
                              onClick={() => setSelectedQuest(quest)}
                              weather={weatherMap[quest.id]}
                            />
                          ))}
                        </div>
                      )}
                      {dayPlan.overnightLocation && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs text-accent">
                          <span>🏨</span>
                          <span>Overnight near {dayPlan.overnightLocation.name}</span>
                        </div>
                      )}
                      {dayPlan.day < tripDays && (
                        <a
                          href={buildGoogleMapsUrl(
                            dayPlan.day === 1 ? origin! : { lat: itinerary[dayPlan.day - 2].overnightLocation?.lat ?? origin!.lat, lng: itinerary[dayPlan.day - 2].overnightLocation?.lng ?? origin!.lng, name: "" },
                            dayPlan.overnightLocation ?? destination!,
                            dayPlan.quests.filter((q) => selectedQuestIds.has(q.id))
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                        >
                          Navigate Day {dayPlan.day} →
                        </a>
                      )}
                    </div>
                  ))}
                  {/* Navigate last day */}
                  {itinerary.length > 0 && (
                    <a
                      href={buildGoogleMapsUrl(
                        itinerary.length > 1
                          ? { lat: itinerary[itinerary.length - 2].overnightLocation?.lat ?? origin!.lat, lng: itinerary[itinerary.length - 2].overnightLocation?.lng ?? origin!.lng, name: "" }
                          : origin!,
                        destination!,
                        itinerary[itinerary.length - 1].quests.filter((q) => selectedQuestIds.has(q.id))
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      Navigate Day {itinerary.length} →
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayQuests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      compact
                      selected={selectedQuestIds.has(quest.id)}
                      onToggleSelect={toggleQuestSelection}
                      onClick={() => setSelectedQuest(quest)}
                      weather={weatherMap[quest.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save / Share buttons */}
          {quests.length > 0 && origin && destination && (
            <div className="border-t border-border p-4 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveInput(!showSaveInput)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                >
                  💾 Save Trip
                </button>
                <button
                  onClick={handleShareRoute}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                >
                  🔗 Share
                </button>
              </div>
              {showSaveInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder={`${origin.name} → ${destination.name}`}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTrip()}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={handleSaveTrip}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                  >
                    Save
                  </button>
                </div>
              )}
              {saveToast && (
                <p className="text-center text-xs font-medium text-secondary">{saveToast}</p>
              )}
              {shareToast && (
                <p className="text-center text-xs font-medium text-secondary">{shareToast}</p>
              )}
            </div>
          )}

          {/* Recalculate + Navigate buttons */}
          {selectedCount > 0 && origin && destination && (
            <div className="border-t border-border p-4 space-y-2">
              {needsRecalc && (
                <button
                  onClick={handleRecalculateRoute}
                  disabled={isRecalculating}
                  className="w-full rounded-xl border border-secondary py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/10 disabled:opacity-50"
                >
                  {isRecalculating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
                      Recalculating...
                    </span>
                  ) : (
                    "Recalculate Route"
                  )}
                </button>
              )}
              <a
                href={buildGoogleMapsUrl(origin, destination, selectedSorted)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Navigate Full Route ({selectedCount} {selectedCount === 1 ? "stop" : "stops"})
              </a>
            </div>
          )}

          {hasSearched && quests.length === 0 && !isLoadingQuests && !error && (
            <div className="border-t border-border p-6 text-center">
              <div className="mb-2 text-3xl">🔍</div>
              <p className="text-sm font-medium">No curated quests found nearby</p>
              <p className="mt-1 text-xs text-muted">
                Try a longer route, increase the max detour, or use AI to discover more.
              </p>
            </div>
          )}

          {hasSearched && !isLoadingQuests && origin && destination && (
            <div className="border-t border-border p-4">
              <button
                onClick={handleFindMoreAI}
                disabled={isLoadingAI || cooldown > 0}
                className="w-full rounded-xl border border-accent py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
              >
                {isLoadingAI ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    Searching with AI...
                  </span>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s...`
                ) : (
                  "Find More with AI"
                )}
              </button>
              {aiError && (
                <p className="mt-2 text-center text-xs text-muted">{aiError}</p>
              )}
            </div>
          )}
        </aside>

        {/* Map */}
        <main
          className={`${
            mobileTab === "map" ? "flex" : "hidden"
          } sm:flex flex-1 p-2 sm:p-4`}
        >
          <DynamicMap
            routeGeometry={recalcRoute ? recalcRoute.geometry : routeGeometry}
            originalRouteGeometry={recalcRoute ? originalGeometry : undefined}
            quests={quests}
            completedQuests={completedQuests}
            selectedQuestIds={selectedQuestIds}
            onQuestClick={(q: Quest) => setSelectedQuest(q)}
          />
        </main>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex sm:hidden border-t border-border" role="tablist" aria-label="View mode">
        <button
          onClick={() => setMobileTab("list")}
          role="tab"
          aria-selected={mobileTab === "list"}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "list" ? "text-primary bg-primary/5" : "text-muted"
          }`}
        >
          Quests
          {quests.length > 0 && (
            <span className="ml-1.5 rounded-full bg-border px-1.5 py-0.5 text-xs">
              {quests.length}
            </span>
          )}
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
          {selectedCount > 0 && (
            <span className="ml-1.5 rounded-full bg-secondary/20 px-1.5 py-0.5 text-xs text-secondary">
              {selectedCount}
            </span>
          )}
        </button>
      </div>

      {/* Quest Detail Modal */}
      {selectedQuest && (
        <QuestDetail
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          photoUrl={completedQuests[selectedQuest.id]?.photoUrl}
          completedAt={completedQuests[selectedQuest.id]?.completedAt}
          onComplete={(questId, photoUrl) => {
            completeQuest(questId, photoUrl);
            setSelectedQuest(null);
          }}
        />
      )}
    </div>
  );
}
