"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function completeHabit(
  questId: string,
  questName: string,
  xpReward: number
): Promise<{ success: boolean; xpGranted: number; streakBonus: number; alreadyDone: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Guard: prevent double-completion on the same day
  const { data: todayTx } = await supabase
    .from("xp_transactions")
    .select("id")
    .eq("profile_id", user.id)
    .ilike("reason", `Quest: ${questName}%`)
    .gte("created_at", todayStart.toISOString())
    .limit(1);

  if (todayTx && todayTx.length > 0) {
    return { success: false, xpGranted: 0, streakBonus: 0, alreadyDone: true };
  }

  // Calculate streak: count consecutive days of prior completions
  const { data: recentTxs } = await supabase
    .from("xp_transactions")
    .select("created_at")
    .eq("profile_id", user.id)
    .ilike("reason", `Quest: ${questName}%`)
    .order("created_at", { ascending: false })
    .limit(60);

  let streak = 0;
  if (recentTxs && recentTxs.length > 0) {
    const completedDates = new Set(
      recentTxs.map((tx) => {
        const d = new Date(tx.created_at!);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
    const check = new Date();
    check.setDate(check.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
      if (completedDates.has(key)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Streak multiplier: +25% at 3 days, +50% at 7 days, +100% at 30 days
  let streakBonus = 0;
  if (streak >= 30) streakBonus = xpReward;
  else if (streak >= 7) streakBonus = Math.floor(xpReward * 0.5);
  else if (streak >= 3) streakBonus = Math.floor(xpReward * 0.25);

  const totalXP = xpReward + streakBonus;
  const reason =
    streakBonus > 0
      ? `Quest: ${questName} (${streak + 1}d streak +${streakBonus} XP)`
      : `Quest: ${questName}`;

  // Insert XP transaction
  await supabase.from("xp_transactions").insert([
    { profile_id: user.id, amount: totalXP, reason, category: "habit" },
  ]);

  // Mark quest last_completed_at
  await supabase
    .from("quests")
    .update({ last_completed_at: new Date().toISOString() })
    .eq("id", questId);

  // Update profile XP and level
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level")
    .eq("id", user.id)
    .single();

  if (profile) {
    const newTotalXp = (profile.total_xp || 0) + totalXP;
    const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1;

    await supabase
      .from("profiles")
      .update({ total_xp: newTotalXp, level: newLevel })
      .eq("id", user.id);

    if (newLevel > (profile.level || 1)) {
      await supabase
        .from("level_logs")
        .insert([{ profile_id: user.id, level_reached: newLevel }]);
    }
  }

  revalidatePath("/dashboard");
  return { success: true, xpGranted: totalXP, streakBonus, alreadyDone: false };
}

export async function spendXP(
  userId: string,
  amount: number,
  itemName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp")
    .eq("id", userId)
    .single();

  if (!profile || profile.total_xp < amount) {
    return { success: false, error: "Not enough XP" };
  }

  const newTotalXp = profile.total_xp - amount;

  await supabase
    .from("xp_transactions")
    .insert([
      {
        profile_id: userId,
        amount: -amount,
        reason: `Indulgence: ${itemName}`,
        category: "spend",
      },
    ]);

  await supabase
    .from("profiles")
    .update({ total_xp: newTotalXp })
    .eq("id", userId);

  revalidatePath("/dashboard");
  return { success: true };
}
