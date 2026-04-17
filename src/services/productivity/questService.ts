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
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Epic";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User must be logged in to create a quest");
  }

  const xpMap = {
    Easy: 50,
    Medium: 100,
    Hard: 200,
    Epic: 500,
  };

  const { error } = await supabase.from("quests").insert([
    {
      ...quest,
      profile_id: user.id,
      xp_reward: xpMap[quest.difficulty],
    },
  ]);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/quests");
}

export async function completeQuest(questId: number, xpReward: number) {
  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from("quests")
    .update({ status: "completed" })
    .eq("id", questId);

  if (updateError) {
    throw updateError;
  }

  await grantXP(xpReward, `Completed quest #${questId}`);

  revalidatePath("/dashboard/quests");
  revalidatePath("/dashboard");
}