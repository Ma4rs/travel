# [TG quests — Side Quests for Every Trip](https://travel-demo-beta.vercel.app/)

Road trips aren't about getting from A to B. They're about what happens in between. TravelGuide turns every journey into an adventure by discovering hidden gems, scenic detours, and local favorites along your route — then gamifying the whole experience with quests, XP, and a personal photo memory album.

Think of it as a travel companion that knows all the spots the locals love, the weird roadside attractions nobody talks about, and the perfect place to grab a Bratwurst at sunset. Currently focused on Germany with 160+ hand-curated quests across all 16 states.

## Features

### Memory Album

Complete quests by uploading a photo as proof of your visit. Every finished quest becomes a memory — a personal travel journal that builds itself as you explore. Open any completed quest to see your photo alongside the story of the place.

### AI Road Trip Planner

Tell the app your budget, how many days you have, and what you're into — it generates full trip suggestions with destinations, daily plans, and side quests baked in. Or just enter where you're going and let it find incredible stops along the way.

### Exploration Map

A progress map of all 16 German states. Each state has 8-12 unique quests. Complete them to fill the map, earn XP, and track your journey from Newcomer to Mastered. See at a glance how much of Germany you've actually explored.

### Quest Categories

Every quest falls into one of eight categories: hidden gems, scenic detours, local food, history, photo spots, weird & wonderful, nature, and culture. Filter by what interests you.

### Gamification

Earn XP for every quest you complete. Track your progress per state and across all of Germany. Level up from Newcomer through Adventurer, Explorer, and Veteran to Mastered.

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
    route/
      page.tsx                # "Enhance My Route" mode
      layout.tsx              # SEO metadata
      loading.tsx             # Loading skeleton
    plan/
      page.tsx                # "Plan a Trip" mode
      layout.tsx              # SEO metadata
      loading.tsx             # Loading skeleton
    explore/
      page.tsx                # Exploration progress map
      layout.tsx              # SEO metadata
      loading.tsx             # Loading skeleton
    album/
      page.tsx                # Memory album photo grid
      layout.tsx              # SEO metadata
      loading.tsx             # Loading skeleton
    login/
      page.tsx                # Auth (email + Google OAuth)
      layout.tsx              # SEO metadata
    api/
      geocode/route.ts        # Location search API
      quests/route.ts         # Quest generation API
      trip-suggest/route.ts   # Trip suggestion API
      upload-photo/route.ts   # Photo upload API
  components/
    map/                      # Leaflet map components
    quest/                    # Quest cards, detail modal, photo upload
    explore/                  # State list, explore map, progress bar
    LocationSearch.tsx        # Location autocomplete input
    InterestFilter.tsx        # Category filter chips
    UserMenu.tsx              # User dropdown (theme toggle, album link)
    AuthGuard.tsx             # Auth protection wrapper
    CloudSync.tsx             # Syncs local data with Supabase
  lib/
    osrm.ts                  # Route calculation
    overpass.ts               # POI queries (nwr, with retry)
    gemini.ts                 # AI quest/trip generation
    geocode.ts                # Nominatim geocoding
    quest-generator.ts        # Orchestrator (with deduplication)
    retry.ts                  # Retry with exponential backoff
    sync.ts                   # Cloud sync for quest completions
    progress.ts               # Progress calculations
    supabase.ts               # Supabase browser client
    supabase-server.ts        # Supabase server client
  stores/
    trip-store.ts             # Zustand state (persisted)
  data/
    regions.ts                # 160+ quests across 16 German states
    germany-states.json       # GeoJSON for the exploration map
  types/
    index.ts                  # TypeScript types
  db/
    migration.sql             # Supabase database + storage setup
public/
  manifest.json               # PWA manifest
  sw.js                       # Service worker (offline caching)
  icons/                      # App icons (SVG)
```

## Coming Soon

- Badges and leaderboard
- Community-submitted quests
- Shareable postcard export for completed quests
- Mobile app (App Store / Play Store)
