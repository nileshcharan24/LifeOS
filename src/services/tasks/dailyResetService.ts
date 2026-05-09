"use server";

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

// Track the last reset date per-process to avoid redundant DB calls within
// the same server process on the same calendar day.
let lastResetDate: string | null = null;

export async function resetDailyHabitsAndTasks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = format(new Date(), "yyyy-MM-dd");

  if (lastResetDate === today) {
    return { success: true, skipped: true };
  }
  lastResetDate = today;

  // ─── 1. Delete completed tasks from previous days ─────────────────────────
  // These are already captured in xp_transactions for history/stats, so
  // removing the row is safe and keeps daily_tasks clean.
  // Incomplete tasks from previous days are intentionally left in place so
  // they carry forward to today's view.
  await supabase
    .from("daily_tasks")
    .delete()
    .eq("user_id", user.id)
    .eq("is_completed", true)
    .lt("task_date", today);

  // ─── 2. Ensure today's habit instances exist ──────────────────────────────
  // ensureAndGetHabitInstances already handles this, but calling it here
  // as part of the reset guarantees instances are ready before the page loads.
  const { data: habits } = await supabase
    .from("habits")
    .select("id")
    .eq("profile_id", user.id)
    .eq("enabled", true);

  if (!habits?.length) return { success: true, skipped: false };

  const { data: existing } = await supabase
    .from("habit_instances")
    .select("habit_id")
    .eq("profile_id", user.id)
    .eq("date", today);

  const existingIds = new Set((existing || []).map((i: any) => i.habit_id));
  const toCreate = habits.filter((h: any) => !existingIds.has(h.id));

  if (toCreate.length > 0) {
    await supabase.from("habit_instances").insert(
      toCreate.map((h: any) => ({
        habit_id: h.id,
        profile_id: user.id,
        date: today,
        completed: false,
      }))
    );
  }

  return { success: true, skipped: false };
}
