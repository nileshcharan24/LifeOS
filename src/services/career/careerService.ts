"use server";

import { createClient } from "@/lib/supabase/server";
import { grantXP } from "@/services/economy/xpService";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RoleType = "internship" | "full-time" | "freelance" | "side-project";

export type WorkRole = {
  id: string;
  profile_id: string;
  title: string;
  company: string | null;
  type: RoleType;
  color: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export type WorkSession = {
  id: string;
  profile_id: string;
  role_id: string;
  date: string;
  clocked_in: boolean;
  duration_minutes: number | null;
  xp_granted: boolean;
};

export type WorkLog = {
  id: string;
  profile_id: string;
  role_id: string;
  date: string;
  content: string;
  is_private: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

// ─── Roles ─────────────────────────────────────────────────────────────────────

export async function getRoles(): Promise<WorkRole[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("work_roles")
    .select("*")
    .eq("profile_id", user.id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as WorkRole[];
}

export async function createRole(input: {
  title: string;
  company?: string;
  type: RoleType;
  color: string;
  start_date?: string;
}): Promise<WorkRole> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("work_roles")
    .insert({
      profile_id: user.id,
      title: input.title,
      company: input.company ?? null,
      type: input.type,
      color: input.color,
      start_date: input.start_date || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as WorkRole;
}

export async function updateRole(
  roleId: string,
  updates: Partial<Pick<WorkRole, "title" | "company" | "type" | "color" | "start_date" | "end_date" | "is_active">>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("work_roles")
    .update(updates)
    .eq("id", roleId)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

export async function deleteRole(roleId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("work_roles")
    .delete()
    .eq("id", roleId)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
}

// ─── Sessions (Clock-in) ────────────────────────────────────────────────────────

export async function getSessionsForDate(date: string): Promise<WorkSession[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", date);

  return (data ?? []) as WorkSession[];
}

export async function clockIn(
  roleId: string,
  roleTitle: string,
  date: string
): Promise<{ xpGranted: boolean; xp: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if session already exists for today
  const { data: existing } = await supabase
    .from("work_sessions")
    .select("id, xp_granted, clocked_in")
    .eq("profile_id", user.id)
    .eq("role_id", roleId)
    .eq("date", date)
    .maybeSingle();

  if (existing?.clocked_in) {
    // Already clocked in — just return state
    return { xpGranted: false, xp: 0 };
  }

  const XP_AMOUNT = 25;
  let xpGranted = false;

  if (existing) {
    // Row exists but not clocked in yet — update it
    await supabase
      .from("work_sessions")
      .update({ clocked_in: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (!existing.xp_granted) {
      await grantXP(XP_AMOUNT, `Showed up: ${roleTitle}`);
      await supabase
        .from("work_sessions")
        .update({ xp_granted: true })
        .eq("id", existing.id);
      xpGranted = true;
    }
  } else {
    // New session
    await supabase.from("work_sessions").insert({
      profile_id: user.id,
      role_id: roleId,
      date,
      clocked_in: true,
      xp_granted: true,
    });
    await grantXP(XP_AMOUNT, `Showed up: ${roleTitle}`);
    xpGranted = true;
  }

  return { xpGranted, xp: xpGranted ? XP_AMOUNT : 0 };
}

export async function clockOut(roleId: string, date: string, durationMinutes: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("work_sessions")
    .update({ duration_minutes: durationMinutes, updated_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("role_id", roleId)
    .eq("date", date);
}

// ─── Work Logs ─────────────────────────────────────────────────────────────────

export async function getLogsForDate(date: string): Promise<WorkLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("work_logs")
    .select("*")
    .eq("profile_id", user.id)
    .eq("date", date)
    .order("created_at", { ascending: true });

  return (data ?? []) as WorkLog[];
}

export async function getLogsForRange(days: number): Promise<WorkLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().split("T")[0];

  const { data } = await supabase
    .from("work_logs")
    .select("*, work_roles(title, color, type, company)")
    .eq("profile_id", user.id)
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  return (data ?? []) as WorkLog[];
}

export async function upsertWorkLog(input: {
  roleId: string;
  date: string;
  content: string;
  isPrivate: boolean;
  tags: string[];
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("work_logs").upsert(
    {
      profile_id: user.id,
      role_id: input.roleId,
      date: input.date,
      content: input.content,
      is_private: input.isPrivate,
      tags: input.tags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,role_id,date" }
  );
}

export async function deleteWorkLog(logId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("work_logs")
    .delete()
    .eq("id", logId)
    .eq("profile_id", user.id);
}

// ─── History (for date navigator) ──────────────────────────────────────────────

export async function getSessionsForRange(days: number): Promise<WorkSession[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceStr = since.toISOString().split("T")[0];

  const { data } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", sinceStr)
    .eq("clocked_in", true);

  return (data ?? []) as WorkSession[];
}
