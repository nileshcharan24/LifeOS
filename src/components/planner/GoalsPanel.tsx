"use client";

import { useEffect, useState, useCallback } from "react";
import { getGoals, createGoal, toggleGoal, deleteGoal, type GoalPriority } from "@/services/planner/goalService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, Trash2, Target, CalendarDays } from "lucide-react";
import { format, isPast, parseISO, differenceInDays } from "date-fns";

type Goal = Awaited<ReturnType<typeof getGoals>>[number];

const PRIORITY_COLORS: Record<string, string> = {
  low:    "bg-slate-500/10 text-slate-500 border-slate-500/30",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  high:   "bg-orange-500/10 text-orange-500 border-orange-500/30",
  urgent: "bg-red-500/10 text-red-500 border-red-500/30",
};

export function GoalsPanel() {
  const [goals, setGoals]       = useState<Goal[]>([]);
  const [loading, setLoading]   = useState(true);
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [showDone, setShowDone] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    target_date: "",
    priority: "medium" as GoalPriority,
    category: "",
  });

  const fetch = useCallback(async () => {
    try {
      const data = await getGoals();
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createGoal({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        target_date: form.target_date || undefined,
        priority: form.priority,
        category: form.category.trim() || undefined,
      });
      toast.success("Goal created!");
      setForm({ title: "", description: "", target_date: "", priority: "medium", category: "" });
      setOpen(false);
      await fetch();
    } catch {
      toast.error("Failed to create goal.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (goal: Goal) => {
    try {
      await toggleGoal(goal.id, goal.is_completed);
      if (!goal.is_completed) toast.success("Goal marked complete!");
      await fetch();
    } catch {
      toast.error("Failed to update goal.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success("Goal deleted.");
      await fetch();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const visible = goals.filter((g) => showDone || !g.is_completed);
  const pending  = visible.filter((g) => !g.is_completed);
  const done     = visible.filter((g) => g.is_completed);

  if (loading) {
    return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-bold">Long-term Goals</h2>
          <span className="text-sm text-muted-foreground">({pending.length} active)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDone ? "Hide completed" : "Show completed"}
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Long-term Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input
                  placeholder="Goal title *"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <Input
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
                    <Input
                      type="date"
                      value={form.target_date}
                      onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((f) => ({ ...f, priority: v as GoalPriority }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Input
                  placeholder="Category (optional)"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
                <Button
                  className="w-full"
                  disabled={!form.title.trim() || saving}
                  onClick={handleCreate}
                >
                  {saving ? "Saving..." : "Create Goal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty state */}
      {pending.length === 0 && done.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/40 p-10 text-center">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No goals yet. Add your first long-term goal!</p>
        </div>
      )}

      {/* Active goals */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((goal) => <GoalRow key={goal.id} goal={goal} onToggle={handleToggle} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Completed goals */}
      {showDone && done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Completed</p>
          {done.map((goal) => <GoalRow key={goal.id} goal={goal} onToggle={handleToggle} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

function GoalRow({
  goal, onToggle, onDelete,
}: {
  goal: Goal;
  onToggle: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const isOverdue  = goal.target_date && !goal.is_completed && isPast(parseISO(goal.target_date));
  const daysLeft   = goal.target_date && !goal.is_completed
    ? differenceInDays(parseISO(goal.target_date), new Date())
    : null;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      goal.is_completed
        ? "border-green-500/20 bg-green-500/5 opacity-60"
        : isOverdue
        ? "border-red-500/30 bg-red-500/5"
        : "border-border/40 bg-background"
    }`}>
      <button onClick={() => onToggle(goal)} className="mt-0.5 flex-shrink-0">
        {goal.is_completed
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : <Circle className="h-5 w-5 text-muted-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${goal.is_completed ? "line-through text-muted-foreground" : ""}`}>
          {goal.title}
        </p>
        {goal.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
        )}
        <div className="flex gap-2 mt-1.5 flex-wrap items-center">
          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[goal.priority ?? "medium"]}`}>
            {goal.priority}
          </Badge>
          {goal.category && (
            <Badge variant="outline" className="text-xs">{goal.category}</Badge>
          )}
          {goal.target_date && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              <CalendarDays className="h-3 w-3" />
              {goal.is_completed
                ? `Done — ${format(parseISO(goal.target_date), "MMM d, yyyy")}`
                : isOverdue
                ? `Overdue — ${format(parseISO(goal.target_date), "MMM d, yyyy")}`
                : daysLeft !== null && daysLeft <= 7
                ? `${daysLeft}d left — ${format(parseISO(goal.target_date), "MMM d")}`
                : format(parseISO(goal.target_date), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(goal.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
