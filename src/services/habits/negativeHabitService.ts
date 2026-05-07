"use server";

import { createClient } from "@/lib/supabase/server";
import { penalizeXP } from "@/services/economy/xpService";
import { getXPConfig } from "@/services/economy/xpConfigService";

export type Intensity = "mild" | "moderate" | "severe";

export async function getNegativeHabits() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("negative_habits")
    .select("*")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createNegativeHabit(name: string, description?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("negative_habits").insert({
    profile_id: user.id,
    name,
    description: description ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function updateNegativeHabit(id: string, name: string, description?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("negative_habits")
    .update({ name, description: description ?? null })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

export async function deleteNegativeHabit(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("negative_habits")
    .update({ is_active: false })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

export async function logNegativeHabit(
  habitId: string,
  habitName: string,
  date: string,
  intensity: Intensity,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Insert the log
  const { data: log, error } = await supabase
    .from("negative_habit_logs")
    .insert({
      habit_id: habitId,
      profile_id: user.id,
      date,
      intensity,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Apply XP penalty (negative habits are the only thing that can cause level-down)
  const config = await getXPConfig();
  const penalty =
    intensity === "severe"
      ? config.xp_neg_severe
      : intensity === "moderate"
      ? config.xp_neg_moderate
      : config.xp_neg_mild;

  const result = await penalizeXP(
    penalty,
    `Negative habit: ${habitName} (${intensity})`,
    "negative_habit",
    log.id
  );

  return { xpPenalty: penalty, leveledDown: result.leveledDown, newLevel: result.newLevel };
}

export async function deleteNegativeHabitLog(logId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("negative_habit_logs")
    .delete()
    .eq("id", logId)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

export async function getNegativeHabitLogs(days: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("negative_habit_logs")
    .select("*, negative_habits(name)")
    .eq("profile_id", user.id)
    .gte("date", sinceStr)
    .order("logged_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
