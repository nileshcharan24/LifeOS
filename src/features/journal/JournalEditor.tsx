"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { encryptData } from "@/lib/utils/encryption";
import { createJournalEntry } from "@/services/journal/journalService";
import { toast } from "sonner";
import { useMode } from "@/context/ModeContext";

export function JournalEditor() {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDeepMode } = useMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      let finalContent = content;
      let isEncrypted = false;

      if (isDeepMode) {
        finalContent = await encryptData(content);
        isEncrypted = true;
      }

      await createJournalEntry(finalContent, mood, isEncrypted);
      
      toast.success(
        isEncrypted
          ? "Deep Journal Entry Secured & Logged! (+20 XP)"
          : "Journal Entry Logged! (+20 XP)"
      );
      setContent("");
      setMood(5);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save journal entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">Daily Reflection</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            How are you feeling today? (Mood: {mood}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Journal Entry {isDeepMode && <span className="text-red-500 font-bold ml-2">(Deep Mode: Encrypted)</span>}
          </label>
          <textarea
            className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Write your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? "Saving..." : "Save Entry (+20 XP)"}
        </Button>
      </form>
    </div>
  );
}
