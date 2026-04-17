"use server";

import { createClient } from "@/lib/supabase/server";

export function calculateLevel(totalXp: number) {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export async function grantXP(amount: number, reason: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be logged in to grant XP");
  }

  // 1. Insert transaction
  const { error: txError } = await supabase
    .from("xp_transactions")
    .insert([{ profile_id: user.id, amount, reason }]);

  if (txError) throw txError;

  // 2. Update profile total_xp and check level up
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level")
    .eq("id", user.id)
    .single();

  if (profile) {
    const newTotalXp = (profile.total_xp || 0) + amount;
    const newLevel = calculateLevel(newTotalXp);
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ total_xp: newTotalXp, level: newLevel })
      .eq("id", user.id);
      
    if (updateError) throw updateError;
    
    // 3. Log level up if it happened
    if (newLevel > (profile.level || 1)) {
      await supabase
        .from("level_logs")
        .insert([{ profile_id: user.id, level_reached: newLevel }]);
    }
  }

  return { success: true };
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
      
      if (daysDiff === 1) {
        newStreak += 1;
      } else if (daysDiff > 1) {
        newStreak = 1; // reset streak
      }
      // If daysDiff === 0, it's the same day, don't increment streak but update last_login
    } else {
      newStreak = 1; // First login
    }
    
    await supabase
      .from("profiles")
      .update({ daily_streak: newStreak, last_login: now.toISOString() })
      .eq("id", userId);
  }
}
