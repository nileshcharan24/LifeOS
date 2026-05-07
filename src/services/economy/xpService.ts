"use server";

import { createClient } from "@/lib/supabase/server";
import { calcLevel } from "@/lib/xp";

export async function grantXP(amount: number, reason: string, sourceType?: string, sourceId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be logged in to grant XP");

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level")
    .eq("id", user.id)
    .single();

  const currentXP = profile?.total_xp ?? 0;
  const newTotalXP = currentXP + amount;
  const newLevel = calcLevel(newTotalXP);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ total_xp: newTotalXP, level: newLevel })
    .eq("id", user.id);

  if (updateError) throw updateError;

  // Non-critical audit log — silently skip if table doesn't exist yet
  await supabase.from("xp_events").insert({
    profile_id: user.id,
    delta: amount,
    reason,
    source_type: sourceType ?? null,
    source_id: sourceId ?? null,
  }).then(() => {}, () => {});

  const oldLevel = profile?.level ?? 1;
  if (newLevel > oldLevel) {
    await supabase
      .from("level_logs")
      .insert([{ profile_id: user.id, level_reached: newLevel }])
      .then(() => {}, () => {});
  }

  return { success: true, newTotalXP, newLevel, leveledUp: newLevel > (profile?.level ?? 1) };
}

export async function spendXPFromPool(amount: number, reason: string, indulgenceId?: string, indulgenceName?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level")
    .eq("id", user.id)
    .single();

  const currentXP = profile?.total_xp ?? 0;
  const currentLevel = calcLevel(currentXP);
  const levelFloor = (currentLevel - 1) * 1000;
  const spendingPool = currentXP - levelFloor;

  if (spendingPool < amount) {
    return { success: false, reason: "insufficient_pool", spendingPool };
  }

  const newTotalXP = currentXP - amount;

  const { error } = await supabase
    .from("profiles")
    .update({ total_xp: newTotalXP })
    .eq("id", user.id);

  if (error) throw error;

  // Non-critical audit logs — silently skip if tables don't exist yet
  await supabase.from("xp_events").insert({
    profile_id: user.id,
    delta: -amount,
    reason,
    source_type: "indulgence",
    source_id: indulgenceId ?? null,
  }).then(() => {}, () => {});

  if (indulgenceName) {
    await supabase.from("indulgence_logs").insert({
      profile_id: user.id,
      indulgence_id: indulgenceId ?? null,
      indulgence_name: indulgenceName,
      xp_spent: amount,
    }).then(() => {}, () => {});
  }

  return { success: true, newTotalXP, spendingPool: spendingPool - amount };
}

export async function penalizeXP(amount: number, reason: string, sourceType?: string, sourceId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level")
    .eq("id", user.id)
    .single();

  const currentXP = profile?.total_xp ?? 0;
  const newTotalXP = Math.max(0, currentXP - amount);
  const oldLevel = calcLevel(currentXP);
  const newLevel = calcLevel(newTotalXP);

  const { error } = await supabase
    .from("profiles")
    .update({ total_xp: newTotalXP, level: newLevel })
    .eq("id", user.id);

  if (error) throw error;

  await supabase.from("xp_events").insert({
    profile_id: user.id,
    delta: -amount,
    reason,
    source_type: sourceType ?? "negative_habit",
    source_id: sourceId ?? null,
  }).then(() => {}, () => {});

  return { success: true, newTotalXP, newLevel, leveledDown: newLevel < oldLevel };
}

export async function updateDailyStreak(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_login, daily_streak")
    .eq("id", userId)
    .single();

  if (profile) {
    const now = new Date();
    const lastLogin = profile.last_login ? new Date(profile.last_login) : null;
    let newStreak = profile.daily_streak || 0;

    if (lastLogin) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysDiff = Math.floor(now.getTime() / msPerDay) - Math.floor(lastLogin.getTime() / msPerDay);
      if (daysDiff === 1) newStreak += 1;
      else if (daysDiff > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    await supabase
      .from("profiles")
      .update({ daily_streak: newStreak, last_login: now.toISOString() })
      .eq("id", userId);
  }
}
