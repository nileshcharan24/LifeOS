import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { calcXPSummary, MILESTONE_LEVELS } from "@/lib/xp";

export function useRealtimeXP() {
  const { user } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const prevLevelRef = useRef(1);
  const channelRef = useRef<any>(null); // Use useRef to store the channel
  const supabase = createClient(); // Initialize Supabase client here

  const applyXP = (xp: number, showToast = false) => {
    const { level } = calcXPSummary(xp);
    if (showToast && level > prevLevelRef.current) {
      const isMilestone = MILESTONE_LEVELS.includes(level);
      toast.success(
        isMilestone
          ? `MILESTONE REACHED — Level ${level}!`
          : `Level up! You are now Level ${level}`,
        { duration: isMilestone ? 6000 : 3000 }
      );
    }
    prevLevelRef.current = level;
    setTotalXp(xp);
  };

  useEffect(() => {
    if (!user) {
      // Clean up on user logout
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setTotalXp(0);
      return;
    }

    // Initial fetch of XP
    supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) applyXP(data.total_xp, false);
      });

    // Handle custom 'xp_updated' event
    const handleXpUpdated = () => {
      supabase
        .from("profiles")
        .select("total_xp")
        .eq("id", user.id)
        .single()
        .then(({ data }) => { if (data) applyXP(data.total_xp, true); });
    };
    window.addEventListener("xp_updated", handleXpUpdated);

    // Setup Realtime Channel
    if (channelRef.current) {
      // If channel already exists, remove it before creating a new one
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`profile_xp_${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const newXp = (payload.new as { total_xp: number }).total_xp;
          applyXP(newXp, true);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("xp_updated", handleXpUpdated);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const summary = calcXPSummary(totalXp);
  return {
    totalXp,
    level: summary.level,
    levelFloor: summary.levelFloor,
    spendingPool: summary.spendingPool,
    xpToNext: summary.xpToNext,
    progressPct: summary.progressPct,
  };
}
