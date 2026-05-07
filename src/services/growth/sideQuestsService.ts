"use server";

import { createClient } from "@/lib/supabase/server";

export type SideQuest = {
  id: string;
  title: string;
  description: string | null;
  estimatedTime: string | null;
  origin: "manual" | "ai";
  status: "active" | "completed" | "skipped";
  createdAt: string;
  completedAt: string | null;
};

export async function getSideQuests(): Promise<SideQuest[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("growth_side_quests")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    estimatedTime: q.estimated_time,
    origin: q.origin as "manual" | "ai",
    status: q.status as "active" | "completed" | "skipped",
    createdAt: q.created_at,
    completedAt: q.completed_at,
  }));
}

export async function addManualSideQuest(
  title: string,
  description?: string
): Promise<{ data?: SideQuest; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("growth_side_quests")
    .insert({ profile_id: user.id, title, description: description || null, origin: "manual" })
    .select()
    .single();

  if (error) return { error: error.message };
  return {
    data: {
      id: data.id,
      title: data.title,
      description: data.description,
      estimatedTime: data.estimated_time,
      origin: "manual",
      status: "active",
      createdAt: data.created_at,
      completedAt: null,
    },
  };
}

export async function saveAiSideQuests(
  quests: { title: string; description: string; estimatedTime: string }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const rows = quests.map((q) => ({
    profile_id: user.id,
    title: q.title,
    description: q.description,
    estimated_time: q.estimatedTime,
    origin: "ai" as const,
  }));

  const { error } = await supabase.from("growth_side_quests").insert(rows);
  if (error) return { error: error.message };
  return {};
}

export async function updateSideQuestStatus(
  id: string,
  status: "active" | "completed" | "skipped"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("growth_side_quests")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteSideQuest(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("growth_side_quests")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };
  return {};
}
