"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateDailyStreak } from "@/services/economy/xpService";

export async function createJournalEntry(
  content: string,
  moodScore: number,
  isEncrypted: boolean,
  opts?: { moodTags?: string[]; energyLevel?: number; categoryTags?: string[] }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be logged in to create a journal entry");
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert([
      {
        profile_id: user.id,
        content,
        mood_score: moodScore,
        is_encrypted: isEncrypted,
        mood_tags: opts?.moodTags ?? [],
        energy_level: opts?.energyLevel ?? null,
        category_tags: opts?.categoryTags ?? [],
      },
    ]);

  if (error) {
    throw new Error(error.message);
  }

  // Journal entries give 0 XP (reflection only — per spec)
  // Update streak only
  await updateDailyStreak(user.id);

  revalidatePath("/dashboard");
  return { success: true, data };
}

export async function getJournalEntries() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be logged in to fetch journal entries");
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, data };
}
