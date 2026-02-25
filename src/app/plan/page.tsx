"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InterestFilter from "@/components/InterestFilter";
import UserMenu from "@/components/UserMenu";
import type { QuestCategory, TransportMode, FuelType } from "@/types";

interface TripSuggestion {
  title: string;
  destination: string;
  description: string;
  questCount: number;
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

interface StartPoint {
  lat: number;
  lng: number;
  name: string;
}

export default function PlanPage() {
  const router = useRouter();
  const [startLocation, setStartLocation] = useState("");
  const [budget, setBudget] = useState(500);
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState<QuestCategory[]>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [hasDeutschlandticket, setHasDeutschlandticket] = useState(false);
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [startPoint, setStartPoint] = useState<StartPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planningTrip, setPlanningTrip] = useState<string | null>(null);

  function toggleInterest(cat: QuestCategory) {
    setInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handlePlanTrip() {
    if (!startLocation) return;

    setError(null);
    setIsLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch("/api/trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startLocation,
          budget,
          days,
          interests,
          transportMode,
          hasDeutschlandticket,
          fuelType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to plan trip");
      }

      const data = await res.json();
      setSuggestions(data.suggestions);
      setStartPoint(data.startPoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlanThisTrip(trip: TripSuggestion) {
    if (!startPoint) return;
    setPlanningTrip(trip.destination);

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
        }),
      });

      if (!res.ok) throw new Error("Failed to build itinerary");

      const data = await res.json();
      const encoded = encodeURIComponent(JSON.stringify(data));
      router.push(`/plan/result?data=${encoded}`);
    } catch {
      setError("Could not build itinerary. Try again.");
    } finally {
      setPlanningTrip(null);
    }
  }

  const nights = Math.max(0, days - 1);
  const fuelLabel: Record<FuelType, string> = { petrol: "Petrol", diesel: "Diesel", electric: "Electric" };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/"
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
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Where do you live?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🏠</span>
                <input
                  type="text"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  placeholder="e.g. Stuttgart, Munich, Berlin..."
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">Budget</label>
              <div className="relative">
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  min={50}
                  step={50}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">€</span>
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
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handlePlanTrip}
                disabled={!startLocation || isLoading}
                className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Searching...
                  </span>
                ) : (
                  "Plan My Trip"
                )}
              </button>
            </div>
          </div>

          {/* Transport mode */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit">
              <button
                onClick={() => setTransportMode("car")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  transportMode === "car" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                }`}
              >
                🚗 Car
              </button>
              <button
                onClick={() => setTransportMode("train")}
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
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit">
                {(["petrol", "diesel", "electric"] as FuelType[]).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => setFuelType(ft)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      fuelType === ft ? "bg-primary text-white" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {fuelLabel[ft]}
                  </button>
                ))}
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

        {suggestions.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Recommended Destinations</h2>
            <div className="grid gap-6">
              {suggestions.map((trip) => (
                <div
                  key={trip.destination}
                  className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{trip.title}</h3>
                      <p className="text-sm text-muted">📍 {trip.destination}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                        {trip.totalXP} XP
                      </span>
                      <span className="rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary">
                        ~{trip.estimatedCost}€
                      </span>
                    </div>
                  </div>

                  <p className="mb-4 text-muted">{trip.description}</p>

                  <div className="mb-4 rounded-lg bg-background p-3 text-xs text-muted">
                    <div className="flex flex-wrap gap-3">
                      {trip.transportMode === "train" ? (
                        <span>🚆 {trip.hasDeutschlandticket ? "Deutschlandticket" : `Train (~${trip.transportCost}€)`}</span>
                      ) : (
                        <span>
                          {fuelType === "electric" ? "⚡" : "⛽"} {fuelLabel[trip.fuelType]} · {trip.drivingDistanceKm * 2} km {isRoundTrip ? "round trip" : ""} ({trip.transportCost}€)
                        </span>
                      )}
                      <span>🏨 {nights} {nights === 1 ? "night" : "nights"} ({trip.accommodationCost}€)</span>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-3 text-sm text-muted">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary">
                      {trip.questCount} {trip.questCount === 1 ? "quest" : "quests"}
                    </span>
                    <span>{days} {days === 1 ? "day" : "days"}</span>
                  </div>

                  {trip.highlights.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium">Top Quests</h4>
                      <div className="flex flex-wrap gap-2">
                        {trip.highlights.map((h) => (
                          <span key={h} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handlePlanThisTrip(trip)}
                    disabled={planningTrip !== null}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    {planningTrip === trip.destination ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Planning your trip...
                      </>
                    ) : (
                      "Plan this trip →"
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && suggestions.length === 0 && !error && (
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
