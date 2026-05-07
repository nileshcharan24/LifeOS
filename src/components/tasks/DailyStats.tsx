"use client";

import { useEffect, useState } from "react";
import { getTrackerStats, getHabitRates } from "@/services/tasks/taskTrackerService";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Trophy, Zap, Target } from "lucide-react";
import { format } from "date-fns";

type Stats = Awaited<ReturnType<typeof getTrackerStats>>;
type HabitRate = { id: string; name: string; completed: number; total: number; rate: number };

export function DailyStats({ date }: { date: string }) {
  const [stats, setStats]               = useState<Stats>(null);
  const [weeklyRates, setWeeklyRates]   = useState<HabitRate[]>([]);
  const [monthlyRates, setMonthlyRates] = useState<HabitRate[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      const [s, w, m] = await Promise.all([
        getTrackerStats(date),
        getHabitRates(7),
        getHabitRates(30),
      ]);
      setStats(s);
      setWeeklyRates(w);
      setMonthlyRates(m);
      setLoading(false);
    }
    load();
  }, [date]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  const displayDate = format(new Date(date + "T12:00:00"), "MMMM d, yyyy");

  return (
    <div className="space-y-10">

      {/* ── Today's Summary ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-xl font-bold">Today's Stats</h2>
          <span className="text-sm text-muted-foreground">— {displayDate}</span>
        </div>

        {!stats ? (
          <p className="text-sm text-muted-foreground">No data yet for today.</p>
        ) : (
          <>
            {/* Badges */}
            <div className="flex gap-3 flex-wrap">
              {stats.perfectDay && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-sm font-semibold">
                  🏆 Perfect Day
                </div>
              )}
              {stats.productiveDay && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-sm font-semibold">
                  🎯 Productive Day
                </div>
              )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon="🔄"
                label="Habits"
                value={`${stats.habitsCompleted} / ${stats.totalHabits}`}
                sub={stats.totalHabits > 0 ? `${Math.round((stats.habitsCompleted / stats.totalHabits) * 100)}%` : "—"}
                color="bg-blue-500/10 border-blue-500/20"
              />
              <StatCard
                icon="✅"
                label="Tasks"
                value={`${stats.tasksCompleted} / ${stats.totalTasks}`}
                sub={stats.totalTasks > 0 ? `${Math.round((stats.tasksCompleted / stats.totalTasks) * 100)}%` : "—"}
                color="bg-green-500/10 border-green-500/20"
              />
              <StatCard
                icon="⚡"
                label="XP Earned"
                value={`${stats.totalXp}`}
                sub="today"
                color="bg-yellow-500/10 border-yellow-500/20"
              />
              <StatCard
                icon="📊"
                label="Habit Rate"
                value={stats.totalHabits > 0 ? `${Math.round((stats.habitsCompleted / stats.totalHabits) * 100)}%` : "—"}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <XPBreakdownItem label="From Habits"   amount={stats.xpBreakdown.habits}   color="text-blue-600 dark:text-blue-400" />
                <XPBreakdownItem label="From Tasks"    amount={stats.xpBreakdown.tasks}    color="text-green-600 dark:text-green-400" />
                <XPBreakdownItem label="From Academic" amount={stats.xpBreakdown.academic} color="text-purple-600 dark:text-purple-400" />
                <XPBreakdownItem label="Bonuses"       amount={stats.xpBreakdown.bonuses}  color="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="pt-2 border-t border-border/20 flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">+{stats.totalXp} XP</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Weekly Habit Rates ── */}
      {weeklyRates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-bold">Weekly Habit Rates</h2>
            <span className="text-sm text-muted-foreground">— last 7 days</span>
          </div>
          <div className="space-y-3">
            {weeklyRates.map(h => (
              <HabitRateRow key={h.id} name={h.name} completed={h.completed} total={h.total} rate={h.rate} />
            ))}
          </div>
        </section>
      )}

      {/* ── Monthly Habit Rates ── */}
      {monthlyRates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-bold">Monthly Habit Rates</h2>
            <span className="text-sm text-muted-foreground">— last 30 days</span>
          </div>
          <div className="space-y-3">
            {monthlyRates.map(h => (
              <HabitRateRow key={h.id} name={h.name} completed={h.completed} total={h.total} rate={h.rate} />
            ))}
          </div>
        </section>
      )}

      {weeklyRates.length === 0 && monthlyRates.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-muted-foreground">No habit data yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Complete habits daily to see your trends here.</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
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

function XPBreakdownItem({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>+{amount}</p>
    </div>
  );
}

function HabitRateRow({
  name, completed, total, rate,
}: {
  name: string;
  completed: number;
  total: number;
  rate: number;
}) {
  const color =
    rate >= 85 ? "[&>div]:bg-green-500"
    : rate >= 70 ? "[&>div]:bg-yellow-500"
    : "[&>div]:bg-red-500";

  const textColor =
    rate >= 85 ? "text-green-600 dark:text-green-400"
    : rate >= 70 ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{completed}/{total} days</span>
          <span className={`font-bold text-base ${textColor}`}>{rate}%</span>
        </div>
      </div>
      <Progress value={rate} className={`h-2 ${color}`} />
    </div>
  );
}
