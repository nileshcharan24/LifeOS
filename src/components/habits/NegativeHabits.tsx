"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getNegativeHabits,
  getNegativeHabitLogs,
  createNegativeHabit,
  updateNegativeHabit,
  deleteNegativeHabit,
  logNegativeHabit,
  deleteNegativeHabitLog,
  type Intensity,
} from "@/services/habits/negativeHabitService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ShieldAlert, ChevronDown, ChevronUp, Check } from "lucide-react";
import { format } from "date-fns";

type Habit    = Awaited<ReturnType<typeof getNegativeHabits>>[number];
type HabitLog = Awaited<ReturnType<typeof getNegativeHabitLogs>>[number];

const INTENSITY_COLORS: Record<Intensity, string> = {
  mild:     "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  moderate: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  severe:   "bg-red-500/10 text-red-600 border-red-500/30",
};

const TODAY = new Date().toISOString().split("T")[0];

export function NegativeHabits() {
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [logs, setLogs]               = useState<HabitLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [logging, setLogging]         = useState<string | null>(null);
  const [logIntensity, setLogIntensity] = useState<Intensity>("mild");
  const [logNotes, setLogNotes]       = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [formName, setFormName]       = useState("");
  const [formDesc, setFormDesc]       = useState("");
  const [saving, setSaving]           = useState(false);

  const fetchAll = useCallback(async () => {
    const [h, l] = await Promise.all([getNegativeHabits(), getNegativeHabitLogs(30)]);
    setHabits(h);
    setLogs(l);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const todayLogs = (habitId: string) => logs.filter((l) => l.habit_id === habitId && l.date === TODAY);

  const handleLog = async (habitId: string, habitName: string) => {
    setLogging(habitId);
    try {
      const result = await logNegativeHabit(habitId, habitName, TODAY, logIntensity, logNotes.trim() || undefined);
      const penalty = result?.xpPenalty ?? 0;
      if (result?.leveledDown) {
        toast.error(`Logged (${logIntensity}). −${penalty} XP — Level down!`, { duration: 5000 });
      } else {
        toast.warning(`Logged: ${logIntensity} intensity. −${penalty} XP penalty.`);
      }
      setLogNotes("");
      setLogIntensity("mild");
      setExpanded(null);
      await fetchAll();
      window.dispatchEvent(new CustomEvent("xp_updated"));
    } catch {
      toast.error("Failed to log.");
    } finally {
      setLogging(null);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteNegativeHabitLog(logId);
      toast.success("Entry removed.");
      await fetchAll();
    } catch {
      toast.error("Failed to remove.");
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await createNegativeHabit(formName.trim(), formDesc.trim() || undefined);
      toast.success("Habit added.");
      setFormName(""); setFormDesc(""); setShowAddForm(false);
      await fetchAll();
    } catch {
      toast.error("Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !formName.trim()) return;
    setSaving(true);
    try {
      await updateNegativeHabit(editingId, formName.trim(), formDesc.trim() || undefined);
      toast.success("Updated.");
      setEditingId(null); setFormName(""); setFormDesc("");
      await fetchAll();
    } catch {
      toast.error("Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNegativeHabit(id);
      toast.success("Habit removed.");
      await fetchAll();
    } catch {
      toast.error("Failed to remove.");
    }
  };

  const startEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setFormName(habit.name);
    setFormDesc(habit.description ?? "");
    setShowAddForm(false);
  };

  if (loading) {
    return <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-bold">Negative Habits</h2>
          <span className="text-sm text-muted-foreground">— track & reduce</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setShowAddForm((v) => !v); setEditingId(null); setFormName(""); setFormDesc(""); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2">
          <Input placeholder="Habit name *" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input placeholder="Description (optional)" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={!formName.trim() || saving} onClick={handleCreate}>
              {saving ? "Saving..." : "Create"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {habits.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed border-border/40 p-10 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No negative habits tracked yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add habits you want to reduce, and log them when they occur.</p>
        </div>
      )}

      {/* Habit cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map((habit) => {
          const today = todayLogs(habit.id);
          const isEditing   = editingId === habit.id;
          const isExpanded  = expanded === habit.id;
          const recentLogs  = logs.filter((l) => l.habit_id === habit.id).slice(0, 7);

          return (
            <div key={habit.id} className={`p-4 rounded-xl border transition-all ${
              today.length > 0 ? "border-red-500/30 bg-red-500/5" : "border-border/40 bg-muted/40"
            }`}>
              {isEditing ? (
                <div className="space-y-2">
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                  <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!formName.trim() || saving} onClick={handleUpdate}>
                      <Check className="h-3 w-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Habit header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{habit.name}</p>
                      {habit.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(habit)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(habit.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Today's logs */}
                  {today.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {today.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs">
                          <Badge variant="outline" className={INTENSITY_COLORS[log.intensity as Intensity]}>
                            {log.intensity}
                          </Badge>
                          {log.notes && <span className="text-muted-foreground truncate ml-2 flex-1">{log.notes}</span>}
                          <button onClick={() => handleDeleteLog(log.id)} className="ml-1 text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Log button / inline form */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : habit.id)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground flex items-center justify-between py-1"
                  >
                    <span>Log today {today.length > 0 ? `(×${today.length})` : ""}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-t border-border/20 pt-2">
                      <div className="flex gap-1">
                        {(["mild", "moderate", "severe"] as Intensity[]).map((i) => (
                          <button
                            key={i}
                            onClick={() => setLogIntensity(i)}
                            className={`flex-1 text-xs py-1 rounded border transition-colors ${
                              logIntensity === i ? INTENSITY_COLORS[i] : "border-border/30 text-muted-foreground hover:border-border"
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Notes (optional)"
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        variant="destructive"
                        disabled={logging === habit.id}
                        onClick={() => handleLog(habit.id, habit.name)}
                      >
                        {logging === habit.id ? "Logging..." : "Log Occurrence"}
                      </Button>
                    </div>
                  )}

                  {/* Mini history */}
                  {recentLogs.length > 0 && !isExpanded && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {recentLogs.map((log) => (
                        <span
                          key={log.id}
                          title={`${log.date} — ${log.intensity}`}
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${INTENSITY_COLORS[log.intensity as Intensity]}`}
                        >
                          {format(new Date(log.date + "T12:00:00"), "MMM d")}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
