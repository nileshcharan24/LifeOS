import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext"; // Assuming you have an AuthContext

const supabase = createClient();

export function useRealtimeXP() {
  const { user } = useAuth();
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState(1);

  const calculateLevel = useCallback((xp: number) => {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }, []);

  useEffect(() => {
    async function fetchInitialXP() {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("total_xp")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching initial XP:", error);
      } else if (data) {
        setTotalXp(data.total_xp);
        setLevel(calculateLevel(data.total_xp));
      }
    }
    fetchInitialXP();

    const channel = supabase
      .channel("profiles")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          const newXp = (payload.new as { total_xp: number }).total_xp;
          const newLevel = calculateLevel(newXp);
          if (newLevel > level) {
            toast.success(`SYSTEM ALERT: LEVEL UP INITIALIZED. You are now level ${newLevel}!`);
          }
          setTotalXp(newXp);
          setLevel(newLevel);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, calculateLevel, level]);

  return { totalXp, level };
}