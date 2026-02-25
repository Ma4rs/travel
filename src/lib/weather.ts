import type { WeatherData } from "@/types";

const WMO_MAP: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Clear" },
  1: { icon: "🌤️", label: "Mostly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Icy fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌦️", label: "Heavy drizzle" },
  56: { icon: "🌧️", label: "Freezing drizzle" },
  57: { icon: "🌧️", label: "Freezing drizzle" },
  61: { icon: "🌧️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  66: { icon: "🌧️", label: "Freezing rain" },
  67: { icon: "🌧️", label: "Freezing rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  77: { icon: "🌨️", label: "Snow grains" },
  80: { icon: "🌦️", label: "Light showers" },
  81: { icon: "🌧️", label: "Showers" },
  82: { icon: "🌧️", label: "Heavy showers" },
  85: { icon: "🌨️", label: "Snow showers" },
  86: { icon: "❄️", label: "Heavy snow showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm w/ hail" },
  99: { icon: "⛈️", label: "Thunderstorm w/ heavy hail" },
};

export function weatherCodeToInfo(code: number): { icon: string; label: string } {
  return WMO_MAP[code] ?? { icon: "🌡️", label: "Unknown" };
}

export async function fetchWeatherForLocations(
  coords: { lat: number; lng: number; id: string }[],
  date?: string
): Promise<Record<string, WeatherData>> {
  if (coords.length === 0) return {};

  const result: Record<string, WeatherData> = {};

  // Open-Meteo supports multi-location via comma-separated latitude/longitude
  // but batches are limited; split into chunks of 50
  const BATCH = 50;
  for (let i = 0; i < coords.length; i += BATCH) {
    const batch = coords.slice(i, i + BATCH);
    const lats = batch.map((c) => c.lat.toFixed(4)).join(",");
    const lngs = batch.map((c) => c.lng.toFixed(4)).join(",");

    try {
      if (date) {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&daily=weathercode,temperature_2m_max,temperature_2m_min&start_date=${date}&end_date=${date}&timezone=auto`
        );
        if (!res.ok) continue;
        const data = await res.json();

        // Open-Meteo returns an array for multi-location, single object for one location
        const items = Array.isArray(data) ? data : [data];
        items.forEach((item: { daily?: { weathercode?: number[]; temperature_2m_max?: number[] } }, idx: number) => {
          const code = item.daily?.weathercode?.[0] ?? 0;
          const temp = item.daily?.temperature_2m_max?.[0] ?? 0;
          const info = weatherCodeToInfo(code);
          result[batch[idx].id] = { code, tempC: Math.round(temp), ...info };
        });
      } else {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current_weather=true`
        );
        if (!res.ok) continue;
        const data = await res.json();

        const items = Array.isArray(data) ? data : [data];
        items.forEach((item: { current_weather?: { weathercode?: number; temperature?: number } }, idx: number) => {
          const code = item.current_weather?.weathercode ?? 0;
          const temp = item.current_weather?.temperature ?? 0;
          const info = weatherCodeToInfo(code);
          result[batch[idx].id] = { code, tempC: Math.round(temp), ...info };
        });
      }
    } catch {
      // Weather fetch is non-critical; skip failures silently
    }
  }

  return result;
}
