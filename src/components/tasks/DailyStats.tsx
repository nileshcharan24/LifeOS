"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getTrackerStats,
  getTrackerStatsForRange,
  getHabitRatesForRange,
} from "@/services/tasks/taskTrackerService";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BarChart3, Trophy, Zap, Target, ChevronLeft, ChevronRight,
  Calendar, CalendarDays, CalendarRange,
} from "lucide-react";
import {
  format, addDays, addWeeks, addMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, subWeeks, subMonths, parseISO,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "day" | "week" | "month";

type RangeStats = Awaited<ReturnType<typeof getTrackerStatsForRange>>;
type HabitRate  = { id: string; name: string; completed: number; total: number; rate: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRangeDates(view: View, anchor: Date): { start: string; end: string; label: string } {
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  if (view === "day") {
    const s = fmt(anchor);
    return { start: s, end: s, label: format(anchor, "EEEE, MMMM d, yyyy") };
  }
  if (view === "week") {
    const s = startOfWeek(anchor, { weekStartsOn: 1 });
    const e = endOfWeek(anchor, { weekStartsOn: 1 });
    return {
      start: fmt(s), end: fmt(e),
      label: `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`,
    };
  }
  // month
  const s = startOfMonth(anchor);
  const e = endOfMonth(anchor);
  return { start: fmt(s), end: fmt(e), label: format(anchor, "MMMM yyyy") };
}

function navigate(view: View, anchor: Date, dir: -1 | 1): Date {
  if (view === "day")   return dir === 1 ? addDays(anchor, 1)    : subDays(anchor, 1);
  if (view === "week")  return dir === 1 ? addWeeks(anchor, 1)   : subWeeks(anchor, 1);
  return                       dir === 1 ? addMonths(anchor, 1)  : subMonths(anchor, 1);
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function DailyStats({ date }: { date: string }) {
  const [view, setView]           = useState<View>("day");
  const [anchor, setAnchor]       = useState<Date>(parseISO(date));
  const [stats, setStats]         = useState<RangeStats>(null);
  const [habitRates, setHabitRates] = useState<HabitRate[]>([]);
  const [loading, setLoading]     = useState(true);

  const { start, end, label } = getRangeDates(view, anchor);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, h] = await Promise.all([
      getTrackerStatsForRange(start, end),
      getHabitRatesForRange(start, end),
    ]);
    setStats(s);
    setHabitRates(h);
    setLoading(false);
  }, [start, end]);

  useEffect(() => { load(); }, [load]);

  const isAtToday = end >= format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-8">

      {/* ── Controls bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 w-fit">
          {([
            { id: "day",   icon: <Calendar      className="h-3.5 w-3.5" />, label: "Day"   },
            { id: "week",  icon: <CalendarDays  className="h-3.5 w-3.5" />, label: "Week"  },
            { id: "month", icon: <CalendarRange className="h-3.5 w-3.5" />, label: "Month" },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                view === t.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor(a => navigate(view, a, -1))}
            className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm font-medium min-w-[200px] text-center">{label}</span>

          <button
            onClick={() => setAnchor(a => navigate(view, a, 1))}
            disabled={isAtToday}
            className="p-1.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {!isAtToday && (
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setAnchor(parseISO(date))}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats body ── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <div className="space-y-8">

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon="🔄" label="Habits"
              value={`${stats.habitsCompleted} / ${stats.totalHabits}`}
              sub={`${stats.habitRate}% completion`}
              color="bg-blue-500/10 border-blue-500/20"
            />
            <StatCard
              icon="✅" label="Tasks"
              value={`${stats.tasksCompleted} / ${stats.totalTasks}`}
              sub={`${stats.taskRate}% completion`}
              color="bg-green-500/10 border-green-500/20"
            />
            <StatCard
              icon="⚡" label="XP Earned"
              value={`${stats.totalXp}`}
              sub={view === "day" ? "today" : view === "week" ? "this week" : "this month"}
              color="bg-yellow-500/10 border-yellow-500/20"
            />
            <StatCard
              icon="📊" label="Habit Rate"
              value={stats.totalHabits > 0 ? `${stats.habitRate}%` : "—"}
              sub="completion"
              color="bg-pink-500/10 border-pink-500/20"
            />
          </div>

          {/* XP Breakdown */}
          <div className="p-5 rounded-xl border border-border/40 bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="font-semibold text-sm">XP Breakdown</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <XPItem label="Habits"   amount={stats.xpBreakdown.habits}   color="text-blue-600 dark:text-blue-400" />
              <XPItem label="Tasks"    amount={stats.xpBreakdown.tasks}    color="text-green-600 dark:text-green-400" />
              <XPItem label="Academic" amount={stats.xpBreakdown.academic} color="text-purple-600 dark:text-purple-400" />
              <XPItem label="Health"   amount={(stats.xpBreakdown as any).health ?? 0}  color="text-emerald-600 dark:text-emerald-400" />
              <XPItem label="Career"   amount={(stats.xpBreakdown as any).career ?? 0}  color="text-orange-600 dark:text-orange-400" />
              <XPItem label="Bonuses"  amount={stats.xpBreakdown.bonuses}  color="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="pt-2 border-t border-border/20 flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-yellow-600 dark:text-yellow-400">+{stats.totalXp} XP</span>
            </div>
          </div>

          {/* Habit breakdown */}
          {habitRates.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold">Habit Breakdown</h2>
                <span className="text-sm text-muted-foreground">— {label}</span>
              </div>
              <div className="space-y-3">
                {habitRates.map(h => (
                  <HabitRateRow key={h.id} name={h.name} completed={h.completed} total={h.total} rate={h.rate} />
                ))}
              </div>
            </section>
          )}

          {habitRates.length === 0 && stats.totalHabits === 0 && (
            <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-muted-foreground">No data for this period.</p>
              <p className="text-xs text-muted-foreground mt-1">Complete habits and tasks to see stats here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className={`p-4 rounded-xl border ${color} space-y-1`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{icon}</span> {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function XPItem({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>+{amount}</p>
    </div>
  );
}

function HabitRateRow({ name, completed, total, rate }: {
  name: string; completed: number; total: number; rate: number;
}) {
  const barColor  = rate >= 85 ? "[&>div]:bg-green-500" : rate >= 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500";
  const textColor = rate >= 85 ? "text-green-600 dark:text-green-400" : rate >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{completed}/{total} days</span>
          <span className={`font-bold text-base ${textColor}`}>{rate}%</span>
        </div>
      </div>
      <Progress value={rate} className={`h-2 ${barColor}`} />
    </div>
  );
}
