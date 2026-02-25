import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Quest,
  RoutePoint,
  Trip,
  QuestCategory,
  CompletedQuestData,
} from "@/types";
import { syncQuestCompletion, mergeLocalWithRemote } from "@/lib/sync";

interface TripState {
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  routeGeometry: [number, number][];
  quests: Quest[];
  selectedQuest: Quest | null;
  interests: QuestCategory[];
  maxDetourMinutes: number;
  isLoadingRoute: boolean;
  isLoadingQuests: boolean;
  savedTrips: Trip[];
  completedQuests: Record<string, CompletedQuestData>;
  hasSynced: boolean;

  completedQuestIds: () => string[];
  setOrigin: (point: RoutePoint | null) => void;
  setDestination: (point: RoutePoint | null) => void;
  setRouteGeometry: (geometry: [number, number][]) => void;
  setQuests: (quests: Quest[]) => void;
  setSelectedQuest: (quest: Quest | null) => void;
  toggleInterest: (category: QuestCategory) => void;
  setMaxDetourMinutes: (minutes: number) => void;
  setIsLoadingRoute: (loading: boolean) => void;
  setIsLoadingQuests: (loading: boolean) => void;
  completeQuest: (questId: string, photoUrl: string) => void;
  completeMainQuest: (questId: string, photoUrl: string) => void;
  saveTrip: (title: string) => string;
  deleteTrip: (tripId: string) => void;
  loadTrip: (tripId: string) => void;
  syncWithCloud: () => Promise<void>;
  reset: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      origin: null,
      destination: null,
      routeGeometry: [],
      quests: [],
      selectedQuest: null,
      interests: [],
      maxDetourMinutes: 30,
      isLoadingRoute: false,
      isLoadingQuests: false,
      savedTrips: [],
      completedQuests: {},
      hasSynced: false,

      completedQuestIds: () => Object.keys(get().completedQuests),
      setOrigin: (point) => set({ origin: point }),
      setDestination: (point) => set({ destination: point }),
      setRouteGeometry: (geometry) => set({ routeGeometry: geometry }),
      setQuests: (quests) => set({ quests }),
      setSelectedQuest: (quest) => set({ selectedQuest: quest }),
      toggleInterest: (category) =>
        set((state) => ({
          interests: state.interests.includes(category)
            ? state.interests.filter((i) => i !== category)
            : [...state.interests, category],
        })),
      setMaxDetourMinutes: (minutes) => set({ maxDetourMinutes: minutes }),
      setIsLoadingRoute: (loading) => set({ isLoadingRoute: loading }),
      setIsLoadingQuests: (loading) => set({ isLoadingQuests: loading }),
      completeQuest: (questId, photoUrl) =>
        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, completed: true, photoUrl } : q
          ),
          completedQuests: {
            ...state.completedQuests,
            [questId]: {
              questId,
              photoUrl,
              completedAt: new Date().toISOString(),
            },
          },
        })),
      completeMainQuest: (questId, photoUrl) => {
        const state = get();
        if (state.completedQuests[questId]) return;

        const data: CompletedQuestData = {
          questId,
          photoUrl,
          completedAt: new Date().toISOString(),
        };

        set({
          completedQuests: {
            ...state.completedQuests,
            [questId]: data,
          },
        });

        syncQuestCompletion(questId, photoUrl).catch(() => {
          // Offline — persisted locally, will sync on next load
        });
      },
      saveTrip: (title: string) => {
        const state = get();
        if (!state.origin || !state.destination) return "";
        const id = crypto.randomUUID();
        const trip: Trip = {
          id,
          title,
          origin: state.origin,
          destination: state.destination,
          waypoints: [],
          quests: state.quests,
          routeGeometry: state.routeGeometry,
          createdAt: new Date().toISOString(),
        };
        set({ savedTrips: [...state.savedTrips, trip] });
        return id;
      },
      deleteTrip: (tripId: string) => {
        set((state) => ({
          savedTrips: state.savedTrips.filter((t) => t.id !== tripId),
        }));
      },
      loadTrip: (tripId: string) => {
        const state = get();
        const trip = state.savedTrips.find((t) => t.id === tripId);
        if (!trip) return;
        set({
          origin: trip.origin,
          destination: trip.destination,
          routeGeometry: trip.routeGeometry ?? [],
          quests: trip.quests,
        });
      },
      syncWithCloud: async () => {
        const state = get();
        try {
          const merged = await mergeLocalWithRemote(state.completedQuests);
          set({ completedQuests: merged, hasSynced: true });
        } catch {
          set({ hasSynced: true });
        }
      },
      reset: () =>
        set({
          origin: null,
          destination: null,
          routeGeometry: [],
          quests: [],
          selectedQuest: null,
          interests: [],
          maxDetourMinutes: 30,
          isLoadingRoute: false,
          isLoadingQuests: false,
          savedTrips: [],
          hasSynced: false,
        }),
    }),
    {
      name: "travelguide-storage",
      version: 1,
      partialize: (state) => ({
        completedQuests: state.completedQuests,
        savedTrips: state.savedTrips,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 || !version) {
          // Migrate from old completedQuestIds[] to new completedQuests Record
          const oldIds = (state.completedQuestIds as string[] | undefined) ?? [];
          const completedQuests: Record<string, CompletedQuestData> =
            (state.completedQuests as Record<string, CompletedQuestData>) ?? {};

          for (const id of oldIds) {
            if (!completedQuests[id]) {
              completedQuests[id] = {
                questId: id,
                photoUrl: "",
                completedAt: new Date().toISOString(),
              };
            }
          }
          return { ...state, completedQuests, completedQuestIds: undefined };
        }
        return state;
      },
    }
  )
);
