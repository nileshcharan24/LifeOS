"use server";

import { createClient } from "@/lib/supabase/server";

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type NoteContent =
  | { text: string }
  | { items: ChecklistItem[] };

export type Note = {
  id: string;
  title: string | null;
  content: NoteContent;
  color: string;
  isPinned: boolean;
  isArchived: boolean;
  labels: string[];
  type: "text" | "checklist";
  createdAt: string;
  updatedAt: string;
};

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    title: row.title as string | null,
    content: row.content as NoteContent,
    color: row.color as string,
    isPinned: row.is_pinned as boolean,
    isArchived: row.is_archived as boolean,
    labels: (row.labels as string[]) ?? [],
    type: row.type as "text" | "checklist",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getNotes(): Promise<Note[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("profile_id", user.id)
    .eq("is_archived", false)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  return (data ?? []).map(rowToNote);
}

export async function createNote(note: {
  title?: string;
  content: NoteContent;
  color?: string;
  labels?: string[];
  type: "text" | "checklist";
}): Promise<{ data?: Note; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("notes")
    .insert({
      profile_id: user.id,
      title: note.title || null,
      content: note.content as never,
      color: note.color ?? "default",
      labels: note.labels ?? [],
      type: note.type,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: rowToNote(data as Record<string, unknown>) };
}

export async function updateNote(
  id: string,
  updates: {
    title?: string | null;
    content?: NoteContent;
    color?: string;
    isPinned?: boolean;
    isArchived?: boolean;
    labels?: string[];
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.isPinned !== undefined) payload.is_pinned = updates.isPinned;
  if (updates.isArchived !== undefined) payload.is_archived = updates.isArchived;
  if (updates.labels !== undefined) payload.labels = updates.labels;

  const { error } = await supabase
    .from("notes")
    .update(payload as never)
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteNote(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };
  return {};
}
