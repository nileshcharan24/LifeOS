"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Zap, CalendarDays } from "lucide-react";

type Transaction = {
  id: string;
  created_at: string | null;
  reason: string;
  amount: number;
  category: string | null;
};

type JournalEntry = {
  id: string;
  created_at: string;
  date: string | null;
  content: string;
  mood_score: number | null;
  is_encrypted: boolean | null;
};

export function HistoryCalendar() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTaskName, setSelectedTaskName] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: txData }, { data: journalData }] = await Promise.all([
      supabase
        .from("xp_transactions")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("journal_entries")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (txData) setTransactions(txData);
    if (journalData) setJournalEntries(journalData);
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("xp_updated", fetchData);
    return () => window.removeEventListener("xp_updated", fetchData);
  }, [fetchData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const txDate = (tx: Transaction) => new Date(tx.created_at ?? "");
  const getJournalDate = (j: JournalEntry) =>
    j.date ? parseISO(j.date) : new Date(j.created_at);

  const tasksOnSelectedDay = transactions.filter(
    (tx) => tx.created_at && isSameDay(txDate(tx), selectedDate)
  );

  const journalOnSelectedDay = journalEntries.find((j) =>
    isSameDay(getJournalDate(j), selectedDate)
  );

  const uniqueTasks = Array.from(
    new Set(transactions.map((tx) => tx.reason).filter(Boolean))
  );

  const selectedTaskDates = selectedTaskName
    ? transactions
        .filter((tx) => tx.reason === selectedTaskName && tx.created_at)
        .map((tx) => txDate(tx).toDateString())
    : [];

  const selectedTaskTxs = selectedTaskName
    ? transactions.filter((tx) => tx.reason === selectedTaskName && tx.created_at)
    : [];

  const selectedTaskStats =
    selectedTaskName && selectedTaskTxs.length > 0
      ? {
          count: selectedTaskTxs.length,
          totalXP: selectedTaskTxs.reduce((s, tx) => s + tx.amount, 0),
          firstDone: new Date(
            Math.min(...selectedTaskTxs.map((tx) => txDate(tx).getTime()))
          ),
          lastDone: new Date(
            Math.max(...selectedTaskTxs.map((tx) => txDate(tx).getTime()))
          ),
        }
      : null;

  const saveJournalNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("journal_entries").insert({
        profile_id: user.id,
        content: newNote,
        date: format(selectedDate, "yyyy-MM-dd"),
        is_encrypted: false,
      });

      setNewNote("");
      await fetchData();
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Calendar + Day Detail */}
      <div className="lg:col-span-2 space-y-6">
        {/* Calendar */}
        <div className="p-6 rounded-xl border border-border/40 bg-muted/40">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Activity Calendar</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-sm w-32 text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`e-${i}`} className="h-10" />
            ))}
            {daysInMonth.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const hasActivity = transactions.some(
                (tx) => tx.created_at && isSameDay(txDate(tx), day)
              );
              const hasJournal = journalEntries.some((j) =>
                isSameDay(getJournalDate(j), day)
              );
              const isTaskDay =
                selectedTaskName && selectedTaskDates.includes(day.toDateString());

              let cellCls =
                "h-10 rounded-md flex flex-col items-center justify-center text-xs font-medium transition-colors cursor-pointer relative select-none";
              if (isSelected)
                cellCls += " bg-primary text-primary-foreground";
              else if (isTaskDay)
                cellCls +=
                  " bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/50";
              else if (hasActivity)
                cellCls +=
                  " bg-green-500/20 text-green-700 dark:text-green-400";
              else cellCls += " hover:bg-muted text-foreground";

              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedDate(day);
                    setSelectedTaskName(null);
                    setNewNote("");
                  }}
                  className={cellCls}
                >
                  {format(day, "d")}
                  {hasJournal && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/40 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30 flex-shrink-0" />
              Activity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50 flex-shrink-0" />
              Task highlight
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              Journal note
            </span>
          </div>
        </div>

        {/* Day Detail */}
        <div className="p-6 rounded-xl border border-border/40 bg-muted/40">
          <h3 className="font-bold text-lg mb-5">
            {format(selectedDate, "EEEE, MMMM do, yyyy")}
          </h3>

          {/* Activities */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-semibold">
                Activities{" "}
                {tasksOnSelectedDay.length > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({tasksOnSelectedDay.length})
                  </span>
                )}
              </p>
            </div>
            {tasksOnSelectedDay.length > 0 ? (
              <div className="space-y-2">
                {tasksOnSelectedDay.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() =>
                      setSelectedTaskName(
                        tx.reason === selectedTaskName ? null : tx.reason
                      )
                    }
                    className={`flex justify-between items-center p-3 rounded-md border cursor-pointer transition-colors ${
                      tx.reason === selectedTaskName
                        ? "bg-yellow-500/10 border-yellow-500/50"
                        : "bg-background border-border/20 hover:border-primary/40"
                    }`}
                  >
                    <span className="font-medium text-sm">{tx.reason || "Activity"}</span>
                    <span className="text-xs font-bold text-green-500 flex-shrink-0 ml-2">
                      +{tx.amount} XP
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-1">
                  Click an activity to highlight all days you&apos;ve done it.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity recorded for this day.
              </p>
            )}
          </div>

          {/* Journal */}
          <div className="border-t border-border/40 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <p className="text-sm font-semibold">Journal Note</p>
            </div>
            {journalOnSelectedDay ? (
              <div className="p-3 bg-background rounded-md border border-border/20">
                {journalOnSelectedDay.is_encrypted ? (
                  <p className="text-sm text-red-400 italic">
                    Encrypted entry — unlock with Deep Mode to view.
                  </p>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {journalOnSelectedDay.content}
                  </p>
                )}
                {journalOnSelectedDay.mood_score && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Mood: {journalOnSelectedDay.mood_score}/10
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder={`What did you accomplish on ${format(selectedDate, "MMM d")}?`}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!newNote.trim() || savingNote}
                  onClick={saveJournalNote}
                >
                  {savingNote ? "Saving..." : "Save Note"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Task Progress */}
      <div className="p-6 rounded-xl border border-border/40 bg-muted/40 flex flex-col">
        <h2 className="text-xl font-bold mb-1">Task Progress</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Select a task to highlight all days you completed it.
        </p>

        {/* Selected task stats */}
        {selectedTaskStats && (
          <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="font-semibold text-sm mb-3 break-words leading-tight">
              {selectedTaskName}
            </p>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div className="text-muted-foreground">Completions</div>
              <div className="font-medium">{selectedTaskStats.count}×</div>
              <div className="text-muted-foreground">Total XP</div>
              <div className="font-medium text-green-500">
                +{selectedTaskStats.totalXP}
              </div>
              <div className="text-muted-foreground">First done</div>
              <div className="font-medium">
                {format(selectedTaskStats.firstDone, "MMM d, yyyy")}
              </div>
              <div className="text-muted-foreground">Last done</div>
              <div className="font-medium">
                {format(selectedTaskStats.lastDone, "MMM d, yyyy")}
              </div>
            </div>
            <button
              onClick={() => setSelectedTaskName(null)}
              className="text-xs text-muted-foreground hover:text-foreground mt-3 underline underline-offset-2"
            >
              Clear selection
            </button>
          </div>
        )}

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {uniqueTasks.map((taskName, i) => {
            const txs = transactions.filter((tx) => tx.reason === taskName);
            const count = txs.length;
            const totalXP = txs.reduce((s, tx) => s + tx.amount, 0);
            const isSelected = taskName === selectedTaskName;
            return (
              <div
                key={i}
                onClick={() =>
                  setSelectedTaskName(isSelected ? null : (taskName as string))
                }
                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-yellow-500/10 border-yellow-500/50"
                    : "bg-background border-border/20 hover:border-primary/50"
                }`}
              >
                <div className="font-medium text-sm break-words leading-snug">
                  {taskName}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>{count}× done</span>
                  <span>+{totalXP} XP</span>
                </div>
              </div>
            );
          })}
          {uniqueTasks.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Complete some tasks to see them here!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
