"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeXP } from "@/hooks/useRealtimeXP";
import { XP_PER_LEVEL, MILESTONE_LEVELS } from "@/lib/xp";
import { IndulgenceShop } from "@/components/dashboard/IndulgenceShop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { User, Star, Trophy, Settings, LogOut, Zap, ShieldCheck } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  total_xp: number;
  level: number;
  daily_streak: number | null;
  about_me: string | null;
  avatar_url: string | null;
};

// ─── Milestones ───────────────────────────────────────────────────────────────

const ALL_MILESTONES = [1, 5, 10, 25, 50, 100, 200, 500];

function MilestonesGrid({ currentLevel }: { currentLevel: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ALL_MILESTONES.map((milestone) => {
        const achieved = currentLevel >= milestone;
        const xpNeeded = (milestone - 1) * XP_PER_LEVEL;
        return (
          <div
            key={milestone}
            className={cn(
              "rounded-lg border p-3 text-center transition-colors",
              achieved
                ? "border-primary/40 bg-primary/5"
                : "border-border/40 bg-muted/20 opacity-60"
            )}
          >
            <div className="text-lg mb-1">{achieved ? "⭐" : "🔒"}</div>
            <p className={cn("text-sm font-bold", achieved ? "text-foreground" : "text-muted-foreground")}>
              Level {milestone}
            </p>
            {achieved ? (
              <Badge variant="secondary" className="text-[10px] mt-1">Achieved</Badge>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">{xpNeeded.toLocaleString()} XP</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── XP Bars ─────────────────────────────────────────────────────────────────

function XPProgressSection() {
  const { totalXp, level, levelFloor, spendingPool, xpToNext } = useRealtimeXP();

  const poolPct   = Math.min(100, (spendingPool / XP_PER_LEVEL) * 100);
  const poolColor = poolPct > 50 ? "bg-emerald-500" : poolPct > 20 ? "bg-amber-500" : "bg-red-500";
  const floorPct  = totalXp > 0 ? Math.min(100, (levelFloor / Math.max(levelFloor, totalXp)) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Level & XP</h2>
      </div>

      <div className="flex items-start gap-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Level</p>
          <p className="text-6xl font-black leading-none mt-1">{level}</p>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Spending Pool</span>
              <span>{spendingPool.toLocaleString()} / {XP_PER_LEVEL} XP</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", poolColor)} style={{ width: `${poolPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Level Floor (protected)</span>
              <span>{levelFloor.toLocaleString()} XP</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-slate-500/60 transition-all duration-700" style={{ width: `${floorPct}%` }} />
            </div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{totalXp.toLocaleString()} XP total</span>
            <span className="text-muted-foreground">{xpToNext.toLocaleString()} XP to Level {level + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

interface ProfilePageProps {
  onNav: (tab: string) => void;
}

export function ProfilePage({ onNav }: ProfilePageProps) {
  const { user } = useAuth();
  const { level } = useRealtimeXP();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("total_xp, level, daily_streak, about_me, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [user]);

  const joinDate = user?.created_at
    ? format(parseISO(user.created_at), "MMMM yyyy")
    : "—";

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "User";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Your Account</p>
        <h1 className="text-3xl font-semibold">Profile</h1>
      </div>

      {/* User info card */}
      <div className="rounded-xl border border-border/40 bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Joined {joinDate}</p>
          </div>
          {profile?.daily_streak != null && profile.daily_streak > 0 && (
            <div className="ml-auto text-center flex-shrink-0">
              <p className="text-2xl">🔥</p>
              <p className="text-xs font-medium">{profile.daily_streak} day streak</p>
            </div>
          )}
        </div>
        {profile?.about_me && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-sm text-muted-foreground">{profile.about_me}</p>
          </div>
        )}
      </div>

      {/* XP & Level */}
      <XPProgressSection />

      {/* Achievements & Milestones */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Milestones</h2>
        </div>
        <MilestonesGrid currentLevel={level} />
      </div>

      {/* Indulgence Market */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Indulgence Market</h2>
        </div>
        <IndulgenceShop />
      </div>

      {/* Settings Quick Links */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Quick Links</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" className="justify-start gap-2" onClick={() => onNav("settings")}>
            <Settings className="h-4 w-4" /> Configure XP Values
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => onNav("settings")}>
            <ShieldCheck className="h-4 w-4" /> Deep Mode & PIN
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => onNav("settings")}>
            <Settings className="h-4 w-4" /> App Settings
          </Button>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
