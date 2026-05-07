"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { encryptData, decryptData } from "@/lib/utils/encryption";
import { createJournalEntry, getJournalEntries } from "@/services/journal/journalService";
import { toast } from "sonner";
import { useMode } from "@/context/ModeContext";
import { format, parseISO } from "date-fns";
import { BookOpen, ChevronDown, ChevronUp, Search } from "lucide-react";

const MOOD_TAGS    = ["Happy", "Sad", "Anxious", "Calm", "Excited", "Stressed", "Grateful", "Frustrated", "Motivated", "Tired"];
const ENERGY_TAGS  = ["Low energy", "Normal", "High energy"];
const CATEGORY_TAGS = ["Personal", "Work", "Health", "Relationships", "Goals", "Gratitude", "Reflection", "Dreams"];

function moodColor(score: number) {
  if (score >= 8) return "text-green-500";
  if (score >= 6) return "text-yellow-500";
  if (score >= 4) return "text-orange-500";
  return "text-red-500";
}

function moodEmoji(score: number) {
  if (score >= 9) return "😄";
  if (score >= 7) return "🙂";
  if (score >= 5) return "😐";
  if (score >= 3) return "😕";
  return "😢";
}

type JournalEntry = {
  id: string;
  content: string;
  mood_score: number | null;
  mood_tags: string[] | null;
  energy_level: number | null;
  category_tags: string[] | null;
  is_encrypted: boolean | null;
  created_at: string;
};

export function JournalEditor() {
  const [content, setContent]         = useState("");
  const [mood, setMood]               = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [moodTags, setMoodTags]       = useState<string[]>([]);
  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries]         = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch]           = useState("");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const { isDeepMode } = useMode();

  const fetchEntries = useCallback(async () => {
    try {
      const { data } = await getJournalEntries();
      setEntries((data ?? []) as JournalEntry[]);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const toggleMoodTag = (tag: string) =>
    setMoodTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const toggleCategoryTag = (tag: string) =>
    setCategoryTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      let finalContent = content;
      let isEncrypted  = false;

      if (isDeepMode) {
        finalContent = await encryptData(content);
        isEncrypted  = true;
      }

      await createJournalEntry(finalContent, mood, isEncrypted, {
        moodTags,
        energyLevel,
        categoryTags,
      });

      toast.success(isEncrypted ? "Deep Journal Entry Secured! (+20 XP)" : "Journal Entry Logged! (+20 XP)");
      setContent("");
      setMood(5);
      setEnergyLevel(5);
      setMoodTags([]);
      setCategoryTags([]);
      await fetchEntries();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save journal entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.content.toLowerCase().includes(q) ||
      (e.mood_tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
      (e.category_tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Entry form */}
      <div className="rounded-xl border border-border/40 bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Daily Reflection</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Mood slider */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Mood {moodEmoji(mood)}
              <span className={`font-bold ${moodColor(mood)}`}>{mood}/10</span>
            </label>
            <input
              type="range" min="1" max="10" value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Energy slider */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              Energy level
              <span className="font-bold">{energyLevel}/10</span>
            </label>
            <input
              type="range" min="1" max="10" value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Mood tags */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Mood tags</p>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TAGS.map((tag) => (
                <button
                  key={tag} type="button"
                  onClick={() => toggleMoodTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    moodTags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/40 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Category tags */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TAGS.map((tag) => (
                <button
                  key={tag} type="button"
                  onClick={() => toggleCategoryTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    categoryTags.includes(tag)
                      ? "bg-purple-500 text-white border-purple-500"
                      : "border-border/40 text-muted-foreground hover:border-purple-500/40"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
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

      {/* History toggle */}
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="font-semibold">Journal History</span>
            <span className="text-sm text-muted-foreground">({entries.length} entries)</span>
          </div>
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showHistory && (
          <div className="px-6 pb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadingEntries && <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />}

            {!loadingEntries && filteredEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">No entries found.</p>
            )}

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredEntries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <div key={entry.id} className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(entry.created_at), "MMM d, yyyy · h:mm a")}
                          </span>
                          {entry.mood_score && (
                            <span className={`text-xs font-bold ${moodColor(entry.mood_score)}`}>
                              {moodEmoji(entry.mood_score)} {entry.mood_score}/10
                            </span>
                          )}
                          {entry.is_encrypted && (
                            <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">encrypted</Badge>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {(entry.mood_tags ?? []).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                          {(entry.category_tags ?? []).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] text-purple-600 border-purple-500/30">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 mt-1" /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 mt-1" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <EntryContent entry={entry} isDeepMode={isDeepMode} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryContent({ entry, isDeepMode }: { entry: JournalEntry; isDeepMode: boolean }) {
  const [text, setText]       = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    if (!entry.is_encrypted) {
      setText(entry.content);
      return;
    }
    if (isDeepMode) {
      setDecrypting(true);
      decryptData(entry.content)
        .then(setText)
        .catch(() => setText("[Decryption failed]"))
        .finally(() => setDecrypting(false));
    } else {
      setText(null);
    }
  }, [entry, isDeepMode]);

  if (entry.is_encrypted && !isDeepMode) {
    return <p className="text-xs text-red-400 italic">🔒 Enter Deep Mode to read this entry.</p>;
  }
  if (decrypting) return <p className="text-xs text-muted-foreground">Decrypting...</p>;
  return <p className="text-sm whitespace-pre-wrap text-muted-foreground">{text}</p>;
}
