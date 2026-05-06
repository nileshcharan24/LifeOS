"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { QuestCard } from "@/components/productivity/QuestCard";
import { CreateQuestModal } from "@/components/productivity/CreateQuestModal";

export function QuestBoard() {
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("quests").select("*").eq("profile_id", user.id);
        if (data) setQuests(data);
      }
      setLoading(false);
    }
    
    load();

    // Re-fetch on xp_updated
    const handleUpdate = () => load();
    window.addEventListener("xp_updated", handleUpdate);
    return () => window.removeEventListener("xp_updated", handleUpdate);
  }, []);

  if (loading) return <div>Loading Quests...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Active Quests</h2>
        <CreateQuestModal />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quests?.filter(q => q.is_active).map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
        {(!quests || quests.filter(q => q.is_active).length === 0) && (
          <p className="text-muted-foreground col-span-full">No active quests found. Create one!</p>
        )}
      </div>
      
      {quests && quests.filter(q => !q.is_active).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 opacity-50">Completed Quests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {quests.filter(q => !q.is_active).slice(0, 3).map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
