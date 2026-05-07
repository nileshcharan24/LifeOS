"use server";

import { createClient } from "@/lib/supabase/server";

export type GoalPriority = "low" | "medium" | "high" | "urgent";

export async function getGoals() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("future_goals")
    .select("*")
    .eq("profile_id", user.id)
    .order("target_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createGoal(params: {
  title: string;
  description?: string;
  target_date?: string;
  priority?: GoalPriority;
  category?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("future_goals").insert({
    profile_id: user.id,
    title: params.title,
    description: params.description ?? null,
    target_date: params.target_date ?? null,
    priority: params.priority ?? "medium",
    category: params.category ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function toggleGoal(id: string, currentlyCompleted: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("future_goals")
    .update({
      is_completed: !currentlyCompleted,
      completed_at: currentlyCompleted ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("future_goals")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}
