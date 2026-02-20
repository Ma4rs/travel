import Link from "next/link";
import UserMenu from "@/components/UserMenu";

const features = [
  {
    icon: "🗺️",
    title: "AI-Powered Quests",
    description:
      "Our AI finds hidden gems, scenic detours, and local favorites you'd never discover on your own.",
  },
  {
    icon: "🎮",
    title: "Gamified Exploration",
    description:
      "Earn XP, unlock badges, and compete with friends. Turn every trip into an adventure.",
  },
  {
    icon: "⚡",
    title: "Real-Time Suggestions",
    description:
      "Get quest notifications as you drive. Weather-aware, time-aware, and tailored to your interests.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-end px-6 py-4">
        <UserMenu />
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-8 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
            Your road trip, reimagined
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl">
            Every road has
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {" "}
              side quests
            </span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted">
            Discover hidden gems, scenic detours, and unforgettable stops along
            any route. AI-powered, gamified, and completely free.
          </p>

          {/* Mode Cards */}
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            <Link href="/plan" className="group">
              <div className="rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/50 hover:bg-card-hover hover:shadow-lg hover:shadow-primary/5">
                <div className="mb-4 text-4xl">🧭</div>
                <h2 className="mb-2 text-xl font-semibold">Plan a Trip</h2>
                <p className="text-sm text-muted">
                  Tell us your budget, time, and interests. We&apos;ll suggest
                  amazing destinations with side quests built in.
                </p>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Get inspired
                  <svg
                    className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>

            <Link href="/route" className="group">
              <div className="rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-secondary/50 hover:bg-card-hover hover:shadow-lg hover:shadow-secondary/5">
                <div className="mb-4 text-4xl">🛣️</div>
                <h2 className="mb-2 text-xl font-semibold">
                  Enhance My Route
                </h2>
                <p className="text-sm text-muted">
                  Already have a route? We&apos;ll find incredible side quests
                  along the way you&apos;d never find on your own.
                </p>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-secondary">
                  Find quests
                  <svg
                    className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Explore + Album Cards — full width below */}
          <div className="mx-auto mt-6 max-w-3xl grid gap-4 sm:grid-cols-2">
            <Link href="/explore" className="group block">
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-accent/50 hover:bg-card-hover hover:shadow-lg hover:shadow-accent/5">
                <div className="mb-3 text-3xl">🗺️</div>
                <h2 className="mb-1 text-lg font-semibold">
                  Exploration Progress
                </h2>
                <p className="mb-3 text-sm text-muted">
                  Track how much of Germany you&apos;ve explored. Complete
                  quests in every state and fill the map.
                </p>
                <span className="inline-flex items-center text-sm font-medium text-accent">
                  View map
                  <svg
                    className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </Link>

            <Link href="/album" className="group block">
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-secondary/50 hover:bg-card-hover hover:shadow-lg hover:shadow-secondary/5">
                <div className="mb-3 text-3xl">📸</div>
                <h2 className="mb-1 text-lg font-semibold">
                  Memory Album
                </h2>
                <p className="mb-3 text-sm text-muted">
                  Browse your travel photos. Every completed quest becomes a
                  memory in your personal album.
                </p>
                <span className="inline-flex items-center text-sm font-medium text-secondary">
                  View album
                  <svg
                    className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Not just navigation.{" "}
            <span className="text-primary">Adventure.</span>
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-muted">
          <p>TravelGuide — Side quests for every trip</p>
        </div>
      </footer>
    </main>
  );
}
