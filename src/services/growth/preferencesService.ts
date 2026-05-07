"use server";

import { createClient } from "@/lib/supabase/server";

export type ContentSource = {
  label: string;
  url: string;
};

export type UserPreferences = {
  categories: string[];
  contentSources: ContentSource[];
  setupCompleted: boolean;
};

export async function getPreferences(): Promise<UserPreferences | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_preferences")
    .select("categories, content_sources, setup_completed")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    categories: data.categories ?? [],
    contentSources: (data.content_sources as ContentSource[]) ?? [],
    setupCompleted: data.setup_completed ?? false,
  };
}

export async function savePreferences(
  categories: string[],
  contentSources: ContentSource[],
  setupCompleted: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        profile_id: user.id,
        categories,
        content_sources: contentSources as never,
        setup_completed: setupCompleted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

  if (error) return { error: error.message };
  return {};
}
