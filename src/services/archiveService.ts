"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ArchivedItem = {
  id: string;
  user_id: string;
  item_type: string;
  item_data: any;
  archived_at: string;
  expires_at: string;
};

export async function getArchivedItems(): Promise<ArchivedItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("archived_items")
    .select("*")
    .eq("user_id", user.id)
    .order("archived_at", { ascending: false });

  return (data || []) as ArchivedItem[];
}

export async function archiveItem(itemType: string, itemData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 1);

  const { error } = await supabase.from("archived_items").insert([
    {
      user_id: user.id,
      item_type: itemType,
      item_data: itemData,
      expires_at: expires_at.toISOString(),
    },
  ]);

  if (error) throw error;
}

export async function restoreItem(item: ArchivedItem) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Re-insert the item into its original table
  const { error: insertError } = await supabase.from(item.item_type === "daily_task" ? "daily_tasks" : item.item_type).insert([item.item_data]);
  if (insertError) throw insertError;
  
  // Delete the item from the archive
  const { error: deleteError } = await supabase.from("archived_items").delete().eq("id", item.id);
  if (deleteError) throw deleteError;

  revalidatePath("/dashboard");
}

export async function permanentlyDeleteItem(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("archived_items").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard");
}
