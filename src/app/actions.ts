"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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