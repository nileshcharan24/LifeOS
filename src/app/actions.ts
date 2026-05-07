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