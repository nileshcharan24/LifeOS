"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addDays, isToday, parseISO, startOfDay, endOfDay } from "date-fns";
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
import {
  CheckCircle2, Circle, Calendar, BookMarked, Heart,
  Zap, ShoppingBag, Pencil, ArrowRight, Clock, TrendingUp,
  AlertCircle, Flame,
} from "lucide-react";

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

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    (async () => {
      const [h, inst, t] = await Promise.all([
        getHabits(),
        ensureAndGetHabitInstances(today),
        getDailyTasksForDate(today),
      ]);
      setHabits(h);
      setInstances(inst);
      setTasks(t);
      setLoading(false);
    })();
  }, [today]);

  const completedHabits = instances.filter(i => i.completed).length;
  const completedTasks  = tasks.filter(t => t.is_completed).length;

  const sortedTasks = [...tasks].sort((a, b) => {
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
          <div className="space-y-1.5">
            {habits.slice(0, 5).map(habit => {
              const inst = instances.find(i => i.habit_id === habit.id);
              const done = inst?.completed ?? false;
              return (
                <div key={habit.id} className="flex items-center gap-2 text-sm">
                  {done
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    : <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                  <span className={cn("truncate", done && "line-through text-muted-foreground")}>
                    {habit.name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">+{habit.xp_value}</span>
                </div>
              );
            })}
            {habits.length === 0 && (
              <p className="text-xs text-muted-foreground">No habits yet</p>
            )}
          </div>
        </div>

        {/* Tasks mini list */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Tasks</p>
          <div className="space-y-1.5">
            {sortedTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                {task.is_completed
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  : <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                <span className={cn("truncate", task.is_completed && "line-through text-muted-foreground")}>
                  {task.name}
                </span>
                <Badge variant="outline" className={cn("text-[10px] px-1 py-0 ml-auto flex-shrink-0", urgencyColor(task.urgency))}>
                  {task.urgency}
                </Badge>
              </div>
            ))}
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

function UpcomingDeadlinesSection({ onNav }: { onNav: (tab: string) => void }) {
  const [tasks, setTasks]   = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all: DailyTask[] = [];
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(new Date(), i), "yyyy-MM-dd");
        const dayTasks = await getDailyTasksForDate(date);
        all.push(...dayTasks.filter(t => !t.is_completed));
      }
      // deduplicate by id
      const seen = new Set<string>();
      setTasks(all.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; }));
      setLoading(false);
    })();
  }, []);

  const byDay = tasks.reduce<Record<string, DailyTask[]>>((acc, task) => {
    const key = task.task_date;
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
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{task.name}</span>
                    <Badge variant="outline" className={cn("text-[10px] px-1 py-0 ml-auto flex-shrink-0", urgencyColor(task.urgency))}>
                      {task.urgency}
                    </Badge>
                  </div>
                ))}
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

// ─── Section 4: Today's Journal ───────────────────────────────────────────────

function JournalTodaySection({ onNav }: { onNav: (tab: string) => void }) {
  const [entry, setEntry] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    (async () => {
      try {
        const result = await getJournalEntries();
        const todayEntry = (result.data ?? []).find((e: any) => {
          const dateStr = e.created_at?.split("T")[0];
          return dateStr === todayStr;
        });
        setEntry(todayEntry ?? null);
      } catch {
        setEntry(null);
      }
      setLoading(false);
    })();
  }, [todayStr]);

  return (
    <SectionCard title="Today's Journal" icon={<BookMarked className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : entry ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{moodEmoji(entry.mood_score ?? 5)}</span>
            <div>
              <p className="text-sm font-medium">Mood: {entry.mood_score ?? "—"}/10</p>
              {entry.mood_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.mood_tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          {entry.content && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entry.content.slice(0, 120)}{entry.content.length > 120 ? "..." : ""}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No journal entry for today yet.</p>
      )}
      <div className="mt-4 pt-3 border-t border-border/40 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onNav("journal")}>
          <Pencil className="h-3 w-3 mr-1" />
          {entry ? "Edit Entry" : "Write Entry"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onNav("journal")}>
          All Entries <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Section 5: Health Snapshot ───────────────────────────────────────────────

function HealthSnapshotSection({ onNav }: { onNav: (tab: string) => void }) {
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    (async () => {
      try {
        const logs = await getExerciseLogs(today);
        setExerciseLogs(logs);
      } catch {
        setExerciseLogs([]);
      }
      setLoading(false);
    })();
  }, [today]);

  const totalDuration = exerciseLogs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);
  const exerciseTypes = [...new Set(exerciseLogs.map(l => l.activity_type).filter(Boolean))];

  return (
    <SectionCard title="Health Snapshot" icon={<Heart className="h-4 w-4" />}>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Exercise</p>
            {exerciseLogs.length > 0 ? (
              <>
                <p className="text-lg font-bold">{totalDuration}m</p>
                <p className="text-xs text-muted-foreground truncate">
                  {exerciseTypes.slice(0, 2).join(", ") || "—"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Food</p>
            <p className="text-sm text-muted-foreground">Log in Health</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Sleep</p>
            <p className="text-sm text-muted-foreground">Log in Health</p>
          </div>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border/40">
        <Button size="sm" variant="outline" onClick={() => onNav("health")}>
          Health Tracker <ArrowRight className="h-3 w-3 ml-1" />
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

// ─── Main Dashboard Hub ───────────────────────────────────────────────────────

interface DashboardHubProps {
  onNav: (tab: string) => void;
}

export function DashboardHub({ onNav }: DashboardHubProps) {
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">LifeOS Control</p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
      </div>

      <DailyHabitsTasksSection onNav={onNav} />
      <NegativeHabitsSection onNav={onNav} />
      <UpcomingDeadlinesSection onNav={onNav} />
      <JournalTodaySection onNav={onNav} />
      <HealthSnapshotSection onNav={onNav} />
      <XPLevelSection onNav={onNav} />
    </div>
  );
}
