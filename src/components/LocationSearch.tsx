"use client";

import { useState, useRef, useEffect } from "react";
import type { RoutePoint } from "@/types";

interface LocationSearchProps {
  label: string;
  placeholder: string;
  value: RoutePoint | null;
  onSelect: (point: RoutePoint) => void;
  icon?: string;
}

export default function LocationSearch({
  label,
  placeholder,
  value,
  onSelect,
  icon = "📍",
}: LocationSearchProps) {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState<RoutePoint[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(val: string) {
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(val)}`
        );
        if (!res.ok) {
          setResults([]);
          setIsOpen(false);
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          setResults([]);
          setIsOpen(false);
          return;
        }
        setResults(data);
        setIsOpen(data.length > 0);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }

  function handleSelect(point: RoutePoint) {
    setQuery(point.name);
    setIsOpen(false);
    onSelect(point);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
          {icon}
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-card-hover"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
