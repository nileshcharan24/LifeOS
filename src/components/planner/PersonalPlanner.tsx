"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { createTask, toggleTask, deleteTask, type TaskPriority } from "@/services/planner/taskService";
import {
  format,
  addDays,
  isSameDay,
  isToday,
  isPast,
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Trash2, CheckCircle2, Circle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: string | null;
  is_completed: boolean | null;
  category: string | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-500 border-slate-500/30",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  urgent: "bg-red-500/10 text-red-500 border-red-500/30",
};

const DAYS_VISIBLE = 14;

export function PersonalPlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startOffset, setStartOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: format(selectedDate, "yyyy-MM-dd") + "T12:00",
    priority: "medium" as TaskPriority,
    category: "",
  });

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("profile_id", user.id)
      .order("deadline", { ascending: true, nullsFirst: false });
    if (data) setTasks(data as Task[]);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const days = Array.from({ length: DAYS_VISIBLE }, (_, i) =>
    addDays(new Date(), startOffset + i)
  );

  const tasksForDay = (day: Date) =>
    tasks.filter(
      (t) => t.deadline && isSameDay(parseISO(t.deadline), day)
    );

  const unscheduled = tasks.filter((t) => !t.deadline && !t.is_completed);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        // Convert local datetime string → UTC ISO so Supabase stores the right date
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        priority: form.priority,
        category: form.category.trim() || undefined,
      });
      toast.success("Task created!");
      setForm({ title: "", description: "", deadline: format(selectedDate, "yyyy-MM-dd") + "T12:00", priority: "medium", category: "" });
      setOpen(false);
      await fetchTasks();
    } catch {
      toast.error("Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task: Task) => {
    await toggleTask(task.id, !!task.is_completed);
    await fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    await fetchTasks();
  };

  const selectedDayTasks = tasksForDay(selectedDate);

  return (
    <div className="space-y-6">
      {/* Horizontal scroll calendar */}
      <div className="p-5 rounded-xl border border-border/40 bg-muted/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Planner</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStartOffset((o) => o - 7)}
              className="p-1.5 rounded hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setStartOffset(0); setSelectedDate(new Date()); }}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
            >
              Today
            </button>
            <button
              onClick={() => setStartOffset((o) => o + 7)}
              className="p-1.5 rounded hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Dialog open={open} onOpenChange={(v) => {
              if (v) setForm((f) => ({ ...f, deadline: format(selectedDate, "yyyy-MM-dd") + "T12:00" }));
              setOpen(v);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input
                    placeholder="Task title *"
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
                      <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
                      <Input
                        type="datetime-local"
                        value={form.deadline}
                        onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                      <Select
                        value={form.priority}
                        onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                    {saving ? "Saving..." : "Create Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Day columns — horizontal scroll */}
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {days.map((day, i) => {
            const dayTasks = tasksForDay(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`flex-shrink-0 w-[100px] rounded-xl border cursor-pointer transition-all select-none ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/40 bg-background hover:border-primary/40"
                }`}
              >
                {/* Day header */}
                <div className={`px-2 py-2 rounded-t-xl text-center ${isCurrentDay ? "bg-primary text-primary-foreground" : ""}`}>
                  <p className="text-xs font-medium">{format(day, "EEE")}</p>
                  <p className={`text-lg font-bold leading-tight ${isCurrentDay ? "" : isSelected ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </p>
                  <p className="text-xs opacity-60">{format(day, "MMM")}</p>
                </div>

                {/* Task cards */}
                <div className="p-1.5 space-y-1 min-h-[80px]">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`text-xs px-1.5 py-1 rounded border truncate ${
                        task.is_completed
                          ? "opacity-40 line-through"
                          : PRIORITY_COLORS[task.priority ?? "medium"] ?? "bg-muted"
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl border border-border/40 bg-muted/40">
          <h3 className="font-bold mb-4">
            {isToday(selectedDate) ? "Today — " : ""}{format(selectedDate, "EEEE, MMMM do")}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? "s" : ""}
            </span>
          </h3>
          {selectedDayTasks.length > 0 ? (
            <div className="space-y-2">
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    task.is_completed
                      ? "border-border/20 bg-muted/20 opacity-50"
                      : "border-border/40 bg-background"
                  }`}
                >
                  <button
                    onClick={() => handleToggle(task)}
                    className="mt-0.5 flex-shrink-0 text-primary"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${task.is_completed ? "line-through" : ""}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    )}
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority ?? "medium"]}`}>
                        {task.priority}
                      </Badge>
                      {task.category && (
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                      )}
                      {task.deadline && (
                        <span className={`text-xs ${isPast(parseISO(task.deadline)) && !task.is_completed ? "text-red-500" : "text-muted-foreground"}`}>
                          {format(parseISO(task.deadline), "h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks scheduled for this day.</p>
          )}
        </div>

        {/* Unscheduled tasks */}
        <div className="p-5 rounded-xl border border-border/40 bg-muted/40">
          <h3 className="font-bold mb-4 text-sm">
            Unscheduled
            <span className="ml-2 font-normal text-muted-foreground">({unscheduled.length})</span>
          </h3>
          {unscheduled.length > 0 ? (
            <div className="space-y-2">
              {unscheduled.map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 bg-background">
                  <button onClick={() => handleToggle(task)} className="text-primary flex-shrink-0">
                    <Circle className="h-4 w-4" />
                  </button>
                  <span className="text-sm flex-1 min-w-0 truncate">{task.title}</span>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${PRIORITY_COLORS[task.priority ?? "medium"]}`}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">All tasks are scheduled!</p>
          )}
        </div>
      </div>
    </div>
  );
}
