"use server";

import { createClient } from "@/lib/supabase/server";
import { archiveItem } from "@/services/archiveService";
import { revalidatePath } from "next/cache";
import { addDays, addWeeks, format, parseISO } from "date-fns";
import { randomUUID } from "crypto";
import { TASK_XP, PERFECT_DAY_BONUS, PRODUCTIVE_DAY_BONUS, ASSESSMENT_XP } from "./taskTrackerConstants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Habit = {
  id: string;
  name: string;
  xp_value: number;
  enabled: boolean;
};

export type HabitInstance = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  notes: string | null;
  completed_at: string | null;
  xp_earned: number | null;
};

export type DailyTask = {
  id: string;
  name: string;
  urgency: "high" | "medium" | "low";
  deadline: string | null;
  notes: string | null;
  recurring: "none" | "daily" | "weekly";
  series_id: string | null;
  is_completed: boolean;
  xp_earned: number | null;
  task_date: string;
  completed_at: string | null;
};

export type AssessmentEntry = {
  id: string;
  course_id: string;
  course_name: string;
  name: string;
  type: string;
  due_date: string;
  status: "pending" | "submitted" | "completed";
};

// ─── Internal XP helper ───────────────────────────────────────────────────────
// Mirrors the pattern in habitService.ts (insert transaction + update profile)

async function applyXP(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  amount: number,
  reason: string,
  category = "task"
) {
  await supabase.from("xp_transactions").insert([
    { profile_id: userId, amount, reason, category },
  ]);

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp, level")
    .eq("id", userId)
    .single();

  if (profile) {
    const newXp    = Math.max(0, (profile.total_xp || 0) + amount);
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    await supabase
      .from("profiles")
      .update({ total_xp: newXp, level: newLevel })
      .eq("id", userId);

    if (newLevel > (profile.level || 1) && amount > 0) {
      await supabase
        .from("level_logs")
        .insert([{ profile_id: userId, level_reached: newLevel }]);
    }
  }
}

// ─── Habits CRUD ──────────────────────────────────────────────────────────────

export async function getHabits(): Promise<Habit[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("habits")
    .select("id, name, xp_value, enabled")
    .eq("profile_id", user.id)
    .order("created_at");

  return (data || []) as Habit[];
}

export async function createHabit(name: string, xpValue: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("habits").insert([{
    profile_id: user.id,
    name: name.trim(),
    xp_value: xpValue,
    enabled: true,
  }]);
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function updateHabit(
  id: string,
  name: string,
  xpValue: number,
  enabled: boolean
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ name: name.trim(), xp_value: xpValue, enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function deleteHabit(id: string) {
  const supabase = await createClient();
  await supabase.from("habits").delete().eq("id", id);
  revalidatePath("/dashboard");
}

// ─── Habit Instances ──────────────────────────────────────────────────────────

export async function ensureAndGetHabitInstances(date: string): Promise<HabitInstance[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // All enabled habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id")
    .eq("profile_id", user.id)
    .eq("enabled", true);

  if (!habits?.length) return [];

  // Existing instances for this date
  const { data: existing } = await supabase
    .from("habit_instances")
    .select("habit_id")
    .eq("profile_id", user.id)
    .eq("date", date);

  const existingIds = new Set((existing || []).map((i: any) => i.habit_id));
  const toCreate = habits.filter((h: any) => !existingIds.has(h.id));

  if (toCreate.length > 0) {
    await supabase.from("habit_instances").insert(
      toCreate.map((h: any) => ({
        habit_id:   h.id,
        profile_id: user.id,
        date,
        completed:  false,
      }))
    );
  }

  const { data: instances } = await supabase
    .from("habit_instances")
    .select("id, habit_id, date, completed, notes, completed_at, xp_earned")
    .eq("profile_id", user.id)
    .eq("date", date);

  return (instances || []) as HabitInstance[];
}

export async function completeHabitInstance(
  instanceId: string,
  xpValue: number,
  habitName: string
): Promise<{ xpGranted: number; isPerfectDay: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("habit_instances")
    .update({ completed: true, completed_at: new Date().toISOString(), xp_earned: xpValue })
    .eq("id", instanceId);

  await applyXP(supabase, user.id, xpValue, `Habit: ${habitName}`, "habit");

  // Check if all habits for today are now complete → Perfect Day bonus
  const { data: instance } = await supabase
    .from("habit_instances")
    .select("date")
    .eq("id", instanceId)
    .single();

  let isPerfectDay = false;
  if (instance?.date) {
    const { data: allToday } = await supabase
      .from("habit_instances")
      .select("completed")
      .eq("profile_id", user.id)
      .eq("date", instance.date);

    if (allToday && allToday.length > 0 && allToday.every((i: any) => i.completed)) {
      isPerfectDay = true;
      await applyXP(supabase, user.id, PERFECT_DAY_BONUS, "Perfect Day Bonus", "bonus");
    }
  }

  revalidatePath("/dashboard");
  return { xpGranted: xpValue, isPerfectDay };
}

export async function uncompleteHabitInstance(
  instanceId: string
): Promise<{ xpReversed: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: instance } = await supabase
    .from("habit_instances")
    .select("xp_earned")
    .eq("id", instanceId)
    .single();

  await supabase
    .from("habit_instances")
    .update({ completed: false, completed_at: null, xp_earned: null })
    .eq("id", instanceId);

  const xpEarned = (instance as any)?.xp_earned || 0;
  if (xpEarned > 0) {
    await applyXP(supabase, user.id, -xpEarned, `Habit uncompleted (reversal)`, "reversal");
  }

  revalidatePath("/dashboard");
  return { xpReversed: xpEarned };
}

// ─── Daily Tasks ──────────────────────────────────────────────────────────────

export async function getDailyTasksForDate(date: string): Promise<DailyTask[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("daily_tasks")
    .select("id, name, urgency, deadline, notes, recurring, series_id, is_completed, xp_earned, task_date, completed_at")
    .eq("user_id", user.id)
    .eq("task_date", date)
    .order("created_at");

  return (data || []).map((t: any) => ({
    ...t,
    urgency:   t.urgency   || "medium",
    recurring: t.recurring || "none",
  })) as DailyTask[];
}

export async function createDailyTask(
  name: string,
  urgency: "high" | "medium" | "low",
  deadline: string | null,
  notes: string | null,
  recurring: "none" | "daily" | "weekly",
  date: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const seriesId  = recurring !== "none" ? randomUUID() : null;
  const xpReward  = TASK_XP[urgency];
  const baseRow   = {
    user_id:    user.id,
    name:       name.trim(),
    urgency,
    notes:      notes || null,
    recurring,
    series_id:  seriesId,
    xp_reward:  xpReward,
    is_completed: false,
  };

  const rows: any[] = [{
    ...baseRow,
    deadline:   deadline || null,
    task_date:  date,
  }];

  // Pre-generate future recurring instances
  if (recurring === "daily") {
    for (let i = 1; i <= 30; i++) {
      rows.push({ ...baseRow, task_date: format(addDays(parseISO(date), i), "yyyy-MM-dd"), deadline: null });
    }
  } else if (recurring === "weekly") {
    for (let i = 1; i <= 8; i++) {
      rows.push({ ...baseRow, task_date: format(addWeeks(parseISO(date), i), "yyyy-MM-dd"), deadline: null });
    }
  }

  const { error } = await supabase.from("daily_tasks").insert(rows);
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function updateDailyTask(
  id: string,
  name: string,
  urgency: "high" | "medium" | "low",
  deadline: string | null,
  notes: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_tasks")
    .update({ name: name.trim(), urgency, deadline: deadline || null, notes: notes || null })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function completeDailyTask(
  id: string,
  urgency: "high" | "medium" | "low",
  taskName: string,
  date: string
): Promise<{ xpGranted: number; isProductiveDay: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const xp = TASK_XP[urgency];

  await supabase
    .from("daily_tasks")
    .update({ is_completed: true, xp_earned: xp, completed_at: new Date().toISOString() })
    .eq("id", id);

  await applyXP(supabase, user.id, xp, `Task: ${taskName}`, "task");

  // Check Productive Day bonus — all tasks for this date completed
  const { data: allTasks } = await supabase
    .from("daily_tasks")
    .select("is_completed")
    .eq("user_id", user.id)
    .eq("task_date", date);

  const isProductiveDay =
    allTasks !== null && allTasks.length > 0 && allTasks.every((t: any) => t.is_completed);

  if (isProductiveDay) {
    await applyXP(supabase, user.id, PRODUCTIVE_DAY_BONUS, "Productive Day Bonus", "bonus");
  }

  revalidatePath("/dashboard");
  return { xpGranted: xp, isProductiveDay };
}

export async function uncompleteDailyTask(id: string): Promise<{ xpReversed: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: task } = await supabase
    .from("daily_tasks")
    .select("xp_earned, name")
    .eq("id", id)
    .single();

  await supabase
    .from("daily_tasks")
    .update({ is_completed: false, xp_earned: null, completed_at: null })
    .eq("id", id);

  const xpEarned = (task as any)?.xp_earned || 0;
  if (xpEarned > 0) {
    await applyXP(supabase, user.id, -xpEarned, `Task uncompleted: ${(task as any)?.name}`, "reversal");
  }

  revalidatePath("/dashboard");
  return { xpReversed: xpEarned };
}

export async function deleteDailyTask(id: string, deleteSeries: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: task } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (!task) throw new Error("Task not found");

  await archiveItem("daily_task", task);

  if (deleteSeries) {
    if ((task as any)?.series_id) {
      await supabase
        .from("daily_tasks")
        .delete()
        .eq("series_id", (task as any).series_id)
        .eq("user_id", user.id)
        .gte("task_date", (task as any).task_date);
      return;
    }
  }

  await supabase.from("daily_tasks").delete().eq("id", id);
  revalidatePath("/dashboard");
}

export async function toggleDailyTask(id: string, isCompleted: boolean) {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new Error("Not authenticated");

 const { data: task } = await supabase
   .from("daily_tasks")
   .select("xp_earned, name, urgency, task_date")
   .eq("id", id)
   .single();

 if (!task) throw new Error("Task not found");

  if (isCompleted) {
    if (!task.task_date) throw new Error("Task date not found");
    const result = await completeDailyTask(id, task.urgency as any, task.name || "Untitled Task", task.task_date);
    
    // Find and complete the corresponding planner task
    const { data: plannerTask } = await supabase
      .from("tasks")
      .select("id, is_completed")
      .eq("title", task.name)
      .single();

    if (plannerTask && !plannerTask.is_completed) {
      await togglePlannerTask(plannerTask.id, false);
    }
    return result;
  } else {
    const result = await uncompleteDailyTask(id);

    // Find and un-complete the corresponding planner task
    const { data: plannerTask } = await supabase
      .from("tasks")
      .select("id, is_completed")
      .eq("title", task.name)
      .single();
      
    if (plannerTask && plannerTask.is_completed) {
      await togglePlannerTask(plannerTask.id, true);
    }
    return result;
  }
}
// ─── Planner task bridge ──────────────────────────────────────────────────────
// Tasks from the `tasks` table (Planner) whose deadline falls within the
// provided UTC window (computed from the user's local midnight on the client).

export type PlannerTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  is_completed: boolean;
  category: string | null;
  description: string | null;
};

export async function getPlannerTasksForWindow(
  utcStart: string,
  utcEnd: string
): Promise<PlannerTask[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("tasks")
    .select("id, title, priority, deadline, is_completed, category, description")
    .eq("profile_id", user.id)
    .not("deadline", "is", null)
    .gte("deadline", utcStart)
    .lt("deadline", utcEnd)
    .order("deadline");

  return (data || []).map((t: any) => ({
    id:           t.id,
    title:        t.title,
    priority:     t.priority ?? "medium",
    deadline:     t.deadline,
    is_completed: t.is_completed ?? false,
    category:     t.category ?? null,
    description:  t.description ?? null,
  }));
}

export async function togglePlannerTask(id: string, currentlyCompleted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("tasks")
    .update({ is_completed: !currentlyCompleted })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function addPlannerTaskToDailyTasks(task: PlannerTask) {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) throw new Error("Not authenticated");

 const today = format(new Date(), "yyyy-MM-dd");

 const { error } = await supabase.from("daily_tasks").insert([
   {
     user_id: user.id,
     name: task.title,
     urgency: task.priority === "urgent" ? "high" : task.priority,
     deadline: task.deadline,
     notes: task.description || "",
     recurring: "none",
     is_completed: false,
     task_date: today,
   },
 ]);

 if (error) throw error;
 revalidatePath("/dashboard");
}

export async function removePlannerTaskFromDailyTasks(taskTitle: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = format(new Date(), "yyyy-MM-dd");

  await supabase
    .from("daily_tasks")
    .delete()
    .eq("user_id", user.id)
    .eq("name", taskTitle)
    .eq("task_date", today)
    .eq("is_completed", false);

  revalidatePath("/dashboard");
}

export async function removeFromTodayTasks(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function reschedulePlannerTask(taskTitle: string, newDeadline: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("tasks")
    .update({ deadline: newDeadline })
    .eq("profile_id", user.id)
    .eq("title", taskTitle)
    .eq("is_completed", false);

  revalidatePath("/dashboard");
}
// ─── Academic Integration ─────────────────────────────────────────────────────

export async function getAssessmentsForTracker(
  today: string,
  tomorrow: string
): Promise<AssessmentEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch hidden assessment IDs for today
  const { data: hidden } = await supabase
    .from("assessment_daily_overrides")
    .select("assessment_id")
    .eq("profile_id", user.id)
    .eq("date", today);

  const hiddenIds = new Set((hidden || []).map((h: any) => h.assessment_id));

  const { data } = await supabase
    .from("assessments")
    .select("id, course_id, name, type, due_date, status, courses(name)")
    .eq("profile_id", user.id)
    .in("due_date", [today, tomorrow])
    .neq("status", "completed")
    .order("due_date");

  return ((data || []) as any[])
    .filter((a) => !hiddenIds.has(a.id))
    .map((a) => ({
      id:          a.id,
      course_id:   a.course_id,
      course_name: a.courses?.name || "Unknown Course",
      name:        a.name,
      type:        a.type,
      due_date:    a.due_date,
      status:      a.status as AssessmentEntry["status"],
    }));
}

export async function hideAssessmentFromToday(assessmentId: string, date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("assessment_daily_overrides").upsert(
    [{ profile_id: user.id, assessment_id: assessmentId, date }],
    { onConflict: "profile_id,assessment_id,date" }
  );
}

export async function completeAssessmentFromTracker(
  assessmentId: string,
  assessmentName: string
): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("assessments")
    .update({ status: "completed", completed_date: format(new Date(), "yyyy-MM-dd") })
    .eq("id", assessmentId);

  await applyXP(supabase, user.id, ASSESSMENT_XP, `Assessment: ${assessmentName}`, "academic");
  revalidatePath("/dashboard");
  return ASSESSMENT_XP;
}

export async function uncompleteAssessmentFromTracker(
  assessmentId: string,
  assessmentName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("assessments")
    .update({ status: "pending", completed_date: null })
    .eq("id", assessmentId);

  await applyXP(supabase, user.id, -ASSESSMENT_XP, `Assessment uncompleted: ${assessmentName}`, "reversal");
  revalidatePath("/dashboard");
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getTrackerStats(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dayStart = `${date}T00:00:00`;
  const dayEnd   = `${date}T23:59:59`;

  const [{ data: instances }, { data: tasks }, { data: xpToday }] = await Promise.all([
    supabase
      .from("habit_instances")
      .select("completed, xp_earned")
      .eq("profile_id", user.id)
      .eq("date", date),
    supabase
      .from("daily_tasks")
      .select("is_completed, xp_earned")
      .eq("user_id", user.id)
      .eq("task_date", date),
    supabase
      .from("xp_transactions")
      .select("amount, reason, category")
      .eq("profile_id", user.id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd),
  ]);

  const habitsCompleted = (instances || []).filter((i: any) => i.completed).length;
  const totalHabits     = (instances || []).length;
  const tasksCompleted  = (tasks || []).filter((t: any) => t.is_completed).length;
  const totalTasks      = (tasks || []).length;

  const pos = (xpToday || []).filter((x: any) => x.amount > 0);
  const xpFromHabits   = pos.filter((x: any) => x.category === "habit"   ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromTasks    = pos.filter((x: any) => x.category === "task"    ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromAcademic = pos.filter((x: any) => x.category === "academic").reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromHealth   = pos.filter((x: any) => x.category === "health"  ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromCareer   = pos.filter((x: any) => x.category === "career"  ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromBonuses  = pos.filter((x: any) => x.category === "bonus"   ).reduce((s: number, x: any) => s + x.amount, 0);

  return {
    habitsCompleted,
    totalHabits,
    tasksCompleted,
    totalTasks,
    totalXp: xpFromHabits + xpFromTasks + xpFromAcademic + xpFromHealth + xpFromCareer + xpFromBonuses,
    xpBreakdown: {
      habits:   xpFromHabits,
      tasks:    xpFromTasks,
      academic: xpFromAcademic,
      health:   xpFromHealth,
      career:   xpFromCareer,
      bonuses:  xpFromBonuses,
    },
    perfectDay:    totalHabits > 0 && habitsCompleted === totalHabits,
    productiveDay: totalTasks  > 0 && tasksCompleted  === totalTasks,
  };
}

export async function getHabitRates(days: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const startDate = format(addDays(new Date(), -(days - 1)), "yyyy-MM-dd");
  const endDate   = format(new Date(), "yyyy-MM-dd");

  const [{ data: habits }, { data: instances }] = await Promise.all([
    supabase.from("habits").select("id, name").eq("profile_id", user.id).eq("enabled", true),
    supabase
      .from("habit_instances")
      .select("habit_id, completed")
      .eq("profile_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  return (habits || []).map((h: any) => {
    const hi        = (instances || []).filter((i: any) => i.habit_id === h.id);
    const completed = hi.filter((i: any) => i.completed).length;
    const total     = hi.length;
    return {
      id:        h.id,
      name:      h.name,
      completed,
      total,
      rate:      total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
}

// ─── Range Stats (for calendar date-picker) ───────────────────────────────────

export async function getTrackerStatsForRange(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rangeStart = `${startDate}T00:00:00`;
  const rangeEnd   = `${endDate}T23:59:59`;

  const [{ data: instances }, { data: tasks }, { data: xpRows }] = await Promise.all([
    supabase
      .from("habit_instances")
      .select("completed, xp_earned, date")
      .eq("profile_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("daily_tasks")
      .select("is_completed, xp_earned, task_date, urgency")
      .eq("user_id", user.id)
      .gte("task_date", startDate)
      .lte("task_date", endDate),
    supabase
      .from("xp_transactions")
      .select("amount, reason, category, created_at")
      .eq("profile_id", user.id)
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
  ]);

  const habitsCompleted = (instances || []).filter((i: any) => i.completed).length;
  const totalHabits     = (instances || []).length;
  const tasksCompleted  = (tasks || []).filter((t: any) => t.is_completed).length;
  const totalTasks      = (tasks || []).length;

  const pos = (xpRows || []).filter((x: any) => x.amount > 0);
  const xpFromHabits   = pos.filter((x: any) => x.category === "habit"   ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromTasks    = pos.filter((x: any) => x.category === "task"    ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromAcademic = pos.filter((x: any) => x.category === "academic").reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromHealth   = pos.filter((x: any) => x.category === "health"  ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromCareer   = pos.filter((x: any) => x.category === "career"  ).reduce((s: number, x: any) => s + x.amount, 0);
  const xpFromBonuses  = pos.filter((x: any) => x.category === "bonus"   ).reduce((s: number, x: any) => s + x.amount, 0);

  return {
    habitsCompleted,
    totalHabits,
    tasksCompleted,
    totalTasks,
    habitRate: totalHabits > 0 ? Math.round((habitsCompleted / totalHabits) * 100) : 0,
    taskRate:  totalTasks  > 0 ? Math.round((tasksCompleted  / totalTasks)  * 100) : 0,
    totalXp: xpFromHabits + xpFromTasks + xpFromAcademic + xpFromHealth + xpFromCareer + xpFromBonuses,
    xpBreakdown: {
      habits:   xpFromHabits,
      tasks:    xpFromTasks,
      academic: xpFromAcademic,
      health:   xpFromHealth,
      career:   xpFromCareer,
      bonuses:  xpFromBonuses,
    },
  };
}

export async function getHabitRatesForRange(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: habits }, { data: instances }] = await Promise.all([
    supabase.from("habits").select("id, name").eq("profile_id", user.id),
    supabase
      .from("habit_instances")
      .select("habit_id, completed, date")
      .eq("profile_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  return (habits || [])
    .map((h: any) => {
      const hi        = (instances || []).filter((i: any) => i.habit_id === h.id);
      const completed = hi.filter((i: any) => i.completed).length;
      const total     = hi.length;
      return { id: h.id, name: h.name, completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    })
    .filter((h) => h.total > 0);
}
