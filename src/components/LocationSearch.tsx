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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef(0);
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    setSearchError(null);
    setHighlightIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const requestId = activeRequestRef.current + 1;
      activeRequestRef.current = requestId;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(val)}`,
          { signal: controller.signal }
        );
        if (requestId !== activeRequestRef.current) return;
        if (!res.ok) {
          setResults([]);
          setIsOpen(false);
          setSearchError("Search failed. Please try again.");
          return;
        }
        const data = await res.json();
        if (requestId !== activeRequestRef.current) return;
        if (!Array.isArray(data)) {
          setResults([]);
          setIsOpen(false);
          setSearchError("No locations found.");
          return;
        }
        setResults(data);
        if (data.length > 0) {
          setIsOpen(true);
          setHighlightIdx(0);
        } else {
          setIsOpen(false);
          setSearchError("No locations found. Try a different search.");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId !== activeRequestRef.current) return;
        setResults([]);
        setIsOpen(false);
        setSearchError("Search failed. Check your connection.");
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    }, 400);
  }

  function handleSelect(point: RoutePoint) {
    setQuery(point.name);
    setIsOpen(false);
    setSearchError(null);
    setHighlightIdx(-1);
    onSelect(point);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}
      </div>

      {searchError && (
        <p className="mt-1 text-xs text-muted">{searchError}</p>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-xl" role="listbox">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lng}`}
              onClick={() => handleSelect(r)}
              role="option"
              aria-selected={i === highlightIdx}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                i === highlightIdx ? "bg-primary/10 text-primary" : "hover:bg-card-hover"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
