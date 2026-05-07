"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useRealtimeXP } from "@/hooks/useRealtimeXP";
import { XP_PER_LEVEL } from "@/lib/xp";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

function XPBar({
  value,
  max,
  color,
  label,
  className,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  className?: string;
}) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function XPDisplay() {
  const { totalXp, level, levelFloor, spendingPool, xpToNext } = useRealtimeXP();
  const prevLevelRef = useRef(level);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    prevLevelRef.current = level;
  }, [level]);

  // Bar 1: Spending pool — how much XP above the floor (spendable)
  // Color: green when plenty, amber when low, red when nearly empty
  const poolPct = (spendingPool / XP_PER_LEVEL) * 100;
  const poolColor =
    poolPct > 50 ? "bg-emerald-500" : poolPct > 20 ? "bg-amber-500" : "bg-red-500";

  // Bar 2: Floor protection — always shown in slate to indicate "locked" XP
  // This visually represents that the floor XP cannot be spent via indulgences
  const floorPct = levelFloor > 0 ? Math.min(100, (levelFloor / totalXp) * 100) : 0;

  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/40 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="font-bold text-sm">
          Level {level}
        </Badge>
        <span className="text-xs text-muted-foreground">{totalXp.toLocaleString()} XP total</span>
      </div>

      {/* Bar 1: Spending Pool */}
      <XPBar
        value={spendingPool}
        max={XP_PER_LEVEL}
        color={poolColor}
        label="Spending Pool"
      />

      {/* Bar 2: Floor Protection */}
      <XPBar
        value={levelFloor}
        max={Math.max(levelFloor, totalXp)}
        color="bg-slate-500/60"
        label="Level Floor (protected)"
      />

      <p className="text-xs text-muted-foreground text-right">
        {xpToNext} XP to Level {level + 1}
      </p>
    </div>
  );
}

/** Compact inline version — for sidebar / header use */
export function XPBadge() {
  const { totalXp, level, progressPct } = useRealtimeXP();
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="outline" className="text-xs font-bold">Lv {level}</Badge>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <span className="text-muted-foreground">{totalXp.toLocaleString()} XP</span>
    </div>
  );
}
