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

    // Setup Realtime Channel — remove any pre-existing channel with this
    // name from the Supabase client's internal registry first, otherwise
    // `.channel()` returns the cached already-subscribed instance and `.on()`
    // throws (notably under React Strict Mode's double-invoke in dev).
    const channelName = `profile_xp_${user.id}`;
    for (const existing of supabase.getChannels()) {
      if (existing.topic === `realtime:${channelName}`) {
        supabase.removeChannel(existing);
      }
    }
    channelRef.current = null;

    channelRef.current = supabase
      .channel(channelName)
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
