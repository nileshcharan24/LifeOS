"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { grantXP } from "@/services/economy/xpService";
import { updateDailyStreak } from "@/services/economy/xpService";

export async function createJournalEntry(content: string, moodScore: number, isEncrypted: boolean) {
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
      },
    ]);

  if (error) {
    throw new Error(error.message);
  }

  // Grant 20 XP for journaling
  await grantXP(20, "Daily Journal Entry");
  
  // Update Streak
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
