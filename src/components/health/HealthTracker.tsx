"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getExerciseLogs, getExerciseRange, logExercise, deleteExerciseLog,
  getFoodLogs, getFoodRange, logFood, deleteFoodLog,
  getSleepLog, getSleepRange, upsertSleepLog, deleteSleepLog,
  type ExerciseIntensity, type ExerciseType, type MealType,
} from "@/services/health/healthService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dumbbell, UtensilsCrossed, Moon, Plus, Trash2, Zap, ChevronLeft, ChevronRight,
  Flame, BedDouble, BarChart3, Trophy, Timer, Ruler,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

type ExerciseLog = Awaited<ReturnType<typeof getExerciseLogs>>[number];
type FoodLog     = Awaited<ReturnType<typeof getFoodLogs>>[number];
type SleepLog    = Awaited<ReturnType<typeof getSleepLog>>;

const TODAY = new Date().toISOString().split("T")[0];

type ActiveTab = "exercise" | "food" | "sleep";

const CARDIO_ACTIVITIES = ["Running", "Jogging", "Cycling", "Swimming", "Walking", "Hiking", "Rowing", "Jump Rope", "Other"];

export function HealthTracker() {
  const [tab, setTab]   = useState<ActiveTab>("exercise");
  const [date, setDate] = useState(TODAY);

  const prevDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().split("T")[0];
    if (next <= TODAY) setDate(next);
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border/40 pb-2">
        {([
          { key: "exercise", label: "Exercise", icon: Dumbbell },
          { key: "food",     label: "Food",     icon: UtensilsCrossed },
          { key: "sleep",    label: "Sleep",    icon: Moon },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={prevDay} className="p-1.5 rounded hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {date === TODAY ? "Today" : format(parseISO(date), "EEEE, MMM d")}
        </span>
        <button onClick={nextDay} disabled={date === TODAY} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {tab === "exercise" && <ExerciseSection date={date} />}
      {tab === "food"     && <FoodSection     date={date} />}
      {tab === "sleep"    && <SleepSection    date={date} />}
    </div>
  );
}

// ─── Exercise Section ─────────────────────────────────────────────────────────

const EMPTY_GYM_FORM = {
  activity_type: "",
  sets: "",
  reps: "",
  weight_kg: "",
  duration_minutes: "",
  is_pr: false,
  intensity: "moderate" as ExerciseIntensity,
  notes: "",
};

const EMPTY_CARDIO_FORM = {
  activity_type: "Running",
  custom_activity: "",
  duration_minutes: "",
  distance_km: "",
  intensity: "moderate" as ExerciseIntensity,
  notes: "",
};

function ExerciseSection({ date }: { date: string }) {
  const [logs, setLogs]             = useState<ExerciseLog[]>([]);
  const [history, setHistory]       = useState<ExerciseLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [exerciseType, setExerciseType] = useState<ExerciseType>("gym");
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [gymForm, setGymForm]       = useState(EMPTY_GYM_FORM);
  const [cardioForm, setCardioForm] = useState(EMPTY_CARDIO_FORM);

  const fetch = useCallback(async () => {
    const [l, h] = await Promise.all([getExerciseLogs(date), getExerciseRange(30)]);
    setLogs(l);
    setHistory(h);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleLogGym = async () => {
    if (!gymForm.activity_type.trim()) return;
    setSaving(true);
    try {
      const { xp } = await logExercise({
        date,
        exercise_type: "gym",
        activity_type: gymForm.activity_type.trim(),
        duration_minutes: gymForm.duration_minutes ? parseInt(gymForm.duration_minutes) : undefined,
        intensity: gymForm.intensity,
        sets: gymForm.sets ? parseInt(gymForm.sets) : undefined,
        reps: gymForm.reps ? parseInt(gymForm.reps) : undefined,
        weight_kg: gymForm.weight_kg ? parseFloat(gymForm.weight_kg) : undefined,
        is_pr: gymForm.is_pr,
        notes: gymForm.notes.trim() || undefined,
      });
      toast.success(`${gymForm.is_pr ? "🏆 New PR! " : ""}Logged! +${xp} XP`);
      window.dispatchEvent(new CustomEvent("xp_updated"));
      setGymForm(EMPTY_GYM_FORM);
      setShowForm(false);
      await fetch();
    } catch {
      toast.error("Failed to log exercise.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogCardio = async () => {
    const activity = cardioForm.activity_type === "Other" ? cardioForm.custom_activity : cardioForm.activity_type;
    if (!activity.trim() || !cardioForm.duration_minutes) return;
    setSaving(true);
    try {
      const { xp } = await logExercise({
        date,
        exercise_type: "cardio",
        activity_type: activity.trim(),
        duration_minutes: parseInt(cardioForm.duration_minutes),
        distance_km: cardioForm.distance_km ? parseFloat(cardioForm.distance_km) : undefined,
        intensity: cardioForm.intensity,
        notes: cardioForm.notes.trim() || undefined,
      });
      toast.success(`Logged! +${xp} XP`);
      window.dispatchEvent(new CustomEvent("xp_updated"));
      setCardioForm(EMPTY_CARDIO_FORM);
      setShowForm(false);
      await fetch();
    } catch {
      toast.error("Failed to log exercise.");
    } finally {
      setSaving(false);
    }
  };

  const gymLogs    = logs.filter((l) => l.exercise_type === "gym");
  const cardioLogs = logs.filter((l) => l.exercise_type === "cardio");

  const totalXP = logs.reduce((s, l) => s + (l.xp_earned ?? 0), 0);

  // exercise streak
  const dates = new Set(history.map((l) => l.date));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = subDays(new Date(), i).toISOString().split("T")[0];
    if (dates.has(d)) streak++;
    else break;
  }

  if (loading) return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatMini icon={<Dumbbell className="h-4 w-4 text-blue-500" />} label="Sessions" value={String(logs.length)} />
        <StatMini icon={<Flame className="h-4 w-4 text-orange-500" />} label="Streak" value={streak > 0 ? `${streak}d` : "—"} />
        <StatMini icon={<Zap className="h-4 w-4 text-yellow-500" />} label="XP Earned" value={totalXP > 0 ? `+${totalXP}` : "—"} />
      </div>

      {/* Add button + type toggle */}
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setExerciseType("gym")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              exerciseType === "gym" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" /> Gym
          </button>
          <button
            onClick={() => setExerciseType("cardio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              exerciseType === "cardio" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Timer className="h-3.5 w-3.5" /> Cardio
          </button>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          Log {exerciseType === "gym" ? "Gym" : "Cardio"}
        </Button>
      </div>

      {/* Gym form */}
      {showForm && exerciseType === "gym" && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-blue-500" /> Log Gym / Strength
          </p>
          <Input
            placeholder="Exercise (e.g. Bench Press, Squat) *"
            value={gymForm.activity_type}
            onChange={(e) => setGymForm((f) => ({ ...f, activity_type: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sets</label>
              <Input type="number" placeholder="e.g. 4" value={gymForm.sets} onChange={(e) => setGymForm((f) => ({ ...f, sets: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
              <Input type="number" placeholder="e.g. 8" value={gymForm.reps} onChange={(e) => setGymForm((f) => ({ ...f, reps: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
              <Input type="number" step="0.5" placeholder="e.g. 80" value={gymForm.weight_kg} onChange={(e) => setGymForm((f) => ({ ...f, weight_kg: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (min, optional)</label>
              <Input type="number" placeholder="e.g. 60" value={gymForm.duration_minutes} onChange={(e) => setGymForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Intensity</label>
              <Select value={gymForm.intensity} onValueChange={(v) => setGymForm((f) => ({ ...f, intensity: v as ExerciseIntensity }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="intense">Intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="is_pr"
              checked={gymForm.is_pr}
              onChange={(e) => setGymForm((f) => ({ ...f, is_pr: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="is_pr" className="text-sm flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Personal Record (PR)
            </label>
          </div>
          <Input placeholder="Notes (optional)" value={gymForm.notes} onChange={(e) => setGymForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" disabled={!gymForm.activity_type.trim() || saving} onClick={handleLogGym}>
              {saving ? "Saving..." : "Log Set"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Cardio form */}
      {showForm && exerciseType === "cardio" && (
        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Timer className="h-4 w-4 text-orange-500" /> Log Cardio / Sport
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Activity</label>
              <Select value={cardioForm.activity_type} onValueChange={(v) => setCardioForm((f) => ({ ...f, activity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARDIO_ACTIVITIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {cardioForm.activity_type === "Other" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Specify *</label>
                <Input placeholder="Activity name" value={cardioForm.custom_activity} onChange={(e) => setCardioForm((f) => ({ ...f, custom_activity: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration (min) *</label>
              <Input type="number" placeholder="e.g. 30" value={cardioForm.duration_minutes} onChange={(e) => setCardioForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Distance (km)</label>
              <Input type="number" step="0.1" placeholder="e.g. 5.2" value={cardioForm.distance_km} onChange={(e) => setCardioForm((f) => ({ ...f, distance_km: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Intensity</label>
              <Select value={cardioForm.intensity} onValueChange={(v) => setCardioForm((f) => ({ ...f, intensity: v as ExerciseIntensity }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="intense">Intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input placeholder="Notes (optional)" value={cardioForm.notes} onChange={(e) => setCardioForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!cardioForm.duration_minutes || (cardioForm.activity_type === "Other" && !cardioForm.custom_activity.trim()) || saving}
              onClick={handleLogCardio}
            >
              {saving ? "Saving..." : "Log Activity"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Gym logs */}
      {gymLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" /> Gym
          </p>
          {gymLogs.map((log) => (
            <ExerciseLogRow key={log.id} log={log} onDelete={async () => { await deleteExerciseLog(log.id); await fetch(); }} />
          ))}
        </div>
      )}

      {/* Cardio logs */}
      {cardioLogs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" /> Cardio
          </p>
          {cardioLogs.map((log) => (
            <ExerciseLogRow key={log.id} log={log} onDelete={async () => { await deleteExerciseLog(log.id); await fetch(); }} />
          ))}
        </div>
      )}

      {logs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No exercise logged for this day.</p>
      )}
    </div>
  );
}

function ExerciseLogRow({ log, onDelete }: { log: ExerciseLog; onDelete: () => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      log.exercise_type === "gym"
        ? "border-blue-500/20 bg-blue-500/5"
        : "border-orange-500/20 bg-orange-500/5"
    }`}>
      {log.exercise_type === "gym"
        ? <Dumbbell className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        : <Timer className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{log.activity_type}</p>
          {log.is_pr && (
            <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-500/30 flex items-center gap-0.5">
              <Trophy className="h-2.5 w-2.5" /> PR
            </Badge>
          )}
        </div>
        <div className="flex gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
          {log.sets && <span>{log.sets} sets × {log.reps} reps</span>}
          {log.weight_kg && <span>{log.weight_kg} kg</span>}
          {log.duration_minutes && (
            <span className="flex items-center gap-0.5"><Timer className="h-3 w-3" />{log.duration_minutes} min</span>
          )}
          {log.distance_km && (
            <span className="flex items-center gap-0.5"><Ruler className="h-3 w-3" />{log.distance_km} km</span>
          )}
          {log.intensity && <Badge variant="outline" className="text-[10px]">{log.intensity}</Badge>}
          {log.xp_earned ? <span className="text-yellow-600">+{log.xp_earned} XP</span> : null}
        </div>
        {log.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>}
      </div>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive flex-shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Food Section ─────────────────────────────────────────────────────────────

function FoodSection({ date }: { date: string }) {
  const [logs, setLogs]         = useState<FoodLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    description: "",
    meal_type: "snack" as MealType,
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
    is_junk: false,
    notes: "",
  });

  const fetch = useCallback(async () => {
    const l = await getFoodLogs(date);
    setLogs(l);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleLog = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await logFood({
        date,
        meal_type: form.meal_type,
        description: form.description.trim(),
        calories:  form.calories  ? parseInt(form.calories)    : undefined,
        protein_g: form.protein_g ? parseFloat(form.protein_g) : undefined,
        carbs_g:   form.carbs_g   ? parseFloat(form.carbs_g)   : undefined,
        fat_g:     form.fat_g     ? parseFloat(form.fat_g)     : undefined,
        is_junk: form.is_junk,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Meal logged!");
      setForm({ description: "", meal_type: "snack", calories: "", protein_g: "", carbs_g: "", fat_g: "", is_junk: false, notes: "" });
      setShowForm(false);
      await fetch();
    } catch {
      toast.error("Failed to log meal.");
    } finally {
      setSaving(false);
    }
  };

  const totalCals    = logs.reduce((s, l) => s + (l.calories ?? 0), 0);
  const totalProtein = logs.reduce((s, l) => s + (l.protein_g ?? 0), 0);
  const junkCount    = logs.filter((l) => l.is_junk).length;

  const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const byMeal = MEAL_ORDER
    .map((m) => ({ meal: m, items: logs.filter((l) => l.meal_type === m) }))
    .filter((g) => g.items.length > 0);

  if (loading) return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatMini icon={<UtensilsCrossed className="h-4 w-4 text-green-500" />} label="Calories" value={totalCals > 0 ? String(totalCals) : "—"} />
        <StatMini icon={<BarChart3 className="h-4 w-4 text-blue-500" />} label="Protein (g)" value={totalProtein > 0 ? totalProtein.toFixed(0) : "—"} />
        <StatMini icon={<Flame className="h-4 w-4 text-red-500" />} label="Junk meals" value={String(junkCount)} />
      </div>

      {junkCount > 0 && (
        <div className="text-xs text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
          {junkCount} junk food item{junkCount > 1 ? "s" : ""} today — consider logging it as a negative habit too.
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Log Meal
        </Button>
      </div>

      {showForm && (
        <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="What did you eat? *"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Select value={form.meal_type} onValueChange={(v) => setForm((f) => ({ ...f, meal_type: v as MealType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Calories" value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} />
            <Input placeholder="Protein (g)" value={form.protein_g} onChange={(e) => setForm((f) => ({ ...f, protein_g: e.target.value }))} />
            <Input placeholder="Carbs (g)" value={form.carbs_g} onChange={(e) => setForm((f) => ({ ...f, carbs_g: e.target.value }))} />
            <Input placeholder="Fat (g)" value={form.fat_g} onChange={(e) => setForm((f) => ({ ...f, fat_g: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="is_junk"
              checked={form.is_junk}
              onChange={(e) => setForm((f) => ({ ...f, is_junk: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="is_junk" className="text-sm text-muted-foreground">Junk food / unhealthy</label>
          </div>
          <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" disabled={!form.description.trim() || saving} onClick={handleLog}>
              {saving ? "Saving..." : "Log Meal"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meals logged for this day.</p>
      ) : (
        <div className="space-y-4">
          {byMeal.map(({ meal, items }) => (
            <div key={meal}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 capitalize">{meal}</p>
              <div className="space-y-2">
                {items.map((log) => (
                  <div key={log.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    log.is_junk ? "border-orange-500/30 bg-orange-500/5" : "border-border/40 bg-background"
                  }`}>
                    <UtensilsCrossed className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{log.description}</p>
                      <div className="flex gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                        {log.calories   && <span>{log.calories} kcal</span>}
                        {log.protein_g  && <span>P: {log.protein_g}g</span>}
                        {log.carbs_g    && <span>C: {log.carbs_g}g</span>}
                        {log.fat_g      && <span>F: {log.fat_g}g</span>}
                        {log.is_junk && <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-500/30">junk</Badge>}
                      </div>
                    </div>
                    <button onClick={async () => { await deleteFoodLog(log.id); await fetch(); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sleep Section ────────────────────────────────────────────────────────────

function SleepSection({ date }: { date: string }) {
  const [log, setLog]         = useState<SleepLog>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getSleepRange>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    bedtime: "",
    wake_time: "",
    duration_hours: "",
    quality: "3",
    notes: "",
  });

  const fetch = useCallback(async () => {
    const [l, h] = await Promise.all([getSleepLog(date), getSleepRange(14)]);
    setLog(l);
    setHistory(h);
    if (l) {
      setForm({
        bedtime:        l.bedtime        ?? "",
        wake_time:      l.wake_time      ?? "",
        duration_hours: l.duration_hours ? String(l.duration_hours) : "",
        quality:        l.quality        ? String(l.quality)        : "3",
        notes:          l.notes          ?? "",
      });
    } else {
      setForm({ bedtime: "", wake_time: "", duration_hours: "", quality: "3", notes: "" });
    }
    setLoading(false);
  }, [date]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertSleepLog({
        date,
        bedtime:        form.bedtime        || undefined,
        wake_time:      form.wake_time       || undefined,
        duration_hours: form.duration_hours  ? parseFloat(form.duration_hours) : undefined,
        quality:        form.quality         ? parseInt(form.quality)          : undefined,
        notes:          form.notes.trim()    || undefined,
      });
      toast.success("Sleep logged!");
      await fetch();
    } catch {
      toast.error("Failed to save sleep log.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!log) return;
    try {
      await deleteSleepLog(log.id);
      toast.success("Sleep log cleared.");
      setLog(null);
      setForm({ bedtime: "", wake_time: "", duration_hours: "", quality: "3", notes: "" });
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const withQuality  = history.filter((l) => l.quality);
  const withDuration = history.filter((l) => l.duration_hours);
  const avgQuality   = withQuality.length  > 0 ? (withQuality.reduce((s, l) => s + (l.quality ?? 0), 0) / withQuality.length).toFixed(1) : null;
  const avgDuration  = withDuration.length > 0 ? (withDuration.reduce((s, l) => s + (l.duration_hours ?? 0), 0) / withDuration.length).toFixed(1) : null;

  const QUALITY_LABELS = ["", "Poor", "Fair", "Okay", "Good", "Great"];

  if (loading) return <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />;

  return (
    <div className="space-y-4">
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatMini icon={<BedDouble className="h-4 w-4 text-indigo-500" />} label="Avg Duration" value={avgDuration ? `${avgDuration}h` : "—"} />
          <StatMini icon={<Moon className="h-4 w-4 text-purple-500" />} label="Avg Quality" value={avgQuality ? `${avgQuality}/5` : "—"} />
        </div>
      )}

      <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
        <p className="text-sm font-medium">{log ? "Edit Sleep Log" : "Log Sleep"}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bedtime</label>
            <Input type="time" value={form.bedtime} onChange={(e) => setForm((f) => ({ ...f, bedtime: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Wake time</label>
            <Input type="time" value={form.wake_time} onChange={(e) => setForm((f) => ({ ...f, wake_time: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duration (hours)</label>
            <Input type="number" step="0.5" placeholder="e.g. 7.5" value={form.duration_hours} onChange={(e) => setForm((f) => ({ ...f, duration_hours: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Quality: {QUALITY_LABELS[parseInt(form.quality)] ?? ""} ({form.quality}/5)
            </label>
            <input
              type="range" min="1" max="5" value={form.quality}
              onChange={(e) => setForm((f) => ({ ...f, quality: e.target.value }))}
              className="w-full accent-primary mt-2"
            />
          </div>
        </div>
        <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        {parseInt(form.quality) <= 2 && form.duration_hours && parseFloat(form.duration_hours) < 6 && (
          <div className="text-xs text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
            Poor sleep detected — consider logging "poor sleep" as a negative habit too.
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : log ? "Update" : "Save"}
          </Button>
          {log && <Button size="sm" variant="ghost" onClick={handleDelete}>Clear</Button>}
        </div>
      </div>

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last 14 nights</p>
          <div className="space-y-1.5">
            {history.slice(0, 14).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0">
                  {format(parseISO(entry.date), "MMM d")}
                </span>
                <div className="flex-1">
                  <Progress
                    value={entry.duration_hours ? Math.min(100, (entry.duration_hours / 9) * 100) : 0}
                    className={`h-2 ${
                      (entry.duration_hours ?? 0) >= 7 ? "[&>div]:bg-green-500"
                      : (entry.duration_hours ?? 0) >= 5 ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-red-500"
                    }`}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                  {entry.duration_hours ? `${entry.duration_hours}h` : "—"}
                </span>
                {entry.quality && (
                  <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">
                    {entry.quality}/5
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared mini stat card ────────────────────────────────────────────────────
function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
