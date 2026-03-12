import { createClient } from "./supabase";
import type { CompletedQuestData, Trip } from "@/types";

export async function fetchCompletedQuests(): Promise<
  Record<string, CompletedQuestData>
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return {};

  const { data, error } = await supabase
    .from("completed_quests")
    .select("quest_id, photo_url, completed_at")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch completed quests:", error);
    return {};
  }

  const result: Record<string, CompletedQuestData> = {};
  for (const row of data) {
    result[row.quest_id] = {
      questId: row.quest_id,
      photoUrl: row.photo_url ?? "",
      completedAt: row.completed_at,
    };
  }
  return result;
}

export async function syncQuestCompletion(
  questId: string,
  photoUrl: string
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase.from("completed_quests").upsert(
    {
      user_id: user.id,
      quest_id: questId,
      photo_url: photoUrl,
    },
    { onConflict: "user_id,quest_id" }
  );

  if (error) {
    console.error("Failed to sync quest completion:", error);
    return false;
  }

  return true;
}

export async function mergeLocalWithRemote(
  localQuests: Record<string, CompletedQuestData>
): Promise<Record<string, CompletedQuestData>> {
  const remoteQuests = await fetchCompletedQuests();

  // Merge: remote takes precedence for photo URLs, but keep local entries too
  const merged: Record<string, CompletedQuestData> = {
    ...localQuests,
    ...remoteQuests,
  };

  // For local entries that have a photo but remote doesn't, keep local photo
  for (const [id, local] of Object.entries(localQuests)) {
    if (remoteQuests[id] && !remoteQuests[id].photoUrl && local.photoUrl) {
      merged[id] = { ...remoteQuests[id], photoUrl: local.photoUrl };
    }
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return merged;

  // Push any local-only entries to remote
  const newRemote = Object.values(localQuests).filter(
    (q) => !remoteQuests[q.questId]
  );
  if (newRemote.length > 0) {
    const rows = newRemote.map((q) => ({
      user_id: user.id,
      quest_id: q.questId,
      photo_url: q.photoUrl,
    }));

    await supabase
      .from("completed_quests")
      .upsert(rows, { onConflict: "user_id,quest_id" });
  }

  return merged;
}

export async function fetchSavedTrips(): Promise<Trip[]> {
  try {
    const res = await fetch("/api/trips");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.trips) ? data.trips : [];
  } catch {
    return [];
  }
}

export async function syncSavedTrip(trip: Trip): Promise<void> {
  try {
    await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trip.title, trip }),
    });
  } catch {
    // Offline — will sync on next load
  }
}

function tripKey(t: Trip): string {
  return `${t.title}|${t.origin?.name ?? ""}|${t.destination?.name ?? ""}|${(t.createdAt ?? "").slice(0, 16)}`;
}

export async function mergeLocalTripsWithRemote(
  localTrips: Trip[]
): Promise<Trip[]> {
  const remoteTrips = await fetchSavedTrips();

  const remoteKeys = new Set(remoteTrips.map(tripKey));

  const localOnly = localTrips.filter((t) => !remoteKeys.has(tripKey(t)));
  for (const trip of localOnly) {
    await syncSavedTrip(trip);
  }

  const localKeys = new Set(localTrips.map(tripKey));
  const remoteOnly = remoteTrips.filter((t) => !localKeys.has(tripKey(t)));

  return [...localTrips, ...remoteOnly];
}
