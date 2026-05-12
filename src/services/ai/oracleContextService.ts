"use server";

import { createClient } from "@/lib/supabase/server";

export type ContextPackage = {
  user: {
    name: string | null;
    level: number;
    totalXP: number;
    dailyStreak: number;
  };
  todayDate: string;
  habitsThisWeek: {
    name: string;
    completed: number;
    outOf: number;
    streak: number;
  }[];
  tasksThisWeek: {
    pending: number;
    completedToday: number;
    overdue: number;
    upcomingTitles: string[];
  };
  healthThisWeek: {
    avgSleepHours: number | null;
    totalExerciseMinutes: number;
    exerciseDays: number;
    avgMoodScore: number | null;
    junkMealCount: number;
    loggedMeals: number;
  };
  todayHealth: {
    sleep: { durationHours: number | null; quality: number | null } | null;
    exercise: { activityType: string; durationMinutes: number | null; xpEarned: number }[];
    meals: { mealType: string; description: string; isJunk: boolean }[];
  };
  journalThisWeek: {
    date: string;
    moodScore: number | null;
    energyLevel: number | null;
    moodTags: string[];
    categoryTags: string[];
    contentSummary: string;
  }[];
  negativeHabitsThisWeek: {
    habit: string;
    count: number;
    intensities: string[];
  }[];
  longTermGoals: { title: string; targetDate: string | null; priority: string | null }[];
  pastSessionSummaries: {
    date: string;
    summary: string | null;
    topics: string[] | null;
    primaryMood: number | null;
  }[];
  xpThisWeek: {
    earnedFromHabits: number;
    earnedFromExercise: number;
    totalXPEvents: number;
  };
  xpTransactionsRecent: {
    amount: number;
    reason: string;
    category: string | null;
    createdAt: string;
  }[];
  aboutMe: string | null;
  dailyTasksToday: {
    name: string;
    urgency: string;
    isCompleted: boolean;
  }[];
  academics: {
    courses: { name: string; code: string | null; credits: number }[];
    upcomingAssessments: {
      courseName: string;
      name: string;
      type: string;
      dueDate: string;
      status: string;
    }[];
  };
  growthVault: {
    categories: string[];
    contentSources: string[];
    activeSideQuests: { title: string; description: string | null; estimatedTime: string | null }[];
    completedSideQuestsCount: number;
  };
  career: {
    activeRoles: { title: string; company: string | null; type: string }[];
    sessionsThisWeek: number;
    totalMinutesThisWeek: number;
    recentLogs: { date: string; content: string; tags: string[] }[];
  };
};

function truncateContent(content: string, maxLen = 200): string {
  if (!content) return "";
  return content.length > maxLen ? content.slice(0, maxLen) + "..." : content;
}

export async function buildContextPackage(): Promise<ContextPackage> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);
  const twoWeeksLaterStr = twoWeeksLater.toISOString().split("T")[0];

  // Run all queries in parallel
  const [
    profileRes,
    habitInstancesRes,
    habitsRes,
    tasksRes,
    sleepRes,
    exerciseRes,
    foodRes,
    journalRes,
    negHabitLogsRes,
    negHabitsRes,
    goalsRes,
    pastSessionsRes,
    xpTransactionsRes,
    dailyTasksTodayRes,
    coursesRes,
    assessmentsRes,
    userPrefsRes,
    sideQuestsRes,
    workRolesRes,
    workSessionsRes,
    workLogsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("username, full_name, level, total_xp, daily_streak").eq("id", user.id).single(),
    supabase.from("habit_instances").select("habit_id, date, completed, xp_earned").eq("profile_id", user.id).gte("date", weekStartStr),
    supabase.from("habits").select("id, name").eq("profile_id", user.id).eq("enabled", true),
    supabase.from("tasks").select("title, is_completed, deadline, created_at").eq("profile_id", user.id).order("deadline", { ascending: true }),
    supabase.from("sleep_logs").select("date, duration_hours, quality").eq("profile_id", user.id).gte("date", weekStartStr),
    supabase.from("exercise_logs").select("date, activity_type, duration_minutes, xp_earned, exercise_type").eq("profile_id", user.id).gte("date", weekStartStr),
    supabase.from("food_logs").select("date, meal_type, description, is_junk").eq("profile_id", user.id).gte("date", weekStartStr),
    supabase.from("journal_entries").select("date, mood_score, energy_level, mood_tags, category_tags, content, created_at").eq("profile_id", user.id).gte("date", weekStartStr).order("created_at", { ascending: false }),
    supabase.from("negative_habit_logs").select("habit_id, date, intensity").eq("profile_id", user.id).gte("date", weekStartStr),
    supabase.from("negative_habits").select("id, name").eq("profile_id", user.id).eq("is_active", true),
    supabase.from("future_goals").select("title, target_date, priority").eq("profile_id", user.id).eq("is_completed", false).limit(10),
    supabase.from("oracle_chat_sessions").select("session_date, summary, topics, primary_mood").eq("profile_id", user.id).gte("session_date", weekStartStr).order("session_date", { ascending: false }).limit(7),
    supabase.from("xp_transactions").select("amount, reason, category, created_at").eq("profile_id", user.id).gte("created_at", `${weekStartStr}T00:00:00`).order("created_at", { ascending: false }).limit(50),
    supabase.from("daily_tasks").select("name, urgency, is_completed").eq("user_id", user.id).eq("task_date", todayStr),
    supabase.from("courses").select("name, code, credits").eq("profile_id", user.id),
    supabase.from("assessments").select("name, type, due_date, status, courses(name)").eq("profile_id", user.id).neq("status", "completed").lte("due_date", twoWeeksLaterStr).gte("due_date", todayStr).order("due_date"),
    supabase.from("user_preferences").select("categories, content_sources").eq("profile_id", user.id).maybeSingle(),
    supabase.from("growth_side_quests").select("title, description, estimated_time, status").eq("profile_id", user.id).order("created_at", { ascending: false }),
    supabase.from("work_roles").select("title, company, type").eq("profile_id", user.id).eq("is_active", true),
    supabase.from("work_sessions").select("date, duration_minutes").eq("profile_id", user.id).gte("date", weekStartStr),
    supabase.from("work_logs").select("date, content, tags").eq("profile_id", user.id).gte("date", weekStartStr).order("date", { ascending: false }).limit(5),
  ]);

  const profile = profileRes.data;

  // Fetch about_me separately so a DB error here never breaks the main profile data
  let aboutMe: string | null = null;
  const { data: aboutMeRow, error: aboutMeErr } = await supabase
    .from("profiles")
    .select("about_me")
    .eq("id", user.id)
    .single();
  if (!aboutMeErr && aboutMeRow) {
    aboutMe = (aboutMeRow as { about_me?: string | null }).about_me ?? null;
  }

  const habitInstances = habitInstancesRes.data ?? [];
  const habits = habitsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const sleepLogs = sleepRes.data ?? [];
  const exerciseLogs = exerciseRes.data ?? [];
  const foodLogs = foodRes.data ?? [];
  const journalEntries = journalRes.data ?? [];
  const negHabitLogs = negHabitLogsRes.data ?? [];
  const negHabits = negHabitsRes.data ?? [];
  const goals = goalsRes.data ?? [];
  const pastSessions = pastSessionsRes.data ?? [];
  const xpTransactions = xpTransactionsRes.data ?? [];
  const dailyTasksToday = dailyTasksTodayRes.data ?? [];
  const courses = coursesRes.data ?? [];
  const assessments = (assessmentsRes.data ?? []) as any[];
  const userPrefs = userPrefsRes.data as any;
  const sideQuests = (sideQuestsRes.data ?? []) as any[];
  const workRoles = workRolesRes.data ?? [];
  const workSessions = workSessionsRes.data ?? [];
  const workLogs = (workLogsRes.data ?? []) as any[];

  // ─ Habits summary
  const habitsThisWeek = habits.map((habit) => {
    const instances = habitInstances.filter((i) => i.habit_id === habit.id);
    const completed = instances.filter((i) => i.completed).length;
    const outOf = 7;
    return { name: habit.name, completed, outOf, streak: completed };
  });

  // ─ Tasks summary
  const now = new Date();
  const pending = tasks.filter((t) => !t.is_completed).length;
  const completedToday = tasks.filter((t) => {
    if (!t.is_completed) return false;
    return true;
  }).length;
  const overdue = tasks.filter((t) => !t.is_completed && t.deadline && new Date(t.deadline) < now).length;
  const upcomingTitles = tasks.filter((t) => !t.is_completed && t.deadline && new Date(t.deadline) > now).slice(0, 5).map((t) => t.title);

  // ─ Health summary
  const sleepHours = sleepLogs.map((s) => s.duration_hours).filter(Boolean) as number[];
  const avgSleepHours = sleepHours.length ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length : null;
  const totalExerciseMinutes = exerciseLogs.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  const exerciseDays = new Set(exerciseLogs.map((e) => e.date)).size;
  const moodScores = journalEntries.map((j) => j.mood_score).filter(Boolean) as number[];
  const avgMoodScore = moodScores.length ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : null;
  const junkMealCount = foodLogs.filter((f) => f.is_junk).length;

  // ─ Today's data
  const todaySleep = sleepLogs.find((s) => s.date === todayStr) ?? null;
  const todayExercise = exerciseLogs.filter((e) => e.date === todayStr).map((e) => ({
    activityType: e.activity_type,
    durationMinutes: e.duration_minutes,
    xpEarned: e.xp_earned ?? 0,
  }));
  const todayMeals = foodLogs.filter((f) => f.date === todayStr).map((f) => ({
    mealType: f.meal_type ?? "meal",
    description: f.description,
    isJunk: f.is_junk ?? false,
  }));

  // ─ Journal this week
  const journalThisWeek = journalEntries.map((j) => ({
    date: j.date,
    moodScore: j.mood_score,
    energyLevel: j.energy_level,
    moodTags: j.mood_tags ?? [],
    categoryTags: j.category_tags ?? [],
    contentSummary: truncateContent(j.content ?? "", 200),
  }));

  // ─ Negative habits this week
  const negHabitMap = new Map(negHabits.map((h) => [h.id, h.name]));
  const negHabitGroups = new Map<string, { count: number; intensities: string[] }>();
  for (const log of negHabitLogs) {
    const name = negHabitMap.get(log.habit_id) ?? "Unknown";
    const existing = negHabitGroups.get(name) ?? { count: 0, intensities: [] };
    existing.count++;
    existing.intensities.push(log.intensity);
    negHabitGroups.set(name, existing);
  }
  const negativeHabitsThisWeek = Array.from(negHabitGroups.entries()).map(([habit, data]) => ({
    habit,
    ...data,
  }));

  // ─ Long term goals
  const longTermGoals = goals.map((g) => ({
    title: g.title,
    targetDate: g.target_date,
    priority: g.priority,
  }));

  // ─ Past session summaries (exclude today)
  const pastSessionSummaries = pastSessions
    .filter((s) => s.session_date !== todayStr)
    .map((s) => ({
      date: s.session_date,
      summary: s.summary,
      topics: s.topics,
      primaryMood: s.primary_mood,
    }));

  // ─ XP transactions recent
  const xpTransactionsRecent = xpTransactions.map((x) => ({
    amount: x.amount,
    reason: x.reason,
    category: x.category ?? null,
    createdAt: x.created_at,
  }));

  // ─ Academics
  const academicCourses = courses.map((c: any) => ({
    name: c.name,
    code: c.code ?? null,
    credits: c.credits ?? 3,
  }));
  const upcomingAssessments = assessments.map((a) => ({
    courseName: (a.courses as any)?.name ?? "Unknown",
    name: a.name,
    type: a.type,
    dueDate: a.due_date,
    status: a.status,
  }));

  // ─ Growth & Vault
  const growthCategories: string[] = userPrefs?.categories ?? [];
  const rawSources: any[] = userPrefs?.content_sources ?? [];
  const growthSources = rawSources.map((s: any) => s.label).filter(Boolean);
  const activeSideQuests = sideQuests
    .filter((q) => q.status === "active")
    .map((q) => ({ title: q.title, description: q.description ?? null, estimatedTime: q.estimated_time ?? null }));
  const completedSideQuestsCount = sideQuests.filter((q) => q.status === "completed").length;

  // ─ Career
  const activeRoles = workRoles.map((r: any) => ({
    title: r.title,
    company: r.company ?? null,
    type: r.type,
  }));
  const sessionsThisWeek = workSessions.length;
  const totalMinutesThisWeek = workSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 0), 0);
  const recentLogs = workLogs.map((l) => ({
    date: l.date,
    content: truncateContent(l.content ?? "", 150),
    tags: l.tags ?? [],
  }));

  return {
    user: {
      name: profile?.full_name ?? profile?.username ?? null,
      level: profile?.level ?? 1,
      totalXP: profile?.total_xp ?? 0,
      dailyStreak: profile?.daily_streak ?? 0,
    },
    aboutMe,
    todayDate: todayStr,
    habitsThisWeek,
    tasksThisWeek: { pending, completedToday, overdue, upcomingTitles },
    healthThisWeek: {
      avgSleepHours: avgSleepHours ? Math.round(avgSleepHours * 10) / 10 : null,
      totalExerciseMinutes,
      exerciseDays,
      avgMoodScore: avgMoodScore ? Math.round(avgMoodScore * 10) / 10 : null,
      junkMealCount,
      loggedMeals: foodLogs.length,
    },
    todayHealth: {
      sleep: todaySleep ? { durationHours: todaySleep.duration_hours, quality: todaySleep.quality } : null,
      exercise: todayExercise,
      meals: todayMeals,
    },
    journalThisWeek,
    negativeHabitsThisWeek,
    longTermGoals,
    pastSessionSummaries,
    xpThisWeek: {
      earnedFromHabits: habitInstances.reduce((sum, i) => sum + (i.xp_earned ?? 0), 0),
      earnedFromExercise: exerciseLogs.reduce((sum, e) => sum + (e.xp_earned ?? 0), 0),
      totalXPEvents: habitInstances.filter((i) => i.completed).length + exerciseLogs.length,
    },
    xpTransactionsRecent,
    dailyTasksToday: dailyTasksToday.map((t: any) => ({
      name: t.name,
      urgency: t.urgency ?? "medium",
      isCompleted: t.is_completed ?? false,
    })),
    academics: {
      courses: academicCourses,
      upcomingAssessments,
    },
    growthVault: {
      categories: growthCategories,
      contentSources: growthSources,
      activeSideQuests,
      completedSideQuestsCount,
    },
    career: {
      activeRoles,
      sessionsThisWeek,
      totalMinutesThisWeek,
      recentLogs,
    },
  };
}
