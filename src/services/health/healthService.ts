"use server";

import { createClient } from "@/lib/supabase/server";

export type ExerciseIntensity = "light" | "moderate" | "intense";
export type ExerciseType = "gym" | "cardio";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// ─── Exercise ─────────────────────────────────────────────────────────────────

function exerciseXP(params: {
  exerciseType: ExerciseType;
  durationMinutes?: number;
  intensity: ExerciseIntensity;
  sets?: number;
  reps?: number;
  isPR?: boolean;
}): number {
  let xp = 0;
  if (params.exerciseType === "gym") {
    const setBonus = (params.sets ?? 0) * (params.reps ?? 0) * 0.1;
    xp = 20 + Math.round(setBonus);
    if (params.isPR) xp += 25;
  } else {
    const base = params.intensity === "intense" ? 30 : params.intensity === "moderate" ? 20 : 10;
    xp = Math.round(base + (params.durationMinutes ?? 0) * 0.5);
  }
  return Math.max(5, xp);
}

export async function getExerciseLogs(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", date)
    .order("logged_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getExerciseRange(days: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function logExercise(params: {
  date: string;
  exercise_type: ExerciseType;
  activity_type: string;
  duration_minutes?: number;
  intensity: ExerciseIntensity;
  notes?: string;
  // gym-specific
  sets?: number;
  reps?: number;
  weight_kg?: number;
  is_pr?: boolean;
  // cardio-specific
  distance_km?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const xp = exerciseXP({
    exerciseType: params.exercise_type,
    durationMinutes: params.duration_minutes,
    intensity: params.intensity,
    sets: params.sets,
    reps: params.reps,
    isPR: params.is_pr,
  });

  const { error } = await supabase.from("exercise_logs").insert({
    profile_id: user.id,
    date: params.date,
    exercise_type: params.exercise_type,
    activity_type: params.activity_type,
    duration_minutes: params.duration_minutes ?? null,
    intensity: params.intensity,
    notes: params.notes ?? null,
    xp_earned: xp,
    sets: params.sets ?? null,
    reps: params.reps ?? null,
    weight_kg: params.weight_kg ?? null,
    is_pr: params.is_pr ?? false,
    distance_km: params.distance_km ?? null,
  });

  if (error) throw new Error(error.message);

  return { xp };
}

export async function deleteExerciseLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("exercise_logs")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

// ─── Food ─────────────────────────────────────────────────────────────────────

export async function getFoodLogs(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("food_logs")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", date)
    .order("logged_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFoodRange(days: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("food_logs")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function logFood(params: {
  date: string;
  meal_type: MealType;
  description: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  is_junk?: boolean;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("food_logs").insert({
    profile_id: user.id,
    date: params.date,
    meal_type: params.meal_type,
    description: params.description,
    calories: params.calories ?? null,
    protein_g: params.protein_g ?? null,
    carbs_g: params.carbs_g ?? null,
    fat_g: params.fat_g ?? null,
    is_junk: params.is_junk ?? false,
    notes: params.notes ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function deleteFoodLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function getSleepLog(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getSleepRange(days: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertSleepLog(params: {
  date: string;
  bedtime?: string;
  wake_time?: string;
  duration_hours?: number;
  quality?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("sleep_logs").upsert({
    profile_id: user.id,
    date: params.date,
    bedtime: params.bedtime ?? null,
    wake_time: params.wake_time ?? null,
    duration_hours: params.duration_hours ?? null,
    quality: params.quality ?? null,
    notes: params.notes ?? null,
  }, { onConflict: "profile_id,date" });

  if (error) throw new Error(error.message);
}

export async function deleteSleepLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("sleep_logs")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}
