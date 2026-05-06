"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { grantXPServerAction } from "@/app/actions";
import { toast } from "sonner";

export function DailyTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("daily_tasks").select("*").eq("user_id", user.id);
        if (data) setTasks(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div>Loading Tasks...</div>;

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold">Daily Tasks & Side Quests</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 rounded-lg border border-border/40 bg-muted/40">
            <h3 className="font-semibold">{task.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{task.description}</p>
            <button
              disabled={task.is_completed}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              onClick={async () => {
                const supabase = createClient();
                await supabase.from("daily_tasks").update({ is_completed: true }).eq("id", task.id);
                await grantXPServerAction(task.xp_reward || 5, `Task: ${task.name}`);
                toast.success(`Completed Task: ${task.name}`);
                window.dispatchEvent(new CustomEvent("xp_updated"));
                setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
              }}
            >
              {task.is_completed ? "Done" : `Complete (+${task.xp_reward || 5} XP)`}
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-muted-foreground text-sm">No daily tasks found for today.</p>
        )}
      </div>
    </div>
  );
}