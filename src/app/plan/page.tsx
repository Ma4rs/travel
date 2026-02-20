"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import InterestFilter from "@/components/InterestFilter";
import UserMenu from "@/components/UserMenu";
import type { QuestCategory } from "@/types";

interface TripSuggestion {
  title: string;
  description: string;
  destination: string;
  estimatedCost: number;
  highlights: string[];
  dailyPlan: string[];
}

export default function PlanPage() {
  const [startLocation, setStartLocation] = useState("");
  const [budget, setBudget] = useState(500);
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState<QuestCategory[]>([]);
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(15);
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
      const res = await fetch("/api/trip-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startLocation, budget, days, interests }),
      });

      if (!res.ok) throw new Error("Failed to generate suggestions");

      const data = await res.json();
      setSuggestions(data.suggestions);
      startCooldown();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
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
              Tell us your budget and interests, we&apos;ll handle the rest
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Form */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Where do you live?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                  🏠
                </span>
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
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Budget
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  min={50}
                  step={50}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  €
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Days
              </label>
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
                disabled={!startLocation || isLoading || cooldown > 0}
                className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Planning...
                  </span>
                ) : cooldown > 0 ? (
                  `Wait ${cooldown}s...`
                ) : (
                  "Plan My Trip"
                )}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <InterestFilter selected={interests} onToggle={toggleInterest} />
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">
              Your Trip Suggestions
            </h2>
            <div className="grid gap-6">
              {suggestions.map((trip, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{trip.title}</h3>
                      <p className="text-sm text-muted">
                        📍 {trip.destination}
                      </p>
                    </div>
                    <div className="rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary">
                      ~{trip.estimatedCost}€
                    </div>
                  </div>

                  <p className="mb-4 text-muted">{trip.description}</p>

                  {trip.highlights?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium">Highlights</h4>
                    <div className="flex flex-wrap gap-2">
                      {trip.highlights.map((h, j) => (
                        <span
                          key={j}
                          className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  )}

                  {trip.dailyPlan?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium">Daily Plan</h4>
                    <div className="space-y-2">
                      {trip.dailyPlan.map((day, j) => (
                        <div
                          key={j}
                          className="flex gap-3 rounded-lg bg-background p-3 text-sm"
                        >
                          <span className="shrink-0 font-medium text-accent">
                            Day {j + 1}
                          </span>
                          <span className="text-muted">{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  <Link
                    href={`/route?from=${encodeURIComponent(startLocation)}&to=${encodeURIComponent(trip.destination)}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                  >
                    Explore this route with Side Quests →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && suggestions.length === 0 && (
          <div className="py-16 text-center">
            <div className="mb-4 text-5xl">🧭</div>
            <h3 className="mb-2 text-lg font-medium">
              Where will your next adventure take you?
            </h3>
            <p className="text-sm text-muted">
              Fill in your details above and let AI plan the perfect trip.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
