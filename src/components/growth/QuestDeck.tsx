"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  getSideQuests,
  addManualSideQuest,
  updateSideQuestStatus,
  deleteSideQuest,
  type SideQuest,
} from "@/services/growth/sideQuestsService";
import { Check, X, Trash2, Plus, Clock, Sparkles } from "lucide-react";

// ── Consistency graph: last 14 days of completions ──────────────────────────

function ConsistencyGraph({ quests }: { quests: SideQuest[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });

  const completedByDay = new Map<string, number>();
  for (const q of quests) {
    if (q.status === "completed" && q.completedAt) {
      const day = q.completedAt.split("T")[0];
      completedByDay.set(day, (completedByDay.get(day) ?? 0) + 1);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Quest Consistency — last 14 days
      </p>
      <div className="flex gap-1 items-end">
        {days.map((day) => {
          const count = completedByDay.get(day) ?? 0;
          const isToday = day === today;
          return (
            <div key={day} className="flex flex-col items-center gap-1 flex-1">
              <div
                title={`${day}: ${count} completed`}
                className={`w-full rounded-sm transition-all ${
                  count === 0
                    ? "bg-muted/60 h-4"
                    : count === 1
                    ? "bg-foreground/40 h-6"
                    : count === 2
                    ? "bg-foreground/60 h-8"
                    : "bg-foreground h-10"
                } ${isToday ? "ring-1 ring-primary" : ""}`}
              />
              {isToday && (
                <span className="text-[8px] text-primary font-bold">•</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">14 days ago</span>
        <span className="text-[10px] text-muted-foreground">Today</span>
      </div>
    </div>
  );
}

// ── Quest card ───────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  onComplete,
  onSkip,
  onDelete,
  onReactivate,
}: {
  quest: SideQuest;
  onComplete: () => void;
  onSkip: () => void;
  onDelete: () => void;
  onReactivate: () => void;
}) {
  const isDone = quest.status === "completed";
  const isSkipped = quest.status === "skipped";

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isDone
          ? "border-green-500/30 bg-green-500/5 opacity-70"
          : isSkipped
          ? "border-border/30 bg-muted/20 opacity-50"
          : "border-border/40 bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p
              className={`text-sm font-medium leading-snug ${
                isDone ? "line-through text-muted-foreground" : ""
              } ${isSkipped ? "line-through text-muted-foreground" : ""}`}
            >
              {quest.title}
            </p>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                quest.origin === "ai"
                  ? "border-purple-400/30 text-purple-400"
                  : "border-border/40 text-muted-foreground"
              }`}
            >
              {quest.origin === "ai" ? (
                <span className="flex items-center gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              ) : (
                "Manual"
              )}
            </span>
          </div>

          {quest.description && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
              {quest.description}
            </p>
          )}

          {quest.estimatedTime && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {quest.estimatedTime}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {quest.status === "active" ? (
            <>
              <button
                onClick={onComplete}
                title="Mark complete"
                className="p-1.5 rounded-lg border border-green-500/30 text-green-500 hover:bg-green-500/10 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onSkip}
                title="Skip"
                className="p-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={onReactivate}
              title="Reactivate"
              className="text-[10px] px-2 py-1 rounded border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              Undo
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main QuestDeck ───────────────────────────────────────────────────────────

export function QuestDeck() {
  const [quests, setQuests] = useState<SideQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

  // Manual add form
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSideQuests().then((q) => {
      setQuests(q);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (addOpen) setTimeout(() => titleRef.current?.focus(), 50);
  }, [addOpen]);

  const handleAdd = async () => {
    const t = newTitle.trim();
    if (!t) return;
    setAdding(true);
    const result = await addManualSideQuest(t, newDesc.trim() || undefined);
    if (result.data) {
      setQuests((prev) => [result.data!, ...prev]);
      setNewTitle("");
      setNewDesc("");
      setAddOpen(false);
    }
    setAdding(false);
  };

  const handleStatus = async (id: string, status: "active" | "completed" | "skipped") => {
    await updateSideQuestStatus(id, status);
    setQuests((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, status, completedAt: status === "completed" ? new Date().toISOString() : null }
          : q
      )
    );
  };

  const handleDelete = async (id: string) => {
    await deleteSideQuest(id);
    setQuests((prev) => prev.filter((q) => q.id !== id));
  };

  const filtered = quests.filter((q) =>
    filter === "all" ? true : filter === "active" ? q.status === "active" : q.status === "completed"
  );

  const activeCount = quests.filter((q) => q.status === "active").length;
  const completedCount = quests.filter((q) => q.status === "completed").length;

  return (
    <div className="space-y-6">
      <ConsistencyGraph quests={quests} />

      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Quest Deck</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCount} active · {completedCount} completed
            </p>
          </div>
          <Button
            size="sm"
            variant={addOpen ? "outline" : "default"}
            onClick={() => setAddOpen((v) => !v)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {addOpen ? "Cancel" : "Add Quest"}
          </Button>
        </div>

        {/* Manual add form */}
        {addOpen && (
          <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2 bg-muted/10">
            <input
              ref={titleRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Quest title…"
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)…"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()}>
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-border/30 pb-3">
          {(["active", "completed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded capitalize transition-colors ${
                filter === f
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Quest list */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading quests…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {filter === "active"
              ? "No active quests. Generate recommendations or add one manually."
              : "No quests here yet."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                onComplete={() => handleStatus(q.id, "completed")}
                onSkip={() => handleStatus(q.id, "skipped")}
                onDelete={() => handleDelete(q.id)}
                onReactivate={() => handleStatus(q.id, "active")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
