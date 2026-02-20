import { createClient } from "./supabase";
import type { CompletedQuestData } from "@/types";

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
