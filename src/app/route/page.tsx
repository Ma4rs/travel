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
import type { Quest, RoutePoint } from "@/types";

const COOLDOWN_SECONDS = 15;

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
  } = useTripStore();

  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const originRef = useRef(origin);
  const destinationRef = useRef(destination);
  originRef.current = origin;
  destinationRef.current = destination;

  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
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
        // URL params are a convenience; silently ignore geocoding failures
      }
    }
    geocodeParams();
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

  async function handleFindQuests() {
    if (!origin || !destination) return;

    setError(null);
    setIsLoadingQuests(true);

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
              {quests.length} quests found
            </span>
            <span className="rounded-full bg-accent/10 px-3 py-1 font-medium text-accent">
              {completedXP}/{totalXP} XP
            </span>
          </div>
        )}
        <UserMenu />
      </header>

      {/* Desktop: side-by-side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile unless list tab active */}
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
            <div className="flex-1 space-y-2 border-t border-border p-4">
              <h3 className="mb-3 text-sm font-medium text-muted">
                Side Quests Along Your Route
              </h3>
              {quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  compact
                  onClick={() => setSelectedQuest(quest)}
                />
              ))}
            </div>
          )}

          {quests.length > 0 && origin && destination && (
            <div className="border-t border-border p-4">
              <a
                href={buildGoogleMapsUrl(origin, destination, quests)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Navigate Full Route ({quests.length} stops)
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

        {/* Map — hidden on mobile unless map tab active */}
        <main
          className={`${
            mobileTab === "map" ? "flex" : "hidden"
          } sm:flex flex-1 p-2 sm:p-4`}
        >
          <DynamicMap
            routeGeometry={routeGeometry}
            quests={quests}
            completedQuests={completedQuests}
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
          aria-controls="panel-list"
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "list"
              ? "text-primary bg-primary/5"
              : "text-muted"
          }`}
        >
          Quests
        </button>
        <button
          onClick={() => setMobileTab("map")}
          role="tab"
          aria-selected={mobileTab === "map"}
          aria-controls="panel-map"
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "map"
              ? "text-primary bg-primary/5"
              : "text-muted"
          }`}
        >
          Map
          {quests.length > 0 && (
            <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
              {quests.length}
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
