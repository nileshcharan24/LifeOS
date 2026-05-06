"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeHabit } from "@/services/habitService";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, Star, Trophy, Zap } from "lucide-react";
import { isSameDay } from "date-fns";

type Quest = {
  id: string;
  name: string;
  description: string | null;
  xp_reward: number;
  frequency: string;
  is_active: boolean | null;
  last_completed_at: string | null;
};

type Transaction = {
  created_at: string | null;
  reason: string;
  amount: number;
};

// Habit leveling: level = floor(sqrt(completions / 2)) + 1
// Level 1: 0, Level 2: 2, Level 3: 8, Level 4: 18, Level 5: 32, Level 6: 50...
function habitLevelInfo(completions: number) {
  const level = Math.floor(Math.sqrt(completions / 2)) + 1;
  const currentThreshold = 2 * Math.pow(level - 1, 2);
  const nextThreshold = 2 * Math.pow(level, 2);
  const progress =
    nextThreshold === currentThreshold
      ? 100
      : ((completions - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return { level, progress: Math.min(100, Math.max(0, progress)), nextThreshold, currentThreshold };
}

const LEVEL_TIERS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Novice",    color: "text-slate-500",  bg: "bg-slate-500/10 border-slate-500/30" },
  2: { label: "Apprentice",color: "text-amber-700",  bg: "bg-amber-700/10 border-amber-700/30" },
  3: { label: "Adept",     color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/30" },
  4: { label: "Expert",    color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" },
  5: { label: "Master",    color: "text-cyan-400",   bg: "bg-cyan-400/10 border-cyan-400/30" },
};

function getTier(level: number) {
  const key = Math.min(level, 5);
  return LEVEL_TIERS[key] ?? LEVEL_TIERS[5];
}

function getProgressBarColor(level: number) {
  if (level >= 5) return "[&>div]:bg-cyan-400";
  if (level >= 4) return "[&>div]:bg-yellow-500";
  if (level >= 3) return "[&>div]:bg-slate-400";
  if (level >= 2) return "[&>div]:bg-amber-700";
  return "[&>div]:bg-primary";
}

export function HabitGrid() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: questData }, { data: txData }] = await Promise.all([
      supabase
        .from("quests")
        .select("*")
        .eq("profile_id", user.id)
        .eq("is_active", true),
      supabase
        .from("xp_transactions")
        .select("created_at, reason, amount")
        .eq("profile_id", user.id)
        .ilike("reason", "Quest:%"),
    ]);

    if (questData) setQuests(questData);
    if (txData) setTransactions(txData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("xp_updated", fetchData);
    return () => window.removeEventListener("xp_updated", fetchData);
  }, [fetchData]);

  const getQuestStats = (quest: Quest) => {
    const questTxs = transactions.filter((tx) =>
      tx.reason.startsWith(`Quest: ${quest.name}`)
    );
    const completions = questTxs.length;
    const totalXP = questTxs.reduce((s, tx) => s + tx.amount, 0);
    const doneToday =
      quest.last_completed_at
        ? isSameDay(new Date(quest.last_completed_at), new Date())
        : false;

    // Calculate streak from transactions
    const dates = new Set(
      questTxs
        .filter((tx) => tx.created_at)
        .map((tx) => {
          const d = new Date(tx.created_at!);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
    );
    let streak = doneToday ? 1 : 0;
    const check = new Date();
    check.setDate(check.getDate() - (doneToday ? 1 : 0));
    for (let i = 0; i < 60; i++) {
      check.setDate(check.getDate() - 1);
      const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
      if (dates.has(key)) streak++;
      else break;
    }

    return { completions, totalXP, doneToday, streak };
  };

  const handleComplete = async (quest: Quest) => {
    setCompleting(quest.id);
    try {
      const result = await completeHabit(quest.id, quest.name, quest.xp_reward);
      if (result.alreadyDone) {
        toast.info("Already completed today!");
      } else if (result.success) {
        const msg =
          result.streakBonus > 0
            ? `+${result.xpGranted} XP! (Streak bonus: +${result.streakBonus} XP)`
            : `+${result.xpGranted} XP earned!`;
        toast.success(msg);
        window.dispatchEvent(new CustomEvent("xp_updated"));
        await fetchData();
      }
    } catch {
      toast.error("Failed to complete habit.");
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/40 p-8 text-center">
        <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No active quests. Create one on the Dashboard tab!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {quests.map((quest) => {
        const { completions, totalXP, doneToday, streak } = getQuestStats(quest);
        const { level, progress, nextThreshold } = habitLevelInfo(completions);
        const tier = getTier(level);
        const barColor = getProgressBarColor(level);
        const isCompleting = completing === quest.id;

        return (
          <div
            key={quest.id}
            className={`relative p-5 rounded-xl border transition-all ${
              doneToday
                ? "border-green-500/40 bg-green-500/5"
                : "border-border/40 bg-muted/40 hover:border-primary/30"
            }`}
          >
            {/* Level badge + streak */}
            <div className="flex items-start justify-between mb-3">
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${tier.bg} ${tier.color} border`}
              >
                <Star className="h-3 w-3 mr-1" />
                Lv.{level} {tier.label}
              </Badge>
              {streak >= 2 && (
                <div className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                  <Flame className="h-3.5 w-3.5" />
                  {streak}d
                </div>
              )}
            </div>

            {/* Quest info */}
            <h3 className="font-semibold text-sm mb-1 leading-snug">{quest.name}</h3>
            {quest.description && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {quest.description}
              </p>
            )}

            {/* XP Progress bar */}
            <div className="mb-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{completions} completions</span>
                <span>{completions}/{nextThreshold} → Lv.{level + 1}</span>
              </div>
              <Progress value={progress} className={`h-1.5 ${barColor}`} />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-3 mb-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                {totalXP} XP earned
              </span>
              <Badge variant="outline" className="text-xs py-0">
                {quest.frequency}
              </Badge>
            </div>

            {/* Complete button */}
            <Button
              size="sm"
              className="w-full"
              disabled={doneToday || isCompleting}
              variant={doneToday ? "secondary" : "default"}
              onClick={() => handleComplete(quest)}
            >
              {isCompleting
                ? "Logging..."
                : doneToday
                ? "✓ Done today"
                : `Complete (+${quest.xp_reward} XP)`}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
