"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InterestFilter from "@/components/InterestFilter";
import UserMenu from "@/components/UserMenu";
import LocationSearch from "@/components/LocationSearch";
import { useTripStore } from "@/stores/trip-store";
import type { QuestCategory, TransportMode, FuelType, RoutePoint } from "@/types";

interface TripSuggestion {
  title: string;
  destination: string;
  description: string;
  questCount: number;
  activityCount: number;
  totalXP: number;
  estimatedCost: number;
  transportCost: number;
  accommodationCost: number;
  drivingDistanceKm: number;
  highlights: string[];
  center: [number, number];
  transportMode: TransportMode;
  hasDeutschlandticket: boolean;
  fuelType: FuelType;
}

const COOLDOWN_SECONDS = 15;
const DEFAULT_CONSUMPTION: Record<FuelType, number> = { petrol: 7.0, diesel: 5.5, electric: 20.0 };
const FUEL_LABEL: Record<FuelType, string> = { petrol: "Petrol", diesel: "Diesel", electric: "Electric" };
const CONSUMPTION_UNIT: Record<FuelType, string> = { petrol: "L/100km", diesel: "L/100km", electric: "kWh/100km" };

export default function PlanPage() {
  const router = useRouter();
  const { setPlannedTrip } = useTripStore();
  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null);
  const [minBudget, setMinBudget] = useState(100);
  const [maxBudget, setMaxBudget] = useState(500);
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState<QuestCategory[]>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [hasDeutschlandticket, setHasDeutschlandticket] = useState(false);
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const [fuelConsumption, setFuelConsumption] = useState(DEFAULT_CONSUMPTION.petrol);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planningTrip, setPlanningTrip] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function handleFuelTypeChange(ft: FuelType) {
    setFuelType(ft);
    setFuelConsumption(DEFAULT_CONSUMPTION[ft]);
  }

  function toggleInterest(cat: QuestCategory) {
    setInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handlePlanTrip() {
    if (!startPoint) return;

    setError(null);
    setIsLoading(true);
    setSuggestions([]);
    setHasSearched(false);

    try {
      const res = await fetch("/api/trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLocation: startPoint.name,
          minBudget,
          maxBudget,
          days,
          interests,
          transportMode,
          hasDeutschlandticket,
          fuelType,
          isRoundTrip,
          fuelConsumption: transportMode === "car" ? fuelConsumption : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to plan trip");
      }

      const data = await res.json();
      setSuggestions(data.suggestions);
      setHasSearched(true);
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlanThisTrip(trip: TripSuggestion) {
    if (!startPoint) {
      setError("Start location not found. Please search again.");
      return;
    }
    setPlanningTrip(trip.destination);
    setError(null);

    try {
      const res = await fetch("/api/trip-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLat: startPoint.lat,
          originLng: startPoint.lng,
          originName: startPoint.name,
          destLat: trip.center[0],
          destLng: trip.center[1],
          destName: trip.destination,
          days,
          interests,
          transportMode,
          fuelType,
          hasDeutschlandticket,
          isRoundTrip,
          fuelConsumption: transportMode === "car" ? fuelConsumption : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to build itinerary");
      }

      const data = await res.json();
      setPlannedTrip(data);
      router.push("/plan/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build itinerary. Try again.");
    } finally {
      setPlanningTrip(null);
    }
  }

  const nights = Math.max(0, days - 1);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
          >
            ←
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Plan a Trip</h1>
            <p className="text-xs text-muted">
              Tell us your budget and interests, we&apos;ll plan your adventure
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-4">
            <div className="sm:col-span-4">
              <LocationSearch
                label="Where do you live?"
                placeholder="e.g. Stuttgart, Munich, Berlin..."
                value={startPoint}
                onSelect={setStartPoint}
                icon="🏠"
              />
            </div>

            {/* Budget range */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-muted">Budget range</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={minBudget}
                    onChange={(e) => setMinBudget(Number(e.target.value))}
                    min={0}
                    step={50}
                    placeholder="Min"
                    className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-8 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">€</span>
                </div>
                <span className="text-muted">–</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    min={minBudget}
                    step={50}
                    placeholder="Max"
                    className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-8 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">€</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">Days</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                min={1}
                max={14}
                className="w-full rounded-xl border border-border bg-background py-3 px-4 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Number of days"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handlePlanTrip}
                disabled={!startPoint || isLoading || cooldown > 0}
                className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Searching...
                  </span>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s...`
                ) : (
                  "Plan My Trip"
                )}
              </button>
            </div>
          </div>

          {/* Transport mode */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit" role="radiogroup" aria-label="Transport mode">
              <button
                onClick={() => setTransportMode("car")}
                role="radio"
                aria-checked={transportMode === "car"}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  transportMode === "car" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                🚗 Car
              </button>
              <button
                onClick={() => setTransportMode("train")}
                role="radio"
                aria-checked={transportMode === "train"}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  transportMode === "train" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                🚆 Train
              </button>
            </div>

            {transportMode === "train" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasDeutschlandticket}
                  onChange={(e) => setHasDeutschlandticket(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-foreground">I have a Deutschlandticket</span>
              </label>
            )}

            {transportMode === "car" && (
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                  {(["petrol", "diesel", "electric"] as FuelType[]).map((ft) => (
                    <button
                      key={ft}
                      onClick={() => handleFuelTypeChange(ft)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        fuelType === ft ? "bg-primary text-white" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {FUEL_LABEL[ft]}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Avg. consumption</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={fuelConsumption}
                      onChange={(e) => setFuelConsumption(Number(e.target.value))}
                      min={1}
                      max={30}
                      step={0.5}
                      className="w-32 rounded-lg border border-border bg-background py-1.5 pl-3 pr-16 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">
                      {CONSUMPTION_UNIT[fuelType]}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRoundTrip}
                onChange={(e) => setIsRoundTrip(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-foreground">Round trip (plan return)</span>
            </label>
          </div>

          <div className="mt-4">
            <InterestFilter selected={interests} onToggle={toggleInterest} />
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>
        )}

        {/* Suggestion cards */}
        {suggestions.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Recommended Destinations</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map((trip) => (
                <div
                  key={trip.destination}
                  className="rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Gradient header */}
                  <div className="bg-gradient-to-r from-primary/20 to-secondary/20 px-5 py-4">
                    <h3 className="text-xl font-bold">{trip.destination}</h3>
                    <p className="text-xs text-muted mt-0.5">{trip.drivingDistanceKm} km from you</p>
                  </div>

                  <div className="p-5">
                    {/* Stat badges */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                        ~{trip.estimatedCost}€
                      </span>
                      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                        {trip.totalXP} XP
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {trip.questCount} quests
                      </span>
                      {trip.activityCount > 0 && (
                        <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-500">
                          🎢 {trip.activityCount} activities
                        </span>
                      )}
                    </div>

                    {/* Transport + accommodation line */}
                    <div className="mb-3 text-xs text-muted">
                      {trip.transportMode === "train" ? (
                        <span>🚆 {trip.hasDeutschlandticket ? "Deutschlandticket" : `~${trip.transportCost}€`}</span>
                      ) : (
                        <span>
                          {trip.fuelType === "electric" ? "⚡" : "⛽"} {FUEL_LABEL[trip.fuelType]} · {isRoundTrip ? trip.drivingDistanceKm * 2 : trip.drivingDistanceKm} km ({trip.transportCost}€)
                        </span>
                      )}
                      {" · "}
                      <span>🏨 {nights}n ({trip.accommodationCost}€)</span>
                    </div>

                    {/* Highlights */}
                    {trip.highlights.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {trip.highlights.slice(0, 3).map((h) => (
                          <span key={h} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handlePlanThisTrip(trip)}
                      disabled={planningTrip !== null}
                      className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                    >
                      {planningTrip === trip.destination ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Planning...
                        </span>
                      ) : (
                        "Plan this trip →"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results state */}
        {hasSearched && !isLoading && suggestions.length === 0 && !error && (
          <div className="py-16 text-center">
            <div className="mb-4 text-5xl">🔍</div>
            <h3 className="mb-2 text-lg font-medium">No destinations found</h3>
            <p className="text-sm text-muted">
              No destinations match your budget range ({minBudget}€–{maxBudget}€) and interests.
              <br />
              Try increasing your budget or selecting different interests.
            </p>
          </div>
        )}

        {/* Initial empty state */}
        {!hasSearched && !isLoading && suggestions.length === 0 && !error && (
          <div className="py-16 text-center">
            <div className="mb-4 text-5xl">🧭</div>
            <h3 className="mb-2 text-lg font-medium">
              Where will your next adventure take you?
            </h3>
            <p className="text-sm text-muted">
              Fill in your details above and discover the best destinations for your trip.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
