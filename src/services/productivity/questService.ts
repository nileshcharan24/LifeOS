"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { grantXP } from "@/services/economy/xpService";

export async function fetchQuests() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quests").select("*");
  if (error) {
    throw error;
  }
  return data;
}

export async function createQuest(quest: {
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User must be logged in to create a quest");
  }

  const xpMap = {
    daily: 50,
    weekly: 200,
    monthly: 500,
  };

  const { error } = await supabase.from("quests").insert([
    {
      name: quest.name,
      description: quest.description,
      frequency: quest.frequency,
      profile_id: user.id,
      xp_reward: xpMap[quest.frequency as keyof typeof xpMap] || 50,
      is_active: true
    },
  ]);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/quests");
}

export async function completeQuest(questId: string, xpReward: number, questName: string) {
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("quests")
    .update({ is_active: false, last_completed_at: new Date().toISOString() })
    .eq("id", questId);

  if (updateError) {
    throw updateError;
  }

  await grantXP(xpReward, `Quest: ${questName}`);

  revalidatePath("/dashboard/quests");
  revalidatePath("/dashboard");
}