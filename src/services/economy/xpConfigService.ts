"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_XP_CONFIG } from "@/lib/xpDefaults";

export type XPConfig = {
  id: string;
  profile_id: string;
  xp_task_default: number;
  xp_habit_streak1: number;
  xp_habit_streak7: number;
  xp_habit_streak30: number;
  xp_journal: number;
  xp_food_meal: number;
  xp_sleep_log: number;
  xp_exercise_min: number;
  xp_neg_mild: number;
  xp_neg_moderate: number;
  xp_neg_severe: number;
};

export async function getXPConfig(): Promise<XPConfig> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("xp_config")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Table doesn't exist yet (migration 07 pending) — silently return defaults
  if (error || !data) return { id: "", profile_id: user.id, ...DEFAULT_XP_CONFIG };
  return data as XPConfig;
}

export async function upsertXPConfig(
  updates: Partial<Omit<XPConfig, "id" | "profile_id">>
): Promise<XPConfig> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("xp_config")
    .upsert(
      { profile_id: user.id, ...DEFAULT_XP_CONFIG, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as XPConfig;
}
