"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toggleTask, deleteTask } from "@/services/planner/taskService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isPast, differenceInHours, parseISO } from "date-fns";
import { ArrowUpDown, CheckCircle2, Circle, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: string | null;
  is_completed: boolean | null;
  category: string | null;
  created_at: string | null;
};

const PRIORITY_SCORE: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  urgent: "bg-red-500/10 text-red-500 border-red-500/30",
};

// Urgency score: priority weight × 25 + deadline proximity score
function urgencyScore(task: Task): number {
  const priorityScore = PRIORITY_SCORE[task.priority ?? "medium"] ?? 2;
  let deadlineScore = 0;

  if (task.deadline) {
    const hoursUntil = differenceInHours(parseISO(task.deadline), new Date());
    if (hoursUntil < 0) deadlineScore = 120; // overdue → max
    else if (hoursUntil < 24) deadlineScore = 100;
    else if (hoursUntil < 72) deadlineScore = 75;
    else if (hoursUntil < 168) deadlineScore = 50;
    else if (hoursUntil < 336) deadlineScore = 25;
    else deadlineScore = 10;
  }

  return priorityScore * 25 + deadlineScore;
}

type SortKey = "urgency" | "deadline" | "priority" | "title";

export function TaskTable() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [showCompleted, setShowCompleted] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("profile_id", user.id);
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    const handleUpdate = () => fetchTasks();
    window.addEventListener("planner_tasks_updated", handleUpdate);
    return () => window.removeEventListener("planner_tasks_updated", handleUpdate);
  }, [fetchTasks]);

  const broadcastTasksUpdate = () => window.dispatchEvent(new CustomEvent("planner_tasks_updated"));

  const sorted = [...tasks]
    .filter((t) => showCompleted || !t.is_completed)
    .sort((a, b) => {
      if (sortKey === "urgency") return urgencyScore(b) - urgencyScore(a);
      if (sortKey === "deadline") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortKey === "priority")
        return (PRIORITY_SCORE[b.priority ?? "medium"] ?? 2) - (PRIORITY_SCORE[a.priority ?? "medium"] ?? 2);
      return a.title.localeCompare(b.title);
    });

  const handleToggle = async (task: Task) => {
    setToggling(task.id);
    try {
      await toggleTask(task.id, !!task.is_completed);
      await fetchTasks();
      broadcastTasksUpdate();
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    toast.success("Task deleted.");
    await fetchTasks();
    broadcastTasksUpdate();
  };

  const SortButton = ({ label, value }: { label: string; value: SortKey }) => (
    <button
      onClick={() => setSortKey(value)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
        sortKey === value ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (loading) return <div className="h-48 rounded-xl border border-border/40 bg-muted/40 animate-pulse" />;

  return (
    <div className="rounded-xl border border-border/40 bg-muted/40 overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Sort:</span>
          <SortButton label="Urgency" value="urgency" />
          <span className="text-muted-foreground mx-1">·</span>
          <SortButton label="Deadline" value="deadline" />
          <span className="text-muted-foreground mx-1">·</span>
          <SortButton label="Priority" value="priority" />
          <span className="text-muted-foreground mx-1">·</span>
          <SortButton label="Name" value="title" />
        </div>
        <button
          onClick={() => setShowCompleted((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          No tasks found. Add tasks from the Planner view.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Task</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Urgency</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((task) => {
              const score = urgencyScore(task);
              const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && !task.is_completed;
              const isTogglingThis = toggling === task.id;

              return (
                <TableRow
                  key={task.id}
                  className={task.is_completed ? "opacity-40" : ""}
                >
                  <TableCell>
                    <button
                      onClick={() => handleToggle(task)}
                      disabled={isTogglingThis}
                      className="text-primary"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isOverdue && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`font-medium text-sm ${task.is_completed ? "line-through" : ""}`}>
                        {task.title}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                        {task.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PRIORITY_COLORS[task.priority ?? "medium"]}`}
                    >
                      {task.priority ?? "medium"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.deadline ? (
                      <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {format(parseISO(task.deadline), "MMM d, h:mm a")}
                        {isOverdue && " (overdue)"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.category ? (
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${
                        score >= 200
                          ? "bg-red-500/20 text-red-500"
                          : score >= 150
                          ? "bg-orange-500/20 text-orange-500"
                          : score >= 100
                          ? "bg-yellow-500/20 text-yellow-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {score}
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
