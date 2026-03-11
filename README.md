# TravelGuide — Side Quests for Every Trip

Road trips aren't about getting from A to B. They're about what happens in between. TravelGuide turns every journey into an adventure by discovering hidden gems, scenic detours, and local favorites along your route — then gamifying the whole experience with quests, XP, and a personal photo memory album.

Think of it as a travel companion that knows all the spots the locals love, the weird roadside attractions nobody talks about, and the perfect place to grab a Bratwurst at sunset. Currently focused on Germany with 160+ hand-curated quests across all 16 states.

## Features

### AI Road Trip Planner

Plan multi-day trips with a full itinerary. Enter your budget, how many days you have, and your interests — the app suggests destinations, finds hotels along the route with AI-estimated prices, calculates costs for car (petrol/diesel/electric) or train (with Deutschlandticket support), and builds a day-by-day plan with quests and overnight stops. Choose round trip or one-way.

### Route Enhancement

Already have a route? Enter your origin and destination, and the app instantly finds side quests along the way from 160+ curated locations. Select which quests to visit, recalculate your route with them as waypoints, and navigate via Google Maps. Real-time weather icons show conditions at each quest location.

### Memory Album

Complete quests by uploading a photo as proof of your visit. Every finished quest becomes a memory — a personal travel journal that builds itself as you explore. Open any completed quest to see your photo alongside the story of the place.

### Exploration Map

A progress map of all 16 German states. Each state has 8-12 unique quests. Complete them to fill the map, earn XP, and track your journey from Newcomer to Mastered.

### Save & Share Routes

Save your planned routes with custom names. Load them later, share via link (Web Share API on mobile, clipboard on desktop), or export as JSON. All saved trips are available from the My Trips page.

### Multi-Day Planning

Split quests across multiple days with the trip duration slider (1-7 days). Each day shows its distance, driving time, quests, and suggested overnight location. Navigate day-by-day via Google Maps.

### Quest Categories

Every quest falls into one of eight categories: hidden gems, scenic detours, local food, history, photo spots, weird & wonderful, nature, and culture. Filter by what interests you.

### Gamification

Earn XP for every quest you complete. Track your progress per state and across all of Germany. Level up from Newcomer through Adventurer, Explorer, and Veteran to Mastered.

### Dark & Light Theme

Toggle between dark and light mode from the user menu. Defaults to your system preference.

### Installable (PWA)

Install TravelGuide on your phone or desktop like a native app. Works offline for browsing your album and previously loaded content. No app store needed.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS 4
- **Maps:** Leaflet + OpenStreetMap (free, no API key)
- **Routing:** OSRM (free routing API)
- **POI Data:** Overpass API (free OpenStreetMap data)
- **AI:** Google Gemini Flash (free tier: 1500 req/day)
- **State:** Zustand (persisted to localStorage)
- **Auth & Storage:** Supabase (Auth, Database, Storage)
- **Weather:** Open-Meteo API (free, no API key)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Get a Gemini API key (free)

1. Go to https://aistudio.google.com/apikey
2. Create a free API key

### 3. Set up Supabase

1. Create a free project at https://supabase.com
2. Go to the SQL Editor and run the migration in `src/db/migration.sql`
3. (Optional) Enable Google OAuth under Authentication > Providers > Google

### 4. Set up environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your keys:

```
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
  app/
    page.tsx                  # Landing page
    layout.tsx                # Root layout (theme init, PWA, auth)
    error.tsx                 # Error boundary
    global-error.tsx          # Root error boundary
    route/                    # "Enhance My Route" mode
    plan/                     # "Plan a Trip" mode
      result/                 # Trip itinerary result page
    explore/                  # Exploration progress map
    album/                    # Memory album photo grid
    trips/                    # Saved trips list
    login/                    # Auth (email + Google OAuth)
    api/
      geocode/                # Location search
      quests/                 # Curated quest lookup
      quests-ai/              # AI quest generation
      trip-plan/              # Trip destination suggestions
      trip-itinerary/         # Full itinerary builder (hotels, routing)
      calc-route/             # Route recalculation with waypoints
      trips/                  # Saved trips CRUD
      upload-photo/           # Photo upload
  components/
    map/                      # Leaflet map components
    quest/                    # Quest cards, detail modal, photo upload
    explore/                  # State list, explore map, progress bar
    LocationSearch.tsx         # Location autocomplete
    InterestFilter.tsx         # Category filter chips
    UserMenu.tsx               # User dropdown (theme, trips, album)
  lib/
    osrm.ts                   # Route calculation
    overpass.ts                # POI queries
    gemini.ts                  # AI quest/trip generation
    geocode.ts                 # Nominatim geocoding
    quest-generator.ts         # Quest orchestrator
    hotels.ts                  # Hotel search + AI price estimation
    weather.ts                 # Open-Meteo weather integration
    itinerary.ts               # Multi-day itinerary builder
    trip-planner.ts            # Trip suggestion engine
    retry.ts                   # Retry with exponential backoff
    sync.ts                    # Cloud sync for completions
    progress.ts                # Progress calculations
    supabase.ts                # Supabase browser client
    supabase-server.ts         # Supabase server client
  stores/
    trip-store.ts              # Zustand state (persisted)
  data/
    regions.ts                 # 160+ quests across 16 German states
    germany-states.json        # GeoJSON for the exploration map
  types/
    index.ts                   # TypeScript types
  db/
    migration.sql              # Supabase database + storage setup
public/
  manifest.json                # PWA manifest
  sw.js                        # Service worker (offline caching)
  icons/                       # App icons (SVG)
```

## Coming Soon

- Badges and leaderboard
- Community-submitted quests
- Shareable postcard export for completed quests
- Mobile app (App Store / Play Store)
