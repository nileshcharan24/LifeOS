"use client";

import { useEffect, useState } from "react";
import { getXPConfig, upsertXPConfig, type XPConfig } from "@/services/economy/xpConfigService";
import { DEFAULT_XP_CONFIG } from "@/lib/xpDefaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Settings2, Info } from "lucide-react";
import { XP_PER_LEVEL } from "@/lib/xp";

type EditableConfig = Omit<XPConfig, "id" | "profile_id">;

type Field = {
  key: keyof EditableConfig;
  label: string;
  hint: string;
  group: string;
};

const FIELDS: Field[] = [
  // Tasks
  { key: "xp_task_default", label: "Task completion", hint: "XP per task completed", group: "Tasks" },
  // Habits
  { key: "xp_habit_streak1", label: "Habit completion (base)", hint: "XP per habit check-in", group: "Habits" },
  { key: "xp_habit_streak7", label: "7-day streak bonus", hint: "Extra XP on a 7-day habit streak", group: "Habits" },
  { key: "xp_habit_streak30", label: "30-day streak bonus", hint: "Extra XP on a 30-day habit streak", group: "Habits" },
  // Health
  { key: "xp_food_meal", label: "Meal logged", hint: "XP per meal tracked", group: "Health" },
  { key: "xp_sleep_log", label: "Sleep logged", hint: "XP for logging a sleep entry", group: "Health" },
  // Negative habits
  { key: "xp_neg_mild", label: "Negative habit — mild", hint: "XP penalty for mild occurrence", group: "Negative Habits" },
  { key: "xp_neg_moderate", label: "Negative habit — moderate", hint: "XP penalty for moderate occurrence", group: "Negative Habits" },
  { key: "xp_neg_severe", label: "Negative habit — severe", hint: "XP penalty for severe occurrence (can level down)", group: "Negative Habits" },
];

const GROUPS = ["Tasks", "Habits", "Health", "Negative Habits"] as const;

function daysToLevelUp(xpPerDay: number): string {
  if (xpPerDay <= 0) return "∞";
  return `~${Math.ceil(XP_PER_LEVEL / xpPerDay)} days`;
}

export function XPConfigPanel() {
  const [config, setConfig] = useState<EditableConfig>({ ...DEFAULT_XP_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getXPConfig()
      .then((c) => {
        const { id: _id, profile_id: _pid, ...rest } = c as XPConfig & { created_at?: string; updated_at?: string };
        setConfig(rest as EditableConfig);
      })
      .catch(() => toast.error("Failed to load XP config."))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof EditableConfig, raw: string) => {
    const val = parseInt(raw);
    if (isNaN(val) || val < 0) return;
    setConfig((c) => ({ ...c, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertXPConfig(config);
      toast.success("XP config saved.");
      setDirty(false);
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_XP_CONFIG });
    setDirty(true);
  };

  // Estimate daily XP from tasks (1 task/day assumed) + habits (3/day assumed)
  const estimatedDailyXP =
    config.xp_task_default * 3 + config.xp_habit_streak1 * 5;

  if (loading) {
    return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="p-6 rounded-xl border border-border/40 bg-muted/40 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">XP Configuration</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleReset}>Reset defaults</Button>
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Estimation helper */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          At current settings (3 tasks + 5 habits/day): ~<strong>{estimatedDailyXP} XP/day</strong>{" "}
          → level up every {daysToLevelUp(estimatedDailyXP)}.
        </span>
      </div>

      {/* Grouped fields */}
      {GROUPS.map((group) => {
        const fields = FIELDS.filter((f) => f.group === group);
        return (
          <div key={group} className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{group}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(({ key, label, hint }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={config[key] as number}
                      onChange={(e) => set(key, e.target.value)}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
