"use client";

import { useEffect, useState } from "react";
import {
  getHabits, createHabit, updateHabit, deleteHabit,
  type Habit,
} from "@/services/tasks/taskTrackerService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type FormState = { name: string; xpValue: string; enabled: boolean };
const DEFAULT_FORM: FormState = { name: "", xpValue: "50", enabled: true };

export function ManageHabits({ onUpdate }: { onUpdate?: () => void }) {
  const [habits, setHabits]                 = useState<Habit[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [showAddForm, setShowAddForm]       = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [form, setForm]                     = useState<FormState>(DEFAULT_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    setHabits(await getHabits());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowAddForm(true);
  };

  const openEdit = (h: Habit) => {
    setForm({ name: h.name, xpValue: String(h.xp_value), enabled: h.enabled });
    setEditingId(h.id);
    setShowAddForm(false);
  };

  const cancelEdit = () => { setEditingId(null); setForm(DEFAULT_FORM); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const xp = Math.max(1, parseInt(form.xpValue) || 50);
      if (editingId) {
        await updateHabit(editingId, form.name, xp, form.enabled);
        toast.success("Habit updated!");
        setEditingId(null);
      } else {
        await createHabit(form.name, xp);
        toast.success(`"${form.name}" created!`);
        setShowAddForm(false);
      }
      setForm(DEFAULT_FORM);
      await load();
      onUpdate?.();
    } catch {
      toast.error("Failed to save habit.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (h: Habit) => {
    try {
      await updateHabit(h.id, h.name, h.xp_value, !h.enabled);
      await load();
      onUpdate?.();
    } catch {
      toast.error("Failed to update habit.");
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteHabit(id);
      toast.success("Habit deleted.");
      setConfirmDeleteId(null);
      await load();
      onUpdate?.();
    } catch {
      toast.error("Failed to delete habit.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Manage Habits</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your daily recurring habits and their XP rewards.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> New Habit
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <HabitForm
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={() => setShowAddForm(false)}
          saving={saving}
          title="New Habit"
        />
      )}

      {/* List */}
      {habits.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
          <p className="text-3xl mb-3">🔄</p>
          <p className="text-muted-foreground mb-4">No habits yet.</p>
          <Button onClick={openAdd}>Add First Habit</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(h => (
            <div key={h.id} className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
              {editingId === h.id ? (
                <div className="p-4">
                  <HabitForm
                    form={form}
                    onChange={setForm}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    saving={saving}
                    title={`Editing: ${h.name}`}
                    showEnabledToggle
                  />
                </div>
              ) : confirmDeleteId === h.id ? (
                <div className="flex items-center justify-between gap-4 p-4">
                  <p className="text-sm font-medium">
                    Delete <span className="text-destructive">"{h.name}"</span>? Past history will also be removed.
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="destructive" disabled={saving} onClick={() => handleDelete(h.id)}>
                      {saving ? "Deleting..." : "Delete"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(h)}
                    aria-label={h.enabled ? "Disable habit" : "Enable habit"}
                    className={[
                      "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      h.enabled ? "bg-primary" : "bg-muted-foreground/30",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform",
                        h.enabled ? "translate-x-5" : "translate-x-1",
                      ].join(" ")}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${!h.enabled ? "text-muted-foreground" : ""}`}>
                        {h.name}
                      </span>
                      {!h.enabled && (
                        <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">+{h.xp_value} XP per completion</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(h)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(h.id)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline form ──────────────────────────────────────────────────────────────

function HabitForm({
  form, onChange, onSave, onCancel, saving, title, showEnabledToggle,
}: {
  form: FormState;
  onChange: (v: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  showEnabledToggle?: boolean;
}) {
  return (
    <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Habit name"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          onKeyDown={e => { if (e.key === "Enter") onSave(); }}
          className="col-span-2 md:col-span-1"
        />
        <Input
          type="number"
          placeholder="XP value"
          value={form.xpValue}
          min={1}
          max={500}
          onChange={e => onChange({ ...form, xpValue: e.target.value })}
        />
      </div>
      {showEnabledToggle && (
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => onChange({ ...form, enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Enabled
        </label>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !form.name.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" />
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}
