"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getAboutMe(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";

  const { data } = await supabase
    .from("profiles")
    .select("about_me")
    .eq("id", user.id)
    .single();

  return data?.about_me ?? "";
}

export async function saveAboutMe(text: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ about_me: text || null } as never)
    .eq("id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function resetAccountAction(): Promise<{ error: string } | never> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.rpc("reset_user_data", { p_uid: user.id });
  if (error) {
    console.error("reset_user_data RPC failed:", error);
    return { error: error.message };
  }

  await supabase.auth.signOut();
  redirect("/");
}

// PIN is stored as an env var so it never touches the DB.
// Set LIFEOS_XP_RESET_PIN in .env.local (default: 123456 if unset — warn in dev).
const XP_RESET_PIN = process.env.LIFEOS_XP_RESET_PIN ?? "123456";

export async function resetXPOnlyAction(pin: string): Promise<{ error?: string }> {
  if (pin !== XP_RESET_PIN) return { error: "Incorrect PIN." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Wipe all XP transactions and level logs, reset profile XP + level to 0/1
  await supabase.from("xp_transactions").delete().eq("profile_id", user.id);
  await supabase.from("level_logs").delete().eq("profile_id", user.id);
  // xp_events is a non-critical audit table — clear it too
  await supabase.from("xp_events").delete().eq("profile_id", user.id).then(() => {}, () => {});

  const { error } = await supabase
    .from("profiles")
    .update({ total_xp: 0, level: 1 })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}

export async function grantXPServerAction(amount: number, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User must be logged in to grant XP");
  }

  const { error } = await supabase
    .from("xp_transactions")
    .insert([{ profile_id: user.id, amount, reason }]);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
}