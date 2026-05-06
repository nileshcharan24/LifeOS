"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export async function createTask(task: {
  title: string;
  description?: string;
  deadline?: string;
  priority?: TaskPriority;
  category?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("tasks").insert({
    profile_id: user.id,
    title: task.title,
    description: task.description ?? null,
    deadline: task.deadline ?? null,
    priority: task.priority ?? "medium",
    category: task.category ?? null,
    is_completed: false,
    is_assigned_by_ai: false,
  });

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function toggleTask(taskId: string, currentState: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("tasks")
    .update({ is_completed: !currentState })
    .eq("id", taskId)
    .eq("profile_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("tasks").delete().eq("id", taskId).eq("profile_id", user.id);
  revalidatePath("/dashboard");
}
