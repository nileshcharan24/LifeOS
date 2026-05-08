"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addDays, isToday, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeXP } from "@/hooks/useRealtimeXP";
import { XP_PER_LEVEL } from "@/lib/xp";
import {
  getHabits, ensureAndGetHabitInstances, getDailyTasksForDate,
  type Habit, type HabitInstance, type DailyTask,
} from "@/services/tasks/taskTrackerService";
import {
  getNegativeHabits, getNegativeHabitLogs,
} from "@/services/habits/negativeHabitService";
import { getJournalEntries } from "@/services/journal/journalService";
import { getExerciseLogs } from "@/services/health/healthService";
import { cn } from "@/lib/utils";
import { useMode } from "@/context/ModeContext";
import {
  CheckCircle2, Circle, Calendar, BookMarked, Heart,
  Zap, ShoppingBag, Pencil, ArrowRight, Clock, TrendingUp,
  AlertCircle, Flame, Sparkles, Lock, MessageSquare, BookOpen, Briefcase, PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function moodEmoji(score: number) {
  if (score >= 9) return "😄";
  if (score >= 7) return "🙂";
  if (score >= 5) return "😐";
  if (score >= 3) return "😕";
  return "😢";
}

function urgencyColor(urgency: string) {
  if (urgency === "high")   return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (urgency === "medium") return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
  return "bg-gray-500/15 text-gray-600 dark:text-gray-400";
}

function SectionCard({ title, icon, children, className }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/40 bg-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Section 1: Daily Habits & Tasks ─────────────────────────────────────────

function DailyHabitsTasksSection({ onNav }: { onNav: (tab: string) => void }) {
  const [habits, setHabits]     = useState<Habit[]>([]);
  const [instances, setInstances] = useState<HabitInstance[]>([]);
  const [tasks, setTasks]       = useState<DailyTask[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const fetchData = async () => {
      const [h, inst, t] = await Promise.all([
        getHabits(),
        ensureAndGetHabitInstances(today),
        getDailyTasksForDate(today),
      ]);
      setHabits(h);
      setInstances(inst);
      setTasks(t);
      setLoading(false);
    };

    fetchData();
    window.addEventListener("daily_data_updated", fetchData);
    window.addEventListener("xp_updated", fetchData);
    return () => {
      window.removeEventListener("daily_data_updated", fetchData);
      window.removeEventListener("xp_updated", fetchData);
    };
  }, [today]);

  const handleToggleHabit = async (habitId: string) => {
    setToggling(habitId);
    try {
      const { completeHabitInstance, uncompleteHabitInstance } = await import("@/services/tasks/taskTrackerService");
      const instance = instances.find(i => i.habit_id === habitId);
      const habit = habits.find(h => h.id === habitId);
      if (instance && habit) {
        if (instance.completed) {
          await uncompleteHabitInstance(instance.id);
        } else {
          await completeHabitInstance(instance.id, habit.xp_value, habit.name);
        }
        const [h, inst, t] = await Promise.all([
          getHabits(),
          ensureAndGetHabitInstances(today),
          getDailyTasksForDate(today),
        ]);
        setHabits(h);
        setInstances(inst);
        setTasks(t);
        window.dispatchEvent(new CustomEvent("daily_data_updated"));
      }
    } catch (error) {
      console.error("Failed to toggle habit:", error);
    } finally {
      setToggling(null);
    }
  };

  const completedHabits = instances.filter(i => i.completed).length;
  const completedTasks  = tasks.filter(t => t.is_completed).length;

  const handleToggleTask = async (taskId: string) => {
    setToggling(taskId);
    try {
      const { toggleDailyTask } = await import("@/services/tasks/taskTrackerService");
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await toggleDailyTask(taskId, !task.is_completed);
        const newTasks = await getDailyTasksForDate(today);
        setTasks(newTasks);
        window.dispatchEvent(new CustomEvent("daily_data_updated"));
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
      toast.error("Failed to update task.");
    } finally {
      setToggling(null);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    const order = { high: 0, medium: 1, low: 2 };
    const aD = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bD = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    if (aD !== bD) return aD - bD;
    return order[a.urgency] - order[b.urgency];
  });

  if (loading) {
    return (
      <SectionCard title="Daily Habits & Tasks" icon={<CheckCircle2 className="h-4 w-4" />}>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Daily Habits & Tasks" icon={<CheckCircle2 className="h-4 w-4" />}>
      {/* Summary */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-muted-foreground">
          Habits: <span className="font-semibold text-foreground">{completedHabits}/{habits.length}</span>
        </span>
        <span className="text-muted-foreground">
          Tasks: <span className="font-semibold text-foreground">{completedTasks}/{tasks.length}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Habits mini list */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Habits</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
            {habits.length === 0 ? (
              <p className="text-xs text-muted-foreground">No habits yet</p>
            ) : (
              [...habits].sort((a, b) => {
                const aCompleted = instances.find(i => i.habit_id === a.id)?.completed ?? false;
                const bCompleted = instances.find(i => i.habit_id === b.id)?.completed ?? false;
                return aCompleted === bCompleted ? 0 : aCompleted ? 1 : -1;
              }).map(habit => {
                const inst = instances.find(i => i.habit_id === habit.id);
                const done = inst?.completed ?? false;
                const isTogglingThis = toggling === habit.id;
                return (
                  <button
                    key={habit.id}
                    onClick={() => handleToggleHabit(habit.id)}
                    disabled={isTogglingThis}
                    className="flex items-center gap-2 text-sm w-full hover:bg-muted/50 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    {isTogglingThis ? (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                    ) : done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={cn("truncate", done && "line-through text-muted-foreground")}>
                      {habit.name}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">+{habit.xp_value}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Tasks mini list */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tasks</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
            {sortedTasks.map(task => {
              const done = task.is_completed;
              const isTogglingThis = toggling === task.id;
              return (
                <button
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  disabled={isTogglingThis}
                  className="flex items-center gap-2 text-sm w-full hover:bg-muted/50 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  {isTogglingThis ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
                  ) : done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn("truncate", done && "line-through text-muted-foreground")}>
                    {task.name}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px] px-1 py-0 ml-auto flex-shrink-0", urgencyColor(task.urgency))}>
                    {task.urgency}
                  </Badge>
                </button>
              );
            })}
            {tasks.length === 0 && (
              <p className="text-xs text-muted-foreground">No tasks today</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onNav("daily")}>
          Full Tracker <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 2: Negative Habits ───────────────────────────────────────────────

function NegativeHabitsSection({ onNav }: { onNav: (tab: string) => void }) {
  const [logs, setLogs]   = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const TODAY = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    (async () => {
      const [h, l] = await Promise.all([getNegativeHabits(), getNegativeHabitLogs(1)]);
      setHabits(h);
      setLogs(l.filter((log: any) => log.date === TODAY));
      setLoading(false);
    })();
  }, [TODAY]);

  const intensityColor: Record<string, string> = {
    mild:     "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    moderate: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    severe:   "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <SectionCard title="Negative Habits" icon={<AlertCircle className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No negative habits logged today. Keep it up!</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const habit = habits.find((h: any) => h.id === log.habit_id);
            return (
              <div key={log.id} className="flex items-center gap-2">
                <span className="text-red-500 text-sm">🔴</span>
                <span className="text-sm font-medium">{habit?.name ?? "Unknown"}</span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", intensityColor[log.intensity])}>
                  {log.intensity}
                </Badge>
                {log.xp_penalty && (
                  <span className="ml-auto text-xs text-red-500 font-medium">{log.xp_penalty} XP</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("habits")}>
          Manage Habits <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 3: Upcoming Deadlines ────────────────────────────────────────────

function UpcomingDeadlinesSection({ onNav, handleMoveTask, moving }: { onNav: (tab: string) => void; handleMoveTask: (task: any) => Promise<void>; moving: string | null; }) {
  const [tasks, setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const endWindow = addDays(now, 7);

      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("profile_id", user.id)
        .eq("is_completed", false)
        .not("deadline", "is", null)
        .lte("deadline", endWindow.toISOString())
        .order("deadline", { ascending: true });

      if (data) {
        setTasks(data.filter(t => {
          if (!t.deadline) return false;
          const deadline = new Date(t.deadline);
          return deadline >= new Date(format(now, "yyyy-MM-dd"));
        }));
      }
      setLoading(false);
    };

    fetchUpcoming();
    window.addEventListener("planner_tasks_updated", fetchUpcoming);
    return () => window.removeEventListener("planner_tasks_updated", fetchUpcoming);
  }, []);

  const byDay = tasks.reduce<Record<string, any[]>>((acc, task) => {
    const key = format(new Date(task.deadline), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const sortedDays = Object.keys(byDay).sort();

  function dayLabel(dateStr: string) {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    return format(d, "EEE, MMM d");
  }

  return (
    <SectionCard title="Upcoming Deadlines" icon={<Calendar className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : sortedDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming tasks in the next 7 days.</p>
      ) : (
        <div className="space-y-3">
          {sortedDays.slice(0, 5).map(day => (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {dayLabel(day)}
              </p>
              <div className="space-y-1">
                {byDay[day].slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => handleMoveTask(task)} disabled={moving === task.id} className="text-muted-foreground hover:text-primary disabled:opacity-50">
                      {moving === task.id ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      ) : (
                        <PlusCircle className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="truncate flex-1">{task.title}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1 py-0 ml-auto flex-shrink-0", urgencyColor(task.priority ?? "medium"))}>
                      {task.priority ?? "medium"}
                    </Badge>
                  </div>
                ))}
                {byDay[day].length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">+{byDay[day].length - 3} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("planner")}>
          Full Planner <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 3.5: Unscheduled Tasks ───────────────────────────────────────────

function UnscheduledTasksSection({ onNav, handleMoveTask, moving }: { onNav: (tab: string) => void; handleMoveTask: (task: any) => Promise<void>; moving: string | null; }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnscheduled = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("profile_id", user.id)
        .is("deadline", null)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });
        
      if (data) setTasks(data);
      setLoading(false);
    };

    fetchUnscheduled();
    window.addEventListener("planner_tasks_updated", fetchUnscheduled);
    return () => window.removeEventListener("planner_tasks_updated", fetchUnscheduled);
  }, []);

  return (
    <SectionCard title="Unscheduled Tasks" icon={<CheckCircle2 className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No unscheduled tasks.</p>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
               <button onClick={() => handleMoveTask(task)} disabled={moving === task.id} className="text-muted-foreground hover:text-primary disabled:opacity-50">
                   {moving === task.id ? (
                       <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                   ) : (
                       <PlusCircle className="h-3.5 w-3.5" />
                   )}
               </button>
              <span className="truncate flex-1">{task.title}</span>
              <Badge variant="outline" className={cn("text-[10px] px-1 py-0 flex-shrink-0", urgencyColor(task.priority ?? "medium"))}>
                {task.priority ?? "medium"}
              </Badge>
            </div>
          ))}
          {tasks.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+{tasks.length - 5} more</p>
          )}
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("planner")}>
          Go to Planner <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 4: Today's Journal ───────────────────────────────────────────────

function JournalTodaySection({ onNav }: { onNav: (tab: string) => void }) {
  const [entry, setEntry] = useState<any | null>(null);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const fetchEntry = useCallback(async () => {
    try {
      const result = await getJournalEntries();
      const todayEntry = (result.data ?? []).find((e: any) => {
        const dateStr = e.created_at?.split("T")[0];
        return dateStr === todayStr;
      });
      if (todayEntry) {
        setEntry(todayEntry);
        setContent(todayEntry.content || "");
        setMood(todayEntry.mood_score || 5);
      } else {
        setEntry(null);
        setContent("");
        setMood(5);
      }
    } catch {
      setEntry(null);
    }
    setLoading(false);
  }, [todayStr]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (entry) {
        await supabase.from("journal_entries").update({
          content,
          mood_score: mood
        }).eq("id", entry.id);
      } else {
        await supabase.from("journal_entries").insert({
          profile_id: user.id,
          content,
          mood_score: mood,
          is_encrypted: false
        });
      }
      // Re-fetch to update state
      await fetchEntry();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Today's Journal" icon={<BookMarked className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{moodEmoji(mood)}</span>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap">Mood: {mood}/10</span>
              <input
                type="range"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => setMood(parseInt(e.target.value))}
                className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <textarea
            className="w-full min-h-[80px] p-3 text-sm rounded-md bg-muted/40 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
            placeholder="How are you feeling today?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !content.trim() || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onNav("journal")}>
            Full Journal <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Section 5: Health Snapshot ───────────────────────────────────────────────

function HealthSnapshotSection({ onNav }: { onNav: (tab: string) => void }) {
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingExercise, setAddingExercise] = useState(false);
  const [exerciseType, setExerciseType] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchHealth = useCallback(async () => {
    try {
      const logs = await getExerciseLogs(today);
      setExerciseLogs(logs);
    } catch {
      setExerciseLogs([]);
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleSaveExercise = async () => {
    if (!exerciseType || !duration) return;
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from("exercise_logs").insert({
        profile_id: user.id,
        date: today,
        activity_type: exerciseType,
        duration_minutes: parseInt(duration),
        intensity: "moderate"
      });
      setAddingExercise(false);
      setExerciseType("");
      setDuration("");
      await fetchHealth();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const totalDuration = exerciseLogs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
  const exerciseTypes = [...new Set(exerciseLogs.map(l => l.activity_type).filter(Boolean))];

  return (
    <SectionCard title="Health Snapshot" icon={<Heart className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : addingExercise ? (
        <div className="space-y-3 bg-muted/40 p-3 rounded-lg border border-border/40">
          <p className="text-sm font-semibold">Quick Log Exercise</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="e.g. Running"
              value={exerciseType}
              onChange={e => setExerciseType(e.target.value)}
              className="h-8 px-2 text-sm rounded bg-background border focus:outline-none focus:ring-1"
            />
            <input
              type="number"
              placeholder="Minutes"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="h-8 px-2 text-sm rounded bg-background border focus:outline-none focus:ring-1"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveExercise} disabled={saving || !exerciseType || !duration}>
              {saving ? "..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingExercise(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => setAddingExercise(true)}
            className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-1">Exercise</p>
            {exerciseLogs.length > 0 ? (
              <>
                <p className="text-lg font-bold">{totalDuration}m</p>
                <p className="text-xs text-muted-foreground truncate">
                  {exerciseTypes.slice(0, 2).join(", ") || "—"}
                </p>
              </>
            ) : (
              <p className="text-sm text-primary font-medium mt-1">+ Log</p>
            )}
          </div>
          <div
            onClick={() => onNav("health")}
            className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-1">Food</p>
            <p className="text-sm text-muted-foreground mt-1">Log &rarr;</p>
          </div>
          <div
            onClick={() => onNav("health")}
            className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <p className="text-xs text-muted-foreground mb-1">Sleep</p>
            <p className="text-sm text-muted-foreground mt-1">Log &rarr;</p>
          </div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("health")}>
          Full Health Tracker <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 5.6: Career Snapshot ──────────────────────────────────────────────

function CareerSnapshotSection({ onNav }: { onNav: (tab: string) => void }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchCareer = useCallback(async () => {
    try {
      const { getRoles, getSessionsForDate } = await import("@/services/career/careerService");
      const r = await getRoles();
      const s = await getSessionsForDate(today);
      setRoles(r.filter(x => x.is_active));
      setSessions(s);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchCareer();
  }, [fetchCareer]);

  const handleClockIn = async (roleId: string, roleTitle: string) => {
    setSaving(roleId);
    try {
      const { clockIn } = await import("@/services/career/careerService");
      const result = await clockIn(roleId, roleTitle, today);
      if (result.xpGranted) {
        toast.success(`Clocked in! +${result.xp} XP`);
        window.dispatchEvent(new CustomEvent("xp_updated"));
      } else {
        toast.success("Already clocked in for today.");
      }
      await fetchCareer();
    } catch {
      toast.error("Clock-in failed.");
    } finally {
      setSaving(null);
    }
  };

  const handleClockOut = async (roleId: string) => {
    setSaving(roleId);
    try {
      const { clockOut } = await import("@/services/career/careerService");
      // Just sending 0 or asking user for minutes could be complex,
      // For quick action, let's just mark clocked_out (we need duration... let's just send 60 mins for quick logging)
      // Wait, let's just open the career tab if they need to enter duration,
      // or we can prompt them. For now, simple fixed duration or switch to full tracker.
      toast.info("Please use the full Career Tracker to log hours.");
      onNav("career");
    } finally {
      setSaving(null);
    }
  };

  return (
    <SectionCard title="Career / Work" icon={<Briefcase className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active work roles found.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quick Clock-in</p>
          <div className="space-y-2">
            {roles.slice(0, 3).map(role => {
              const session = sessions.find(s => s.role_id === role.id);
              const isClockedIn = session?.clocked_in;
              return (
                <div key={role.id} className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-muted/20">
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span className="text-sm font-medium truncate">{role.title}</span>
                    {role.company && <span className="text-[10px] text-muted-foreground truncate">{role.company}</span>}
                  </div>
                  <Button
                    size="sm"
                    variant={isClockedIn ? "secondary" : "default"}
                    className={cn("h-7 text-xs px-3", isClockedIn && "bg-green-500/10 text-green-600 hover:bg-green-500/20")}
                    onClick={() => isClockedIn ? handleClockOut(role.id) : handleClockIn(role.id, role.title)}
                    disabled={saving === role.id}
                  >
                    {saving === role.id ? "..." : isClockedIn ? "Clocked In" : "Clock In"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("career")}>
          Full Career Tracker <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 6: XP & Level ────────────────────────────────────────────────────

// ─── Section 5.5: Academic Snapshot ───────────────────────────────────────────

function AcademicSnapshotSection({ onNav }: { onNav: (tab: string) => void }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchAcademic = useCallback(async () => {
    try {
      const { getSemesters, getCoursesBySemester, getClassInstancesByDate } = await import("@/services/academic/academicService");
      const semesters = await getSemesters();
      const activeSem = semesters.find((s: any) => s.status === "active");
      if (activeSem) {
        const semesterCourses = await getCoursesBySemester(activeSem.id);
        
        // Find if they were attended today
        const coursesWithStatus = await Promise.all(semesterCourses.map(async (c: any) => {
          const inst = await getClassInstancesByDate(c.id, today);
          return { ...c, todayInstance: inst };
        }));
        
        setCourses(coursesWithStatus);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchAcademic();
  }, [fetchAcademic]);

  const handleLogAttendance = async (courseId: string, status: "attended" | "missed" | "od") => {
    setSaving(courseId);
    try {
      const { createClassInstance, updateClassInstanceStatus } = await import("@/services/academic/academicService");
      const course = courses.find(c => c.id === courseId);
      if (course?.todayInstance) {
        await updateClassInstanceStatus(course.todayInstance.id, status);
      } else {
        await createClassInstance(courseId, today, status);
      }
      await fetchAcademic();
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  return (
    <SectionCard title="Academic Snapshot" icon={<BookOpen className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active semester or courses found.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Quick Log Today's Classes</p>
          <div className="space-y-2">
            {courses.slice(0, 4).map(course => {
              const inst = course.todayInstance;
              return (
                <div key={course.id} className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-muted/20">
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span className="text-sm font-medium truncate">{course.code || course.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={inst?.status === "attended" ? "default" : "outline"}
                      className={cn("h-7 text-xs px-2", inst?.status === "attended" && "bg-green-500 hover:bg-green-600")}
                      onClick={() => handleLogAttendance(course.id, "attended")}
                      disabled={saving === course.id}
                    >
                      {saving === course.id ? "..." : "Attended"}
                    </Button>
                    <Button
                      size="sm"
                      variant={inst?.status === "missed" ? "default" : "outline"}
                      className={cn("h-7 text-xs px-2", inst?.status === "missed" && "bg-red-500 hover:bg-red-600")}
                      onClick={() => handleLogAttendance(course.id, "missed")}
                      disabled={saving === course.id}
                    >
                      Missed
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onNav("academic")}>
          Full Academic Tracker <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 6: XP & Level ────────────────────────────────────────────────────

function XPLevelSection({ onNav }: { onNav: (tab: string) => void }) {
  const { totalXp, level, levelFloor, spendingPool, xpToNext } = useRealtimeXP();

  const poolPct = Math.min(100, (spendingPool / XP_PER_LEVEL) * 100);
  const poolColor = poolPct > 50 ? "bg-emerald-500" : poolPct > 20 ? "bg-amber-500" : "bg-red-500";
  const floorPct  = totalXp > 0 ? Math.min(100, (levelFloor / Math.max(levelFloor, totalXp)) * 100) : 0;

  return (
    <SectionCard title="Progress & Rewards" icon={<Zap className="h-4 w-4" />}>
      <div className="flex items-start gap-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Level</p>
          <p className="text-5xl font-black">{level}</p>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Spending Pool</span>
              <span>{spendingPool.toLocaleString()} / {XP_PER_LEVEL} XP</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", poolColor)} style={{ width: `${poolPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Level Floor (protected)</span>
              <span>{levelFloor.toLocaleString()} XP</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-slate-500/60 transition-all duration-700" style={{ width: `${floorPct}%` }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {xpToNext.toLocaleString()} XP to Level {level + 1}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onNav("profile")}>
          <ShoppingBag className="h-3 w-3 mr-1" />
          Indulgence Shop
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onNav("profile")}>
          <TrendingUp className="h-3 w-3 mr-1" />
          View Profile
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 7: Oracle ───────────────────────────────────────────────────────

function OracleSection({ onNav }: { onNav: (tab: string) => void }) {
  const { isDeepMode } = useMode();

  return (
    <SectionCard title="Oracle — AI Life Coach" icon={<Sparkles className="h-4 w-4" />}>
      {isDeepMode ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your AI coach is ready. Chat about your day, get a diagnosis, or request a weekly review.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Chat</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Day Diagnosis</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Weekly Review</span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted p-2 flex-shrink-0">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Deep Mode required</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enable Deep Mode to unlock the Oracle AI coach — personalised diagnosis, weekly reviews, and private chat.
            </p>
          </div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("oracle")} disabled={!isDeepMode}>
          <Sparkles className="h-3 w-3 mr-1" />
          {isDeepMode ? "Open Oracle" : "Locked — Enable Deep Mode"}
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Main Dashboard Hub ───────────────────────────────────────────────────────

interface DashboardHubProps {
  onNav: (tab: string) => void;
}

export function DashboardHub({ onNav }: DashboardHubProps) {
  const { isDeepMode } = useMode();
  const [moving, setMoving] = useState<string | null>(null);

  const handleMoveTask = async (task: any) => {
    setMoving(task.id);
    try {
      const { addPlannerTaskToDailyTasks } = await import("@/services/tasks/taskTrackerService");
      await addPlannerTaskToDailyTasks(task);
      toast.success(`Moved "${task.title}" to today's tasks.`);
      window.dispatchEvent(new CustomEvent("daily_data_updated"));
      window.dispatchEvent(new CustomEvent("planner_tasks_updated"));
    } catch (error) {
      console.error("Failed to move task:", error);
      toast.error("Failed to move task.");
    } finally {
      setMoving(null);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
      </div>

      <DailyHabitsTasksSection onNav={onNav} />
      {isDeepMode && <NegativeHabitsSection onNav={onNav} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <UpcomingDeadlinesSection onNav={onNav} handleMoveTask={handleMoveTask} moving={moving} />
        <UnscheduledTasksSection onNav={onNav} handleMoveTask={handleMoveTask} moving={moving} />
      </div>
      <JournalTodaySection onNav={onNav} />
      <HealthSnapshotSection onNav={onNav} />
      <XPLevelSection onNav={onNav} />
      <OracleSection onNav={onNav} />
    </div>
  );
}
