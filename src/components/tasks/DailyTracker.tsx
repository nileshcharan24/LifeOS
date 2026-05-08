"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { format, parseISO, addDays, isToday, isTomorrow, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Circle, Trash2, Plus, ChevronDown, ChevronUp,
  BookOpen, ListTodo, BarChart3, Settings, EyeOff, Undo2, Pencil, X,
  AlertCircle,
} from "lucide-react";
import {
  getHabits, ensureAndGetHabitInstances, completeHabitInstance,
  uncompleteHabitInstance, getDailyTasksForDate, createDailyTask,
  updateDailyTask, completeDailyTask, uncompleteDailyTask, deleteDailyTask,
  getAssessmentsForTracker, hideAssessmentFromToday,
  completeAssessmentFromTracker, uncompleteAssessmentFromTracker,
  getPlannerTasksForWindow, togglePlannerTask,
  type Habit, type HabitInstance, type DailyTask, type AssessmentEntry,
  type PlannerTask,
} from "@/services/tasks/taskTrackerService";
import { TASK_XP, PERFECT_DAY_BONUS, PRODUCTIVE_DAY_BONUS, ASSESSMENT_XP } from "@/services/tasks/taskTrackerConstants";
import { ManageHabits } from "./ManageHabits";
import { DailyStats } from "./DailyStats";

// ─── Urgency helpers ───────────────────────────────────────────────────────────

const URGENCY_BADGE: Record<string, string> = {
  high:   "bg-red-500/15 text-red-600 dark:text-red-400",
  medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  low:    "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

const URGENCY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

const ASSESSMENT_TYPE_ICON: Record<string, string> = {
  exam: "📋", quiz: "❓", assignment: "📝",
  project: "🎯", presentation: "🎤", participation: "👥", other: "📌",
};

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function sortTasks(tasks: DailyTask[]): DailyTask[] {
  return [...tasks].sort((a, b) => {
    const aD = a.deadline ? new Date(a.deadline).getTime() : null;
    const bD = b.deadline ? new Date(b.deadline).getTime() : null;
    if (aD && !bD) return -1;
    if (!aD && bD) return 1;
    if (aD && bD && aD !== bD) return aD - bD;
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.urgency] - order[b.urgency];
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────

type View = "tracker" | "stats" | "habits";

export function DailyTracker() {
  const today    = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  // ── state ──────────────────────────────────────────────────────────────────
  const [view, setView]               = useState<View>("tracker");
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [instances, setInstances]     = useState<HabitInstance[]>([]);
  const [tasks, setTasks]             = useState<DailyTask[]>([]);
  const [plannerTasks, setPlannerTasks] = useState<PlannerTask[]>([]);
  const [assessments, setAssessments] = useState<AssessmentEntry[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState<AssessmentEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  // add-task form
  const [showAddTask, setShowAddTask]   = useState(false);
  const [editingTask, setEditingTask]   = useState<DailyTask | null>(null);
  const [taskForm, setTaskForm]         = useState({
    name: "", urgency: "medium" as DailyTask["urgency"],
    deadline: "", notes: "", recurring: "none" as DailyTask["recurring"],
  });

  // delete-series confirmation
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; recurring: string } | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    // Compute UTC window for today in the user's local timezone so deadline
    // matching is correct regardless of UTC offset.
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(); dayEnd.setHours(23, 59, 59, 999);

    const [h, hi, t, pt, a] = await Promise.all([
      getHabits(),
      ensureAndGetHabitInstances(today),
      getDailyTasksForDate(today),
      getPlannerTasksForWindow(dayStart.toISOString(), dayEnd.toISOString()),
      getAssessmentsForTracker(today, tomorrow),
    ]);
    setHabits(h);
    setInstances(hi);
    setTasks(t);
    setPlannerTasks(pt);
    setAssessments(a);
    setLoading(false);
  }, [today, tomorrow]);

  useEffect(() => {
    fetchAll();
    const handleUpdate = () => fetchAll();
    window.addEventListener("planner_tasks_updated", handleUpdate);
    window.addEventListener("xp_updated", handleUpdate);
    return () => {
      window.removeEventListener("planner_tasks_updated", handleUpdate);
      window.removeEventListener("xp_updated", handleUpdate);
    };
  }, [fetchAll]);

  // XP update broadcast so XPDisplay refreshes
  const broadcastXP = () => window.dispatchEvent(new CustomEvent("xp_updated"));
  const broadcastPlannerTasksUpdate = () => window.dispatchEvent(new CustomEvent("planner_tasks_updated"));
  const broadcastDailyData = () => window.dispatchEvent(new CustomEvent("daily_data_updated"));

  // ── derived ────────────────────────────────────────────────────────────────
  const instanceMap = useMemo(
    () => Object.fromEntries(instances.map(i => [i.habit_id, i])),
    [instances]
  );

  const activeTasks    = useMemo(() => sortTasks(tasks.filter(t => !t.is_completed)), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.is_completed), [tasks]);

  // ── habit handlers ─────────────────────────────────────────────────────────
  const handleToggleHabit = async (habit: Habit) => {
    const inst = instanceMap[habit.id];
    if (!inst) return;
    setSaving(true);
    try {
      if (inst.completed) {
        const { xpReversed } = await uncompleteHabitInstance(inst.id);
        broadcastXP();
        toast.info(`Habit unmarked. -${xpReversed} XP reversed.`);
      } else {
        const { xpGranted, isPerfectDay } = await completeHabitInstance(inst.id, habit.xp_value, habit.name);
        broadcastXP();
        toast.success(`+${xpGranted} XP — ${habit.name} done!`);
        if (isPerfectDay) toast.success(`🏆 Perfect Day! +${PERFECT_DAY_BONUS} XP bonus!`);
      }
      await fetchAll();
      broadcastDailyData();
    } catch {
      toast.error("Failed to update habit.");
    } finally {
      setSaving(false);
    }
  };

  // ── task handlers ──────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!taskForm.name.trim()) return;
    setSaving(true);
    try {
      await createDailyTask(
        taskForm.name, taskForm.urgency,
        taskForm.deadline || null, taskForm.notes || null,
        taskForm.recurring, today
      );
      toast.success("Task added!");
      setTaskForm({ name: "", urgency: "medium", deadline: "", notes: "", recurring: "none" });
      setShowAddTask(false);
      await fetchAll();
      broadcastDailyData();
    } catch {
      toast.error("Failed to add task.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !taskForm.name.trim()) return;
    setSaving(true);
    try {
      await updateDailyTask(editingTask.id, taskForm.name, taskForm.urgency, taskForm.deadline || null, taskForm.notes || null);
      toast.success("Task updated!");
      setEditingTask(null);
      await fetchAll();
      broadcastDailyData();
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTask = async (task: DailyTask) => {
    setSaving(true);
    try {
      const { xpGranted, isProductiveDay } = await completeDailyTask(task.id, task.urgency, task.name, today);
      broadcastXP();
      toast.success(`+${xpGranted} XP — "${task.name}" done!`);
      if (isProductiveDay) toast.success(`🎯 Productive Day! +${PRODUCTIVE_DAY_BONUS} XP bonus!`);
      await fetchAll();
      broadcastDailyData();
    } catch {
      toast.error("Failed to complete task.");
    } finally {
      setSaving(false);
    }
  };

  const handleUncompleteTask = async (task: DailyTask) => {
    setSaving(true);
    try {
      const { xpReversed } = await uncompleteDailyTask(task.id);
      broadcastXP();
      toast.info(`Task unmarked. -${xpReversed} XP reversed.`);
      await fetchAll();
      broadcastDailyData();
    } catch {
      toast.error("Failed to undo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task: DailyTask, deleteSeries: boolean) => {
    setSaving(true);
    try {
      await deleteDailyTask(task.id, deleteSeries);
      toast.success(deleteSeries ? "Recurring series deleted." : "Task deleted.");
      setDeleteDialog(null);
      await fetchAll();
      broadcastDailyData();
    } catch {
      toast.error("Failed to delete task.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (task: DailyTask) => {
    if (task.recurring !== "none") {
      setDeleteDialog({ id: task.id, recurring: task.recurring });
    } else {
      handleDeleteTask(task, false);
    }
  };

  // ── planner task handlers ──────────────────────────────────────────────────
  const handleTogglePlannerTask = async (pt: PlannerTask) => {
    setSaving(true);
    try {
      await togglePlannerTask(pt.id, pt.is_completed);
      await fetchAll();
      broadcastPlannerTasksUpdate();
      if (!pt.is_completed) toast.success(`"${pt.title}" marked done!`);
      else toast.info(`"${pt.title}" unmarked.`);
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSaving(false);
    }
  };

  // ── assessment handlers ────────────────────────────────────────────────────
  const handleHideAssessment = async (assessment: AssessmentEntry) => {
    await hideAssessmentFromToday(assessment.id, today);
    setAssessments(prev => prev.filter(a => a.id !== assessment.id));
    toast.info("Assessment hidden from today's view.");
  };

  const handleCompleteAssessment = async (assessment: AssessmentEntry) => {
    setSaving(true);
    try {
      await completeAssessmentFromTracker(assessment.id, assessment.name);
      broadcastXP();
      setAssessments(prev => prev.filter(a => a.id !== assessment.id));
      setCompletedAssessments(prev => [...prev, { ...assessment, status: "completed" }]);
      toast.success(`+${ASSESSMENT_XP} XP — "${assessment.name}" done! Synced to Academic Tracker.`);
    } catch {
      toast.error("Failed to complete assessment.");
    } finally {
      setSaving(false);
    }
  };

  const handleUncompleteAssessment = async (assessment: AssessmentEntry) => {
    setSaving(true);
    try {
      await uncompleteAssessmentFromTracker(assessment.id, assessment.name);
      broadcastXP();
      setCompletedAssessments(prev => prev.filter(a => a.id !== assessment.id));
      setAssessments(prev => [...prev, { ...assessment, status: "pending" }]);
      toast.info(`Assessment unmarked. -${ASSESSMENT_XP} XP reversed.`);
    } catch {
      toast.error("Failed to undo.");
    } finally {
      setSaving(false);
    }
  };

  // ── early return ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  const startEdit = (task: DailyTask) => {
    setEditingTask(task);
    setTaskForm({
      name: task.name, urgency: task.urgency,
      deadline: task.deadline ? task.deadline.slice(0, 16) : "",
      notes: task.notes || "", recurring: task.recurring,
    });
    setShowAddTask(false);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 w-fit">
        {([
          { id: "tracker", label: "Today",         icon: <ListTodo className="h-4 w-4" /> },
          { id: "stats",   label: "Stats",          icon: <BarChart3 className="h-4 w-4" /> },
          { id: "habits",  label: "Manage Habits",  icon: <Settings  className="h-4 w-4" /> },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={[
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              view === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Views ── */}
      {view === "stats"  && <DailyStats date={today} />}
      {view === "habits" && <ManageHabits onUpdate={fetchAll} />}

      {view === "tracker" && (
        <div className="space-y-8">

          {/* ── Date banner ── */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily Dashboard</p>
            <h2 className="text-2xl font-bold">{format(new Date(), "EEEE, MMMM d")}</h2>
          </div>

          {/* ═══════════════════════════════════════════════════════
              Section 1: Habits
          ════════════════════════════════════════════════════════ */}
          <section className="space-y-3">
            <SectionHeader
              icon={<span className="text-lg">🔄</span>}
              title="Daily Habits"
              count={`${instances.filter(i => i.completed).length}/${habits.filter(h => h.enabled).length}`}
            />

            {habits.filter(h => h.enabled).length === 0 ? (
              <EmptyState
                message="No habits set up yet."
                action="Go to Manage Habits to add your daily habits."
              />
            ) : (
              <div className="space-y-2">
                {habits.filter(h => h.enabled).map(habit => {
                  const inst = instanceMap[habit.id];
                  const done = inst?.completed ?? false;
                  return (
                    <div
                      key={habit.id}
                      className={[
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                        done
                          ? "border-green-500/20 bg-green-500/5"
                          : "border-border/40 bg-muted/20 hover:bg-muted/30",
                      ].join(" ")}
                    >
                      {/* Checkbox toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleHabit(habit)}
                        disabled={saving || !inst}
                        className="flex-shrink-0 transition-colors"
                        aria-label={done ? "Unmark habit" : "Complete habit"}
                      >
                        {done
                          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                          : <Circle       className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        }
                      </button>

                      <span className={`flex-1 text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                        {habit.name}
                      </span>

                      {done ? (
                        /* Explicit undo button shown when completed */
                        <button
                          type="button"
                          onClick={() => handleToggleHabit(habit)}
                          disabled={saving}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                          title="Mark as not done"
                        >
                          <Undo2 className="h-3 w-3" /> Undo
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          +{habit.xp_value} XP
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              Section 2: Daily Tasks
          ════════════════════════════════════════════════════════ */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={<span className="text-lg">✅</span>}
                title="Daily Tasks"
                count={`${completedTasks.length}/${tasks.length}`}
              />
              <Button size="sm" variant="outline" onClick={() => { setShowAddTask(v => !v); setEditingTask(null); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
              </Button>
            </div>

            {/* Add task form */}
            {showAddTask && (
              <TaskForm
                form={taskForm}
                onChange={setTaskForm}
                onSave={handleAddTask}
                onCancel={() => setShowAddTask(false)}
                saving={saving}
                submitLabel="Add"
              />
            )}

            {activeTasks.length === 0 && !showAddTask ? (
              <EmptyState message="No active tasks for today." action='Click "Add Task" to create one.' />
            ) : (
              <div className="space-y-2">
                {activeTasks.map(task => (
                  <div key={task.id}>
                    {editingTask?.id === task.id ? (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                        <TaskForm
                          form={taskForm}
                          onChange={setTaskForm}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditingTask(null)}
                          saving={saving}
                          submitLabel="Save"
                        />
                      </div>
                    ) : (
                      <TaskRow
                        task={task}
                        onComplete={() => handleCompleteTask(task)}
                        onDelete={() => handleDeleteClick(task)}
                        onEdit={() => startEdit(task)}
                        saving={saving}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              Section 3: Planner Tasks due today
          ════════════════════════════════════════════════════════ */}
          {plannerTasks.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<span className="text-lg">📅</span>}
                title="From Planner"
                subtitle="Tasks due today"
                count={`${plannerTasks.filter(t => t.is_completed).length}/${plannerTasks.length}`}
              />
              <div className="space-y-2">
                {plannerTasks.map(pt => {
                  const PRIORITY_COLORS: Record<string, string> = {
                    low:    "bg-slate-500/15 text-slate-600 dark:text-slate-400",
                    medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                    high:   "bg-orange-500/15 text-orange-600 dark:text-orange-400",
                    urgent: "bg-red-500/15 text-red-600 dark:text-red-400",
                  };
                  return (
                    <div
                      key={pt.id}
                      className={[
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors group",
                        pt.is_completed
                          ? "border-green-500/20 bg-green-500/5 opacity-70"
                          : "border-border/40 bg-muted/20 hover:bg-muted/30",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePlannerTask(pt)}
                        disabled={saving}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {pt.is_completed
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${pt.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {pt.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[pt.priority]}`}>
                            {pt.priority}
                          </Badge>
                          {pt.category && (
                            <Badge variant="outline" className="text-[10px]">{pt.category}</Badge>
                          )}
                          {pt.deadline && (
                            <span className="text-[10px] text-muted-foreground">
                              Due {format(new Date(pt.deadline), "h:mm a")}
                            </span>
                          )}
                        </div>
                        {pt.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{pt.description}</p>
                        )}
                      </div>
                      {pt.is_completed && (
                        <button
                          type="button"
                          onClick={() => handleTogglePlannerTask(pt)}
                          disabled={saving}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                          title="Undo"
                        >
                          <Undo2 className="h-3 w-3" /> Undo
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              Section 4: Academic Assessments
          ════════════════════════════════════════════════════════ */}
          {assessments.length > 0 && (
            <section className="space-y-3">
              <SectionHeader
                icon={<BookOpen className="h-4 w-4 text-blue-500" />}
                title="Academic Deadlines"
                subtitle="Due today or tomorrow"
              />
              <div className="space-y-2">
                {assessments.map(a => {
                  const isDueToday = a.due_date === today;
                  return (
                    <div
                      key={a.id}
                      className={[
                        "flex items-start gap-3 p-3 rounded-lg border",
                        isDueToday
                          ? "border-orange-500/30 bg-orange-500/5"
                          : "border-blue-500/20 bg-blue-500/5",
                      ].join(" ")}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {ASSESSMENT_TYPE_ICON[a.type] || "📌"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.course_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                          {isDueToday
                            ? <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">Due Today</span>
                            : <span className="text-[10px] text-blue-600 dark:text-blue-400">Due Tomorrow</span>
                          }
                          <span className="text-[10px] text-muted-foreground">+{ASSESSMENT_XP} XP</span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCompleteAssessment(a)}
                          disabled={saving}
                          title="Mark Complete"
                          className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHideAssessment(a)}
                          title="Hide from today"
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════════════════════
              Section 4: Completed
          ════════════════════════════════════════════════════════ */}
          {(completedTasks.length > 0 || completedAssessments.length > 0) && (
            <section className="space-y-3">
              <SectionHeader
                icon={<span className="text-lg">✅</span>}
                title="Completed"
                count={String(completedTasks.length + completedAssessments.length)}
              />
              <div className="space-y-2">
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5 opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="flex-1 text-sm line-through text-muted-foreground truncate">{task.name}</span>
                    <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${URGENCY_BADGE[task.urgency]}`}>
                      {URGENCY_LABEL[task.urgency]}
                    </Badge>
                    <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">+{task.xp_earned} XP</span>
                    <button
                      type="button"
                      onClick={() => handleUncompleteTask(task)}
                      disabled={saving}
                      title="Undo"
                      className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                    >
                      <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                {completedAssessments.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5 opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-lg flex-shrink-0">{ASSESSMENT_TYPE_ICON[a.type] || "📌"}</span>
                    <span className="flex-1 text-sm line-through text-muted-foreground truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{a.course_name}</span>
                    <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">+{ASSESSMENT_XP} XP</span>
                    <button
                      type="button"
                      onClick={() => handleUncompleteAssessment(a)}
                      disabled={saving}
                      title="Undo"
                      className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                    >
                      <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Empty all-done state ── */}
          {habits.filter(h => h.enabled).length === 0 && tasks.length === 0 && assessments.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
              <p className="text-3xl mb-3">🎉</p>
              <p className="text-muted-foreground">Nothing tracked yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add habits in "Manage Habits" and tasks with the button above.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Delete series dialog ── */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl border border-border/40 p-6 max-w-sm w-full mx-4 space-y-4 shadow-lg">
            <h3 className="font-semibold">Delete Recurring Task</h3>
            <p className="text-sm text-muted-foreground">
              This is a recurring ({deleteDialog.recurring}) task. What do you want to delete?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const t = tasks.find(t => t.id === deleteDialog.id);
                  if (t) handleDeleteTask(t, false);
                }}
              >
                Delete just today
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const t = tasks.find(t => t.id === deleteDialog.id);
                  if (t) handleDeleteTask(t, true);
                }}
              >
                Delete entire series
              </Button>
              <Button variant="ghost" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, count, subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="font-semibold">{title}</h3>
      {count !== undefined && (
        <Badge variant="outline" className="text-xs">{count}</Badge>
      )}
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/40 p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <p className="text-xs text-muted-foreground mt-1">{action}</p>}
    </div>
  );
}

function TaskRow({
  task, onComplete, onDelete, onEdit, saving,
}: {
  task: DailyTask;
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  saving: boolean;
}) {
  const overdue = isOverdue(task.deadline);

  return (
    <div
      className={[
        "flex items-start gap-3 p-3 rounded-lg border transition-colors group",
        overdue
          ? "border-red-500/30 bg-red-500/5"
          : "border-border/40 bg-muted/20 hover:bg-muted/30",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onComplete}
        disabled={saving}
        className="flex-shrink-0 mt-0.5 transition-colors"
        aria-label="Complete task"
      >
        <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{task.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${URGENCY_BADGE[task.urgency]}`}>
            {URGENCY_LABEL[task.urgency]}
          </Badge>
          {task.deadline && (
            <span className={`text-[10px] ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground"}`}>
              {overdue ? "⚠ Overdue · " : ""}
              Due {format(new Date(task.deadline), "MMM d, h:mm a")}
            </span>
          )}
          {task.recurring !== "none" && (
            <span className="text-[10px] text-muted-foreground capitalize">🔁 {task.recurring}</span>
          )}
          <span className="text-[10px] text-muted-foreground">+{TASK_XP[task.urgency]} XP</span>
        </div>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.notes}</p>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
        </button>
      </div>
    </div>
  );
}

function TaskForm({
  form, onChange, onSave, onCancel, saving, submitLabel,
}: {
  form: { name: string; urgency: DailyTask["urgency"]; deadline: string; notes: string; recurring: DailyTask["recurring"] };
  onChange: (v: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          placeholder="Task name"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          onKeyDown={e => { if (e.key === "Enter") onSave(); }}
          className="md:col-span-2"
        />
        <select
          value={form.urgency}
          onChange={e => onChange({ ...form, urgency: e.target.value as DailyTask["urgency"] })}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="high">🔴 High Priority (+75 XP)</option>
          <option value="medium">🟡 Medium Priority (+50 XP)</option>
          <option value="low">⚫ Low Priority (+25 XP)</option>
        </select>
        <select
          value={form.recurring}
          onChange={e => onChange({ ...form, recurring: e.target.value as DailyTask["recurring"] })}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="none">One-time task</option>
          <option value="daily">🔁 Repeats daily</option>
          <option value="weekly">🔁 Repeats weekly</option>
        </select>
        <Input
          type="datetime-local"
          value={form.deadline}
          onChange={e => onChange({ ...form, deadline: e.target.value })}
          placeholder="Deadline (optional)"
        />
        <Input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={e => onChange({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !form.name.trim()}>
          {saving ? "Saving..." : submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
